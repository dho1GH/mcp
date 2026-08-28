import { Connection, WorkflowClient } from "@temporalio/client";
import { config } from "../config.js";
import { ingestContext } from "./workflows.js";

type ContextPayload = {
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export const createWorkflowClient = async (): Promise<WorkflowClient> => {
  const connection = await Connection.connect({
    address: config.temporalAddress,
  });

  return new WorkflowClient({
    connection,
    namespace: config.temporalNamespace,
  });
};

export const startIngestContext = async (
  payload: ContextPayload,
): Promise<string> => {
  const client = await createWorkflowClient();
  const handle = await client.start(ingestContext, {
    args: [payload],
    taskQueue: config.temporalTaskQueue,
    workflowId: `context-${payload.entityId}-${Date.now()}`,
  });

  return handle.workflowId;
};
