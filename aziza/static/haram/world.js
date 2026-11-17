/* Al-Haram Walk: builds the district from the map data. Buildings, towers and minarets are extruded from their real
   outlines and heights; the mosque's ground floor is hollow so you can walk through it; the Kaaba, Hijr Ismail, Maqam
   Ibrahim and the hills of Safa and Marwa are placed on their mapped positions. Surfaces use the photo textures. */
"use strict";
const HaramWorld = (() => {
  const { Mesh } = HaramGL;
  const WARM = [1.05, 1.0, 0.92], MARBLE = [1, 1, 1], STONE = [0.93, 0.9, 0.84], CREAM = [0.88, 0.82, 0.71], GOLD = [0.95, 0.74, 0.32], BLACK = [0.04, 0.04, 0.05], SILVER = [0.8, 0.8, 0.82];
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  function inside(pts, x, z) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  const segDist = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  };
  const ringArea = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

  // ---------- the walk route ----------
  const { routeInfo } = WalkShell;

  function build(D) {
    const batches = {};
    // surfaces laid exactly on another (a skirting, a band) keep a fixed order, the real fronts nearest; doubled walls are dealt with in freeOfWall
    const LAYER = { arches: 1, hotelA: 4, hotelB: 5, hotelC: 6, hotelD: 7, glass: 9, "marble|shell": 9.4, "wall|shell": 9.5, wall: 10, plain: 11, ceiling: 12, road: 1, paver: 2, rock: 3 };
    const WINDOWS = { hotelA: [2, 4], hotelB: [6, 3], hotelC: [4, 3], hotelD: [5, 5], glass: [5, 4], abraj_tower: [6, 9], abraj_crown: [6, 10], abraj_wing: [5, 3], abraj_shaft: [3, 10], abraj_under: [8, 1], abraj_portal: [4, 8] };     // rooms across and floors up in one repeat of each photo
    const B = (tex, gloss = 0, noShadow = false) => (batches[tex] ||= { mesh: new Mesh(), tex: tex === "plain" ? null : tex.split("|")[0], gloss, noShadow, layer: LAYER[tex] || 0, win: WINDOWS[tex] });

    // ---------- the ground ----------
    const T = D.terrain, TN = T.n, TS = T.sp;
    function groundY(x, z) {
      const fx = x / TS + TN / 2, fz = z / TS + TN / 2, i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= TN - 1 || j >= TN - 1) return 0;
      const a = fx - i, b = fz - j, h = (q, r) => T.h[r * TN + q];
      return h(i, j) * (1 - a) * (1 - b) + h(i + 1, j) * a * (1 - b) + h(i, j + 1) * (1 - a) * b + h(i + 1, j + 1) * a * b;
    }
    const rock = B("rock");
    for (let j = 0; j < TN - 1; j++) for (let i = 0; i < TN - 1; i++) {
      const X = (q) => (q - TN / 2) * TS, Z = X, r = Math.hypot(X(i), Z(j));
      const P = (q, w) => [X(q), T.h[w * TN + q] - (Math.hypot(X(q), Z(w)) < 540 ? 0.5 : 0), Z(w)];
      const a = P(i, j + 1), b = P(i + 1, j + 1), c = P(i + 1, j), d = P(i, j), uv = (q, w) => [q * TS / 90, w * TS / 90];
      const tint = r < 900 ? [0.8, 0.76, 0.7] : [0.95, 0.88, 0.78];
      rock.mesh.quad(a, b, c, d, tint, [uv(i, j + 1), uv(i + 1, j + 1), uv(i + 1, j), uv(i, j)]);
    }
    const disc = (m, r0, y, col, scale, seg = 72) => {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const p = (a, r) => [Math.cos(a) * r, y, Math.sin(a) * r], n = [0, 1, 0], uv = (q) => [q[0] / scale, q[2] / scale];
        const A = p(a0, r0), C = p(a1, r0), O = [0, y, 0];
        m.tri(A, O, C, n, col, uv(A), uv(O), uv(C));
      }
    };
    disc(B("paver").mesh, 760, 0.0, [0.74, 0.71, 0.66], 7);
    disc(B("floor", 0.85).mesh, 330, 0.04, [0.74, 0.74, 0.73], 4.8);    // white marble plazas and the Mataf

    // ---------- roads ----------
    const road = B("road").mesh;
    for (const [w, lay, ped, g] of D.roads) {
      if (ped && Math.hypot(g[0][0], g[0][1]) < 340) continue;
      let u = 0;
      for (let i = 1; i < g.length; i++) {
        const a = g[i - 1], b = g[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2;
        const ya = groundY(a[0], a[1]) + 0.12 + lay * 7, yb = groundY(b[0], b[1]) + 0.12 + lay * 7;
        if (Math.hypot(a[0], a[1]) < 300 && !lay) { u += L; continue; }
        road.quad([a[0] + nx, ya, a[1] + nz], [b[0] + nx, yb, b[1] + nz], [b[0] - nx, yb, b[1] - nz], [a[0] - nx, ya, a[1] - nz], ped ? [1.25, 1.2, 1.12] : [0.82, 0.82, 0.84], [[u / 12, 0], [(u + L) / 12, 0], [(u + L) / 12, w / 12], [u / 12, w / 12]]);
        u += L;
      }
    }

    // ---------- walls that stop you ----------
    const CELL = 50, grid = new Map(), walls = new Map(), circles = new Map();
    const key = (i, j) => `${i},${j}`;
    function addTo(map, x0, z0, x1, z1, item) {
      for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
        const k = key(i, j); if (!map.has(k)) map.set(k, []); map.get(k).push(item);
      }
    }
    const addSolid = (pts, holes) => { const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]); addTo(grid, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), { pts, holes }); };
    const addWall = (a, b) => addTo(walls, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), [a, b]);
    const addPost = (x, z, r) => addTo(circles, x - r, z - r, x + r, z + r, [x, z, r]);
    function blocked(x, z) {
      const k = key(Math.floor(x / CELL), Math.floor(z / CELL));
      for (const s of grid.get(k) || []) if (inside(s.pts, x, z) && !(s.holes || []).some((h) => inside(h, x, z))) return true;
      for (const [a, b] of walls.get(k) || []) if (segDist(x, z, a, b) < 0.45) return true;
      for (const [cx, cz, r] of circles.get(k) || []) if (Math.hypot(x - cx, z - cz) < r + 0.3) return true;
      return Math.hypot(x, z) > 1000;
    }

    // ---------- extruded buildings ----------
    const HOTELS = ["hotelA", "hotelB", "hotelC", "hotelD", "abraj_wing"];
    const TILE = { abraj_wing: [18, 16], abraj_shaft: [24, 30], abraj_under: [36, 20], hotelA: [7.5, 15], hotelB: [17, 8.5], hotelC: [12, 12], hotelD: [15, 15], glass: [14, 14] };     // metres per repeat
    const ceilingY = 9.6;
    const H = D.hollow, polys = { main: H.main.o, fahd: H.fahd.o, masa: H.masa.o };
    const near = (poly, a, b) => { const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * 5, nz = (b[0] - a[0]) / L * 5; return inside(poly, mx + nx, mz + nz) || inside(poly, mx - nx, mz - nz); };
    // an edge shared by the mosque and the Fahd wing: an open passage if there's a hall on both sides, an outer wall if the plaza is on one
    const passage = (a, b) => { const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * 5, nz = (b[0] - a[0]) / L * 5, hall = (x, z) => inside(polys.main, x, z) || inside(polys.fahd, x, z); return hall(mx + nx, mz + nz) && hall(mx - nx, mz - nz); };
    // Two outlines often trace the same wall, not quite in line. Drawn twice, the two surfaces flicker as you move, whichever is
    // put in front, so each stretch of wall is drawn once: by the hall if one stands there, otherwise by the taller building.
    const WALL_CELL = 24, wallGrid = new Map(), wallCell = (x, z) => key(Math.floor(x / WALL_CELL), Math.floor(z / WALL_CELL));
    const alongWall = (a, b, L, fn) => { const n = Math.ceil(L / (WALL_CELL / 2)); for (let i = 0; i <= n; i++) fn(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); };
    function noteWall(a, b, y0, y1, rank) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.05) return;
      const rec = { a, b, y0, y1, rank, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L };
      alongWall(a, b, L, (x, z) => { const k = wallCell(x, z); let c = wallGrid.get(k); if (!c) wallGrid.set(k, c = new Set()); c.add(rec); });
    }
    // what's left to draw of a wall: [from, to, y0, y1] pieces, or null if all of it
    function freeOfWall(a, b, L, y0, y1, rank) {
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, seen = new Set(), covers = [];
      alongWall(a, b, L, (x, z) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const r of wallGrid.get(wallCell(x + i * WALL_CELL, z + j * WALL_CELL)) || []) seen.add(r); });
      for (const r of seen) {
        if (r.rank <= rank || r.y1 <= y0 || r.y0 >= y1 || ux * r.ux + uz * r.uz < 0.995) continue;
        const ta = (r.a[0] - a[0]) * ux + (r.a[1] - a[1]) * uz, tb = (r.b[0] - a[0]) * ux + (r.b[1] - a[1]) * uz, lo = Math.max(0, ta), hi = Math.min(L, tb);
        if (hi - lo < 0.2) continue;
        const pa = (r.a[0] - a[0]) * uz - (r.a[1] - a[1]) * ux, pb = (r.b[0] - a[0]) * uz - (r.b[1] - a[1]) * ux, off = (t) => Math.abs(pa + (pb - pa) * (t - ta) / (tb - ta));
        if (off(lo) < 0.6 && off(hi) < 0.6) covers.push([lo, hi, r.y0, r.y1]);
      }
      if (!covers.length) return null;
      const cuts = [...new Set([0, L, ...covers.flatMap((c) => [c[0], c[1]])])].sort((p, q) => p - q), out = [];
      for (let i = 1; i < cuts.length; i++) {
        const t0 = cuts[i - 1], t1 = cuts[i];
        let left = [[y0, y1]];
        for (const [lo, hi, c0, c1] of covers) {
          if (lo > t0 + 1e-6 || hi < t1 - 1e-6) continue;
          left = left.flatMap(([p, q]) => [[p, Math.min(q, c0)], [Math.max(p, c1), q]]).filter(([p, q]) => q - p > 0.02);
        }
        for (const [p, q] of left) out.push([t0, t1, p, q]);
      }
      return out;
    }
    function wallFace(m, a, b, y0, y1, col, sU, sV, u, rank, glow = 0, base = 0) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (const [t0, t1, p, q] of (rank === null ? null : freeOfWall(a, b, L, y0, y1, rank)) || [[0, L, y0, y1]]) {
        const A = [a[0] + (b[0] - a[0]) * t0 / L, a[1] + (b[1] - a[1]) * t0 / L], C = [a[0] + (b[0] - a[0]) * t1 / L, a[1] + (b[1] - a[1]) * t1 / L];
        m.quad([A[0], p, A[1]], [C[0], p, C[1]], [C[0], q, C[1]], [A[0], q, A[1]], col, [[(u + t0) / sU, (p - base) / sV], [(u + t1) / sU, (p - base) / sV], [(u + t1) / sU, (q - base) / sV], [(u + t0) / sU, (q - base) / sV]], glow);
      }
    }
    function wallsOf(m, ring, y0, y1, col, sU, sV, flip, glow, base = 0, rank = null, fit = false) {
      let u = 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[flip ? (i + 1) % ring.length : i], b = ring[flip ? i : (i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.01) continue;
        if (fit) wallFace(m, a, b, y0, y1, col, L / Math.max(1, Math.round(L / sU)), sV, 0, rank, glow, base);     // whole repeats on each face
        else wallFace(m, a, b, y0, y1, col, sU, sV, u, rank, glow, base);
        u += L;
      }
    }
    // which way an edge of a hall looks, and whether another hall lies beyond it (then it has no outside to draw)
    function edgeOf(ring, a, b) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      const outward = inside(ring, mx - uz * 3, mz + ux * 3) ? [uz, -ux] : [-uz, ux];
      return { outward, shared: Object.values(polys).some((r) => r !== ring && inside(r, mx + outward[0] * 3, mz + outward[1] * 3)) };
    }
    // halls outrank buildings, and where two halls trace the same wall the first one draws it
    const hallRank = (ring, i) => (ring === H.main.o ? 3e6 : ring === H.fahd.o ? 2e6 : 1e6) - i * 0.01;
    function capOf(m, P, Tr, y, col, down, sU = 8) {
      const n = down ? [0, -1, 0] : [0, 1, 0];
      for (let i = 0; i < Tr.length; i += 3) {
        const a = P[Tr[i]], b = P[Tr[i + 1]], c = P[Tr[i + 2]], Q = (p) => [p[0], y, p[1]], uv = (p) => [p[0] / sU, p[1] / sU];
        if (down) m.tri(Q(a), Q(b), Q(c), n, col, uv(a), uv(b), uv(c)); else m.tri(Q(a), Q(c), Q(b), n, col, uv(a), uv(c), uv(b));
      }
    }
    const centreOf = (o) => [o.reduce((s, p) => s + p[0], 0) / o.length, o.reduce((s, p) => s + p[1], 0) / o.length];
    const riseOf = (y0, y1, c) => { const base = y0 === 0 || Math.hypot(c[0], c[1]) > 540 ? groundY(c[0], c[1]) : 0; return [base, y0 === 0 ? Math.min(0, base - 6) : y0 + base, y1 + base]; };
    const rankOf = (top, idx) => top - idx * 1e-6;
    for (const [ring, y1, skip, inner] of [[H.main.o, H.main.y1, passage, ceilingY], [H.fahd.o, H.fahd.y1, (a, b) => near(polys.main, a, b), ceilingY], [H.masa.o, H.masa.y1, () => false, 12]]) {
      const out = ringArea(ring) > 0;
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length];
        if (skip(a, b)) return;
        if (!edgeOf(ring, a, b).shared) noteWall(out ? b : a, out ? a : b, -30, y1, hallRank(ring, i));
        noteWall(out ? a : b, out ? b : a, -30, inner, hallRank(ring, i));
      });
    }
    // The two great gates, of one design, in their own directions: u along the front from the point in the map (to your right as you face it), d out of the hall. Their
    // fronts are measured in the metres of the photo, and FU fits the width to the two minarets in the map; foot and half say where those stand, from which the towers are made to meet them.
    const GATE_F = 0.97, GATE_SIDE = 10.4, GATE_DOORS = -8.1;
    const grandGates = [["King Abdul Aziz Gate 1", [0.98, 0.198], 0.97, 0.5, -7.3, 18.2], ["King Fahd Gate - 79", [0.55, 0.835], 0.95, 0.3, -5.8, 17]].map(([key, GU, FU, mid, foot, half]) => {
      const at = D.places[key], GN = [-GU[1], GU[0]];
      return { key, GU, GN, FU, mid, foot, half, local: (x, z) => [(x - at[0]) * GU[0] + (z - at[1]) * GU[1], (x - at[0]) * GN[0] + (z - at[1]) * GN[1]], point: (u, d) => [at[0] + GU[0] * (u * FU + mid) + GN[0] * d, at[1] + GU[1] * (u * FU + mid) + GN[1] * d] };
    });
    const onGrandGate = (x, z, across, d0, d1) => grandGates.some((g) => { const [u, d] = g.local(x, z); return Math.abs(u - g.mid) < across && d > d0 && d < d1; });
    // the minarets all of one kind, on the map's same heights: drawn below as the photos show them. The map's tallest, on the King Abdullah wing, are another kind and stay as they are.
    const minarets = D.parts.filter(([y0, y1]) => y0 === 43 && y1 === 47.5).map(([, , , , , o]) => { const c = centreOf(o); return { c, ang: Math.atan2(o[0][1] - c[1], o[0][0] - c[0]) }; });
    D.parts.forEach(([y0, y1, , , , o, hs], idx) => {
      const [, bottom, top] = riseOf(y0, y1, centreOf(o)), flip = ringArea(o) < 0, rank = rankOf(top, idx);
      o.forEach((a, i) => { const b = o[(i + 1) % o.length]; noteWall(flip ? a : b, flip ? b : a, bottom, top, rank); });
      for (const hole of hs) hole.forEach((a, i) => { const b = hole[(i + 1) % hole.length]; noteWall(flip ? b : a, flip ? a : b, bottom, top, rank); });
    });
    D.parts.forEach(([y0, y1, colH, mat, roof, o, hs, P, Tr], idx) => {
      if (colH === "#23232a" && y0 > 440 && y1 < 470) return;     // the map's fixed clock hands: this clock has moving ones
      const c = [o.reduce((s, p) => s + p[0], 0) / o.length, o.reduce((s, p) => s + p[1], 0) / o.length];
      if (y0 >= 21 && y1 <= 41.5 && onGrandGate(c[0], c[1], 25, -15, 3)) return;     // the feet of their minarets are inside the gates' towers
      if (y0 >= 39 && y1 <= 85 && minarets.some((m) => Math.hypot(c[0] - m.c[0], c[1] - m.c[1]) < 8)) return;
      const dist = Math.hypot(c[0], c[1]), areaO = Math.abs(ringArea(o)), hasColour = !!colH;
      const [base, bottom, top] = riseOf(y0, y1, c);
      const col = colH ? hex(colH) : null, h = y1 - y0;
      const clockTower = Math.hypot(c[0] + 68, c[1] - 484) < 140, nearMosque = dist < 340;
      // Abraj Al Bait: its parts, by what the map says about them, get their own real walls
      const complex = c[0] > -250 && c[0] < 130 && c[1] > 300 && c[1] < 520;
      const abraj = !complex ? null : mat === "glass" && h > 100 ? "tower" : mat === "plast" && h > 100 ? "shaft" : colH === "#bba57c" && y0 === 0 ? "podium" : colH === "#544c37" ? "front" : colH === "#9e7c62" ? "under" : colH === "#787d79" || colH === "#786c57" ? "collar" : null;
      let tex = "plain", cc = col || STONE, sU = 8, sV = 8, glow = 0;
      if (clockTower && y0 > 300) { tex = "plain"; cc = colH === "#5e454b" ? [0.36, 0.27, 0.22] : col || STONE; }     // the top of the clock tower keeps the map's colours
      else if (mat === "marbl" && !clockTower && dist < 340) {     // parts of the mosque itself
        tex = y0 < 1 && areaO > 2000 ? "arches" : "wall"; cc = tex === "arches" ? [1, 1, 1] : mix(col || STONE, [0.93, 0.92, 0.89], 0.8);
        if (tex === "arches") { sU = 8.2; sV = 14; }
      } else if (areaO > 180 && (y1 > 24 || clockTower)) {
        tex = mat === "glass" ? "glass" : clockTower ? "abraj_wing" : HOTELS[Math.floor(hash(idx + 3) * HOTELS.length)];
        cc = col && !clockTower ? mix(col, [1, 1, 1], 0.6) : [1, 1, 1]; [sU, sV] = TILE[tex]; glow = 2;
      } else if (areaO > 180 && !nearMosque) {
        tex = HOTELS[Math.floor(hash(idx + 9) * 4)]; cc = [1, 1, 1]; [sU, sV] = TILE[tex]; glow = 2;
      } else if (areaO > 60 || !col) {
        tex = "wall"; cc = col ? mix(col, [1, 1, 1], 0.25) : STONE;
      }
      if (nearMosque && areaO < 400 && col && !clockTower) cc = mix(col, [0.93, 0.92, 0.89], 0.8);
      if (y0 === 21 && y1 <= 39 && minarets.some((q) => Math.hypot(c[0] - q.c[0], c[1] - q.c[1]) < 8)) { tex = "gate_marble"; cc = [0.9, 0.9, 0.88]; sU = 6; sV = 6; }     // the towers under the minarets are the gates' grey marble
      const m = B(tex).mesh, flip = ringArea(o) < 0;
      // clockwise rings in x-east, z-south read counter-clockwise from above, which is what the walls expect
      if (abraj === "tower") {
        const CROWN = 38, split = top - CROWN, WHITE = [1, 1, 1];
        wallsOf(B("abraj_tower").mesh, o, bottom, split, WHITE, 48, 32, !flip, 2, split, rankOf(top, idx), true);
        wallsOf(B("abraj_crown").mesh, o, split, top, WHITE, 48, CROWN, !flip, 2, split, rankOf(top, idx), true);
        // the crown's fins along the roof line
        for (let i = 0; i < o.length; i++) {
          const a = o[i], b = o[(i + 1) % o.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), yw = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2;
          for (let t = 1.6; t < L; t += 3.2) B("plain", 0, true).mesh.box(a[0] + (b[0] - a[0]) * t / L, top + 3, a[1] + (b[1] - a[1]) * t / L, 0.5, 3.2, 0.14, [0.84, 0.84, 0.8], yw);
        }
      }
      else if (abraj === "shaft") wallsOf(B("abraj_shaft").mesh, o, bottom, top, [1, 1, 1], 24, 30, !flip, 2, base, rankOf(top, idx), true);
      else if (abraj === "podium") wallsOf(B("abraj_wing").mesh, o, bottom, top, [1, 1, 1], 18, 16, !flip, 2, base, rankOf(top, idx), true);
      else if (abraj === "under") wallsOf(B("abraj_under").mesh, o, bottom, top, [1, 1, 1], 36, top - bottom, !flip, 0, bottom, rankOf(top, idx), true);
      else if (abraj === "front") {
        // the main front, facing the mosque, on the block the map gives it: a real photo of it on the north side, its dark stone on the others
        wallsOf(B("plain").mesh, o, bottom, top, mix(col, [0.62, 0.58, 0.52], 0.25), 8, 8, !flip, 0, base, rankOf(top, idx));
        const minZ = Math.min(...o.map((q) => q[1])), north = o.filter((q) => q[1] < minZ + 2).sort((p, q) => q[0] - p[0]), e = north[0], w = north[north.length - 1];
        const g = base + 0.05, H = Math.min(44, top - g), P = (q, y) => [q[0], g + y, q[1] - 0.3];
        B("abraj_portal").mesh.quad(P(e, 0), P(w, 0), P(w, H), P(e, H), [1, 1, 1], [[0, 0], [1, 0], [1, 1], [0, 1]], 2);
      }
      else if (abraj === "collar") wallsOf(B("plain").mesh, o, bottom, top, mix(col, [0.8, 0.76, 0.68], 0.6), 8, 8, !flip, 0, base, rankOf(top, idx));
      else {
        wallsOf(m, o, bottom, top, cc, sU, sV, !flip, glow, base, rankOf(top, idx));
        for (const hole of hs) wallsOf(m, hole, bottom, top, cc, sU, sV, flip, glow, base, rankOf(top, idx));
      }
      if (mat === "marbl" && !clockTower && dist < 340 && areaO >= 150 && top > 22 && top < 40) for (let i = 0; i < o.length; i++) {
        const a = o[i], b = o[(i + 1) % o.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), yw = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2;
        if (L > 2) B("plain").mesh.box((a[0] + b[0]) / 2, top - 0.3, (a[1] + b[1]) / 2, L / 2 + 0.2, 0.2, 0.2, [0.86, 0.83, 0.77], yw);
        for (let t = 0.8; t < L; t += 1.7) B("plain").mesh.box(a[0] + (b[0] - a[0]) * t / L, top + 0.4, a[1] + (b[1] - a[1]) * t / L, 0.34, 0.4, 0.16, STONE, yw);
      }
      if (y0 > 3 && P.length) capOf(B("plain").mesh, P, Tr, bottom, [0.6, 0.58, 0.54], true);     // the underside of whatever stands on legs
      const rc = col || (areaO > 400 ? [0.72, 0.7, 0.66] : STONE);
      if (roof === "dome" && !hs.length) {
        const r = Math.sqrt(areaO / Math.PI);
        B("plain").mesh.dome(c[0], top, c[1], r, Math.min(r * 1.2, 22), rc, 12, 4, col && col[0] > 0.8 && col[2] < 0.3 ? 0.25 : 0);
      }
      capOf(B("plain").mesh, P, Tr, top, rc, false);
      if (y0 > 0) capOf(B("plain").mesh, P, Tr, bottom, rc, true);
      if (y0 < 3 && top > base + 2 && areaO > 3) addSolid(o, hs);
    });

    // ---------- an arcade: piers and pointed arches along a line ----------
    function arcade(a, b, opts) {
      const { bay = 7.5, pier = 0.75, spring = 5.8, crown = 8.4, top = ceilingY, depth = 0.55, col = STONE, tex = "wall", post = true, lift = 0, bare = false, baseCol = [0.46, 0.45, 0.43], cap = GOLD } = opts;
      const m = B(tex).mesh, dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 1) return;
      const n = Math.max(1, Math.round(L / bay)), ux = dx / L, uz = dz / L, w = L / n, nx = -uz, nz = ux, yaw = Math.atan2(ux, uz) + Math.PI / 2;
      for (let i = 0; i <= n; i++) {
        const x = a[0] + ux * w * i, z = a[1] + uz * w * i;
        m.box(x, lift + spring / 2, z, pier, spring / 2, pier, col, yaw);
        if (!bare) B("plain").mesh.box(x, 0.45, z, pier + 0.06, 0.45, pier + 0.06, baseCol, yaw);   // the grey stone base seen in the photos
        if (!lift) B("plain").mesh.box(x, spring - 0.12, z, pier + 0.12, 0.14, pier + 0.12, cap, yaw);          // a capital
        if (post) addPost(x, z, pier);
      }
      for (let i = 0; i < n; i++) {
        const P0 = [a[0] + ux * w * i, a[1] + uz * w * i], SEG = 6, half = w / 2 - pier;
        const mid = w / 2;
        for (let k = 0; k < SEG; k++) {
          const t0 = k / SEG, t1 = (k + 1) / SEG;
          // the pointed profile: two curves meeting at the crown
          const arc = (t) => { const s = t < 0.5 ? t * 2 : (1 - t) * 2; return spring + (crown - spring) * Math.pow(Math.sin((s * Math.PI) / 2), 0.8); };
          const X = (t) => mid - half + 2 * half * t;
          const q = (d, y, side) => [P0[0] + ux * d + nx * side, lift + y, P0[1] + uz * d + nz * side];
          for (const side of [depth, -depth]) {
            const A = q(X(t0), arc(t0), side), Bb = q(X(t1), arc(t1), side), C = q(X(t1), top, side), Dd = q(X(t0), top, side);
            const uv = [[X(t0) / 4, arc(t0) / 4], [X(t1) / 4, arc(t1) / 4], [X(t1) / 4, top / 4], [X(t0) / 4, top / 4]];
            if (side > 0) m.quad(Bb, A, Dd, C, col, [uv[1], uv[0], uv[3], uv[2]]); else m.quad(A, Bb, C, Dd, col, uv);
          }
          // the underside of the arch
          const u0 = q(X(t0), arc(t0), depth), u1 = q(X(t1), arc(t1), depth), u2 = q(X(t1), arc(t1), -depth), u3 = q(X(t0), arc(t0), -depth);
          m.quad(u1, u0, u3, u2, mix(col, [0.5, 0.45, 0.4], 0.2));
        }
        // beside the arch, above the pier
        for (const [d0, d1] of [[0, pier], [w - pier, w]]) for (const side of [depth, -depth]) {
          const q = (d, y) => [P0[0] + ux * d + nx * side, lift + y, P0[1] + uz * d + nz * side];
          if (side > 0) m.quad(q(d1, spring), q(d0, spring), q(d0, top), q(d1, top), col); else m.quad(q(d0, spring), q(d1, spring), q(d1, top), q(d0, top), col);
        }
      }
    }

    // ---------- a hollow hall: floor, ceiling, shell ----------
    const gateList = (D.gates || []);
    const BAY = 8.2;     // metres from pier to pier in the arch photo
    function shell(ring, y1, opts) {
      const { gaps = [], skip = () => false, tex = "arches", sU = BAY, sV = 14, inner = ceilingY, innerSkin = null } = opts;
      const walls3 = B(tex).mesh, plain = B("wall|shell").mesh, area = ringArea(ring);
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.2 || skip(a, b)) continue;
        const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, { outward, shared } = edgeOf(ring, a, b), rank = hallRank(ring, i), skin = innerSkin ? innerSkin((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, shared, L) : null;
        // the openings on this edge
        const cuts = [];
        for (const g of gaps) {
          const t = (g[0] - a[0]) * ux + (g[1] - a[1]) * uz, d = Math.abs((g[0] - a[0]) * uz - (g[1] - a[1]) * ux);
          const c0 = Math.max(0, t - g[2] / 2), c1 = Math.min(L, t + g[2] / 2);
          if (d < 14 && c1 > c0 + 0.1) cuts.push([c0, c1, g[3]]);       // only an opening that really falls on this edge
        }
        cuts.sort((p, q) => p[0] - q[0]);
        const spans = []; let at = 0;
        for (const [c0, c1, clear] of cuts) { if (c1 <= at) continue; if (c0 > at) spans.push([at, c0, 0]); if (!clear) spans.push([Math.max(at, c0), c1, 7.6]); at = c1; }
        if (at < L) spans.push([at, L, 0]);
        for (const [s0, s1, from] of spans) {
          const A = [a[0] + ux * s0, a[1] + uz * s0], C = [a[0] + ux * s1, a[1] + uz * s1];
          const [p, q] = area > 0 ? [C, A] : [A, C];     // always face outwards
          if (!from) addWall(A, C);
          const u0 = i * 13 + s0;
          const fit = tex === "arches" && L >= 4 ? L / Math.max(1, Math.round(L / sU)) : sU, uFit = area > 0 ? L - s1 : s0;
          if (from < 14 && !shared) {
            if (from || (tex === "arches" && L < 4)) wallFace(plain, p, q, from, Math.min(14, y1), STONE, 8, 8, u0, rank);     // no piece of an arch above a doorway
            else wallFace(walls3, p, q, from, Math.min(14, y1), [1, 1, 1], fit, sV, tex === "arches" ? uFit : u0, rank);
          }
          if (y1 > 14 && !shared) {
            wallFace(plain, p, q, 14, y1, STONE, 8, 8, u0, rank);
            const n = [outward[0] * 0.18, outward[1] * 0.18], yw = Math.atan2(q[0] - p[0], q[1] - p[1]) + Math.PI / 2, span = Math.hypot(q[0] - p[0], q[1] - p[1]);
            for (const [y, h] of [[14.15, 0.15], [y1 - 0.35, 0.2]]) B("plain").mesh.box((p[0] + q[0]) / 2 + n[0], y, (p[1] + q[1]) / 2 + n[1], span / 2, h, 0.2, [0.86, 0.83, 0.77], yw);
            for (let t = 0.8; t < span; t += 1.7) { const x = p[0] + (q[0] - p[0]) * t / span, z = p[1] + (q[1] - p[1]) * t / span; B("plain").mesh.box(x, y1 + 0.4, z, 0.34, 0.4, 0.16, STONE, yw); }
          }
          // the inner face of the wall, white marble with a dark base
          if (skin && !from) {
            // whole bays on an edge; the end wall is measured in one direction instead, so a door isn't cut where it bends
            const bay = skin.whole ? L / Math.max(1, Math.round(L / skin.sU)) : skin.sU;
            wallFace(B(skin.tex).mesh, q, p, from, skin.h, [1, 1, 1], bay, skin.sV, skin.along ? (q[0] < p[0] ? q[0] : -q[0]) : skin.whole ? (area > 0 ? s0 : L - s1) : u0, rank, 0, skin.base || 0);
            wallFace(B("marble|shell").mesh, q, p, skin.h, inner, MARBLE, 6, 6, u0, rank);
          } else wallFace(B("marble|shell").mesh, q, p, from, inner, MARBLE, 6, 6, u0, rank);
          if (!from && !(skin && skin.bare)) {
            const pi = [p[0] - outward[0] * 0.03, p[1] - outward[1] * 0.03], qi = [q[0] - outward[0] * 0.03, q[1] - outward[1] * 0.03];   // the grey skirting stands proud of the wall
            wallFace(B("plain").mesh, qi, pi, 0.05, 0.85, [0.09, 0.09, 0.1], 1, 1, 0, rank);
          }
        }
        // a gilded frame around each opening
        for (const [c0, c1, clear] of cuts) {
          if (clear) continue;     // a front of its own stands here
          for (const d of [c0, c1]) {
            if (d <= 0 || d >= L) continue;
            const x = a[0] + ux * d, z = a[1] + uz * d;
            B("marble").mesh.box(x, 4.2, z, 0.9, 4.2, 0.9, MARBLE); B("plain").mesh.box(x, 0.45, z, 0.97, 0.45, 0.97, [0.09, 0.09, 0.1]);
            addPost(x, z, 0.9);
          }
          const xa = a[0] + ux * c0, za = a[1] + uz * c0, xb = a[0] + ux * c1, zb = a[1] + uz * c1, yw = Math.atan2(ux, uz) + Math.PI / 2, hw = (c1 - c0) / 2, mx = (xa + xb) / 2, mz = (za + zb) / 2;
          B("plain").mesh.box(mx, 7.0, mz, hw, 0.62, 0.16, [0.02, 0.12, 0.1], yw);
          for (const y of [6.36, 7.64]) B("plain").mesh.box(mx, y, mz, hw, 0.035, 0.2, GOLD, yw);
          B("marble").mesh.box(mx, 8.3, mz, hw, 0.62, 0.3, MARBLE, yw);
        }
      }
    }
    // floors and ceilings of the walkable halls (the Mas'a is taller)
    const G = D.places, gate = (n, w = 14, clear = false) => [G[n][0], G[n][1], w, clear];
    // the same triangles less the part over a great gate's porch, which goes up past the ceiling of the hall
    function outsideGate(P, T, g) {
      const u0 = -GATE_SIDE * g.FU + g.mid, u1 = GATE_SIDE * g.FU + g.mid, d0 = GATE_DOORS, d1 = 2;
      const side = [(q) => q[0] - u1, (q) => u0 - q[0], (q) => q[1] - d1, (q) => d0 - q[1]], Q = [], Tr = [];
      const clip = (poly, f) => { const out = []; poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length], fa = f(a[2]), fb = f(b[2]); if (fa >= 0) out.push(a); if (fa * fb < 0) { const t = fa / (fa - fb), m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; out.push([m[0], m[1], g.local(m[0], m[1])]); } }); return out; };
      const emit = (poly) => { for (let i = 1; i + 1 < poly.length; i++) { const n = Q.length; Q.push(poly[0], poly[i], poly[i + 1]); Tr.push(n, n + 1, n + 2); } };
      for (let i = 0; i < T.length; i += 3) {
        const tri = [P[T[i]], P[T[i + 1]], P[T[i + 2]]].map((p) => [p[0], p[1], g.local(p[0], p[1])]);
        if (side.some((f) => tri.every((q) => f(q[2]) >= 0))) { emit(tri); continue; }
        let rest = tri;
        for (const f of side) { emit(clip(rest, f)); rest = clip(rest, (q) => -f(q)); if (!rest.length) break; }
      }
      return [Q, Tr];
    }
    for (const name of ["main", "fahd", "masa"]) {
      const h = H[name], ceil = name === "masa" ? 12 : ceilingY;
      capOf(B("floor", 0.85).mesh, h.P, h.T, 0.06, WARM, false, 4.8);
      let cP = h.P, cT = h.T;
      if (name !== "masa") for (const g of grandGates) [cP, cT] = outsideGate(cP, cT, g);
      capOf(B("ceiling").mesh, cP, cT, ceil, [1.42, 1.5, 1.6], true, 8);     // lit from the warm floor below, so a cool tint reads as cream
      capOf(B("plain").mesh, h.P, h.T, h.y1, [0.78, 0.75, 0.7], false);
      if (ceil < h.y1) capOf(B("plain").mesh, cP, cT, ceil + 0.3, [0.5, 0.48, 0.45], false);
    }
    shell(H.main.o, H.main.y1, { gaps: [gate("King Abdul Aziz Gate 1", 22, true), gate("Bab Ajyad - Gate 3"), gate("Ajyad Gate 5"), gate("Fateh Gate"), gate("Al Quds Gate 35"), gate("Umra Gate 40"), [-160, -75, 14], [101, 62, 16], [100, 0, 14], [90, -75, 14], gate("King Fahd Gate - 79", 22, true), [-233, 58, 14], [-150, 188, 14]], skip: passage });
    shell(H.fahd.o, H.fahd.y1, { gaps: [gate("King Fahd Gate - 79", 22, true), [-233, 58, 14], [-150, 188, 14]], skip: (a, b) => near(polys.main, a, b) });
    shell(H.masa.o, H.masa.y1, { gaps: [gate("Bab Al Marwah 25", 14), gate("Al Nabi Gate 14"), gate("Bab Al Salam"), gate("22 Bani Shaibah Gate"), [101, 62, 16], [100, 0, 14], [90, -75, 14], [99, -212, 14]], skip: () => false, inner: 12,
      innerSkin: (x, z, shared, L) => (shared ? (L < 4 ? null : { tex: "masa_side", sU: 7, sV: 7, h: 7.85, whole: true, base: 0.85 }) : z < -318 ? { tex: "marwa_doors", sU: 10.2, sV: 7.6, h: 7.6, along: true, bare: true } : { tex: "masa_panel", sU: 6, sV: 7, h: 7 }) });

    // ---------- the great gates, from one straightened photo of King Abdul Aziz Gate: towers under the minarets, three open arches on white columns, a tall porch and the doors ----------
    for (const g of grandGates) {
      const { GU, GN, FU } = g, F = GATE_F, P = (u, y, d = 1.2) => { const q = g.point(u, d); return [q[0], y * F, q[1]]; }, XZ = (u, d = 1.2) => g.point(u, d);
      const SIDE = GATE_SIDE, TOWER = 24.9, INNER = 15.76, ENDS = 17.07, PANEL = 26.9, PORCH = 17, TOP = 42.3, WALL_BACK = 0.2, PANEL_BACK = -3, DOORS = GATE_DOORS, ROOM = ceilingY / F, yw = Math.atan2(GU[0], GU[1]) + Math.PI / 2;
      const BACK = g.foot - 5.7, FRONT_TOP = g.foot + 3.97, DOOR_FACE = -7.3;
      const photo = B("gate").mesh, stone = B("gate_marble").mesh, porch = B("gate_porch").mesh, GREY = [0.44, 0.43, 0.41], SUNLIT = [0.9, 0.9, 0.88], SHADED = [0.7, 0.7, 0.68], WHITE = [1.02, 1, 0.95], ROOMS = B("marble").mesh;
      const uv = (u, y) => [(u + 25.3) / 50.6, y / 43], tile = (a, b) => [a / 6, b / 6];
      // a piece of the front, with the photo on it, from a left edge to a right edge, each of which may lean
      const front = (a0, b0, y0, a1, b1, y1) => photo.quad(P(a0, y0), P(b0, y0), P(b1, y1), P(a1, y1), [1, 1, 1], [uv(a0, y0), uv(b0, y0), uv(b1, y1), uv(a1, y1)]);
      const rect = (u0, u1, y0, y1) => front(u0, u1, y0, u0, u1, y1);
      // the marble of the other faces: across its face from the outside, a to b, and up
      const across = (a, b, d, y0, y1, m = stone, col = SUNLIT, sU = 6) => m.quad(P(a, y0, d), P(b, y0, d), P(b, y1, d), P(a, y1, d), col, [[a / sU, y0 / sU], [b / sU, y0 / sU], [b / sU, y1 / sU], [a / sU, y1 / sU]]);
      const along = (u, d0, d1, y0, y1, m = stone, col = SUNLIT, sU = 6) => m.quad(P(u, y0, d0), P(u, y0, d1), P(u, y1, d1), P(u, y1, d0), col, [[d0 / sU, y0 / sU], [d1 / sU, y0 / sU], [d1 / sU, y1 / sU], [d0 / sU, y1 / sU]]);
      const lid = (u0, u1, d0, d1, y, m = stone) => m.quad(P(u0, y, d0), P(u1, y, d0), P(u1, y, d1), P(u0, y, d1), SUNLIT, [tile(u0, d0), tile(u1, d0), tile(u1, d1), tile(u0, d1)]);
      const under = (u0, u1, d0, d1, y, m, col) => m.quad(P(u0, y, d1), P(u1, y, d1), P(u1, y, d0), P(u0, y, d0), col, [tile(u0, d1), tile(u1, d1), tile(u1, d0), tile(u0, d0)]);

      // the three arches, cut through the front: how wide each is at each height, as in the photo
      const COLS = [-9.5, -3.15, 3.2, 9.56], ARCHES = [-6.3, 0.06, 6.4];
      const OPEN = [[7.8, 2.45], [9.35, 2.45], [9.5, 2.35], [9.9, 2.15], [10, 2.07], [11, 2], [11.2, 1.85], [14, 1.85], [14.5, 1.74], [15, 1.52], [15.4, 1.12], [15.7, 0.5], [15.85, 0]];
      const reveal = B("wall").mesh;
      for (let i = 0; i + 1 < OPEN.length; i++) {
        const [y0, w0] = OPEN[i], [y1, w1] = OPEN[i + 1];
        let a0 = -SIDE, a1 = -SIDE;
        for (const c of ARCHES) {
          front(a0, c - w0, y0, a1, c - w1, y1); a0 = c + w0; a1 = c + w1;
          reveal.quad(P(c - w0, y0), P(c - w0, y0, WALL_BACK), P(c - w1, y1, WALL_BACK), P(c - w1, y1), WHITE);
          reveal.quad(P(c + w0, y0, WALL_BACK), P(c + w0, y0), P(c + w1, y1), P(c + w1, y1, WALL_BACK), WHITE);
        }
        front(a0, SIDE, y0, a1, SIDE, y1);
        // the same wall from the porch
        let e0 = -SIDE, e1 = -SIDE;
        for (const c of [...ARCHES, null]) { const b0 = c === null ? SIDE : c - w0, b1 = c === null ? SIDE : c - w1; stone.quad(P(b0, y0, WALL_BACK), P(e0, y0, WALL_BACK), P(e1, y1, WALL_BACK), P(b1, y1, WALL_BACK), GREY, [tile(b0, y0), tile(e0, y0), tile(e1, y1), tile(b1, y1)]); if (c !== null) { e0 = c + w0; e1 = c + w1; } }
      }
      rect(-SIDE, SIDE, 15.85, PANEL);
      across(SIDE, -SIDE, WALL_BACK, 15.85, PORCH, stone, GREY);
      // the white columns, and the blocks over them
      for (const u of COLS) {
        const q = P(u, 0, 0.7), hw = 0.72;
        reveal.cyl(q[0], 0, q[2], 0.62, 0.45, 0.5, WHITE, 16);
        reveal.cyl(q[0], 0.45, q[2], 0.5, 7.15 * F, 0.44, WHITE, 16);
        reveal.cyl(q[0], 7.15 * F, q[2], 0.47, 7.8 * F, 0.74, WHITE, 16);
        addPost(q[0], q[2], 0.55);
        under(u - hw, u + hw, 1.2, WALL_BACK, 7.8, reveal, WHITE);
      }
      under(-SIDE, COLS[0] - 0.72, 1.2, WALL_BACK, 7.8, reveal, WHITE); under(COLS[3] + 0.72, SIDE, 1.2, WALL_BACK, 7.8, reveal, WHITE);

      // the stone either side of the arches, up to the ledge at the foot of the upper towers, and the panel between those, which stands proud of them
      rect(-TOWER, -SIDE, 0, PANEL); rect(SIDE, TOWER, 0, PANEL); rect(-ENDS, ENDS, PANEL, 38);
      // The upper towers go back and in as they rise, so as to end around the foot of the minaret. The photo's perspective makes them look further out than they are.
      const lean = (y) => 1.2 + (y - PANEL) / (TOP - PANEL) * (FRONT_TOP - 1.2), inward = (y) => (y - PANEL) / (TOP - PANEL) * (19.755 - g.half / FU);
      const out = (y) => { const K = [[PANEL, TOWER], [38.5, 24.5], [40, 24.1], [41, 23.8], [TOP, 23.75]]; for (let i = 0; i + 1 < K.length; i++) if (y <= K[i + 1][0]) return K[i][1] + (K[i + 1][1] - K[i][1]) * (y - K[i][0]) / (K[i + 1][0] - K[i][0]); return K[K.length - 1][1]; };
      const LEVELS = [PANEL, 30, 34, 38, 38.5, 38.6, 40, 41, TOP];
      for (const s of [-1, 1]) {
        const T = (u, y, d = lean(y)) => P(s * (u - inward(y)), y, d), right = s > 0, order = (a, b, c, e) => right ? [a, b, c, e] : [b, a, e, c];
        for (let i = 0; i + 1 < LEVELS.length; i++) {
          const y0 = LEVELS[i], y1 = LEVELS[i + 1], from = y0 < 38.6 ? ENDS : INNER, o0 = out(y0), o1 = out(y1), inner0 = y0 < 38 ? PANEL_BACK : lean(y0), inner1 = y1 <= 38 ? PANEL_BACK : lean(y1);
          photo.quad(...order(T(from, y0), T(o0, y0), T(o1, y1), T(from, y1)), [1, 1, 1], order(uv(s * from, y0), uv(s * o0, y0), uv(s * o1, y1), uv(s * from, y1)));
          stone.quad(...order(T(o0, y0), T(o0, y0, BACK), T(o1, y1, BACK), T(o1, y1)), SUNLIT, order(tile(0, y0), tile(BACK, y0), tile(BACK, y1), tile(0, y1)));
          stone.quad(...order(T(INNER, y0, BACK), T(INNER, y0, inner0), T(INNER, y1, inner1), T(INNER, y1, BACK)), SHADED, order(tile(BACK, y0), tile(0, y0), tile(0, y1), tile(BACK, y1)));
          stone.quad(...order(T(o0, y0, BACK), T(INNER, y0, BACK), T(INNER, y1, BACK), T(o1, y1, BACK)), SUNLIT, order(tile(o0, y0), tile(INNER, y0), tile(INNER, y1), tile(o1, y1)));
          // the end of the panel, where a tower goes back behind it
          if (y1 <= 38.6) reveal.quad(...order(P(s * ENDS, y0), P(s * ENDS, y0, lean(y0)), P(s * ENDS, y1, lean(y1)), P(s * ENDS, y1)), WHITE);
        }
        stone.quad(...order(T(INNER, TOP), T(out(TOP), TOP), T(out(TOP), TOP, BACK), T(INNER, TOP, BACK)), SUNLIT, order(tile(0, 0), tile(8, 0), tile(8, 10), tile(0, 10)));
        // the sides and the back, up to the ledge; inside the hall they're its marble
        const [ta, tb] = right ? [SIDE, TOWER] : [-TOWER, -SIDE], outer = s * TOWER, inner = s * SIDE;
        if (right) {
          along(TOWER, 1.2, 0, 0, ROOM); along(TOWER, 0, BACK, 0, ROOM, ROOMS, MARBLE); along(TOWER, 1.2, BACK, ROOM, PANEL);
          along(SIDE, BACK, DOORS, 0, ROOM, ROOMS, MARBLE); along(SIDE, DOOR_FACE, WALL_BACK, 0, PORCH, stone, GREY); along(SIDE, WALL_BACK, 1.2, 0, 7.8, reveal, WHITE); along(SIDE, BACK, DOORS, ROOM, PANEL);
        } else {
          along(-TOWER, 0, 1.2, 0, ROOM); along(-TOWER, BACK, 0, 0, ROOM, ROOMS, MARBLE); along(-TOWER, BACK, 1.2, ROOM, PANEL);
          along(-SIDE, WALL_BACK, DOOR_FACE, 0, PORCH, stone, GREY); along(-SIDE, 1.2, WALL_BACK, 0, 7.8, reveal, WHITE); along(-SIDE, DOORS, BACK, 0, ROOM, ROOMS, MARBLE); along(-SIDE, DOORS, BACK, ROOM, PANEL);
        }
        across(tb, ta, BACK, 0, ROOM, ROOMS, MARBLE); across(tb, ta, BACK, ROOM, PANEL);
        lid(right ? SIDE : -INNER, right ? INNER : -SIDE, PANEL_BACK, BACK, PANEL);
        addWall(XZ(inner), XZ(outer)); addWall(XZ(outer), XZ(outer, BACK)); addWall(XZ(inner), XZ(inner, BACK)); addWall(XZ(inner, BACK), XZ(outer, BACK));
      }
      // behind the panel, and between the towers
      across(INNER, -INNER, PANEL_BACK, PANEL, 38); lid(-ENDS, ENDS, 1.2, PANEL_BACK, 38); lid(-SIDE, SIDE, PANEL_BACK, DOORS, PANEL); across(SIDE, -SIDE, DOORS, PORCH, PANEL);
      // the parapet: its piers with their finials, and the row of pointed heads between them
      for (const [a, b] of [[-ENDS, -15.4], [-10.25, -9.15], [-3.9, -2.8], [2.8, 3.9], [9.15, 10.25], [15.4, ENDS]]) { rect(a, b, 38, 38.6); across(b, a, 0.9, 38, 38.6, stone, WHITE); lid(a, b, 1.2, 0.9, 38.6, reveal); }
      for (const u of [-16.45, -15.8, -9.7, -3.35, 3.35, 9.7, 15.8, 16.45]) { const q = P(u, 0, 1.05); reveal.cyl(q[0], 38.6 * F, q[2], 0.26, 39.1 * F, 0.2, WHITE, 8); reveal.dome(q[0], 39.1 * F, q[2], 0.22, 0.62 * F, WHITE, 8, 3); }
      const outward = [GN[0], 0, GN[1]], inwards = [-GN[0], 0, -GN[1]];
      for (const [a, b] of [[-15.4, -10.25], [-9.15, -3.9], [-2.8, 2.8], [3.9, 9.15], [10.25, 15.4]]) {
        const n = Math.round((b - a) / 0.74), w = (b - a) / n;
        for (let i = 0; i < n; i++) {
          const c = a + (i + 0.5) * w, ring = [[-0.25, 38], [0.25, 38], [0.28, 38.4], [0.14, 38.72], [0, 38.9], [-0.14, 38.72], [-0.28, 38.4]].map(([x, y]) => [c + x, y]);
          for (let k = 1; k + 1 < ring.length; k++) {
            const [A, C, E] = [ring[0], ring[k], ring[k + 1]];
            photo.tri(P(A[0], A[1]), P(C[0], C[1]), P(E[0], E[1]), outward, [1, 1, 1], uv(A[0], A[1]), uv(C[0], C[1]), uv(E[0], E[1]));
            photo.tri(P(E[0], E[1], 0.9), P(C[0], C[1], 0.9), P(A[0], A[1], 0.9), inwards, [1, 1, 1], uv(E[0], E[1]), uv(C[0], C[1]), uv(A[0], A[1]));
          }
        }
      }
      // a dark foot along the front, where the photo has the crowd's heads
      for (const [a, b] of [[-TOWER, -SIDE], [SIDE, TOWER]]) { const q = P((a + b) / 2, 0, 1.28); B("plain").mesh.box(q[0], 0.36, q[2], (b - a) / 2 * FU, 0.36, 0.09, [0.1, 0.1, 0.11], yw); }
      // King Fahd Gate's numbers on its towers, and its own sign over the other's
      if (g.key.includes("79")) {
        const marks = B("gate_fahd").mesh, mark = (u0, u1, y0, y1, a, b, c, e) => marks.quad(P(u0, y0, 1.34), P(u1, y0, 1.34), P(u1, y1, 1.34), P(u0, y1, 1.34), [1, 1, 1], [[a, c], [b, c], [b, e], [a, e]]);
        mark(-15.8, -14.2, 16.4, 18, 0, 0.5, 0.5, 1); mark(14.2, 15.8, 16.4, 18, 0.5, 1, 0.5, 1); mark(13.65, 16.35, 6.4, 10.4, 0, 0.5, 0, 0.5);
      }

      // the porch: its ceiling, then the wall with the three doors. The bay in the photo repeats across it
      under(-SIDE, SIDE, WALL_BACK, DOORS, PORCH, B("ceiling").mesh, [0.86, 0.84, 0.76]);
      const BAY_W = 6.33, DOOR_W = 1.79, DOOR_H = 4.9, BAYS = [-6.33, 0, 6.33], at = DOOR_FACE;
      const wall = (u0, u1, y0, y1) => porch.quad(P(u0, y0, at), P(u1, y0, at), P(u1, y1, at), P(u0, y1, at), [1, 1, 1], [[(u0 + BAY_W / 2) / BAY_W, y0 / PORCH], [(u1 + BAY_W / 2) / BAY_W, y0 / PORCH], [(u1 + BAY_W / 2) / BAY_W, y1 / PORCH], [(u0 + BAY_W / 2) / BAY_W, y1 / PORCH]]);
      wall(-SIDE, SIDE, DOOR_H, PORCH);
      let from = -SIDE;
      for (const c of [...BAYS, null]) {
        const to = c === null ? SIDE : c - DOOR_W;
        wall(from, to, 0, DOOR_H);
        across(c === null ? to + 0.03 : to, from === -SIDE ? from - 0.03 : from, DOORS, 0, DOOR_H, ROOMS, MARBLE);     // past the corners, so no line of gaps shows along them
        addWall(XZ(from, at), XZ(to, at)); addWall(XZ(from, DOORS), XZ(to, DOORS));
        if (c !== null) { for (const u of [c - DOOR_W, c + DOOR_W]) addWall(XZ(u, at), XZ(u, DOORS)); from = c + DOOR_W; }
      }
      across(SIDE + 0.03, -SIDE - 0.03, DOORS, DOOR_H, ROOM, ROOMS, MARBLE);
      for (const c of BAYS) {
        under(c - DOOR_W, c + DOOR_W, at, DOORS, DOOR_H, stone, GREY);
        along(c - DOOR_W, at, DOORS, 0, DOOR_H, stone, GREY); along(c + DOOR_W, DOORS, at, 0, DOOR_H, stone, GREY);
        for (const s of [-1, 1]) {
          const q = P(c + s * DOOR_W, 0, DOORS - 1.1);
          B("plain").mesh.box(q[0], DOOR_H * F / 2, q[2], 0.06, DOOR_H * F / 2, 1.05, [0.56, 0.42, 0.2], yw); addPost(q[0], q[2], 0.1);
          for (const y of [0.9, 2.05, 3.2]) B("plain").mesh.box(q[0], y, q[2], 0.08, 0.05, 1.05, [0.95, 0.78, 0.4], yw);
        }
        // a chandelier in each doorway
        const q = P(c, 0, DOORS - 2.9);
        B("plain", 0, true).mesh.cyl(q[0], 5, q[2], 0.2, 5.5, 0.6, [1, 0.82, 0.48], 10, 1.2); B("plain", 0, true).mesh.cyl(q[0], 5.5, q[2], 0.6, 5.9, 0.2, [1, 0.82, 0.48], 10, 1.2);
        B("plain").mesh.cyl(q[0], 5.9, q[2], 0.02, ceilingY, 0.02, GOLD, 4);
      }
    }

    // ---------- the minarets of this kind, as in the photos: from the top of the tower, a corbelled balcony, an open gallery under a wide flat hat with a dark rim, a tall
    // pale shaft on a carved collar with small windows at its head, a smaller balcony, gallery and hat, then a ribbed dome and a gold finial with a crescent ----------
    for (const { c: [cx, cz], ang } of minarets) {
      const M = B("gate").mesh, W = B("wall").mesh, L = B("plain").mesh, SEG = 8, TURN = Math.PI / 4, PALE = [1, 0.97, 0.9], SHAFT = [1.04, 1, 0.92], SHADOW = [0.6, 0.56, 0.48], DARK = [0.08, 0.08, 0.09];
      const at = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      // a band all the way round, from one radius and height to another (from the outside in, with both heights the same, it's a floor; from the inside out, a ceiling)
      const band = (m, y0, r0, y1, r1, col, uvs) => { for (let i = 0; i < SEG; i++) { const a0 = ang + i * TURN, a1 = a0 + TURN; m.quad(at(a1, r0, y0), at(a0, r0, y0), at(a0, r1, y1), at(a1, r1, y1), col, uvs); } };
      // bands of the carving on the gate's own front (its metres, as in the photo): the relief, the row of teeth, the parapet's pierced panel
      const carved = (u0, u1, y0, y1) => { const a = (u0 + 25.3) / 50.6, b = (u1 + 25.3) / 50.6, c = y0 / 43, e = y1 / 43; return [[b, c], [a, c], [a, e], [b, e]]; };
      const RELIEF = carved(12.6, 17.2, 18.2, 20), TEETH = carved(12.2, 15.2, 23.1, 24.4), RAIL = carved(-8.9, -4.2, 36.45, 37.9), BLOCKS = (h, w = 0.3) => [[w, 0], [0, 0], [0, h], [w, h]];
      // something flat on the middle of each side, standing just off it
      const onSide = (m, y0, y1, w, r, col, every = 1, top = 0) => { for (let i = 0; i < SEG; i += every) { const a = ang + (i + 0.5) * TURN, n = r * Math.cos(TURN / 2) + 0.1, q = (s, y) => [cx + Math.cos(a) * n - Math.sin(a) * s, y, cz + Math.sin(a) * n + Math.cos(a) * s]; m.quad(q(w, y0), q(-w, y0), q(-w, y1), q(w, y1), col); if (top) m.tri(q(w, y1), q(-w, y1), q(0, y1 + top), [Math.cos(a), 0, Math.sin(a)], col, [0, 0], [1, 0], [0.5, 1]); } };
      // columns at the corners of a gallery
      const columns = (y0, y1, r, s) => { for (let i = 0; i < SEG; i++) { const q = at(ang + i * TURN, r, 0); L.cyl(q[0], y0, q[2], s * 1.5, y0 + s * 1.5, s, PALE, 6); L.cyl(q[0], y0 + s * 1.5, q[2], s, y1 - s * 1.5, s * 0.9, PALE, 6); L.cyl(q[0], y1 - s * 1.5, q[2], s, y1, s * 1.7, PALE, 6); } };
      // a rail on a balcony's floor
      const balcony = (y, rOut, rIn, rail) => { band(L, y - 0.22, rOut, y, rOut + 0.1, PALE); band(L, y, rOut + 0.1, y, rIn, PALE); band(M, y, rOut - 0.1, y + rail, rOut - 0.1, [1, 1, 1], RAIL); band(L, y + rail, rOut - 0.04, y + rail + 0.1, rOut - 0.04, PALE); band(L, y + rail + 0.1, rOut - 0.04, y + rail + 0.1, rOut - 0.3, PALE); };
      // a wide flat hat: the underside, a thin dark rim, a low top
      const hat = (y, rIn, rOut, up, rTop) => { band(L, y, rIn, y + 0.45, rOut, PALE); band(L, y + 0.45, rOut, y + 0.7, rOut + 0.04, DARK); band(L, y + 0.7, rOut + 0.04, y + up, rTop, PALE); };

      // the lower balcony, on its corbels with their row of dark triangles
      band(M, 39, 3.97, 41, 4.05, [1, 1, 1], RELIEF);
      band(L, 41, 4.05, 42.7, 5.62, PALE);
      for (let i = 0; i < SEG; i++) {
        const a0 = ang + i * TURN, a1 = a0 + TURN, p = (t, h) => { const r = 4.05 + (5.62 - 4.05) * h + 0.1, y = 41 + 1.7 * h, A = at(a0, r, y), Z = at(a1, r, y); return [A[0] + (Z[0] - A[0]) * t, y, A[2] + (Z[2] - A[2]) * t]; }, n = [Math.cos(a0 + TURN / 2) * 0.7, -0.7, Math.sin(a0 + TURN / 2) * 0.7];
        for (let k = 0; k < 5; k++) { const t0 = (k + 0.15) / 5, t1 = (k + 0.85) / 5, tm = (t0 + t1) / 2; L.tri(p(t1, 0.2), p(t0, 0.2), p(tm, 0.72), n, DARK, [0, 0], [1, 0], [0.5, 1]); if (k < 4) L.tri(p(t1 + 0.3 / 5, 0.72), p(tm, 0.72), p(t1 + 0.1 / 5, 0.2), n, [0.2, 0.2, 0.21], [0, 0], [1, 0], [0.5, 1]); }
      }
      band(M, 42.7, 5.62, 43.2, 5.66, [1, 1, 1], TEETH);
      balcony(43.4, 5.62, 3.04, 1.05);
      // the gallery: a pale wall set back, with the columns round it
      band(W, 43.4, 3.04, 47.5, 3.04, PALE, BLOCKS(0.5));
      onSide(L, 44.7, 46.5, 0.62, 3.04, SHADOW, 1, 0.45);
      columns(44.5, 47.5, 5.1, 0.17);
      band(M, 47.5, 5.3, 48.05, 5.3, [1, 1, 1], RELIEF);
      band(L, 47.5, 3.04, 47.5, 5.3, SHADOW);
      hat(48.05, 5.3, 5.85, 1.65, 3.45);
      // the collar and the shaft, narrowing as it rises, with small windows at its head
      band(L, 49.7, 3.45, 50, 3.45, PALE); band(L, 50, 3.45, 50, 3.2, PALE);
      band(M, 50, 3.2, 51.2, 3.1, [1, 1, 1], RELIEF);
      band(L, 51.2, 3.2, 51.4, 3.2, PALE); band(L, 51.4, 3.2, 51.4, 3.04, PALE);
      band(W, 51.4, 3.04, 69.4, 2.72, SHAFT, BLOCKS(2.4));
      onSide(L, 67.2, 68.5, 0.42, 2.76, [0.2, 0.15, 0.1], 1, 0.3);
      // the upper balcony, on a carved flare
      band(M, 69.4, 2.72, 71.2, 3.9, [1, 1, 1], TEETH);
      balcony(71.4, 3.92, 1.99, 0.9);
      band(W, 71.4, 1.99, 75.6, 1.99, SHADOW, BLOCKS(0.5));
      columns(72.3, 75.6, 3.5, 0.1);
      band(L, 75.6, 1.99, 75.6, 3.65, SHADOW);
      band(M, 75.6, 3.65, 76, 3.65, [1, 1, 1], RELIEF);
      hat(76, 3.65, 4.15, 1, 2.1);
      // the dome on its neck, to the top the map gives, and above that the finial, which brings it to the 89 m the minarets are said to stand
      band(L, 77, 2.1, 78.8, 1.95, PALE); band(L, 78.8, 2.05, 79.05, 2.05, PALE); band(L, 79.05, 2.05, 79.05, 1.8, PALE);
      L.cyl(cx, 79.05, cz, 1.8, 80.5, 1.8, PALE, 16);
      L.dome(cx, 80.5, cz, 1.9, 3.8, [0.98, 0.95, 0.88], 16, 6);
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, side = (t, s) => { const r = Math.cos(t) * 1.93, y = 80.5 + Math.sin(t) * 3.83; return [cx + Math.cos(a) * r - Math.sin(a) * s, y, cz + Math.sin(a) * r + Math.cos(a) * s]; }; for (let k = 0; k < 4; k++) { const t0 = k / 4 * Math.PI / 2, t1 = (k + 1) / 4 * Math.PI / 2; L.quad(side(t0, -0.05), side(t0, 0.05), side(t1, 0.05), side(t1, -0.05), SHADOW); } }
      const gilt = [1.05, 0.8, 0.34];
      L.cyl(cx, 84.2, cz, 0.36, 84.7, 0.14, gilt, 8);
      for (const [y, r] of [[85.05, 0.34], [85.75, 0.42], [86.5, 0.34]]) { L.cyl(cx, y - r, cz, 0.05, y, r, gilt, 8); L.cyl(cx, y, cz, r, y + r, 0.05, gilt, 8); }
      L.cyl(cx, 86.8, cz, 0.1, 87.7, 0.06, gilt, 6);
      // the crescent, open to the sky and turned to the Kaaba
      const f = Math.atan2(cz, cx), tx = -Math.sin(f), tz = Math.cos(f), moon = (s, y) => [cx + tx * s, y, cz + tz * s], cy = 88.5;
      for (let k = 0; k < 10; k++) {
        const a0 = -1.2 + 2.4 * k / 10, a1 = -1.2 + 2.4 * (k + 1) / 10, o = (a) => moon(Math.sin(a) * 0.85, cy - Math.cos(a) * 0.85), n = (a) => { const r = 0.85 * (0.62 + 0.38 * Math.abs(a) / 1.2); return moon(Math.sin(a) * r, cy - Math.cos(a) * r); };
        L.quad(o(a0), o(a1), n(a1), n(a0), gilt); L.quad(n(a0), n(a1), o(a1), o(a0), gilt);
      }
    }

    // ---------- the courtyard front: open arches below, galleries above ----------
    const court = H.main.hs[0], courtArea = ringArea(court);
    for (let i = 0; i < court.length; i++) {
      const a = court[i], b = court[(i + 1) % court.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 2) continue;
      arcade(a, b, { bay: 7.5, col: MARBLE, spring: 6.2, crown: 8.9 });
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, back = inside(court, (a[0] + b[0]) / 2 - uz, (a[1] + b[1]) / 2 + ux) ? [uz, -ux] : [-uz, ux], [p, q] = courtArea > 0 ? [a, b] : [b, a];
      const yb = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2, mid = (d) => [(a[0] + b[0]) / 2 + back[0] * d, (a[1] + b[1]) / 2 + back[1] * d];
      const lit = B("plain", 0, true).mesh, [wx, wz] = mid(3);
      lit.quad([p[0] + back[0] * 3, ceilingY, p[1] + back[1] * 3], [q[0] + back[0] * 3, ceilingY, q[1] + back[1] * 3], [q[0] + back[0] * 3, H.main.y1, q[1] + back[1] * 3], [p[0] + back[0] * 3, H.main.y1, p[1] + back[1] * 3], [0.26, 0.24, 0.22], null, 0.1);
      for (const [lift, spring, crown, top] of [[ceilingY, 3.5, 5.2, 5.75], [ceilingY + 5.75, 3.3, 5, 5.65]]) {
        arcade(a, b, { bay: 7.5, pier: 0.5, spring, crown, top, depth: 0.32, col: MARBLE, post: false, lift, bare: true });
        const [fx, fz] = mid(1.5);
        B("plain").mesh.box(fx, lift - 0.05, fz, L / 2, 0.12, 1.5, [0.93, 0.91, 0.87], yb);                     // the floor of the gallery
        const [rx, rz] = mid(-0.15);
        B("wall").mesh.box(rx, lift + 0.55, rz, L / 2, 0.55, 0.14, MARBLE, yb);                                    // its parapet
      }
      const yw = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2;
      B("plain").mesh.box((a[0] + b[0]) / 2, H.main.y1 + 0.5, (a[1] + b[1]) / 2, L / 2, 0.5, 0.9, STONE, yw);
    }

    // ---------- marble columns through the halls, on a grid turned with the Kaaba ----------
    const ang = Math.atan2(5.42, 8.57), ca = Math.cos(ang), sa = Math.sin(ang), SP = 12.5;
    const clearOf = (x, z, ring, d) => ring.every((p, i) => segDist(x, z, p, ring[(i + 1) % ring.length]) > d);
    const colPts = [];
    for (let i = -34; i <= 34; i++) for (let j = -34; j <= 34; j++) {
      const x = i * SP * ca - j * SP * sa, z = i * SP * sa + j * SP * ca;
      const inMain = inside(H.main.o, x, z) && !inside(court, x, z), inFahd = inside(H.fahd.o, x, z);
      if (!inMain && !inFahd) continue;
      if (!clearOf(x, z, H.main.o, inFahd ? 0 : 4) && !inFahd) continue;
      if (!clearOf(x, z, court, 5) || !clearOf(x, z, H.fahd.o, 3.5) && inFahd) continue;
      if (onGrandGate(x, z, 26, -15, 3)) continue;
      colPts.push([x, z, i, j]);
    }
    const colSet = new Set(colPts.map(([, , i, j]) => key(i, j)));
    const yawA = Math.atan2(ca, sa) + Math.PI / 2, yawB = Math.atan2(-sa, ca) + Math.PI / 2;
    for (const [x, z, i, j] of colPts) {
      B("marble").mesh.box(x, 3.3, z, 0.95, 3.3, 0.95, MARBLE, ang);
      B("plain").mesh.box(x, 0.45, z, 1.02, 0.45, 1.02, [0.09, 0.09, 0.1], ang);
      B("plain").mesh.box(x, 6.55, z, 1.1, 0.14, 1.1, [0.86, 0.8, 0.66], ang);
      addPost(x, z, 1.2);
      if (colSet.has(key(i + 1, j))) arcade([x, z], [x + SP * ca, z + SP * sa], { bay: SP, pier: 0.95, spring: 6.6, crown: 9.1, col: MARBLE, tex: "marble", depth: 0.45, post: false, baseCol: [0.09, 0.09, 0.1], cap: [0.86, 0.8, 0.66] });
      if (colSet.has(key(i, j + 1))) arcade([x, z], [x - SP * sa, z + SP * ca], { bay: SP, pier: 0.95, spring: 6.6, crown: 9.1, col: MARBLE, tex: "marble", depth: 0.45, post: false, baseCol: [0.09, 0.09, 0.1], cap: [0.86, 0.8, 0.66] });
      // lamps hang between the columns
      if (((i + j) & 1) === 0) { const lx = x + (SP / 2) * ca - (SP / 2) * sa, lz = z + (SP / 2) * sa + (SP / 2) * ca; if (colSet.has(key(i + 1, j + 1))) { B("plain", 0, true).mesh.cyl(lx, 7.4, lz, 0.5, 8.0, 0.75, [1, 0.9, 0.7], 8, 0.9); B("plain").mesh.cyl(lx, 8.0, lz, 0.05, 9.6, 0.05, GOLD, 4); } }
    }

    // ---------- the Ottoman arcade ring around the Mataf ----------
    const ring = H.ring;
    capOf(B("plain").mesh, ring.P, ring.T, 7.4, [0.66, 0.61, 0.54], true);
    capOf(B("plain").mesh, ring.P, ring.T, 7.5, [0.92, 0.89, 0.83], false);
    for (let i = 0; i < ring.o.length; i++) {
      const a = ring.o[i], b = ring.o[(i + 1) % ring.o.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 6) continue;
      arcade(a, b, { bay: 6, pier: 0.5, spring: 4.2, crown: 6.6, top: 7.5, col: [0.94, 0.87, 0.76], depth: 0.4 });
    }
    for (let i = -14; i < 14; i++) for (let j = -14; j < 14; j++) {
      const x = i * 6, z = j * 6;
      if (inside(ring.o, x, z) && clearOf(x, z, ring.o, 1.6)) B("plain").mesh.dome(x, 7.5, z, 2.4, 2.3, [0.97, 0.96, 0.93], 8, 3);
    }

    // ---------- tall lamp posts on the plazas, as in the photos ----------
    for (let i = 0; i < 30; i++) {
      const t = (i / 30) * Math.PI * 2, x = Math.cos(t) * 235, z = Math.sin(t) * 235;
      if (inside(H.main.o, x, z) || inside(H.fahd.o, x, z) || inside(H.masa.o, x, z) || blocked(x, z)) continue;
      B("wall").mesh.cyl(x, 0, z, 0.8, 5, 0.6, MARBLE, 8);
      B("wall").mesh.cyl(x, 5, z, 0.42, 26, 0.3, MARBLE, 8);
      B("plain", 0, true).mesh.cyl(x, 26, z, 1.3, 26.5, 1.4, [1, 0.96, 0.85], 8, 1.2);
      addPost(x, z, 0.8);
    }

    // ---------- the Kaaba, on its mapped outline, sized to its measured 11.03 x 12.86 m and 13.1 m height ----------
    const K0 = D.special["950018451"].o, kc = [K0.reduce((s, p) => s + p[0], 0) / 4, K0.reduce((s, p) => s + p[1], 0) / 4], KH = 13.1;
    const Kp = K0.map((p) => [kc[0] + (p[0] - kc[0]) * 1.095, kc[1] + (p[1] - kc[1]) * 1.095]);
    const [W, N, E, S] = Kp;   // the west, north, east and south corners
    const kq = (tex, a, b, y0, y1, col = [1, 1, 1]) => B(tex).mesh.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], col, [[0, y0 / KH], [1, y0 / KH], [1, y1 / KH], [0, y1 / KH]]);
    kq("kaaba_door", E, N, 0.28, KH);
    kq("kaaba_side", S, E, 0.28, KH);
    kq("kaaba_strip", W, S, 0.28, KH);
    kq("kaaba_side", N, W, 0.28, KH);
    B("plain").mesh.quad([W[0], KH, W[1]], [S[0], KH, S[1]], [E[0], KH, E[1]], [N[0], KH, N[1]], [0.05, 0.05, 0.06]);
    addSolid(Kp, []);
    // the Shadhirwan: the sloping marble skirt at the foot
    for (const [a, b] of [[E, N], [S, E], [W, S], [N, W]]) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L, out = 0.42;
      B("wall").mesh.quad([a[0] + nx * out, 0.06, a[1] + nz * out], [b[0] + nx * out, 0.06, b[1] + nz * out], [b[0], 0.3, b[1]], [a[0], 0.3, a[1]], [0.88, 0.87, 0.85]);
      addWall([a[0] + nx * out, a[1] + nz * out], [b[0] + nx * out, b[1] + nz * out]);
    }
    // the Mizab: the golden spout on the north-west wall, over the Hijr
    { const mx = (N[0] + W[0]) / 2, mz = (N[1] + W[1]) / 2, L = Math.hypot(W[0] - N[0], W[1] - N[1]), nx = (W[1] - N[1]) / L, nz = -(W[0] - N[0]) / L;
      const spoutYaw = Math.atan2(nx, nz);
      B("plain").mesh.box(mx + nx * 1.1, KH - 0.35, mz + nz * 1.1, 0.14, 0.09, 1.15, GOLD, spoutYaw, 0.15); }
    // the Black Stone: at the east corner, 1.5 m up, in its silver frame
    { const dx = E[0] - kc[0], dz = E[1] - kc[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, x = E[0] + ux * 0.05, z = E[1] + uz * 0.05;
      const yw = Math.atan2(ux, uz), m = B("plain").mesh;
      m.box(x, 1.5, z, 0.2, 0.27, 0.05, [0.62, 0.62, 0.64], yw);
      m.box(x + ux * 0.05, 1.5, z + uz * 0.05, 0.11, 0.15, 0.03, [0.03, 0.025, 0.03], yw); }
    // Hijr Ismail: the low curved white wall on its real outline
    const hijr = D.special["315911894"];
    wallsOf(B("wall").mesh, hijr.o, 0.05, hijr.h, [1, 1, 0.98], 3, 3, ringArea(hijr.o) > 0);
    addSolid(hijr.o, []);
    // Maqam Ibrahim, as in the photos: six gold lattice panels on a marble plinth, under a flared roof, a drum, a dome and a finial
    { const c = D.special["473301379"].o, x = c.reduce((s, p) => s + p[0], 0) / c.length, z = c.reduce((s, p) => s + p[1], 0) / c.length, R = 0.74, m = B("plain").mesh;
      const brass = [0.72, 0.56, 0.26], pale = [0.84, 0.7, 0.42], at = (i, r, y) => { const t = ((i + 0.5) / 6) * Math.PI * 2; return [x + Math.cos(t) * r, y, z + Math.sin(t) * r]; };
      m.cyl(x, 0.05, z, 1.0, 0.55, 0.92, [0.88, 0.88, 0.86], 6);
      for (let i = 0; i < 6; i++) {
        B("maqam").mesh.quad(at(i + 1, R, 0.58), at(i, R, 0.58), at(i, R, 2.12), at(i + 1, R, 2.12), [1, 1, 1], [[1, 0], [0, 0], [0, 1], [1, 1]]);
        const q = at(i, R, 0); m.cyl(q[0], 0.55, q[2], 0.06, 2.16, 0.06, brass, 6, 0.1);
      }
      m.cyl(x, 0.55, z, R + 0.06, 0.6, R + 0.06, brass, 6, 0.1);
      m.cyl(x, 2.12, z, R + 0.06, 2.24, R + 0.06, brass, 6, 0.1);
      m.cyl(x, 2.24, z, R + 0.2, 2.3, R + 0.2, brass, 6, 0.1);
      m.cyl(x, 2.3, z, R + 0.2, 2.78, 0.42, pale, 6, 0.08);
      m.cyl(x, 2.78, z, 0.42, 2.88, 0.42, brass, 6, 0.1);
      m.cyl(x, 2.88, z, 0.36, 3.08, 0.36, pale, 12, 0.08);
      m.dome(x, 3.08, z, 0.36, 0.34, pale, 12, 4, 0.1);
      m.cyl(x, 3.4, z, 0.05, 3.5, 0.03, brass, 6, 0.15); m.cyl(x, 3.5, z, 0.05, 3.56, 0.02, brass, 6, 0.15); m.cyl(x, 3.56, z, 0.025, 3.8, 0.004, brass, 6, 0.15);
      addPost(x, z, 0.95); }

    // ---------- Safa and Marwa: the real rock, with a low wall round it, and the Mas'a's middle rail and green lights ----------
    function hill(p, tex, r, h, kerb) {
      const m = B(tex).mesh, x = p[0], z = p[1], seg = 28, rings = 8;
      const bump = (a, t) => 1 + 0.1 * Math.sin(a * 3 + 1 + t * 2) + 0.07 * Math.sin(a * 7 + t * 5) + 0.05 * Math.sin(a * 13 + t * 9 + 2);
      const P = (a, t) => { const b = bump(a, t), q = Math.cos(t) * r * b; return [x + Math.cos(a) * q, 0.07 + Math.sin(t) * h * b, z + Math.sin(a) * q]; };
      const uv = (a, t) => { const q = P(a, t); return [q[0] / 9, (q[2] + q[1]) / 9]; };
      for (let k = 0; k < rings; k++) for (let i = 0; i < seg; i++) {
        const t0 = (k / rings) * Math.PI / 2, t1 = ((k + 1) / rings) * Math.PI / 2, a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        m.quad(P(a1, t0), P(a0, t0), P(a0, t1), P(a1, t1), [1, 1, 1], [uv(a1, t0), uv(a0, t0), uv(a0, t1), uv(a1, t1)]);
      }
      addPost(x, z, r + 0.6);
      if (kerb) B("marble").mesh.cyl(x, 0.05, z, r + 0.6, kerb, r + 0.6, MARBLE, 18, 0, 0.5);
    }
    hill(G["As Safa"], "safa", 8, 6, 1.1); hill(G["Al Marwa"], "marwa", 12, 1.5, 0);
    // the sign that hangs where the walk from Safa begins, and reads properly from both sides
    { const x0 = 137.8, x1 = 142.2, z = 56, y0 = 6.4, y1 = 8.1, m = B("safa_sign").mesh, uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      m.quad([x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], [1, 1, 1], uv);
      m.quad([x0, y0, z + 0.06], [x1, y0, z + 0.06], [x1, y1, z + 0.06], [x0, y1, z + 0.06], [1, 1, 1], uv);
      for (const x of [x0 + 0.4, x1 - 0.4]) B("plain").mesh.box(x, (y1 + 12) / 2, z + 0.03, 0.015, (12 - y1) / 2, 0.015, [0.6, 0.6, 0.62], 0);
    }
    const mas = [[132, 62], [128, 20], [121, -40], [114, -100], [108, -165], [102, -230], [98, -278]];
    for (let i = 1; i < mas.length; i++) {
      const a = mas[i - 1], b = mas[i], yw = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      B("marble").mesh.box((a[0] + b[0]) / 2, 0.38, (a[1] + b[1]) / 2, L / 2, 0.36, 0.14, MARBLE, yw);
      B("plain").mesh.box((a[0] + b[0]) / 2, 1.02, (a[1] + b[1]) / 2, L / 2, 0.025, 0.035, SILVER, yw);
      for (let d = 2; d < L; d += 4) B("plain").mesh.box(a[0] + (b[0] - a[0]) * d / L, 0.87, a[1] + (b[1] - a[1]) * d / L, 0.025, 0.15, 0.025, SILVER, yw);
      addWall(a, b);
      // piers along each side of the walkway
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = -uz, nz = ux;
      for (let d = 0; d < L - 7; d += 14) for (const s of [-13, 13]) {
        const x = a[0] + ux * d + nx * s, z = a[1] + uz * d + nz * s;
        if (!inside(H.masa.o, x, z)) continue;
        B("marble").mesh.box(x, 6, z, 0.9, 6, 0.9, MARBLE, yw); B("plain").mesh.box(x, 0.45, z, 0.97, 0.45, 0.97, [0.09, 0.09, 0.1], yw); addPost(x, z, 1);
      }
    }
    // the green lights marking the stretch where pilgrims hasten: a band across the hall at each end of it
    const GREEN = [[[121.5, -35], [120.5, -45]], [[113.5, -105], [112.5, -115]]];
    for (const [p, q] of GREEN) for (const s of [-8, 8]) {
      const nx = 0.99, nz = -0.1, yw = Math.atan2(q[0] - p[0], q[1] - p[1]);
      B("plain", 0, true).mesh.box((p[0] + q[0]) / 2 + nx * s, 11.85, (p[1] + q[1]) / 2 + nz * s, 8, 0.06, 0.35, [0.1, 0.9, 0.3], yw, 1.6);
    }
    // the clock faces get their own dynamic hands; here, the white dials on each side of the tower
    const CL = [-68.3, 483.85], R = 20, faces = [[0, -1, 22.35, 20], [1, 0, 31.5, 18.4], [0, 1, 22.35, 20], [-1, 0, 31.5, 18.4]], clockAt = [];
    for (const [nx, nz, dist, hw] of faces) {
      const x = CL[0] + nx * dist, z = CL[1] + nz * dist, rx = -nz, rz = nx, y = 447.5, cut = (1 - hw / R) / 2;
      const q = (u, v, out = 0.25) => [x + rx * u + nx * out, y + v, z + rz * u + nz * out];
      // seen from outside the viewer's left is +r; a narrower face loses the edges of the frame, so the dial stays round
      B("clock", 0, true).mesh.quad(q(hw, -R), q(-hw, -R), q(-hw, R), q(hw, R), [1, 1, 1], [[cut, 0], [1 - cut, 0], [1 - cut, 1], [cut, 1]], 0.55);
      clockAt.push({ x, z, y, nx, nz, rx, rz });
    }
    return { list: Object.values(batches).filter((b) => b.mesh.v.length), blocked, groundY, routeInfo, inside, clockAt, kaaba: { c: kc, corners: Kp, door: G["Bab al Kaaba"] }, polys, court, columns: colPts, rail: mas, greenLights: GREEN };
  }

  return { build, routeInfo, inside, segDist };
})();
window.HaramWorld = HaramWorld;
