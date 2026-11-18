/* Study Quest: learn a book chapter by chapter as a game. Each list is a stage: look at the cards, then play the quiz
   (pick the right answer against the clock, with hearts and combos). 80 % passes the stage, opens the next one and
   puts it on a review schedule; a chapter ends with a boss round of questions from all its lists. Points raise your
   rank. Books come from study/*.js and from list files imported in Memory Palace. Everything is kept in this browser. */
"use strict";
const StudyCore = (() => {
  const DAY = 864e5, PASS = 0.8, KEY = "sora.studyQuest.v1", IMPORT_KEY = "sora.memoryPalace.imported.v1";
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
  const answerOf = (it) => ({ order: () => it.steps.join(it.any ? "; " : " → "), sort: () => it.opts[it.a], case: () => it.opts[it.a], tf: () => (it.a ? "True" : "False") }[kindOf(it)] || (() => it.text))();
  const sentence = (it) => kindOf(it) !== "sentence" ? `${it.q} — ${answerOf(it)}`
    : (!it.key ? it.text : isStem(it) ? `${it.key.replace(/\s*(…|\.\.\.)\s*$/, "")} ${it.text}` : `${it.key}: ${it.text}`);
  const ending = (text) => `… ${text}`;
  // questions for a round: "key" shows the key and asks for the meaning, "text" the other way round; "mixed" both.
  // Wrong options come from the same list first, then from the pool (the chapter).
  function questions(items, pool, dir = "mixed", rnd = Math.random, count = 0) {
    const list = shuffle(items, rnd).slice(0, count || items.length);
    return list.map((it, i) => {
      const kind = kindOf(it);
      if (kind === "tf") return { item: it, kind, label: "True or false?", prompt: it.q, shown: ["True", "False"], answer: it.a ? 0 : 1 };
      if (kind === "sort") return { item: it, kind, label: it.ask || "Which one is it?", prompt: it.q, shown: it.opts, answer: it.a };
      if (kind === "case") { const order = shuffle(it.opts.map((_, k) => k), rnd); return { item: it, kind, label: it.ask || "What is the right treatment?", prompt: it.q, shown: order.map((k) => it.opts[k]), answer: order.indexOf(it.a) }; }
      if (kind === "order") return { item: it, kind, any: !!it.any, label: it.any ? "Pick everything that belongs, in any order" : "Put them in order: click the first, then the next…", prompt: it.q, steps: it.steps,
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
      const label = way === "key" ? (gap ? "Fill the gap" : stem ? "Finish the sentence" : "What is it?") : (stem ? "Which beginning goes with this ending?" : "Which term is this?");
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
  const commit = () => C.save(prog);

  const settings = setupSettings(root, "study-quest", [
    { key: "answer", label: "How you answer", type: "choice", default: window.SORA_STATIC ? "choice" : "recall", options: [["recall", "Recall: type it first"], ["choice", "Pick from choices"]],
      help: "A real recall moves the review schedule on; picking only keeps a stage fresh" },
    { key: "dir", label: "Questions (when picking)", type: "choice", default: "mixed", options: [["mixed", "Mixed"], ["key", "Term → meaning"], ["text", "Meaning → term"]] },
    { key: "time", label: "Time per question", type: "choice", default: 30, options: [[0, "No clock"], [45, "45 s"], [30, "30 s"], [20, "20 s"], [10, "10 s"]] },
    { key: "hearts", label: "Hearts", type: "choice", default: 3, options: [[0, "Unlimited"], [3, "3"], [5, "5"]] },
    { key: "order", label: "Open stages in order", type: "toggle", default: true, help: "Off: every stage is open from the start" },
    { key: "reviews", label: "Reviews a day", type: "choice", default: 4, options: [[2, "2"], [4, "4"], [6, "6"], [0, "All"]],
      help: "Stages due for review shown on Home, the most important chapters first; the rest wait for another day" },
    { key: "speak", label: "Read questions aloud", type: "toggle", default: false },
  ], { onChange: () => { if (screen === "home") home(); } });
  const S = settings.values;
  function speak(text) {
    if (!S.speak || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch { /* no voice */ }
  }
  const btn = (label, onclick, primary = false, cls = "") => el("button", { type: "button", class: `${primary ? "primary" : ""} ${cls}`.trim(), onclick }, label);
  const head = (title, text) => el("div", { class: "sq-head" }, el("h2", {}, title), text ? el("p", { class: "hint" }, text) : "");
  const date = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; };
  const when = (t) => { const days = Math.round((C.startOfDay(t) - C.startOfDay(Date.now())) / C.DAY); return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days (${date(t)})`; };
  const starRow = (n) => el("span", { class: "sq-stars", "aria-label": `${n} of 3 stars` }, ...[1, 2, 3].map((k) => el("i", { class: k <= n ? "on" : "" })));
  function view(...children) { clearInterval(timer); timer = null; main.replaceChildren(...children); }
  const book = () => books.find((b) => b.id === bookId) || books[0];
  const allLists = (b) => b.chapters.flatMap((c) => c.lists.map((l) => ({ ...l, chapter: c })));
  const bossId = (b, c) => `${b.id}:boss:${c.n}`;
  const trackOf = (l) => l.track || "know";
  // stages open one after another within each kind of practice (Know, Structure, Compare, Watch out, Apply)
  function open(c, k) {
    if (!S.order) return true;
    const prev = c.lists.slice(0, k).filter((x) => trackOf(x) === trackOf(c.lists[k])).pop();
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
  function writtenCard(b) {
    if (!b.written?.length) return "";
    const n = wstore().attempts.length;
    return el("section", { class: "sq-written-card" },
      el("div", {}, el("small", {}, "All exam questions"), el("b", {}, "Written practice"),
        el("p", { class: "hint" }, `All ${b.kit?.length || 0} questions in your Exam Kit, newest exam first, and ${b.written.length} of my own. Pick any to answer against the clock, then ${FRIENDS ? "compare it with the answer" : "send it for marking"}${n ? ` · ${n} answer${n === 1 ? "" : "s"} written so far` : ""}.`)),
      btn("Open the list", () => written(b), true));
  }
  function written(b) {
    screen = "written";
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
    screen = "attempt";
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
    return el("section", { class: "sq-marked" },
      el("div", {}, el("small", {}, "Marked by Claude"), el("b", {}, `${isKit(w) ? kitName(w) : w.title}: ${m.score} out of ${m.of}`),
        el("p", { class: "hint" }, fresh.length > 1 ? `And ${fresh.length - 1} more marking${fresh.length > 2 ? "s" : ""} to read in Written practice.` : m.summary || "")),
      btn("See the marking", () => markingView(b, w, m), true));
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
    return el("section", { class: "sq-mix" },
      el("div", {}, el("small", {}, "If you have time"), el("b", {}, "Mixed quiz"),
        el("p", { class: "hint" }, chapters >= 2 ? `15 questions mixed from the ${chapters} chapters you've studied. You see which chapter only after you answer, as in the exam.${missedN ? ` The ${missedN} you got wrong before come up more often.` : ""}`
          : "Opens once you've passed Watch out, Compare or Apply stages in two chapters."),
        rec?.plays ? el("p", { class: "hint" }, `Best so far ${Math.round(rec.best * 100)} % · played ${rec.plays === 1 ? "once" : `${rec.plays} times`}`) : ""),
      chapters >= 2 ? btn("Play the mixed quiz", () => mixBoss(b), true) : "");
  }
  function stageNo(l) { return `${l.chapter.n}.${l.chapter.lists.indexOf(l) + 1}`; }

  function home() {
    screen = "home"; books = C.books();
    const b = book(); bookId = b?.id;
    if (!b) return view(head("No books yet", "Import a list file in Memory Palace to study it here."));
    const r = C.rank(prog.xp), lists = allLists(b), ids = lists.map((l) => l.id), dueIds = C.due(prog, ids);
    const pct = r.next ? Math.round(((prog.xp - r.from) / (r.next[0] - r.from)) * 100) : 100;
    const made = b.chapters.filter((c) => c.lists.length).length, p = C.plan(b, prog);
    const planOn = !!b.plan?.sessions?.length && b.plan.sessions.some((x) => !sessionState(b, x).done);     // the plan's Today card leads
    if (b.id === "sbr" && !FRIENDS) refreshMarks(() => { if (screen === "home") home(); });
    view(
      books.length > 1 ? el("div", { class: "sq-tabs" }, ...books.map((x) => el("button", { type: "button", class: x.id === b.id ? "on" : "", onclick: () => { bookId = x.id; home(); } }, x.name))) : "",
      el("section", { class: "sq-top" },
        el("div", {}, el("h2", {}, `${b.name}: ${b.title}`), el("p", { class: "hint" }, `${b.about}. ${made} of ${b.chapters.length} chapters ready.`)),
        el("div", { class: "sq-rank" }, el("small", {}, "Rank"), el("b", {}, r.name), el("div", { class: "sq-meter" }, el("i", { style: `width:${pct}%` })),
          el("small", {}, r.next ? `${prog.xp.toLocaleString()} / ${r.next[0].toLocaleString()} points to ${r.next[1]}` : `${prog.xp.toLocaleString()} points`)),
        el("div", { class: "sq-streak" }, el("b", {}, String(prog.streak.last >= C.startOfDay(Date.now()) - C.DAY ? prog.streak.days : 0)), el("small", {}, "days in a row"))),
      p ? el("section", { class: "sq-plan" }, el("b", {}, p.days > 0 ? `${p.days} day${p.days === 1 ? "" : "s"} to the exam` : p.days === 0 ? "The exam is today. Good luck!" : "The exam date has passed"),
        p.days > 0 ? el("span", {}, new Date(p.exam).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })) : "",
        el("span", { class: "sq-passed" }, p.left ? (planOn ? `Study Quest: ${p.total - p.left} of ${p.total} stages passed`
          : `${p.total - p.left} of ${p.total} stages passed · pass ${p.perDay} new stage${p.perDay === 1 ? "" : "s"} a day${p.days > 7 ? ", then use the last week for review" : ""}`) : `All ${p.total} stages passed: keep up the reviews`),
        p.days >= 0 && p.days <= 10 && p.total > p.left ? btn("Final sweep: review every passed stage", () => sweep(b), false, "small") : "") : "",
      todayCard(b),
      markedCard(b),
      dueIds.length ? dueCard(b, lists, dueIds) : "",
      planOn ? "" : continueCard(b),
      mixCard(b),
      writtenCard(b),
      askedCard(),
      el("div", { class: "sq-legend" }, el("span", { class: "done" }, "✓ Done"), el("span", { class: "started" }, "In progress"), el("span", { class: "new" }, "Not started")),
      el("div", { class: "sq-map" }, ...b.chapters.map((c) => {
        const cs = chapterState(c), got = c.lists.reduce((s, l) => s + (prog.lists[l.id]?.stars || 0), 0), max = c.lists.length * 3;
        const status = cs.state === "done" ? "✓ Done" : cs.state === "started" ? `In progress · ${cs.passedN} of ${cs.total} passed` : cs.state === "new" ? `Not started · ${cs.total} stage${cs.total === 1 ? "" : "s"}` : `Coming${c.pages ? ` · pp. ${c.pages}` : ""}`;
        const tile = el("button", { type: "button", class: `sq-ch ${cs.state} ${max && got === max ? "full" : ""}`.trim(), onclick: () => chapter(b, c), "aria-label": `Chapter ${c.n}: ${c.title}. ${status}` },
          el("span", { class: "n" }, cs.state === "done" ? "✓" : String(c.n)), el("b", {}, `${cs.state === "done" ? c.n + ". " : ""}${c.title}`),
          el("small", { class: "st" }, status, c.lists.length && got ? ` · ★ ${got}/${max}` : ""),
          c.lists.length ? el("span", { class: "bar" }, el("i", { style: `width:${Math.round((cs.passedN / cs.total) * 100)}%` })) : "");
        tile.disabled = !c.lists.length;
        return tile;
      })));
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
    for (const c of b.chapters) for (const l of c.lists) if (l.items.includes(it)) return `${b.name}, chapter ${c.n} · ${l.name}`;
    return b.name;
  }
  function askedCard() {
    const list = asked();
    if (!list.length) return "";
    return el("details", { class: "card sq-asked" }, el("summary", {}, `My questions (${list.length})`),
      el("p", { class: "hint" }, "Cards you asked about in Telegram, newest first. The answers are in the chat with the bot."),
      el("ul", {}, ...list.slice(0, 30).map((q) => el("li", {}, el("small", {}, `${date(q.at)} · ${q.where}`), el("div", {}, q.sentence)))),
      btn("Clear the list", () => { if (confirm("Clear the list of questions? The Telegram chat is not affected.")) { localStorage.removeItem(ASKED_KEY); home(); } }, false, "link"));
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
    if (k < 0) return el("section", { class: "sq-today" }, el("div", {}, el("small", {}, "Your plan"), el("b", {}, doneN === ss.length ? "Every session done" : "You're ahead of the plan"),
      el("p", { class: "hint" }, doneN === ss.length ? "Keep up the reviews and the mixed quiz until the exam." : "Nothing more is planned before the day below. Pick any question in Written practice, or play your reviews.")), coming, whole);
    const s = ss[k], x = states[k], w = x.kit, draft = w && st.drafts[w.id]?.text;
    // what to do, step by step
    const steps = w ? [`Read the question in your Exam Kit: ${kitPage(w.q)}.`, `Press Start. A ${minutes(w)}-minute clock runs while you type your answer.`, ...(s.sheet ? [s.sheet] : []),
        "When you've finished, press Finish, then Send for marking. I'll mark it and tell you what to go over."]
      : x.stages.length ? ["Play each stage below until it's passed. Cards shows what's in a stage first."] : s.steps || [];
    const rows = x.stages.map((l) => el("div", { class: "sq-trow" },
      el("span", {}, el("b", {}, l.name), el("small", { class: "hint" }, C.passed(prog, l.id) ? " · ✓ passed" : prog.lists[l.id]?.plays ? ` · best ${Math.round(prog.lists[l.id].best * 100)} %` : "")),
      el("span", { class: "row" }, btn("Cards", () => cards(b, l.chapter, l), false, "small"), btn("Play", () => quiz(b, l.chapter, l), !C.passed(prog, l.id), "small"))));
    const done = () => { setPlanDone(s.id, true); home(); };
    return el("section", { class: "sq-today" },
      el("div", {}, el("small", {}, s.on ? `Today · ${longDate(s.on)}` : `Today · session ${k + 1} of ${ss.length}`), el("b", {}, s.title),
        w ? el("p", { class: "sq-what" }, `${kitWhat(w)} · ${w.marks} marks · ${minutes(w)} minutes`) : "", s.note ? el("p", { class: "hint" }, s.note) : ""),
      el("ol", { class: "sq-todo" }, ...steps.map((t) => el("li", {}, t))),
      ...rows,
      el("div", { class: "row sq-act" }, w ? btn(draft ? "Continue" : "Start", () => attempt(b, w), true) : "", w || x.stages.length ? btn("Mark as done", done, false, "link") : btn("Done", done, true)),
      coming, whole);
  }
  // the stages due for review: a few a day (Settings), the chapters the exam leans on most first, then the longest overdue
  function dueCard(b, lists, dueIds) {
    const cap = Number(S.reviews), pri = b.plan?.priority || [], today = C.startOfDay(Date.now());
    const rankOf = (l) => { const k = pri.indexOf(l.chapter.n); return k < 0 ? pri.length : k; };
    const due = dueIds.map((id) => lists.find((x) => x.id === id)).sort((a, z) => rankOf(a) - rankOf(z) || prog.lists[a.id].due - prog.lists[z.id].due);
    // reviews already done today: passed stages played again today
    const doneToday = lists.filter((l) => C.passed(prog, l.id) && prog.lists[l.id].plays > 1 && prog.lists[l.id].last >= today).length;
    const shown = cap ? due.slice(0, Math.max(0, cap - doneToday)) : due, waiting = due.length - shown.length;
    if (!shown.length) return el("section", { class: "sq-due" }, el("small", {}, "Reviews"), el("h3", {}, "Today's reviews done"),
      el("p", { class: "hint" }, `${waiting} more ${waiting === 1 ? "waits" : "wait"} for another day; change how many a day in Settings.`));
    return el("section", { class: "sq-due" }, el("small", {}, "Reviews · a few minutes each"), el("h3", {}, `Play ${shown.length} stage${shown.length === 1 ? "" : "s"} again today`),
      el("p", { class: "hint" }, `Stages you've passed come back after a few days, so you don't forget them.${waiting ? ` ${waiting} more ${waiting === 1 ? "is" : "are"} waiting for other days.` : ""}`),
      el("div", { class: "row" }, ...shown.map((l) => btn(l.name, () => quiz(b, l.chapter, l), true))));
  }
  function continueCard(b) {
    const ns = nextStage(b);
    if (!ns) return "";
    const { last, next } = ns, lp = last && prog.lists[last.id];
    return el("section", { class: "sq-continue" },
      el("div", {}, el("small", {}, next ? (last ? "Continue where you left off" : "Start here") : "Every stage passed"),
        next ? el("b", {}, `Chapter ${next.chapter.n} · ${next.name}`) : el("b", {}, "Keep up the reviews below"),
        last ? el("p", { class: "hint" }, `Last studied ${date(lp.last)}: ${last.name} (best ${Math.round(lp.best * 100)} %${C.passed(prog, last.id) ? ", passed" : ", not passed yet"})`) : ""),
      next ? el("div", { class: "row" }, btn("Cards", () => cards(b, next.chapter, next)), btn("Play", () => quiz(b, next.chapter, next), true), btn(`Chapter ${next.chapter.n}`, () => chapter(b, next.chapter), false, "link")) : "");
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
  function chapter(b, c) {
    screen = "chapter";
    const allPassed = c.lists.every((l) => C.passed(prog, l.id)), boss = prog.lists[bossId(b, c)];
    view(head(`Chapter ${c.n}: ${c.title}`, `${c.pages ? `Book pages ${c.pages}. ` : ""}Look at the cards, then play the stage. 80 % passes it and opens the next one.`),
      // the kinds of practice side by side, left to right, each with its stages stacked underneath
      el("div", { class: "sq-board" }, ...TRACKS.filter(([t]) => c.lists.some((l) => trackOf(l) === t)).map(([t, title, about]) => el("div", { class: "sq-col" }, el("div", { class: "sq-track" }, el("h3", {}, title), el("span", {}, about)),
      el("div", { class: "sq-stack" }, ...c.lists.map((l, k) => [l, k]).filter(([l]) => trackOf(l) === t).map(([l, k]) => {
        const p = prog.lists[l.id], ok = open(c, k);
        const isNext = ok && !C.passed(prog, l.id) && c.lists.findIndex((x) => trackOf(x) === t && !C.passed(prog, x.id)) === k;
        return el("section", { class: `sq-stage ${ok ? "" : "locked"} ${C.passed(prog, l.id) ? "passed" : ""} ${isNext ? "next" : ""}`.replace(/\s+/g, " ").trim() },
          isNext ? el("span", { class: "sq-next" }, "Next") : "",
          el("div", { class: "sq-stage-head" }, el("span", { class: "n" }, String(c.lists.filter((x, j) => j <= k && trackOf(x) === t).length)), el("b", {}, l.name), starRow(p?.stars || 0)),
          el("p", { class: "hint" }, l.about || `${l.items.length} items`),
          el("div", { class: "sq-stage-foot" }, el("small", { class: `st ${C.passed(prog, l.id) ? "done" : p?.plays ? "started" : ""}`.trim() }, !ok ? "Pass the stage before to open it"
            : C.passed(prog, l.id) ? `✓ Passed · best ${Math.round(p.best * 100)} %${p.due ? ` · review ${when(p.due)}` : ""}`
            : p?.plays ? `Played · best ${Math.round(p.best * 100)} % · not passed yet (80 % needed)` : `Not started · ${l.items.length} items`),
          ok ? el("div", { class: "row" }, btn("Cards", () => cards(b, c, l), false, "small"), btn("Play", () => quiz(b, c, l), true, "small"), palaceButton(l)) : ""));
      }))))),
      el("div", { class: "sq-stages" }, c.lists.length > 1 ? el("section", { class: `sq-stage boss ${allPassed || !S.order ? "" : "locked"}`.trim() },
        el("div", { class: "sq-stage-head" }, el("span", { class: "n" }, "★"), el("b", {}, "Boss round"), starRow(boss?.stars || 0)),
        el("p", { class: "hint" }, "15 questions from every stage of the chapter, faster clock."),
        allPassed || !S.order ? el("div", { class: "row" }, btn("Fight the boss", () => quiz(b, c, null), true)) : el("small", {}, "Pass every stage to open it")) : ""),
      el("div", { class: "row sq-foot" }, btn("← Chapters", home, false, "link"), btn("Store a list in Memory Palace", () => (location.href = "/memory-palace/"), false, "link")));
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
    if (k === "sentence") return el("div", {}, el("b", { class: "q" }, it.key || it.text), el("p", { class: "hint" }, C.isStem(it) ? "Finish the sentence out loud, then click to turn over" : "Say the answer, then click to turn over"));
    return el("div", {}, el("b", { class: "q" }, it.q), k === "sort" || k === "case" ? el("ul", { class: "sq-cardopts" }, ...it.opts.map((o) => el("li", {}, o))) : "", el("p", { class: "hint" }, FRONT_HINT[it.any ? "any" : k]));
  }
  function cardBack(it) {
    const k = C.kindOf(it);
    const ans = k === "sentence" ? [it.key ? el("b", { class: "k" }, it.key) : "", el("p", { class: "t" }, C.isStem(it) ? `… ${it.text}` : it.text)]
      : k === "order" ? [el("b", { class: "k" }, it.q), el(it.any ? "ul" : "ol", { class: "sq-steps" }, ...it.steps.map((x) => el("li", {}, x))),
        it.any && it.not?.length ? el("p", { class: "hint" }, `Not part of it: ${it.not.join("; ")}`) : ""]
      : [el("b", { class: "k" }, it.q), el("p", { class: "t" }, C.answerOf(it))];
    return el("div", {}, ...ans, it.why ? whyEl(it.why, "why") : "", it.image ? el("p", { class: "img" }, `Picture: ${it.image}`) : "");
  }
  function cards(b, c, l) {
    screen = "cards";
    let i = 0;
    const card = el("div");
    function show(flipped = false) {
      const it = l.items[i];
      const face = el("button", { type: "button", class: `sq-card ${flipped ? "flipped" : ""}`.trim(), onclick: () => show(!flipped) },
        el("small", {}, `${i + 1} / ${l.items.length}`),
        flipped ? cardBack(it) : cardFront(it));
      card.replaceChildren(face, el("div", { class: "row" }, btn("← Back", () => { i = Math.max(0, i - 1); show(); }), flipped ? askButton(it, `${b.name}, chapter ${c.n} · ${l.name}`) : "",
        i < l.items.length - 1 ? btn("Next →", () => { i++; show(); }, true) : btn("Play the stage", () => quiz(b, c, l), true)));
      if (!flipped) speak(it.q || it.key || it.text);
    }
    view(head(l.name, "Turn each card over. Imagine the picture for a moment: it is what brings the answer back."), card,
      el("div", { class: "row sq-foot" }, btn(`← Chapter ${c.n}`, () => chapter(b, c), false, "link")));
    show();
  }

  // ---------- the quiz: a stage, or the chapter's boss round (l = null) ----------
  // mix = { items, pool }: the mixed boss across chapters (c and l are null); the chapter is shown only after answering
  function quiz(b, c, l, mix = null) {
    screen = "quiz";
    const pool = mix ? mix.pool : c.lists.flatMap((x) => x.items), items = mix ? mix.items : l ? l.items : pool;
    const typed = S.answer === "recall";
    const qs = C.questions(items, pool, typed ? "key" : S.dir, Math.random, l || mix ? 0 : Math.min(15, pool.length));
    // typing takes longer than picking: twice the time per question
    const base = l ? Number(S.time) : Math.round((Number(S.time) || 30) * 0.7), limit = typed ? base * 2 : base, id = mix ? mixId(b) : l ? l.id : bossId(b, c);
    const from = (it) => (mix ? el("p", { class: "hint sq-from" }, `From ${whereOf(b, it)}`) : "");
    const leave = () => (mix ? home() : chapter(b, c));
    let i = 0, hearts = Number(S.hearts), combo = 0, best = 0, gained = 0, left = limit;
    const right = [], missed = [], log = [];
    const bar = el("div", { class: "sq-hud" }), body = el("div");
    function hud() {
      bar.replaceChildren(el("span", {}, `${Math.min(i + 1, qs.length)} / ${qs.length}`), el("span", {}, `${gained.toLocaleString()} pts`),
        el("span", { class: "combo" }, combo > 1 ? `Combo x${Math.min(3, 1 + combo * 0.25).toFixed(2).replace(/0$/, "")}` : ""),
        el("span", { class: "hearts" }, hearts ? "♥".repeat(hearts) : S.hearts ? "" : "∞"),
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
        const input = el("input", { type: "text", class: "sq-type", placeholder: q.gap ? "Type the missing part" : q.stem ? "Type the ending" : "Type the answer", "aria-label": "Your answer", autocomplete: "off" });
        const check = () => { if (input.value.trim()) recallAnswer(input.value); };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
        body.replaceChildren(el("div", { class: "sq-q" }, el("small", {}, q.gap ? "Fill the gap from memory" : q.stem ? "Finish the sentence from memory" : "Recall it"), el("b", {}, q.prompt)),
          el("div", { class: "sq-recall" }, input, el("div", { class: "row" }, btn("Check", check, true), btn("I don't know", () => recallAnswer("")))));
        setTimeout(() => input.focus(), 30);
      } else {
        const opts = q.shown.map((o, k) => btn(o, () => answer(k), false, "sq-opt"));
        body.replaceChildren(el("div", { class: "sq-q" }, el("small", {}, q.label), el("b", {}, q.prompt)), el("div", { class: "sq-opts" }, ...opts));
      }
      speak(q.prompt);
      clearInterval(timer); timer = null;
      const slow = q.kind === "order" || q.kind === "case" ? 2 : 1;      // ordering and scenarios need more time
      if (limit) { left = limit * slow; timer = setInterval(() => { left = Math.max(0, left - 0.1 / slow); hud(); if (left <= 0) (q.kind === "order" ? pickDone(false, "(time ran out)") : typed && q.kind === "sentence" ? recallAnswer(null) : answer(-1)); }, 100); }
    }
    // a typed answer is checked kindly (small typos, most of the key words); if it isn't accepted the answer is shown
    // and you can still say you knew it (self-check, as in Memory Palace)
    function recallAnswer(value) {
      clearInterval(timer); timer = null;
      const q = qs[i], f = q.form || q.item, ok = value ? PalaceCore.matches(value, { text: f.text, alt: f.alt }) : false;
      body.querySelectorAll("input, button").forEach((x) => (x.disabled = true));
      if (ok) return settle(true, value);
      body.append(el("div", { class: "sq-why" }, el("b", {}, value === null ? "Time's up." : value ? "Not quite." : "Here it is."), from(q.item),
        value ? el("p", { class: "hint" }, `You wrote: ${value}`) : "",
        el("p", { class: "sentence" }, C.sentence(q.item)), q.item.why ? whyEl(q.item.why) : "", q.item.image ? el("p", { class: "hint" }, `Picture: ${q.item.image}`) : "",
        el("div", { class: "row" }, btn("Next →", () => settle(false, value), true), value ? btn("I was right after all", () => settle(true, value)) : "",
          askButton(q.item, whereOf(b, q.item), value || "", false))));
    }
    function settle(ok, value) {
      const q = qs[i];
      right.push(ok); log.push({ item: q.item, ok, given: value ?? "" });
      if (ok) { combo++; best = Math.max(best, combo); gained += C.points(left, limit, combo - 1); }
      else { combo = 0; missed.push(q.item); if (hearts) hearts--; }
      hud();
      const over = (Number(S.hearts) && hearts === 0) || i === qs.length - 1;
      const go = () => { if (over) finish(); else { i++; ask(); } };
      if (!ok) return go();
      body.querySelector(".sq-why")?.remove();
      body.append(el("div", { class: "sq-ok-box" }, el("p", { class: "sq-ok" }, "Right!"), from(q.item), el("p", { class: "sentence" }, C.sentence(q.item)),
        btn(over ? "See the result" : "Next →", go, true)));
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
      if (ok) { combo++; best = Math.max(best, combo); gained += C.points(left, limit, combo - 1); }
      else { combo = 0; missed.push(q.item); if (hearts) hearts--; }
      hud();
      const over = (Number(S.hearts) && hearts === 0) || i === qs.length - 1;
      const go = () => { if (over) finish(); else { i++; ask(); } };
      // a right answer moves on by itself, except where the reason is worth reading (true/false, scenarios, comparisons)
      if (ok && q.kind === "sentence") { body.append(el("p", { class: "sq-ok" }, "Right!"), from(q.item)); setTimeout(() => { if (screen === "quiz" && body.isConnected) go(); }, 650); }
      else if (ok) body.append(el("div", { class: "sq-ok-box" }, el("p", { class: "sq-ok" }, "Right!"), from(q.item), q.item.why ? whyEl(q.item.why) : "",
        el("div", { class: "row" }, btn(over ? "See the result" : "Next →", go, true), askButton(q.item, whereOf(b, q.item), given, true))));
      else body.append(el("div", { class: "sq-why" }, el("b", {}, k < 0 ? "Time's up." : "Not this one."), from(q.item),
        el("p", { class: "sentence" }, C.sentence(q.item)), q.item.why ? whyEl(q.item.why) : "", q.item.image ? el("p", { class: "hint" }, `Picture: ${q.item.image}`) : "",
        el("div", { class: "row" }, btn(over ? "See the result" : "Next →", go, true), askButton(q.item, whereOf(b, q.item), given, false))));
    }
    function finish() {
      screen = "result";
      const score = right.filter(Boolean).length / qs.length, s = C.stars(score);
      // typed recall counts fully; so do stages of ordering, comparing, traps and scenarios (they test understanding)
      const mode = typed || items.every((it) => C.kindOf(it) !== "sentence") ? "recall" : "choice", before = C.rank(prog.xp).name, rec = C.record(prog, id, score, gained, Date.now(), mode);
      for (const x of log) { const cid = cardId(b, x.item); if (cid) C.noteCard(prog, cid, x.ok); }
      commit();
      const after = C.rank(prog.xp).name, outOfHearts = right.length < qs.length;
      view(head(`${Math.round(score * 100)} %${outOfHearts ? " (out of hearts)" : ""}`,
        mix ? (missed.length ? "The missed cards will come up more often in the next mixed quiz." : "A clean sweep across chapters.")
          : score < C.PASS ? "Below 80 %: look at the missed ones and play again."
          : mode === "recall" ? `Recalled. Next review ${when(rec.due)}; the gaps grow as you keep remembering.`
          : `Passed by picking, which keeps it fresh: next review ${when(rec.due)}. Play in Recall mode to move it to a longer gap.`),
        el("div", { class: "sq-result" }, starRow(s), el("span", {}, `+${gained.toLocaleString()} points · best combo ${best}`),
          after !== before ? el("b", { class: "sq-up" }, `New rank: ${after}!`) : ""),
        log.length ? el("section", { class: "card" }, el("h3", {}, missed.length ? "Look at these once more" : "Your answers"),
          FRIENDS ? "" : el("p", { class: "hint" }, "Unsure about any of them? “Ask about this” opens Telegram with the card written out; add your question and send it."),
          el("ul", { class: "sq-missed" }, ...[...log.filter((x) => !x.ok), ...log.filter((x) => x.ok)].map((x) => el("li", { class: x.ok ? "ok" : "miss" },
            el("b", {}, `${x.ok ? "✓" : "✗"} ${C.sentence(x.item)}`), !x.ok && x.given ? el("div", { class: "hint" }, `Your answer: ${x.given}`) : "",
            !x.ok && x.item.why ? whyEl(x.item.why) : "", !x.ok && x.item.image ? el("div", { class: "hint" }, `Picture: ${x.item.image}`) : "",
            askButton(x.item, whereOf(b, x.item), x.given, x.ok))))) : "",
        mix ? el("div", { class: "row" }, btn("Another mixed quiz", () => mixBoss(b), true), btn("Chapters", home, false, "link"))
          : el("div", { class: "row" }, btn("Play again", () => quiz(b, c, l), score < C.PASS), btn(`Chapter ${c.n}`, () => chapter(b, c), score >= C.PASS), btn("Chapters", home, false, "link")));
    }
    view(head(mix ? "Mixed quiz" : l ? l.name : `Boss round: chapter ${c.n}`, mix ? "Traps, comparisons and scenarios from the chapters you have passed. The chapter is shown after you answer." : l ? "" : "Questions from every stage of the chapter."), bar, body,
      el("div", { class: "row sq-foot" }, btn("Give up", leave, false, "link")));
    ask();
  }

  $("sqHome").onclick = home;
  setupFullscreen(root);
  window.StudyQuest = { home, chapter, cards, quiz, written, attempt, progress: () => prog, books: () => books };   // for tests
  home();
  // opened from a link (the Mind Map): ?stage=<id> shows that stage's cards, ?chapter=<n> the chapter
  {
    const q = new URLSearchParams(location.search), b = book(), want = q.get("stage"), wantCh = Number(q.get("chapter"));
    const l = want && allLists(b).find((x) => x.id === want), c = wantCh && b.chapters.find((x) => x.n === wantCh);
    if (l) cards(b, l.chapter, l); else if (c) chapter(b, c);
  }
})();
