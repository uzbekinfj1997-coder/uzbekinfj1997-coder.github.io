/* Coins (18.11.2026; in every app since 19.11.2026): what a player earns for learning (Study Quest's rounds and the duels), the
   tier, the achievements (medals and cups, paid once each), and the balance in the corner of every page.
   Where the coins are kept:
   - a room on the server (server/duel_room.py) when the player is in one: a family app's club (its duel page), or, in Sora personal,
     the room that keeps the PC and the phone on one balance (linked on My account). Coins earned before that wait on this device
     (sora.coins.waiting.v1) and go when there's a room; they count in the balance meanwhile.
   - this device, in an app with no server (Sora public): a ledger of its own (sora.coins.local.v1), kept by the server's rules (each
     entry once, 300 a day but for achievements, by source and by week).
   What a task can still give (its "pot") is worked out here, from a book and its progress, so that Study Quest, the app's Home and
   My account show the same numbers: a stage's answers by kind and the clock (double when it's due, a quarter when it's passed and
   not due) and the one-time extras still to win. Tiers go by everything ever earned, so spending on a reward doesn't lower one. */
"use strict";
const SoraCoins = (() => {
  const URL = window.SORA_CLUB_URL, ACCOUNT = window.SORA_ACCOUNT_PAGE || "";
  const ME_KEY = "sora.duel.me.v1", ROOM_KEY = "sora.duel.room.v1", WAIT_KEY = "sora.coins.waiting.v1", LOCAL_KEY = "sora.coins.local.v1",
    STUDY_KEY = "sora.coins.study.v1";
  const DAY_CAP = 300, KEEP = 150, SOURCES = ["study", "review", "duel", "ach"];
  const TIERS = [[0, "Starter"], [300, "Bronze"], [1000, "Silver"], [2500, "Gold"], [5000, "Platinum"], [10000, "Diamond"], [20000, "Legend"]];
  const ICON = { Starter: "🌱", Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💠", Diamond: "💎", Legend: "👑" };
  const T = (s, v) => (window.tr ? window.tr(s, v) : String(s).replace(/\{(\w+)\}/g, (_, k) => v?.[k] ?? ""));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full */ } };
  const me = () => read(ME_KEY, null);
  const waiting = () => read(WAIT_KEY, []);
  const fmt = (n) => Math.round(n).toLocaleString(window.SoraLang?.lang === "ru" ? "ru-RU" : "en-GB");

  // ---------- days and weeks, by Tashkent's time (UTC+5), as the server counts them ----------
  const TZ = 5 * 3600e3;
  const dayKey = (ms) => new Date(ms + TZ).toISOString().slice(0, 10);
  function weekKey(ms) {
    const d = new Date(ms + TZ), day = (d.getUTCDay() + 6) % 7;
    const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3), y = new Date(thursday).getUTCFullYear();
    return `${y}w${String(1 + Math.floor((thursday - Date.UTC(y, 0, 1)) / 6048e5)).padStart(2, "0")}`;
  }

  // ---------- this device's ledger, for an app with no server ----------
  const fresh = () => ({ coins: [], totals: { earned: 0, spent: 0 }, weeks: {}, ach: [] });
  const ledger = () => ({ ...fresh(), ...read(LOCAL_KEY, {}) });
  function creditHere(L, e) {
    if (!(e.n > 0) || L.coins.some((x) => x.id === e.id)) return 0;
    const at = Math.min(Date.now(), e.at || Date.now()), k = SOURCES.includes(e.k) ? e.k : "study";
    let n = e.n;
    if (k !== "ach") {
      const day = dayKey(at), today = L.coins.filter((x) => x.k !== "ach" && dayKey(x.at) === day).reduce((s, x) => s + x.n, 0);
      n = Math.min(n, Math.max(0, DAY_CAP - today));
      if (n <= 0) return 0;
    }
    L.coins = [...L.coins, { id: e.id, n, why: e.why, k, at }].slice(-KEEP);
    L.totals.earned += n; L.totals[k] = (L.totals[k] || 0) + n;
    const wk = weekKey(at);
    L.weeks[wk] = (L.weeks[wk] || 0) + n;
    for (const old of Object.keys(L.weeks).sort().slice(0, -12)) delete L.weeks[old];
    return n;
  }

  // ---------- the server's room: coins sent when there is one ----------
  let sending = false;
  function takeState(j) {
    if (!j?.ok || !j.members) return;
    const { ok, me: _m, same, ...st } = j;
    keep(ROOM_KEY, st);
  }
  async function post(body) {
    const r = await fetch(`${URL}?duel=1`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ ...body, app: window.SoraApp?.id || (window.SORA_STATIC ? undefined : "personal") }) });
    const j = await r.json().catch(() => ({}));
    return { r, j };
  }
  // coins from this phone go to the room, twenty at a time; achievements go by their ids, the server paying its own amounts
  async function flush() {
    const who = me();
    if (!URL || !who || sending) return false;
    sending = true;
    try {
      // a bounded loop: should the phone's storage refuse to drop what was sent, it stops (the server counts each entry once anyway)
      // the coins go before the achievements, so that one the server checks (coins collected) finds them there
      for (let round = 0; round < 50 && waiting().length; round++) {
        const ach = !waiting().some((e) => e.k !== "ach");
        const batch = waiting().filter((e) => (e.k === "ach") === ach).slice(0, ach ? 40 : 20);
        const { r, j } = await post(ach ? { op: "ach", room: who.room, me: who.id, ids: batch.map((e) => e.id.replace(/^ach:/, "")) }
          : { op: "earn", room: who.room, me: who.id, entries: batch.map(({ id, n, why, k, at }) => ({ id, n, why, k, at })) });
        // try again later: offline, the server busy, or a server from before (an unknown request); other refusals are final
        if (!r.ok && (r.status !== 400 || j.error === "unknown request")) return false;
        takeState(j);
        const sent = new Set(batch.map((e) => e.id));
        keep(WAIT_KEY, waiting().filter((e) => !sent.has(e.id)));
      }
      return true;
    } catch { return false; } finally { sending = false; changed(); }
  }
  // the room read again (the duel page reads it every few seconds itself): coins won elsewhere show here too
  async function refresh() {
    const who = me();
    if (!URL || !who || document.hidden || window.SurahDuel) return;
    try {
      const st = read(ROOM_KEY, null), r = await fetch(`${URL}?duel=1&room=${encodeURIComponent(who.room)}&v=${st?.v ?? ""}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok && !j.same) { takeState(j); changed(); }
    } catch { /* offline: next time */ }
  }

  // ---------- earning ----------
  function earn(entries) {
    const at = Date.now(), fresh = entries.filter((e) => e.n > 0).map((e) => ({ ...e, at: e.at || at }));
    if (!fresh.length) return;
    if (!URL) {                 // no server: straight into this device's ledger
      const L = ledger();
      for (const e of fresh) creditHere(L, e);
      keep(LOCAL_KEY, L);
      changed();
      return;
    }
    const have = new Set(waiting().map((e) => e.id));
    keep(WAIT_KEY, [...waiting(), ...fresh.filter((e) => !have.has(e.id))]);
    changed();
    flush();
  }

  // ---------- the player's coins, wherever they're kept ----------
  function state() {
    if (!URL) {
      const L = ledger(), wk = weekKey(Date.now());
      return { local: true, inClub: false, earned: L.totals.earned, confirmed: L.totals.earned, spent: 0, balance: L.totals.earned, waiting: 0, totals: L.totals,
        coins: L.coins, week: L.weeks[wk] || 0, weekKey: wk, ach: L.ach, wins: 0, perfect: 0, room: null };
    }
    const who = me(), r = read(ROOM_KEY, null), w = waiting(), extra = w.reduce((s, e) => s + e.n, 0);
    const t = (who && r?.totals?.[who.id]) || { earned: 0, spent: 0 }, wk = weekKey(Date.now());
    const totals = { ...t };
    for (const e of w) totals[e.k || "study"] = (totals[e.k || "study"] || 0) + e.n;
    return { local: false, inClub: !!who, earned: t.earned + extra, confirmed: t.earned, spent: t.spent, balance: t.earned - t.spent + extra, waiting: extra, totals,
      coins: [...((who && r?.coins?.filter((e) => e.m === who.id)) || []), ...w], week: ((who && r?.weeks?.[wk]?.[who.id]) || 0) + extra, weekKey: wk,
      ach: [...((who && r?.ach?.[who.id]) || []), ...w.filter((e) => e.k === "ach").map((e) => e.id.replace(/^ach:/, ""))],
      wins: (who && r?.wins?.[who.id]) || 0, perfect: (who && r?.perfect?.[who.id]) || 0, room: who ? r : null };
  }
  const balance = () => { const s = state(); return { earned: s.earned, spent: s.spent, balance: s.balance, waiting: s.waiting, inClub: s.inClub }; };
  function tierOf(earned) {
    let k = 0;
    while (k + 1 < TIERS.length && earned >= TIERS[k + 1][0]) k++;
    return { name: TIERS[k][1], icon: ICON[TIERS[k][1]], from: TIERS[k][0], next: TIERS[k + 1] || null };
  }

  // ---------- what a task can still give: its pot ----------
  const kindOf = (it) => it.t || "sentence";
  const passed = (p) => (p?.best || 0) >= 0.8;
  const weight = (kind, typed) => ({ tf: 0.5, case: 1.5, sort: 1.5, order: 1.5 }[kind] ?? (typed ? 2 : 1));
  const clockFactor = (t) => (Number(t) === 0 ? 0.75 : t <= 10 ? 1.25 : t >= 45 ? 0.9 : 1);           // Study Quest's clock
  const duelFactor = (t) => (Number(t) === 0 ? 0.75 : t <= 10 ? 1.25 : t >= 30 ? 0.9 : 1);           // a duel's (the server's)
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  // how Study Quest is played on this device: picking or typing, the clock
  function playing() {
    const s = { answer: window.SORA_STATIC ? "choice" : "recall", time: 30, ...read("sora.settings.study-quest", {}) };
    return { typed: s.answer === "recall", factor: clockFactor(Number(s.time)), now: Date.now(), today: startOfDay(Date.now()) };
  }
  // a review: due, and not played yet today (a review missed and played again counts as an ordinary round)
  const isDue = (p, o) => p?.due != null && p.due <= o.now && !(p.last >= o.today);
  function stagePot(l, p, o = playing()) {
    const due = isDue(p, o), done = passed(p), mult = due ? 2 : done ? 0.25 : 1;
    const answers = Math.round(l.items.reduce((s, it) => s + weight(kindOf(it), o.typed), 0) * o.factor * mult);
    const extras = [...(due ? [["ontime", 5]] : []), ...(done ? [] : [["pass", 10]]), ...((p?.stars || 0) < 3 ? [["stars", 10]] : [])];
    return { answers, extras, total: answers + extras.reduce((s, [, n]) => s + n, 0), due, passed: done, mult,
      once: Math.round(l.items.reduce((s, it) => s + weight(kindOf(it), o.typed), 0) * o.factor) + 20 };
  }
  function bossPot(b, c, prog, o = playing()) {
    const pool = c.lists.flatMap((l) => l.items), p = prog.lists?.[`${b.id}:boss:${c.n}`];
    if (c.lists.length < 2 || !pool.length) return null;
    const due = isDue(p, o), done = passed(p), mult = due ? 2 : done ? 0.25 : 1, n = Math.min(15, pool.length);
    const avg = pool.reduce((s, it) => s + weight(kindOf(it), o.typed), 0) / pool.length;
    const answers = Math.round(avg * n * o.factor * mult), extras = [...(due ? [["ontime", 5]] : []), ...(done ? [] : [["boss", 30]])];
    return { answers, extras, total: answers + extras.reduce((s, [, k]) => s + k, 0), due, passed: done, mult, once: Math.round(avg * n * o.factor) + 30 };
  }
  // a chapter's (or section's) pot: its stages, its final round, and 50 for finishing it
  function chapterPot(b, c, prog, o = playing()) {
    const stages = c.lists.map((l) => stagePot(l, prog.lists?.[l.id], o)), boss = bossPot(b, c, prog, o);
    const done = c.lists.length > 0 && c.lists.every((l) => passed(prog.lists?.[l.id]));
    const total = stages.reduce((s, x) => s + x.total, 0) + (boss?.total || 0) + (done || !c.lists.length ? 0 : 50);
    const today = stages.filter((x) => x.due).reduce((s, x) => s + x.total, 0) + (boss?.due ? boss.total : 0);
    const once = stages.reduce((s, x) => s + x.once, 0) + (boss?.once || 0) + (c.lists.length ? 50 : 0);
    const got = c.lists.reduce((s, l, k) => { const p = prog.lists?.[l.id]; return s + (passed(p) ? stages[k].once - 10 : 0) + ((p?.stars || 0) >= 3 ? 10 : 0); }, 0)
      + (boss && passed(prog.lists?.[`${b.id}:boss:${c.n}`]) ? boss.once : 0) + (done ? 50 : 0);
    return { total, today, once, got, done, stages, boss };
  }
  // a book's (a subject's): what's still to win, what's due today, how much of its one-time coins are collected, and the numbers
  // My account and the achievements count
  function bookSummary(b, prog, o = playing()) {
    prog = prog || { lists: {} };
    const parts = b.chapters.filter((c) => c.lists.length), pots = parts.map((c) => chapterPot(b, c, prog, o));
    const lists = parts.flatMap((c) => c.lists), bosses = parts.filter((c) => c.lists.length > 1);
    const finished = lists.length > 0 && lists.every((l) => passed(prog.lists?.[l.id])) && bosses.every((c) => passed(prog.lists?.[`${b.id}:boss:${c.n}`]));
    const once = pots.reduce((s, x) => s + x.once, 0) + 250, got = pots.reduce((s, x) => s + x.got, 0) + (finished ? 250 : 0);
    return { id: b.id, total: pots.reduce((s, x) => s + x.total, 0) + (finished ? 0 : 250), today: pots.reduce((s, x) => s + x.today, 0),
      once, got, stages: lists.length, passed: lists.filter((l) => passed(prog.lists?.[l.id])).length,
      stars3: lists.filter((l) => (prog.lists?.[l.id]?.stars || 0) >= 3).length, parts: parts.length, partsDone: pots.filter((x) => x.done).length,
      due: lists.filter((l) => isDue(prog.lists?.[l.id], o)).length, finished, rounds: Object.values(prog.lists || {}).reduce((s, p) => s + (p.plays || 0), 0),
      reviewsOnTime: prog.reviewsOnTime || 0, bestReviewRun: prog.bestReviewRun || 0, days: prog.streak?.days || 0 };
  }
  // a book's progress as Study Quest keeps it on this device: under its own key, or (a website's subject played before the subjects
  // were games of their own) its part of the shared one, as Study Quest reads it
  function progressOf(b, key = `sora.studyQuest.${b.id}.v1`) {
    const own = read(key, null);
    if (own?.lists || key === "sora.studyQuest.v1") return own || { lists: {} };
    const old = read("sora.studyQuest.v1", null), ids = new Set(b.chapters.flatMap((c) => c.lists.map((l) => l.id)));
    return { ...(old || {}), lists: Object.fromEntries(Object.entries(old?.lists || {}).filter(([id]) => ids.has(id) || id.startsWith(`${b.id}:`))) };
  }
  // the latest of each book's numbers, kept for Home and My account (Study Quest writes them as it goes)
  // (written only when they change: opening a page leaves what's saved as it was)
  const noteBook = (id, summary) => { const all = read(STUDY_KEY, {}); if (JSON.stringify(all[id]) !== JSON.stringify(summary)) { all[id] = summary; keep(STUDY_KEY, all); } };
  const studies = () => read(STUDY_KEY, {});
  // a duel's coins, played in full: its answers (typed 2, picked 1) by the clock, 5 for a perfect duel; and 10 for winning
  const duelPot = (cfg) => Math.round((cfg.n || 7) * (cfg.mode === "typing" ? 2 : 1) * duelFactor(cfg.time ?? 15)) + 5;

  // ---------- achievements: medals at three levels, and cups ----------
  const MEDALS = [
    { id: "stages", icon: "🧭", name: "Explorer", what: "stages passed", levels: [10, 25, 50] },
    { id: "stars", icon: "⭐", name: "Perfectionist", what: "stages with three stars", levels: [5, 20, 50] },
    { id: "chapters", icon: "📘", name: "Finisher", what: "chapters and sections finished", levels: [1, 5, 15] },
    { id: "reviews", icon: "🔁", name: "Reviewer", what: "reviews passed on their day", levels: [10, 50, 150] },
    { id: "streak", icon: "🔥", name: "On a roll", what: "days of reviews in a row", levels: [7, 30, 100] },
    { id: "duelwins", icon: "⚔️", name: "Duellist", what: "duels won, in all", levels: [1, 10, 50], club: true },
    { id: "perfect", icon: "🎯", name: "Sharpshooter", what: "perfect duels", levels: [1, 5, 20], club: true },
    { id: "coins", icon: "🪙", name: "Collector", what: "coins collected", levels: [1000, 5000, 20000] },
  ];
  const LEVELS = [["Bronze", "🥉", 20], ["Silver", "🥈", 50], ["Gold", "🥇", 100]];
  const CUP_BOOK = 250, CUP_WEEK = 100;
  const bookNames = () => window.SORA_BOOK_NAMES || {};
  // every achievement with where the player is: medals (level 0 to 3, the next step), cups (a subject finished, a week won)
  function achievements() {
    const s = state(), all = Object.values(studies()), club = !s.local && s.inClub && (s.room?.members?.length || 0) > 1;
    const sum = (k) => all.reduce((t, x) => t + (x[k] || 0), 0);
    const value = { stages: sum("passed"), stars: sum("stars3"), chapters: sum("partsDone"), reviews: sum("reviewsOnTime"),
      streak: Math.max(0, ...all.map((x) => x.bestReviewRun || 0)), duelwins: s.wins, perfect: s.perfect,
      coins: s.confirmed };       // the coins the server has (as it checks this one): not those still waiting on the phone, which its cap may trim
    const medals = MEDALS.filter((m) => !m.club || club || s.wins || s.perfect).map((m) => {
      const v = value[m.id], level = m.levels.filter((x) => v >= x).length;
      return { ...m, kind: "medal", value: v, level, next: m.levels[level] ?? null, ids: m.levels.map((_, k) => `${m.id}-${k + 1}`) };
    });
    const cups = all.filter((x) => /^[a-z0-9]{1,20}$/.test(x.id))       // a subject (not a list file imported in Memory Palace)
      .map((x) => ({ kind: "cup", id: `cup-${x.id}`, icon: "🏆", book: x.id, name: bookNames()[x.id] || x.id, won: !!x.finished, passed: x.passed, stages: x.stages }));
    const weeks = [];
    if (club) {
      const r = s.room, who = me();
      for (const [wk, got] of Object.entries(r.weeks || {})) {
        const earners = Object.entries(got).filter(([, n]) => n > 0);
        if (wk >= weekKey(Date.now()) || earners.length < 2) continue;
        const top = Math.max(...earners.map(([, n]) => n));
        if (got[who.id] === top) weeks.push({ kind: "week", id: `cup-week-${wk}`, icon: "🏆", week: wk });
      }
    }
    return { medals, cups, weeks, claimed: new Set(s.ach) };
  }
  const coinsOf = (aid) => (aid.startsWith("cup-week-") ? CUP_WEEK : aid.startsWith("cup-") ? CUP_BOOK : LEVELS[Number(aid.slice(-1)) - 1]?.[2] || 0);
  function achName(aid) {
    if (aid.startsWith("cup-week-")) return T("Cup: week {week} won", { week: aid.slice(-2).replace(/^0/, "") });
    if (aid.startsWith("cup-")) return T("Cup: {subject} finished", { subject: T(bookNames()[aid.slice(4)] || aid.slice(4)) });
    const m = MEDALS.find((x) => aid.startsWith(`${x.id}-`)), lv = LEVELS[Number(aid.slice(-1)) - 1];
    return m && lv ? T("{level} medal: {name}", { level: T(lv[0]), name: T(m.name) }) : aid;
  }
  // what's been reached and not yet paid: paid now (by the server, or here), and returned for a "New medal!"
  function checkAchievements() {
    const a = achievements(), out = [];
    for (const m of a.medals) for (let k = 0; k < m.level; k++) if (!a.claimed.has(m.ids[k])) out.push({ id: m.ids[k], icon: LEVELS[k][1], n: LEVELS[k][2], name: achName(m.ids[k]) });
    for (const c of a.cups) if (c.won && !a.claimed.has(c.id)) out.push({ id: c.id, icon: "🏆", n: CUP_BOOK, name: achName(c.id) });
    for (const w of a.weeks) if (!a.claimed.has(w.id)) out.push({ id: w.id, icon: "🏆", n: CUP_WEEK, name: achName(w.id) });
    if (!out.length) return [];
    if (!URL) {
      const L = ledger();
      for (const x of out) { creditHere(L, { id: `ach:${x.id}`, n: x.n, why: `ach:${x.id}`, k: "ach" }); L.ach = [...L.ach, x.id]; }
      keep(LOCAL_KEY, L);
      changed();
    } else earn(out.map((x) => ({ id: `ach:${x.id}`, n: x.n, why: `ach:${x.id}`, k: "ach" })));
    return out;
  }
  // a medal or a cup just won: shown big for a moment
  function celebrate(list) {
    if (!list?.length) return;
    const box = document.createElement("div");
    box.className = "coin-ach";
    box.setAttribute("role", "status");
    box.innerHTML = list.slice(0, 5).map((x) => `<div class="coin-ach-row"><span class="coin-ach-ico">${x.icon}</span><span><small></small><b></b></span><em>+${fmt(x.n)} 🪙</em></div>`).join("");
    list.slice(0, 5).forEach((x, k) => {
      const row = box.children[k];
      row.querySelector("small").textContent = x.id.startsWith("cup-") ? T("New cup!") : T("New medal!");
      row.querySelector("b").textContent = x.name;
    });
    (document.fullscreenElement || document.body).append(box);
    setTimeout(() => box.classList.add("out"), 4200);
    setTimeout(() => box.remove(), 4800);
  }

  // ---------- the counter: the balance in the corner of every page, counting up as coins come in ----------
  let shown = null, pill = null, raf = 0;
  function mount() {
    if (pill || !document.body) return;
    pill = document.createElement("a");
    pill.id = "soraCoins"; pill.className = "coin-pill";
    if (ACCOUNT) pill.href = ACCOUNT;
    pill.title = T("Your coins: open My account");
    pill.innerHTML = '<span class="coin-ico" aria-hidden="true">🪙</span><b class="coin-n"></b>';
    const home = () => document.getElementById("coinSlot") || document.body;      // the top bar's place for it (redesign 23.11.2026)
    home().append(pill);
    // in full screen it goes along, where it floats (the pages where coins are earned); a game's or a walk's full screen is its own
    if (document.body.hasAttribute("data-coins-float")) for (const ev of ["fullscreenchange", "webkitfullscreenchange"]) document.addEventListener(ev, () => { pill.classList.toggle("in-full", !!document.fullscreenElement); (document.fullscreenElement || home()).append(pill); });
    paint(false);
  }
  function paint(animate = true) {
    if (!pill) return;
    const n = state().balance, out = pill.querySelector(".coin-n");
    pill.setAttribute("aria-label", T("Your coins: {n}", { n: fmt(n) }));
    if (shown === null || !animate || n === shown) { shown = n; out.textContent = fmt(n); return; }
    const from = shown, diff = n - from, start = performance.now(), quiet = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    shown = n;
    const plus = document.createElement("span");
    plus.className = `coin-plus ${diff < 0 ? "minus" : ""}`.trim();
    plus.textContent = `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`;
    pill.append(plus);
    setTimeout(() => plus.remove(), 1600);
    pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump");
    cancelAnimationFrame(raf);
    if (quiet) { out.textContent = fmt(n); return; }
    const step = (t) => {
      const f = Math.min(1, (t - start) / 900);
      out.textContent = fmt(from + diff * (1 - (1 - f) ** 3));
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  const listeners = [];
  function changed() { paint(); for (const f of listeners) try { f(); } catch { /* a page's own trouble */ } }
  const onChange = (f) => listeners.push(f);

  // ---------- Sora personal: the PC and the phone on one balance, through a room of their own ----------
  async function link(code, name) {
    const { r, j } = await post(code ? { op: "join", room: code, as: "a" } : { op: "create", name: name || "Me" });
    if (!r.ok || !j.ok) throw new Error(j.error || T("the server answered {n}", { n: r.status }));
    keep(ME_KEY, { room: code || j.room, id: j.me, name: name || j.members?.[0]?.name || "Me" });
    takeState(j);
    await flush();
    changed();
    return code || j.room;
  }
  const unlink = () => { keep(ME_KEY, null); keep(ROOM_KEY, null); changed(); };

  window.addEventListener("online", flush);
  window.addEventListener("storage", () => paint());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { flush(); refresh(); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  setInterval(refresh, 30000);
  setTimeout(() => { flush(); refresh(); }, 1500);
  return { earn, flush, refresh, balance, state, tierOf, TIERS, ICON, weight, clockFactor, duelFactor, playing, stagePot, bossPot, chapterPot,
    bookSummary, noteBook, studies, progressOf, duelPot, MEDALS, LEVELS, achievements, checkAchievements, celebrate, achName, coinsOf, changed, onChange,
    fmt, link, unlink, me, weekKey, dayKey, linked: () => !!(URL && me()), server: !!URL };
})();
window.SoraCoins = SoraCoins;
