/* Players: several people on one computer, each with their own progress in the games. A game saves "sora.<something>" as it always has;
   this file, loaded before everything else, files it under the player who's playing ("sora.player.p2.<something>"), so the games don't need
   to know about players, and neither does the backup, which copies every sora.* key as it finds it. Anything not listed in SHARED belongs to
   the player, so a new game is separate without having to say so. */
"use strict";
const SoraPlayers = (() => {
  const LIST = "sora.players.v1", PREFIX = "sora.player.", ASKED = "sora.players.asked", MAX_NAME = 24;
  // one set for everybody: Memory Palace and Study Quest share a review schedule, and the rest is how the app itself keeps track
  const SHARED = ["sora.studyQuest", "sora.memoryPalace", "sora.settings.study-quest", "sora.settings.memory-palace", "sora.backup.", "sora.players", PREFIX];
  const store = localStorage, proto = Storage.prototype, rawGet = proto.getItem, rawSet = proto.setItem, rawRemove = proto.removeItem;
  const belongsToPlayer = (k) => typeof k === "string" && k.startsWith("sora.") && !SHARED.some((p) => k.startsWith(p));
  const allKeys = () => { const out = []; for (let i = 0; i < store.length; i++) out.push(store.key(i)); return out; };

  // The list isn't written until someone changes it: a wiped browser must still have room to take the list back from the backup.
  function load() {
    let saved = null;
    try { saved = JSON.parse(rawGet.call(store, LIST)); } catch { /* unreadable: it's rebuilt from what's saved */ }
    const list = Array.isArray(saved?.list) ? saved.list.filter((p) => typeof p?.id === "string" && typeof p?.name === "string") : [];
    // saved progress with nobody's name on it (an old copy restored, say) gets a player, so that nothing is stranded
    for (const k of allKeys()) {
      if (!k.startsWith(PREFIX)) continue;
      const id = k.slice(PREFIX.length).split(".")[0];
      if (!list.some((p) => p.id === id)) list.push({ id, name: `Player ${id.slice(1)}` });
    }
    if (!list.length) list.push({ id: "p1", name: "Player 1" });
    const highest = Math.max(...list.map((p) => Number(p.id.slice(1)) || 0));
    return { list, current: list.some((p) => p.id === saved?.current) ? saved.current : list[0].id, next: Math.max(Number(saved?.next) || 0, highest + 1) };
  }
  let state = load();
  const here = state.current;      // this page stays with the player it opened as, even if another tab changes player
  const filed = (k) => (belongsToPlayer(k) ? `${PREFIX}${here}.${k.slice("sora.".length)}` : k);
  proto.getItem = function (k) { return rawGet.call(this, this === store ? filed(k) : k); };
  proto.setItem = function (k, v) { rawSet.call(this, this === store ? filed(k) : k, v); };
  proto.removeItem = function (k) { rawRemove.call(this, this === store ? filed(k) : k); };

  // what was saved before there were players becomes the first player's. It makes room as it goes, as a full browser may have none to spare
  for (const k of allKeys()) {
    if (!belongsToPlayer(k)) continue;
    const v = rawGet.call(store, k);
    rawRemove.call(store, k);
    try { rawSet.call(store, filed(k), v); } catch { rawSet.call(store, k, v); }
  }

  // ---------- players ----------
  const save = () => store.setItem(LIST, JSON.stringify(state));     // the ordinary way, so that the backup notices
  const clean = (name) => String(name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  function problem(name, id) {
    if (!name) return tr("Type a name first.");
    return state.list.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()) ? tr("There is already a player called {name}.", { name }) : null;
  }
  function create(raw) {
    state = load();
    const name = clean(raw), error = problem(name);
    if (error) return { error };
    const id = `p${state.next++}`;
    state.list.push({ id, name }); save();
    return { id };
  }
  function rename(id, raw) {
    state = load();
    const name = clean(raw), error = problem(name, id);
    if (error) return { error };
    state.list.find((p) => p.id === id).name = name; save();
    if (id === here) showName();
    return {};
  }
  function remove(id) {
    state = load();
    if (state.list.length < 2) return { error: tr("There has to be at least one player.") };
    for (const k of allKeys()) if (k.startsWith(`${PREFIX}${id}.`)) store.removeItem(k);
    state.list = state.list.filter((p) => p.id !== id);
    if (state.current === id) state.current = state.list[0].id;
    save();
    return {};
  }
  function switchTo(id) {
    state = load();
    state.current = id; save();
    if (id !== here) location.reload(); else close();
  }

  // ---------- the panel ----------
  let panel = null, title = "", change = null, error = "";     // change: the row being renamed or deleted
  const small = (label, onclick, cls = "small") => el("button", { type: "button", class: cls, onclick }, label);
  // a name Sora gave ("Player 2") is shown in the app's language; a name someone typed is shown as it is
  const nameOf = (p) => { const m = /^Player (\d+)$/.exec(p?.name || ""); return m ? tr("Player {n}", { n: m[1] }) : p?.name ?? ""; };
  function row(p) {
    if (change?.id === p.id && change.kind === "rename") {
      const input = el("input", { type: "text", value: nameOf(p), maxlength: MAX_NAME, "aria-label": tr("New name for {name}", { name: nameOf(p) }) });
      return el("form", { class: "player-row", onsubmit: (e) => { e.preventDefault(); const r = rename(p.id, input.value); error = r.error || ""; if (!r.error) change = null; render(); } }, input, el("button", { type: "submit", class: "small primary" }, tr("Save")), small(tr("Cancel"), () => { change = null; error = ""; render(); }, "link"));
    }
    if (change?.id === p.id && change.kind === "delete") {
      return el("div", { class: "player-row player-sure", role: "group" }, el("span", {}, tr("Delete {name} and all of this player's progress?", { name: nameOf(p) })), small(tr("Delete"), () => {
        remove(p.id); change = null; error = "";
        if (p.id === here) location.reload(); else render();
      }), small(tr("Keep"), () => { change = null; render(); }, "link"));
    }
    const me = p.id === here;
    return el("div", { class: "player-row" },
      el("button", { type: "button", class: `player-pick${me ? " is-current" : ""}`, onclick: () => switchTo(p.id) }, el("span", { class: "player-name" }, nameOf(p)), me ? el("small", {}, tr("Playing now")) : ""),
      small(tr("Rename"), () => { change = { id: p.id, kind: "rename" }; error = ""; render(); }, "link"),
      state.list.length > 1 ? small(tr("Delete"), () => { change = { id: p.id, kind: "delete" }; error = ""; render(); }, "link") : "");
  }
  function render() {
    state = load();
    const input = el("input", { type: "text", maxlength: MAX_NAME, placeholder: tr("Name"), "aria-label": tr("Name of the new player") });
    panel.querySelector(".set-body").replaceChildren(
      el("div", { class: "player-list" }, ...state.list.map(row)),
      error ? el("div", { class: "msg error", role: "alert" }, error) : "",
      el("div", { class: "set-group" }, tr("New player")),
      el("form", { class: "player-row", onsubmit: (e) => {
        e.preventDefault();
        const r = create(input.value);
        if (r.error) { error = r.error; render(); } else switchTo(r.id);
      } }, input, el("button", { type: "submit", class: "small primary" }, tr("Add and play"))));
    (panel.querySelector(".player-list input") || panel.querySelector(".player-sure button") || panel.querySelector(".player-pick.is-current"))?.focus();
  }
  function open(heading = "Players") {
    if (panel) return;
    title = tr(heading); change = null; error = "";
    sessionStorage.setItem(ASKED, "1");
    panel = el("div", { class: "set-modal", role: "dialog", "aria-label": title },
      el("div", { class: "set-card" },
        el("div", { class: "set-head" }, el("h2", {}, title), el("button", { type: "button", class: "link", title: tr("Close"), onclick: close }, "✕")),
        el("div", { class: "set-body" }),
        el("div", { class: "set-foot" }, el("p", { class: "player-note" }, tr("Each player has their own levels, scores, worlds and settings. Study Quest and Memory Palace are shared by everyone. Changing player reloads the page, so a round in progress ends.")))));
    panel.addEventListener("pointerdown", (e) => { if (e.target === panel) close(); });
    document.body.append(panel);
    render();
  }
  function close() { if (panel) { panel.remove(); panel = null; } }
  // while it's open the keys are for it: typing a name mustn't move a game along
  document.addEventListener("keydown", (e) => {
    if (!panel) return;
    e.stopImmediatePropagation();
    if (e.key === "Escape") { e.preventDefault(); close(); }
  }, true);

  function showName() {
    // the profile pill (redesign 23.11.2026): the player's name and its first letter; on a website with a single player still called
    // "Player 1", the app's own name (Aziza, Maryamxon…) stands in
    const n = document.getElementById("playerName"), a = document.getElementById("playerAvatar"), s = load();
    let name = nameOf(s.list.find((p) => p.id === here));
    const appName = document.getElementById("playerBtn")?.dataset.appName;
    if (window.SORA_STATIC && appName && s.list.length === 1 && /^(Player|Игрок) 1$/.test(name)) name = appName;
    if (n) n.textContent = name;
    const letter = (name || "?").trim().charAt(0).toUpperCase();
    if (a) a.textContent = letter;
    const tb = document.getElementById("tbAvatar"); if (tb) tb.textContent = letter;
  }
  document.addEventListener("DOMContentLoaded", () => {
    showName();
    document.getElementById("playerBtn")?.addEventListener("click", () => open());
    // with more than one player, ask when Sora is opened rather than let someone play on as the last person
    if (load().list.length > 1 && !sessionStorage.getItem(ASKED)) open("Who's playing?");
  });
  return { here: () => load().list.find((p) => p.id === here), list: () => load().list, create, rename, remove, switchTo, open, close, belongsToPlayer };
})();
window.SoraPlayers = SoraPlayers;
