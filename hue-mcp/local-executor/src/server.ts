import http from "node:http";
import { HueClientService } from "./hue-client.js";

const hue = new HueClientService();
const port = Number(process.env.PORT ?? 8788);
const bearerToken = process.env.EXECUTOR_BEARER_TOKEN?.trim();

function send(response: http.ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  if (!raw) return {};
  const value = JSON.parse(raw) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON object required");
  return value as Record<string, unknown>;
}

http
  .createServer(async (request, response) => {
    try {
      if (bearerToken && request.headers.authorization !== `Bearer ${bearerToken}`) {
        return send(response, 401, { error: "unauthorized" });
      }

      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      const parts = url.pathname.split("/").filter(Boolean);
      const method = request.method ?? "GET";

      // --- Health ---
      if (method === "GET" && url.pathname === "/health") {
        return send(response, 200, { ok: true });
      }

      // --- Lights ---
      if (method === "GET" && url.pathname === "/v1/lights") {
        return send(response, 200, await hue.getLights());
      }
      if (method === "GET" && parts[0] === "v1" && parts[1] === "lights" && parts.length === 3) {
        return send(response, 200, await hue.getLight(decodeURIComponent(parts[2])));
      }
      if (method === "PUT" && parts[0] === "v1" && parts[1] === "lights" && parts.length === 4) {
        const lightId = decodeURIComponent(parts[2]);
        const body = await readBody(request);
        if (parts[3] === "name") {
          return send(response, 200, await hue.renameLight(lightId, String(body.name ?? "")));
        }
        if (parts[3] === "state") {
          return send(response, 200, await hue.setLightState(lightId, body as any));
        }
        if (parts[3] === "effect") {
          return send(response, 200, await hue.setLightEffect(lightId, String(body.effect ?? "")));
        }
      }

      // --- Rooms & Zones ---
      if (method === "GET" && url.pathname === "/v1/rooms") {
        return send(response, 200, await hue.getRooms());
      }
      if (method === "GET" && url.pathname === "/v1/zones") {
        return send(response, 200, await hue.getZones());
      }

      // --- Scenes ---
      if (method === "GET" && url.pathname === "/v1/scenes") {
        return send(response, 200, await hue.getScenes());
      }
      if (method === "PUT" && parts[0] === "v1" && parts[1] === "scenes" && parts[2] && parts[3] === "recall") {
        return send(response, 200, await hue.recallScene(decodeURIComponent(parts[2])));
      }

      // --- Groups ---
      if (method === "PUT" && parts[0] === "v1" && parts[1] === "groups" && parts[2] && parts[3] === "state") {
        const groupId = decodeURIComponent(parts[2]);
        const body = await readBody(request);
        return send(
          response,
          200,
          await hue.setGroupState(groupId, body.on as boolean, body.brightness as number | undefined),
        );
      }

      // --- Sensors ---
      if (method === "GET" && url.pathname === "/v1/sensors/motion") {
        return send(response, 200, await hue.getMotionSensors());
      }
      if (method === "GET" && url.pathname === "/v1/sensors/buttons") {
        return send(response, 200, await hue.getButtons());
      }
      if (method === "GET" && url.pathname === "/v1/sensors/temperature") {
        return send(response, 200, await hue.getTemperatureSensors());
      }
      if (method === "GET" && url.pathname === "/v1/sensors/light-level") {
        return send(response, 200, await hue.getLightLevelSensors());
      }

      // --- Entertainment ---
      if (method === "GET" && url.pathname === "/v1/entertainment") {
        return send(response, 200, await hue.getEntertainmentAreas());
      }

      // --- Behaviors ---
      if (method === "GET" && url.pathname === "/v1/behaviors/scripts") {
        return send(response, 200, await hue.getBehaviorScripts());
      }
      if (method === "GET" && url.pathname === "/v1/behaviors/instances") {
        return send(response, 200, await hue.getBehaviorInstances());
      }

      // --- Resolvers ---
      if (method === "GET" && parts[0] === "v1" && parts[1] === "resolve" && parts[2] === "light" && parts[3]) {
        return send(response, 200, await hue.resolveLightId(decodeURIComponent(parts[3])));
      }
      if (method === "GET" && parts[0] === "v1" && parts[1] === "resolve" && parts[2] === "scene" && parts[3]) {
        return send(response, 200, await hue.resolveSceneId(decodeURIComponent(parts[3])));
      }

      send(response, 404, { error: "not_found" });
    } catch (error) {
      const status = error instanceof Error && error.message.includes("not found") ? 404 : 500;
      send(response, status, { error: error instanceof Error ? error.message : "unknown_error" });
    }
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Hue local executor listening on :${port}`);
  });
