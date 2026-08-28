// ============================================================
// HOME DIGITAL TWIN — Neo4j Seed Script
// Schema: SHIP_DigitalTwin_v1.1 + Spatial Baseline v1.1
// Generated from: home_model.json, home_registry.json, Spatial.txt
// Execute via Claude Code against Neo4j on GMKtec
// ============================================================

// ------------------------------------------------------------
// 0. CONSTRAINTS & INDEXES
// ------------------------------------------------------------
CREATE CONSTRAINT room_id IF NOT EXISTS FOR (r:Room) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT zone_id IF NOT EXISTS FOR (z:Zone) REQUIRE z.id IS UNIQUE;
CREATE CONSTRAINT device_id IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT sensor_id IF NOT EXISTS FOR (s:Sensor) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT infra_id IF NOT EXISTS FOR (i:Infrastructure) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT actuator_id IF NOT EXISTS FOR (a:Actuator) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT anchor_id IF NOT EXISTS FOR (a:Anchor) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT segment_id IF NOT EXISTS FOR (s:WallSegment) REQUIRE s.id IS UNIQUE;

// ------------------------------------------------------------
// 1. ROOMS
// ------------------------------------------------------------
MERGE (r1:Room {id: "room.open_plan"})
SET r1.name = "Open Plan",
    r1.code = "Core",
    r1.aliases = ["Core", "Living Room", "Kitchen", "Dining"],
    r1.kind = ["living", "kitchen", "dining"],
    r1.area_sqft = 310,
    r1.faces = "East",
    r1.subzones = ["Core_NE", "Core_NW", "Core_SE", "Core_SW", "Kitchen"],
    r1.floorplan_number = "1";

MERGE (r2:Room {id: "room.bedroom1"})
SET r2.name = "Bedroom 1 (Alpha)",
    r2.code = "Alpha",
    r2.aliases = ["Alpha Bedroom", "Primary Bedroom"],
    r2.kind = ["bedroom"],
    r2.area_sqft = 140,
    r2.subzones = ["Alpha_Bed", "Alpha_Flex"],
    r2.floorplan_number = "2",
    r2.notes = "Architecturally secondary bedroom but functionally primary — aligned with user movement toward Core";

MERGE (r3:Room {id: "room.bathroom_throne"})
SET r3.name = "Ensuite Bathroom (Throne)",
    r3.code = "Throne",
    r3.aliases = ["Throne", "Throne Bathroom", "Primary Bathroom"],
    r3.kind = ["bathroom"],
    r3.floorplan_number = "3";

MERGE (r4:Room {id: "room.hallway"})
SET r4.name = "Hallway (Pass)",
    r4.code = "Pass",
    r4.aliases = ["Pass", "Pass Hallway"],
    r4.kind = ["hallway"],
    r4.subzones = ["Vault", "Alpha_Pass", "Beta_Pass", "Splash_Pass", "Chaos_Pass"],
    r4.floorplan_number = "4";

MERGE (r5:Room {id: "room.laundry_utility"})
SET r5.name = "Laundry / Utility (Chaos)",
    r5.code = "Chaos",
    r5.aliases = ["Chaos", "Utility", "Laundry"],
    r5.kind = ["utility"],
    r5.subzones = ["laundry.hub_wall", "laundry.storage"],
    r5.floorplan_number = "5",
    r5.notes = "All hubs and infrastructure located here";

MERGE (r6:Room {id: "room.bathroom_secondary"})
SET r6.name = "Secondary Bathroom (Splash)",
    r6.code = "Splash",
    r6.aliases = ["Splash", "Splash Bathroom", "Guest Bathroom"],
    r6.kind = ["bathroom"],
    r6.floorplan_number = "6",
    r6.notes = "Connected to hallway AND walk-in wardrobe leading to Beta";

MERGE (r7:Room {id: "room.bedroom2"})
SET r7.name = "Bedroom 2 (Beta)",
    r7.code = "Beta",
    r7.aliases = ["Beta Bedroom", "Secondary Bedroom"],
    r7.kind = ["bedroom"],
    r7.area_sqft = 163,
    r7.subzones = ["Beta_Bed", "Beta_Flex"],
    r7.floorplan_number = "7",
    r7.notes = "Two entry points — via hallway and via Splash bathroom";

MERGE (r8:Room {id: "room.bedroom2_walkin"})
SET r8.name = "Walk-in Wardrobe (Betaflex)",
    r8.code = "Beta_Walkin",
    r8.aliases = ["Beta Walk-in", "Walk-in", "Betaflex", "7i"],
    r8.kind = ["wardrobe", "closet"],
    r8.floorplan_number = "7i",
    r8.notes = "No physical boundary separating from Beta — 2 lights in wardrobe share Beta light group";

// ------------------------------------------------------------
// 2. ROOM NEIGHBOR RELATIONSHIPS
// ------------------------------------------------------------
MATCH (core:Room {id: "room.open_plan"}), (pass:Room {id: "room.hallway"})
MERGE (core)-[:NEIGHBORS]->(pass)
MERGE (pass)-[:NEIGHBORS]->(core);

MATCH (alpha:Room {id: "room.bedroom1"}), (pass:Room {id: "room.hallway"})
MERGE (alpha)-[:NEIGHBORS]->(pass)
MERGE (pass)-[:NEIGHBORS]->(alpha);

