/* Block Craft: blocks, items, the world (terrain, ores, light from torches, doors, ladders, chests, dropped
   items), ray casting and moving bodies. No drawing here (see game.js), so everything can be tested on its own. */
"use strict";
const BlockCraft = (() => {
  const CHUNK = 16, REACH = 5, WATER = 24, ATLAS = 16;      // the texture atlas is 16 x 16 tiles

  // ---------- blocks (ids below 100) and items (100 and up) ----------
  const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, WOOD: 6, LEAVES: 7, PLANKS: 8, GLASS: 9, COBBLE: 10,
              BRICKS: 11, SNOW: 12, BEDROCK: 13, TABLE: 14, FURNACE: 15, SANDSTONE: 16, STONE_BRICKS: 17, CONCRETE: 18,
              CRATE: 19, METAL: 20, COAL_ORE: 21, IRON_ORE: 22, DIAMOND_ORE: 23, CHEST: 24, TORCH: 25, DOOR: 26, BED: 27, LADDER: 28, SIGN: 29 };
  const I = { STICK: 100, CHARCOAL: 101, WOOD_PICK: 102, STONE_PICK: 103, WOOD_AXE: 104, STONE_AXE: 105, WOOD_SHOVEL: 106,
              STONE_SHOVEL: 107, COAL: 108, IRON_INGOT: 109, DIAMOND: 110, IRON_PICK: 111, DIAMOND_PICK: 112, IRON_AXE: 113,
              DIAMOND_AXE: 114, IRON_SHOVEL: 115, DIAMOND_SHOVEL: 116, IRON_HELMET: 117, IRON_CHESTPLATE: 118, IRON_LEGGINGS: 119,
              IRON_BOOTS: 120, DIAMOND_HELMET: 121, DIAMOND_CHESTPLATE: 122, DIAMOND_LEGGINGS: 123, DIAMOND_BOOTS: 124 };
  const BLOCKS = [null];
  const block = (id, o) => { BLOCKS[id] = { id, drop: id, hardness: 1, tool: null, tier: o.needsTool ? 1 : 0, shape: "cube", ...o }; };
  // tiles = [top, side, bottom]; hardness in Minecraft's units (time = hardness x 1.5 s with the right tool);
  // tier: the pickaxe needed (1 wood, 2 stone, 3 iron); shape: how it is drawn when it isn't a full cube
  block(B.GRASS,        { name: "Grass",          tiles: [0, 1, 2],    hardness: 0.6, tool: "shovel", drop: B.DIRT, cat: "nature" });
  block(B.DIRT,         { name: "Dirt",           tiles: [2, 2, 2],    hardness: 0.5, tool: "shovel", cat: "nature" });
  block(B.STONE,        { name: "Stone",          tiles: [3, 3, 3],    hardness: 1.5, tool: "pick", needsTool: true, drop: B.COBBLE, cat: "building" });
  block(B.SAND,         { name: "Sand",           tiles: [4, 4, 4],    hardness: 0.5, tool: "shovel", cat: "nature" });
  block(B.WATER,        { name: "Water",          tiles: [5, 5, 5],    water: true, unbreakable: true, drop: null });
  block(B.WOOD,         { name: "Wood",           tiles: [7, 6, 7],    hardness: 2,   tool: "axe", fuel: 15, cat: "nature" });
  block(B.LEAVES,       { name: "Leaves",         tiles: [8, 8, 8],    hardness: 0.2, seeThrough: true, drop: null, cat: "nature" });
  block(B.PLANKS,       { name: "Planks",         tiles: [9, 9, 9],    hardness: 2,   tool: "axe", fuel: 15, cat: "building" });
  block(B.GLASS,        { name: "Glass",          tiles: [10, 10, 10], hardness: 0.3, seeThrough: true, drop: null, cat: "building" });
  block(B.COBBLE,       { name: "Cobblestone",    tiles: [11, 11, 11], hardness: 2,   tool: "pick", needsTool: true, cat: "building" });
  block(B.BRICKS,       { name: "Bricks",         tiles: [12, 12, 12], hardness: 2,   tool: "pick", needsTool: true, cat: "building" });
  block(B.SNOW,         { name: "Snowy grass",    tiles: [13, 14, 2],  hardness: 0.6, tool: "shovel", drop: B.DIRT, cat: "nature" });
  block(B.BEDROCK,      { name: "Bedrock",        tiles: [15, 15, 15], unbreakable: true, drop: null });
  block(B.TABLE,        { name: "Crafting table", tiles: [17, 18, 9],  hardness: 2.5, tool: "axe", fuel: 15, opens: "table", cat: "useful" });
  block(B.FURNACE,      { name: "Furnace",        tiles: [19, 20, 19], hardness: 3.5, tool: "pick", needsTool: true, opens: "furnace", cat: "useful" });
  block(B.SANDSTONE,    { name: "Sandstone",      tiles: [22, 23, 22], hardness: 0.8, tool: "pick", needsTool: true, cat: "building" });
  block(B.STONE_BRICKS, { name: "Stone bricks",   tiles: [24, 24, 24], hardness: 1.5, tool: "pick", needsTool: true, cat: "building" });
  block(B.CONCRETE,     { name: "Concrete",       tiles: [25, 25, 25], hardness: 1.8, tool: "pick", needsTool: true, cat: "building" });
  block(B.CRATE,        { name: "Crate",          tiles: [26, 26, 26], hardness: 2,   tool: "axe", fuel: 15, cat: "building" });
  block(B.METAL,        { name: "Metal",          tiles: [27, 27, 27], hardness: 5,   tool: "pick", needsTool: true, cat: "building" });
  block(B.COAL_ORE,     { name: "Coal ore",       tiles: [16, 16, 16], hardness: 3,   tool: "pick", needsTool: true, drop: I.COAL, cat: "nature" });
  block(B.IRON_ORE,     { name: "Iron ore",       tiles: [21, 21, 21], hardness: 3,   tool: "pick", needsTool: true, tier: 2, cat: "nature" });
  block(B.DIAMOND_ORE,  { name: "Diamond ore",    tiles: [28, 28, 28], hardness: 3,   tool: "pick", needsTool: true, tier: 3, drop: I.DIAMOND, cat: "nature" });
  block(B.CHEST,        { name: "Chest",          tiles: [29, 30, 29], hardness: 2.5, tool: "axe", fuel: 15, opens: "chest", cat: "useful" });
  block(B.TORCH,        { name: "Torch",          tiles: [32, 32, 32], hardness: 0,   shape: "torch", seeThrough: true, passable: true, light: 14, cat: "useful" });
  block(B.DOOR,         { name: "Door",           tiles: [33, 33, 34], hardness: 3,   tool: "axe", shape: "door", seeThrough: true, fuel: 10, cat: "useful" });
  block(B.BED,          { name: "Bed",            tiles: [35, 36, 9],  hardness: 0.2, shape: "bed", seeThrough: true, cat: "useful" });
  block(B.SIGN,         { name: "Memory sign",    tiles: [38, 39, 9],  hardness: 0.6, tool: "axe", shape: "sign", seeThrough: true, passable: true, opens: "sign", fuel: 5, cat: "useful" });
  block(B.LADDER,       { name: "Ladder",         tiles: [37, 37, 37], hardness: 0.4, tool: "axe", shape: "ladder", seeThrough: true, passable: true, fuel: 5, cat: "useful" });

  const ITEMS = {};
  const item = (id, o) => { ITEMS[id] = { id, stack: 64, cat: "tools", ...o }; };
  const TIERS = { wood: { speed: 2, tier: 1, uses: 59 }, stone: { speed: 4, tier: 2, uses: 131 }, iron: { speed: 6, tier: 3, uses: 250 },
                  diamond: { speed: 8, tier: 4, uses: 1561 } };
  const tool = (kind, t) => ({ kind, ...TIERS[t] });
  item(I.STICK,          { name: "Stick",          tile: 40, fuel: 5, cat: "materials" });
  item(I.CHARCOAL,       { name: "Charcoal",       tile: 41, fuel: 80, cat: "materials" });
  item(I.COAL,           { name: "Coal",           tile: 64, fuel: 80, cat: "materials" });
  item(I.IRON_INGOT,     { name: "Iron ingot",     tile: 65, cat: "materials" });
  item(I.DIAMOND,        { name: "Diamond",        tile: 66, cat: "materials" });
  item(I.WOOD_PICK,      { name: "Wooden pickaxe", tile: 42, stack: 1, tool: tool("pick", "wood"), fuel: 10 });
  item(I.STONE_PICK,     { name: "Stone pickaxe",  tile: 43, stack: 1, tool: tool("pick", "stone") });
  item(I.IRON_PICK,      { name: "Iron pickaxe",   tile: 67, stack: 1, tool: tool("pick", "iron") });
  item(I.DIAMOND_PICK,   { name: "Diamond pickaxe", tile: 68, stack: 1, tool: tool("pick", "diamond") });
  item(I.WOOD_AXE,       { name: "Wooden axe",     tile: 44, stack: 1, tool: tool("axe", "wood"), fuel: 10 });
  item(I.STONE_AXE,      { name: "Stone axe",      tile: 45, stack: 1, tool: tool("axe", "stone") });
  item(I.IRON_AXE,       { name: "Iron axe",       tile: 69, stack: 1, tool: tool("axe", "iron") });
  item(I.DIAMOND_AXE,    { name: "Diamond axe",    tile: 70, stack: 1, tool: tool("axe", "diamond") });
  item(I.WOOD_SHOVEL,    { name: "Wooden shovel",  tile: 46, stack: 1, tool: tool("shovel", "wood"), fuel: 10 });
  item(I.STONE_SHOVEL,   { name: "Stone shovel",   tile: 47, stack: 1, tool: tool("shovel", "stone") });
  item(I.IRON_SHOVEL,    { name: "Iron shovel",    tile: 71, stack: 1, tool: tool("shovel", "iron") });
  item(I.DIAMOND_SHOVEL, { name: "Diamond shovel", tile: 72, stack: 1, tool: tool("shovel", "diamond") });
  // armour: slot 0 head, 1 chest, 2 legs, 3 feet; points as in Minecraft
  item(I.IRON_HELMET,        { name: "Iron helmet",        tile: 73, stack: 1, armor: { slot: 0, points: 2 } });
  item(I.IRON_CHESTPLATE,    { name: "Iron chestplate",    tile: 74, stack: 1, armor: { slot: 1, points: 6 } });
  item(I.IRON_LEGGINGS,      { name: "Iron leggings",      tile: 75, stack: 1, armor: { slot: 2, points: 5 } });
  item(I.IRON_BOOTS,         { name: "Iron boots",         tile: 76, stack: 1, armor: { slot: 3, points: 2 } });
  item(I.DIAMOND_HELMET,     { name: "Diamond helmet",     tile: 77, stack: 1, armor: { slot: 0, points: 3 } });
  item(I.DIAMOND_CHESTPLATE, { name: "Diamond chestplate", tile: 78, stack: 1, armor: { slot: 1, points: 8 } });
  item(I.DIAMOND_LEGGINGS,   { name: "Diamond leggings",   tile: 79, stack: 1, armor: { slot: 2, points: 6 } });
  item(I.DIAMOND_BOOTS,      { name: "Diamond boots",      tile: 80, stack: 1, armor: { slot: 3, points: 3 } });

  const info = (id) => (id < 100 ? BLOCKS[id] : ITEMS[id]) || null;
  const isBlock = (id) => id > 0 && id < 100 && !!BLOCKS[id];
  const placeable = (id) => isBlock(id) && !BLOCKS[id].water && id !== B.BEDROCK;
  const iconTile = (id) => (id < 100 ? (id === B.DOOR ? 33 : BLOCKS[id].tiles[1]) : ITEMS[id].tile);
  const maxStack = (id) => ITEMS[id]?.stack ?? 64;
  const maxUses = (id) => ITEMS[id]?.tool?.uses || 0;
  const solid = (id) => id !== B.AIR && !BLOCKS[id].water;
  const opaque = (id) => solid(id) && !BLOCKS[id].seeThrough;
  const emits = (id) => (id ? BLOCKS[id].light || 0 : 0);
  // what the creative inventory shows, by tab
  const CREATIVE = Object.values(B).filter((id) => id && BLOCKS[id].cat).concat(Object.values(I));
  const category = (id) => info(id).cat || "tools";

  // How long a block takes to break with what is in the hand, and whether it then drops (Minecraft's rule:
  // blocks that need a pickaxe drop nothing without a good enough one, and take much longer)
  function breakTime(id, held) {
    const b = BLOCKS[id];
    if (!b || b.unbreakable) return { time: Infinity, drops: false };
    const t = ITEMS[held]?.tool, right = !!t && t.kind === b.tool;
    const harvest = !b.needsTool || (right && t.tier >= b.tier);
    return { time: b.hardness * (harvest ? 1.5 : 5) / (right ? t.speed : 1), drops: harvest && b.drop !== null, right };
  }

  // ---------- terrain from a seed ----------
  function noise2(seed) {
    const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
    const smooth = (t) => t * t * (3 - 2 * t);
    const value = (x, z) => {
      const x0 = Math.floor(x), z0 = Math.floor(z), fx = smooth(x - x0), fz = smooth(z - z0);
      const a = hash(x0, z0), b = hash(x0 + 1, z0), c = hash(x0, z0 + 1), d = hash(x0 + 1, z0 + 1);
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    };
    return (x, z) => { let v = 0, amp = 0.5, f = 1; for (let o = 0; o < 4; o++) { v += value(x * f, z * f) * amp; amp *= 0.5; f *= 2; } return v / 0.9375; };
  }
  function emptyWorld(size, height, seed = 0) {
    return { seed, size, height, data: new Uint8Array(size * size * height), light: new Uint8Array(size * size * height),
             edits: {}, furnaces: {}, chests: {}, meta: {}, items: [], water: -1 };
  }
  function makeWorld(seed, size = 160, height = 64) {
    const w = emptyWorld(size, height, seed);
    w.water = WATER;
    const n = noise2(seed), n2 = noise2(seed + 17), tops = new Int16Array(size * size);
    for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) {
      const top = Math.max(4, Math.min(height - 12, Math.floor(8 + n(x / 56, z / 56) * 36 + n2(x / 18, z / 18) * 6)));
      tops[x * size + z] = top;
      for (let y = 0; y <= Math.max(top, WATER); y++) {
        let id;
        if (y === 0) id = B.BEDROCK;
        else if (y > top) id = B.WATER;
        else if (y < top - 3) id = B.STONE;
        else if (top <= WATER + 1) id = B.SAND;
        else if (y === top) id = top >= 40 ? B.SNOW : B.GRASS;
        else id = B.DIRT;
        put(w, x, y, z, id);
      }
    }
    let rnd = seed * 9301 + 49297;
    const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
    // ores in the stone: small veins, rarer and deeper for better ones
    for (const [ore, tries, maxY, vein] of [[B.COAL_ORE, 900, 60, 6], [B.IRON_ORE, 600, 40, 4], [B.DIAMOND_ORE, 140, 14, 3]]) {
      for (let k = 0; k < tries; k++) {
        let x = Math.floor(rand() * size), y = 1 + Math.floor(rand() * maxY), z = Math.floor(rand() * size);
        for (let v = 0; v < vein; v++) {
          if (raw(w, x, y, z) === B.STONE) put(w, x, y, z, ore);
          x = Math.max(0, Math.min(size - 1, x + Math.floor(rand() * 3) - 1));
          y = Math.max(1, Math.min(height - 1, y + Math.floor(rand() * 3) - 1));
          z = Math.max(0, Math.min(size - 1, z + Math.floor(rand() * 3) - 1));
        }
      }
    }
    for (let x = 3; x < size - 3; x++) for (let z = 3; z < size - 3; z++) {
      const top = tops[x * size + z];
      if (raw(w, x, top, z) !== B.GRASS || rand() > 0.012) continue;
      const h = 4 + Math.floor(rand() * 3);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = h - 2; dy <= h + 1; dy++) {
        const r = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - h);
        if (r <= (dy > h - 1 ? 2 : 3) && raw(w, x + dx, top + dy, z + dz) === B.AIR) put(w, x + dx, top + dy, z + dz, B.LEAVES);
      }
      for (let y = 1; y <= h; y++) put(w, x, top + y, z, B.WOOD);
    }
    return w;
  }
  const inside = (w, x, y, z) => x >= 0 && z >= 0 && y >= 0 && x < w.size && z < w.size && y < w.height;
  const idx = (w, x, y, z) => (y * w.size + z) * w.size + x;
  const raw = (w, x, y, z) => w.data[idx(w, x, y, z)];
  const put = (w, x, y, z, id) => { w.data[idx(w, x, y, z)] = id; };
  const get = (w, x, y, z) => (inside(w, x, y, z) ? raw(w, x, y, z) : B.AIR);
  const lightAt = (w, x, y, z) => (inside(w, x, y, z) ? w.light[idx(w, x, y, z)] : 0);
  const key = (x, y, z) => `${x},${y},${z}`;
  // Change a block. Returns the area whose light changed (for redrawing), or null.
  function set(w, x, y, z, id, meta) {
    if (!inside(w, x, y, z)) return null;
    const old = raw(w, x, y, z), k = key(x, y, z);
    put(w, x, y, z, id); w.edits[k] = id;
    if (id !== B.FURNACE) delete w.furnaces[k];
    if (id !== B.CHEST) delete w.chests[k];
    if (meta) w.meta[k] = meta; else delete w.meta[k];
    // light: a torch placed or removed, or a block that lets light through (or stops it) near a light
    if (emits(old) || emits(id)) return relight(w, x, z);
    // a block that now stops light, or lets it through: only matters where there is torch light
    if (opaque(old) !== opaque(id)) {
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]])
        if (lightAt(w, x + dx, y + dy, z + dz)) return relight(w, x, z);
    }
    return null;
  }
  function applyEdits(w, edits, meta = {}) {
    for (const [k, id] of Object.entries(edits || {})) { const [x, y, z] = k.split(",").map(Number); if (inside(w, x, y, z)) { put(w, x, y, z, id); w.edits[k] = id; } }
    w.meta = { ...meta };
    relightAll(w);
  }
  function topAt(w, x, z) { for (let y = w.height - 1; y > 0; y--) if (solid(get(w, x, y, z))) return y; return 0; }

  // ---------- light from torches: 14 at the torch, one less per block, stopped by solid blocks ----------
  function spread(w, queue, x0, z0, x1, z1) {
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y, z, l] = queue[qi];
      if (l <= 1) continue;
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (!inside(w, nx, ny, nz) || nx < x0 || nx > x1 || nz < z0 || nz > z1 || opaque(raw(w, nx, ny, nz))) continue;
        const i = idx(w, nx, ny, nz);
        if (w.light[i] >= l - 1) continue;
        w.light[i] = l - 1; queue.push([nx, ny, nz, l - 1]);
      }
    }
  }
  function relight(w, cx, cz) {   // recompute the light around one change; returns the area
    const R = 16, x0 = Math.max(0, cx - R), x1 = Math.min(w.size - 1, cx + R), z0 = Math.max(0, cz - R), z1 = Math.min(w.size - 1, cz + R);
    for (let y = 0; y < w.height; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) w.light[idx(w, x, y, z)] = 0;
    const queue = [];
    for (const [k, id] of Object.entries(w.edits)) {
      if (!emits(id)) continue;
      const [x, y, z] = k.split(",").map(Number);
      if (Math.abs(x - cx) > 2 * R || Math.abs(z - cz) > 2 * R || raw(w, x, y, z) !== id) continue;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) w.light[idx(w, x, y, z)] = Math.max(w.light[idx(w, x, y, z)], emits(id));
      queue.push([x, y, z, emits(id)]);
    }
    // light from torches outside the area reaches in: start their spread without writing outside it
    spread(w, queue, x0, z0, x1, z1);
    return [x0, z0, x1, z1];
  }
  function relightAll(w) {
    w.light.fill(0);
    const queue = [];
    for (const [k, id] of Object.entries(w.edits)) {
      if (!emits(id)) continue;
      const [x, y, z] = k.split(",").map(Number);
      if (raw(w, x, y, z) !== id) continue;
      w.light[idx(w, x, y, z)] = emits(id); queue.push([x, y, z, emits(id)]);
    }
    spread(w, queue, 0, 0, w.size - 1, w.size - 1);
  }

  // ---------- the block looked at: step through the grid cell by cell ----------
  function raycast(w, eye, dir, reach = REACH) {
    let x = Math.floor(eye[0]), y = Math.floor(eye[1]), z = Math.floor(eye[2]);
    const step = dir.map((d) => (d > 0 ? 1 : -1));
    const tDelta = dir.map((d) => (d === 0 ? Infinity : Math.abs(1 / d)));
    const tMax = dir.map((d, i) => { const p = eye[i], c = Math.floor(p); return d === 0 ? Infinity : (d > 0 ? c + 1 - p : p - c) * tDelta[i]; });
    let prev = null, t = 0;
    while (t <= reach) {
      const id = get(w, x, y, z);
      if (id !== B.AIR && !BLOCKS[id].water) return { hit: [x, y, z], id, place: prev, dist: t };
      prev = [x, y, z];
      const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      t = tMax[a]; tMax[a] += tDelta[a];
      if (a === 0) x += step[0]; else if (a === 1) y += step[1]; else z += step[2];
    }
    return null;
  }

  // ---------- bodies: a 0.6 x 1.8 box that bumps into blocks ----------
  const HALF = 0.3, TALL = 1.8, EYE = 1.62, CROUCH_EYE = 1.27;
  function blocked(w, x, y, z) {   // the world's edges are walls; below the world is solid; torches, ladders, open doors let you through
    if (x < 0 || z < 0 || x >= w.size || z >= w.size || y < 0) return true;
    const id = get(w, x, y, z);
    if (!solid(id) || BLOCKS[id].passable) return false;
    if (id === B.DOOR && w.meta[key(x, y, z)]?.open) return false;
    return true;
  }
  function overlaps(w, p) {
    for (let x = Math.floor(p[0] - HALF); x <= Math.floor(p[0] + HALF - 1e-6); x++)
      for (let y = Math.floor(p[1]); y <= Math.floor(p[1] + TALL - 1e-6); y++)
        for (let z = Math.floor(p[2] - HALF); z <= Math.floor(p[2] + HALF - 1e-6); z++)
          if (blocked(w, x, y, z)) return [x, y, z];
    return null;
  }
  function onLadder(w, p) {
    for (const dy of [0.1, 1]) if (get(w, Math.floor(p[0]), Math.floor(p[1] + dy), Math.floor(p[2])) === B.LADDER) return true;
    return false;
  }
  function moveAxis(w, p, axis, delta) {
    p[axis] += delta;
    const hit = overlaps(w, p);
    if (!hit) return false;
    const lo = axis === 1 ? 0 : HALF, hi = axis === 1 ? TALL : HALF;
    p[axis] = delta > 0 ? hit[axis] - hi - 1e-4 : hit[axis] + 1 + lo + 1e-4;
    return true;
  }
  // input: forward, right (-1..1), jump, down, sprint, crouch, walk; opts.speed overrides the walking speed
  function stepPlayer(w, pl, input, dt, opts = {}) {
    const inWater = !!BLOCKS[get(w, Math.floor(pl.pos[0]), Math.floor(pl.pos[1] + 0.4), Math.floor(pl.pos[2]))]?.water;
    const ladder = !pl.fly && onLadder(w, pl.pos);
    let speed = pl.fly ? 10 : opts.speed ?? (input.sprint ? 5.6 : 4.3);
    if (!pl.fly) { if (input.crouch) speed *= 0.4; else if (input.walk) speed *= 0.55; if (inWater) speed *= 0.55; }
    const sin = Math.sin(pl.yaw), cos = Math.cos(pl.yaw);
    let mx = -sin * input.forward + cos * input.right, mz = -cos * input.forward - sin * input.right;
    const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
    pl.vel[0] = mx * speed; pl.vel[2] = mz * speed;
    if (pl.fly) pl.vel[1] = (input.jump ? 8 : 0) - (input.down ? 8 : 0);
    else if (ladder) pl.vel[1] = input.forward > 0 || input.jump ? 3 : input.crouch ? 0 : Math.max(pl.vel[1] - 28 * dt, -2.2);   // climb, hold on, or slide down slowly
    else if (inWater) { pl.vel[1] = Math.max(pl.vel[1] - 10 * dt, -3); if (input.jump) pl.vel[1] = 3.5; }
    else {
      pl.vel[1] = Math.max(pl.vel[1] - 28 * dt, -40);
      if (input.jump && pl.onGround) pl.vel[1] = 8.6;
    }
    const ledge = input.crouch && pl.onGround && !pl.fly;      // crouching at an edge doesn't fall off it
    const steps = Math.ceil(Math.max(...pl.vel.map((v) => Math.abs(v * dt))) / 0.4) || 1;
    const wasGround = pl.onGround;
    let impact = 0;
    pl.onGround = false;
    for (let s = 0; s < steps; s++) {
      for (const axis of [0, 2]) {
        const before = pl.pos[axis];
        if (moveAxis(w, pl.pos, axis, pl.vel[axis] * dt / steps)) pl.vel[axis] = 0;
        if (ledge && !overlaps(w, [pl.pos[0], pl.pos[1] - 0.1, pl.pos[2]])) { pl.pos[axis] = before; pl.vel[axis] = 0; }
      }
      const vy = pl.vel[1];
      if (moveAxis(w, pl.pos, 1, vy * dt / steps)) { if (vy < 0) { pl.onGround = true; impact = Math.max(impact, -vy); } pl.vel[1] = 0; }
    }
    if (inWater || pl.fly || wasGround || ladder) impact = 0;
    return { inWater, impact, ladder };
  }
  // fall damage from the speed on landing (a fall of more than 3 blocks hurts, 1 point per block)
  const fallDamage = (impact) => Math.max(0, Math.floor(impact * impact / 56 - 3));
  const eyeOf = (pl) => [pl.pos[0], pl.pos[1] + (pl.crouch ? CROUCH_EYE : EYE), pl.pos[2]];
  function lookDir(pl) { const c = Math.cos(pl.pitch); return [-Math.sin(pl.yaw) * c, Math.sin(pl.pitch), -Math.cos(pl.yaw) * c]; }
  function body(pos, yaw = 0) { return { pos, vel: [0, 0, 0], yaw, pitch: 0, onGround: false, fly: false, crouch: false }; }
  function spawnPlayer(w) {
    const c = Math.floor(w.size / 2);
    for (let r = 0; r < w.size / 2; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = c + dx, z = c + dz, y = topAt(w, x, z);
      if (y > w.water && get(w, x, y, z) !== B.LEAVES && !overlaps(w, [x + 0.5, y + 1.01, z + 0.5])) { const b = body([x + 0.5, y + 1.01, z + 0.5]); b.pitch = -0.2; return b; }
    }
    return body([c + 0.5, w.height - 2, c + 0.5]);
  }
  function canPlace(w, pl, cell) {   // inside the world and not where the player stands
    if (!cell || !inside(w, ...cell)) return false;
    const [x, y, z] = cell, p = pl.pos;
    return x + 1 <= p[0] - HALF || x >= p[0] + HALF || z + 1 <= p[2] - HALF || z >= p[2] + HALF || y + 1 <= p[1] || y >= p[1] + TALL;
  }
  // the side of a cell a door or ladder is on, from where the player looks (doors) or the wall clicked (ladders)
  const facingFromYaw = (yaw) => ((Math.round(-yaw / (Math.PI / 2)) % 4) + 4) % 4;   // 0 -z, 1 +x, 2 +z, 3 -x

  // ---------- dropped items: little things that fall, settle and wait to be picked up ----------
  function dropItem(w, stack, pos, vel) {
    w.items.push({ id: stack.id, count: stack.count, dmg: stack.dmg || 0, pos: pos.slice(), vel: vel ? vel.slice() : [(Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2], age: 0 });
  }
  function stepItems(w, dt) {
    for (const it of w.items) {
      it.age += dt;
      it.vel[1] = Math.max(it.vel[1] - 20 * dt, -20);
      for (const a of [0, 2]) {
        const n = it.pos.slice(); n[a] += it.vel[a] * dt;
        if (blocked(w, Math.floor(n[0]), Math.floor(n[1] + 0.05), Math.floor(n[2]))) it.vel[a] = 0; else it.pos = n;
      }
      const ny = it.pos[1] + it.vel[1] * dt;
      if (it.vel[1] < 0 && blocked(w, Math.floor(it.pos[0]), Math.floor(ny), Math.floor(it.pos[2]))) {
        it.pos[1] = Math.floor(ny) + 1; it.vel = [it.vel[0] * 0.5, 0, it.vel[2] * 0.5];
        if (Math.abs(it.vel[0]) < 0.05) it.vel[0] = 0; if (Math.abs(it.vel[2]) < 0.05) it.vel[2] = 0;
      } else it.pos[1] = ny;
      if (blocked(w, Math.floor(it.pos[0]), Math.floor(it.pos[1] + 0.05), Math.floor(it.pos[2]))) it.pos[1] = Math.floor(it.pos[1]) + 1;   // pushed out of a block placed on it
    }
    w.items = w.items.filter((it) => it.age < 300 && it.count > 0 && it.pos[1] > -10);     // gone after 5 minutes
  }

  // ---------- meshes: only the faces that can be seen ----------
  // per face: neighbour, 4 corners (bottom-left, top-left, top-right, bottom-right of the texture), which tile
  const FACES = [
    { d: [1, 0, 0],  c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], side: 1 },
    { d: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], side: 1 },
    { d: [0, 0, 1],  c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], side: 1 },
    { d: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], side: 1 },
    { d: [0, 1, 0],  c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], side: 0 },
    { d: [0, -1, 0], c: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], side: 2 },
  ];
  // how far inside its cell a tile's picture starts (the realistic atlas has a border round each tile)
  let PAD = 0.0008;
  const setTilePad = (p) => { PAD = p; };
  function tileRect(tile) {
    const T = 1 / ATLAS, u0 = (tile % ATLAS) * T + PAD, v0 = Math.floor(tile / ATLAS) * T + PAD;
    return [u0, v0, u0 + T - 2 * PAD, v0 + T - 2 * PAD];
  }
  function tileUV(tile) { const [u0, v0, u1, v1] = tileRect(tile); return [[u0, v1], [u0, v0], [u1, v0], [u1, v1]]; }
  // Soft shadow in corners where blocks meet (Minecraft's "smooth lighting") and the torch light there:
  // for one corner of a face, look at the cell in front of it, the two beside it and the diagonal one.
  const AO = [0.5, 0.68, 0.84, 1];
  function corner(w, x, y, z, f, c) {
    const a = f.d.findIndex((v) => v), u = (a + 1) % 3, v = (a + 2) % 3;
    const front = [x + f.d[0], y + f.d[1], z + f.d[2]], du = [0, 0, 0], dv = [0, 0, 0];
    du[u] = c[u] ? 1 : -1; dv[v] = c[v] ? 1 : -1;
    const cells = [[0, 0, 0], du, dv, [du[0] + dv[0], du[1] + dv[1], du[2] + dv[2]]].map((o) => [front[0] + o[0], front[1] + o[1], front[2] + o[2]]);
    const solidAt = cells.map((p) => (opaque(get(w, ...p)) ? 1 : 0));
    const ao = AO[solidAt[1] && solidAt[2] ? 0 : 3 - solidAt[1] - solidAt[2] - solidAt[3]];
    let sum = 0, n = 0;
    cells.forEach((p, i) => { if (!solidAt[i]) { sum += lightAt(w, ...p); n++; } });
    return [ao, n ? sum / n / 15 : 0];
  }
  // vertices: position (3), texture (2), corner shade (1), normal (3), torch light (1)
  const STRIDE = 10;
  // the boxes a non-cube block is drawn as, in its cell (0..1)
  function shapeBoxes(w, x, y, z, id) {
    const m = w.meta[key(x, y, z)] || {}, t = 3 / 16;
    if (id === B.TORCH) return [[7 / 16, 0, 7 / 16, 9 / 16, 10 / 16, 9 / 16]];
    if (id === B.SIGN) return [[7 / 16, 0, 7 / 16, 9 / 16, 9 / 16, 9 / 16], [1 / 16, 9 / 16, 6 / 16, 15 / 16, 1, 10 / 16]];   // a post and a board
    if (id === B.BED) return [[0, 0, 0, 1, 9 / 16, 1]];
    if (id === B.LADDER) {
      const n = m.n || [0, 0, 1];   // the ladder lies against the wall on the other side of n
      if (n[0] === 1) return [[0, 0, 0, 1 / 16, 1, 1]]; if (n[0] === -1) return [[15 / 16, 0, 0, 1, 1, 1]];
      if (n[2] === 1) return [[0, 0, 0, 1, 1, 1 / 16]]; return [[0, 0, 15 / 16, 1, 1, 1]];
    }
    if (id === B.DOOR) {
      const side = ((m.f || 0) + (m.open ? 1 : 0)) % 4;
      return [[[0, 0, 0, 1, 1, t], [1 - t, 0, 0, 1, 1, 1], [0, 0, 1 - t, 1, 1, 1], [0, 0, 0, t, 1, 1]][side]];
    }
    return [[0, 0, 0, 1, 1, 1]];
  }
  function shapeMesh(w, x, y, z, id, out) {
    const b = BLOCKS[id], m = w.meta[key(x, y, z)] || {}, light = lightAt(w, x, y, z) / 15;
    const tile = id === B.DOOR ? (m.top ? 34 : 33) : null;
    for (const [x0, y0, z0, x1, y1, z1] of shapeBoxes(w, x, y, z, id)) {
      for (const f of FACES) {
        const [u0, v0, u1, v1] = tileRect(tile ?? b.tiles[f.side]);
        for (const k of [0, 1, 2, 0, 2, 3]) {
          const c = f.c[k], px = c[0] ? x1 : x0, py = c[1] ? y1 : y0, pz = c[2] ? z1 : z0;
          // the picture is cut to the part of the cell the box covers, as in Minecraft
          const a = f.d.findIndex((v) => v);
          const s = a === 0 ? pz : px, tt = a === 1 ? pz : 1 - py;
          out.push(x + px, y + py, z + pz, u0 + s * (u1 - u0), v0 + tt * (v1 - v0), 1, ...f.d, id === B.TORCH ? 1 : light);
        }
      }
    }
  }
  function chunkMesh(w, cx, cz) {
    const solidV = [], waterV = [];
    for (let x = cx * CHUNK; x < Math.min(w.size, (cx + 1) * CHUNK); x++)
      for (let z = cz * CHUNK; z < Math.min(w.size, (cz + 1) * CHUNK); z++)
        for (let y = 0; y < w.height; y++) {
          const id = raw(w, x, y, z);
          if (id === B.AIR) continue;
          const b = BLOCKS[id];
          if (b.shape !== "cube") { shapeMesh(w, x, y, z, id, solidV); continue; }
          for (const f of FACES) {
            const nb = get(w, x + f.d[0], y + f.d[1], z + f.d[2]);
            // hidden behind a solid block, or between two blocks of glass or water (leaves show each other)
            if (b.water ? nb !== B.AIR : (opaque(nb) || (nb === id && id !== B.LEAVES))) continue;
            const uv = tileUV(b.tiles[f.side]), out = b.water ? waterV : solidV;
            const lower = b.water && get(w, x, y + 1, z) !== B.WATER ? 0.125 : 0;
            const shade = f.c.map((c) => corner(w, x, y, z, f, c));
            if (b.water) shade.forEach((s) => (s[0] = 1));
            for (const k of [0, 1, 2, 0, 2, 3]) {
              const c = f.c[k];
              out.push(x + c[0], y + c[1] - (c[1] ? lower : 0), z + c[2], uv[k][0], uv[k][1], shade[k][0], ...f.d, shade[k][1]);
            }
          }
        }
    return { solid: new Float32Array(solidV), water: new Float32Array(waterV) };
  }
  // the cracks drawn over a block being broken: a slightly bigger cube with a crack tile (stage 0..5)
  function crackMesh(cell, stage) {
    const out = [], uv = tileUV(48 + stage), [x, y, z] = cell, g = 0.004;
    for (const f of FACES) for (const k of [0, 1, 2, 0, 2, 3]) {
      const c = f.c[k];
      out.push(x - g + c[0] * (1 + 2 * g), y - g + c[1] * (1 + 2 * g), z - g + c[2] * (1 + 2 * g), uv[k][0], uv[k][1], 1, ...f.d, 0);
    }
    return new Float32Array(out);
  }
  // dropped items: a small turning cube for blocks, a flat picture (two crossed planes) for items
  function itemMesh(it, t, light) {
    const out = [], s = 0.25, spin = t * 1.5 + it.age, bob = Math.sin(t * 2.5 + it.age * 3) * 0.06 + 0.2;
    const c = Math.cos(spin), sn = Math.sin(spin), [ox, oy, oz] = it.pos;
    const at = (x, y, z) => [ox + (x - 0.5) * s * c + (z - 0.5) * s * sn, oy + bob + y * s, oz - (x - 0.5) * s * sn + (z - 0.5) * s * c];
    if (isBlock(it.id) && BLOCKS[it.id].shape === "cube") {
      for (const f of FACES) { const uv = tileUV(BLOCKS[it.id].tiles[f.side]); for (const k of [0, 1, 2, 0, 2, 3]) out.push(...at(...f.c[k]), uv[k][0], uv[k][1], 1, ...f.d, light); }
    } else {
      const uv = tileUV(iconTile(it.id)), big = 1.6;
      for (const [ax, az] of [[1, 0], [0, 1]]) {
        const p = [[0, 0], [0, 1], [1, 1], [1, 0]].map(([h, v]) => at(0.5 + (h - 0.5) * big * ax, v * big, 0.5 + (h - 0.5) * big * az));
        for (const k of [0, 1, 2, 0, 2, 3]) out.push(...p[k], uv[k][0], uv[k][1], 1, 0, 1, 0, light);
      }
    }
    return out;
  }

  return { CHUNK, REACH, WATER, ATLAS, B, I, BLOCKS, ITEMS, CREATIVE, HALF, TALL, info, isBlock, placeable, iconTile, maxStack, maxUses,
           category, solid, opaque, breakTime, makeWorld, emptyWorld, inside, get, set, lightAt, key, applyEdits, relightAll, topAt, raycast,
           blocked, overlaps, onLadder, stepPlayer, fallDamage, eyeOf, lookDir, body, spawnPlayer, canPlace, facingFromYaw, dropItem,
           stepItems, tileUV, tileRect, setTilePad, STRIDE, chunkMesh, crackMesh, itemMesh, shapeBoxes };
})();
window.BlockCraft = BlockCraft;
