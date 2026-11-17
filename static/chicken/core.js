/* Chicken Hunt: the rules, with no drawing. Positions are in view units, the view being 600 high. The countryside is in layers that
   scroll at different speeds, so each thing has its x along its own layer. A shot asks what is on top at that point, nearest first,
   in the same order things are drawn: what you see is what you hit. */
"use strict";
const ChickenCore = (() => {
  const HEIGHT = 600, MAX_VIEW = 1400;
  // the further away, the smaller, slower and more points
  const LAYERS = {
    far: { travel: 300, size: 38, points: 25, speed: 52, top: 70, bottom: 215, want: 3 },
    mid: { travel: 620, size: 68, points: 10, speed: 96, top: 55, bottom: 265, want: 3 },
    near: { travel: 1040, size: 126, points: 5, speed: 170, top: 55, bottom: 300, want: 2 },
  };
  const widthOf = (id) => MAX_VIEW + LAYERS[id].travel;
  // the ground of each layer rolls: it's drawn and it stops shots in the same place
  const ground = (id, x) => (id === "far" ? 298 + 22 * Math.sin(x / 190) + 12 * Math.sin(x / 71 + 1)
    : id === "mid" ? 356 + 18 * Math.sin(x / 260 + 2) + 7 * Math.sin(x / 97) : 452 + 8 * Math.sin(x / 330 + 1) + 4 * Math.sin(x / 120));

  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [ax, ay] = pts[i], [bx, by] = pts[j]; if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c; } return c; };
  const inShape = (o, x, y) => (o.r !== undefined || o.rx !== undefined ? ((x - o.x) / (o.rx || o.r)) ** 2 + ((y - o.y) / (o.ry || o.r)) ** 2 <= 1 : o.pts ? inPoly(o.pts, x, y) : x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1);

  // things in the landscape, front ones first. points: for hitting it (once, if it says so); no points: it just stops the shot; gone: once hit it isn't there any more
  const MILL_X = 560, MILL_Y = ground("mid", MILL_X) - 112;
  const PROPS = [
    { id: "vane", name: "the weather vane", layer: "near", points: 10, once: true, shapes: [{ x: 1180, y: 214, r: 26 }] },
    { id: "can", name: "the tin can", layer: "near", points: 15, once: true, gone: true, shapes: [{ x0: 628, x1: 652, y0: 360, y1: 394 }] },
    { id: "scarecrow", name: "the scarecrow", layer: "near", points: -25, shapes: [{ x: 1860, y: 286, r: 27 }, { x0: 1786, x1: 1934, y0: 324, y1: 352 }, { x0: 1830, x1: 1890, y0: 310, y1: 470 }] },
    { id: "oak", layer: "near", shapes: [{ x: 232, y: 170, rx: 190, ry: 152 }, { x0: 196, x1: 268, y0: 240, y1: 475 }] },
    { id: "pine", layer: "near", shapes: [{ pts: [[2352, 150], [2432, 440], [2272, 440]] }] },
    { id: "hut", layer: "near", shapes: [{ pts: [[1040, 338], [1180, 250], [1320, 338]] }, { x0: 1060, x1: 1300, y0: 335, y1: 478 }] },
    { id: "wall", layer: "near", shapes: [{ x0: 1450, x1: 1700, y0: 408, y1: 480 }] },
    { id: "hay", layer: "near", shapes: [{ x: 2100, y: 432, rx: 64, ry: 50 }, { x: 2212, y: 442, rx: 54, ry: 42 }, { x: 2155, y: 384, rx: 50, ry: 42 }] },
    { id: "mill", name: "the windmill", layer: "mid", points: 25, once: true, shapes: [{ x: MILL_X, y: MILL_Y, r: 66 }] },
  ];
  // where a chicken can pop up from behind something
  const PEEKS = [{ x: 2155, y: 322 }, { x: 1238, y: 262 }, { x: 1570, y: 372 }, { x: 1495, y: 372 }];
  const PEEK_POINTS = 15, GOLD_POINTS = 50, RELOAD_TIME = 0.75;

  // seconds: the length of the round, shells: how many before reloading; 0 means unlimited for either
  function newRound({ seconds = 90, pace = 1, shells = 8, viewW = 1000, rnd = Math.random, cam = 0 } = {}) {
    const s = { time: seconds, limit: seconds, elapsed: 0, endless: !seconds, stretched: !seconds, score: 0, shells, maxShells: shells, unlimited: !shells, assisted: !shells, reloading: 0, cam, viewW, pace, rnd, birds: [], nextId: 1, shots: 0, hits: 0, over: false, used: {}, timers: { far: 0.8, mid: 0.4, near: 1.2 }, peekIn: 4 };
    // some in the air from the start
    for (const id of Object.keys(LAYERS)) for (let i = 0; i < LAYERS[id].want - 1; i++) { const b = addBird(s, id); b.x = offset(s, id) + (0.12 + rnd() * 0.76) * viewW; }
    return s;
  }
  const offset = (s, id) => s.cam * (widthOf(id) - s.viewW);       // how far along its layer the view's left edge is
  const toLayer = (s, id, vx) => vx + offset(s, id);
  function pan(s, by) { s.cam = Math.max(0, Math.min(1, s.cam + by)); }

  function addBird(s, id, opts = {}) {
    const L = LAYERS[id], side = s.rnd() < 0.5 ? -1 : 1, gold = opts.gold ?? (id !== "near" && s.rnd() < 0.05), left = offset(s, id);
    const b = { id: s.nextId++, layer: id, kind: gold ? "gold" : "fly", size: L.size, points: gold ? GOLD_POINTS : L.points, x: side < 0 ? left - L.size : left + s.viewW + L.size, y0: L.top + s.rnd() * (L.bottom - L.top), y: 0,
      vx: -side * L.speed * (0.85 + s.rnd() * 0.3) * s.pace * (gold ? 1.5 : 1), phase: s.rnd() * 6.28, flap: s.rnd() * 6.28, dead: false, vy: 0, rot: 0, vr: 0, ...opts };
    b.y = opts.y ?? b.y0; b.y0 = b.y;
    s.birds.push(b);
    return b;
  }
  function addPeek(s, spot) {
    const b = addBird(s, "near", { gold: false, kind: "peek", points: PEEK_POINTS, x: spot.x, y: spot.y, vx: 0, size: LAYERS.near.size * 0.8, age: 0, spot });
    b.dirFace = s.rnd() < 0.5 ? -1 : 1;
    return b;
  }
  // how far a peeking chicken is up: 0 hidden, 1 fully up
  const riseOf = (b) => (b.age < 0.3 ? b.age / 0.3 : b.age < 2 ? 1 : Math.max(0, 1 - (b.age - 2) / 0.3));

  function step(s, dt) {
    if (s.over) return;
    s.elapsed += dt;
    if (!s.endless) s.time = Math.max(0, s.time - dt);
    if (s.reloading > 0) { s.reloading -= dt; if (s.reloading <= 0) { s.reloading = 0; s.shells = s.maxShells; } }
    for (const b of s.birds) {
      b.flap += dt * (b.kind === "peek" ? 3 : 15);
      if (b.dead) { b.vy += 1000 * dt; b.y += b.vy * dt; b.x += b.vx * 0.25 * dt; b.rot += b.vr * dt; continue; }
      if (b.kind === "peek") { b.age += dt; b.y = b.spot.y + (1 - riseOf(b)) * b.size * 1.05; continue; }
      b.x += b.vx * dt;
      b.phase += dt * 2.1;
      b.y = b.y0 + Math.sin(b.phase) * (b.size * 0.22);
    }
    s.birds = s.birds.filter((b) => {
      if (b.dead) return b.y < ground(b.layer, b.x) + b.size;
      if (b.kind === "peek") return b.age < 2.3;
      const left = offset(s, b.layer);
      return b.x > left - 500 && b.x < left + s.viewW + 500;
    });
    for (const id of Object.keys(LAYERS)) {
      s.timers[id] -= dt;
      if (s.timers[id] <= 0) {
        s.timers[id] = 0.7 + s.rnd() * 1.9;
        if (s.birds.filter((b) => b.layer === id && !b.dead && b.kind !== "peek").length < LAYERS[id].want) addBird(s, id);
      }
    }
    s.peekIn -= dt;
    if (s.peekIn <= 0) {
      s.peekIn = 3.5 + s.rnd() * 5;
      const left = offset(s, "near"), shown = PEEKS.filter((p) => p.x > left + 40 && p.x < left + s.viewW - 40), free = (shown.length ? shown : PEEKS).filter((p) => !s.birds.some((b) => b.spot === p));
      if (free.length) addPeek(s, free[Math.floor(s.rnd() * free.length)]);
    }
    if (!s.endless && s.time <= 0) s.over = true;
  }

  const inBird = (b, x, y) => ((x - b.x) / (b.size * 0.56)) ** 2 + ((y - b.y) / (b.size * 0.47)) ** 2 <= 1;
  function birdAt(s, id, vx, vy, peek) {
    const x = toLayer(s, id, vx);
    for (let i = s.birds.length - 1; i >= 0; i--) { const b = s.birds[i]; if (b.layer === id && !b.dead && (b.kind === "peek") === peek && inBird(b, x, vy) && (!peek || riseOf(b) > 0.2)) return b; }
    return null;
  }
  // what a shot at this point of the view would strike
  function strike(s, vx, vy) {
    const check = (id) => {
      const x = toLayer(s, id, vx);
      for (const p of PROPS) if (p.layer === id && !(p.gone && s.used[p.id]) && p.shapes.some((o) => inShape(o, x, vy))) return p;
      return null;
    };
    let b = birdAt(s, "near", vx, vy, false); if (b) return { bird: b };
    let p = check("near"); if (p) return { prop: p };
    if (vy >= ground("near", toLayer(s, "near", vx))) return { ground: "near" };
    b = birdAt(s, "near", vx, vy, true); if (b) return { bird: b };
    b = birdAt(s, "mid", vx, vy, false); if (b) return { bird: b };
    p = check("mid"); if (p) return { prop: p };
    if (vy >= ground("mid", toLayer(s, "mid", vx))) return { ground: "mid" };
    b = birdAt(s, "far", vx, vy, false); if (b) return { bird: b };
    if (vy >= ground("far", toLayer(s, "far", vx))) return { ground: "far" };
    return { sky: true };
  }
  // result: { kind: "empty" | "reloading" | "bird" | "prop" | "stopped" | "miss", points, bird, prop }
  function shoot(s, vx, vy) {
    if (s.over) return { kind: "over" };
    if (s.reloading > 0) return { kind: "reloading" };
    if (!s.unlimited) { if (s.shells <= 0) return { kind: "empty" }; s.shells--; }
    s.shots++;
    const hit = strike(s, vx, vy);
    if (hit.bird) {
      const b = hit.bird;
      b.dead = true; b.vy = -160; b.vr = (s.rnd() < 0.5 ? -1 : 1) * (4 + s.rnd() * 4);
      s.score += b.points; s.hits++;
      return { kind: "bird", bird: b, points: b.points };
    }
    if (hit.prop) {
      const p = hit.prop;
      if (p.points && !(p.once && s.used[p.id])) { s.used[p.id] = true; s.score = Math.max(0, s.score + p.points); return { kind: "prop", prop: p, points: p.points }; }
      return { kind: "stopped", prop: p };
    }
    return { kind: "miss", ground: hit.ground || null };
  }
  function reload(s) {
    if (s.over || s.unlimited || s.reloading > 0 || s.shells === s.maxShells) return false;
    s.reloading = RELOAD_TIME;
    return true;
  }
  // the setting changed during a round. Coming off unlimited you get a full load; otherwise it's no free reload.
  // A round that was unlimited at any point stays marked, and is scored with the unlimited rounds.
  function setShells(s, shells) {
    s.shells = s.unlimited ? shells : Math.min(s.shells, shells);
    s.maxShells = shells; s.unlimited = !shells;
    if (s.unlimited) { s.assisted = true; s.reloading = 0; }
  }
  // the same for the length: unlimited works at once, and coming off it starts a full clock. From one length to another waits for the next
  // round, so it's no way to buy time. A round that was unlimited at any point is scored with the unlimited rounds.
  function setLength(s, seconds) {
    if (!seconds) { s.endless = true; s.stretched = true; }
    else if (s.endless) { s.endless = false; s.time = s.limit = seconds; }
  }
  return { HEIGHT, MAX_VIEW, LAYERS, PROPS, PEEKS, MILL_X, MILL_Y, RELOAD_TIME, PEEK_POINTS, GOLD_POINTS, widthOf, ground, offset, toLayer, pan, newRound, addBird, addPeek, riseOf, step, strike, shoot, reload, setShells, setLength };
})();
window.ChickenCore = ChickenCore;