MATCH (alpha:Room {id: "room.bedroom1"}), (throne:Room {id: "room.bathroom_throne"})
MERGE (alpha)-[:NEIGHBORS]->(throne)
MERGE (throne)-[:NEIGHBORS]->(alpha);

MATCH (beta:Room {id: "room.bedroom2"}), (pass:Room {id: "room.hallway"})
MERGE (beta)-[:NEIGHBORS]->(pass)
MERGE (pass)-[:NEIGHBORS]->(beta);

MATCH (beta:Room {id: "room.bedroom2"}), (splash:Room {id: "room.bathroom_secondary"})
MERGE (beta)-[:NEIGHBORS]->(splash)
MERGE (splash)-[:NEIGHBORS]->(beta);

MATCH (beta:Room {id: "room.bedroom2"}), (walkin:Room {id: "room.bedroom2_walkin"})
MERGE (beta)-[:NEIGHBORS]->(walkin)
MERGE (walkin)-[:NEIGHBORS]->(beta);

MATCH (walkin:Room {id: "room.bedroom2_walkin"}), (splash:Room {id: "room.bathroom_secondary"})
MERGE (walkin)-[:NEIGHBORS]->(splash)
MERGE (splash)-[:NEIGHBORS]->(walkin);

MATCH (splash:Room {id: "room.bathroom_secondary"}), (pass:Room {id: "room.hallway"})
MERGE (splash)-[:NEIGHBORS]->(pass)
MERGE (pass)-[:NEIGHBORS]->(splash);

MATCH (throne:Room {id: "room.bathroom_throne"}), (pass:Room {id: "room.hallway"})
MERGE (throne)-[:NEIGHBORS]->(pass)
MERGE (pass)-[:NEIGHBORS]->(throne);

MATCH (chaos:Room {id: "room.laundry_utility"}), (pass:Room {id: "room.hallway"})
MERGE (chaos)-[:NEIGHBORS]->(pass)
MERGE (pass)-[:NEIGHBORS]->(chaos);

// Beta is a subroom of nothing but Walk-in is child of Beta
MATCH (beta:Room {id: "room.bedroom2"}), (walkin:Room {id: "room.bedroom2_walkin"})
MERGE (walkin)-[:PART_OF]->(beta);

// ------------------------------------------------------------
// 3. SPATIAL REFERENCE FRAME (Open Plan — locked v1.1)
// ------------------------------------------------------------

// Wall Segments — Open Plan
MERGE (seg1:WallSegment {id: "seg.core.A-A1"})
SET seg1.wall = "north", seg1.label = "A–A1", seg1.length_cm = 175,
    seg1.clock = "6pm", seg1.description = "Entry side — visible from threshold, leads eye toward balcony";

MERGE (seg2:WallSegment {id: "seg.core.A1-B"})
SET seg2.wall = "north", seg2.label = "A1–B", seg2.length_cm = 100,
    seg2.clock = "6pm", seg2.description = "Angled outward 20-30°, not visible from entry. Radiator here.";

MERGE (seg3:WallSegment {id: "seg.core.B-B1"})
SET seg3.wall = "east", seg3.label = "B–B1", seg3.length_cm = 100,
    seg3.clock = "9pm", seg3.description = "Balcony door — fixed element, NE quadrant anchor";

MERGE (seg4:WallSegment {id: "seg.core.B1-B2"})
SET seg4.wall = "east", seg4.label = "B1–B2", seg4.length_cm = 105,
    seg4.clock = "9pm", seg4.description = "Solid wall gap between balcony door and window stretch";

MERGE (seg5:WallSegment {id: "seg.core.B2-B3"})
SET seg5.wall = "east", seg5.label = "B2–B3", seg5.length_cm = 250,
    seg5.clock = "9pm", seg5.description = "Window stretch — main glazing, curtain track spans here";

MERGE (seg6:WallSegment {id: "seg.core.B3-D"})
SET seg6.wall = "east", seg6.label = "B3–D", seg6.length_cm = 105,
    seg6.clock = "9pm", seg6.description = "Solid wall, SE angled corner approach";

MERGE (seg7:WallSegment {id: "seg.core.D-C"})
SET seg7.wall = "south", seg7.label = "D–C", seg7.length_cm = 210,
    seg7.clock = "12pm", seg7.description = "Green accent wall. Radiator at C (120cm).";

MERGE (seg8:WallSegment {id: "seg.core.A-C1"})
SET seg8.wall = "west", seg8.label = "A–C1", seg8.length_cm = 120,
    seg8.clock = "3pm", seg8.description = "Entry threshold gap — open to hallway";

MERGE (seg9:WallSegment {id: "seg.core.C1-C2"})
SET seg9.wall = "west", seg9.label = "C1–C2", seg9.length_cm = 300,
    seg9.clock = "3pm", seg9.description = "Kitchen cabinet run — fixed L-shape, defines SW/NW boundary";

// Link segments to Open Plan room
MATCH (core:Room {id: "room.open_plan"}), (s:WallSegment)
WHERE s.id STARTS WITH "seg.core."
MERGE (s)-[:SEGMENT_OF]->(core);

