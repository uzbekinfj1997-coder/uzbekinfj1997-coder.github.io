/* Memory Palace: the screens. Home (palaces, reviews due), walking a route (2D map or 3D), the route test,
   choosing a list, storing it place by place, recalling it, and the results with the next review. */
"use strict";
(() => {
  const D = PalaceData, C = PalaceCore, root = $("mp"), main = $("main");
  let palaces = D.all();
  const palaceById = (id) => palaces.find((p) => p.id === id);
  let st = C.load(palaces);
  // what a list in this palace is for: The House keeps, The Park practises; other palaces: the list decides
  const kindOf = (p, list) => list?.kind || p.kind || "permanent";
  const SOURCES = { ops: "Memory Ops maps", balloon: "Balloon Math worlds", frog: "Frog Marbles tracks", craft: "Built in Block Craft" };
  const commit = () => C.save(st);

  // ---------- settings ----------
  const settings = setupSettings(root, "memory-palace", [
    { key: "age", label: "Who is playing", type: "choice", default: "standard", options: [["child", "Child"], ["standard", "Standard"], ["senior", "Senior"]],
      help: "Child: pictures and choices · Senior: large and unhurried" },
    { key: "view", label: "View of the route", type: "choice", default: "3d", options: [["2d", "Map (2D)"], ["3d", "Walk (3D)"]] },
    { key: "speak", label: "Read aloud", type: "choice", default: "child", options: [["child", "Children only"], ["always", "Always"], ["never", "Never"]] },
    { key: "count", label: "Items in a children's list", type: "choice", default: 5, options: [[5, "5"], [10, "10"], [15, "15"]] },
    { key: "plan", label: "Review plan", type: "choice", default: "standard", options: [["standard", "Standard (1-3-7-14-30 days…)"], ["intensive", "Intensive (1-2-4-7-14 days…)"]] },
  ], { onChange: () => { applyAge(); if (screen === "home") home(); } });
  const S = settings.values;
  const child = () => S.age === "child", senior = () => S.age === "senior";
  function applyAge() { root.dataset.age = S.age; }
  function speak(text) {
    if (!(S.speak === "always" || (S.speak === "child" && child())) || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = child() || senior() ? 0.9 : 1; speechSynthesis.speak(u); } catch { /* no voice */ }
  }
  const date = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; };
  const when = (t) => { const days = Math.round((C.startOfDay(t) - C.startOfDay(Date.now())) / C.DAY); return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days (${date(t)})`; };

  // ---------- the route view: a 2D map or a 3D walk ----------
  let scene = null, canvas3d = null, screen = "home", activeStage = null;
  function stage(palace, { onPick } = {}) {
    const use3d = S.view === "3d" && (scene || (canvas3d = el("canvas", { class: "mp-canvas", "aria-label": "3D view of the route" }), scene = PalaceScene3D.create(canvas3d)));
    const box = el("div", { class: "mp-stage" });
    const items = [];
    let cur = 0, svg = null;
    if (use3d) { scene.setPalace(palace); box.append(canvas3d); scene.start(); }
    else { svg = map(palace); box.append(svg); }
    function map(p) {
      const ns = "http://www.w3.org/2000/svg", mk = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text) e.textContent = text; return e; };
      const s = mk("svg", { viewBox: "0 0 100 70", class: "mp-map", role: "img", "aria-label": `Map of ${p.name}` });
      const house = p.theme === "house", [ground, path] = p.colours || [house ? "#5b7a4a" : "#6fae5a", house ? "#8e2b2b" : "#e8dcb0"];
      s.append(mk("rect", { x: 0, y: 0, width: 100, height: 70, fill: ground }));
      (p.rooms || []).forEach(([name, a], r) => {
        const y = 1 + r * 23;
        if (house) s.append(mk("rect", { x: 3, y, width: 94, height: 22, rx: 1.5, fill: ["#c8a97c", "#9c6b52", "#d9dcdc"][r], stroke: "#ece4d4", "stroke-width": 0.8 }));
        s.append(mk("text", { x: 4.5, y: y + 3.4, "font-size": 2.6, fill: house ? "#3b2a1c" : "#21401a", "font-family": "sans-serif" }, name));
      });
      if (p.theme === "park") {
        s.append(mk("ellipse", { cx: 50, cy: 42.5, rx: 8, ry: 3.2, fill: "#3f78c0", opacity: 0.85 }));
        for (const [x, y] of [[30, 24], [70, 24], [95, 30], [40, 66], [90, 66], [60, 4], [22, 3], [80, 47], [96, 50], [3, 66]]) s.append(mk("circle", { cx: x, cy: y, r: 2.6, fill: "#2f6b2a" }));
      }
      s.append(mk("polyline", { points: p.loci.map((l) => `${l.x},${l.y}`).join(" "), fill: "none", stroke: path, "stroke-width": 2.2, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.9 }));
      p.loci.forEach((l, i) => {
        const g = mk("g", { class: "mp-spot", "data-i": i, transform: `translate(${l.x} ${l.y})` });
        g.append(mk("circle", { r: 5.2, class: "ring" }), mk("circle", { r: 4.4, fill: "#fff" }),
          mk("text", { y: 1.9, "text-anchor": "middle", "font-size": 5.4 }, l.emoji),
          mk("circle", { cx: 4, cy: -3.8, r: 1.9, fill: "#111" }), mk("text", { x: 4, y: -3.05, "text-anchor": "middle", "font-size": 2.3, fill: "#fff", "font-family": "sans-serif" }, String(i + 1)),
          mk("text", { class: "item", x: -4.6, y: -3, "text-anchor": "middle", "font-size": 4 }, ""));
        if (onPick) g.addEventListener("click", () => onPick(i));
        s.append(g);
      });
      return s;
    }
    const api = {
      el: box,
      show(i, jump = false) {
        cur = i;
        if (svg) svg.querySelectorAll(".mp-spot").forEach((g) => g.classList.toggle("on", Number(g.dataset.i) === i));
        else scene.go(i, jump);
      },
      setItem(i, item) {
        items[i] = item;
        if (svg) svg.querySelector(`.mp-spot[data-i="${i}"] .item`).textContent = item ? item.emoji || "★" : "";
        else scene.setItem(i, item);
      },
      destroy() { if (!svg && activeStage === api) { scene.stop(); scene.clearItems(); } },   // the 3D view is shared: only the latest may stop it
    };
    activeStage = api;
    api.show(0, true);
    return api;
  }
  let current = null;
  function view(...children) { current?.destroy(); current = null; main.replaceChildren(...children); window.scrollTo?.(0, root.offsetTop - 10); }

  // ---------- home ----------
  function home() {
    screen = "home"; window.speechSynthesis?.cancel();
    const now = Date.now(), dueLists = C.due(st, now);
    const steps = el("ol", { class: "mp-steps" }, ...["Learn a route: walk it until you know every place in order.", "Store a list: put one thing at each place, as a vivid picture.",
      "Recall: walk the route in your mind and say what is at each place.", "Review on the planned days so it stays for good."].map((t) => el("li", {}, t)));
    palaces = D.all(); st = C.load(palaces);
    const inUse = (p) => p.source === undefined || st.palaces[p.id].learned;
    const cards = palaces.filter(inUse).map((p) => {
      const s = C.status(st, p.id, now), ps = st.palaces[p.id], list = ps.listId ? st.lists[ps.listId] : null;
      const actions = [];
      let line;
      if (s === "unlearned") { line = "Learn this route first: walk it, then take the short test."; actions.push(btn("Learn the route", () => walk(p.id, true), true)); }
      else if (s === "free") { line = "Ready: you know this route and it is empty."; actions.push(btn("Store a list", () => chooseList(p.id), true), btn("Walk the route", () => walk(p.id, false))); }
      else if (s === "resting") { line = `Resting until ${date(ps.restUntil)} so the old pictures fade before new ones go in.`; actions.push(btn("Walk the route", () => walk(p.id, false))); }
      else {
        line = list.kind === "permanent" ? `Holding “${list.name}” · next review ${when(list.due)}` : `Holding “${list.name}” for practice`;
        actions.push(btn("Recall", () => recall(list.id), list.kind === "practice" || list.due <= now), gameButtons(list), btn("Walk the route", () => walk(p.id, false)),
          btn(list.kind === "permanent" ? "Retire this list" : "Finish practice", () => { if (confirm(list.kind === "permanent" ? `Retire “${list.name}”? The palace will be free again from tomorrow.` : "Finish this practice list? The palace rests until tomorrow, then it is free.")) { C.release(st, list.id); commit(); home(); } }, false, "link"));
      }
      const kind = p.kind || list?.kind;
      return el("article", { class: "mp-card", "data-theme": p.theme, style: p.colours ? `border-top-color:${p.colours[0]}` : "" },
        el("div", { class: "mp-card-head" }, el("h3", {}, p.name), kind ? el("span", { class: `badge ${kind}` }, kind === "permanent" ? "Permanent" : "Practice") : el("span", { class: "badge" }, SOURCES[p.source] || "")),
        el("p", { class: "hint" }, p.about),
        el("div", { class: "mp-strip", "aria-label": "The places in order" }, ...p.loci.map((l) => el("span", { title: `${l.n}. ${l.name}` }, l.emoji))),
        el("p", {}, line), el("div", { class: "row" }, ...actions));
    });
    const done = Object.values(st.lists).filter((l) => l.done).sort((a, b) => b.endedAt - a.endedAt).slice(0, 8);
    view(
      el("section", { class: "card mp-intro" }, el("div", { class: "mp-row" },
        el("div", {}, el("h2", {}, "How it works"), steps),
        el("div", { class: "mp-streak" }, el("b", {}, String(st.streak.days || 0)), el("span", {}, st.streak.days === 1 ? "day in a row" : "days in a row")))),
      dueLists.length ? el("section", { class: "card mp-due" }, el("h2", {}, "To recall today"),
        ...dueLists.filter((l) => palaceById(l.palace)).map((l) => el("div", { class: "mp-due-row" }, el("span", {}, `${l.name} · ${palaceById(l.palace).name}`),
          el("div", { class: "row" }, btn("Recall now", () => recall(l.id), true), gameButtons(l))))) : "",
      el("div", { class: "mp-cards" }, ...cards),
      numbersCard(),
      moreRoutes(palaces.filter((p) => !inUse(p))),
      done.length ? el("section", { class: "card" }, el("h2", {}, "Finished lists"),
        el("ul", { class: "mp-done" }, ...done.map((l) => el("li", {}, `${l.name} — ${l.sessions.length} recall${l.sessions.length === 1 ? "" : "s"}, best ${Math.round(100 * Math.max(0, ...l.sessions.map((s) => s.score)))} %`)))) : "");
  }
  // review a list by playing: the games read the same lists and update the same schedule
  function gameButtons(list) {
    return el("span", { class: "mp-games" }, el("small", {}, "or play:"),
      el("a", { class: "button small", href: `/balloon-math/?review=${list.id}` }, "Balloon Recall"),
      el("a", { class: "button small", href: `/frog-marbles/?review=${list.id}` }, "Order chain"),
      btn("Matching cards", () => matchList(list.id), false, "small"));
  }
  // routes from the games (and built in Block Craft): shown here to learn when you choose
  function moreRoutes(list) {
    if (!list.length) return "";
    const groups = Object.entries(SOURCES).map(([src, title]) => [title, list.filter((p) => p.source === src)]).filter(([, g]) => g.length);
    return el("details", { class: "card mp-more" }, el("summary", {}, `More routes to learn (${list.length})`),
      el("p", { class: "hint" }, "Every game world is also a palace of 15 landmarks you see while playing. Learn one when you want more room; it then joins your palaces above."),
      ...groups.map(([title, g]) => el("div", {}, el("h3", {}, title), el("div", { class: "mp-mini" }, ...g.map((p) =>
        el("div", { class: "mp-mini-card", style: `border-left-color:${(p.colours || ["#888"])[0]}` }, el("b", {}, p.name),
          el("div", { class: "mp-strip" }, ...p.loci.map((l) => el("span", { title: `${l.n}. ${l.name}` }, l.emoji))),
          btn("Learn this route", () => walk(p.id, true))))))));
  }
  function btn(label, onclick, primary = false, cls = "") { return el("button", { type: "button", class: `${primary ? "primary" : ""} ${cls}`.trim(), onclick }, label); }

  // ---------- walking a route ----------
  function walk(pid, learning) {
    screen = "walk";
    const p = palaceById(pid);
    let i = 0;
    const sv = stage(p, { onPick: (k) => go(k) });
    const card = el("div", { class: "mp-place" });
    const prev = btn("← Back", () => go(i - 1)), next = btn("Next →", () => go(i + 1), true);
    const testBtn = btn(learning ? "I know it: take the test" : "Take the test again", () => test(pid), learning);
    function go(k) {
      i = Math.max(0, Math.min(p.loci.length - 1, k));
      const l = p.loci[i];
      sv.show(i);
      card.replaceChildren(el("span", { class: "big" }, l.emoji), el("div", {}, el("small", {}, `Place ${i + 1} of ${p.loci.length}`), el("b", {}, l.name)));
      prev.disabled = i === 0; next.disabled = i === p.loci.length - 1;
      speak(`${i + 1}. ${l.name}`);
    }
    const keys = (e) => { if (screen !== "walk") return document.removeEventListener("keydown", keys); if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); };
    document.addEventListener("keydown", keys);
    view(head(p.name, learning ? "Walk the route slowly. Picture each place clearly and notice what comes before and after it." : "Walk the route to refresh it."),
      sv.el, el("div", { class: "mp-controls" }, card, el("div", { class: "row" }, prev, next)),
      el("div", { class: "row mp-foot" }, testBtn, btn("Home", home, false, "link")));
    current = sv;
    go(0);
  }
  function head(title, text) { return el("div", { class: "mp-head" }, el("h2", {}, title), text ? el("p", { class: "hint" }, text) : ""); }

  // ---------- the route test: what comes next, then put them in order ----------
  function test(pid) {
    screen = "test";
    const p = palaceById(pid), n = child() ? S.count : p.loci.length, loci = p.loci.slice(0, n);
    const qs = [...Array(Math.max(1, n - 1)).keys()].sort(() => Math.random() - 0.5).slice(0, child() ? 3 : 5);
    let q = 0, right = 0;
    function ask() {
      if (q >= qs.length) return order();
      const a = qs[q], correct = loci[a + 1];
      const opts = [correct, ...loci.filter((l, k) => k !== a + 1 && k !== a).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
      speak(`What comes after the ${loci[a].name}?`);
      view(head("The route test", `Question ${q + 1} of ${qs.length}`),
        el("div", { class: "mp-question" }, el("p", {}, "What comes after"), el("div", { class: "mp-place" }, el("span", { class: "big" }, loci[a].emoji), el("b", {}, loci[a].name))),
        el("div", { class: "mp-choices" }, ...opts.map((o) => el("button", { type: "button", class: "mp-choice", onclick: (e) => {
          const ok = o === correct; if (ok) right++;
          e.currentTarget.classList.add(ok ? "good" : "bad");
          speak(ok ? "Yes!" : `It is the ${correct.name}`);
          setTimeout(() => { q++; ask(); }, ok ? 500 : 1300);
        } }, el("span", { class: "big" }, o.emoji), o.name))));
    }
    function order() {
      const shuffled = loci.map((l, k) => ({ l, k })).sort(() => Math.random() - 0.5);
      let nextK = 0, mistakes = 0;
      const slots = el("div", { class: "mp-order" });
      const grid = el("div", { class: "mp-choices wide" }, ...shuffled.map(({ l, k }) => el("button", { type: "button", class: "mp-choice", onclick: (e) => {
        const b = e.currentTarget;
        if (k === nextK) { b.disabled = true; b.classList.add("good"); slots.append(el("span", { title: l.name }, l.emoji)); nextK++; if (nextK === loci.length) finish(mistakes); }
        else { mistakes++; b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); }
      } }, el("span", { class: "big" }, l.emoji), l.name)));
      speak("Now tap the places in order, starting with the first.");
      view(head("The route test", `Tap the places in order, from the first to the last${loci.length < p.loci.length ? ` (the first ${loci.length})` : ""}.`), slots, grid);
    }
    function finish(mistakes) {
      const pass = mistakes === 0 && right >= Math.ceil(qs.length * 0.8);
      if (pass) { C.learn(st, pid); commit(); speak("Well done! You know this route."); }
      else speak("Nearly. Walk the route once more and try again.");
      view(head(pass ? "You know the route" : "Nearly there", pass ? "Now you can store a list in it." : `${right} of ${qs.length} right, ${mistakes} slip${mistakes === 1 ? "" : "s"} in the order. Walk it once more, then try again.`),
        el("div", { class: "row" }, pass ? btn("Store a list", () => chooseList(pid), true) : btn("Walk the route", () => walk(pid, true), true),
          pass ? "" : btn("Try the test again", () => test(pid)), btn("Home", home, false, "link")));
    }
    ask();
  }

  // ---------- choosing what to remember ----------
  function chooseList(pid) {
    screen = "choose";
    const p = palaceById(pid);
    let tab = child() ? "children" : D.imported().length ? "files" : "ifrs", note = "";
    const tabs = [["children", "For children"], ["ifrs", "IFRS"], ["everyday", "Everyday"], ["files", "Books and files"], ["own", "My own list"]];
    // where each list from a pack is stored now (a pack is stored once at a time)
    const inUse = Object.fromEntries(C.active(st).filter((l) => l.packId).map((l) => [l.packId, palaceById(l.palace)?.name || "a palace"]));
    const body = el("div");
    function render() {
      const bar = el("div", { class: "mp-tabs" }, ...tabs.map(([k, label]) => el("button", { type: "button", class: k === tab ? "on" : "", onclick: () => { tab = k; render(); } }, label)));
      let content;
      if (tab === "own") {
        const name = el("input", { type: "text", placeholder: "Name of the list, e.g. Chapter 3 key terms", "aria-label": "Name of the list" });
        const text = el("textarea", { rows: 9, placeholder: "One thing per line (up to 15).\nOptional: add = and a picture to imagine, e.g.\nIAS 36 Impairment of Assets = a cracked machine losing value", "aria-label": "Your list" });
        content = el("div", { class: "mp-own" }, name, text, btn("Store this list", () => {
          const items = text.value.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 15).map((l) => { const [t, img] = l.split("="); return { text: t.trim(), image: img ? img.trim() : "" }; });
          if (!items.length) return alert("Write at least one thing to remember.");
          storeList(pid, { name: name.value.trim() || "My list", items, packId: null });
        }, true));
      } else if (tab === "files") {
        const file = el("input", { type: "file", accept: ".json,application/json", "aria-label": "List file" });
        file.hidden = true;
        file.addEventListener("change", async () => {
          const f = file.files[0];
          if (!f) return;
          try { const r = D.importLists(await f.text()); note = `Added ${r.count} list${r.count === 1 ? "" : "s"} from “${r.book}”.`; }
          catch (e) { note = e.message; }
          render();
        });
        const lists = [...D.studyLists(), ...D.imported()], books = [...new Set(lists.map((k) => k.book))];
        content = el("div", { class: "mp-files" },
          el("p", { class: "hint" }, "Lists from the books in Study Quest, and lists made for you as a .json file (an imported file stays only on this computer)."),
          el("div", { class: "row" }, file, btn("Import a list file", () => file.click(), true)), note ? el("p", { class: "mp-note" }, note) : "",
          ...books.map((book) => {
            const mine = lists.filter((k) => k.book === book), sections = [...new Set(mine.map((k) => k.section))];
            return el("section", { class: "mp-book" }, el("div", { class: "row" }, el("h3", {}, book), el("small", {}, `${mine.length} lists`),
              mine[0].builtIn ? "" : btn("Remove", () => { if (confirm(`Remove the lists of “${book}” from this computer? Lists already stored in palaces stay.`)) { D.removeBook(book); note = ""; render(); } }, false, "link")),
              ...sections.map((sec) => el("div", {}, sec ? el("h4", {}, sec) : "", packButtons(mine.filter((k) => k.section === sec)))));
          }));
      } else {
        content = packButtons(D.PACKS.filter((k) => k.group === tab));
      }
      body.replaceChildren(bar, content);
    }
    function packButtons(packs) {
      return el("div", { class: "mp-packs" }, ...packs.map((k) => {
        const n = tab === "children" ? Math.min(S.count, k.items.length) : k.items.length;
        const b = el("button", { type: "button", class: "mp-pack", onclick: () => storeList(pid, { name: k.name, items: k.items.slice(0, n), packId: k.id }) },
          el("b", {}, k.name), el("span", {}, inUse[k.id] ? `Stored in ${inUse[k.id]}` : k.about), el("small", {}, `${n} item${n === 1 ? "" : "s"}${k.items[0].emoji ? " · " + k.items.slice(0, 5).map((x) => x.emoji).join(" ") : ""}`));
        b.disabled = Boolean(inUse[k.id]);
        return b;
      }));
    }
    render();
    let kind = p.kind || "permanent";
    const kindBox = p.kind ? "" : el("div", { class: "mp-kind" }, el("span", {}, "This list is for:"),
      ...[["permanent", "Keeping (reviews until I retire it)"], ["practice", "Practice (free again tomorrow)"]].map(([k, label]) => {
        const b = el("button", { type: "button", class: k === kind ? "on" : "", onclick: () => { kind = k; kindBox.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); } }, label);
        return b;
      }));
    chosenKind = () => kind;
    view(head(`Store a list in ${p.name}`, p.kind === "permanent" ? "This palace keeps the list with reviews until you retire it: use it for things to know for good."
      : p.kind === "practice" ? "This is the practice palace: when you finish, it rests until tomorrow and is free again." : "Choose whether to keep this list for good or just practise with it."),
      kindBox, body, el("div", { class: "row mp-foot" }, btn("Home", home, false, "link")));
  }

  let chosenKind = () => "permanent";
  // ---------- storing: one item at each place, as a vivid picture ----------
  function storeList(pid, { name, items, packId }) {
    screen = "store";
    const p = palaceById(pid);
    items = items.map((x) => ({ ...x }));
    const sv = stage(p);
    let i = 0;
    const card = el("div", { class: "mp-store" });
    function go(k) {
      i = k;
      const l = p.loci[i], it = items[i];
      sv.show(i); sv.setItem(i, it);
      const mine = el("input", { type: "text", value: it.mine || "", placeholder: "Your own picture (optional): the stranger the better", "aria-label": "Your own picture" });
      mine.addEventListener("input", () => (it.mine = mine.value));
      const num = C.numberIn(it), np = num !== null && !child() ? C.numberPicture(num) : null;
      const idea = C.scene(it, l, i) + (np ? ` Add ${np.words} (${np.emoji}) for the number ${num}.` : "");
      card.replaceChildren(
        el("div", { class: "mp-pair" }, el("span", { class: "big" }, l.emoji), el("span", { class: "plus" }, "+"), it.emoji ? el("span", { class: "big" }, it.emoji) : "",
          el("div", {}, el("small", {}, `Place ${i + 1} of ${items.length}: ${l.name}`), el("b", {}, C.answerText(it)))),
        el("p", { class: "mp-idea" }, idea), child() ? "" : mine,
        el("p", { class: "hint" }, child() ? "Close your eyes and see it! Is it funny? Is it noisy?" : "Make it big, moving, noisy or silly, and see it clearly for a few seconds."),
        el("div", { class: "row" }, btn("← Back", () => go(i - 1)), i < items.length - 1 ? btn("Next place →", () => go(i + 1), true) : btn("Done: stored", finish, true)));
      card.querySelector("button").disabled = i === 0;
      speak(`${l.name}. ${child() ? it.text + ". " : ""}${idea}`);
    }
    function finish() {
      const list = C.store(st, { palace: pid, name, items, packId, kind: p.kind || chosenKind(), child: child() });
      commit();
      sv.destroy();
      view(head("Stored", "Now walk the route in your mind and see each picture once more. Then recall it straight away: the first recall fixes it best."),
        el("div", { class: "row" }, btn("Recall now", () => recall(list.id), true), btn("Home", home, false, "link")));
    }
    view(head(`Storing “${name}”`, `${items.length} item${items.length === 1 ? "" : "s"} in ${p.name}, one at each place.`), sv.el, card);
    current = sv;
    go(0);
  }

  // ---------- recalling: walk the route and say what is at each place ----------
  function recall(listId) {
    screen = "recall";
    const list = st.lists[listId], p = palaceById(list.palace), items = list.items;
    const sv = stage(p), card = el("div", { class: "mp-store" }), right = [];
    let i = 0;
    function go(k) {
      i = k;
      const l = p.loci[i], it = items[i];
      sv.show(i);
      const reveal = (ok, note = "") => {
        right[i] = ok;
        sv.setItem(i, it);
        speak(ok ? "Yes!" : `It was ${it.text}`);
        card.replaceChildren(
          el("div", { class: `mp-verdict ${ok ? "good" : "bad"}` }, ok ? "Right" : "Not this time", note),
          el("div", { class: "mp-pair" }, el("span", { class: "big" }, l.emoji), el("span", { class: "plus" }, "+"), it.emoji ? el("span", { class: "big" }, it.emoji) : "", el("b", {}, C.answerText(it))),
          ok ? "" : el("p", { class: "mp-idea" }, it.mine || C.scene(it, l, i)),
          el("div", { class: "row" },
            !ok && !child() ? btn("I was right after all", () => reveal(true)) : "",
            i < items.length - 1 ? btn("Next place →", () => go(i + 1), true) : btn("See how I did", done, true)));
      };
      const ask = el("div", { class: "mp-pair" }, el("span", { class: "big" }, l.emoji), el("div", {}, el("small", {}, `Place ${i + 1} of ${items.length}`), el("b", {}, `What is at the ${l.name.toLowerCase()}?`)));
      speak(`What is at the ${l.name}?`);
      if (child()) {
        card.replaceChildren(ask, el("div", { class: "mp-choices" }, ...C.choices(it, items).map((o) => el("button", { type: "button", class: "mp-choice", onclick: () => reveal(o.text === it.text) },
          o.emoji ? el("span", { class: "big" }, o.emoji) : "", o.text))));
      } else if (senior()) {
        card.replaceChildren(ask, el("p", { class: "hint" }, "Say it to yourself, then look."),
          el("div", { class: "row" }, btn("Show the answer", () => {
            card.replaceChildren(ask, el("div", { class: "mp-pair" }, it.emoji ? el("span", { class: "big" }, it.emoji) : "", el("b", {}, C.answerText(it))),
              el("div", { class: "row" }, btn("I remembered it", () => reveal(true), true), btn("I forgot", () => reveal(false))));
          }, true)));
      } else {
        const input = el("input", { type: "text", placeholder: "Type what you remember", "aria-label": "Your answer", autocomplete: "off" });
        const check = () => reveal(C.matches(input.value, it), input.value ? `You wrote: ${input.value}` : "");
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
        card.replaceChildren(ask, input, el("div", { class: "row" }, btn("Check", check, true), btn("I don't know", () => reveal(false))));
        setTimeout(() => input.focus(), 50);
      }
    }
    function done() {
      const res = C.record(st, listId, right.slice(0, items.length).map(Boolean), Date.now(), S.plan);
      commit(); sv.destroy();
      const pct = Math.round(res.score * 100), stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
      const missed = items.filter((_, k) => !right[k]);
      speak(pct >= 80 ? "Great memory!" : "Good try. Let's look at the ones you missed.");
      const next = list.kind === "permanent"
        ? (res.score >= C.PASS ? `Next review ${when(res.next)}. The gaps between reviews grow as you keep remembering.` : "Below 80 %: go over the missed ones and recall it again today.")
        : "Practice list: recall it again, or finish it to free the palace from tomorrow.";
      view(head(`${pct} % remembered`, next),
        el("div", { class: "mp-stars", "aria-label": `${stars} of 3 stars` }, ...[1, 2, 3].map((k) => el("i", { class: k <= stars ? "on" : "" }))),
        missed.length ? el("section", { class: "card" }, el("h3", {}, "Look at these once more"),
          el("ul", { class: "mp-missed" }, ...missed.map((it) => { const k = items.indexOf(it), l = p.loci[k]; return el("li", {}, `${l.emoji} ${l.name}: `, el("b", {}, C.answerText(it)), ` — ${it.mine || C.scene(it, l, k)}`); }))) : "",
        el("div", { class: "row" }, btn("Recall again", () => recall(listId), res.score < C.PASS),
          list.kind === "practice" ? btn("Finish practice", () => { C.release(st, listId); commit(); home(); }) : "",
          btn("Home", home, res.score >= C.PASS)));
    }
    view(head(`Recall “${list.name}”`, child() ? "Walk the route and pick what you put at each place." : "Walk the route in your mind. At each place, bring back the picture you made."), sv.el, card);
    current = sv;
    go(0);
  }

  // ---------- matching cards: turn two over to find pairs (place and what is stored there, or a number and its picture) ----------
  function matching(title, pairs, onDone) {
    screen = "match";
    const cards = pairs.flatMap((pr, k) => [{ k, side: 0, face: pr[0] }, { k, side: 1, face: pr[1] }]).sort(() => Math.random() - 0.5);
    const missed = new Set();
    let open = [], found = 0, busy = false;
    const grid = el("div", { class: "mp-match", style: `--cols:${cards.length > 16 ? 6 : 4}` });
    cards.forEach((c) => {
      const b = el("button", { type: "button", class: "mp-card-tile", "aria-label": "A card" }, el("span", { class: "back" }, "?"),
        el("span", { class: "front" }, c.face.emoji ? el("span", { class: "big" }, c.face.emoji) : "", el("small", {}, c.face.text || "")));
      b.onclick = () => {
        if (busy || b.classList.contains("up")) return;
        b.classList.add("up"); open.push([c, b]);
        speak(c.face.text || "");
        if (open.length < 2) return;
        const [[c1, b1], [c2, b2]] = open; open = [];
        if (c1.k === c2.k) { b1.classList.add("done"); b2.classList.add("done"); if (++found === pairs.length) setTimeout(() => onDone(pairs.map((_, k) => !missed.has(k))), 500); return; }
        missed.add(c1.k); missed.add(c2.k); busy = true;
        setTimeout(() => { b1.classList.remove("up"); b2.classList.remove("up"); busy = false; }, 1100);
      };
      grid.append(b);
    });
    view(head(title, "Turn over two cards. A pair stays open; pairs found without a slip count as remembered."), grid,
      el("div", { class: "row mp-foot" }, btn("Home", home, false, "link")));
  }
  function matchList(listId) {
    const list = st.lists[listId], p = palaceById(list.palace);
    matching(`Matching cards: ${list.name}`, list.items.map((it, k) => [{ emoji: p.loci[k].emoji, text: p.loci[k].name }, { emoji: it.emoji || "", text: it.key || it.text }]), (right) => {
      const res = C.record(st, listId, right, Date.now(), S.plan, "choice", "match");
      commit();
      const pct = Math.round(res.score * 100);
      speak(pct >= 80 ? "Great memory!" : "Good try.");
      view(head(`${pct} % matched first time`, list.kind === "practice" ? "A practice list." : res.score < C.PASS ? "Below 80 %: go over it again today."
        : res.light ? `Fresh again. To move it to a longer gap, recall it here. Next review ${when(res.next)}.` : `Next review ${when(res.next)}.`),
        el("div", { class: "row" }, btn("Recall it", () => recall(listId), true), btn("Play again", () => matchList(listId)), btn("Home", home, false, "link")));
    });
  }
  // the number pictures: shown on the home page, practised with matching cards
  function numbersCard() {
    if (child()) return "";
    return el("details", { class: "card mp-numbers" }, el("summary", {}, "Number pictures (for standard numbers, dates, amounts)"),
      el("p", { class: "hint" }, "Numbers are hard to picture, so each digit gets a fixed picture. Two digits make a pair: IAS 16 is a candle on a die, IFRS 9 a balloon. Learn the ten once and every number becomes a picture you can place."),
      el("div", { class: "mp-pegs" }, ...C.PEGS.map(([e, w], n) => el("div", {}, el("b", {}, String(n)), el("span", { class: "big" }, e), el("small", {}, w)))),
      el("div", { class: "row" }, btn("Practise them with matching cards", () => matching("Number pictures", C.PEGS.map(([e, w], n) => [{ text: String(n) }, { emoji: e, text: w }]).sort(() => Math.random() - 0.5).slice(0, 8),
        (right) => view(head(`${right.filter(Boolean).length} of ${right.length} first time`, "Play a few times until all ten come at once."),
          el("div", { class: "row" }, btn("Again", () => numbersCard().querySelector("button").click(), true), btn("Home", home, false, "link")))), true)));
  }

  // ---------- arriving from Study Quest: store a stage in a palace, or recall one already stored ----------
  function storePack(packId) {
    screen = "choose";
    const pack = [...D.studyLists(), ...D.imported(), ...D.PACKS].find((k) => k.id === packId);
    if (!pack) return home();
    const held = C.active(st).find((l) => l.packId === packId);
    if (held) return recall(held.id);
    const now = Date.now(), free = palaces.filter((p) => C.status(st, p.id, now) === "free"), learned = palaces.filter((p) => st.palaces[p.id].learned);
    chosenKind = () => "permanent";
    view(head(`Store “${pack.name}” in a palace`, `${pack.items.length} items, one at each place. Stored for keeping: it comes back on the review schedule, here and in Study Quest.`),
      free.length ? el("div", { class: "mp-packs" }, ...free.map((p) => el("button", { type: "button", class: "mp-pack", onclick: () => storeList(p.id, { name: pack.name, items: pack.items, packId }) },
        el("b", {}, p.name), el("span", {}, p.about || ""), el("small", {}, p.loci.slice(0, 8).map((l) => l.emoji).join(" ")))))
        : el("p", { class: "mp-note" }, learned.length ? "Every palace you know is holding a list or resting. Learn another route on the home page, or retire a list you know well."
          : "First learn a route: walk it until you know every place, then take the short test. The House is a good start."),
      el("div", { class: "row mp-foot" }, !learned.length ? btn(`Learn ${palaces[0].name}`, () => walk(palaces[0].id, true), true) : btn("Home", home, !free.length),
        el("a", { class: "button", href: "/study-quest/" }, "Back to Study Quest")));
  }

  // ---------- start ----------
  $("homeBtn").onclick = home;
  setupFullscreen(root);
  applyAge();
  window.MemoryPalace = { state: () => st, home, walk, test, chooseList, storeList, recall, storePack, settings };   // for tests
  const ask = new URLSearchParams(location.search), wantRecall = ask.get("recall"), wantStore = ask.get("store");
  if (wantRecall && st.lists[wantRecall] && !st.lists[wantRecall].done && palaceById(st.lists[wantRecall].palace)) recall(wantRecall);
  else if (wantStore) storePack(wantStore);
  else home();
})();
