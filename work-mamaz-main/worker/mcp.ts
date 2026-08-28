import { CAPABILITIES, getCapability, validateCapabilityArguments } from "./capabilities";
import { executeRead } from "./executors";

interface JsonRpcRequest {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: Record<string, unknown>;
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown): Response {
	return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): Response {
	return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } });
}

function toolName(capabilityId: string): string {
	return capabilityId.replaceAll(".", "_");
}

function capabilityIdFromTool(name: string): string | undefined {
	return CAPABILITIES.find((capability) => toolName(capability.id) === name)?.id;
}

function toolContent(value: unknown) {
	return {
		content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
		structuredContent: value,
	};
}

async function callCapability(
	env: Env,
	name: string,
	arguments_: Record<string, unknown>,
): Promise<unknown> {
	if (name === "execution_get_status") {
		const executionId = String(arguments_.executionId ?? "");
		if (!executionId) throw new Error("executionId is required");
		const stub = env.WORKFLOW_STATUS.get(env.WORKFLOW_STATUS.idFromName(executionId));
		return stub.getExecution();
	}
	if (name === "execution_approve" || name === "execution_reject") {
		const executionId = String(arguments_.executionId ?? "");
		if (!executionId) throw new Error("executionId is required");
		const instance = await env.CAPABILITY_WORKFLOW.get(executionId);
		await instance.sendEvent({
			type: "capability-approval",
			payload: {
				approved: name === "execution_approve",
				feedback: typeof arguments_.feedback === "string" ? arguments_.feedback : undefined,
			},
		});
		return { executionId, accepted: true, decision: name === "execution_approve" ? "approved" : "rejected" };
	}

	const capabilityId = capabilityIdFromTool(name);
	const capability = capabilityId ? getCapability(capabilityId) : undefined;
	if (!capability) throw new Error(`Unknown tool: ${name}`);
	const validationError = validateCapabilityArguments(capability.id, arguments_);
	if (validationError) throw new Error(validationError);

	if (capability.operation === "read") {
		return executeRead(env, capability, arguments_);
	}

	const executionId = crypto.randomUUID();
	const instance = await env.CAPABILITY_WORKFLOW.create({
		id: executionId,
		params: { executionId, capabilityId: capability.id, arguments: arguments_ },
	});
	return {
		executionId,
		workflowInstanceId: instance.id,
		capabilityId: capability.id,
		status: "created",
	};
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
	if (request.method !== "POST") return new Response("MCP endpoint requires POST", { status: 405 });
	let message: JsonRpcRequest;
	try { message = (await request.json()) as JsonRpcRequest; }
	catch { return rpcError(null, -32700, "Parse error"); }

	if (message.method === "initialize") {
		return rpcResult(message.id, {
			protocolVersion: "2025-06-18",
			capabilities: { tools: { listChanged: false } },
			serverInfo: { name: "jeffe-os-v4", version: "0.1.0" },
		});
	}
	if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
	if (message.method === "ping") return rpcResult(message.id, {});
	if (message.method === "tools/list") {
		const capabilityTools = CAPABILITIES.map((capability) => ({
			name: toolName(capability.id),
			description: capability.description,
			inputSchema: capability.inputSchema,
			annotations: {
				readOnlyHint: capability.operation === "read",
				destructiveHint: false,
				idempotentHint: capability.operation === "read",
				openWorldHint: false,
			},
		}));
		return rpcResult(message.id, {
			tools: [
				...capabilityTools,
				{ name: "execution_get_status", description: "Get the current execution and approval state.", inputSchema: { type: "object", properties: { executionId: { type: "string" } }, required: ["executionId"], additionalProperties: false }, annotations: { readOnlyHint: true } },
				{ name: "execution_approve", description: "Approve a waiting mutation execution.", inputSchema: { type: "object", properties: { executionId: { type: "string" }, feedback: { type: "string" } }, required: ["executionId"], additionalProperties: false } },
				{ name: "execution_reject", description: "Reject a waiting mutation execution.", inputSchema: { type: "object", properties: { executionId: { type: "string" }, feedback: { type: "string" } }, required: ["executionId"], additionalProperties: false } },
			],
		});
	}
	if (message.method === "tools/call") {
		const name = String(message.params?.name ?? "");
		const arguments_ = (message.params?.arguments && typeof message.params.arguments === "object")
			? message.params.arguments as Record<string, unknown>
			: {};
		try { return rpcResult(message.id, toolContent(await callCapability(env, name, arguments_))); }
		catch (error) {
			return rpcResult(message.id, {
				content: [{ type: "text", text: error instanceof Error ? error.message : "Tool call failed" }],
				isError: true,
			});
		}
	}
	return rpcError(message.id, -32601, "Method not found");
}
