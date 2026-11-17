/* The West End, London: a rainy walk from Chinatown to Edgware Road, with buses, black cabs and people with umbrellas. This file is what's
   particular to this place: its traffic, rain and sky, how its map is drawn, and its destinations. The walking itself is in walks/shell.js. */
"use strict";
(() => {
  const D = window.LondonData, W = LondonWorld, root = $("walk"), canvas = $("walkCanvas"), hud = $("walkHud");
  const { Mesh } = LondonGL;

  WalkShell.loadShared("london-walk");
  let shell = null;
  const settings = setupSettings(root, "london-walk", [
    { key: "weather", label: "Weather", type: "choice", default: "rain", options: [["dry", "Dry"], ["drizzle", "Drizzle"], ["rain", "Rain"], ["heavy", "Heavy rain"]] },
    { key: "time", label: "Time of day", type: "choice", default: "day", options: [["day", "Grey day"], ["dusk", "Dusk"], ["night", "Night"]] },
    { key: "speed", label: "Walking pace", type: "choice", default: "normal", options: [["slow", "Slow"], ["normal", "Walk"], ["brisk", "Brisk"]] },
    { key: "traffic", label: "Buses and cabs", type: "toggle", default: true },
    { key: "crowd", label: "People", type: "choice", default: "some", options: [["none", "None"], ["few", "A few"], ["some", "Some"], ["busy", "Busy"]] },
    { key: "sens", label: "Mouse sensitivity", type: "range", default: 5, min: 1, max: 10 },
    { key: "invert", label: "Invert looking up/down", type: "toggle", default: false },
    { key: "fov", label: "Field of view", type: "range", default: 75, min: 55, max: 100, unit: "°" },
    { key: "far", label: "Draw distance", type: "choice", default: 450, options: [[250, "Short (faster)"], [450, "Normal"], [800, "Far"]] },
    { key: "map", label: "Map window", type: "toggle", default: true },
  ], { onOpen: () => shell.pause(), onChange: () => shell.settingChanged() });
  const S = settings.values;

  let renderer;
  try { renderer = LondonGL.create(canvas); } catch (e) { hud.textContent = "This computer's browser can't show 3D (WebGL). " + e.message; return; }
  const world = W.build(D), R = world.route;
  renderer.setStatic(world.mesh);
  world.groundY = () => 0;

  // ---------- street names, looked up from a grid of street points ----------
  const names = new Map(), NC = 30;
  for (const s of D.streets) if (s.name) for (const [x, z] of s.pts) { const k = `${Math.floor(x / NC)},${Math.floor(z / NC)}`; if (!names.has(k)) names.set(k, []); names.get(k).push([x, z, s.name]); }
  const onWalk = new Set(D.streetsOrder);
  function streetName(x, z) {      // the walk's own streets win over side streets at junctions
    let best = null, bd = 40;
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) for (const [px, pz, n] of names.get(`${Math.floor(x / NC) + gx},${Math.floor(z / NC) + gz}`) || []) {
      const d = Math.hypot(px - x, pz - z) + (onWalk.has(n) ? 0 : 14); if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  const traffic0 = R.nearest(D.landmarks.find((m) => m.id === "piccadilly").x, D.landmarks.find((m) => m.id === "piccadilly").z).along;

  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const cars = [], people = [];
  function spawnCar(near, anywhere) {
    const bus = rnd() < 0.35, dir = rnd() < 0.5 ? 1 : -1;
    const along = Math.max(traffic0 + 15, Math.min(R.total - 5, near + (anywhere ? (rnd() - 0.5) * 500 : dir * -250 + (rnd() - 0.5) * 40)));
    return { along, dir, bus, v: bus ? 7 + rnd() * 2 : 9 + rnd() * 4, col: bus ? [0.75, 0.06, 0.07] : rnd() < 0.8 ? [0.05, 0.05, 0.06] : [0.15, 0.2, 0.32] };
  }
  const COATS = [[0.12, 0.13, 0.16], [0.3, 0.22, 0.15], [0.45, 0.42, 0.38], [0.15, 0.2, 0.3], [0.5, 0.1, 0.12], [0.2, 0.25, 0.18]];
  const BRELLAS = [[0.06, 0.06, 0.07], [0.06, 0.06, 0.07], [0.15, 0.2, 0.45], [0.6, 0.08, 0.1], [0.75, 0.62, 0.1], [0.12, 0.35, 0.2]];
  function spawnPerson(near, anywhere) {
    const along = Math.max(2, Math.min(R.total - 2, near + (rnd() - 0.5) * (anywhere ? 260 : 300)));
    const side = rnd() < 0.5 ? -1 : 1, road = along > traffic0;
    return { along, dir: rnd() < 0.5 ? 1 : -1, v: 1.1 + rnd() * 0.6, off: road ? side * (8.5 + rnd() * 2.5) : (rnd() - 0.5) * 6, coat: COATS[Math.floor(rnd() * COATS.length)],
             brolly: rnd() < 0.8 ? BRELLAS[Math.floor(rnd() * BRELLAS.length)] : null, h: 1.6 + rnd() * 0.25, ph: rnd() * 6 };
  }
  function crowdSize() { return { none: 0, few: 25, some: 60, busy: 120 }[S.crowd] || 0; }

  function drawCar(m, c) {
    const p = R.at(c.along), yaw = c.dir > 0 ? p.yaw : p.yaw + Math.PI;
    const lane = 3.2, rx = Math.cos(yaw), rz = -Math.sin(yaw);       // drive on the left
    const x = p.x - rx * lane, z = p.z - rz * lane;
    if (c.bus) {
      m.box(x, 1.4, z, 1.25, 1.1, 5.5, c.col, yaw);
      m.box(x, 3.4, z, 1.25, 0.9, 5.5, c.col, yaw);
      m.box(x, 2.0, z, 1.27, 0.45, 5.3, [0.08, 0.1, 0.12], yaw, 4);
      m.box(x, 3.6, z, 1.27, 0.45, 5.3, [0.08, 0.1, 0.12], yaw, 4);
      m.box(x, 4.35, z, 1.2, 0.05, 5.4, [0.6, 0.05, 0.06], yaw);
    } else {
      m.box(x, 0.75, z, 0.9, 0.45, 2.25, c.col, yaw);
      m.box(x, 1.45, z, 0.82, 0.32, 1.3, c.col, yaw);
      m.box(x, 1.45, z, 0.84, 0.2, 1.1, [0.1, 0.12, 0.14], yaw, 4);
      m.box(x, 1.85, z, 0.2, 0.08, 0.12, [1, 0.75, 0.2], yaw, 5);   // the taxi light
    }
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), L = c.bus ? 5.5 : 2.25;
    for (const s of [-1, 1]) {
      m.box(x + fx * L + rx * s * 0.7, 0.8, z + fz * L + rz * s * 0.7, 0.15, 0.1, 0.05, [1, 0.95, 0.8], yaw, 5);
      m.box(x - fx * L + rx * s * 0.7, 0.8, z - fz * L + rz * s * 0.7, 0.15, 0.1, 0.05, [0.9, 0.05, 0.05], yaw, 5);
    }
  }
  function drawPerson(m, q, time) {
    const me = shell.me, p = R.at(q.along), yaw = q.dir > 0 ? p.yaw : p.yaw + Math.PI, rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const x = p.x + rx * q.off, z = p.z + rz * q.off, step = Math.sin(time * 6 + q.ph) * 0.12;
    if (world.blocked(x, z) || Math.hypot(x - me.x, z - me.z) < 1.6) return;
    m.box(x, q.h * 0.28, z, 0.13, q.h * 0.28, 0.1, [0.08, 0.08, 0.1], yaw + step);       // legs
    m.box(x, q.h * 0.68, z, 0.22, q.h * 0.2, 0.14, q.coat, yaw);                           // coat
    m.box(x, q.h * 0.93, z, 0.1, 0.11, 0.1, [0.72, 0.56, 0.45], yaw);                     // head
    if (q.brolly && S.weather !== "dry") { m.cyl(x, q.h * 0.85, z, 0.02, q.h + 0.35, 0.02, [0.1, 0.1, 0.1], 4); m.cyl(x, q.h + 0.12, z, 0.62, q.h + 0.45, 0, q.brolly, 8); }
  }

  // ---------- rain ----------
  let drops = new Float32Array(0), dropPos = [];
  function rainCount() { return { dry: 0, drizzle: 700, rain: 1800, heavy: 3500 }[S.weather] || 0; }
  function updateRain(dt) {
    const me = shell.me, n = rainCount();
    if (dropPos.length !== n) dropPos = Array.from({ length: n }, () => [me.x + (rnd() - 0.5) * 50, rnd() * 22, me.z + (rnd() - 0.5) * 50]);
    if (!n) { drops = new Float32Array(0); return; }
    if (drops.length !== n * 8) drops = new Float32Array(n * 8);
    const fall = S.weather === "heavy" ? 13 : 10, len = S.weather === "drizzle" ? 0.25 : 0.55, a = S.time === "night" ? 0.35 : 0.5;
    for (let i = 0; i < n; i++) {
      const d = dropPos[i];
      d[1] -= fall * dt; d[0] += 0.8 * dt;
      if (d[1] < 0 || Math.abs(d[0] - me.x) > 25 || Math.abs(d[2] - me.z) > 25) { d[0] = me.x + (rnd() - 0.5) * 50; d[2] = me.z + (rnd() - 0.5) * 50; d[1] = 12 + rnd() * 10; }
      drops.set([d[0], d[1], d[2], a, d[0] - 0.05, d[1] + len, d[2], 0], i * 8);
    }
  }

  // ---------- the look of the sky ----------
  function look(time) {
    const t = S.time, wet = S.weather === "dry" ? 0.25 : S.weather === "drizzle" ? 0.6 : 1;
    const L = t === "night" ? { sky: [0.05, 0.06, 0.09], top: [0.08, 0.1, 0.16], day: 0.0 } : t === "dusk" ? { sky: [0.42, 0.4, 0.45], top: [0.35, 0.38, 0.5], day: 0.45 } : { sky: [0.62, 0.65, 0.68], top: [0.55, 0.6, 0.66], day: 1 };
    const haze = S.weather === "heavy" ? 0.009 : S.weather === "rain" ? 0.006 : S.weather === "drizzle" ? 0.0045 : 0.003;
    return { sky: L.sky, fog: L.sky, skyTop: L.top, fogD: haze, day: L.day, wet, time, far: Number(S.far), rainCol: t === "night" ? [0.55, 0.6, 0.7] : [0.82, 0.86, 0.92] };
  }

  // traffic and people stay around you
  function update(dt) {
    const here = R.nearest(shell.me.x, shell.me.z).along;
    if (S.traffic) {
      while (cars.length < 16) cars.push(spawnCar(here, cars.length < 8));
      for (const c of cars) { c.along += c.dir * c.v * dt; if (Math.abs(c.along - here) > 320 || c.along < traffic0 || c.along > R.total) Object.assign(c, spawnCar(here, false)); }
    } else cars.length = 0;
    const want = crowdSize();
    while (people.length < want) people.push(spawnPerson(here, true));
    people.length = Math.min(people.length, want);
    for (const q of people) { q.along += q.dir * q.v * dt; if (Math.abs(q.along - here) > 170 || q.along < 0 || q.along > R.total) Object.assign(q, spawnPerson(here, false)); }
    updateRain(dt);
  }
  function drawMoving(m, time) {
    const here = R.nearest(shell.me.x, shell.me.z).along;
    for (const c of cars) if (Math.abs(c.along - here) < 300) drawCar(m, c);
    for (const q of people) drawPerson(m, q, time);
  }

  // ---------- its map ----------
  const INK = { ground: "#1d2228", path: "#2a303a", road: "#3c4551", block: "#4a525e", blockEdge: "#646d7a", mark: "#e9c46a" };
  const LM = Object.fromEntries(D.landmarks.map((l) => [l.id, l]));
  // the map puts the Quadrant at the middle of its curve, inside the buildings: it's marked on the street itself
  const QUADRANT = (() => { const q = R.at(R.nearest(LM.quadrant.x, LM.quadrant.z).along); return { x: q.x, z: q.z }; })();
  const SIGHTS = D.landmarks.map((l) => (l.id === "quadrant" ? { ...l, ...QUADRANT } : l));
  const LABELS = { liberty: "Tudor-style store", quadrant: "The Quadrant" };
  function paintMap({ g, P, trace, seen, s, w, h }) {
    g.fillStyle = INK.ground; g.fillRect(0, 0, w, h);
    for (const [col, on] of [[INK.path, false], [INK.road, true]]) {
      g.strokeStyle = col;
      for (const st of D.streets) if (!!st.vehicles === on && seen(st.pts)) { g.lineWidth = Math.max(1.5, st.w * s); trace(st.pts, false); g.stroke(); }
    }
    g.fillStyle = INK.block; g.strokeStyle = INK.blockEdge; g.lineWidth = 1;
    for (const b of D.buildings) if (seen(b.pts)) { trace(b.pts); g.fill(); g.stroke(); }
    g.fillStyle = INK.mark; g.strokeStyle = "#000"; g.lineWidth = 1;
    for (const l of SIGHTS) { const [a, b] = P(l.x, l.z); g.beginPath(); g.arc(a, b, 4, 0, Math.PI * 2); g.fill(); g.stroke(); }
  }
  // each street on the walk: its middle, along the route
  const STREET_MID = [...new Set(D.streetsOrder)].filter((name) => !["Piccadilly Circus", "Marble Arch", "Edgware Road"].includes(name)).map((name) => {
    const near = D.streets.filter((st) => st.name === name).flatMap((st) => st.pts).map(([x, z]) => R.nearest(x, z)).filter((n) => n.off < 16).map((n) => n.along).sort((a, b) => a - b);
    return near.length ? [name, near[Math.floor(near.length / 2)]] : null;
  }).filter(Boolean);

  // ---------- the list of destinations ----------
  const { place } = WalkShell;
  const front = (l, d) => { const y = l.yaw || 0; return [l.x + Math.sin(y) * d, l.z + Math.cos(y) * d]; };     // straight out from a landmark's face
  const back = (q, d) => { const p = R.at(R.nearest(q[0] ?? q.x, q[1] ?? q.z).along - d); return [p.x, p.z]; };     // this far back along the walk
  const SCREEN = (() => { const [x, z] = LM.piccadilly.screen, y = LM.piccadilly.screenYaw, sy = Math.sin(y), cy = Math.cos(y); return [x + sy * 3, z + cy * 3]; })();
  const xz = (l) => [l.x, l.z];
  const DESTINATIONS = [
    ["Landmarks", [
      place("Chinatown gate", back(LM.chinatown, 20), xz(LM.chinatown), 9.4, 1.1, 5.5),
      place("Piccadilly Circus", back(LM.piccadilly, 18), xz(LM.piccadilly), 6.2, 0.9, 4),
      place("The screens at Piccadilly Circus", [871, 318], SCREEN, 15.2, 1.5, 4),
      place("Regent Street, the Quadrant", back(QUADRANT, 22), xz(QUADRANT), 3, 1, 5),
      place("The Tudor-style store", [505, -136], front(LM.liberty, 2.5), 7, 1.4, 4),
      place("Oxford Circus station", back(LM.station, 16), xz(LM.station), 4.6, 0.9, 4),
      place("Selfridges", front(LM.store, 24), front(LM.store, 4), 8.4, 1.6, 6),
      place("Marble Arch", back(LM.arch, 34), xz(LM.arch), 17.4, 1.4, 12),
      place("Edgware Road", back(LM.finish, 16), xz(LM.finish), 4.6, 0.9, 3)]],
    ["The streets of the walk", STREET_MID.map(([name, along]) => { const a = R.at(Math.max(0, along - 18)), b = R.at(along); return place(name, [a.x, a.z], [b.x, b.z], 3, 1, 4); })],
  ];

  shell = WalkShell.start({
    id: "london-walk", S, settings, renderer, Mesh, eye: 1.68, pace: { slow: 1.1, normal: 1.45, brisk: 1.9 },
    paint: { quad: (m, a, b, c, d, col) => m.quad(a, b, c, d, col, 5), cyl: (m, x, y0, z, r0, y1, r1, col, seg) => m.cyl(x, y0, z, r0, y1, r1, col, seg, 5) },
    world, route: D.route, marks: SIGHTS, markNear: 35, zoneName: (x, z) => streetName(x, z) || "West End", destinations: DESTINATIONS,
    endText: "You've reached Edgware Road: the end of the walk",
    update, dyn: drawMoving, frame: (cam, dyn, time) => renderer.frame(cam, look(time), dyn, drops),
    state: () => ({ cars: cars.length, people: people.length }),
    map: { paint: paintMap, places: SIGHTS.map((l) => [LABELS[l.id] || l.name, l.x, l.z, 2, 0]), gates: [], areas: STREET_MID.map(([name, along]) => { const q = R.at(along); return [name.toUpperCase(), q.x, q.z, 0.18, 3]; }), light: () => false,
      r: 240, rMax: 1500, view: { x: 26, z: 45, r: 640 }, reach: [-1500, -1000, 1500, 1000] },
    menu: { title: "The West End, London", text: "A rainy walk through the West End: Chinatown, Piccadilly Circus, Regent Street and Oxford Street to Marble Arch and Edgware Road.",
      credit: "Streets and buildings: © OpenStreetMap contributors. Landmarks are simple models made for this game." },
  });
  shell.streetName = streetName;
})();
