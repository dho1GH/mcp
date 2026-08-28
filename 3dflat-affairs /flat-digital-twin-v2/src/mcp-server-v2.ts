/**
 * Flat Digital Twin — MCP Server v2
 * 
 * Aligned with home_graph_seed.cypher schema:
 *   Rooms use codes: Core, Alpha, Throne, Beta, Splash, Pass, Chaos, Beta_Walkin
 *   Spatial references use clock system: 6pm=north, 9pm=east, 12pm=south, 3pm=west
 *   Wall segments: A-A1, A1-B, B-B1, etc.
 *   
 * Tools:
 *   1. get_room           — Full room info by code or name
 *   2. get_distance        — Distance between two points/objects  
 *   3. get_neighbors       — Adjacent rooms and connection types
 *   4. get_wall_segments   — Wall measurements for a room
 *   5. get_devices         — Devices in a room
 *   6. get_sensors         — Sensors in a room
 *   7. get_lights          — Light groups and zones
 *   8. get_anchors         — Fixed spatial anchors
 *   9. get_flat_overview   — Full flat summary
 *  10. spatial_query       — Natural language spatial question
 */

import graphDataV2 from "../spatial_graph_v2.json";

type RoomData = typeof graphDataV2.rooms[keyof typeof graphDataV2.rooms];

class FlatGraphV2 {
  private data: typeof graphDataV2;
  private lightStates: Map<string, boolean> = new Map();

  constructor(data: typeof graphDataV2) {
    this.data = data;
  }

  // Resolve room by code, alias, or partial name match
  findRoom(query: string): [string, RoomData] | null {
    const q = query.toLowerCase().trim();
    for (const [id, room] of Object.entries(this.data.rooms)) {
      if (
        room.code?.toLowerCase() === q ||
        room.name?.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        room.aliases?.some((a: string) => a.toLowerCase().includes(q))
      ) {
        return [id, room as RoomData];
      }
    }
    return null;
  }

  getRoomList(): string[] {
    return Object.values(this.data.rooms).map((r: any) => `${r.code} — ${r.name}`);
  }

  getNeighbors(roomId: string): any[] {
    return this.data.adjacency
      .filter(e => e.from === roomId || e.to === roomId)
      .map(e => {
        const otherId = e.from === roomId ? e.to : e.from;
        const other = (this.data.rooms as any)[otherId];
        return {
          room_id: otherId,
          room_code: other?.code || otherId,
          room_name: other?.name || otherId,
          connection_type: e.type,
          notes: e.notes || e.via || null
        };
      });
  }

  // Compute 2D distance between two named points in Core room vertices
  computeDistance(pointA: string, pointB: string): number | null {
    const room = (this.data.rooms as any)["room.open_plan"];
    if (!room?.vertices_cm) return null;
    
    const vA = room.vertices_cm.find((v: any) => v.label.toLowerCase() === pointA.toLowerCase());
    const vB = room.vertices_cm.find((v: any) => v.label.toLowerCase() === pointB.toLowerCase());
    if (!vA || !vB) return null;
    
    return Math.sqrt((vA.x - vB.x) ** 2 + (vA.y - vB.y) ** 2);
  }

  getOverview(): any {
    const rooms = Object.entries(this.data.rooms).map(([id, r]: [string, any]) => ({
      id,
      code: r.code,
      name: r.name,
      kind: r.kind,
      area: r.area_sqft ? `${r.area_sqft} ft²` : null,
      device_count: r.devices?.length || 0,
      sensor_count: r.sensors?.length || 0,
      neighbors: this.getNeighbors(id).map(n => n.room_code)
    }));
    
    return {
      flat_name: "Todd's Flat — Digital Twin",
      schema: this.data.schema,
      room_count: rooms.length,
      rooms,
      adjacency_count: this.data.adjacency.length,
      total_devices: rooms.reduce((s, r) => s + r.device_count, 0),
      total_sensors: rooms.reduce((s, r) => s + r.sensor_count, 0)
    };
  }
}

// ============================================================================
// MCP Tool Definitions
// ============================================================================

