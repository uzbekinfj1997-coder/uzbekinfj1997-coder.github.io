/* Coins (18.11.2026): what a player earns, kept in their app's club on the server (the duel room: server/duel_room.py), with the tiers.
   - Study Quest works out a round's coins and hands them here (SoraCoins.earn): they go to the club, or wait on the phone until the player
     has started or joined it (on the duel page). Duel coins are worked out on the server from the answers.
   - The club's state is the duel page's (sora.duel.*, the player's own): balance = earned − spent, plus what's waiting to be sent.
   - Tiers go by everything ever earned, so spending coins on a reward doesn't lower a tier. */
"use strict";
const SoraCoins = (() => {
  const URL = window.SORA_CLUB_URL, ME_KEY = "sora.duel.me.v1", ROOM_KEY = "sora.duel.room.v1", WAIT_KEY = "sora.coins.waiting.v1";
  const TIERS = [[0, "Starter"], [300, "Bronze"], [1000, "Silver"], [2500, "Gold"], [5000, "Platinum"], [10000, "Diamond"], [20000, "Legend"]];
  const ICON = { Starter: "🌱", Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💠", Diamond: "💎", Legend: "👑" };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full */ } };
  const me = () => read(ME_KEY, null);
  const waiting = () => read(WAIT_KEY, []);
  let sending = false;
  // coins from this phone, sent when there's a club to send them to (batches of 20, each entry once)
  async function flush() {
    const who = me();
    if (!URL || !who || sending) return false;
    sending = true;
    try {
      // a bounded loop: should the phone's storage refuse to drop what was sent, it stops (the server counts each entry once anyway)
      for (let round = 0; round < 50 && waiting().length; round++) {
        const batch = waiting().slice(0, 20);
        const r = await fetch(`${URL}?duel=1`, { method: "POST", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ op: "earn", room: who.room, me: who.id, app: window.SoraApp?.id, entries: batch }) });
        const j = await r.json().catch(() => ({}));
        // try again later: offline, the server busy, or a server from before coins ("unknown request"); other refusals are final
        if (!r.ok && (r.status !== 400 || j.error === "unknown request")) return false;
        if (j.ok && j.members) keep(ROOM_KEY, { v: j.v, members: j.members, duels: j.duels, coins: j.coins, totals: j.totals, spent: j.spent, rewards: j.rewards, asks: j.asks, wins: j.wins, app: j.app });
        const sent = new Set(batch.map((e) => e.id));
        keep(WAIT_KEY, waiting().filter((e) => !sent.has(e.id)));
      }
      return true;
    } catch { return false; } finally { sending = false; }
  }
  function earn(entries) {
    const fresh = entries.filter((e) => e.n > 0), have = new Set(waiting().map((e) => e.id));
    if (!fresh.length) return;
    keep(WAIT_KEY, [...waiting(), ...fresh.filter((e) => !have.has(e.id))]);
    flush();
  }
  function balance() {
    const who = me(), room = read(ROOM_KEY, null), t = (who && room?.totals?.[who.id]) || { earned: 0, spent: 0 };
    const extra = waiting().reduce((s, e) => s + e.n, 0);
    return { earned: t.earned + extra, spent: t.spent, balance: t.earned - t.spent + extra, waiting: extra, inClub: !!who };
  }
  function tierOf(earned) {
    let k = 0;
    while (k + 1 < TIERS.length && earned >= TIERS[k + 1][0]) k++;
    return { name: TIERS[k][1], icon: ICON[TIERS[k][1]], from: TIERS[k][0], next: TIERS[k + 1] || null };
  }
  window.addEventListener("online", flush);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) flush(); });
  return { earn, flush, balance, tierOf, TIERS, ICON };
})();
window.SoraCoins = SoraCoins;
