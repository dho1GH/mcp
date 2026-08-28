# Hue Flat Naming & Structure

Last checked: 2026-05-24

This document tracks the Hue and Home Assistant naming layer for the flat. The priority is daily usability in Hue, HomeKit, Siri/voice, Home Assistant, dashboards, and physical control habits.

The flat uses a hybrid naming model:

- preserve the spatial codes because they are meaningful in the home model
- pair them with plain room/use language so the names remain readable in Hue, HomeKit, and HA
- keep fixture numbers stable so physical location, dashboards, and automations can converge

## Room Codes

| Code | User-facing meaning |
| --- | --- |
| Core | Shared open-plan living / dining / kitchen area |
| Alpha | Bedroom |
| Beta | Bedroom / spare room |
| Throne | Bathroom |
| Splash | Bathroom |
| Pass | Hallway |
| Chaos | Utility / storage |

## Current Hue Rooms

| Hue room |
| --- |
| Core Open Plan |
| Alpha Bedroom |
| Beta Bedroom |
| Pass Hallway |
| Splash Bathroom |
| Throne Bathroom |
| Chaos Utility |

`Core Kitchen` was deleted as a separate Hue room. Kitchen is now represented as a Core lighting zone rather than a separate room.

## Current Home Assistant Areas

Home Assistant areas were consolidated on 2026-05-24 to match the flat's room model. Duplicate, stale, and device-named areas were retired after their devices were moved.

| HA area | Aliases | Device count |
| --- | --- | ---: |
| Core Open Plan | Open Plan; Openplan; Openplan Core; Living Room; Living; Dining | 35 |
| Core Kitchen | Kitchen | 5 |
| Alpha Bedroom | Bedroom; Bedroom Alpha; Primary Bedroom; Main Bedroom | 23 |
| Beta Bedroom | Spare Bedroom; Spare Room; Room 2; Rear Bedroom; Guest Bedroom | 15 |
| Pass Hallway | Hallway; Pass; Front Door; Entry; Entrance | 10 |
| Throne Bathroom | Ensuite; Ensuite Bathroom; Main Bathroom; My Bathroom | 7 |
| Splash Bathroom | Secondary Bathroom; Rear Bathroom; Bathroom 2; Splash | 7 |
| Chaos Utility | Chaos; Utility; Laundry; Laundry Room; Laundry/Utilities; Storage | 5 |
| Parking | | 1 |

Retired HA areas:

- `Attic`
- `Bedroom`
- `Beta Bedroom` duplicate area
- `Default`
- `Dining`
- `Front Door`
- `Laundry room`
- `Living Room`
- `Living Room (2)`
- `My Bathroom`
- `Openplan`
- `Orange HomePod Mini`
- `Storage`
- `White HomePod Mini`

Area consolidation verification:

- Stale device area references: 0
- Stale entity area references: 0
- Registry backups were created before the merge in `/srv/homeassistant/config/.storage/` with the suffix `codex-area-merge-20260524-030121.bak`.

## Home Assistant Device Area Reconciliation

Device areas were cross-referenced on 2026-05-24 using Hue room/zone membership, Home Assistant device names, and the current flat area model. High-confidence changes were applied through Home Assistant's device registry websocket API. Ambiguous devices were left unassigned for user confirmation.

Applied high-confidence assignments:

| Target HA area | Devices assigned |
| --- | --- |
| Core Open Plan | `Core Ambient`; `Core Living`; Core ambient/member Hue devices from the Core Hue room; Aqara Openplan/dining/living presence helper devices; `Core Path` zone |
| Core Kitchen | `Core Kitchen`; Core kitchen ceiling devices 09-10; Aqara kitchen presence helper devices |
| Alpha Bedroom | Alpha Hue room/zone devices; bedroom display; remaining Nymane/Nyamane bedroom spot |
| Beta Bedroom | Beta Hue room/zone devices; Beta bedroom presence helper devices |
| Pass Hallway | Pass Hue room/zone devices |
| Chaos Utility | Chaos Hue room/zone devices where Hue/device naming aligned |

Verification after reconciliation:

- Total HA devices: 151
- Assigned to flat areas: 108
- Left unassigned / pending confirmation: 43
- Stale device area references: 0

Pending confirmation queue:

