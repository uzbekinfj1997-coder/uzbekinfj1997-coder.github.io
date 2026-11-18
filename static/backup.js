// A copy of the games' progress on this computer. Every sora.* key in this browser goes to ~/.sora/backup when it changes.
// A browser without the mark below is new or was wiped: it takes back whatever the copy has before it may send anything,
// so an empty browser can never overwrite good progress. A browser with the mark never restores by itself, so a list or
// a game deliberately cleared stays cleared. Buttons: data-backup-save, data-backup-load; status text: data-backup-status.
(() => {
  const MARK = "sora.backup.synced", RESTORED = "sora.backup.restored", PREFIX = "sora.", API = "/api/backup";
  const NO_SERVER = window.SORA_STATIC === true;   // a website (Sora public, Aziza): progress only in the browser (and the backup file)
  const WAIT_MS = 2000, BEACON_LIMIT = 60000;   // browsers refuse larger bodies while a page is closing
  const JSON_HEADERS = { "Content-Type": "application/json" };
  let ready = false, sent = null, timer = null, keepStatus = false;

  const tracked = (k) => String(k).startsWith(PREFIX) && k !== MARK;
  function snapshot() {     // on a website with several apps, only this app's keys (SoraApp, in base.html)
    const out = {}, keys = window.SoraApp ? window.SoraApp.keys() : Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const k of keys) if (tracked(k)) out[k] = localStorage.getItem(k);
    return out;
  }
  const stamp = (t) => { const d = new Date(t), p = (n) => String(n).padStart(2, "0"); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  function status(text, warn = false) {
    for (const s of document.querySelectorAll("[data-backup-status]")) { s.textContent = text; s.classList.toggle("backup-warn", warn); }
  }
  function warnFull() {
    if (document.getElementById("backupFull")) return;
    document.querySelector("main")?.prepend(el("div", { class: "msg error", id: "backupFull" },
      tr("This browser's storage is full, so your latest progress could not be saved. What was saved earlier is safe. Ask in Telegram how to free some space.")));
  }

  // ---------- notice every change, and a full browser, wherever a game saves ----------
  const setItem = Storage.prototype.setItem, removeItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    try { setItem.call(this, k, v); } catch (e) { if (this === localStorage) warnFull(); throw e; }
    if (this === localStorage && tracked(k)) schedule();
  };
  Storage.prototype.removeItem = function (k) {
    removeItem.call(this, k);
    if (this === localStorage && tracked(k)) schedule();
  };

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(sync, WAIT_MS);
  }
  async function sync() {
    if (!ready) return;
    const body = JSON.stringify({ data: snapshot() });
    if (body === sent) return;
    try {
      const r = await api(API, { method: "POST", headers: JSON_HEADERS, body });
      sent = body;
      if (r.saved && !keepStatus) status(`Your progress is kept in this browser and copied to this computer (last copy ${stamp(r.saved_at)}).`);
      keepStatus = false;   // "restored" stays up until the next real change
    } catch {
      status("Your progress is kept in this browser, but the copy on this computer could not be updated.", true);
    }
  }
  // leaving the page: there may be no time for the normal wait
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !ready) return;
    clearTimeout(timer);
    const body = JSON.stringify({ data: snapshot() });
    if (body === sent) return;
    if (body.length < BEACON_LIMIT) { fetch(API, { method: "POST", headers: JSON_HEADERS, body, keepalive: true }).then(() => { sent = body; }).catch(() => {}); }
    else sync();
  });

  // ---------- start: a new or wiped browser first takes back what the copy has ----------
  async function start() {
    if (NO_SERVER) { status(tr("Your progress is kept in this browser. Now and then, save a backup file in Settings to keep it safe.")); return; }
    const restored = sessionStorage.getItem(RESTORED);
    if (restored) { keepStatus = true; sessionStorage.removeItem(RESTORED); status(`Your progress was restored from the copy on this computer (saved ${stamp(Number(restored))}).`); }
    if (!localStorage.getItem(MARK)) {
      let saved;
      try { saved = await api(API); } catch { return; }   // no answer: change nothing, try again next time
      const have = snapshot(), missing = Object.keys(saved.data || {}).filter((k) => !(k in have));
      setItem.call(localStorage, MARK, "1");
      if (missing.length) {
        for (const k of missing) setItem.call(localStorage, k, saved.data[k]);
        sessionStorage.setItem(RESTORED, String(saved.saved_at));
        location.reload();
        return;
      }
    }
    ready = true;
    schedule();
  }

  // ---------- by hand: a file to keep somewhere safe, and restoring from one ----------
  function saveFile() {
    const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify({ saved_at: Date.now(), data: snapshot() })], { type: "application/json" })),
      download: `sora-progress-${stamp(Date.now()).split(" ")[0]}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function restoreFile(file) {
    let parsed;
    try { parsed = JSON.parse(await file.text()); } catch { parsed = null; }
    const data = parsed?.data;
    if (!data || typeof data !== "object" || !Object.keys(data).length || !Object.entries(data).every(([k, v]) => tracked(k) && typeof v === "string")) {
      return alert(tr("This is not a Sora progress file."));
    }
    const when = parsed.saved_at ? tr(" saved {when}", { when: stamp(parsed.saved_at) }) : "";
    if (!confirm(tr("Replace the progress in this browser with the copy{when}?", { when }))) return;
    for (const k of Object.keys(snapshot())) removeItem.call(localStorage, k);
    for (const [k, v] of Object.entries(data)) setItem.call(localStorage, k, v);
    setItem.call(localStorage, MARK, "1");
    try { await api(API, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ data }) }); } catch { /* the next change tries again */ }
    location.reload();
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-backup-save]")) saveFile();
    if (e.target.closest("[data-backup-load]")) {
      const pick = el("input", { type: "file", accept: ".json,application/json" });
      pick.addEventListener("change", () => { if (pick.files[0]) restoreFile(pick.files[0]); });
      pick.click();
    }
  });

  start();
})();