// Spatial Anchors — Open Plan
MERGE (a1:Anchor {id: "anchor.threshold"})
SET a1.type = "boundary", a1.name = "Open Plan Threshold",
    a1.description = "Invisible entry line from hallway into open plan. From wall A north to kitchen run start C.",
    a1.fixed = true;

MERGE (a2:Anchor {id: "anchor.balcony_door"})
SET a2.type = "fixed_element", a2.name = "Balcony Door",
    a2.wall = "east", a2.segment = "B–B1", a2.quadrant = "NE",
    a2.width_cm = 100, a2.clock = "9pm", a2.fixed = true;

MERGE (a3:Anchor {id: "anchor.window_stretch"})
SET a3.type = "fixed_element", a3.name = "East Window Stretch",
    a3.wall = "east", a3.segment = "B2–B3", a3.quadrant = "SE",
    a3.length_cm = 250, a3.clock = "9pm", a3.fixed = true;

MERGE (a4:Anchor {id: "anchor.curtain_track"})
SET a4.type = "fixed_element", a4.name = "Curtain Track",
    a4.wall = "east", a4.segments = ["B–B1", "B1–B2", "B2–B3"],
    a4.fixed = true, a4.notes = "Spans balcony door and window stretch";

MERGE (a5:Anchor {id: "anchor.kitchen_run"})
SET a5.type = "fixed_element", a5.name = "Kitchen Cabinet Run",
    a5.wall = "west", a5.segment = "C1–C2", a5.quadrant = "SW",
    a5.length_cm = 300, a5.depth_cm = 60, a5.height_cm = 90,
    a5.shape = "L-shape", a5.clock = "3pm", a5.fixed = true;

MERGE (a6:Anchor {id: "anchor.radiator.north"})
SET a6.type = "fixed_element", a6.name = "North Wall Radiator",
    a6.wall = "north", a6.segment = "A1–B", a6.quadrant = "NE",
    a6.width_cm = 110, a6.depth_cm = 5, a6.height_cm = 60, a6.fixed = true;

MERGE (a7:Anchor {id: "anchor.radiator.south"})
SET a7.type = "fixed_element", a7.name = "South Wall Radiator",
    a7.wall = "south", a7.segment = "D–C", a7.quadrant = "SW",
    a7.width_cm = 120, a7.depth_cm = 5, a7.height_cm = 60,
    a7.offset_cm = 120, a7.fixed = true;

MERGE (a8:Anchor {id: "anchor.se_angled_corner"})
SET a8.type = "visual_anchor", a8.name = "SE Angled Corner",
    a8.description = "Angled junction where south (green) wall meets east wall — not a soft curve",
    a8.wall_intersection = ["south", "east"], a8.quadrant = "SE", a8.fixed = true;

// Link anchors to Core
MATCH (core:Room {id: "room.open_plan"}), (a:Anchor)
MERGE (a)-[:ANCHOR_OF]->(core);

// ------------------------------------------------------------
// 4. ZONES
// ------------------------------------------------------------
MERGE (z1:Zone {id: "zone.open_plan_fp2"})
SET z1.name = "Open Plan FP2 Zone",
    z1.sensor_roles = ["presence", "illuminance"];

MERGE (z2:Zone {id: "zone.bedroom1_fp2"})
SET z2.name = "Bedroom 1 FP2 Zone",
    z2.sensor_roles = ["presence", "illuminance"];

MERGE (z3:Zone {id: "zone.bedroom2_fp2"})
SET z3.name = "Bedroom 2 FP2 Zone",
    z3.sensor_roles = ["presence", "illuminance"];

MERGE (z4:Zone {id: "zone.hallway_front"})
SET z4.name = "Hallway Front",
    z4.sensor_roles = ["motion"],
    z4.subzone_of = "room.hallway";

MERGE (z5:Zone {id: "zone.hallway_mid"})
SET z5.name = "Hallway Mid",
    z5.sensor_roles = ["motion"],
    z5.subzone_of = "room.hallway";

MERGE (z6:Zone {id: "zone.hallway_rear"})
SET z6.name = "Hallway Rear",
    z6.sensor_roles = ["motion"],
    z6.subzone_of = "room.hallway";

MERGE (z7:Zone {id: "zone.bathroom_throne"})
SET z7.name = "Throne Bathroom Zone",
    z7.sensor_roles = ["presence", "humidity"];

MERGE (z8:Zone {id: "zone.bathroom_secondary"})
SET z8.name = "Splash Bathroom Zone",
    z8.sensor_roles = ["presence", "humidity"];

MERGE (z9:Zone {id: "zone.laundry"})
SET z9.name = "Laundry/Utility Zone",
    z9.sensor_roles = [];

MERGE (z10:Zone {id: "zone.bedroom2_walkin"})
SET z10.name = "Beta Walk-in Zone",
    z10.sensor_roles = ["presence"];

