import { AgentWorkflow, WorkflowRejectedError } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type {
  ApprovalCoordinator,
  ApprovalWorkflowParams,
  ExecuteResult,
} from "./coordinator";

export class ApprovalExecutionWorkflow extends AgentWorkflow<
  ApprovalCoordinator,
  ApprovalWorkflowParams
> {
  override async run(
    event: AgentWorkflowEvent<ApprovalWorkflowParams>,
    step: AgentWorkflowStep,
  ): Promise<ExecuteResult> {
    const { actionId, digest } = event.payload;

    await this.reportProgress({
      step: "approval",
      status: "pending",
      message: "Waiting for an authenticated human decision",
    });

    try {
      await this.waitForApproval<{ approvedBy: string; actionDigest: string }>(step, {
        timeout: "15 minutes",
      });
    } catch (error) {
      if (error instanceof WorkflowRejectedError) {
        await step.reportError("Action rejected by human approver");
      }
      throw error;
    }

    const leaseId = crypto.randomUUID();
    await step.do("acquire execution lease", async () => {
      await this.agent.acquireLease(actionId, digest, leaseId);
    });

    await this.reportProgress({
      step: "execution",
      status: "running",
      message: "Executing the exact approved action",
    });

    let result: ExecuteResult;
    try {
      result = await step.do(
        "execute approved action",
        {
          retries: { limit: 0, delay: "1 second", backoff: "constant" },
          timeout: "2 minutes",
          sensitive: "output",
        },
        async () => {
          const executed = await this.agent.executeLeasedAction(actionId, leaseId);
          return {
            summary: executed.summary,
            ...(executed.backendRequestId
              ? { backendRequestId: executed.backendRequestId }
              : {}),
          };
        },
      );
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Unknown execution failure";
      await step.do("record ambiguous execution failure", async () => {
        await this.agent.recordFailure(actionId, leaseId, failure, true);
      });
      throw error;
    }

    await step.do("record successful execution", async () => {
      await this.agent.recordSuccess(actionId, leaseId, result);
    });
    await step.reportComplete(result);
    return result;
  }
}
