/* Duels: two people challenge each other, and see each other's duels and results. Surah Duel (Aziza's app) is on the surahs of the
   Quran; Study Duel (Maryamxon's and Robiyaxon's apps, 18.11.2026) is on the app's own subjects (sites.json "duel"). Each is a DECK.
   - A duel is the same 7 questions for both: whoever challenges picks the deck and range and plays first. Points for each right
     answer and for speed; once a duel, "Double or nothing" on a question you're sure of (×2 if right, −100 if not). Up to two
     "revenge" questions bring back what either of you missed lately, worth double.
   - The two share a room on the server where the user's bot runs (server/duel_room.py in Sora's repository). Nobody has to be online
     at the same time: a challenge is sent once the challenger has played their part, with their score, and waits for the other, who
     sees it, and the score to beat, whenever they open the app. You can play your part before the other has even joined. The page
     reads the room when it opens and every few seconds while it's open. What can't be sent yet waits on the phone and goes when it can.
   - A phone joins the room once, with the invite link (…/#join=CODE). Opening that link again takes one's place back.
   - The decks: Surah Numbers' surahs (study/surahs.js: questions by number, next, first, order, Arabic, meaning), or a subject's
     cards (study/<book>.js, put into the app's language by study/books-lang.js): a question names its card ("stage#place") and each
     phone shows it in its own language. English terms in brackets show only after answering, never in a question.
   The wording goes through tr() (lang.js), so the Russian app is in Russian. */
