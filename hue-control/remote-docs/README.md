# Hue Control

Small programmable Hue workspace for the mini-PC app stack.

Location:

```text
/srv/ai-stack/apps/hue-control
```

This belongs under `ai-stack/apps` rather than `homeassistant` because it is intended as a direct automation/control surface for agents, scripts, and future services. Home Assistant can still consume Hue separately, but this folder keeps the Codex/AI runtime path independent.

## Secrets

Secrets are loaded from the same 1Password Environment pattern used by `project-codex`.

Expected variables:

```text
OP_SERVICE_ACCOUNT_TOKEN
OP_ENVIRONMENT_ID
HUE_BRIDGE_IP
HUE_APP_KEY
```

`HUE_APP_KEY` is never printed by the included scripts.

## Commands

```bash
npm install
npm run status
npm run lights
npm run rooms
npm run scenes
```

If this app is running on the mini PC with the current 1Password Environment, `npm run lights` should authenticate to the Hue Bridge Pro at `192.168.1.136` and list the current lights.

## Flat Structure

The current Hue room, zone, and naming cleanup record lives in [`docs/hue-structure-plan.md`](docs/hue-structure-plan.md).

The naming priority is daily home usability across Hue, HomeKit, Siri/voice, Home Assistant, dashboards, and physical control habits. The flat uses a hybrid naming model: meaningful spatial codes such as `Core`, `Alpha`, and `Pass` are preserved, then paired with plain room/use language where that makes control clearer.

The collaboration and parallel-agent boundaries are documented in [`docs/home-map-working-model.md`](docs/home-map-working-model.md).

The confirmed Core lighting automation foundation is documented in [`docs/core-lighting-rhythm.md`](docs/core-lighting-rhythm.md).

## Direction

This folder is a foundation for direct Hue automation from the mini PC:

- read bridge, lights, rooms, zones, scenes, and sensors
- trigger scenes or state changes without going through Home Assistant
- expose a narrow local API or MCP tool later if useful
- keep Hue credentials centralized in 1Password
