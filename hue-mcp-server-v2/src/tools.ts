import { HueClient, HueValidationError } from "./hue-client";
import { checkGrant, newAuditEntry, GrantViolation } from "./grant";
import type { Env, Grant, AuditEntry } from "./types";

function validateBrightness(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 100) {
    throw new HueValidationError(`brightness must be a number between 0 and 100, got ${JSON.stringify(value)}`);
  }
  return value;
}

function validateMirek(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || Number.isNaN(value) || value < 153 || value > 500) {
    throw new HueValidationError(`mirek must be a number between 153 and 500, got ${JSON.stringify(value)}`);
  }
  return value;
}

function validateXy(value: unknown): { x: number; y: number } | undefined {
  if (value === undefined) return undefined;
  const v = value as { x?: unknown; y?: unknown };
  if (
    typeof v.x !== "number" || typeof v.y !== "number" ||
    v.x < 0 || v.x > 1 || v.y < 0 || v.y > 1
  ) {
    throw new HueValidationError(`xy must be {x, y} with both values between 0 and 1, got ${JSON.stringify(value)}`);
  }
  return { x: v.x, y: v.y };
}

function validateNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HueValidationError(`${field} must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value;
}

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
    name: "hue_list_motion_sensors",
    description: "List all motion sensors and their current state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_buttons",
    description: "List all button/switch devices and their last event.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_temperature_sensors",
    description: "List all temperature sensors and current readings.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_light_level_sensors",
    description: "List all ambient light sensors and current readings.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_entertainment_areas",
    description: "List entertainment areas (for sync/streaming setups).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_behavior_scripts",
    description: "List available behavior scripts (automations, e.g. wake-up, go-home).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_list_behavior_instances",
    description: "List configured behavior instances (active automations) and their enabled state.",
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
      "Turn a light on/off and optionally set brightness, color (CIE xy), or color temperature (mirek). " +
      "Requires a Grant whose allowedOperations includes 'state_write' and whose allowedTargets covers " +
      "the light's current name.",
    inputSchema: {
      type: "object",
      properties: {
        lightKey: { type: "string" },
        on: { type: "boolean" },
        brightness: { type: "number", minimum: 0, maximum: 100 },
        xy: {
          type: "object",
          properties: { x: { type: "number" }, y: { type: "number" } },
          description: "CIE 1931 color coordinates for setting light color",
        },
        mirek: { type: "number", minimum: 153, maximum: 500, description: "Color temperature in mirek" },
        grant: { type: "object" },
      },
      required: ["lightKey", "on", "grant"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_recall_scene",
    description:
      "Activate a scene by id or exact name. Requires a Grant whose allowedOperations includes " +
      "'scene_recall' and whose allowedTargets covers the scene's name.",
    inputSchema: {
      type: "object",
      properties: {
        sceneKey: { type: "string" },
        grant: { type: "object" },
      },
      required: ["sceneKey", "grant"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "hue_set_group_state",
    description:
      "Turn a room/zone's grouped_light on/off and optionally set brightness. Requires a Grant whose " +
      "allowedOperations includes 'state_write' and whose allowedTargets covers the group id.",
    inputSchema: {
      type: "object",
      properties: {
        groupedLightId: { type: "string" },
        on: { type: "boolean" },
        brightness: { type: "number", minimum: 0, maximum: 100 },
        grant: { type: "object" },
      },
      required: ["groupedLightId", "on", "grant"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "hue_set_light_effect",
    description:
      "Apply a dynamic effect to a light (e.g. 'sparkle', 'candle', 'fire', 'no_effect' to clear). " +
      "Requires a Grant whose allowedOperations includes 'state_write' and whose allowedTargets covers " +
      "the light's current name.",
    inputSchema: {
      type: "object",
      properties: {
        lightKey: { type: "string" },
        effect: { type: "string" },
        grant: { type: "object" },
      },
      required: ["lightKey", "effect", "grant"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
] as const;

export async function callTool(ctx: ToolContext, name: string, args: any) {
  try {
    return await dispatchTool(ctx, name, args);
  } catch (error) {
    // Grant blocks already write their own detailed "blocked" audit entry
    // at the point of failure. Anything else that escapes here -- a bridge
    // timeout, a bridge-side rejection, a validation error -- gets one
    // catch-all "failed" entry so nothing that errors out goes unlogged.
    if (!(error instanceof GrantViolation)) {
      await writeAudit(
        ctx.audit,
        newAuditEntry(name, args, "failed", error instanceof Error ? error.message : String(error))
      );
    }
    throw error;
  }
}

async function dispatchTool(ctx: ToolContext, name: string, args: any) {
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

    case "hue_list_motion_sensors": {
      const result = await hue.motionSensors();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_buttons": {
      const result = await hue.buttons();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_temperature_sensors": {
      const result = await hue.temperatureSensors();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_light_level_sensors": {
      const result = await hue.lightLevelSensors();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_entertainment_areas": {
      const result = await hue.entertainmentAreas();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_behavior_scripts": {
      const result = await hue.behaviorScripts();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_list_behavior_instances": {
      const result = await hue.behaviorInstances();
      await writeAudit(audit, newAuditEntry(name, args, "executed"));
      return result;
    }

    case "hue_rename_light": {
      const grant = args.grant as Grant;
      validateNonEmptyString(args.lightKey, "lightKey");
      validateNonEmptyString(args.newName, "newName");
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
      validateNonEmptyString(args.lightKey, "lightKey");
      const brightness = validateBrightness(args.brightness);
      const mirek = validateMirek(args.mirek);
      const xy = validateXy(args.xy);
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
      const result = await hue.setLightState(id, args.on, { brightness, xy, mirek });
      grant.usedAt = new Date().toISOString();
      await writeAudit(
        audit,
        newAuditEntry(
          name,
          { lightId: id, on: args.on, brightness, xy, mirek },
          "executed",
          undefined,
          grant.grantId
        )
      );
      return result;
    }

    case "hue_recall_scene": {
      const grant = args.grant as Grant;
      validateNonEmptyString(args.sceneKey, "sceneKey");
      const { id, name: sceneName } = await hue.resolveSceneId(args.sceneKey);
      try {
        checkGrant(grant, "scene_recall", sceneName);
      } catch (error) {
        if (error instanceof GrantViolation) {
          await writeAudit(audit, newAuditEntry(name, args, "blocked", error.message, grant.grantId));
          throw error;
        }
        throw error;
      }
      const result = await hue.recallScene(id);
      grant.usedAt = new Date().toISOString();
      await writeAudit(
        audit,
        newAuditEntry(name, { sceneId: id, sceneName }, "executed", undefined, grant.grantId)
      );
      return result;
    }

    case "hue_set_group_state": {
      const grant = args.grant as Grant;
      validateNonEmptyString(args.groupedLightId, "groupedLightId");
      const brightness = validateBrightness(args.brightness);
      try {
        checkGrant(grant, "state_write", args.groupedLightId);
      } catch (error) {
        if (error instanceof GrantViolation) {
          await writeAudit(audit, newAuditEntry(name, args, "blocked", error.message, grant.grantId));
          throw error;
        }
        throw error;
      }
      const result = await hue.setGroupState(args.groupedLightId, args.on, brightness);
      grant.usedAt = new Date().toISOString();
      await writeAudit(
        audit,
        newAuditEntry(name, { groupedLightId: args.groupedLightId, on: args.on, brightness }, "executed", undefined, grant.grantId)
      );
      return result;
    }

    case "hue_set_light_effect": {
      const grant = args.grant as Grant;
      validateNonEmptyString(args.lightKey, "lightKey");
      validateNonEmptyString(args.effect, "effect");
      const { id, name: currentName } = await hue.resolveLightId(args.lightKey);
      try {
        checkGrant(grant, "state_write", currentName);
      } catch (error) {
        if (error instanceof GrantViolation) {
          await writeAudit(audit, newAuditEntry(name, args, "blocked", error.message, grant.grantId));
          throw error;
        }
        throw error;
      }
      const result = await hue.setLightEffect(id, args.effect);
      grant.usedAt = new Date().toISOString();
      await writeAudit(
        audit,
        newAuditEntry(name, { lightId: id, effect: args.effect }, "executed", undefined, grant.grantId)
      );
      return result;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