const TOOLS_V2 = [
  {
    name: "get_room",
    description: "Get full information about a room by its code name (Core, Alpha, Throne, Beta, Splash, Pass, Chaos) or any alias. Returns dimensions, devices, sensors, lights, wall segments, anchors, and connections.",
    inputSchema: {
      type: "object",
      properties: {
        room: { type: "string", description: "Room code (Core/Alpha/Throne/Beta/Splash/Pass/Chaos) or name" }
      },
      required: ["room"]
    }
  },
  {
    name: "get_neighbors",
    description: "Find which rooms are adjacent to a given room and how they connect (door, open threshold, via walk-in, etc.).",
    inputSchema: {
      type: "object",
      properties: { room: { type: "string", description: "Room code or name" } },
      required: ["room"]
    }
  },
  {
    name: "get_wall_segments",
    description: "Get wall measurements for a room. For Core (Open Plan), returns all segments with clock references and descriptions.",
    inputSchema: {
      type: "object",
      properties: { room: { type: "string", description: "Room code or name" } },
      required: ["room"]
    }
  },
  {
    name: "get_devices",
    description: "List all devices (lights, TVs, AC, curtains, etc.) in a given room.",
    inputSchema: {
      type: "object",
      properties: { room: { type: "string", description: "Room code or name" } },
      required: ["room"]
    }
  },
  {
    name: "get_sensors",
    description: "List all sensors (presence, motion, door contacts, sleep mat) in a given room.",
    inputSchema: {
      type: "object",
      properties: { room: { type: "string", description: "Room code or name" } },
      required: ["room"]
    }
  },
  {
    name: "get_lights",
    description: "Get lighting information for a room: individual lights, groups, zones (Path/Living/Kitchen for Core), and current state.",
    inputSchema: {
      type: "object",
      properties: { room: { type: "string", description: "Room code or name, or 'all' for whole flat" } },
      required: ["room"]
    }
  },
  {
    name: "get_anchors",
    description: "Get fixed spatial anchors for a room (balcony door, kitchen run, radiators, window stretch, etc.).",
    inputSchema: {
      type: "object",
      properties: { room: { type: "string", description: "Room code or name" } },
      required: ["room"]
    }
  },
  {
    name: "get_distance",
    description: "Calculate distance between two named wall vertices in the Open Plan room (e.g. A to B, A1 to D). Returns distance in cm.",
    inputSchema: {
      type: "object",
      properties: {
        point_a: { type: "string", description: "First vertex label (A, A1, B, B1, B2, B3, C, C1, C2, D)" },
        point_b: { type: "string", description: "Second vertex label" }
      },
      required: ["point_a", "point_b"]
    }
  },
  {
    name: "get_flat_overview",
    description: "Get a high-level overview of the entire flat: all rooms, total device/sensor counts, and connectivity map.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "spatial_query",
    description: "Answer a natural language spatial question about the flat, like 'what rooms can I reach from the hallway?' or 'which wall has the balcony door?'",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Natural language spatial question" }
      },
      required: ["question"]
    }
  }
];

// ============================================================================
// Tool Handler
// ============================================================================

function handleToolV2(graph: FlatGraphV2, toolName: string, args: Record<string, any>): any {
  switch (toolName) {
    case "get_room": {
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found. Available: ${graph.getRoomList().join(", ")}` };
      const [id, room] = result;
      return { room_id: id, ...room, neighbors: graph.getNeighbors(id) };
    }

    case "get_neighbors": {
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found` };
      return { room: result[1].name, neighbors: graph.getNeighbors(result[0]) };
    }

    case "get_wall_segments": {
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found` };
      const room = result[1] as any;
      if (!room.walls) return { room: room.name, walls: "No wall segment data available for this room" };
      return { room: room.name, walls: room.walls };
    }

    case "get_devices": {
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found` };
      return { room: result[1].name, devices: (result[1] as any).devices || [] };
    }

    case "get_sensors": {
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found` };
      return { room: result[1].name, sensors: (result[1] as any).sensors || [] };
    }

    case "get_lights": {
      if (args.room === "all") {
        const allLights: any = {};
        for (const [id, room] of Object.entries(graphDataV2.rooms)) {
          if ((room as any).lights) allLights[(room as any).code || id] = (room as any).lights;
        }
        return { lights_by_room: allLights };
      }
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found` };
      return { room: result[1].name, lights: (result[1] as any).lights || {} };
    }

    case "get_anchors": {
      const result = graph.findRoom(args.room);
      if (!result) return { error: `Room "${args.room}" not found` };
      return { room: result[1].name, anchors: (result[1] as any).anchors || [] };
    }

    case "get_distance": {
      const dist = graph.computeDistance(args.point_a, args.point_b);
      if (dist === null) return { error: `Could not compute distance. Valid vertices: A, A1, B, B1, B2, B3, C, C1, C2, D` };
      return {
        from: args.point_a, to: args.point_b,
        distance_cm: Math.round(dist),
        distance_m: Math.round(dist) / 100
      };
    }

    case "get_flat_overview":
      return graph.getOverview();

    case "spatial_query": {
      // Route to appropriate tool based on question content
      const q = args.question.toLowerCase();
      if (q.includes("neighbor") || q.includes("adjacent") || q.includes("reach") || q.includes("connect")) {
        // Extract room name from question
        for (const [id, room] of Object.entries(graphDataV2.rooms)) {
          const r = room as any;
          if (q.includes(r.code?.toLowerCase()) || q.includes(r.name?.toLowerCase())) {
            return handleToolV2(graph, "get_neighbors", { room: r.code });
          }
        }
        return { answer: "The hallway (Pass) connects to all rooms. Specify a room for its neighbors." };
      }
      if (q.includes("wall") || q.includes("segment") || q.includes("balcony") || q.includes("window") || q.includes("kitchen run")) {
        return handleToolV2(graph, "get_wall_segments", { room: "Core" });
      }
      if (q.includes("light") || q.includes("ceiling")) {
        return handleToolV2(graph, "get_lights", { room: "all" });
      }
      if (q.includes("overview") || q.includes("how many") || q.includes("total")) {
        return graph.getOverview();
      }
      return { 
        answer: "I can answer questions about rooms, neighbors, walls, devices, sensors, lights, and distances. Try asking about a specific room by code (Core/Alpha/Beta/etc.) or about spatial features like 'which wall has the balcony door?'"
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

export { FlatGraphV2, TOOLS_V2, handleToolV2 };
