import { startIngestContext } from "./temporal/client.js";

type ContextPayload = {
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

const samplePayload: ContextPayload = {
  entityId: "entity-001",
  content: "Sample context payload for graph ingestion.",
  metadata: {
    source: "bootstrap",
    capturedAt: new Date().toISOString(),
  },
};

const run = async () => {
  const workflowId = await startIngestContext(samplePayload);
  console.log(`Started workflow: ${workflowId}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
