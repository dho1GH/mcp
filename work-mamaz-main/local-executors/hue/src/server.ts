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

http.createServer(async (request, response) => {
  try {
    if (bearerToken && request.headers.authorization !== `Bearer ${bearerToken}`) {
      send(response, 401, { error: "unauthorized" });
      return;
    }
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const parts = url.pathname.split("/").filter(Boolean);

    if (request.method === "GET" && url.pathname === "/health") return send(response, 200, { ok: true });
    if (request.method === "GET" && url.pathname === "/v1/lights") return send(response, 200, await hue.getLights());
    if (request.method === "GET" && parts.length === 3 && parts[0] === "v1" && parts[1] === "lights") {
      return send(response, 200, await hue.getLight(decodeURIComponent(parts[2])));
    }
    if (request.method === "PUT" && parts.length === 4 && parts[0] === "v1" && parts[1] === "lights") {
      const lightId = decodeURIComponent(parts[2]);
      const body = await readBody(request);
      if (parts[3] === "name") return send(response, 200, await hue.renameLight(lightId, String(body.name ?? "")));
      if (parts[3] === "state") return send(response, 200, await hue.setLightState(lightId, body));
    }
    send(response, 404, { error: "not_found" });
  } catch (error) {
    send(response, 500, { error: error instanceof Error ? error.message : "unknown_error" });
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Hue executor listening on :${port}`);
});
