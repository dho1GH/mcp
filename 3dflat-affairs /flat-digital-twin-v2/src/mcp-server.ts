/**
 * Flat Digital Twin — MCP Server
 * 
 * Exposes spatial reasoning tools over the graph data.
 * Deploy as a Cloudflare Worker or run standalone.
 * 
 * Tools:
 *   - get_room_info: Returns dimensions, objects, and connections for a room
 *   - get_distance: Euclidean distance between two objects
 *   - get_adjacency: Which rooms connect and how
 *   - get_objects_by_type: Find all objects of a given type across the flat
 *   - get_room_dimensions: Wall lengths, floor area, ceiling height
 *   - get_light_state: Current lighting state for a room or the whole flat
 *   - set_light_state: Toggle a light on/off
 *   - spatial_query: Natural language spatial question (routed to graph)
 */

import graphData from "../spatial_graph.json";

// ============================================================================
// Types
// ============================================================================

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

interface SpatialGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================================================
// In-Memory Graph Engine (replaces Neo4j for V1, same query patterns)
// ============================================================================

class FlatGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edgesFrom: Map<string, GraphEdge[]> = new Map();
  private edgesTo: Map<string, GraphEdge[]> = new Map();
  private lightStates: Map<string, boolean> = new Map();

  constructor(data: SpatialGraph) {
    for (const n of data.nodes) {
      this.nodes.set(n.id, n);
    }
    for (const e of data.edges) {
      if (!this.edgesFrom.has(e.from)) this.edgesFrom.set(e.from, []);
      this.edgesFrom.get(e.from)!.push(e);
      if (!this.edgesTo.has(e.to)) this.edgesTo.set(e.to, []);
      this.edgesTo.get(e.to)!.push(e);
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getRooms(): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.label === "Room");
  }

  getRoomByName(name: string): GraphNode | undefined {
    const lower = name.toLowerCase();
    return this.getRooms().find(r => 
      r.properties.name.toLowerCase().includes(lower) ||
      r.properties.scan_id.toLowerCase().includes(lower)
    );
  }

  getContainedObjects(roomId: string): GraphNode[] {
    const edges = this.edgesFrom.get(roomId) || [];
    return edges
      .filter(e => e.type === "CONTAINS")
      .map(e => this.nodes.get(e.to)!)
      .filter(Boolean);
  }

  getObjectsByType(type: string): { room: GraphNode; object: GraphNode }[] {
    const results: { room: GraphNode; object: GraphNode }[] = [];
    const lower = type.toLowerCase();
    
    for (const room of this.getRooms()) {
      for (const obj of this.getContainedObjects(room.id)) {
        if (obj.label.toLowerCase() === lower || 
            obj.properties.category?.toLowerCase() === lower ||
            obj.properties.name?.toLowerCase().includes(lower)) {
          results.push({ room, object: obj });
        }
      }
    }
    return results;
  }

  getAdjacentRooms(roomId: string): { room: GraphNode; connection: string }[] {
    const results: { room: GraphNode; connection: string }[] = [];
    const outEdges = (this.edgesFrom.get(roomId) || [])
      .filter(e => e.type === "ADJACENT_TO" || e.type === "CONNECTS_TO");
    const inEdges = (this.edgesTo.get(roomId) || [])
      .filter(e => e.type === "ADJACENT_TO" || e.type === "CONNECTS_TO");
    
    for (const e of outEdges) {
      const node = this.nodes.get(e.to);
      if (node) results.push({ room: node, connection: e.properties?.connection || "unknown" });
    }
    for (const e of inEdges) {
      const node = this.nodes.get(e.from);
      if (node) results.push({ room: node, connection: e.properties?.connection || "unknown" });
    }
    return results;
  }

  computeDistance(objId1: string, objId2: string): number | null {
    const o1 = this.nodes.get(objId1);
    const o2 = this.nodes.get(objId2);
    if (!o1?.properties.bbox_m || !o2?.properties.bbox_m) return null;

    const c1 = o1.properties.bbox_m.min.map((v: number, i: number) => 
      (v + o1.properties.bbox_m.max[i]) / 2
    );
    const c2 = o2.properties.bbox_m.min.map((v: number, i: number) => 
      (v + o2.properties.bbox_m.max[i]) / 2
    );

    return Math.sqrt(
      c1.reduce((sum: number, v: number, i: number) => sum + (v - c2[i]) ** 2, 0)
    );
  }

  findObjectByName(name: string): GraphNode | undefined {
    const lower = name.toLowerCase();
    return Array.from(this.nodes.values()).find(n =>
      n.label !== "Room" &&
      (n.properties.name?.toLowerCase().includes(lower) ||
       n.label.toLowerCase() === lower)
    );
  }

  getLightState(lightId: string): boolean {
    return this.lightStates.get(lightId) ?? false;
  }

  setLightState(lightId: string, on: boolean): void {
    this.lightStates.set(lightId, on);
  }

  getAllLights(): { id: string; name: string; room: string; state: boolean }[] {
    const lights: { id: string; name: string; room: string; state: boolean }[] = [];
    for (const room of this.getRooms()) {
      for (const obj of this.getContainedObjects(room.id)) {
        if (obj.label === "Light") {
          lights.push({
            id: obj.id,
            name: obj.properties.name,
            room: room.properties.name,
            state: this.getLightState(obj.id)
          });
        }
      }
    }
    return lights;
  }

  getRoomDimensions(roomId: string): Record<string, any> | null {
    const objects = this.getContainedObjects(roomId);
    const floors = objects.filter(o => o.label === "Floor");
    const walls = objects.filter(o => o.label === "Wall");
    
    if (floors.length === 0) return null;

    const floor = floors[0];
    const bbox = floor.properties.bbox_m;
    if (!bbox) return null;

    return {
      floor_extent_m: {
        width: bbox.size_m[0],
        depth: bbox.size_m[1],
        approximate_area_sqm: Math.round(bbox.size_m[0] * bbox.size_m[1] * 100) / 100
      },
      wall_count: walls.length,
      walls: walls.map(w => ({
        name: w.properties.name,
        width_m: w.properties.bbox_m?.size_m?.[0],
        height_m: w.properties.bbox_m?.size_m?.[1]
      })),
      ceiling_height_m: walls[0]?.properties.bbox_m?.size_m?.[1] ?? 2.5
    };
  }
}