// Zone → Room relationships
MATCH (z:Zone {id: "zone.open_plan_fp2"}), (r:Room {id: "room.open_plan"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.bedroom1_fp2"}), (r:Room {id: "room.bedroom1"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.bedroom2_fp2"}), (r:Room {id: "room.bedroom2"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.hallway_front"}), (r:Room {id: "room.hallway"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.hallway_mid"}), (r:Room {id: "room.hallway"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.hallway_rear"}), (r:Room {id: "room.hallway"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.bathroom_throne"}), (r:Room {id: "room.bathroom_throne"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.bathroom_secondary"}), (r:Room {id: "room.bathroom_secondary"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.laundry"}), (r:Room {id: "room.laundry_utility"}) MERGE (z)-[:ZONE_OF]->(r);
MATCH (z:Zone {id: "zone.bedroom2_walkin"}), (r:Room {id: "room.bedroom2_walkin"}) MERGE (z)-[:ZONE_OF]->(r);

// ------------------------------------------------------------
// 5. INFRASTRUCTURE (all in Chaos)
// ------------------------------------------------------------
MERGE (i1:Infrastructure {id: "infra.unifi_gateway"})
SET i1.name = "Unifi Cloud Gateway Ultra",
    i1.type = "router_controller",
    i1.integrations = ["network_core"],
    i1.notes = "Flat LAN topology, Cloudflare tunnel active";

MERGE (i2:Infrastructure {id: "infra.hue_bridge_pro"})
SET i2.name = "Philips Hue Bridge Pro",
    i2.type = "lighting_bridge",
    i2.integrations = ["home_assistant", "homekit", "hue_app"];

MERGE (i3:Infrastructure {id: "infra.aqara_m3"})
SET i3.name = "Aqara M3 Hub",
    i3.type = "zigbee_matter_hub",
    i3.integrations = ["home_assistant", "homekit", "aqara_app"];

MERGE (i4:Infrastructure {id: "infra.switchbot_hub3"})
SET i4.name = "Switchbot Hub 3",
    i4.type = "switchbot_hub",
    i4.integrations = ["home_assistant", "switchbot_app"];

MERGE (i5:Infrastructure {id: "infra.ha_server"})
SET i5.name = "GMKtec Mini PC (Homelab)",
    i5.type = "automation_core",
    i5.os = "Ubuntu 24.04",
    i5.containers = ["homeassistant", "portainer", "postgres", "neo4j"],
    i5.integrations = ["docker", "home_assistant"];

MERGE (i6:Infrastructure {id: "infra.unifi_ap"})
SET i6.name = "Unifi AP 6+",
    i6.type = "access_point",
    i6.integrations = ["network_core"];

// All infrastructure in Chaos
MATCH (chaos:Room {id: "room.laundry_utility"}), (i:Infrastructure)
MERGE (i)-[:LOCATED_IN]->(chaos);

// ------------------------------------------------------------
// 6. DEVICES — Open Plan (Core)
// ------------------------------------------------------------

// Lighting Groups
MERGE (d:Device {id: "device.core_ceiling_group"})
SET d.name = "Core Ceiling Lights",
    d.type = "light_group",
    d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp", "color"],
    d.ha_entities = ["light.open_plan_ceiling", "light.open_plan_all_lights"],
    d.ha_scenes = ["scene.living_relax", "scene.living_concentrate", "scene.living_energise", "scene.living_nightlight"],
    d.notes = "10 bulbs total: Core Ceiling 01-10. 01-02=Path, 03-08=Living, 09-10=Kitchen. 6 white+colour, 4 white ambiance",
    d.light_zones = ["Core_Path", "Core_Living", "Core_Kitchen", "Core_Ceiling", "Core_All"],
    d.bridge = "infra.hue_bridge_pro";

MERGE (d:Device {id: "device.core_curtains"})
SET d.name = "Aqara Curtain Controller E1 (Pair)",
    d.type = "window_treatment",
    d.status = "active",
    d.capabilities = ["open", "close", "set_position"],
    d.ha_entities = ["cover.openplan_curtains"],
    d.wall = "east", d.segments = ["B-B1", "B2-B3"],
    d.quadrant = "NE",
    d.bridge = "infra.aqara_m3",
    d.notes = "Curtain track spans balcony door and window stretch";

MERGE (d:Device {id: "device.core_tv"})
SET d.name = "Samsung Serif 50\" Ivy Green (2024)",
    d.type = "media_device",
    d.status = "active",
    d.capabilities = ["on_off", "input_select", "volume"],
    d.notes = "Freestanding — no console or wall mount. Ivy Green lifestyle TV.";

MERGE (d:Device {id: "device.core_apple_tv"})
SET d.name = "Apple TV (Core — Wired)",
    d.type = "media_device",
    d.status = "active",
    d.capabilities = ["media_control", "homekit_hub"],
    d.ha_entities = ["media_player.apple_tv"];

MERGE (d:Device {id: "device.core_homepod_full"})
SET d.name = "HomePod (Full — Black)",
    d.type = "media_device",
    d.status = "active",
    d.capabilities = ["audio", "siri", "homekit_hub"],
    d.ha_entities = ["media_player.living_homepods"];

MERGE (d:Device {id: "device.core_soundbar"})
SET d.name = "Samsung Q700D Soundbar + Wireless Sub",
    d.type = "media_device",
    d.status = "active",
    d.notes = "Likely replacing with Sonos or additional HomePod";

MERGE (d:Device {id: "device.core_ac"})
SET d.name = "Meaco 12000BTU CH Pro Smart Portable AC",
    d.type = "climate_device",
    d.role = "ac_heater",
    d.status = "active",
    d.capabilities = ["on_off", "set_mode", "set_temperature", "fan_speed"],
    d.ha_entities = ["climate.living_ac"];

