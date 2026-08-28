import { HueClient } from "./hue-client";
import { checkGrant, newAuditEntry, GrantViolation } from "./grant";
import type { Env, Grant, AuditEntry } from "./types";

// D1 or KV would both work for the audit log; this Worker assumes a KV
// namespace bound as AUDIT_LOG (see wrangler.toml), same shape as
// Head of Systems' audit.jsonl -- append-only, one entry per call.
async function writeAudit(kv: KVNamespace, entry: AuditEntry) {
  await kv.put(`audit:${entry.timestamp}:${entry.event_id}`, JSON.stringify(entry));
}

export interface ToolContext {
  env: Env;
  audit: KVNamespace;
  hue: HueClient;
}

export const toolDefinitions = [
  {
    name: "hue_list_lights",
    description: "List all Hue lights with their v2 id, v1 id, name, and current state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_rooms",
    description: "List all Hue rooms.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_zones",
    description: "List all Hue zones.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_scenes",
    description: "List all Hue scenes.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_rename_light",
    description:
      "Rename one light. Destructive-but-reversible: requires a Grant whose allowedOperations includes " +
      "'metadata_write' and whose allowedTargets covers the light's current name.",
    inputSchema: {
      type: "object",
      properties: {
        lightKey: { type: "string", description: "Light's v2 id, v1 id, or current exact name" },
        newName: { type: "string" },
        grant: { type: "object", description: "A Grant object, e.g. the shape of hue-metadata-grant.json" },
      },
      required: ["lightKey", "newName", "grant"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_set_light_state",
    description:
      "Turn a light on/off and optionally set brightness. Requires a Grant whose allowedOperations " +
      "includes 'state_write' and whose allowedTargets covers the light's current name.",
    inputSchema: {
      type: "object",
      properties: {
        lightKey: { type: "string" },
        on: { type: "boolean" },
        brightness: { type: "number", minimum: 0, maximum: 100 },
        grant: { type: "object" },
      },
      required: ["lightKey", "on", "grant"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
] as const;

export async function callTool(ctx: ToolContext, name: string, args: any) {
  const { hue, audit } = ctx;

  switch (name) {
    case "hue_list_lights": {
      const result = await hue.lights();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_rooms": {
      const result = await hue.rooms();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_zones": {
      const result = await hue.zones();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_scenes": {
      const result = await hue.scenes();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_rename_light": {
      const grant = args.grant as Grant;
      const { id, name: currentName } = await hue.resolveLightId(args.lightKey);
      try {
        checkGrant(grant, "metadata_write", currentName);
      } catch (error) {
        if (error instanceof GrantViolation) {
          await writeAudit(
            audit,
            newAuditEntry(name, args, "blocked", error.message, grant.grantId)
          );
          throw error;
        }
        throw error;
      }
      const result = await hue.renameLight(id, args.newName);
      grant.usedAt = new Date().toISOString();
      await writeAudit(
        audit,
        newAuditEntry(
          name,
          { lightId: id, from: currentName, to: args.newName },
          "executed",
          undefined,
          grant.grantId
        )
      );
      return result;
    }

    case "hue_set_light_state": {
      const grant = args.grant as Grant;
      const { id, name: currentName } = await hue.resolveLightId(args.lightKey);
      try {
        checkGrant(grant, "state_write", currentName);
      } catch (error) {
        if (error instanceof GrantViolation) {
          await writeAudit(
            audit,
            newAuditEntry(name, args, "blocked", error.message, grant.grantId)
          );
          throw error;
        }
        throw error;
      }
      const result = await hue.setLightState(id, args.on, args.brightness);
      grant.usedAt = new Date().toISOString();
      await writeAudit(
        audit,
        newAuditEntry(
          name,
          { lightId: id, on: args.on, brightness: args.brightness },
          "executed",
          undefined,
          grant.grantId
        )
      );
      return result;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
