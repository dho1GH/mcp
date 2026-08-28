import { describe, expect, it } from "vitest";
import { findMatchingGrant, getCapability, validateCapabilityArguments } from "../worker/capabilities";

describe("capability execution rules", () => {
  it("matches a scoped preapproval", () => {
    const capability = getCapability("hue.set_light_state");
    expect(capability).toBeDefined();
    const grant = findMatchingGrant(capability!, { lightId: "light-1", brightness: 40 }, [{
      id: "grant-1",
      capabilityId: "hue.set_light_state",
      allowedTargets: ["light-1"],
      allowedArgumentKeys: ["lightId", "brightness"],
    }]);
    expect(grant?.id).toBe("grant-1");
  });

  it("does not widen a grant to unapproved arguments", () => {
    const capability = getCapability("hue.set_light_state")!;
    const grant = findMatchingGrant(capability, { lightId: "light-1", colorTemp: 300 }, [{
      id: "grant-1",
      capabilityId: "hue.set_light_state",
      allowedTargets: ["light-1"],
      allowedArgumentKeys: ["lightId", "brightness"],
    }]);
    expect(grant).toBeUndefined();
  });

  it("rejects empty state mutations", () => {
    expect(validateCapabilityArguments("hue.set_light_state", { lightId: "light-1" }))
      .toContain("at least one");
  });
});
