import type { Env, HueLight } from "./types";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2; // total attempts = 1 + MAX_RETRIES
const RETRY_BASE_DELAY_MS = 300;

export class HueTimeoutError extends Error {}
export class HueApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export class HueValidationError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HueTimeoutError) return true;
  if (error instanceof HueApiError) return error.status >= 500;
  // Network-level failures (DNS, connection refused, TLS) surface as plain
  // TypeErrors from fetch — worth one retry in case the bridge just woke up.
  if (error instanceof TypeError) return true;
  return false;
}

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

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          "hue-application-key": env.HUE_APP_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = { raw: text };
      }

      if (!response.ok) {
        const err = new HueApiError(response.status, `Hue API ${response.status}: ${JSON.stringify(parsed)}`);
        if (isRetryable(err) && attempt < MAX_RETRIES) {
          lastError = err;
          continue;
        }
        throw err;
      }

      const asRecord = parsed as { errors?: unknown[] };
      if (asRecord.errors && asRecord.errors.length > 0) {
        // Hue's v2 API can return HTTP 200 with an `errors` array for
        // partial/soft failures (e.g. an unknown resource id in a bulk
        // request) -- not retryable, this is a real rejection.
        throw new HueApiError(200, `Hue API errors: ${JSON.stringify(asRecord.errors)}`);
      }

      return parsed as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        const timeoutErr = new HueTimeoutError(
          `Hue Bridge did not respond within ${REQUEST_TIMEOUT_MS}ms (${method} ${path})`
        );
        if (attempt < MAX_RETRIES) {
          lastError = timeoutErr;
          continue;
        }
        throw timeoutErr;
      }

      if (isRetryable(error) && attempt < MAX_RETRIES) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// Short-TTL in-memory cache for list reads. A single Worker isolate can stay
// warm across several tool calls within one back-and-forth conversation, so
// this avoids re-fetching the full light/scene list on every single write
// (which needs a fresh id lookup) when the user is issuing several actions
// in quick succession. TTL is short enough that it never masks a real
// state change made outside this conversation.
const LIST_CACHE_TTL_MS = 4000;
const listCache = new Map<string, { data: unknown; expiresAt: number }>();

async function cachedList<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = listCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data as T;
  }
  const data = await fetcher();
  listCache.set(cacheKey, { data, expiresAt: Date.now() + LIST_CACHE_TTL_MS });
  return data;
}

function invalidateCache(cacheKey: string) {
  listCache.delete(cacheKey);
}

export class HueClient {
  constructor(private env: Env) {}

  lights() {
    return cachedList("lights", () => hueRequest<{ data: HueLight[] }>(this.env, "GET", "/clip/v2/resource/light"));
  }

  rooms() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/room");
  }

  zones() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/zone");
  }

  scenes() {
    return cachedList("scenes", () => hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/scene"));
  }

  bridgeHome() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/bridge_home");
  }

  motionSensors() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/motion");
  }

  buttons() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/button");
  }

  temperatureSensors() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/temperature");
  }

  lightLevelSensors() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/light_level");
  }

  entertainmentAreas() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/entertainment_configuration");
  }

  behaviorScripts() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/behavior_script");
  }

  behaviorInstances() {
    return hueRequest<{ data: unknown[] }>(this.env, "GET", "/clip/v2/resource/behavior_instance");
  }

  setLightEffect(lightId: string, effect: string) {
    return hueRequest(this.env, "PUT", `/clip/v2/resource/light/${lightId}`, {
      effects: { effect },
    }).then((res) => {
      invalidateCache("lights");
      return res;
    });
  }

  renameLight(lightId: string, newName: string) {
    return hueRequest(this.env, "PUT", `/clip/v2/resource/light/${lightId}`, {
      metadata: { name: newName },
    }).then((res) => {
      invalidateCache("lights");
      return res;
    });
  }

  setLightState(
    lightId: string,
    on: boolean,
    opts?: { brightness?: number; xy?: { x: number; y: number }; mirek?: number }
  ) {
    const body: Record<string, unknown> = { on: { on } };
    if (opts?.brightness !== undefined) {
      body.dimming = { brightness: opts.brightness };
    }
    if (opts?.xy) {
      body.color = { xy: opts.xy };
    }
    if (opts?.mirek !== undefined) {
      body.color_temperature = { mirek: opts.mirek };
    }
    return hueRequest(this.env, "PUT", `/clip/v2/resource/light/${lightId}`, body).then((res) => {
      invalidateCache("lights");
      return res;
    });
  }

  recallScene(sceneId: string) {
    return hueRequest(this.env, "PUT", `/clip/v2/resource/scene/${sceneId}`, {
      recall: { action: "active" },
    });
  }

  setGroupState(groupedLightId: string, on: boolean, brightness?: number) {
    const body: Record<string, unknown> = { on: { on } };
    if (brightness !== undefined) {
      body.dimming = { brightness };
    }
    return hueRequest(this.env, "PUT", `/clip/v2/resource/grouped_light/${groupedLightId}`, body);
  }

  async resolveSceneId(key: string): Promise<{ id: string; name: string }> {
    const { data: scenes } = await this.scenes();
    const trimmed = key.trim();
    const list = scenes as Array<{ id: string; metadata?: { name?: string } }>;
    const byId = list.find((s) => s.id === trimmed);
    if (byId) return { id: byId.id, name: byId.metadata?.name ?? "<unnamed>" };
    const matches = list.filter((s) => s.metadata?.name === trimmed);
    if (matches.length === 1) return { id: matches[0].id, name: matches[0].metadata?.name ?? "<unnamed>" };
    if (matches.length > 1) throw new Error(`Multiple scenes named "${trimmed}"; use the id instead.`);
    throw new Error(`No scene found matching id or exact name: "${trimmed}"`);
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
