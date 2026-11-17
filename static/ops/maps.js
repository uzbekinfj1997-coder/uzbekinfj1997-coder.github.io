/* Memory Ops: the maps. Each map is described as buildings (rectangles of wall with doors and windows), crates,
   trees, the player's start, where bots start, and 15 numbered places: the map is also a Memory Palace route.
   palaces() works without the 3D engine (Memory Palace and the other games use it); build() needs world.js. */
"use strict";
const OpsMaps = (() => {
  const FLOOR = 2, WALL = 5;                // people stand at y = 2; walls are 5 blocks high

  const MAPS = [
    { id: "dust", name: "Dust", about: "A sun-baked desert town: narrow lanes, a domed hall, crates and a helipad.",
      size: [48, 36], mats: { ground: "SANDSTONE", wall: "SANDSTONE", wall2: "STONE_BRICKS", roof: null, crate: "CRATE", low: "CRATE" },
      sun: 0.15, colours: ["#e2b26a", "#c9a46a", "#ffd9a0"],
      rooms: [
        { r: [4, 4, 13, 12], doors: [[8, 12], [13, 7]], windows: [[4, 8], [10, 4]], mat: "wall2" },
        { r: [20, 12, 30, 22], doors: [[20, 17], [30, 15], [25, 22], [25, 12]], windows: [[22, 12], [28, 22]], roof: "CONCRETE" },
        { r: [34, 4, 44, 12], doors: [[39, 12], [34, 8]], windows: [[44, 6]] },
        { r: [8, 24, 16, 31], doors: [[12, 24], [16, 28]], windows: [[8, 27]], mat: "wall2" },
        { r: [34, 24, 44, 32], doors: [[34, 28], [39, 24]], windows: [[44, 29], [37, 32]] },
      ],
      walls: [[17, 1, 17, 8, "wall"], [17, 27, 17, 34, "wall"], [31, 26, 31, 34, "wall2"], [1, 20, 6, 20, "wall"]],
      crates: [[19, 30, 2, 2, 2], [26, 28, 2, 1, 1], [5, 16, 1, 1, 2], [40, 18, 2, 2, 1], [14, 15, 1, 2, 1], [28, 6, 2, 2, 2], [9, 19, 1, 1, 1], [36, 20, 1, 1, 2]],
      trees: [[22, 7], [24, 4]],
      start: [3.5, 33.5], enemies: [[45, 2], [42, 17], [27, 5], [45, 22]],
      spots: [[3, 26, "🚪", "Blue door"], [12, 28, "🏺", "Pottery shop"], [21, 32, "🛢️", "Oil barrels"], [27, 31, "🚚", "Truck"],
              [32, 24, "📦", "Crate stack"], [39, 28, "🎪", "Market tent"], [46, 34, "🛰️", "Satellite dish"], [45, 19, "⛲", "Well"],
              [39, 8, "🗼", "Watchtower"], [45, 2, "🚁", "Helipad"], [25, 17, "🕌", "Dome"], [21, 6, "🌴", "Palm courtyard"],
              [8, 8, "🐫", "Camel stall"], [3, 16, "🧱", "Broken wall"], [13, 19, "🏮", "Lantern alley"]] },

    { id: "office", name: "Office", about: "A glass-roofed office: reception, desks, a server room and a vault.",
      size: [48, 36], mats: { ground: "PLANKS", wall: "CONCRETE", wall2: "GLASS", roof: "GLASS", crate: "METAL", low: "PLANKS" },
      sun: 0.2, colours: ["#9aa3ad", "#c8c8d0", "#bcd4ea"], roofAll: "GLASS",
      rooms: [
        { r: [1, 26, 16, 34], doors: [[16, 30], [8, 26]], windows: [] },
        { r: [18, 26, 30, 34], doors: [[24, 26], [18, 31]], mat: "wall2" },
        { r: [32, 24, 46, 34], doors: [[32, 29], [39, 24]], windows: [] },
        { r: [1, 1, 12, 10], doors: [[12, 5], [6, 10]], mat: "wall2" },
        { r: [14, 1, 24, 8], doors: [[19, 8]], windows: [] },
        { r: [36, 1, 46, 11], doors: [[36, 6], [41, 11]], windows: [] },
      ],
      walls: [[26, 1, 26, 6, "wall"], [1, 18, 8, 18, "wall2"], [40, 16, 46, 16, "wall2"]],
      crates: [[18, 14, 4, 1, 1], [18, 18, 4, 1, 1], [26, 14, 4, 1, 1], [26, 18, 4, 1, 1], [34, 14, 1, 4, 1], [10, 13, 2, 1, 1],
               [42, 4, 1, 1, 3], [44, 4, 1, 1, 3], [4, 30, 3, 1, 1], [36, 30, 1, 1, 2]],
      start: [3.5, 22.5], enemies: [[44, 2], [44, 20], [28, 3], [24, 32]],
      spots: [[4, 32, "🛎️", "Reception"], [12, 29, "🌿", "Plant"], [22, 29, "☕", "Coffee machine"], [28, 32, "🖨️", "Printer"],
              [35, 32, "🛋️", "Lounge sofa"], [44, 27, "🚻", "Restrooms"], [44, 21, "🧯", "Fire extinguisher"], [37, 17, "📊", "Chart board"],
              [30, 12, "💻", "Laptop desk"], [41, 3, "🖥️", "Server room"], [32, 3, "🗄️", "Filing cabinet"], [19, 4, "🔐", "Vault"],
              [14, 12, "🏓", "Ping-pong table"], [6, 5, "🗃️", "Archive"], [4, 14, "📠", "Fax corner"]] },

    { id: "campus", name: "Campus", about: "A university campus: library, labs, a hall, a sports field and the bell tower.",
      size: [48, 36], mats: { ground: "GRASS", wall: "BRICKS", wall2: "STONE_BRICKS", roof: null, crate: "CRATE", low: "PLANKS", path: "STONE_BRICKS" },
      sun: 0.18, colours: ["#6a8f4e", "#c8a46a", "#9fd0ff"],
      rooms: [
        { r: [3, 3, 14, 11], doors: [[8, 11], [14, 6]], windows: [[3, 6], [10, 3]], roof: "CONCRETE" },
        { r: [20, 2, 30, 9], doors: [[25, 9]], windows: [[22, 2], [28, 2]], mat: "wall2", roof: "CONCRETE" },
        { r: [35, 3, 45, 12], doors: [[35, 8], [40, 12]], windows: [[45, 6]], roof: "CONCRETE" },
        { r: [3, 24, 12, 32], doors: [[12, 28], [7, 24]], windows: [[3, 28]], roof: "CONCRETE" },
        { r: [17, 25, 29, 33], doors: [[23, 25], [29, 30]], windows: [[17, 29], [26, 33]], mat: "wall2", roof: "CONCRETE" },
        { r: [42, 28, 45, 31], doors: [[42, 30]], windows: [] },
      ],
      walls: [],
      crates: [[33, 18, 1, 1, 1], [36, 22, 1, 1, 1], [16, 16, 2, 1, 1]],
      paths: [[1, 15, 46, 17], [23, 9, 25, 25], [8, 11, 9, 24], [40, 12, 41, 28]],
      trees: [[17, 12], [31, 13], [19, 20], [6, 19], [32, 30], [46, 22], [14, 21], [28, 20]],
      start: [13.5, 34.5], enemies: [[45, 14], [5, 14], [40, 2], [25, 12]],
      spots: [[24, 13, "🎓", "Gate"], [19, 16, "🚲", "Bike rack"], [8, 7, "📚", "Library"], [10, 14, "🔬", "Lab garden"],
              [3, 20, "🏀", "Court"], [7, 28, "🍔", "Canteen"], [23, 29, "🎭", "Theatre"], [32, 27, "🌳", "Big oak"],
              [36, 20, "⛲", "Fountain"], [40, 7, "🏛️", "Main hall"], [25, 5, "🎹", "Music room"], [30, 15, "🧪", "Chem lab"],
              [44, 25, "🖼️", "Gallery"], [44, 33, "⚽", "Field"], [44, 30, "🔔", "Bell tower"]] },
  ];

  // a map as a Memory Palace route: the places, laid out as on the map (100 x 70 units)
  function palaces() {
    return MAPS.map((m) => ({
      id: `ops-${m.id}`, source: "ops", world: m.id, name: `Ops ${m.name}`, theme: "world", colours: m.colours,
      about: `The 15 places of the ${m.name} map in Memory Ops.`,
      loci: m.spots.map(([x, z, emoji, name], i) => ({ n: i + 1, emoji, name, x: 8 + (x / m.size[0]) * 84, y: 6 + (z / m.size[1]) * 58 })),
    }));
  }

  // ---------- building a map into a block world (world.js) ----------
  function build(m) {
    const BC = BlockCraft, B = BC.B, [W, D] = m.size, mat = (k) => B[m.mats[k] || k] ?? B.STONE;
    const w = BC.emptyWorld(Math.max(W, D), 16, 0);
    const put = (x, y, z, id) => { if (x >= 0 && z >= 0 && x < W && z < D) BC.set(w, x, y, z, id); };
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { put(x, 0, z, B.BEDROCK); put(x, 1, z, mat("ground")); }
    for (const [x0, z0, x1, z1] of m.paths || []) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) put(x, 1, z, mat("path"));
    const wallLine = (x0, z0, x1, z1, id, h = WALL) => {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let y = FLOOR; y < FLOOR + h; y++) put(x, y, z, id);
    };
    // the outer wall
    wallLine(0, 0, W - 1, 0, mat("wall")); wallLine(0, D - 1, W - 1, D - 1, mat("wall"));
    wallLine(0, 0, 0, D - 1, mat("wall")); wallLine(W - 1, 0, W - 1, D - 1, mat("wall"));
    for (const [x0, z0, x1, z1, k] of m.walls || []) wallLine(x0, z0, x1, z1, mat(k));
    for (const room of m.rooms) {
      const [x0, z0, x1, z1] = room.r, id = mat(room.mat || "wall");
      wallLine(x0, z0, x1, z0, id); wallLine(x0, z1, x1, z1, id); wallLine(x0, z0, x0, z1, id); wallLine(x1, z0, x1, z1, id);
      for (const [x, z] of room.doors || []) for (let y = FLOOR; y < FLOOR + 3; y++) {     // doors 3 high, 2 wide
        put(x, y, z, B.AIR);
        if (x === x0 || x === x1) put(x, y, z + 1, B.AIR); else put(x + 1, y, z, B.AIR);
      }
      for (const [x, z] of room.windows || []) put(x, FLOOR + 1, z, B.GLASS);
      const roof = room.roof || m.mats.roof;
      if (roof && !m.roofAll) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) put(x, FLOOR + WALL, z, B[roof]);
    }
    if (m.roofAll) for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) put(x, FLOOR + WALL, z, B[m.roofAll]);
    for (const [x, z, sx, sz, h] of m.crates || []) for (let i = 0; i < sx; i++) for (let k = 0; k < sz; k++)
      for (let y = 0; y < h; y++) put(x + i, FLOOR + y, z + k, h === 1 ? mat("low") : mat("crate"));
    for (const [x, z] of m.trees || []) {
      for (let y = FLOOR; y < FLOOR + 4; y++) put(x, y, z, B.WOOD);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 5; dy++)
        if (Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - 4) <= 3 && !(dx === 0 && dz === 0 && dy < 4)) put(x + dx, FLOOR + dy, z + dz, B.LEAVES);
    }
    // the places stay clear to stand on
    for (const [x, z] of m.spots) for (let y = FLOOR; y < FLOOR + 2; y++) put(x, y, z, B.AIR);
    w.edits = {};
    return w;
  }
  // the cells a body can stand in, for finding a way (bots) and for checking a map
  function walkGrid(w) {
    const g = new Uint8Array(w.size * w.size);
    for (let x = 0; x < w.size; x++) for (let z = 0; z < w.size; z++)
      g[x * w.size + z] = !BlockCraft.blocked(w, x, FLOOR, z) && !BlockCraft.blocked(w, x, FLOOR + 1, z) ? 1 : 0;
    return g;
  }
  const byId = (id) => MAPS.find((m) => m.id === id);
  return { FLOOR, MAPS, byId, palaces, build, walkGrid };
})();
window.OpsMaps = OpsMaps;
