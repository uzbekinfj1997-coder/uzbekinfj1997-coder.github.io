/* The SBR mind map (window.SbrMap, from sbr_map.js): the whole syllabus as one tree, SBR > the exam and the syllabus areas > chapters >
   sections > points. Six views of the same tree:
   - the map, each branch opening to the right of its node; the compact map, the same with a section's points packed two or three to a row;
   - columns, one level each, as folders are browsed; a point's explanation in the last;
   - the sunburst, what's in the middle at the centre and its branches in rings round it, each as wide as the points under it: the whole syllabus
     on one screen;
   - progress, a tile for each chapter coloured by Study Quest: stages passed, cards missed, not started;
   - the world, drawn as an atlas draws countries: what's in the middle an island, its branches the countries, theirs the provinces and districts,
     every point a town, each as big as the points in it; zoom in for the districts, then the towns; cards missed in Study Quest as red pins;
   - the sketch, a hand-drawn mind map: what's in the middle in a ringed circle, its branches in marker-coloured bubbles on curved arrows, theirs
     beyond, doodles about;
   - and an outline for small screens.
   Branches open one at a time and are remembered; a node can be put in the middle (focus) with the path to it above; search finds any
   point and opens the way to it. A point from Study Quest links to its stage and shows whether that stage is passed or the card missed.
   Zoom: the buttons, + − 0 on the keyboard, Ctrl + the mouse wheel or a touchpad pinch, two fingers on a touch screen. */
