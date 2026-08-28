// ============================================
// Flat Digital Twin — Neo4j Seed Script
// Generated from USDZ scan data + hallway_layout.json
// ============================================

// --- Constraints ---
CREATE CONSTRAINT room_id IF NOT EXISTS FOR (r:Room) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT object_id IF NOT EXISTS FOR (o:SpatialObject) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT light_id IF NOT EXISTS FOR (l:Light) REQUIRE l.id IS UNIQUE;

// --- Rooms ---
CREATE (:Room {id: "room_1", name: "Open Plan Kitchen/Living", scan_id: "open_plan", source_file: "V1.usdz"});
CREATE (:Room {id: "room_29", name: "Primary Bedroom Wing", scan_id: "bedroom_wing", source_file: "3D-alpha.usdz"});
CREATE (:Room {id: "room_52", name: "Hallway", scan_id: "hallway", source_file: "3D-hall_.usdz"});
CREATE (:Room {id: "room_78", name: "Secondary Bedroom (Beta)", scan_id: "secondary_bedroom", source_file: "3D-Throne_.usdz"});

// --- Spatial Objects ---
CREATE (:SpatialObject:Unknown {id: "obj_2", name: "Project-2605161730", category: "Unknown"});
CREATE (:SpatialObject:Chair {id: "obj_3", name: "Chair0", category: "Chair", uuid: "E76BC629-CB2D-48F8-9E88-343CCB7554F7", bbox_min: [-0.307, -0.513, -0.341], bbox_max: [0.307, -0.196, 0.341], size_m: [0.615, 0.317, 0.682]});
CREATE (:SpatialObject:Chair {id: "obj_4", name: "Chair1", category: "Chair", uuid: "A83F86E6-31C2-4173-B3AB-2165077E6B8C", bbox_min: [-0.227, -0.409, -0.253], bbox_max: [0.227, 0.191, 0.253], size_m: [0.454, 0.6, 0.506]});
CREATE (:SpatialObject:Chair {id: "obj_5", name: "Chair2", category: "Chair", uuid: "09CE44B0-5AC3-4467-B146-0A71C6FC41C5", bbox_min: [-0.227, -0.409, -0.253], bbox_max: [0.227, 0.191, 0.253], size_m: [0.454, 0.6, 0.506]});
CREATE (:SpatialObject:Floor {id: "obj_6", name: "Floor0", category: "Floor", uuid: "C60C491F-EB12-4465-82A6-47930507C4A4", bbox_min: [-2.729, -4.422, -0.16], bbox_max: [3.507, 1.696, 0.0], size_m: [6.236, 6.119, 0.16]});
CREATE (:SpatialObject:Oven {id: "obj_7", name: "Oven0", category: "Oven", uuid: "E8311CAF-522A-4A67-96AB-2BBB63C9A8B7", bbox_min: [-0.308, -0.458, -0.34], bbox_max: [0.308, 0.458, 0.34], size_m: [0.617, 0.916, 0.68]});
CREATE (:SpatialObject:Sink {id: "obj_8", name: "Sink0", category: "Sink", uuid: "E0FFC5B4-17E9-4715-A7F2-3EB83FE2D221", bbox_min: [-0.257, -0.11, -0.223], bbox_max: [0.257, 0.11, 0.223], size_m: [0.513, 0.221, 0.447]});
CREATE (:SpatialObject:Sofa {id: "obj_9", name: "Sofa0", category: "Sofa", uuid: "E8937B95-C472-41F3-8BEE-6947DA809C80", bbox_min: [-0.871, -0.407, -0.521], bbox_max: [0.871, 0.407, 0.521], size_m: [1.742, 0.813, 1.042]});
CREATE (:SpatialObject:Storage {id: "obj_10", name: "Storage0", category: "Storage", uuid: "725AC8BD-6F1E-4F7D-B6AC-F4926DD60165", bbox_min: [-0.602, -0.395, -0.168], bbox_max: [0.602, 0.395, 0.168], size_m: [1.205, 0.789, 0.336]});
CREATE (:SpatialObject:Storage {id: "obj_11", name: "Storage1", category: "Storage", uuid: "F1130374-4EAA-4C16-B744-50FD4D2C394F", bbox_min: [-0.632, -0.32, -0.243], bbox_max: [0.632, 0.32, 0.243], size_m: [1.263, 0.64, 0.485]});
CREATE (:SpatialObject:Storage {id: "obj_12", name: "Storage2", category: "Storage", uuid: "A4C5E5F6-3FB2-40FF-AA07-B001DC85F7EA", bbox_min: [-0.633, -1.054, -0.291], bbox_max: [0.633, 1.054, 0.291], size_m: [1.266, 2.108, 0.583]});
CREATE (:SpatialObject:Storage {id: "obj_13", name: "Storage3", category: "Storage", uuid: "85C4702C-9FBA-4D5F-90F2-D28181D9C8B4", bbox_min: [-0.617, -0.482, -0.295], bbox_max: [0.617, 0.482, 0.295], size_m: [1.234, 0.965, 0.591]});
CREATE (:SpatialObject:Storage {id: "obj_14", name: "Storage4", category: "Storage", uuid: "31B5A079-9DD3-4D62-9BA3-E45E6E214CA2", bbox_min: [-1.487, -0.395, -0.183], bbox_max: [1.487, 0.395, 0.183], size_m: [2.973, 0.789, 0.366]});
CREATE (:SpatialObject:Storage {id: "obj_15", name: "Storage5", category: "Storage", uuid: "D5FFAA21-5777-478C-A3E9-419CACCAC593", bbox_min: [-0.228, -0.482, -0.339], bbox_max: [0.228, 0.482, 0.339], size_m: [0.455, 0.965, 0.678]});
CREATE (:SpatialObject:Storage {id: "obj_16", name: "Storage6", category: "Storage", uuid: "88CD5C2B-85E5-4218-B7BA-2B61CD25B18A", bbox_min: [-0.899, -0.482, -0.341], bbox_max: [0.899, 0.482, 0.341], size_m: [1.798, 0.965, 0.683]});
CREATE (:SpatialObject:Storage {id: "obj_17", name: "Storage7", category: "Storage", uuid: "D9B96F6B-A5A3-4291-8F14-8808E099A01D", bbox_min: [-0.284, -1.105, -0.332], bbox_max: [0.284, 1.105, 0.332], size_m: [0.568, 2.211, 0.664]});
CREATE (:SpatialObject:Table {id: "obj_18", name: "Table0", category: "Table", uuid: "A8C2D756-9B0D-4CD5-90F5-EC973C17E066", bbox_min: [-0.587, -0.198, -0.517], bbox_max: [0.587, 0.198, 0.517], size_m: [1.174, 0.396, 1.034]});
CREATE (:SpatialObject:Table {id: "obj_19", name: "Table1", category: "Table", uuid: "F548E006-417D-4A5F-AC66-E17118982533", bbox_min: [-0.683, -0.375, -0.508], bbox_max: [0.683, 0.375, 0.508], size_m: [1.365, 0.75, 1.017]});
CREATE (:SpatialObject:Television {id: "obj_20", name: "Television0", category: "Television", uuid: "76251AA8-21B2-4A87-872D-C49D1176E78B", bbox_min: [-0.464, -0.357, -0.04], bbox_max: [0.464, 0.357, 0.04], size_m: [0.928, 0.714, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_21", name: "Wall0", category: "Wall", uuid: "48D1E224-23C7-4C3A-B955-00C02CEA2512", bbox_min: [-2.927, -1.249, -0.16], bbox_max: [3.087, 1.249, 0.0], size_m: [6.013, 2.498, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_22", name: "Wall1", category: "Wall", uuid: "93DADEA3-40C4-4C2A-9028-F8C2F9681A36", bbox_min: [-1.918, -1.249, -0.16], bbox_max: [2.078, 1.249, 0.0], size_m: [3.996, 2.498, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_23", name: "Wall2", category: "Wall", uuid: "AA1DECF8-960A-494E-8EF4-32916F566D32", bbox_min: [-0.905, -1.249, -0.16], bbox_max: [0.905, 1.249, 0.0], size_m: [1.809, 2.498, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_24", name: "Wall3", category: "Wall", uuid: "0531C44E-1FC6-4021-8D94-43658449D5BA", bbox_min: [-0.81, -1.249, -0.16], bbox_max: [0.97, 1.249, 0.0], size_m: [1.781, 2.498, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_25", name: "Wall4", category: "Wall", uuid: "2F1165F0-DFBB-481F-B6A6-7B5BB293DF7C", bbox_min: [-0.294, -1.249, -0.16], bbox_max: [0.294, 1.249, 0.0], size_m: [0.588, 2.498, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_26", name: "Wall5", category: "Wall", uuid: "D57EC594-FF68-4F13-805B-4EE83EF563E9", bbox_min: [-3.039, -1.249, -0.16], bbox_max: [3.262, 1.249, 0.051], size_m: [6.3, 2.498, 0.211]});
CREATE (:SpatialObject:Window {id: "obj_27", name: "Window0", category: "Window", uuid: "54E37B7C-9B70-4BCF-B18F-E0F004F6B28C", bbox_min: [-0.505, -1.177, -0.08], bbox_max: [0.505, 1.177, 0.0], size_m: [1.009, 2.354, 0.08]});
CREATE (:SpatialObject:Window {id: "obj_28", name: "Window1", category: "Window", uuid: "AD3446E4-633E-41AD-8497-674021B29AE2", bbox_min: [-1.28, -1.183, -0.08], bbox_max: [1.28, 1.183, 0.0], size_m: [2.56, 2.366, 0.08]});
CREATE (:SpatialObject:Unknown {id: "obj_30", name: "Project-2604092259", category: "Unknown"});
CREATE (:SpatialObject:Bed {id: "obj_31", name: "Bed0", category: "Bed", uuid: "8B03BB01-D947-4D4F-8203-5019D0BF2FEC", bbox_min: [-0.71, -0.332, -0.95], bbox_max: [0.71, 0.332, 0.95], size_m: [1.42, 0.664, 1.901]});
CREATE (:SpatialObject:Floor {id: "obj_32", name: "Floor0", category: "Floor", uuid: "9CE961CD-1B7D-4243-A41F-2757D3FCCD17", bbox_min: [-3.259, -1.794, -0.16], bbox_max: [3.262, 1.794, 0.0], size_m: [6.521, 3.588, 0.16]});
CREATE (:SpatialObject:Sink {id: "obj_33", name: "Sink0", category: "Sink", uuid: "1151E4EE-135D-471F-9F5B-E2AC32A33383", bbox_min: [-0.281, -0.15, -0.21], bbox_max: [0.281, 0.15, 0.21], size_m: [0.563, 0.3, 0.419]});
CREATE (:SpatialObject:Sofa {id: "obj_34", name: "Sofa0", category: "Sofa", uuid: "60887E7E-A942-4298-8E07-07AC7A9F4DB3", bbox_min: [-0.337, -0.395, -0.314], bbox_max: [0.337, 0.395, 0.314], size_m: [0.675, 0.791, 0.629]});
CREATE (:SpatialObject:Storage {id: "obj_35", name: "Storage0", category: "Storage", uuid: "900B5BA5-D4C1-4065-8713-5B979F822818", bbox_min: [-0.529, -0.35, -0.322], bbox_max: [0.529, 0.35, 0.322], size_m: [1.059, 0.7, 0.643]});
CREATE (:SpatialObject:Toilet {id: "obj_36", name: "Toilet0", category: "Toilet", uuid: "32302060-45BD-4BB7-8CA2-D1CF956EB632", bbox_min: [-0.195, -0.41, -0.326], bbox_max: [0.195, 0.41, 0.326], size_m: [0.389, 0.821, 0.653]});
CREATE (:SpatialObject:Wall {id: "obj_37", name: "Wall0", category: "Wall", uuid: "CDDADCCE-F3DA-4EBC-9AC5-34A0C12B488A", bbox_min: [-0.351, -1.257, -0.16], bbox_max: [0.351, 1.257, 0.0], size_m: [0.702, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_38", name: "Wall1", category: "Wall", uuid: "B39EA766-6747-42E2-A99D-C6FF0F94A69B", bbox_min: [-1.283, -1.257, -0.16], bbox_max: [1.443, 1.257, 0.0], size_m: [2.726, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_39", name: "Wall10", category: "Wall", uuid: "2912198B-FD35-46F4-A893-9988F732DDB6", bbox_min: [-0.684, -1.257, -0.16], bbox_max: [0.684, 1.257, 0.0], size_m: [1.369, 2.515, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_40", name: "Door1", category: "Unknown", uuid: "4A498C52-CBE0-4AB0-887E-9BA019BF03BC", bbox_min: [-0.405, -0.998, -0.08], bbox_max: [0.405, 0.998, 0.0], size_m: [0.81, 1.996, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_41", name: "Wall11", category: "Wall", uuid: "FC5AF694-9773-475C-BCBD-904F769193CE", bbox_min: [-0.441, -1.257, -0.16], bbox_max: [0.441, 1.257, 0.0], size_m: [0.882, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_42", name: "Wall12", category: "Wall", uuid: "D2A074C0-6A14-49B8-ADDB-71AFBE119F72", bbox_min: [-1.549, -1.257, -0.16], bbox_max: [1.709, 1.257, 0.0], size_m: [3.257, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_43", name: "Wall2", category: "Wall", uuid: "FA68799C-9D90-4103-A626-3871D4C2A247", bbox_min: [-0.881, -1.257, -0.16], bbox_max: [0.929, 1.257, 0.0], size_m: [1.81, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_44", name: "Wall3", category: "Wall", uuid: "6A6073B4-0B8B-42C4-9AE4-CBDB6E7B3250", bbox_min: [-0.698, -1.257, -0.16], bbox_max: [0.858, 1.257, 0.0], size_m: [1.556, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_45", name: "Wall4", category: "Wall", uuid: "43EB0CFE-6758-4C65-8B96-53CFEBF9A9AD", bbox_min: [-0.356, -1.257, -0.16], bbox_max: [0.516, 1.257, 0.0], size_m: [0.871, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_46", name: "Wall5", category: "Wall", uuid: "F52A83D9-EEC8-42BE-B261-35A8EED5D173", bbox_min: [-0.067, -1.257, -0.16], bbox_max: [0.21, 1.257, 0.0], size_m: [0.277, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_47", name: "Wall6", category: "Wall", uuid: "12458153-A5C7-46C3-8B09-6C128A48F406", bbox_min: [-1.334, -1.257, -0.16], bbox_max: [1.393, 1.257, 0.0], size_m: [2.727, 2.515, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_48", name: "Door0", category: "Unknown", uuid: "985EAAE6-0721-4957-ADDC-C0CE22B09BC6", bbox_min: [-0.377, -1.038, -0.08], bbox_max: [0.377, 1.038, 0.0], size_m: [0.753, 2.076, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_49", name: "Wall7", category: "Wall", uuid: "192C4CE4-2D8A-4A46-ADA3-6BC52ED6F81E", bbox_min: [-0.454, -1.257, -0.16], bbox_max: [0.454, 1.257, 0.0], size_m: [0.909, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_50", name: "Wall8", category: "Wall", uuid: "354E8A60-8F9B-4757-BC1B-991A101DD50C", bbox_min: [-0.842, -1.257, -0.16], bbox_max: [1.002, 1.257, 0.0], size_m: [1.844, 2.515, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_51", name: "Wall9", category: "Wall", uuid: "BEC7B4F2-9960-43CA-B8FB-180D02B90044", bbox_min: [-2.137, -1.257, -0.16], bbox_max: [2.294, 1.257, 0.0], size_m: [4.431, 2.515, 0.16]});
CREATE (:SpatialObject:Unknown {id: "obj_53", name: "Project-2607171947", category: "Unknown"});
CREATE (:SpatialObject:Chair {id: "obj_54", name: "Chair0", category: "Chair", uuid: "B2A578AE-9A6E-4E4C-8E6D-E5295A2FEE22", bbox_min: [-0.286, -0.43, -0.33], bbox_max: [0.286, 0.43, 0.33], size_m: [0.572, 0.859, 0.66]});
CREATE (:SpatialObject:Floor {id: "obj_55", name: "Floor0", category: "Floor", uuid: "F6839722-F0A6-428E-945F-6D5FC0F4EFED", bbox_min: [-4.244, -1.541, -0.16], bbox_max: [4.244, 1.541, 0.0], size_m: [8.489, 3.082, 0.16]});
CREATE (:SpatialObject:Table {id: "obj_56", name: "Table0", category: "Table", uuid: "CD5A4C91-09CA-46ED-A252-B0E514EB8FC2", bbox_min: [-0.623, -0.496, -0.144], bbox_max: [0.623, 0.496, 0.144], size_m: [1.247, 0.991, 0.288]});
CREATE (:SpatialObject:Table {id: "obj_57", name: "Table1", category: "Table", uuid: "95FF0F4A-D2C1-4466-86AF-48D7D28A47E4", bbox_min: [-0.198, -0.249, -0.171], bbox_max: [0.198, 0.249, 0.171], size_m: [0.396, 0.499, 0.342]});
CREATE (:SpatialObject:Door {id: "obj_58", name: "Door3", category: "Unknown", uuid: "B85CF50E-38E8-40DB-8E90-1E937CD6E3E8", bbox_min: [-0.37, -1.012, -0.08], bbox_max: [0.37, 1.012, 0.0], size_m: [0.741, 2.023, 0.08]});
CREATE (:SpatialObject:Door {id: "obj_59", name: "Door4", category: "Unknown", uuid: "EA637012-5D40-4E2D-AF90-D74E5F08750D", bbox_min: [-0.406, -1.037, -0.08], bbox_max: [0.406, 1.037, 0.0], size_m: [0.812, 2.074, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_60", name: "Wall0", category: "Wall", uuid: "EAB0316A-BD79-4A02-B0F3-8B52C8E43BA4", bbox_min: [-1.611, -1.255, -0.16], bbox_max: [1.771, 1.255, 0.0], size_m: [3.381, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_61", name: "Wall1", category: "Wall", uuid: "3436C353-DEEF-4092-B610-0B758CA2FAC8", bbox_min: [-1.208, -1.255, -0.16], bbox_max: [1.368, 1.255, 0.0], size_m: [2.577, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_62", name: "Wall10", category: "Wall", uuid: "5E02A7A8-1DB8-4A52-9EC7-223AFDF12E6B", bbox_min: [-0.767, -1.255, -0.16], bbox_max: [0.767, 1.255, 0.0], size_m: [1.533, 2.509, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_63", name: "Door5", category: "Unknown", uuid: "526A3BDA-746D-4906-B00A-EA4F14C3DAAA", bbox_min: [-0.392, -1.009, -0.08], bbox_max: [0.392, 1.009, 0.0], size_m: [0.783, 2.018, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_64", name: "Wall11", category: "Wall", uuid: "3C671DFA-BB1B-4DEF-86A1-3554C3143C17", bbox_min: [-1.676, -1.255, -0.16], bbox_max: [1.676, 1.255, 0.0], size_m: [3.352, 2.509, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_65", name: "Door6", category: "Unknown", uuid: "78C30DC5-C68D-44B9-8086-B0C30AB862E1", bbox_min: [-0.431, -1.045, -0.08], bbox_max: [0.431, 1.045, 0.0], size_m: [0.861, 2.091, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_66", name: "Wall12", category: "Wall", uuid: "4AE0380D-1310-44F6-8618-1B0E43E71EF9", bbox_min: [-0.549, -1.255, -0.16], bbox_max: [0.709, 1.255, 0.0], size_m: [1.258, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_67", name: "Wall2", category: "Wall", uuid: "9E1640AE-F515-44CE-94A2-2E406641E3DD", bbox_min: [-0.891, -1.255, -0.16], bbox_max: [1.051, 1.255, 0.0], size_m: [1.942, 2.509, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_68", name: "Door2", category: "Unknown", uuid: "F29DAC5D-86ED-4267-B8C3-7406A3B50ACE", bbox_min: [-0.497, -1.054, -0.08], bbox_max: [0.497, 1.054, 0.0], size_m: [0.995, 2.108, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_69", name: "Wall3", category: "Wall", uuid: "8D8B3F39-2549-4078-AF4C-F9DABB7BA513", bbox_min: [-0.832, -1.255, -0.16], bbox_max: [0.832, 1.255, 0.0], size_m: [1.664, 2.509, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_70", name: "Door0", category: "Unknown", uuid: "BC9B268A-B853-4349-BCD2-842FB8192088", bbox_min: [-0.379, -1.0, -0.08], bbox_max: [0.379, 1.0, 0.0], size_m: [0.757, 2.001, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_71", name: "Wall4", category: "Wall", uuid: "87D61B8C-3FC4-4CDD-AC71-F3032880F5A8", bbox_min: [-0.734, -1.255, -0.16], bbox_max: [0.734, 1.255, 0.0], size_m: [1.468, 2.509, 0.16]});
CREATE (:SpatialObject:Door {id: "obj_72", name: "Door1", category: "Unknown", uuid: "13CE4E01-2E77-420A-A1FA-3A117A058D06", bbox_min: [-0.39, -1.029, -0.08], bbox_max: [0.39, 1.029, 0.0], size_m: [0.781, 2.057, 0.08]});
CREATE (:SpatialObject:Wall {id: "obj_73", name: "Wall5", category: "Wall", uuid: "1829A164-5205-45D4-ABE6-73A2D68B9673", bbox_min: [-0.56, -1.255, -0.16], bbox_max: [0.56, 1.255, 0.0], size_m: [1.12, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_74", name: "Wall6", category: "Wall", uuid: "801D7635-CD11-49A6-87AD-74F4A7F04725", bbox_min: [-0.335, -1.255, -0.16], bbox_max: [0.335, 1.255, 0.0], size_m: [0.67, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_75", name: "Wall7", category: "Wall", uuid: "C02269FF-30FC-40FB-A2E4-D151391863A7", bbox_min: [-0.338, -1.255, -0.16], bbox_max: [0.338, 1.255, 0.0], size_m: [0.677, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_76", name: "Wall8", category: "Wall", uuid: "05CA194C-0928-44FE-A23A-76558AD75F90", bbox_min: [-0.266, -1.255, -0.16], bbox_max: [0.426, 1.255, 0.0], size_m: [0.691, 2.509, 0.16]});
CREATE (:SpatialObject:Wall {id: "obj_77", name: "Wall9", category: "Wall", uuid: "82C2B744-9EB1-4FE5-95DA-C00226DD4D88", bbox_min: [-0.115, -1.255, -0.16], bbox_max: [0.275, 1.255, 0.0], size_m: [0.39, 2.509, 0.16]});

// --- Relationships ---
MATCH (r {id: "room_1"}), (o {id: "obj_2"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_3"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_4"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_5"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_6"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_7"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_8"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_9"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_10"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_11"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_12"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_13"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_14"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_15"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_16"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_17"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_18"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_19"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_20"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_21"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_22"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_23"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_24"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_25"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_26"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_27"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_1"}), (o {id: "obj_28"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_30"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_31"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_32"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_33"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_34"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_35"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_36"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_37"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_38"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_39"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_40"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_41"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_42"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_43"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_44"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_45"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_46"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_47"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_48"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_49"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_50"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_29"}), (o {id: "obj_51"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_53"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_54"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_55"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_56"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_57"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_58"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_59"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_60"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_61"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_62"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_63"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_64"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_65"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_66"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_67"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_68"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_69"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_70"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_71"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_72"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_73"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_74"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_75"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_76"}) CREATE (r)-[:CONTAINS]->(o);
MATCH (r {id: "room_52"}), (o {id: "obj_77"}) CREATE (r)-[:CONTAINS]->(o);

// --- Room Connectivity ---
// room_52 -> Open Plan Kitchen/Living via open
// room_52 -> Secondary Bedroom via door
// room_52 -> Bathroom via door
// room_52 -> Bedroom via door
// Bathroom -> Walk-in Closet via door
// Walk-in Closet -> Bedroom via open

// --- Explicit Room Adjacency (from floor plans) ---
// Hallway opens into Open Plan
MATCH (a:Room {id: "room_3"}), (b:Room {id: "room_1"}) CREATE (a)-[:ADJACENT_TO {connection: "open"}]->(b);
// Hallway door to Secondary Bedroom
MATCH (a:Room {id: "room_3"}), (b:Room {id: "room_4"}) CREATE (a)-[:ADJACENT_TO {connection: "door"}]->(b);
// Hallway door to Primary Bedroom Wing
MATCH (a:Room {id: "room_3"}), (b:Room {id: "room_2"}) CREATE (a)-[:ADJACENT_TO {connection: "door"}]->(b);

// --- Lights ---
CREATE (:Light {id: "light_hall_1", name: "Hallway Entry Light", position_cm: [65.0, 55.0], state: "off"});
MATCH (r:Room {id: "room_3"}), (l:Light {id: "light_hall_1"}) CREATE (r)-[:HAS_LIGHT]->(l);
CREATE (:Light {id: "light_hall_2", name: "Hallway Front Light", position_cm: [105.0, 65.0], state: "off"});
MATCH (r:Room {id: "room_3"}), (l:Light {id: "light_hall_2"}) CREATE (r)-[:HAS_LIGHT]->(l);
CREATE (:Light {id: "light_hall_3", name: "Hallway Rear Light", position_cm: [140.0, 52.5], state: "off"});
MATCH (r:Room {id: "room_3"}), (l:Light {id: "light_hall_3"}) CREATE (r)-[:HAS_LIGHT]->(l);