// ============================================================================
// MCP Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: "get_room_info",
    description: "Get full information about a room: dimensions, contained objects, connected rooms, and lighting.",
    inputSchema: {
      type: "object",
      properties: {
        room_name: { type: "string", description: "Room name or partial match (e.g. 'bedroom', 'kitchen', 'hallway')" }
      },
      required: ["room_name"]
    }
  },
  {
    name: "get_distance",
    description: "Calculate the distance between two objects or features in the flat.",
    inputSchema: {
      type: "object",
      properties: {
        object_1: { type: "string", description: "First object name (e.g. 'Sofa', 'Television', 'Bed')" },
        object_2: { type: "string", description: "Second object name" }
      },
      required: ["object_1", "object_2"]
    }
  },
  {
    name: "get_adjacency",
    description: "Find which rooms are adjacent to a given room and how they connect (door, open plan, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        room_name: { type: "string", description: "Room name" }
      },
      required: ["room_name"]
    }
  },
  {
    name: "get_objects_by_type",
    description: "Find all objects of a given type across the entire flat (e.g. all doors, all windows, all storage units).",
    inputSchema: {
      type: "object",
      properties: {
        object_type: { type: "string", description: "Object type: Wall, Door, Window, Chair, Table, Sofa, Bed, Sink, Oven, Storage, Television, Toilet" }
      },
      required: ["object_type"]
    }
  },
  {
    name: "get_room_dimensions",
    description: "Get the floor area, wall measurements, and ceiling height for a specific room.",
    inputSchema: {
      type: "object",
      properties: {
        room_name: { type: "string", description: "Room name" }
      },
      required: ["room_name"]
    }
  },
  {
    name: "get_light_state",
    description: "Check the current on/off state of lights in a room or the whole flat.",
    inputSchema: {
      type: "object",
      properties: {
        room_name: { type: "string", description: "Room name, or 'all' for the entire flat" }
      },
      required: ["room_name"]
    }
  },
  {
    name: "set_light_state",
    description: "Turn a specific light on or off.",
    inputSchema: {
      type: "object",
      properties: {
        light_id: { type: "string", description: "The light ID" },
        state: { type: "boolean", description: "true = on, false = off" }
      },
      required: ["light_id", "state"]
    }
  },
  {
    name: "get_flat_overview",
    description: "Get a high-level overview of the entire flat: all rooms, total object counts, and connectivity map.",
    inputSchema: { type: "object", properties: {} }
  }
];

