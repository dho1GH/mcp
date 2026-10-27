import test from "node:test";
import assert from "node:assert/strict";
import { NodeRedClient } from "../.test-build/nodered-client.js";

const env = {
  NODE_RED_BASE_URL: "https://nodered.example.test",
  NODE_RED_USERNAME: "test-user",
  NODE_RED_PASSWORD: "test-password",
};

test("flow reads and deploys use v2 and preserve revision conflicts", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith("/auth/token")) {
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    }
    assert.equal(init.headers["Node-RED-API-Version"], "v2");
    if (init.method === "POST") {
      assert.deepEqual(JSON.parse(init.body), { flows: [], rev: "rev-1" });
      assert.equal(init.headers["Node-RED-Deployment-Type"], "flows");
      return new Response("stale revision", { status: 409 });
    }
    return Response.json({ rev: "rev-1", flows: [] });
  });

  const client = new NodeRedClient(env);
  assert.deepEqual(await client.getFlows(), { rev: "rev-1", flows: [] });
  await assert.rejects(client.deployFlows([], "rev-1", "flows"), /409/);
  assert.equal(requests.length, 3, "a conflicting deployment must not be retried");
});

test("successful v2 deployment returns the new revision", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url.endsWith("/auth/token")) {
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    }
    assert.equal(init.headers["Node-RED-API-Version"], "v2");
    assert.deepEqual(JSON.parse(init.body), { flows: [], rev: "rev-1" });
    return Response.json({ rev: "rev-2" });
  });
  const client = new NodeRedClient(env);
  assert.deepEqual(await client.deployFlows([], "rev-1"), { rev: "rev-2" });
});
