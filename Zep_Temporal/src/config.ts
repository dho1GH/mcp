import "dotenv/config";

type RequiredEnv = {
  zepApiKey: string;
  zepBaseUrl: string;
  graphitiApiKey: string;
  graphitiBaseUrl: string;
  temporalAddress: string;
  temporalNamespace: string;
  temporalTaskQueue: string;
};

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

export const config: RequiredEnv = {
  zepApiKey: required(process.env.ZEP_API_KEY, "ZEP_API_KEY"),
  zepBaseUrl: required(process.env.ZEP_BASE_URL, "ZEP_BASE_URL"),
  graphitiApiKey: required(process.env.GRAPHITI_API_KEY, "GRAPHITI_API_KEY"),
  graphitiBaseUrl: required(process.env.GRAPHITI_BASE_URL, "GRAPHITI_BASE_URL"),
  temporalAddress: required(process.env.TEMPORAL_ADDRESS, "TEMPORAL_ADDRESS"),
  temporalNamespace: required(process.env.TEMPORAL_NAMESPACE, "TEMPORAL_NAMESPACE"),
  temporalTaskQueue: required(
    process.env.TEMPORAL_TASK_QUEUE,
    "TEMPORAL_TASK_QUEUE",
  ),
};