| Device group | Count | Why left pending |
| --- | ---: | --- |
| Apple mobile devices / laptops | 4 | Personal devices move around; assigning them to rooms would be misleading. |
| System / virtual integrations | 4 | `Sun`, `Forecast`, `Backup`, and Bluetooth adapter are not physical room devices. |
| Aqara unnamed door/window sensors | 7 | No room signal in the device names. |
| Aqara unnamed motion/presence/vibration/switch devices | 6 | Physical placement cannot be inferred confidently from generic names. |
| Aqara curtain drivers | 2 | Need window/room confirmation. |
| Aqara Hub M3 | 1 | Hub placement affects area only if it is useful in HA UI. |
| Google Nest Hub displays with generic names | 3 | `Loft Display` and duplicate `NestHubD029` names need room confirmation or rename first. |
| Hue smart buttons / smart plug | 3 | Button/plug names do not identify their physical room. |
| SwitchBot Hub 3, buttons, sensors, bot, roller shades | 11 | Likely one cluster, but room/window assignment should be confirmed before area placement. |
| WiZ A60 Filament | 1 | No room signal in the name. |
| Serif TV | 1 | Likely Core Open Plan, but left pending because the name alone does not prove placement. |

Known conflict left for review:

- `Laundry (Chaos) Ceiling Light` and `White (E27) Hue Bulb` are assigned to `Chaos Utility` in HA because their device names indicate utility/storage. Their Hue room signal previously pointed at `Pass Hallway`; if the physical bulbs still live in the hallway, Hue membership should be corrected rather than carrying the mismatch forward.

## Core Ceiling Numbering

Core ceiling fixtures are now numbered across the whole Core area:

| Range | Meaning |
| --- | --- |
| Core Ceiling 01-02 | Pathway to balcony |
| Core Ceiling 03-08 | Living area |
| Core Ceiling 09-10 | Kitchen area |

Individual fixture names in Hue and HA:

| Hue name | HA entity |
| --- | --- |
| Core Ceiling 01 | `light.core_ceiling_01` |
| Core Ceiling 02 | `light.core_ceiling_02` |
| Core Ceiling 03 | `light.core_ceiling_03` |
| Core Ceiling 04 | `light.core_ceiling_04` |
| Core Ceiling 05 | `light.core_ceiling_05` |
| Core Ceiling 06 | `light.core_ceiling_06` |
| Core Ceiling 07 | `light.core_ceiling_07` |
| Core Ceiling 08 | `light.core_ceiling_08` |
| Core Ceiling 09 | `light.core_ceiling_09` |
| Core Ceiling 10 | `light.core_ceiling_10` |

## Core Groups / Zones

The Core control layer exists in both Hue zones and HA light entities:

| Group | Contents | HA entity |
| --- | --- | --- |
| Core Path | Core Ceiling 01-02 | `light.core_path` |
| Core Living | Core Ceiling 03-08 | `light.core_living` |
| Core Kitchen | Core Ceiling 09-10 | `light.core_kitchen` |
| Core Ceiling | Core Ceiling 01-10 | `light.core_ceiling` |
| Core Ambient | Core lamps / strips / decorative ambient lights | `light.core_ambient` |
| Core All | Core Ceiling plus Core Ambient | `light.core_all` |

Hue zone child counts after verification:

| Hue zone | Child count |
| --- | ---: |
| Core Path | 2 |
| Core Living | 6 |
| Core Kitchen | 2 |
| Core Ceiling | 10 |
| Core Ambient | 9 |
| Core All | 19 |

## Applied Core Changes

Applied on 2026-05-24:

- Renamed Hue fixtures from `Core Open Plan Ceiling 01-08` and `Core Kitchen Ceiling 01-02` to `Core Ceiling 01-10`.
- Updated/created Hue zones: `Core Path`, `Core Living`, `Core Kitchen`, `Core Ceiling`, `Core All`.
- Renamed HA entity IDs and friendly names for the ten Core ceiling fixtures.
- Renamed HA entity IDs and friendly names for the Core group layer.

Applied ambient layer on 2026-05-24:

- Created Hue zone `Core Ambient`.
- Home Assistant exposed it as `light.core_ambient`.
- `Core Ambient` is the non-ceiling Core layer: lamps, Hue Play, gradient tube/strip, and decorative ambient fixtures.

## Verification

Hue verification:

- Core ceiling fixtures found: `Core Ceiling 01` through `Core Ceiling 10`
- Core zones found: `Core Path`, `Core Living`, `Core Kitchen`, `Core Ceiling`, `Core Ambient`, `Core All`

Home Assistant verification:

- Individual fixtures found as `light.core_ceiling_01` through `light.core_ceiling_10`
- Groups found as `light.core_path`, `light.core_living`, `light.core_kitchen`, `light.core_ceiling`, `light.core_ambient`, `light.core_all`

## Remaining Notes

- `Core All` currently includes Core Ceiling 01-10 plus the Core ambient layer available from Hue at the time of the change.
- The HA registry was updated through Home Assistant's websocket registry API, not by editing `.storage` directly.
- Future structural changes should preserve the hybrid naming model: code first, plain-language meaning second where needed.
