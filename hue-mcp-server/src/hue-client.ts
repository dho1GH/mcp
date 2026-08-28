import type { Env, HueLight } from "./types";

async function hueRequest<T>(
  env: Env,
  method: "GET" | "PUT",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `https://${env.HUE_BRIDGE_IP}${path}`;

  // The Hue Bridge uses a local/self-signed certificate. Cloudflare Workers'
  // fetch cannot disable TLS verification per-request the way Node's
  // `rejectUnauthorized: false` does, so a locally-run (wrangler dev) Worker
  // on the same LAN as the bridge is the supported path for now. A deployed
  // Worker would need the bridge fronted by something with a valid cert
  // (e.g. a reverse proxy on the same box as your Node-RED tunnel).
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "hue-application-key": env.HUE_APP_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Hue API ${response.status}: ${JSON.stringify(parsed)}`);
  }

  const asRecord = parsed as { errors?: unknown[] };
  if (asRecord.errors && asRecord.errors.length > 0) {
    throw new Error(`Hue API errors: ${JSON.stringify(asRecord.errors)}`);
  }

  return parsed as T;
}

export class HueClient {
  constructor(private env: Env) {}

  lights() {
    return hueRequest<{ data: HueLight[] }>(this.env, "GET", "/clip/v2/resource/light");
  }

  rooms() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/room");
  }

  zones() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/zone");
  }

  scenes() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/scene");
  }

  bridgeHome() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/bridge_home");
  }

  renameLight(lightId: string, newName: string) {
    return hueRequest(this.env, "PUT", `/clip/v2/resource/light/${lightId}`, {
      metadata: { name: newName },
    });
  }

  setLightState(lightId: string, on: boolean, brightness?: number) {
    const body: Record<string, unknown> = { on: { on } };
    if (brightness !== undefined) {
      body.dimming = { brightness };
    }
    return hueRequest(this.env, "PUT", `/clip/v2/resource/light/${lightId}`, body);
  }

  async resolveLightId(key: string): Promise<{ id: string; name: string }> {
    const { data: lights } = await this.lights();
    const trimmed = key.trim();

    const byId = lights.find((l) => l.id === trimmed);
    if (byId) return { id: byId.id, name: byId.metadata?.name ?? "<unnamed>" };

    const byV1 = lights.find((l) => l.id_v1 === `/lights/${trimmed}`);
    if (byV1) return { id: byV1.id, name: byV1.metadata?.name ?? "<unnamed>" };

    const matches = lights.filter((l) => l.metadata?.name === trimmed);
    if (matches.length === 1) {
      return { id: matches[0].id, name: matches[0].metadata?.name ?? "<unnamed>" };
    }
    if (matches.length > 1) {
      throw new Error(`Multiple lights named "${trimmed}"; use the v2 id instead.`);
    }

    throw new Error(`No light found matching v2 id, v1 id, or exact name: "${trimmed}"`);
  }
}
