/* Block Craft: the realistic look's textures. 64 x 64 pixels per tile (a 56-pixel picture with a 4-pixel border
   that repeats its edge, so smooth texture filtering doesn't bleed between tiles), painted from noise that
   repeats across each tile, so neighbouring blocks join without seams. No image files. */
"use strict";
const CraftLooks = (() => {
  const TILE = 64, BORDER = 4, INNER = TILE - 2 * BORDER, COLS = 16;

  function hash(i, j, s) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const wrap = (a, p) => ((a % p) + p) % p;
  // value noise that repeats every px cells across and py cells down
  function noise(u, v, px, py, s) {
    const x = u * px, y = v * py, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(wrap(i, px), wrap(j, py), s), b = hash(wrap(i + 1, px), wrap(j, py), s);
    const c = hash(wrap(i, px), wrap(j + 1, py), s), d = hash(wrap(i + 1, px), wrap(j + 1, py), s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(u, v, p, s, oct = 4, py = p) {
    let t = 0, n = 0, a = 1, qx = p, qy = py;
    for (let o = 0; o < oct; o++) { t += noise(u, v, qx, qy, s + o * 31) * a; n += a; a *= 0.5; qx *= 2; qy *= 2; }
    return t / n;
  }
  // cells (stones, clusters): distance to the nearest and second nearest point, and which cell
  function cells(u, v, p, s) {
    const x = u * p, y = v * p, i = Math.floor(x), j = Math.floor(y);
    let d1 = 9, d2 = 9, id = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ci = wrap(i + di, p), cj = wrap(j + dj, p);
      const px = i + di + 0.15 + 0.7 * hash(ci, cj, s), py = j + dj + 0.15 + 0.7 * hash(ci, cj, s + 7);
      const d = Math.hypot(px - x, py - y);
      if (d < d1) { d2 = d1; d1 = d; id = hash(ci, cj, s + 13); } else if (d < d2) d2 = d;
    }
    return { d1, d2, id };
  }
  const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
  const mul = (c, k) => c.map((x) => x * k);

  // ---------- the materials ----------
  const GRASS_A = [50, 70, 32], GRASS_B = [86, 94, 48], DIRT_A = [78, 58, 40], DIRT_B = [118, 90, 62];
  const grass = (u, v) => mul(mix(GRASS_A, GRASS_B, fbm(u, v, 4, 1)), 0.78 + 0.3 * noise(u, v, 40, 40, 3) + 0.12 * fbm(u, v, 12, 5));
  function dirt(u, v) {
    let c = mul(mix(DIRT_A, DIRT_B, fbm(u, v, 6, 7)), 0.85 + 0.25 * noise(u, v, 32, 32, 9));
    const p = cells(u, v, 9, 8);
    if (p.d1 < 0.16) c = mix(c, mul([128, 118, 102], 0.8 + 0.4 * p.id), 0.75);
    return c;
  }
  function stone(u, v, base = [112, 111, 106]) {
    let c = mul(base, 0.82 + 0.32 * fbm(u, v, 4, 9) + 0.08 * noise(u, v, 40, 40, 2));
    if (Math.abs(fbm(u, v, 3, 10, 3) - 0.5) < 0.012) c = mul(c, 0.62);           // thin cracks
    return c;
  }
  function planks(u, v, base = [146, 106, 66], boards = 4) {
    const b = Math.floor(v * boards), t = hash(b, 0, 21);
    let c = mul(base, (0.8 + 0.35 * fbm(u, v, 2, 30 + b, 4, 24)) * (0.88 + 0.22 * t));
    if ((v * boards) % 1 < 0.05) c = mul(c, 0.5);                                   // gaps between boards
    if (((u + t) % 1) < 0.012) c = mul(c, 0.6);                                     // board ends
    return c;
  }
  const plaster = (u, v, base) => {
    const stain = Math.max(0, fbm(u, v, 2, 40) - 0.55) * 1.6;
    let c = mul(base, 0.9 + 0.12 * fbm(u, v, 6, 41) - stain * 0.35 + 0.05 * noise(u, v, 48, 48, 42));
    if (noise(u, v, 24, 24, 43) > 0.93) c = mul(c, 0.8);                            // chips
    return c;
  };
  function mortarGrid(u, v, rows, cols, gap, offset) {
    const r = Math.floor(v * rows), shift = offset && r % 2 ? 0.5 / cols : 0, cu = (u + shift) * cols, cv = v * rows;
    const edge = Math.min(cu % 1, 1 - (cu % 1)) / cols < gap || Math.min(cv % 1, 1 - (cv % 1)) / rows < gap;
    return { edge, id: hash(Math.floor(cu) % cols, r, 51) };
  }

  // ore: stone with clusters of coloured crystals
  function ore(u, v, colour, seed) {
    const p = cells(u, v, 6, seed);
    if (p.d1 < 0.22 && p.id > 0.35) return mul(colour, 0.75 + 0.5 * (1 - p.d1 / 0.22) * (0.8 + 0.4 * noise(u, v, 40, 40, seed + 1)));
    return stone(u, v);
  }
  const PAINT = {
    16: (u, v) => ore(u, v, [40, 38, 36], 60),
    21: (u, v) => ore(u, v, [196, 150, 118], 61),
    28: (u, v) => ore(u, v, [110, 226, 222], 62),
    29: (u, v) => (u < 0.06 || v < 0.06 || u > 0.94 || v > 0.94) ? [70, 48, 28] : planks(u, v, [156, 110, 58], 3),   // chest top
    30: (u, v) => {                                                                                                  // chest side with its latch
      if (u > 0.44 && u < 0.56 && v > 0.32 && v < 0.5) return [170, 170, 176];
      if (u < 0.06 || u > 0.94 || v > 0.94 || Math.abs(v - 0.38) < 0.03) return [70, 48, 28];
      return planks(u, v, [156, 110, 58], 3);
    },
    32: (u, v) => {                                                                                                  // torch: a stick with a flame
      if (Math.abs(u - 0.5) > 0.07 || v < 0.375) return null;          // the drawn torch shows the lower part of the tile
      if (v < 0.5) return mix([255, 240, 150], [255, 140, 40], (v - 0.375) / 0.125);
      if (v < 0.54) return [60, 40, 24];
      return mul([128, 92, 54], 0.9 + 0.2 * noise(u, v, 8, 30, 63));
    },
    33: (u, v) => (u < 0.08 || u > 0.92 || v > 0.94 || Math.abs(v - 0.5) < 0.03) ? [92, 62, 34] : (u > 0.78 && u < 0.88 && v > 0.04 && v < 0.14) ? [60, 60, 64] : planks(u, v, [150, 106, 62], 6),   // door, lower half
    34: (u, v) => (u < 0.08 || u > 0.92 || v < 0.06) ? [92, 62, 34] : (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.7 && Math.abs(u - 0.5) > 0.03) ? [190, 214, 222] : planks(u, v, [150, 106, 62], 6),   // with a window
    35: (u, v) => v < 0.28 ? mul([236, 232, 222], 0.93 + 0.07 * fbm(u, v, 6, 64)) : mul([168, 40, 44], 0.85 + 0.2 * fbm(u, v, 8, 65)),   // pillow and blanket
    36: (u, v) => v < 0.44 ? null : v < 0.7 ? mul([168, 40, 44], 0.85 + 0.15 * fbm(u, v, 8, 66)) : planks(u, v, [140, 98, 56], 2),   // bed side: blanket over wood
    38: (u, v) => (u < 0.06 || v < 0.06 || u > 0.94 || v > 0.94) ? [92, 62, 34] : planks(u, v, [176, 134, 82], 4),   // sign board
    39: (u, v) => (u < 0.06 || v < 0.06 || u > 0.94 || v > 0.94) ? [92, 62, 34] : (v > 0.3 && v < 0.7 && u > 0.2 && u < 0.8 && ((v * 10) % 1 < 0.3)) ? [60, 40, 20] : planks(u, v, [176, 134, 82], 4),
    37: (u, v) => (u < 0.16 || u > 0.84) ? mul([128, 92, 54], 0.85 + 0.25 * fbm(u, v, 3, 67, 4, 16)) : ((v * 4) % 1 < 0.16) ? mul([140, 100, 58], 0.9) : null,   // ladder
    0: grass,
    1: (u, v) => {
      const edge = 0.16 + 0.12 * noise(u, 0.5, 14, 1, 5) + 0.05 * noise(u, 0.5, 40, 1, 6);
      return v < edge ? mul(grass(u, v), 0.9) : mul(dirt(u, v), v < edge + 0.05 ? 0.75 : 1);
    },
    2: dirt,
    3: (u, v) => stone(u, v),
    4: (u, v) => mul([184, 164, 124], 0.9 + 0.1 * fbm(u, v, 8, 11) + 0.04 * Math.sin((v + fbm(u, v, 3, 12) * 0.3) * Math.PI * 12) + 0.05 * noise(u, v, 56, 56, 13)),
    5: (u, v) => mul([22, 52, 70], 0.9 + 0.2 * fbm(u, v, 4, 14)),
    6: (u, v) => mul([84, 64, 46], 0.62 + 0.55 * fbm(u, v, 10, 15, 4, 2)),          // bark: long grooves
    7: (u, v) => {
      const d = Math.hypot(u - 0.5, v - 0.5);
      if (d > 0.44) return mul([84, 64, 46], 0.7 + 0.4 * fbm(u, v, 10, 16));
      return mix([142, 104, 64], [188, 148, 98], 0.5 + 0.5 * Math.sin(d * 70 + fbm(u, v, 4, 17) * 6));
    },
    8: (u, v) => {
      const p = cells(u, v, 7, 18);
      if (p.d1 > 0.62 || noise(u, v, 28, 28, 19) > 0.8) return null;               // gaps in the leaves
      return mul(mix([34, 62, 26], [76, 108, 44], fbm(u, v, 8, 20)), 0.7 + 0.45 * (1 - p.d1));
    },
    9: (u, v) => planks(u, v),
    10: (u, v) => (u < 0.05 || v < 0.05 || u > 0.95 || v > 0.95) ? [150, 160, 165] : Math.abs(u - v - 0.2) < 0.018 || Math.abs(u - v - 0.28) < 0.008 ? [225, 235, 240] : null,
    11: (u, v) => {
      const p = cells(u, v, 4, 22);
      if (p.d2 - p.d1 < 0.09) return mul([66, 64, 60], 0.8 + 0.3 * noise(u, v, 30, 30, 23));
      return mul(mix([96, 95, 91], [150, 148, 140], p.id), (1 - 0.35 * p.d1) * (0.88 + 0.22 * fbm(u, v, 8, 24)));
    },
    12: (u, v) => {
      const g = mortarGrid(u, v, 4, 2, 0.022, true);
      if (g.edge) return mul([168, 162, 150], 0.9 + 0.15 * noise(u, v, 40, 40, 25));
      return mul([138, 60, 42], (0.78 + 0.32 * g.id) * (0.85 + 0.25 * fbm(u, v, 6, 26)));
    },
    13: (u, v) => mul([236, 240, 246], 0.93 + 0.07 * fbm(u, v, 6, 27)),
    14: (u, v) => {
      const edge = 0.14 + 0.1 * noise(u, 0.5, 12, 1, 28);
      return v < edge ? [232, 238, 244] : mul(dirt(u, v), v < edge + 0.04 ? 0.75 : 1);
    },
    15: (u, v) => mul([58, 56, 54], 0.5 + 0.9 * fbm(u, v, 6, 29)),
    17: (u, v) => (u < 0.08 || v < 0.08 || u > 0.92 || v > 0.92) ? mul([88, 60, 36], 0.9 + 0.2 * fbm(u, v, 8, 31)) : planks(u, v, [158, 118, 74], 3),
    18: (u, v) => {
      if (v < 0.12) return mul([88, 60, 36], 0.9 + 0.2 * fbm(u, v, 8, 32));
      if (u > 0.18 && u < 0.42 && v > 0.35 && v < 0.75) return stone(u, v, [80, 80, 82]);        // a saw and a hammer hang on it
      if (u > 0.6 && u < 0.72 && v > 0.3 && v < 0.85) return mul([120, 84, 48], 0.9);
      return planks(u, v, [150, 110, 68], 3);
    },
    19: (u, v) => stone(u, v, [124, 122, 118]),
    20: (u, v) => (u > 0.22 && u < 0.78 && v > 0.55 && v < 0.88) ? mul([28, 24, 22], 0.8 + 0.4 * fbm(u, v, 8, 33)) : (mortarGrid(u, v, 4, 3, 0.02, true).edge ? [86, 84, 80] : stone(u, v, [124, 122, 118])),
    22: (u, v) => plaster(u, v, [214, 192, 148]),
    23: (u, v) => mul(plaster(u, v, [204, 180, 138]), (v % 0.25) < 0.012 ? 0.85 : 1),
    24: (u, v) => mortarGrid(u, v, 2, 2, 0.02, true).edge ? [84, 82, 78] : stone(u, v, [128, 127, 122]),
    25: (u, v) => {
      let c = mul([172, 170, 164], 0.9 + 0.1 * fbm(u, v, 5, 34) - Math.max(0, fbm(u, v, 2, 35) - 0.6) * 0.5);
      if (noise(u, v, 56, 56, 36) < 0.04) c = mul(c, 0.7);                            // little holes
      return c;
    },
    26: (u, v) => {
      const frame = u < 0.1 || v < 0.1 || u > 0.9 || v > 0.9, brace = Math.abs(u - v) < 0.07 || Math.abs(u + v - 1) < 0.07;
      if (frame || brace) return mul([112, 80, 46], 0.8 + 0.3 * fbm(u, v, 3, 37, 4, 18));
      const b = Math.floor(u * 4);
      return mul([170, 128, 78], (0.8 + 0.3 * fbm(u, v, 18, 38 + b, 4, 2)) * (0.9 + 0.15 * hash(b, 1, 39)) * ((u * 4) % 1 < 0.04 ? 0.6 : 1));
    },
    27: (u, v) => {
      let c = mul([92, 98, 104], 0.78 + 0.22 * Math.sin(u * Math.PI * 16) * 0.5 + 0.12 * fbm(u, v, 6, 44));
      const rust = fbm(u, v, 3, 45);
      if (rust > 0.62) c = mix(c, [124, 74, 44], (rust - 0.62) * 3);
      return c;
    },
  };

  const CLEAR = { 8: [44, 72, 30], 10: [170, 180, 185], 32: [128, 92, 54], 36: [168, 40, 44], 37: [128, 92, 54] };
  // Paint the atlas; the pixel-art items and cracks are copied from the blocky atlas, made bigger
  function makeAtlas(blocky) {
    const c = document.createElement("canvas"); c.width = c.height = TILE * COLS;
    const g = c.getContext("2d"), img = g.createImageData(c.width, c.height), d = img.data;
    for (const [tile, paint] of Object.entries(PAINT)) {
      const ox = (tile % COLS) * TILE, oy = Math.floor(tile / COLS) * TILE;
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const u = (Math.min(INNER - 1, Math.max(0, x - BORDER)) + 0.5) / INNER, v = (Math.min(INNER - 1, Math.max(0, y - BORDER)) + 0.5) / INNER;
        const col = paint(u, v), i = ((oy + y) * c.width + ox + x) * 4;
        if (!col) {   // see-through: keep the material's colour so smooth filtering doesn't draw dark edges
          const k = CLEAR[tile] || [0, 0, 0]; d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = 0; continue;
        }
        d[i] = Math.min(255, col[0]); d[i + 1] = Math.min(255, col[1]); d[i + 2] = Math.min(255, col[2]); d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    for (const t of [...Array(14).keys()].map((k) => k + 40).concat([...Array(17).keys()].map((k) => k + 64))) {
      const sx = (t % COLS) * 16, sy = Math.floor(t / COLS) * 16, dx = (t % COLS) * TILE, dy = Math.floor(t / COLS) * TILE;
      g.drawImage(blocky, sx, sy, 16, 16, dx + BORDER, dy + BORDER, INNER, INNER);
    }
    return c;
  }
  return { makeAtlas, pad: BORDER / (TILE * COLS) + 0.0005 };
})();
window.CraftLooks = CraftLooks;
