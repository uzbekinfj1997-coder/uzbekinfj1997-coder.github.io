const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) e.append(c instanceof Node ? c : document.createTextNode(c ?? ""));
  return e;
}
const fmt = (v) => v === null || v === undefined ? "" :
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusClass = (s) => "s-" + s.replaceAll(" ", "-");
function message(target, kind, text) {
  $(target).replaceChildren(text ? el("div", { class: "msg " + kind }, text) : "");
}
async function api(url, options) {
  const res = await fetch(url, options);
  let data;
  try { data = await res.json(); } catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
  return data;
}

// Update banner from the launcher: shown once per browser session until dismissed
function dismissUpdateBanner() {
  const b = $("updateBanner");
  sessionStorage.setItem("updateBannerDismissed", b.dataset.key);
  b.classList.add("hidden");
}
(() => {
  const b = $("updateBanner");
  if (b && sessionStorage.getItem("updateBannerDismissed") !== b.dataset.key) b.classList.remove("hidden");
})();

// ---------- Check for updates (header button) ----------
function closeUpdatePanel() { $("updatePanel").classList.add("hidden"); }
function updatePanel(kind, ...children) {
  const panel = $("updatePanel");
  panel.className = `update-panel u-${kind}`;
  $("updateBody").replaceChildren(...children);
}
async function checkForUpdates() {
  const btn = $("updateBtn");     // in Settings, which closes when it's pressed: the answer shows at the top of the page
  if (btn) btn.disabled = true;
  updatePanel("checking", el("span", { class: "spinner dark" }), "Checking GitHub for a newer version…");
  try {
    showUpdateStatus(await api("/api/update/check", { method: "POST" }));
  } catch (e) {
    updatePanel("error", el("strong", {}, "Could not check for updates. "), e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}
function showUpdateStatus(s) {
  if (s.state === "up_to_date") return updatePanel("updated", el("strong", {}, "Up to date. "), s.message);
  if (s.state === "available") {
    return updatePanel("available",
      el("div", {}, el("strong", {}, "A newer version is available. "), s.message),
      el("ul", {}, ...s.changes.slice(0, 10).map((c) => el("li", {}, c))),
      el("button", { class: "primary small", onclick: applyUpdate }, "Update now"));
  }
  const title = { offline: "Offline. ", skipped: "Update not possible. ", error: "Update problem. " }[s.state] || "";
  updatePanel(s.state === "error" ? "error" : "offline", el("strong", {}, title), s.message);
}
async function applyUpdate() {
  updatePanel("checking", el("span", { class: "spinner dark" }),
    "Downloading and installing the update… this can take a minute. Don't close this window.");
  let r;
  try {
    r = await api("/api/update/apply", { method: "POST" });
  } catch (e) {
    return updatePanel("error", el("strong", {}, "Update failed. "), e.message);
  }
  if (!r.restarting) return r.state === "updated"
    ? updatePanel("available", el("strong", {}, "Updated. "), r.message)
    : showUpdateStatus(r);
  updatePanel("checking", el("span", { class: "spinner dark" }), `${r.message} Restarting the app…`);
  const started = Date.now();
  await new Promise((ok) => setTimeout(ok, 2000));   // let the old server stop
  while (Date.now() - started < 120000) {
    try {
      const v = await (await fetch("/api/version", { cache: "no-store" })).json();
      if (v.version === r.version) { location.reload(); return; }
    } catch { /* server restarting */ }
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  updatePanel("error", el("strong", {}, "The app did not come back. "),
    "Close the black window and start the app again with start.bat.");
}

// ---------- theme: dark by default, or light or Monokai, chosen in Settings and remembered in this browser ----------
const THEMES = [["dark", "Dark"], ["light", "Light"], ["monokai", "Monokai"]];
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("theme", t);
}

// ---------- Settings (the menu's button): the app's own settings, the same on every page ----------
// The theme, the language (in an app with two), the progress file and, in Sora personal, the version and updates. Each game keeps its
// own Settings button for its game (setupSettings below), which also works in full screen, where the menu is hidden.
function setupAppSettings() {
  const b = $("settingsBtn");
  if (!b) return;
  let panel = null;
  const close = () => { if (panel) { panel.remove(); panel = null; } };
  const row = (label, help, control) => el("div", { class: "set-row" }, el("div", { class: "set-label" }, label, help ? el("small", {}, help) : ""), control);
  const choice = (label, options, current, pick) => el("div", { class: "set-choice", role: "radiogroup", "aria-label": label }, ...options.map(([v, name]) => {
    const x = el("button", { type: "button", class: v === current ? "on" : "", role: "radio", "aria-checked": String(v === current) }, name);
    x.onclick = () => pick(v);
    return x;
  }));
  function render() {
    const rows = [row(tr("Theme"), "", choice(tr("Theme"), THEMES.map(([t, name]) => [t, tr(name)]), document.documentElement.dataset.theme || window.SORA_DEFAULT_THEME || "dark", (t) => { setTheme(t); render(); }))];
    const L = window.SoraLang;
    if (L && L.langs.length > 1) {
      rows.push(row(tr("Language"), "", choice(tr("Language"), L.langs.map((l) => [l, L.names[l] || l]), L.lang, (l) => { if (l !== L.lang) L.set(l); })));
    }
    rows.push(el("div", { class: "set-group" }, tr("Your progress")),
      row(tr("A file with everything you've played"), tr("Save one now and then, and keep it somewhere safe. Restoring a file replaces the progress in this browser."),
        el("div", { class: "row set-buttons" }, el("button", { type: "button", class: "small", "data-backup-save": "" }, tr("Save backup file")),
          el("button", { type: "button", class: "small", "data-backup-load": "" }, tr("Restore from a file")))));
    if (b.hasAttribute("data-updates")) {
      const v = b.dataset.version;
      rows.push(el("div", { class: "set-group" }, "Sora"),
        row(v ? `Version ${v}` : "Sora", "Runs on this computer; updates come from GitHub",
          el("button", { type: "button", class: "small", id: "updateBtn", title: "Check GitHub for a newer version", onclick: () => { close(); checkForUpdates(); } }, "Check for updates")));
    }
    panel.querySelector(".set-body").replaceChildren(...rows);
  }
  function open() {
    if (panel) return;
    panel = el("div", { class: "set-modal app-settings", role: "dialog", "aria-label": tr("Settings") },
      el("div", { class: "set-card" },
        el("div", { class: "set-head" }, el("h2", {}, tr("Settings")), el("button", { type: "button", class: "link", title: tr("Close"), onclick: close }, "✕")),
        el("div", { class: "set-body" }),
        el("div", { class: "set-foot" }, el("span"), el("button", { type: "button", class: "primary", onclick: close }, tr("Done")))));
    panel.addEventListener("pointerdown", (e) => { if (e.target === panel) close(); });
    panel.addEventListener("click", (e) => { if (e.target.closest("[data-backup-save]")) setTimeout(close, 0); });     // the file is on its way
    document.body.append(panel);
    render();
    panel.querySelector(".set-body button")?.focus();
  }
  b.addEventListener("click", open);
  document.addEventListener("keydown", (e) => { if (panel && e.key === "Escape") { e.preventDefault(); close(); } });
}
setupAppSettings();

// ---------- full screen for a game: buttons with data-fullscreen inside `target` switch it, and so does F ----------
// Uses the browser's full screen where it can; where it can't (iPhone) the game covers the whole page instead.
function setupFullscreen(target) {
  const native = target.requestFullscreen || target.webkitRequestFullscreen;
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  const on = () => target.classList.contains("is-fullscreen");
  function show() {
    for (const b of target.querySelectorAll("[data-fullscreen]")) {
      b.textContent = tr(on() ? "Exit full screen" : "Full screen");
      b.title = tr(on() ? "Leave full screen (Esc or F)" : "Play in full screen (F)");
    }
    window.dispatchEvent(new Event("resize"));      // games size their board to the space they have
  }
  function set(want) {
    if (want === on()) return;
    if (native && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
      if (want) native.call(target).catch?.(() => cover(true));
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else cover(want);
  }
  function cover(want) {                             // the fallback: fixed over the page
    target.classList.toggle("is-fullscreen", want);
    target.classList.toggle("covers-page", want);
    document.body.style.overflow = want ? "hidden" : "";
    show();
  }
  for (const ev of ["fullscreenchange", "webkitfullscreenchange"]) {
    document.addEventListener(ev, () => { target.classList.toggle("is-fullscreen", current() === target); show(); });
  }
  target.addEventListener("click", (e) => { if (e.target.closest("[data-fullscreen]")) set(!on()); });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "f" || e.key === "F") { e.preventDefault(); set(!on()); }
    else if (e.key === "Escape" && target.classList.contains("covers-page")) cover(false);
  });
  show();
  return { set, isOn: on };
}

