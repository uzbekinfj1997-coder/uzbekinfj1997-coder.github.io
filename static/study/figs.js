/* Study Quest figures: physiology teaching diagrams (inline SVG) for Robiyaxon's Physiology cards.
   Numbers after Pokrovsky & Korotko «Физиология человека» (1997), as stated on her cards.
   Theme-aware: no colours here, only the classes styled in StudyFigs.css (CSS variables of the app).
   window.StudyFigs[id] = { title: {ru, en}, svg(lang) -> "<svg ...>" }; the app puts the string into .sq-fig. */
"use strict";
(function () {
  /* ---------- textbook values used in the drawings (cards' answers) ---------- */
  const N = {
    apRest: -90, apThreshold: -55, apPeak: 30,
    ecgP: "≤ 0,1", ecgPQ: "0,12–0,2", ecgQRS: "0,06–0,1", ecgQT: "0,38–0,42", ecgRR: "0,75–1,0",
    cyc: { aSys: 0.1, async: 0.05, iso: 0.03, fastEj: 0.12, slowEj: 0.13, proto: 0.04, isoRel: 0.08, fastFill: 0.08, slowFill: 0.17 },
    edv: 130, esv: 60, sv: "65–70", aoOpen: 80, lvPeak: 120,
    TV: "0,5", IRV: "1,5–1,8", ERV: "1,0–1,4", RV: "1,0–1,5", IC: "2,0–2,3", FRC: "2,0–2,4",
    VCm: "3,5–5,0", VCw: "3,0–4,0",       // Pokrovsky vol. 1 (chapter 8); vol. 2's norms table (chapter 20) has 4,5–5,0 and 3,5–4,0
    p50: "26–27"
  };

  /* ---------- helpers ---------- */
  let LANG = "ru";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const r1 = (v) => Math.round(v * 10) / 10;
  // text: s may hold "\n" for extra lines; cls e.g. "f-ink", "f-mute f-s"; a = start|middle|end
  function T(x, y, s, cls, a, extra) {
    if (LANG === "en") s = String(s).replace(/(\d),(\d)/g, "$1.$2");   // decimal point in English
    const lines = String(s).split("\n");
    const anchor = a && a !== "start" ? ` text-anchor="${a}"` : "";
    const body = lines.length === 1 ? esc(s)
      : lines.map((l, i) => `<tspan x="${r1(x)}"${i ? ' dy="1.2em"' : ""}>${esc(l)}</tspan>`).join("");
    return `<text x="${r1(x)}" y="${r1(y)}" class="f-t ${cls || "f-ink"}"${anchor}${extra ? " " + extra : ""}>${body}</text>`;
  }
  const P = (d, cls, extra) => `<path d="${d}" class="${cls}"${extra ? " " + extra : ""}/>`;
  const Ln = (x1, y1, x2, y2, cls) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="${cls}"/>`;
  // arrow from (x1,y1) to (x2,y2), solid head; cls colour class
  function A(x1, y1, x2, y2, cls, head) {
    const h = head || 7, ang = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - h * Math.cos(ang), by = y2 - h * Math.sin(ang);
    const w = h * 0.55, px = -Math.sin(ang) * w, py = Math.cos(ang) * w;
    return Ln(x1, y1, bx, by, cls) +
      `<path d="M${r1(x2)},${r1(y2)} L${r1(bx + px)},${r1(by + py)} L${r1(bx - px)},${r1(by - py)} Z" class="f-head ${cls}"/>`;
  }
  // numbered disc
  const Num = (x, y, n, cls) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="9" class="f-disc ${cls || "f-acc"}"/>` +
    T(x, y + 4.5, n, "f-on f-s", "middle");
  // horizontal bracket |___| with ends going up (dir=-1) or down (dir=1)
  const Br = (x1, x2, y, cls, dir) => P(`M${r1(x1)},${r1(y + 5 * (dir || -1))} V${r1(y)} H${r1(x2)} V${r1(y + 5 * (dir || -1))}`, cls);
  // vertical bracket at x from y1 to y2, ticks towards side (−1 left, +1 right)
  const VBr = (x, y1, y2, cls, side) => P(`M${r1(x + 5 * side)},${r1(y1)} H${r1(x)} V${r1(y2)} H${r1(x + 5 * side)}`, cls);
  // monotone cubic path through points [[x,y],...] sorted by x (no overshoot)
  function mono(pts) {
    const n = pts.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    let p = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const h = (pts[i + 1][0] - pts[i][0]) / 3;
      p += ` C${r1(pts[i][0] + h)},${r1(pts[i][1] + m[i] * h)} ${r1(pts[i + 1][0] - h)},${r1(pts[i + 1][1] - m[i + 1] * h)} ${r1(pts[i + 1][0])},${r1(pts[i + 1][1])}`;
    }
    return p;
  }
  const svg = (w, h, label, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" class="fig">${body}</svg>`;
  const pick = (lang) => { LANG = lang === "en" ? "en" : "ru"; return (ru, en) => (LANG === "en" ? en : ru); };

  /* ---------- 1. Action potential ---------- */
  function ap(lang) {
    const L = pick(lang);
    const y = (v) => 52 + (40 - v) * 1.5;          // mV -> y
    const yR = y(N.apRest), yK = y(N.apThreshold), y0 = y(0), yPk = y(N.apPeak);
    const curve = `M52,${yR} L96,${yR} C110,${yR - 1} 120,${yK + 34} 127,${yK}` +
      ` C131,${yK - 30} 137,${yPk + 14} 143,${yPk + 1} C146,${yPk - 4} 150,${yPk - 3} 153,${yPk + 6}` +
      ` C161,${y(-5)} 173,${y(-40)} 185,${yK}` +
      ` C192,${yK + 18} 200,${y(-80)} 214,${y(-84)}` +
      ` C224,${y(-86)} 234,${y(-88)} 242,${yR}` +
      ` C250,${y(-94)} 256,${y(-97)} 268,${y(-97)} C292,${y(-97)} 312,${y(-91)} 340,${yR} L364,${yR}`;
    const overshoot = `M137.6,${y0} C139.6,${yPk + 12} 141,${yPk + 3} 143,${yPk + 1} C146,${yPk - 4} 150,${yPk - 3} 153,${yPk + 6} C155.6,${y(14)} 158.3,${y(6)} 160.6,${y0} Z`;
    const axY = y(-136), barY = axY + 14;
    let b = "";
    b += P(overshoot, "f-fill");
    b += Ln(52, y0, 364, y0, "f-mute f-thin f-dash");
    b += Ln(52, yK, 364, yK, "f-warn f-thin f-dash");
    b += Ln(52, 36, 52, axY, "f-mute f-thin") + Ln(52, axY, 366, axY, "f-mute f-thin");
    b += T(46, y(30) + 4, "+30", "f-mute f-s", "end") + T(46, y0 + 4, "0", "f-mute f-s", "end") +
      T(46, yK + 4, String(N.apThreshold).replace("-", "−"), "f-warn f-s", "end") + T(46, yR + 4, "−90", "f-mute f-s", "end");
    b += T(8, 24, L("мВ", "mV"), "f-mute f-s");
    b += T(372, axY + 18, "t", "f-mute f-s", "end");
    b += T(364, yK - 6, L("КУД", "CLD (threshold)"), "f-warn f-s", "end");
    b += T(56, yR + 18, L("потенциал покоя", "resting potential"), "f-mute f-s");
    b += P(curve, "f-acc f-curve");
    // phase labels
    b += T(148, yPk - 14, L("реверсия (овершут)", "reversal (overshoot)"), "f-ink f-s", "middle");
    b += T(128, y(-12), L("деполяри-\nзация", "depolari-\nsation"), "f-ink f-s", "end");
    b += T(170, y(-12), L("реполяризация", "repolarisation"), "f-ink f-s");
    b += T(118, yR - 30, L("локальный\nответ", "local\nresponse"), "f-ink f-s", "end");
    b += T(280, y(-102), L("положительный следовой\nпотенциал (следовая\nгиперполяризация)", "positive after-potential\n(after-hyper-\npolarisation)"), "f-ink f-s", "middle");
    // channel events
    b += Num(142, yK + 6, "1", "f-acc2") + Num(166, yPk + 2, "2", "f-acc2") + Num(190, y(-30), "3", "f-acc2");
    // refractory bars
    const bars = [[127, 185, "f-warn", "f-solid"], [185, 214, "f-warn", "f-soft"], [214, 242, "f-acc", "f-soft"], [242, 340, "f-acc2", "f-soft"]];
    bars.forEach(([x1, x2, c, k]) => { b += `<rect x="${x1}" y="${barY}" width="${x2 - x1}" height="9" rx="2" class="f-bar ${k} ${c}"/>`; });
    [127, 185, 214, 242, 340].forEach((x) => { b += Ln(x, axY, x, barY + 9, "f-mute f-thin f-dash"); });
    b += T(156, barY + 26, L("АРП", "ARP"), "f-warn f-s", "middle");
    b += T(199.5, barY + 44, L("ОРП", "RRP"), "f-warn f-s", "middle");
    b += T(228, barY + 26, "↑", "f-acc f-s", "middle");
    b += T(291, barY + 26, "↓", "f-acc2 f-s", "middle");
    const ly = barY + 70;
    b += T(16, ly, L("АРП — абсолютная рефрактерность", "ARP — absolute refractory period"), "f-ink f-s") +
      T(16, ly + 18, L("ОРП — относительная (на реполяризации)", "RRP — relative (during repolarisation)"), "f-ink f-s") +
      T(16, ly + 36, L("↑ супернормальная возбудимость", "↑ supernormal excitability"), "f-ink f-s") +
      T(16, ly + 54, L("↓ субнормальная возбудимость", "↓ subnormal excitability"), "f-ink f-s");
    const ny = ly + 82;
    b += Num(24, ny - 4, "1", "f-acc2") + T(40, ny, L("Na⁺-каналы открываются, Na⁺ входит", "Na⁺ channels open, Na⁺ flows in"), "f-ink f-s");
    b += Num(24, ny + 20, "2", "f-acc2") + T(40, ny + 24, L("Na⁺-каналы инактивируются", "Na⁺ channels inactivate"), "f-ink f-s");
    b += Num(24, ny + 44, "3", "f-acc2") + T(40, ny + 48, L("K⁺-каналы открыты, K⁺ выходит", "K⁺ channels open, K⁺ flows out"), "f-ink f-s");
    return svg(380, ny + 62, L("Потенциал действия нервного волокна: фазы, ионные каналы и рефрактерность",
      "Action potential of a nerve fibre: phases, ion channels and refractoriness"), b);
  }

  /* ---------- 2. Chemical synapse ---------- */
  function synapse(lang) {
    const L = pick(lang);
    let b = "";
    // presynaptic terminal
    b += P("M168,8 V44 C168,70 92,82 86,130 C82,160 92,186 110,196 H270 C288,186 298,160 294,130 C288,82 212,70 212,44 V8", "f-ink f-mem f-fill2");
    b += A(190, 14, 190, 46, "f-warn") + T(200, 30, L("ПД", "AP"), "f-warn f-s");
    // vesicles
    [[150, 112], [178, 98], [206, 104], [232, 120], [132, 142], [162, 134], [196, 136], [226, 150], [252, 146], [146, 168]].forEach(([x, yy]) => {
      b += `<circle cx="${x}" cy="${yy}" r="10" class="f-ink f-thin f-ves"/>`;
      b += `<circle cx="${x - 3}" cy="${yy - 2}" r="1.8" class="f-dot f-acc"/><circle cx="${x + 3}" cy="${yy + 2}" r="1.8" class="f-dot f-acc"/><circle cx="${x + 2}" cy="${yy - 4}" r="1.8" class="f-dot f-acc"/>`;
    });
    // exocytosis: omega at the active zone
    b += P("M180,196 C180,184 200,184 200,196", "f-ink f-thin");
    [[188, 206], [194, 214], [184, 216], [200, 208], [178, 210]].forEach(([x, yy]) => { b += `<circle cx="${x}" cy="${yy}" r="1.8" class="f-dot f-acc"/>`; });
    // Ca channels in the membrane near the active zone
    [[118, 192, 1], [262, 192, -1]].forEach(([x, yy, s]) => {
      b += `<rect x="${x - 5}" y="${yy - 7}" width="10" height="14" rx="2" class="f-warn f-chan"/>`;
      b += A(x - 26 * s, yy + 20, x + 2 * s, yy - 12, "f-warn", 6);
    });
    b += T(90, 224, "Ca²⁺", "f-warn f-s", "end") + T(290, 224, "Ca²⁺", "f-warn f-s");
    // cleft label + enzyme
    b += T(376, 216, L("щель", "cleft"), "f-mute f-s", "end");
    // postsynaptic membrane
    b += P("M40,226 H340", "f-ink f-mem");
    b += P("M40,226 V300 M340,226 V300", "f-ink f-thin");
    // receptors (cups) with channels
    [140, 170, 210, 240].forEach((x) => { b += P(`M${x - 7},220 V232 M${x + 7},220 V232 M${x - 7},220 Q${x},214 ${x + 7},220`, "f-acc2 f-rec"); });
    // ACh on a receptor
    b += `<circle cx="170" cy="216" r="1.8" class="f-dot f-acc"/><circle cx="210" cy="216" r="1.8" class="f-dot f-acc"/>`;
    // Na+ in
    b += A(170, 236, 170, 266, "f-acc2", 6) + A(210, 236, 210, 266, "f-acc2", 6) + T(190, 286, "Na⁺", "f-acc2 f-s", "middle");
    // AChE
    b += T(222, 210, L("АХЭ ✕", "AChE ✕"), "f-ink f-s");
    b += T(300, 252, L("рецепторы", "receptors"), "f-acc2 f-s", "middle") + Ln(268, 247, 246, 230, "f-acc2 f-thin");
    b += T(100, 276, L("постсинаптическая\nклетка", "postsynaptic\ncell"), "f-mute f-s", "middle");
    b += T(256, 30, L("пресинаптическое\nокончание", "presynaptic\nterminal"), "f-mute f-s");
    // EPSP mini trace
    b += Ln(250, 296, 330, 296, "f-mute f-thin") + P("M250,296 L262,296 C266,296 268,272 274,272 C284,272 296,294 330,296", "f-acc f-curve");
    b += T(290, 270, L("ВПСП", "EPSP"), "f-acc f-s");
    // step numbers
    b += Num(158, 30, "1") + Num(100, 176, "2", "f-warn") + Num(168, 206, "3") + Num(124, 238, "4", "f-acc2") + Num(240, 286, "5");
    const ly = 330, rows = [
      ["1", L("ПД деполяризует пресинаптическое окончание", "The AP depolarises the presynaptic terminal")],
      ["2", L("открываются потенциалзависимые Ca²⁺-каналы,\nCa²⁺ входит в окончание", "voltage-gated Ca²⁺ channels open,\nCa²⁺ enters the terminal")],
      ["3", L("экзоцитоз: медиатор (ацетилхолин) — в щель", "exocytosis: transmitter (ACh) into the cleft")],
      ["4", L("медиатор связывается с рецепторами,\nоткрываются каналы, Na⁺ входит", "transmitter binds receptors,\nchannels open, Na⁺ flows in")],
      ["5", L("деполяризация — ВПСП", "depolarisation — the EPSP")]];
    let yy = ly;
    rows.forEach(([n, s]) => { b += Num(22, yy - 4, n, n === "2" ? "f-warn" : n === "4" ? "f-acc2" : "f-acc") + T(38, yy, s, "f-ink f-s"); yy += s.includes("\n") ? 38 : 22; });
    b += T(38, yy + 2, L("АХЭ — ацетилхолинэстераза,\nрасщепляет медиатор в щели", "AChE — acetylcholinesterase,\nbreaks the transmitter down"), "f-mute f-s");
    return svg(380, yy + 30, L("Химический синапс: от потенциала действия до ВПСП", "Chemical synapse: from action potential to EPSP"), b);
  }

  /* ---------- 3. Reflex arc ---------- */
  // point and direction on a cubic Bézier
  const bez = (q, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * q[0][k] + 3 * u * u * t * q[1][k] + 3 * u * t * t * q[2][k] + t * t * t * q[3][k]); };
  const bezD = (q) => `M${q[0].join(",")} C${q[1].join(",")} ${q[2].join(",")} ${q[3].join(",")}`;
  const headAt = (q, t, cls) => { const a = bez(q, t - 0.03), c = bez(q, t + 0.03); return A(a[0], a[1], c[0], c[1], cls, 10).replace(/<line[^>]*\/>/, ""); };
  function reflexarc(lang) {
    const L = pick(lang);
    let b = "";
    const cx = 292, cy = 160;
    b += `<ellipse cx="${cx}" cy="${cy}" rx="76" ry="60" class="f-ink f-thin"/>`;
    b += P(`M${cx - 6},${cy - 8} C${cx - 14},${cy - 30} ${cx - 26},${cy - 50} ${cx - 22},${cy - 56} C${cx - 14},${cy - 54} ${cx - 8},${cy - 34} ${cx - 4},${cy - 14}` +
      ` H${cx + 4} C${cx + 8},${cy - 34} ${cx + 14},${cy - 54} ${cx + 22},${cy - 56} C${cx + 26},${cy - 50} ${cx + 14},${cy - 30} ${cx + 6},${cy - 8}` +
      ` C${cx + 30},${cy} ${cx + 46},${cy + 24} ${cx + 40},${cy + 44} C${cx + 28},${cy + 52} ${cx + 12},${cy + 30} ${cx + 4},${cy + 12}` +
      ` H${cx - 4} C${cx - 12},${cy + 30} ${cx - 28},${cy + 52} ${cx - 40},${cy + 44} C${cx - 46},${cy + 24} ${cx - 30},${cy} ${cx - 6},${cy - 8} Z`, "f-mute f-thin f-fill2");
    b += `<circle cx="${cx}" cy="${cy + 2}" r="2.5" class="f-mute f-thin"/>`;
    // muscle with spindle
    const mx = 96, my = 340;
    b += `<ellipse cx="${mx}" cy="${my}" rx="70" ry="22" class="f-ink f-thin"/>` + P(`M${mx - 70},${my} H${mx - 82} M${mx + 70},${my} H${mx + 82}`, "f-ink f-thin");
    b += P(`M${mx - 42},${my} C${mx - 38},${my - 8} ${mx - 34},${my + 8} ${mx - 30},${my} C${mx - 26},${my - 8} ${mx - 22},${my + 8} ${mx - 18},${my}`, "f-acc f-curve");
    // ganglion
    const gx = 172, gy = 86;
    b += `<ellipse cx="${gx}" cy="${gy}" rx="24" ry="14" class="f-ink f-thin f-fill"/>`;
    const aff = [[mx - 26, my - 4], [64, 220], [100, 110], [gx - 8, gy + 2]];
    const cen = [[gx + 8, gy], [230, 74], [262, 80], [cx - 22, cy - 52]];
    const inC = [[cx - 22, cy - 52], [cx - 24, cy - 20], [cx - 32, cy + 10], [cx - 34, cy + 28]];
    b += P(bezD(aff), "f-acc f-curve") + P(bezD(cen), "f-acc f-curve") + P(bezD(inC), "f-acc f-curve");
    b += `<circle cx="${gx}" cy="${gy - 3}" r="6" class="f-solid f-acc"/>` + Ln(gx, gy + 3, gx, gy + 1, "f-acc f-curve");
    // interneuron (polysynaptic path)
    const inx = cx - 4, iny = cy - 2;
    b += P(`M${cx - 22},${cy - 40} C${cx - 14},${cy - 26} ${inx - 6},${iny - 12} ${inx},${iny - 6}`, "f-acc2 f-curve f-dash");
    b += `<circle cx="${inx}" cy="${iny}" r="5" class="f-solid f-acc2"/>`;
    b += P(`M${inx},${iny + 5} C${inx},${iny + 18} ${cx - 22},${cy + 24} ${cx - 28},${cy + 30}`, "f-acc2 f-curve f-dash");
    // motoneuron
    const mnx = cx - 36, mny = cy + 36;
    b += `<path d="M${mnx},${mny - 8} L${mnx + 8},${mny} L${mnx + 2},${mny + 9} L${mnx - 8},${mny + 5} L${mnx - 7},${mny - 4} Z" class="f-solid f-warn"/>`;
    const eff = [[mnx - 6, mny + 6], [214, 236], [170, 262], [140, my - 22]];
    b += P(bezD(eff), "f-warn f-curve") + `<circle cx="140" cy="${my - 22}" r="3.5" class="f-solid f-warn"/>`;
    b += headAt(aff, 0.42, "f-acc") + headAt(cen, 0.5, "f-acc") + headAt(eff, 0.55, "f-warn");
    // labels
    b += T(gx, gy - 24, L("спинномозговой ганглий", "dorsal root ganglion"), "f-mute f-s", "middle");
    b += T(322, 88, L("задний корешок", "dorsal root"), "f-mute f-s", "middle");
    b += T(cx, 240, L("спинной мозг", "spinal cord"), "f-mute f-s", "middle");
    b += T(222, 264, L("передний корешок", "ventral root"), "f-mute f-s");
    b += Num(48, my - 22, "1") + T(26, my + 40, L("рецептор (веретено)", "receptor (spindle)"), "f-acc f-s");
    b += Num(58, 205, "2") + T(96, 210, L("афферентный\nнейрон", "afferent\nneuron"), "f-acc f-s");
    b += Num(cx + 16, cy - 2, "3", "f-acc2");
    b += Num(186, 238, "4", "f-warn") + T(206, 290, L("эфферентный\n(двигательный)\nнейрон", "efferent\n(motor)\nneuron"), "f-warn f-s");
    b += Num(mx + 96, my, "5", "f-ink") + T(mx + 22, my + 5, L("мышца", "muscle"), "f-ink f-s", "middle");
    const ly = 412;
    b += T(16, ly, L("1 рецептор → 2 афферентный (чувствительный)\nнейрон → 3 нервный центр (вставочный нейрон\nв сером веществе) → 4 эфферентный\n(двигательный) нейрон → 5 эффектор",
      "1 receptor → 2 afferent (sensory) neuron →\n3 nerve centre (interneuron in the grey\nmatter) → 4 efferent (motor) neuron →\n5 effector"), "f-ink f-s");
    const ly2 = ly + 76;
    b += P(`M16,${ly2 - 4} H40`, "f-acc2 f-curve f-dash") + T(46, ly2, L("через вставочный нейрон —\nполисинаптическая дуга;", "via an interneuron — a\npolysynaptic arc;"), "f-ink f-s");
    b += P(`M16,${ly2 + 36} H40`, "f-acc f-curve") + T(46, ly2 + 40, L("коленный рефлекс — моносинаптический,\nвставочного нейрона нет", "the knee jerk is monosynaptic,\nno interneuron"), "f-ink f-s");
    return svg(380, ly2 + 74, L("Рефлекторная дуга: пять звеньев, коленный рефлекс", "Reflex arc: five links, the knee jerk"), b);
  }

  /* ---------- 4. Cardiac cycle (Wiggers) ---------- */
  function wiggers(lang) {
    const L = pick(lang);
    const X = (t) => 52 + t * 418;                 // 0..0.8 s -> 52..386
    const Yp = (p) => 380 - p * 1.6;               // mm Hg
    const Yv = (v) => 500 - (v - 50) * 0.95;       // ml
    const c = N.cyc;
    const tb = [0]; [c.aSys, c.async, c.iso, c.fastEj, c.slowEj, c.proto, c.isoRel, c.fastFill, c.slowFill].forEach((d) => tb.push(r1(tb[tb.length - 1] * 100 + d * 100) / 100));
    // tb: 0, .1, .15, .18, .30, .43, .47, .55, .63, .80
    const tAVc = tb[2], tAoO = tb[3], tAoC = tb[6], tAVo = tb[7];
    let b = "";
    // ECG strip
    const eb = 78, E = (t, a) => [X(t), eb - a];
    const ecg = mono([E(0, 0), E(0.02, 0), E(0.055, 8), E(0.09, 0), E(0.1, 0)]) +
      ` L${r1(X(0.105))},${eb + 5} L${r1(X(0.118))},${eb - 46} L${r1(X(0.132))},${eb + 9} L${r1(X(0.142))},${eb}` +
      " " + mono([E(0.142, 0), E(0.26, 1), E(0.33, 13), E(0.40, 0), E(0.8, 0)]).replace(/^M[^ ]+/, "");
    b += T(8, 26, L("ЭКГ", "ECG"), "f-mute f-s") + P(ecg, "f-ink f-line");
    b += T(X(0.055), eb - 14, "P", "f-ink f-s", "middle") + T(X(0.118) + 8, eb - 36, "R", "f-ink f-s") + T(X(0.33), eb - 20, "T", "f-ink f-s", "middle");
    // valve lines and labels
    [[tAVc, L("АВ закр.", "AV shut"), "end", 110], [tAoO, L("Ао откр.", "Ao open"), "start", 128], [tAoC, L("Ао закр.", "Ao shut"), "end", 110], [tAVo, L("АВ откр.", "AV open"), "start", 128]].forEach(([t, s, a, yy]) => {
      b += Ln(X(t), 98, X(t), 510, "f-mute f-thin f-dash");
      b += T(X(t) + (a === "end" ? -4 : 4), yy, s, "f-mute f-s", a);
    });
    b += T(X(tAVc) - 4, 146, L("I тон", "S1"), "f-mute f-s", "end") + T(X(tAoC) - 4, 146, L("II тон", "S2"), "f-mute f-s", "end");
    // pressure axes
    b += Ln(52, Yp(130), 52, Yp(0), "f-mute f-thin") + Ln(52, Yp(0), 386, Yp(0), "f-mute f-thin");
    [0, 40, 80, 120].forEach((p) => { b += T(47, Yp(p) + 4, p, "f-mute f-s", "end") + Ln(52, Yp(p), 56, Yp(p), "f-mute f-thin"); });
    b += T(8, Yp(130) - 8, L("давление, мм рт. ст.", "pressure, mm Hg"), "f-mute f-s");
    const lv = [[0, 3], [0.05, 4], [0.1, 7], [0.12, 6], [0.15, 9], [0.18, 80], [0.19, 90], [0.22, 112], [0.26, 122], [0.30, 119], [0.36, 111], [0.43, 101], [0.47, 86], [0.55, 6], [0.58, 2], [0.63, 2], [0.8, 3]];
    const ao = [[0, 84], [0.1, 81], [0.18, 79], [0.19, 86], [0.22, 108], [0.26, 119], [0.30, 118], [0.36, 112], [0.43, 104], [0.465, 92], [0.49, 97], [0.55, 94], [0.8, 84]];
    const la = [[0, 3], [0.05, 7], [0.1, 3], [0.15, 6], [0.2, 2], [0.43, 7], [0.55, 11], [0.6, 4], [0.8, 3]];
    const toP = (arr) => arr.map(([t, p]) => [X(t), Yp(p)]);
    b += P(mono(toP(ao)), "f-acc2 f-curve");
    b += P(mono(toP(la)), "f-mute f-curve");
    b += P(mono(toP(lv)), "f-acc f-curve");
    b += T(X(0.66), Yp(100), L("аорта", "aorta"), "f-acc2 f-s", "middle");
    b += T(X(0.5) + 8, Yp(52), L("левый\nжелудочек", "left\nventricle"), "f-acc f-s");
    b += T(X(0.34), Yp(14), L("левое предсердие", "left atrium"), "f-mute f-s", "middle");
    // volume panel
    b += Ln(52, Yv(140), 52, Yv(50), "f-mute f-thin");
    [60, 130].forEach((v) => { b += T(47, Yv(v) + 4, v, "f-mute f-s", "end") + Ln(52, Yv(v), 56, Yv(v), "f-mute f-thin"); });
    b += T(8, Yv(140) - 6, L("объём ЛЖ, мл", "LV volume, ml"), "f-mute f-s");
    const vol = [[0, 115], [0.1, 130], [0.18, 130], [0.3, 80], [0.43, 62], [0.47, 60], [0.55, 60], [0.63, 100], [0.8, 115]];
    b += P(mono(vol.map(([t, v]) => [X(t), Yv(v)])), "f-acc f-curve");
    b += T(X(0.3) + 8, Yv(80) + 4, L("УО ≈ " + N.sv + " мл", "SV ≈ " + N.sv + " ml"), "f-acc f-s");
    // phase band
    const py = 522;
    for (let i = 0; i < 9; i++) {
      const x1 = X(tb[i]), x2 = X(tb[i + 1]);
      b += `<rect x="${r1(x1)}" y="${py}" width="${r1(x2 - x1)}" height="20" class="f-cell ${i === 0 ? "f-band2" : i < 5 ? "f-band" : "f-band0"}"/>`;
      b += T((x1 + x2) / 2, py + 14.5, i + 1, "f-ink f-xs", "middle");
    }
    [0, 0.2, 0.4, 0.6, 0.8].forEach((t) => { b += T(X(t), py + 36, String(t).replace(".", lang === "en" ? "." : ","), "f-mute f-s", "middle"); });
    b += T(386, py + 52, L("t, с", "t, s"), "f-mute f-s", "end");
    // period brackets
    const by = py + 64;
    b += Br(X(0.1), X(0.43), by, "f-acc f-thin", -1) + T(X(0.265), by + 16, L("систола желуд. 0,33 с", "ventr. systole 0.33 s"), "f-acc f-s", "middle");
    b += Br(X(0.43), X(0.8), by, "f-mute f-thin", -1) + T(X(0.615), by + 16, L("диастола 0,47 с*", "diastole 0.47 s*"), "f-mute f-s", "middle");
    b += Br(X(0), X(0.1), by, "f-acc2 f-thin", -1);
    // legend
    const names = lang === "en"
      ? ["atrial systole (presystole)", "asynchronous contraction", "isometric contraction", "fast ejection", "slow ejection", "protodiastole", "isometric relaxation", "fast filling", "slow filling"]
      : ["систола предсердий (пресистола)", "асинхронное сокращение", "изометрическое сокращение", "быстрое изгнание", "медленное изгнание", "протодиастола", "изометрическое расслабление", "быстрое наполнение", "медленное наполнение"];
    const durs = [c.aSys, c.async, c.iso, c.fastEj, c.slowEj, c.proto, c.isoRel, c.fastFill, c.slowFill];
    let ly = by + 42;
    names.forEach((s, i) => {
      b += T(22, ly, i + 1, "f-ink f-s", "middle") + T(36, ly, s, "f-ink f-s") + T(372, ly, String(durs[i]).replace(".", lang === "en" ? "." : ",") + L(" с", " s"), "f-mute f-s", "end");
      ly += 18;
    });
    b += T(16, ly + 8, L("* диастола желудочков включает пресистолу (1);\nцикл 0,8 с при 75 в минуту", "* ventricular diastole includes presystole (1);\ncycle 0.8 s at 75 per minute"), "f-mute f-s");
    b += T(16, ly + 46, L("АВ — атриовентрикулярный (митральный) клапан,\nАо — аортальный (полулунный) клапан", "AV — atrioventricular (mitral) valve,\nAo — aortic (semilunar) valve"), "f-mute f-s");
    return svg(400, ly + 78, L("Сердечный цикл: давление в аорте, левом желудочке и предсердии, объём желудочка, ЭКГ и фазы",
      "Cardiac cycle: aortic, left ventricular and atrial pressure, ventricular volume, ECG and phases"), b);
  }

  /* ---------- 5. ECG lead II ---------- */
  function ecg(lang) {
    const L = pick(lang);
    const X = (t) => 18 + t * 340;                 // s
    const base = 216, Y = (mv) => base - mv * 136; // 0.1 mV per 13.6
    let b = "";
    // grid
    const gx0 = X(0), gx1 = X(1.08), gy0 = 60, gy1 = 256;
    for (let t = 0, i = 0; t <= 1.08 + 1e-9; t += 0.04, i++) b += Ln(X(t), gy0, X(t), gy1, i % 5 ? "f-grid" : "f-grid f-grid5");
    for (let yy = base, i = 0; yy >= gy0 - 0.1; yy -= 13.6, i++) b += Ln(gx0, yy, gx1, yy, i % 5 ? "f-grid" : "f-grid f-grid5");
    for (let yy = base + 13.6, i = 1; yy <= gy1 + 0.1; yy += 13.6, i++) b += Ln(gx0, yy, gx1, yy, i % 5 ? "f-grid" : "f-grid f-grid5");
    const beat = (o) => {
      const E = (t, mv) => [X(o + t), Y(mv)];
      return mono([E(0, 0), E(0.04, 0), E(0.085, 0.15), E(0.13, 0), E(0.2, 0)]) +
        ` L${r1(X(o + 0.212))},${r1(Y(-0.12))} L${r1(X(o + 0.232))},${r1(Y(1.05))} L${r1(X(o + 0.256))},${r1(Y(-0.28))} L${r1(X(o + 0.28))},${r1(Y(0))}` +
        " " + mono([E(0.28, 0), E(0.40, 0.02), E(0.49, 0.3), E(0.58, 0), E(0.62, 0)]).replace(/^M[^ ]+/, "");
    };
    const u = mono([[X(0.62), Y(0)], [X(0.66), Y(0.05)], [X(0.70), Y(0)]]);
    b += P(beat(0), "f-acc f-curve") + P(u, "f-acc f-curve f-faint") +
      P(`M${r1(X(0.70))},${base} L${r1(X(0.8))},${base} ` + beat(0.8).replace(/^M[^ ]+/, ""), "f-acc f-curve");
    b += P(`M${r1(X(0.8 + 0.28))},${base} L${r1(X(1.08))},${base}`, "f-acc f-curve");
    // wave letters
    b += T(X(0.085), Y(0.15) - 8, "P", "f-ink f-b", "middle") + T(X(0.212) - 6, Y(-0.12) + 8, "Q", "f-ink f-b", "end") +
      T(X(0.232) + 9, Y(1.05) + 8, "R", "f-ink f-b") + T(X(0.256) + 7, Y(-0.28) + 6, "S", "f-ink f-b") +
      T(X(0.49), Y(0.3) - 8, "T", "f-ink f-b", "middle") + T(X(0.66), Y(0.05) - 8, "U", "f-mute f-s", "middle");
    b += Br(X(0.232), X(1.032), 56, "f-ink f-line", 1) + T(X(0.632), 46, "RR " + N.ecgRR + L(" с = сердечный цикл", " s = one cardiac cycle"), "f-ink f-s", "middle");
    // drop lines
    [0.04, 0.13, 0.2, 0.28, 0.40, 0.58].forEach((t) => { b += Ln(X(t), base + 4, X(t), 270, "f-mute f-thin f-dash"); });
    const rows = [
      [0.04, 0.13, "P " + L("до 0,1 с", "up to 0.1 s"), "f-acc2"],
      [0.13, 0.2, L("сегмент PQ", "PQ segment"), "f-mute"],
      [0.04, 0.2, "PQ " + N.ecgPQ + L(" с", " s"), "f-acc2"],
      [0.2, 0.28, "QRS " + N.ecgQRS + L(" с", " s"), "f-warn"],
      [0.28, 0.40, L("сегмент ST", "ST segment"), "f-mute"],
      [0.2, 0.58, "QT " + N.ecgQT + L(" с", " s"), "f-warn"]];
    let ry = 282;
    rows.forEach(([t1, t2, s, cls]) => { b += Br(X(t1), X(t2), ry, cls + " f-line", -1) + T(X(t2) + 6, ry + 4, s, cls + " f-s"); ry += 19; });
    b += T(X(0), ry + 10, L("II отведение", "lead II"), "f-mute f-s");
    return svg(390, ry + 22, L("ЭКГ во II отведении: зубцы, интервалы и сегменты", "ECG lead II: waves, intervals and segments"), b);
  }

  /* ---------- 6. Pressure–volume loop ---------- */
  function pvloop(lang) {
    const L = pick(lang);
    const X = (v) => 84 + (v - 40) * 2.2;           // ml
    const Y = (p) => 300 - p * 1.8;                 // mm Hg
    const A_ = [X(N.edv), Y(8)], B_ = [X(N.edv), Y(N.aoOpen)], C_ = [X(N.esv), Y(100)], D_ = [X(N.esv), Y(5)];
    const top = `C${r1(X(124))},${r1(Y(112))} ${r1(X(106))},${r1(Y(124))} ${r1(X(92))},${r1(Y(121))} C${r1(X(78))},${r1(Y(118))} ${r1(X(66))},${r1(Y(110))} ${r1(C_[0])},${r1(C_[1])}`;
    const bottom = `C${r1(X(70))},${r1(Y(1))} ${r1(X(100))},${r1(Y(2))} ${r1(A_[0])},${r1(A_[1])}`;
    const loop = `M${r1(D_[0])},${r1(D_[1])} ${bottom} L${r1(B_[0])},${r1(B_[1])} ${top} Z`;
    let b = "";
    b += P(loop, "f-fill f-none");
    b += Ln(84, 30, 84, Y(0), "f-mute f-thin") + Ln(84, Y(0), 372, Y(0), "f-mute f-thin");
    [0, 40, 80, 120].forEach((p) => { b += T(78, Y(p) + 4, p, "f-mute f-s", "end") + Ln(84, Y(p), 88, Y(p), "f-mute f-thin"); });
    [60, 100, 130].forEach((v) => { b += T(X(v), Y(0) + 18, v, "f-mute f-s", "middle"); });
    b += T(8, 22, L("P, мм рт. ст.", "P, mm Hg"), "f-mute f-s") + T(372, Y(0) + 18, L("V, мл", "V, ml"), "f-mute f-s", "end");
    b += Ln(X(N.esv), Y(0), X(N.esv), D_[1], "f-mute f-thin f-dash") + Ln(X(N.edv), Y(0), X(N.edv), A_[1], "f-mute f-thin f-dash");
    b += Ln(C_[0], Y(N.aoOpen), B_[0], Y(N.aoOpen), "f-mute f-thin f-dash");
    b += P(loop, "f-acc f-curve");
    b += A(X(95), Y(3.2), X(102), Y(3.6), "f-acc", 9).replace(/<line[^>]*\/>/, "");
    b += A(B_[0], Y(40), B_[0], Y(48), "f-acc", 9).replace(/<line[^>]*\/>/, "");
    b += A(X(80), Y(118.4), X(76), Y(116.6), "f-acc", 9).replace(/<line[^>]*\/>/, "");
    b += A(C_[0], Y(56), C_[0], Y(48), "f-acc", 9).replace(/<line[^>]*\/>/, "");
    [A_, B_, C_, D_].forEach(([x, y]) => { b += `<circle cx="${r1(x)}" cy="${r1(y)}" r="4" class="f-solid f-warn"/>`; });
    // sides
    b += T(X(95), Y(22), L("наполнение", "filling"), "f-ink f-s", "middle");
    b += T(X(95), Y(104), L("изгнание", "ejection"), "f-ink f-s", "middle");
    const rot = (x, y, s, cls) => T(x, y, s, cls, "middle", `transform="rotate(-90 ${r1(x)} ${r1(y)})"`);
    b += rot(C_[0] - 24, Y(50), L("изометрическое\nрасслабление", "isovolumic\nrelaxation"), "f-ink f-s");
    b += rot(B_[0] + 14, Y(52), L("изометрическое\nсокращение", "isovolumic\ncontraction"), "f-ink f-s");
    // corners
    b += T(A_[0] + 10, A_[1] - 4, L("МК закр.", "MV shuts"), "f-warn f-s");
    b += T(B_[0] + 10, B_[1] + 4, L("Ао откр.", "Ao opens"), "f-warn f-s");
    b += T(C_[0] + 10, C_[1] + 20, L("Ао закр.", "Ao shuts"), "f-warn f-s");
    b += T(D_[0] + 10, D_[1] - 10, L("МК откр.", "MV opens"), "f-warn f-s");
    b += T(X(92), Y(121) - 10, L("пик ~120", "peak ~120"), "f-mute f-s", "middle");
    const sy = Y(0) + 52;
    b += Br(X(N.esv), X(N.edv), sy, "f-acc f-line", -1) + T(X(95), sy + 18, L("УО = КДО − КСО ≈ " + N.sv + " мл", "SV = EDV − ESV ≈ " + N.sv + " ml"), "f-acc f-s", "middle");
    b += T(X(N.esv), sy - 12, L("КСО ~60", "ESV ~60"), "f-mute f-s", "middle") + T(X(N.edv), sy - 12, L("КДО ~130", "EDV ~130"), "f-mute f-s", "middle");
    b += T(16, sy + 46, L("МК — митральный клапан, Ао — аортальный", "MV — mitral valve, Ao — aortic valve"), "f-mute f-s");
    return svg(380, sy + 60, L("Петля давление–объём левого желудочка", "Left ventricular pressure–volume loop"), b);
  }

  /* ---------- 7. Spirogram ---------- */
  function spiro(lang) {
    const L = pick(lang);
    // schematic proportions: RV 1.2, ERV 1.2, TV 0.5, IRV 1.8 (litres)
    const Y = (v) => 330 - v * 62;
    const y0 = Y(0), yRV = Y(1.2), yFRC = Y(2.4), yTI = Y(2.9), yTLC = Y(4.7);
    const x0 = 92, x1 = 254;
    let b = "";
    b += `<defs><pattern id="fig-spiro-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" class="f-hatch"/></pattern></defs>`;
    b += `<rect x="${x0}" y="${r1(yRV)}" width="${x1 - x0}" height="${r1(y0 - yRV)}" fill="url(#fig-spiro-hatch)" class="f-nostroke"/>`;
    [yTLC, yTI, yFRC, yRV].forEach((yy) => { b += Ln(84, yy, 286, yy, "f-mute f-thin f-dash"); });
    b += Ln(84, y0, 286, y0, "f-mute f-thin");
    // trace
    const pts = []; let x = x0;
    const q = (n) => { for (let i = 0; i < n; i++) { pts.push(`L${x + 14},${r1(yTI)}`, `L${x + 28},${r1(yFRC)}`); x += 28; } };
    let d = `M${x0},${r1(yFRC)}`; q(3);
    d += pts.join(" ").replace(/L/g, " L");
    d = d.replace(/ L/g, " L");
    let tr = `M${x0},${r1(yFRC)}`;
    for (let i = 0; i < 3; i++) { const s = x0 + i * 28; tr += ` C${s + 6},${r1(yFRC)} ${s + 8},${r1(yTI)} ${s + 14},${r1(yTI)} C${s + 20},${r1(yTI)} ${s + 22},${r1(yFRC)} ${s + 28},${r1(yFRC)}`; }
    const s = x0 + 84;
    tr += ` C${s + 8},${r1(yFRC)} ${s + 12},${r1(yTLC)} ${s + 22},${r1(yTLC)} C${s + 32},${r1(yTLC)} ${s + 34},${r1(yRV)} ${s + 46},${r1(yRV)}` +
      ` C${s + 56},${r1(yRV)} ${s + 58},${r1(yFRC)} ${s + 66},${r1(yFRC)} C${s + 70},${r1(yFRC)} ${s + 72},${r1(yTI)} ${s + 76},${r1(yTI)}`;
    b += P(tr, "f-acc f-curve");
    b += T((x0 + x1) / 2, (yRV + y0) / 2 - 4, L("остаточный объём\nне выдыхается", "residual volume\ncannot be exhaled"), "f-ink f-s", "middle");
    b += T(x1, y0 + 18, L("время →", "time →"), "f-mute f-s", "end");
    b += T(x0 + 6, yTLC - 8, L("макс. вдох", "max. inspiration"), "f-mute f-s");
    b += T(x0 + 6, yRV - 8, L("макс. выдох", "max. expiration"), "f-mute f-s");
    // volumes (left)
    const vx = 80;
    b += VBr(vx, yTLC, yTI, "f-acc2 f-line", 1) + T(vx - 6, (yTLC + yTI) / 2 - 4, L("РОвд\n" + N.IRV + " л", "IRV\n" + N.IRV + " l"), "f-acc2 f-s", "end");
    b += VBr(vx, yTI, yFRC, "f-acc f-line", 1) + T(vx - 6, (yTI + yFRC) / 2 + 4, L("ДО " + N.TV + " л", "TV " + N.TV + " l"), "f-acc f-s", "end");
    b += VBr(vx, yFRC, yRV, "f-acc2 f-line", 1) + T(vx - 6, (yFRC + yRV) / 2 - 4, L("РОвыд\n" + N.ERV + " л", "ERV\n" + N.ERV + " l"), "f-acc2 f-s", "end");
    b += VBr(vx, yRV, y0, "f-mute f-line", 1) + T(vx - 6, (yRV + y0) / 2 - 4, L("ОО\n" + N.RV + " л", "RV\n" + N.RV + " l"), "f-ink f-s", "end");
    // capacities (right)
    const c1 = 262, c2 = 274, c3 = 286, lx = 294;
    b += VBr(c1, yTLC, yFRC, "f-warn f-line", -1) + VBr(c1, yFRC, y0, "f-warn f-line", -1);
    b += VBr(c2, yTLC, yRV, "f-acc f-line", -1);
    b += VBr(c3, yTLC, y0, "f-ink f-line", -1);
    b += T(lx, yTLC + 8, L("ЕВд\n" + N.IC + " л", "IC\n" + N.IC + " l"), "f-warn f-s");
    b += T(lx, yTLC + 56, L("ЖЕЛ, л\nмуж. " + N.VCm + "\nжен. " + N.VCw, "VC, l\nmen " + N.VCm + "\nwomen " + N.VCw), "f-acc f-s");
    b += T(lx, yFRC + 6, L("ОЕЛ =\nОО + ЖЕЛ", "TLC =\nRV + VC"), "f-ink f-s");
    b += T(lx, yRV + 18, L("ФОЕ\n" + N.FRC + " л", "FRC\n" + N.FRC + " l"), "f-warn f-s");
    const ly = y0 + 44;
    b += T(16, ly, L("ДО — дыхательный объём, РОвд / РОвыд — резервные\nобъёмы вдоха / выдоха, ОО — остаточный объём;\nЕВд = ДО + РОвд, ЖЕЛ = РОвд + ДО + РОвыд,\nФОЕ = РОвыд + ОО, ОЕЛ = ОО + ЖЕЛ",
      "TV tidal volume, IRV / ERV inspiratory / expiratory\nreserve volumes, RV residual volume;\nIC = TV + IRV, VC = IRV + TV + ERV,\nFRC = ERV + RV, TLC = RV + VC"), "f-mute f-s");
    return svg(400, ly + 80, L("Спирограмма: лёгочные объёмы и ёмкости", "Spirogram: lung volumes and capacities"), b);
  }

  /* ---------- 8. Oxyhaemoglobin dissociation curve ---------- */
  function hbo2(lang) {
    const L = pick(lang);
    const X = (p) => 60 + p * 3;                    // mm Hg
    const Y = (s) => 286 - s * 2.4;                 // %
    const hill = (p, p50) => 100 * Math.pow(p, 2.7) / (Math.pow(p, 2.7) + Math.pow(p50, 2.7));
    const curve = (p50) => { const pts = []; for (let p = 0; p <= 100; p += 2) pts.push([X(p), Y(hill(p, p50))]); return mono(pts); };
    let b = "";
    // grid + axes
    [25, 50, 75].forEach((s) => { b += Ln(X(0), Y(s), X(100), Y(s), "f-grid"); });
    [20, 40, 60, 80].forEach((p) => { b += Ln(X(p), Y(0), X(p), Y(100), "f-grid"); });
    b += Ln(X(0), Y(100) - 6, X(0), Y(0), "f-mute f-thin") + Ln(X(0), Y(0), X(100) + 4, Y(0), "f-mute f-thin");
    [0, 50, 100].forEach((s) => { b += T(X(0) - 6, Y(s) + 4, s, "f-mute f-s", "end"); });
    [0, 20, 40, 60, 80, 100].forEach((p) => { b += T(X(p), Y(0) + 18, p, "f-mute f-s", "middle"); });
    b += T(8, 24, L("насыщение Hb O₂, %", "Hb O₂ saturation, %"), "f-mute f-s");
    b += T(X(100) + 4, Y(0) + 36, L("PO₂, мм рт. ст.", "PO₂, mm Hg"), "f-mute f-s", "end");
    // shifted curves
    b += P(curve(18), "f-acc2 f-curve");
    b += P(curve(37), "f-warn f-curve");
    b += P(curve(26.5), "f-acc f-curve f-main");
    // P50
    b += P(`M${X(0)},${Y(50)} H${r1(X(26.5))} V${Y(0)}`, "f-mute f-thin f-dash");
    b += T(X(26.5) + 5, Y(0) - 8, "P₅₀", "f-acc f-s");
    // shift arrows at 50 %
    b += A(X(27.5), Y(50), X(35.5), Y(50), "f-warn", 6) + A(X(25.5), Y(50), X(19.5), Y(50), "f-acc2", 6);
    // arterial and venous points
    const sa = hill(100, 26.5), sv = hill(40, 26.5);
    b += `<circle cx="${X(100)}" cy="${r1(Y(sa))}" r="5" class="f-solid f-acc"/><circle cx="${X(40)}" cy="${r1(Y(sv))}" r="5" class="f-solid f-acc"/>`;
    b += T(X(100), Y(sa) - 12, L("артериальная: 100 / 97 %", "arterial: 100 / 97 %"), "f-ink f-s", "end");
    b += T(X(40) + 10, Y(sv) + 22, L("венозная: 40 / ~75 %", "venous: 40 / ~75 %"), "f-ink f-s");
    // legend
    const ly = Y(0) + 62;
    b += Ln(16, ly - 4, 40, ly - 4, "f-acc f-curve") + T(48, ly, L("норма, P₅₀ ≈ " + N.p50 + " мм рт. ст.", "normal, P₅₀ ≈ " + N.p50 + " mm Hg"), "f-ink f-s");
    b += Ln(16, ly + 20, 40, ly + 20, "f-warn f-curve") + T(48, ly + 24, L("сдвиг вправо, сродство к O₂ ↓:\n↑ CO₂, ↑ H⁺ (↓ pH) — эффект Бора;\n↑ t°, ↑ 2,3-ДФГ", "right shift, O₂ affinity ↓:\n↑ CO₂, ↑ H⁺ (↓ pH) — the Bohr effect;\n↑ t°, ↑ 2,3-DPG"), "f-warn f-s");
    b += Ln(16, ly + 82, 40, ly + 82, "f-acc2 f-curve") + T(48, ly + 86, L("сдвиг влево, сродство к O₂ ↑:\n↓ CO₂, ↓ H⁺ (↑ pH), ↓ t°, ↓ 2,3-ДФГ", "left shift, O₂ affinity ↑:\n↓ CO₂, ↓ H⁺ (↑ pH), ↓ t°, ↓ 2,3-DPG"), "f-acc2 f-s");
    return svg(380, ly + 120, L("Кривая диссоциации оксигемоглобина и её сдвиги", "Oxyhaemoglobin dissociation curve and its shifts"), b);
  }

  /* ---------- 9. Nephron ---------- */
  function nephron(lang) {
    const L = pick(lang);
    let b = "";
    const bnd = 196;                                 // cortex / medulla boundary
    b += Ln(8, bnd, 372, bnd, "f-mute f-thin f-dash");
    b += T(10, bnd - 8, L("корковое вещество", "cortex"), "f-mute f-s") + T(10, bnd + 18, L("мозговое вещество", "medulla"), "f-mute f-s");
    // capsule + glomerulus
    const gx = 74, gy = 104;
    b += `<circle cx="${gx}" cy="${gy}" r="30" class="f-ink f-thin f-fill2"/>`;
    b += P(`M${gx - 46},${gy - 6} H${gx - 22} M${gx - 46},${gy + 8} H${gx - 22}`, "f-warn f-curve");
    b += P(`M${gx - 22},${gy - 6} C${gx - 14},${gy - 24} ${gx + 4},${gy - 22} ${gx + 2},${gy - 10} C${gx},${gy - 2} ${gx + 16},${gy - 2} ${gx + 16},${gy - 10}` +
      ` C${gx + 16},${gy - 20} ${gx + 26},${gy - 12} ${gx + 22},${gy} C${gx + 18},${gy + 14} ${gx + 6},${gy + 12} ${gx + 4},${gy + 6}` +
      ` C${gx},${gy + 16} ${gx - 14},${gy + 20} ${gx - 22},${gy + 8}`, "f-warn f-curve");
    // tubule path
    const pct = `M${gx + 28},${gy - 10} C${gx + 50},${gy - 40} ${gx + 70},${gy - 10} ${gx + 84},${gy - 36} C${gx + 98},${gy - 60} ${gx + 116},${gy - 20} ${gx + 104},${gy} C${gx + 94},${gy + 20} ${gx + 122},${gy + 36} ${gx + 120},${gy + 60}`;
    const dx = gx + 120, ax = dx + 34, loopB = 452;
    b += P(pct, "f-acc f-tube");
    b += P(`M${dx},${gy + 60} V${bnd + 20}`, "f-acc f-tube");
    b += P(`M${dx},${bnd + 20} V${loopB - 18} C${dx},${loopB + 4} ${ax},${loopB + 4} ${ax},${loopB - 18} V${330}`, "f-acc f-thin-tube");
    b += P(`M${ax},330 V${gy + 40}`, "f-acc f-tube");
    const dct = `M${ax},${gy + 40} C${ax},${gy + 16} ${ax + 30},${gy + 30} ${ax + 34},${gy + 6} C${ax + 38},${gy - 16} ${ax + 64},${gy - 4} ${ax + 70},${gy - 24}`;
    b += P(dct, "f-acc2 f-tube");
    const cdx = ax + 92;
    b += P(`M${ax + 70},${gy - 24} C${ax + 76},${gy - 40} ${cdx},${gy - 40} ${cdx},${gy - 22} V490`, "f-acc2 f-cd");
    // filtration arrow
    b += A(gx + 8, gy + 4, gx + 24, gy - 8, "f-warn", 6);
    // proximal: reabsorption out
    b += A(gx + 84, gy - 42, gx + 84, gy - 66, "f-acc", 6) + A(gx + 112, gy - 30, gx + 124, gy - 50, "f-acc", 6) + T(gx + 128, gy - 56, "Na⁺, H₂O…", "f-acc f-s");
    // descending: water out (left)
    b += A(dx - 4, 270, dx - 28, 270, "f-acc2", 6) + A(dx - 4, 330, dx - 28, 330, "f-acc2", 6) + T(dx - 32, 304, "H₂O", "f-acc2 f-s", "end");
    // ascending: Na+, Cl- out (right) — water-impermeable
    b += A(ax + 4, 250, ax + 28, 250, "f-warn", 6) + A(ax + 4, 300, ax + 28, 300, "f-warn", 6) + T(ax + 34, 280, "Na⁺, Cl⁻", "f-warn f-s");
    // distal: Na+ in, K+/H+ secreted
    b += A(ax + 36, gy + 12, ax + 36, gy + 36, "f-warn", 6) + A(ax + 52, gy + 34, ax + 52, gy + 12, "f-warn", 6);
    b += T(ax + 30, gy + 52, "Na⁺", "f-warn f-s", "end") + T(ax + 58, gy + 30, "K⁺\nH⁺", "f-warn f-s");
    // collecting duct: water out (ADH)
    b += A(cdx + 4, 360, cdx + 26, 360, "f-acc2", 6) + A(cdx + 4, 420, cdx + 26, 420, "f-acc2", 6) + T(cdx + 12, 396, "H₂O", "f-acc2 f-s");
    b += T(cdx + 12, 456, L("АДГ", "ADH"), "f-acc2 f-b");
    // osmolality
    b += T(dx - 32, 230, "300", "f-mute f-s", "end") + T(dx - 32, 446, L("1450\nмосмоль/л", "1450\nmOsm/l"), "f-mute f-s", "end");
    // segment numbers
    b += Num(gx - 26, gy - 40, "1", "f-warn") + Num(gx + 92, gy - 82, "2") + Num(dx - 16, 380, "3", "f-acc2") + Num(ax + 16, 380, "4", "f-warn") + Num(ax + 70, gy - 50, "5", "f-acc2") + Num(cdx + 16, 220, "6", "f-acc2");
    b += T(ax + 6, 346, L("тонкая", "thin"), "f-mute f-xs") + T(ax + 6, 172, L("толстая", "thick"), "f-mute f-xs");
    // legend
    let ly = 520;
    const rows = lang === "en" ? [
      ["1", "glomerulus in Bowman's capsule: filtration,\nprimary urine = protein-free ultrafiltrate", "f-warn"],
      ["2", "proximal tubule: ~65 % (⅔) of Na⁺ and water,\nall glucose and amino acids (obligatory)", "f-acc"],
      ["3", "descending limb of Henle's loop: water out (~20 %)", "f-acc2"],
      ["4", "ascending limb: Na⁺, Cl⁻ out (up to 25 %),\nimpermeable to water", "f-warn"],
      ["5", "distal tubule: Na⁺ (~10 %) under aldosterone,\nK⁺ and H⁺ secreted; water — ADH", "f-acc2"],
      ["6", "collecting duct: water — ADH (facultative),\nurine concentrated", "f-acc2"]] : [
      ["1", "клубочек в капсуле Шумлянского–Боумена:\nфильтрация, первичная моча — ультрафильтрат\nбез белков", "f-warn"],
      ["2", "проксимальный каналец: ~65 % (⅔) Na⁺ и воды,\nвся глюкоза и аминокислоты (обязательная)", "f-acc"],
      ["3", "нисходящее колено петли Генле:\nвыходит вода (~20 %)", "f-acc2"],
      ["4", "восходящее колено: выходят Na⁺, Cl⁻ (до 25 %),\nдля воды непроницаемо", "f-warn"],
      ["5", "дистальный каналец: Na⁺ (~10 %) —\nальдостерон, секреция K⁺ и H⁺; вода — АДГ", "f-acc2"],
      ["6", "собирательная трубка: вода — АДГ\n(факультативная), моча концентрируется", "f-acc2"]];
    rows.forEach(([n, s, c]) => { b += Num(22, ly - 4, n, c) + T(38, ly, s, "f-ink f-s"); ly += 18 * s.split("\n").length + 6; });
    return svg(380, ly, L("Нефрон: отделы и что в них происходит", "Nephron: its segments and what each does"), b);
  }

  window.StudyFigs = {
    ap: { title: { ru: "Потенциал действия", en: "Action potential" }, svg: ap },
    synapse: { title: { ru: "Химический синапс", en: "Chemical synapse" }, svg: synapse },
    reflexarc: { title: { ru: "Рефлекторная дуга", en: "Reflex arc" }, svg: reflexarc },
    wiggers: { title: { ru: "Сердечный цикл", en: "Cardiac cycle" }, svg: wiggers },
    ecg: { title: { ru: "ЭКГ во II отведении", en: "ECG, lead II" }, svg: ecg },
    pvloop: { title: { ru: "Петля давление–объём", en: "Pressure–volume loop" }, svg: pvloop },
    spiro: { title: { ru: "Спирограмма", en: "Spirogram" }, svg: spiro },
    hbo2: { title: { ru: "Кривая диссоциации оксигемоглобина", en: "Oxyhaemoglobin dissociation curve" }, svg: hbo2 },
    nephron: { title: { ru: "Нефрон", en: "Nephron" }, svg: nephron }
  };

  window.StudyFigs.css = [
    "svg.fig{display:block;width:100%;height:auto;max-width:640px;margin:0 auto;font-family:var(--font-ui);overflow:visible}",
    "svg.fig path,svg.fig line,svg.fig circle,svg.fig ellipse,svg.fig rect{fill:none;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}",
    "svg.fig .f-ink{stroke:var(--text-primary)}",
    "svg.fig .f-mute{stroke:var(--text-secondary)}",
    "svg.fig .f-acc{stroke:var(--accent-primary)}",
    "svg.fig .f-acc2{stroke:var(--info)}",
    "svg.fig .f-warn{stroke:var(--ember)}",
    "svg.fig .f-thin{stroke-width:1}",
    "svg.fig .f-line{stroke-width:1.4}",
    "svg.fig .f-curve{stroke-width:2.2}",
    "svg.fig .f-main{stroke-width:2.8}",
    "svg.fig .f-faint{opacity:.45}",
    "svg.fig .f-dash{stroke-dasharray:4 3}",
    "svg.fig .f-mem{stroke-width:2.4}",
    "svg.fig .f-rec{stroke-width:2}",
    "svg.fig .f-tube{stroke-width:7;opacity:.9}",
    "svg.fig .f-thin-tube{stroke-width:3.5}",
    "svg.fig .f-cd{stroke-width:10;opacity:.85}",
    "svg.fig .f-grid{stroke:var(--border-subtle);stroke-width:.6}",
    "svg.fig .f-grid5{stroke-width:1.1}",
    "svg.fig .f-hatch{stroke:var(--text-secondary);stroke-width:1.2;opacity:.35}",
    "svg.fig .f-nostroke{stroke:none}",
    "svg.fig path.f-fill,svg.fig circle.f-fill,svg.fig ellipse.f-fill,svg.fig rect.f-fill{fill:var(--accent-soft)}",
    "svg.fig path.f-fill.f-none{stroke:none}",
    "svg.fig .f-fill2{fill:var(--info-soft)}",
    "svg.fig .f-ves{fill:var(--accent-soft)}",
    "svg.fig .f-solid.f-acc,svg.fig .f-head.f-acc,svg.fig .f-dot.f-acc,svg.fig .f-disc.f-acc{fill:var(--accent-primary)}",
    "svg.fig .f-solid.f-acc2,svg.fig .f-head.f-acc2,svg.fig .f-dot.f-acc2,svg.fig .f-disc.f-acc2{fill:var(--info)}",
    "svg.fig .f-solid.f-warn,svg.fig .f-head.f-warn,svg.fig .f-dot.f-warn,svg.fig .f-disc.f-warn{fill:var(--ember)}",
    "svg.fig .f-solid.f-ink,svg.fig .f-head.f-ink,svg.fig .f-disc.f-ink{fill:var(--text-primary)}",
    "svg.fig .f-solid.f-mute,svg.fig .f-head.f-mute{fill:var(--text-secondary)}",
    "svg.fig .f-head,svg.fig .f-dot,svg.fig .f-disc{stroke:none}",
    "svg.fig .f-chan{fill:var(--ember);stroke:none}",
    "svg.fig .f-bar{stroke:none}",
    "svg.fig .f-bar.f-acc{fill:var(--accent-primary)}svg.fig .f-bar.f-acc2{fill:var(--info)}svg.fig .f-bar.f-warn{fill:var(--ember)}",
    "svg.fig .f-bar.f-soft{opacity:.5}",
    "svg.fig .f-cell{stroke:var(--border-subtle);stroke-width:1}",
    "svg.fig .f-band{fill:var(--accent-soft)}svg.fig .f-band2{fill:var(--info-soft)}svg.fig .f-band0{fill:none}",
    "svg.fig text.f-t{stroke:none;font-size:14px;font-weight:500;letter-spacing:0}",
    "svg.fig text.f-s{font-size:13px}",
    "svg.fig text.f-xs{font-size:12px;font-weight:600}",
    "svg.fig text.f-b{font-size:15px;font-weight:700}",
    "svg.fig text.f-ink{fill:var(--text-primary)}",
    "svg.fig text.f-mute{fill:var(--text-secondary)}",
    "svg.fig text.f-acc{fill:var(--accent-primary)}",
    "svg.fig text.f-acc2{fill:var(--info)}",
    "svg.fig text.f-warn{fill:var(--ember)}",
    "svg.fig text.f-on{fill:var(--bg-surface);font-weight:700;font-size:12px}"
  ].join("\n");
})();
