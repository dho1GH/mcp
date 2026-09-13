import type { Env } from "./types.js";

const TIMEOUT_MS = 15_000;

function baseUrl(env: Env): string {
  const url = env.HUE_EXECUTOR_BASE_URL?.trim();
  if (!url) throw new Error("HUE_EXECUTOR_BASE_URL is not configured");
  return url;
}

function authHeaders(env: Env): Record<string, string> {
  const token = env.HUE_EXECUTOR_BEARER_TOKEN?.trim();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function request(
  env: Env,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = new URL(path, baseUrl(env));
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...authHeaders(env),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const response = await fetch(url, init);
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Hue executor ${response.status}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

export class HueProxy {
  constructor(private env: Env) {}

  private get(path: string) {
    return request(this.env, "GET", path);
  }
  private put(path: string, body: unknown) {
    return request(this.env, "PUT", path, body);
  }

  // --- Lights ---
  getLights() {
    return this.get("/v1/lights");
  }
  getLight(id: string) {
    return this.get(`/v1/lights/${encodeURIComponent(id)}`);
  }
  renameLight(id: string, name: string) {
    return this.put(`/v1/lights/${encodeURIComponent(id)}/name`, { name });
  }
  setLightState(id: string, state: Record<string, unknown>) {
    return this.put(`/v1/lights/${encodeURIComponent(id)}/state`, state);
  }
  setLightEffect(id: string, effect: string) {
    return this.put(`/v1/lights/${encodeURIComponent(id)}/effect`, { effect });
  }

  // --- Rooms & Zones ---
  getRooms() {
    return this.get("/v1/rooms");
  }
  getZones() {
    return this.get("/v1/zones");
  }

  // --- Scenes ---
  getScenes() {
    return this.get("/v1/scenes");
  }
  recallScene(id: string) {
    return this.put(`/v1/scenes/${encodeURIComponent(id)}/recall`, {});
  }

  // --- Groups ---
  setGroupState(groupedLightId: string, on: boolean, brightness?: number) {
    return this.put(`/v1/groups/${encodeURIComponent(groupedLightId)}/state`, { on, brightness });
  }

  // --- Sensors ---
  getMotionSensors() {
    return this.get("/v1/sensors/motion");
  }
  getButtons() {
    return this.get("/v1/sensors/buttons");
  }
  getTemperatureSensors() {
    return this.get("/v1/sensors/temperature");
  }
  getLightLevelSensors() {
    return this.get("/v1/sensors/light-level");
  }

  // --- Entertainment ---
  getEntertainmentAreas() {
    return this.get("/v1/entertainment");
  }

  // --- Behaviors ---
  getBehaviorScripts() {
    return this.get("/v1/behaviors/scripts");
  }
  getBehaviorInstances() {
    return this.get("/v1/behaviors/instances");
  }

  // --- Resolvers ---
  resolveLight(key: string) {
    return this.get(`/v1/resolve/light/${encodeURIComponent(key)}`);
  }
  resolveScene(key: string) {
    return this.get(`/v1/resolve/scene/${encodeURIComponent(key)}`);
  }
}
