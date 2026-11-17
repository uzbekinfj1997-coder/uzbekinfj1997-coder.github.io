/* Chicken Hunt: the pictures, all drawn here on canvas, so that nothing is downloaded. Each layer of the countryside is painted once onto its
   own sheet; only the chickens, the sails and the weather vane are drawn every frame. */
"use strict";
const ChickenArt = (() => {
  const { LAYERS, PROPS, HEIGHT, MAX_VIEW, ground, widthOf, MILL_X, MILL_Y } = ChickenCore;
  const random = (seed) => { let v = seed; return () => { v = (v * 16807) % 2147483647; return v / 2147483647; }; };
  const blob = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const oval = (g, x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const vert = (g, y0, y1, stops) => { const c = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => c.addColorStop(i / (stops.length - 1), s)); return c; };

  function groundShape(g, id, w, fill) {
    g.fillStyle = fill; g.beginPath(); g.moveTo(0, HEIGHT);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, ground(id, x));
    g.lineTo(w, HEIGHT); g.closePath(); g.fill();
  }
  // a tree crown of many leaves' worth of circles: dark below, lit from the upper left
  function crown(g, x, y, rx, ry, rnd, tones) {
    const n = Math.round((rx * ry) / 90) + 24;
    for (let t = 0; t < tones.length; t++) for (let i = 0; i < n / tones.length; i++) {
      const big = Math.max(rx, ry), small = big < 60, a = rnd() * 6.28, q = Math.sqrt(rnd()) * (1 - t * 0.13), r = big * (small ? 0.24 + rnd() * 0.16 : (0.13 + rnd() * 0.1) * (1 - t * 0.13));
      blob(g, x + Math.cos(a) * rx * q - t * rx * 0.07, y + Math.sin(a) * ry * q - t * ry * 0.09, r, tones[t]);
    }
  }
  const smallTree = (g, x, y, h, rnd, tones = ["#2f6b33", "#3f8a3f", "#5aa64e"]) => {
    g.fillStyle = "#4b3522"; g.fillRect(x - h * 0.05, y - h * 0.5, h * 0.1, h * 0.5);
    crown(g, x, y - h * 0.68, h * 0.34, h * 0.36, rnd, tones);
  };

  function paintBackdrop(g, w) {
    const rnd = random(11);
    for (const [base, amp, col] of [[205, 46, "#a9c6dd"], [238, 34, "#92b6cf"], [262, 24, "#7ca5ba"]]) {
      const a = rnd() * 6, b = rnd() * 6;
      g.fillStyle = vert(g, base - amp, HEIGHT * 0.62, [col, "#cfe2ea"]); g.beginPath(); g.moveTo(0, HEIGHT);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, base + Math.sin(x / 170 + a) * amp + Math.sin(x / 61 + b) * amp * 0.3);
      g.lineTo(w, HEIGHT); g.closePath(); g.fill();
    }
  }
  function paintFar(g, w) {
    const rnd = random(23);
    groundShape(g, "far", w, vert(g, 270, 380, ["#6f9f7c", "#8db889"]));
    // woods along the ridge
    for (let x = 0; x < w; x += 7 + rnd() * 22) { const y = ground("far", x); if (rnd() < 0.72) oval(g, x, y + 2, 7 + rnd() * 9, 5 + rnd() * 7, rnd() < 0.5 ? "#527f62" : "#5f8f6d"); }
    // a castle on the hill
    const cx = 830, cy = ground("far", cx) + 2, s = "#7f8a94", d = "#65707a";
    g.fillStyle = s; g.fillRect(cx - 42, cy - 26, 84, 28);
    for (const [x, tw, th] of [[-46, 13, 44], [36, 13, 40], [-8, 18, 58]]) {
      g.fillStyle = d; g.fillRect(cx + x, cy - th, tw, th + 2);
      for (let k = 0; k < 3; k++) { g.fillStyle = d; g.fillRect(cx + x + k * (tw / 3), cy - th - 4, tw / 5, 4); }
    }
    poly(g, [[cx + 1, cy - 72], [cx - 9, cy - 58], [cx + 11, cy - 58]], "#9c4a3c");
    g.fillStyle = "#3f4a54"; g.fillRect(cx - 3, cy - 14, 7, 16);
    // a village further along
    for (let i = 0; i < 9; i++) { const x = 1250 + i * 15 + rnd() * 6, y = ground("far", x) + 3; g.fillStyle = "#d9d3c4"; g.fillRect(x, y - 8, 11, 9); poly(g, [[x - 1, y - 8], [x + 5.5, y - 13], [x + 12, y - 8]], "#a65c48"); }
  }
  function paintMid(g, w) {
    const rnd = random(37);
    groundShape(g, "mid", w, vert(g, 330, 470, ["#8cc765", "#5fa548"]));
    // fields, each its own colour, with rows going down towards you
    let x = -40;
    while (x < w) {
      const fw = 120 + rnd() * 190, top = Math.max(ground("mid", x), ground("mid", x + fw)) + 6 + rnd() * 10, bot = top + 34 + rnd() * 46, tone = ["#c9c25a", "#7fb955", "#a4cf63", "#b28a55", "#6ba84e"][Math.floor(rnd() * 5)];
      const pts = [[x + 12, top], [x + fw, top + 3], [x + fw + 22, bot], [x - 10, bot - 4]];
      poly(g, pts, tone);
      g.strokeStyle = "rgba(0,0,0,.09)"; g.lineWidth = 1.5;
      for (let k = 1; k < 7; k++) { const u = k / 7; g.beginPath(); g.moveTo(x + 12 + (fw - 12) * u, top + 3 * u); g.lineTo(x - 10 + (fw + 32) * u, bot - 4 + 4 * u); g.stroke(); }
      // a hedge along its far side
      for (let q = x + 10; q < x + fw; q += 8 + rnd() * 6) oval(g, q, top - 2 + rnd() * 2, 7 + rnd() * 3, 5 + rnd() * 3, rnd() < 0.5 ? "#3f7f3e" : "#4e8f45");
      x += fw + 8;
    }
    // trees on the rise
    for (let i = 0; i < 26; i++) { const tx = rnd() * w; if (Math.abs(tx - MILL_X) < 80) continue; smallTree(g, tx, ground("mid", tx) + 6, 42 + rnd() * 26, rnd); }
    // a farmhouse
    { const fx = 1130, fy = ground("mid", fx) + 8; g.fillStyle = "#efe6d3"; g.fillRect(fx - 34, fy - 30, 68, 32); poly(g, [[fx - 40, fy - 30], [fx, fy - 56], [fx + 40, fy - 30]], "#b4523d"); g.fillStyle = "#6e4a30"; g.fillRect(fx - 7, fy - 16, 14, 18); g.fillStyle = "#7fb6d6"; g.fillRect(fx - 26, fy - 22, 10, 10); g.fillRect(fx + 16, fy - 22, 10, 10); }
    // a church
    { const fx = 1540, fy = ground("mid", fx) + 8; g.fillStyle = "#e8e2d4"; g.fillRect(fx - 30, fy - 30, 48, 32); g.fillRect(fx + 12, fy - 62, 20, 64); poly(g, [[fx - 34, fy - 30], [fx - 6, fy - 48], [fx + 22, fy - 30]], "#8a5c4a"); poly(g, [[fx + 9, fy - 62], [fx + 22, fy - 94], [fx + 35, fy - 62]], "#5f6f7a"); g.fillStyle = "#5a7f96"; g.fillRect(fx + 18, fy - 52, 8, 12); }
    // the windmill's tower: its sails turn, so they're drawn with the chickens
    { const y1 = ground("mid", MILL_X) + 8; poly(g, [[MILL_X - 18, MILL_Y], [MILL_X + 18, MILL_Y], [MILL_X + 30, y1], [MILL_X - 30, y1]], "#e4dccb"); poly(g, [[MILL_X + 2, MILL_Y], [MILL_X + 18, MILL_Y], [MILL_X + 30, y1], [MILL_X + 6, y1]], "#c8bfad");
      poly(g, [[MILL_X - 24, MILL_Y + 2], [MILL_X, MILL_Y - 26], [MILL_X + 24, MILL_Y + 2]], "#8a4f3c"); g.fillStyle = "#5e4230"; g.fillRect(MILL_X - 7, y1 - 22, 14, 22); g.fillStyle = "#6f9fbc"; g.fillRect(MILL_X - 5, MILL_Y + 22, 10, 12); }
  }
  function paintNear(g, w) {
    const rnd = random(53), by = (id) => PROPS.find((p) => p.id === id);
    groundShape(g, "near", w, vert(g, 440, HEIGHT, ["#79bb45", "#3f8a2b"]));
    // a track winding across the meadow
    g.strokeStyle = "rgba(196,165,108,.75)"; g.lineWidth = 34; g.lineCap = "round"; g.beginPath(); g.moveTo(-20, 560);
    g.bezierCurveTo(500, 500, 760, 590, 1180, 500); g.bezierCurveTo(1480, 450, 1800, 590, w + 20, 520); g.stroke();
    // grass and flowers
    for (let i = 0; i < w / 2.2; i++) {
      const x = rnd() * w, y = ground("near", x) + rnd() * (HEIGHT - ground("near", x)), h = 3 + ((y - 450) / 150) * 9, t = rnd();
      g.strokeStyle = t < 0.4 ? "rgba(46,110,34,.55)" : t < 0.75 ? "rgba(120,190,70,.55)" : "rgba(90,160,50,.55)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rnd() - 0.5) * 3, y - h * 0.6, x + (rnd() - 0.5) * 7, y - h); g.stroke();
    }
    for (let i = 0; i < 220; i++) { const x = rnd() * w, y = ground("near", x) + 10 + rnd() * 130; blob(g, x, y, 1.6 + rnd() * 1.6, ["#fff5c2", "#f7d44c", "#f08fa8", "#ffffff"][Math.floor(rnd() * 4)]); }

    // the fence, and the can on one of its posts
    const fy = (x) => ground("near", x) + 6;
    g.strokeStyle = "#7a5a39"; g.lineWidth = 8; g.lineCap = "butt";
    for (const dy of [-38, -18]) { g.beginPath(); for (let x = 440; x <= 980; x += 10) (x === 440 ? g.moveTo(x, fy(x) + dy) : g.lineTo(x, fy(x) + dy)); g.stroke(); }
    for (let x = 440; x <= 980; x += 50) { g.fillStyle = "#8d6a45"; g.fillRect(x - 5, fy(x) - 58, 10, 62); g.fillStyle = "#6e5033"; g.fillRect(x + 1, fy(x) - 58, 4, 62); oval(g, x, fy(x) + 5, 12, 3.5, "rgba(0,0,0,.2)"); }

    // the big oak on the left
    { oval(g, 232, 474, 150, 15, "rgba(0,0,0,.22)"); const t = g.createLinearGradient(196, 0, 270, 0); t.addColorStop(0, "#6a4a2c"); t.addColorStop(1, "#3c2815"); g.fillStyle = t;
      g.beginPath(); g.moveTo(186, 478); g.quadraticCurveTo(212, 400, 206, 250); g.lineTo(258, 250); g.quadraticCurveTo(254, 400, 282, 478); g.closePath(); g.fill();
      g.strokeStyle = "#4a3320"; g.lineWidth = 3; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(214 + k * 5, 260 + (k % 3) * 40); g.lineTo(212 + k * 5.5, 340 + (k % 3) * 50); g.stroke(); }
      g.lineWidth = 16; g.strokeStyle = "#533a22"; for (const [x, y] of [[120, 190], [340, 190], [232, 120]]) { g.beginPath(); g.moveTo(232, 290); g.quadraticCurveTo(232, 230, x, y); g.stroke(); }
      crown(g, 232, 170, 182, 146, rnd, ["#245a2a", "#2f7033", "#3f8a3d", "#5aa549", "#79bd58"]); }

    // the hut
    { const wall = g.createLinearGradient(1060, 0, 1300, 0); wall.addColorStop(0, "#a8824f"); wall.addColorStop(1, "#7f5f39"); oval(g, 1180, 480, 150, 11, "rgba(0,0,0,.24)"); g.fillStyle = wall; g.fillRect(1060, 335, 240, 143);
      g.strokeStyle = "rgba(60,40,20,.5)"; g.lineWidth = 2; for (let y = 350; y < 478; y += 16) { g.beginPath(); g.moveTo(1060, y); g.lineTo(1300, y); g.stroke(); }
      g.fillStyle = "#5a3f26"; g.fillRect(1094, 380, 52, 98); g.fillStyle = "#6e4f31"; g.fillRect(1099, 385, 42, 93); blob(g, 1134, 432, 3, "#d6b35a");
      g.fillStyle = "#3e2c1b"; g.fillRect(1196, 372, 68, 58); g.fillStyle = "#a7d3ea"; g.fillRect(1201, 377, 58, 48); g.fillStyle = "#cfe8f4"; poly(g, [[1201, 377], [1236, 377], [1201, 412]], "#cfe8f4"); g.fillStyle = "#3e2c1b"; g.fillRect(1228, 377, 4, 48); g.fillRect(1201, 399, 58, 4);
      poly(g, [[1040, 338], [1180, 250], [1320, 338]], "#8c3f2e"); poly(g, [[1180, 250], [1320, 338], [1200, 338]], "#74331f");
      g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 2; for (let k = 1; k < 5; k++) { const q = 250 + k * 17.6, dx = k * 28; g.beginPath(); g.moveTo(1180 - dx, q); g.lineTo(1180 + dx, q); g.stroke(); }
      g.fillStyle = "#6b6158"; g.fillRect(1240, 262, 22, 50); g.fillStyle = "#544b43"; g.fillRect(1237, 258, 28, 8);
      g.fillStyle = "#333"; g.fillRect(1178, 214, 4, 38); }

    // the dry-stone wall
    { const y0 = 408; g.fillStyle = "#8e8a7f"; g.fillRect(1450, y0, 250, 72); oval(g, 1575, 482, 136, 8, "rgba(0,0,0,.2)");
      for (let row = 0; row < 5; row++) for (let x = 1450 + (row % 2) * 12; x < 1696; x += 24 + rnd() * 6) { const c = 130 + Math.floor(rnd() * 50); oval(g, x + 12, y0 + 8 + row * 14, 13, 7, `rgb(${c},${c - 4},${c - 14})`); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; g.stroke(); } }

    // the scarecrow: don't shoot him
    { const x = 1860; oval(g, x, 474, 44, 6, "rgba(0,0,0,.22)"); g.fillStyle = "#6f5233"; g.fillRect(x - 5, 300, 10, 174); g.fillRect(x - 74, 330, 148, 9);
      poly(g, [[x - 34, 322], [x + 34, 322], [x + 30, 412], [x - 30, 412]], "#49618a"); poly(g, [[x + 4, 322], [x + 34, 322], [x + 30, 412], [x + 4, 412]], "#3a4f72"); poly(g, [[x - 74, 325], [x - 30, 325], [x - 30, 346], [x - 74, 344]], "#49618a"); poly(g, [[x + 30, 325], [x + 74, 325], [x + 74, 344], [x + 30, 346]], "#3a4f72");
      g.strokeStyle = "#d9b75a"; g.lineWidth = 2; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(x - 26 + k * 6.5, 410); g.lineTo(x - 30 + k * 7.5, 424 + (k % 2) * 6); g.stroke(); g.beginPath(); g.moveTo(x - 74, 327 + k * 2); g.lineTo(x - 88, 324 + k * 3); g.stroke(); g.beginPath(); g.moveTo(x + 74, 327 + k * 2); g.lineTo(x + 88, 324 + k * 3); g.stroke(); }
      blob(g, x, 288, 25, "#e5cf9a"); g.fillStyle = "#2a2a2a"; blob(g, x - 9, 283, 3.2, "#2a2a2a"); blob(g, x + 9, 283, 3.2, "#2a2a2a"); g.strokeStyle = "#2a2a2a"; g.lineWidth = 2; g.beginPath(); g.arc(x, 293, 10, 0.2, Math.PI - 0.2); g.stroke();
      oval(g, x, 268, 40, 7, "#5d4a30"); poly(g, [[x - 21, 268], [x - 15, 236], [x + 15, 236], [x + 21, 268]], "#6f5a3b"); g.fillStyle = "#a33b2d"; g.fillRect(x - 20, 258, 40, 7); }

    // hay
    { for (const [x, y, rx, ry] of [[2100, 432, 64, 50], [2212, 442, 54, 42], [2155, 384, 50, 42]]) { oval(g, x, y + ry - 2, rx, 7, "rgba(0,0,0,.2)"); const c = g.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 4, x, y, rx); c.addColorStop(0, "#f2d77a"); c.addColorStop(1, "#c29a3c"); oval(g, x, y, rx, ry, c);
      g.strokeStyle = "rgba(120,88,30,.55)"; g.lineWidth = 1.3; for (let k = 0; k < 70; k++) { const a = rnd() * 6.28, q = Math.sqrt(rnd()) * 0.95, px = x + Math.cos(a) * rx * q, py = y + Math.sin(a) * ry * q, l = 8 + rnd() * 8, d = rnd() * 6.28; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(d) * l, py + Math.sin(d) * l); g.stroke(); } } }

    // a pine on the far right
    { const x = 2352; g.fillStyle = "#4e3621"; g.fillRect(x - 12, 400, 24, 74); for (let k = 0; k < 6; k++) { const y0 = 150 + k * 46, h = 92, wd = 26 + k * 13; poly(g, [[x, y0], [x + wd, y0 + h], [x - wd, y0 + h]], k % 2 ? "#245a35" : "#2c6b3f"); poly(g, [[x, y0], [x - wd, y0 + h], [x - wd * 0.2, y0 + h]], "rgba(120,200,120,.13)"); } oval(g, x, 475, 80, 8, "rgba(0,0,0,.2)"); }
  }
  function paintFront(g, w) {
    const rnd = random(71);
    for (let i = 0; i < w / 1.5; i++) {
      const x = rnd() * w, h = 20 + rnd() * 34, t = rnd();
      g.strokeStyle = t < 0.5 ? "#2a6e24" : t < 0.8 ? "#3b8a2e" : "#5aa83e"; g.lineWidth = 2 + rnd() * 2; g.lineCap = "round"; g.beginPath(); g.moveTo(x, HEIGHT + 4); g.quadraticCurveTo(x + (rnd() - 0.5) * 8, HEIGHT - h * 0.6, x + (rnd() - 0.5) * 26, HEIGHT - h); g.stroke();
    }
    for (let i = 0; i < 70; i++) { const x = rnd() * w, y = HEIGHT - 16 - rnd() * 26; g.strokeStyle = "#2f6f27"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, HEIGHT); g.lineTo(x, y); g.stroke(); const c = ["#ffe066", "#ffffff", "#f48fb1", "#ffab40"][Math.floor(rnd() * 4)]; for (let k = 0; k < 5; k++) blob(g, x + Math.cos(k * 1.26) * 3.6, y + Math.sin(k * 1.26) * 3.6, 2.4, c); blob(g, x, y, 2.1, "#8d6e3f"); }
  }
  function paintCloud(g, w, h, seed) {
    const rnd = random(seed);
    for (let i = 0; i < 16; i++) { const x = w * (0.12 + rnd() * 0.76), y = h * (0.42 + rnd() * 0.3), r = h * (0.14 + rnd() * 0.2); const c = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r); c.addColorStop(0, "rgba(255,255,255,.98)"); c.addColorStop(1, "rgba(232,241,248,.75)"); blob(g, x, y, r, c); }
  }

  // the sheets of the scene, for this many pixels to a view unit
  function buildScene(scale) {
    const q = Math.min(scale, 1.6), sheet = (w, paint) => { const c = document.createElement("canvas"); c.width = Math.ceil(w * q); c.height = Math.ceil(HEIGHT * q); const g = c.getContext("2d"); g.scale(q, q); paint(g, w); return c; };
    const cloud = (w, h, seed) => { const c = document.createElement("canvas"); c.width = w * q; c.height = h * q; const g = c.getContext("2d"); g.scale(q, q); paintCloud(g, w, h, seed); return { c, w, h }; };
    return { q, backdrop: sheet(MAX_VIEW + 160, paintBackdrop), far: sheet(widthOf("far"), paintFar), mid: sheet(widthOf("mid"), paintMid), near: sheet(widthOf("near"), paintNear), front: sheet(widthOf("near") + 300, paintFront),
      clouds: [cloud(300, 100, 3), cloud(220, 76, 9), cloud(380, 120, 15)] };
  }

  const COATS = { fly: { back: "#b65a24", mid: "#d98338", belly: "#f7dfb4", wing: "#a14d1d", wingEdge: "#6f3211", tail: "#2f4a44", head: "#d98338" },
    peek: { back: "#b65a24", mid: "#d98338", belly: "#f7dfb4", wing: "#a14d1d", wingEdge: "#6f3211", tail: "#2f4a44", head: "#d98338" },
    gold: { back: "#d9a30f", mid: "#ffd84a", belly: "#fff6c6", wing: "#e8b21e", wingEdge: "#a87a06", tail: "#b58707", head: "#ffd84a" } };
  // a chicken about 100 units long, facing +x, drawn at this size
  function chicken(g, b, x, y) {
    const C = COATS[b.kind] || COATS.fly, dir = b.vx ? Math.sign(b.vx) : b.dirFace || 1, flap = Math.sin(b.flap), peek = b.kind === "peek";
    g.save(); g.translate(x, y); g.rotate(b.dead ? b.rot : (peek ? 0 : -0.06 * dir)); g.scale((dir * b.size) / 100, b.size / 100);
    g.lineJoin = "round"; g.lineCap = "round";
    // tail
    for (const [a, l, c] of [[-2.55, 42, C.tail], [-2.8, 46, C.tail], [-3.05, 40, C.wingEdge]]) { g.save(); g.translate(-30, -4); g.rotate(a); oval(g, l / 2, 0, l / 2, 7, c); g.restore(); }
    // legs: trailing behind in the air, hanging when hit
    g.strokeStyle = "#e39b16"; g.lineWidth = 5;
    for (const k of [-6, 7]) { const lx = peek ? k - 2 : b.dead ? k + 2 : k - 18, ly = peek || b.dead ? 48 : 40; g.beginPath(); g.moveTo(k, 24); g.lineTo(lx, ly); g.stroke(); g.lineWidth = 3.5; for (const t of [-8, 0, 8]) { g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + t, ly + 7); g.stroke(); } g.lineWidth = 5; }
    // far wing
    g.save(); g.translate(-2, -10); g.rotate(-1.2 - flap * 0.8); oval(g, 26, 0, 30, 11, C.wingEdge); g.restore();
    // body
    const c = g.createRadialGradient(8, 4, 4, -2, -2, 46); c.addColorStop(0, C.mid); c.addColorStop(1, C.back);
    oval(g, -2, 2, 40, 28, c, 0.08); oval(g, 22, -8, 19, 22, C.mid, -0.5); oval(g, 13, 11, 25, 16, C.belly, -0.12);
    // head
    oval(g, 34, -20, 17, 17, C.head);
    if (!b.dead) { blob(g, 29, -38, 5.4, "#d8232a"); blob(g, 36, -41, 6.2, "#e7303a"); blob(g, 43, -38, 5.2, "#d8232a"); } else { blob(g, 26, -36, 5, "#a81c22"); blob(g, 33, -39, 5.5, "#b82029"); blob(g, 40, -37, 4.8, "#a81c22"); }
    oval(g, 48, -6, 4, 7, "#d8232a");
    // beak: open when hit
    if (b.dead) { poly(g, [[47, -24], [65, -22], [48, -17]], "#f2b21b"); poly(g, [[48, -14], [62, -7], [46, -9]], "#d8920f"); }
    else { poly(g, [[47, -25], [68, -18], [47, -15]], "#f6bb24"); poly(g, [[47, -19], [68, -18], [47, -15]], "#d8920f"); }
    // eye
    blob(g, 40, -25, 7.5, "#fff");
    if (b.dead) { g.strokeStyle = "#222"; g.lineWidth = 2.4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(36, -25 - s * 4); g.lineTo(44, -25 + s * 4); g.stroke(); } }
    else { blob(g, 42, -24, 3.6, "#111"); blob(g, 43.2, -25.4, 1.2, "#fff"); g.strokeStyle = "#5e2c0e"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(33, -32); g.lineTo(46, -33); g.stroke(); }
    // near wing
    g.save(); g.translate(-6, -5); g.rotate(peek ? 0.5 : -0.7 + flap * 1.0);
    g.fillStyle = C.wing; g.beginPath(); g.moveTo(0, -9); g.quadraticCurveTo(26, -17, 48, -3); g.quadraticCurveTo(28, 15, 0, 9); g.closePath(); g.fill();
    g.strokeStyle = C.wingEdge; g.lineWidth = 2.2; for (const k of [12, 23, 34]) { g.beginPath(); g.moveTo(k, -8 + k * 0.1); g.quadraticCurveTo(k + 5, 0, k - 2, 10 - k * 0.14); g.stroke(); }
    g.restore();
    if (b.kind === "gold") { g.globalAlpha = 0.5 + 0.4 * Math.sin(b.flap * 0.5); g.strokeStyle = "#fff8d0"; g.lineWidth = 2.4; for (const [px, py] of [[-22, -24], [20, -40], [-40, 12]]) { for (const [dx, dy] of [[6, 0], [0, 6]]) { g.beginPath(); g.moveTo(px - dx, py - dy); g.lineTo(px + dx, py + dy); g.stroke(); } } g.globalAlpha = 1; }
    g.restore();
  }
  function sails(g, x, y, angle) {
    g.save(); g.translate(x, y); g.rotate(angle);
    for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = "#5c4432"; g.fillRect(-2, 0, 4, 64); g.fillStyle = "#efe7d6"; g.fillRect(2, 14, 15, 48); g.strokeStyle = "rgba(90,70,50,.6)"; g.lineWidth = 1; for (let q = 22; q < 60; q += 8) { g.beginPath(); g.moveTo(2, q); g.lineTo(17, q); g.stroke(); } }
    blob(g, 0, 0, 6, "#3e2c1f"); g.restore();
  }
  function vane(g, x, y, angle) {
    g.save(); g.translate(x, y); g.scale(Math.cos(angle) || 0.01, 1);
    g.strokeStyle = "#2c2c2c"; g.lineWidth = 3; g.beginPath(); g.moveTo(-24, 10); g.lineTo(24, 10); g.stroke(); poly(g, [[24, 10], [14, 4], [14, 16]], "#2c2c2c");
    poly(g, [[-14, 8], [-12, -8], [-2, -16], [8, -12], [12, -20], [13, -8], [6, 8]], "#2c2c2c"); g.restore();
  }
  function feather(g, f) {
    g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.globalAlpha = Math.min(1, f.life * 1.6);
    g.fillStyle = f.col; g.beginPath(); g.moveTo(-f.s, 0); g.quadraticCurveTo(0, -f.s * 0.5, f.s, 0); g.quadraticCurveTo(0, f.s * 0.5, -f.s, 0); g.fill();
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = Math.max(0.5, f.s * 0.08); g.beginPath(); g.moveTo(-f.s, 0); g.lineTo(f.s, 0); g.stroke();
    g.restore();
  }
  // a shotgun shell, for the row at the corner of the view
  function shell(g, x, y, h, spent) {
    const w = h * 0.42;
    if (spent) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.strokeRect(x - w / 2, y - h, w, h); return; }
    const c = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); c.addColorStop(0, "#e04a3c"); c.addColorStop(0.5, "#ff7a62"); c.addColorStop(1, "#a8251c");
    g.fillStyle = c; g.fillRect(x - w / 2, y - h, w, h * 0.72);
    const b = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); b.addColorStop(0, "#c49a3a"); b.addColorStop(0.5, "#ffe08a"); b.addColorStop(1, "#8f6c1f");
    g.fillStyle = b; g.fillRect(x - w / 2, y - h * 0.28, w, h * 0.28);
  }
  return { buildScene, chicken, sails, vane, feather, shell };
})();
window.ChickenArt = ChickenArt;
