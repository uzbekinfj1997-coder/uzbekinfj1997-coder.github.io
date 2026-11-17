/* London Walk: turns the map data (london/data.js, from OpenStreetMap) into the 3D city: streets, pavements, buildings
   with their real outlines and heights, street furniture, and the landmarks along the walk, modelled here in simple
   shapes. Also answers "can I stand here?" so you can't walk through walls. Pure geometry, no drawing. */
"use strict";
const LondonWorld = (() => {
  const { Mesh } = LondonGL;
  const C = {
    asphalt: [0.16, 0.17, 0.19], pave: [0.42, 0.43, 0.45], kerb: [0.55, 0.55, 0.56], roof: [0.25, 0.26, 0.28], white: [0.85, 0.86, 0.84],
    stone: [0.78, 0.74, 0.64], brick: [0.55, 0.33, 0.26], render: [0.7, 0.68, 0.63], dark: [0.2, 0.2, 0.22], red: [0.72, 0.08, 0.08],
    green: [0.12, 0.3, 0.2], gold: [0.85, 0.66, 0.2], lamp: [1.0, 0.86, 0.6], black: [0.06, 0.06, 0.07], glass: [0.3, 0.38, 0.45],
  };
  const FACADES = [[0.78, 0.74, 0.64], [0.7, 0.68, 0.63], [0.55, 0.33, 0.26], [0.62, 0.42, 0.33], [0.82, 0.8, 0.74], [0.5, 0.5, 0.52], [0.66, 0.6, 0.5]];

  // ---------- polygons ----------
  const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; a += x1 * z2 - x2 * z1; } return a / 2; };
  function inside(pts, x, z) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, zi] = pts[i], [xj, zj] = pts[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  }
  // ear clipping for flat roofs (simple polygons)
  function triangulate(pts) {
    const idx = pts.map((_, i) => i), out = [], ccw = area(pts) > 0;
    const isEar = (a, b, c) => {
      const [ax, az] = pts[a], [bx, bz] = pts[b], [cx, cz] = pts[c];
      const cr = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (ccw ? cr <= 0 : cr >= 0) return false;
      for (const p of idx) {
        if (p === a || p === b || p === c) continue;
        const [px, pz] = pts[p];
        const s1 = (bx - ax) * (pz - az) - (bz - az) * (px - ax), s2 = (cx - bx) * (pz - bz) - (cz - bz) * (px - bx), s3 = (ax - cx) * (pz - cz) - (az - cz) * (px - cx);
        if (ccw ? s1 >= 0 && s2 >= 0 && s3 >= 0 : s1 <= 0 && s2 <= 0 && s3 <= 0) return false;
      }
      return true;
    };
    let guard = 0;
    while (idx.length > 3 && guard++ < 5000) {
      let found = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
        if (isEar(a, b, c)) { out.push([a, b, c]); idx.splice(i, 1); found = true; break; }
      }
      if (!found) break;
    }
    if (idx.length === 3) out.push(idx.slice());
    return out;
  }
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

  // ---------- the walk route ----------
  const { routeInfo } = WalkShell;

  // ---------- building the city ----------
  function build(data) {
    const m = new Mesh();
    // the ground under everything: wet pavement
    const xs = data.route.map((p) => p[0]), zs = data.route.map((p) => p[1]);
    const box = [Math.min(...xs) - 400, Math.min(...zs) - 400, Math.max(...xs) + 400, Math.max(...zs) + 400];
    m.quad([box[0], 0, box[3]], [box[2], 0, box[3]], [box[2], 0, box[1]], [box[0], 0, box[1]], C.pave, 2);

    // streets: asphalt ribbons, centre lines on the big roads
    for (const s of data.streets) {
      const w = s.w / 2;
      for (let i = 1; i < s.pts.length; i++) {
        const [ax, az] = s.pts[i - 1], [bx, bz] = s.pts[i], L = Math.hypot(bx - ax, bz - az);
        if (L < 0.01) continue;
        const nx = -(bz - az) / L, nz = (bx - ax) / L, ext = Math.min(w, 2);
        const ux = (bx - ax) / L, uz = (bz - az) / L;
        const a0 = [ax - ux * ext, az - uz * ext], b0 = [bx + ux * ext, bz + uz * ext];
        if (s.vehicles) m.quad([a0[0] + nx * w, 0.03, a0[1] + nz * w], [a0[0] - nx * w, 0.03, a0[1] - nz * w], [b0[0] - nx * w, 0.03, b0[1] - nz * w], [b0[0] + nx * w, 0.03, b0[1] + nz * w], C.asphalt, 2);
        if (s.vehicles && s.w >= 9) {   // dashed white centre line
          for (let d = 0; d < L; d += 9) {
            const d1 = Math.min(L, d + 4), p = (t) => [ax + ux * t, az + uz * t];
            const [x0, z0] = p(d), [x1, z1] = p(d1);
            m.quad([x0 + nx * 0.08, 0.04, z0 + nz * 0.08], [x0 - nx * 0.08, 0.04, z0 - nz * 0.08], [x1 - nx * 0.08, 0.04, z1 - nz * 0.08], [x1 + nx * 0.08, 0.04, z1 + nz * 0.08], C.white, 2);
          }
        }
      }
    }

    // buildings with their real outlines and heights; facades get windows and shop fronts
    const grid = new Map(), CELL = 25;
    const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
    data.buildings.forEach((b, bi) => {
      let pts = b.pts;
      if (pts.length < 3) return;
      if (area(pts) < 0) pts = pts.slice().reverse();          // counter-clockwise (x right, z down)
      const h = b.h, col = b.c || FACADES[Math.floor(hash(bi + 3) * FACADES.length)], kind = b.plain ? 0 : 1;
      let u = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length], L = Math.hypot(x2 - x1, z2 - z1);
        m.quad([x2, 0, z2], [x1, 0, z1], [x1, h, z1], [x2, h, z2], col, kind, [[u + L, 0], [u, 0], [u, h], [u + L, h]]);
        u += L;
      }
      for (const [a, bb, c] of triangulate(pts)) m.tri([pts[a][0], h, pts[a][1]], [pts[c][0], h, pts[c][1]], [pts[bb][0], h, pts[bb][1]], [0, 1, 0], C.roof, [0, 0], [0, 0], [0, 0], 0);
      if (h > 10 && !b.plain) {      // a parapet and a few chimneys break up the flat tops
        for (let k = 0; k < Math.min(3, pts.length); k++) {
          const p = pts[Math.floor(hash(bi * 7 + k) * pts.length)], q = pts[(Math.floor(hash(bi * 7 + k) * pts.length) + 1) % pts.length];
          const cx = p[0] * 0.7 + q[0] * 0.3, cz = p[1] * 0.7 + q[1] * 0.3;
          m.box(cx, h + 1, cz, 0.6, 1, 0.4, C.brick);
        }
      }
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      for (let gx = Math.floor(minX / CELL); gx <= Math.floor(maxX / CELL); gx++) for (let gz = Math.floor(minZ / CELL); gz <= Math.floor(maxZ / CELL); gz++) {
        const k = `${gx},${gz}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(pts);
      }
    });

    // street furniture along the walk: lamp posts, now and then a red phone box, bins and trees
    const R = routeInfo(data.route);
    for (let d = 8, n = 0; d < R.total; d += 26, n++) {
      const p = R.at(d), side = n % 2 ? 1 : -1, off = (data.halfWidthAt ? data.halfWidthAt(d) : 9) - 1.2;
      const x = p.x + Math.cos(p.yaw) * off * side, z = p.z - Math.sin(p.yaw) * off * side;
      if (blocked(x, z)) continue;
      m.cyl(x, 0, z, 0.09, 4.6, 0.07, C.black, 6);
      m.box(x, 4.8, z, 0.25, 0.3, 0.25, C.lamp, 0, 5);
      if (n % 9 === 4) m.box(x + Math.cos(p.yaw) * side * 1.6, 1.25, z - Math.sin(p.yaw) * side * 1.6, 0.5, 1.25, 0.5, C.red, p.yaw);
      if (n % 7 === 2) { m.cyl(x + Math.sin(p.yaw) * 2, 0, z + Math.cos(p.yaw) * 2, 0.18, 2.8, 0.15, [0.3, 0.22, 0.15], 6); m.cyl(x + Math.sin(p.yaw) * 2, 2.6, z + Math.cos(p.yaw) * 2, 1.4, 5.2, 0, [0.18, 0.34, 0.16], 8); }
    }

    // the landmarks
    for (const l of data.landmarks) (LANDMARKS[l.id] || (() => {}))(m, l);

    function blocked(x, z) {
      const list = grid.get(cellKey(x, z));
      return !!list && list.some((pts) => inside(pts, x, z));
    }
    return { mesh: m, blocked, route: R };
  }

  // ---------- landmarks, in simple shapes (my own models, not copies of photos) ----------
  const LANDMARKS = {
    // a Chinese gate: red columns, green tiled roofs, a gold sign
    chinatown(m, l) {
      const y = l.yaw || 0, c = Math.cos(y), s = Math.sin(y), P = (a) => [l.x + c * a, l.z - s * a];
      for (const a of [-3.6, -1.6, 1.6, 3.6]) { const [x, z] = P(a); m.cyl(x, 0, z, 0.32, Math.abs(a) > 2 ? 5.2 : 6.2, 0.3, C.red, 10); }
      m.box(l.x, 6.4, l.z, 4.4, 0.35, 0.7, C.red, y);
      m.box(l.x, 5.6, l.z, 1.3, 0.55, 0.3, C.gold, y, 5);
      for (const [yy, hw] of [[7.0, 5.2], [7.8, 4.2]]) { m.box(l.x, yy, l.z, hw, 0.18, 1.4, C.green, y); m.box(l.x, yy + 0.35, l.z, hw - 0.6, 0.25, 0.9, C.green, y); }
      for (const a of [-2.6, 2.6]) { const [x, z] = P(a); m.box(x, 5.6, z, 0.9, 0.35, 0.6, C.green, y); }
      m.box(l.x, 8.5, l.z, 0.4, 0.4, 0.4, C.gold, y, 5);
    },
    // the circus: a fountain with a winged archer on top, and a corner of big bright screens
    piccadilly(m, l) {
      m.cyl(l.x, 0, l.z, 3.2, 0.5, 3.2, [0.45, 0.42, 0.38], 14);
      m.cyl(l.x, 0.5, l.z, 2.2, 1.5, 1.8, [0.42, 0.36, 0.22], 12);
      m.cyl(l.x, 1.5, l.z, 0.9, 4.2, 0.6, [0.38, 0.32, 0.2], 10);
      m.cyl(l.x, 4.2, l.z, 0.45, 5.6, 0.3, [0.3, 0.42, 0.38], 8);         // the figure, green with age
      m.box(l.x - 0.6, 5.3, l.z, 0.7, 0.08, 0.2, [0.3, 0.42, 0.38], 0.4);   // the wings
      m.box(l.x + 0.6, 5.3, l.z, 0.7, 0.08, 0.2, [0.3, 0.42, 0.38], -0.4);
      if (l.screen) {        // a wall of big screens on the corner building, in six slightly angled panels
        const [sx, sz, sy, w, h] = l.screen, y = l.screenYaw || 0, c = Math.cos(y), s = Math.sin(y), parts = 6;
        const P = (a, yy, out) => [sx + c * a + s * out, yy, sz - s * a + c * out];
        for (let i = 0; i < parts; i++) {
          const a0 = -w / 2 + (w / parts) * i, a1 = a0 + w / parts, o0 = 0.15 + Math.sin((i / parts) * Math.PI) * 0.6, o1 = 0.15 + Math.sin(((i + 1) / parts) * Math.PI) * 0.6;
          m.quad(P(a0, sy, o0), P(a1, sy, o1), P(a1, sy + h, o1), P(a0, sy + h, o0), [1, 1, 1], 3, [[a0 * 10, 0], [a1 * 10, 0], [a1 * 10, h * 10], [a0 * 10, h * 10]]);
        }
        m.box(sx + s * 0.1, sy - 0.4, sz + c * 0.1, w / 2, 0.4, 0.3, [0.1, 0.1, 0.11], y);
      }
    },
    // Regent Street's curve: cream stone colonnade bases
    quadrant(m, l) { /* the buildings are coloured stone in the data; nothing extra */ },
    // a Tudor-style timbered shop front: black beams on white
    liberty(m, l) {
      const y = l.yaw || 0;
      m.box(l.x, 8, l.z, 14, 8, 0.25, [0.92, 0.9, 0.84], y);
      const c = Math.cos(y), s = Math.sin(y);
      for (let a = -13; a <= 13; a += 2.6) m.box(l.x + c * a + s * 0.3, 8, l.z - s * a + c * 0.3, 0.2, 8, 0.12, C.black, y);
      for (const yy of [4.5, 8.5, 12.5, 16]) m.box(l.x + s * 0.3, yy, l.z + c * 0.3, 14, 0.18, 0.12, C.black, y);
      m.box(l.x, 17.5, l.z, 14, 1.5, 0.9, [0.2, 0.14, 0.1], y);
    },
    // a station entrance: railings round the stairs and a plain sign
    station(m, l) {
      const y = l.yaw || 0;
      m.box(l.x, 0.01, l.z, 2.2, 0.02, 4, [0.08, 0.08, 0.09], y);
      for (const side of [-1, 1]) { const c = Math.cos(y), s = Math.sin(y); m.box(l.x + c * 2.25 * side, 0.55, l.z - s * 2.25 * side, 0.05, 0.55, 4, [0.05, 0.05, 0.06], y); }
      m.cyl(l.x, 0, l.z - 4.2, 0.08, 3, 0.08, C.black, 6);
      m.box(l.x, 3.2, l.z - 4.2, 0.9, 0.35, 0.08, [0.08, 0.1, 0.35], y, 5);
    },
    // a department store's great columns
    store(m, l) {
      const y = l.yaw || 0, c = Math.cos(y), s = Math.sin(y);
      for (let a = -36; a <= 36; a += 6) m.cyl(l.x + c * a + s * 0.8, 4.5, l.z - s * a + c * 0.8, 0.7, 20, 0.6, [0.86, 0.84, 0.78], 10);
      m.box(l.x + s * 0.9, 21, l.z + c * 0.9, 38, 1.2, 1.4, [0.86, 0.84, 0.78], y);
      m.box(l.x + s * 1.2, 5.5, l.z + c * 1.2, 1.2, 1.2, 0.3, C.gold, y, 5);   // the clock over the door
    },
    // a white marble triumphal arch
    arch(m, l) {
      const y = l.yaw || 0, c = Math.cos(y), s = Math.sin(y), W = [0.93, 0.92, 0.9];
      for (const a of [-8.5, -4.2, 4.2, 8.5]) m.box(l.x + c * a, 6, l.z - s * a, 1.4, 6, 3.2, W, y);
      for (const a of [-6.35, 6.35]) m.box(l.x + c * a, 9.5, l.z - s * a, 0.8, 2.5, 3.2, W, y);
      m.box(l.x, 10.5, l.z, 2.8, 1.5, 3.2, W, y);
      m.box(l.x, 13.3, l.z, 10.2, 1.3, 3.5, W, y);
      m.box(l.x, 14.8, l.z, 9.4, 0.4, 3.2, W, y);
      m.box(l.x, 0.05, l.z, 18, 0.05, 12, [0.3, 0.4, 0.28], y);           // the lawn around it
    },
    finish(m, l) { m.cyl(l.x, 0, l.z, 0.12, 3.4, 0.12, C.black, 6); m.box(l.x, 3.6, l.z, 1.1, 0.35, 0.06, [0.1, 0.4, 0.2], l.yaw || 0, 5); },
  };

  return { build, routeInfo, triangulate, inside, area, hash, C };
})();
window.LondonWorld = LondonWorld;
