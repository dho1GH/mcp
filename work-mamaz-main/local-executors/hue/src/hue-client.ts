import https from "node:https";
import { createClient } from "@1password/sdk";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_OP_ENVIRONMENT_ID = "vsl3suvn4s2dnekt6hr5fpykl4";

function fromLocalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

async function loadHueConfig(): Promise<{ bridgeIp: string; appKey: string }> {
  const token = fromLocalEnv("OP_SERVICE_ACCOUNT_TOKEN");
  let values: Record<string, string> = {};

  if (token) {
    const client = await createClient({
      auth: token,
      integrationName: "itsjeff.org hue-control",
      integrationVersion: "v0.2.0",
    });
    const environmentId = fromLocalEnv("OP_ENVIRONMENT_ID") ?? DEFAULT_OP_ENVIRONMENT_ID;
    const response = await client.environments.getVariables(environmentId);
    values = Object.fromEntries(response.variables.map((variable) => [variable.name, variable.value]));
  }

  const bridgeIp = values.HUE_BRIDGE_IP ?? fromLocalEnv("HUE_BRIDGE_IP");
  const appKey = values.HUE_APP_KEY ?? fromLocalEnv("HUE_APP_KEY");
  if (!bridgeIp) throw new Error("HUE_BRIDGE_IP could not be retrieved from 1Password or env");
  if (!appKey) throw new Error("HUE_APP_KEY could not be retrieved from 1Password or env");
  return { bridgeIp, appKey };
}

function requestJson(config: { bridgeIp: string; appKey: string }, method: string, path: string, body?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const request = https.request({
      hostname: config.bridgeIp,
      path,
      method,
      rejectUnauthorized: false,
      timeout: 10_000,
      headers: {
        "content-type": "application/json",
        "hue-application-key": config.appKey,
        ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
      },
    }, (response) => {
      let responseBody = "";
      response.on("data", (chunk) => { responseBody += chunk; });
      response.on("end", () => {
        let parsed: any;
        try { parsed = responseBody ? JSON.parse(responseBody) : {}; }
        catch { parsed = { raw: responseBody }; }
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`Hue API ${response.statusCode}: ${JSON.stringify(parsed)}`));
          return;
        }
        resolve(parsed);
      });
    });
    request.on("timeout", () => request.destroy(new Error("Hue API request timed out")));
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

export interface HueLight {
  id: string;
  name: string;
  on: boolean;
  brightness?: number;
  colorTemp?: number;
}

export class HueClientService {
  private config: { bridgeIp: string; appKey: string } | null = null;
  private async init() { this.config ??= await loadHueConfig(); }
  private async get(path: string) { await this.init(); return requestJson(this.config!, "GET", path); }
  private async put(path: string, body: unknown) { await this.init(); return requestJson(this.config!, "PUT", path, body); }

  async getLights(): Promise<HueLight[]> {
    const response = await this.get("/clip/v2/resource/light");
    if (!Array.isArray(response.data)) throw new Error("Hue light response did not contain a data array");
    return response.data.map((light: any) => ({
      id: light.id,
      name: light.metadata?.name ?? "Unknown Light",
      on: light.on?.on ?? false,
      brightness: light.dimming?.brightness,
      colorTemp: light.color_temperature?.mirek,
    }));
  }

  async getLight(id: string): Promise<HueLight> {
    const response = await this.get(`/clip/v2/resource/light/${encodeURIComponent(id)}`);
    const light = response.data?.[0];
    if (!light) throw new Error(`Hue light not found: ${id}`);
    return {
      id: light.id,
      name: light.metadata?.name ?? "Unknown Light",
      on: light.on?.on ?? false,
      brightness: light.dimming?.brightness,
      colorTemp: light.color_temperature?.mirek,
    };
  }

  async renameLight(id: string, name: string): Promise<any> {
    if (!name.trim()) throw new Error("name is required");
    return this.put(`/clip/v2/resource/light/${encodeURIComponent(id)}`, { metadata: { name: name.trim() } });
  }

  async setLightState(id: string, state: { on?: boolean; brightness?: number; colorTemp?: number }): Promise<any> {
    if (state.brightness !== undefined && (state.brightness < 0 || state.brightness > 100)) throw new Error("brightness must be between 0 and 100");
    if (state.colorTemp !== undefined && (state.colorTemp < 153 || state.colorTemp > 500)) throw new Error("colorTemp must be between 153 and 500 mireks");
    const body: Record<string, unknown> = {};
    if (state.on !== undefined) body.on = { on: state.on };
    if (state.brightness !== undefined) body.dimming = { brightness: state.brightness };
    if (state.colorTemp !== undefined) body.color_temperature = { mirek: state.colorTemp };
    if (Object.keys(body).length === 0) throw new Error("at least one state field is required");
    return this.put(`/clip/v2/resource/light/${encodeURIComponent(id)}`, body);
  }
}