// ---------- settings for a game: a panel opened by buttons with data-settings inside `target` ----------
// schema: [{ key, label, type: "toggle" | "range" | "choice", default, min, max, step, unit, options: [[value, label]], group, help }]
// Values are kept in this browser; hooks.onChange(values, key) applies a change, onOpen/onClose let the game pause.
function setupSettings(target, game, schema, hooks = {}) {
  const KEY = `sora.settings.${game}`;
  const ok = (s, v) => s.type === "toggle" ? typeof v === "boolean"
    : s.type === "range" ? typeof v === "number" && v >= s.min && v <= s.max
    : s.options.some(([o]) => o === v);
  const values = Object.fromEntries(schema.map((s) => [s.key, s.default]));
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (const s of schema) if (s.key in saved && ok(s, saved[s.key])) values[s.key] = saved[s.key];
  } catch { /* nothing saved yet */ }
  const store = () => localStorage.setItem(KEY, JSON.stringify(values));
  let panel = null;

  function set(key, v) {
    values[key] = v; store();
    hooks.onChange?.(values, key);
    if (panel) render();
  }
  function control(s) {
    const v = values[s.key];
    if (s.type === "toggle") {
      const b = el("button", { type: "button", class: "set-toggle" + (v ? " on" : ""), role: "switch", "aria-checked": String(v) }, tr(v ? "On" : "Off"));
      b.onclick = () => set(s.key, !values[s.key]);
      return b;
    }
    if (s.type === "range") {
      const shown = el("span", { class: "set-value" }, `${v}${s.unit || ""}`);
      const r = el("input", { type: "range", min: s.min, max: s.max, step: s.step || 1, value: v, "aria-label": s.label });
      r.oninput = () => { values[s.key] = Number(r.value); shown.textContent = `${r.value}${s.unit || ""}`; store(); hooks.onChange?.(values, s.key); };
      return el("div", { class: "set-range" }, r, shown);
    }
    return el("div", { class: "set-choice", role: "radiogroup", "aria-label": s.label }, ...s.options.map(([o, label]) => {
      const b = el("button", { type: "button", class: o === v ? "on" : "", role: "radio", "aria-checked": String(o === v) }, label);
      b.onclick = () => set(s.key, o);
      return b;
    }));
  }
  function render() {
    const rows = [];
    let group = null;
    for (const s of schema) {
      if (s.when && !s.when(values)) continue;
      if (s.group && s.group !== group) { group = s.group; rows.push(el("div", { class: "set-group" }, group)); }
      rows.push(el("div", { class: "set-row" },
        el("div", { class: "set-label" }, s.label, s.help ? el("small", {}, s.help) : ""), control(s)));
    }
    panel.querySelector(".set-body").replaceChildren(...rows);
  }
  function open() {
    if (panel) return;
    hooks.onOpen?.();
    panel = el("div", { class: "set-modal", role: "dialog", "aria-label": tr("Settings") },
      el("div", { class: "set-card" },
        el("div", { class: "set-head" }, el("h2", {}, tr("Settings")), el("button", { type: "button", class: "link", title: tr("Close"), onclick: close }, "✕")),
        el("div", { class: "set-body" }),
        el("div", { class: "set-foot" },
          el("button", { type: "button", class: "link", onclick: () => { for (const s of schema) values[s.key] = s.default; store(); hooks.onChange?.(values, null); render(); } }, tr("Reset to defaults")),
          el("button", { type: "button", class: "primary", onclick: close }, tr("Done")))));
    panel.addEventListener("pointerdown", (e) => { if (e.target === panel) close(); });
    target.append(panel);
    render();
    panel.querySelector(".set-body button, .set-body input")?.focus();
  }
  function close() { if (!panel) return; panel.remove(); panel = null; hooks.onClose?.(); }
  target.addEventListener("click", (e) => { if (e.target.closest("[data-settings]")) open(); });
  document.addEventListener("keydown", (e) => { if (panel && e.key === "Escape") { e.stopImmediatePropagation(); close(); } }, true);
  return { values, open, close, set, isOpen: () => !!panel };
}

