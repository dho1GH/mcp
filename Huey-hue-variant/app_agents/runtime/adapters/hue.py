"""
Hue domain adapter.

This is now the ONLY file in the codebase that imports hue_client.
Not huey.py, not autogen_workspace.py -- this file, exclusively. Huey's
persona can author lighting candidates because lighting is his lens,
but he no longer holds execution capability himself. Execution only
happens here, and only for a job compiled from an approved grant.
"""

from app_agents.tools import hue_client
from app_agents.runtime.adapters.base import DomainAdapter
from app_agents.runtime.models import CandidateChangeSet, ExecutionJob, ExecutionResult


class HueAdapter(DomainAdapter):
    system = "hue"

    def current_state(self) -> dict:
        """Read-only inventory read. No grant required -- matches
        hue.read_inventory being a no-grant capability in the registry."""
        return {
            "lights": hue_client.list_lights(),
            "scenes": hue_client.list_scenes(),
        }

    def simulate(self, candidate: CandidateChangeSet) -> dict:
        state = self.current_state()
        known_light_ids = {light.get("id") for light in state["lights"].get("data", [])}

        touched = [op.get("light_id") for op in candidate.proposed_operations if "light_id" in op]
        unknown_targets = [t for t in touched if t not in known_light_ids]

        return {
            "operations_count": len(candidate.proposed_operations),
            "lights_touched": touched,
            "unknown_targets": unknown_targets,
            "would_conflict": bool(unknown_targets),
            "estimated_blast_radius": "low" if len(touched) <= 1 else "medium",
        }

    def execute(self, job: ExecutionJob) -> ExecutionResult:
        allowed_ops = set(job.approved_action_envelope.get("allowed_operations", []))
        changes = []
        observations = []
        breaches = []

        for step in job.planned_steps:
            op = step.get("operation")
            if op not in allowed_ops:
                breaches.append(f"operation '{op}' not in approved envelope {sorted(allowed_ops)}")
                continue

            try:
                if op == "set_light_state":
                    result = hue_client.set_light_state(
                        light_id=step["light_id"],
                        on=step.get("on"),
                        brightness=step.get("brightness"),
                        color_temp_mirek=step.get("color_temp_mirek"),
                        xy=step.get("xy"),
                    )
                    changes.append({"operation": op, "target": step["light_id"], "result": result})
                elif op == "apply_scene":
                    result = hue_client.apply_scene(step["scene_id"])
                    changes.append({"operation": op, "target": step["scene_id"], "result": result})
                else:
                    breaches.append(f"operation '{op}' has no execution handler in HueAdapter")
            except Exception as exc:  # noqa: BLE001 -- surface as a failed result, not a crash
                observations.append(f"execution error on {op}: {exc}")
                return ExecutionResult(
                    job_id=job.job_id,
                    status="failed",
                    observations=observations,
                    changes=changes,
                    boundary_breaches=breaches,
                )

        if breaches:
            return ExecutionResult(
                job_id=job.job_id,
                status="needs_reapproval",
                observations=observations,
                changes=changes,
                boundary_breaches=breaches,
            )

        return ExecutionResult(
            job_id=job.job_id,
            status="completed",
            observations=observations or ["all planned steps executed within approved envelope"],
            changes=changes,
            boundary_breaches=[],
        )
