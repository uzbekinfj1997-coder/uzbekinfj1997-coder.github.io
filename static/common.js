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
  const btn = $("updateBtn");
  btn.disabled = true;
  updatePanel("checking", el("span", { class: "spinner dark" }), "Checking GitHub for a newer version…");
  try {
    showUpdateStatus(await api("/api/update/check", { method: "POST" }));
  } catch (e) {
    updatePanel("error", el("strong", {}, "Could not check for updates. "), e.message);
  } finally {
    btn.disabled = false;
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

// ---------- theme: dark by default, remembered in this browser; the button goes round dark, light and Monokai, naming the next ----------
const THEMES = [["dark", "Dark"], ["light", "Light"], ["monokai", "Monokai"]];
const themeAt = () => Math.max(0, THEMES.findIndex(([t]) => t === document.documentElement.dataset.theme));
function showThemeButton() {
  const b = $("themeBtn");
  if (!b) return;
  const now = THEMES[themeAt()], next = THEMES[(themeAt() + 1) % THEMES.length];
  b.textContent = `${next[1]} theme`;
  b.title = `Now ${now[1]}. Themes: dark, light and Monokai`;
}
function toggleTheme() {
  const next = THEMES[(themeAt() + 1) % THEMES.length][0];
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  showThemeButton();
}
showThemeButton();

// ---------- full screen for a game: buttons with data-fullscreen inside `target` switch it, and so does F ----------
// Uses the browser's full screen where it can; where it can't (iPhone) the game covers the whole page instead.
function setupFullscreen(target) {
  const native = target.requestFullscreen || target.webkitRequestFullscreen;
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  const on = () => target.classList.contains("is-fullscreen");
  function show() {
    for (const b of target.querySelectorAll("[data-fullscreen]")) {
      b.textContent = on() ? "Exit full screen" : "Full screen";
      b.title = on() ? "Leave full screen (Esc or F)" : "Play in full screen (F)";
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
      const b = el("button", { type: "button", class: "set-toggle" + (v ? " on" : ""), role: "switch", "aria-checked": String(v) }, v ? "On" : "Off");
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
    panel = el("div", { class: "set-modal", role: "dialog", "aria-label": "Settings" },
      el("div", { class: "set-card" },
        el("div", { class: "set-head" }, el("h2", {}, "Settings"), el("button", { type: "button", class: "link", title: "Close", onclick: close }, "✕")),
        el("div", { class: "set-body" }),
        el("div", { class: "set-foot" },
          el("button", { type: "button", class: "link", onclick: () => { for (const s of schema) values[s.key] = s.default; store(); hooks.onChange?.(values, null); render(); } }, "Reset to defaults"),
          el("button", { type: "button", class: "primary", onclick: close }, "Done"))));
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
