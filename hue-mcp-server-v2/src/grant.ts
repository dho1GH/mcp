import type { Grant, HueOperation, AuditEntry } from "./types";

export class GrantViolation extends Error {}

/**
 * Checks a proposed action against a Grant, following the same shape as
 * hue-metadata-grant.json: explicit system, explicit operation, explicit
 * target allowlist, explicit forbidden lists, and an expiry.
 *
 * This mirrors agentic-control-plane's policy kernel (typed grant required,
 * natural-language permission never accepted) but scoped down to Hue only,
 * and it actually executes rather than always returning dry_run_only.
 */
export function checkGrant(
  grant: Grant,
  operation: HueOperation,
  target: string
): void {
  if (!grant.systems.includes("hue")) {
    throw new GrantViolation(`Grant does not cover system "hue"`);
  }

  if (grant.forbiddenSystems.includes("hue")) {
    throw new GrantViolation(`"hue" is explicitly forbidden by this grant`);
  }

  if (!grant.allowedOperations.includes(operation)) {
    throw new GrantViolation(
      `Operation "${operation}" is not in allowedOperations [${grant.allowedOperations.join(", ")}]`
    );
  }

  if (grant.forbiddenOperations.includes(operation)) {
    throw new GrantViolation(`Operation "${operation}" is explicitly forbidden by this grant`);
  }

  const targetAllowed =
    grant.allowedTargets.includes("*") || grant.allowedTargets.includes(target);
  if (!targetAllowed) {
    throw new GrantViolation(
      `Target "${target}" is not in allowedTargets [${grant.allowedTargets.join(", ")}]`
    );
  }

  if (grant.expires === "after_single_execution" && grant.usedAt) {
    throw new GrantViolation(`Grant "${grant.grantId}" was already consumed at ${grant.usedAt}`);
  }

  if (grant.expires !== "after_single_execution") {
    const expiry = new Date(grant.expires);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      throw new GrantViolation(`Grant "${grant.grantId}" expired at ${grant.expires}`);
    }
  }
}

export function newAuditEntry(
  tool: string,
  args: unknown,
  result: AuditEntry["result"],
  detail?: string,
  grantId?: string
): AuditEntry {
  return {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    tool,
    grant_id: grantId,
    args,
    result,
    detail,
  };
}
