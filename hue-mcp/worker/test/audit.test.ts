import { describe, expect, it, vi } from "vitest";
import { newAuditEntry, writeAudit } from "../src/audit.js";

describe("newAuditEntry", () => {
  it("creates an executed entry with all fields", () => {
    const entry = newAuditEntry("hue_list_lights", {}, "executed", 42);
    expect(entry.tool).toBe("hue_list_lights");
    expect(entry.args).toEqual({});
    expect(entry.result).toBe("executed");
    expect(entry.duration_ms).toBe(42);
    expect(entry.event_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.detail).toBeUndefined();
  });

  it("creates a failed entry with detail", () => {
    const entry = newAuditEntry("hue_set_light_state", { id: "x" }, "failed", 15, "bridge timeout");
    expect(entry.result).toBe("failed");
    expect(entry.detail).toBe("bridge timeout");
    expect(entry.args).toEqual({ id: "x" });
  });

  it("records the full tool arguments", () => {
    const args = { id: "abc-123", on: true, brightness: 80 };
    const entry = newAuditEntry("hue_set_light_state", args, "executed", 100);
    expect(entry.args).toEqual(args);
  });

  it("generates unique event ids", () => {
    const a = newAuditEntry("t", {}, "executed", 0);
    const b = newAuditEntry("t", {}, "executed", 0);
    expect(a.event_id).not.toBe(b.event_id);
  });
});

describe("writeAudit", () => {
  it("writes JSON to KV with timestamp:event_id key", async () => {
    const mockPut = vi.fn().mockResolvedValue(undefined);
    const kv = { put: mockPut } as unknown as KVNamespace;
    const entry = newAuditEntry("hue_list_lights", {}, "executed", 10);

    await writeAudit(kv, entry);

    expect(mockPut).toHaveBeenCalledOnce();
    const [key, value] = mockPut.mock.calls[0];
    expect(key).toBe(`audit:${entry.timestamp}:${entry.event_id}`);
    expect(JSON.parse(value)).toEqual(entry);
  });
});
