export type OperationKind = "read" | "mutation";
export type ApprovalMode = "none" | "required" | "preapproved";
export type VerificationMode = "response_only" | "read_after_write";

export interface CapabilityDefinition {
	id: string;
	title: string;
	description: string;
	operation: OperationKind;
	inputSchema: Record<string, unknown>;
	approval: ApprovalMode;
	verification: VerificationMode;
	executor: string;
}

export interface ApprovalGrant {
	id: string;
	capabilityId: string;
	allowedTargets?: string[];
	allowedArgumentKeys?: string[];
	expiresAt?: string;
}

const HUE_TARGET = {
	type: "string",
	description: "Hue resource id. Resolve it with hue_read_inventory before mutation.",
};

export const CAPABILITIES: CapabilityDefinition[] = [
	{
		id: "capability.list",
		title: "List capabilities",
		description: "List assistant-callable capabilities and their execution rules.",
		operation: "read",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
		approval: "none",
		verification: "response_only",
		executor: "registry.list",
	},
	{
		id: "hue.read_inventory",
		title: "Read Hue inventory",
		description: "Read Hue lights and their current reported state.",
		operation: "read",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
		approval: "none",
		verification: "response_only",
		executor: "hue.read_inventory",
	},
	{
		id: "hue.rename_light",
		title: "Rename Hue light",
		description: "Rename one Hue light and verify the resulting name.",
		operation: "mutation",
		inputSchema: {
			type: "object",
			properties: {
				lightId: HUE_TARGET,
				newName: { type: "string", minLength: 1, maxLength: 64 },
			},
			required: ["lightId", "newName"],
			additionalProperties: false,
		},
		approval: "required",
		verification: "read_after_write",
		executor: "hue.rename_light",
	},
	{
		id: "hue.set_light_state",
		title: "Set Hue light state",
		description: "Set power, brightness, or colour temperature for one Hue light and verify the reported result.",
		operation: "mutation",
		inputSchema: {
			type: "object",
			properties: {
				lightId: HUE_TARGET,
				on: { type: "boolean" },
				brightness: { type: "number", minimum: 0, maximum: 100 },
				colorTemp: { type: "number", minimum: 153, maximum: 500 },
			},
			required: ["lightId"],
			additionalProperties: false,
		},
		approval: "required",
		verification: "read_after_write",
		executor: "hue.set_light_state",
	},
];

export function getCapability(id: string): CapabilityDefinition | undefined {
	return CAPABILITIES.find((capability) => capability.id === id);
}

export function getMutationTarget(arguments_: Record<string, unknown>): string | undefined {
	return typeof arguments_.lightId === "string" ? arguments_.lightId : undefined;
}

export function parseApprovalGrants(raw?: string): ApprovalGrant[] {
	if (!raw?.trim()) return [];
	try {
		const value = JSON.parse(raw) as unknown;
		return Array.isArray(value) ? (value as ApprovalGrant[]) : [];
	} catch {
		return [];
	}
}

export function findMatchingGrant(
	capability: CapabilityDefinition,
	arguments_: Record<string, unknown>,
	grants: ApprovalGrant[],
): ApprovalGrant | undefined {
	const target = getMutationTarget(arguments_);
	const argumentKeys = Object.keys(arguments_);
	const now = Date.now();

	return grants.find((grant) => {
		if (grant.capabilityId !== capability.id) return false;
		if (grant.expiresAt && Date.parse(grant.expiresAt) <= now) return false;
		if (grant.allowedTargets?.length && (!target || !grant.allowedTargets.includes(target))) {
			return false;
		}
		if (
			grant.allowedArgumentKeys?.length &&
			argumentKeys.some((key) => !grant.allowedArgumentKeys?.includes(key))
		) {
			return false;
		}
		return true;
	});
}

export function validateCapabilityArguments(
	capabilityId: string,
	arguments_: Record<string, unknown>,
): string | null {
	if (capabilityId === "hue.rename_light") {
		if (typeof arguments_.lightId !== "string" || !arguments_.lightId.trim()) return "lightId is required";
		if (typeof arguments_.newName !== "string" || !arguments_.newName.trim()) return "newName is required";
		if (arguments_.newName.trim().length > 64) return "newName must be 64 characters or fewer";
	}

	if (capabilityId === "hue.set_light_state") {
		if (typeof arguments_.lightId !== "string" || !arguments_.lightId.trim()) return "lightId is required";
		const hasState = ["on", "brightness", "colorTemp"].some((key) => arguments_[key] !== undefined);
		if (!hasState) return "at least one of on, brightness, or colorTemp is required";
		if (arguments_.on !== undefined && typeof arguments_.on !== "boolean") return "on must be a boolean";
		if (
			arguments_.brightness !== undefined &&
			(typeof arguments_.brightness !== "number" || arguments_.brightness < 0 || arguments_.brightness > 100)
		) return "brightness must be between 0 and 100";
		if (
			arguments_.colorTemp !== undefined &&
			(typeof arguments_.colorTemp !== "number" || arguments_.colorTemp < 153 || arguments_.colorTemp > 500)
		) return "colorTemp must be between 153 and 500 mireks";
	}
	return null;
}
