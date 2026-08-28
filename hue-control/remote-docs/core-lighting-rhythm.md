# Core Lighting Rhythm

Last checked: 2026-05-24

This document tracks the confirmed foundation for the Core Open Plan lighting rhythm. The goal is lighting that feels alive and textured: gradual fades, warmer evenings, ambient-first night behavior, and activity-aware functional light.

## Physical Intent

Core lighting should not behave like a simple motion switch. The baseline rhythm should shift the room through the day:

| Phase | Ceiling behavior | Ambient / lamp behavior | Feel |
| --- | --- | --- | --- |
| Morning | Available, clearer, moderate brightness | Low support | Wakeful and practical |
| Day | Available for tasks | Minimal unless useful | Functional |
| Golden Hour | Starts fading down | Starts warming and rising | Softer transition |
| Evening | Low / secondary | Leads the room | Relaxed and lived-in |
| Night | Off by default | Functional light source | Calm, no overhead glare |
| Late Night | Blocked unless explicit | Very low, warm, path-led | Movement without waking the room |

The key rule: ceiling light gradually yields to lamps and ambient light as the day moves into night.

## Core Control Targets

| Target | HA entity | Role |
| --- | --- | --- |
| Core Ambient | `light.core_ambient` | Main evening/night living layer |
| Core Path | `light.core_path` | Balcony/pathway guidance |
| Core Living | `light.core_living` | Living-area ceiling zone |
| Core Kitchen | `light.core_kitchen` | Kitchen task light |
| Core Ceiling | `light.core_ceiling` | Whole Core overhead layer |
| Core All | `light.core_all` | Whole Core lighting group |

## Rhythm Helpers

These helpers are defined in `/srv/homeassistant/config/packages/core_lighting_rhythm.yaml`.

| Helper | Default | Purpose |
| --- | --- | --- |
| `input_boolean.core_lighting_auto` | `off` | Master enable for Core automatic lighting |
| `input_boolean.core_lighting_test_enabled` | `off` | Extra build/test gate before live light actions |
| `input_boolean.core_manual_override` | `off` | Tells automation to back off after manual control |
| `input_boolean.core_ceiling_allowed` | `on` | Whether the rhythm currently allows ceiling by default |
| `input_select.core_lighting_phase` | `Day` | Current rhythm phase |
| `input_select.core_activity` | `Idle` | Current inferred Core activity |
| `input_number.core_ceiling_target_brightness` | `35%` | Target ceiling brightness |
| `input_number.core_ambient_target_brightness` | `20%` | Target ambient brightness |
| `input_number.core_path_target_brightness` | `12%` | Target path brightness |
| `input_number.core_kitchen_target_brightness` | `45%` | Target kitchen task brightness |
| `input_number.core_target_kelvin` | `3000 K` | Target color temperature |
| `input_number.core_fade_seconds` | `180 s` | Default transition time |
| `timer.core_manual_override` | `30 min` | Manual override timeout |

## Automation Workspace

Node-RED now has a Core lighting workspace skeleton:

| Node-RED tab | Purpose |
| --- | --- |
| `Core Lighting Rhythm` | Core circadian baseline design and guardrails |
| `Area Lighting Backlog` | Placeholder for future room-specific rhythm work |

The current Node-RED flow contains comments only. It does not yet perform live light actions.

## Guardrails

Live light actions should require:

- `input_boolean.core_lighting_auto` is `on`
- during buildout, both `input_boolean.test_mode` and `input_boolean.core_lighting_test_enabled` are `on`
- `input_boolean.core_manual_override` is `off`

Manual Core dial/switch use should eventually set `input_boolean.core_manual_override` and start `timer.core_manual_override`, so the flat does not fight manual choices.

## Applied Changes

Applied on 2026-05-24:

- Replaced the old `test_mode` demo automation with a clean test-mode helper only.
- Added `/srv/homeassistant/config/packages/core_lighting_rhythm.yaml`.
- Added Core rhythm helpers for phase, activity, target brightness, target kelvin, fade duration, auto enable, test enable, ceiling allowance, and manual override.
- Added a Node-RED `Core Lighting Rhythm` tab and `Area Lighting Backlog` tab.
- Reloaded HA helper domains and automations.
- Restarted Node-RED so the workspace appears in the editor.

## Verification

Verified on 2026-05-24:

- Home Assistant configuration check passed.
- Core rhythm helpers are loaded in HA.
- `input_boolean.core_lighting_auto` is `off`.
- `input_boolean.core_lighting_test_enabled` is `off`.
- `input_boolean.test_mode` is `off`.
- Node-RED is running with the new Core lighting workspace.
- No live light-changing automation nodes have been added yet.

## Next Build Slice

The next implementation step is to wire a test-mode-only evaluator:

- every 5 minutes, read sun/time/presence/media context
- update `core_lighting_phase`, `core_activity`, brightness targets, kelvin, fade seconds, and `core_ceiling_allowed`
- do not touch lights yet

After the helper values feel right, add guarded light actions for `Core Ambient`, `Core Ceiling`, `Core Path`, and `Core Kitchen`.