MERGE (d:Device {id: "device.core_humidifier"})
SET d.name = "Levoit Dual 200S Humidifier",
    d.type = "climate_device",
    d.role = "humidifier",
    d.status = "active",
    d.capabilities = ["on_off", "set_humidity", "modes"];

// Link Core devices to room
MATCH (r:Room {id: "room.open_plan"}), (d:Device)
WHERE d.id IN [
  "device.core_ceiling_group", "device.core_curtains", "device.core_tv",
  "device.core_apple_tv", "device.core_homepod_full", "device.core_soundbar",
  "device.core_ac", "device.core_humidifier"
]
MERGE (d)-[:LOCATED_IN]->(r);

// ------------------------------------------------------------
// 7. SENSORS — Open Plan
// ------------------------------------------------------------
MERGE (s:Sensor {id: "sensor.fp2_open_plan_presence"})
SET s.name = "FP2 Open Plan Presence",
    s.type = "sensor_presence",
    s.model = "Aqara FP2",
    s.status = "active",
    s.capabilities = ["presence", "zones", "illuminance"],
    s.ha_entities = [
      "binary_sensor.presence_sensor_fp2_openplan",
      "binary_sensor.presence_sensor_fp2_living_area",
      "binary_sensor.presence_sensor_fp2_kitchen",
      "binary_sensor.presence_sensor_fp2_dining_area"
    ],
    s.bridge = "infra.aqara_m3";

MATCH (s:Sensor {id: "sensor.fp2_open_plan_presence"}), (r:Room {id: "room.open_plan"})
MERGE (s)-[:LOCATED_IN]->(r);
MATCH (s:Sensor {id: "sensor.fp2_open_plan_presence"}), (z:Zone {id: "zone.open_plan_fp2"})
MERGE (s)-[:MONITORS]->(z);

// ------------------------------------------------------------
// 8. DEVICES — Alpha (Bedroom 1)
// ------------------------------------------------------------
MERGE (d:Device {id: "device.alpha_ceiling_lights"})
SET d.name = "Alpha Ceiling Lights (x6)",
    d.type = "light_group",
    d.status = "active",
    d.count = 6,
    d.capabilities = ["on_off", "brightness", "color_temp", "color"],
    d.ha_entities = [
      "light.alpha_ceiling_1", "light.alpha_ceiling_2", "light.alpha_ceiling_3",
      "light.alpha_ceiling_4", "light.alpha_ceiling_5", "light.alpha_ceiling_6"
    ],
    d.bridge = "infra.hue_bridge_pro";

MERGE (d:Device {id: "device.alpha_bedside_lamp"})
SET d.name = "Right Bedside Lamp",
    d.type = "light",
    d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.subzone = "Alpha_Bed",
    d.bridge = "infra.hue_bridge_pro";

MERGE (d:Device {id: "device.alpha_floor_spot"})
SET d.name = "Ola XL Floor Spotlamp",
    d.type = "light",
    d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.bridge = "infra.hue_bridge_pro";

MERGE (d:Device {id: "device.alpha_tv"})
SET d.name = "Samsung UHD 50\" TV (Alpha)",
    d.type = "media_device",
    d.status = "active",
    d.capabilities = ["on_off", "input_select", "volume"];

MERGE (d:Device {id: "device.alpha_apple_tv"})
SET d.name = "Apple TV (Alpha)",
    d.type = "media_device",
    d.status = "active",
    d.capabilities = ["media_control", "homekit_hub"];

MERGE (d:Device {id: "device.alpha_homepod_mini"})
SET d.name = "HomePod Mini (Alpha)",
    d.type = "media_device",
    d.status = "active",
    d.capabilities = ["audio", "siri", "homekit_hub"];

MERGE (d:Device {id: "device.alpha_purifier"})
SET d.name = "Levoit Air 300S Purifier",
    d.type = "climate_device",
    d.role = "air_purifier",
    d.status = "active",
    d.capabilities = ["on_off", "fan_speed", "modes"];

MERGE (d:Device {id: "device.alpha_humidifier"})
SET d.name = "Dreo Smart Humidifier",
    d.type = "climate_device",
    d.role = "humidifier",
    d.status = "active",
    d.capabilities = ["on_off", "set_humidity"];

MERGE (d:Device {id: "device.alpha_ac"})
SET d.name = "Dreo 14000BTU Smart Portable AC 516S",
    d.type = "climate_device",
    d.role = "ac",
    d.status = "active",
    d.capabilities = ["on_off", "set_mode", "set_temperature", "fan_speed"],
    d.ha_entities = ["climate.alpha_ac"];

MERGE (d:Device {id: "device.alpha_blinds"})
SET d.name = "Switchbot Motorised Roller Blinds (x2 Grey L 55\")",
    d.type = "window_treatment",
    d.status = "active",
    d.count = 2,
    d.capabilities = ["open", "close", "set_position"],
    d.bridge = "infra.switchbot_hub3";

