/* Study Quest: learn a book chapter by chapter as a game. Each list is a stage: look at the cards, then play the quiz
   (pick the right answer against the clock, with hearts and combos). 80 % passes the stage, opens the next one and
   puts it on a review schedule; a chapter ends with a boss round of questions from all its lists. Points raise your
   rank. Books come from study/*.js and from list files imported in Memory Palace. Everything is kept in this browser.
   Coins (18.11.2026; every app since 19.11.2026): rounds earn them (roundCoins; static/coins.js keeps them), every stage, chapter,
   final round, review and the subject itself shows what it can still give (its pot, in gold), a round counts its coins as you answer
   and shows them against what it could give, and each subject has a Reviews section: what's due, played one after another. */
"use strict";
// the books are put into the app's language by study/books-lang.js, loaded before this file
const StudyCore = (() => {
  const DAY = 864e5, PASS = 0.8, KEY = window.SORA_BOOK ? `sora.studyQuest.${window.SORA_BOOK}.v1` : "sora.studyQuest.v1", IMPORT_KEY = "sora.memoryPalace.imported.v1";
  // review gaps in days, capped at 12 so every passed stage comes back several times before the exam
  const INTERVALS = [1, 3, 6, 12];
  // ranks: an audit firm's for Sora personal (SBR); a school's on the websites (Maryamxon's subjects)
  const RANKS = window.SORA_STATIC ? [[0, "Beginner"], [1500, "Learner"], [5000, "Explorer"], [12000, "Achiever"], [25000, "Expert"],
                 [45000, "Master"], [75000, "Champion"], [120000, "Scholar"], [200000, "Genius"]]
    : [[0, "Trainee"], [1500, "Junior"], [5000, "Semi-senior"], [12000, "Senior"], [25000, "Assistant manager"],
                 [45000, "Manager"], [75000, "Senior manager"], [120000, "Director"], [200000, "Partner"]];

  // the books: built in, then those imported in Memory Palace (book -> sections as chapters)
  function books() {
    const out = [...(window.StudyBooks || [])];
    if (window.SORA_BOOK) return out;     // a game of one book (a subject, Surah Numbers): just that book
    let imp = [];
    try { imp = JSON.parse(localStorage.getItem(IMPORT_KEY) || "[]") || []; } catch { /* none */ }
    for (const name of [...new Set(imp.map((k) => k.book))]) {
      const mine = imp.filter((k) => k.book === name), sections = [...new Set(mine.map((k) => k.section || ""))];
      out.push({ id: `imp:${name}`, name, title: "Imported list file", about: "Imported in Memory Palace", imported: true,
        chapters: sections.map((s, i) => ({ n: i + 1, title: s || name, lists: mine.filter((k) => (k.section || "") === s) })) });
    }
    return out;
  }

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.lists) return { xp: 0, streak: { last: null, days: 0 }, ...s }; } catch { /* fresh */ }
    // a website's subject is a game of its own, with its own progress. What was played while the subjects shared one game is carried
    // over: this subject's stages, with the points and the streak
    if (window.SORA_BOOK) try {
      const old = JSON.parse(localStorage.getItem("sora.studyQuest.v1") || "null"), b = (window.StudyBooks || []).find((x) => x.id === window.SORA_BOOK);
      const mine = (id) => id.startsWith(`${b.id}:`) || b.chapters.some((c) => c.lists.some((l) => l.id === id));
      const lists = old?.lists && b ? Object.fromEntries(Object.entries(old.lists).filter(([id]) => mine(id))) : {};
      if (Object.keys(lists).length) return { xp: 0, streak: { last: null, days: 0 }, ...old, lists };
    } catch { /* fresh */ }
    return { lists: {}, xp: 0, streak: { last: null, days: 0 } };
  }
  const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full */ } };
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

  function shuffle(a, rnd = Math.random) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const ask = (it) => it.key || it.text;     // items without a key are asked by their text only
  // a key ending in "…" is the start of a sentence and the text its end: "Materiality is judged for …" + "the primary users as a group"
  const isStem = (it) => /(…|\.\.\.)\s*$/.test(it.key || "");
  // item kinds: a sentence (key … / … text, the default), "order" (put steps in order; with "any", a checklist: pick everything that
  // belongs, in any order, and none of the things in "not"), "sort" (which of two or three things a statement describes), "tf" (true or
  // false, with the reason) and "case" (a short scenario: pick the treatment)
  const kindOf = (it) => it.t || "sentence";
  const answerOf = (it) => ({ order: () => it.steps.join(it.any ? "; " : " → "), sort: () => it.opts[it.a], case: () => it.opts[it.a], tf: () => (it.a ? tr("True") : tr("False")) }[kindOf(it)] || (() => it.text))();
  const sentence = (it) => kindOf(it) !== "sentence" ? `${it.q} — ${answerOf(it)}`
    : (!it.key ? it.text : isStem(it) ? `${it.key.replace(/\s*(…|\.\.\.)\s*$/, "")} ${it.text}` : `${it.key}: ${it.text}`);
  const ending = (text) => `… ${text}`;
  // questions for a round: "key" shows the key and asks for the meaning, "text" the other way round; "mixed" both.
  // Wrong options come from the same list first, then from the pool (the chapter).
  function questions(items, pool, dir = "mixed", rnd = Math.random, count = 0) {
    const list = shuffle(items, rnd).slice(0, count || items.length);
    return list.map((it, i) => {
      const kind = kindOf(it);
      if (kind === "tf") return { item: it, kind, label: tr("True or false?"), prompt: it.q, shown: [tr("True"), tr("False")], answer: it.a ? 0 : 1 };
      if (kind === "sort") return { item: it, kind, label: it.ask || tr("Which one is it?"), prompt: it.q, shown: it.opts, answer: it.a };
      if (kind === "case") { const order = shuffle(it.opts.map((_, k) => k), rnd); return { item: it, kind, label: it.ask || tr("What is the right treatment?"), prompt: it.q, shown: order.map((k) => it.opts[k]), answer: order.indexOf(it.a) }; }
      if (kind === "order") return { item: it, kind, any: !!it.any, label: it.any ? tr("Pick everything that belongs, in any order") : tr("Put them in order: click the first, then the next…"), prompt: it.q, steps: it.steps,
        shown: shuffle(it.any ? [...it.steps, ...(it.not || [])] : it.steps, rnd) };
      const way = !it.key ? "key" : dir === "mixed" ? (i % 2 ? "text" : "key") : dir;
      // asked forwards, a card with other forms (it.also) is asked in one of them: the same sentence with another part blanked
      const form = way === "key" && it.also?.length ? [it, ...it.also][Math.floor(rnd() * (it.also.length + 1))] : it, gap = form !== it;
      const face = (x) => (way === "key" ? x.text : x.key), right = way === "key" ? form.text : it.key;
      // wrong options: for another part, other cards' other parts first (so a principle's name is up against other names)
      const others = (list) => shuffle(list.filter((x) => x !== it), rnd);
      const near = gap ? [...others(items), ...others(pool)].flatMap((x) => (x.also || []).map((a) => a.text)) : [];
      const wrong = [...new Set([...near, ...others(items).map(face), ...others(pool.filter((x) => !items.includes(x))).map(face)].filter((o) => o && o !== right))].slice(0, 3);
      const options = shuffle([right, ...wrong], rnd);
      const stem = isStem(form);
      const label = (way === "key" ? (gap ? "" : it.ask) : it.askBack)
        || tr(way === "key" ? (gap ? "Fill the gap" : stem ? "Finish the sentence" : "What is it?") : (stem ? "Which beginning goes with this ending?" : "Which term is this?"));
      return { item: it, form, gap, kind, way, stem, label, prompt: way === "key" ? ask(form) : stem ? ending(it.text) : it.text, options, answer: options.indexOf(right),
               shown: options.map((o) => (way === "key" && stem ? ending(o) : o)) };
    });
  }
  // points for a right answer: 100, up to 50 more for speed, times the combo (up to x3)
  const points = (left, limit, combo) => Math.round((100 + (limit ? 50 * Math.max(0, left) / limit : 25)) * Math.min(3, 1 + combo * 0.25));
  const stars = (score) => (score >= 0.95 ? 3 : score >= PASS ? 2 : score >= 0.6 ? 1 : 0);
  // a finished round: best stars kept; passing moves the list along the review schedule, missing brings it back today
  // mode "recall" (typed or self-checked) moves a passed stage to a longer gap; "choice" (picking) only keeps it fresh,
  // the same rule as Memory Palace (PalaceCore.advance), so both games keep one schedule
  function record(prog, id, score, gained, now = Date.now(), mode = "recall") {
    const l = PalaceCore.studyEntry(prog, id);
    l.plays++; l.last = now; l.best = Math.max(l.best, score); l.stars = Math.max(l.stars, stars(score));
    PalaceCore.advance(l, score, mode === "choice", now, INTERVALS, true);
    syncPalace(id, score, mode, now);
    prog.xp += gained;
    const today = startOfDay(now), s = prog.streak;
    if (s.last !== today) { s.days = s.last === today - DAY ? s.days + 1 : 1; s.last = today; }
    return l;
  }
  // a stage also stored in a Memory Palace: the same session moves that list's schedule too
  function palaceList(id) {
    try {
      const st = JSON.parse(localStorage.getItem(PalaceCore.KEY) || "null");
      const list = st && Object.values(st.lists || {}).find((x) => x.packId === id && !x.done);
      return list ? { st, list } : null;
    } catch { return null; }
  }
  function syncPalace(id, score, mode, now) {
    const found = palaceList(id);
    if (!found) return;
    let plan = "standard";
    try { plan = JSON.parse(localStorage.getItem("sora.settings.memory-palace") || "{}").plan || plan; } catch { /* default */ }
    PalaceCore.recordScore(found.st, found.list.id, score, now, plan, mode, "study");
    PalaceCore.save(found.st);
  }
  const passed = (prog, id) => (prog.lists[id]?.best || 0) >= PASS;
  const due = (prog, ids, now = Date.now()) => ids.filter((id) => prog.lists[id]?.due != null && prog.lists[id].due <= now);
  function rank(xp) {
    let k = 0;
    while (k + 1 < RANKS.length && xp >= RANKS[k + 1][0]) k++;
    return { name: RANKS[k][1], next: RANKS[k + 1] || null, from: RANKS[k][0] };
  }
  // the pace to the exam: stages still to pass spread over the days left, keeping the last week for review
  function plan(book, prog, now = Date.now()) {
    if (!book.exam) return null;
    const [y, m, d] = book.exam.split("-").map(Number), exam = new Date(y, m - 1, d).getTime();
    const days = Math.round((exam - startOfDay(now)) / DAY), ids = book.chapters.flatMap((c) => c.lists.map((l) => l.id));
    const left = ids.filter((id) => !passed(prog, id)).length;
    return { exam, days, left, total: ids.length, perDay: days > 0 ? Math.ceil(left / Math.max(1, days - 7)) : left };
  }
  // the plan's session for today (book.plan.sessions; isDone(session, index)): a dated one whose day has come first (the earliest not done),
  // otherwise the first undated one not done; a dated session waits for its day. -1 when nothing is left for today.
  const dayOf = (on) => { const [y, m, d] = on.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
  function planToday(sessions, isDone, now = Date.now()) {
    const today = startOfDay(now);
    let k = -1;
    sessions.forEach((s, j) => { if (s.on && !isDone(s, j) && dayOf(s.on) <= today && (k < 0 || dayOf(s.on) < dayOf(sessions[k].on))) k = j; });
    return k >= 0 ? k : sessions.findIndex((s, j) => !s.on && !isDone(s, j));
  }
  // the next dated session still to come, for "coming up"
  function planNext(sessions, isDone, now = Date.now()) {
    const today = startOfDay(now);
    let k = -1;
    sessions.forEach((s, j) => { if (s.on && !isDone(s, j) && dayOf(s.on) > today && (k < 0 || dayOf(s.on) < dayOf(sessions[k].on))) k = j; });
    return k;
  }
  // each card's misses (key "listId#index"): a miss adds one, a right answer takes one off; the mixed boss favours them
  function noteCard(prog, cid, ok) {
    const m = prog.miss || (prog.miss = {});
    m[cid] = Math.max(0, (m[cid] || 0) + (ok ? -1 : 1));
    if (!m[cid]) delete m[cid];
  }
  // the mixed boss: up to n Watch out, Compare and Apply cards from passed stages, drawn at random with extra weight
  // for cards missed before (up to +6) and for stages due for review (+2)
  const MIX_TRACKS = ["watch", "compare", "apply"];
  function mixPool(book, prog, now = Date.now()) {
    const out = [];
    for (const c of book.chapters) for (const l of c.lists) {
      if (!MIX_TRACKS.includes(l.track) || !passed(prog, l.id)) continue;
      const isDue = prog.lists[l.id]?.due != null && prog.lists[l.id].due <= now;
      l.items.forEach((it, k) => { const cid = `${l.id}#${k}`; out.push({ it, cid, c, l, w: 1 + Math.min(6, 2 * (prog.miss?.[cid] || 0)) + (isDue ? 2 : 0) }); });
    }
    return out;
  }
  function mixDraw(pool, n = 15, rnd = Math.random) {
    const left = [...pool], out = [];
    while (out.length < n && left.length) {
      let r = rnd() * left.reduce((s, x) => s + x.w, 0), k = 0;
      while (k < left.length - 1 && (r -= left[k].w) > 0) k++;
      out.push(left.splice(k, 1)[0]);
    }
    return out;
  }
  return { noteCard, mixPool, mixDraw, MIX_TRACKS, kindOf, answerOf, palaceList, isStem, sentence, plan, planToday, planNext, dayOf, DAY, PASS, KEY, IMPORT_KEY, INTERVALS, RANKS, books, load, save, startOfDay, shuffle, questions, points, stars, record, passed, due, rank };
})();
window.StudyCore = StudyCore;

