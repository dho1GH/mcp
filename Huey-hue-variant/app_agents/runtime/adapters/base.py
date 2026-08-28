"""
The adapter interface. This is the one contract every domain implements
-- hue, home_assistant, node_red, docs, memory, whatever comes later.

Nothing outside a domain's own adapter file should ever import that
domain's underlying client directly (e.g. only hue.py may import
hue_client). That's what makes "domain = adapter" a real boundary
instead of a naming convention.
"""

from abc import ABC, abstractmethod

from app_agents.runtime.models import CandidateChangeSet, ExecutionJob, ExecutionResult


class DomainAdapter(ABC):
    """One adapter per domain. Personas never see this directly --
    only the runtime does, and only after a grant is approved."""

    system: str

    @abstractmethod
    def simulate(self, candidate: CandidateChangeSet) -> dict:
        """
        Dry-run a candidate against current known state. Must not cause
        any side effect. Returns a simulation summary: estimated blast
        radius, likely conflicts, whether the candidate actually fits
        inside a given grant shape.
        """
        raise NotImplementedError

    @abstractmethod
    def execute(self, job: ExecutionJob) -> ExecutionResult:
        """
        Actually perform the job. Must only take actions inside
        job.approved_action_envelope. Anything the job would need
        outside that envelope should produce a "needs_reapproval"
        result rather than silently expanding scope.
        """
        raise NotImplementedError
