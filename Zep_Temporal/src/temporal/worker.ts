import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "../config.js";
import { contextActivities } from "./activities.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const workflowsPath = join(__dirname, "workflows.js");

async function runWorker(): Promise<void> {
  const connection = await NativeConnection.connect({
    address: config.temporalAddress,
  });

  const worker = await Worker.create({
    workflowsPath,
    activities: contextActivities,
    taskQueue: config.temporalTaskQueue,
    namespace: config.temporalNamespace,
    connection,
  });

  await worker.run();
}

runWorker().catch((error) => {
  console.error(error);
  process.exit(1);
});
