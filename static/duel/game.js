/* Surah Duel: two people challenge each other on the surahs of the Quran, and see each other's duels and results as they come in.
   - A duel is the same 7 questions for both: whoever challenges picks the range (Juz 'Amma, the first 30 or all 114) and plays first.
     Points for each right answer and for speed; once a duel, "Double or nothing" on a question you're sure of (×2 if right, −100 if
     not). Up to two "revenge" questions bring back surahs either of you missed lately, worth double.
   - The two of you share a room on the server where the user's bot runs (server/duel_room.py in Sora's repository). Nobody has to be
     online at the same time (the user, 18.11.2026): a challenge is sent once the challenger has played their part, with their score, and
     waits for the other, who sees it, and the score to beat, whenever they open the app. The page reads the room when it opens and
     every few seconds while it's open, so it's always up to date. What can't be sent yet waits on the phone and goes when it can.
   - A phone joins the room once, with the invite link (…/surah-duel/#join=CODE). Opening that link again takes one's place back.
   The surahs, their Arabic and meanings come from Surah Numbers (study/surahs.js). */
"use strict";
(() => {
  const SERVER = window.SORA_DUEL_URL, POLL = window.SORA_DUEL_POLL_MS || 3000;
  const ME_KEY = "sora.duel.me.v1", ROOM_KEY = "sora.duel.room.v1", OUT_KEY = "sora.duel.outbox.v1", SEEN_KEY = "sora.duel.seen.v1";
  const root = $("sd"), main = $("sdMain"), liveEl = $("sdLive");
  const book = (window.StudyBooks || []).find((b) => b.id === "surahs");
  const SURAHS = book.chapters[0].lists.flatMap((l) => l.items).map((it) => {
    const [ar, meaning] = String(it.why || "").split(" · ");
    return { n: Number(it.text), name: it.key, ar, meaning };
  });
  const S = (n) => SURAHS[n - 1];
  const RANGES = { amma: [78, 114, "Juz 'Amma", "surahs 78–114"], first30: [1, 30, "The first 30", "surahs 1–30"], all: [1, 114, "All 114", "the whole Quran"] };
  const QUESTIONS = 7, GOAL = 100, TIME = 15, TIME_ORDER = 25;
  const settings = setupSettings(root, "surah-duel", [
    { key: "sound", label: "Sounds", type: "toggle", default: true, help: "A chime when a challenge or a result comes in, and a sound for right and wrong answers" },
  ]);

  // ---------- what this phone keeps ----------
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full */ } };
  let me = read(ME_KEY, null);            // { room, id, name }: this phone's place in the room
  let room = read(ROOM_KEY, null);        // the room as last read: { v, members, duels }
  let outbox = read(OUT_KEY, []);         // writes not yet through
  // the other's duels and results already announced; null on a phone that has never looked at this room (it starts quietly)
  let seen = read(SEEN_KEY, null) && new Set(read(SEEN_KEY, []));
  let screen = "home", current = null, polling = false;

  // the partner, or, before they've joined, the place kept for them: you can play your part straight away (the user, 18.11.2026)
  const partner = () => room?.members.find((m) => m.id !== me?.id) || (room && me ? { id: me.id === "a" ? "b" : "a", name: "your partner", waiting: true } : null);
  const nameOf = (id) => (id === me?.id ? "You" : room?.members.find((m) => m.id === id)?.name || "?");
  const view = (...kids) => main.replaceChildren(...kids);
  const btn = (label, onclick, primary = false, cls = "") => el("button", { type: "button", class: `${primary ? "primary" : ""} ${cls}`.trim(), onclick }, label);
  const box = (cls, label, title, ...rest) => el("section", { class: `sd-box ${cls}` }, el("small", {}, label), title ? el("b", {}, title) : "", ...rest);
  const when = (t) => {
    const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0);
    const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (d >= today) return `today ${hm}`;
    if (d >= today - 864e5) return `yesterday ${hm}`;
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${hm}`;
  };

  // ---------- sound ----------
  let audio = null;
  function sound(kind) {
    if (!settings.values.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { right: [660, 880], wrong: [220, 165], chime: [523, 659, 784] }[kind];
      notes.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.11;
        o.frequency.value = f; o.type = kind === "wrong" ? "square" : "sine";
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch { /* no sound here */ }
  }
  function toast(text) {
    const t = el("div", { class: "sd-toast", role: "status" }, text);
    document.body.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  // ---------- the room on the server ----------
  async function call(params, body) {
    const q = new URLSearchParams({ duel: "1", ...params });
    const r = await fetch(`${SERVER}?${q}`, body ? { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain" } } : { cache: "no-store" });
    let j = {};
    try { j = await r.json(); } catch { /* not JSON */ }
    if (!r.ok || !j.ok) { const e = new Error(j.error || `the server answered ${r.status}`); e.status = r.status; throw e; }
    return j;
  }
  function take(st) {
    if (!st || st.same || !st.members) return false;
    room = { v: st.v, members: st.members, duels: st.duels };
    keep(ROOM_KEY, room);
    return true;
  }
  function live(ok, why = "") {
    liveEl.className = `sd-live ${ok ? "on" : "off"}`;
    liveEl.textContent = !me ? "" : ok ? "Up to date" : `Offline (${why || "no connection"}): what you do is kept here and sent when it can`;
  }
  // a write: tried now, and kept on the phone until it's through
  async function send(body) {
    outbox.push(body); keep(OUT_KEY, outbox);
    await flush();
  }
  async function flush() {
    while (outbox.length) {
      try { take(await call({}, outbox[0])); live(true); } catch (e) {
        if (!e.status || e.status >= 500 || e.status === 429) { live(false, e.message); return false; }
        // turned down for good (a duel already there, say): it isn't sent again
      }
      outbox.shift(); keep(OUT_KEY, outbox);
    }
    return true;
  }
  async function poll(force = false) {
    if (!me || polling || (document.hidden && !force)) return;
    polling = true;
    try {
      if (!(await flush())) return;
      const st = await call({ room: me.room, v: force ? "" : room?.v ?? "" });
      live(true);
      if (take(st)) { announce(); refresh(); }
    } catch (e) {
      live(false, e.message);
      if (e.status === 404) { me = null; keep(ME_KEY, null); toast("This duel room isn't on the server any more."); home(); }
    } finally { polling = false; }
  }
  // the other's new challenges and results: a chime and a line at the top, once each
  function announce() {
    const p = partner();
    if (!p || p.waiting) return;
    const fresh = [];
    if (!seen?.has(`joined:${p.id}`)) fresh.push([`joined:${p.id}`, room.duels.some((d) => d.by === me.id) ? `${p.name} joined: your duels are waiting for them` : `${p.name} joined`]);
    for (const d of room.duels) {
      if (d.by === p.id && d.results[p.id] && !seen.has(d.id)) fresh.push([d.id, `${p.name} challenged you: ${RANGES[d.range][2]}, ${d.results[p.id].points} points to beat`]);
      if (d.results[p.id] && d.by === me.id && !seen.has(`${d.id}:${p.id}`)) {
        const mine = d.results[me.id]?.points, theirs = d.results[p.id].points;
        fresh.push([`${d.id}:${p.id}`, mine === undefined ? `${p.name} played your duel` : `${p.name} played your duel: you ${mine}, ${p.name} ${theirs}`]);
      }
    }
    if (!fresh.length) return;
    const quiet = !seen;      // a phone that takes its place back: no fanfare for what was there before
    seen = seen || new Set();
    for (const [k] of fresh) seen.add(k);
    keep(SEEN_KEY, [...seen]);
    if (!quiet) { sound("chime"); toast(fresh[fresh.length - 1][1]); }
  }
  // the screens that show the room are drawn again when it changes; a question being played is left alone
  function refresh() {
    if (screen === "home") home();
    else if (screen === "result" && current) result(current);
  }

  // ---------- joining: a new room, or the invite link ----------
  function nameForm(label, go, value = "") {
    const input = el("input", { type: "text", maxlength: 24, value, placeholder: "Your name", "aria-label": "Your name", autocomplete: "nickname" });
    const msg = el("p", { class: "hint" });
    const submit = async (e) => {
      e?.preventDefault();
      const name = input.value.trim();
      if (!name) { msg.textContent = "Type your name first."; return; }
      msg.textContent = "Connecting…";
      try { await go(name); } catch (err) { msg.textContent = `Couldn't reach the duel room: ${err.message}. Check the internet connection and try again.`; }
    };
    return el("form", { class: "sd-form", onsubmit: submit }, input, el("div", { class: "row" }, el("button", { type: "submit", class: "primary" }, label)), msg);
  }
  function welcome() {
    screen = "welcome";
    view(el("div", { class: "sd-grid" },
      box("sd-turn sd-wide", "Surah Duel", "Challenge each other on the surahs",
        el("p", {}, "Each duel is the same 7 questions for both of you: which number a surah is, which comes next, which comes first, putting them in order, and surahs by their Arabic or meaning. You see each other's results as they come in, so you can learn together."),
        el("p", { class: "hint" }, "Start a room here, then send the invite link to the one you want to duel with. You only do this once."),
        nameForm("Start a duel room", async (name) => {
          const st = await call({}, { op: "create", name });
          me = { room: st.room, id: st.me, name }; keep(ME_KEY, me); seen = new Set(); keep(SEEN_KEY, []); take(st); live(true); home();
        }))));
  }
  async function joinScreen(code) {
    screen = "join";
    view(el("p", { class: "hint" }, "Opening the duel room…"));
    let st;
    try { st = await call({ room: code }); } catch (e) {
      return view(box("sd-wait", "Surah Duel", "This invite link doesn't open a room", el("p", {}, e.status === 404 ? "The room isn't on the server. Ask for a new link." : `Couldn't reach it: ${e.message}.`),
        el("div", { class: "row" }, btn("Back", () => { history.replaceState(null, "", location.pathname); home(); }))));
    }
    // a new place starts with every later challenge announced; a place taken back starts quietly
    const done = (r, name, back = false) => {
      me = { room: code, id: r.me, name }; keep(ME_KEY, me);
      // the one joining knows who's there already: only what the other does from now on (and the duels waiting) is announced
      seen = back ? null : new Set(r.members.filter((m) => m.id !== r.me).map((m) => `joined:${m.id}`));
      keep(SEEN_KEY, seen && [...seen]);
      take(r); history.replaceState(null, "", location.pathname); live(true); home();
      announce();       // the duels already waiting for the one who's just joined
    };
    if (st.members.length < 2) {
      return view(box("sd-turn", "Surah Duel", `${st.members[0].name} invites you to a duel room`,
        el("p", {}, "You'll challenge each other on the surahs and see each other's results as they come in."),
        nameForm("Join", async (name) => done(await call({}, { op: "join", room: code, name }), name))));
    }
    // the room has its two: one of them is opening it on a new phone
    view(box("sd-turn", "Surah Duel", "Which of you is this?", el("p", {}, `This room is ${st.members[0].name} and ${st.members[1].name}'s. Pick your name to carry on here.`),
      el("div", { class: "row" }, ...st.members.map((m) => btn(`I'm ${m.name}`, async () => done(await call({}, { op: "join", room: code, as: m.id }), m.name, true), true)))));
  }
  function inviteBox() {
    const link = `${location.origin}${location.pathname}#join=${me.room}`;
    const share = async () => {
      try { if (navigator.share) return await navigator.share({ title: "Surah Duel", text: `${me.name} invites you to Surah Duel`, url: link }); } catch { return; }
      copy();
    };
    const copy = () => navigator.clipboard?.writeText(link).then(() => toast("The link is copied: paste it in a message"), () => {});
    return box("sd-wait sd-wide", "Invite your partner", "Waiting for them to join",
      el("p", {}, "Send them this link (Telegram, WhatsApp or any message). When they open it and type their name, they're in, and they'll find your duels waiting with your scores. You can start playing now."),
      el("div", { class: "sd-link" }, link),
      el("div", { class: "row" }, btn("Share the link", share), btn("Copy", copy)),
      el("p", { class: "hint" }, "Keep the link between the two of you: anyone with it could take the second place."));
  }

  // ---------- the numbers: score, streak, the week, what you both missed ----------
  const finished = () => (room.members.length < 2 ? [] : room.duels.filter((d) => room.members.every((m) => d.results[m.id])));
  function tally() {
    const wins = {}, p = partner();
    for (const m of [...room.members, p]) wins[m.id] = 0;
    let draws = 0;
    for (const d of finished()) {
      const a = d.results[me.id].points, b = d.results[p.id].points;
      if (a > b) wins[me.id]++; else if (b > a) wins[p.id]++; else draws++;
    }
    return { wins, draws };
  }
  const dayOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function together() {
    const days = room.members.map((m) => new Set(room.duels.filter((d) => d.results[m.id]).map((d) => dayOf(d.results[m.id].at))));
    const both = (t) => days.length === 2 && days.every((s) => s.has(t));
    let day = dayOf(Date.now()), streak = 0;
    if (!both(day)) day = dayOf(day - 864e5 / 2);      // today isn't over: the streak can still count from yesterday
    while (both(day)) { streak++; day = dayOf(day - 864e5 / 2); }
    const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    let right = 0;
    for (const d of room.duels) for (const m of room.members) {
      const r = d.results[m.id];
      if (r && r.at >= monday.getTime()) right += r.answers.filter((a) => a.ok).length;
    }
    return { streak, right };
  }
  function missedByBoth(limit = 12) {
    const out = [];
    for (const d of [...finished()].reverse()) d.qs.forEach((q, i) => {
      const n = q.t === "after" ? q.s + 1 : q.s;      // for "which comes next", the one you didn't know
      if (room.members.every((m) => !d.results[m.id].answers[i].ok) && !out.includes(n)) out.push(n);
    });
    return out.slice(0, limit);
  }

  // ---------- Home ----------
  function home() {
    current = null;
    if (!me) {
      const code = (location.hash.match(/join=([A-Za-z0-9_-]{24})/) || [])[1];
      return code ? joinScreen(code) : welcome();
    }
    if (!room) { view(el("p", { class: "hint" }, "Opening the duel room…")); poll(true); return; }
    screen = "home";
    const p = partner(), { wins, draws } = tally(), { streak, right } = together();
    const mine = (d) => d.results[me.id], theirs = (d) => d.results[p.id], rightOf = (r) => r.answers.filter((a) => a.ok).length;
    // the other's challenges, once they've played their part (their score is the one to beat); their answers stay hidden until you've played
    const turn = room.duels.filter((d) => !mine(d) && d.by !== me.id && theirs(d)).reverse();
    const waiting = room.duels.filter((d) => mine(d) && !theirs(d)).reverse();
    const done = finished().reverse();
    const learn = missedByBoth();
    view(
      el("section", { class: "sd-score" },
        el("div", { class: "who" }, el("small", {}, "You"), el("b", {}, me.name)),
        el("div", { class: "vs" }, `${wins[me.id]} – ${wins[p.id]}`, el("small", {}, draws ? `duels won · ${draws} drawn` : "duels won")),
        el("div", { class: "who" }, el("small", {}, "Your partner"), el("b", {}, p.waiting ? "Not joined yet" : p.name)),
        el("div", { class: "sd-together" },
          el("span", {}, "Together streak: ", el("b", {}, `${streak} day${streak === 1 ? "" : "s"}`)),
          el("span", {}, "This week, between you: ", el("b", {}, `${right} / ${GOAL} right answers`)),
          el("span", { class: "sd-meter", "aria-hidden": "true" }, el("i", { style: `width:${Math.min(100, Math.round((right / GOAL) * 100))}%` })))),
      el("div", { class: "sd-grid" },
        p.waiting ? inviteBox() : "",
        turn.length ? box("sd-turn", "Your turn", `${turn.length} duel${turn.length === 1 ? "" : "s"} waiting for you`,
          el("ul", { class: "sd-list" }, ...turn.slice(0, 6).map((d) => el("li", {},
            el("span", {}, `${nameOf(d.by)} challenged you · ${RANGES[d.range][2]} `, el("br"), el("b", {}, `${nameOf(d.by)}: ${rightOf(theirs(d))} of ${d.qs.length} right, ${theirs(d).points} points`), " ",
              el("small", {}, when(theirs(d).at))), btn("Beat it ▶", () => play(d), true, "small"))))) : "",
        box("sd-new", "New duel", "Challenge " + p.name,
          el("p", { class: "hint" }, `You play first. When you've finished, ${p.name} gets the challenge with your score to beat, whenever they next open the app. Pick the surahs it's on:`),
          el("div", { class: "sd-ranges" }, ...Object.entries(RANGES).map(([k, [, , label, about]]) => btn(`${label} · ${about}`, () => challenge(k), false)))),
        waiting.length ? box("sd-wait", `Waiting for ${p.name}`, `${waiting.length} duel${waiting.length === 1 ? "" : "s"} sent`,
          el("ul", { class: "sd-list" }, ...waiting.slice(0, 6).map((d) => el("li", {}, el("span", {}, `${RANGES[d.range][2]} · you ${mine(d).points} `, el("small", {}, when(mine(d).at))), btn("See", () => result(d), false, "small"))))) : "",
        done.length ? box("sd-done", "Results", "The latest duels",
          el("ul", { class: "sd-list" }, ...done.slice(0, 8).map((d) => {
            const a = mine(d).points, b = theirs(d).points;
            return el("li", {}, el("span", {}, `${a > b ? "🏆 " : ""}You ${a} – ${b} ${p.name}${b > a ? " 🏆" : ""} `, el("small", {}, `${RANGES[d.range][2]} · ${when(Math.max(mine(d).at, theirs(d).at))}`)), btn("See", () => result(d), false, "small"));
          }))) : "",
        learn.length ? box("sd-learn", "Learn together", "Surahs you both missed",
          el("ul", { class: "sd-list" }, ...learn.map((n) => el("li", {}, el("span", {}, `${n} · ${S(n).name} `, el("small", {}, S(n).meaning)), el("span", { class: "sd-ar", lang: "ar", dir: "rtl" }, S(n).ar)))),
          el("p", { class: "hint" }, "They come back as revenge questions in your next duels.")) : ""));
  }

  // ---------- making a duel: 7 questions of mixed kinds, the same for both ----------
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // other surahs close to n (within the range when it can), for the wrong choices: close ones make it about knowing the exact one
  function near(n, lo, hi, k, not = []) {
    const out = [];
    for (let d = 1; out.length < k && d < 114; d++) for (const m of shuffle([n - d, n + d])) {
      if (out.length < k && m >= 1 && m <= 114 && !not.includes(m) && m !== n && (m >= lo && m <= hi || d > 6)) out.push(m);
    }
    return out;
  }
  const plainMeaning = (n) => S(n).meaning && S(n).meaning.toLowerCase().replace(/[^a-z]/g, "") !== S(n).name.toLowerCase().replace(/^(al|an|ar|as|at|ash|az|ad|adh)-/, "").replace(/[^a-z]/g, "");
  function question(t, s, lo, hi) {
    if (t === "num" || t === "name" || t === "arabic" || t === "meaning") { const o = shuffle([s, ...near(s, lo, hi, 3)]); return { t, s, o, a: o.indexOf(s) }; }
    if (t === "after") { const next = s + 1, o = shuffle([next, ...near(next, lo, hi, 3, [s])]); return { t, s, o, a: o.indexOf(next) }; }
    if (t === "first") { const other = shuffle(near(s, lo, hi, 6).filter((m) => Math.abs(m - s) >= 2))[0] || near(s, lo, hi, 1)[0]; const o = shuffle([s, other]); return { t, s, o, a: o.indexOf(Math.min(s, other)) }; }
    // order: four from the range, spread out
    const span = hi - lo + 1, pick = new Set([s]);
    while (pick.size < 4) pick.add(lo + rnd(span));
    const o = shuffle([...pick]);
    return { t, s, o, a: [...pick].sort((x, y) => x - y) };
  }
  function makeDuel(range) {
    const [lo, hi] = RANGES[range];
    const kinds = shuffle(["num", "name", "after", "first", "order", "arabic", "meaning", "num", "name", "after"]);
    // revenge: surahs either of you missed lately, in this range, worth double
    const recent = [];
    for (const d of room.duels.slice(-12).reverse()) d.qs.forEach((q, i) => {
      if (Object.values(d.results).some((r) => !r.answers[i]?.ok) && q.s >= lo && q.s <= hi && !recent.includes(q.s)) recent.push(q.s);
    });
    const qs = [], used = new Set();
    for (const s of shuffle(recent).slice(0, 2)) { const q = question(rnd(2) ? "num" : "name", s, lo, hi); q.x = 1; qs.push(q); used.add(s); }
    for (const t of kinds) {
      if (qs.length >= QUESTIONS) break;
      let s, tries = 0;
      do { s = lo + rnd(hi - lo + 1); tries++; } while (tries < 50 && (used.has(s) || (t === "after" && s >= 114) || (t === "meaning" && !plainMeaning(s))));
      used.add(s);
      qs.push(question(t, s, lo, hi));
    }
    return { id: Date.now().toString(36) + rnd(46656).toString(36).padStart(3, "0"), range, qs: shuffle(qs) };
  }
  // a new duel is played first by whoever makes it; it's sent, with their result, only when they've finished (giving up sends nothing)
  function challenge(range) {
    play({ ...makeDuel(range), by: me.id, at: Date.now(), results: {} });
  }

  // ---------- playing a duel ----------
  const LABEL = { num: "Which number is this surah?", name: "Which surah has this number?", after: "Which surah comes right after this one?",
    first: "Which comes first in the Quran?", order: "Put them in order, first to last", arabic: "Which surah is this?", meaning: "Which surah has this meaning?" };
  function prompt(q) {
    const s = S(q.s);
    if (q.t === "num" || q.t === "after") return el("b", {}, s.name);
    if (q.t === "name") return el("b", {}, `Number ${q.s}`);
    if (q.t === "arabic") return el("b", { class: "sd-ar", lang: "ar", dir: "rtl" }, s.ar);
    if (q.t === "meaning") return el("b", {}, `“${s.meaning}”`);
    return "";
  }
  const optionText = (q, n) => (q.t === "num" ? String(n) : S(n).name);
  const line = (n) => `${n} · ${S(n).name} · ${S(n).meaning}`;
  function play(duel) {
    screen = "play"; current = duel;
    let i = 0, points = 0, betUsed = false, timer = null;
    const answers = [], start = Date.now();
    const hud = el("div", { class: "sd-hud" }), clock = el("div", { class: "sd-clock" }, el("i")), body = el("div", { class: "sd-play" });
    const other = duel.by === me.id ? partner() : room.members.find((m) => m.id === duel.by), toBeat = duel.by !== me.id ? duel.results[duel.by]?.points : null;
    view(el("div", { class: "sd-play" }, hud, clock, body, el("div", { class: "row" }, btn("Give up", () => { clearInterval(timer); home(); }, false, "link"))));
    function ask() {
      const q = duel.qs[i], limit = q.t === "order" ? TIME_ORDER : TIME, began = performance.now();
      let bet = false, picked = [], over = false;
      hud.replaceChildren(el("span", {}, `Question ${i + 1} of ${duel.qs.length}`), el("span", {}, toBeat == null ? `vs ${other?.name || "?"}` : `${other?.name || "?"}: ${toBeat} to beat`), el("span", {}, `${points} points`));
      const opts = q.o.map((n, k) => btn(optionText(q, n), () => pick(k), false));
      const betBtn = betUsed ? "" : btn("Double or nothing: ×2 if right, −100 if not", () => { bet = !bet; betBtn.classList.toggle("on", bet); }, false, "small sd-bet");
      body.replaceChildren(el("div", { class: "sd-q" }, q.x ? el("span", { class: "tag" }, "Revenge ×2") : "", el("small", {}, LABEL[q.t]), prompt(q),
        q.t === "num" ? el("span", { class: "sd-ar", lang: "ar", dir: "rtl" }, S(q.s).ar) : ""), el("div", { class: "sd-opts" }, ...opts), betBtn);
      clearInterval(timer);
      timer = setInterval(() => {
        const left = Math.max(0, limit - (performance.now() - began) / 1000);
        clock.firstChild.style.width = `${(left / limit) * 100}%`;
        if (left <= 0) finish(q.t === "order" ? picked.map((k) => q.o[k]) : -1, false);
      }, 100);
      function pick(k) {
        if (over) return;
        if (q.t === "order") {
          const n = q.o[k];
          if (picked.includes(k)) return;
          picked.push(k);
          opts[k].disabled = true;
          opts[k].prepend(el("span", { class: "n" }, `${picked.length}.`));
          if (n !== q.a[picked.length - 1]) { opts[k].classList.add("bad"); return finish(picked.map((x) => q.o[x]), false); }
          opts[k].classList.add("good");
          if (picked.length === q.a.length) finish(q.a, true);
          return;
        }
        finish(k, k === q.a);
      }
      function finish(k, ok) {
        if (over) return;
        over = true; clearInterval(timer);
        const ms = Math.round(performance.now() - began), left = Math.max(0, limit - ms / 1000);
        opts.forEach((o, n) => { o.disabled = true; if (q.t !== "order") { o.classList.toggle("good", n === q.a); o.classList.toggle("bad", n === k && !ok); } });
        let got = ok ? 100 + Math.round(50 * (left / limit)) : 0;
        if (ok && q.x) got *= 2;
        if (bet) { got = ok ? got * 2 : -100; betUsed = true; }
        points += got;
        answers.push({ k: Array.isArray(k) ? (k.length ? k : -1) : k, ok, ms: Math.min(ms, 600000), ...(bet ? { d: 1 } : {}) });
        sound(ok ? "right" : "wrong");
        const right = q.t === "order" ? `In order: ${q.a.map((n) => `${n} ${S(n).name}`).join(" → ")}`
          : q.t === "first" ? `${S(q.o[q.a]).name} is ${q.o[q.a]}, ${S(q.o[1 - q.a]).name} is ${q.o[1 - q.a]}`
          : q.t === "after" ? `After ${S(q.s).name} (${q.s}) comes ${S(q.s + 1).name} (${q.s + 1})` : line(q.s);
        const last = i === duel.qs.length - 1;
        body.append(el("div", { class: `sd-feedback ${ok ? "" : "miss"}`.trim() },
          el("p", {}, el("b", {}, ok ? `Right! +${got}` : k === -1 ? "Time's up." : bet ? "Not this one: −100" : "Not this one.")),
          el("p", {}, right), q.t === "num" || q.t === "name" || q.t === "arabic" || q.t === "meaning" ? el("p", { class: "sd-ar", lang: "ar", dir: "rtl" }, S(q.s).ar) : "",
          el("div", { class: "row" }, btn(last ? "See the result" : "Next →", () => (last ? done() : (i++, ask())), true))));
        body.querySelector(".sd-feedback button").focus();
      }
    }
    function done() {
      const r = { answers, points, ms: Math.min(Date.now() - start, 3600000) };
      let d = room.duels.find((x) => x.id === duel.id);
      const fresh = !d;           // a new challenge: it goes now, with this result
      if (fresh) { d = duel; room.duels.push(d); }
      d.results[me.id] = { ...r, at: Date.now() };
      keep(ROOM_KEY, room);
      if (fresh) { outbox.push({ op: "duel", room: me.room, me: me.id, duel: { id: d.id, range: d.range, qs: d.qs } }); keep(OUT_KEY, outbox); }
      send({ op: "result", room: me.room, me: me.id, duel: d.id, result: r });
      result(d);
    }
    ask();
  }

  // ---------- a duel's result, side by side ----------
  function result(duel) {
    screen = "result"; current = duel;
    const d = room.duels.find((x) => x.id === duel.id) || duel, p = partner(), a = d.results[me.id], b = d.results[p.id];
    if (!a) return play(d);           // not played yet here: nothing of theirs to see first
    const summary = (q) => q.t === "order" ? `Order: ${q.a.map((n) => S(n).name).join(", ")}` : q.t === "first" ? `First: ${S(q.o[q.a]).name} or ${S(q.o[1 - q.a]).name}`
      : q.t === "after" ? `After ${S(q.s).name}` : q.t === "name" ? `Number ${q.s}` : q.t === "arabic" ? S(q.s).ar : q.t === "meaning" ? `“${S(q.s).meaning}”` : S(q.s).name;
    const answerOf = (q) => q.t === "num" ? `${q.s}` : q.t === "after" ? S(q.s + 1).name : q.t === "order" ? q.a.join(" → ") : q.t === "first" ? S(q.o[q.a]).name : S(q.s).name;
    const cell = (r, k) => r ? el("td", { class: r.answers[k].ok ? "ok" : "miss" }, `${r.answers[k].ok ? "✓" : "✗"} `, el("small", {}, `${(r.answers[k].ms / 1000).toFixed(1)} s${r.answers[k].d ? " · ×2 bet" : ""}`)) : el("td", {}, el("small", {}, "…"));
    view(el("div", { class: "sd-grid" },
      box("sd-done sd-wide", `${RANGES[d.range][2]} · ${when(d.at)}`, b ? `You ${a.points} – ${b.points} ${p.name}` : `You ${a.points} · waiting for ${p.name}`,
        b ? el("div", { class: "sd-banner" }, a.points > b.points ? "You won!" : b.points > a.points ? `${p.name} won this one` : "A draw") : el("p", { class: "hint" }, `${p.name}'s answers show here as soon as they've played: this page changes by itself.`),
        el("table", { class: "sd-vs" },
          el("thead", {}, el("tr", {}, el("th", {}, "Question"), el("th", {}, "Answer"), el("th", {}, "You"), el("th", {}, p.name))),
          el("tbody", {}, ...d.qs.map((q, k) => el("tr", {}, el("td", {}, q.x ? "↺ " : "", summary(q)), el("td", {}, answerOf(q)), cell(a, k), cell(b, k))))),
        el("div", { class: "row" }, btn("Rematch", () => challenge(d.range), true), btn("Duels", home)))));
  }

  $("sdHome").onclick = home;
  setupFullscreen(root);
  window.SurahDuel = { home, state: () => ({ me, room, outbox, current }), poll };      // for tests
  liveEl.textContent = me ? "Connecting…" : "";
  home();
  if (me) poll(true);
  setInterval(() => poll(), POLL);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(true); });
  window.addEventListener("hashchange", () => { if (!me) home(); });
})();
