/* Chicken Hunt: the game. Mouse to aim and shoot, right button or Space to reload, the view scrolls when you aim at its edges.
   The rules are in core.js and the pictures in art.js. */
"use strict";
(() => {
  const C = ChickenCore, A = ChickenArt, root = $("ch"), field = $("chField"), canvas = $("chCanvas"), panel = $("chPanel"), g = canvas.getContext("2d");
  const FONT = getComputedStyle(document.body).getPropertyValue("--font-display") || "sans-serif";
  const tableKey = (ammo, time) => `sora.chickenHunt.scores${time ? ".endless" : ""}${ammo ? ".unlimited" : ""}.v1`, touchDevice = matchMedia("(pointer: coarse)").matches;

  const settings = setupSettings(root, "chicken-hunt", [
    { key: "seconds", label: "Length of a round", type: "choice", default: 90, options: [[60, "60 seconds"], [90, "90 seconds"], [120, "2 minutes"], [0, "Unlimited"]], help: "An unlimited round ends when you press Finish, and these rounds keep their own best scores" },
    { key: "pace", label: "Chickens", type: "choice", default: 1, options: [[0.75, "Slow"], [1, "Normal"], [1.35, "Fast"]] },
    { key: "shells", label: "Ammunition", type: "choice", default: 8, options: [[6, "6 shells"], [8, "8 shells"], [12, "12 shells"], [0, "Unlimited"]], help: "Unlimited rounds keep their own best scores" },
    { key: "sound", label: "Sound", type: "toggle", default: true },
  ], { onOpen: () => pause(), onChange: (v, k) => {
    if (k === "shells" || k === null) {     // null: reset to defaults
      showHint();
      if (mode === "play" || mode === "paused") C.setShells(state, Number(S.shells));
    }
    if (k === "seconds" || k === null) {
      showHint();
      if (mode === "play" || mode === "paused") C.setLength(state, Number(S.seconds));
    }
    if (mode === "menu") showMenu();
    if (mode === "paused") showPaused();
  } });
  const S = settings.values;

  let viewW = 1000, viewH = C.HEIGHT, scale = 1, scene = null, sceneScale = 0;
  let state = null, mode = "menu";     // menu, play, paused, over
  const aim = { x: 500, y: 250, seen: false }, keys = new Set();
  let last = performance.now(), clock = 0, shake = 0, millAngle = 0, millSpin = 0.5, vaneSpin = 0, flash = 0;
  let feathers = [], popups = [], puffs = [];

  // ---------- fitting the view ----------
  function resize() {
    const w = field.clientWidth, h = field.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    scale = Math.max(canvas.height / C.HEIGHT, canvas.width / C.MAX_VIEW);
    viewW = canvas.width / scale; viewH = canvas.height / scale;
    if (state) state.viewW = viewW;
    if (!scene || Math.abs(scale - sceneScale) > sceneScale * 0.2) { scene = A.buildScene(scale); sceneScale = scale; }
    render();
  }
  new ResizeObserver(resize).observe(field);

  // ---------- sound: made here, nothing to download ----------
  let audio = null;
  function ctx() { if (!S.sound) return null; audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); return audio; }
  function noise(a, length, cut, vol, at = 0) {
    const n = Math.floor(a.sampleRate * length), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain(), t = a.currentTime + at;
    src.buffer = buf; f.type = "lowpass"; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(Math.max(80, cut * 0.15), t + length);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + length);
    src.connect(f); f.connect(v); v.connect(a.destination); src.start(t);
  }
  function tone(a, type, from, to, length, vol, at = 0) {
    const o = a.createOscillator(), v = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(v); v.connect(a.destination); o.start(t); o.stop(t + length + 0.02);
  }
  const sound = {
    shot() { const a = ctx(); if (!a) return; noise(a, 0.22, 3400, 0.5); tone(a, "sine", 140, 45, 0.16, 0.5); },
    empty() { const a = ctx(); if (a) noise(a, 0.03, 3000, 0.25); },
    reload() { const a = ctx(); if (!a) return; noise(a, 0.05, 2200, 0.3, 0.02); noise(a, 0.06, 1400, 0.35, C.RELOAD_TIME * 0.72); },
    bird() { const a = ctx(); if (!a) return; tone(a, "sawtooth", 780, 360, 0.11, 0.2, 0.04); tone(a, "sawtooth", 920, 300, 0.15, 0.2, 0.15); },
    bonus() { const a = ctx(); if (!a) return; tone(a, "triangle", 720, 720, 0.1, 0.25, 0.04); tone(a, "triangle", 1080, 1080, 0.16, 0.25, 0.13); },
    penalty() { const a = ctx(); if (a) tone(a, "square", 260, 90, 0.3, 0.14, 0.04); },
    whistle() { const a = ctx(); if (!a) return; tone(a, "sine", 1500, 1300, 0.28, 0.2); tone(a, "sine", 1500, 1200, 0.42, 0.2, 0.32); },
  };

  // ---------- starting and stopping ----------
  const demo = () => { state = C.newRound({ seconds: 0, viewW, cam: 0.12, rnd: Math.random }); };
  function start() {
    state = C.newRound({ seconds: Number(S.seconds), pace: Number(S.pace), shells: Number(S.shells), viewW, cam: 0.2 });
    feathers = []; popups = []; puffs = []; millSpin = 0.5; vaneSpin = 0; shake = 0;
    mode = "play"; panel.hidden = true; last = performance.now(); ctx(); canvas.classList.add("aiming");
  }
  function pause() { if (mode === "play") { mode = "paused"; showPaused(); } }
  function resume() { mode = "play"; panel.hidden = true; last = performance.now(); canvas.classList.add("aiming"); }
  function finish() {
    mode = "over"; state.over = true; sound.whistle(); canvas.classList.remove("aiming");
    const ammo = state.assisted, time = state.stretched, entry = { score: state.score, hits: state.hits, shots: state.shots, at: new Date().toISOString(), played: time ? state.elapsed : undefined }, list = [...scores(ammo, time), entry].sort((a, b) => b.score - a.score).slice(0, 5);
    localStorage.setItem(tableKey(ammo, time), JSON.stringify(list));
    showResults(entry, list, caption(ammo, time));
  }
  // the Finish button: not a shot fired means there's nothing to keep
  function finishNow() {
    if (mode !== "play" && mode !== "paused") return;
    if (state.shots) return finish();
    demo(); showMenu();
  }
  const caption = (ammo, time) => (ammo && time ? "Best with unlimited time and ammunition" : time ? "Best with unlimited time" : ammo ? "Best with unlimited ammunition" : "");
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  function scores(ammo = false, time = false) { try { return JSON.parse(localStorage.getItem(tableKey(ammo, time)) || "[]"); } catch { return []; } }
  const when = (iso) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; };
  const btn = (label, onclick, primary) => el("button", { type: "button", class: primary ? "primary" : "", onclick }, label);
  const table = (list, mine, title) => (list.length ? el("div", { class: "ch-scores" }, title ? el("small", {}, title) : "", ...list.flatMap((r, i) => { const me = r === mine ? " me" : ""; return [el("span", { class: `n${me}` }, `${i + 1}`), el("span", { class: `s${me}` }, `${r.score}`), el("span", { class: `d${me}` }, `${r.hits} of ${r.shots} shots${r.played ? ` in ${mmss(r.played)}` : ""} · ${when(r.at)}`)]; })) : "");
  function showMenu() {
    panel.hidden = false; mode = "menu"; canvas.classList.remove("aiming");
    const free = !Number(S.shells), endless = !Number(S.seconds), reloads = free ? [] : touchDevice ? [["Reload button", "reload"]] : [["Right button or Space", "reload"]];
    panel.replaceChildren(el("div", { class: "ch-card" },
      el("h2", {}, "Chicken Hunt"),
      el("p", {}, `${endless ? "No time limit" : `${S.seconds} seconds`} and ${free ? "unlimited ammunition" : `${S.shells} shells at a time`}. The further away a chicken is, the more it's worth: ${C.LAYERS.near.points} close up, ${C.LAYERS.mid.points} in the middle distance, ${C.LAYERS.far.points} far away. Watch for golden chickens, ones peeking out from behind things, and a few surprises in the landscape. Leave the scarecrow alone.${endless ? " Press Finish when you've had enough, and your score is kept." : ""}`),
      el("div", { class: "row" }, btn("Start", start, true)),
      el("div", { class: "ch-keys" }, ...(touchDevice ? [["Tap", "shoot"], ["Drag", "look along the countryside"], ...reloads] : [["Mouse", "aim; the view scrolls at its edges"], ["Left button", "shoot"], ...reloads, ["Arrows or A D", "scroll the view"], ["P", "pause"]]).concat(endless ? [["Finish", "end the round and keep the score"]] : []).flatMap(([k, v]) => [el("kbd", {}, k), el("span", {}, v)])),
      table(scores(free, endless), null, caption(free, endless))));
  }
  function showPaused() {
    panel.hidden = false; canvas.classList.remove("aiming");
    panel.replaceChildren(el("div", { class: "ch-card" }, el("h2", {}, "Paused"), el("p", {}, state.endless ? `Score ${state.score} after ${mmss(state.elapsed)}.` : `Score ${state.score}, ${Math.ceil(state.time)} seconds left.`), el("div", { class: "row" }, btn("Carry on", resume, true), state.endless ? btn("Finish", finishNow) : "", btn("Start again", start))));
  }
  function showResults(entry, list, title) {
    const best = list[0] === entry && list.length > 1, acc = entry.shots ? Math.round((entry.hits / entry.shots) * 100) : 0;
    panel.hidden = false;
    panel.replaceChildren(el("div", { class: "ch-card" },
      el("h2", {}, best ? "A new best!" : state.endless ? "Round over" : "Time's up"),
      el("div", { class: "ch-total" }, `${entry.score}`),
      el("p", {}, `${entry.hits} chickens with ${entry.shots} shots${entry.played ? ` in ${mmss(entry.played)}` : ""}: ${acc}% of them hit.`),
      el("div", { class: "row" }, btn("Play again", start, true)),
      table(list, entry, title)));
  }
  function showHint() {
    const free = !Number(S.shells), end = Number(S.seconds) ? "" : " Finish ends the round.";
    $("chHint").textContent = (touchDevice ? `Tap to shoot and drag to look along the countryside${free ? "." : ". Use the Reload button when you run out."}` : `Aim with the mouse and shoot with the left button${free ? "." : ". Reload with the right button or Space."}`) + end;
  }

  // ---------- shooting ----------
  function burst(x, y, n, cols, size, speed = 150) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = speed * (0.25 + Math.random()); feathers.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 6, s: size * (0.6 + Math.random() * 0.7), col: cols[Math.floor(Math.random() * cols.length)], life: 1.2 + Math.random() * 0.8, sway: Math.random() * 6.28 }); }
  }
  function popup(x, y, text, col) { popups.push({ x, y, text, col, life: 1.1 }); }
  function fire(vx, vy) {
    if (mode !== "play") return;
    const r = C.shoot(state, vx, vy);
    if (r.kind === "empty") { sound.empty(); flash = 0.6; return; }
    if (r.kind === "reloading" || r.kind === "over") return;
    sound.shot(); shake = 1;
    if (r.kind === "bird") {
      const b = r.bird, gold = b.kind === "gold", sx = b.x - C.offset(state, b.layer);
      burst(sx, b.y, gold ? 26 : 16, gold ? ["#ffd84a", "#fff6c6", "#e8b21e"] : ["#d98338", "#b65a24", "#f7dfb4", "#a14d1d"], b.size * 0.13, 90 + b.size);
      popup(sx, b.y - b.size * 0.4, `+${r.points}`, gold ? "#ffe05c" : "#ffffff");
      sound.bird();
    } else if (r.kind === "prop") {
      const p = r.prop, good = r.points > 0;
      popup(vx, vy - 20, `${good ? "+" : ""}${r.points}`, good ? "#c6ff3d" : "#ff6a5a");
      if (good) sound.bonus(); else sound.penalty();
      if (p.id === "mill") millSpin = 7;
      if (p.id === "vane") vaneSpin = 3;
      if (p.id === "can") { burst(vx, vy, 6, ["#c8ccd0", "#8d9196"], 3, 120); }
      if (p.id === "scarecrow") burst(vx, vy, 14, ["#d9b75a", "#e7cd7e", "#b3923f"], 4, 140);
    } else if (r.kind === "stopped") {
      const leafy = ["oak", "pine"].includes(r.prop.id);
      burst(vx, vy, leafy ? 10 : 6, leafy ? ["#3f8a3d", "#5aa549", "#245a2a"] : r.prop.id === "hay" ? ["#d9b75a", "#e7cd7e"] : ["#8d8778", "#a89f8c", "#6d6458"], leafy ? 4.5 : 3, 110);
    } else if (r.ground) {
      puffs.push({ x: vx, y: vy, r: r.ground === "near" ? 7 : r.ground === "mid" ? 4 : 2.5, life: 0.55 });
    }
  }
  const reload = () => { if (mode === "play" && C.reload(state)) sound.reload(); };

  // ---------- the loop ----------
  function update(dt) {
    clock += dt;
    if (mode === "menu") { C.step(state, dt); state.cam = 0.5 + Math.sin(clock * 0.06) * 0.42; }     // the countryside goes by behind the menu
    if (mode === "play") {
      C.step(state, dt);
      if (state.over) return finish();
      let dir = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
      if (aim.seen && !touchDevice) { const edge = 90; if (aim.x < edge) dir -= (edge - aim.x) / edge; else if (aim.x > viewW - edge) dir += (aim.x - (viewW - edge)) / edge; }
      if (dir) C.pan(state, dir * dt * 0.5);
    }
    {       // these settle whatever the mode, or a shot just as time ran out would shake the results for ever
      millAngle += dt * millSpin; millSpin += (0.5 - millSpin) * dt * 0.35;
      vaneSpin = Math.max(0, vaneSpin - dt);
      shake = Math.max(0, shake - dt * 7); flash = Math.max(0, flash - dt);
      for (const f of feathers) { f.life -= dt; f.vx *= 1 - dt * 2.2; f.vy = f.vy * (1 - dt * 2.2) + 95 * dt; f.x += (f.vx + Math.sin(f.life * 5 + f.sway) * 26) * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
      feathers = feathers.filter((f) => f.life > 0);
      for (const p of popups) { p.life -= dt; p.y -= 44 * dt; }
      popups = popups.filter((p) => p.life > 0);
      for (const p of puffs) { p.life -= dt; p.r += dt * 26; }
      puffs = puffs.filter((p) => p.life > 0);
    }
  }
  function layer(img, id, travel) {
    const ox = state.cam * (travel - viewW), q = scene.q;
    g.drawImage(img, ox * q, 0, viewW * q, C.HEIGHT * q, 0, 0, viewW, C.HEIGHT);
    return id;
  }
  function birds(id, peek) { for (const b of state.birds) if (b.layer === id && (b.kind === "peek") === peek) A.chicken(g, b, b.x - C.offset(state, id), b.y); }
  function render() {
    if (!scene || !state) return;
    g.setTransform(scale, 0, 0, scale, 0, 0);
    const kick = shake * shake * 7;
    g.translate(Math.sin(clock * 90) * kick, Math.cos(clock * 77) * kick * 0.6 + kick * 0.4);
    // the sky, and clouds drifting at their own speed
    const sky = g.createLinearGradient(0, 0, 0, 340); sky.addColorStop(0, "#4f9ee0"); sky.addColorStop(0.65, "#a6d6f1"); sky.addColorStop(1, "#e6f4f6");
    g.fillStyle = sky; g.fillRect(-20, -20, viewW + 40, C.HEIGHT + 40);
    const sunX = viewW * 0.72 - state.cam * 60, sun = g.createRadialGradient(sunX, 88, 6, sunX, 88, 130); sun.addColorStop(0, "rgba(255,250,214,1)"); sun.addColorStop(0.18, "rgba(255,244,186,.9)"); sun.addColorStop(1, "rgba(255,240,180,0)");
    g.fillStyle = sun; g.fillRect(sunX - 130, -42, 260, 260);
    scene.clouds.forEach((c, i) => { const span = viewW + 900, x = ((clock * (5 + i * 2.5) + i * 520 - state.cam * (120 + i * 40)) % span + span) % span - c.w - 100, y = 18 + i * 52; g.drawImage(c.c, x, y, c.w, c.h); g.drawImage(c.c, ((x + 640 + i * 90 + c.w + 100) % span) - c.w - 100, y + 22, c.w * 0.72, c.h * 0.72); });
    layer(scene.backdrop, "backdrop", C.MAX_VIEW + 160);
    birds("far", false);
    layer(scene.far, "far", C.widthOf("far"));
    birds("mid", false);
    layer(scene.mid, "mid", C.widthOf("mid"));
    A.sails(g, C.MILL_X - C.offset(state, "mid"), C.MILL_Y, millAngle);
    for (const p of puffs) if (p.r < 6) { g.globalAlpha = p.life * 1.2; g.fillStyle = "#d9c9a4"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.3); g.fill(); g.globalAlpha = 1; }
    birds("near", true);
    layer(scene.near, "near", C.widthOf("near"));
    const nearX = C.offset(state, "near");
    A.vane(g, 1180 - nearX, 214, vaneSpin ? clock * 14 : 0.3);
    if (!state.used.can) { const x = 640 - nearX; g.fillStyle = "#9aa1a8"; g.fillRect(x - 11, 362, 22, 32); g.fillStyle = "#c9ced3"; g.fillRect(x - 11, 362, 7, 32); g.fillStyle = "#c0392b"; g.fillRect(x - 11, 372, 22, 12); g.strokeStyle = "#6e747a"; g.lineWidth = 1.5; g.strokeRect(x - 11, 362, 22, 32); }
    birds("near", false);
    for (const p of puffs) if (p.r >= 6) { g.globalAlpha = p.life * 1.2; g.fillStyle = "#d9c9a4"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.3); g.fill(); g.globalAlpha = 1; }
    for (const f of feathers) A.feather(g, f);
    const q = scene.q, frontW = C.widthOf("near") + 300, fx = state.cam * (frontW - viewW);
    g.drawImage(scene.front, fx * q, 0, viewW * q, C.HEIGHT * q, 0, 0, viewW, C.HEIGHT);
    g.textAlign = "center"; g.textBaseline = "middle";
    for (const p of popups) { g.globalAlpha = Math.min(1, p.life * 2); g.font = `700 30px ${FONT}`; g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,.65)"; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.col; g.fillText(p.text, p.x, p.y); g.globalAlpha = 1; }
    g.setTransform(scale, 0, 0, scale, 0, 0);
    if (mode === "play" || mode === "paused") hud();
    if (mode === "play" && aim.seen && !touchDevice) crosshair(aim.x, aim.y);
    const pausing = $("chPause"), word = mode === "paused" ? "Carry on" : "Pause";
    pausing.hidden = mode !== "play" && mode !== "paused"; $("chReload").hidden = mode !== "play" || state.unlimited;
    $("chFinish").hidden = (mode !== "play" && mode !== "paused") || !state.endless;
    if (pausing.textContent !== word) pausing.textContent = word;
  }
  function label(text, x, y, size, col = "#fff", align = "left") { g.font = `700 ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = "middle"; g.lineWidth = Math.max(2.5, size * 0.09); g.lineJoin = "round"; g.strokeStyle = "rgba(0,0,0,.6)"; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); }
  function hud() {
    const s = state, left = Math.ceil(s.time), low = s.time <= 10;
    label(`${s.score}`, 20, 34, 40);
    if (s.endless) { label("∞", viewW / 2, 30, 46, "#fff", "center"); label(mmss(s.elapsed), viewW / 2, 64, 20, "#fff", "center"); }
    else {
      label(`${left}`, viewW / 2, 34, 40, low ? (Math.sin(clock * 9) > 0 ? "#ff5a4a" : "#ffb3a8") : "#fff", "center");
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(viewW / 2 - 90, 58, 180, 5); g.fillStyle = low ? "#ff5a4a" : "#c6ff3d"; g.fillRect(viewW / 2 - 90, 58, 180 * (s.time / s.limit), 5);
    }
    // the shells, bottom right; while reloading they slide back in one by one
    if (s.unlimited) { A.shell(g, viewW - 30, viewH - 16, 44, false); label("∞", viewW - 48, viewH - 38, 46, "#fff", "right"); return; }
    const h = 44, gap = 22, y = viewH - 16, filled = s.reloading > 0 ? Math.floor((1 - s.reloading / C.RELOAD_TIME) * s.maxShells) : s.shells, x0 = viewW - 20 - (s.maxShells - 1) * gap;
    for (let i = 0; i < s.maxShells; i++) A.shell(g, x0 + i * gap, y, h, i >= filled);
    if (s.shells === 0 && s.reloading <= 0) { const big = flash > 0 ? 40 : 30; label(touchDevice ? "RELOAD" : "RELOAD: right button or Space", viewW / 2, viewH - 64, big * 0.8, Math.sin(clock * 8) > 0 || flash > 0 ? "#ffd84a" : "#fff", "center"); }
    else if (s.reloading > 0) label("Reloading", viewW / 2, viewH - 64, 22, "#fff", "center");
  }
  function crosshair(x, y) {
    const R = 21;
    for (const [col, w] of [["rgba(0,0,0,.65)", 4.5], ["#fff", 2]]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, R, 0, 6.3); g.stroke();
      g.beginPath(); for (const [a, b, c, d] of [[-R - 9, 0, -7, 0], [7, 0, R + 9, 0], [0, -R - 9, 0, -7], [0, 7, 0, R + 9]]) { g.moveTo(x + a, y + b); g.lineTo(x + c, y + d); } g.stroke();
    }
    g.fillStyle = "#ff3b30"; g.beginPath(); g.arc(x, y, 2.4, 0, 6.3); g.fill();
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode !== "paused") update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  const toView = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * viewW, ((e.clientY - r.top) / r.height) * viewH]; };
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  let touch = null;
  // followed over the menus too, so that the crosshair is there the moment a round starts
  field.addEventListener("pointermove", (e) => { [aim.x, aim.y] = toView(e); if (e.pointerType === "mouse") aim.seen = true; });
  field.addEventListener("pointerleave", () => { aim.seen = false; });
  canvas.addEventListener("pointermove", (e) => {
    if (touch && mode === "play") { const dx = e.clientX - touch.x; if (Math.abs(dx) > 8) touch.moved = true; if (touch.moved) { C.pan(state, -(dx / canvas.getBoundingClientRect().width) * (viewW / (C.widthOf("near") - viewW))); touch.x = e.clientX; } }
  });
  canvas.addEventListener("pointerdown", (e) => {
    const [x, y] = toView(e);
    [aim.x, aim.y] = [x, y];
    if (e.pointerType !== "mouse") { touch = { x: e.clientX, moved: false }; return; }
    aim.seen = true;
    if (e.button === 2) reload(); else if (e.button === 0) fire(x, y);
  });
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse" && touch && !touch.moved) fire(...toView(e)); touch = null; });
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    const k = e.key.toLowerCase();
    if (mode === "play") {
      if (k === " " || k === "r") { reload(); e.preventDefault(); return; }
      if (k === "p" || k === "escape") { pause(); e.preventDefault(); return; }
      if (["arrowleft", "arrowright", "a", "d"].includes(k)) { keys.add(k); e.preventDefault(); }
    } else if (mode === "paused" && (k === "p" || k === "escape") && !settings.isOpen()) { resume(); e.preventDefault(); }
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  $("chReload").onclick = reload;
  $("chFinish").onclick = finishNow;
  // it gives up the focus, or Space to reload would press it as well
  $("chPause").onclick = (e) => { e.currentTarget.blur(); if (mode === "play") pause(); else if (mode === "paused") resume(); };
  showHint();
  setupFullscreen(root);

  demo();
  resize();
  showMenu();
  window.ChickenHunt = { get state() { return state; }, get mode() { return mode; }, get view() { return { w: viewW, h: viewH, scale }; }, get shake() { return shake; }, aim, start, pause, resume, render, update, fire, reload, finish, finishNow, scores };   // for tests
  requestAnimationFrame(loop);
})();
