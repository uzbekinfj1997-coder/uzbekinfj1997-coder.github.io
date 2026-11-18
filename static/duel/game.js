/* Duels: people challenge each other, and see each other's duels and results. Surah Duel (Aziza's app) is on the surahs of the
   Quran; Study Duel (Maryamxon's and Robiyaxon's apps, 18.11.2026) is on the app's own subjects (sites.json "duel"). Each is a DECK.
   - A duel is the same questions for both (7 in a quick one): whoever challenges picks the deck and range and plays first. Points for each right
     answer and for speed; once a duel, "Double or nothing" on a question you're sure of (×2 if right, −100 if not). Up to two
     "revenge" questions bring back what either of you missed lately, worth double.
   - The two share a room on the server where the user's bot runs (server/duel_room.py in Sora's repository). Nobody has to be online
     at the same time: a challenge is sent once the challenger has played their part, with their score, and waits for the other, who
     sees it, and the score to beat, whenever they open the app. You can play your part before the other has even joined. The page
     reads the room when it opens and every few seconds while it's open. What can't be sent yet waits on the phone and goes when it can.
   - A phone joins the room once, with the invite link (…/#join=CODE), opened or pasted on the welcome screen. Opening that link again
     takes one's place back.
   - The room is the app's club (18.11.2026): up to ten players. A duel is for one of them ("to") or open to whoever plays it first;
     with two, Home looks as it did for a pair. The club keeps everyone's coins (static/coins.js; Study Quest's rounds and the duels earn
     them, the duels' worked out on the server): the purse and tier under the scoreboard, the Wallet, the Rewards (asked for here, given
     in real life by the banker in Sora personal's Club Bank, who takes their coins off) and the Hall of Fame.
   - The decks: Surah Numbers' surahs (study/surahs.js: questions by number, next, first, order, Arabic, meaning), or a subject's
     cards (study/<book>.js, put into the app's language by study/books-lang.js): a question names its card ("stage#place") and each
     phone shows it in its own language. English terms in brackets show only after answering, never in a question.
   - Each duel is set up by whoever challenges (18.11.2026): the subject and its parts, how many questions (5 to 20), multiple choice or
     typing (questions with no word to type stay multiple choice), front → back, back → front or both, the clock, the kinds of question,
     Double or nothing and revenge on or off. It travels with the duel as "cfg", so both play the same; "Same again" repeats the last.
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
  // a typed answer: capital letters, accents, punctuation and small typos forgiven (a letter or two, more in long answers); numbers exact
  const plainText = (s) => String(s).toLowerCase().replace(/ё/g, "е").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9а-я\u0600-\u06ff]+/g, " ").trim();
  function distance(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) { const keep = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = keep; }
    }
    return d[b.length];
  }
  function typedRight(typed, answers) {
    const t = plainText(typed).replace(/^(the|al|an|ar|as|at|ash|az|ad|adh) /, "");
    if (!t) return false;
    return answers.some((a) => {
      const forms = [a, String(a).split(/[,(]/)[0]].map((x) => plainText(x).replace(/^(the|al|an|ar|as|at|ash|az|ad|adh) /, ""));
      return forms.some((f) => (/^\d+$/.test(f) ? t === f : t === f || distance(t.replace(/ /g, ""), f.replace(/ /g, "")) <= (f.length <= 5 ? 1 : f.length <= 12 ? 2 : 3)));
    });
  }

  // ---------- the decks ----------
  // Surah Numbers' surahs: questions by number (as before 18.11.2026's Study Duel, unchanged: the duels already played read the same)
  function surahDeck(book) {
    const SURAHS = book.chapters[0].lists.flatMap((l) => l.items).map((it) => {
      const [ar, meaning] = String(it.why || "").split(" · ");
      return { n: Number(it.text), name: it.key, ar, meaning };
    });
    const S = (n) => SURAHS[n - 1];
    const RANGES = { amma: [78, 114, "Juz 'Amma", "surahs 78–114"], first30: [1, 30, "The first 30", "surahs 1–30"], all: [1, 114, "All 114", "the whole Quran"] };
    // the parts a duel can be on: the three above, and Surah Numbers' stages of ten
    const PARTS = [["all", "All 114"], ["amma", "Juz 'Amma (78–114)"], ["first30", "Surahs 1–30"],
      ...Array.from({ length: 12 }, (_, k) => [`t${k + 1}`, `Surahs ${k * 10 + 1}–${Math.min(114, k * 10 + 10)}`])];
    const numbersOf = (key) => {
      const r = RANGES[key] || (/^t(\d+)$/.test(key) ? [(Number(key.slice(1)) - 1) * 10 + 1, Math.min(114, Number(key.slice(1)) * 10)] : [1, 114]);
      return Array.from({ length: r[1] - r[0] + 1 }, (_, k) => r[0] + k);
    };
    const KINDS = [["num", "Number (name → number)"], ["name", "Name (number → name)"], ["after", "Which comes next"], ["first", "Which comes first"],
      ["order", "Putting in order"], ["arabic", "Arabic → name"], ["meaning", "Meaning → name"]];
    // other surahs close to n (within the duel's surahs when it can), for the wrong choices: close ones make it about knowing the exact one
    function near(n, lo, hi, k, not = [], pool = null) {
      const out = [], inPool = (m) => (pool ? pool.has(m) : m >= lo && m <= hi);
      for (let d = 1; out.length < k && d < 114; d++) for (const m of shuffle([n - d, n + d])) {
        if (out.length < k && m >= 1 && m <= 114 && !not.includes(m) && m !== n && (inPool(m) || d > 6)) out.push(m);
      }
      return out;
    }
    const plainMeaning = (n) => S(n).meaning && S(n).meaning.toLowerCase().replace(/[^a-z]/g, "") !== S(n).name.toLowerCase().replace(/^(al|an|ar|as|at|ash|az|ad|adh)-/, "").replace(/[^a-z]/g, "");
    function question(t, s, lo, hi, pool = null) {
      if (t === "num" || t === "name" || t === "arabic" || t === "meaning") { const o = shuffle([s, ...near(s, lo, hi, 3, [], pool)]); return { t, s, o, a: o.indexOf(s) }; }
      if (t === "after") { const next = s + 1, o = shuffle([next, ...near(next, lo, hi, 3, [s], pool)]); return { t, s, o, a: o.indexOf(next) }; }
      if (t === "first") { const other = shuffle(near(s, lo, hi, 6, [], pool).filter((m) => Math.abs(m - s) >= 2))[0] || near(s, lo, hi, 1)[0]; const o = shuffle([s, other]); return { t, s, o, a: o.indexOf(Math.min(s, other)) }; }
      const nums = pool ? [...pool] : Array.from({ length: hi - lo + 1 }, (_, k) => lo + k), pick = new Set([s]);
      while (pick.size < Math.min(4, nums.length)) pick.add(nums[rnd(nums.length)]);
      while (pick.size < 4) pick.add(near(s, 1, 114, 1, [...pick])[0]);
      return { t, s, o: shuffle([...pick]), a: [...pick].sort((x, y) => x - y) };
    }
    const LABEL = { num: "Which number is this surah?", name: "Which surah has this number?", after: "Which surah comes right after this one?",
      first: "Which comes first in the Quran?", order: "Put them in order, first to last", arabic: "Which surah is this?", meaning: "Which surah has this meaning?" };
    const ar = (s) => el("span", { class: "sd-ar", lang: "ar", dir: "rtl" }, s);
    return {
      id: "surahs", name: book.name, learnTitle: T("Surahs you both missed"),
      ranges: Object.entries(RANGES).map(([k, [, , label, about]]) => [k, `${label} · ${about}`]),
      rangeName: (k) => RANGES[k]?.[2] || PARTS.find(([p]) => p === k)?.[1] || k,
      parts: PARTS, kinds: KINDS, unit: ["surah", "surahs"], example: ["Al-Kahf", "18"],
      pool: (cfg) => [...new Set((cfg.parts?.length ? cfg.parts : ["all"]).flatMap(numbersOf))].sort((x, y) => x - y),
      // a duel set up: its surahs, the kinds asked (front → back is the number, back → front the name), how many, revenge
      make(cfg, missed) {
        const nums = this.pool(cfg), pool = new Set(nums), lo = nums[0], hi = nums[nums.length - 1];
        let kinds = (cfg.kinds?.length ? cfg.kinds : KINDS.map(([k]) => k)).filter((k) => !(cfg.dir === "front" && k === "name") && !(cfg.dir === "back" && k === "num"));
        if (nums.length < 4) kinds = kinds.filter((k) => k !== "order");
        if (nums.length < 2) kinds = kinds.filter((k) => k !== "first");
        if (!kinds.length) kinds = [cfg.dir === "back" ? "name" : "num"];
        const want = Math.min(cfg.n || QUESTIONS, nums.length), qs = [], used = new Set();
        if (cfg.revenge !== 0) {
          const kind = kinds.find((k) => k === "num" || k === "name") || kinds[0];
          for (const s of shuffle([...missed].filter((x) => pool.has(x))).slice(0, Math.min(2, Math.floor(want / 3)))) { const q = question(kind, s, lo, hi, pool); q.x = 1; qs.push(q); used.add(s); }
        }
        let cycle = shuffle(kinds);
        while (qs.length < want) {
          if (!cycle.length) cycle = shuffle(kinds);
          const t = cycle.pop(), free = nums.filter((s) => !used.has(s) && !(t === "after" && s >= 114) && !(t === "meaning" && !plainMeaning(s)));
          if (!free.length) { if (kinds.every((k) => !nums.some((s) => !used.has(s)))) break; continue; }
          const s = free[rnd(free.length)];
          used.add(s);
          qs.push(question(t, s, lo, hi, pool));
        }
        return shuffle(qs);
      },
      typeable: (q) => ["num", "name", "after", "arabic", "meaning"].includes(q.t),
      typed: (q) => (q.t === "num" ? [String(q.s)] : q.t === "after" ? [S(q.s + 1).name] : [S(q.s).name]),
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
    // the parts to pick from when setting a duel up: the chapters or sections, or within one, its continents or its stages
    const setupParts = [["all", T("All"), cidsOf(lists)]];
    if (parts.length > 1) for (const c of parts) setupParts.push([`c:${c.n}`, c.title, cidsOf(c.lists)]);
    else if (groups.length > 1) for (const g of groups) setupParts.push([`g:${slug(g)}`, g, cidsOf(lists.filter((l) => l.group === g))]);
    else lists.forEach((l, k) => setupParts.push([`l:${k + 1}`, l.name, cidsOf([l])]));
    const byKey = Object.fromEntries([...ranges, ...setupParts].map(([k, , ids]) => [k, ids]));
    const labelOf = Object.fromEntries([...ranges, ...setupParts].map(([k, label]) => [k, label]));
    const KIND = { sentence: "cards", tf: "tf", case: "cases", sort: "cases", order: "order" };
    const kindsHere = [...new Set([...cards.values()].map(({ it }) => KIND[kindOf(it)]))];
    const KINDS = [["cards", T("Question and answer cards")], ["tf", T("True or false")], ["cases", T("Scenarios")], ["order", T("Putting in order")]].filter(([k]) => kindsHere.includes(k));
    const firstCard = [...cards.values()].find(({ it }) => kindOf(it) === "sentence")?.it;
    const card = (cid) => cards.get(cid)?.it;
    function question(cid, pool, way = rnd(2)) {
      const { it, l } = cards.get(cid), kind = kindOf(it);
      if (kind === "tf") return { t: "tf", c: cid, o: [0, 1], a: it.a ? 0 : 1 };
      if (kind === "case" || kind === "sort") { const o = shuffle(it.opts.map((_, k) => k)); return { t: kind, c: cid, o, a: o.indexOf(it.a) }; }
      if (kind === "order") { const steps = it.steps.slice(0, 8).map((_, k) => k); return { t: "order", c: cid, o: shuffle(steps), a: steps }; }
      // a sentence card, one way or the other; the wrong choices from its own stage first (the same continent, say), then the range
      const w = way, face = (c) => (w === 0 ? card(c).text : card(c).key);
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
      rangeName: (k) => labelOf[k] || k,
      parts: setupParts.map(([k, label]) => [k, label]), kinds: KINDS.length > 1 ? KINDS : [], unit: ["card", "cards"],
      example: firstCard ? [firstCard.key, firstCard.text] : null,
      pool(cfg) {
        const keys = cfg.parts?.length ? cfg.parts : ["all"], kinds = cfg.kinds?.length ? cfg.kinds : null;
        return [...new Set(keys.flatMap((k) => byKey[k] || []))].filter((cid) => !kinds || kinds.includes(KIND[kindOf(card(cid))]));
      },
      make(cfg, missed) {
        const pool = this.pool(cfg), want = Math.min(cfg.n || QUESTIONS, pool.length), qs = [], used = new Set();
        const way = () => (cfg.dir === "front" ? 0 : cfg.dir === "back" ? 1 : rnd(2));
        if (cfg.revenge !== 0) for (const cid of shuffle(pool.filter((c) => missed.has(c))).slice(0, Math.min(2, Math.floor(want / 3)))) { const q = question(cid, pool, way()); q.x = 1; qs.push(q); used.add(cid); }
        for (const cid of shuffle(pool)) { if (qs.length >= want) break; if (!used.has(cid)) { qs.push(question(cid, pool, way())); used.add(cid); } }
        return shuffle(qs);
      },
      // typing: a card asked for a short answer; a sentence's start, true or false, scenarios and orders stay multiple choice
      typeable(q) {
        if (q.t !== "card") return false;
        const it = card(q.c), answer = q.w === 0 ? it.text : it.key;
        return !(q.w === 1 && isStem(it)) && String(answer).length <= 40;
      },
      typed: (q) => [q.w === 0 ? card(q.c).text : card(q.c).key],
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
  // what a duel is on ("Geography · Africa, Asia"), and how it's set up ("10 questions · typing · back → front · 15 s")
  const partsName = (deck, keys) => (keys.length <= 2 ? keys.map((k) => deck.rangeName(k)).join(", ") : T("{first} and {n} more", { first: deck.rangeName(keys[0]), n: keys.length - 1 }));
  const title = (d) => (Object.keys(DECKS).length > 1 ? `${deckOf(d).name} · ` : "") + (d.cfg?.parts?.length && d.range === "custom" ? partsName(deckOf(d), d.cfg.parts) : deckOf(d).rangeName(d.range));
  const DIRS = { front: "front → back", back: "back → front", both: "both ways" };
  const setupLine = (c) => !c ? "" : [T("{n} questions", { n: c.n ?? QUESTIONS }), T(c.mode === "typing" ? "typing" : "multiple choice"), T(DIRS[c.dir || "both"]),
    c.time === 0 ? T("no clock") : T("{n} s", { n: c.time ?? 15 })].join(" · ");
  const DEFAULT = { n: QUESTIONS, mode: "choice", dir: "both", time: 15, bet: 1, revenge: 1 };
  const SETUP_KEY = "sora.duel.setup.v1";

  // ---------- what this phone keeps ----------
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full */ } };
  let me = read(ME_KEY, null);            // { room, id, name }: this phone's place in the room
  let room = read(ROOM_KEY, null);        // the room as last read: { v, members, duels, coins, totals, spent, rewards, asks, app }
  let outbox = read(OUT_KEY, []);         // writes not yet through
  // the other's duels and results already announced; null on a phone that has never looked at this room (it starts quietly)
  let seen = read(SEEN_KEY, null) && new Set(read(SEEN_KEY, []));
  let screen = "home", current = null, polling = false;

  // the partner, or, before they've joined, the place kept for them: you can play your part straight away
  const partner = () => room?.members.find((m) => m.id !== me?.id) || (room && me ? { id: me.id === "a" ? "b" : "a", name: T("your partner"), waiting: true } : null);
  const nameOf = (id) => (id === me?.id ? T("You") : room?.members.find((m) => m.id === id)?.name || "?");
  const duels = () => room.duels.filter(known);
  // ---------- the club: up to ten players (18.11.2026); a duel is between two of them: whoever made it (by) and whoever it's for (to), or,
  // when it's open, whoever plays it first ----------
  const others = () => (room && me ? room.members.filter((m) => m.id !== me.id) : []);
  const memberOf = (id) => room?.members.find((m) => m.id === id);
  const CLUB = () => others().length > 1;            // more than a pair: a duel says whom it's for, and Home shows the club
  const otherSide = (d) => d.to || Object.keys(d.results).find((x) => x !== d.by) || null;
  const forMe = (d) => d.by !== me.id && (otherSide(d) ? otherSide(d) === me.id : true);     // made by another, for this player or open
  // the one across from this player: who made it, or whom it's for; in a pair, the partner (once they've joined)
  const oppOf = (d) => (d.by !== me.id ? d.by : otherSide(d) || (others().length === 1 ? others()[0].id : null));
  const oppName = (d) => { const o = oppOf(d); return o ? memberOf(o)?.name || "?" : CLUB() ? T("anyone in the club") : partner().name; };
  const isDone = (d) => { const o = otherSide(d); return !!o && !!d.results[d.by] && !!d.results[o]; };
  // whom the next duel is for, in a club of three or more: one of the others, or anyone (null)
  const TO_KEY = "sora.duel.to.v1";
  const targetOk = () => { const t = read(TO_KEY, null); return t && others().some((m) => m.id === t) ? t : null; };
  function whomChoice(redraw) {
    const now = targetOk();
    return el("div", { class: "set-choice sd-whom", role: "radiogroup", "aria-label": T("Whom to challenge") }, ...[[null, T("Anyone")], ...others().map((m) => [m.id, m.name])].map(([v, label]) => {
      const b = el("button", { type: "button", class: v === now ? "on" : "", role: "radio", "aria-checked": String(v === now) }, label);
      b.onclick = () => { keep(TO_KEY, v); redraw(); };
      return b;
    }));
  }
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
    const r = await fetch(`${SERVER}?${q}`, body ? { method: "POST", body: JSON.stringify({ ...body, app: window.SoraApp?.id }), headers: { "Content-Type": "text/plain" } } : { cache: "no-store" });
    let j = {};
    try { j = await r.json(); } catch { /* not JSON */ }
    if (!r.ok || !j.ok) { const e = new Error(j.error || T("the server answered {n}", { n: r.status })); e.status = r.status; throw e; }
    return j;
  }
  function take(st) {
    if (!st || st.same || !st.members) return false;
    room = { v: st.v, members: st.members, duels: st.duels, coins: st.coins || [], totals: st.totals || {}, spent: st.spent || [],
      rewards: st.rewards || [], asks: st.asks || [], wins: st.wins || null, app: st.app || "" };
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
  // the others' new challenges and results (and who's joined): a chime and a line at the top, once each
  function announce() {
    const fresh = [], club = CLUB();
    for (const m of others()) if (!seen?.has(`joined:${m.id}`)) fresh.push([`joined:${m.id}`, !club && room.duels.some((d) => d.by === me.id)
      ? T("{name} joined: your duels are waiting for them", { name: m.name }) : T(club ? "{name} joined the club" : "{name} joined", { name: m.name })]);
    for (const d of duels()) {
      if (forMe(d) && d.results[d.by] && !d.results[me.id] && !seen?.has(d.id)) fresh.push([d.id, T(d.to || !club ? "{name} challenged you: {what}, {points} points to beat"
        : "{name} challenged anyone in the club: {what}, {points} points to beat", { name: nameOf(d.by), what: title(d), points: num(d.results[d.by].points) })]);
      const o = otherSide(d);
      if (d.by === me.id && o && d.results[o] && !seen?.has(`${d.id}:${o}`)) {
        const mine = d.results[me.id]?.points, theirs = d.results[o].points, name = nameOf(o);
        fresh.push([`${d.id}:${o}`, mine === undefined ? T("{name} played your duel", { name }) : T("{name} played your duel: you {mine}, {name} {theirs}", { name, mine: num(mine), theirs: num(theirs) })]);
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
    else if (screen === "wallet") wallet();
    else if (screen === "rewards") rewards();
    else if (screen === "fame") fame();
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
  // coins earned on this phone before it was in a club go to the club as soon as it's joined
  const sendWaiting = () => { if (COINS?.balance().waiting) COINS.flush().then((ok) => ok && poll(true)); };
  function welcome() {
    screen = "welcome";
    view(el("div", { class: "sd-grid" },
      box("sd-turn sd-wide", GAME, SURAH_ONLY ? "Challenge each other on the surahs" : T("Challenge each other on what you're learning"),
        el("p", {}, SURAH_ONLY ? "Each duel is the same questions for both of you: which number a surah is, which comes next, which comes first, putting them in order, and surahs by their Arabic or meaning. Whoever challenges sets it up: how many questions, which surahs, multiple choice or typing. You see each other's results as they come in, so you can learn together."
          : T("Each duel is the same questions for both of you, on {subjects}. Whoever challenges sets it up: the subject and its parts, how many questions, multiple choice or typing. You see each other's results as they come in, so you can learn together.", { subjects: deckNames() })),
        el("p", { class: "hint" }, T("Start a room here, then send the invite link to the one you want to duel with. You only do this once.")),
        nameForm(T("Start a duel room"), async (name) => {
          const st = await call({}, { op: "create", name });
          me = { room: st.room, id: st.me, name }; keep(ME_KEY, me); seen = new Set(); keep(SEEN_KEY, []); take(st); live(true); home(); sendWaiting();
        })),
      pasteBox()));
  }
  // an invite sent in a message: opening the link joins; so does pasting it here (rather than starting a room of your own)
  function pasteBox() {
    const input = el("input", { type: "text", placeholder: T("Paste the invite link here"), "aria-label": T("The invite link"), autocomplete: "off" });
    const msg = el("p", { class: "hint" });
    const go = (e) => {
      e?.preventDefault();
      const code = (input.value.match(/join=([A-Za-z0-9_-]{24})/) || [])[1];
      if (!code) { msg.textContent = T("That isn't an invite link: it ends in #join= and a code."); return; }
      joinScreen(code);
    };
    return box("sd-wait sd-wide sd-paste", T("Have an invite?"), T("Join the club you were invited to"),
      el("p", {}, T("If someone sent you their invite link, open it, or paste it here: you'll be in their club, with them, instead of starting one of your own.")),
      el("form", { class: "sd-form", onsubmit: go }, input, el("div", { class: "row" }, el("button", { type: "submit" }, T("Open the invite")))), msg);
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
      sendWaiting();
    };
    if (st.members.length < 2) {
      return view(box("sd-turn", GAME, T("{name} invites you to a duel room", { name: st.members[0].name }),
        el("p", {}, SURAH_ONLY ? "You'll challenge each other on the surahs and see each other's results as they come in." : T("You'll challenge each other on {subjects} and see each other's results as they come in.", { subjects: deckNames() })),
        nameForm(T("Join"), async (name) => done(await call({}, { op: "join", room: code, name }), name))));
    }
    // a room with players already: one of them on a new phone takes their place back, or someone new joins (up to ten)
    const full = st.members.length >= 10;
    view(el("div", { class: "sd-grid" },
      box("sd-turn", GAME, T("Which of you is this?"), el("p", {}, T("In this club: {names}. One of them, on a new phone? Pick your name to carry on here.", { names: st.members.map((m) => m.name).join(", ") })),
        el("div", { class: "row" }, ...st.members.map((m) => btn(T("I'm {name}", { name: m.name }), async () => done(await call({}, { op: "join", room: code, as: m.id }), m.name, true), true)))),
      full ? box("sd-wait", GAME, T("The club is full"), el("p", {}, T("It has ten players, the most a club can have.")))
        : box("sd-new", GAME, T("New here?"), el("p", {}, T("Type your name to join: you'll challenge each other and see each other's results as they come in.")),
          nameForm(T("Join"), async (name) => done(await call({}, { op: "join", room: code, name }), name)))));
  }
  const inviteLink = () => `${location.origin}${location.pathname}#join=${me.room}`;
  async function shareLink() {
    try { if (navigator.share) return await navigator.share({ title: GAME, text: T("{name} invites you to {game}", { name: me.name, game: GAME }), url: inviteLink() }); } catch { return; }
    copyLink();
  }
  const copyLink = () => navigator.clipboard?.writeText(inviteLink()).then(() => toast(T("The link is copied: paste it in a message")), () => {});
  function inviteBox() {
    return box("sd-wait sd-wide", T("Invite your partner"), T("Waiting for them to join"),
      el("p", {}, T("Send them this link (Telegram, WhatsApp or any message). When they open it and type their name, they're in, and they'll find your duels waiting with your scores. You can start playing now.")),
      el("div", { class: "sd-link" }, inviteLink()),
      el("div", { class: "row" }, btn(T("Share the link"), shareLink), btn(T("Copy"), copyLink)),
      el("p", { class: "hint" }, T("Keep the link to the people you want in the club: anyone with it can join (up to ten).")));
  }
  // the room's players with their tiers, and the link for one more
  function clubBox() {
    if (room.members.length < 2) return "";
    const earned = (m) => (m.id === me.id ? COINS?.balance().earned : room.totals?.[m.id]?.earned) || 0;
    return box("sd-club sd-wide", T("Your club"), T("{n} of 10 players", { n: room.members.length }),
      el("ul", { class: "sd-members" }, ...room.members.map((m) => el("li", {}, el("b", {}, m.id === me.id ? T("{name} (you)", { name: m.name }) : m.name),
        COINS ? el("small", {}, tierLabel(COINS.tierOf(earned(m)).name)) : ""))),
      room.members.length < 10 ? el("details", { class: "sd-invite" }, el("summary", {}, T("Invite someone else")),
        el("p", { class: "hint" }, T("Send them this link. When they open it and type their name, they're in: you can challenge them, and they you.")),
        el("div", { class: "sd-clublink" }, inviteLink()),
        el("div", { class: "row" }, btn(T("Share the link"), shareLink), btn(T("Copy"), copyLink))) : "");
  }

  // another club's invite on a phone that's in one: join that one instead (what was done in this one stays there), or stay
  function switchScreen(code) {
    screen = "switch";
    const names = (room?.members || [{ name: me.name }]).map((m) => m.name).join(", ");
    const msg = el("p", { class: "hint" });
    const go = async () => {
      if (!(await flush())) { msg.textContent = T("Something from this phone hasn't reached your club yet: try again when it's online."); return; }
      me = null; room = null; outbox = []; seen = null;
      for (const k of [ME_KEY, ROOM_KEY, OUT_KEY, SEEN_KEY]) keep(k, null);
      joinScreen(code);
    };
    view(el("div", { class: "sd-grid" }, box("sd-turn sd-wide sd-switch", GAME, T("An invite to another club"),
      el("p", {}, T("This phone is in a club with {names}. The link you opened is for another club. Join that one instead? What you've done in this one stays there.", { names })),
      el("div", { class: "row" }, btn(T("Join the other club"), go, true), btn(T("Stay in this one"), () => { history.replaceState(null, "", location.pathname); home(); })), msg)));
  }

  // ---------- the numbers: score, streak, the week, what you both missed ----------
  // this player's duels that both sides have played
  const finished = () => duels().filter((d) => isDone(d) && (d.by === me.id || otherSide(d) === me.id));
  function tally() {
    let won = 0, lost = 0, draws = 0;
    for (const d of finished()) {
      const a = d.results[me.id].points, b = d.results[oppOf(d)].points;
      if (a > b) won++; else if (b > a) lost++; else draws++;
    }
    return { won, lost, draws };
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
      if ([d.by, otherSide(d)].every((x) => !d.results[x].answers[i].ok) && !out.includes(key)) out.push(key);
    });
    return out.slice(0, limit).map((k) => { const [deck, s] = k.split("|"); return [DECKS[deck], deck === "surahs" ? Number(s) : s]; });
  }
  // revenge: what was missed lately in this deck, in this player's duels
  function missedLately(deck) {
    const out = new Set();
    for (const d of duels().filter((x) => (x.deck || "surahs") === deck && (x.by === me.id || forMe(x))).slice(-12)) d.qs.forEach((q, i) => {
      if (Object.values(d.results).some((r) => !r.answers[i]?.ok)) out.add(deckOf(d).revenge(q));
    });
    return out;
  }

  // ---------- Home ----------
  function home() {
    current = null;
    const code = (location.hash.match(/join=([A-Za-z0-9_-]{24})/) || [])[1];
    if (!me) return code ? joinScreen(code) : welcome();
    // an invite link opened on a phone that's in a club already: another club's, or (opened again) its own
    if (code && code !== me.room) return switchScreen(code);
    if (code) history.replaceState(null, "", location.pathname);
    if (!room) { view(el("p", { class: "hint" }, T("Opening the duel room…"))); poll(true); return; }
    screen = "home";
    const club = CLUB(), p = partner(), { won, lost, draws } = tally(), { streak, right } = together(), goal = club ? 50 * room.members.length : GOAL;
    const rightOf = (r) => r.answers.filter((a) => a.ok).length;
    // the challenges for this player, once their maker has played (the score to beat); the maker's answers stay hidden until you've played
    const turn = duels().filter((d) => forMe(d) && !d.results[me.id] && d.results[d.by]).reverse();
    const waiting = duels().filter((d) => d.results[me.id] && !isDone(d)).reverse();
    const done = finished().reverse();
    const learn = missedByBoth();
    const n = (k, one, many) => T("{n} {what}", { n: k, what: plural(k, one, many) });
    const target = targetOk(), whom = club ? (target ? memberOf(target).name : T("anyone in the club")) : p.name;
    view(
      el("section", { class: "sd-score" },
        el("div", { class: "who" }, el("small", {}, T("You")), el("b", {}, me.name)),
        el("div", { class: "vs" }, `${won} – ${lost}`, el("small", {}, club ? (draws ? T("won – lost · {n} drawn", { n: draws }) : T("won – lost")) : draws ? T("duels won · {n} drawn", { n: draws }) : T("duels won"))),
        club ? el("div", { class: "who" }, el("small", {}, T("Your club")), el("b", {}, n(room.members.length, "player", "players")))
          : el("div", { class: "who" }, el("small", {}, T("Your partner")), el("b", {}, p.waiting ? T("Not joined yet") : p.name)),
        el("div", { class: "sd-together" },
          club ? "" : el("span", {}, T("Together streak: "), el("b", {}, n(streak, "day", "days"))),
          el("span", {}, T(club ? "This week, in the club: " : "This week, between you: "), el("b", {}, T("{right} / {goal} right answers", { right, goal }))),
          el("span", { class: "sd-meter", "aria-hidden": "true" }, el("i", { style: `width:${Math.min(100, Math.round((right / goal) * 100))}%` })))),
      coinStrip(),
      el("div", { class: "sd-grid" },
        p.waiting ? inviteBox() : "",
        turn.length ? box("sd-turn", T("Your turn"), T("{n} waiting for you", { n: n(turn.length, "duel", "duels") }),
          el("ul", { class: "sd-list" }, ...turn.slice(0, 6).map((d) => el("li", {},
            el("span", {}, `${T(d.to || !club ? "{name} challenged you" : "{name} challenged anyone in the club", { name: nameOf(d.by) })} · ${title(d)} `, el("br"),
              el("b", {}, T("{name}: {right} of {all} right, {points} points", { name: nameOf(d.by), right: rightOf(d.results[d.by]), all: d.qs.length, points: num(d.results[d.by].points) })), " ",
              el("small", {}, when(d.results[d.by].at)), d.cfg ? el("br") : "", d.cfg ? el("small", { class: "sd-cfg" }, setupLine(d.cfg)) : ""), btn(T("Beat it ▶"), () => play(d), true, "small"))))) : "",
        box("sd-new", T("New duel"), club ? T("Challenge someone") : T("Challenge {name}", { name: p.name }),
          club ? whomChoice(home) : "",
          el("p", { class: "hint" }, club ? T("You play first. When you've finished, {name} gets the challenge with your score to beat. Pick what it's on:", { name: whom })
            : T("You play first. When you've finished, {name} gets the challenge with your score to beat, whenever they next open the app. Pick what it's on:", { name: p.name })),
          lastSetup() ? el("div", { class: "row" }, btn(T("Same again: {what}", { what: `${lastSetup().deckName} · ${setupLine(lastSetup().cfg)}` }), () => challenge(lastSetup().deck, "custom", lastSetup().cfg), true)) : "",
          el("div", { class: "row" }, btn(T("Set up a duel…"), () => setup(), true, "sd-setup-btn")),
          el("p", { class: "hint" }, T("Or a quick one: {setup}", { setup: setupLine(DEFAULT) })),
          ...Object.values(DECKS).map((deck) => el("div", { class: "sd-ranges" }, Object.keys(DECKS).length > 1 ? el("small", { class: "sd-deck" }, deck.name) : "",
            ...deck.ranges.map(([k, label]) => btn(label, () => challenge(deck.id, k), false))))),
        waiting.length ? box("sd-wait", club ? T("Waiting for the others") : T("Waiting for {name}", { name: p.name }), T("{n} sent", { n: n(waiting.length, "duel", "duels") }),
          el("ul", { class: "sd-list" }, ...waiting.slice(0, 6).map((d) => el("li", {}, el("span", {}, `${title(d)} · ${club ? `${T("for {name}", { name: oppName(d) })} · ` : ""}${T("you {points}", { points: num(d.results[me.id].points) })} `,
            el("small", {}, when(d.results[me.id].at))), btn(T("See"), () => result(d), false, "small"))))) : "",
        done.length ? box("sd-done", T("Results"), T("The latest duels"),
          el("ul", { class: "sd-list" }, ...done.slice(0, 8).map((d) => {
            const o = oppOf(d), a = d.results[me.id].points, b = d.results[o].points;
            return el("li", {}, el("span", {}, `${a > b ? "🏆 " : ""}${T("You {a} – {b} {name}", { a: num(a), b: num(b), name: nameOf(o) })}${b > a ? " 🏆" : ""} `,
              el("small", {}, `${title(d)} · ${when(Math.max(d.results[me.id].at, d.results[o].at))}`)), btn(T("See"), () => result(d), false, "small"));
          }))) : "",
        learn.length ? box("sd-learn", T("Learn together"), learn[0][0].learnTitle,
          el("ul", { class: "sd-list" }, ...learn.map(([deck, s]) => el("li", {}, ...deck.learnRow(s)))),
          el("p", { class: "hint" }, T("They come back as revenge questions in your next duels."))) : "",
        clubBox()));
  }

  // ---------- making a duel: 7 questions, the same for both ----------
  // a new duel is played first by whoever makes it; it's sent, with their result, only when they've finished (giving up sends nothing)
  function challenge(deck, range, cfg = null, to = undefined) {
    const setupOf = cfg || { ...DEFAULT, parts: [range] }, whom = to !== undefined ? to : CLUB() ? targetOk() : null;
    const qs = DECKS[deck].make(setupOf, setupOf.revenge === 0 ? new Set() : missedLately(deck));
    if (!qs.length) { toast(T("Nothing to ask in that choice: pick more parts or kinds.")); return; }
    play({ id: Date.now().toString(36) + rnd(46656).toString(36).padStart(3, "0"), ...(deck !== "surahs" ? { deck } : {}), range: cfg ? "custom" : range, cfg: setupOf, qs, by: me.id, ...(whom ? { to: whom } : {}), at: Date.now(), results: {} });
  }
  const lastSetup = () => { const l = read(SETUP_KEY, null); return l && DECKS[l.deck] ? { ...l, deckName: DECKS[l.deck].name } : null; };

  // ---------- setting a duel up ----------
  function setup() {
    screen = "setup";
    const last = lastSetup();
    let deckId = last?.deck || Object.keys(DECKS)[0];
    let cfg = { ...DEFAULT, parts: ["all"], kinds: [], ...(last && last.deck === deckId ? last.cfg : {}) };
    const choice = (options, current, pick) => el("div", { class: "set-choice", role: "radiogroup" }, ...options.map(([v, label]) => {
      const b = el("button", { type: "button", class: v === current ? "on" : "", role: "radio", "aria-checked": String(v === current) }, label);
      b.onclick = () => pick(v);
      return b;
    }));
    const ticks = (options, chosen, toggle) => el("div", { class: "sd-ticks" }, ...options.map(([v, label]) => {
      const b = el("button", { type: "button", class: chosen.includes(v) ? "on" : "", "aria-pressed": String(chosen.includes(v)) }, label);
      b.onclick = () => toggle(v);
      return b;
    }));
    const row = (label, control, hint = "") => el("div", { class: "sd-row" }, el("div", { class: "sd-row-label" }, el("b", {}, label), hint ? el("small", {}, hint) : ""), control);
    function draw() {
      const deck = DECKS[deckId], pool = deck.pool(cfg), unit = tr.n(pool.length, deck.unit[0], deck.unit[1]);
      const ex = deck.example ? T("front: {front} · back: {back}", { front: cut(deck.example[0], 40), back: cut(deck.example[1], 30) }) : "";
      const parts = cfg.parts?.length ? cfg.parts : ["all"];
      view(el("div", { class: "sd-grid" }, box("sd-new sd-wide", T("New duel"), T("Set up a duel"),
        CLUB() ? row(T("Whom to challenge"), whomChoice(draw), T("Anyone: whoever plays it first takes it")) : "",
        Object.keys(DECKS).length > 1 ? row(T("Subject"), choice(Object.values(DECKS).map((d) => [d.id, d.name]), deckId, (v) => { deckId = v; cfg = { ...cfg, parts: ["all"], kinds: [] }; draw(); })) : "",
        row(T("Parts"), ticks(deck.parts, parts, (v) => {
          const now = parts.filter((x) => x !== "all");
          cfg.parts = v === "all" ? ["all"] : now.includes(v) ? now.filter((x) => x !== v) : [...now, v];
          if (!cfg.parts.length) cfg.parts = ["all"];
          draw();
        }), T("{n} {unit} in this choice", { n: pool.length, unit })),
        deck.kinds.length ? row(T("Kinds of question"), ticks(deck.kinds, cfg.kinds?.length ? cfg.kinds : deck.kinds.map(([k]) => k), (v) => {
          const all = deck.kinds.map(([k]) => k), now = cfg.kinds?.length ? cfg.kinds : all;
          cfg.kinds = now.includes(v) ? now.filter((x) => x !== v) : [...now, v];
          if (!cfg.kinds.length || cfg.kinds.length === all.length) cfg.kinds = [];
          draw();
        })) : "",
        row(T("Questions"), choice([5, 7, 10, 15, 20].map((k) => [k, String(k)]), cfg.n, (v) => { cfg.n = v; draw(); }), pool.length < cfg.n ? T("Only {n} in this choice: the duel has {n}.", { n: pool.length }) : ""),
        row(T("Test"), choice([["choice", T("Multiple choice")], ["typing", T("Typing")]], cfg.mode, (v) => { cfg.mode = v; draw(); }),
          cfg.mode === "typing" ? T("Small typos and capital letters are forgiven. True or false, scenarios and putting in order stay multiple choice.") : ""),
        row(T("Direction"), choice([["front", T("Front → back")], ["back", T("Back → front")], ["both", T("Both ways")]], cfg.dir, (v) => { cfg.dir = v; draw(); }), ex),
        row(T("Time per question"), choice([[0, T("No clock")], [10, T("{n} s", { n: 10 })], [15, T("{n} s", { n: 15 })], [30, T("{n} s", { n: 30 })]], cfg.time, (v) => { cfg.time = v; draw(); }),
          cfg.mode === "typing" && cfg.time ? T("Typing gets twice the time.") : ""),
        row(T("Double or nothing"), choice([[1, T("On")], [0, T("Off")]], cfg.bet, (v) => { cfg.bet = v; draw(); })),
        row(T("Revenge questions"), choice([[1, T("On")], [0, T("Off")]], cfg.revenge, (v) => { cfg.revenge = v; draw(); }), T("Up to two you or your partner missed lately, worth double")),
        el("div", { class: "row" }, btn(T("Play ▶"), () => {
          const c = { ...cfg, parts: cfg.parts?.length ? cfg.parts : ["all"] };
          if (!c.kinds?.length) delete c.kinds;
          keep(SETUP_KEY, { deck: deckId, cfg: c });
          challenge(deckId, "custom", c);
        }, true, "sd-play-btn"), btn(T("Cancel"), home, false, "link")))));
      main.querySelector(".sd-play-btn").disabled = !pool.length;
    }
    draw();
  }

  // ---------- playing a duel ----------
  function play(duel) {
    screen = "play"; current = duel;
    const deck = deckOf(duel), cfg = { ...DEFAULT, ...(duel.cfg || {}) };
    let i = 0, points = 0, betUsed = !cfg.bet, timer = null;
    const answers = [], start = Date.now();
    const hud = el("div", { class: "sd-hud" }), clock = el("div", { class: "sd-clock" }, el("i")), body = el("div", { class: "sd-play" });
    const other = duel.by === me.id ? (duel.to ? memberOf(duel.to) : others().length === 1 ? others()[0] : CLUB() ? { name: T("anyone in the club") } : partner())
      : memberOf(duel.by), toBeat = duel.by !== me.id ? duel.results[duel.by]?.points : null;
    view(el("div", { class: "sd-play" }, hud, clock, body, el("div", { class: "row" }, btn(T("Give up"), () => { clearInterval(timer); home(); }, false, "link"))));
    function ask() {
      const q = duel.qs[i], order = deck.isOrder(q), typing = cfg.mode === "typing" && deck.typeable?.(q), began = performance.now();
      // the clock: the duel's time a question, more for putting in order (5:3, as 25 s to 15 s) and twice for typing; none if it's off
      const limit = !cfg.time ? 0 : order ? Math.round((cfg.time * TIME_ORDER) / TIME) : typing ? cfg.time * 2 : cfg.time;
      let bet = false, picked = [], over = false;
      hud.replaceChildren(el("span", {}, T("Question {n} of {all}", { n: i + 1, all: duel.qs.length })),
        el("span", {}, toBeat == null ? T("vs {name}", { name: other?.name || "?" }) : T("{name}: {points} to beat", { name: other?.name || "?", points: num(toBeat) })),
        el("span", {}, T("{n} points", { n: num(points) })));
      const opts = typing ? [] : q.o.map((v, k) => btn(deck.optionText(q, v), () => pick(k), false));
      const betBtn = betUsed ? "" : btn(T("Double or nothing: ×2 if right, −100 if not"), () => { bet = !bet; betBtn.classList.toggle("on", bet); }, false, "small sd-bet");
      const input = typing ? el("input", { type: "text", class: "sd-type", placeholder: T("Type the answer"), "aria-label": T("Your answer"), autocomplete: "off", autocapitalize: "off", spellcheck: "false" }) : null;
      const check = () => { if (input.value.trim()) finish(-1, typedRight(input.value, deck.typed(q)), input.value.trim()); };
      if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      body.replaceChildren(el("div", { class: "sd-q" }, q.x ? el("span", { class: "tag" }, T("Revenge ×2")) : "", el("small", {}, deck.label(q)), deck.prompt(q), deck.extra(q)),
        typing ? el("div", { class: "sd-typing" }, input, el("div", { class: "row" }, btn(T("Check"), check, true), btn(T("I don't know"), () => finish(-1, false, ""), false))) : el("div", { class: "sd-opts" }, ...opts), betBtn);
      if (input) setTimeout(() => input.focus(), 30);
      clearInterval(timer);
      clock.firstChild.style.width = limit ? "100%" : "0";
      if (limit) timer = setInterval(() => {
        const left = Math.max(0, limit - (performance.now() - began) / 1000);
        clock.firstChild.style.width = `${(left / limit) * 100}%`;
        if (left <= 0) finish(order ? picked.map((k) => q.o[k]) : -1, false, input ? input.value.trim() : undefined, true);
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
      function finish(k, ok, typed, timedOut = false) {
        if (over) return;
        over = true; clearInterval(timer);
        const ms = Math.round(performance.now() - began), left = limit ? Math.max(0, limit - ms / 1000) : 0;
        opts.forEach((o, n) => { o.disabled = true; if (!order) { o.classList.toggle("good", n === q.a); o.classList.toggle("bad", n === k && !ok); } });
        if (input) { input.disabled = true; body.querySelectorAll(".sd-typing button").forEach((b) => (b.disabled = true)); input.classList.add(ok ? "good" : "bad"); }
        if (typed !== undefined && ok) k = q.a ?? 0;
        let got = ok ? 100 + (limit ? Math.round(50 * (left / limit)) : 0) : 0;
        if (ok && q.x) got *= 2;
        if (bet) { got = ok ? got * 2 : -100; betUsed = true; }
        points += got;
        answers.push({ k: Array.isArray(k) ? (k.length ? k : -1) : k, ok, ms: Math.min(ms, 600000), ...(bet ? { d: 1 } : {}), ...(typed !== undefined ? { y: String(typed).slice(0, 80) } : {}) });
        sound(ok ? "right" : "wrong");
        const last = i === duel.qs.length - 1;
        body.append(el("div", { class: `sd-feedback ${ok ? "" : "miss"}`.trim() },
          el("p", {}, el("b", {}, ok ? T("Right! +{n}", { n: num(got) }) : bet ? T("Not this one: −100") : timedOut ? T("Time's up.") : typed === "" ? T("Here it is.") : typed !== undefined ? T("Not quite.") : T("Not this one."))),
          typed && !ok ? el("p", { class: "hint" }, T("You wrote: {value}", { value: typed })) : "",
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
      if (fresh) { outbox.push({ op: "duel", room: me.room, me: me.id, duel: { id: d.id, ...(d.deck ? { deck: d.deck } : {}), range: d.range, ...(d.cfg ? { cfg: d.cfg } : {}), ...(d.to ? { to: d.to } : {}), qs: d.qs } }); keep(OUT_KEY, outbox); }
      send({ op: "result", room: me.room, me: me.id, duel: d.id, result: r });
      result(d);
    }
    ask();
  }

  // ---------- a duel's result, side by side ----------
  function result(duel) {
    screen = "result"; current = duel;
    const d = room.duels.find((x) => x.id === duel.id) || duel, o = oppOf(d), oName = oppName(d), a = d.results[me.id], b = o ? d.results[o] : null, deck = deckOf(d);
    if (!a) return play(d);           // not played yet here: nothing of theirs to see first
    // this duel's coins for this player: the right answers, and the win or the draw (worked out on the server)
    const got = (room.coins || []).filter((e) => e.m === me.id && [`duel:${d.id}:${me.id}`, `win:${d.id}`, `draw:${d.id}:${me.id}`].includes(e.id)).reduce((s, e) => s + e.n, 0);
    const cell = (r, k) => r ? el("td", { class: r.answers[k].ok ? "ok" : "miss" }, `${r.answers[k].ok ? "✓" : "✗"} `,
      el("small", {}, `${T("{n} s", { n: (r.answers[k].ms / 1000).toFixed(1) })}${r.answers[k].d ? ` · ${T("×2 bet")}` : ""}`),
      r.answers[k].y ? el("small", { class: "sd-typed" }, ` “${cut(r.answers[k].y, 30)}”`) : "") : el("td", {}, el("small", {}, "…"));
    view(el("div", { class: "sd-grid" },
      box("sd-done sd-wide", `${title(d)} · ${when(d.at)}`, b ? T("You {a} – {b} {name}", { a: num(a.points), b: num(b.points), name: oName }) : T("You {points} · waiting for {name}", { points: num(a.points), name: oName }),
        d.cfg ? el("small", { class: "sd-cfg" }, setupLine(d.cfg)) : "",
        b ? el("div", { class: "sd-banner" }, a.points > b.points ? T("You won!") : b.points > a.points ? T("{name} won this one", { name: oName }) : T("A draw"))
          : el("p", { class: "hint" }, o ? T("{name}'s answers show here as soon as they've played: this page changes by itself.", { name: oName })
            : T("The answers of whoever takes it show here as soon as they've played: this page changes by itself.")),
        got ? el("p", { class: "sd-coined" }, T("🪙 +{n} coins", { n: num(got) })) : "",
        el("table", { class: "sd-vs" },
          el("thead", {}, el("tr", {}, el("th", {}, T("Question")), el("th", {}, T("Answer")), el("th", {}, T("You")), el("th", {}, o ? oName : "…"))),
          el("tbody", {}, ...d.qs.map((q, k) => el("tr", {}, el("td", {}, q.x ? "↺ " : "", deck.summary(q)), el("td", {}, deck.answer(q)), cell(a, k), cell(b, k))))),
        el("div", { class: "row" }, btn(T("Rematch"), () => challenge(d.deck || "surahs", d.range, d.range === "custom" ? d.cfg : null, CLUB() ? o : undefined), true), btn(T("Duels"), home)))));
  }

  // ---------- coins: the wallet, the rewards and the Hall of Fame ----------
  // coins.js keeps them in the room on the server; Study Quest's rounds and the duels earn them, and the banker (Sora personal's Club bank)
  // gives the rewards, taking their coins off. The tier goes by everything ever earned, so a reward doesn't lower it
  const COINS = window.SoraCoins;
  const tierLabel = (name) => `${COINS.ICON[name]} ${T(name)}`;
  const meter = (f) => el("span", { class: "sd-meter", "aria-hidden": "true" }, el("i", { style: `width:${Math.max(0, Math.min(100, Math.round(f * 100)))}%` }));
  function coinStrip() {
    if (!COINS) return "";
    const c = COINS.balance(), t = COINS.tierOf(c.earned);
    return el("section", { class: "sd-coins" },
      el("div", { class: "sd-purse" }, el("small", {}, T("Your coins")), el("b", {}, `🪙 ${num(c.balance)}`)),
      el("div", { class: "sd-tier" }, el("small", {}, T("Tier")), el("b", {}, tierLabel(t.name)), t.next ? meter((c.earned - t.from) / (t.next[0] - t.from)) : "",
        el("small", {}, t.next ? T("{n} more to {tier}", { n: num(t.next[0] - c.earned), tier: tierLabel(t.next[1]) }) : T("The highest tier!"))),
      el("div", { class: "row" }, btn(T("Wallet"), wallet, false, "small"), btn(T("Rewards"), rewards, false, "small"), btn(T("Hall of Fame"), fame, true, "small")));
  }
  // the server's reasons are in English: put into the app's language here (Study Quest's come in it already)
  const whyText = (w) => { const m = /^Duel: (\d+) of (\d+) right$/.exec(w); return m ? T("Duel: {right} of {all} right", { right: m[1], all: m[2] }) : w === "Duel won" || w === "Duel drawn" ? T(w) : w; };
  function wallet() {
    screen = "wallet";
    const c = COINS.balance(), t = COINS.tierOf(c.earned);
    const rows = [...(room.coins || []).filter((e) => e.m === me.id).map((e) => ({ at: e.at, n: e.n, what: whyText(e.why) })),
      ...(room.spent || []).filter((e) => e.m === me.id).map((e) => ({ at: e.at, n: -e.n, what: T("Reward: {what}", { what: T(e.what) }) }))].sort((x, y) => y.at - x.at);
    view(el("div", { class: "sd-grid" }, box("sd-purse-box sd-wide", T("Wallet"), `🪙 ${num(c.balance)}`,
      el("p", {}, T("Earned {earned} · spent on rewards {spent} · tier {tier}", { earned: num(c.earned), spent: num(c.spent), tier: tierLabel(t.name) })),
      c.waiting ? el("p", { class: "hint" }, T("{n} of them are still on this phone: they go to the club when it's online.", { n: num(c.waiting) })) : "",
      rows.length ? el("ul", { class: "sd-list sd-ledger" }, ...rows.slice(0, 80).map((r) => el("li", { class: r.n < 0 ? "spent" : "" },
        el("span", {}, r.what, " ", el("small", {}, when(r.at))), el("b", {}, r.n < 0 ? `−${num(-r.n)}` : `+${num(r.n)}`))))
        : el("p", { class: "hint" }, T("Nothing yet: coins come from Study Quest rounds, reviews and duels.")),
      el("p", { class: "hint" }, T("How coins are earned: each right answer, more for typing and for a short clock; reviews on their day count double; a first pass, three stars, a final round and a finished chapter earn more. Duels: your right answers, 10 more for a win, 5 each for a draw. At most 300 a day.")),
      el("div", { class: "row" }, btn(T("Rewards"), rewards), btn(T("Duels"), home, false, "link")))));
  }
  function rewards() {
    screen = "rewards";
    const c = COINS.balance(), list = room.rewards || [], asked = new Set((room.asks || []).filter((a) => a.m === me.id).map((a) => a.r));
    view(el("div", { class: "sd-grid" }, box("sd-purse-box sd-wide", T("Rewards"), T("You have 🪙 {n}", { n: num(c.balance) }),
      list.length ? el("ul", { class: "sd-list sd-rewards" }, ...list.map((r) => el("li", {},
        el("span", { class: "sd-reward" }, el("b", {}, T(r.name)), el("small", {}, `🪙 ${num(r.price)}`), meter(c.balance / r.price)),
        asked.has(r.id) ? btn(T("Asked ✓ · cancel"), () => ask(r.id, true), false, "small")
          : c.balance >= r.price ? btn(T("I'd like this"), () => ask(r.id), true, "small")
          : el("small", { class: "hint" }, T("{n} more to go", { n: num(r.price - c.balance) })))))
        : el("p", { class: "hint" }, T("No rewards yet: the banker adds them, with their prices.")),
      el("p", { class: "hint" }, T("Ask for one, and the banker sees it, gives it to you in real life and takes its coins off here. Your tier stays: it goes by everything you've ever earned.")),
      el("div", { class: "row" }, btn(T("Wallet"), wallet), btn(T("Duels"), home, false, "link")))));
  }
  async function ask(rid, cancel = false) {
    // shown at once; sent now, or kept until it's through
    room.asks = cancel ? (room.asks || []).filter((a) => !(a.m === me.id && a.r === rid)) : [...(room.asks || []), { id: "here", m: me.id, r: rid, at: Date.now() }];
    rewards();
    toast(cancel ? T("Cancelled") : T("Asked: the banker will see it"));
    await send({ op: "ask", room: me.room, me: me.id, reward: rid, ...(cancel ? { cancel: true } : {}) });
    refresh();
  }
  const mondayOf = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  function fame() {
    screen = "fame";
    const since = mondayOf(), mine = COINS.balance();
    const earnedOf = (m) => (m.id === me.id ? mine.earned : room.totals?.[m.id]?.earned || 0);
    const weekOf = (m) => (room.coins || []).filter((e) => e.m === m.id && e.at >= since).reduce((s, e) => s + e.n, 0) + (m.id === me.id ? mine.waiting : 0);
    // duels won: the server's count (a room lets its oldest duels go), or, from a phone that hasn't read it yet, the duels it has
    const winsOf = (m) => room.wins ? room.wins[m.id] || 0 : room.duels.filter((d) => isDone(d) && (d.by === m.id || otherSide(d) === m.id))
      .filter((d) => d.results[m.id].points > d.results[d.by === m.id ? otherSide(d) : d.by].points).length;
    const rank = (f) => room.members.map((m) => ({ m, n: f(m) })).sort((x, y) => y.n - x.n);
    const place = (k, n) => (n > 0 && k < 3 ? ["🥇", "🥈", "🥉"][k] : `${k + 1}.`);
    const board = (label, head, rows, show) => box("sd-fame", label, head, el("ol", { class: "sd-list sd-board" }, ...rows.map((r, k) => el("li", { class: r.m.id === me.id ? "me" : "" },
      el("span", {}, el("b", { class: "sd-place" }, place(k, r.n)), " ", r.m.id === me.id ? T("{name} (you)", { name: r.m.name }) : r.m.name), el("span", { class: "sd-num" }, show(r))))));
    view(el("div", { class: "sd-grid" },
      board(T("Hall of Fame"), T("This week's coins (from Monday)"), rank(weekOf), (r) => `🪙 ${num(r.n)}`),
      board(T("All time"), T("Everything earned, and the tier"), rank(earnedOf), (r) => `${tierLabel(COINS.tierOf(r.n).name)} · 🪙 ${num(r.n)}`),
      board(T("Duels"), T("Duels won"), rank(winsOf), (r) => num(r.n)),
      box("sd-fame sd-wide", T("Tiers"), T("By everything you've ever earned: spending on rewards doesn't lower them"),
        el("div", { class: "sd-tiers" }, ...COINS.TIERS.map(([from, name]) => el("span", {}, tierLabel(name), el("small", {}, `🪙 ${num(from)}`)))),
        el("div", { class: "row" }, btn(T("Wallet"), wallet), btn(T("Duels"), home, false, "link")))));
  }

  $("sdHome").onclick = home;
  setupFullscreen(root);
  window.SurahDuel = { home, state: () => ({ me, room, outbox, current }), poll, decks: DECKS };      // for tests
  liveEl.textContent = me ? T("Connecting…") : "";
  home();
  if (me) poll(true);
  setInterval(() => poll(), POLL);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(true); });
  window.addEventListener("hashchange", () => { if (!me || /join=/.test(location.hash)) home(); });
})();
