import { CAPABILITIES, type CapabilityDefinition } from "./capabilities";

export interface ExecutorResult {
	before?: unknown;
	result: unknown;
	observedAfter?: unknown;
	verified: boolean;
}

function requireHueExecutor(env: Env): { baseUrl: string; token?: string } {
	const baseUrl = env.HUE_EXECUTOR_BASE_URL?.trim();
	if (!baseUrl) throw new Error("HUE_EXECUTOR_BASE_URL is not configured");
	return { baseUrl, token: env.HUE_EXECUTOR_BEARER_TOKEN?.trim() || undefined };
}

async function hueRequest(
	env: Env,
	path: string,
	init: RequestInit = {},
): Promise<unknown> {
	const { baseUrl, token } = requireHueExecutor(env);
	const url = new URL(path, baseUrl);
	const response = await fetch(url, {
		...init,
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
		signal: AbortSignal.timeout(15_000),
	});
	const text = await response.text();
	let body: unknown = {};
	try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
	if (!response.ok) throw new Error(`Hue executor ${response.status}: ${JSON.stringify(body)}`);
	return body;
}

function unwrapLight(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
		return record.data as Record<string, unknown>;
	}
	return record;
}

export async function executeRead(
	env: Env,
	capability: CapabilityDefinition,
	_arguments: Record<string, unknown>,
): Promise<unknown> {
	switch (capability.executor) {
		case "registry.list":
			return CAPABILITIES;
		case "hue.read_inventory":
			return hueRequest(env, "/v1/lights", { method: "GET" });
		default:
			throw new Error(`No read executor registered for ${capability.executor}`);
	}
}

export async function executeMutation(
	env: Env,
	capability: CapabilityDefinition,
	arguments_: Record<string, unknown>,
): Promise<ExecutorResult> {
	const lightId = encodeURIComponent(String(arguments_.lightId));
	const before = await hueRequest(env, `/v1/lights/${lightId}`, { method: "GET" });

	if (capability.executor === "hue.rename_light") {
		const result = await hueRequest(env, `/v1/lights/${lightId}/name`, {
			method: "PUT",
			body: JSON.stringify({ name: arguments_.newName }),
		});
		const observedAfter = await hueRequest(env, `/v1/lights/${lightId}`, { method: "GET" });
		const afterLight = unwrapLight(observedAfter);
		return {
			before,
			result,
			observedAfter,
			verified: afterLight?.name === arguments_.newName,
		};
	}

	if (capability.executor === "hue.set_light_state") {
		const state = {
			...(arguments_.on !== undefined ? { on: arguments_.on } : {}),
			...(arguments_.brightness !== undefined ? { brightness: arguments_.brightness } : {}),
			...(arguments_.colorTemp !== undefined ? { colorTemp: arguments_.colorTemp } : {}),
		};
		const result = await hueRequest(env, `/v1/lights/${lightId}/state`, {
			method: "PUT",
			body: JSON.stringify(state),
		});
		const observedAfter = await hueRequest(env, `/v1/lights/${lightId}`, { method: "GET" });
		const after = unwrapLight(observedAfter);
		const verified = Object.entries(state).every(([key, value]) => after?.[key] === value);
		return { before, result, observedAfter, verified };
	}

	throw new Error(`No mutation executor registered for ${capability.executor}`);
}
