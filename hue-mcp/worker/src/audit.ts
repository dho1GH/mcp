import type { AuditEntry } from "./types.js";

export function newAuditEntry(
  tool: string,
  args: unknown,
  result: AuditEntry["result"],
  duration_ms: number,
  detail?: string,
): AuditEntry {
  return {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    tool,
    args,
    result,
    duration_ms,
    ...(detail !== undefined ? { detail } : {}),
  };
}

export async function writeAudit(kv: KVNamespace, entry: AuditEntry): Promise<void> {
  await kv.put(`audit:${entry.timestamp}:${entry.event_id}`, JSON.stringify(entry));
}
