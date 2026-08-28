import { WorkerEntrypoint } from "cloudflare:workers";
import type {
  PendingAction,
  Principal,
  ProposeActionRequest,
} from "./contracts/action";
import { ApprovalCoordinator } from "./control-plane/coordinator";
import { ApprovalExecutionWorkflow } from "./control-plane/workflow";

export { ApprovalCoordinator, ApprovalExecutionWorkflow };

export class ControlPlaneService extends WorkerEntrypoint<Env> {
  propose(request: ProposeActionRequest): Promise<PendingAction> {
    return this.coordinator(request.principal.tenantId).propose(request);
  }

  getAction(tenantId: string, actionId: string): Promise<PendingAction | null> {
    return this.coordinator(tenantId).getAction(actionId, tenantId);
  }

  listActions(tenantId: string, limit?: number): Promise<PendingAction[]> {
    return this.coordinator(tenantId).listActions(tenantId, limit);
  }

  cancel(tenantId: string, actionId: string, principal: Principal): Promise<PendingAction> {
    if (principal.tenantId !== tenantId) throw new Error("Cross-tenant cancellation denied");
    return this.coordinator(tenantId).cancel(actionId, principal);
  }

  private coordinator(tenantId: string) {
    if (!tenantId.trim()) throw new Error("Tenant ID is required");
    return this.env.ApprovalCoordinator.getByName(tenantId);
  }
}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      return Response.json({
        ok: true,
        service: "federated-mcp-control-plane",
        approvalApi: "not_exposed_until_access_jwt_validation_is_configured",
      });
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

