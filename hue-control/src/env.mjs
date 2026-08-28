import dotenv from "dotenv";
import { createClient } from "@1password/sdk";

dotenv.config();

const DEFAULT_OP_ENVIRONMENT_ID = "vsl3suvn4s2dnekt6hr5fpykl4";

function fromLocalEnv(name) {
  return process.env[name] && process.env[name].trim() ? process.env[name].trim() : undefined;
}

async function loadOnePasswordVariables() {
  const token = fromLocalEnv("OP_SERVICE_ACCOUNT_TOKEN");
  const environmentId = fromLocalEnv("OP_ENVIRONMENT_ID") ?? DEFAULT_OP_ENVIRONMENT_ID;

  if (!token) {
    return {
      values: {},
      status: {
        configured: false,
        loaded: false,
        environmentId,
        variableCount: 0,
        error: "OP_SERVICE_ACCOUNT_TOKEN is not configured"
      }
    };
  }

  const client = await createClient({
    auth: token,
    integrationName: "itsjeff.org hue-control",
    integrationVersion: "v0.1.0"
  });

  const response = await client.environments.getVariables(environmentId);

  return {
    values: Object.fromEntries(response.variables.map((variable) => [variable.name, variable.value])),
    status: {
      configured: true,
      loaded: true,
      environmentId,
      variableCount: response.variables.length
    }
  };
}

export async function loadHueEnv() {
  const onePassword = await loadOnePasswordVariables();
  const bridgeIp = onePassword.values.HUE_BRIDGE_IP ?? fromLocalEnv("HUE_BRIDGE_IP");
  const appKey = onePassword.values.HUE_APP_KEY ?? fromLocalEnv("HUE_APP_KEY");

  if (!bridgeIp) throw new Error("HUE_BRIDGE_IP is not configured");
  if (!appKey) throw new Error("HUE_APP_KEY is not configured");

  return {
    bridgeIp,
    appKey,
    onePassword: onePassword.status
  };
}
