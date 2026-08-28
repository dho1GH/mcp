export class PolicyError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unknown_tool"
      | "missing_scope"
      | "approval_required"
      | "human_required"
      | "invalid_transition"
      | "expired"
      | "digest_mismatch"
      | "lease_conflict",
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

