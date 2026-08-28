"""
Core objects for the grant-based adaptive execution runtime.

This is intentionally domain-agnostic. "system" is a free string
("hue", "home_assistant", "node_red", "docs", "memory", ...) rather than
a hardcoded enum, because the whole point of this runtime is that the
domain is just an adapter plugged into one shared shape -- adding a new
domain should never require touching this file.

Nothing in here executes anything. This module only describes the
authority boundary (Grant), what's being proposed (CandidateChangeSet),
what's actually being run (ExecutionJob), and what happened
(ExecutionResult). Agents (personas) only ever produce
CandidateChangeSets -- they never hold execution capability themselves.
"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class Grant(BaseModel):
    """The authority boundary. Approval binds to this, not to one exact action."""

    grant_id: str
    system: str
    mode: Literal["inspect", "simulate", "bounded_write"]
    objective: str

    targets: list[str] = Field(default_factory=list)
    allowed_operations: list[str] = Field(default_factory=list)
    forbidden_operations: list[str] = Field(default_factory=list)
    allowed_entity_classes: list[str] = Field(default_factory=list)
    allowed_service_calls: list[str] = Field(default_factory=list)

    adaptation_policy: dict[str, Any] = Field(default_factory=dict)
    stop_conditions: list[str] = Field(default_factory=list)

    requires_approval: bool = True
    requires_verification: bool = True
    requires_reapproval_on_boundary_breach: bool = True
    requires_audit: bool = True

    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    expires_at: Optional[str] = None

    frozen_sha256: Optional[str] = None


class CandidateChangeSet(BaseModel):
    """
    A proposed realization inside or adjacent to a grant. This is the
    only thing a persona agent (Huey, Wren, Dot, ...) ever produces --
    an opinion turned into a concrete, inspectable proposal. Producing
    one of these is not execution.
    """

    candidate_id: str
    objective: str
    system: str
    target_scope: list[str] = Field(default_factory=list)

    proposed_operations: list[dict[str, Any]] = Field(default_factory=list)
    expected_effects: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    unresolved_ambiguities: list[str] = Field(default_factory=list)

    risk_level: Literal["low", "medium", "high"]
    confidence: float
    requires_grant_expansion: bool = False
    simulation_summary: Optional[dict[str, Any]] = None

    realized_within_grant: bool = True
    frozen_sha256: Optional[str] = None

    # Which persona authored this candidate -- kept for traceability and
    # so a domain's "natural author" (e.g. Huey for hue) is visible in
    # the record, even though authorship no longer grants execution.
    proposed_by: Optional[str] = None


class ExecutionJob(BaseModel):
    """What a domain adapter actually runs, compiled from an approved
    grant plus a selected candidate."""

    job_id: str
    grant_id: str
    candidate_id: str

    system: str
    operation_group: str
    target_scope: list[str] = Field(default_factory=list)

    approved_action_envelope: dict[str, Any] = Field(default_factory=dict)
    planned_steps: list[dict[str, Any]] = Field(default_factory=list)

    stop_conditions: list[str] = Field(default_factory=list)
    pre_state_contract: dict[str, Any] = Field(default_factory=dict)


class ExecutionResult(BaseModel):
    job_id: str
    status: Literal["completed", "blocked", "failed", "needs_reapproval"]
    observations: list[str] = Field(default_factory=list)
    changes: list[dict[str, Any]] = Field(default_factory=list)
    boundary_breaches: list[str] = Field(default_factory=list)
    verification_hints: list[str] = Field(default_factory=list)
    ledger_event_id: Optional[str] = None


class AdaptiveExecutionState(BaseModel):
    """
    Graph-level state for one request moving through the runtime.
    Domain-agnostic -- this is the same shape whether the request
    targets hue, home_assistant, node_red, docs, or memory.
    """

    request_id: str
    user_request: str
    system: str

    inventory_snapshot: dict[str, Any] = Field(default_factory=dict)
    analysis_outputs: list[dict[str, Any]] = Field(default_factory=list)

    draft_grant: Optional[Grant] = None
    approved_grant: Optional[Grant] = None

    candidate_changesets: list[CandidateChangeSet] = Field(default_factory=list)
    ranked_candidates: list[str] = Field(default_factory=list)

    selected_candidate_id: Optional[str] = None
    execution_job: Optional[ExecutionJob] = None
    execution_result: Optional[ExecutionResult] = None

    verification_report: dict[str, Any] = Field(default_factory=dict)
    audit_log: list[dict[str, Any]] = Field(default_factory=list)

    outcome: Literal[
        "in_progress",
        "awaiting_grant_approval",
        "awaiting_candidate_selection",
        "awaiting_reapproval",
        "executing",
        "verifying",
        "completed",
        "blocked",
        "failed",
    ] = "in_progress"