// Link Alpha devices to room
MATCH (r:Room {id: "room.bedroom1"}), (d:Device)
WHERE d.id IN [
  "device.alpha_ceiling_lights", "device.alpha_bedside_lamp", "device.alpha_floor_spot",
  "device.alpha_tv", "device.alpha_apple_tv", "device.alpha_homepod_mini",
  "device.alpha_purifier", "device.alpha_humidifier", "device.alpha_ac", "device.alpha_blinds"
]
MERGE (d)-[:LOCATED_IN]->(r);

// Alpha sensors
MERGE (s:Sensor {id: "sensor.fp2_bedroom1_presence"})
SET s.name = "FP2 Alpha Presence", s.type = "sensor_presence",
    s.model = "Aqara FP2", s.status = "active",
    s.capabilities = ["presence", "zones", "illuminance"],
    s.bridge = "infra.aqara_m3";

MERGE (s:Sensor {id: "sensor.alpha_sleep_mat"})
SET s.name = "Withings Sleep Analyser Mat",
    s.type = "health_sensor",
    s.status = "active",
    s.capabilities = ["sleep_state", "presence", "heart_rate", "breathing"],
    s.subzone = "Alpha_Bed";

MATCH (s:Sensor), (r:Room {id: "room.bedroom1"})
WHERE s.id IN ["sensor.fp2_bedroom1_presence", "sensor.alpha_sleep_mat"]
MERGE (s)-[:LOCATED_IN]->(r);

MATCH (s:Sensor {id: "sensor.fp2_bedroom1_presence"}), (z:Zone {id: "zone.bedroom1_fp2"})
MERGE (s)-[:MONITORS]->(z);

// ------------------------------------------------------------
// 9. DEVICES — Beta (Bedroom 2)
// ------------------------------------------------------------
MERGE (d:Device {id: "device.beta_ceiling_lights"})
SET d.name = "Beta Ceiling Lights (x6 — 4 bedroom, 2 walk-in)",
    d.type = "light_group",
    d.status = "active",
    d.count = 6,
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.notes = "x4 in bedroom, x2 in adjacent walk-in — no physical boundary. All white ambiance.",
    d.bridge = "infra.hue_bridge_pro";

MERGE (d:Device {id: "device.beta_signe_floor_lamp"})
SET d.name = "Signe Gradient Floor Lamp",
    d.type = "light",
    d.status = "active",
    d.capabilities = ["on_off", "brightness", "color"],
    d.bridge = "infra.hue_bridge_pro";

MERGE (d:Device {id: "device.beta_bed_lightstrip"})
SET d.name = "Beta Bed Lightstrip",
    d.type = "light",
    d.status = "active",
    d.capabilities = ["on_off", "brightness", "color"],
    d.subzone = "Beta_Bed",
    d.bridge = "infra.hue_bridge_pro";

MATCH (r:Room {id: "room.bedroom2"}), (d:Device)
WHERE d.id IN ["device.beta_ceiling_lights", "device.beta_signe_floor_lamp", "device.beta_bed_lightstrip"]
MERGE (d)-[:LOCATED_IN]->(r);

MERGE (s:Sensor {id: "sensor.fp1e_bedroom2_presence"})
SET s.name = "FP1E Beta Presence", s.type = "sensor_presence",
    s.model = "Aqara FP1E", s.status = "active",
    s.capabilities = ["presence", "zones"],
    s.bridge = "infra.aqara_m3";

MATCH (s:Sensor {id: "sensor.fp1e_bedroom2_presence"}), (r:Room {id: "room.bedroom2"})
MERGE (s)-[:LOCATED_IN]->(r);
MATCH (s:Sensor {id: "sensor.fp1e_bedroom2_presence"}), (z:Zone {id: "zone.bedroom2_fp2"})
MERGE (s)-[:MONITORS]->(z);

// ------------------------------------------------------------
// 10. DEVICES — Bathrooms
// ------------------------------------------------------------
// Throne
MERGE (d:Device {id: "device.throne_ceiling_lights"})
SET d.name = "Throne Ceiling Lights (x4)",
    d.type = "light_group", d.count = 4, d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.bridge = "infra.hue_bridge_pro";

MERGE (s:Sensor {id: "sensor.throne_motion"})
SET s.name = "Hue Motion Sensor (Throne)",
    s.type = "sensor_motion", s.model = "Hue Motion",
    s.status = "active", s.capabilities = ["motion", "illuminance", "temperature"],
    s.bridge = "infra.hue_bridge_pro";

MERGE (s:Sensor {id: "sensor.throne_door"})
SET s.name = "Aqara Door Sensor (Throne)",
    s.type = "sensor_door", s.model = "Aqara Door",
    s.status = "active", s.capabilities = ["open_close"],
    s.bridge = "infra.aqara_m3";

MATCH (r:Room {id: "room.bathroom_throne"}), (d:Device {id: "device.throne_ceiling_lights"})
MERGE (d)-[:LOCATED_IN]->(r);
MATCH (r:Room {id: "room.bathroom_throne"}), (s:Sensor)
WHERE s.id IN ["sensor.throne_motion", "sensor.throne_door"]
MERGE (s)-[:LOCATED_IN]->(r);

// Splash
MERGE (d:Device {id: "device.splash_ceiling_lights"})
SET d.name = "Splash Ceiling Lights (x5)",
    d.type = "light_group", d.count = 5, d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.bridge = "infra.hue_bridge_pro";