// ---------- going back (19.11.2026): one step back, the same from the ← button (every page but Home), a game's ✕ and the phone's back
// gesture. Inside a page it goes to the screen before (the page says how: SoraNav.register); from a page's first screen, to where the
// page belongs (the app's Home, or its own: a walk's list of walks). Leaving a round half-way asks first (the user, 19.11.2026).
// The phone knows each screen inside a page: while a page is deeper than its first screen it keeps one history entry above its own,
// so the back gesture takes one step instead of leaving the page. Pages call SoraNav.changed() whenever their screen changes. ----------
const SoraNav = (() => {
  let page = null, trapped = false, ignore = 0;
  const depth = () => (page ? page.depth() : 0);
  const goHome = () => { location.href = window.SORA_HOME || "/"; };
  // the history entry above the page's own: there while the page is deeper than its first screen
  function changed() {
    if (depth() > 0 && !trapped) { history.pushState({ soraNav: 1 }, ""); trapped = true; }
    else if (depth() === 0 && trapped) { trapped = false; ignore++; history.back(); }
  }
  // a game in full screen goes back to the page with its ✕
  function leaveFullscreen() { document.querySelector(".is-fullscreen")?.querySelector("[data-fullscreen]")?.click(); }
  function back({ full = false } = {}) {
    const go = () => { if (full) leaveFullscreen(); if (depth() > 0) page.back(); else if (page?.exit) page.exit(); else goHome(); changed(); };
    if (depth() > 0 && page.busy?.()) return ask(tr("Leave this round? It won't count."), go, changed);
    go();
  }
  window.addEventListener("popstate", () => {
    if (ignore) { ignore--; return; }
    if (!trapped) return;                // not this page's step: the browser goes where it goes
    trapped = false;                     // the phone's back took the step off
    if (depth() > 0) back(); else changed();
  });
  // a question with two answers, over the page (or the game in full screen)
  function ask(text, yes, no = () => {}) {
    const box = el("div", { class: "nav-ask", role: "dialog", "aria-label": text },
      el("div", { class: "nav-ask-card" }, el("p", {}, text),
        el("div", { class: "row" }, el("button", { type: "button", class: "primary", onclick: () => { box.remove(); yes(); } }, tr("Leave")),
          el("button", { type: "button", onclick: () => { box.remove(); no(); } }, tr("Stay")))));
    (document.fullscreenElement || document.querySelector(".covers-page") || document.body).append(box);
    box.querySelector("button:not(.primary)").focus();
  }
  // a game's ✕: inside its field, top left, in full screen too
  const exitButton = (cls = "") => el("button", { type: "button", class: `nav-x ${cls}`.trim(), title: tr("Exit"), "aria-label": tr("Exit"), onclick: (e) => { e.stopPropagation(); back({ full: true }); } }, "✕");
  function register(p) { page = p; changed(); }
  // the ← button, top left (across from the coins), on every page but Home
  function mount() {
    if (!window.SORA_HOME || document.body.hasAttribute("data-home") || document.getElementById("soraBack")) return;
    const b = el("button", { type: "button", id: "soraBack", class: "nav-back", title: tr("Back"), "aria-label": tr("Back"), onclick: () => back() }, el("b", { "aria-hidden": "true" }, "←"));
    (document.getElementById("backSlot") || document.body).append(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  return { register, changed, back, ask, exitButton, home: goHome };
})();
window.SoraNav = SoraNav;


// ---------- the shell (redesign 23.11.2026): the top bar's Settings and Full screen, the phone's tab bar and its sheets ----------
// A page's own Settings / Full screen / Home buttons stay in the page but are hidden (they're shown again inside a full screen, where
// the top bar is covered); the top bar's buttons press the page's own ones, so each game's settings and full screen work as before.
(() => {
  const main = document.querySelector("main"), bar = document.getElementById("topbar");
  if (!main || !bar) return;
  const visible = (b) => !b.closest(".hidden, [hidden]");
  const own = (sel) => [...main.querySelectorAll(sel)].filter((b) => !bar.contains(b));
  const pick = (sel) => own(sel).find(visible) || null;
  function mark() {
    for (const b of own("[data-settings], [data-fullscreen], #sqHome, #homeBtn")) {
      const row = b.parentElement;
      if (!row || !row.querySelector("[data-settings], [data-fullscreen]")) continue;
      b.classList.add("dup-ctl");
      if ([...row.children].every((c) => c.classList.contains("dup-ctl"))) row.classList.add("dup-bar");
    }
    document.getElementById("tbFull").hidden = !own("[data-fullscreen]").length;
  }
  mark();
  new MutationObserver(() => { if (own("[data-settings]:not(.dup-ctl), [data-fullscreen]:not(.dup-ctl)").length) mark(); }).observe(main, { childList: true, subtree: true });
  const appSettings = () => document.getElementById("settingsBtn")?.click();
  document.getElementById("tbFull").addEventListener("click", () => pick("[data-fullscreen]")?.click());
  document.getElementById("tbSettings").addEventListener("click", () => {
    const game = pick("[data-settings]");
    if (!game) return appSettings();
    const box = el("div", { class: "sheet", role: "presentation" },
      el("div", { class: "sheet-card", role: "dialog", "aria-label": tr("Settings") }, el("div", { class: "sheet-grip", "aria-hidden": "true" }),
        el("h2", {}, tr("Settings")),
        el("button", { type: "button", class: "sheet-item", onclick: () => { box.remove(); game.click(); } }, el("span", {}, tr("This page's settings")), el("small", {}, tr("sound, levels, how it plays"))),
        el("button", { type: "button", class: "sheet-item", onclick: () => { box.remove(); appSettings(); } }, el("span", {}, tr("App settings")), el("small", {}, tr("theme, language, backup file")))));
    box.addEventListener("click", (e) => { if (e.target === box) box.remove(); });
    document.body.append(box);
    box.querySelector("button").focus();
  });
  // the tab bar's sheets: a list of the subjects or games, over the page
  for (const t of document.querySelectorAll("[data-sheet]")) t.addEventListener("click", () => {
    const s = document.getElementById(t.dataset.sheet); if (!s) return;
    s.hidden = false; s.querySelector("a, button")?.focus();
  });
  for (const s of document.querySelectorAll(".sheet[id]")) s.addEventListener("click", (e) => { if (e.target === s) s.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") for (const s of document.querySelectorAll(".sheet[id]:not([hidden])")) s.hidden = true; });
  // a game or walk in full screen covers everything: the tab bar steps aside
  const watch = () => document.body.classList.toggle("has-fullscreen", !!document.querySelector(".is-fullscreen"));
  new MutationObserver(watch).observe(main, { attributes: true, subtree: true, attributeFilter: ["class"] });
})();
