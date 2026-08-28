import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { HueProxy } from "./hue-proxy.js";
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

export function registerHueTools(server: McpServer, env: Env): void {
  const hue = new HueProxy(env);

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
    async () => {
      try {
        const data = await hue.getLights();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({ id }: { id: string }) => {
      try {
        const data = await hue.getLight(id);
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_rooms",
    {
      title: "List Hue rooms",
      description: "Fetch all rooms configured on the Hue bridge, including their grouped lights and child devices.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getRooms();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async () => {
      try {
        const data = await hue.getZones();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async () => {
      try {
        const data = await hue.getScenes();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_motion_sensors",
    {
      title: "List Hue motion sensors",
      description: "Fetch all motion sensors on the bridge with their current state (motion detected, enabled, sensitivity).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getMotionSensors();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_buttons",
    {
      title: "List Hue buttons",
      description: "Fetch all button/switch devices (e.g. Hue Dimmer Switch, Tap Dial) and their last-press events.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getButtons();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_temperature_sensors",
    {
      title: "List Hue temperature sensors",
      description: "Fetch all temperature sensors and their current readings.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getTemperatureSensors();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_light_level_sensors",
    {
      title: "List Hue light level sensors",
      description: "Fetch all ambient light level sensors and their current lux readings.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getLightLevelSensors();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_entertainment_areas",
    {
      title: "List Hue entertainment areas",
      description: "Fetch all entertainment configurations (used for Hue Sync, gaming integrations, etc.).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getEntertainmentAreas();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_behavior_scripts",
    {
      title: "List Hue behavior scripts",
      description: "Fetch all behavior scripts available on the bridge (automation templates like wake-up, go-to-sleep).",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getBehaviorScripts();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "hue_list_behavior_instances",
    {
      title: "List Hue behavior instances",
      description: "Fetch all active behavior instances (running automations) on the bridge.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await hue.getBehaviorInstances();
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({ key }: { key: string }) => {
      try {
        const data = await hue.resolveLight(key);
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({ key }: { key: string }) => {
      try {
        const data = await hue.resolveScene(key);
        return textResult(JSON.stringify(data, null, 2), data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({ id, name }: { id: string; name: string }) => {
      try {
        const data = await hue.renameLight(id, name);
        return textResult(`Renamed light ${id} to "${name}"`, data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({
      id,
      on,
      brightness,
      colorTemp,
      xy_x,
      xy_y,
    }: {
      id: string;
      on?: boolean;
      brightness?: number;
      colorTemp?: number;
      xy_x?: number;
      xy_y?: number;
    }) => {
      try {
        const state: Record<string, unknown> = {};
        if (on !== undefined) state.on = on;
        if (brightness !== undefined) state.brightness = brightness;
        if (colorTemp !== undefined) state.colorTemp = colorTemp;
        if (xy_x !== undefined && xy_y !== undefined) state.xy = { x: xy_x, y: xy_y };
        if (Object.keys(state).length === 0) {
          return errorResult(new Error("At least one state field is required"));
        }
        const data = await hue.setLightState(id, state);
        return textResult(`Updated light ${id} state`, data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({ id, effect }: { id: string; effect: string }) => {
      try {
        const data = await hue.setLightEffect(id, effect);
        return textResult(`Set effect "${effect}" on light ${id}`, data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({ id }: { id: string }) => {
      try {
        const data = await hue.recallScene(id);
        return textResult(`Recalled scene ${id}`, data);
      } catch (err) {
        return errorResult(err);
      }
    },
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
    async ({
      groupedLightId,
      on,
      brightness,
    }: {
      groupedLightId: string;
      on: boolean;
      brightness?: number;
    }) => {
      try {
        const data = await hue.setGroupState(groupedLightId, on, brightness);
        return textResult(`Updated group ${groupedLightId}`, data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
