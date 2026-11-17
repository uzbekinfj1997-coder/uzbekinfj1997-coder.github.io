/* Masjid al-Haram, Makkah: the plaza, King Abdul Aziz Gate, the Mataf and the Kaaba, then from Safa to Marwa. This file is what's particular
   to this place: its route, pilgrims, light and clock, how its map is drawn, and its destinations. The walking itself is in walks/shell.js. */
"use strict";
(() => {
  const D = window.HaramData, W = HaramWorld, root = $("walk"), canvas = $("walkCanvas"), hud = $("walkHud");
  const { Mesh } = HaramGL;
  const STATIC = root.dataset.static;

  WalkShell.loadShared("haram-walk");
  let shell = null;
  const settings = setupSettings(root, "haram-walk", [
    { key: "time", label: "Time of day", type: "choice", default: "morning", options: [["dawn", "Dawn"], ["morning", "Morning"], ["noon", "Noon"], ["afternoon", "Afternoon"], ["sunset", "Sunset"], ["night", "Night"]] },
    { key: "crowd", label: "Pilgrims", type: "choice", default: "some", options: [["none", "None"], ["few", "A few"], ["some", "Many"], ["busy", "Crowded"], ["hajj", "Very crowded"]] },
    { key: "rounds", label: "Rounds of Tawaf on the route", type: "choice", default: 1, options: [[1, "1"], [3, "3"], [7, "7"]] },
    { key: "lengths", label: "Lengths of the Mas'a on the route", type: "choice", default: 1, options: [[1, "1"], [7, "7"]] },
    { key: "speed", label: "Walking pace", type: "choice", default: "normal", options: [["slow", "Slow"], ["normal", "Walk"], ["brisk", "Brisk"]] },
    { key: "sens", label: "Mouse sensitivity", type: "range", default: 5, min: 1, max: 10 },
    { key: "invert", label: "Invert looking up/down", type: "toggle", default: false },
    { key: "fov", label: "Field of view", type: "range", default: 70, min: 50, max: 100, unit: "°" },
    { key: "far", label: "Draw distance", type: "choice", default: 4200, options: [[1500, "Short (faster)"], [4200, "Normal"]] },
    { key: "shadows", label: "Sun shadows", type: "toggle", default: true, help: "Turn off if the walk is slow" },
    { key: "sharp", label: "Sharpness", type: "choice", default: 2, options: [[1, "Normal (faster)"], [2, "High"]] },
    { key: "map", label: "Map window", type: "toggle", default: true },
  ], { onOpen: () => shell.pause(), onChange: (v, k) => { shell.settingChanged(); if (k === "rounds" || k === "lengths") shell.setRoute(clearRoute(makeRoute()), PLACES); if (k === "time") renderer.rebake(); } });
  const S = settings.values;

  let renderer;
  try { renderer = HaramGL.create(canvas); } catch (e) { hud.textContent = "This computer's browser can't show 3D (WebGL). " + e.message; return; }
  const world = W.build(D);
  renderer.setStatic(world.list);
  const TEX = ["floor", "wall", "ceiling", "arches", "marble", "marwa_doors", "masa_panel", "masa_side", "maqam", "abraj_tower", "abraj_crown", "abraj_wing", "abraj_shaft", "abraj_under", "abraj_portal", "safa_sign", "glass", "hotelA", "hotelB", "hotelC", "hotelD", "rock", "paver", "road", "kaaba_door", "kaaba_side", "kaaba_strip", "safa", "marwa", "clock", "gate", "gate_marble", "gate_porch", "gate_fahd"];
  for (const t of TEX) renderer.loadTexture(t, `${STATIC}tex/${t}.jpg`);

  // ---------- the route: plaza, gate, Mataf, Tawaf, Safa to Marwa, out ----------
  const G = D.places, K = world.kaaba.c;
  function tawaf(rounds) {        // counter-clockwise seen from above, the Kaaba on your left, starting level with the Black Stone
    const out = [], r = 24, a0 = Math.atan2(world.kaaba.corners[2][1] - K[1], world.kaaba.corners[2][0] - K[0]), steps = 48 * rounds;
    for (let i = 0; i <= steps; i++) { const a = a0 - (i / 48) * Math.PI * 2; out.push([K[0] + Math.cos(a) * r, K[1] + Math.sin(a) * r]); }
    return out;
  }
  function makeRoute() {
    const up = [[136, 56], [130, 20], [123, -40], [116, -100], [110, -165], [104, -230], [99, -272]].map(([x, z]) => [x + 5, z]);
    const down = up.slice().reverse().map(([x, z]) => [x - 11, z]);
    const lengths = [];
    for (let i = 0; i < Number(S.lengths); i++) lengths.push(...(i % 2 === 0 ? up : down));
    const end = Number(S.lengths) % 2 ? [[110, -300], [123, -311], [136, -318]] : [[120, 80], [150, 34], [165, 28]];
    return [[-34, 252], [-38, 200], [-39.2, 171], [-37.2, 160.9], [-34.6, 148.2], [-33, 141], [-34, 118], [-28, 92], [-18, 60], [8, 32], ...tawaf(Number(S.rounds)), [34, 34], [66, 56], [94, 62], [108, 62], [126, 66], ...lengths, ...end];
  }
  // Lamps, piers and columns stand where the map puts them, so every few metres the route steps sideways round them.
  function clearRoute(pts) {
    const roomy = (x, z) => { for (let a = 0; a < 8; a++) if (world.blocked(x + Math.cos(a * Math.PI / 4) * 1.1, z + Math.sin(a * Math.PI / 4) * 1.1)) return false; return !world.blocked(x, z); };
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 3)), nx = -(bz - az) / (L || 1), nz = (bx - ax) / (L || 1);
      for (let k = i === 1 ? 0 : 1; k <= n; k++) {
        const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
        const off = [0, 1, -1, 2, -2, 3, -3, 4, -4, 6, -6, 8, -8].find((o) => roomy(x + nx * o, z + nz * o)) || 0;
        out.push([x + nx * off, z + nz * off]);
      }
    }
    return out;
  }
  const PLACES = [
    { id: "plaza", name: "The south plaza, below the clock tower", x: -34, z: 245 },
    { id: "gate", name: "King Abdul Aziz Gate", x: G["King Abdul Aziz Gate 1"][0], z: G["King Abdul Aziz Gate 1"][1] },
    { id: "mataf", name: "The Mataf, and the Kaaba", x: -18, z: 60 },
    { id: "safa", name: "As-Safa", x: G["As Safa"][0], z: G["As Safa"][1] },
    { id: "milayn", name: "The green lights", x: 118, z: -70 },
    { id: "marwa", name: "Al-Marwah", x: G["Al Marwa"][0], z: G["Al Marwa"][1] },
  ];

  function zoneName(x, z) {
    const d = Math.hypot(x - K[0], z - K[1]), P = world.polys;
    if (W.inside(P.masa, x, z)) return "The Mas'a · Safa and Marwa";
    if (W.inside(world.court, x, z)) return d < 62 ? "The Mataf" : "Courtyard of Masjid al-Haram";
    if (W.inside(P.fahd, x, z)) return "King Fahd Expansion, ground floor";
    if (W.inside(P.main, x, z)) return "Masjid al-Haram, ground floor";
    if (z > 170 && d < 420) return "South plaza · Abraj Al Bait";
    if (d < 400) return "Plaza of the Grand Mosque";
    return "Al-Haram district, Makkah";
  }

  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const rnd = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  // ---------- pilgrims ----------
  const MEN = [[0.95, 0.95, 0.92], [0.97, 0.96, 0.94], [0.92, 0.92, 0.89]], WOMEN = [[0.07, 0.07, 0.08], [0.1, 0.1, 0.12], [0.9, 0.9, 0.88], [0.45, 0.5, 0.62], [0.52, 0.42, 0.45]], OTHERS = [[0.86, 0.84, 0.78], [0.3, 0.32, 0.4], [0.78, 0.8, 0.84], [0.46, 0.38, 0.3]];
  const clothes = (ihram) => { const r = rnd(); const set = r < ihram ? MEN : r < ihram + (1 - ihram) * 0.6 ? WOMEN : OTHERS; return set[Math.floor(rnd() * set.length)]; };
  const MAX = 6000, crowdData = new Float32Array(MAX * 10), crowd = { data: crowdData, n: 0 };
  let people = [], builtFor = null;
  const CROWD = { none: [0, 0, 0, 0], few: [120, 40, 60, 80], some: [700, 200, 180, 250], busy: [1800, 450, 450, 500], hajj: [3300, 800, 750, 700] };
  const hallSpots = [];   // people sitting in rows on the ground floor, facing the Kaaba
  function buildCrowd() {
    const [tawafN, saiN, walkN, seatN] = CROWD[S.crowd] || CROWD.some;
    people = [];
    for (let i = 0; i < tawafN; i++) {
      const u = rnd(), r = 11 + 48 * Math.pow(u, 1.5);
      people.push({ t: 0, a: rnd() * 6.283, r, w: (0.8 + rnd() * 0.5) / r, col: clothes(0.72), ph: rnd() * 6, h: 0.9 + rnd() * 0.2 });
    }
    const mas = [[132, 62], [128, 20], [121, -40], [114, -100], [108, -165], [102, -230], [98, -278]];
    const mR = W.routeInfo(mas);
    for (let i = 0; i < saiN; i++) people.push({ t: 1, s: rnd() * mR.total, d: rnd() < 0.5 ? 1 : -1, off: 2 + rnd() * 9, v: 0.9 + rnd() * 0.6, col: clothes(0.7), ph: rnd() * 6, h: 0.9 + rnd() * 0.2, R: mR });
    // walking to and from the gates and across the plazas
    const walks = [[[-37, 290], [-37, 160], [-30, 100]], [[21, 240], [21, 158], [18, 100]], [[67, 220], [68, 132], [45, 70]], [[33, -240], [33, -167], [20, -95]], [[-96, -210], [-96, -146], [-60, -70]], [[-235, 150], [-223, 140], [-100, 40]], [[-120, 330], [-37, 230], [60, 260]], [[-60, 220], [40, 235], [120, 180]]];
    const wR = walks.map((w) => W.routeInfo(w));
    for (let i = 0; i < walkN; i++) { const q = wR[Math.floor(rnd() * wR.length)]; people.push({ t: 2, s: rnd() * q.total, d: rnd() < 0.5 ? 1 : -1, off: (rnd() - 0.5) * 12, v: 1 + rnd() * 0.5, col: clothes(0.6), ph: rnd() * 6, h: 0.9 + rnd() * 0.2, R: q }); }
    // sitting in rows in the arches around the courtyard
    if (!hallSpots.length) {
      for (let k = 0; k < 2600 && hallSpots.length < 900; k++) {
        const a = rnd() * 6.283, d = 85 + rnd() * 70, x = K[0] + Math.cos(a) * d, z = K[1] + Math.sin(a) * d;
        if (W.inside(world.polys.main, x, z) && !W.inside(world.court, x, z) && !world.blocked(x, z)) hallSpots.push([x, z, Math.atan2(-(K[0] - x), -(K[1] - z))]);
      }
    }
    for (let i = 0; i < Math.min(seatN, hallSpots.length); i++) { const [x, z, yaw] = hallSpots[i]; people.push({ t: 3, x, z, yaw, col: clothes(0.55), ph: rnd() * 6, h: 0.62 }); }
    builtFor = S.crowd;
  }
  // Tawaf keeps clear of the Kaaba, Hijr Ismail and the Maqam
  const HIJR_A = Math.atan2(-12 - K[1], -8 - K[0]);
  function tawafR(p) {
    const da = wrap(p.a - HIJR_A), extra = Math.abs(da) < 0.95 ? 8 * (1 - Math.abs(da) / 0.95) : 0;
    return Math.max(p.r + extra, Math.abs(da) < 0.95 ? 18 : 11);
  }
  function stepCrowd(dt) {
    if (builtFor !== S.crowd) buildCrowd();
    let n = 0;
    for (const p of people) {
      let x, z, yaw, mv = 1;
      if (p.t === 0) {
        p.a -= p.w * dt;        // counter-clockwise from above
        const r = tawafR(p); x = K[0] + Math.cos(p.a) * r; z = K[1] + Math.sin(p.a) * r;
        // walking along the circle: forward for a yaw is (-sin yaw, -cos yaw), the same for the figures as for you
        const tx = Math.sin(p.a), tz = -Math.cos(p.a); yaw = Math.atan2(-tx, -tz);
      } else if (p.t === 3) { x = p.x; z = p.z; yaw = p.yaw; mv = 0; }
      else {
        p.s += p.d * p.v * dt; const T = p.R.total;
        if (p.s > T) { p.s = T; p.d = -1; } if (p.s < 0) { p.s = 0; p.d = 1; }
        const q = p.R.at(p.s), rx = Math.cos(q.yaw), rz = -Math.sin(q.yaw), side = p.t === 1 ? p.d * p.off : p.off;   // keep to one side of the rail
        x = q.x + rx * side; z = q.z + rz * side; yaw = p.d > 0 ? q.yaw : q.yaw + Math.PI;
      }
      if (Math.abs(x - shell.me.x) < 0.7 && Math.abs(z - shell.me.z) < 0.7) continue;
      const o = n * 10;
      crowdData[o] = x; crowdData[o + 1] = 0.06; crowdData[o + 2] = z; crowdData[o + 3] = yaw;
      crowdData[o + 4] = p.col[0]; crowdData[o + 5] = p.col[1]; crowdData[o + 6] = p.col[2]; crowdData[o + 7] = p.ph; crowdData[o + 8] = p.h; crowdData[o + 9] = mv;
      if (++n >= MAX) break;
    }
    crowd.n = n;
  }

  // ---------- the light through the day ----------
  const sun = (az, el) => { const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]; };
  const LOOKS = {
    dawn: { sunDir: sun(100, 8), sunCol: [1.2, 0.72, 0.42], skyAmb: [0.34, 0.36, 0.44], groundAmb: [0.2, 0.17, 0.15], fog: [0.82, 0.68, 0.58], skyTop: [0.32, 0.44, 0.62], sunGlow: [1, 0.6, 0.35], fogD: 0.00028, night: 0.25 },
    morning: { sunDir: sun(110, 38), sunCol: [2.1, 1.92, 1.62], skyAmb: [0.52, 0.53, 0.55], groundAmb: [0.36, 0.32, 0.27], fog: [0.8, 0.84, 0.88], skyTop: [0.24, 0.45, 0.74], sunGlow: [1, 0.9, 0.7], fogD: 0.00013, night: 0 },
    noon: { sunDir: sun(200, 72), sunCol: [2.3, 2.15, 1.86], skyAmb: [0.55, 0.57, 0.6], groundAmb: [0.4, 0.36, 0.3], fog: [0.84, 0.87, 0.9], skyTop: [0.22, 0.44, 0.76], sunGlow: [1, 0.95, 0.8], fogD: 0.00014, night: 0 },
    afternoon: { sunDir: sun(255, 35), sunCol: [2.1, 1.82, 1.42], skyAmb: [0.45, 0.48, 0.56], groundAmb: [0.34, 0.29, 0.24], fog: [0.86, 0.82, 0.76], skyTop: [0.26, 0.44, 0.7], sunGlow: [1, 0.85, 0.6], fogD: 0.00016, night: 0 },
    sunset: { sunDir: sun(285, 7), sunCol: [1.5, 0.78, 0.38], skyAmb: [0.36, 0.33, 0.4], groundAmb: [0.24, 0.18, 0.16], fog: [0.92, 0.66, 0.46], skyTop: [0.28, 0.32, 0.54], sunGlow: [1, 0.55, 0.25], fogD: 0.00024, night: 0.35 },
    night: { sunDir: [0.2, 0.75, 0.35].map((v) => v / Math.hypot(0.2, 0.75, 0.35)), sunCol: [0.05, 0.06, 0.09], skyAmb: [0.07, 0.08, 0.12], groundAmb: [0.06, 0.05, 0.05], fog: [0.07, 0.08, 0.13], skyTop: [0.015, 0.025, 0.06], sunGlow: [0, 0, 0], fogD: 0.00032, night: 1 },
  };
  function look() { const L = LOOKS[S.time] || LOOKS.morning; return { ...L, shadows: S.shadows, dprMax: Number(S.sharp) }; }

  // the clock on the tower tells the real time in Makkah (UTC+3)
  function clockHands(m) {
    const now = new Date(Date.now() + 3 * 3600 * 1000), mins = now.getUTCMinutes() + now.getUTCSeconds() / 60, hrs = (now.getUTCHours() % 12) + mins / 60;
    for (const f of world.clockAt) {
      const hand = (ang, len, wid, col) => {
        const sx = Math.sin(ang), cy = Math.cos(ang), ax = f.x + f.nx * 0.7, az = f.z + f.nz * 0.7;
        // seen from outside, the viewer's right is -r, and the hands turn clockwise
        const P = (u, v) => [ax - f.rx * (sx * v + cy * u), f.y + cy * v - sx * u, az - f.rz * (sx * v + cy * u)];
        m.quad(P(-wid, -2), P(wid, -2), P(wid, len), P(-wid, len), col);
      };
      hand((hrs / 12) * Math.PI * 2, 12, 0.7, [0.03, 0.03, 0.04]);
      hand((mins / 60) * Math.PI * 2, 18, 0.4, [0.03, 0.03, 0.04]);
    }
  }

  // ---------- its map ----------
  const INK = { ground: "#1d2228", road: "#343c47", block: "#4a525e", blockEdge: "#646d7a", hall: "#c0c5cb", wall: "#0d1014", column: "rgba(40,46,54,.55)", masa: "#b9dcc8", rail: "#55806a", court: "#f4f0e6", courtEdge: "#8d8778", mataf: "#fcfbf6", arcade: "#dcc9a2", arcadeEdge: "#a08e6c", rock: "#8b6f55", gold: "#d7ae3c", green: "#14b45a" };
  const special = (id) => D.special[id].o, centre = (o) => [o.reduce((t, q) => t + q[0], 0) / o.length, o.reduce((t, q) => t + q[1], 0) / o.length];
  const MAQAM = centre(special("473301379")), HIJR = centre(special("315911894"));
  // [name, x, z, radius of what it names in metres, shown from this many pixels per metre, up to this many]
  const MAP_PLACES = [["The Kaaba", K[0], K[1], 9, 0], ["As-Safa", ...G["As Safa"], 8, 0], ["Al-Marwah", ...G["Al Marwa"], 12, 0], ["Makkah Clock", ...G["Makkah Clock"], 3, 0],
    ["Maqam Ibrahim", ...MAQAM, 1.2, 1.8], ["Hijr Ismail", ...HIJR, 5, 1.8], ["Black Stone", ...world.kaaba.corners[2], 0.8, 3.2], ["Green lights", 118, -75, 14, 1]];
  const GATE_NAME = (key) => key.replace(/^\d+\s+/, "").replace(/\s*-?\s*(Gate\s*)?\d+$/, (m) => (/gate/i.test(m) ? " Gate" : "")).replace(/\s+-\s*$/, "");
  const MAP_GATES = [["King Abdul Aziz Gate 1", 0.2], ["King Fahd Gate - 79", 0.2], ["Umra Gate 40", 0.2], ["Fateh Gate", 0.2], ["King Abdullah Gate -100", 0.2], ["Al Nabi Gate 14", 0.2], ["Bab Al Salam", 0.2], ["Bab Al Marwah 25", 0.2], ["Bab Ajyad - Gate 3", 0.4], ["Al Quds Gate 35", 0.4], ["22 Bani Shaibah Gate", 0.4], ["Ajyad Gate 5", 0.7], ["Bab al-Hudaybiyah", 0.7], ["Quraish Gate", 0.7]].map(([key, from]) => [GATE_NAME(key), ...G[key], from]);
  const MAP_AREAS = [["THE MATAF", K[0] - 2, K[1] + 36, 1.1, 4], ["PRAYER HALLS", -30, 122, 0.55, 3], ["KING FAHD EXPANSION", -165, 95, 0.4, 3], ["THE MAS'A", 112, -175, 0.5, 4], ["SOUTH PLAZA", -34, 225, 0.3, 3], ["ABRAJ AL BAIT", -68, 400, 0.2, 3], ["KING ABDULLAH EXPANSION", -160, -225, 0.2, 3]];
  const onHall = (x, z) => W.inside(world.court, x, z) || W.inside(world.polys.main, x, z) || W.inside(world.polys.fahd, x, z) || W.inside(world.polys.masa, x, z);

  function paintMap({ g, P, trace, seen, s, w, h }) {
        g.fillStyle = INK.ground; g.fillRect(0, 0, w, h);
        g.strokeStyle = INK.road;
        for (const [width, , , pts] of D.roads) if (seen(pts)) { g.lineWidth = Math.max(1.5, width * s); trace(pts, false); g.stroke(); }
        g.fillStyle = INK.block; g.strokeStyle = INK.blockEdge; g.lineWidth = 1;
        for (const p of D.parts) if (p[0] === 0 && seen(p[5])) { trace(p[5]); g.fill(); g.stroke(); }
        // the halls you can walk through: one dark outline round all three, then the floors, which hide it where they join
        const halls = [[D.hollow.main.o, INK.hall], [D.hollow.fahd.o, INK.hall], [D.hollow.masa.o, INK.masa]];
        g.strokeStyle = INK.wall; g.lineWidth = 3; for (const [o] of halls) { trace(o); g.stroke(); }
        for (const [o, col] of halls) { g.fillStyle = col; trace(o); g.fill(); }
        if (s >= 0.8) { g.fillStyle = INK.column; const r = Math.min(2.4, 0.8 * s); for (const [x, z] of world.columns) { const [a, b] = P(x, z); if (a > 0 && a < w && b > 0 && b < h) { g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); } } }
        g.fillStyle = INK.court; g.strokeStyle = INK.courtEdge; g.lineWidth = 1.5; trace(world.court); g.fill(); g.stroke();
        g.fillStyle = INK.arcade; g.strokeStyle = INK.arcadeEdge; g.lineWidth = 1; trace(D.hollow.ring.o); g.fill(); g.stroke();
        // the Mataf, the open marble round the Kaaba
        { const [a, b] = P(K[0], K[1]); g.fillStyle = INK.mataf; g.strokeStyle = "rgba(141,135,120,.7)"; g.lineWidth = 1; g.beginPath(); g.arc(a, b, 58 * s, 0, Math.PI * 2); g.fill(); g.stroke(); }
        // the Mas'a: its middle rail, and the stretch marked by green lights
        if (s >= 0.5) { g.strokeStyle = INK.rail; g.lineWidth = Math.max(1, 0.5 * s); trace(world.rail, false); g.stroke(); }
        g.strokeStyle = INK.green; g.lineWidth = Math.max(2, 1.2 * s);
        for (const [p, q] of world.greenLights) { const x = (p[0] + q[0]) / 2, z = (p[1] + q[1]) / 2; trace([[x - 15.8, z + 1.6], [x + 15.8, z - 1.6]], false); g.stroke(); }
        // the rocks, the Hijr, the Maqam and the Kaaba
        g.fillStyle = INK.rock; g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1;
        for (const [q, r] of [[G["As Safa"], 8], [G["Al Marwa"], 12]]) { const [a, b] = P(q[0], q[1]); g.beginPath(); g.arc(a, b, Math.max(3, r * s), 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.fillStyle = "#fff"; g.strokeStyle = "#6d6a60"; g.lineWidth = Math.max(1, 0.8 * s); trace(special("315911894")); g.fill(); g.stroke();
        { const [a, b] = P(MAQAM[0], MAQAM[1]), r = Math.max(2, 1.2 * s); g.fillStyle = INK.gold; g.strokeStyle = "#6e5413"; g.lineWidth = 1; g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.fillStyle = "#000"; trace(world.kaaba.corners); g.fill();
        { const [, N, E] = world.kaaba.corners, D0 = [E[0] + (N[0] - E[0]) * 0.24, E[1] + (N[1] - E[1]) * 0.24], D1 = [E[0] + (N[0] - E[0]) * 0.42, E[1] + (N[1] - E[1]) * 0.42];
          if (s >= 1) { g.strokeStyle = INK.gold; g.lineWidth = Math.max(1.5, 0.5 * s); trace([D0, D1], false); g.stroke(); }     // its door
          if (s >= 3) { const [a, b] = P(E[0], E[1]); g.fillStyle = "#d9dadd"; g.strokeStyle = "#000"; g.lineWidth = 1; g.beginPath(); g.arc(a, b, 3.5, 0, Math.PI * 2); g.fill(); g.stroke(); } }     // and the Black Stone in its silver frame
  }

  // ---------- the list of destinations ----------
  const [, KN, KE, KS] = world.kaaba.corners;
  const awayFromK = (q, d) => { const L = Math.hypot(q[0] - K[0], q[1] - K[1]); return [q[0] + ((q[0] - K[0]) / L) * d, q[1] + ((q[1] - K[1]) / L) * d]; };
  const DOOR = [KE[0] + (KN[0] - KE[0]) * 0.33, KE[1] + (KN[1] - KE[1]) * 0.33], DOOR_N = (() => { const L = Math.hypot(KN[0] - KE[0], KN[1] - KE[1]); return [-(KN[1] - KE[1]) / L, (KN[0] - KE[0]) / L]; })();
  const offDoor = (d) => [DOOR[0] + DOOR_N[0] * d, DOOR[1] + DOOR_N[1] * d];
  const { place } = WalkShell;
  // the way out of the wall a gate stands in, square to the wall where the mosque's outline is close
  function outOfWall(q) {
    let best = 12, n = null;
    for (const ring of Object.values(world.polys)) ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 3) return;
      const d = W.segDist(q[0], q[1], a, b);
      if (d >= best) return;
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, hall = (x, z) => Object.values(world.polys).some((o) => W.inside(o, x, z));
      const out = !hall(q[0] + uz * 6, q[1] - ux * 6) ? [uz, -ux] : !hall(q[0] - uz * 6, q[1] + ux * 6) ? [-uz, ux] : null;
      if (out) { best = d; n = out; }
    });
    if (n) return n;
    const L = Math.hypot(q[0] - K[0], q[1] - K[1]);
    return [(q[0] - K[0]) / L, (q[1] - K[1]) / L];
  }
  const gatePlace = (name, key, out = 3, stand = 22, tip = 5, size = 1.2) => { const q = G[key], n = outOfWall(q); return place(name, [q[0] + n[0] * stand, q[1] + n[1] * stand], [q[0] + n[0] * out, q[1] + n[1] * out], tip, size, 5); };
  const DESTINATIONS = [
    ["The Kaaba and the Mataf", [
      place("The Kaaba", [K[0] + 32, K[1] + 13], K, 16.9, 1.4, 13),      // far enough back to see the arrow over its roof
      place("The Mataf", awayFromK([K[0] - 24, K[1] + 26], 30), awayFromK([K[0] - 24, K[1] + 26], -5), 3, 1.4, 58, { ring: K }),
      place("The door of the Kaaba", (() => { const q = offDoor(9), L = Math.hypot(KN[0] - KE[0], KN[1] - KE[1]); return [q[0] + ((KN[0] - KE[0]) / L) * 3.5, q[1] + ((KN[1] - KE[1]) / L) * 3.5]; })(), offDoor(0.5), 5.3, 0.8, 1.6, { ring: offDoor(1.1) }),
      place("The Black Stone", awayFromK(KE, 6), awayFromK(KE, 0.3), 1.9, 0.45, 0.9),
      place("The Yemeni corner", awayFromK(KS, 9), awayFromK(KS, 0.3), 3.2, 0.7, 1.2),
      place("Maqam Ibrahim", awayFromK(MAQAM, 7), MAQAM, 4.1, 0.7, 1.6),
      place("Hijr Ismail", awayFromK(HIJR, 15), HIJR, 1.7, 0.9, 7.4),
      place("The arcade around the Mataf", [-10, 50], [-7, 73], 8.2, 1.2, 3.5, { ring: [-7.5, 70.5] })]],
    ["Safa and Marwa", [
      place("As-Safa", [122, 54], G["As Safa"], 7.6, 1, 9.6),
      place("The green lights", [128, -12], [129, -41], 11.4, 1.4, 5, { up: true }),
      place("Al-Marwah", [92, -268], G["Al Marwa"], 2.6, 1, 12.6)]],
    ["Inside the mosque", [
      place("The prayer halls", [-47.6, 110.3], [-34.2, 89.2], 3.2, 1, 3.5),
      place("King Fahd Expansion", [-162.6, 82], [-149.3, 60.9], 3.2, 1, 3.5),
      place("Inside King Abdul Aziz Gate", [-33, 128], [-34.3, 146.7], 4.8, 0.9, 3)]],
    ["The gates, from outside", [
      gatePlace("King Abdul Aziz Gate", "King Abdul Aziz Gate 1", 7, 58, 6.2, 1.8), gatePlace("King Fahd Gate", "King Fahd Gate - 79", 7, 58, 6.2, 1.8), gatePlace("Umra Gate", "Umra Gate 40"), gatePlace("Al Quds Gate", "Al Quds Gate 35"), gatePlace("Fateh Gate", "Fateh Gate"),
      gatePlace("King Abdullah Gate", "King Abdullah Gate -100", 3, 36, 6, 1.6), gatePlace("Bab Ajyad", "Bab Ajyad - Gate 3"), gatePlace("Al Nabi Gate", "Al Nabi Gate 14"), gatePlace("Bab Al Salam", "Bab Al Salam"), gatePlace("Bani Shaibah Gate", "22 Bani Shaibah Gate")]],
    ["Around the mosque", [
      place("The south plaza", [-34, 240], [-34, 222], 3, 1, 6),
      place("Abraj Al Bait, the main entrance", [-66, 280], [-65.5, 309], 12.5, 1.6, 8),
      place("The eastern plaza", [200, 40], [184, 40], 3, 1, 6),
      place("The northern plaza", [44, -225], [44, -208], 3, 1, 6)]],
  ];

  shell = WalkShell.start({
    id: "haram-walk", S, settings, renderer, Mesh, eye: 1.66, pace: { slow: 1.0, normal: 1.4, brisk: 1.9 },
    paint: { quad: (m, a, b, c, d, col) => m.quad(a, b, c, d, col, null, 1.1), cyl: (m, x, y0, z, r0, y1, r1, col, seg) => m.cyl(x, y0, z, r0, y1, r1, col, seg, 1.1) },
    world, route: clearRoute(makeRoute()), marks: PLACES, zoneName, destinations: DESTINATIONS, photos: window.HaramPhotos || [],
    update: stepCrowd, idle: () => { if (!crowd.n) stepCrowd(0.01); }, dyn: (m) => clockHands(m), frame: (cam, dyn, time) => renderer.frame(cam, look(), dyn, crowd, time),
    arrivalYaw: (x, z) => (W.inside(world.court, x, z) ? Math.atan2(x - K[0], z - K[1]) : null),     // in the courtyard you arrive facing the Kaaba
    state: () => ({ people: crowd.n, triangles: renderer.triangles(), pendingTextures: renderer.pendingTextures() }),
    map: { paint: paintMap, places: MAP_PLACES, gates: MAP_GATES, areas: MAP_AREAS, light: onHall, r: 240, rMax: 1100, view: { x: 0, z: 40, r: 480 }, reach: [-1000, -1000, 1000, 1000] },
    menu: { title: "Masjid al-Haram", text: "Walk through Masjid al-Haram in Makkah: from the plaza below the clock tower, through King Abdul Aziz Gate to the Mataf and the Kaaba, then from Safa to Marwa. Streets, buildings and heights come from OpenStreetMap; surfaces use real photographs.",
      credit: "Map © OpenStreetMap contributors. Photos: Panoramax contributors (CC BY-SA 4.0) and Wikimedia Commons authors; each photo shows its credit. Surfaces: Danil / Panoramax (CC BY-SA 4.0); from Wikimedia Commons, Abdullah Shakoor (CC0), M sh شراونة محمد (CC BY-SA 4.0), HolyArtThou (CC BY-SA 4.0), معتز توفيق اغبارية (CC BY-SA 3.0), Ez-17-93 (CC BY-SA 3.0), King Eliot (CC BY-SA 3.0), Tevfik Teker (CC BY 3.0: the fronts of King Abdul Aziz and King Fahd Gates, straightened, in part mirrored). Elevation: Terrarium tiles, AWS Open Data. Figures and some details are simple models, so this is an impression, not an exact record." },
  });
  Object.assign(shell, { stepCrowd, crowd });
})();
