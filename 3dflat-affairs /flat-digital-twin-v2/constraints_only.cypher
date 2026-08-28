// Run once before or after importing the CSV files.
// Safe to rerun.
CREATE CONSTRAINT room_id_unique IF NOT EXISTS FOR (n:Room) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT zone_id_unique IF NOT EXISTS FOR (n:Zone) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT wallsegment_id_unique IF NOT EXISTS FOR (n:WallSegment) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT anchor_id_unique IF NOT EXISTS FOR (n:Anchor) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT device_id_unique IF NOT EXISTS FOR (n:Device) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT sensor_id_unique IF NOT EXISTS FOR (n:Sensor) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT actuator_id_unique IF NOT EXISTS FOR (n:Actuator) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT infrastructure_id_unique IF NOT EXISTS FOR (n:Infrastructure) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tool_id_unique IF NOT EXISTS FOR (n:Tool) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT service_id_unique IF NOT EXISTS FOR (n:Service) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT platform_id_unique IF NOT EXISTS FOR (n:Platform) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT api_id_unique IF NOT EXISTS FOR (n:API) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT domain_id_unique IF NOT EXISTS FOR (n:Domain) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT credential_id_unique IF NOT EXISTS FOR (n:Credential) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT host_id_unique IF NOT EXISTS FOR (n:Host) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT capability_id_unique IF NOT EXISTS FOR (n:Capability) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT accesssurface_id_unique IF NOT EXISTS FOR (n:AccessSurface) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT protocol_id_unique IF NOT EXISTS FOR (n:Protocol) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT metalabel_name_unique IF NOT EXISTS FOR (n:MetaLabel) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT metarelationship_name_unique IF NOT EXISTS FOR (n:MetaRelationship) REQUIRE n.name IS UNIQUE;
