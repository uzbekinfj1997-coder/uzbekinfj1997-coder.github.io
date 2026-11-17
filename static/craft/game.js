/* Block Craft: textures, WebGL drawing, the two modes (creative and survival), the inventory screens, menus
   and controls. Uses world.js (BlockCraft), inventory.js (CraftInv) and looks.js (CraftLooks). */
"use strict";
(() => {
  const BC = BlockCraft, INV = CraftInv, { B, I } = BC;
  const root = $("craft"), field = $("field"), canvas = $("view"), overlay = $("overlay");
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch) field.classList.add("touch");

  // ---------- settings ----------
  const settings = setupSettings(root, "block-craft", [
    { group: "Controls", key: "sens", label: "Look speed", type: "range", default: 6, min: 1, max: 20 },
    { group: "Controls", key: "invert", label: "Invert up and down", type: "toggle", default: false },
    { group: "Picture", key: "style", label: "Look", type: "choice", default: "blocky", options: [["blocky", "Blocky (Minecraft)"], ["real", "Realistic"]],
      help: "Realistic: detailed materials, sunlight, shadows, a hazy sky" },
    { group: "Picture", key: "shadows", label: "Shadows", type: "toggle", default: true, when: (v) => v.style === "real", help: "Turn off if the game is slow" },
    { group: "Picture", key: "fov", label: "Field of view", type: "range", default: 75, min: 55, max: 110, step: 5, unit: "°" },
    { group: "Picture", key: "dist", label: "View distance", type: "choice", default: 90, options: [[50, "Short"], [90, "Normal"], [130, "Far"]], help: "Shorter is faster on slow computers" },
    { group: "Picture", key: "bob", label: "Head bobbing when walking", type: "toggle", default: true },
    { group: "Picture", key: "info", label: "Show position and frame rate", type: "toggle", default: true },
    { group: "Sound", key: "volume", label: "Volume", type: "range", default: 80, min: 0, max: 100, step: 10, unit: "%" },
    { group: "Game", key: "day", label: "Day and night", type: "choice", default: 1200, options: [[0, "Always day"], [600, "10-min day"], [1200, "20-min day"]] },
    { group: "Game", key: "keep", label: "Keep the inventory when you die", type: "toggle", default: true, help: "Survival. Off: everything drops where you died" },
    { group: "Game", key: "fall", label: "Fall damage", type: "toggle", default: true, help: "Survival" },
  ], { onOpen: () => { if (playing) pause(); }, onChange: () => applySettings() });
  const S = settings.values;

  // ---------- textures: 16 x 16 pixel tiles in a 16 x 16 atlas, painted here (no image files) ----------
  function makeAtlas() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    let seed = 12345; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const rgb = (a, k = 1) => `rgb(${a.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(",")})`;
    const paint = (i, f) => { const ox = (i % 16) * 16, oy = Math.floor(i / 16) * 16;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const col = f(x, y); if (col) { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); } } };
    const speck = (base, v) => () => rgb(base, 1 - v / 2 + r() * v);
    const DIRT = [134, 96, 67], GRASS = [95, 159, 53], WOODC = [180, 144, 90], SANDC = [219, 207, 163], STONEC = [125, 125, 125];
    paint(0, speck(GRASS, .35));
    paint(1, (x, y) => y < 3 + (r() < .5 ? 1 : 0) ? rgb(GRASS, .8 + r() * .35) : rgb(DIRT, .8 + r() * .35));
    paint(2, speck(DIRT, .4));
    paint(3, speck(STONEC, .3));
    paint(4, speck(SANDC, .18));
    paint(5, (x, y) => rgb([47, 92, 204], .85 + .15 * Math.sin((x + y * 2) / 2.5) + r() * .08));
    paint(6, (x) => rgb([102, 81, 51], (x % 4 === 0 ? .7 : 1) * (.85 + r() * .25)));
    paint(7, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6.5 ? rgb([102, 81, 51]) : rgb(WOODC, (Math.floor(d) % 2 ? .82 : 1) * (.92 + r() * .12)); });
    paint(8, () => r() < .18 ? null : rgb([58, 128, 40], .7 + r() * .5));
    const planks = (x, y) => rgb(WOODC, (y % 4 === 3 ? .7 : 1) * ((x + (Math.floor(y / 4) % 2) * 8) % 16 === 0 ? .75 : 1) * (.9 + r() * .15));
    paint(9, planks);
    paint(10, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? rgb([200, 230, 240]) : (x === y + 3 || x === y + 4) && x < 12 ? "rgba(255,255,255,.9)" : null);
    paint(11, (x, y) => { const e = (x * 7 + y * 13 + Math.floor(x / 5) * 3 + Math.floor(y / 4) * 5) % 9 === 0; return rgb([122, 122, 122], (e ? .6 : .9) + r() * .25); });
    paint(12, (x, y) => (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? rgb([200, 196, 188], .85 + r() * .1) : rgb([150, 74, 56], .85 + r() * .25));
    paint(13, speck([240, 246, 250], .08));
    paint(14, (x, y) => y < 4 + (r() < .5 ? 1 : 0) ? rgb([240, 246, 250], .95 + r() * .05) : rgb(DIRT, .8 + r() * .35));
    paint(15, speck([70, 70, 70], .6));
    // ores: stone with coloured specks in clusters
    const ore = (col) => { const spots = Array.from({ length: 5 }, () => [2 + r() * 12, 2 + r() * 12]); return (x, y) => spots.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 1.6) ? rgb(col, .8 + r() * .4) : rgb(STONEC, .85 + r() * .3); };
    paint(16, ore([30, 30, 30])); paint(21, ore([216, 170, 132])); paint(28, ore([100, 236, 228]));
    paint(17, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || y === 7) ? rgb([90, 62, 35]) : planks(x, y));          // table top
    paint(18, (x, y) => (y < 3) ? rgb([90, 62, 35]) : (x > 2 && x < 7 && y > 5 && y < 12) ? rgb([70, 70, 70], .8 + r() * .3) : (x > 9 && x < 13 && y > 4 && y < 13) ? rgb([150, 110, 60], .7) : planks(x, y));
    paint(19, speck([118, 118, 118], .12));
    paint(20, (x, y) => (x > 3 && x < 12 && y > 8 && y < 14) ? rgb([25, 22, 20], .8 + r() * .4) : (y === 3 || y === 6) && x > 2 && x < 13 ? rgb([80, 80, 80]) : rgb([118, 118, 118], .9 + r() * .15));
    paint(22, speck([226, 214, 166], .08));
    paint(23, (x, y) => rgb([216, 202, 150], (y === 3 || y === 11 ? .85 : 1) * (.94 + r() * .08)));
    paint(24, (x, y) => (y % 8 === 7 || (x + (Math.floor(y / 8) % 2) * 8) % 16 === 0) ? rgb([90, 90, 90]) : rgb([128, 128, 128], .9 + r() * .15));
    paint(25, speck([196, 196, 190], .07));
    paint(26, (x, y) => (x < 2 || y < 2 || x > 13 || y > 13 || Math.abs(x - y) < 1.5 || Math.abs(x + y - 15) < 1.5) ? rgb([118, 84, 44], .85 + r() * .15) : rgb([176, 132, 76], .88 + r() * .15));
    paint(27, (x, y) => ((x === 2 || x === 13) && (y === 2 || y === 13)) ? rgb([200, 200, 205]) : rgb([84, 88, 96], .9 + r() * .12 + (y < 1 ? .2 : 0)));
    paint(29, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? rgb([80, 54, 28]) : planks(x, y));                                // chest top
    paint(30, (x, y) => (x > 6 && x < 9 && y > 4 && y < 9) ? rgb([190, 190, 196]) : (x === 0 || x === 15 || y === 15 || y === 6) ? rgb([80, 54, 28]) : planks(x, y));   // chest side, latch
    // torch: the drawn torch shows the lower 10 rows of its tile, so the flame sits at rows 6-9
    paint(32, (x, y) => (x === 7 || x === 8) && y >= 6 ? (y < 8 ? rgb([255, 240, 140]) : y < 10 ? rgb([255, 150, 40]) : rgb([120, 86, 50], .9 + r() * .2)) : null);
    paint(33, (x, y) => (x === 0 || x === 15 || y === 15 || y === 7) ? rgb([92, 62, 34]) : (x === 12 && y === 1) ? rgb([60, 60, 64]) : planks(x, y));     // door
    paint(34, (x, y) => (x === 0 || x === 15 || y === 0) ? rgb([92, 62, 34]) : (x > 2 && x < 13 && y > 2 && y < 11 && x !== 7 && x !== 8) ? rgb([190, 220, 230]) : planks(x, y));
    paint(35, (x, y) => y < 5 ? rgb([236, 232, 222], .95 + r() * .05) : rgb([176, 40, 44], .85 + r() * .2));                            // bed top
    paint(36, (x, y) => y < 7 ? null : y < 11 ? rgb([176, 40, 44], .85 + r() * .2) : planks(x, y));                                      // bed side
    paint(38, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? rgb([92, 62, 34]) : planks(x, y));                               // sign board
    paint(39, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? rgb([92, 62, 34]) : (y > 4 && y < 12 && y % 2 === 1 && x > 2 && x < 13) ? rgb([60, 40, 20]) : planks(x, y));
    paint(37, (x, y) => (x === 2 || x === 3 || x === 12 || x === 13) ? rgb([128, 92, 54], .85 + r() * .25) : (y % 4 === 1 && x > 3 && x < 12) ? rgb([140, 100, 58]) : null);   // ladder
    // items: little pictures on a clear background, with a darker outline
    function sprite(i, rows, colours) {
      const at = (x, y) => rows[y]?.[x] && rows[y][x] !== "." ? rows[y][x] : null;
      paint(i, (x, y) => {
        const ch = at(x, y);
        if (!ch) return null;
        const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
        return rgb(colours[ch], edge ? 0.72 : 1);
      });
    }
    const STICK = [139, 106, 62], WOODH = [185, 147, 91], STONEH = [141, 141, 141], IRON = [216, 218, 222], DIAM = [92, 226, 222];
    const handle = ["................", "................", "................", "................", "................", "................",
                    "..........ss....", ".........ss.....", "........ss......", ".......ss.......", "......ss........", ".....ss.........",
                    "....ss..........", "...ss...........", "..ss............", "................"];
    const withHead = (head) => handle.map((row, y) => [...row].map((ch, x) => (head[y][x] !== "." ? "h" : ch)).join(""));
    const PICK = ["................", "...hhhhhhhh.....", "..hh......hhh...", "..h.........hh..", "............hh..", "...........h.hh.",
                  "...........h..h.", "..........h...h.", "...............h", "................", "................", "................",
                  "................", "................", "................", "................"];
    const AXE = ["................", "........hhh.....", ".......hhhhh....", "......hhhhhhh...", ".....hhhhhhh....", "......hhhhh.....",
                 ".......hhh......", "................", "................", "................", "................", "................",
                 "................", "................", "................", "................"];
    const SHOVEL = ["................", "............hhh.", "...........hhhhh", "..........hhhhhh", "..........hhhhh.", "...........hhh..",
                    "................", "................", "................", "................", "................", "................",
                    "................", "................", "................", "................"];
    sprite(40, handle, { s: STICK });
    const lump = ["................", "................", "................", "................", ".....cccccc.....", "....cccckcccc...", "...ccckcccccc...",
                  "...cccccckcc....", "...cckcccccc....", "....cccccccc....", ".....cccccc.....", "................"];
    sprite(41, lump, { c: [43, 43, 43], k: [85, 85, 85] });
    sprite(64, lump, { c: [26, 26, 26], k: [70, 70, 70] });
    sprite(65, ["................", "................", "................", "................", "................", ".......iiiiiii..", ".....iiiiiiiii..",
                "...iiiiiiiiiii..", "..iiiiiiiiiii...", "..iiiiiiiiii....", "..iiiiiiiii.....", "................"], { i: IRON });
    sprite(66, ["................", "................", "................", "......dddd......", ".....dddddd.....", "....dddddddd....", "...dddddddddd...",
                "....dddddddd....", ".....dddddd.....", "......dddd......", ".......dd.......", "................"], { d: DIAM });
    for (const [tile, head, col] of [[42, PICK, WOODH], [43, PICK, STONEH], [67, PICK, IRON], [68, PICK, DIAM], [44, AXE, WOODH], [45, AXE, STONEH],
                                      [69, AXE, IRON], [70, AXE, DIAM], [46, SHOVEL, WOODH], [47, SHOVEL, STONEH], [71, SHOVEL, IRON], [72, SHOVEL, DIAM]])
      sprite(tile, withHead(head), { s: STICK, h: col });
    const HELMET = ["................", "................", "................", "....aaaaaaaa....", "...aaaaaaaaaa...", "...aa......aa...", "...aa......aa...", "...aa......aa..."];
    const CHEST = ["................", "...aa......aa...", "..aaaa....aaaa..", "..aaaaaaaaaaaa..", "...aaaaaaaaaa...", "....aaaaaaaa....", "....aaaaaaaa....",
                   "....aaaaaaaa....", "....aaaaaaaa....", "....aaaaaaaa....", "....aaaaaaaa...."];
    const LEGS = ["................", "................", "....aaaaaaaa....", "....aaaaaaaa....", "....aaa..aaa....", "....aaa..aaa....", "....aaa..aaa....",
                  "....aaa..aaa....", "....aaa..aaa....", "....aaa..aaa....", "....aaa..aaa...."];
    const BOOTS = ["................", "................", "................", "................", "................", "................", "...aaa....aaa...",
                   "...aaa....aaa...", "...aaa....aaa...", "..aaaa....aaaa..", "..aaaa....aaaa.."];
    [HELMET, CHEST, LEGS, BOOTS].forEach((rows, k) => { sprite(73 + k, rows, { a: IRON }); sprite(77 + k, rows, { a: DIAM }); });
    // cracks for breaking blocks: more lines at each stage
    const walks = Array.from({ length: 9 }, () => { let x = 7.5, y = 7.5; const a = r() * Math.PI * 2; return Array.from({ length: 9 }, () => { x += Math.cos(a) + (r() - .5); y += Math.sin(a) + (r() - .5); return [Math.round(x), Math.round(y)]; }); });
    for (let k = 0; k < 6; k++) {
      const on = new Set();
      walks.slice(0, 3 + k).forEach((wk) => wk.slice(0, 3 + k).forEach(([x, y]) => on.add(`${x},${y}`)));
      paint(48 + k, (x, y) => on.has(`${x},${y}`) ? "rgba(0,0,0,.75)" : null);
    }
    return c;
  }
  const atlas = makeAtlas(), atlases = { blocky: { canvas: atlas, url: atlas.toDataURL() } };
  function atlasFor(style) {   // the realistic textures are painted the first time they are needed
    if (!atlases[style]) { const c = CraftLooks.makeAtlas(atlas); atlases[style] = { canvas: c, url: c.toDataURL() }; }
    return atlases[style];
  }
  let atlasURL = atlases.blocky.url, lookStyle = null;
  const iconStyle = (id) => { const t = BC.iconTile(id); return `background-image:url(${atlasURL});background-position:${(t % 16) * 100 / 15}% ${Math.floor(t / 16) * 100 / 15}%`; };

  // ---------- sound: made in the browser ----------
  let audio = null, noiseBuf = null;
  function ac() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return audio;
  }
  function noise(dur, freq, vol) {
    if (!S.volume) return;
    try {
      const a = ac(), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = freq;
      g.gain.setValueAtTime(vol * S.volume / 100, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      src.connect(f).connect(g).connect(a.destination); src.start(); src.stop(a.currentTime + dur);
    } catch { /* no sound */ }
  }
  function tone(freq, dur, type = "square", vol = 0.05) {
    if (!S.volume) return;
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol * S.volume / 100, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
    } catch { /* no sound */ }
  }
  const sfx = { dig: () => noise(0.12, 1800, 0.25), place: () => noise(0.08, 700, 0.3), hit: () => noise(0.05, 2500, 0.12),
                pop: () => tone(900 + Math.random() * 300, 0.05, "triangle", 0.04), door: () => noise(0.15, 500, 0.3),
                breakTool: () => { tone(300, 0.1, "square", 0.05); setTimeout(() => tone(180, 0.15, "square", 0.05), 90); },
                hurt: () => tone(160, 0.18, "sawtooth", 0.07) };

  // ---------- WebGL ----------
  const gl = canvas.getContext("webgl", { antialias: false });
  if (!gl) {
    overlay.replaceChildren(el("div", { class: "cr-overlay" }, el("h2", {}, "3D not available"),
      el("p", {}, "This browser can't draw 3D graphics (WebGL is switched off or not supported). Try Chrome or Edge.")));
    return;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    const loc = {};
    for (const n of ["aPos", "aUV", "aShade", "aNormal", "aTorch", "aXY"]) loc[n] = gl.getAttribLocation(p, n);
    for (const n of ["uMVP", "uEye", "uFog", "uSky", "uAlpha", "uLight", "uTex", "uColor", "uLightMVP", "uShadowMap", "uReal", "uShadows",
                     "uSunDir", "uSunCol", "uAmb", "uTime", "uWater", "uInv", "uHorizon", "uZenith"]) loc[n] = gl.getUniformLocation(p, n);
    return { p, loc };
  }
  const FOG = `vFog = clamp((distance(aPos, uEye) - uFog * 0.55) / (uFog * 0.45), 0.0, 1.0);`;
  // colour treatment of the realistic look (film-like tone curve, a little less colour, slightly warm); the sky and the
  // world use the same, so far-away things fade exactly into the sky
  const GRADE = `vec3 grade(vec3 c) {
      c = clamp((c * 1.05 * (2.51 * c * 1.05 + 0.03)) / (c * 1.05 * (2.43 * c * 1.05 + 0.59) + 0.14), 0.0, 1.0);
      c = pow(c, vec3(1.0 / 2.2));
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      return mix(vec3(l), c, 0.86) * vec3(1.03, 1.0, 0.95); }`;
  const HIGH = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
  const texProg = program(`
    attribute vec3 aPos; attribute vec2 aUV; attribute float aShade; attribute vec3 aNormal; attribute float aTorch;
    uniform mat4 uMVP; uniform mat4 uLightMVP; uniform vec3 uEye; uniform float uFog;
    varying vec2 vUV; varying float vAO; varying vec3 vN; varying vec3 vPos; varying vec4 vLight; varying float vFog; varying float vTorch;
    void main() { gl_Position = uMVP * vec4(aPos, 1.0); vUV = aUV; vAO = aShade; vN = aNormal; vPos = aPos; vTorch = aTorch;
                  vLight = uLightMVP * vec4(aPos, 1.0); ${FOG} }`, HIGH + `
    uniform sampler2D uTex; uniform sampler2D uShadowMap; uniform vec3 uSky; uniform float uAlpha; uniform float uLight;
    uniform float uReal; uniform float uShadows; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uEye;
    uniform float uTime; uniform float uWater; uniform vec3 uHorizon; uniform vec3 uZenith;
    varying vec2 vUV; varying float vAO; varying vec3 vN; varying vec3 vPos; varying vec4 vLight; varying float vFog; varying float vTorch;
    float unpack(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
    float shadowAt(float ndl) {
      vec3 p = vLight.xyz * 0.5 + 0.5;
      if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
      float bias = 0.0012 + 0.003 * (1.0 - ndl), s = 0.0;
      for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
        s += p.z - bias > unpack(texture2D(uShadowMap, p.xy + vec2(float(i), float(j)) / 2048.0)) ? 0.0 : 1.0;
      return s / 9.0;
    }
    ${GRADE}
    void main() {
      vec4 c = texture2D(uTex, vUV); if (c.a < 0.5) discard;
      float torch = vTorch * vTorch;                       // torch light falls off quickly, warm in colour
      if (uReal < 0.5) {
        float face = vN.y > 0.5 ? 1.0 : vN.y < -0.5 ? 0.55 : abs(vN.x) > 0.5 ? 0.75 : 0.88;
        vec3 lit = vec3(uLight) + vec3(1.0, 0.82, 0.55) * torch * (1.15 - uLight);
        gl_FragColor = vec4(mix(c.rgb * face * vAO * min(lit, vec3(1.15)), uSky, vFog), uAlpha); return;
      }
      vec3 alb = pow(c.rgb, vec3(2.2)), n = vN;
      if (uWater > 0.5) n = normalize(vec3(sin(vPos.x * 2.1 + uTime * 1.3) * 0.07 + sin(vPos.z * 1.3 - uTime * 0.9) * 0.05, 1.0,
                                             cos(vPos.z * 2.3 + uTime * 1.1) * 0.07 + cos(vPos.x * 1.7 + uTime * 0.7) * 0.04));
      float ndl = max(dot(n, uSunDir), 0.0);
      float sh = uShadows > 0.5 && ndl > 0.0 ? shadowAt(ndl) : 1.0;
      vec3 col = alb * (uAmb * vAO * (0.78 + 0.22 * n.y) + uSunCol * ndl * sh * (0.6 + 0.4 * vAO) + vec3(1.6, 0.95, 0.45) * torch * vAO);
      float a = uAlpha;
      vec3 vd = normalize(vPos - uEye);
      vec3 skyLin = pow(mix(uHorizon, uZenith, pow(max(vd.y, 0.0), 0.55)), vec3(2.2));
      if (uWater > 0.5) {
        vec3 v = normalize(uEye - vPos); float fr = pow(1.0 - max(dot(v, n), 0.0), 3.0);
        col = mix(col, skyLin * 0.7, fr * 0.5) + uSunCol * pow(max(dot(n, normalize(v + uSunDir)), 0.0), 140.0) * 1.6 * sh;
        a = mix(0.7, 0.95, fr);
      }
      col = mix(col, skyLin, vFog * vFog * (3.0 - 2.0 * vFog));
      gl_FragColor = vec4(grade(col), a);
    }`);
  // the shadow map: the world seen from the sun, its depth packed into colour
  const depthProg = program(`
    attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uLightMVP; varying vec2 vUV; varying float vD;
    void main() { gl_Position = uLightMVP * vec4(aPos, 1.0); vUV = aUV; vD = gl_Position.z * 0.5 + 0.5; }`, HIGH + `
    uniform sampler2D uTex; varying vec2 vUV; varying float vD;
    void main() { if (texture2D(uTex, vUV).a < 0.5) discard;
                  vec4 e = fract(vD * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); gl_FragColor = e; }`);
  // the realistic sky: from the horizon's haze to deep blue overhead, with the sun
  const skyProg = program(`
    attribute vec2 aXY; uniform mat4 uInv; varying vec3 vDir;
    void main() { gl_Position = vec4(aXY, 0.9999, 1.0); vec4 p = uInv * vec4(aXY, 1.0, 1.0); vDir = p.xyz / p.w; }`, HIGH + `
    uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunDir; uniform vec3 uSunCol; varying vec3 vDir;
    ${GRADE}
    void main() { vec3 d = normalize(vDir);
      vec3 c = pow(mix(uHorizon, uZenith, pow(max(d.y, 0.0), 0.55)), vec3(2.2));     // the same sky colour the haze uses
      float s = max(dot(d, uSunDir), 0.0);
      c += pow(uSunCol, vec3(2.2)) * (pow(s, 1400.0) * 6.0 + pow(s, 14.0) * 0.2 + pow(s, 3.0) * 0.05);
      gl_FragColor = vec4(grade(c), 1.0); }`);
  const lineProg = program(`attribute vec3 aPos; uniform mat4 uMVP; void main() { gl_Position = uMVP * vec4(aPos, 1.0); }`,
    `precision mediump float; uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 0.85); }`);
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  let shadowFB = null, shadowTex = null;
  const SHADOW = 2048;
  function shadowTarget() {
    if (shadowFB) return shadowFB;
    shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW, SHADOW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW, SHADOW);
    shadowFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return shadowFB;
  }
  const texture = gl.createTexture();
  const aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
  // switch between the blocky and the realistic textures (sharp pixels, or smooth with mipmaps)
  function useLook(style) {
    if (lookStyle === style) return;
    lookStyle = style;
    const a = atlasFor(style), real = style === "real";
    atlasURL = a.url;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, real ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, real ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (real) { gl.generateMipmap(gl.TEXTURE_2D); if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
    BC.setTilePad(real ? CraftLooks.pad : 0.0008);
    root.dataset.style = style;
    if (world) dirtyAll();
    if (mode) { renderHud(); if (ui) renderUI(); }
  }
  const dynBuf = gl.createBuffer(), lineBuf = gl.createBuffer();

  // matrices (column-major, as WebGL wants)
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, c, up) {
    let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map((v) => v / l);
    let x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]; l = Math.hypot(...x); x = x.map((v) => v / l);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const dot = (a) => a[0] * e[0] + a[1] * e[1] + a[2] * e[2];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x), -dot(y), -dot(z), 1];
  }
  function ortho(l, r, b, t, n, f) { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; }
  function invert(m) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    return [(a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
            (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
            (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
            (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det];
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }

  // ---------- state ----------
  const MODES = {
    creative: { name: "Creative", key: "sora.blockCraft.v1", text: "Build freely: every block and item in the inventory, flying, nothing can hurt you." },
    survival: { name: "Survival", key: "sora.blockCraft.survival.v1", text: "Start with nothing: collect blocks, mine ores, craft tools, armour, chests and torches, and look after your health." },
  };
  let mode = null, world = null, player = null, inv = null, slot = 0, chunks = new Map(), dirty = new Set(), saveTimer = 0;
  let playing = false, ui = null, target = null, mining = null, dayTime = 0.3, lastSpace = 0, surv = null;
  const keys = new Set(), mouse = { left: false, right: false };
  const stick = { x: 0, y: 0 }, touchBtn = { jump: false };
  let digMode = true;

  function applySettings() {
    useLook(S.style);
    $("info").classList.toggle("hidden", !S.info);
  }

  // ---------- modes ----------
  function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } }
  function chooseMode() {
    stopPlaying();
    overlay.replaceChildren(el("div", { class: "cr-overlay" },
      el("h2", {}, "Block Craft"), el("p", {}, "Choose how to play."),
      el("div", { class: "cr-modes" }, ...Object.entries(MODES).map(([k, m]) =>
        el("button", { type: "button", class: "cr-mode", onclick: () => startMode(k) },
          el("b", {}, m.name), el("span", {}, m.text), el("small", {}, loadJSON(m.key) ? "Continue your world" : "A new world"))))));
  }
  const cleanSlot = (s) => (s && BC.info(s.id) ? { id: s.id, count: s.count, dmg: s.dmg || 0 } : null);
  function startMode(m, fresh = false) {
    mode = m; ui = null; mining = null; target = null;
    $("modeName").textContent = MODES[m].name;
    root.dataset.mode = m;
    for (const c of chunks.values()) { gl.deleteBuffer(c.sb); gl.deleteBuffer(c.wb); }
    chunks = new Map(); dirty = new Set();
    const saved = fresh ? null : loadJSON(MODES[m].key);
    const seed = saved?.seed ?? Math.floor(Math.random() * 1e6);
    world = BC.makeWorld(seed);
    BC.applyEdits(world, saved?.edits, saved?.meta);
    world.furnaces = saved?.furnaces || {};
    world.chests = Object.fromEntries(Object.entries(saved?.chests || {}).map(([k, list]) => [k, list.map(cleanSlot)]));
    world.items = (saved?.items || []).filter((it) => BC.info(it.id));
    player = BC.spawnPlayer(world);
    world.spawn = saved?.spawn || player.pos.slice();
    if (saved?.player) Object.assign(player, { pos: saved.player.pos, yaw: saved.player.yaw, pitch: saved.player.pitch, fly: m === "creative" && !!saved.player.fly });
    if (BC.overlaps(world, player.pos)) player.pos = world.spawn.slice();
    inv = INV.newInventory();
    if (saved?.inv) {
      inv.slots = (Array.isArray(saved.inv) ? saved.inv : saved.inv.slots).map(cleanSlot);
      inv.armor = (saved.inv.armor || inv.armor).map(cleanSlot);
      inv.offhand = (saved.inv.offhand || inv.offhand).map(cleanSlot);
    } else if (m === "creative") [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.WOOD, B.GLASS, B.TORCH, B.CHEST].forEach((id, i) => (inv.slots[i] = { id, count: 1, dmg: 0 }));
    slot = saved?.slot ?? 0;
    dayTime = saved?.time ?? 0.3;
    surv = { hp: saved?.hp ?? 20, air: 15, sinceHurt: 99, regen: 0 };
    $("worldLine").textContent = `World ${seed} · kept in this browser`;
    dirtyAll(); renderHud(); showFly(); pause();
  }
  function save() {
    if (!world || !mode) return;
    const data = { seed: world.seed, edits: world.edits, meta: world.meta, furnaces: world.furnaces, chests: world.chests,
                   items: world.items.map(({ id, count, dmg, pos, age }) => ({ id, count, dmg, pos, vel: [0, 0, 0], age })), spawn: world.spawn,
                   slot, time: dayTime, inv: { slots: inv.slots, armor: inv.armor, offhand: inv.offhand },
                   player: { pos: player.pos, yaw: player.yaw, pitch: player.pitch, fly: player.fly } };
    if (mode === "survival") data.hp = surv.hp;
    try { localStorage.setItem(MODES[mode].key, JSON.stringify(data)); } catch { /* storage full: keep playing */ }
  }
  function dirtyAll() { for (let cx = 0; cx < Math.ceil(world.size / BC.CHUNK); cx++) for (let cz = 0; cz < Math.ceil(world.size / BC.CHUNK); cz++) dirty.add(`${cx},${cz}`); }
  // rebuild the chunks a change touches (and those whose light changed), save soon
  function changed(x, z, area) {
    const C = BC.CHUNK, [x0, z0, x1, z1] = area || [x - 1, z - 1, x + 1, z + 1];
    for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) for (let cz = Math.floor(z0 / C); cz <= Math.floor(z1 / C); cz++) dirty.add(`${cx},${cz}`);
    shadowStamp++;
    clearTimeout(saveTimer); saveTimer = setTimeout(save, 800);
  }
  function setBlock(x, y, z, id, meta) { changed(x, z, BC.set(world, x, y, z, id, meta)); }

  // ---------- chunks ----------
  function upload(data) { if (!data.length) return null; const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
  function rebuild(limit) {
    let n = 0;
    for (const key of dirty) {
      dirty.delete(key);
      const [cx, cz] = key.split(",").map(Number);
      if (cx < 0 || cz < 0 || cx * BC.CHUNK >= world.size || cz * BC.CHUNK >= world.size) continue;
      const old = chunks.get(key); if (old) { gl.deleteBuffer(old.sb); gl.deleteBuffer(old.wb); }
      const m = BC.chunkMesh(world, cx, cz);
      shadowStamp++;
      chunks.set(key, { sb: upload(m.solid), sn: m.solid.length / BC.STRIDE, wb: upload(m.water), wn: m.water.length / BC.STRIDE, cx, cz });
      if (++n >= limit) break;
    }
  }

  // ---------- breaking, placing, using ----------
  const held = () => inv?.slots[slot]?.id ?? 0;
  const centre = (x, y, z) => [x + 0.5, y + 0.3, z + 0.5];
  function dropAt(stack, pos) { if (stack && stack.count > 0) BC.dropItem(world, stack, pos); }
  function breakBlock(cell) {
    const [x, y, z] = cell, id = BC.get(world, x, y, z), b = BC.BLOCKS[id];
    if (!id || b.unbreakable) return;
    const k = BC.key(x, y, z), survival = mode === "survival";
    if (survival) {
      const { drops, right } = BC.breakTime(id, held());
      if (drops) dropAt({ id: b.drop, count: 1 }, centre(x, y, z));
      // the tool wears when it is the right one for the block (or any tool on a hard block)
      if (BC.ITEMS[held()]?.tool && (right || b.hardness > 0) && INV.wear(inv.slots, slot)) { sfx.breakTool(); note("Your tool broke"); }
    }
    // what a block held drops out (furnace, chest)
    const f = world.furnaces[k];
    if (f) for (const s of [f.input, f.fuel, f.output]) dropAt(s, centre(x, y, z));
    for (const s of world.chests[k] || []) dropAt(s, centre(x, y, z));
    // a door is two blocks: the other half goes too
    if (id === B.DOOR) { const top = world.meta[k]?.top, oy = top ? y - 1 : y + 1; if (BC.get(world, x, oy, z) === B.DOOR) setBlock(x, oy, z, B.AIR); }
    // water flows back in when a block next to it goes
    const wet = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([dx, dy, dz]) => BC.get(world, x + dx, y + dy, z + dz) === B.WATER);
    setBlock(x, y, z, wet && y <= world.water ? B.WATER : B.AIR);
    // things standing on it fall off: torches, beds, doors
    const above = BC.get(world, x, y + 1, z);
    if ([B.TORCH, B.BED, B.DOOR].includes(above) && !(above === B.DOOR && world.meta[BC.key(x, y + 1, z)]?.top)) breakBlock([x, y + 1, z]);
    sfx.dig(); renderHud();
  }
  const isNight = () => S.day && Math.sin(dayTime * Math.PI * 2) < -0.05;
  function use() {   // right click: use the block looked at (table, furnace, chest, door, bed) or place the block in the hand
    if (!target) return;
    const [hx, hy, hz] = target.hit, k = BC.key(hx, hy, hz), sneak = keys.has("ShiftLeft") || keys.has("ShiftRight");
    if (!sneak) {
      const opens = BC.BLOCKS[target.id]?.opens;
      if (opens) return openUI(opens, target.hit);
      if (target.id === B.DOOR) {
        const m = world.meta[k] || {}, other = m.top ? hy - 1 : hy + 1;
        setBlock(hx, hy, hz, B.DOOR, { ...m, open: !m.open });
        if (BC.get(world, hx, other, hz) === B.DOOR) setBlock(hx, other, hz, B.DOOR, { ...(world.meta[BC.key(hx, other, hz)] || {}), open: !m.open });
        return sfx.door();
      }
      if (target.id === B.BED) {
        world.spawn = [hx + 0.5, hy + 1.01, hz + 0.5];
        if (isNight()) { dayTime = 0.27; note("You slept until morning · spawn point set"); }
        else note(S.day ? "You can only sleep at night · spawn point set" : "Spawn point set");
        return save();
      }
    }
    // place from the main hand, or else the off hand
    const hand = BC.placeable(held()) ? [inv.slots, slot] : BC.placeable(inv.offhand[0]?.id) ? [inv.offhand, 0] : null;
    if (!hand || !BC.canPlace(world, player, target.place)) return;
    const id = hand[0][hand[1]].id, [x, y, z] = target.place, below = BC.blocked(world, x, y - 1, z);
    let meta;
    if (id === B.TORCH || id === B.BED) { if (!below) return note(`${BC.info(id).name} needs a block under it`); }
    if (id === B.LADDER) {
      const n = [x - hx, 0, z - hz];
      if (y !== hy || !BC.opaque(target.id)) return note("A ladder goes on the side of a block");
      meta = { n };
    }
    if (id === B.DOOR) {
      if (!below || BC.get(world, x, y + 1, z) !== B.AIR || !BC.canPlace(world, player, [x, y + 1, z])) return note("A door needs two free blocks on the ground");
      const f = BC.facingFromYaw(player.yaw);
      setBlock(x, y + 1, z, B.DOOR, { f, top: true });
      meta = { f };
    }
    setBlock(x, y, z, id, meta);
    if (id === B.FURNACE) world.furnaces[BC.key(x, y, z)] = INV.newFurnace();
    if (id === B.SIGN) {
      world.signSeq = (world.signSeq || 0) + 1;
      setBlock(x, y, z, B.SIGN, { n: world.signSeq, palace: lastPalace, name: "", emoji: "" });
      if (mode === "survival") INV.takeOne(hand[0], hand[1]);
      sfx.place(); renderHud();
      return openUI("sign", [x, y, z]);
    }
    if (id === B.CHEST) world.chests[BC.key(x, y, z)] = INV.newChest();
    if (mode === "survival") INV.takeOne(hand[0], hand[1]);
    sfx.place(); renderHud();
  }
  function pick() {   // middle click: select the block looked at from the hotbar (creative: put it in the hand)
    if (!target) return;
    const i = inv.slots.slice(0, 9).findIndex((s) => s && s.id === target.id);
    if (i >= 0) return choose(i);
    if (mode === "creative") { inv.slots[slot] = { id: target.id, count: 1, dmg: 0 }; renderHud(); }
  }
  // Q: throw one of what is in the hand (shift: the whole stack)
  function throwHeld(all) {
    const s = inv.slots[slot];
    if (!s) return;
    const n = all ? s.count : 1, d = BC.lookDir(player), eye = BC.eyeOf(player);
    BC.dropItem(world, { id: s.id, count: n, dmg: s.dmg }, [eye[0] + d[0] * 0.6, eye[1] - 0.4, eye[2] + d[2] * 0.6], [d[0] * 5, d[1] * 5 + 2, d[2] * 5]);
    world.items[world.items.length - 1].age = -0.8;          // not picked straight back up
    s.count -= n; if (s.count <= 0) inv.slots[slot] = null;
    renderHud();
  }
  function throwStack(stack) {
    const d = BC.lookDir(player), eye = BC.eyeOf(player);
    BC.dropItem(world, stack, [eye[0] + d[0] * 0.6, eye[1] - 0.4, eye[2] + d[2] * 0.6], [d[0] * 4, 2, d[2] * 4]);
    world.items[world.items.length - 1].age = -0.8;
  }
  function pickUp() {   // walk over dropped items to collect them
    const c = [player.pos[0], player.pos[1] + 0.8, player.pos[2]];
    let got = false;
    for (const it of world.items) {
      if (it.age < 0.6 || Math.hypot(it.pos[0] - c[0], it.pos[1] - c[1], it.pos[2] - c[2]) > 1.7) continue;
      const left = INV.add(inv, it.id, it.count, it.dmg);
      if (left < it.count) got = true;
      it.count = left;
    }
    if (got) { sfx.pop(); renderHud(); if (ui) renderUI(); }
  }

  // ---------- the inventory screens (E): inventory, crafting table, furnace, chest; creative has tabs and search ----------
  let uiCell = null, tab = "all", search = "";
  function openUI(kind, cell = null) {
    ui = kind; uiCell = cell; mining = null;
    keys.clear(); mouse.left = mouse.right = false;
    if (document.pointerLockElement) document.exitPointerLock();
    renderUI();
  }
  function closeUI() {
    if (!ui) return;
    for (const s of INV.giveBack(inv, inv.craft)) throwStack(s);
    if (inv.cursor) { for (const s of INV.giveBack(inv, [inv.cursor])) throwStack(s); inv.cursor = null; }
    ui = null; $("invPanel").replaceChildren(); $("invPanel").classList.add("hidden"); renderCursor();
    renderHud(); save();
    resume();
  }
  function slotEl(s, onPress, cls = "", hint = "") {
    const e = el("div", { class: "inv-slot " + cls }, s ? el("i", { style: iconStyle(s.id) }) : hint ? el("u", {}, hint) : "",
      s && s.count > 1 ? el("b", {}, String(s.count)) : "", s && s.dmg ? wearBar(s) : "");
    if (s) e.title = BC.info(s.id).name;
    e.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); onPress(ev.button === 2 ? 2 : 0, ev.shiftKey); renderUI(); renderHud(); });
    e.addEventListener("contextmenu", (ev) => ev.preventDefault());
    return e;
  }
  function wearBar(s) {   // how much of a tool is left, green to red
    const left = 1 - (s.dmg || 0) / BC.maxUses(s.id);
    return el("em", { class: "wear" }, el("span", { style: `width:${Math.round(left * 100)}%;background:hsl(${Math.round(left * 120)},80%,45%)` }));
  }
  function gridEl(slots, cols, from, to, onPress) {
    const g = el("div", { class: "inv-grid", style: `grid-template-columns:repeat(${cols}, var(--slot))` });
    for (let i = from; i < to; i++) g.append(slotEl(slots[i], (b, shift) => onPress(i, b, shift)));
    return g;
  }
  // the player in the inventory, wearing their armour
  function figure() {
    const col = (s) => (!s ? "" : s.id >= I.DIAMOND_HELMET ? "#5fe0de" : "#d8dadc");
    const [h, c, l, f] = inv.armor.map(col);
    const part = (cls, colour) => el("i", { class: cls, style: colour ? `background:${colour}` : "" });
    return el("div", { class: "inv-figure" }, part("head", h), part("body", c), part("arm l", c), part("arm r", c),
      part("leg l", l), part("leg r", l), part("foot l", f), part("foot r", f));
  }
  function craftingEl(size) {
    const grid = inv.craft;
    if (size === 2) for (const i of [2, 5, 6, 7, 8]) if (grid[i]) for (const s of INV.giveBack(inv, [grid[i]])) throwStack(s);
    const cells = el("div", { class: "inv-grid", style: `grid-template-columns:repeat(${size}, var(--slot))` });
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) { const i = r * 3 + c; cells.append(slotEl(grid[i], (b) => INV.click(inv, grid, i, b))); }
    const view = () => Array.from({ length: size * size }, (_, k) => grid[Math.floor(k / size) * 3 + (k % size)]);
    const recipe = INV.matchRecipe(view(), size);
    const result = slotEl(recipe ? { id: recipe.out[0], count: recipe.out[1] } : null, (b, shift) => {
      const v = view();                         // take from a size x size view of the 3 x 3 grid, then write it back
      INV.craft(inv, v, size, shift);
      v.forEach((s, k) => (grid[Math.floor(k / size) * 3 + (k % size)] = s));
    }, "inv-result");
    return el("div", { class: "inv-craft" }, cells, el("div", { class: "inv-arrow", style: "--p:1" }), result);
  }
  function recipeBook() {
    const name = (id) => BC.info(id).name;
    return el("details", { class: "inv-book" }, el("summary", {}, "Recipe book"),
      el("ul", {}, ...INV.RECIPES.map((r) => el("li", {}, el("i", { style: iconStyle(r.out[0]) }),
        `${name(r.out[0])}${r.out[1] > 1 ? ` × ${r.out[1]}` : ""}: `,
        r.shapeless ? r.shapeless.map(name).join(" + ") : r.pattern.map((row) => `[${[...row].map((ch) => (ch === " " ? "·" : name(r.keys[ch]).split(" ")[0])).join(" ")}]`).join(" ")))),
      el("p", { class: "inv-hint" }, "Furnace: sand → glass, cobblestone → stone, wood → charcoal, iron ore → iron ingot."));
  }
  function renderUI() {
    const panel = $("invPanel");
    if (!ui) return;
    panel.classList.remove("hidden");
    const parts = [], survival = mode === "survival";
    const press = (slots) => (i, b, shift) => (shift ? (ui === "chest" ? INV.moveAcross(slots, i, world.chests[uiCell.join(",")]) : INV.quickMove(inv, i)) : INV.click(inv, slots, i, b));
    if (ui === "inventory" && !survival) {
      // creative: tabs, search, everything there is
      const tabs = [["all", "All"], ["building", "Building"], ["nature", "Nature and ores"], ["useful", "Useful"], ["tools", "Tools and armour"], ["materials", "Materials"]];
      const input = el("input", { type: "search", class: "inv-search", placeholder: "Search", value: search, "aria-label": "Search blocks and items" });
      input.addEventListener("input", () => { search = input.value; renderUI(); const i = $("invPanel").querySelector(".inv-search"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); });
      const list = BC.CREATIVE.filter((id) => (tab === "all" || BC.category(id) === tab) && BC.info(id).name.toLowerCase().includes(search.trim().toLowerCase()));
      const pal = el("div", { class: "inv-grid inv-palette", style: "grid-template-columns:repeat(9, var(--slot))" });
      for (const id of list) pal.append(slotEl({ id, count: 1 }, (b) => {
        if (inv.cursor) inv.cursor = null;                        // a held stack put back on the palette goes away
        else inv.cursor = { id, count: b === 2 ? 1 : BC.maxStack(id), dmg: 0 };
      }));
      parts.push(el("div", { class: "inv-tabs" }, ...tabs.map(([k, label]) => el("button", { type: "button", class: k === tab ? "on" : "", onclick: () => { tab = k; renderUI(); } }, label)), input),
        list.length ? pal : el("p", { class: "inv-hint" }, "Nothing found."));
    } else if (ui === "inventory") {
      // survival: armour on the player, the off hand, and a 2 x 2 crafting grid
      const fits = (k) => (id) => BC.info(id).armor?.slot === k;
      const armour = el("div", { class: "inv-col" }, ...inv.armor.map((s, k) => slotEl(s, (b, shift) => (shift ? INV.moveAcross(inv.armor, k, inv.slots) : INV.click(inv, inv.armor, k, b, fits(k))), "", ["Head", "Body", "Legs", "Feet"][k])));
      parts.push(el("div", { class: "inv-top" }, armour, figure(),
        el("div", { class: "inv-col" }, el("small", {}, "Off hand"), slotEl(inv.offhand[0], (b) => INV.click(inv, inv.offhand, 0, b))),
        el("div", {}, el("div", { class: "inv-title" }, "Crafting"), craftingEl(2))),
        el("div", { class: "inv-hint" }, `Armour ${INV.armorPoints(inv)} of 20 · it softens falls`), recipeBook());
    } else if (ui === "table") {
      parts.push(el("div", { class: "inv-title" }, "Crafting table"), craftingEl(3), recipeBook());
    } else if (ui === "sign") {
      return renderSign();
    } else if (ui === "chest") {
      const c = world.chests[uiCell.join(",")] ||= INV.newChest();
      parts.push(el("div", { class: "inv-title" }, "Chest"), gridEl(c, 9, 0, INV.CHEST, (i, b, shift) => (shift ? INV.moveAcross(c, i, inv.slots) : INV.click(inv, c, i, b))));
    } else if (ui === "furnace") {
      const f = world.furnaces[uiCell.join(",")] ||= INV.newFurnace();
      const fs = [f.input, f.fuel, f.output];
      const pressF = (i, b) => {
        if (i === 2) { if (f.output && (!inv.cursor || (inv.cursor.id === f.output.id && inv.cursor.count + f.output.count <= BC.maxStack(f.output.id)))) { inv.cursor = inv.cursor ? { ...inv.cursor, count: inv.cursor.count + f.output.count } : f.output; f.output = null; } return; }
        INV.click(inv, fs, i, b); f.input = fs[0]; f.fuel = fs[1];
      };
      parts.push(el("div", { class: "inv-title" }, "Furnace"),
        el("div", { class: "inv-furnace" },
          el("div", { class: "inv-col" }, slotEl(f.input, (b) => pressF(0, b)), el("div", { class: "inv-flame", style: `--p:${f.burnMax ? f.burn / f.burnMax : 0}` }), slotEl(f.fuel, (b) => pressF(1, b))),
          el("div", { class: "inv-arrow", style: `--p:${f.progress / INV.SMELT_TIME}` }), slotEl(f.output, (b) => pressF(2, b), "inv-result")),
        el("div", { class: "inv-hint" }, "Top: what to smelt (sand, cobblestone, wood, iron ore). Bottom: fuel (coal, charcoal, wood, planks, sticks)."));
    }
    if (survival || ui !== "inventory") parts.push(el("div", { class: "inv-title" }, "Inventory"), gridEl(inv.slots, 9, 9, 36, press(inv.slots)));
    parts.push(el("div", { class: "inv-title" }, "Hotbar"), gridEl(inv.slots, 9, 0, 9, press(inv.slots)));
    parts.push(el("div", { class: "inv-foot" }, el("span", { class: "inv-hint" }, touch ? "Tap to pick up and put down. Tap outside to drop." :
      "Left click: pick up or put down · right click: half or one · shift-click: move across · click outside: drop"),
      el("button", { type: "button", class: "primary", onclick: closeUI }, "Close (E)")));
    const card = el("div", { class: "inv-card" }, ...parts);
    card.addEventListener("pointerdown", (e) => e.stopPropagation());
    panel.replaceChildren(card);
    renderCursor();
  }
  // clicking outside the window drops what is held, as in Minecraft
  $("invPanel").addEventListener("pointerdown", (e) => {
    if (!ui || !inv.cursor || e.target !== $("invPanel")) return;
    const c = inv.cursor;
    if (e.button === 2) { throwStack({ ...c, count: 1 }); if (--c.count <= 0) inv.cursor = null; } else { throwStack(c); inv.cursor = null; }
    renderUI();
  });
  $("invPanel").addEventListener("contextmenu", (e) => e.preventDefault());
  let cursorPos = [0, 0];
  function renderCursor() {
    const c = $("invCursor");
    if (!ui || !inv?.cursor) { c.classList.add("hidden"); return; }
    c.classList.remove("hidden");
    c.replaceChildren(el("i", { style: iconStyle(inv.cursor.id) }), inv.cursor.count > 1 ? el("b", {}, String(inv.cursor.count)) : "");
    c.style.transform = `translate(${cursorPos[0]}px, ${cursorPos[1]}px)`;
  }
  field.addEventListener("pointermove", (e) => { const r = field.getBoundingClientRect(); cursorPos = [e.clientX - r.left - 18, e.clientY - r.top - 18]; if (ui && inv.cursor) $("invCursor").style.transform = `translate(${cursorPos[0]}px, ${cursorPos[1]}px)`; });

  // ---------- HUD ----------
  let nameTimer = 0;
  function choose(i) {
    slot = (i + 9) % 9; renderHud();
    const s = inv?.slots[slot];
    note(s ? BC.info(s.id).name : "");
  }
  function note(text) { const n = $("blockName"); n.textContent = text; n.style.opacity = text ? 1 : 0; clearTimeout(nameTimer); nameTimer = setTimeout(() => (n.style.opacity = 0), 1600); }
  function renderHud() {
    $("hotbar").classList.toggle("hidden", !mode);
    $("hearts").classList.toggle("hidden", mode !== "survival");
    if (!mode) return;
    $("hotbar").replaceChildren(...inv.slots.slice(0, 9).map((s, i) => {
      const b = el("button", { class: "cr-slot" + (i === slot ? " on" : ""), type: "button", title: s ? BC.info(s.id).name : "" },
        s ? el("i", { style: iconStyle(s.id) }) : "", el("b", { class: "n" }, String(i + 1)),
        s && mode === "survival" && s.count > 1 ? el("b", { class: "c" }, String(s.count)) : "", s && s.dmg ? wearBar(s) : "");
      b.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); choose(i); });
      return b;
    }), ...(inv.offhand[0] ? [el("div", { class: "cr-slot off", title: "Off hand: " + BC.info(inv.offhand[0].id).name }, el("i", { style: iconStyle(inv.offhand[0].id) }),
      mode === "survival" && inv.offhand[0].count > 1 ? el("b", { class: "c" }, String(inv.offhand[0].count)) : "")] : []));
    if (mode === "survival") {
      const pts = INV.armorPoints(inv);
      $("hearts").replaceChildren(
        ...(pts ? [el("span", { class: "armour" }, ...Array.from({ length: 10 }, (_, i) => el("i", { class: pts >= (i + 1) * 2 ? "" : pts === i * 2 + 1 ? "half" : "off" })))] : []),
        el("span", { class: "hp" }, ...Array.from({ length: 10 }, (_, i) => el("i", { class: surv.hp >= (i + 1) * 2 ? "" : surv.hp === i * 2 + 1 ? "half" : "off" }))),
        ...(surv.air < 15 ? [el("span", { class: "air" }, ...Array.from({ length: 10 }, (_, i) => el("i", { class: surv.air > i * 1.5 ? "" : "off" })))] : []));
    }
  }

  // ---------- controls ----------
  const look = (dx, dy, k) => {
    player.yaw -= dx * k * S.sens / 6;
    player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - dy * k * S.sens / 6 * (S.invert ? -1 : 1)));
  };
  canvas.addEventListener("mousedown", (e) => {
    if (touch || ui) return;
    if (!playing) return resume();
    e.preventDefault();
    if (e.button === 0) { mouse.left = true; if (mode === "creative" && target) { breakBlock(target.hit); mining = { repeat: 0.25 }; } }
    else if (e.button === 2) { mouse.right = true; use(); }
    else if (e.button === 1) pick();
  });
  document.addEventListener("mouseup", (e) => { if (e.button === 0) { mouse.left = false; mining = null; } if (e.button === 2) mouse.right = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  let lockedAt = 0;
  document.addEventListener("mousemove", (e) => {
    if (!playing || touch || document.pointerLockElement !== canvas) return;
    if (performance.now() - lockedAt < 150 || Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;   // the jump some browsers report as the mouse is captured
    look(e.movementX, e.movementY, 0.0025);
  });
  canvas.addEventListener("wheel", (e) => { if (!playing) return; e.preventDefault(); choose(slot + Math.sign(e.deltaY)); }, { passive: false });
  document.addEventListener("keydown", (e) => {
    if (!mode || e.ctrlKey || e.metaKey || e.altKey || settings.isOpen() || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.code === "KeyE" && (playing || ui)) { e.preventDefault(); ui ? closeUI() : openUI("inventory"); return; }
    if (ui && e.key === "Escape") { closeUI(); return; }
    if (!playing) return;
    if (e.key === "Tab") { e.preventDefault(); if (document.pointerLockElement) document.exitPointerLock(); else pause(); return; }
    if (/^[1-9]$/.test(e.key)) choose(Number(e.key) - 1);
    if (e.code === "KeyQ") throwHeld(e.shiftKey);
    if (e.code === "KeyX") { [inv.slots[slot], inv.offhand[0]] = [inv.offhand[0], inv.slots[slot]]; renderHud(); }   // swap hands
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat && mode === "creative" && performance.now() - lastSpace < 300) { player.fly = !player.fly; player.vel[1] = 0; showFly(); }
      if (!e.repeat) lastSpace = performance.now();
    }
    keys.add(e.code);
  });
  document.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); mouse.left = mouse.right = false; });

  function resume() {
    if (!mode || ui) return;
    overlay.replaceChildren(); playing = true;
    if (!touch) canvas.requestPointerLock?.();
  }
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      lockedAt = performance.now();
      const hint = $("lockHint");
      hint.classList.add("on"); clearTimeout(hint.timer); hint.timer = setTimeout(() => hint.classList.remove("on"), 4500);
    } else {
      $("lockHint").classList.remove("on");
      if (playing && !touch && !ui) pause();
    }
  });
  document.addEventListener("pointerlockerror", () => { if (!touch && !ui) pause(); });
  function stopPlaying() { playing = false; keys.clear(); mouse.left = mouse.right = false; mining = null; if (document.pointerLockElement) document.exitPointerLock(); }
  function pause() {
    stopPlaying(); save();
    if (!mode) return;
    const help = touch
      ? [["Left circle", "walk"], ["Drag on the world", "look around"], ["Hold on a block", "dig (or tap to use or place, with the switch)"], ["Bag / Drop", "inventory and crafting / throw what is in the hand"]]
      : [["W A S D", "walk"], ["Mouse", "look around"], ["Left click", mode === "survival" ? "hold to dig a block" : "dig a block"],
         ["Right click", "place a block · open a table, furnace or chest · open a door · sleep in a bed"],
         ["E", "inventory and crafting"], ["1 – 9, wheel", "choose from the hotbar"], ["Q / Shift+Q", "throw one / the whole stack"], ["X", "swap with the off hand"],
         ["Space", mode === "creative" ? "jump · twice quickly: fly" : "jump · climb a ladder"], ["Shift", mode === "creative" ? "run · in flight: down" : "sneak (won't fall off edges)"],
         ["Middle click", "pick the block looked at"], ["F", "full screen"], ["Esc or Tab", "pause and get the mouse back"]];
    overlay.replaceChildren(el("div", { class: "cr-overlay" },
      el("h2", {}, `Block Craft · ${MODES[mode].name}`),
      el("p", {}, MODES[mode].text),
      el("div", { class: "keys" }, ...help.flatMap(([k, v]) => [el("span", {}, el("kbd", {}, k)), el("span", {}, v)])),
      el("div", { class: "row" },
        el("button", { class: "primary", type: "button", onclick: resume }, touch ? "Play" : "Click to play"),
        el("button", { type: "button", onclick: chooseMode }, "Change mode"))));
  }
  function showFly() { $("flyBtn").textContent = `Fly: ${player?.fly ? "on" : "off"}`; }

  // touch: a stick to walk, drag to look, hold to dig / tap to use or place, buttons for the rest
  if (touch) {
    const st = $("stick"), knob = $("knob");
    let stickId = null, lookId = null, lookStart = null, lookLast = null, holdTimer = 0;
    st.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); stickId = e.pointerId; st.setPointerCapture(e.pointerId); moveStick(e); });
    st.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) moveStick(e); });
    const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; stick.x = stick.y = 0; knob.style.transform = ""; } };
    st.addEventListener("pointerup", endStick); st.addEventListener("pointercancel", endStick);
    function moveStick(e) {
      const r = st.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const l = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx);
      stick.x = Math.cos(a) * l; stick.y = Math.sin(a) * l;
      knob.style.transform = `translate(${stick.x * 35}px, ${stick.y * 35}px)`;
    }
    canvas.addEventListener("pointerdown", (e) => {
      if (!playing || lookId !== null) return;
      lookId = e.pointerId; lookStart = lookLast = [e.clientX, e.clientY, performance.now()]; canvas.setPointerCapture(e.pointerId);
      if (digMode) holdTimer = setTimeout(() => { if (lookId !== null) { mouse.left = true; if (mode === "creative" && target) breakBlock(target.hit); } }, 220);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== lookId) return;
      look(e.clientX - lookLast[0], e.clientY - lookLast[1], 0.006);
      lookLast = [e.clientX, e.clientY];
      if (Math.hypot(e.clientX - lookStart[0], e.clientY - lookStart[1]) > 12 && !mouse.left) clearTimeout(holdTimer);
    });
    const endLook = (e) => {
      if (e.pointerId !== lookId) return;
      clearTimeout(holdTimer);
      const quick = Math.hypot(e.clientX - lookStart[0], e.clientY - lookStart[1]) < 12 && performance.now() - lookStart[2] < 220;
      if (quick) (digMode ? (mode === "creative" && target && breakBlock(target.hit)) : use());
      mouse.left = false; mining = null; lookId = null;
    };
    canvas.addEventListener("pointerup", endLook); canvas.addEventListener("pointercancel", endLook);
    const jb = $("jumpBtn");
    jb.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); touchBtn.jump = true; });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) jb.addEventListener(ev, () => (touchBtn.jump = false));
    $("modeBtn").addEventListener("click", () => { digMode = !digMode; $("modeBtn").textContent = digMode ? "Tap: dig" : "Tap: use"; });
    $("flyBtn").addEventListener("click", () => { if (mode === "creative") { player.fly = !player.fly; player.vel[1] = 0; showFly(); } });
    $("bagBtn").addEventListener("click", () => (ui ? closeUI() : openUI("inventory")));
    $("dropBtn").addEventListener("click", () => { if (playing) throwHeld(false); });
  }

  // ---------- survival: health ----------
  function hurt(n, why, armour = false) {
    if (mode !== "survival" || n <= 0) return;
    if (armour) n = Math.round(INV.afterArmor(n, INV.armorPoints(inv)));
    if (n <= 0) return;
    surv.hp = Math.max(0, surv.hp - n); surv.sinceHurt = 0; sfx.hurt();
    $("dmg").style.opacity = 0.45; setTimeout(() => ($("dmg").style.opacity = 0), 180);
    renderHud();
    if (surv.hp <= 0) die(why);
  }
  function die(why) {
    stopPlaying();
    if (!S.keep) {   // everything falls where you died, as in Minecraft
      for (const list of [inv.slots, inv.armor, inv.offhand, inv.craft]) for (let i = 0; i < list.length; i++) if (list[i]) { BC.dropItem(world, list[i], [player.pos[0], player.pos[1] + 1, player.pos[2]]); list[i] = null; }
    }
    overlay.replaceChildren(el("div", { class: "cr-overlay" },
      el("h2", { class: "bad" }, "You died"), el("p", {}, why + (S.keep ? " Your inventory is kept." : " Your things are where you died.")),
      el("div", { class: "row" }, el("button", { class: "primary", type: "button", onclick: () => {
        surv.hp = 20; surv.air = 15; player.pos = world.spawn.slice(); player.vel = [0, 0, 0]; renderHud(); save(); resume();
      } }, "Respawn"))));
  }

  // ---------- the loop ----------
  let last = performance.now(), frames = 0, fpsT = 0, fps = 0, bobT = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (world) {
      rebuild(chunks.size < Math.ceil(world.size / BC.CHUNK) ** 2 ? 6 : 2);
      for (const f of Object.values(world.furnaces)) INV.furnaceTick(f, dt);
      if (ui === "furnace" && Math.floor(now / 250) !== Math.floor((now - dt * 1000) / 250)) renderUI();
      BC.stepItems(world, dt);
      if (playing) step(dt);
      if (S.day) dayTime = (dayTime + dt / S.day) % 1;
      draw();
      frames++; fpsT += dt;
      if (fpsT >= 1) { fps = frames; frames = 0; fpsT = 0; }
      const p = player.pos;
      $("info").textContent = `x ${p[0].toFixed(0)}  y ${p[1].toFixed(0)}  z ${p[2].toFixed(0)}${player.fly ? " · flying" : ""} · ${fps} fps`;
    }
    requestAnimationFrame(tick);
  }
  function step(dt) {
    const k = (c) => keys.has(c), shift = k("ShiftLeft") || k("ShiftRight");
    const input = {
      forward: (k("KeyW") || k("ArrowUp") ? 1 : 0) - (k("KeyS") || k("ArrowDown") ? 1 : 0) - stick.y,
      right: (k("KeyD") || k("ArrowRight") ? 1 : 0) - (k("KeyA") || k("ArrowLeft") ? 1 : 0) + stick.x,
      jump: k("Space") || touchBtn.jump,
      crouch: mode === "survival" && shift,
      sprint: mode === "creative" && shift && !player.fly,
      down: shift && player.fly,
    };
    player.crouch = !!input.crouch && !player.fly;
    const res = BC.stepPlayer(world, player, input, dt);
    bobT += dt * Math.hypot(player.vel[0], player.vel[2]);
    const eyeBlock = BC.get(world, ...BC.eyeOf(player).map(Math.floor));
    $("water").classList.toggle("hidden", eyeBlock !== B.WATER);
    target = BC.raycast(world, BC.eyeOf(player), BC.lookDir(player));
    pickUp();
    // breaking: survival takes time (cracks show progress), creative repeats while held
    if (mouse.left && target) {
      if (mode === "creative") { if (mining && (mining.repeat -= dt) <= 0) { breakBlock(target.hit); mining.repeat = 0.25; } else if (!mining) { breakBlock(target.hit); mining = { repeat: 0.25 }; } }
      else {
        const key = target.hit.join(",");
        if (!mining || mining.key !== key) mining = { key, cell: target.hit, p: 0 };
        const t = Math.max(0.05, BC.breakTime(target.id, held()).time);
        mining.p += dt / t;
        if (Math.floor(mining.p * 8) !== Math.floor((mining.p - dt / t) * 8)) sfx.hit();
        if (mining.p >= 1) { breakBlock(target.hit); mining = null; }
      }
    } else if (mode === "survival") mining = null;
    if (mode === "survival") {
      if (S.fall) hurt(BC.fallDamage(res.impact), "You fell from a high place.", true);
      if (eyeBlock === B.WATER) { surv.air -= dt; if (surv.air <= 0) { surv.air = 1; hurt(2, "You drowned."); } }
      else surv.air = Math.min(15, surv.air + dt * 5);
      surv.sinceHurt += dt;
      if (surv.hp < 20 && surv.sinceHurt > 4) { surv.regen += dt; if (surv.regen > 2) { surv.regen = 0; surv.hp++; renderHud(); } }
      if (Math.floor(surv.air) !== surv.shownAir) { surv.shownAir = Math.floor(surv.air); renderHud(); }
    }
  }

  // ---------- drawing ----------
  const SKY_DAY = [0.56, 0.77, 1.0], SKY_NIGHT = [0.03, 0.05, 0.13];
  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  // the realistic look's sun and sky for the time of day
  function sunlight() {
    const t = !S.day ? 0.17 : dayTime;
    let dir = [Math.cos(t * Math.PI * 2) * 0.8, Math.sin(t * Math.PI * 2), 0.42];
    const l = Math.hypot(...dir); dir = dir.map((v) => v / l);
    const up = dir[1], day = Math.max(0, Math.min(1, (up + 0.08) / 0.3)), low = Math.max(0, Math.min(1, 1 - up / 0.45));
    const sunCol = lerp3([1.0, 0.95, 0.85], [1.0, 0.62, 0.36], low).map((v) => v * 2.15 * day);
    const night = 1 - day;
    // at night the moon lights the world from the other side, faintly
    const light = up > -0.05 ? dir : dir.map((v) => -v);
    const col = up > -0.05 ? sunCol : [0.12, 0.15, 0.24];
    const horizon = lerp3(lerp3([0.66, 0.74, 0.84], [0.95, 0.58, 0.38], low * day * 0.8), [0.05, 0.07, 0.13], night);
    const zenith = lerp3([0.16, 0.36, 0.74], [0.01, 0.02, 0.06], night);
    const amb = lerp3([0.42, 0.46, 0.55], [0.13, 0.15, 0.24], night);
    return { dir: light, sunDir: dir, col, horizon, zenith, amb };
  }
  let shadowKey = "", shadowStamp = 0, lastMVP = null;
  function drawShadows(lightMVP, c, R) {
    const STRIDE = BC.STRIDE * 4;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowTarget());
    gl.viewport(0, 0, SHADOW, SHADOW);
    gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    const D = depthProg;
    gl.useProgram(D.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniformMatrix4fv(D.loc.uLightMVP, false, lightMVP);
    gl.enableVertexAttribArray(D.loc.aPos); gl.enableVertexAttribArray(D.loc.aUV);
    for (const ch of chunks.values()) {
      if (!ch.sb || Math.hypot((ch.cx + .5) * BC.CHUNK - c[0], (ch.cz + .5) * BC.CHUNK - c[2]) > R + 30) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, ch.sb);
      gl.vertexAttribPointer(D.loc.aPos, 3, gl.FLOAT, false, STRIDE, 0); gl.vertexAttribPointer(D.loc.aUV, 2, gl.FLOAT, false, STRIDE, 12);
      gl.drawArrays(gl.TRIANGLES, 0, ch.sn);
    }
    gl.disableVertexAttribArray(D.loc.aPos); gl.disableVertexAttribArray(D.loc.aUV);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const real = lookStyle === "real";
    // daylight: 1 at noon, low at night
    const sun = !S.day ? 1 : Math.max(0.32, Math.min(1, 0.6 + Math.sin(dayTime * Math.PI * 2) * 0.9));
    const L = real ? sunlight() : null;
    const sky = real ? L.horizon : SKY_NIGHT.map((v, i) => v + (SKY_DAY[i] - v) * Math.min(1, (sun - 0.32) / 0.68));
    const eye = BC.eyeOf(player), d = BC.lookDir(player);
    if (S.bob && player.onGround) eye[1] += Math.abs(Math.sin(bobT * 2.2) * 0.04) * 0.6;
    const fog = S.dist;
    const near = [...chunks.values()].filter((c) => Math.hypot((c.cx + .5) * BC.CHUNK - eye[0], (c.cz + .5) * BC.CHUNK - eye[2]) < fog + 24);
    const T = texProg, STRIDE = BC.STRIDE * 4;
    // shadows: the nearby world seen from the sun, drawn again only when something changed
    let lightMVP = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const shadows = real && S.shadows;
    if (shadows) {
      const R = 60, c = player.pos.map((v) => Math.round(v / 4) * 4);
      const from = [c[0] + L.dir[0] * 140, c[1] + L.dir[1] * 140, c[2] + L.dir[2] * 140];
      lightMVP = mul(ortho(-R, R, -R, R, 1, 300), lookAt(from, c, Math.abs(L.dir[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0]));
      const key = `${c.join(",")}|${L.dir.map((v) => v.toFixed(2)).join(",")}|${shadowStamp}`;
      if (key !== shadowKey) { shadowKey = key; drawShadows(lightMVP, c, R); }
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(...sky, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = perspective(S.fov * Math.PI / 180, w / h, 0.05, 260);
    const mvp = mul(proj, lookAt(eye, [eye[0] + d[0], eye[1] + d[1], eye[2] + d[2]], [0, 1, 0]));
    lastMVP = mvp;
    if (real) {   // the sky behind everything
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      const K = skyProg;
      gl.useProgram(K.p);
      gl.uniformMatrix4fv(K.loc.uInv, false, invert(mul(proj, lookAt([0, 0, 0], d, [0, 1, 0]))));
      gl.uniform3fv(K.loc.uHorizon, L.horizon); gl.uniform3fv(K.loc.uZenith, L.zenith); gl.uniform3fv(K.loc.uSunDir, L.sunDir);
      gl.uniform3fv(K.loc.uSunCol, L.sunDir[1] > -0.05 ? L.col.map((v) => v / 2.15) : [0, 0, 0]);
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.enableVertexAttribArray(K.loc.aXY); gl.vertexAttribPointer(K.loc.aXY, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(K.loc.aXY);
      gl.depthMask(true);
    }
    gl.enable(gl.DEPTH_TEST);
    // world
    gl.useProgram(T.p);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadows ? shadowTex : texture);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(T.loc.uTex, 0); gl.uniform1i(T.loc.uShadowMap, 1);
    gl.uniformMatrix4fv(T.loc.uMVP, false, mvp); gl.uniformMatrix4fv(T.loc.uLightMVP, false, lightMVP);
    gl.uniform3fv(T.loc.uEye, eye); gl.uniform1f(T.loc.uFog, fog); gl.uniform3fv(T.loc.uSky, sky); gl.uniform1f(T.loc.uLight, sun);
    gl.uniform1f(T.loc.uReal, real ? 1 : 0); gl.uniform1f(T.loc.uShadows, shadows ? 1 : 0); gl.uniform1f(T.loc.uWater, 0);
    gl.uniform1f(T.loc.uTime, performance.now() / 1000);
    if (real) {
      gl.uniform3fv(T.loc.uSunDir, L.dir); gl.uniform3fv(T.loc.uSunCol, L.col); gl.uniform3fv(T.loc.uAmb, L.amb);
      gl.uniform3fv(T.loc.uHorizon, L.horizon); gl.uniform3fv(T.loc.uZenith, L.zenith);
    }
    const attrs = [T.loc.aPos, T.loc.aUV, T.loc.aShade, T.loc.aNormal, T.loc.aTorch];
    for (const a of attrs) gl.enableVertexAttribArray(a);
    const bind = (buf) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(T.loc.aPos, 3, gl.FLOAT, false, STRIDE, 0); gl.vertexAttribPointer(T.loc.aUV, 2, gl.FLOAT, false, STRIDE, 12);
      gl.vertexAttribPointer(T.loc.aShade, 1, gl.FLOAT, false, STRIDE, 20); gl.vertexAttribPointer(T.loc.aNormal, 3, gl.FLOAT, false, STRIDE, 24);
      gl.vertexAttribPointer(T.loc.aTorch, 1, gl.FLOAT, false, STRIDE, 36);
    };
    gl.disable(gl.BLEND); gl.uniform1f(T.loc.uAlpha, 1);
    for (const c of near) if (c.sb) { bind(c.sb); gl.drawArrays(gl.TRIANGLES, 0, c.sn); }
    // dropped items
    const t = performance.now() / 1000, iv = [];
    for (const it of world.items) {
      if (Math.hypot(it.pos[0] - eye[0], it.pos[2] - eye[2]) > fog) continue;
      iv.push(...BC.itemMesh(it, t, BC.lightAt(world, ...it.pos.map(Math.floor)) / 15));
    }
    if (iv.length) { gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(iv), gl.DYNAMIC_DRAW); bind(dynBuf); gl.drawArrays(gl.TRIANGLES, 0, iv.length / BC.STRIDE); }
    if (mining?.cell && mining.p > 0) {    // cracks on the block being broken
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf); gl.bufferData(gl.ARRAY_BUFFER, BC.crackMesh(mining.cell, Math.min(5, Math.floor(mining.p * 6))), gl.DYNAMIC_DRAW);
      bind(dynBuf); gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(T.loc.uAlpha, .72); gl.uniform1f(T.loc.uWater, 1);
    for (const c of near) if (c.wb) { bind(c.wb); gl.drawArrays(gl.TRIANGLES, 0, c.wn); }
    gl.depthMask(true); gl.disable(gl.BLEND);
    for (const a of attrs) gl.disableVertexAttribArray(a);
    drawSigns(eye);
    // outline of the block looked at
    if (target && playing) {
      const [x, y, z] = target.hit, P = [];
      const [bx0, by0, bz0, bx1, by1, bz1] = BC.BLOCKS[target.id].shape === "cube" ? [0, 0, 0, 1, 1, 1] : BC.shapeBoxes(world, x, y, z, target.id)[0];
      const corner = (i) => [x + (i & 1 ? bx1 + 0.003 : bx0 - 0.003), y + (i & 2 ? by1 + 0.003 : by0 - 0.003), z + (i & 4 ? bz1 + 0.003 : bz0 - 0.003)];
      for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) P.push(...corner(i), ...corner(j));
      gl.useProgram(lineProg.p); gl.uniformMatrix4fv(lineProg.loc.uMVP, false, mvp); gl.uniform3fv(lineProg.loc.uColor, [0, 0, 0]);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(lineProg.loc.aPos); gl.vertexAttribPointer(lineProg.loc.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, P.length / 3); gl.disableVertexAttribArray(lineProg.loc.aPos);
    }
  }

  // ---------- memory signs: build your own Memory Palace routes ----------
  // Each sign is one place: a name and a picture, numbered in the order it was placed, in a palace you name.
  // "My palaces" turns the signs of a palace into a Memory Palace route (kept in this browser).
  const PICTURES = ["🚪", "🪑", "🛏️", "🛁", "🍳", "📺", "🎹", "📚", "🖼️", "🪴", "⏰", "💡", "🧸", "🎁", "🗿", "⛲", "🌳", "🌉", "🏰", "🗼", "⛪", "🏛️",
                    "⚓", "🔔", "🕯️", "🏺", "🗝️", "🎯", "🎨", "🎸", "🏆", "⚽", "🚲", "🚗", "🚀", "🐉", "🦁", "🐘", "🦉", "🐟", "🍎", "🌋", "🌈", "⭐"];
  let lastPalace = "My first palace";
  const signs = () => Object.entries(world.meta).filter(([k, m]) => BC.get(world, ...k.split(",").map(Number)) === B.SIGN && m.n)
    .map(([k, m]) => ({ cell: k.split(",").map(Number), ...m })).sort((a, b) => a.n - b.n);
  function renderSign() {
    const k = uiCell.join(","), m = world.meta[k] || {};
    const save = () => { world.meta[k] = { ...m, name: name.value.trim(), palace: pal.value.trim() || "My first palace", emoji: chosen }; lastPalace = world.meta[k].palace; signTex.delete(k); changed(uiCell[0], uiCell[2]); };
    const name = el("input", { type: "text", value: m.name || "", placeholder: "Name of this place, e.g. Red door", class: "inv-search", style: "width:100%;margin:0" });
    const pal = el("input", { type: "text", value: m.palace || lastPalace, placeholder: "Which palace", class: "inv-search", style: "width:100%;margin:0", list: "palaceNames" });
    const names = [...new Set(signs().map((x) => x.palace))];
    let chosen = m.emoji || "";
    const grid = el("div", { class: "sign-pics" }, ...PICTURES.map((e) => el("button", { type: "button", class: e === chosen ? "on" : "", onclick: (ev) => {
      chosen = e; grid.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === ev.currentTarget)); } }, e)));
    const inPalace = signs().filter((x) => x.palace === (m.palace || lastPalace));
    const card = el("div", { class: "inv-card sign-card" },
      el("div", { class: "inv-title" }, `Memory sign ${inPalace.findIndex((x) => x.cell.join(",") === k) + 1 || inPalace.length + 1} of the palace`),
      el("p", { class: "inv-hint" }, "Each sign is one place on your route. Signs are visited in the order you placed them. Give each a clear name and a picture."),
      el("label", { class: "inv-title" }, "This place"), name,
      el("label", { class: "inv-title" }, "Palace (the same name for every sign of one palace)"), pal, el("datalist", { id: "palaceNames" }, ...names.map((n) => el("option", { value: n }))),
      el("label", { class: "inv-title" }, "Picture"), grid,
      el("div", { class: "inv-foot" }, el("button", { type: "button", onclick: () => { save(); renderPalaces(); } }, "My palaces"),
        el("button", { type: "button", class: "primary", onclick: () => { save(); closeUI(); } }, "Done")));
    card.addEventListener("pointerdown", (e) => e.stopPropagation());
    $("invPanel").replaceChildren(card);
    setTimeout(() => (m.name ? null : name.focus()), 30);
  }
  function renderPalaces() {
    ui = "palaces";
    $("invPanel").classList.remove("hidden");
    const groups = {};
    for (const sg of signs()) (groups[sg.palace || "My first palace"] ||= []).push(sg);
    const custom = PalaceData.custom();
    const rows = Object.entries(groups).map(([name, list]) => {
      const id = `craft-${world.seed}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, made = custom.find((p) => p.id === id);
      const ready = list.length >= 5 && list.every((x) => x.name && x.emoji);
      return el("div", { class: "pal-row" },
        el("div", {}, el("b", {}, name), el("div", { class: "inv-hint" }, `${list.length} place${list.length === 1 ? "" : "s"}: ` + list.map((x) => x.emoji || "?").join(" ")),
          !ready ? el("div", { class: "inv-hint" }, list.length < 5 ? "Place at least 5 signs (up to 15 are used)." : "Every sign needs a name and a picture.") : ""),
        (() => { const b = el("button", { type: "button", class: ready ? "primary" : "", onclick: () => makePalace(id, name, list) }, made ? "Update in Memory Palace" : "Make a Memory Palace route"); b.disabled = !ready; return b; })());
    });
    const card = el("div", { class: "inv-card sign-card" }, el("div", { class: "inv-title" }, "My palaces"),
      el("p", { class: "inv-hint" }, "Build a place you like, put a Memory sign at each spot you want to use, then turn the signs into a route you can learn and use in Memory Palace."),
      ...(rows.length ? rows : [el("p", {}, "No memory signs yet. Craft them (6 planks over a stick) or take them from the creative inventory.")]),
      el("div", { class: "inv-foot" }, el("a", { class: "button", href: "/memory-palace/" }, "Open Memory Palace"), el("button", { type: "button", class: "primary", onclick: closeUI }, "Close")));
    card.addEventListener("pointerdown", (e) => e.stopPropagation());
    $("invPanel").replaceChildren(card);
  }
  // the route keeps the real layout: the signs' positions seen from above, fitted to the map
  function makePalace(id, name, list) {
    list = list.slice(0, 15);
    const xs = list.map((x) => x.cell[0]), zs = list.map((x) => x.cell[2]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const span = Math.max(1, x1 - x0, (z1 - z0) * 100 / 70);
    const loci = list.map((x, i) => ({ n: i + 1, emoji: x.emoji, name: x.name, x: 10 + (x.cell[0] - x0) / span * 80, y: 8 + (x.cell[2] - z0) / span * 80 * 0.68 }));
    const all = PalaceData.custom().filter((p) => p.id !== id);
    all.push({ id, name, source: "craft", theme: "world", colours: ["#6a8f4e", "#c8a46a", "#9fd0ff"], about: `Built by you in Block Craft (world ${world.seed}).`, loci });
    localStorage.setItem(PalaceData.CUSTOM_KEY, JSON.stringify(all));
    note(`“${name}” is now a route in Memory Palace`);
    renderPalaces();
  }
  // a sign shows its picture and number floating above it
  const signTex = new Map();
  let signProg = null, signBuf = null;
  function drawSigns(eye) {
    const list = signs().filter((x) => x.emoji && Math.hypot(x.cell[0] - eye[0], x.cell[2] - eye[2]) < 40);
    if (!list.length) return;
    if (!signProg) {
      signProg = program(`attribute vec2 aXY; uniform mat4 uMVP; uniform vec3 uEye; uniform vec3 uColor; varying vec2 vUV;
        void main() { vec3 f = normalize(vec3(uEye.x - uColor.x, 0.0, uEye.z - uColor.z)); vec3 r = vec3(f.z, 0.0, -f.x);
                      gl_Position = uMVP * vec4(uColor + r * aXY.x * 0.45 + vec3(0.0, aXY.y * 0.45, 0.0), 1.0); vUV = vec2(aXY.x * 0.5 + 0.5, 0.5 - aXY.y * 0.5); }`,
        `precision mediump float; uniform sampler2D uTex; varying vec2 vUV; void main() { vec4 c = texture2D(uTex, vUV); if (c.a < 0.1) discard; gl_FragColor = c; }`);
      signBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, signBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    }
    const P = signProg;
    gl.useProgram(P.p); gl.uniformMatrix4fv(P.loc.uMVP, false, lastMVP); gl.uniform3fv(P.loc.uEye, eye);
    gl.bindBuffer(gl.ARRAY_BUFFER, signBuf); gl.enableVertexAttribArray(P.loc.aXY); gl.vertexAttribPointer(P.loc.aXY, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    for (const sg of list) {
      const k = sg.cell.join(",");
      if (!signTex.has(k)) {
        const c = document.createElement("canvas"); c.width = c.height = 128;
        const g = c.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "84px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; g.fillText(sg.emoji, 64, 60);
        g.fillStyle = "#111"; g.beginPath(); g.arc(104, 22, 20, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fff"; g.font = "bold 24px sans-serif"; g.fillText(String(signs().filter((x) => x.palace === sg.palace).indexOf(sg) + 1 || sg.n), 104, 23);
        const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        signTex.set(k, tx);
      }
      gl.bindTexture(gl.TEXTURE_2D, signTex.get(k));
      gl.uniform3fv(P.loc.uColor, [sg.cell[0] + 0.5, sg.cell[1] + 1.55, sg.cell[2] + 0.5]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disableVertexAttribArray(P.loc.aXY);
    gl.useProgram(texProg.p); gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  // ---------- start ----------
  $("palacesBtn").onclick = () => { if (mode) { stopPlaying(); renderPalaces(); } };
  $("modeBtnTop").onclick = () => chooseMode();
  $("newWorldBtn").onclick = () => {
    if (!mode) return;
    if (!confirm(`Make a new ${MODES[mode].name.toLowerCase()} world? The current one and everything built in it will be lost.`)) return;
    localStorage.removeItem(MODES[mode].key); startMode(mode, true);
  };
  window.addEventListener("beforeunload", save);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { save(); if (playing) pause(); } });
  BlockCraft.state = () => ({ mode, world, player, inv, target, playing, ui, surv, mining, slot });   // for tests
  BlockCraft.startMode = startMode;
  BlockCraft.act = { breakBlock, use, openUI, closeUI, throwHeld, pickUp, hurt, choose, setTarget: (t) => (target = t), setTime: (t) => (dayTime = t) };    // for tests
  setupFullscreen(root);
  applySettings();
  chooseMode();
  requestAnimationFrame(tick);
})();