"use strict";
(() => {
  const SERVER = window.SORA_DUEL_URL, POLL = window.SORA_DUEL_POLL_MS || 3000, TOOL = window.SORA_DUEL_TOOL || "surah-duel";
  const ME_KEY = "sora.duel.me.v1", ROOM_KEY = "sora.duel.room.v1", OUT_KEY = "sora.duel.outbox.v1", SEEN_KEY = "sora.duel.seen.v1";
  const root = $("sd"), main = $("sdMain"), liveEl = $("sdLive");
  const QUESTIONS = 7, GOAL = 100, TIME = 15, TIME_ORDER = 25;
  const T = (s, v) => tr(s, v);
  const num = (x) => (window.SoraLang?.lang === "ru" ? x.toLocaleString("ru-RU") : String(x));      // 1 050 in Russian; plain in English
  const settings = setupSettings(root, TOOL, [
    { key: "sound", label: T("Sounds"), type: "toggle", default: true, help: T("A chime when a challenge or a result comes in, and a sound for right and wrong answers") },
  ]);
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cut = (s, n = 70) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

  // ---------- the decks ----------
  // Surah Numbers' surahs: questions by number (as before 18.11.2026's Study Duel, unchanged: the duels already played read the same)
  function surahDeck(book) {
    const SURAHS = book.chapters[0].lists.flatMap((l) => l.items).map((it) => {
      const [ar, meaning] = String(it.why || "").split(" · ");
      return { n: Number(it.text), name: it.key, ar, meaning };
    });
    const S = (n) => SURAHS[n - 1];
    const RANGES = { amma: [78, 114, "Juz 'Amma", "surahs 78–114"], first30: [1, 30, "The first 30", "surahs 1–30"], all: [1, 114, "All 114", "the whole Quran"] };
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
      const span = hi - lo + 1, pick = new Set([s]);
      while (pick.size < 4) pick.add(lo + rnd(span));
      return { t, s, o: shuffle([...pick]), a: [...pick].sort((x, y) => x - y) };
    }
    const LABEL = { num: "Which number is this surah?", name: "Which surah has this number?", after: "Which surah comes right after this one?",
      first: "Which comes first in the Quran?", order: "Put them in order, first to last", arabic: "Which surah is this?", meaning: "Which surah has this meaning?" };
    const ar = (s) => el("span", { class: "sd-ar", lang: "ar", dir: "rtl" }, s);
    return {
      id: "surahs", name: book.name, learnTitle: T("Surahs you both missed"),
      ranges: Object.entries(RANGES).map(([k, [, , label, about]]) => [k, `${label} · ${about}`]),
      rangeName: (k) => RANGES[k]?.[2] || k,
      inRange: (k, subject) => { const [lo, hi] = RANGES[k] || [1, 114]; return subject >= lo && subject <= hi; },
      make(range, missed) {
        const [lo, hi] = RANGES[range];
        const kinds = shuffle(["num", "name", "after", "first", "order", "arabic", "meaning", "num", "name", "after"]);
        const qs = [], used = new Set();
        for (const s of shuffle([...missed].filter((s) => s >= lo && s <= hi)).slice(0, 2)) { const q = question(rnd(2) ? "num" : "name", s, lo, hi); q.x = 1; qs.push(q); used.add(s); }
        for (const t of kinds) {
          if (qs.length >= QUESTIONS) break;
          let s, tries = 0;
          do { s = lo + rnd(hi - lo + 1); tries++; } while (tries < 50 && (used.has(s) || (t === "after" && s >= 114) || (t === "meaning" && !plainMeaning(s))));
          used.add(s);
          qs.push(question(t, s, lo, hi));
        }
        return shuffle(qs);
      },
      isOrder: (q) => q.t === "order",
      label: (q) => LABEL[q.t],
      prompt(q) {
        const s = S(q.s);
        if (q.t === "num" || q.t === "after") return el("b", {}, s.name);
        if (q.t === "name") return el("b", {}, `Number ${q.s}`);
        if (q.t === "arabic") return el("b", { class: "sd-ar", lang: "ar", dir: "rtl" }, s.ar);
        if (q.t === "meaning") return el("b", {}, `“${s.meaning}”`);
        return "";
      },
      extra: (q) => (q.t === "num" ? ar(S(q.s).ar) : ""),
      optionText: (q, n) => (q.t === "num" ? String(n) : S(n).name),
      right: (q) => (q.t === "order" ? `In order: ${q.a.map((n) => `${n} ${S(n).name}`).join(" → ")}`
        : q.t === "first" ? `${S(q.o[q.a]).name} is ${q.o[q.a]}, ${S(q.o[1 - q.a]).name} is ${q.o[1 - q.a]}`
        : q.t === "after" ? `After ${S(q.s).name} (${q.s}) comes ${S(q.s + 1).name} (${q.s + 1})` : `${q.s} · ${S(q.s).name} · ${S(q.s).meaning}`),
      feedExtra: (q) => (["num", "name", "arabic", "meaning"].includes(q.t) ? el("p", { class: "sd-ar", lang: "ar", dir: "rtl" }, S(q.s).ar) : ""),
      summary: (q) => (q.t === "order" ? `Order: ${q.a.map((n) => S(n).name).join(", ")}` : q.t === "first" ? `First: ${S(q.o[q.a]).name} or ${S(q.o[1 - q.a]).name}`
        : q.t === "after" ? `After ${S(q.s).name}` : q.t === "name" ? `Number ${q.s}` : q.t === "arabic" ? S(q.s).ar : q.t === "meaning" ? `“${S(q.s).meaning}”` : S(q.s).name),
      answer: (q) => (q.t === "num" ? `${q.s}` : q.t === "after" ? S(q.s + 1).name : q.t === "order" ? q.a.join(" → ") : q.t === "first" ? S(q.o[q.a]).name : S(q.s).name),
      revenge: (q) => q.s,
      subject: (q) => (q.t === "after" ? q.s + 1 : q.s),       // for "which comes next", the one you didn't know
      learnRow: (n) => [el("span", {}, `${n} · ${S(n).name} `, el("small", {}, S(n).meaning)), ar(S(n).ar)],
    };
  }

  // a subject's cards (a Study Quest book): sentence cards asked either way, true or false, scenarios, comparisons and orders
  function cardDeck(book) {
    const kindOf = (it) => it.t || "sentence";
    const isStem = (it) => /(…|\.\.\.)\s*$/.test(it.key || "");
    const shown = (it) => (it.withTerms ? { ...it, ...it.withTerms } : it);       // with the English terms, after answering
    const sentence = (it) => (kindOf(it) === "tf" ? `${it.q} — ${it.a ? T("True") : T("False")}` : kindOf(it) === "order" ? `${it.q}: ${it.steps.join(" → ")}`
      : kindOf(it) !== "sentence" ? `${it.q} — ${it.opts[it.a]}` : isStem(it) ? `${it.key.replace(/\s*(…|\.\.\.)\s*$/, "")} ${it.text}` : `${it.key}: ${it.text}`);
    const usable = (it) => (kindOf(it) === "sentence" ? !!(it.key && it.text) : kindOf(it) === "order" ? !it.any && it.steps?.length > 1 : ["tf", "case", "sort"].includes(kindOf(it)));
    const parts = book.chapters.filter((c) => c.lists.length);
    const cards = new Map();
    for (const c of parts) for (const l of c.lists) l.items.forEach((it, i) => { if (usable(it)) cards.set(`${l.id}#${i}`, { it, l, c, cid: `${l.id}#${i}` }); });
    const cidsOf = (lists) => lists.flatMap((l) => l.items.map((_, i) => `${l.id}#${i}`).filter((c) => cards.has(c)));
    const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "x";
    // what a duel can be on: everything, then the continents (a stage's group), the chapters, or blocks of stages in order
    const lists = parts.flatMap((c) => c.lists);
    const ranges = [["all", T("All"), cidsOf(lists)]];
    const groups = [...new Set(lists.map((l) => l.group).filter(Boolean))];
    if (groups.length > 1) for (const g of groups) ranges.push([`g:${slug(g)}`, g, cidsOf(lists.filter((l) => l.group === g))]);
    else if (parts.length > 1) for (const c of parts) ranges.push([`c:${c.n}`, c.title, cidsOf(c.lists)]);
    else if (lists.length > 6) for (let i = 0; i < lists.length; i += 3) {
      const block = lists.slice(i, i + 3), a = block[0].name.match(/^(.*?)(\d+)–(\d+)$/), z = block[block.length - 1].name.match(/^(.*?)(\d+)–(\d+)$/);
      ranges.push([`s:${i + 1}-${i + block.length}`, a && z && a[1] === z[1] ? `${a[1]}${a[2]}–${z[3]}` : `${block[0].name} – ${block[block.length - 1].name}`, cidsOf(block)]);
    }
    const byKey = Object.fromEntries(ranges.map(([k, , ids]) => [k, ids]));
    const card = (cid) => cards.get(cid)?.it;
    function question(cid, pool) {
      const { it, l } = cards.get(cid), kind = kindOf(it);
      if (kind === "tf") return { t: "tf", c: cid, o: [0, 1], a: it.a ? 0 : 1 };
      if (kind === "case" || kind === "sort") { const o = shuffle(it.opts.map((_, k) => k)); return { t: kind, c: cid, o, a: o.indexOf(it.a) }; }
      if (kind === "order") { const steps = it.steps.slice(0, 8).map((_, k) => k); return { t: "order", c: cid, o: shuffle(steps), a: steps }; }
      // a sentence card, one way or the other; the wrong choices from its own stage first (the same continent, say), then the range
      const w = rnd(2), face = (c) => (w === 0 ? card(c).text : card(c).key);
      const sentences = (ids) => ids.filter((c) => c !== cid && kindOf(card(c)) === "sentence");
      const others = [];
      for (const c of [...shuffle(sentences(cidsOf([l]))), ...shuffle(sentences(pool))]) {
        if (others.length >= 3) break;
        if (face(c) !== face(cid) && !others.some((o) => face(o) === face(c))) others.push(c);
      }
      const o = shuffle([cid, ...others]);
      return { t: "card", c: cid, w, o, a: o.indexOf(cid) };
    }
    return {
      id: book.id, name: book.name, learnTitle: T("Cards you both missed"),
      ranges: ranges.filter(([, , ids]) => ids.length >= 4).map(([k, label, ids]) => [k, `${label} · ${T("{n} cards", { n: ids.length })}`]),
      rangeName: (k) => ranges.find(([r]) => r === k)?.[1] || k,
      inRange: (k, cid) => (byKey[k] || []).includes(cid),
      make(range, missed) {
        const pool = byKey[range] || byKey.all, qs = [], used = new Set();
        for (const cid of shuffle(pool.filter((c) => missed.has(c))).slice(0, 2)) { const q = question(cid, pool); q.x = 1; qs.push(q); used.add(cid); }
        for (const cid of shuffle(pool)) { if (qs.length >= QUESTIONS) break; if (!used.has(cid)) { qs.push(question(cid, pool)); used.add(cid); } }
        return shuffle(qs);
      },
      isOrder: (q) => q.t === "order",
      label(q) {
        const it = card(q.c);
        if (q.t === "tf") return T("True or false?");
        if (q.t === "order") return T("Put them in order: click the first, then the next…");
        if (q.t !== "card") return it.ask || T(q.t === "sort" ? "Which one is it?" : "What is the right treatment?");
        return q.w === 0 ? it.ask || T(isStem(it) ? "Finish the sentence" : "What is it?") : it.askBack || T(isStem(it) ? "Which beginning goes with this ending?" : "Which term is this?");
      },
      prompt(q) {
        const it = card(q.c);
        return el("b", {}, q.t !== "card" ? it.q : q.w === 0 ? it.key : isStem(it) ? `… ${it.text}` : it.text);
      },
      extra: () => "",
      optionText(q, v) {
        const it = card(q.c);
        if (q.t === "tf") return v === 0 ? T("True") : T("False");
        if (q.t === "order") return it.steps[v];
        if (q.t !== "card") return it.opts[v];
        const other = card(v);
        return q.w === 0 ? (isStem(it) ? `… ${other.text}` : other.text) : other.key;
      },
      right: (q) => sentence(shown(card(q.c))),
      feedExtra: (q) => (card(q.c).why ? el("p", { class: "hint" }, card(q.c).why) : ""),
      summary(q) {
        const it = card(q.c);
        return cut(q.t !== "card" ? it.q : q.w === 0 ? it.key.replace(/\s*(…|\.\.\.)\s*$/, " …") : it.text, 60);
      },
      answer(q) {
        const it = card(q.c);
        return cut(q.t === "tf" ? (it.a ? T("True") : T("False")) : q.t === "order" ? it.steps.join(" → ") : q.t !== "card" ? it.opts[it.a] : q.w === 0 ? it.text : it.key, 60);
      },
      revenge: (q) => q.c,
      subject: (q) => q.c,
      learnRow: (cid) => [el("span", {}, cut(sentence(shown(card(cid))), 140), card(cid).why ? el("small", {}, ` ${cut(card(cid).why, 120)}`) : "")],
      has: (cid) => cards.has(cid),
    };
  }
  const BOOKS = window.StudyBooks || [];
  const DECKS = {};
  for (const id of window.SORA_DUEL_DECKS || ["surahs"]) {
    const b = BOOKS.find((x) => x.id === id);
    if (b) DECKS[id] = id === "surahs" ? surahDeck(b) : cardDeck(b);
  }
  const SURAH_ONLY = Object.keys(DECKS).length === 1 && DECKS.surahs;
  const deckOf = (d) => DECKS[d.deck || "surahs"];
  const known = (d) => !!deckOf(d) && d.qs.every((q) => (q.c ? deckOf(d).has?.(q.c) : true));      // a duel this phone can show
  const title = (d) => (Object.keys(DECKS).length > 1 ? `${deckOf(d).name} · ` : "") + deckOf(d).rangeName(d.range);

  // ---------- what this phone keeps ----------
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full */ } };
  let me = read(ME_KEY, null);            // { room, id, name }: this phone's place in the room
  let room = read(ROOM_KEY, null);        // the room as last read: { v, members, duels }
  let outbox = read(OUT_KEY, []);         // writes not yet through
  // the other's duels and results already announced; null on a phone that has never looked at this room (it starts quietly)
  let seen = read(SEEN_KEY, null) && new Set(read(SEEN_KEY, []));
  let screen = "home", current = null, polling = false;

  // the partner, or, before they've joined, the place kept for them: you can play your part straight away
  const partner = () => room?.members.find((m) => m.id !== me?.id) || (room && me ? { id: me.id === "a" ? "b" : "a", name: T("your partner"), waiting: true } : null);
  const nameOf = (id) => (id === me?.id ? T("You") : room?.members.find((m) => m.id === id)?.name || "?");
  const duels = () => room.duels.filter(known);
  const view = (...kids) => main.replaceChildren(...kids);
  const btn = (label, onclick, primary = false, cls = "") => el("button", { type: "button", class: `${primary ? "primary" : ""} ${cls}`.trim(), onclick }, label);
  const box = (cls, label, head, ...rest) => el("section", { class: `sd-box ${cls}` }, el("small", {}, label), head ? el("b", {}, head) : "", ...rest);
  const locale = window.SoraLang?.lang === "ru" ? "ru-RU" : "en-GB";
  const when = (t) => {
    const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0);
    const hm = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (d >= today) return T("today {time}", { time: hm });
    if (d >= today - 864e5) return T("yesterday {time}", { time: hm });
    return `${d.toLocaleDateString(locale, { day: "numeric", month: "short" })} ${hm}`;
  };
  const plural = (n, one, many) => tr.n(n, one, many);

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
    if (!r.ok || !j.ok) { const e = new Error(j.error || T("the server answered {n}", { n: r.status })); e.status = r.status; throw e; }
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
    liveEl.textContent = !me ? "" : ok ? T("Up to date") : T("Offline ({why}): what you do is kept here and sent when it can", { why: why || T("no connection") });
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
      if (e.status === 404) { me = null; keep(ME_KEY, null); toast(T("This duel room isn't on the server any more.")); home(); }
    } finally { polling = false; }
  }
  // the other's new challenges and results: a chime and a line at the top, once each
  function announce() {
    const p = partner();
    if (!p || p.waiting) return;
    const fresh = [];
    if (!seen?.has(`joined:${p.id}`)) fresh.push([`joined:${p.id}`, room.duels.some((d) => d.by === me.id) ? T("{name} joined: your duels are waiting for them", { name: p.name }) : T("{name} joined", { name: p.name })]);
    for (const d of duels()) {
      if (d.by === p.id && d.results[p.id] && !seen?.has(d.id)) fresh.push([d.id, T("{name} challenged you: {what}, {points} points to beat", { name: p.name, what: title(d), points: num(d.results[p.id].points) })]);
      if (d.results[p.id] && d.by === me.id && !seen?.has(`${d.id}:${p.id}`)) {
        const mine = d.results[me.id]?.points, theirs = d.results[p.id].points;
        fresh.push([`${d.id}:${p.id}`, mine === undefined ? T("{name} played your duel", { name: p.name }) : T("{name} played your duel: you {mine}, {name} {theirs}", { name: p.name, mine: num(mine), theirs: num(theirs) })]);
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
  const deckNames = () => Object.values(DECKS).map((d) => d.name).join(", ");
  const GAME = SURAH_ONLY ? "Surah Duel" : T("Study Duel");
  function nameForm(label, go, value = "") {
    const input = el("input", { type: "text", maxlength: 24, value, placeholder: T("Your name"), "aria-label": T("Your name"), autocomplete: "nickname" });
    const msg = el("p", { class: "hint" });
    const submit = async (e) => {
      e?.preventDefault();
      const name = input.value.trim();
      if (!name) { msg.textContent = T("Type your name first."); return; }
      msg.textContent = T("Connecting…");
      try { await go(name); } catch (err) { msg.textContent = T("Couldn't reach the duel room: {why}. Check the internet connection and try again.", { why: err.message }); }
    };
    return el("form", { class: "sd-form", onsubmit: submit }, input, el("div", { class: "row" }, el("button", { type: "submit", class: "primary" }, label)), msg);
  }
  function welcome() {
    screen = "welcome";
    view(el("div", { class: "sd-grid" },
      box("sd-turn sd-wide", GAME, SURAH_ONLY ? "Challenge each other on the surahs" : T("Challenge each other on what you're learning"),
        el("p", {}, SURAH_ONLY ? "Each duel is the same 7 questions for both of you: which number a surah is, which comes next, which comes first, putting them in order, and surahs by their Arabic or meaning. You see each other's results as they come in, so you can learn together."
          : T("Each duel is the same 7 questions for both of you, on {subjects}. You see each other's results as they come in, so you can learn together.", { subjects: deckNames() })),
        el("p", { class: "hint" }, T("Start a room here, then send the invite link to the one you want to duel with. You only do this once.")),
        nameForm(T("Start a duel room"), async (name) => {
          const st = await call({}, { op: "create", name });
          me = { room: st.room, id: st.me, name }; keep(ME_KEY, me); seen = new Set(); keep(SEEN_KEY, []); take(st); live(true); home();
        }))));
  }
  async function joinScreen(code) {
    screen = "join";
    view(el("p", { class: "hint" }, T("Opening the duel room…")));
    let st;
    try { st = await call({ room: code }); } catch (e) {
      return view(box("sd-wait", GAME, T("This invite link doesn't open a room"), el("p", {}, e.status === 404 ? T("The room isn't on the server. Ask for a new link.") : T("Couldn't reach it: {why}.", { why: e.message })),
        el("div", { class: "row" }, btn(T("Back"), () => { history.replaceState(null, "", location.pathname); home(); }))));
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
      return view(box("sd-turn", GAME, T("{name} invites you to a duel room", { name: st.members[0].name }),
        el("p", {}, SURAH_ONLY ? "You'll challenge each other on the surahs and see each other's results as they come in." : T("You'll challenge each other on {subjects} and see each other's results as they come in.", { subjects: deckNames() })),
        nameForm(T("Join"), async (name) => done(await call({}, { op: "join", room: code, name }), name))));
    }
    // the room has its two: one of them is opening it on a new phone
    view(box("sd-turn", GAME, T("Which of you is this?"), el("p", {}, T("This room is {a} and {b}'s. Pick your name to carry on here.", { a: st.members[0].name, b: st.members[1].name })),
      el("div", { class: "row" }, ...st.members.map((m) => btn(T("I'm {name}", { name: m.name }), async () => done(await call({}, { op: "join", room: code, as: m.id }), m.name, true), true)))));
  }
  function inviteBox() {
    const link = `${location.origin}${location.pathname}#join=${me.room}`;
    const share = async () => {
      try { if (navigator.share) return await navigator.share({ title: GAME, text: T("{name} invites you to {game}", { name: me.name, game: GAME }), url: link }); } catch { return; }
      copy();
    };
    const copy = () => navigator.clipboard?.writeText(link).then(() => toast(T("The link is copied: paste it in a message")), () => {});
    return box("sd-wait sd-wide", T("Invite your partner"), T("Waiting for them to join"),
      el("p", {}, T("Send them this link (Telegram, WhatsApp or any message). When they open it and type their name, they're in, and they'll find your duels waiting with your scores. You can start playing now.")),
      el("div", { class: "sd-link" }, link),
      el("div", { class: "row" }, btn(T("Share the link"), share), btn(T("Copy"), copy)),
      el("p", { class: "hint" }, T("Keep the link between the two of you: anyone with it could take the second place.")));
  }

  // ---------- the numbers: score, streak, the week, what you both missed ----------
  const finished = () => (room.members.length < 2 ? [] : duels().filter((d) => room.members.every((m) => d.results[m.id])));
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
      const key = `${d.deck || "surahs"}|${deckOf(d).subject(q)}`;
      if (room.members.every((m) => !d.results[m.id].answers[i].ok) && !out.includes(key)) out.push(key);
    });
    return out.slice(0, limit).map((k) => { const [deck, s] = k.split("|"); return [DECKS[deck], deck === "surahs" ? Number(s) : s]; });
  }
  // revenge: what either of you missed lately in this deck
  function missedLately(deck) {
    const out = new Set();
    for (const d of duels().filter((x) => (x.deck || "surahs") === deck).slice(-12)) d.qs.forEach((q, i) => {
      if (Object.values(d.results).some((r) => !r.answers[i]?.ok)) out.add(deckOf(d).revenge(q));
    });
    return out;
  }

  // ---------- Home ----------
  function home() {
    current = null;
    if (!me) {
      const code = (location.hash.match(/join=([A-Za-z0-9_-]{24})/) || [])[1];
      return code ? joinScreen(code) : welcome();
    }
    if (!room) { view(el("p", { class: "hint" }, T("Opening the duel room…"))); poll(true); return; }
    screen = "home";
    const p = partner(), { wins, draws } = tally(), { streak, right } = together();
    const mine = (d) => d.results[me.id], theirs = (d) => d.results[p.id], rightOf = (r) => r.answers.filter((a) => a.ok).length;
    // the other's challenges, once they've played their part (their score is the one to beat); their answers stay hidden until you've played
    const turn = duels().filter((d) => !mine(d) && d.by !== me.id && theirs(d)).reverse();
    const waiting = duels().filter((d) => mine(d) && !theirs(d)).reverse();
    const done = finished().reverse();
    const learn = missedByBoth();
    const n = (k, one, many) => T("{n} {what}", { n: k, what: plural(k, one, many) });
    view(
      el("section", { class: "sd-score" },
        el("div", { class: "who" }, el("small", {}, T("You")), el("b", {}, me.name)),
        el("div", { class: "vs" }, `${wins[me.id]} – ${wins[p.id]}`, el("small", {}, draws ? T("duels won · {n} drawn", { n: draws }) : T("duels won"))),
        el("div", { class: "who" }, el("small", {}, T("Your partner")), el("b", {}, p.waiting ? T("Not joined yet") : p.name)),
        el("div", { class: "sd-together" },
          el("span", {}, T("Together streak: "), el("b", {}, n(streak, "day", "days"))),
          el("span", {}, T("This week, between you: "), el("b", {}, T("{right} / {goal} right answers", { right, goal: GOAL }))),
          el("span", { class: "sd-meter", "aria-hidden": "true" }, el("i", { style: `width:${Math.min(100, Math.round((right / GOAL) * 100))}%` })))),
      el("div", { class: "sd-grid" },
        p.waiting ? inviteBox() : "",
        turn.length ? box("sd-turn", T("Your turn"), T("{n} waiting for you", { n: n(turn.length, "duel", "duels") }),
          el("ul", { class: "sd-list" }, ...turn.slice(0, 6).map((d) => el("li", {},
            el("span", {}, `${T("{name} challenged you", { name: nameOf(d.by) })} · ${title(d)} `, el("br"),
              el("b", {}, T("{name}: {right} of {all} right, {points} points", { name: nameOf(d.by), right: rightOf(theirs(d)), all: d.qs.length, points: num(theirs(d).points) })), " ",
              el("small", {}, when(theirs(d).at))), btn(T("Beat it ▶"), () => play(d), true, "small"))))) : "",
        box("sd-new", T("New duel"), T("Challenge {name}", { name: p.name }),
          el("p", { class: "hint" }, T("You play first. When you've finished, {name} gets the challenge with your score to beat, whenever they next open the app. Pick what it's on:", { name: p.name })),
          ...Object.values(DECKS).map((deck) => el("div", { class: "sd-ranges" }, Object.keys(DECKS).length > 1 ? el("small", { class: "sd-deck" }, deck.name) : "",
            ...deck.ranges.map(([k, label]) => btn(label, () => challenge(deck.id, k), false))))),
        waiting.length ? box("sd-wait", T("Waiting for {name}", { name: p.name }), T("{n} sent", { n: n(waiting.length, "duel", "duels") }),
          el("ul", { class: "sd-list" }, ...waiting.slice(0, 6).map((d) => el("li", {}, el("span", {}, `${title(d)} · ${T("you {points}", { points: num(mine(d).points) })} `, el("small", {}, when(mine(d).at))), btn(T("See"), () => result(d), false, "small"))))) : "",
        done.length ? box("sd-done", T("Results"), T("The latest duels"),
          el("ul", { class: "sd-list" }, ...done.slice(0, 8).map((d) => {
            const a = mine(d).points, b = theirs(d).points;
            return el("li", {}, el("span", {}, `${a > b ? "🏆 " : ""}${T("You {a} – {b} {name}", { a: num(a), b: num(b), name: p.name })}${b > a ? " 🏆" : ""} `, el("small", {}, `${title(d)} · ${when(Math.max(mine(d).at, theirs(d).at))}`)), btn(T("See"), () => result(d), false, "small"));
          }))) : "",
        learn.length ? box("sd-learn", T("Learn together"), learn[0][0].learnTitle,
          el("ul", { class: "sd-list" }, ...learn.map(([deck, s]) => el("li", {}, ...deck.learnRow(s)))),
          el("p", { class: "hint" }, T("They come back as revenge questions in your next duels."))) : ""));
  }

  // ---------- making a duel: 7 questions, the same for both ----------
  // a new duel is played first by whoever makes it; it's sent, with their result, only when they've finished (giving up sends nothing)
  function challenge(deck, range) {
    const qs = DECKS[deck].make(range, missedLately(deck));
    play({ id: Date.now().toString(36) + rnd(46656).toString(36).padStart(3, "0"), ...(deck !== "surahs" ? { deck } : {}), range, qs, by: me.id, at: Date.now(), results: {} });
  }

  // ---------- playing a duel ----------
  function play(duel) {
    screen = "play"; current = duel;
    const deck = deckOf(duel);
    let i = 0, points = 0, betUsed = false, timer = null;
    const answers = [], start = Date.now();
    const hud = el("div", { class: "sd-hud" }), clock = el("div", { class: "sd-clock" }, el("i")), body = el("div", { class: "sd-play" });
    const other = duel.by === me.id ? partner() : room.members.find((m) => m.id === duel.by), toBeat = duel.by !== me.id ? duel.results[duel.by]?.points : null;
    view(el("div", { class: "sd-play" }, hud, clock, body, el("div", { class: "row" }, btn(T("Give up"), () => { clearInterval(timer); home(); }, false, "link"))));
    function ask() {
      const q = duel.qs[i], order = deck.isOrder(q), limit = order ? TIME_ORDER : TIME, began = performance.now();
      let bet = false, picked = [], over = false;
      hud.replaceChildren(el("span", {}, T("Question {n} of {all}", { n: i + 1, all: duel.qs.length })),
        el("span", {}, toBeat == null ? T("vs {name}", { name: other?.name || "?" }) : T("{name}: {points} to beat", { name: other?.name || "?", points: num(toBeat) })),
        el("span", {}, T("{n} points", { n: num(points) })));
      const opts = q.o.map((v, k) => btn(deck.optionText(q, v), () => pick(k), false));
      const betBtn = betUsed ? "" : btn(T("Double or nothing: ×2 if right, −100 if not"), () => { bet = !bet; betBtn.classList.toggle("on", bet); }, false, "small sd-bet");
      body.replaceChildren(el("div", { class: "sd-q" }, q.x ? el("span", { class: "tag" }, T("Revenge ×2")) : "", el("small", {}, deck.label(q)), deck.prompt(q), deck.extra(q)),
        el("div", { class: "sd-opts" }, ...opts), betBtn);
      clearInterval(timer);
      timer = setInterval(() => {
        const left = Math.max(0, limit - (performance.now() - began) / 1000);
        clock.firstChild.style.width = `${(left / limit) * 100}%`;
        if (left <= 0) finish(order ? picked.map((k) => q.o[k]) : -1, false);
      }, 100);
      function pick(k) {
        if (over) return;
        if (order) {
          const v = q.o[k];
          if (picked.includes(k)) return;
          picked.push(k);
          opts[k].disabled = true;
          opts[k].prepend(el("span", { class: "n" }, `${picked.length}.`));
          if (v !== q.a[picked.length - 1]) { opts[k].classList.add("bad"); return finish(picked.map((x) => q.o[x]), false); }
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
        opts.forEach((o, n) => { o.disabled = true; if (!order) { o.classList.toggle("good", n === q.a); o.classList.toggle("bad", n === k && !ok); } });
        let got = ok ? 100 + Math.round(50 * (left / limit)) : 0;
        if (ok && q.x) got *= 2;
        if (bet) { got = ok ? got * 2 : -100; betUsed = true; }
        points += got;
        answers.push({ k: Array.isArray(k) ? (k.length ? k : -1) : k, ok, ms: Math.min(ms, 600000), ...(bet ? { d: 1 } : {}) });
        sound(ok ? "right" : "wrong");
        const last = i === duel.qs.length - 1;
        body.append(el("div", { class: `sd-feedback ${ok ? "" : "miss"}`.trim() },
          el("p", {}, el("b", {}, ok ? T("Right! +{n}", { n: num(got) }) : k === -1 ? T("Time's up.") : bet ? T("Not this one: −100") : T("Not this one."))),
          el("p", {}, deck.right(q)), deck.feedExtra(q),
          el("div", { class: "row" }, btn(T(last ? "See the result" : "Next →"), () => (last ? done() : (i++, ask())), true))));
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
      if (fresh) { outbox.push({ op: "duel", room: me.room, me: me.id, duel: { id: d.id, ...(d.deck ? { deck: d.deck } : {}), range: d.range, qs: d.qs } }); keep(OUT_KEY, outbox); }
      send({ op: "result", room: me.room, me: me.id, duel: d.id, result: r });
      result(d);
    }
    ask();
  }

  // ---------- a duel's result, side by side ----------
  function result(duel) {
    screen = "result"; current = duel;
    const d = room.duels.find((x) => x.id === duel.id) || duel, p = partner(), a = d.results[me.id], b = d.results[p.id], deck = deckOf(d);
    if (!a) return play(d);           // not played yet here: nothing of theirs to see first
    const cell = (r, k) => r ? el("td", { class: r.answers[k].ok ? "ok" : "miss" }, `${r.answers[k].ok ? "✓" : "✗"} `,
      el("small", {}, `${T("{n} s", { n: (r.answers[k].ms / 1000).toFixed(1) })}${r.answers[k].d ? ` · ${T("×2 bet")}` : ""}`)) : el("td", {}, el("small", {}, "…"));
    view(el("div", { class: "sd-grid" },
      box("sd-done sd-wide", `${title(d)} · ${when(d.at)}`, b ? T("You {a} – {b} {name}", { a: num(a.points), b: num(b.points), name: p.name }) : T("You {points} · waiting for {name}", { points: num(a.points), name: p.name }),
        b ? el("div", { class: "sd-banner" }, a.points > b.points ? T("You won!") : b.points > a.points ? T("{name} won this one", { name: p.name }) : T("A draw"))
          : el("p", { class: "hint" }, T("{name}'s answers show here as soon as they've played: this page changes by itself.", { name: p.name })),
        el("table", { class: "sd-vs" },
          el("thead", {}, el("tr", {}, el("th", {}, T("Question")), el("th", {}, T("Answer")), el("th", {}, T("You")), el("th", {}, p.name))),
          el("tbody", {}, ...d.qs.map((q, k) => el("tr", {}, el("td", {}, q.x ? "↺ " : "", deck.summary(q)), el("td", {}, deck.answer(q)), cell(a, k), cell(b, k))))),
        el("div", { class: "row" }, btn(T("Rematch"), () => challenge(d.deck || "surahs", d.range), true), btn(T("Duels"), home)))));
  }

  $("sdHome").onclick = home;
  setupFullscreen(root);
  window.SurahDuel = { home, state: () => ({ me, room, outbox, current }), poll, decks: DECKS };      // for tests
  liveEl.textContent = me ? T("Connecting…") : "";
  home();
  if (me) poll(true);
  setInterval(() => poll(), POLL);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(true); });
  window.addEventListener("hashchange", () => { if (!me) home(); });
})();
