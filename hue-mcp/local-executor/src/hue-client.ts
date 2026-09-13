import https from "node:https";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_OP_ENVIRONMENT_ID = "vsl3suvn4s2dnekt6hr5fpykl4";
const REQUEST_TIMEOUT_MS = 10_000;

function fromLocalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

async function loadHueConfig(): Promise<{ bridgeIp: string; appKey: string }> {
  const token = fromLocalEnv("OP_SERVICE_ACCOUNT_TOKEN");
  let values: Record<string, string> = {};

  if (token) {
    const { createClient } = await import("@1password/sdk");
    const client = await createClient({
      auth: token,
      integrationName: "itsjeff.org hue-control",
      integrationVersion: "v1.0.0",
    });
    const environmentId = fromLocalEnv("OP_ENVIRONMENT_ID") ?? DEFAULT_OP_ENVIRONMENT_ID;
    const response = await (client as any).environments.getVariables(environmentId);
    values = Object.fromEntries(
      response.variables.map((variable: { name: string; value: string }) => [variable.name, variable.value]),
    );
  }

  const bridgeIp = values.HUE_BRIDGE_IP ?? fromLocalEnv("HUE_BRIDGE_IP");
  const appKey = values.HUE_APP_KEY ?? fromLocalEnv("HUE_APP_KEY");
  if (!bridgeIp) throw new Error("HUE_BRIDGE_IP could not be retrieved from 1Password or env");
  if (!appKey) throw new Error("HUE_APP_KEY could not be retrieved from 1Password or env");
  return { bridgeIp, appKey };
}

function requestJson(
  config: { bridgeIp: string; appKey: string },
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const request = https.request(
      {
        hostname: config.bridgeIp,
        path,
        method,
        rejectUnauthorized: false,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "content-type": "application/json",
          "hue-application-key": config.appKey,
          ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
        },
      },
      (response) => {
        let responseBody = "";
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          let parsed: any;
          try {
            parsed = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            parsed = { raw: responseBody };
          }
          if ((response.statusCode ?? 500) >= 400) {
            reject(new Error(`Hue API ${response.statusCode}: ${JSON.stringify(parsed)}`));
            return;
          }
          resolve(parsed);
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("Hue API request timed out")));
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

export interface HueLight {
  id: string;
  id_v1?: string;
  name: string;
  on: boolean;
  brightness?: number;
  colorTemp?: number;
  xy?: { x: number; y: number };
}

export class HueClientService {
  private config: { bridgeIp: string; appKey: string } | null = null;

  private async init() {
    this.config ??= await loadHueConfig();
  }
  private async get(path: string) {
    await this.init();
    return requestJson(this.config!, "GET", path);
  }
  private async put(path: string, body: unknown) {
    await this.init();
    return requestJson(this.config!, "PUT", path, body);
  }

  // --- Lights ---

  async getLights(): Promise<HueLight[]> {
    const response = await this.get("/clip/v2/resource/light");
    if (!Array.isArray(response.data)) throw new Error("Hue light response did not contain a data array");
    return response.data.map((light: any) => ({
      id: light.id,
      id_v1: light.id_v1,
      name: light.metadata?.name ?? "Unknown Light",
      on: light.on?.on ?? false,
      brightness: light.dimming?.brightness,
      colorTemp: light.color_temperature?.mirek,
      xy: light.color?.xy,
    }));
  }

  async getLight(id: string): Promise<HueLight> {
    const response = await this.get(`/clip/v2/resource/light/${encodeURIComponent(id)}`);
    const light = response.data?.[0];
    if (!light) throw new Error(`Hue light not found: ${id}`);
    return {
      id: light.id,
      id_v1: light.id_v1,
      name: light.metadata?.name ?? "Unknown Light",
      on: light.on?.on ?? false,
      brightness: light.dimming?.brightness,
      colorTemp: light.color_temperature?.mirek,
      xy: light.color?.xy,
    };
  }

  async renameLight(id: string, name: string): Promise<any> {
    if (!name.trim()) throw new Error("name is required");
    return this.put(`/clip/v2/resource/light/${encodeURIComponent(id)}`, { metadata: { name: name.trim() } });
  }

