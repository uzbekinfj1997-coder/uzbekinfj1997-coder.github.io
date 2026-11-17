/* A walk that's a film: you move along it at your own pace, forwards or backwards, and it looks exactly as it was filmed, because it is
   the film. Forwards it plays; backwards it steps from picture to picture (the film is saved with a whole picture every third of a second,
   so that's quick). The rooms along it are the stops in the Go to list and on the route along the bottom. Where you are is kept for each
   person on this computer, so the walk carries on from there. Nothing is downloaded: the film is saved with the game. */
(() => {
  const root = $("walk"), field = $("walkField"), film = $("vwalkFilm"), back = $("vwalkBack"), bctx = back.getContext("2d");
  const PLACE = root.dataset.place, NAME = root.dataset.name, STOPS = JSON.parse(root.dataset.stops || "[]"), OTHERS = JSON.parse(root.dataset.others || "[]");
  const AT = `sora.walks.${PLACE}.at`, menu = $("walkMenu"), gotoBox = $("walkGoto");
  localStorage.setItem("sora.walks.last", PLACE);

  const settings = setupSettings(root, `walk-${PLACE}`, [
    { key: "pace", label: "Walking pace", type: "choice", default: 1, options: [[0.5, "Slow"], [1, "As filmed"], [1.5, "Brisk"], [2, "Fast"]], help: "Hold Shift to go twice as fast" },
    { key: "rooms", label: "Room names", type: "toggle", default: true },
    { key: "sides", label: "Blurred sides", type: "toggle", default: true, help: "Fill the room beside an upright film with the same picture, blurred" },
  ], { onChange: (v) => { sides(); show(true); } });
  setupFullscreen(root);
  const sides = () => { back.hidden = $("vwalkShade").hidden = !settings.values.sides; };
  sides();
  bctx.filter = "blur(1.2px)";

  const held = new Set();
  let fast = false, auto = false, target = null, last = performance.now(), here = -1, toastT = 0, dragging = false, savedAt = 0, failed = false;
  const length = () => film.duration || 0;
  const now = () => target ?? film.currentTime;
  const busy = () => !menu.hidden || !gotoBox.hidden || settings.isOpen();
  const roomAt = (t) => { let i = 0; for (let k = 0; k < STOPS.length; k++) if (STOPS[k][1] <= t + 0.05) i = k; return i; };

  // ---------- moving along it ----------
  function go(t) { target = Math.max(0, Math.min(length() - 0.05, t)); show(); }
  function setAuto(on) { auto = on; $("vwalkAuto").hidden = !on; }
  function frame(t1) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t1 - last) / 1000); last = t1;
    if (!length()) return;
    let dir = (held.has("on") ? 1 : 0) - (held.has("back") ? 1 : 0);
    if (!dir && auto) dir = 1;
    if (busy() || dragging) dir = 0;
    const rate = dir * settings.values.pace * (fast ? 2 : 1);
    if (rate > 0 && target === null) {
      if (film.currentTime >= length() - 0.06) { film.pause(); if (auto) { setAuto(false); toast("The end of the walk"); } }
      else { if (film.playbackRate !== rate) film.playbackRate = rate; if (film.paused) film.play().catch(() => {}); }
    } else {
      if (!film.paused) film.pause();
      if (rate < 0) target = Math.max(0, now() + rate * dt);
      else if (rate > 0) target = null;     // a seek was still on its way: walk on from there once it's done
    }
    // one seek at a time: the next goes when the last has arrived
    if (target !== null && !film.seeking) {
      if (Math.abs(film.currentTime - target) > 0.02) film.currentTime = target;
      else if (rate >= 0 && !dragging) target = null;
    }
    if (settings.values.sides && film.readyState >= 2) {
      const w = film.videoWidth, h = film.videoHeight, sh = Math.min(h, w * 18 / 32);
      bctx.drawImage(film, 0, (h - sh) / 2, w, sh, 0, 0, 32, 18);
    }
    show();
    if (Math.abs(now() - savedAt) > 1) { savedAt = now(); localStorage.setItem(AT, savedAt.toFixed(1)); }
    if (toastT && performance.now() > toastT) { $("vwalkToast").classList.remove("on"); toastT = 0; }
  }
  function toast(text) { const t = $("vwalkToast"); t.textContent = text; t.classList.add("on"); toastT = performance.now() + 1800; }

  // ---------- what's shown: the room, the next one, the route ----------
  function show(again = false) {
    const len = length(); if (!len) return;
    const t = now(), i = roomAt(t), rooms = settings.values.rooms;
    if (i !== here || again) {
      if (here >= 0 && i !== here && rooms && !busy()) toast(STOPS[i][0]);
      here = i;
      $("vwalkRoom").textContent = STOPS[i] ? STOPS[i][0] : "";
      $("vwalkNext").textContent = STOPS[i + 1] ? `Next: ${STOPS[i + 1][0]}` : "The end of the walk";
      $("vwalkRoom").hidden = $("vwalkNext").hidden = !rooms;
      for (const [k, tick] of [...$("vwalkTrack").querySelectorAll(".vwalk-tick")].entries()) tick.classList.toggle("here", k === i);
      $("vwalkRoute").setAttribute("aria-valuetext", STOPS[i] ? STOPS[i][0] : "");
    }
    const f = `${(100 * t / len).toFixed(2)}%`;
    $("vwalkFill").style.width = f; $("vwalkKnob").style.left = f;
  }
  function buildRoute() {
    const track = $("vwalkTrack");
    track.querySelectorAll(".vwalk-tick").forEach((n) => n.remove());
    for (const [name, t] of STOPS) {
      const tick = el("i", { class: "vwalk-tick" }, el("span", {}, name));
      tick.style.left = `${(100 * t / length()).toFixed(2)}%`;
      track.append(tick);
    }
    here = -1; show(true);
  }
  const route = $("vwalkRoute");
  const timeAt = (e) => { const r = route.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * length(); };
  route.addEventListener("pointerdown", (e) => { if (!length()) return; dragging = true; route.setPointerCapture(e.pointerId); setAuto(false); go(timeAt(e)); });
  route.addEventListener("pointermove", (e) => { if (dragging) go(timeAt(e)); });
  for (const ev of ["pointerup", "pointercancel"]) route.addEventListener(ev, () => { dragging = false; });

  // ---------- the keys, and the buttons on a touch screen ----------
  const KEYS = { KeyW: "on", ArrowUp: "on", KeyS: "back", ArrowDown: "back" };     // by place on the keyboard, so they work in any layout
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    fast = e.shiftKey;
    if (e.code === "Escape") { if (!gotoBox.hidden) closeGoto(); else if (!settings.isOpen()) (menu.hidden ? openMenu() : closeMenu()); return; }
    if (busy()) return;
    if (KEYS[e.code]) { e.preventDefault(); held.add(KEYS[e.code]); if (KEYS[e.code] === "back") setAuto(false); }
    else if (e.code === "Space") { e.preventDefault(); setAuto(!auto); }
    else if (e.code === "KeyG") { e.preventDefault(); openGoto(); }
    else if (e.code === "Home") { e.preventDefault(); go(0); }
    else if (e.code === "End") { e.preventDefault(); go(length()); }
    else if (/^Digit\d$/.test(e.code)) { const k = (Number(e.code.slice(5)) + 9) % 10; if (STOPS[k]) { e.preventDefault(); go(STOPS[k][1]); } }
  });
  document.addEventListener("keyup", (e) => { fast = e.shiftKey; if (KEYS[e.code]) held.delete(KEYS[e.code]); });
  window.addEventListener("blur", () => { held.clear(); fast = false; });
  for (const [id, what] of [["vwalkFwd", "on"], ["vwalkBackBtn", "back"]]) {
    const b = $(id);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); held.add(what); if (what === "back") setAuto(false); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => held.delete(what));
  }
  $("vwalkPlay").onclick = () => setAuto(!auto);

  // ---------- the menu and the Go to list ----------
  function openMenu() {
    setAuto(false); held.clear();
    const saved = Number(localStorage.getItem(AT) || 0), from = saved > 3 && length() && saved < length() - 2 ? roomAt(saved) : -1;
    const start = (t) => { closeMenu(); go(t); document.activeElement?.blur(); };
    const keys = [["W ↑", "walk on"], ["S ↓", "go back"], ["Shift", "twice as fast"], ["Space", "walk for me"], ["G", "go to a room"], ["1–9", "a room, in order"], ["Home, End", "the start, the end"], ["F", "full screen"], ["Esc", "this menu"]];
    menu.replaceChildren(el("div", { class: "walk-menu" },
      el("h2", {}, NAME),
      el("p", {}, failed ? "The film couldn't be loaded. Check for updates, then open this walk again." : root.dataset.summary || ""),
      el("div", { class: "walk-keys" }, ...keys.flatMap(([k, what]) => [el("kbd", {}, k), el("span", {}, what)])),
      el("div", { class: "row" },
        ...(failed ? [] : from >= 0
          ? [el("button", { type: "button", class: "primary", onclick: () => start(saved) }, `Carry on: ${STOPS[from][0].toLowerCase()}`), el("button", { type: "button", onclick: () => start(0) }, "Start again")]
          : [el("button", { type: "button", class: "primary", onclick: () => start(Math.min(now(), Math.max(0, length() - 1))) }, now() > 1 ? "Carry on" : "Start walking")]),
        el("button", { type: "button", onclick: () => { location.href = root.dataset.home; } }, "Change walk"))));
    menu.hidden = false;
    menu.querySelector("button.primary")?.focus();
  }
  function closeMenu() { menu.hidden = true; }
  function openGoto() {
    setAuto(false); held.clear();
    gotoBox.replaceChildren(
      el("div", { class: "walk-gotohead" }, el("b", {}, "Go to"), el("button", { type: "button", class: "small", onclick: closeGoto }, "✕")),
      el("small", {}, "Rooms"),
      ...STOPS.map(([name, t], k) => el("button", { type: "button", class: "walk-gotoitem", onclick: () => { closeGoto(); go(t); toast(name); } }, el("span", {}, name), el("kbd", {}, k < 10 ? String((k + 1) % 10) : ""))),
      ...(OTHERS.length ? [el("small", {}, "Other walks"), ...OTHERS.map((o) => el("button", { type: "button", class: "walk-gotoitem", onclick: () => { location.href = o.url; } }, el("span", {}, o.name)))] : []));
    gotoBox.hidden = false;
    gotoBox.querySelector(".walk-gotoitem")?.focus();
  }
  function closeGoto() { gotoBox.hidden = true; }
  $("walkMenuBtn").onclick = () => (menu.hidden ? openMenu() : closeMenu());
  $("walkGoBtn").onclick = () => (gotoBox.hidden ? openGoto() : closeGoto());
  $("walkChangeBtn").onclick = () => { location.href = root.dataset.home; };

  // ---------- starting ----------
  film.addEventListener("loadedmetadata", () => { buildRoute(); if (!menu.hidden) openMenu(); });
  if (film.readyState >= 1) buildRoute();     // (it may have loaded before this script ran)
  film.addEventListener("error", () => { failed = true; openMenu(); });
  window.addEventListener("pagehide", () => localStorage.setItem(AT, now().toFixed(1)));
  openMenu();
  requestAnimationFrame(frame);

  window.VideoWalk = { film, stops: STOPS, settings, go, setAuto, openGoto, openMenu, state: () => ({ t: now(), length: length(), room: STOPS[roomAt(now())]?.[0], auto, menu: !menu.hidden, goto: !gotoBox.hidden, failed }) };     // for tests
})();