// ============================================================================
// Tool Handlers
// ============================================================================

function handleTool(graph: FlatGraph, toolName: string, args: Record<string, any>): any {
  switch (toolName) {
    case "get_room_info": {
      const room = graph.getRoomByName(args.room_name);
      if (!room) return { error: `Room "${args.room_name}" not found. Available: ${graph.getRooms().map(r => r.properties.name).join(", ")}` };
      
      const objects = graph.getContainedObjects(room.id);
      const adjacent = graph.getAdjacentRooms(room.id);
      const dims = graph.getRoomDimensions(room.id);

      return {
        room: room.properties,
        dimensions: dims,
        objects: objects.map(o => ({
          id: o.id,
          type: o.label,
          name: o.properties.name,
          size_m: o.properties.bbox_m?.size_m
        })),
        object_summary: Object.entries(
          objects.reduce((acc: Record<string, number>, o) => {
            acc[o.label] = (acc[o.label] || 0) + 1;
            return acc;
          }, {})
        ).map(([type, count]) => `${count} ${type}(s)`).join(", "),
        connected_rooms: adjacent.map(a => ({
          name: a.room.properties.name,
          connection: a.connection
        }))
      };
    }

    case "get_distance": {
      const o1 = graph.findObjectByName(args.object_1);
      const o2 = graph.findObjectByName(args.object_2);
      if (!o1) return { error: `Object "${args.object_1}" not found` };
      if (!o2) return { error: `Object "${args.object_2}" not found` };
      
      const dist = graph.computeDistance(o1.id, o2.id);
      if (dist === null) return { error: "Cannot compute distance — missing coordinate data for one or both objects" };
      
      return {
        object_1: { id: o1.id, name: o1.properties.name, type: o1.label },
        object_2: { id: o2.id, name: o2.properties.name, type: o2.label },
        distance_m: Math.round(dist * 1000) / 1000,
        note: "Distance is center-to-center based on USDZ mesh bounding boxes. Objects within the same scan share a coordinate system; cross-scan distances are approximate."
      };
    }

    case "get_adjacency": {
      const room = graph.getRoomByName(args.room_name);
      if (!room) return { error: `Room "${args.room_name}" not found` };
      return {
        room: room.properties.name,
        adjacent: graph.getAdjacentRooms(room.id).map(a => ({
          room: a.room.properties.name,
          connection_type: a.connection
        }))
      };
    }

    case "get_objects_by_type": {
      const results = graph.getObjectsByType(args.object_type);
      return {
        type: args.object_type,
        count: results.length,
        instances: results.map(r => ({
          id: r.object.id,
          name: r.object.properties.name,
          room: r.room.properties.name,
          size_m: r.object.properties.bbox_m?.size_m
        }))
      };
    }

    case "get_room_dimensions": {
      const room = graph.getRoomByName(args.room_name);
      if (!room) return { error: `Room "${args.room_name}" not found` };
      const dims = graph.getRoomDimensions(room.id);
      if (!dims) return { error: "No dimension data available for this room" };
      return { room: room.properties.name, ...dims };
    }

    case "get_light_state": {
      if (args.room_name === "all") {
        return { lights: graph.getAllLights() };
      }
      const room = graph.getRoomByName(args.room_name);
      if (!room) return { error: `Room "${args.room_name}" not found` };
      const lights = graph.getAllLights().filter(l => l.room === room.properties.name);
      return { room: room.properties.name, lights };
    }

    case "set_light_state": {
      graph.setLightState(args.light_id, args.state);
      return { light_id: args.light_id, state: args.state ? "on" : "off" };
    }

    case "get_flat_overview": {
      const rooms = graph.getRooms();
      return {
        flat_name: "Digital Twin",
        room_count: rooms.length,
        rooms: rooms.map(r => {
          const objects = graph.getContainedObjects(r.id);
          const adjacent = graph.getAdjacentRooms(r.id);
          return {
            name: r.properties.name,
            object_count: objects.length,
            connected_to: adjacent.map(a => a.room.properties.name)
          };
        }),
        total_objects: Array.from(new Set(
          rooms.flatMap(r => graph.getContainedObjects(r.id).map(o => o.id))
        )).length
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// Export for Worker / standalone
// ============================================================================

export { FlatGraph, TOOLS, handleTool };
export type { SpatialGraph };
