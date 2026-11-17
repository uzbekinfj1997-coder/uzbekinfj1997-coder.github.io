/* Block Craft: the inventory, crafting, the furnace, chests, armour and tool wear, as in Minecraft.
   Slots hold { id, count, dmg } or null (dmg: how worn a tool is). An inventory has 36 slots (0-8 the hotbar,
   9-35 the main part), 4 armour slots (head, chest, legs, feet) and an off-hand slot. Pure functions. */
"use strict";
const CraftInv = (() => {
  const { B, I, info, maxStack, maxUses } = BlockCraft;
  const HOTBAR = 9, SLOTS = 36, CHEST = 27;

  const newInventory = () => ({ slots: Array(SLOTS).fill(null), armor: Array(4).fill(null), offhand: [null], cursor: null, craft: Array(9).fill(null) });
  const count = (inv, id) => inv.slots.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0);
  const same = (a, b) => a && b && a.id === b.id && !maxUses(a.id);          // worn tools never stack

  // Put a stack into slots: first onto stacks of the same kind, then into empty slots. Returns what did not fit.
  function addTo(slots, id, n = 1, dmg = 0, from = 0, to = slots.length) {
    const max = maxStack(id);
    if (max > 1) for (let i = from; i < to && n; i++) { const s = slots[i]; if (s && s.id === id && s.count < max) { const k = Math.min(n, max - s.count); s.count += k; n -= k; } }
    for (let i = from; i < to && n; i++) if (!slots[i]) { const k = Math.min(n, max); slots[i] = { id, count: k, dmg }; n -= k; }
    return n;
  }
  const add = (inv, id, n = 1, dmg = 0) => addTo(inv.slots, id, n, dmg);
  function takeOne(slots, i) {   // use one from a slot (placing a block)
    const s = slots[i];
    if (!s) return null;
    if (--s.count <= 0) slots[i] = null;
    return s.id;
  }
  // a tool in a slot is used once; returns true when it wore out and broke
  function wear(slots, i) {
    const s = slots[i], max = s && maxUses(s.id);
    if (!max) return false;
    s.dmg = (s.dmg || 0) + 1;
    if (s.dmg >= max) { slots[i] = null; return true; }
    return false;
  }
  const armorPoints = (inv) => inv.armor.reduce((n, s) => n + (s ? info(s.id).armor.points : 0), 0);
  // damage after armour (Minecraft's simple rule: each point takes away 4 %)
  const afterArmor = (dmg, points) => dmg * (1 - Math.min(20, points) / 25);

  // ---------- clicking slots, as in Minecraft ----------
  // left: pick up / put down / merge / swap; right: pick up half, or put down one. `fits(id)` limits a slot (armour).
  function click(state, slots, i, button = 0, fits = null) {
    const s = slots[i], c = state.cursor;
    if (c && fits && !fits(c.id)) return;
    if (button === 2) {
      if (!c && s) { const k = Math.ceil(s.count / 2); state.cursor = { ...s, count: k }; s.count -= k; if (!s.count) slots[i] = null; }
      else if (c && (!s || (same(s, c) && s.count < maxStack(c.id)))) {
        if (s) s.count++; else slots[i] = { ...c, count: 1 };
        if (--c.count <= 0) state.cursor = null;
      }
      return;
    }
    if (!c) { state.cursor = s; slots[i] = null; return; }
    if (!s) { slots[i] = c; state.cursor = null; return; }
    if (same(s, c)) {
      const k = Math.min(c.count, maxStack(s.id) - s.count);
      s.count += k; c.count -= k;
      if (!c.count) state.cursor = null;
      return;
    }
    slots[i] = c; state.cursor = s;
  }
  // shift-click in the inventory: armour goes on, otherwise between the hotbar and the main part
  function quickMove(inv, i) {
    const s = inv.slots[i];
    if (!s) return;
    const a = info(s.id).armor;
    if (a && !inv.armor[a.slot]) { inv.armor[a.slot] = s; inv.slots[i] = null; return; }
    const left = i < HOTBAR ? addTo(inv.slots, s.id, s.count, s.dmg, HOTBAR, SLOTS) : addTo(inv.slots, s.id, s.count, s.dmg, 0, HOTBAR);
    if (left) s.count = left; else inv.slots[i] = null;
  }
  // shift-click between two sets of slots (a chest and the inventory, the armour slots and the inventory)
  function moveAcross(from, i, to) {
    const s = from[i];
    if (!s) return;
    const left = addTo(to, s.id, s.count, s.dmg);
    if (left) s.count = left; else from[i] = null;
  }
  // things left in a crafting grid or on the cursor go back into the inventory; what doesn't fit is returned
  function giveBack(inv, list) {
    const over = [];
    for (let i = 0; i < list.length; i++) if (list[i]) {
      const left = add(inv, list[i].id, list[i].count, list[i].dmg);
      if (left) over.push({ ...list[i], count: left });
      list[i] = null;
    }
    return over;
  }

  // ---------- crafting ----------
  // patterns read row by row; a letter is one item, a space an empty cell. Mirrored shapes work too.
  const P = B.PLANKS, s = I.STICK, C = B.COBBLE, IR = I.IRON_INGOT, D = I.DIAMOND;
  const tools = (m, mat, [pick, axe, shovel]) => [
    { pattern: ["MMM", " s ", " s "], keys: { M: mat, s }, out: [pick, 1] },
    { pattern: ["MM", "Ms", " s"], keys: { M: mat, s }, out: [axe, 1] },
    { pattern: ["M", "s", "s"], keys: { M: mat, s }, out: [shovel, 1] }];
  const armour = (mat, [h, c, l, b]) => [
    { pattern: ["MMM", "M M"], keys: { M: mat }, out: [h, 1] },
    { pattern: ["M M", "MMM", "MMM"], keys: { M: mat }, out: [c, 1] },
    { pattern: ["MMM", "M M", "M M"], keys: { M: mat }, out: [l, 1] },
    { pattern: ["M M", "M M"], keys: { M: mat }, out: [b, 1] }];
  const RECIPES = [
    { shapeless: [B.WOOD], out: [B.PLANKS, 4] },
    { pattern: ["P", "P"], keys: { P }, out: [I.STICK, 4] },
    { pattern: ["PP", "PP"], keys: { P }, out: [B.TABLE, 1] },
    { pattern: ["CCC", "C C", "CCC"], keys: { C }, out: [B.FURNACE, 1] },
    { pattern: ["PPP", "P P", "PPP"], keys: { P }, out: [B.CHEST, 1] },
    { pattern: ["c", "s"], keys: { c: I.COAL, s }, out: [B.TORCH, 4] },
    { pattern: ["c", "s"], keys: { c: I.CHARCOAL, s }, out: [B.TORCH, 4] },
    { pattern: ["PP", "PP", "PP"], keys: { P }, out: [B.DOOR, 3] },
    { pattern: ["PPP", "PPP"], keys: { P }, out: [B.BED, 1] },
    { pattern: ["s s", "sss", "s s"], keys: { s }, out: [B.LADDER, 3] },
    { pattern: ["PPP", "PPP", " s "], keys: { P, s }, out: [B.SIGN, 3] },
    { pattern: ["SS", "SS"], keys: { S: B.SAND }, out: [B.SANDSTONE, 1] },
    { pattern: ["SS", "SS"], keys: { S: B.STONE }, out: [B.STONE_BRICKS, 4] },
    ...tools("wood", P, [I.WOOD_PICK, I.WOOD_AXE, I.WOOD_SHOVEL]),
    ...tools("stone", C, [I.STONE_PICK, I.STONE_AXE, I.STONE_SHOVEL]),
    ...tools("iron", IR, [I.IRON_PICK, I.IRON_AXE, I.IRON_SHOVEL]),
    ...tools("diamond", D, [I.DIAMOND_PICK, I.DIAMOND_AXE, I.DIAMOND_SHOVEL]),
    ...armour(IR, [I.IRON_HELMET, I.IRON_CHESTPLATE, I.IRON_LEGGINGS, I.IRON_BOOTS]),
    ...armour(D, [I.DIAMOND_HELMET, I.DIAMOND_CHESTPLATE, I.DIAMOND_LEGGINGS, I.DIAMOND_BOOTS]),
  ];

  // the grid as rows of ids (0 = empty) with empty rows and columns around it removed
  function trim(grid, w) {
    const rows = [];
    for (let r = 0; r < grid.length / w; r++) rows.push(grid.slice(r * w, r * w + w).map((x) => (x ? x.id : 0)));
    const used = (a) => a.some((v) => v);
    while (rows.length && !used(rows[0])) rows.shift();
    while (rows.length && !used(rows[rows.length - 1])) rows.pop();
    if (!rows.length) return [];
    let lo = 0, hi = w - 1;
    while (rows.every((r) => !r[lo])) lo++;
    while (rows.every((r) => !r[hi])) hi--;
    return rows.map((r) => r.slice(lo, hi + 1));
  }
  function matchRecipe(grid, w) {
    const t = trim(grid, w);
    if (!t.length) return null;
    const items = t.flat().filter((v) => v).sort();
    for (const r of RECIPES) {
      if (r.shapeless) { if (items.length === r.shapeless.length && [...r.shapeless].sort().every((v, i) => v === items[i])) return r; continue; }
      const want = r.pattern.map((row) => [...row].map((ch) => (ch === " " ? 0 : r.keys[ch])));
      if (want.length > grid.length / w || want[0].length > w) continue;
      for (const shape of [want, want.map((row) => [...row].reverse())])
        if (shape.length === t.length && shape[0].length === t[0].length && shape.every((row, i) => row.every((v, j) => v === t[i][j]))) return r;
    }
    return null;
  }
  // take what the grid makes; shift takes as many as the grid allows straight into the inventory
  function craft(inv, grid, w, all = false) {
    let made = 0;
    for (;;) {
      const r = matchRecipe(grid, w);
      if (!r) break;
      const [id, n] = r.out;
      if (all) { if (add(inv, id, n)) break; }
      else {
        const c = inv.cursor;
        if (c && (c.id !== id || c.count + n > maxStack(id))) break;
        inv.cursor = c ? { ...c, count: c.count + n } : { id, count: n, dmg: 0 };
      }
      for (let i = 0; i < grid.length; i++) if (grid[i] && --grid[i].count <= 0) grid[i] = null;
      made += n;
      if (!all) break;
    }
    return made;
  }

  // ---------- the furnace: input, fuel, output; smelting takes 4 s, fuel burns for its time ----------
  const SMELT = { [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE, [B.WOOD]: I.CHARCOAL, [B.IRON_ORE]: I.IRON_INGOT };
  const SMELT_TIME = 4;
  const newFurnace = () => ({ input: null, fuel: null, output: null, burn: 0, burnMax: 0, progress: 0 });
  function canSmelt(f) {
    const out = f.input && SMELT[f.input.id];
    return !!out && (!f.output || (f.output.id === out && f.output.count < maxStack(out)));
  }
  function furnaceTick(f, dt) {
    if (f.burn <= 0 && canSmelt(f) && f.fuel && info(f.fuel.id)?.fuel) {
      f.burn = f.burnMax = info(f.fuel.id).fuel;
      if (--f.fuel.count <= 0) f.fuel = null;
    }
    if (f.burn > 0) {
      f.burn = Math.max(0, f.burn - dt);
      if (canSmelt(f)) {
        f.progress += dt;
        if (f.progress >= SMELT_TIME) {
          const out = SMELT[f.input.id];
          f.progress = 0;
          f.output = f.output ? { id: out, count: f.output.count + 1, dmg: 0 } : { id: out, count: 1, dmg: 0 };
          if (--f.input.count <= 0) f.input = null;
        }
      } else f.progress = 0;
    } else f.progress = Math.max(0, f.progress - dt * 2);
  }
  const newChest = () => Array(CHEST).fill(null);

  return { HOTBAR, SLOTS, CHEST, newInventory, count, add, addTo, takeOne, wear, armorPoints, afterArmor, click, quickMove, moveAcross,
           giveBack, RECIPES, matchRecipe, craft, SMELT, SMELT_TIME, newFurnace, canSmelt, furnaceTick, newChest };
})();
window.CraftInv = CraftInv;
