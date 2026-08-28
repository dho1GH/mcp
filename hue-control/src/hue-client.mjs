import https from "node:https";

function requestJson({ bridgeIp, appKey }, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const request = https.request(
      {
        hostname: bridgeIp,
        path,
        method,
        rejectUnauthorized: false,
        headers: {
          "content-type": "application/json",
          "hue-application-key": appKey,
          ...(payload ? { "content-length": Buffer.byteLength(payload) } : {})
        }
      },
      (response) => {
        let responseBody = "";
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          let parsed;
          try {
            parsed = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            parsed = { raw: responseBody };
          }

          if (response.statusCode >= 400) {
            reject(new Error(`Hue API ${response.statusCode}: ${JSON.stringify(parsed)}`));
            return;
          }

          resolve(parsed);
        });
      }
    );

    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

export class HueClient {
  constructor(config) {
    this.config = config;
  }

  get(path) {
    return requestJson(this.config, "GET", path);
  }

  put(path, body) {
    return requestJson(this.config, "PUT", path, body);
  }

  lights() {
    return this.get("/clip/v2/resource/light");
  }

  rooms() {
    return this.get("/clip/v2/resource/room");
  }

  zones() {
    return this.get("/clip/v2/resource/zone");
  }

  scenes() {
    return this.get("/clip/v2/resource/scene");
  }

  bridgeHome() {
    return this.get("/clip/v2/resource/bridge_home");
  }
}
