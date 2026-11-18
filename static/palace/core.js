/* Memory Palace: the rules, without any drawing. Palaces are learned first; a list is stored in a free palace;
   recalling it moves it along a review schedule (spaced repetition). A permanent palace keeps its list until
   it is retired; a practice palace is freed when the list is finished. A freed palace rests until the next day,
   so the old pictures fade before new ones go in. Everything is kept in this browser. */
"use strict";
const PalaceCore = (() => {
  const DAY = 864e5, KEY = "sora.memoryPalace.v1", PASS = 0.8;
  // days until the next review after each successful recall
  const INTERVALS = { standard: [1, 3, 7, 14, 30, 60, 120], intensive: [1, 2, 4, 7, 14, 30, 60] };

  function fresh(palaces) {
    return { palaces: Object.fromEntries(palaces.map((p) => [p.id, { learned: false, learnedAt: null, restUntil: 0, listId: null }])),
             lists: {}, nextId: 1, streak: { last: null, days: 0 } };
  }
  function load(palaces) {
    const base = fresh(palaces);
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!s) return base;
      for (const id of Object.keys(base.palaces)) base.palaces[id] = { ...base.palaces[id], ...(s.palaces?.[id] || {}) };
      return { ...base, ...s, palaces: base.palaces };
    } catch { return base; }
  }
  const save = (state) => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full */ } };

  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const nextDay = (t) => startOfDay(t) + DAY;      // midnight tonight

  // what a palace can be used for now
  function status(state, id, now = Date.now()) {
    const p = state.palaces[id];
    if (!p.learned) return "unlearned";
    if (p.listId && state.lists[p.listId] && !state.lists[p.listId].done) return "holding";
    if (p.restUntil > now) return "resting";
    return "free";
  }
  function learn(state, id, now = Date.now()) { state.palaces[id].learned = true; state.palaces[id].learnedAt = now; }

  function store(state, { palace, name, items, packId = null, kind, child = false }, now = Date.now()) {
    if (status(state, palace, now) !== "free") throw new Error("That palace is not free");
    const id = String(state.nextId++);
    state.lists[id] = { id, name, packId, palace, kind, child, items: items.slice(0, 15), created: now, step: -1, due: now, sessions: [], done: false };
    state.palaces[palace].listId = id;
    return state.lists[id];
  }
  // A review session: right = [true, false, ...] per place. mode "recall" (typed, said, self-checked) or "choice"
  // (picking from options, as in the games): picking is easier than recalling, so for adults a choice review keeps
  // the list fresh (same gap again) and only a real recall moves it on to a longer gap. Children's lists count fully.
  function record(state, listId, right, now = Date.now(), plan = "standard", mode = "recall", game = null) {
    const score = right.filter(Boolean).length / Math.max(1, right.length), res = recordScore(state, listId, score, now, plan, mode, game);
    const list = state.lists[listId];
    if (list.packId && list.kind !== "practice") syncStudy(list.packId, score, mode === "choice" && !list.child, now);
    return res;
  }
  // the same session given as a score (used by Study Quest for a list it shares with a palace)
  function recordScore(state, listId, score, now = Date.now(), plan = "standard", mode = "recall", game = null) {
    const list = state.lists[listId];
    list.sessions.push({ at: now, score: Math.round(score * 100) / 100, mode, game });
    touchStreak(state, now);
    if (list.kind === "practice") return { score, next: null, light: false };
    const light = mode === "choice" && !list.child;
    advance(list, score, light, now, INTERVALS[plan] || INTERVALS.standard);
    return { score, next: list.due, light: light && score >= PASS };
  }
  // the review schedule, shared with Study Quest: passed -> wait the (next) gap (a light review keeps the same gap);
  // missed -> go over it again today (a stage never scheduled yet stays unscheduled when keepNew)
  function advance(e, score, light, now, days = INTERVALS.standard, keepNew = false) {
    if (score >= PASS) { if (!light) e.step = Math.min(e.step + 1, days.length - 1); e.due = startOfDay(now) + days[Math.max(0, e.step)] * DAY; }
    else if (!(keepNew && e.due == null)) { e.step = Math.max(-1, e.step - 1); e.due = now; }
    return e;
  }
  // a list from a Study Quest book reviewed here moves that stage's schedule in Study Quest too
  const STUDY_KEY = "sora.studyQuest.v1", STUDY_DAYS = [1, 3, 6, 12];   // Study Quest's own gaps (capped for the exam)
  function studyEntry(prog, id) { return prog.lists[id] || (prog.lists[id] = { stars: 0, best: 0, step: -1, due: null, plays: 0, last: null }); }
  function syncStudy(packId, score, light, now = Date.now()) {
    try {
      const prog = JSON.parse(localStorage.getItem(STUDY_KEY) || "null") || { lists: {}, xp: 0, streak: { last: null, days: 0 } };
      const e = studyEntry(prog, packId);
      e.plays++; e.last = now; e.best = Math.max(e.best, score);
      e.stars = Math.max(e.stars, score >= 0.95 ? 3 : score >= PASS ? 2 : score >= 0.6 ? 1 : 0);
      advance(e, score, light, now, STUDY_DAYS, true);
      localStorage.setItem(STUDY_KEY, JSON.stringify(prog));
    } catch { /* storage unavailable */ }
  }
  // a permanent list no longer needed, or a practice list finished: the palace is freed and rests until tomorrow
  function release(state, listId, now = Date.now()) {
    const list = state.lists[listId];
    list.done = true; list.endedAt = now;
    const p = state.palaces[list.palace];
    if (p.listId === listId) { p.listId = null; p.restUntil = nextDay(now); }
  }
  const active = (state) => Object.values(state.lists).filter((l) => !l.done);
  const due = (state, now = Date.now()) => active(state).filter((l) => l.kind === "permanent" ? l.due <= now : true);
  function touchStreak(state, now) {
    const today = startOfDay(now), s = state.streak;
    if (s.last === today) return;
    s.days = s.last === today - DAY ? s.days + 1 : 1;
    s.last = today;
  }

  // ---------- checking a typed answer kindly (small typos, the key alone, most of the important words) ----------
  const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9а-яёўқғҳ ]/g, " ").replace(/\s+/g, " ").trim();
  function lev(a, b) {
    const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  const STOP = new Set(["and", "the", "for", "with", "from", "when", "each", "into", "other", "than", "after", "within", "without"]);
  // what's in brackets is extra detail: the answer without it is enough
  const core = (s) => String(s || "").replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  // little words in front don't count: "to OCI" is "OCI"
  const bare = (s) => s.replace(/^(?:(?:a|an|the|to|in|at|by|of|it|its|is|are|be|they)\s+)+/, "");
  const close = (t, c) => { const n = norm(c); return t === n || bare(t) === bare(n) || lev(t, n) <= Math.max(1, Math.floor(n.length * 0.2)); };
  // most of the important words of c are in what was typed
  function covers(t, c) {
    const n = norm(c), words = n.split(" ").filter((w) => w.length > 3 && !STOP.has(w)), typedWords = t.split(" ");
    const has = (w) => typedWords.some((x) => lev(x, w) <= (w.length > 6 ? 2 : 1));
    // a one-word answer ("intimidation", "self interest") is right when it's there: "an intimidation threat"
    if (words.length === 1 && n.split(" ").length <= 2) return has(words[0]);
    if (words.length < 2) return false;
    return words.filter(has).length / words.length >= 0.6;
  }
  // a typed answer is right if it is the answer, the answer without its brackets, or one of the shorter answers that are enough
  // (item.alt: "a going concern" for "a going concern that will continue for the foreseeable future")
  function matches(typed, item) {
    const t = norm(typed);
    if (!t) return false;
    const alt = item.alt || [];
    if ([item.text, core(item.text), ...alt, item.key, item.key ? `${item.key} ${item.text}` : null].some((c) => c && close(t, c))) return true;
    return [core(item.text) || item.text, ...alt].some((c) => covers(t, c));
  }
  // three choices for children: the right one and two others from the same list
  function choices(item, pool, rnd = Math.random) {
    const others = pool.filter((x) => x.text !== item.text).sort(() => rnd() - 0.5).slice(0, 2);
    return [item, ...others].sort(() => rnd() - 0.5);
  }
  const answerText = (item) => (item.key ? `${item.key} — ${item.text}` : item.text);
  // the picture to imagine: the item doing something at the place
  const TWISTS = ["crashing right into it", "dancing on top of it", "so big it fills the whole place", "bursting out of it", "glued to it",
                  "spinning round and round it", "hiding inside it and peeking out", "singing loudly next to it"];
  const scene = (item, locus, i) => `At the ${locus.name.toLowerCase()}: ${item.image || item.text.toLowerCase()}, ${TWISTS[i % TWISTS.length]}.`;

  // ---------- number pictures (the peg system): a fixed picture per digit, two digits make a pair ----------
  const PEGS = [["🍩", "doughnut"], ["🕯️", "candle"], ["🦢", "swan"], ["🔱", "trident"], ["⛵", "sailboat"],
                ["✋", "hand"], ["🎲", "die"], ["🌈", "rainbow"], ["🐙", "octopus"], ["🎈", "balloon"]];
  // the picture for a number up to 99: one picture, or the first standing on (or holding) the second
  function numberPicture(n) {
    n = Number(n);
    if (!Number.isInteger(n) || n < 0 || n > 99) return null;
    if (n < 10) return { emoji: PEGS[n][0], words: `a ${PEGS[n][1]}` };
    const [a, b] = [PEGS[Math.floor(n / 10)], PEGS[n % 10]];
    return { emoji: a[0] + b[0], words: `a ${a[1]} on a ${b[1]}` };
  }
  const numberIn = (item) => { const m = String(item.key || "").match(/(\d{1,2})\s*$/); return m ? Number(m[1]) : null; };
  return { PEGS, numberPicture, numberIn, DAY, KEY, PASS, INTERVALS, fresh, load, save, startOfDay, nextDay, status, learn, store, record, recordScore, advance, studyEntry, syncStudy, STUDY_KEY, STUDY_DAYS, release, active, due, norm, lev, matches,
           choices, answerText, scene };
})();
window.PalaceCore = PalaceCore;