MERGE (s:Sensor {id: "sensor.splash_motion"})
SET s.name = "Hue Motion Sensor (Splash)",
    s.type = "sensor_motion", s.model = "Hue Motion",
    s.status = "active", s.capabilities = ["motion", "illuminance", "temperature"],
    s.bridge = "infra.hue_bridge_pro";

MERGE (s:Sensor {id: "sensor.splash_door_hallway"})
SET s.name = "Aqara Door Sensor (Splash — Hallway side)",
    s.type = "sensor_door", s.status = "active",
    s.capabilities = ["open_close"], s.bridge = "infra.aqara_m3";

MERGE (s:Sensor {id: "sensor.splash_door_walkin"})
SET s.name = "Aqara Door Sensor (Splash — Walk-in side)",
    s.type = "sensor_door", s.status = "active",
    s.capabilities = ["open_close"], s.bridge = "infra.aqara_m3";

MATCH (r:Room {id: "room.bathroom_secondary"}), (d:Device {id: "device.splash_ceiling_lights"})
MERGE (d)-[:LOCATED_IN]->(r);
MATCH (r:Room {id: "room.bathroom_secondary"}), (s:Sensor)
WHERE s.id IN ["sensor.splash_motion", "sensor.splash_door_hallway", "sensor.splash_door_walkin"]
MERGE (s)-[:LOCATED_IN]->(r);

// ------------------------------------------------------------
// 11. DEVICES — Pass (Hallway)
// ------------------------------------------------------------
MERGE (d:Device {id: "device.pass_ceiling_lights"})
SET d.name = "Pass Ceiling Lights (x5 White Ambiance)",
    d.type = "light_group", d.count = 5, d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.notes = "x2 front stretch (toward Core + Alpha), x3 rear stretch (toward Beta)",
    d.bridge = "infra.hue_bridge_pro";

MERGE (s:Sensor {id: "sensor.pass_motion_1"})
SET s.name = "Hallway Motion Sensor 1 (Front)",
    s.type = "sensor_motion", s.model = "Aqara Motion",
    s.status = "undeployed",
    s.capabilities = ["motion"], s.zone = "zone.hallway_front",
    s.bridge = "infra.aqara_m3";

MERGE (s:Sensor {id: "sensor.pass_motion_2"})
SET s.name = "Hallway Motion Sensor 2 (Rear)",
    s.type = "sensor_motion", s.model = "Aqara Motion",
    s.status = "undeployed",
    s.capabilities = ["motion"], s.zone = "zone.hallway_rear",
    s.bridge = "infra.aqara_m3";

MERGE (s:Sensor {id: "sensor.pass_fp1e"})
SET s.name = "FP1E Hallway Sensor",
    s.type = "sensor_presence", s.model = "Aqara FP1E",
    s.status = "active",
    s.capabilities = ["presence"], s.bridge = "infra.aqara_m3";

MERGE (s:Sensor {id: "sensor.front_door_fp2"})
SET s.name = "FP2 Door Contact Sensor (Front Door)",
    s.type = "sensor_door", s.model = "Aqara FP2 Matter Door",
    s.status = "active",
    s.capabilities = ["open_close"], s.bridge = "infra.aqara_m3";

MATCH (r:Room {id: "room.hallway"}), (d:Device {id: "device.pass_ceiling_lights"})
MERGE (d)-[:LOCATED_IN]->(r);
MATCH (r:Room {id: "room.hallway"}), (s:Sensor)
WHERE s.id IN ["sensor.pass_motion_1", "sensor.pass_motion_2", "sensor.pass_fp1e", "sensor.front_door_fp2"]
MERGE (s)-[:LOCATED_IN]->(r);

// ------------------------------------------------------------
// 12. DEVICES — Chaos (Laundry/Utility)
// ------------------------------------------------------------
MERGE (d:Device {id: "device.eufy_s1_omni_pro"})
SET d.name = "Eufy S1 Omni Pro RoboVac",
    d.type = "robot_vacuum",
    d.status = "active",
    d.capabilities = ["start", "stop", "dock", "zone_clean"],
    d.ha_entities = ["vacuum.eufy_s1_omni_pro"],
    d.notes = "Docked in Chaos";

MERGE (d:Device {id: "device.chaos_ceiling_light"})
SET d.name = "Chaos Ceiling Light",
    d.type = "light",
    d.status = "active",
    d.capabilities = ["on_off", "brightness", "color_temp"],
    d.bridge = "infra.hue_bridge_pro";

MATCH (r:Room {id: "room.laundry_utility"}), (d:Device)
WHERE d.id IN ["device.eufy_s1_omni_pro", "device.chaos_ceiling_light"]
MERGE (d)-[:LOCATED_IN]->(r);

// ------------------------------------------------------------
// 13. ACTUATORS (Controls)
// ------------------------------------------------------------
MERGE (a:Actuator {id: "actuator.alpha_hue_dial"})
SET a.name = "Alpha Bedroom Hue Tap Dial Switch",
    a.type = "stateless_button",
    a.capabilities = ["button_press", "dial_rotate"],
    a.bridge = "infra.hue_bridge_pro";

