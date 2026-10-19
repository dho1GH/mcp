import { describe, expect, it } from "vitest";
import { HueClientService } from "../src/hue-client.js";

const svc = new HueClientService();

describe("setLightState validation", () => {
  it("rejects brightness below 0", async () => {
    await expect(svc.setLightState("x", { brightness: -1 })).rejects.toThrow(
      "brightness must be between 0 and 100",
    );
  });

  it("rejects brightness above 100", async () => {
    await expect(svc.setLightState("x", { brightness: 101 })).rejects.toThrow(
      "brightness must be between 0 and 100",
    );
  });

  it("rejects colorTemp below 153", async () => {
    await expect(svc.setLightState("x", { colorTemp: 100 })).rejects.toThrow(
      "colorTemp must be between 153 and 500",
    );
  });

  it("rejects colorTemp above 500", async () => {
    await expect(svc.setLightState("x", { colorTemp: 600 })).rejects.toThrow(
      "colorTemp must be between 153 and 500",
    );
  });

  it("rejects xy.x out of range", async () => {
    await expect(svc.setLightState("x", { xy: { x: 1.5, y: 0.5 } })).rejects.toThrow(
      "xy values must be between 0 and 1",
    );
  });

  it("rejects xy.y out of range", async () => {
    await expect(svc.setLightState("x", { xy: { x: 0.5, y: -0.1 } })).rejects.toThrow(
      "xy values must be between 0 and 1",
    );
  });

  it("rejects empty state", async () => {
    await expect(svc.setLightState("x", {})).rejects.toThrow("at least one state field is required");
  });
});

describe("renameLight validation", () => {
  it("rejects empty name", async () => {
    await expect(svc.renameLight("x", "")).rejects.toThrow("name is required");
  });

  it("rejects whitespace-only name", async () => {
    await expect(svc.renameLight("x", "   ")).rejects.toThrow("name is required");
  });
});

describe("setLightEffect validation", () => {
  it("rejects empty effect", async () => {
    await expect(svc.setLightEffect("x", "")).rejects.toThrow("effect is required");
  });
});

describe("setGroupState validation", () => {
  it("rejects brightness below 0", async () => {
    await expect(svc.setGroupState("g1", true, -5)).rejects.toThrow(
      "brightness must be between 0 and 100",
    );
  });

  it("rejects brightness above 100", async () => {
    await expect(svc.setGroupState("g1", true, 150)).rejects.toThrow(
      "brightness must be between 0 and 100",
    );
  });
});

describe("resolveLightId", () => {
  const lights = [
    { id: "abc-123", id_v1: "/lights/1", name: "Desk Lamp", on: true, brightness: 80 },
    { id: "def-456", id_v1: "/lights/2", name: "Floor Lamp", on: false, brightness: 0 },
    { id: "ghi-789", id_v1: "/lights/3", name: "Duplicate", on: true },
    { id: "jkl-012", id_v1: "/lights/4", name: "Duplicate", on: true },
  ];

  class TestableHueClient extends HueClientService {
    override async getLights() {
      return lights;
    }
  }

  const client = new TestableHueClient();

  it("resolves by v2 id", async () => {
    const result = await client.resolveLightId("abc-123");
    expect(result).toEqual({ id: "abc-123", name: "Desk Lamp" });
  });

  it("resolves by v1 numeric id", async () => {
    const result = await client.resolveLightId("2");
    expect(result).toEqual({ id: "def-456", name: "Floor Lamp" });
  });

  it("resolves by exact name", async () => {
    const result = await client.resolveLightId("Desk Lamp");
    expect(result).toEqual({ id: "abc-123", name: "Desk Lamp" });
  });

  it("throws on ambiguous name", async () => {
    await expect(client.resolveLightId("Duplicate")).rejects.toThrow("Multiple lights named");
  });

  it("throws on no match", async () => {
    await expect(client.resolveLightId("nonexistent")).rejects.toThrow("No light found matching");
  });

  it("trims whitespace", async () => {
    const result = await client.resolveLightId("  abc-123  ");
    expect(result).toEqual({ id: "abc-123", name: "Desk Lamp" });
  });
});

describe("resolveSceneId", () => {
  const sceneResponse = {
    data: [
      { id: "scene-1", metadata: { name: "Relax" } },
      { id: "scene-2", metadata: { name: "Energize" } },
      { id: "scene-3", metadata: { name: "Ambiguous" } },
      { id: "scene-4", metadata: { name: "Ambiguous" } },
    ],
  };

  class TestableHueClient extends HueClientService {
    override async getScenes() {
      return sceneResponse;
    }
  }

  const client = new TestableHueClient();

  it("resolves by id", async () => {
    const result = await client.resolveSceneId("scene-1");
    expect(result).toEqual({ id: "scene-1", name: "Relax" });
  });

  it("resolves by exact name", async () => {
    const result = await client.resolveSceneId("Energize");
    expect(result).toEqual({ id: "scene-2", name: "Energize" });
  });

  it("throws on ambiguous name", async () => {
    await expect(client.resolveSceneId("Ambiguous")).rejects.toThrow("Multiple scenes named");
  });

  it("throws on no match", async () => {
    await expect(client.resolveSceneId("nonexistent")).rejects.toThrow("No scene found matching");
  });
});

describe("getLights data transformation", () => {
  class TestableHueClient extends HueClientService {
    override async getLights() {
      const raw = {
        data: [
          {
            id: "abc",
            id_v1: "/lights/1",
            metadata: { name: "Test Light" },
            on: { on: true },
            dimming: { brightness: 75 },
            color_temperature: { mirek: 300 },
            color: { xy: { x: 0.3, y: 0.4 } },
          },
          {
            id: "def",
            on: { on: false },
          },
        ],
      };
      return raw.data.map((light: any) => ({
        id: light.id,
        id_v1: light.id_v1,
        name: light.metadata?.name ?? "Unknown Light",
        on: light.on?.on ?? false,
        brightness: light.dimming?.brightness,
        colorTemp: light.color_temperature?.mirek,
        xy: light.color?.xy,
      }));
    }
  }

  const client = new TestableHueClient();

  it("maps full light data correctly", async () => {
    const lights = await client.getLights();
    expect(lights[0]).toEqual({
      id: "abc",
      id_v1: "/lights/1",
      name: "Test Light",
      on: true,
      brightness: 75,
      colorTemp: 300,
      xy: { x: 0.3, y: 0.4 },
    });
  });

  it("defaults missing fields", async () => {
    const lights = await client.getLights();
    expect(lights[1]).toEqual({
      id: "def",
      id_v1: undefined,
      name: "Unknown Light",
      on: false,
      brightness: undefined,
      colorTemp: undefined,
      xy: undefined,
    });
  });
});
