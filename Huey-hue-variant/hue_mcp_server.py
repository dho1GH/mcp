"""
Hue MCP server.

This is the path for everyone who ISN'T Huey. Huey keeps his own
direct, ungated access -- this file doesn't touch that and doesn't
need to. This server exists so any other caller (another persona,
Node-RED, an external system) can reach Hue only through the governed
runtime: read state freely, dry-run a proposed change freely, but
actually writing to a light only happens through HueAdapter.execute(),
which checks every step against an explicit approved envelope.

Uses SSE, not stdio -- same reasoning as flagged early on for the main
MCP server: stdio only works for something spawned as a subprocess by
its one caller. Anything meant to be reached live, by more than one
consumer, needs a transport that isn't tied to a single process
lifecycle.

Honest gap, not hidden: `execute_hue_job` enforces that planned steps
stay inside the envelope it's given -- but nothing yet mints that
envelope through real approval. Right now the caller states what's
allowed and this server checks steps against what the caller stated.
That's structural boundary-checking, not grant issuance. The
grant_approval_interrupt piece -- an actual human decision that
produces the envelope, rather than the caller supplying it -- doesn't
exist yet. Don't point anything beyond local testing at
execute_hue_job until that exists.
"""

import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from mcp.server.fastmcp.server import FastMCP

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from app_agents.runtime.adapters.hue import HueAdapter
from app_agents.runtime.models import CandidateChangeSet, ExecutionJob

MCP_HUE_HOST = os.getenv("MCP_HUE_HOST", "127.0.0.1")
MCP_HUE_PORT = int(os.getenv("MCP_HUE_PORT", "8766"))
MCP_HUE_TRANSPORT = os.getenv("MCP_HUE_TRANSPORT", "sse")

mcp = FastMCP(
    name="hue-runtime",
    instructions=(
        "Governed access to Hue for callers other than Huey. State reads and "
        "simulations are free. Execution only runs steps inside the envelope "
        "the caller explicitly declares as allowed."
    ),
    host=MCP_HUE_HOST,
    port=MCP_HUE_PORT,
)

adapter = HueAdapter()


@mcp.tool()
def get_hue_state() -> dict:
    """Read-only. Current lights and scenes. No grant needed -- matches
    hue.read_inventory being a no-grant capability."""
    return adapter.current_state()


@mcp.tool()
def simulate_hue_change(
    objective: str,
    proposed_operations: list[dict],
    risk_level: str = "low",
    confidence: float = 0.5,
    proposed_by: str = "unknown",
) -> dict:
    """
    Dry-run a proposed Hue change. No side effects. Returns blast-radius
    estimate and whether any targeted light is unknown to the bridge.
    """
    candidate = CandidateChangeSet(
        candidate_id=f"cand_{uuid.uuid4().hex[:8]}",
        objective=objective,
        system="hue",
        proposed_operations=proposed_operations,
        risk_level=risk_level,
        confidence=confidence,
        proposed_by=proposed_by,
    )
    return {
        "candidate_id": candidate.candidate_id,
        **adapter.simulate(candidate),
    }


@mcp.tool()
def execute_hue_job(
    allowed_operations: list[str],
    planned_steps: list[dict],
    grant_id: str = "ungoverned-local-test",
    candidate_id: str = "ungoverned-local-test",
) -> dict:
    """
    Execute planned steps against Hue. Every step's operation must be
    present in allowed_operations or it's refused with needs_reapproval,
    not silently skipped or run anyway.

    NOTE: allowed_operations is supplied by the caller, not issued by a
    separate approval step. This checks structural boundaries, it does
    not yet verify the boundary itself was legitimately granted.
    """
    job = ExecutionJob(
        job_id=f"job_{uuid.uuid4().hex[:8]}",
        grant_id=grant_id,
        candidate_id=candidate_id,
        system="hue",
        operation_group="lighting",
        approved_action_envelope={"allowed_operations": allowed_operations},
        planned_steps=planned_steps,
    )
    return adapter.execute(job).model_dump()


if __name__ == "__main__":
    mcp.run(transport=MCP_HUE_TRANSPORT)