"use strict";
(() => {
  const root = $("mm"), stage = $("mmStage"), crumbs = $("mmCrumbs"), results = $("mmResults"), search = $("mmSearch");
  const KEY = "sora.sbrMap.v1", tree = window.SbrMap;
  const VIEWS = ["map", "compact", "columns", "sunburst", "world", "sketch", "progress", "outline"];
  // every node by id, its parent and its syllabus area
  const byId = new Map(), parentOf = new Map();
  (function walk(n, p, area) {     // (an area's "a" is its letter; a sort's or a worked example's is its answer)
    const here = n.x === "area" ? n.a : area;
    byId.set(n.i, n); if (p) parentOf.set(n.i, p); n._area = here || "";
    for (const k of n.k || []) walk(k, n, here);
  })(tree, null, "");
  // open: the branches opened; focus: the one in the middle; view; cols: the way chosen down the columns; sb: the point picked in the sunburst
  let st = { open: [], focus: tree.i, view: "", cols: [], sb: null };
  try { st = { ...st, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) }; } catch { /* a fresh map */ }
  const open = new Set((st.open || []).filter((i) => byId.has(i)));
  if (!byId.has(st.focus)) st.focus = tree.i;
  if (!VIEWS.includes(st.view)) st.view = "";
  st.cols = (st.cols || []).filter((i) => byId.has(i));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ open: [...open], focus: st.focus, view: st.view, zooms, cols: st.cols, sb: st.sb })); } catch { /* storage full */ } };

  const settings = setupSettings(root, "sbr-map", [
    { key: "view", label: "View", type: "choice", default: "auto", options: [["auto", "Map on a big screen, outline on a phone"], ["map", "Map"], ["compact", "Compact map"],
      ["columns", "Columns"], ["sunburst", "Sunburst"], ["world", "World"], ["sketch", "Sketch"], ["progress", "Progress"], ["outline", "Outline"]] },
    { key: "size", label: "Text size", type: "choice", default: "normal", options: [["normal", "Normal"], ["large", "Large"]] },
    { key: "notes", label: "Show the explanation under a point", type: "toggle", default: true },
    { key: "practice", label: "Show traps and worked examples", type: "toggle", default: true },
  ], { onChange: () => { st.view = ""; render(); } });
  const S = settings.values;
  // Study Quest's progress (kept for everyone): stages passed, cards missed
  let sq = { lists: {}, miss: {} };
  try { sq = { lists: {}, miss: {}, ...(JSON.parse(localStorage.getItem("sora.studyQuest.v1") || "{}") || {}) }; } catch { /* not played yet */ }
  const passed = (id) => (sq.lists?.[id]?.best || 0) >= 0.8;

  const view = () => st.view || (S.view === "auto" ? (window.innerWidth < 760 ? "outline" : "map") : S.view);
  const shown = (n) => S.practice || !["trap", "example"].includes(n.x);
  const kidsOf = (n) => (n.k || []).filter(shown);
  const branchKids = (n) => (n.x === "steps" ? [] : kidsOf(n));     // (a checklist's steps are part of it, not branches)
  const pathTo = (n) => { const p = []; for (let x = n; x; x = parentOf.get(x.i)) p.unshift(x); return p; };
  // an explanation laid out in parts, as in Study Quest: "Rule: … Applied: … Common mistake: …" each on its own line
  const PARTS = /(?=\b(?:Reference:|P\/L category:|Users:|Step \d+(?: \([^)]*\))?:|Rule:|Why:|Applied:|Ethics:|Also:|Common mistakes?:|Not part of it:))/;
  const LABEL = /^(Reference|P\/L category|Users|Step \d+(?: \([^)]*\))?|Rule|Why|Applied|Ethics|Also|Common mistakes?|Not part of it):\s*(.*)$/s;
  function why(text) {
    return el("div", { class: "mm-d" }, ...String(text).split(PARTS).map((x) => x.trim()).filter(Boolean).map((part) => {
      const m = part.match(LABEL);
      return m ? el("p", {}, el("b", {}, `${m[1]}: `), m[2]) : el("p", {}, part);
    }));
  }
  // what a node shows: its text; a trap says true or false, a sort or worked example its answer; Study Quest's marks
  function body(n) {
    const out = [];
    if (n.x === "trap") out.push(el("span", { class: `mm-tag ${n.v ? "true" : "false"}` }, n.v ? "True" : "False"));
    if (n.x === "example") out.push(el("span", { class: "mm-tag" }, "Example"));
    if (n.x === "steps") out.push(el("span", { class: "mm-tag" }, n.any ? "Checklist" : "Steps"));
    out.push(el("span", { class: "mm-t" }, n.t));
    if (n.x === "stage" && passed(n.s)) out.push(el("span", { class: "mm-tag ok" }, "✓ passed"));
    if (n.c && sq.miss?.[n.c]) out.push(el("span", { class: "mm-tag miss", title: "Missed in Study Quest" }, `missed ×${sq.miss[n.c]}`));
    if (n.a && (n.x === "sort" || n.x === "example")) out.push(el("span", { class: "mm-a" }, `→ ${n.a}`));
    return out;
  }
  const isOpen = (n) => n.i === st.focus || open.has(n.i);
  // the extra lines of an open point: its steps (for a steps card), the explanation, and links
  function details(n) {
    const out = [];
    if (n.x === "steps") out.push(el(n.any ? "ul" : "ol", { class: "mm-steps" }, ...n.k.map((s) => el("li", {}, s.t))));
    if (n.d && S.notes) out.push(why(n.d));
    const acts = [];
    if (n.s) acts.push(el("a", { href: `/study-quest/?stage=${encodeURIComponent(n.s)}` }, "Open in Study Quest ↗"));
    if (n.ch) acts.push(el("a", { href: `/study-quest/?chapter=${n.ch}` }, `Chapter ${n.ch} in Study Quest ↗`));
    if ((n.k || []).length && n.x !== "steps" && n.i !== st.focus) acts.push(el("button", { type: "button", onclick: (e) => { e.stopPropagation(); focusOn(n); } }, "Put in the middle"));
    if (acts.length) out.push(el("div", { class: "mm-acts" }, ...acts));
    return out;
  }
  function node(n) {
    const kids = branchKids(n), on = isOpen(n);
    const b = el("div", { class: `mm-node x-${n.x}`, "data-id": n.i, tabindex: "0", role: "button", "aria-expanded": String(on) }, ...body(n));
    if (kids.length) b.append(el("span", { class: "mm-count" }, on ? "−" : String(kids.length)));
    if (on && (!kids.length || n.d || n.s || n.ch)) b.append(...details(n));
    return { b, kids, on };
  }
  // the map: a node and, when open, its branches to the right; compact: each run of points (nothing under them) packed two or three to a row, the
  // branches between them as they are
  function mapBranch(n, compact = false) {
    const { b, kids, on } = node(n), wrap = el("div", { class: "mm-branch", "data-area": n._area }, b);
    if (on && kids.length) {
      const items = [], li = (k) => el("li", { "data-area": k._area }, mapBranch(k, compact));
      for (let i = 0; i < kids.length;) {
        let j = i; while (compact && j < kids.length && !branchKids(kids[j]).length) j++;
        if (j - i > 1) { const run = kids.slice(i, j); items.push(el("li", { "data-area": n._area }, el("div", { class: "mm-pack", style: `--cols: ${run.length > 12 ? 3 : 2}` }, ...run.map((k) => mapBranch(k, compact))))); i = j; }
        else items.push(li(kids[i++]));
      }
      wrap.append(el("ul", { class: "mm-kids" }, ...items));
    }
    return wrap;
  }
  // the outline: the same, as an indented list
  function outlineItem(n) {
    const { b, kids, on } = node(n), li = el("li", { "data-area": n._area }, b);
    if (on && kids.length) li.append(el("ul", { "data-area": n._area }, ...kids.map(outlineItem)));
    return li;
  }

  // ---------- columns: what's in the middle, then each level along the way chosen, a column each; a point's explanation in the last ----------
  function columns(f) {
    const cols = [];
    let parent = f;
    for (let k = 0; ; k++) {
      const kids = branchKids(parent);
      if (!kids.length) break;
      const chosen = kids.find((c) => c.i === st.cols[k]);
      cols.push(el("div", { class: "mm-col", "data-area": parent._area }, el("div", { class: "mm-col-head" }, parent.t),
        ...kids.map((c) => { const under = branchKids(c).length;
          return el("button", { type: "button", class: `mm-ci x-${c.x}${c === chosen ? " on" : ""}`, "data-id": c.i, "data-col": String(k), "data-area": c._area },
            el("span", { class: "mm-ci-t" }, ...body(c)), under ? el("span", { class: "mm-count" }, `${under} ›`) : ""); })));
      if (!chosen) break;
      parent = chosen;
    }
    if (parent !== f && !branchKids(parent).length)     // a point chosen: all of it
      cols.push(el("div", { class: "mm-col mm-col-detail", "data-area": parent._area }, el("div", { class: "mm-col-head" }, "The point"),
        el("div", { class: `mm-node x-${parent.x}`, "data-id": parent.i }, ...body(parent), ...details(parent))));
    return el("div", { class: "mm-columns" }, ...cols);
  }

  // ---------- the sunburst: what's in the middle at the centre, its branches in rings round it, each as wide as the points under it ----------
  const RINGS = 4, NS = (() => { const d = document.createElement("div"); d.innerHTML = "<svg></svg>"; return d.firstChild.namespaceURI; })();     // (SVG's, as the page's own parser gives it)
  const AREA = { A: "var(--danger)", B: "var(--signal)", C: "var(--volt)", D: "var(--ember)", E: "var(--success)", F: "var(--warning)" };
  const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.append(...kids); return e; };
  function sunburst(f) {
    const R = 500, r0 = 84, ringW = (R - r0) / RINGS, memo = new Map();
    const weight = (n) => { if (!memo.has(n.i)) { const k = branchKids(n); memo.set(n.i, k.length ? k.reduce((s, c) => s + weight(c), 0) : 1); } return memo.get(n.i); };
    const pol = (r, a) => [+(r * Math.sin(a)).toFixed(2), +(-r * Math.cos(a)).toFixed(2)];     // a: clockwise from the top
    const arc = (r1, r2, a0, a1) => {
      if (a1 - a0 > 2 * Math.PI - 1e-4) a1 = a0 + 2 * Math.PI - 1e-4;     // (a whole ring: as nearly as an arc can be)
      const big = a1 - a0 > Math.PI ? 1 : 0, [x0, y0] = pol(r2, a0), [x1, y1] = pol(r2, a1), [x2, y2] = pol(r1, a1), [x3, y3] = pol(r1, a0);
      return `M${x0} ${y0}A${r2} ${r2} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 ${big} 0 ${x3} ${y3}Z`;
    };
    const svg = sv("svg", { viewBox: `${-R} ${-R} ${2 * R} ${2 * R}`, class: "mm-sb", role: "img", "aria-label": `The sunburst of ${f.t}` });
    (function ring(n, depth, a0, a1) {
      let a = a0;
      for (const k of branchKids(n)) {
        const b = a + ((a1 - a0) * weight(k)) / weight(n), r1 = r0 + (depth - 1) * ringW, r2 = r1 + ringW - 2;
        const cls = [`sb-d${depth}`, k.x === "stage" && passed(k.s) ? "sb-pass" : "", k.c && sq.miss?.[k.c] ? "sb-miss" : ""].filter(Boolean).join(" ");
        const g = sv("g", { "data-id": k.i, class: cls },
          sv("path", { d: arc(r1, r2, a, b), style: `fill: ${AREA[k._area] || "var(--line-strong)"}; fill-opacity: ${(0.86 - depth * 0.13).toFixed(2)}` }, sv("title", {}, k.t)));
        // a label where it fits: along the radius, read from the left on either side
        const mid = (a + b) / 2, rm = (r1 + r2) / 2, fs = [0, 22, 17, 14, 12][depth];
        if ((b - a) * rm > fs * 1.25) {
          const max = Math.max(3, Math.floor((r2 - r1 - 12) / (fs * 0.56))), text = k.t.length > max ? `${k.t.slice(0, max - 1)}…` : k.t;
          const [x, y] = pol(rm, mid), deg = (mid * 180) / Math.PI;
          g.append(sv("text", { x, y, "font-size": fs, transform: `rotate(${(mid > Math.PI ? deg + 90 : deg - 90).toFixed(1)} ${x} ${y})`, "text-anchor": "middle", "dominant-baseline": "central" }, text));
        }
        svg.append(g);
        if (depth < RINGS) ring(k, depth + 1, a, b);
        a = b;
      }
    })(f, 1, 0, 2 * Math.PI);
    // the centre: what's in the middle, its name in a few lines; a click on it goes up a level
    const words = f.t.split(/\s+/), lines = [];
    for (const w of words) { if (lines.length && (lines[lines.length - 1] + " " + w).length <= 14) lines[lines.length - 1] += ` ${w}`; else lines.push(w); }
    const shownLines = lines.slice(0, 4); if (lines.length > 4) shownLines[3] += "…";
    svg.append(sv("g", { class: `sb-centre${parentOf.get(f.i) ? " up" : ""}`, "data-centre": "1" }, sv("circle", { r: r0 - 4, style: `fill: ${AREA[f._area] || "var(--bg-300)"}` }),
      ...shownLines.map((t, k) => sv("text", { x: 0, y: (k - (shownLines.length - 1) / 2) * 19, "font-size": 16, "text-anchor": "middle", "dominant-baseline": "central" }, t)),
      sv("title", {}, parentOf.get(f.i) ? `${f.t}: click to go up a level` : f.t)));
    return el("div", { class: "mm-sunburst" }, el("div", { class: "mm-scroll" }, svg), el("div", { class: "mm-sb-info", id: "mmSbInfo" }, ...info(byId.get(st.sb) || f)));
  }
  // the panel beside the sunburst: the slice pointed at (or picked): where it is, what it says, how many points are under it
  function info(n, hint = "click its slice to put it in the middle") {
    const under = branchKids(n).length ? (function count(x) { const k = branchKids(x); return k.length ? k.reduce((s, c) => s + count(c), 0) : 1; })(n) : 0;
    return [el("small", {}, pathTo(n).slice(0, -1).map((x) => x.t).join(" › ") || " "), el("div", { class: `mm-node x-${n.x}`, "data-id": n.i }, ...body(n), ...details(n)),
      under ? el("small", {}, `${under} point${under === 1 ? "" : "s"} under it: ${hint}`) : ""];
  }
  const showInfo = (n, hint) => { const box = $("mmSbInfo"); if (box && n) box.replaceChildren(...info(n, hint)); };

  // ---------- the world: the tree drawn as an atlas draws countries. What's in the middle is an island in the sea; its branches are the countries
  // (with SBR there, the syllabus areas), theirs the provinces (chapters) and the districts (sections), and every point is a town on its own square of
  // land; each region as big as the points in it, its borders wandering as borders do. The same island every time ----------
  const LAND = { A: "#dba49b", B: "#a7c796", C: "#e6ca86", D: "#dfa478", E: "#bba7d8", F: "#8cc3bb", G: "#cdbf93" }, LAND0 = "#d3cab4", CELL = 10;
  const mix = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
    return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`; };     // lighter (k > 0) or darker
  const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const latt = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vnoise(x, y, s) {     // smooth noise: hashed corners, eased between
    const xi = Math.floor(x), yi = Math.floor(y), e = (q) => q * q * (3 - 2 * q), fx = e(x - xi), fy = e(y - yi);
    const a = latt(xi, yi, s) + (latt(xi + 1, yi, s) - latt(xi, yi, s)) * fx, b = latt(xi, yi + 1, s) + (latt(xi + 1, yi + 1, s) - latt(xi, yi + 1, s)) * fx;
    return a + (b - a) * fy;
  }
  function worldLayout(f) {
    const seed = Math.floor(strHash(f.i) * 100000);
    const mk = (n, depth) => { const kids = branchKids(n).map((c) => mk(c, depth + 1)); return { n, depth, kids, size: kids.length ? kids.reduce((s, c) => s + c.size, 0) : 1, cells: [] }; };
    const top = mk(f, 0), N = top.size, G = Math.ceil(Math.sqrt(N / 0.45)) + 10, mid = G / 2, R0 = Math.sqrt(N / Math.PI);
    // the island: the cells nearest the middle by a distance roughened with lobes and noise (bays, capes, now and then an islet)
    const cells = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const dx = x + 0.5 - mid, dy = y + 0.5 - mid, a = Math.atan2(dy, dx);
      const lobes = 1 + 0.17 * Math.sin(3 * a + seed) + 0.1 * Math.sin(5 * a + seed * 1.7) + 0.05 * Math.sin(8 * a + seed * 2.9);
      cells.push({ x, y, s: Math.hypot(dx, dy) / (R0 * lobes) + 0.3 * (vnoise(x / 6, y / 6, seed) - 0.5) + 0.1 * (vnoise(x / 2.2, y / 2.2, seed + 7) - 0.5) });
    }
    const land = cells.sort((p, q) => p.s - q.s).slice(0, N);
    // the land shared out: the branches in two groups as near equal as they go, split along the land's longer side by a wavy line, again and again
    (function share(part, regions) {
      if (regions.length === 1) { const r = regions[0]; r.cells = part; if (r.kids.length) share(part, r.kids); return; }
      const total = regions.reduce((s, r) => s + r.size, 0);
      let cut = 1, best = Infinity, acc = 0;
      for (let k = 1; k < regions.length; k++) { acc += regions[k - 1].size; const d = Math.abs(acc - total / 2); if (d < best) { best = d; cut = k; } }
      const A = regions.slice(0, cut), na = A.reduce((s, r) => s + r.size, 0);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of part) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const ang = (x1 - x0 >= y1 - y0 ? 0 : Math.PI / 2) + (strHash(regions[0].n.i) - 0.5) * 0.8, ux = Math.cos(ang), uy = Math.sin(ang);
      const wave = Math.max(1.2, Math.sqrt(part.length) * 0.22), s2 = seed + Math.floor(strHash(regions[0].n.i) * 9999);
      const key = (p) => p.x * ux + p.y * uy + wave * 2 * (vnoise(p.x / 4.5, p.y / 4.5, s2) - 0.5);
      const sorted = part.slice().sort((p, q) => key(p) - key(q));
      share(sorted.slice(0, na), A); share(sorted.slice(na), regions.slice(cut));
    })(land, top.kids.length ? top.kids : [top]);
    top.cells = land;
    return { top, G, land };
  }
  // the outline of a set of squares: their outer edges joined into loops (the set on the right), straight runs merged, then rounded (Chaikin's
  // corner cutting, twice), as an SVG path
  function outlinePath(cells, inSet) {
    const out = new Map(), add = (ax, ay, bx, by) => { const k = ax * 100000 + ay; if (!out.has(k)) out.set(k, []); out.get(k).push([bx, by]); };
    for (const { x, y } of cells) {
      if (!inSet(x, y - 1)) add(x, y, x + 1, y);
      if (!inSet(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!inSet(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!inSet(x - 1, y)) add(x, y + 1, x, y);
    }
    let d = "";
    for (const [k0, list] of out) while (list.length) {
      const sx = Math.floor(k0 / 100000), sy = k0 - sx * 100000, loop = [[sx, sy]];
      let [cx, cy] = list.pop(), guard = 0;
      while ((cx !== sx || cy !== sy) && guard++ < 200000) { loop.push([cx, cy]); const o = out.get(cx * 100000 + cy); if (!o || !o.length) break; [cx, cy] = o.pop(); }
      let pts = loop.filter((p, i) => { const a = loop[(i - 1 + loop.length) % loop.length], b = loop[(i + 1) % loop.length]; return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1])); });
      if (pts.length < 3) pts = loop;
      for (let it = 0; it < 2; it++) pts = pts.flatMap((p, i) => { const q = pts[(i + 1) % pts.length]; return [[0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]]; });
      d += `M${pts.map(([x, y]) => `${(x * CELL).toFixed(1)} ${(y * CELL).toFixed(1)}`).join("L")}Z`;
    }
    return d;
  }
  // where a region's name goes: its square farthest in from its border (ties: nearest its middle), and the room there: the run of its squares
  // across and down through that square
  function anchorOf(cells, inSet) {
    const key = (x, y) => `${x},${y}`, dist = new Map(), q = [];
    for (const p of cells) if (!inSet(p.x - 1, p.y) || !inSet(p.x + 1, p.y) || !inSet(p.x, p.y - 1) || !inSet(p.x, p.y + 1)) { dist.set(key(p.x, p.y), 0); q.push(p); }
    for (let i = 0; i < q.length; i++) {
      const p = q[i], dp = dist.get(key(p.x, p.y));
      for (const [nx, ny] of [[p.x + 1, p.y], [p.x - 1, p.y], [p.x, p.y + 1], [p.x, p.y - 1]]) if (inSet(nx, ny) && !dist.has(key(nx, ny))) { dist.set(key(nx, ny), dp + 1); q.push({ x: nx, y: ny }); }
    }
    const cx = cells.reduce((s, p) => s + p.x, 0) / cells.length, cy = cells.reduce((s, p) => s + p.y, 0) / cells.length;
    let best = cells[0], bd = -Infinity;
    for (const p of cells) { const v = (dist.get(key(p.x, p.y)) || 0) * 10 - Math.hypot(p.x - cx, p.y - cy) * 0.5; if (v > bd) { bd = v; best = p; } }
    let l = best.x, r = best.x, u = best.y, d = best.y;
    while (inSet(l - 1, best.y)) l--; while (inSet(r + 1, best.y)) r++; while (inSet(best.x, u - 1)) u--; while (inSet(best.x, d + 1)) d++;
    const across = r - l + 1, down = d - u + 1;
    return { x: (l + across / 2) * CELL, y: (u + down / 2) * CELL, w: across * CELL, h: down * CELL };
  }
  // a region's name, as maps letter them: the country's in capitals, spaced, on as few lines as its width allows; a province's in italics
  function mapName(n) { return n.t.replace(/^[A-G] · /, "").replace(/^Chapter (\d+):\s*/, "$1 · ").replace(/^\d+\.\d+ /, ""); }
  function lines(text, maxChars) {
    const out = [];
    for (const w of text.split(/\s+/)) { if (out.length && (out[out.length - 1] + " " + w).length <= maxChars) out[out.length - 1] += ` ${w}`; else out.push(w); }
    return out.slice(0, 3).map((l, i, a) => (i === 2 && out.length > 3 ? `${l}…` : l));
  }
  function world(f) {
    const { top, G, land } = worldLayout(f), at = (x, y) => y * G + x;
    const landSet = new Set(land.map((p) => at(p.x, p.y))), inLand = (x, y) => x >= 0 && y >= 0 && x < G && y < G && landSet.has(at(x, y));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of land) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const pad = Math.max(3, Math.min(9, Math.round((x1 - x0) * 0.16))), vx = (x0 - pad) * CELL, vy = (y0 - pad) * CELL, vw = (x1 - x0 + 1 + 2 * pad) * CELL, vh = (y1 - y0 + 1 + 2 * pad) * CELL;
    const svg = sv("svg", { viewBox: `${vx} ${vy} ${vw} ${vh}`, class: "wm", role: "img", "aria-label": `A map of ${f.t}` });
    // the sea: its waves, and the shallows along the coast
    const defs = sv("defs", {}, sv("pattern", { id: "wmWaves", width: 46, height: 24, patternUnits: "userSpaceOnUse" },
      sv("path", { d: "M2 14q5-5 10 0t10 0", class: "wm-wave" }), sv("path", { d: "M25 3q5-5 10 0t10 0", class: "wm-wave" })));
    svg.append(defs, sv("rect", { x: vx, y: vy, width: vw, height: vh, class: "wm-sea" }), sv("rect", { x: vx, y: vy, width: vw, height: vh, fill: "url(#wmWaves)" }));
    const coast = outlinePath(land, inLand);
    svg.append(sv("path", { d: coast, class: "wm-shallow2" }), sv("path", { d: coast, class: "wm-shallow" }), sv("path", { d: coast, class: "wm-land" }));
    // every region: its fill (countries and provinces), its border, its name; districts and towns appear as you zoom in
    const byDepth = [[], [], [], []];
    (function walk(r) { if (r.depth >= 1 && r.depth <= 3 && r.kids.length) byDepth[r.depth].push(r); r.kids.forEach(walk); })(top);
    const memberOf = (r) => { const s = new Set(r.cells.map((p) => at(p.x, p.y))); return (x, y) => x >= 0 && y >= 0 && x < G && y < G && s.has(at(x, y)); };
    // colours: each country its area's (when they're all of one area, as in a chapter's own map, shades of it), each province a shade of its country's
    const SHADES = [0.18, -0.07, 0.08, -0.13, 0.27, -0.02, 0.13], oneArea = new Set(byDepth[1].map((r) => r.n._area)).size === 1, colours = new Map();
    byDepth[1].forEach((r, k) => colours.set(r.n.i, oneArea ? mix(LAND[r.n._area] || LAND0, SHADES[k % SHADES.length] * 1.2) : LAND[r.n._area] || LAND0));
    const colourOf = (r, k) => (r.depth === 1 ? colours.get(r.n.i) : mix(colours.get(pathTo(r.n)[pathTo(r.n).indexOf(f) + 1]?.i) || LAND[r.n._area] || LAND0, SHADES[k % SHADES.length] * 0.7));
    const fills = sv("g", { class: "wm-fills" }), borders = sv("g", {}), names = sv("g", {}), hits = sv("g", { class: "wm-hits" });
    const shapes = new Map();
    for (const d of [1, 2, 3]) byDepth[d].forEach((r, k) => {
      const inR = memberOf(r), path = outlinePath(r.cells, inR); shapes.set(r.n.i, { r, path, inR });
      if (d <= 2) fills.append(sv("path", { d: path, "data-id": r.n.i, class: `wm-r wm-f${d}`, style: `fill: ${colourOf(r, k)}` }, sv("title", {}, r.n.t)));
      else hits.append(sv("path", { d: path, "data-id": r.n.i, class: "wm-r wm-l3 wm-hit" }, sv("title", {}, r.n.t)));
    });
    for (const d of [3, 2, 1]) for (const r of byDepth[d]) borders.append(sv("path", { d: shapes.get(r.n.i).path, class: `wm-b${d}${d === 3 ? " wm-l3" : ""}` }));
    borders.append(sv("path", { d: coast, class: "wm-coast" }));
    // the names: each fitted to the room round its spot (on one, two or three lines, whichever lets it be biggest), left off where it can't be
    // read; the countries' beneath the rest, muted, as atlases letter them
    const scale = Math.min(1.4, Math.max(0.35, vw / 900)), names1 = sv("g", { class: "wm-names1" });
    for (const d of [1, 2, 3]) for (const r of byDepth[d]) {
      const room = anchorOf(r.cells, shapes.get(r.n.i).inR), text = `${r.n.x === "stage" && passed(r.n.s) ? "✓ " : ""}${mapName(r.n)}`;
      const charW = d === 1 ? 0.82 : 0.5, top = [0, 30, 13, 6.5][d] * scale, least = [0, 6, 3.6, 2.2][d];
      let best = null;
      for (let nl = 1; nl <= 3; nl++) {
        const ls = lines(text, Math.max(4, Math.ceil(text.length / nl))), longest = Math.max(...ls.map((s) => s.length));
        const fs = Math.min(top, (0.92 * Math.max(room.w, CELL * 2)) / (longest * charW), (0.85 * Math.max(room.h, CELL * 2)) / (ls.length * 1.12));
        if (!best || fs > best.fs) best = { fs, ls };
      }
      if (best.fs < least) continue;
      const { fs, ls } = best;
      (d === 1 ? names1 : names).append(sv("text", { x: room.x.toFixed(1), y: (room.y - ((ls.length - 1) * fs * 1.1) / 2).toFixed(1), "font-size": fs.toFixed(1), class: `wm-t${d}${d === 3 ? " wm-l3" : ""}`, "text-anchor": "middle", "dominant-baseline": "central" },
        ...ls.map((l, i) => sv("tspan", { x: room.x.toFixed(1), dy: i ? (fs * 1.1).toFixed(1) : 0 }, l))));
    }
    // the towns: every point a place on its square (set a little off its middle, as places are), in a map's symbols: a town (a card), a peak (a trap),
    // a diamond (a sorting question), a square (a worked example); its name on hover; the cards missed in Study Quest as red pins, seen from afar
    const towns = sv("g", {}), pins = sv("g", {});
    const symbol = (x, cx, cy) => (x === "trap" ? `M${cx} ${cy - 2.2}l2 3.4h-4z` : x === "sort" ? `M${cx} ${cy - 1.8}l1.8 1.8l-1.8 1.8l-1.8 -1.8z`
      : x === "example" ? `M${cx - 1.3} ${cy - 1.3}h2.6v2.6h-2.6z` : `M${cx - 1.35} ${cy}a1.35 1.35 0 1 0 2.7 0a1.35 1.35 0 1 0 -2.7 0z`);
    (function walk(r) {
      if (!r.kids.length && r.cells.length) {
        const [p] = r.cells, h1 = strHash(r.n.i), h2 = strHash(`${r.n.i}y`), cx = +((p.x + 0.5 + (h1 - 0.5) * 0.5) * CELL).toFixed(1), cy = +((p.y + 0.5 + (h2 - 0.5) * 0.5) * CELL).toFixed(1);
        towns.append(sv("path", { d: symbol(r.n.x, cx, cy), "data-id": r.n.i, class: `wm-town wm-${r.n.x}` }, sv("title", {}, r.n.t)));
        if (r.n.c && sq.miss?.[r.n.c]) pins.append(sv("g", { "data-id": r.n.i, class: "wm-pin" }, sv("path", { d: `M${cx} ${cy}l-3.2 -7a3.6 3.6 0 1 1 6.4 0z` }), sv("title", {}, `Missed ×${sq.miss[r.n.c]}: ${r.n.t}`)));
      }
      r.kids.forEach(walk);
    })(top);
    // a compass rose, and a cartouche with the map's name and its countries
    const sc = scale, rx = vx + vw - 42 * sc, ry = vy + 44 * sc, star = (a, l, w2) => { const p = (ang, rr) => `${(rx + Math.sin(ang) * rr).toFixed(1)} ${(ry - Math.cos(ang) * rr).toFixed(1)}`;
      return `M${p(a, l)}L${p(a + Math.PI / 2, w2)}L${p(a + Math.PI, w2 * 0.6)}L${p(a - Math.PI / 2, w2)}Z`; };
    const rose = sv("g", { class: "wm-rose" }, sv("circle", { cx: rx, cy: ry, r: 25 * sc }), ...[0, 1, 2, 3].map((q) => sv("path", { d: star((q * Math.PI) / 2, 30 * sc, 5 * sc), class: q ? "" : "n" })),
      sv("text", { x: rx, y: ry - 36 * sc, "font-size": 11 * sc, "text-anchor": "middle" }, "N"));
    // a cartouche with the map's name, in the corner of the sea
    const title = f === tree ? "SBR · the known world" : mapName(f).slice(0, 40), tw = Math.max(90, title.length * 6.4) * sc;
    const cartouche = sv("g", { class: "wm-cart" }, sv("rect", { x: vx + 8 * sc, y: vy + 8 * sc, width: tw, height: 22 * sc, rx: 4 * sc }),
      sv("text", { x: vx + 16 * sc, y: vy + 23 * sc, "font-size": 11.5 * sc, class: "wm-cart-h" }, title));
    // the legend, beside the map: the countries (or, in one country, its provinces), each a click away; the places' symbols
    const listed = byDepth[1].length > 1 ? byDepth[1] : byDepth[2];
    const legend = el("div", { class: "wm-legend" }, el("small", {}, byDepth[1].length > 1 ? "Countries" : "Provinces"),
      ...listed.map((r) => el("button", { type: "button", class: "wm-key", "data-zoom": r.n.i }, el("span", { style: `background: ${colourOf(r, byDepth[r.depth].indexOf(r))}` }), mapName(r.n))),
      el("small", { class: "wm-symbols" }, "● point  ▲ trap  ◆ sort  ■ worked example  ", el("b", {}, "📍"), " missed in Study Quest"));
    svg.append(fills, hits, names1, borders, names, towns, pins, rose, cartouche);
    return el("div", { class: "mm-sunburst mm-world" }, el("div", { class: "wm-wrap" }, el("div", { class: "mm-scroll" }, svg), el("small", { class: "wm-hint" }, "Drag to move · Ctrl + wheel or + − to zoom: districts, then towns · click a region to zoom to it · double-click to make it its own map")),
      el("div", { class: "mm-side" }, el("div", { class: "mm-sb-info", id: "mmSbInfo" }, ...info(byId.get(st.sb) || f, "click to zoom to it; double-click to make it its own map")), legend));
  }

  // ---------- the sketch: the tree drawn as a hand-drawn mind map, a sketchnote. What's in the middle in a big circle ringed in colours; its branches
  // in bubbles round it on thick curved arrows, each in its own marker's colour; theirs in smaller bubbles beyond; doodles about the page, one by each
  // branch for what it's about ----------
  const INK = "#2d2a32", MARKERS = ["#2b7bd8", "#36a852", "#8a4fc9", "#e0403a", "#f28c1e", "#1fa3a8", "#e04f9c", "#d9a61a"];
  const DOODLE = {
    star: '<path d="M12 2.5l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.4l-5.6 3.1 1.3-6.2L3 9l6.3-.7z" fill="#f7cd4a"/>',
    bulb: '<path d="M8.5 15.5c-2-1.6-3-3.6-3-5.8a6.5 6.5 0 0 1 13 0c0 2.2-1 4.2-3 5.8v2.5h-7z" fill="#fde68a"/><path d="M9 20.5h6M10 23h4M12 1.5V-1M4.5 4.5L3 3M19.5 4.5L21 3"/>',
    gear: '<circle cx="12" cy="12" r="6.3" fill="#cbd5e1"/><circle cx="12" cy="12" r="2.3" fill="#fff"/><path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M5.4 18.6l2.1-2.1M16.5 7.5l2.1-2.1" stroke-width="2.6"/>',
    cloud: '<path d="M6 18h12.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.4-1.6A4.8 4.8 0 0 0 6 18z" fill="#fff"/>',
    mountain: '<path d="M1 21l7.5-11 4 5.5 3-4 7.5 9.5z" fill="#a9c1d6"/><path d="M8.5 10l1.6 2.4-1.6 1-1.6-1z" fill="#fff"/><path d="M15.5 11.5V3"/><path d="M15.5 3l5 2-5 2z" fill="#e0403a"/>',
    coins: '<ellipse cx="12" cy="18.5" rx="7" ry="2.6" fill="#f2c94c"/><path d="M5 18.5v-3M19 18.5v-3"/><ellipse cx="12" cy="15.5" rx="7" ry="2.6" fill="#f6d365"/><path d="M5 15.5v-3M19 15.5v-3"/><ellipse cx="12" cy="12.5" rx="7" ry="2.6" fill="#f9dc7a"/>',
    chart: '<path d="M3 3v18h18"/><path d="M6 21v-8h3v8M11 21V9h3v12M16 21V5h3v16" fill="#f9b46b"/>',
    speech: '<path d="M3 5h18v11H9l-5 4v-4H3z" fill="#bfe3f7"/><path d="M8 10.5h.1M12 10.5h.1M16 10.5h.1" stroke-width="2.4"/>',
    pencil: '<path d="M4 20l2-6L17.5 2.5l4 4L10 18z" fill="#f6c945"/><path d="M4 20l2-6 4 4z" fill="#f3d9b1"/><path d="M15 5l4 4"/>',
    magnifier: '<circle cx="10" cy="10" r="6.5" fill="#dbeafe"/><path d="M15 15l6.5 6.5" stroke-width="3"/>',
    scales: '<path d="M12 3v17M7 21h10M4 6h16"/><path d="M4 6l-3 7h6zM20 6l-3 7h6z" fill="#fde68a"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="#fff"/><path d="M12 6.5V12l3.5 2"/>',
    book: '<path d="M2 5c3-1.3 6.5-1.3 10 1v14c-3.5-2.3-7-2.3-10-1z" fill="#c7d2fe"/><path d="M22 5c-3-1.3-6.5-1.3-10 1v14c3.5-2.3 7-2.3 10-1z" fill="#e0e7ff"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2" fill="#fff"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7 14h2M11 14h2M15 14h2M7 17.5h2M11 17.5h2" stroke-width="2"/>',
    laptop: '<rect x="4" y="4" width="16" height="11" rx="1" fill="#bfe3f7"/><path d="M1.5 19h21l-2-4h-17z" fill="#d1d5db"/>',
    duck: '<path d="M5 15c0 3.5 3 6 7.5 6s7-2.2 7-5c0-1.6-1.2-2.6-2.6-2.6-1 0-1.8.4-2.5 1C14 13 15 11.6 15 10a4 4 0 0 0-8 0c0 1.2.5 2.2 1.3 2.9C6.3 13 5 13.8 5 15z" fill="#f9d64a"/><path d="M15 9.5l3.5 1-3.4 1.2z" fill="#f28c1e"/><path d="M11.5 8.8h.1" stroke-width="2.2"/>',
    swirl: '<path d="M12 12a2 2 0 1 1 2 2 4 4 0 1 1-4-4 6 6 0 1 1 6 6"/>',
    sparkle: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" stroke-width="1.2"/>',
    target: '<circle cx="12" cy="12" r="9" fill="#fecaca"/><circle cx="12" cy="12" r="5.5" fill="#fff"/><circle cx="12" cy="12" r="2" fill="#e0403a"/>',
  };
  const THEME = { A: "scales", B: "book", C: "chart", D: "duck", E: "magnifier", F: "calendar", G: "laptop" }, LOOSE = ["star", "bulb", "gear", "cloud", "swirl", "sparkle", "star", "bulb"];
  const ABOUT = ["target", "bulb", "coins", "pencil", "speech", "mountain", "gear", "star"];
  function sketch(f) {
    const nodes = [], seedOf = (s) => strHash(s);
    const sizeOf = (n, level) => {     // a bubble big enough for its name on up to three lines
      const fs = level === 1 ? 18.5 : 13.5, ls = lines(level ? mapName(n) : n.t, level === 1 ? 13 : 15), longest = Math.max(...ls.map((s) => s.length));
      return { fs, ls, r: Math.max(level === 1 ? 50 : 34, Math.hypot(longest * fs * 0.56, ls.length * fs * 1.15) / 2 + 13) };
    };
    const centre = { n: f, x: 0, y: 0, level: 0, fs: f === tree ? 44 : 30, ls: lines(f === tree ? "SBR" : mapName(f), 12), r: 0, w: 0 };
    centre.r = Math.max(92, Math.hypot(Math.max(...centre.ls.map((s) => s.length)) * centre.fs * 0.52, centre.ls.length * centre.fs * 1.15) / 2 + 22);
    const kids = branchKids(f), D1 = Math.max(centre.r + 190, kids.length * 40);
    kids.forEach((k, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / kids.length, s = sizeOf(k, 1);
      const p = { n: k, level: 1, a, x: D1 * Math.cos(a), y: D1 * Math.sin(a), tx: D1 * Math.cos(a), ty: D1 * Math.sin(a), colour: MARKERS[i % MARKERS.length], w: 0.35, ...s };
      nodes.push(p);
      // its own branches fanned out beyond it (six at most, four when there are many branches round the middle; the rest a bubble that says how many more)
      const cap = kids.length > 8 ? 4 : 6, grand = branchKids(k), shown2 = grand.slice(0, grand.length > cap + 1 ? cap : cap + 1), more = grand.length - shown2.length;
      const items = [...shown2.map((g) => ({ n: g, ...sizeOf(g, 2) })), ...(more ? [{ n: k, more, fs: 12.5, ls: [`+${more} more`], r: 34 }] : [])];
      const spread = Math.min(2.2, 0.5 * items.length), d2 = s.r + 105;
      items.forEach((it, j) => {
        const b = a + (items.length > 1 ? (j / (items.length - 1) - 0.5) * spread : 0);
        nodes.push({ ...it, level: 2, parent: p, x: p.x + d2 * Math.cos(b), y: p.y + d2 * Math.sin(b), tx: p.x + d2 * Math.cos(b), ty: p.y + d2 * Math.sin(b), colour: p.colour, w: 1 });
      });
    });
    // bubbles that overlap pushed apart (the middle stays put; a branch moves a little, its own branches more), each drawn back a little towards
    // where it was meant to be
    const all = [centre, ...nodes];
    for (let it = 0; it < 120; it++) {
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const A = all[i], B = all[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01, min = A.r + B.r + 16;
        if (d >= min) continue;
        const push = (min - d) / ((A.w || 0) + (B.w || 0) || 1);
        if (A.w) { A.x -= (dx / d) * push * A.w; A.y -= (dy / d) * push * A.w; }
        if (B.w) { B.x += (dx / d) * push * B.w; B.y += (dy / d) * push * B.w; }
      }
      for (const p of nodes) { p.x += (p.tx - p.x) * 0.03; p.y += (p.ty - p.y) * 0.03; }
    }
    // the page: as big as what's on it
    let x0 = -centre.r, x1 = centre.r, y0 = -centre.r, y1 = centre.r;
    for (const p of nodes) { x0 = Math.min(x0, p.x - p.r); x1 = Math.max(x1, p.x + p.r); y0 = Math.min(y0, p.y - p.r); y1 = Math.max(y1, p.y + p.r); }
    x0 -= 70; y0 -= 70; x1 += 70; y1 += 70;
    const svg = sv("svg", { viewBox: `${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`, class: "sk", role: "img", "aria-label": `A sketch of ${f.t}` });
    svg.append(sv("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: "sk-paper" }));
    // a wobbly ring, as drawn by hand
    const ring = (cx, cy, r, s) => { const pts = []; for (let k = 0; k <= 48; k++) { const q = (k / 48) * Math.PI * 2, rr = r * (1 + 0.018 * Math.sin(3 * q + s * 9) + 0.012 * Math.sin(5 * q + s * 4));
      pts.push(`${(cx + rr * Math.cos(q)).toFixed(1)} ${(cy + rr * Math.sin(q)).toFixed(1)}`); } return `M${pts.join("L")}Z`; };
    // an arrow from one bubble to another, curved, its head at the end
    const arrow = (A, B, width, colour, bend) => {
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const sx = A.x + ux * (A.r + 4), sy = A.y + uy * (A.r + 4), ex = B.x - ux * (B.r + 6 + width * 1.6), ey = B.y - uy * (B.r + 6 + width * 1.6);
      const mx = (sx + ex) / 2 - uy * bend * d * 0.16, my = (sy + ey) / 2 + ux * bend * d * 0.16;
      const tx = ex - mx, ty = ey - my, tl = Math.hypot(tx, ty) || 1, hx = tx / tl, hy = ty / tl, hw = width * 1.5, hl = width * 2.4;
      const tip = [ex + hx * hl, ey + hy * hl], l = [ex - hy * hw, ey + hx * hw], rr = [ex + hy * hw, ey - hx * hw];
      return [sv("path", { d: `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, class: "sk-arrow", style: `stroke: ${colour}; stroke-width: ${width}` }),
        sv("path", { d: `M${tip.map((v) => v.toFixed(1)).join(" ")}L${l.map((v) => v.toFixed(1)).join(" ")}L${rr.map((v) => v.toFixed(1)).join(" ")}Z`, style: `fill: ${colour}` })];
    };
    const arrows = sv("g", {}), bubbles = sv("g", {}), doodles = sv("g", { class: "sk-doodles" });
    nodes.forEach((p, k) => arrows.append(...(p.level === 1 ? arrow(centre, p, 7, p.colour, k % 2 ? 1 : -1) : arrow(p.parent, p, 3.4, p.colour, k % 2 ? 0.7 : -0.7))));
    // the bubbles: white, a marker's outline doubled by a finer line inside it, the name in a hand's writing
    const label = (p, colour) => sv("text", { x: p.x.toFixed(1), y: (p.y - ((p.ls.length - 1) * p.fs * 1.15) / 2).toFixed(1), "font-size": p.fs, "text-anchor": "middle", "dominant-baseline": "central", style: `fill: ${colour}` },
      ...p.ls.map((l, i) => sv("tspan", { x: p.x.toFixed(1), dy: i ? (p.fs * 1.15).toFixed(1) : 0 }, l)));
    for (const p of nodes) {
      const s = seedOf(p.n.i + (p.more ? "+" : ""));
      bubbles.append(sv("g", p.more ? { "data-id": p.n.i, class: "sk-b sk-more" } : { "data-id": p.n.i, class: `sk-b sk-l${p.level}${p.n.c && sq.miss?.[p.n.c] ? " sk-miss" : ""}` },
        sv("path", { d: ring(p.x, p.y, p.r, s), class: "sk-fill", style: `stroke: ${p.colour}; stroke-width: ${p.level === 1 ? 4.5 : 3}` }),
        sv("path", { d: ring(p.x, p.y, p.r - (p.level === 1 ? 6 : 4.5), s + 0.3), class: "sk-inner", style: `stroke: ${p.colour}` }),
        label(p, INK), sv("title", {}, p.more ? `${p.more} more under ${p.n.t}: click to see them all` : p.n.t)));
    }
    // the middle: rings of colour round it, its name large
    const mid = sv("g", { class: `sk-centre${parentOf.get(f.i) ? " up" : ""}`, "data-centre": "1" },
      ...[["#f7cd4a", 13], ["#36a852", 7.5], ["#2b7bd8", 2]].map(([c, o]) => sv("path", { d: ring(0, 0, centre.r + o, o), class: "sk-ring", style: `stroke: ${c}` })),
      sv("path", { d: ring(0, 0, centre.r - 4, 0.7), class: "sk-fill", style: "stroke: #2b7bd8; stroke-width: 2" }), label(centre, "#2b6fc4"),
      sv("title", {}, parentOf.get(f.i) ? `${f.t}: click to go up a level` : f.t));
    // the doodles: by each branch one for what it's about; then a few loose ones where the page is empty
    const room = (x, y, r) => all.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r + 8);
    const placed = [], put = (kind, x, y, size, tilt) => { const g = sv("g", { transform: `translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) rotate(${tilt.toFixed(0)} ${size / 2} ${size / 2}) scale(${(size / 24).toFixed(2)})` }); g.innerHTML = DOODLE[kind]; doodles.append(g); placed.push([x, y, size]); };
    nodes.filter((p) => p.level === 1).forEach((p, k) => {
      const kind = (f === tree ? THEME[p.n.a] : null) || (p.n.x === "chapter" && f.x !== "chapter" ? THEME[p.n._area] : null) || ABOUT[Math.floor(seedOf(p.n.i) * ABOUT.length)];
      for (const turn of [1.15, -1.15, 1.9, -1.9, 2.6, -2.6]) {
        const q = p.a + turn, x = p.x + (p.r + 34) * Math.cos(q), y = p.y + (p.r + 34) * Math.sin(q);
        if (room(x, y, 24) && placed.every(([a, b, s]) => Math.hypot(a - x, b - y) > s + 30)) { put(kind, x, y, 44, (seedOf(p.n.i + "t") - 0.5) * 24); break; }
      }
    });
    let tries = 0;
    for (let k = 0; placed.length < nodes.filter((p) => p.level === 1).length + 12 && tries < 400; tries++) {
      const h1 = seedOf(`${f.i}:${tries}`), h2 = seedOf(`${f.i}::${tries}`), x = x0 + 30 + h1 * (x1 - x0 - 60), y = y0 + 30 + h2 * (y1 - y0 - 60), size = 26 + seedOf(`${tries}s`) * 14;
      if (room(x, y, size / 2 + 6) && placed.every(([a, b, s]) => Math.hypot(a - x, b - y) > (s + size) / 2 + 26)) put(LOOSE[k++ % LOOSE.length], x, y, size, (seedOf(`${tries}r`) - 0.5) * 40);
    }
    svg.append(doodles, arrows, bubbles, mid);
    return el("div", { class: "mm-sunburst mm-sketch" }, el("div", { class: "mm-scroll" }, svg),
      el("div", { class: "mm-side" }, el("div", { class: "mm-sb-info", id: "mmSbInfo" }, ...info(byId.get(st.sb) || f, "click its bubble to put it in the middle"))));
  }

  // ---------- progress: a tile for each chapter, area by area, from Study Quest: its stages passed, the cards missed in it ----------
  function progress() {
    const under = (n, test, out = []) => { if (test(n)) out.push(n); for (const k of n.k || []) under(k, test, out); return out; };
    let stagesAll = 0, passedAll = 0, missesAll = 0;
    const areas = kidsOf(tree).filter((n) => n.x === "area").map((area) => ({ area, tiles: kidsOf(area).filter((n) => n.x === "chapter").map((ch) => {
      // its Study Quest stages: whatever under it links to one (a stage's heading, or a point straight under a topic, as in chapter 18)
      const stages = [...new Set(under(ch, (n) => !!n.s).map((n) => n.s))], done = stages.filter(passed).length, started = stages.filter((s) => (sq.lists?.[s]?.best || 0) > 0).length;
      const missed = under(ch, (n) => !!(n.c && sq.miss?.[n.c])).sort((a, b) => sq.miss[b.c] - sq.miss[a.c]), misses = missed.reduce((s, n) => s + sq.miss[n.c], 0);
      stagesAll += stages.length; passedAll += done; missesAll += misses;
      return { ch, stages: stages.length, done, started, missed, misses, state: !started && !misses ? "todo" : stages.length && done === stages.length ? "done" : "going" };
    }) }));
    const worst = areas.flatMap((x) => x.tiles).filter((t) => t.misses).sort((a, b) => b.misses - a.misses).slice(0, 3);
    const tile = (t, area) => el("div", { class: `mm-tile ${t.state}${worst.includes(t) ? " worst" : ""}`, "data-area": area.a, "data-ch": String(t.ch.ch) },
      el("div", { class: "mm-tile-h" }, el("b", {}, `${t.ch.ch}`), ` ${t.ch.t.replace(/^Chapter \d+:\s*/, "")}`),
      el("div", { class: "mm-tbar", title: `${t.done} of ${t.stages} stages passed` }, el("span", { style: `width: ${t.stages ? Math.round((100 * t.done) / t.stages) : 0}%` })),
      el("small", {}, t.state === "todo" ? `Not started · ${t.stages} stages` : `${t.done} of ${t.stages} stages passed`),
      t.misses ? el("small", { class: "miss" }, `${t.missed.length} card${t.missed.length === 1 ? "" : "s"} missed, ${t.misses} time${t.misses === 1 ? "" : "s"}`) : "",
      ...t.missed.slice(0, 2).map((n) => el("small", { class: "mm-tile-card", title: n.t }, `×${sq.miss[n.c]} ${n.t}`)),
      el("div", { class: "mm-acts" }, el("button", { type: "button", "data-chapter": t.ch.i }, "On the map"), el("a", { href: `/study-quest/?chapter=${t.ch.ch}` }, "Study Quest ↗")));
    return el("div", { class: "mm-progress" },
      el("div", { class: "mm-sum" }, el("span", {}, "Stages passed: ", el("b", {}, `${passedAll} of ${stagesAll}`)), el("span", {}, "Cards missed: ", el("b", {}, String(missesAll))),
        worst.length ? el("span", {}, "Most missed: ", el("b", {}, worst.map((t) => `chapter ${t.ch.ch}`).join(", "))) : el("span", {}, "No cards missed yet")),
      el("div", { class: "mm-legend" }, el("span", { class: "todo" }, "not started"), el("span", { class: "going" }, "under way"), el("span", { class: "done" }, "every stage passed"), el("span", { class: "worst" }, "most missed")),
      ...areas.map(({ area, tiles }) => el("section", { "data-area": area.a }, el("h3", { class: "mm-area-h" }, area.t), el("div", { class: "mm-tiles" }, ...tiles.map((t) => tile(t, area))))));
  }

  function render(found = null) {
    const f = byId.get(st.focus) || tree, path = pathTo(f), v = view();
    viewZoom(v);
    root.classList.toggle("mm-large", S.size === "large");
    root.dataset.view = v;     // (what doesn't apply to a view is hidden by its look: Unfold all off the tree views, the path on Progress)
    root.querySelectorAll(".mm-views button").forEach((x) => x.classList.toggle("on", x.dataset.view === v));
    crumbs.replaceChildren(...path.flatMap((x, k) => [k ? el("span", {}, "›") : "",
      k === path.length - 1 ? el("b", {}, x.t) : el("button", { type: "button", onclick: () => focusOn(x) }, x.t)]),
      path.length > 1 ? el("button", { type: "button", onclick: () => focusOn(path[path.length - 2]) }, "↑ Up") : "");
    stage.replaceChildren(v === "map" ? el("div", { class: "mm-map" }, mapBranch(f))
      : v === "compact" ? el("div", { class: "mm-map mm-compact" }, mapBranch(f, true))
      : v === "columns" ? columns(f)
      : v === "sunburst" ? sunburst(f)
      : v === "world" ? world(f)
      : v === "sketch" ? sketch(f)
      : v === "progress" ? progress()
      : el("div", { class: "mm-outline" }, el("ul", {}, outlineItem(f))));
    if (found) {
      const t = stage.querySelector(`[data-id="${found}"]`);
      if (t) { t.classList.add("found"); t.scrollIntoView({ block: "center", inline: "center" }); setTimeout(() => t.classList.remove("found"), 2500); }
    }
    if (v === "columns") stage.scrollLeft = stage.scrollWidth;     // (the newest column in view)
    fitBox();
    save();
  }
  function focusOn(n) { st.focus = n.i; open.add(n.i); st.cols = []; st.sb = null; render(); stage.scrollTo(0, 0); }
  // a click: on the map, the outline and the compact map it opens or folds a node (a point: shows or hides its explanation); in the columns it
  // chooses the way on; on the sunburst a branch goes in the middle (its centre goes back up) and a point shows all of it; on a progress tile, its
  // chapter on the map
  stage.addEventListener("click", (e) => {
    const v = view();
    if (v === "progress") { const c = e.target.closest("[data-chapter]"); if (c) { st.view = "map"; focusOn(byId.get(c.dataset.chapter)); } return; }
    if (e.target.closest("a, button:not(.mm-ci):not(.wm-key)")) return;
    if (v === "columns") {
      const c = e.target.closest(".mm-ci"); if (!c) return;
      st.cols = [...st.cols.slice(0, +c.dataset.col), c.dataset.id]; render(); return;
    }
    if (v === "world") {     // a region zoomed to (and shown beside the map); a town or a pin, all of its point (not after a drag); a legend's key: its country
      const key = e.target.closest("[data-zoom]");
      if (key) { const g = stage.querySelector(`.wm [data-id="${key.dataset.zoom}"]`), n = byId.get(key.dataset.zoom); st.sb = n.i; showInfo(n, "click to zoom to it; double-click to make it its own map"); if (g) zoomTo(g); return; }
      if (dragged) return;
      const g = e.target.closest("[data-id]"); if (!g || !g.closest(".wm")) return;
      const n = byId.get(g.dataset.id); st.sb = n.i; showInfo(n, "click to zoom to it; double-click to make it its own map"); save();
      if (branchKids(n).length) zoomTo(g);
      return;
    }
    if (v === "sunburst" || v === "sketch") {
      if (e.target.closest("[data-centre]")) { const p = parentOf.get(st.focus); if (p) focusOn(p); return; }
      const g = e.target.closest("g[data-id]"); if (!g) return;
      const n = byId.get(g.dataset.id);
      if (branchKids(n).length) focusOn(n); else { st.sb = n.i; showInfo(n); save(); }
      return;
    }
    const b = e.target.closest(".mm-node"); if (!b) return;
    const n = byId.get(b.dataset.id); if (!n) return;
    if (n.i === st.focus) return;     // the branch in the middle stays open: the path above goes back up
    if (open.has(n.i)) open.delete(n.i); else open.add(n.i);
    render(n.i === st.focus ? null : n.i);
  });
  // the sunburst and the world: what's under the pointer shown beside it; off it, back to the one picked (or what's in the middle)
  stage.addEventListener("mouseover", (e) => {
    const v = view();
    if (v === "sunburst") { const g = e.target.closest("g[data-id]"); showInfo(g ? byId.get(g.dataset.id) : e.target.closest(".mm-sb") ? byId.get(st.sb) || byId.get(st.focus) : null); }
    if (v === "sketch") { const g = e.target.closest("g[data-id]"); if (g) showInfo(byId.get(g.dataset.id), "click its bubble to put it in the middle"); }
    if (v === "world" && !drag) { const g = e.target.closest("[data-id]"); if (g && g.closest(".wm")) showInfo(byId.get(g.dataset.id), "click to zoom to it; double-click to make it its own map"); }
  });
  // the world: dragged about like a map; a double-click makes a region its own map
  let drag = null, dragged = false;
  stage.addEventListener("pointerdown", (e) => {
    if (view() !== "world" || e.button !== 0 || !e.target.closest(".wm")) return;
    const box = scroller(); drag = { box, x: e.clientX, y: e.clientY, sl: box.scrollLeft, st: box.scrollTop }; dragged = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) < 5) return;
    dragged = true; stage.classList.add("dragging"); drag.box.scrollLeft = drag.sl - dx; drag.box.scrollTop = drag.st - dy;
  });
  window.addEventListener("pointerup", () => { if (!drag) return; drag = null; stage.classList.remove("dragging"); setTimeout(() => { dragged = false; }, 0); });
  stage.addEventListener("dblclick", (e) => {
    if (view() !== "world") return;
    const g = e.target.closest("[data-id]"); if (!g || !g.closest(".wm")) return;
    const n = byId.get(g.dataset.id); if (branchKids(n).length) focusOn(n);
  });
  // a region brought into view: zoomed until it fills about two thirds of it, its middle in the middle
  function zoomTo(g) {
    const box = scroller(), b = g.getBoundingClientRect(), s = box.getBoundingClientRect();
    const z = Math.min(zmax(), zoom * Math.min((s.width * 0.66) / Math.max(1, b.width), (s.height * 0.66) / Math.max(1, b.height)));
    if (z > zoom * 1.05) setZoom(z, b.left + b.width / 2 - s.left, b.top + b.height / 2 - s.top);
    const c = g.getBoundingClientRect();
    box.scrollLeft += c.left + c.width / 2 - (s.left + s.width / 2); box.scrollTop += c.top + c.height / 2 - (s.top + s.height / 2);
  }
  stage.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("mm-node")) { e.preventDefault(); e.target.click(); } });
  root.querySelectorAll(".mm-views button").forEach((x) => x.addEventListener("click", () => { st.view = x.dataset.view; render(); }));
  $("mmClose").addEventListener("click", () => { open.clear(); st.focus = tree.i; st.cols = []; st.sb = null; render(); });

  // search: every word must be in the node (its text, answer or explanation); a result opens the way to it, in whichever view is on (Progress
  // shows it on the map)
  const all = [...byId.values()].filter((n) => n !== tree);
  const textOf = (n) => `${n.t} ${n.a || ""} ${n.d || ""}`.toLowerCase();
  let timer = null;
  function find() {
    const words = search.value.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) { results.hidden = true; return; }
    const hits = all.filter((n) => shown(n) && words.every((w) => textOf(n).includes(w)))
      .sort((a, b) => words.filter((w) => !b.t.toLowerCase().includes(w)).length - words.filter((w) => !a.t.toLowerCase().includes(w)).length);
    results.hidden = false;
    results.replaceChildren(el("small", {}, hits.length ? `${hits.length} found${hits.length > 40 ? ", the first 40" : ""}` : "Nothing found"),
      ...hits.slice(0, 40).map((n) => el("button", { type: "button", onclick: () => reveal(n) }, n.t, el("small", {}, pathTo(n).slice(1, -1).map((x) => x.t).join(" › ")))));
  }
  function reveal(n) {
    const path = pathTo(n), ch = path.find((x) => x.x === "chapter") || path[Math.min(1, path.length - 1)];
    const target = n.x === "step" ? parentOf.get(n.i) : n;     // (a step: its checklist)
    results.hidden = true;
    if (view() === "progress") st.view = "map";
    const v = view();
    st.focus = ch.i; st.sb = null; st.cols = [];
    if (v === "columns") { st.cols = pathTo(target).slice(path.indexOf(ch) + 1).map((x) => x.i); render(target.i); return; }
    if (v === "sunburst") { const p = parentOf.get(target.i); if (p && pathTo(p).length > path.indexOf(ch)) st.focus = p.i; st.sb = target.i; render(target.i); return; }
    for (const x of path.slice(path.indexOf(ch))) open.add(x.i);
    if (n.x === "step") open.add(target.i);
    render(target.i);
  }
  search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(find, 150); });
  search.addEventListener("keydown", (e) => { if (e.key === "Escape") { search.value = ""; results.hidden = true; } });
  document.addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== search) { e.preventDefault(); search.focus(); } });
  // zoom: whatever's in view drawn bigger or smaller, its scroll area with it; the point under the cursor (or between the fingers, or the middle of
  // the view for a button) stays where it is. Each view keeps its own (the sunburst full size while the map is zoomed out)
  const ZMIN = 0.05, zoomLabel = $("mmZoomReset");     // (small enough to see a whole area unfolded at once, as an overview to zoom into)
  const zmax = () => (["sunburst", "world", "sketch"].includes(view()) ? 8 : 2.5);     // (a drawing: close enough to read a town's name)
  const zclamp = (z) => Math.min(zmax(), Math.max(ZMIN, Math.round(z * 1000) / 1000));
  const zooms = st.zooms && typeof st.zooms === "object" ? st.zooms : st.zoom ? { map: st.zoom } : {};
  let zoom = 1, zoomOf = null;
  function viewZoom(v) {     // (a view's own zoom when it comes into view)
    if (v === zoomOf) return;
    zoomOf = v; zoom = zclamp(Number(zooms[v]) || 1); stage.style.setProperty("--mm-zoom", String(zoom)); zoomLabel.textContent = `${Math.round(zoom * 100)}%`; lod();
  }
  const lod = () => { stage.dataset.lod = zoom >= 3 ? "3" : zoom >= 1.6 ? "2" : "1"; };     // (the world: districts from 1.6x, towns from 3x)
  // (the sunburst and the world: their drawing grows inside its own box, which scrolls, the panel beside it as it is; the rest: all the view)
  const scroller = () => stage.querySelector(".mm-scroll") || stage;
  function setZoom(z, cx, cy) {
    const box = scroller();
    if (cx === undefined) { cx = box.clientWidth / 2; cy = box.clientHeight / 2; }
    z = zclamp(z);
    const k = z / zoom, x = (box.scrollLeft + cx) * k - cx, y = (box.scrollTop + cy) * k - cy;
    zoom = z; zooms[view()] = z; stage.style.setProperty("--mm-zoom", String(z)); zoomLabel.textContent = `${Math.round(z * 100)}%`; lod();
    box.scrollLeft = x; box.scrollTop = y; save();
  }
  // a drawing in its own box fits it at 100%: as wide as the box, or as tall, whichever comes first
  function fitBox() {
    const box = stage.querySelector(".mm-scroll"), svg = box?.querySelector("svg"); if (!svg) return;
    const vb = svg.viewBox.baseVal, w = Math.max(100, Math.min(box.clientWidth - 2, ((box.clientHeight - 2) * vb.width) / vb.height));
    box.style.setProperty("--fitw", `${Math.floor(w)}px`);
  }
  window.addEventListener("resize", fitBox);
  function fit(wide = false) {     // everything that's open in view at once (no bigger than full size, no smaller than the least zoom); wide: as wide as
    // the view, scrolled down through. Measured at full size: a scroll area is never smaller than the view, so smaller sizes can't be read off it
    if (stage.querySelector(".mm-scroll")) { setZoom(1); scroller().scrollTo(0, 0); return; }
    stage.style.setProperty("--mm-zoom", "1");
    const w = stage.scrollWidth, h = stage.scrollHeight;
    stage.style.setProperty("--mm-zoom", String(zoom));
    setZoom(Math.min(1, (stage.clientWidth - 4) / w, wide ? Infinity : (stage.clientHeight - 4) / h)); stage.scrollTo(0, 0);
  }
  $("mmZoomIn").addEventListener("click", () => setZoom(zoom * 1.2));
  $("mmZoomOut").addEventListener("click", () => setZoom(zoom / 1.2));
  zoomLabel.addEventListener("click", () => setZoom(1));
  $("mmZoomFit").addEventListener("click", () => fit());
  // unfold everything under what's in the middle (with SBR there, the whole syllabus): every branch opened (not each point's explanation, nor a
  // checklist's steps), then shown as wide as the view, to scroll down through (Fit then shows it all at once, as small as it must be)
  $("mmUnfold").addEventListener("click", () => {
    (function walk(n) { const kids = branchKids(n); if (!kids.length) return; open.add(n.i); kids.forEach(walk); })(byId.get(st.focus) || tree);
    render(); fit(true);
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(zoom * 1.2); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(zoom / 1.2); }
    else if (e.key === "0") { e.preventDefault(); setZoom(1); }
  });
  stage.addEventListener("wheel", (e) => {     // Ctrl + the wheel, and a touchpad pinch (which comes as that): the map, not the page
    if (!e.ctrlKey) return;
    e.preventDefault();
    const r = scroller().getBoundingClientRect();
    setZoom(zoom * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  let pinch = null;     // two fingers on a touch screen
  const gap = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  stage.addEventListener("touchstart", (e) => { if (e.touches.length === 2) pinch = { d: gap(e.touches) || 1, z: zoom }; }, { passive: true });
  stage.addEventListener("touchmove", (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const r = scroller().getBoundingClientRect(), t = e.touches;
    setZoom((pinch.z * gap(t)) / pinch.d, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  stage.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinch = null; });
  setupFullscreen(root);
  window.SbrMapView = { render, reveal, focusOn, byId, setZoom, zoom: () => zoom, view, state: () => ({ ...st, open: [...open], zoom }) };   // for tests
  render();
})();
