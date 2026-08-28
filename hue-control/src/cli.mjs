import { loadHueEnv } from "./env.mjs";
import { HueClient } from "./hue-client.mjs";

const command = process.argv[2] ?? "status";

function summarizeLights(response) {
  return response.data.map((light) => ({
    id: light.id,
    name: light.metadata?.name,
    on: light.on?.on,
    brightness: light.dimming?.brightness
  }));
}

function summarizeNamedResources(response) {
  return response.data.map((resource) => ({
    id: resource.id,
    name: resource.metadata?.name,
    type: resource.type
  }));
}

const env = await loadHueEnv();
const hue = new HueClient(env);

switch (command) {
  case "status": {
    const lights = await hue.lights();
    console.log(JSON.stringify({
      bridgeIp: env.bridgeIp,
      onePassword: env.onePassword,
      lightCount: lights.data.length
    }, null, 2));
    break;
  }
  case "lights": {
    console.log(JSON.stringify(summarizeLights(await hue.lights()), null, 2));
    break;
  }
  case "rooms": {
    console.log(JSON.stringify(summarizeNamedResources(await hue.rooms()), null, 2));
    break;
  }
  case "zones": {
    console.log(JSON.stringify(summarizeNamedResources(await hue.zones()), null, 2));
    break;
  }
  case "scenes": {
    console.log(JSON.stringify(summarizeNamedResources(await hue.scenes()), null, 2));
    break;
  }
  default:
    throw new Error(`Unknown command: ${command}`);
}