(() => {
  const C = StudyCore, root = $("sq"), main = $("sqMain");
  // on a website (Sora public, Aziza): no study plan, markings or Telegram bot (they're the user's own), and no server to send answers to
  const FRIENDS = window.SORA_STATIC === true;
  if (FRIENDS) for (const b of window.StudyBooks || []) delete b.plan;
  let prog = C.load(), books = C.books(), bookId = null, timer = null, screen = "home";
  let reviewQueue = [];        // "Review all due": the due stages still to play, one after another
  // coins, in every app (19.11.2026): rounds earn them, and every stage, chapter, final round and review shows what it can still give
  const SC = window.SoraCoins, COINS = !!SC;
  const commit = () => C.save(prog);

  const settings = setupSettings(root, "study-quest", [
    { key: "answer", label: tr("How you answer"), type: "choice", default: window.SORA_STATIC ? "choice" : "recall", options: [["recall", tr("Recall: type it first")], ["choice", tr("Pick from choices")]],
      help: tr("A real recall moves the review schedule on; picking only keeps a stage fresh") },
    { key: "dir", label: tr("Questions (when picking)"), type: "choice", default: "mixed", options: [["mixed", tr("Mixed")], ["key", tr("Term → meaning")], ["text", tr("Meaning → term")]] },
    { key: "time", label: tr("Time per question"), type: "choice", default: 30, options: [[0, tr("No clock")], [45, tr("{n} s", { n: 45 })], [30, tr("{n} s", { n: 30 })], [20, tr("{n} s", { n: 20 })], [10, tr("{n} s", { n: 10 })]] },
    { key: "hearts", label: tr("Hearts"), type: "choice", default: 3, options: [[0, tr("Unlimited")], [3, "3"], [5, "5"]] },
    { key: "order", label: tr("Open stages in order"), type: "toggle", default: true, help: tr("Off: every stage is open from the start") },
    { key: "reviews", label: tr("Reviews a day"), type: "choice", default: 4, options: [[2, "2"], [4, "4"], [6, "6"], [0, tr("All")]],
      help: tr("Stages due for review shown on Home, the most important chapters first; the rest wait for another day") },
    { key: "speak", label: tr("Read questions aloud"), type: "toggle", default: false },
  ], { onChange: () => { if (screen === "home") home(); } });
  const S = settings.values;
  function speak(text) {
    if (!S.speak || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (window.SoraLang?.lang === "ru") u.lang = "ru-RU";     // a Russian voice for Russian
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { /* no voice */ }
  }
  const btn = (label, onclick, primary = false, cls = "") => el("button", { type: "button", class: `${primary ? "primary" : ""} ${cls}`.trim(), onclick }, label);
  const head = (title, text) => el("div", { class: "sq-head" }, el("h2", {}, title), text ? el("p", { class: "hint" }, text) : "");
  // numbers as the app's language writes them: 1,500 in English, 1 500 in Russian
  const num = (x) => x.toLocaleString(window.SoraLang?.lang === "ru" ? "ru-RU" : undefined);
  const date = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; };
  const when = (t) => { const days = Math.round((C.startOfDay(t) - C.startOfDay(Date.now())) / C.DAY); return days <= 0 ? tr("today") : days === 1 ? tr("tomorrow") : tr("in {n} {days} ({date})", { n: days, days: tr.n(days, "day", "days"), date: date(t) }); };
  const starRow = (n) => el("span", { class: "sq-stars", "aria-label": tr("{n} of 3 stars", { n }) }, ...[1, 2, 3].map((k) => el("i", { class: k <= n ? "on" : "" })));
  function view(...children) { clearInterval(timer); timer = null; main.replaceChildren(...children); window.SoraNav?.changed(); }
  // where a screen sits, for going back one step (SoraNav: the ← button, a round's ✕, the phone's back gesture)
  let here = {};
  const book = () => books.find((b) => b.id === bookId) || books[0];
  const allLists = (b) => b.chapters.flatMap((c) => c.lists.map((l) => ({ ...l, chapter: c })));
  const bossId = (b, c) => `${b.id}:boss:${c.n}`;
  const trackOf = (l) => l.track || "know";
  // a book in one part shows its stages on Home (Surah Numbers: onePart); a book made of sections (Maryamxon's Geography and Chemistry:
  // parts "section") calls its parts sections and names each by its title, with more to come
  const onePart = (b) => !!b.onePart;
  const bySection = (b) => b.parts === "section";
  const partName = (b, c) => (bySection(b) ? c.title : tr("Chapter {n}", { n: c.n }));
  const partsName = (b) => tr(bySection(b) ? "Sections" : "Chapters");
  // a card as shown on the cards and after it's answered: with the English terms in brackets, where the book has them
  const shown = (it) => (it.withTerms ? { ...it, ...it.withTerms } : it);
  // stages open one after another within each kind of practice (Know, Structure, Compare, Watch out, Apply)
  function open(c, k) {
    if (!S.order) return true;
    // a stage may belong to a group within its kind (Geography's continents: "group"), and each group opens on its own
    const prev = c.lists.slice(0, k).filter((x) => trackOf(x) === trackOf(c.lists[k]) && (x.group || "") === (c.lists[k].group || "")).pop();
    return !prev || C.passed(prog, prev.id);
  }

  // ---------- home: rank, reviews due, the chapter map ----------
  // where you are: each chapter's state, and the stage to continue with
  function chapterState(c) {
    const passedN = c.lists.filter((l) => C.passed(prog, l.id)).length, played = c.lists.some((l) => prog.lists[l.id]?.plays);
    return { passedN, total: c.lists.length, state: !c.lists.length ? "soon" : passedN === c.lists.length ? "done" : played ? "started" : "new" };
  }
  function nextStage(b) {
    const lists = allLists(b);
    if (!lists.length) return null;
    let last = null;
    for (const l of lists) { const p = prog.lists[l.id]; if (p?.last && (!last || p.last > prog.lists[last.id].last)) last = l; }
    const from = last ? lists.indexOf(last) : 0;
    const next = [...lists.slice(from), ...lists.slice(0, from)].find((l) => !C.passed(prog, l.id));
    return { last, next };
  }
  // ---------- written practice: exam-style scenarios answered in a box against the clock, then sent for marking ----------
  const WRITTEN_KEY = "sora.studyQuest.written.v1", MIN_PER_MARK = 1.95;
  const KINDS = { q2: ["Question 2 style", "ethics and reporting"], q3: ["Question 3 style", "accounting for two or three issues"], q4: ["Question 4 style", "analysis and current issues, for the users"] };
  // what the exam gives its 2 professional marks for: the ethics in Question 2, the analysis question in Section B
  const PROF_FOR = { q2: "applying the ethical principles to the facts of the scenario", q4: "a clear analysis written for the investor or other user" };
  // past exam questions in the user's Exam Kit: listed by number and page, the text stays in the Kit (page + 25 = PDF page)
  const KIT_KIND = { q1: "Question 1 (groups)", q2: "Question 2 (reporting and ethics)", sb: "Section B", mock: "A whole exam" };
  const KIT_SHEET = "Question 1 has a spreadsheet part: do it in that exam on ACCA's Practice Platform, or in your own spreadsheet.";
  const MONTHS = { Mar: "March", Jun: "June", Sep: "September", Dec: "December" };
  // the Kit's "Sep/Dec 25" as "September/December 2025", and its place in time (newest first)
  const sittingParts = (p) => (p || "").match(/^([A-Za-z/]+) (\d\d)$/);
  const sittingName = (p) => { const m = sittingParts(p); return m ? `${m[1].split("/").map((x) => MONTHS[x] || x).join("/")} 20${m[2]}` : p || ""; };
  const sittingKey = (p) => { const m = sittingParts(p); return m ? Number(m[2]) * 2 + (/Sep|Dec/.test(m[1]) ? 1 : 0) : -1; };
  function kitSittings(b) {
    const kit = b.kit || [], past = [...new Set(kit.filter((w) => w.past).map((w) => w.past))].sort((x, y) => sittingKey(y) - sittingKey(x));
    return [...past.map((p) => ({ name: sittingName(p), list: kit.filter((w) => w.past === p).sort((x, y) => x.n - y.n) })),
      { name: "Specimen exams", list: kit.filter((w) => w.kind === "mock") },
      { name: "Other questions in the Kit", list: kit.filter((w) => !w.past && w.kind !== "mock") }].filter((g) => g.list.length);
  }
  // a Kit question kept for a mock in the plan ("mock exam 1 on Saturday 21 November"), and the plan session a question is in
  const longDate = (on) => new Date(C.dayOf(on)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  function keptFor(b, w) {
    const s = (b.plan?.sessions || []).find((x) => (x.keeps || []).includes(w.id));
    return s ? `${s.title.split(":")[0].replace(/^Mock/, "mock")} on ${longDate(s.on)}` : "";
  }
  const planned = (b, w) => (b.plan?.sessions || []).findIndex((x) => x.kit === w.id) + 1;
  // "Question 2 from the March/June 2025 exam"
  const kitWhat = (w) => (w.kind === "mock" ? "A whole exam" : `${w.kind === "sb" ? "A Section B question" : w.kind === "q1" ? "Question 1" : "Question 2"}${w.past ? ` from the ${sittingName(w.past)} exam` : " from your Kit"}`);
  const KIT_PDF = 25;
  const isKit = (w) => w.q !== undefined;
  const kitName = (w) => (w.kind === "mock" ? `Exam Kit: ${w.title}` : `Exam Kit Q${w.n}: ${w.title}`);
  const kitPage = (p) => `page ${p} (PDF page ${p + KIT_PDF})`;
  const wstore = () => { try { return { drafts: {}, attempts: [], ...(JSON.parse(localStorage.getItem(WRITTEN_KEY) || "{}") || {}) }; } catch { return { drafts: {}, attempts: [] }; } };
  const wsave = (st) => { try { localStorage.setItem(WRITTEN_KEY, JSON.stringify(st)); } catch { /* storage full */ } };
  const minutes = (w) => Math.round(w.marks * MIN_PER_MARK);
  const clock = (sec) => `${sec < 0 ? "−" : ""}${Math.floor(Math.abs(sec) / 60)}:${String(Math.floor(Math.abs(sec) % 60)).padStart(2, "0")}`;
  const words = (t) => (t.trim().match(/\S+/g) || []).length;
  // a section of Home, as a card of its own: a colour and a sign for each kind, a label, a title, one line, its buttons; anything longer
  // folded away under "more" so the cards stay small and side by side
  function box(kind, sign, label, title, line, actions = [], more = [], moreLabel = "More") {
    const rest = more.filter(Boolean);
    return el("section", { class: `sq-box sq-${kind}` },
      el("div", { class: "sq-box-head" }, el("span", { class: "sq-sign", "aria-hidden": "true" }, sign), el("small", {}, label)),
      title ? el("b", { class: "sq-box-title" }, title) : "",
      line ? (line instanceof Node ? line : el("p", { class: "hint" }, line)) : "",
      actions.filter(Boolean).length ? el("div", { class: "row sq-act" }, ...actions.filter(Boolean)) : "",
      rest.length ? el("details", { class: "sq-more" }, el("summary", {}, moreLabel), ...rest) : "");
  }
  const dash = (...cards) => cards.some(Boolean) ? el("div", { class: "sq-dash" }, ...cards) : "";
  function writtenCard(b) {
    if (!b.written?.length) return "";
    const n = wstore().attempts.length;
    return box("written-card", "✍️", "All exam questions", "Written practice",
      `${b.kit?.length || 0} Kit questions, newest exam first, and ${b.written.length} of mine${n ? ` · ${n} written so far` : ""}`,
      [btn("Open the list", () => written(b), true)]);
  }
  function written(b) {
    screen = "written"; here = { b };
    const st = wstore();
    const mk = el("section", { class: "card sq-marking" });
    const fillLink = () => markingLinked().then((on) => mk.replaceChildren(...(on
      ? [el("p", {}, "✓ Linked to Claude: when you press Finish, your answer goes for marking by itself, and the marking comes back in Telegram."),
        btn("Unlink", () => linkCode("").then(fillLink, fillLink), false, "link")]
      : [linkBox(fillLink)])));
    if (!FRIENDS) { fillLink(); refreshMarks(() => { if (screen === "written") written(b); }, true); }
    view(head("Written practice", FRIENDS ? `Write your answer in the box against the clock (${MIN_PER_MARK} minutes a mark, as in the exam), then press Finish and compare it with the answer.`
        : `Write your answer in the box against the clock (${MIN_PER_MARK} minutes a mark, as in the exam), then press Finish: it goes to Claude for marking. The marking is in the ACCA style but not official.`),
      FRIENDS ? "" : mk,
      b.kit?.length ? el("section", { class: "sq-wgroup" }, el("h3", {}, "Past exam questions from your Exam Kit"),
        el("p", { class: "hint" }, `Newest exam first. Open the Kit at the page shown, write your answer here against the clock, then ${FRIENDS ? "compare it with the Kit's answer" : "send it for marking"}. ${KIT_SHEET}`),
        ...kitSittings(b).map((g, gi) => {
          const done = g.list.filter((w) => st.attempts.some((a) => a.id === w.id)).length, keep = g.list.map((w) => keptFor(b, w)).find(Boolean);
          return el("details", { class: "sq-kitgroup", ...(gi < 5 ? { open: "" } : {}) }, el("summary", {}, `${g.name} (${g.list.length}${done ? `, ${done} done` : ""})`),
            keep ? el("p", { class: "hint" }, `Kept for ${keep}: better not to open these before then.`) : "",
            ...g.list.map((w) => {
              const d = st.drafts[w.id], tries = st.attempts.filter((a) => a.id === w.id), inPlan = planned(b, w);
              return el("div", { class: "sq-wrow" }, el("div", {}, el("b", {}, w.kind === "mock" ? w.title : `Q${w.n} ${w.title}`),
                el("small", { class: "hint" }, `${KIT_KIND[w.kind]} · ${w.marks} marks · ${minutes(w)} minutes · Kit ${kitPage(w.q)}`,
                  inPlan ? ` · in your plan: session ${inPlan}` : "", answeredNote(tries, w), d?.text && !tries.length ? " · draft saved" : "")),
                rowActions(b, w, st));
            }));
        })) : "",
      ...Object.entries(KINDS).map(([k, [title, about]]) => {
        const list = b.written.filter((w) => w.kind === k);
        return list.length ? el("section", { class: "sq-wgroup" }, el("h3", {}, `My own: ${title.toLowerCase()}, ${about}`),
          ...list.map((w) => {
            const d = st.drafts[w.id], done = st.attempts.filter((a) => a.id === w.id);
            return el("div", { class: "sq-wrow" }, el("div", {}, el("b", {}, w.title),
              el("small", { class: "hint" }, `${w.marks} marks${w.prof ? ` (${w.prof} professional)` : ""} · ${minutes(w)} minutes · chapters ${w.chapters.join(", ")}`,
                answeredNote(done, w), d?.text && !done.length ? " · draft saved" : "")),
              rowActions(b, w, st));
          })) : "";
      }),
      el("div", { class: "row sq-foot" }, btn("← Chapters", home, false, "link")));
  }
  function wtext(w, answer, used) {
    if (isKit(w)) return [`SBR written practice: ${kitName(w)} [${w.id}]`, `${w.marks} marks. Time allowed ${minutes(w)} minutes; I used ${Math.round(used / 60)}.`, "", "MY ANSWER", answer || "(empty)", "",
      "Please mark this against the Kit's answer and marking scheme, as an SBR examiner would (not official): marks for each requirement, what earned marks, what was missing, and how to improve."].join("\n");
    return [`SBR written practice: ${w.title} [${w.id}]`, `${KINDS[w.kind][0]}, ${w.marks} marks${w.prof ? ` including ${w.prof} professional marks` : ""}. Time allowed ${minutes(w)} minutes; I used ${Math.round(used / 60)}.`,
      "", "SCENARIO", ...w.scenario, "", "REQUIRED", ...w.reqs.map((r, k) => `(${"abcdefg"[k]}) ${r.text} (${r.marks} marks)`), w.prof ? `Professional marks: ${w.prof}` : "",
      "", "MY ANSWER", answer || "(empty)", "",
      "Please mark this as an SBR examiner would (not official): marks for each requirement and the professional marks, what earned marks, what was missing, and how to improve."].join("\n");
  }
  function attempt(b, w) {
    screen = "attempt"; here = { b };
    const st = wstore(), d = st.drafts[w.id] || (st.drafts[w.id] = { text: "", used: 0 }), limit = minutes(w) * 60;
    const box = el("textarea", { class: "sq-answer", rows: 18, placeholder: "Your answer. Use headings for each requirement, apply the rules to the facts, and finish with a conclusion.", "aria-label": "Your answer" });
    box.value = d.text;
    const info = el("div", { class: "sq-whud" });
    const show = () => { const leftS = limit - d.used; info.replaceChildren(el("span", { class: leftS < 0 ? "over" : "" }, leftS >= 0 ? `${clock(leftS)} left` : `${clock(-leftS)} over time`), el("span", {}, `${words(box.value)} words`)); };
    const keep = () => { d.text = box.value; wsave(st); };
    box.addEventListener("input", () => { keep(); show(); });
    view(isKit(w) ? head(kitName(w), `${w.marks} marks · ${minutes(w)} minutes. The clock runs while this page is open; your answer is kept as you type.`)
        : head(w.title, `${KINDS[w.kind][0]} · ${w.marks} marks${w.prof ? ` (${w.prof} professional)` : ""} · ${minutes(w)} minutes. The clock runs while this page is open; your answer is kept as you type.`),
      ...(isKit(w) ? [el("section", { class: "card sq-scenario" }, el("p", {}, `The question is in your Exam Kit at ${kitPage(w.q)}.`), w.kind === "q1" ? el("p", { class: "hint" }, KIT_SHEET) : w.kind === "mock" ? el("p", { class: "hint" }, "Sit it in a single go near the exam.") : "")] : [
      el("section", { class: "card sq-scenario" }, ...w.scenario.map((p) => el("p", {}, p))),
      el("section", { class: "card sq-reqs" }, el("h3", {}, "Required"), el("ol", { type: "a" }, ...w.reqs.map((r) => el("li", {}, `${r.text} `, el("b", {}, `(${r.marks} marks)`)))),
        w.prof ? el("p", { class: "hint" }, `Professional marks (${w.prof}) for ${PROF_FOR[w.kind]}.`) : "")]),
      markPanel(b, w),
      info, box,
      el("div", { class: "row" }, btn("Finish and see the marking points", () => { keep(); wfinish(b, w); }, true), btn("Save and leave", () => { keep(); written(b); }),
        btn("Start again", () => { if (confirm("Clear your answer and reset the clock?")) { delete st.drafts[w.id]; wsave(st); attempt(b, w); } }, false, "link")));
    show();
    timer = setInterval(() => { d.used++; if (d.used % 5 === 0) wsave(st); show(); }, 1000);
    setTimeout(() => box.focus(), 30);
  }
  function wfinish(b, w) {
    const st = wstore(), d = st.drafts[w.id] || { text: "", used: 0 }, sent = st.sent?.[w.id];
    const same = sent && sent.hash === textHash(d.text);     // opened again and finished without a change: not a new answer
    st.attempts.push({ id: w.id, at: Date.now(), words: words(d.text), used: d.used, ...(same ? { sent: sent.at } : {}) }); wsave(st);
    wdone(b, w, true);
  }
  const textHash = (t) => { let h = 0; for (const ch of String(t || "")) h = (h * 31 + ch.codePointAt(0)) | 0; return String(h); };
  // a finished answer: what a marker looks for, the answer itself, and sending it for marking. Once Study Quest is linked to Claude it
  // goes by itself (autoSend) through Sora's own server and the Telegram bot; otherwise by hand, through Telegram or as a file.
  function wdone(b, w, autoSend) {
    screen = "wfinish";
    const st = wstore(), d = st.drafts[w.id] || { text: "", used: 0 }, text = wtext(w, d.text, d.used);
    const short = isKit(w) ? `SBR written practice for marking: ${kitName(w)} [${w.id}], ${w.marks} marks. My answer is pasted below.\n\n`
      : `SBR written practice for marking: ${w.title} [${w.id}], ${w.marks} marks. The scenario, requirements and my answer are pasted below.\n\n`;
    const full = encodeURIComponent(text).length < 3500;
    const url = `https://t.me/${BOT}?text=${encodeURIComponent(full ? text : short)}`;
    const send = btn("Send for marking", () => { navigator.clipboard?.writeText(text).catch(() => {}); window.open(url, "_blank", "noopener"); }, true);
    send.dataset.href = url;
    const file = () => { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "text/plain" })), download: `${w.id}-${date(Date.now())}.txt` }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    const byHand = () => [el("p", { class: "hint" }, full ? "“Send for marking” opens Telegram with everything written out; it is also copied." : "Your answer is long, so “Send for marking” copies everything: paste it into the chat when Telegram opens. Or save it as a file and send the file."),
      el("div", { class: "row" }, send, btn("Save as a file", file))];
    const box = el("section", { class: "card sq-sending" }, ...(FRIENDS ? [el("div", { class: "row" }, btn("Save as a file", file))] : byHand()));
    const go = async () => {
      box.replaceChildren(el("p", {}, "Sending it to Claude…"));
      try {
        await sendForMarking(w, text);
        box.replaceChildren(el("p", { class: "sq-sent" }, `✓ Sent to Claude for marking at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. The marking comes back in Telegram.`),
          el("div", { class: "row" }, btn("Send it again", go, false, "link")));
      } catch (e) {
        box.replaceChildren(el("p", { class: "sq-err" }, e.message), el("div", { class: "row" }, btn("Try again", go, true, "small")), el("p", { class: "hint" }, "Or send it by hand:"), ...byHand());
      }
    };
    const sent = st.sent?.[w.id], already = sent && sent.hash === textHash(d.text), m = lastMark(w.id);
    if (!FRIENDS) markingLinked().then((on) => {
      if (screen !== "wfinish") return;
      if (on && already) box.replaceChildren(el("p", { class: "sq-sent" }, `✓ This answer was sent for marking on ${date(sent.at)}, unchanged since, so it isn't sent again.`),
        el("div", { class: "row" }, m ? btn("See the marking", () => markingView(b, w, m), true) : "", btn("Send it again anyway", go, false, "link")));
      else if (on && autoSend) go();
      else if (on) box.replaceChildren(el("div", { class: "row" }, btn("Send for marking", go, true)));
      else box.prepend(linkBox(go));
    });
    view(head(`${isKit(w) ? kitName(w) : w.title}: done`, `${words(d.text)} words in ${Math.round(d.used / 60)} of ${minutes(w)} minutes. Compare your answer with ${isKit(w) ? "the Kit's answer" : "the points below"}${FRIENDS ? "." : " while it's being marked."}`),
      isKit(w) ? el("section", { class: "card sq-guide" }, el("h3", {}, "What a marker looks for"), el("p", {}, `The Kit's answer and marking scheme start at ${kitPage(w.a)}.`))
      : el("section", { class: "card sq-guide" }, el("h3", {}, "What a marker looks for"),
        ...w.reqs.map((r, k) => el("div", {}, el("b", {}, `(${"abcdefg"[k]}) ${r.marks} marks`), el("ul", {}, ...r.guide.map((g) => el("li", {}, g))))),
        w.prof ? el("p", { class: "hint" }, `Professional marks (${w.prof}): ${PROF_FOR[w.kind]}, with a clear structure and a conclusion for each requirement.`) : ""),
      box,
      el("section", { class: "card" }, el("h3", {}, "Your answer"), el("pre", { class: "sq-mine" }, d.text || "(empty)")),
      el("div", { class: "row" }, btn("Write it again", () => { delete st.drafts[w.id]; wsave(st); attempt(b, w); }), btn("All written practice", () => written(b), false, "link")));
  }
  // ---------- the link to Claude for marking: a code pasted once, kept by Sora's server on this computer ----------
  const JSON_POST = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const markingLinked = () => api("/study-quest/marking").then((r) => !!r.linked, () => false);
  const linkCode = (code) => api("/study-quest/marking", JSON_POST({ code }));
  async function sendForMarking(w, text) {
    await api("/study-quest/send", JSON_POST({ id: w.id, title: isKit(w) ? kitName(w) : w.title, text }));
    const st = wstore(), last = [...st.attempts].reverse().find((a) => a.id === w.id), now = Date.now();
    if (last) last.sent = now;
    st.sent = { ...(st.sent || {}), [w.id]: { at: now, hash: textHash(st.drafts[w.id]?.text) } };
    wsave(st);
  }
  function linkBox(after) {
    const input = el("input", { type: "text", class: "sq-linkcode", placeholder: "sora-mark:…", "aria-label": "The code from Claude", autocomplete: "off", spellcheck: "false" });
    const msg = el("span", { class: "sq-err" });
    const go = () => linkCode(input.value).then(() => after(), (e) => { msg.textContent = e.message; });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    return el("div", { class: "sq-link" }, el("p", {}, "Link Study Quest to Claude once, and every answer you finish goes for marking by itself. Paste the code from Claude's message here:"),
      el("div", { class: "row" }, input, btn("Link", go, true, "small")), msg);
  }
  // a row's buttons in Written practice: a finished answer not sent yet can be sent; a marked one can be read; otherwise start or carry on
  function rowActions(b, w, st) {
    const d = st.drafts[w.id], last = [...st.attempts].reverse().find((a) => a.id === w.id), m = lastMark(w.id);
    const see = m ? btn("See the marking", () => markingView(b, w, m), false, "link") : "";
    if (!FRIENDS && last && !last.sent && d?.text) return el("span", { class: "row" }, btn("Send for marking", () => wdone(b, w, true), true), btn("Continue", () => attempt(b, w)), see);
    const go = btn(d?.text ? "Continue" : "Start", () => attempt(b, w), !d?.text);
    return m ? el("span", { class: "row" }, see, go) : go;
  }
  const answeredNote = (tries, w) => {
    const m = w && lastMark(w.id);
    return `${tries.length ? ` · answered ${tries.length}× (last ${date(tries[tries.length - 1].at)}${FRIENDS ? "" : tries[tries.length - 1].sent ? ", sent for marking" : ", not sent yet"})` : ""}${m ? ` · marked ${m.score} out of ${m.of}` : ""}`;
  };

  // ---------- Claude's markings: fetched through the link, kept in this browser so they show offline too ----------
  const MARKS_KEY = "sora.studyQuest.marks.v1", SEEN_KEY = "sora.studyQuest.marksSeen.v1";
  const readList = (key) => { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
  const marksCached = () => readList(MARKS_KEY).filter((m) => m && m.id);
  const markKey = (m) => `${m.id}@${m.at || ""}`;
  const lastMark = (id) => marksCached().filter((m) => m.id === id).sort((x, y) => String(x.at || "").localeCompare(String(y.at || ""))).pop() || null;
  const findW = (b, id) => [...(b.kit || []), ...(b.written || [])].find((x) => x.id === id) || null;
  const markDay = (m) => (/^\d{4}-\d\d-\d\d$/.test(m.at || "") ? date(C.dayOf(m.at)) : "");
  function seeMark(m) {
    const seen = new Set(readList(SEEN_KEY));
    if (!seen.has(markKey(m))) { seen.add(markKey(m)); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* full */ } }
  }
  // ask for the markings again (from Home at most every half minute; Written practice asks each time it opens); then() runs when
  // something has changed (a new marking has come)
  let marksAt = 0;
  function refreshMarks(then, force = false) {
    if (!force && Date.now() - marksAt < 30e3) return;
    marksAt = Date.now();
    api("/study-quest/marks").then((r) => {
      const got = JSON.stringify(r.marks || []);
      if (got !== localStorage.getItem(MARKS_KEY)) { try { localStorage.setItem(MARKS_KEY, got); } catch { /* full */ } if (then) then(); }
    }, () => { /* not linked or offline: the kept ones are shown */ });
  }
  const rich = (t) => String(t ?? "").split("**").map((part, i) => (i % 2 ? el("b", {}, part) : part));
  // a note's text: paragraphs, and "- " lines as a list; **bold** kept
  function noteText(say) {
    const out = [];
    let ul = null;
    for (const line of String(say || "").split("\n")) {
      if (line.startsWith("- ")) { if (!ul) out.push(ul = el("ul", {})); ul.append(el("li", {}, ...rich(line.slice(2)))); }
      else { ul = null; if (line.trim()) out.push(el("p", {}, ...rich(line))); }
    }
    return out;
  }
  const NOTE_KINDS = ["good", "part", "copy", "info"];
  const noteEl = (n) => el("div", { class: `sq-note ${NOTE_KINDS.includes(n.kind) ? n.kind : "info"}` },
    n.marks ? el("b", { class: "sq-note-marks" }, n.kind === "good" || n.kind === "part" ? `✓ ${n.marks}` : n.marks) : "", ...noteText(n.say));
  // the answer as it was marked, paragraph by paragraph, with the notes on each beside it (a note finds its paragraph by how it starts)
  function annotated(m) {
    if (!m.answer || !Array.isArray(m.notes) || !m.notes.length) return "";
    const norm = (t) => String(t || "").replace(/\s+/g, " ").trim(), used = new Set();
    const rows = String(m.answer).split("\n").map(norm).filter(Boolean).map((para) => {
      const mine = [];
      m.notes.forEach((n, i) => { if (!used.has(i) && n && n.at && para.startsWith(norm(n.at))) { used.add(i); mine.push(n); } });
      const kind = mine.find((n) => NOTE_KINDS.includes(n.kind))?.kind;
      return el("div", { class: `sq-ann-row${kind ? ` has-${kind}` : ""}` }, el("div", { class: "sq-ann-text" }, para), el("div", { class: "sq-ann-notes" }, ...mine.map(noteEl)));
    });
    const rest = m.notes.filter((n, i) => n && !used.has(i));
    return el("section", { class: "card sq-ann" }, el("h3", {}, "Your answer, with my notes"),
      el("div", { class: "sq-ann-head" }, el("span", {}, "What you wrote"), el("span", {}, "My notes")), ...rows,
      rest.length ? el("div", { class: "sq-ann-rest" }, el("h4", {}, "Other notes"), ...rest.map(noteEl)) : "");
  }
  // a marking: your answer with notes beside it, the marks part by part, what earned them and what didn't, an example, habits, and the
  // stages to play
  function markBody(b, m) {
    const stages = (m.stages || []).map((id) => allLists(b).find((l) => l.id === id)).filter(Boolean);
    return [
      annotated(m),
      m.parts?.length ? el("section", { class: "card sq-marks" }, el("h3", {}, "Marks"),
        el("ul", {}, ...m.parts.map((p) => el("li", {}, el("b", {}, `${p.name}: ${p.got} out of ${p.of}`), p.detail ? el("span", { class: "hint" }, ` · ${p.detail}`) : "")))) : "",
      ...(m.sections || []).map((sec) => el("section", { class: "card" }, el("h3", {}, sec.h || ""),
        Array.isArray(sec.items) ? el("ul", {}, ...sec.items.map((t) => el("li", {}, ...rich(t)))) : "", sec.quote ? el("blockquote", { class: "sq-model" }, ...rich(sec.quote)) : "")),
      stages.length ? el("section", { class: "card" }, el("h3", {}, "Stages to play for what you lost marks on"),
        el("div", { class: "row" }, ...stages.map((l) => btn(`${C.passed(prog, l.id) ? "✓ " : ""}${l.name}`, () => quiz(b, l.chapter, l), !C.passed(prog, l.id))))) : ""];
  }
  function markingView(b, w, m) {
    screen = "marking";
    seeMark(m);
    view(head(`${isKit(w) ? kitName(w) : w.title}: ${m.score} out of ${m.of}`, `Marked by Claude${markDay(m) ? ` on ${markDay(m)}` : ""}. ${m.summary || ""} The marking is in the ACCA style but not official.`),
      ...markBody(b, m),
      el("div", { class: "row" }, btn("Write it again", () => { const st = wstore(); delete st.drafts[w.id]; wsave(st); attempt(b, w); }), btn("All written practice", () => written(b), false, "link")));
  }
  // on the question itself, folded away: the last marking
  function markPanel(b, w) {
    const m = lastMark(w.id);
    return m ? el("details", { class: "card sq-lastmark" }, el("summary", {}, `Your last marking: ${m.score} out of ${m.of}${markDay(m) ? ` (${markDay(m)})` : ""}. Open it to read it again.`),
      ...markBody(b, m)) : "";
  }
  // on Home: a marking not read yet
  function markedCard(b) {
    if (FRIENDS) return "";
    const seen = new Set(readList(SEEN_KEY)), fresh = marksCached().filter((m) => !seen.has(markKey(m)) && findW(b, m.id));
    if (!fresh.length) return "";
    const m = fresh[fresh.length - 1], w = findW(b, m.id);
    return box("marked", "📝", "Marked by Claude", `${isKit(w) ? kitName(w) : w.title}: ${m.score} out of ${m.of}`,
      fresh.length > 1 ? `And ${fresh.length - 1} more marking${fresh.length > 2 ? "s" : ""} to read in Written practice.` : m.summary || "",
      [btn("See the marking", () => markingView(b, w, m), true)]);
  }

  const mixId = (b) => `${b.id}:mix`;
  // a card's lasting id: its stage and place in it
  function cardId(b, it) {
    for (const c of b.chapters) for (const l of c.lists) { const k = l.items.indexOf(it); if (k >= 0) return `${l.id}#${k}`; }
    return null;
  }
  function mixBoss(b) {
    const draw = C.mixDraw(C.mixPool(b, prog));
    quiz(b, null, null, { items: draw.map((x) => x.it), pool: allLists(b).flatMap((l) => l.items) });
  }
  // the mixed quiz on Home: open once passed Watch out, Compare and Apply stages cover two chapters
  function mixCard(b) {
    const pool = C.mixPool(b, prog), chapters = new Set(pool.map((x) => x.c.n)).size, rec = prog.lists[mixId(b)];
    const missedN = pool.filter((x) => prog.miss?.[x.cid]).length;
    return box("mix", "🎲", tr("If you have time"), tr("Mixed quiz"),
      chapters >= 2 ? `${tr("15 questions from {n} chapters, chapter shown after you answer", { n: chapters })}${missedN ? tr("; the {n} you missed come up more", { n: missedN }) : ""}.${rec?.plays ? ` ${tr("Best {n} %.", { n: Math.round(rec.best * 100) })}` : ""}`
        : tr("Opens once you've passed Watch out, Compare or Apply stages in two chapters."),
      [chapters >= 2 ? btn(tr("Play the mixed quiz"), () => mixBoss(b), true) : "", chapters >= 2 && COINS ? potEl(mixPot(pool), { big: true }) : ""]);
  }
  // the mixed quiz's coins: fifteen questions from the pool, by kind and the clock
  function mixPot(pool) {
    const items = pool.map((x) => x.it), n = Math.min(15, items.length), o = potOpts();
    const avg = items.length ? items.reduce((t, it) => t + SC.weight(C.kindOf(it), o.typed), 0) / items.length : 0;
    return { total: Math.round(avg * n * o.factor), extras: [], due: false, mult: 1 };
  }
  function stageNo(l) { return `${l.chapter.n}.${l.chapter.lists.indexOf(l) + 1}`; }
  // a chapter's (or section's) coins on its tile: still to win, and today's when a review is due
  const chapterPotEl = (cp) => el("span", { class: "sq-chpot" }, el("span", { class: `coin-pot ${cp.total && !(cp.done && !cp.today) ? "" : "calm"}`.trim() }, `🪙 ${num(cp.total)}`),
    cp.today ? el("span", { class: "coin-tag hot" }, tr("×2 today")) : "");

  // ---------- Reviews: a section of its own in every subject of the apps with coins (the user, 18.11.2026), so the reviews get done ----------
  // stages you've passed come back after 1, 3, 6 and 12 days; a review on its day earns double coins, and days in a row earn more
  const dayKey = () => C.startOfDay(Date.now());
  // days of reviews in a row: a day with nothing due (seen when the game was opened) doesn't break them; today counts once it's done
  function reviewStreak() {
    const did = new Set(prog.reviewDays || []), clear = new Set(prog.clearDays || []);
    let d = dayKey(), n = 0;
    if (!did.has(d)) d = C.startOfDay(d - C.DAY / 2);
    while (did.has(d) || clear.has(d)) { if (did.has(d)) n++; d = C.startOfDay(d - C.DAY / 2); }
    return n;
  }
  function markClear(lists, dueIds) {
    const d = dayKey();
    if (dueIds.length || !lists.some((l) => C.passed(prog, l.id)) || (prog.clearDays || []).includes(d)) return;
    prog.clearDays = [...(prog.clearDays || []), d].slice(-60); commit();
  }
  function reviewTile(b, lists, dueIds) {
    const passed = lists.filter((l) => C.passed(prog, l.id)), soonest = passed.map((l) => prog.lists[l.id].due).filter((t) => t && t > Date.now()).sort((x, y) => x - y)[0];
    const status = dueIds.length ? tr("{n} due today{double}", { n: dueIds.length, double: COINS ? tr(" · double coins") : "" })
      : passed.length ? (soonest ? tr("Nothing due · next {when}", { when: when(soonest) }) : tr("Nothing due")) : tr("Pass a stage, and it comes back here");
    const o = potOpts(), worth = dueIds.reduce((t, id) => t + SC.stagePot(lists.find((l) => l.id === id), prog.lists[id], o).total, 0);
    return el("button", { type: "button", class: `sq-revtile ${dueIds.length ? "due" : ""}`.trim(), onclick: () => reviews(b), "aria-label": `${tr("Reviews")}. ${status}` },
      el("span", { class: "sq-revsign" }, "🔁"), el("span", { class: "sq-revtext" }, el("b", {}, tr("Reviews")), el("small", {}, status)),
      worth ? el("span", { class: "sq-revpot" }, el("span", { class: "coin-pot big" }, `🪙 +${num(worth)}`), el("span", { class: "coin-tag hot" }, tr("×2 today"))) : "",
      el("span", { class: "sq-revgo" }, dueIds.length ? tr("Today ▶") : "▶"));
  }
  function reviews(b) {
    screen = "reviews";
    const lists = allLists(b), due = C.due(prog, lists.map((l) => l.id)).map((id) => lists.find((l) => l.id === id));
    const later = lists.filter((l) => C.passed(prog, l.id) && prog.lists[l.id].due > Date.now()).sort((x, y) => prog.lists[x.id].due - prog.lists[y.id].due).slice(0, 6);
    const streak = reviewStreak(), o = potOpts(), potOf = (l) => SC.stagePot(l, prog.lists[l.id], o), worth = due.reduce((t, l) => t + potOf(l).total, 0);
    view(head(tr("Reviews"), tr("Stages you've passed come back after 1, 3, 6 and 12 days, so you keep them. Play each again when it's due.")),
      el("div", { class: "sq-dash" },
        el("section", { class: "sq-box sq-due sq-wide" }, el("div", { class: "sq-box-head" }, el("span", { class: "sq-sign" }, "🔁"), el("small", {}, tr("Due today"))),
          el("b", { class: "sq-box-title" }, due.length ? tr("{n} {stages} to review", { n: due.length, stages: tr.n(due.length, "stage", "stages") }) : tr("Nothing due today")),
          worth ? el("div", { class: "sq-pot" }, el("span", { class: "coin-pot huge" }, `🪙 +${num(worth)}`), el("span", { class: "coin-tag hot" }, tr("×2 today"))) : "",
          COINS ? el("p", { class: "hint" }, tr("Reviews earn double coins, and 5 more each when done on time. Days in a row: {n} (7 in a row earns 20 more, 30 earns 100).", { n: streak })) : el("p", { class: "hint" }, tr("Days in a row: {n}", { n: streak })),
          due.length ? el("div", { class: "row sq-act" }, btn(worth ? tr("Review all due ▶ 🪙 +{n}", { n: num(worth) }) : tr("Review all due ▶"), () => { reviewQueue = due.map((l) => l.id); quiz(b, due[0].chapter, due[0]); }, true)) : "",
          due.length ? el("ul", { class: "sq-revlist" }, ...due.map((l) => el("li", {}, el("span", {}, el("b", {}, l.name), " ", el("small", { class: "hint" }, `${partName(b, l.chapter)} · ${tr("due {when}", { when: when(prog.lists[l.id].due) })}`)),
            el("span", { class: "row" }, el("span", { class: "coin-pot" }, `🪙 +${num(potOf(l).total)}`), btn(tr("Play"), () => { reviewQueue = []; quiz(b, l.chapter, l); }, false, "small"))))) : ""),
        later.length ? el("section", { class: "sq-box sq-asked" }, el("div", { class: "sq-box-head" }, el("span", { class: "sq-sign" }, "📅"), el("small", {}, tr("Coming up"))),
          el("ul", { class: "sq-revlist" }, ...later.map((l) => el("li", {}, el("span", {}, l.name), el("small", { class: "hint" }, when(prog.lists[l.id].due)))))) : ""),
      el("div", { class: "row sq-foot" }, btn(tr(onePart(b) ? "← Stages" : bySection(b) ? "← Sections" : "← Chapters"), home, false, "link")));
  }
  // ---------- coins on show: what each task can still give (SoraCoins works it out from the book and its progress) ----------
  const potOpts = () => ({ typed: S.answer === "recall", factor: SC.clockFactor(Number(S.time)), now: Date.now(), today: C.startOfDay(Date.now()) });
  const TAGS = { ontime: "on time +5", pass: "first pass +10", stars: "★★★ +10", boss: "first win +30" };
  // a pot: gold and shining while there's more than a replay in it, calm once only replays are left; locked ones show their prize
  function potEl(pot, { locked = false, big = false } = {}) {
    if (!COINS || !pot) return "";
    const calm = !pot.due && !pot.extras.length;
    return el("div", { class: "sq-pot" },
      el("span", { class: `coin-pot ${big ? "big" : ""} ${calm ? "calm" : ""} ${locked ? "locked" : ""}`.replace(/\s+/g, " ").trim(), title: tr("Coins this can still give you") },
        `${locked ? "🔒 " : ""}🪙 +${num(pot.total)}`),
      calm ? "" : el("div", { class: "coin-tags" }, pot.due ? el("span", { class: "coin-tag hot" }, tr("×2 today")) : "",
        ...pot.extras.map(([k]) => el("span", { class: "coin-tag" }, tr(TAGS[k])))));
  }
  // the subject's coins on Home: everything still to win, what's due today, how much is collected; the balance is in the corner
  function subjectPot(sum) {
    const pct = sum.once ? Math.round((sum.got / sum.once) * 100) : 0;
    return el("a", { class: "sq-coins", href: window.SORA_ACCOUNT_PAGE || "#", title: tr("Coins still to win in this subject; your balance is in the corner") },
      el("small", {}, tr("To win here")), el("span", { class: "coin-pot big" }, `🪙 ${num(sum.total)}`),
      sum.today ? el("span", { class: "coin-tag hot" }, tr("today 🪙 {n}", { n: num(sum.today) })) : "",
      el("span", { class: "sq-collected", "aria-hidden": "true" }, el("i", { style: `width:${pct}%` })),
      el("small", {}, tr("{p} % collected", { p: pct })));
  }
  function noteBook(b) { if (COINS) SC.noteBook(b.id, SC.bookSummary(b, prog, potOpts())); }
  // a round's coins: each right answer by how hard it was (typed 2, picked 1, true or false ½, scenarios and orders 1½) and by the clock
  // (none ×0.75, 10 s ×1.25); a review that's due counts double, a replay of a stage already passed and not due a quarter. One-time
  // extras: a first pass +10, three stars +10, a final round +30, a whole chapter or section +50; a review passed on its day +5; 7 days
  // of reviews in a row +20, 30 days +100
  function roundCoins({ b, c, l, mix, log, typed, prev, wasPassed, wasDue, partWasDone, score, id, rec }) {
    let n = log.filter((x) => x.ok).reduce((s, x) => s + SC.weight(C.kindOf(x.item), typed), 0) * SC.clockFactor(Number(S.time));
    const review = !mix && wasDue;
    if (review) n *= 2; else if (!mix && wasPassed) n *= 0.25;
    const tag = `${b.id}:${id}`, where = mix ? tr("Mixed quiz") : l ? l.name : tr("Boss round"), out = [];
    out.push({ id: `${tag}:${Date.now()}`, n: Math.round(n), why: `${where} · ${Math.round(score * 100)} %${review ? ` · ${tr("review")}` : ""}`, k: review ? "review" : "study" });
    if (review && score >= C.PASS) {        // a review done (passed): 5 more, and a day of reviews towards the days in a row
      out.push({ id: `${tag}:ontime:${dayKey()}`, n: 5, why: tr("Review on time: {stage}", { stage: where }), k: "review" });
      prog.reviewDays = [...new Set([...(prog.reviewDays || []), dayKey()])].slice(-60);
      const streak = reviewStreak();
      prog.reviewsOnTime = (prog.reviewsOnTime || 0) + 1; prog.bestReviewRun = Math.max(prog.bestReviewRun || 0, streak);      // for the medals
      if (streak === 7 || streak === 30) out.push({ id: `${b.id}:streak${streak}:${dayKey()}`, n: streak === 7 ? 20 : 100, why: tr("{n} days of reviews in a row", { n: streak }), k: "review" });
    }
    if (!mix && l && !wasPassed && C.passed(prog, id)) out.push({ id: `${tag}:pass`, n: 10, why: tr("First pass: {stage}", { stage: l.name }), k: "study" });
    if (!mix && l && (prev?.stars || 0) < 3 && rec.stars === 3) out.push({ id: `${tag}:3stars`, n: 10, why: tr("Three stars: {stage}", { stage: l.name }), k: "study" });
    if (!mix && !l && score >= C.PASS && !((prev?.best || 0) >= C.PASS)) out.push({ id: `${tag}:boss`, n: 30, why: tr("Final round passed: {part}", { part: partName(b, c) }), k: "study" });
    if (!mix && c && !partWasDone && c.lists.every((x) => C.passed(prog, x.id))) out.push({ id: `${b.id}:done:${c.n}`, n: 50, why: tr("{part} finished", { part: partName(b, c) }), k: "study" });
    return out.filter((e) => e.n > 0);
  }

  function home() {
    screen = "home"; books = C.books(); reviewQueue = [];        // "Review all due" lasts while its Next review buttons are followed
    const b = book(); bookId = b?.id;
    if (!b) return view(head("No books yet", "Import a list file in Memory Palace to study it here."));
    const r = C.rank(prog.xp), lists = allLists(b), ids = lists.map((l) => l.id), dueIds = C.due(prog, ids), o = COINS ? potOpts() : null;
    if (COINS) markClear(lists, dueIds);
    const streak = prog.streak.last >= C.startOfDay(Date.now()) - C.DAY ? prog.streak.days : 0;
    const one = onePart(b);     // a book in one part (Surah Numbers): its stages on Home, no chapters
    const pct = r.next ? Math.round(((prog.xp - r.from) / (r.next[0] - r.from)) * 100) : 100;
    const made = b.chapters.filter((c) => c.lists.length).length, p = C.plan(b, prog);
    const planOn = !!b.plan?.sessions?.length && b.plan.sessions.some((x) => !sessionState(b, x).done);     // the plan's Today card leads
    // the chapter to carry on with, marked on its tile (not while the plan's Today card says what to do)
    const nextUp = planOn ? null : (() => { const ns = nextStage(b); return ns?.next ? { chapter: ns.next.chapter, last: ns.last } : null; })();
    if (b.id === "sbr" && !FRIENDS) refreshMarks(() => { if (screen === "home") home(); });
    view(
      books.length > 1 ? el("div", { class: "sq-tabs" }, ...books.map((x) => el("button", { type: "button", class: x.id === b.id ? "on" : "", onclick: () => { bookId = x.id; home(); } }, x.name))) : "",
      el("section", { class: "sq-top" },
        el("div", {}, el("h2", {}, `${b.name}: ${b.title}`), el("p", { class: "hint" }, one || bySection(b) ? `${b.about}.` : tr("{about}. {made} of {all} chapters ready.", { about: b.about, made, all: b.chapters.length }))),
        el("div", { class: "sq-rank" }, el("small", {}, tr("Rank")), el("b", {}, tr(r.name)), el("div", { class: "sq-meter" }, el("i", { style: `width:${pct}%` })),
          el("small", {}, r.next ? tr("{xp} / {next} points to {rank}", { xp: num(prog.xp), next: num(r.next[0]), rank: tr(r.next[1]) })
            : tr("{xp} {points}", { xp: num(prog.xp), points: tr.n(prog.xp, "points", "points") }))),
        el("div", { class: "sq-streak" }, el("b", {}, String(streak)), el("small", {}, tr.n(streak, "days in a row", "days in a row"))),
        COINS ? subjectPot(SC.bookSummary(b, prog, o)) : ""),
      p ? el("section", { class: "sq-plan" }, el("b", {}, p.days > 0 ? `${p.days} day${p.days === 1 ? "" : "s"} to the exam` : p.days === 0 ? "The exam is today. Good luck!" : "The exam date has passed"),
        p.days > 0 ? el("span", {}, new Date(p.exam).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })) : "",
        el("span", { class: "sq-passed" }, p.left ? (planOn ? `Study Quest: ${p.total - p.left} of ${p.total} stages passed`
          : `${p.total - p.left} of ${p.total} stages passed · pass ${p.perDay} new stage${p.perDay === 1 ? "" : "s"} a day${p.days > 7 ? ", then use the last week for review" : ""}`) : `All ${p.total} stages passed: keep up the reviews`),
        p.days >= 0 && p.days <= 10 && p.total > p.left ? btn("Final sweep: review every passed stage", () => sweep(b), false, "small") : "") : "",
      // the mixed quiz needs two chapters, so a book with one so far doesn't show it; the reviews are the Reviews bar's, but for a book
      // with a study plan (SBR), whose card keeps to the plan's reviews a day
      dash(todayCard(b), markedCard(b), dueIds.length && (!COINS || b.plan) ? dueCard(b, lists, dueIds) : "", made >= 2 ? mixCard(b) : "", writtenCard(b), askedCard(b)),
      COINS ? reviewTile(b, lists, dueIds) : "",
      ...(one ? [el("div", { class: "sq-chapters-head" }, el("h3", {}, tr("Stages"))), ...stageBoard(b, b.chapters[0])] : [
      el("div", { class: "sq-chapters-head" }, el("h3", {}, partsName(b)),
        el("div", { class: "sq-legend" }, el("span", { class: "done" }, tr("✓ Done")), el("span", { class: "started" }, tr("In progress")), el("span", { class: "new" }, tr("Not started")))),
      el("div", { class: "sq-map" }, ...b.chapters.map((c) => {
        const cs = chapterState(c), got = c.lists.reduce((s, l) => s + (prog.lists[l.id]?.stars || 0), 0), max = c.lists.length * 3;
        const carryOn = nextUp && nextUp.chapter.n === c.n;
        // what's inside a chapter shows when it's opened: the tile says only how far along it is
        const status = tr(cs.state === "done" ? "✓ Done" : cs.state === "started" ? "In progress" : cs.state === "new" ? "Not started" : "Coming");
        const tile = el("button", { type: "button", class: `sq-ch ${cs.state} ${max && got === max ? "full" : ""} ${carryOn ? "next" : ""}`.trim(), onclick: () => chapter(b, c),
          "aria-label": `${bySection(b) ? `${c.title}. ${status}` : tr("Chapter {n}: {title}. {status}", { n: c.n, title: c.title, status })}${carryOn ? tr(". Carry on here") : ""}` },
          carryOn ? el("span", { class: "sq-next" }, tr(cs.state === "new" && !nextUp.last ? "Start here ▶" : "Continue ▶")) : "",
          el("span", { class: "n" }, cs.state === "done" ? "✓" : String(c.n)), el("b", {}, `${cs.state === "done" ? c.n + ". " : ""}${c.title}`),
          el("small", { class: "st" }, status),
          COINS && c.lists.length ? chapterPotEl(SC.chapterPot(b, c, prog, o)) : "",
          c.lists.length ? el("span", { class: "bar" }, el("i", { style: `width:${Math.round((cs.passedN / cs.total) * 100)}%` })) : "");
        tile.disabled = !c.lists.length;
        return tile;
      }))]));
    noteBook(b);
  }

  // ---------- questions about a card: asked through the Telegram bot, kept in a list here ----------
  const BOT = "Ameen_Audit_Manager_bot", ASKED_KEY = "sora.studyQuest.asked.v1";
  const asked = () => { try { return JSON.parse(localStorage.getItem(ASKED_KEY) || "[]") || []; } catch { return []; } };
  function askText(it, where, given, ok) {
    const lines = [`Study Quest question: ${where}`, `Card: ${C.sentence(it)}`, it.why ? `Explanation: ${it.why}` : "",
      given !== undefined ? `My answer: ${given || "(none)"} (${ok ? "right" : "wrong"})` : ""].filter(Boolean);
    return `${lines.join("\n")}\n\nMy question: `;
  }
  function askButton(it, where, given, ok) {
    if (FRIENDS) return "";
    const text = askText(it, where, given, ok);
    const a = el("a", { class: "button small sq-ask", href: `https://t.me/${BOT}?text=${encodeURIComponent(text)}`, target: "_blank", rel: "noopener" }, "Ask about this");
    a.addEventListener("click", () => {
      try { localStorage.setItem(ASKED_KEY, JSON.stringify([{ at: Date.now(), where, sentence: C.sentence(it) }, ...asked()].slice(0, 200))); } catch { /* storage full */ }
      navigator.clipboard?.writeText(text).catch(() => {});   // in case Telegram opens without the text
    });
    return a;
  }
  // where a card comes from, for the message: "Chapter 18 · 18.1 Control and consolidation"
  function whereOf(b, it) {
    for (const c of b.chapters) for (const l of c.lists) if (l.items.includes(it)) return tr("{book}, chapter {n} · {stage}", { book: b.name, n: c.n, stage: l.name });
    return b.name;
  }
  function askedCard(b) {
    const list = asked().filter((q) => !q.where || q.where.startsWith(b.name));
    if (!list.length) return "";
    return box("asked", "❓", "My questions", `${list.length} card${list.length === 1 ? "" : "s"} asked about`, "The answers are in the chat with the bot.", [],
      [el("ul", {}, ...list.slice(0, 30).map((q) => el("li", {}, el("small", {}, `${date(q.at)} · ${q.where}`), el("div", {}, q.sentence)))),
        btn("Clear the list", () => { if (confirm("Clear the list of questions? The Telegram chat is not affected.")) { localStorage.removeItem(ASKED_KEY); home(); } }, false, "link")], "See them");
  }

  // the final week: every stage passed so far becomes due again, so the whole book gets one more pass
  function sweep(b) {
    const now = Date.now();
    for (const l of allLists(b)) if (C.passed(prog, l.id)) prog.lists[l.id].due = now;
    commit(); home();
  }
  // ---------- the plan to the exam (book.plan): today's session, ticked off by itself when its stages are passed or its Kit question is
  // answered, or by hand. Kept by session id (the first plan kept numbers: those are ignored).
  const planDone = () => new Set((prog.plan?.done || []).filter((x) => typeof x === "string"));
  function setPlanDone(id, on) {
    const d = planDone();
    if (on) d.add(id); else d.delete(id);
    prog.plan = { ...(prog.plan || {}), done: [...d] };
    commit();
  }
  function sessionState(b, s) {
    const st = wstore(), stages = (s.stages || []).map((id) => allLists(b).find((l) => l.id === id)).filter(Boolean), kit = s.kit ? (b.kit || []).find((w) => w.id === s.kit) : null;
    const auto = stages.length + (kit ? 1 : 0) > 0 && stages.every((l) => C.passed(prog, l.id)) && (!kit || st.attempts.some((a) => a.id === kit.id));
    return { stages, kit, byHand: planDone().has(s.id), done: planDone().has(s.id) || auto };
  }
  const shortDate = (on) => new Date(C.dayOf(on)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  function todayCard(b) {
    const ss = b.plan?.sessions || [];
    if (!ss.length) return "";
    const st = wstore(), states = ss.map((s) => sessionState(b, s)), isDone = (s, j) => states[j].done;
    const k = C.planToday(ss, isDone), up = C.planNext(ss, isDone), doneN = states.filter((x) => x.done).length;
    // the whole plan, each session marked off; any can be marked done (or undone) by hand
    const whole = el("details", { class: "sq-planlist" }, el("summary", {}, `The whole plan (${doneN} of ${ss.length} done)`),
      el("ol", {}, ...ss.map((s, j) => el("li", { class: states[j].done ? "done" : j === k ? "now" : "" }, el("span", {}, `${states[j].done ? "✓ " : ""}${s.on ? `${shortDate(s.on)} · ` : ""}${s.title}`),
        states[j].byHand ? btn("Not done", () => { setPlanDone(s.id, false); home(); }, false, "link") : states[j].done ? "" : btn("Done", () => { setPlanDone(s.id, true); home(); }, false, "link")))));
    const coming = up >= 0 ? el("p", { class: "sq-coming" }, el("b", {}, `Coming up on ${longDate(ss[up].on)}:`), ` ${ss[up].title}`) : "";
    if (k < 0) return box("today", "📅", "Your plan", doneN === ss.length ? "Every session done" : "You're ahead of the plan",
      doneN === ss.length ? "Keep up the reviews and the mixed quiz until the exam." : "Nothing more is planned before the day below.", [], [coming, whole], "The plan");
    const s = ss[k], x = states[k], w = x.kit, draft = w && st.drafts[w.id]?.text;
    // what to do, step by step (folded away: the card keeps the title, one line and the buttons)
    const steps = w ? [`Read the question in your Exam Kit: ${kitPage(w.q)}.`, `Press Start. A ${minutes(w)}-minute clock runs while you type your answer.`, ...(s.sheet ? [s.sheet] : []),
        "When you've finished, press Finish, then Send for marking. I'll mark it and tell you what to go over."]
      : x.stages.length ? ["Play each stage until it's passed. Cards shows what's in a stage first."] : s.steps || [];
    const rows = x.stages.map((l) => el("div", { class: "sq-trow" },
      el("span", {}, el("b", {}, l.name), el("small", { class: "hint" }, C.passed(prog, l.id) ? " · ✓ passed" : prog.lists[l.id]?.plays ? ` · best ${Math.round(prog.lists[l.id].best * 100)} %` : "")),
      el("span", { class: "row" }, btn("Cards", () => cards(b, l.chapter, l), false, "small"), btn("Play", () => quiz(b, l.chapter, l), !C.passed(prog, l.id), "small"))));
    const done = () => { setPlanDone(s.id, true); home(); };
    const nextL = x.stages.find((l) => !C.passed(prog, l.id));
    const line = w ? el("p", { class: "sq-what" }, `${kitWhat(w)} · ${w.marks} marks · ${minutes(w)} minutes`)
      : x.stages.length ? `${x.stages.filter((l) => C.passed(prog, l.id)).length} of ${x.stages.length} stages passed` : s.note || "";
    const actions = w ? [btn(draft ? "Continue" : "Start", () => attempt(b, w), true), btn("Mark as done", done, false, "link")]
      : x.stages.length ? [nextL ? btn(`Play ${nextL.name.split(" ")[0]}`, () => quiz(b, nextL.chapter, nextL), true) : "", btn("Mark as done", done, false, "link")]
      : [btn("Done", done, true)];
    return box("today", "📅", s.on ? `Today · ${longDate(s.on)}` : `Today · session ${k + 1} of ${ss.length}`, s.title, line, actions,
      [w && s.note ? el("p", { class: "hint" }, s.note) : "", el("ol", { class: "sq-todo" }, ...steps.map((t) => el("li", {}, t))), ...rows, coming, whole], "How to do it");
  }
  // the stages due for review: a few a day (Settings), the chapters the exam leans on most first, then the longest overdue
  function dueCard(b, lists, dueIds) {
    const cap = Number(S.reviews), pri = b.plan?.priority || [], today = C.startOfDay(Date.now());
    const rankOf = (l) => { const k = pri.indexOf(l.chapter.n); return k < 0 ? pri.length : k; };
    const due = dueIds.map((id) => lists.find((x) => x.id === id)).sort((a, z) => rankOf(a) - rankOf(z) || prog.lists[a.id].due - prog.lists[z.id].due);
    // reviews already done today: passed stages played again today
    const doneToday = lists.filter((l) => C.passed(prog, l.id) && prog.lists[l.id].plays > 1 && prog.lists[l.id].last >= today).length;
    const shown = cap ? due.slice(0, Math.max(0, cap - doneToday)) : due, waiting = due.length - shown.length;
    if (!shown.length) return box("due", "🔁", tr("Reviews"), tr("Today's reviews done"), tr("{n} more {wait} for another day; change how many a day in Settings.", { n: waiting, wait: tr.n(waiting, "waits", "wait") }));
    return box("due", "🔁", tr("Reviews · a few minutes each"), tr("Play {n} {stages} again today", { n: shown.length, stages: tr.n(shown.length, "stage", "stages") }),
      `${tr("So you don't forget them.")}${waiting ? ` ${tr("{n} more {wait} for other days.", { n: waiting, wait: tr.n(waiting, "waits", "wait") })}` : ""}`,
      shown.map((l) => { const x = btn(l.name, () => quiz(b, l.chapter, l), false, "small sq-chip"); x.title = l.name;
        if (COINS) x.append(" ", el("span", { class: "coin-pot calm" }, `🪙 +${num(SC.stagePot(l, prog.lists[l.id], potOpts()).total)}`));
        return x; }));
  }

  // a stage can be stored along a route in Memory Palace (the method of loci); once stored, recall it there
  function palaceButton(l) {
    // only stages that are real lists or checklists (tagged "palace") go along a route
    if (!l.palace || l.items.length > 15 || l.items.some((it) => C.kindOf(it) !== "sentence")) return "";
    const found = C.palaceList(l.id);
    return found ? el("a", { class: "button small sq-palace", href: `/memory-palace/?recall=${encodeURIComponent(found.list.id)}` }, "Recall in the palace")
      : el("a", { class: "button small sq-palace", href: `/memory-palace/?store=${encodeURIComponent(l.id)}` }, "Store in a palace");
  }

  const TRACKS = [["know", "Know", "definitions, concepts"], ["structure", "Structure", "steps, proformas"],
    ["compare", "Compare", "alike but different"], ["watch", "Watch out", "nuances, traps"], ["apply", "Apply", "scenarios"]];

  // ---------- a chapter: its stages and the boss round ----------
  // a chapter's stages and its boss round: on the chapter's page, or on Home for a book in one part
  function stageBoard(b, c) {
    const allPassed = c.lists.every((l) => C.passed(prog, l.id)), boss = prog.lists[bossId(b, c)], one = onePart(b), o = COINS ? potOpts() : null;
    const tracks = TRACKS.filter(([t]) => c.lists.some((l) => trackOf(l) === t));
    return [
      // the kinds of practice side by side, left to right, each with its stages stacked underneath; one kind alone needs no heading, and
      // its stages go across the page
      el("div", { class: `sq-board${tracks.length === 1 ? " single" : ""}` }, ...tracks.map(([t, title, about]) => el("div", { class: "sq-col" }, tracks.length === 1 ? "" : el("div", { class: "sq-track" }, el("h3", {}, tr(title)), el("span", {}, tr(about))),
      el("div", { class: "sq-stack" }, ...c.lists.map((l, k) => [l, k]).filter(([l]) => trackOf(l) === t).map(([l, k]) => {
        const p = prog.lists[l.id], ok = open(c, k);
        const isNext = ok && !C.passed(prog, l.id) && c.lists.findIndex((x) => trackOf(x) === t && !C.passed(prog, x.id)) === k;
        return el("section", { class: `sq-stage ${ok ? "" : "locked"} ${C.passed(prog, l.id) ? "passed" : ""} ${isNext ? "next" : ""}`.replace(/\s+/g, " ").trim() },
          isNext ? el("span", { class: "sq-next" }, tr("Next")) : "",
          el("div", { class: "sq-stage-head" }, el("span", { class: "n" }, String(c.lists.filter((x, j) => j <= k && trackOf(x) === t).length)), el("b", {}, l.name), starRow(p?.stars || 0)),
          COINS ? potEl(SC.stagePot(l, p, o), { locked: !ok }) : "",
          el("p", { class: "hint" }, l.about || tr("{n} {items}", { n: l.items.length, items: tr.n(l.items.length, "item", "items") })),
          el("div", { class: "sq-stage-foot" }, el("small", { class: `st ${C.passed(prog, l.id) ? "done" : p?.plays ? "started" : ""}`.trim() }, !ok ? tr("Pass the stage before to open it")
            : C.passed(prog, l.id) ? `${tr("✓ Passed · best {n} %", { n: Math.round(p.best * 100) })}${p.due ? tr(" · review {when}", { when: when(p.due) }) : ""}`
            : p?.plays ? tr("Played · best {n} % · not passed yet (80 % needed)", { n: Math.round(p.best * 100) })
            : tr("Not started · {n} {items}", { n: l.items.length, items: tr.n(l.items.length, "item", "items") })),
          ok ? el("div", { class: "row" }, btn(tr("Cards"), () => cards(b, c, l), false, "small"), btn(tr("Play"), () => quiz(b, c, l), true, "small"), palaceButton(l)) : ""));
      }))))),
      el("div", { class: "sq-stages" }, c.lists.length > 1 ? el("section", { class: `sq-stage boss ${allPassed || !S.order ? "" : "locked"}`.trim() },
        el("div", { class: "sq-stage-head" }, el("span", { class: "n" }, "★"), el("b", {}, tr("Boss round")), starRow(boss?.stars || 0)),
        COINS ? potEl(SC.bossPot(b, c, prog, o), { locked: !(allPassed || !S.order), big: true }) : "",
        el("p", { class: "hint" }, tr(one ? "15 questions from every stage, faster clock." : bySection(b) ? "15 questions from every stage of the section, faster clock." : "15 questions from every stage of the chapter, faster clock.")),
        allPassed || !S.order ? el("div", { class: "row" }, btn(tr("Fight the boss"), () => quiz(b, c, null), true)) : el("small", {}, tr("Pass every stage to open it"))) : "")];
  }
  function partPotEl(b, c) {
    const cp = SC.chapterPot(b, c, prog, potOpts());
    return el("div", { class: "sq-partpot" }, el("span", { class: "coin-pot big" }, `🪙 ${num(cp.total)}`), el("b", {}, tr(bySection(b) ? "to win in this section" : "to win in this chapter")),
      cp.today ? el("span", { class: "coin-tag hot" }, tr("today 🪙 {n}", { n: num(cp.today) })) : "",
      cp.done ? "" : el("span", { class: "coin-tag" }, tr("+50 for finishing it")));
  }
  function chapter(b, c) {
    if (onePart(b)) return home();      // its stages are on Home
    screen = "chapter"; here = { b, c };
    view(head(bySection(b) ? c.title : tr("Chapter {n}: {title}", { n: c.n, title: c.title }), `${c.pages ? tr("Book pages {pages}. ", { pages: c.pages }) : ""}${tr("Look at the cards, then play the stage. 80 % passes it and opens the next one.")}`),
      COINS ? partPotEl(b, c) : "",
      ...stageBoard(b, c),
      // Memory Palace is Sora personal's: the websites don't carry it
      el("div", { class: "row sq-foot" }, btn(`← ${partsName(b)}`, home, false, "link"), FRIENDS ? "" : btn("Store a list in Memory Palace", () => (location.href = "/memory-palace/"), false, "link")));
  }

  // an explanation laid out in parts: "Rule: … Applied: … Common mistake: …" or "Step 1 (…): …" each on its own line
  const WHY_PARTS = /(?=\b(?:Reference:|P\/L category:|Users:|Step \d+(?: \([^)]*\))?:|Rule(?: of thumb[^:]*)?:|Why(?: \([^)]*\))?:|Applied:|Accounting:|Ethics:|Also:|So:|Common mistakes?:))/;
  function whyEl(text, cls = "") {
    let parts = String(text).split(WHY_PARTS).map((x) => x.trim()).filter(Boolean);
    // "Reference: IFRS 13, para 9. The rest…": the reference is its own line even when the rest has no labelled parts
    if (parts[0]?.startsWith("Reference:")) { const cut = parts[0].search(/\.\s(?=[A-Z0-9'"‘“(])/); if (cut > 0) parts = [parts[0].slice(0, cut + 1), parts[0].slice(cut + 2), ...parts.slice(1)].filter(Boolean); }
    if (parts.length < 2) return el("p", { class: cls }, text);
    return el("div", { class: `sq-whyparts ${cls}`.trim() }, ...parts.map((part) => {
      const m = part.match(/^((?:Reference|P\/L category|Users|Step \d+(?: \([^)]*\))?|Rule(?: of thumb[^:]*)?|Why(?: \([^)]*\))?|Applied|Accounting|Ethics|Also|So|Common mistakes?)):\s*(.*)$/s);
      return m ? el("p", {}, el("b", {}, `${m[1]}: `), m[2]) : el("p", {}, part);
    }));
  }

  // ---------- cards: the item and its picture, turn over for the answer ----------
  const FRONT_HINT = { order: "Say the steps in order, then click to turn over", any: "Name everything that belongs, then click to turn over", sort: "Decide which, then click to turn over", tf: "True or false? Decide why, then click to turn over",
    case: "Decide the treatment, then click to turn over" };
  function cardFront(it) {
    const k = C.kindOf(it);
    if (k === "sentence") return el("div", {}, el("b", { class: "q" }, it.key || it.text), el("p", { class: "hint" }, tr(C.isStem(it) ? "Finish the sentence out loud, then click to turn over" : "Say the answer, then click to turn over")));
    return el("div", {}, el("b", { class: "q" }, it.q), k === "sort" || k === "case" ? el("ul", { class: "sq-cardopts" }, ...it.opts.map((o) => el("li", {}, o))) : "", el("p", { class: "hint" }, tr(FRONT_HINT[it.any ? "any" : k])));
  }
  function cardBack(it) {
    const k = C.kindOf(it);
    const ans = k === "sentence" ? [it.key ? el("b", { class: "k" }, it.key) : "", el("p", { class: "t" }, C.isStem(it) ? `… ${it.text}` : it.text)]
      : k === "order" ? [el("b", { class: "k" }, it.q), el(it.any ? "ul" : "ol", { class: "sq-steps" }, ...it.steps.map((x) => el("li", {}, x))),
        it.any && it.not?.length ? el("p", { class: "hint" }, tr("Not part of it: {list}", { list: it.not.join("; ") })) : ""]
      : [el("b", { class: "k" }, it.q), el("p", { class: "t" }, C.answerOf(it))];
    return el("div", {}, ...ans, it.why ? whyEl(it.why, "why") : "", it.image ? el("p", { class: "img" }, tr("Picture: {image}", { image: it.image })) : "");
  }
  function cards(b, c, l) {
    screen = "cards"; here = { b, c };
    let i = 0;
    const card = el("div");
    function show(flipped = false) {
      const it = l.items[i];
      const face = el("button", { type: "button", class: `sq-card ${flipped ? "flipped" : ""}`.trim(), onclick: () => show(!flipped) },
        el("small", {}, `${i + 1} / ${l.items.length}`),
        flipped ? cardBack(shown(it)) : cardFront(shown(it)));
      card.replaceChildren(face, el("div", { class: "row" }, btn(tr("← Back"), () => { i = Math.max(0, i - 1); show(); }), flipped ? askButton(it, `${b.name}, chapter ${c.n} · ${l.name}`) : "",
        i < l.items.length - 1 ? btn(tr("Next →"), () => { i++; show(); }, true) : btn(tr("Play the stage"), () => quiz(b, c, l), true)));
      if (!flipped) speak(it.q || it.key || it.text);
    }
    view(head(l.name, tr("Turn each card over. Imagine the picture for a moment: it is what brings the answer back.")), card,
      el("div", { class: "row sq-foot" }, btn(onePart(b) ? tr("← Stages") : bySection(b) ? `← ${c.title}` : tr("← Chapter {n}", { n: c.n }), () => chapter(b, c), false, "link")));
    show();
  }

  // ---------- the quiz: a stage, or the chapter's boss round (l = null) ----------
  // mix = { items, pool }: the mixed boss across chapters (c and l are null); the chapter is shown only after answering
  function quiz(b, c, l, mix = null) {
    screen = "quiz"; here = { b, c, mix };
    const pool = mix ? mix.pool : c.lists.flatMap((x) => x.items), items = mix ? mix.items : l ? l.items : pool;
    const typed = S.answer === "recall";
    const qs = C.questions(items, pool, typed ? "key" : S.dir, Math.random, l || mix ? 0 : Math.min(15, pool.length));
    // typing takes longer than picking: twice the time per question
    const base = l ? Number(S.time) : Math.round((Number(S.time) || 30) * 0.7), limit = typed ? base * 2 : base, id = mix ? mixId(b) : l ? l.id : bossId(b, c);
    const from = (it) => (mix ? el("p", { class: "hint sq-from" }, tr("From {where}", { where: whereOf(b, it) })) : "");
    const leave = () => (mix ? home() : chapter(b, c));
    let i = 0, hearts = Number(S.hearts), combo = 0, best = 0, gained = 0, left = limit;
    const right = [], missed = [], log = [];
    // the coins: what the round can give (as its card showed), and the answers' share of it counted as they come
    const o = COINS ? potOpts() : null;
    const pot0 = !COINS ? null : mix ? mixPot(C.mixPool(b, prog)) : l ? SC.stagePot(l, prog.lists[l.id], o) : SC.bossPot(b, c, prog, o) || { total: 0, extras: [], mult: 1 };
    let live = 0;
    const coinOf = (it) => (COINS ? SC.weight(C.kindOf(it), typed) * o.factor * (pot0.mult ?? 1) : 0);
    const bar = el("div", { class: "sq-hud" }), body = el("div");
    function hud() {
      bar.replaceChildren(el("span", {}, `${Math.min(i + 1, qs.length)} / ${qs.length}`), el("span", {}, tr("{n} pts", { n: num(gained) })),
        el("span", { class: "combo" }, combo > 1 ? tr("Combo x{n}", { n: Math.min(3, 1 + combo * 0.25).toFixed(2).replace(/0$/, "") }) : ""),
        el("span", { class: "hearts" }, hearts ? "♥".repeat(hearts) : S.hearts ? "" : "∞"),
        COINS ? el("span", { class: "sq-hudcoins", title: tr("Coins this round") }, `🪙 +${num(Math.round(live))}`) : "",
        limit ? el("div", { class: "sq-clock" }, el("i", { style: `width:${(left / limit) * 100}%` })) : "");
    }
    function ask() {
      const q = qs[i];
      left = limit; hud();
      if (q.kind === "order") {
        const picked = [];
        const opts = q.shown.map((o) => {
          const b = btn(o, () => {
            if (b.disabled) return;
            const right = q.any ? q.steps.includes(o) : o === q.steps[picked.length], join = q.any ? "; " : " → ";
            if (!right) { b.classList.add("bad"); return pickDone(false, [...picked, o].join(join)); }
            picked.push(o); b.disabled = true; b.classList.add("good"); b.prepend(el("span", { class: "sq-num" }, q.any ? "✓ " : `${picked.length}. `));
            if (picked.length === q.steps.length) pickDone(true, picked.join(join));
          }, false, "sq-opt");
          return b;
        });
        body.replaceChildren(el("div", { class: "sq-q" }, el("small", {}, q.label), el("b", {}, q.prompt)), el("div", { class: "sq-opts sq-order" }, ...opts));
      } else if (typed && q.kind === "sentence") {
        const input = el("input", { type: "text", class: "sq-type", placeholder: tr(q.gap ? "Type the missing part" : q.stem ? "Type the ending" : "Type the answer"), "aria-label": tr("Your answer"), autocomplete: "off" });
        const check = () => { if (input.value.trim()) recallAnswer(input.value); };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
        body.replaceChildren(el("div", { class: "sq-q" }, el("small", {}, q.gap || q.stem || !q.item.ask ? tr(q.gap ? "Fill the gap from memory" : q.stem ? "Finish the sentence from memory" : "Recall it") : q.item.ask), el("b", {}, q.prompt)),
          el("div", { class: "sq-recall" }, input, el("div", { class: "row" }, btn(tr("Check"), check, true), btn(tr("I don't know"), () => recallAnswer("")))));
        setTimeout(() => input.focus(), 30);
      } else {
        const opts = q.shown.map((o, k) => btn(o, () => answer(k), false, "sq-opt"));
        body.replaceChildren(el("div", { class: "sq-q" }, el("small", {}, q.label), el("b", {}, q.prompt)), el("div", { class: "sq-opts" }, ...opts));
      }
      speak(q.prompt);
      clearInterval(timer); timer = null;
      const slow = q.kind === "order" || q.kind === "case" ? 2 : 1;      // ordering and scenarios need more time
      if (limit) { left = limit * slow; timer = setInterval(() => { left = Math.max(0, left - 0.1 / slow); hud(); if (left <= 0) (q.kind === "order" ? pickDone(false, tr("(time ran out)")) : typed && q.kind === "sentence" ? recallAnswer(null) : answer(-1)); }, 100); }
    }
    // a typed answer is checked kindly (small typos, most of the key words); if it isn't accepted the answer is shown
    // and you can still say you knew it (self-check, as in Memory Palace)
    function recallAnswer(value) {
      clearInterval(timer); timer = null;
      const q = qs[i], f = q.form || q.item, ok = value ? PalaceCore.matches(value, { text: f.text, alt: f.alt }) : false;
      body.querySelectorAll("input, button").forEach((x) => (x.disabled = true));
      if (ok) return settle(true, value);
      body.append(el("div", { class: "sq-why" }, el("b", {}, tr(value === null ? "Time's up." : value ? "Not quite." : "Here it is.")), from(q.item),
        value ? el("p", { class: "hint" }, tr("You wrote: {value}", { value })) : "",
        el("p", { class: "sentence" }, C.sentence(shown(q.item))), q.item.why ? whyEl(q.item.why) : "", q.item.image ? el("p", { class: "hint" }, tr("Picture: {image}", { image: q.item.image })) : "",
        el("div", { class: "row" }, btn(tr("Next →"), () => settle(false, value), true), value ? btn(tr("I was right after all"), () => settle(true, value)) : "",
          askButton(q.item, whereOf(b, q.item), value || "", false))));
    }
    function settle(ok, value) {
      const q = qs[i];
      right.push(ok); log.push({ item: q.item, ok, given: value ?? "" });
      if (ok) { combo++; best = Math.max(best, combo); gained += C.points(left, limit, combo - 1); live += coinOf(q.item); }
      else { combo = 0; missed.push(q.item); if (hearts) hearts--; }
      hud();
      const over = (Number(S.hearts) && hearts === 0) || i === qs.length - 1;
      const go = () => { if (over) finish(); else { i++; ask(); } };
      if (!ok) return go();
      body.querySelector(".sq-why")?.remove();
      body.append(el("div", { class: "sq-ok-box" }, el("p", { class: "sq-ok" }, tr("Right!")), from(q.item), el("p", { class: "sentence" }, C.sentence(shown(q.item))),
        btn(tr(over ? "See the result" : "Next →"), go, true)));
      body.querySelector(".sq-ok-box button").focus();
    }
    // ordering: a wrong click ends the question and shows the right order
    function pickDone(ok, given) {
      clearInterval(timer); timer = null;
      body.querySelectorAll(".sq-opt").forEach((o) => (o.disabled = true));
      const q = qs[i];
      if (!ok) body.append(el(q.any ? "ul" : "ol", { class: "sq-steps sq-right-order" }, ...q.steps.map((x) => el("li", {}, x))));
      answered(ok, given, false);
    }
    function answer(k) {
      clearInterval(timer); timer = null;
      const q = qs[i], ok = k === q.answer, opts = body.querySelectorAll(".sq-opt");
      opts.forEach((o, n) => { o.disabled = true; o.classList.toggle("good", n === q.answer); o.classList.toggle("bad", n === k && !ok); });
      answered(ok, k >= 0 ? q.shown[k] : "", k < 0);
    }
    function answered(ok, given, timeUp) {
      const q = qs[i], k = timeUp ? -1 : 0;
      right.push(ok); log.push({ item: q.item, ok, given });
      if (ok) { combo++; best = Math.max(best, combo); gained += C.points(left, limit, combo - 1); live += coinOf(q.item); }
      else { combo = 0; missed.push(q.item); if (hearts) hearts--; }
      hud();
      const over = (Number(S.hearts) && hearts === 0) || i === qs.length - 1;
      const go = () => { if (over) finish(); else { i++; ask(); } };
      // a right answer moves on by itself, except where the reason is worth reading (true/false, scenarios, comparisons)
      if (ok && q.kind === "sentence") { body.append(el("p", { class: "sq-ok" }, tr("Right!")), from(q.item)); setTimeout(() => { if (screen === "quiz" && body.isConnected) go(); }, 650); }
      else if (ok) body.append(el("div", { class: "sq-ok-box" }, el("p", { class: "sq-ok" }, tr("Right!")), from(q.item), q.item.why ? whyEl(q.item.why) : "",
        el("div", { class: "row" }, btn(tr(over ? "See the result" : "Next →"), go, true), askButton(q.item, whereOf(b, q.item), given, true))));
      else body.append(el("div", { class: "sq-why" }, el("b", {}, tr(k < 0 ? "Time's up." : "Not this one.")), from(q.item),
        el("p", { class: "sentence" }, C.sentence(shown(q.item))), q.item.why ? whyEl(q.item.why) : "", q.item.image ? el("p", { class: "hint" }, tr("Picture: {image}", { image: q.item.image })) : "",
        el("div", { class: "row" }, btn(tr(over ? "See the result" : "Next →"), go, true), askButton(q.item, whereOf(b, q.item), given, false))));
    }
    function finish() {
      screen = "result";
      const score = right.filter(Boolean).length / qs.length, s = C.stars(score);
      // what the round changes, for its coins: was the stage passed or due before it (a review: due, and not played yet today, so a
      // review missed and played again counts as an ordinary round), was its chapter done
      const prev = prog.lists[id] ? { ...prog.lists[id] } : null, wasPassed = C.passed(prog, id);
      const wasDue = prev?.due != null && prev.due <= Date.now() && !(prev.last >= C.startOfDay(Date.now()));
      const partWasDone = !!c && c.lists.every((x) => C.passed(prog, x.id));
      // typed recall counts fully; so do stages of ordering, comparing, traps and scenarios (they test understanding)
      const mode = typed || items.every((it) => C.kindOf(it) !== "sentence") ? "recall" : "choice", before = C.rank(prog.xp).name, rec = C.record(prog, id, score, gained, Date.now(), mode);
      const earned = COINS ? roundCoins({ b, c, l, mix, log, typed, prev, wasPassed, wasDue, partWasDone, score, id, rec }) : [];
      if (earned.length) SoraCoins.earn(earned);
      const coins = earned.reduce((s2, e) => s2 + e.n, 0);
      reviewQueue = reviewQueue.filter((x) => x !== id && C.due(prog, [x]).length);      // what's still due
      const nextReview = l && reviewQueue.length ? allLists(b).find((x) => x.id === reviewQueue[0]) : null;
      for (const x of log) { const cid = cardId(b, x.item); if (cid) C.noteCard(prog, cid, x.ok); }
      commit();
      noteBook(b);
      const won = COINS ? SC.checkAchievements() : [];
      if (won.length) setTimeout(() => SC.celebrate(won), 900);
      // what this task still has in it now (shown on the result: the three stars still to get, say)
      const potAfter = !COINS ? null : mix ? null : l ? SC.stagePot(l, prog.lists[l.id], potOpts()) : SC.bossPot(b, c, prog, potOpts());
      const after = C.rank(prog.xp).name, outOfHearts = right.length < qs.length;
      view(head(`${Math.round(score * 100)} %${outOfHearts ? tr(" (out of hearts)") : ""}`,
        mix ? tr(missed.length ? "The missed cards will come up more often in the next mixed quiz." : "A clean sweep across chapters.")
          : score < C.PASS ? tr("Below 80 %: look at the missed ones and play again.")
          : mode === "recall" ? tr("Recalled. Next review {when}; the gaps grow as you keep remembering.", { when: when(rec.due) })
          : tr("Passed by picking, which keeps it fresh: next review {when}. Play in Recall mode to move it to a longer gap.", { when: when(rec.due) })),
        el("div", { class: "sq-result" }, starRow(s), el("span", {}, tr("+{n} {points} · best combo {best}", { n: num(gained), points: tr.n(gained, "points", "points"), best })),
          after !== before ? el("b", { class: "sq-up" }, tr("New rank: {rank}!", { rank: tr(after) })) : ""),
        COINS ? coinResult(coins, pot0, potAfter, earned) : "",
        nextReview ? el("div", { class: "row" }, btn(tr("Next review ▶ ({n} left)", { n: reviewQueue.length }), () => quiz(b, nextReview.chapter, nextReview), true)) : "",
        log.length ? el("section", { class: "card" }, el("h3", {}, tr(missed.length ? "Look at these once more" : "Your answers")),
          FRIENDS ? "" : el("p", { class: "hint" }, "Unsure about any of them? “Ask about this” opens Telegram with the card written out; add your question and send it."),
          el("ul", { class: "sq-missed" }, ...[...log.filter((x) => !x.ok), ...log.filter((x) => x.ok)].map((x) => el("li", { class: x.ok ? "ok" : "miss" },
            el("b", {}, `${x.ok ? "✓" : "✗"} ${C.sentence(shown(x.item))}`), !x.ok && x.given ? el("div", { class: "hint" }, tr("Your answer: {answer}", { answer: x.given })) : "",
            !x.ok && x.item.why ? whyEl(x.item.why) : "", !x.ok && x.item.image ? el("div", { class: "hint" }, tr("Picture: {image}", { image: x.item.image })) : "",
            askButton(x.item, whereOf(b, x.item), x.given, x.ok))))) : "",
        mix ? el("div", { class: "row" }, btn(tr("Another mixed quiz"), () => mixBoss(b), true), btn(tr("Chapters"), home, false, "link"))
          : onePart(b) ? el("div", { class: "row" }, btn(tr("Play again"), () => quiz(b, c, l), score < C.PASS), btn(tr("Stages"), home, score >= C.PASS))
          : el("div", { class: "row" }, btn(tr("Play again"), () => quiz(b, c, l), score < C.PASS), btn(partName(b, c), () => chapter(b, c), score >= C.PASS), btn(partsName(b), home, false, "link")));
    }
    // the coins on the result: big, against what the round could give; full, with a burst, or what's still there to win
    function coinResult(coins, pot, after, earned) {
      const max = Math.max(pot?.total || 0, coins), full = coins >= max && coins > 0;
      const left = (after?.extras || []).filter(([k]) => k !== "ontime");
      return el("section", { class: `sq-coinres ${full ? "full" : ""}`.trim() },
        el("div", { class: "sq-coinline" }, el("span", { class: "coin-pot huge", "aria-label": tr("🪙 +{n} coins", { n: num(coins) }) }, `🪙 +${num(coins)}`),
          el("b", {}, full ? tr("Full: all {n} collected!", { n: num(max) }) : tr("of {n} possible", { n: num(max) }))),
        earned.length > 1 ? el("p", { class: "hint" }, earned.slice(1).map((e) => `${e.why} +${e.n}`).join(" · ")) : "",
        left.length ? el("p", { class: "sq-left" }, tr("Still to win here:"), " ", ...left.map(([k]) => el("span", { class: "coin-tag" }, tr(TAGS[k])))) : "",
        full ? el("span", { class: "sq-burst", "aria-hidden": "true" }, ...Array.from({ length: 10 }, (_, k) => el("i", { style: `--a:${k * 36}deg;--d:${(k % 3) * 80}ms` }, "🪙"))) : "");
    }
    const one = !mix && onePart(b), sec = !mix && bySection(b);
    view(head(mix ? tr("Mixed quiz") : l ? l.name : one ? tr("Boss round") : sec ? tr("Boss round: {title}", { title: c.title }) : tr("Boss round: chapter {n}", { n: c.n }),
      mix ? tr("Traps, comparisons and scenarios from the chapters you have passed. The chapter is shown after you answer.") : l ? "" : tr(one ? "Questions from every stage." : sec ? "Questions from every stage of the section." : "Questions from every stage of the chapter.")),
      el("div", { class: "sq-hudrow" }, window.SoraNav ? SoraNav.exitButton("inline") : "", bar), body,
      el("div", { class: "row sq-foot" }, btn(tr("Give up"), leave, false, "link")));
    ask();
  }

  $("sqHome").onclick = home;
  setupFullscreen(root);
  window.StudyQuest = { home, chapter, cards, quiz, written, attempt, progress: () => prog, books: () => books };   // for tests
  // one step back: a stage's cards, round or result go to their chapter (or Home, for a book in one part or the mixed quiz); an answer
  // being written to the list of questions; anything else to Home. A round half-way asks first.
  function goBack() {
    const { b, c, mix } = here, bk = b || book();
    if (["cards", "quiz", "result"].includes(screen) && !mix && c && !onePart(bk)) return chapter(bk, c);
    if (["attempt", "wfinish"].includes(screen) && bk) return written(bk);
    home();
  }
  window.SoraNav?.register({ depth: () => (screen === "home" ? 0 : 1), busy: () => screen === "quiz", back: goBack });
  home();
  // opened from a link (the Mind Map): ?stage=<id> shows that stage's cards, ?chapter=<n> the chapter
  {
    const q = new URLSearchParams(location.search), b = book(), want = q.get("stage"), wantCh = Number(q.get("chapter"));
    const l = want && allLists(b).find((x) => x.id === want), c = wantCh && b.chapters.find((x) => x.n === wantCh);
    if (l) cards(b, l.chapter, l); else if (c) chapter(b, c);
  }
})();
