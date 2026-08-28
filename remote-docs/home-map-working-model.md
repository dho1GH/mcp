# Home Map Working Model

Last checked: 2026-05-24

This smart-home work uses a hybrid collaboration model:

- chat through choices that affect the lived home experience
- execute bounded, reversible, confirmed changes directly
- report back with what changed, what stayed untouched, and what needs confirmation
- document the confirmed home map, not every half-formed option

The goal is a home that is easy to use in Hue, HomeKit, Siri, Home Assistant, dashboards, and physical controls. Internal structure should support that experience, not override it.

## Working Lanes

| Lane | Owns | Must not own |
| --- | --- | --- |
| Home Map Naming | Hue rooms, Hue zones, HA areas, device/fixture identity, entity names, aliases, confirmed home-map docs | Automations, Node-RED flow behavior, scripts unrelated to naming |
| HA Automations / Node-RED | HA automations, scripts, helpers, scenes, Node-RED flows, integration behavior, runtime checks | Hue/HA naming, room/area membership, fixture identity |

The lanes can inspect each other's docs for context, but changes should stay inside the owning lane unless explicitly coordinated.

## Decision Rules

Apply directly when all are true:

- the change is reversible
- the target area/room/device is already confirmed
- the blast radius is local and obvious
- the change improves daily use or keeps HA/Hue aligned

Pause and chat first when any are true:

- the change affects voice control, dashboards, HomeKit grouping, or muscle memory
- the device location cannot be inferred confidently
- Hue, HA, and device names disagree
- a structural move could affect scenes, automations, or Node-RED flows

## Documentation Standard

Confirmed docs should read like a home map:

- physical meaning first
- system mapping second
- clear tables for rooms, zones, devices, entities, and aliases
- applied changes separate from verification
- pending items isolated in a review queue

The Core ceiling model is the reference pattern:

| Physical range | Meaning |
| --- | --- |
| Core Ceiling 01-02 | Pathway to balcony |
| Core Ceiling 03-08 | Living area |
| Core Ceiling 09-10 | Kitchen area |

## Current Parallel Agents

| Agent | Lane | Current brief |
| --- | --- | --- |
| Dewey | Home Map Naming | Prepare a lane brief for Hue/HA naming ownership, available files/scripts, and remaining device-area review items. |
| Mill | HA Automations / Node-RED | Prepare a lane brief for HA automations, Node-RED/runtime locations, safe inspection boundaries, and first opportunities. |

Agents should not apply cross-lane changes without coordination.