  async setLightState(
    id: string,
    state: { on?: boolean; brightness?: number; colorTemp?: number; xy?: { x: number; y: number } },
  ): Promise<any> {
    if (state.brightness !== undefined && (state.brightness < 0 || state.brightness > 100))
      throw new Error("brightness must be between 0 and 100");
    if (state.colorTemp !== undefined && (state.colorTemp < 153 || state.colorTemp > 500))
      throw new Error("colorTemp must be between 153 and 500 mireks");
    if (state.xy !== undefined && (state.xy.x < 0 || state.xy.x > 1 || state.xy.y < 0 || state.xy.y > 1))
      throw new Error("xy values must be between 0 and 1");

    const body: Record<string, unknown> = {};
    if (state.on !== undefined) body.on = { on: state.on };
    if (state.brightness !== undefined) body.dimming = { brightness: state.brightness };
    if (state.colorTemp !== undefined) body.color_temperature = { mirek: state.colorTemp };
    if (state.xy !== undefined) body.color = { xy: state.xy };
    if (Object.keys(body).length === 0) throw new Error("at least one state field is required");
    return this.put(`/clip/v2/resource/light/${encodeURIComponent(id)}`, body);
  }

  async setLightEffect(id: string, effect: string): Promise<any> {
    if (!effect.trim()) throw new Error("effect is required");
    return this.put(`/clip/v2/resource/light/${encodeURIComponent(id)}`, { effects: { effect: effect.trim() } });
  }

  // --- Rooms, Zones ---

  async getRooms(): Promise<any> {
    return this.get("/clip/v2/resource/room");
  }

  async getZones(): Promise<any> {
    return this.get("/clip/v2/resource/zone");
  }

  // --- Scenes ---

  async getScenes(): Promise<any> {
    return this.get("/clip/v2/resource/scene");
  }

  async recallScene(id: string): Promise<any> {
    return this.put(`/clip/v2/resource/scene/${encodeURIComponent(id)}`, { recall: { action: "active" } });
  }

  // --- Groups ---

  async setGroupState(groupedLightId: string, on: boolean, brightness?: number): Promise<any> {
    const body: Record<string, unknown> = { on: { on } };
    if (brightness !== undefined) {
      if (brightness < 0 || brightness > 100) throw new Error("brightness must be between 0 and 100");
      body.dimming = { brightness };
    }
    return this.put(`/clip/v2/resource/grouped_light/${encodeURIComponent(groupedLightId)}`, body);
  }

  // --- Sensors ---

  async getMotionSensors(): Promise<any> {
    return this.get("/clip/v2/resource/motion");
  }

  async getButtons(): Promise<any> {
    return this.get("/clip/v2/resource/button");
  }

  async getTemperatureSensors(): Promise<any> {
    return this.get("/clip/v2/resource/temperature");
  }

  async getLightLevelSensors(): Promise<any> {
    return this.get("/clip/v2/resource/light_level");
  }

  // --- Entertainment ---

  async getEntertainmentAreas(): Promise<any> {
    return this.get("/clip/v2/resource/entertainment_configuration");
  }

  // --- Behaviors ---

  async getBehaviorScripts(): Promise<any> {
    return this.get("/clip/v2/resource/behavior_script");
  }

  async getBehaviorInstances(): Promise<any> {
    return this.get("/clip/v2/resource/behavior_instance");
  }

  // --- Resolvers (from v2) ---

  async resolveLightId(key: string): Promise<{ id: string; name: string }> {
    const trimmed = key.trim();
    const lights = await this.getLights();
    const byId = lights.find((l) => l.id === trimmed);
    if (byId) return { id: byId.id, name: byId.name };

    const byV1 = lights.find((l) => l.id_v1 === `/lights/${trimmed}`);
    if (byV1) return { id: byV1.id, name: byV1.name };

    const byName = lights.filter((l) => l.name === trimmed);
    if (byName.length === 1) return { id: byName[0].id, name: byName[0].name };
    if (byName.length > 1) throw new Error(`Multiple lights named "${trimmed}"; use the v2 id instead`);

    throw new Error(`No light found matching v2 id, v1 id, or exact name: "${trimmed}"`);
  }

  async resolveSceneId(key: string): Promise<{ id: string; name: string }> {
    const trimmed = key.trim();
    const response = await this.getScenes();
    const scenes: any[] = response.data ?? [];

    const byId = scenes.find((s: any) => s.id === trimmed);
    if (byId) return { id: byId.id, name: byId.metadata?.name ?? "<unnamed>" };

    const byName = scenes.filter((s: any) => s.metadata?.name === trimmed);
    if (byName.length === 1) return { id: byName[0].id, name: byName[0].metadata?.name ?? "<unnamed>" };
    if (byName.length > 1) throw new Error(`Multiple scenes named "${trimmed}"; use the scene id instead`);

    throw new Error(`No scene found matching id or exact name: "${trimmed}"`);
  }
}
