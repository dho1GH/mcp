import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { HueProxy } from "./hue-proxy.js";
import { newAuditEntry, writeAudit } from "./audit.js";
import type { Env } from "./types.js";

function textResult(text: string, structuredContent?: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structuredContent !== undefined ? { structuredContent } : {}),
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function audited(
  kv: KVNamespace,
  toolName: string,
  handler: ToolHandler,
): (args: Record<string, unknown>) => Promise<ReturnType<typeof textResult> | ReturnType<typeof errorResult>> {
  return async (args: Record<string, unknown>) => {
    const start = Date.now();
    try {
      const data = await handler(args);
      const entry = newAuditEntry(toolName, args, "executed", Date.now() - start);
      await writeAudit(kv, entry);
      return textResult(JSON.stringify(data, null, 2), data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const entry = newAuditEntry(toolName, args, "failed", Date.now() - start, message);
      await writeAudit(kv, entry);
      return errorResult(err);
    }
  };
}

function auditedText(
  kv: KVNamespace,
  toolName: string,
  handler: (args: Record<string, unknown>) => Promise<{ text: string; data: unknown }>,
): (args: Record<string, unknown>) => Promise<ReturnType<typeof textResult> | ReturnType<typeof errorResult>> {
  return async (args: Record<string, unknown>) => {
    const start = Date.now();
    try {
      const { text, data } = await handler(args);
      const entry = newAuditEntry(toolName, args, "executed", Date.now() - start);
      await writeAudit(kv, entry);
      return textResult(text, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const entry = newAuditEntry(toolName, args, "failed", Date.now() - start, message);
      await writeAudit(kv, entry);
      return errorResult(err);
    }
  };
}

export function registerHueTools(server: McpServer, env: Env): void {
  const hue = new HueProxy(env);
  const kv = env.AUDIT_LOG;

  // =====================================================================
  //  READ TOOLS
  // =====================================================================

  server.registerTool(
    "hue_list_lights",
    {
      title: "List all Hue lights",
      description:
        "Fetch every light on the Hue bridge with id, name, on/off state, brightness, color temperature, and xy color coordinates.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_lights", () => hue.getLights()),
  );

  server.registerTool(
    "hue_get_light",
    {
      title: "Get a single Hue light",
      description:
        "Fetch one light by its Hue v2 resource id. Returns id, name, on/off state, brightness, color temperature, and xy color.",
      inputSchema: {
        id: z.string().min(1).describe("Hue v2 resource id of the light"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_get_light", ({ id }) => hue.getLight(id as string)),
  );

  server.registerTool(
    "hue_list_rooms",
    {
      title: "List Hue rooms",
      description: "Fetch all rooms configured on the Hue bridge, including their grouped lights and child devices.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_rooms", () => hue.getRooms()),
  );

  server.registerTool(
    "hue_list_zones",
    {
      title: "List Hue zones",
      description:
        "Fetch all zones configured on the Hue bridge. Zones can overlap rooms and group lights across physical spaces.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_zones", () => hue.getZones()),
  );

  server.registerTool(
    "hue_list_scenes",
    {
      title: "List Hue scenes",
      description:
        "Fetch all scenes configured on the Hue bridge with their ids, names, and associated rooms/zones.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_scenes", () => hue.getScenes()),
  );

  server.registerTool(
    "hue_list_motion_sensors",
    {
      title: "List Hue motion sensors",
      description: "Fetch all motion sensors on the bridge with their current state (motion detected, enabled, sensitivity).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_motion_sensors", () => hue.getMotionSensors()),
  );

  server.registerTool(
    "hue_list_buttons",
    {
      title: "List Hue buttons",
      description: "Fetch all button/switch devices (e.g. Hue Dimmer Switch, Tap Dial) and their last-press events.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_buttons", () => hue.getButtons()),
  );

  server.registerTool(
    "hue_list_temperature_sensors",
    {
      title: "List Hue temperature sensors",
      description: "Fetch all temperature sensors and their current readings.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_temperature_sensors", () => hue.getTemperatureSensors()),
  );

  server.registerTool(
    "hue_list_light_level_sensors",
    {
      title: "List Hue light level sensors",
      description: "Fetch all ambient light level sensors and their current lux readings.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_light_level_sensors", () => hue.getLightLevelSensors()),
  );

  server.registerTool(
    "hue_list_entertainment_areas",
    {
      title: "List Hue entertainment areas",
      description: "Fetch all entertainment configurations (used for Hue Sync, gaming integrations, etc.).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_entertainment_areas", () => hue.getEntertainmentAreas()),
  );

  server.registerTool(
    "hue_list_behavior_scripts",
    {
      title: "List Hue behavior scripts",
      description: "Fetch all behavior scripts available on the bridge (automation templates like wake-up, go-to-sleep).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_behavior_scripts", () => hue.getBehaviorScripts()),
  );

  server.registerTool(
    "hue_list_behavior_instances",
    {
      title: "List Hue behavior instances",
      description: "Fetch all active behavior instances (running automations) on the bridge.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_list_behavior_instances", () => hue.getBehaviorInstances()),
  );

  // =====================================================================
  //  RESOLVER TOOLS
  // =====================================================================

  server.registerTool(
    "hue_resolve_light",
    {
      title: "Resolve a light by name or id",
      description:
        "Look up a light by its v2 UUID, v1 numeric id, or exact name. Returns the resolved v2 id and name. Use this before write operations when you have a name instead of an id.",
      inputSchema: {
        key: z.string().min(1).describe("Light name, v2 UUID, or v1 numeric id"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_resolve_light", ({ key }) => hue.resolveLight(key as string)),
  );

  server.registerTool(
    "hue_resolve_scene",
    {
      title: "Resolve a scene by name or id",
      description:
        "Look up a scene by its id or exact name. Returns the resolved id and name. Use this before recalling a scene when you have a name instead of an id.",
      inputSchema: {
        key: z.string().min(1).describe("Scene name or id"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    audited(kv, "hue_resolve_scene", ({ key }) => hue.resolveScene(key as string)),
  );

  // =====================================================================
  //  WRITE TOOLS
  // =====================================================================

  server.registerTool(
    "hue_rename_light",
    {
      title: "Rename a Hue light",
      description: "Change the display name of a light on the bridge.",
      inputSchema: {
        id: z.string().min(1).describe("Hue v2 resource id of the light"),
        name: z.string().min(1).max(64).describe("New display name (1-64 characters)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    auditedText(kv, "hue_rename_light", async (args) => {
      const data = await hue.renameLight(args.id as string, args.name as string);
      return { text: `Renamed light ${args.id} to "${args.name}"`, data };
    }),
  );

  server.registerTool(
    "hue_set_light_state",
    {
      title: "Set Hue light state",
      description:
        "Change a light's on/off state, brightness, color temperature, and/or xy color. At least one field is required.",
      inputSchema: {
        id: z.string().min(1).describe("Hue v2 resource id of the light"),
        on: z.boolean().optional().describe("Turn light on (true) or off (false)"),
        brightness: z.number().min(0).max(100).optional().describe("Brightness percentage (0-100)"),
        colorTemp: z.number().min(153).max(500).optional().describe("Color temperature in mirek (153=cool to 500=warm)"),
        xy_x: z.number().min(0).max(1).optional().describe("CIE x coordinate (0-1)"),
        xy_y: z.number().min(0).max(1).optional().describe("CIE y coordinate (0-1)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    auditedText(kv, "hue_set_light_state", async (args) => {
      const state: Record<string, unknown> = {};
      if (args.on !== undefined) state.on = args.on;
      if (args.brightness !== undefined) state.brightness = args.brightness;
      if (args.colorTemp !== undefined) state.colorTemp = args.colorTemp;
      if (args.xy_x !== undefined && args.xy_y !== undefined) state.xy = { x: args.xy_x, y: args.xy_y };
      if (Object.keys(state).length === 0) throw new Error("At least one state field is required");
      const data = await hue.setLightState(args.id as string, state);
      return { text: `Updated light ${args.id} state`, data };
    }),
  );

  server.registerTool(
    "hue_set_light_effect",
    {
      title: "Set Hue light effect",
      description:
        'Activate a built-in light effect (e.g. "candle", "fire", "sparkle"). Use "no_effect" to stop the current effect.',
      inputSchema: {
        id: z.string().min(1).describe("Hue v2 resource id of the light"),
        effect: z.string().min(1).describe('Effect name (e.g. "candle", "fire", "sparkle", "no_effect")'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    auditedText(kv, "hue_set_light_effect", async (args) => {
      const data = await hue.setLightEffect(args.id as string, args.effect as string);
      return { text: `Set effect "${args.effect}" on light ${args.id}`, data };
    }),
  );

  server.registerTool(
    "hue_recall_scene",
    {
      title: "Recall (activate) a Hue scene",
      description:
        "Activate a scene by its id, applying its stored light states to the associated room or zone.",
      inputSchema: {
        id: z.string().min(1).describe("Hue v2 scene id"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    auditedText(kv, "hue_recall_scene", async (args) => {
      const data = await hue.recallScene(args.id as string);
      return { text: `Recalled scene ${args.id}`, data };
    }),
  );

  server.registerTool(
    "hue_set_group_state",
    {
      title: "Set Hue group (room/zone) state",
      description:
        "Turn all lights in a room or zone on/off, and optionally set group brightness. Requires the grouped_light resource id (found in room/zone data).",
      inputSchema: {
        groupedLightId: z.string().min(1).describe("Grouped light resource id from room/zone data"),
        on: z.boolean().describe("Turn group on (true) or off (false)"),
        brightness: z.number().min(0).max(100).optional().describe("Group brightness percentage (0-100)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    auditedText(kv, "hue_set_group_state", async (args) => {
      const data = await hue.setGroupState(
        args.groupedLightId as string,
        args.on as boolean,
        args.brightness as number | undefined,
      );
      return { text: `Updated group ${args.groupedLightId}`, data };
    }),
  );
}