MERGE (a:Actuator {id: "actuator.alpha_smart_button"})
SET a.name = "Bed Smart Button (Alpha)",
    a.type = "stateless_button",
    a.capabilities = ["button_press"],
    a.subzone = "Alpha_Bed";

MERGE (a:Actuator {id: "actuator.beta_hue_dial"})
SET a.name = "Beta Bedroom Hue Tap Dial Switch",
    a.type = "stateless_button",
    a.capabilities = ["button_press", "dial_rotate"],
    a.bridge = "infra.hue_bridge_pro";

MERGE (a:Actuator {id: "actuator.core_hue_tap_dial"})
SET a.name = "Core Hue Tap Dial Switch",
    a.type = "stateless_button",
    a.capabilities = ["button_press", "dial_rotate"],
    a.bridge = "infra.hue_bridge_pro";

MERGE (a:Actuator {id: "actuator.throne_ceiling_switch"})
SET a.name = "Throne Bathroom Ceiling Switch",
    a.type = "stateless_button",
    a.capabilities = ["button_press"];

MERGE (a:Actuator {id: "actuator.splash_dimmer"})
SET a.name = "Splash Dimmer Switch",
    a.type = "stateless_button",
    a.capabilities = ["button_press", "brightness_control"];

MERGE (a:Actuator {id: "actuator.pass_dimmer"})
SET a.name = "Hallway Dimmer Switch",
    a.type = "stateless_button",
    a.capabilities = ["button_press", "brightness_control"];

// Link actuators to rooms
MATCH (r:Room {id: "room.bedroom1"}), (a:Actuator)
WHERE a.id IN ["actuator.alpha_hue_dial", "actuator.alpha_smart_button"]
MERGE (a)-[:LOCATED_IN]->(r);

MATCH (r:Room {id: "room.bedroom2"}), (a:Actuator {id: "actuator.beta_hue_dial"})
MERGE (a)-[:LOCATED_IN]->(r);

MATCH (r:Room {id: "room.open_plan"}), (a:Actuator {id: "actuator.core_hue_tap_dial"})
MERGE (a)-[:LOCATED_IN]->(r);

MATCH (r:Room {id: "room.bathroom_throne"}), (a:Actuator {id: "actuator.throne_ceiling_switch"})
MERGE (a)-[:LOCATED_IN]->(r);

MATCH (r:Room {id: "room.bathroom_secondary"}), (a:Actuator {id: "actuator.splash_dimmer"})
MERGE (a)-[:LOCATED_IN]->(r);

MATCH (r:Room {id: "room.hallway"}), (a:Actuator {id: "actuator.pass_dimmer"})
MERGE (a)-[:LOCATED_IN]->(r);

// ------------------------------------------------------------
// 14. INFRASTRUCTURE → DEVICE BRIDGE RELATIONSHIPS
// ------------------------------------------------------------
MATCH (bridge:Infrastructure {id: "infra.hue_bridge_pro"}), (d:Device)
WHERE d.bridge = "infra.hue_bridge_pro"
MERGE (d)-[:MANAGED_BY]->(bridge);

MATCH (bridge:Infrastructure {id: "infra.aqara_m3"}), (d:Device)
WHERE d.bridge = "infra.aqara_m3"
MERGE (d)-[:MANAGED_BY]->(bridge);

MATCH (bridge:Infrastructure {id: "infra.switchbot_hub3"}), (d:Device)
WHERE d.bridge = "infra.switchbot_hub3"
MERGE (d)-[:MANAGED_BY]->(bridge);

MATCH (bridge:Infrastructure {id: "infra.hue_bridge_pro"}), (s:Sensor)
WHERE s.bridge = "infra.hue_bridge_pro"
MERGE (s)-[:MANAGED_BY]->(bridge);

MATCH (bridge:Infrastructure {id: "infra.aqara_m3"}), (s:Sensor)
WHERE s.bridge = "infra.aqara_m3"
MERGE (s)-[:MANAGED_BY]->(bridge);

MATCH (bridge:Infrastructure {id: "infra.hue_bridge_pro"}), (a:Actuator)
WHERE a.bridge = "infra.hue_bridge_pro"
MERGE (a)-[:MANAGED_BY]->(bridge);

// HA server manages everything
MATCH (ha:Infrastructure {id: "infra.ha_server"}), (d:Device)
MERGE (ha)-[:CONTROLS]->(d);

// ------------------------------------------------------------
// 15. VERIFICATION QUERIES (run these to check)
// ------------------------------------------------------------
// MATCH (r:Room) RETURN r.code, r.name, r.area_sqft ORDER BY r.code;
// MATCH (d:Device)-[:LOCATED_IN]->(r:Room) RETURN r.code, count(d) as device_count ORDER BY r.code;
// MATCH (s:Sensor)-[:LOCATED_IN]->(r:Room) RETURN r.code, count(s) as sensor_count ORDER BY r.code;
// MATCH p=(d:Device)-[:MANAGED_BY]->(i:Infrastructure) RETURN i.name, count(d) as devices;
// MATCH (r1:Room)-[:NEIGHBORS]->(r2:Room) RETURN r1.code, r2.code;
// MATCH (a:Anchor)-[:ANCHOR_OF]->(r:Room) RETURN r.code, collect(a.name);
