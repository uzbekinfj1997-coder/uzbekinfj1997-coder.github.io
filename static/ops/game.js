/* Memory Ops: the game. Three modes (Ordinary: like Counter-Strike, bomb rounds against bots; Special: story
   missions; Children: gentle story missions without weapons), three maps whose 15 places are a Memory Palace
   route, one or two players on one computer (side by side), and the shared lists and review schedule. */
"use strict";
(() => {
  const BC = BlockCraft, CB = OpsCombat, M = OpsMaps, C = PalaceCore, D = PalaceData;
  const root = $("ops"), field = $("field"), canvas = $("view"), menu = $("menu"), huds = $("huds");
  const FLOOR = M.FLOOR, REACH = 1.8;

  // ---------- settings ----------
  const settings = setupSettings(root, "memory-ops", [
    { group: "Players", key: "players", label: "Players", type: "choice", default: 1, options: [[1, "One"], [2, "Two (side by side)"]],
      help: "Player 2 uses the keyboard: I J K L to move, arrows to look, Enter to fire, right Shift to use" },
    { group: "Players", key: "together", label: "Two players", type: "choice", default: "coop", options: [["coop", "Together"], ["versus", "Against each other"]], when: (v) => v.players === 2,
      help: "Against each other: Ordinary mode only, no bots, first to defuse wins" },
    { group: "Game", key: "skill", label: "Bot skill", type: "choice", default: "normal", options: [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]] },
    { group: "Game", key: "bots", label: "Bots", type: "range", default: 4, min: 1, max: 10 },
    { group: "Game", key: "answers", label: "Answering", type: "choice", default: "choose", options: [["choose", "Choose from options"], ["type", "Type the answer"]],
      help: "Typing is real recall and moves a list on in the review plan (one player only)" },
    { group: "Game", key: "timer", label: "Time limits", type: "choice", default: 1, options: [[1, "Normal"], [1.5, "Relaxed"], [0, "Off"]] },
    { group: "Controls", key: "sens", label: "Look speed", type: "range", default: 6, min: 1, max: 20 },
    { group: "Controls", key: "invert", label: "Invert up and down", type: "toggle", default: false },
    { group: "Picture", key: "fov", label: "Field of view", type: "range", default: 80, min: 60, max: 110, step: 5, unit: "°" },
    { group: "Picture", key: "shadows", label: "Shadows", type: "toggle", default: true },
    { group: "Picture", key: "xcolour", label: "Crosshair colour", type: "choice", default: "#3cff6b", options: [["#3cff6b", "Green"], ["#ffffff", "White"], ["#ffe14d", "Yellow"], ["#3ce0ff", "Cyan"]] },
    { group: "Sound", key: "volume", label: "Volume", type: "range", default: 70, min: 0, max: 100, step: 10, unit: "%" },
    { group: "Sound", key: "speak", label: "Read aloud", type: "choice", default: "child", options: [["child", "Children's mode"], ["always", "Always"], ["never", "Never"]] },
  ], { onOpen: () => pause(), onChange: () => root.style.setProperty("--xc", S.xcolour) });
  const S = settings.values;
  root.style.setProperty("--xc", S.xcolour);

  // ---------- sound (made in the browser) ----------
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
    try { const a = ac(), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = freq;
      g.gain.setValueAtTime(vol * S.volume / 100, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      src.connect(f).connect(g).connect(a.destination); src.start(); src.stop(a.currentTime + dur); } catch { /* no sound */ }
  }
  function tone(freq, dur, type = "square", vol = 0.05) {
    if (!S.volume) return;
    try { const a = ac(), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol * S.volume / 100, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur); } catch { /* no sound */ }
  }
  const sfx = { shot: (far = 0) => noise(0.22, 3200 - far * 30, Math.max(0.03, 0.5 - far / 80)), knife: () => noise(0.08, 5000, 0.12),
                reload: () => { tone(900, 0.04); setTimeout(() => tone(600, 0.05), 400); }, hurt: () => tone(160, 0.18, "sawtooth", 0.07),
                marker: () => tone(1400, 0.04, "square", 0.03), good: () => [660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.07), i * 90)),
                bad: () => tone(200, 0.25, "sawtooth", 0.05), beep: () => tone(1800, 0.05, "square", 0.04),
                win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.07), i * 120)),
                boom: () => noise(1.2, 400, 0.6) };
  function speak(text) {
    if (!(S.speak === "always" || (S.speak === "child" && game?.mode === "children")) || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch { /* no voice */ }
  }

  // ---------- the memory side: lists, palaces, the schedule (shared with Memory Palace) ----------
  const memState = () => C.load(D.all());
  const palaceId = (map) => `ops-${map.id}`;
  const palaceOf = (map) => D.all().find((p) => p.id === palaceId(map));
  const listOf = (map) => { const st = memState(), id = st.palaces[palaceId(map)]?.listId; return id && st.lists[id] && !st.lists[id].done ? st.lists[id] : null; };
  const memPlan = () => { try { return JSON.parse(localStorage.getItem("sora.settings.memory-palace") || "{}").plan || "standard"; } catch { return "standard"; } };
  const label = (it) => C.answerText(it);
  const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- missions ----------
  // each: mode, name, story (shown before), needs ("list" or "route"), bots, weapons, and how it plays
  const MISSIONS = [
    { id: "defuse", mode: "ordinary", name: "Bomb defusal", needs: "route", bots: true, weapons: true, versus: true,
      about: "Rounds against bots. The bomb is hidden at one of the 15 places: the clue says where, in memory terms.",
      story: (g) => `Terrorists have planted a bomb somewhere in ${g.map.name}. Intel only tells you where in memory terms. ${g.list ? "Find the place where you stored the clue, and answer what is stored there to defuse fast." : "Find the place by its number on the route."} Eliminate the bots or defuse the bomb before it goes off.` },
    { id: "courier", mode: "special", name: "Night courier", needs: "list", bots: false, weapons: false, records: true,
      about: "Deliver to every place in route order, and say what is stored at each. No shooting.",
      story: (g) => `It's night in ${g.map.name}. You carry ${g.list.items.length} sealed packages, one for each place on the route, in order. You only know each place by its number. At each place, the contact asks what you put there. Be quick and right: the city wakes at dawn.` },
    { id: "breach", mode: "special", name: "Safehouse breach", needs: "list", bots: true, weapons: true,
      about: "Recover four pieces of intel hidden where things are stored, while bots hunt you.",
      story: (g) => `An enemy cell holds ${g.map.name}. Four pieces of intel were hidden at places of your route: each clue names what you stored there, not the place. Recover all four and get out alive.` },
    { id: "chain", mode: "special", name: "Chain reaction", needs: "route", bots: false, weapons: false,
      about: "Bombs go off one after another; each clue names the place before it on the route.",
      story: (g) => `A bomber left a trail in ${g.map.name}. Each clue tells you the place just before the next bomb on your route. Know your route, and defuse them one after another.` },
    { id: "treasure", mode: "children", name: "Treasure trail", needs: "list", bots: false, weapons: false, records: true,
      about: "Follow the stars from place to place and pick what you put at each one.",
      story: (g) => `Captain Parrot hid treasure all over ${g.map.name}! Follow the shining star to each place, and remember what you put there. Every right answer is a gold coin.` },
    { id: "puppies", mode: "children", name: "Lost puppies", needs: "list", bots: false, weapons: false,
      about: "Puppies are hiding where you put things. Find them all.",
      story: (g) => `Oh no! The puppies ran away in ${g.map.name}. Each puppy is hiding where you put something. Listen to the clue, walk to that place and press E to find it.` },
  ];
  const MODES = {
    ordinary: { name: "Ordinary", about: "Like Counter-Strike: a rifle, a pistol and a knife, bots, bomb rounds. The bomb's place is a memory clue." },
    special: { name: "Special", about: "Story missions for adults: courier runs, a safehouse breach, a chain of bombs. Some with shooting, some without." },
    children: { name: "Children", about: "Gentle story missions without weapons: a treasure trail and lost puppies, with pictures and reading aloud." },
  };

  // ---------- the menus ----------
  let game = null, chosen = { mode: null, map: null };
  function card(title, text, onclick, extra = "", disabled = false) {
    const b = el("button", { type: "button", class: "ops-card", onclick }, el("b", {}, title), el("span", {}, text), extra ? el("small", {}, extra) : "");
    b.disabled = disabled;
    return b;
  }
  function screen(title, sub, ...body) {
    stopPlaying();
    menu.classList.remove("hidden");
    menu.replaceChildren(el("div", { class: "ops-menu" }, el("h2", {}, title), sub ? el("p", {}, sub) : "", ...body));
  }
  function mainMenu() {
    game = null; huds.replaceChildren();
    screen("Memory Ops", "Choose a mode.", el("div", { class: "ops-cards" }, ...Object.entries(MODES).map(([k, m]) => card(m.name, m.about, () => { chosen.mode = k; mapMenu(); }))));
  }
  function mapStatus(map) {
    const st = memState(), ps = st.palaces[palaceId(map)], list = listOf(map);
    if (!ps?.learned) return "Route not learned yet";
    return list ? `Holding “${list.name}”${list.kind === "permanent" && list.due <= Date.now() ? " · review due" : ""}` : "Route learned · no list stored";
  }
  function mapMenu() {
    screen(`${MODES[chosen.mode].name} · choose a map`, "Each map is also a Memory Palace route of 15 places.",
      el("div", { class: "ops-cards" }, ...M.MAPS.map((m) => card(m.name, m.about, () => { chosen.map = m; missionMenu(); }, mapStatus(m)))),
      el("div", { class: "row" }, el("button", { type: "button", onclick: mainMenu }, "Back")));
  }
  function missionMenu() {
    const map = chosen.map, st = memState(), learned = !!st.palaces[palaceId(map)]?.learned, list = listOf(map);
    const free = learned && C.status(st, palaceId(map)) === "free";
    const missions = MISSIONS.filter((x) => x.mode === chosen.mode);
    const memoryRow = el("div", { class: "ops-memory" },
      el("div", {}, el("b", {}, `${map.name} route: `), mapStatus(map)),
      el("div", { class: "row" },
        el("button", { type: "button", class: learned ? "" : "primary", onclick: () => startTour("learn") }, learned ? "Walk the route again" : "Learn the route"),
        free ? el("button", { type: "button", class: "primary", onclick: () => storeMenu() }, "Store a list here") : "",
        list ? el("a", { class: "button", href: "/memory-palace/" }, "Open in Memory Palace") : ""));
    screen(`${map.name} · ${MODES[chosen.mode].name}`, "", memoryRow,
      el("div", { class: "ops-cards" }, ...missions.map((x) => {
        const ok = x.needs === "list" ? !!list : x.needs === "route" ? learned || x.id === "defuse" : true;
        const why = ok ? "" : x.needs === "list" ? (learned ? "Store a list on this route first" : "Learn the route, then store a list") : "Learn the route first";
        return card(x.name, x.about, () => brief(x), why || (x.bots ? "Bots · weapons" : "No shooting"), !ok);
      })),
      el("div", { class: "row" }, el("button", { type: "button", onclick: mapMenu }, "Back")));
  }
  function storeMenu() {
    const map = chosen.map, kids = chosen.mode === "children";
    const packs = D.PACKS.filter((k) => (kids ? k.group === "children" : true));
    let kind = "permanent";
    const kindRow = el("div", { class: "row" }, el("span", {}, "This list is for:"),
      ...[["permanent", "Keeping (reviews)"], ["practice", "Practice"]].map(([k, t]) => {
        const b = el("button", { type: "button", class: k === kind ? "on" : "", onclick: () => { kind = k; kindRow.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); } }, t);
        return b;
      }));
    screen(`Store a list on the ${map.name} route`, "Choose a list. Next you walk the route and picture each thing at its place.", kindRow,
      el("div", { class: "ops-cards" }, ...packs.map((k) => card(k.name, k.about, () => {
        const st = memState(), items = k.items.slice(0, kids ? 5 : 15);
        C.store(st, { palace: palaceId(map), name: k.name, items, packId: k.id, kind, child: kids });
        C.save(st);
        startTour("store");
      }, `${Math.min(k.items.length, kids ? 5 : 15)} items`))),
      el("p", { class: "ops-hint" }, "For your own lists (up to 15 lines), store them in Memory Palace on the route “Ops " + map.name + "”."),
      el("div", { class: "row" }, el("button", { type: "button", onclick: missionMenu }, "Back")));
  }
  function brief(mission) {
    const versus = S.players === 2 && S.together === "versus";
    if (versus && !mission.versus) { alert("Against each other works in Ordinary mode's Bomb defusal. Choose 'Together' in Settings for this mission."); return; }
    setup(mission);
    const kids = chosen.mode === "children";
    const keys = kids ? [["W A S D", "walk"], ["Mouse", "look around"], ["E", "look at a place"], ["1 2 3", "choose an answer"]]
      : [["W A S D", "walk"], ["Mouse", "aim"], ...(mission.weapons ? [["Left click", "shoot"], ["R", "reload"], ["1 2 3 · Q", "rifle, pistol, knife"]] : []),
         ["E", "use, defuse, answer at a place"], ["Shift / C", "walk quietly / crouch"], ["Esc or Tab", "pause, get the mouse back"]];
    if (S.players === 2) keys.push(["Player 2", "I J K L move · arrows look · Enter fire · right Shift use · U jump · O weapon · P reload · 7 8 9 0 answers"]);
    screen(mission.name, mission.story(game),
      el("div", { class: "ops-keys" }, ...keys.flatMap(([k, v]) => [el("kbd", {}, k), el("span", {}, v)])),
      el("div", { class: "row" }, el("button", { type: "button", class: "primary", onclick: begin }, kids ? "Play" : "Start"),
        el("button", { type: "button", onclick: missionMenu }, "Back")));
    speak(mission.story(game));
  }

  // ---------- a game ----------
  const renderer = OpsRender.create(canvas);
  if (!renderer) { menu.replaceChildren(el("div", { class: "ops-menu" }, el("h2", {}, "3D not available"), el("p", {}, "This browser can't draw 3D graphics (WebGL). Try Chrome or Edge."))); return; }
  let builtFor = null, built = null;
  function world(map) {
    if (builtFor !== map.id) { built = M.build(map); built.grid = M.walkGrid(built); renderer.setWorld(built, map); builtFor = map.id; }
    return built;
  }
  function newPlayer(i, pos, yaw) {
    const p = Object.assign(BC.body([pos[0], FLOOR + 0.01, pos[1]], yaw), { idx: i, hp: 100, armor: 100, alive: true, kills: 0, deadT: 0, hurtT: 0, bob: 0, question: null, msg: [], prompt: "" });
    CB.arm(p);
    return p;
  }
  function setup(mission, keepScore = false) {
    const map = chosen.map, w = world(map), r = CB.rng(Date.now() & 0xffff);
    const versus = S.players === 2 && S.together === "versus" && mission.versus;
    const st = memState(), list = listOf(map), palace = palaceOf(map);
    const start = map.start, other = versus ? [map.enemies[0][0] + 0.5, map.enemies[0][1] + 0.5] : [start[0] + 1.2, start[1]];
    const players = [newPlayer(0, start, CB.angleTo([start[0], 0, start[1]], [map.size[0] / 2, 0, map.size[1] / 2]))];
    if (S.players === 2) players.push(newPlayer(1, other, CB.angleTo([other[0], 0, other[1]], [map.size[0] / 2, 0, map.size[1] / 2])));
    const prev = keepScore && game ? game.score : { won: 0, lost: 0, round: 0 };
    game = { mission, mode: chosen.mode, map, w, list: list && (mission.needs === "list" || mission.id === "defuse" || mission.id === "chain") ? list : null, palace,
             players, bots: [], r, t: 0, timer: null, phase: "brief", versus, score: { ...prev, round: prev.round + 1 }, puffs: [], results: null, target: null, hints: {} };
    if (mission.bots && !versus) game.bots = CB.spawnBots(map, w.grid, w.size, Math.min(12, S.bots + (mission.id === "defuse" ? game.score.round - 1 : 0)), r);
    MISSION_PLAY[mission.id].setup(game);
  }
  function spotPos(i, y = 0) { const [x, z] = game.map.spots[i]; return [x + 0.5, FLOOR + y, z + 0.5]; }
  function nearSpot(p) {
    let best = -1, bd = REACH;
    game.map.spots.forEach(([x, z], i) => { const d = Math.hypot(p.pos[0] - x - 0.5, p.pos[2] - z - 0.5); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const placeName = (i) => `${game.palace.loci[i].emoji} ${game.palace.loci[i].name}`;
  function tell(text, p = null, kind = "") { for (const q of p ? [p] : game.players) { q.msg.unshift({ text, kind, t: 5 }); q.msg = q.msg.slice(0, 4); } }

  // a question for one player: choices (keys 1-4, player 2: 7-0) or, for one adult player, typing
  function ask(p, q, done) {
    const typed = S.answers === "type" && S.players === 1 && game.mode !== "children" && q.item;
    p.question = { ...q, typed, done, opts: typed ? null : q.options };
    if (p.idx === 0 && document.pointerLockElement) document.exitPointerLock();
    renderHud(p, true);
    speak(q.prompt + (q.options && !typed ? ". " + q.options.map((o, k) => `${k + 1}: ${o.text}`).join(". ") : ""));
  }
  function answer(p, k, typedText = null) {
    const q = p.question;
    if (!q) return;
    const ok = q.typed ? C.matches(typedText, q.item) : !!q.opts[k]?.correct;
    p.question = null;
    (ok ? sfx.good : sfx.bad)();
    if (p.idx === 0 && game.phase === "play") lockMouse();
    q.done(ok, q.typed);
    renderHud(p, true);
  }
  function itemChoices(item, n = 3) {
    const others = shuffle(game.list.items.filter((x) => x !== item)).slice(0, n - 1);
    return shuffle([item, ...others]).map((x) => ({ text: label(x), emoji: x.emoji || "", correct: x === item }));
  }
  function questionHere(p, i, then) {
    const item = game.list.items[i];
    ask(p, { prompt: `What did you store at the ${game.palace.loci[i].name.toLowerCase()}?`, emoji: game.palace.loci[i].emoji, item, options: itemChoices(item) }, then);
  }

  // ---------- how each mission plays ----------
  const MISSION_PLAY = {
    defuse: {
      setup(g) {
        g.bomb = Math.floor(g.r() * Math.min(15, g.map.spots.length));
        g.timer = 100 * (S.timer || 99);
        g.clue = g.list && g.list.items[g.bomb] ? `The bomb is where you stored “${label(g.list.items[g.bomb])}”` : `The bomb is at place ${g.bomb + 1} of the route`;
        g.defusing = null;
      },
      objective: (g) => g.defusing ? `Defusing… ${Math.ceil(g.defusing.left)} s` : g.clue,
      use(g, p, i) {
        if (g.defusing) return;
        if (i !== g.bomb) { tell("No bomb here.", p, "bad"); g.timer -= 5; return sfx.bad(); }
        const start = (secs) => { g.defusing = { p, left: secs }; tell(`Defusing: stay here (${secs} s)`, p); };
        if (g.list) questionHere(p, i, (ok) => start(ok ? 1.5 : 6));
        else ask(p, { prompt: "Which place is this?", emoji: "💣", options: shuffle([i, ...shuffle([...g.map.spots.keys()].filter((k) => k !== i)).slice(0, 2)]).map((k) => ({ text: g.palace.loci[k].name, emoji: g.palace.loci[k].emoji, correct: k === i })) },
          (ok) => start(ok ? 1.5 : 6));
      },
      update(g, dt) {
        if (g.defusing) {
          const p = g.defusing.p;
          if (!p.alive || nearSpot(p) !== g.bomb) { g.defusing = null; tell("Defusing stopped: stay at the bomb.", p, "bad"); }
          else { g.defusing.left -= dt; if (Math.floor(g.defusing.left * 2) !== Math.floor((g.defusing.left + dt) * 2)) sfx.beep();
                 if (g.defusing.left <= 0) return finish(true, g.versus ? `Player ${p.idx + 1} defused the bomb!` : "Bomb defused.", p); }
        }
        if (!g.versus && g.bots.length && g.bots.every((b) => !b.alive)) return finish(true, "All bots eliminated.");
        if (g.timer !== null && g.timer <= 0) { sfx.boom(); return finish(false, "The bomb went off."); }
        if (!g.versus && g.players.every((p) => !p.alive)) return finish(false, "You were eliminated.");
      },
      sprites(g) { return g.defusing ? [{ i: g.bomb, emoji: "💣", label: "" }] : []; },
    },
    courier: {
      setup(g) { g.next = 0; g.right = []; g.typedAll = true; g.timer = S.timer ? g.list.items.length * 25 * S.timer : null; },
      objective: (g) => g.next < g.list.items.length ? `Deliver package ${g.next + 1} of ${g.list.items.length} to place ${g.next + 1}` : "",
      use(g, p, i) {
        if (i !== g.next) { tell(`This is not place ${g.next + 1}.`, p, "bad"); if (g.timer !== null) g.timer -= 5; return sfx.bad(); }
        questionHere(p, i, (ok, typed) => {
          g.right[i] = ok; if (!typed) g.typedAll = false;
          tell(ok ? "Delivered." : `Delivered, but it was: ${label(g.list.items[i])}`, p, ok ? "good" : "bad");
          g.next++;
          if (g.next >= g.list.items.length) finish(true, "All packages delivered.");
        });
      },
      update(g) { if (g.timer !== null && g.timer <= 0) finish(false, "Dawn came before you finished."); },
      results: (g) => g.list.items.map((_, k) => g.right[k] === true),
    },
    breach: {
      setup(g) {
        g.intel = shuffle([...g.list.items.keys()], g.r).slice(0, Math.min(4, g.list.items.length));
        g.found = 0;
      },
      objective: (g) => g.found < g.intel.length ? `Intel ${g.found + 1} of ${g.intel.length}: where you stored “${label(g.list.items[g.intel[g.found]])}”` : "",
      use(g, p, i) {
        if (i !== g.intel[g.found]) { tell("Nothing here.", p, "bad"); return sfx.bad(); }
        g.found++; sfx.good(); tell("Intel recovered.", p, "good");
        if (g.found >= g.intel.length) finish(true, "All intel recovered.");
      },
      update(g) { if (g.players.every((p) => !p.alive)) finish(false, "You were eliminated."); },
    },
    chain: {
      setup(g) {
        g.bombs = shuffle([...Array(14).keys()].map((k) => k + 1), g.r).slice(0, 4);    // never place 1: it has no place before it
        g.done = 0; g.timer = S.timer ? 50 * S.timer : null;
      },
      objective: (g) => g.done < g.bombs.length ? `Bomb ${g.done + 1} of ${g.bombs.length}: the place after the ${g.palace.loci[g.bombs[g.done] - 1].name.toLowerCase()}` : "",
      use(g, p, i) {
        const b = g.bombs[g.done];
        if (i !== b) { tell("No bomb here.", p, "bad"); if (g.timer !== null) g.timer -= 5; return sfx.bad(); }
        const next = () => { g.done++; sfx.good(); tell("Defused.", p, "good"); if (g.done >= g.bombs.length) finish(true, "Every bomb defused."); else if (S.timer) g.timer = 50 * S.timer; };
        if (g.list && g.list.items[i]) questionHere(p, i, (ok) => { if (!ok) tell(`It was: ${label(g.list.items[i])}`, p, "bad"); next(); }); else next();
      },
      update(g) { if (g.timer !== null && g.timer <= 0) { sfx.boom(); finish(false, "A bomb went off."); } },
    },
    treasure: {
      setup(g) { g.next = 0; g.right = []; g.coins = 0; },
      objective: (g) => g.next < g.list.items.length ? `Follow the star to the ${g.palace.loci[g.next].emoji} ${g.palace.loci[g.next].name}` : "",
      beacon: (g) => g.next,
      use(g, p, i) {
        if (i !== g.next) { tell(`This is the ${g.palace.loci[i].name}. Follow the star!`, p); return; }
        questionHere(p, i, (ok) => {
          if (g.right[i] === undefined) g.right[i] = ok;
          if (ok) { g.coins++; tell("🪙 A gold coin!", p, "good"); speak("Yes! A gold coin!"); g.next++; if (g.next >= g.list.items.length) finish(true, `You found the whole treasure: ${g.coins} gold coins!`); }
          else { tell("Not quite. Try again!", p, "bad"); speak("Not quite. Try again!"); setTimeout(() => game === g && g.phase === "play" && MISSION_PLAY.treasure.use(g, p, i), 900); }
        });
      },
      update() {},
      results: (g) => g.list.items.map((_, k) => g.right[k] === true),
    },
    puppies: {
      setup(g) { g.hidden = shuffle([...g.list.items.keys()], g.r).slice(0, Math.min(3, g.list.items.length)); g.found = 0; g.since = 0; },
      objective: (g) => g.found < g.hidden.length ? `A puppy is hiding where you put the ${g.list.items[g.hidden[g.found]].emoji || ""} ${g.list.items[g.hidden[g.found]].text}` : "",
      beacon: (g) => (g.since > 45 ? g.hidden[g.found] : null),           // a helping star after a while
      use(g, p, i) {
        if (i !== g.hidden[g.found]) { tell("No puppy here. Try another place!", p); speak("No puppy here. Try another place!"); return; }
        g.found++; g.since = 0; sfx.win(); tell("🐶 You found a puppy!", p, "good"); speak("You found a puppy!");
        g.foundAt = (g.foundAt || []).concat(i);
        if (g.found >= g.hidden.length) finish(true, "All the puppies are home!"); else setTimeout(() => game === g && speak(MISSION_PLAY.puppies.objective(g)), 1500);
      },
      update(g, dt) { g.since += dt; },
      sprites: (g) => (g.foundAt || []).map((i) => ({ i, emoji: "🐶", label: "" })),
    },
  };

  // ---------- the guided walks: learning the route, and storing a list along it ----------
  function startTour(kind) {
    const map = chosen.map, w = world(map), palace = palaceOf(map), list = kind === "store" ? listOf(map) : null;
    const players = [newPlayer(0, map.start, CB.angleTo([map.start[0], 0, map.start[1]], [map.spots[0][0], 0, map.spots[0][1]]))];
    game = { mission: { id: "tour", weapons: false, bots: false }, tour: kind, mode: chosen.mode, map, w, palace, list, players, bots: [], r: CB.rng(1), t: 0,
             timer: null, phase: "brief", next: 0, puffs: [], hints: {}, score: { won: 0, lost: 0, round: 0 } };
    const n = list ? list.items.length : 15;
    const text = kind === "learn"
      ? `Walk the ${map.name} route: a star shows the next place. At each place press E, look around and fix its picture and number in your mind. Then a short test.`
      : `Walk the route with your list (“${list.name}”). At each place, see the thing you store there as a big, strange, moving picture. Press E to go on.`;
    screen(kind === "learn" ? `Learn the ${map.name} route` : "Store your list", text,
      el("div", { class: "row" }, el("button", { type: "button", class: "primary", onclick: begin }, "Start walking"), el("button", { type: "button", onclick: missionMenu }, "Back")));
    game.tourCount = n;
  }
  function tourUse(p, i) {
    const g = game;
    if (i !== g.next) { tell(`This is place ${i + 1}. Follow the star to place ${g.next + 1}.`, p); return; }
    const l = g.palace.loci[i];
    if (g.tour === "store") {
      const it = g.list.items[i], idea = C.scene(it, l, i), num = C.numberIn(it), np = num !== null && g.mode !== "children" ? C.numberPicture(num) : null;
      tell(`${i + 1}. ${l.name} + ${label(it)} — ${idea}${np ? ` Add ${np.words} ${np.emoji}.` : ""}`, p, "good");
      speak(`${l.name}. ${it.text}. ${idea}`);
    } else { tell(`Place ${i + 1}: ${l.emoji} ${l.name}`, p, "good"); speak(`Place ${i + 1}. ${l.name}`); }
    sfx.good();
    g.next++;
    if (g.next >= g.tourCount) setTimeout(() => (g.tour === "learn" ? routeQuiz() : finishTour()), 1200);
  }
  function routeQuiz() {
    const map = chosen.map, palace = palaceOf(map), qs = shuffle([...Array(14).keys()]).slice(0, 5);
    let k = 0, right = 0;
    const askNext = () => {
      if (k >= qs.length) {
        const pass = right >= 4;
        if (pass) { const st = memState(); C.learn(st, palaceId(map)); C.save(st); }
        return screen(pass ? "You know the route" : "Nearly there", pass ? `${right} of 5. The ${map.name} route is learned; it is now a palace in Memory Palace too.` : `${right} of 5. Walk it once more and try again.`,
          el("div", { class: "row" }, el("button", { type: "button", class: "primary", onclick: pass ? missionMenu : () => startTour("learn") }, pass ? "Continue" : "Walk again"), el("button", { type: "button", onclick: missionMenu }, "Back")));
      }
      const a = qs[k], right_ = palace.loci[a + 1], opts = shuffle([right_, ...shuffle(palace.loci.filter((l, i) => i !== a + 1 && i !== a)).slice(0, 2)]);
      screen(`Route test ${k + 1} of 5`, `What comes after the ${palace.loci[a].emoji} ${palace.loci[a].name}?`,
        el("div", { class: "ops-cards" }, ...opts.map((o) => card(`${o.emoji} ${o.name}`, "", () => { if (o === right_) right++; k++; askNext(); }))));
    };
    askNext();
  }
  function finishTour() {
    screen("Stored", "Your list is on the route. Recall it straight away: play Night courier (Special) or Treasure trail (Children), or recall it in Memory Palace.",
      el("div", { class: "row" }, el("button", { type: "button", class: "primary", onclick: missionMenu }, "Choose a mission"), el("a", { class: "button", href: "/memory-palace/" }, "Memory Palace")));
  }

  // ---------- playing ----------
  let playing = false, raf = 0, last = 0;
  function begin() {
    menu.classList.add("hidden");
    game.phase = "play";
    buildHuds();
    playing = true; last = performance.now();
    lockMouse();
    if (game.mission.id !== "tour") speak(objectiveOf(game.players[0]));
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function lockMouse() { if (!touchDevice) canvas.requestPointerLock?.(); }
  const touchDevice = false;
  function stopPlaying() { playing = false; if (document.pointerLockElement) document.exitPointerLock(); keys.clear(); mouseDown = false; }
  function pause() {
    if (!game || game.phase !== "play") return;
    stopPlaying(); game.phase = "paused";
    screen("Paused", objectiveOf(game.players[0]),
      el("div", { class: "row" }, el("button", { type: "button", class: "primary", onclick: () => { game.phase = "play"; menu.classList.add("hidden"); playing = true; last = performance.now(); lockMouse(); } }, "Continue"),
        el("button", { type: "button", onclick: () => { game.phase = "done"; missionMenu(); } }, "Quit the mission")));
  }
  function finish(won, why, by = null) {
    const g = game;
    if (!g || g.phase === "done") return;
    g.phase = "done"; stopPlaying();
    won ? sfx.win() : null;
    let memo = "";
    const mp = MISSION_PLAY[g.mission.id];
    if (g.mission.records && g.list && mp.results) {
      const right = mp.results(g), st = memState(), res = C.record(st, g.list.id, right, Date.now(), memPlan(), g.mission.id === "courier" && g.typedAll && S.answers === "type" ? "recall" : "choice", "ops");
      C.save(st);
      const l = st.lists[g.list.id], pct = Math.round(res.score * 100);
      memo = l.kind === "practice" ? `${pct} % right first time (practice list).` : res.score < C.PASS ? `${pct} % right: go over the missed ones and play again today.`
        : res.light ? `${pct} % right. Fresh again; a typed recall (Answering: Type) moves it to a longer gap.` : `${pct} % right. Next review ${new Date(res.next).toLocaleDateString("en-GB")}.`;
    }
    if (g.mission.id === "defuse") { if (won) g.score.won++; else g.score.lost++; }
    const missed = g.mission.records && g.list ? g.list.items.filter((_, k) => !mp.results(g)[k]) : [];
    const kills = g.players.map((p) => p.kills);
    screen(won ? (g.mode === "children" ? "Hooray!" : "Mission complete") : "Mission failed", why,
      memo ? el("p", {}, memo) : "",
      missed.length ? el("p", { class: "ops-hint" }, "To look at again: " + missed.map((it) => { const k = g.list.items.indexOf(it); return `${g.palace.loci[k].emoji} ${g.palace.loci[k].name}: ${label(it)}`; }).join(" · ")) : "",
      g.mission.weapons ? el("p", {}, `Kills: ${kills.join(" / ")}${g.mission.id === "defuse" ? ` · rounds won ${g.score.won}, lost ${g.score.lost}` : ""}`) : "",
      el("div", { class: "row" },
        el("button", { type: "button", class: "primary", onclick: () => { setup(g.mission, g.mission.id === "defuse"); begin(); } }, g.mission.id === "defuse" ? "Next round" : "Play again"),
        el("button", { type: "button", onclick: missionMenu }, "Missions")));
    if (g.mode === "children") speak(why);
  }
  const objectiveOf = (p) => {
    const g = game;
    if (!g) return "";
    if (g.mission.id === "tour") return g.next < g.tourCount ? `Follow the star to place ${g.next + 1}${g.tour === "store" ? "" : ""} and press E` : "";
    return MISSION_PLAY[g.mission.id].objective(g, p);
  };

  // ---------- input ----------
  const keys = new Set();
  let mouseDown = false, lockedAt = 0;
  canvas.addEventListener("mousedown", (e) => {
    if (!game || game.phase !== "play") return;
    if (document.pointerLockElement !== canvas) return lockMouse();
    if (e.button === 0) { mouseDown = true; fire(game.players[0], true); }
  });
  document.addEventListener("mouseup", (e) => { if (e.button === 0) mouseDown = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) lockedAt = performance.now();
    else if (playing && game?.phase === "play" && !game.players[0].question) pause();
  });
  document.addEventListener("mousemove", (e) => {
    if (!playing || document.pointerLockElement !== canvas || performance.now() - lockedAt < 150 || Math.abs(e.movementX) > 300) return;
    const p = game.players[0], k = 0.0025 * S.sens / 6;
    p.yaw -= e.movementX * k; p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch - e.movementY * k * (S.invert ? -1 : 1)));
  });
  document.addEventListener("keydown", (e) => {
    if (!game || settings.isOpen() || e.ctrlKey && e.code !== "ControlLeft" || e.metaKey || e.altKey) return;
    if (e.target.tagName === "INPUT") return;
    if (game.phase !== "play") return;
    const [p1, p2] = game.players;
    if (e.key === "Tab" || e.key === "Escape") { e.preventDefault(); if (p1.question && !p1.question.typed) return; return pause(); }
    // answers: player 1 keys 1-4, player 2 keys 7 8 9 0
    if (p1.question && /^[1-4]$/.test(e.key)) return answer(p1, Number(e.key) - 1);
    if (p2?.question && ["7", "8", "9", "0"].includes(e.key)) return answer(p2, ["7", "8", "9", "0"].indexOf(e.key));
    if (!p1.question) {
      if (/^[1-3]$/.test(e.key) && game.mission.weapons) switchWeapon(p1, CB.ORDER[Number(e.key) - 1]);
      if (e.code === "KeyQ" && game.mission.weapons) switchWeapon(p1, p1.last);
      if (e.code === "KeyR") reload(p1);
      if (e.code === "KeyE") use(p1);
    }
    if (p2 && !p2.question) {
      if (e.code === "ShiftRight") use(p2);
      if (e.code === "KeyO" && game.mission.weapons) switchWeapon(p2, CB.ORDER[(CB.ORDER.indexOf(p2.weapon) + 1) % 3]);
      if (e.code === "KeyP") reload(p2);
      if (e.code === "Enter") fire(p2, true);
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
  });
  document.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); mouseDown = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  function use(p) {
    if (!p.alive || p.question) return;
    const i = nearSpot(p);
    if (i < 0) return;
    if (game.mission.id === "tour") return tourUse(p, i);
    MISSION_PLAY[game.mission.id].use(game, p, i);
  }

  // ---------- weapons ----------
  function switchWeapon(p, w) { if (!w || w === p.weapon || !game.mission.weapons) return; p.last = p.weapon; p.weapon = w; p.reload = 0; p.fireCD = 0.35; p.spray = 0; }
  function reload(p) {
    const wpn = CB.WEAPONS[p.weapon], am = p.ammo[p.weapon];
    if (!game.mission.weapons || wpn.melee || p.reload > 0 || am.mag >= wpn.mag || am.reserve <= 0) return;
    p.reload = wpn.reload; sfx.reload();
  }
  function targetsFor(p) { return game.bots.concat(game.versus ? game.players.filter((q) => q !== p) : []); }
  function fire(p, click) {
    if (!game.mission.weapons || !p.alive || p.question || game.phase !== "play") return;
    const wpn = CB.WEAPONS[p.weapon];
    if (p.fireCD > 0 || p.reload > 0 || (!wpn.auto && !click)) return;
    const eye = BC.eyeOf(p);
    if (wpn.melee) {
      p.fireCD = wpn.rate; p.kick = 0.06; sfx.knife();
      const h = CB.shotHit(game.w, targetsFor(p), eye, BC.lookDir(p), wpn.range);
      if (h?.target) damage(p, h.target, wpn.dmg, false);
      return;
    }
    const am = p.ammo[p.weapon];
    if (am.mag <= 0) { if (click) { tone(300, 0.03); reload(p); } return; }
    am.mag--; p.fireCD = wpn.rate; sfx.shot(); p.kick = 0.05; p.flash = 0.05;
    const moving = Math.hypot(p.vel[0], p.vel[2]) / 4;
    let spread = wpn.spread + wpn.moveSpread * Math.min(1, moving) + (p.onGround ? 0 : 0.12);
    if (p.crouch) spread *= 0.6; else if (p.walking) spread *= 0.75;
    if (p.weapon === "rifle") spread += Math.min(p.spray, 12) * 0.0018;
    const a = Math.random() * Math.PI * 2, rr = Math.random() * spread;
    const yaw = p.yaw + Math.cos(a) * rr, pitch = p.pitch + Math.sin(a) * rr, c = Math.cos(pitch);
    const dir = [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c];
    const h = CB.shotHit(game.w, targetsFor(p), eye, dir, wpn.range);
    if (h?.target) damage(p, h.target, h.head ? wpn.dmg * wpn.head : wpn.dmg, h.head);
    else if (h?.wall) { const at = eye.map((v, i) => v + dir[i] * h.t); for (let k = 0; k < 4; k++) game.puffs.push({ p: at.slice(), v: [(Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2], t: 0.4 }); }
    const [kx, ky] = p.weapon === "rifle" ? CB.sprayKick(p.spray) : [0, 0.03];
    p.pitch = Math.min(1.5, p.pitch + ky); p.yaw -= kx; p.debt += ky; p.spray++; p.sprayT = 0.3;
    if (am.mag === 0) reload(p);
  }
  function damage(by, t, dmg, head) {
    by.hit = 0.15; sfx.marker();
    if (t.idx !== undefined) { CB.hurt(t, dmg); t.hurtT = 0.2; sfx.hurt(); if (!t.alive) { by.kills++; t.deadT = 0; tell(`Player ${by.idx + 1} ▸ player ${t.idx + 1}`); } return; }
    t.hp -= dmg; t.alert = 5; t.hurtT = 0.12;
    if (t.hp <= 0 && t.alive) { t.alive = false; t.deadT = 0; by.kills++; tell(`Player ${by.idx + 1} ▸ bot ${t.id}${head ? " (headshot)" : ""}`); }
  }

  // ---------- the loop ----------
  function tick(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;     // the first frame after a start can be stamped before it
    if (game && game.phase === "play" && playing) step(dt);
    if (game && (game.phase === "play" || game.phase === "paused" || game.phase === "done")) draw();
    raf = requestAnimationFrame(tick);
  }
  function step(dt) {
    const g = game, k = (c) => keys.has(c);
    g.t += dt;
    if (g.timer !== null) g.timer -= dt;
    g.players.forEach((p, i) => {
      if (!p.alive) {
        p.deadT += dt;
        if (g.versus && p.deadT > 4) {      // against each other: back after a moment
          const [x, z] = i ? g.map.enemies[0] : g.map.start;
          Object.assign(p, BC.body([x + 0.5, FLOOR + 0.01, z + 0.5], p.yaw), { hp: 100, armor: 50, alive: true, deadT: 0 }); CB.arm(p);
        }
        return;
      }
      const input = i === 0
        ? { forward: (k("KeyW") ? 1 : 0) - (k("KeyS") ? 1 : 0), right: (k("KeyD") ? 1 : 0) - (k("KeyA") ? 1 : 0), jump: k("Space"),
            crouch: k("KeyC") || k("ControlLeft"), walk: k("ShiftLeft") }
        : { forward: (k("KeyI") ? 1 : 0) - (k("KeyK") ? 1 : 0), right: (k("KeyL") ? 1 : 0) - (k("KeyJ") ? 1 : 0), jump: k("KeyU"), crouch: false, walk: false };
      if (p.question) input.forward = input.right = 0;
      if (i === 1 || S.players === 1) {     // keyboard looking for player 2 (player 1 can use the arrows too when alone)
        const turnK = 2.4 * dt * S.sens / 6;
        if (i === 1 || !document.pointerLockElement) {
          p.yaw += ((k("ArrowLeft") ? 1 : 0) - (k("ArrowRight") ? 1 : 0)) * turnK;
          p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch + ((k("ArrowUp") ? 1 : 0) - (k("ArrowDown") ? 1 : 0)) * turnK * 0.7));
        }
      }
      p.crouch = !!input.crouch; p.walking = !!input.walk;
      BC.stepPlayer(g.w, p, input, dt, { speed: g.mission.weapons ? CB.WEAPONS[p.weapon].speed : 4.8 });
      p.bob += dt * Math.hypot(p.vel[0], p.vel[2]);
      // weapons
      p.fireCD = Math.max(0, p.fireCD - dt); p.kick = Math.max(0, p.kick - dt * 0.4); p.flash = Math.max(0, p.flash - dt); p.hit = Math.max(0, (p.hit || 0) - dt);
      p.hurtT = Math.max(0, p.hurtT - dt);
      if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { const wpn = CB.WEAPONS[p.weapon], am = p.ammo[p.weapon], n = Math.min(wpn.mag - am.mag, am.reserve); am.mag += n; am.reserve -= n; p.reload = 0; } }
      if ((i === 0 && mouseDown) || (i === 1 && k("Enter"))) fire(p, false);
      p.sprayT -= dt;
      if (p.sprayT <= 0) { p.spray = 0; if (p.debt > 0) { const back = Math.min(p.debt, dt * 0.9); p.pitch -= back; p.debt -= back; } }
      for (const m of p.msg) m.t -= dt;
      p.msg = p.msg.filter((m) => m.t > 0);
      const s = nearSpot(p);
      p.prompt = s >= 0 && !p.question ? `${i === 0 ? "E" : "Right Shift"}: ${g.mission.id === "tour" ? "this is" : "check"} ${placeName(s)}` : "";
    });
    for (const pf of g.puffs) { pf.t -= dt; pf.p = pf.p.map((v, i) => v + pf.v[i] * dt); }
    g.puffs = g.puffs.filter((pf) => pf.t > 0);
    if (g.bots.length) for (const s of CB.updateBots(g.w, g.w.grid, g.bots, g.players, S.skill, dt, g.r)) {
      sfx.shot(s.dist);
      if (s.hit && s.target.alive) { CB.hurt(s.target, s.dmg); s.target.hurtT = 0.3; sfx.hurt(); }
    }
    if (g.mission.id !== "tour") MISSION_PLAY[g.mission.id].update(g, dt);
    if (game === g && g.phase === "play") g.players.forEach((p) => renderHud(p));
  }

  // ---------- drawing ----------
  function draw() {
    const g = game, rect = field.getBoundingClientRect(), n = g.players.length, w = rect.width / n;
    const mp = MISSION_PLAY[g.mission.id], beacon = g.mission.id === "tour" ? (g.next < g.tourCount ? g.next : null) : mp?.beacon ? mp.beacon(g) : null;
    const extra = mp?.sprites ? mp.sprites(g) : [];
    const views = g.players.map((p, i) => {
      const boxes = [];
      for (const b of g.bots) if (b.alive || b.deadT < 2.5) OpsRender.person(boxes, b, { gun: true });
      for (const q of g.players) if (q !== p && (q.alive || q.deadT < 2.5)) OpsRender.person(boxes, q, { outfit: "blue", gun: g.mission.weapons });
      for (const pf of g.puffs) OpsRender.box(boxes, ...pf.p, 0.07, 0.07, 0.07, 0, [0.8, 0.75, 0.6]);
      g.map.spots.forEach(([x, z], k) => {        // a mat on the floor at each place
        const col = k === beacon ? [1.5, 1.3, 0.3] : [0.85, 0.85, 0.8];
        OpsRender.box(boxes, x + 0.5, FLOOR + 0.02, z + 0.5, 1.1, 0.04, 1.1, 0, col);
      });
      if (beacon !== null) { const [x, z] = g.map.spots[beacon]; OpsRender.box(boxes, x + 0.5, FLOOR + 4, z + 0.5, 0.12, 8, 0.12, g.t, [1.8, 1.6, 0.5]); }
      const sprites = g.map.spots.map(([x, z], k) => {
        const l = g.palace.loci[k];
        return { pos: [x + 0.5, FLOOR + 2.1, z + 0.5], tex: renderer.spriteTex(`${g.map.id}-${k}`, l.emoji, `${k + 1} · ${l.name}`), w: 0.55, h: 0.55 };
      });
      if (beacon !== null) { const [x, z] = g.map.spots[beacon]; sprites.push({ pos: [x + 0.5, FLOOR + 3.2 + Math.sin(g.t * 3) * 0.15, z + 0.5], tex: renderer.spriteTex("star", "⭐", ""), w: 0.45, onTop: true }); }
      for (const s of extra) sprites.push({ pos: spotPos(s.i, 1.0), tex: renderer.spriteTex(`x-${s.emoji}`, s.emoji, s.label), w: 0.5 });
      const hands = [];
      if (p.alive) OpsRender.viewmodel(hands, g.mission.weapons ? p.weapon : "hand", { bob: p.bob, reload: p.reload > 0 ? 1 - p.reload / CB.WEAPONS[p.weapon].reload : 0, kick: p.kick, flash: p.flash });
      const eye = BC.eyeOf(p), dir = BC.lookDir(p);
      if (!p.alive) eye[1] = p.pos[1] + 0.4;
      return { rect: [i * w, 0, w, rect.height], eye, dir, fov: S.fov, boxes, sprites, hands };
    });
    renderer.frame(views, { shadows: S.shadows, fog: 75 });
  }

  // ---------- the HUD (one per player) ----------
  function buildHuds() {
    huds.replaceChildren(...game.players.map((p) => {
      const h = el("div", { class: "ops-hud", style: `left:${(p.idx * 100) / game.players.length}%;width:${100 / game.players.length}%` },
        el("div", { class: "obj" }), el("div", { class: "timer" }), el("div", { class: "feed" }), el("div", { class: "cross" }), el("div", { class: "hitm" }),
        el("div", { class: "prompt" }), el("div", { class: "dmg" }),
        el("div", { class: "hp" }), el("div", { class: "ammo" }), el("div", { class: "q hidden" }), el("div", { class: "who" }, game.players.length > 1 ? `Player ${p.idx + 1}` : ""));
      p.hud = h;
      return h;
    }));
    root.dataset.mode = game.mode; root.dataset.weapons = game.mission.weapons ? "1" : "0";
  }
  function renderHud(p, full = false) {
    const h = p.hud, g = game;
    if (!h) return;
    const q = (sel) => h.querySelector(sel);
    q(".obj").textContent = objectiveOf(p);
    q(".timer").textContent = g.timer !== null && g.timer !== undefined ? `${Math.max(0, Math.floor(g.timer / 60))}:${String(Math.max(0, Math.floor(g.timer % 60))).padStart(2, "0")}` : "";
    q(".timer").classList.toggle("low", g.timer !== null && g.timer < 15);
    q(".feed").replaceChildren(...p.msg.map((m) => el("div", { class: m.kind }, m.text)));
    q(".prompt").textContent = p.alive ? p.prompt : g.versus ? "Back in a moment…" : "You are out";
    q(".dmg").style.opacity = Math.min(0.6, p.hurtT * 2);
    q(".hitm").classList.toggle("on", (p.hit || 0) > 0);
    q(".hp").textContent = g.mission.weapons ? `❤ ${Math.ceil(p.hp)}   🛡 ${Math.ceil(p.armor)}` : "";
    const wpn = CB.WEAPONS[p.weapon];
    q(".ammo").textContent = g.mission.weapons ? (wpn.melee ? wpn.name : `${wpn.name}${p.reload > 0 ? " · reloading" : ""}   ${p.ammo[p.weapon].mag} / ${p.ammo[p.weapon].reserve}`) : "";
    if (!full) return;
    const box = q(".q"), qu = p.question;
    box.classList.toggle("hidden", !qu);
    if (!qu) return box.replaceChildren();
    const keysFor = p.idx === 0 ? ["1", "2", "3", "4"] : ["7", "8", "9", "0"];
    if (qu.typed) {
      const input = el("input", { type: "text", placeholder: "Type what you stored here, then Enter", autocomplete: "off" });
      input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") answer(p, -1, input.value); if (e.key === "Escape") answer(p, -1, ""); });
      box.replaceChildren(el("b", {}, `${qu.emoji || ""} ${qu.prompt}`), input, el("small", {}, "Enter: answer · empty: I don't know"));
      setTimeout(() => input.focus(), 30);
    } else box.replaceChildren(el("b", {}, `${qu.emoji || ""} ${qu.prompt}`),
      ...qu.opts.map((o, k) => el("button", { type: "button", onclick: () => answer(p, k) }, el("kbd", {}, keysFor[k]), o.emoji ? el("span", { class: "e" }, o.emoji) : "", o.text)));
  }

  // ---------- start ----------
  // Home: leave whatever is going on and go back to the choice of mode
  $("homeBtn").onclick = () => {
    if (game?.phase === "play" && !confirm("Leave this mission and go back to the start?")) return;
    if (game) game.phase = "done";
    mainMenu();
  };
  setupFullscreen(root);
  window.MemoryOps = { state: () => game, MISSIONS, setChosen: (mode, mapId) => { chosen = { mode, map: M.byId(mapId) }; }, brief: (id) => brief(MISSIONS.find((x) => x.id === id)),
                       begin, use: (i = 0) => use(game.players[i]), answer: (k, i = 0, text = null) => answer(game.players[i], k, text), startTour, missionMenu, step };   // for tests
  mainMenu();
  requestAnimationFrame(tick);
})();
