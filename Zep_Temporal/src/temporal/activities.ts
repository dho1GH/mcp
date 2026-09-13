import { createGraphitiClient } from "../graphiti/client.js";
import { createZepClient } from "../zep/client.js";

type ContextPayload = {
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type ContextActivities = {
  upsertGraphiti(payload: ContextPayload): Promise<void>;
  upsertZepGraph(payload: ContextPayload): Promise<void>;
};

const graphitiClient = createGraphitiClient();
const zepClient = createZepClient();

export const contextActivities: ContextActivities = {
  async upsertGraphiti(payload) {
    await graphitiClient.upsertContext(payload);
  },
  async upsertZepGraph(payload) {
    await zepClient.upsertGraphContext(payload);
  },
};
