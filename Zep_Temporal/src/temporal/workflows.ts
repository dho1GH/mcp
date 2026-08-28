import { proxyActivities } from "@temporalio/workflow";
import type { ContextActivities } from "./activities.js";

type ContextPayload = {
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

const { upsertGraphiti, upsertZepGraph } = proxyActivities<ContextActivities>({
  startToCloseTimeout: "2 minutes",
});

export async function ingestContext(payload: ContextPayload): Promise<void> {
  await upsertGraphiti(payload);
  await upsertZepGraph(payload);
}
