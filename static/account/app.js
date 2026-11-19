/* My account (19.11.2026, every app): the player's coins (the balance, everything collected, what was spent on rewards, the tier),
   what's still to win in each subject with a way straight back in, the results, where the coins came from, the latest coins, and the
   achievements: medals at three levels and cups, with what each still needs. Reached ones are paid here too (static/coins.js).
   In Sora personal it links the PC and the phone so that both keep one balance: one makes a code, the other pastes it.
   The subjects' progress is read as Study Quest keeps it on this device; the coins come from where they're kept (coins.js). */
"use strict";
(() => {
  const SC = window.SoraCoins, root = $("ac"), main = $("acMain"), statusEl = $("acStatus");
  const settings = setupSettings(root, "account", [
    { key: "locked", label: tr("Show achievements still to win"), type: "toggle", default: true, help: tr("Medals and cups not reached yet, with what each needs") },
  ], { onChange: () => draw() });
  const BOOKS = window.SORA_ACCOUNT_BOOKS || [], ROOT = window.SORA_ROOT || "", num = SC.fmt;
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const btn = (label, onclick, primary = false, cls = "") => el("button", { type: "button", class: `${primary ? "primary" : ""} ${cls}`.trim(), onclick }, label);
  const section = (cls, title, ...kids) => el("section", { class: `ac-sec ${cls}` }, el("h2", {}, title), ...kids);
  const bar = (f) => el("span", { class: "ac-bar-in", "aria-hidden": "true" }, el("i", { style: `width:${Math.max(0, Math.min(100, Math.round(f * 100)))}%` }));

  // each subject's progress as Study Quest keeps it, and its numbers, noted for Home and the achievements
  function subjects() {
    const o = SC.playing(), out = [];
    for (const meta of BOOKS) {
      const b = (window.StudyBooks || []).find((x) => x.id === meta.id);
      if (!b) continue;
      const sum = SC.bookSummary(b, SC.progressOf(b, meta.key), o);
      SC.noteBook(b.id, sum);
      out.push({ meta, b, sum });
    }
    return out;
  }
  // a duel's, or an achievement's, reason in the app's language (Study Quest's come in it already)
  function whyText(w) {
    if (/^ach:/.test(w)) return SC.achName(w.slice(4));
    const m = /^Duel: (\d+) of (\d+) right$/.exec(w);
    return m ? tr("Duel: {right} of {all} right", { right: m[1], all: m[2] }) : w === "Duel won" || w === "Duel drawn" ? tr(w) : w;
  }
  // this player's finished duels, from the club's room
  function duels(s) {
    const r = s.room, who = SC.me();
    if (!r?.duels || !who) return null;
    let won = 0, lost = 0, drawn = 0;
    for (const d of r.duels) {
      const o = d.to || Object.keys(d.results).find((x) => x !== d.by);
      if (!o || !d.results[d.by] || !d.results[o] || (d.by !== who.id && o !== who.id)) continue;
      const mine = d.results[who.id].points, theirs = d.results[d.by === who.id ? o : d.by].points;
      if (mine > theirs) won++; else if (theirs > mine) lost++; else drawn++;
    }
    return { played: won + lost + drawn, won, lost, drawn, perfect: s.perfect };
  }

  // ---------- the page ----------
  function draw() {
    const s = SC.state(), t = SC.tierOf(s.earned), subs = subjects();
    const won = SC.checkAchievements();
    if (won.length) { SC.celebrate(won); return setTimeout(draw, 50); }      // drawn again with them paid
    const a = SC.achievements(), toWin = subs.reduce((x, y) => x + y.sum.total, 0), today = subs.reduce((x, y) => x + y.sum.today, 0);
    statusEl.textContent = s.local ? tr("Your coins are kept on this device.") : s.inClub ? tr("Your coins are kept online, so they're the same on every device you've linked.")
      : window.SORA_CLUB_PAGE ? tr("Your coins are kept on this phone until you join your club on the duel page.") : tr("Your coins are kept on this device until you link it below.");
    main.replaceChildren(hero(s, t, toWin, today), window.SORA_STATIC ? "" : linkBox(), subjectsView(subs), resultsView(subs, s), sourcesView(s), achievementsView(a, subs));
  }
  function hero(s, t, toWin, today) {
    return el("section", { class: "ac-hero" },
      el("div", { class: "ac-balance" }, el("small", {}, tr("Your coins")), el("span", { class: "coin-pot huge" }, `🪙 ${num(s.balance)}`),
        el("small", {}, s.spent ? tr("{earned} collected in all · {spent} spent on rewards", { earned: num(s.earned), spent: num(s.spent) }) : tr("{earned} collected in all", { earned: num(s.earned) })),
        window.SORA_CLUB_PAGE ? el("a", { class: "ac-link", href: window.SORA_CLUB_PAGE }, tr("Rewards, Wallet and Hall of Fame: in your club ▶")) : ""),
      el("div", { class: "ac-tier" }, el("small", {}, tr("Tier")), el("b", {}, `${t.icon} ${tr(t.name)}`),
        t.next ? bar((s.earned - t.from) / (t.next[0] - t.from)) : "",
        el("small", {}, t.next ? tr("{n} more to {tier}", { n: num(t.next[0] - s.earned), tier: `${SC.ICON[t.next[1]]} ${tr(t.next[1])}` }) : tr("The highest tier!"))),
      el("div", { class: "ac-towin" }, el("small", {}, tr("Still to win in your subjects")), el("span", { class: "coin-pot big" }, `🪙 ${num(toWin)}`),
        today ? el("span", { class: "coin-tag hot" }, tr("today 🪙 {n}", { n: num(today) })) : ""));
  }
  function subjectsView(subs) {
    if (!subs.length) return "";
    return section("ac-subjects", tr("Still to win"), el("div", { class: "ac-grid" }, ...subs.map(({ meta, b, sum }) => el("a", { class: "ac-subject", href: `${ROOT}${meta.url}` },
      el("b", {}, tr(meta.name)), el("span", { class: "coin-pot big" }, `🪙 ${num(sum.total)}`),
      el("div", { class: "coin-tags" }, sum.today ? el("span", { class: "coin-tag hot" }, tr("today 🪙 {n}", { n: num(sum.today) })) : "",
        sum.due ? el("span", { class: "coin-tag" }, tr("{n} to review", { n: sum.due })) : "", sum.finished ? el("span", { class: "coin-tag" }, tr("🏆 finished")) : ""),
      bar(sum.stages ? sum.passed / sum.stages : 0),
      el("small", {}, tr("{passed} of {all} stages · ★★★ {stars} · {got} % of its coins collected", { passed: sum.passed, all: sum.stages, stars: sum.stars3, got: sum.once ? Math.round((sum.got / sum.once) * 100) : 0 })),
      el("span", { class: "ac-go" }, sum.passed ? tr("Continue ▶") : tr("Start ▶"))))));
  }
  function resultsView(subs, s) {
    const sum = (k) => subs.reduce((x, y) => x + (y.sum[k] || 0), 0), d = duels(s);
    const spent = (s.room?.spent || []).filter((x) => x.m === SC.me()?.id);
    const tiles = [
      [tr("Stages passed"), `${num(sum("passed"))}`, tr("of {n}", { n: num(sum("stages")) })],
      [tr("Three-star stages"), num(sum("stars3")), "★★★"],
      [tr("Chapters and sections finished"), num(sum("partsDone")), tr("of {n}", { n: num(sum("parts")) })],
      [tr("Subjects finished"), num(subs.filter((x) => x.sum.finished).length), tr("of {n}", { n: subs.length })],
      [tr("Rounds played"), num(sum("rounds")), ""],
      [tr("Reviews passed on their day"), num(sum("reviewsOnTime")), ""],
      [tr("Best run of review days"), num(Math.max(0, ...subs.map((x) => x.sum.bestReviewRun || 0))), tr("in a row")],
      ...(d ? [[tr("Duels"), num(d.played), tr("{won} won · {lost} lost · {drawn} drawn", d)], [tr("Perfect duels"), num(d.perfect), "🎯"]] : []),
      ...(window.SORA_CLUB_PAGE ? [[tr("Rewards received"), num(spent.length), spent.length ? tr("{n} coins", { n: num(spent.reduce((x, y) => x + y.n, 0)) }) : ""]] : []),
    ];
    return section("ac-results", tr("Results"), el("div", { class: "ac-tiles" }, ...tiles.map(([label, n, more]) => el("div", { class: "ac-tile" }, el("b", {}, n), el("span", {}, label), more ? el("small", {}, more) : ""))));
  }
  function sourcesView(s) {
    const rows = [["study", tr("Lessons")], ["review", tr("Reviews")], ["duel", tr("Duels")], ["ach", tr("Achievements")]].filter(([k]) => k !== "duel" || window.SORA_CLUB_PAGE);
    // coins from before they were counted by source (18.11.2026)
    const earlier = s.earned - ["study", "review", "duel", "ach"].reduce((x, k) => x + (s.totals[k] || 0), 0);
    if (earlier > 0) rows.push(["earlier", tr("Earlier")]);
    s.totals.earlier = earlier;
    const latest = [...s.coins].sort((x, y) => y.at - x.at).slice(0, 12);
    return section("ac-sources", tr("Where your coins came from"),
      el("div", { class: "ac-tiles" }, ...rows.map(([k, label]) => el("div", { class: "ac-tile" }, el("b", {}, `🪙 ${num(s.totals[k] || 0)}`), el("span", {}, label)))),
      latest.length ? el("details", { class: "ac-latest" }, el("summary", {}, tr("The latest coins")),
        el("ul", {}, ...latest.map((e) => el("li", {}, el("span", {}, whyText(e.why)), el("b", {}, `+${num(e.n)}`))))) : "");
  }
  function achievementsView(a, subs) {
    const show = settings.values.locked, claimed = a.claimed;
    const medals = a.medals.filter((m) => show || m.level).map((m) => el("div", { class: `ac-medal lv${m.level}` },
      el("span", { class: "ac-medal-ico" }, m.icon), el("b", {}, tr(m.name)), el("small", {}, tr(m.what)),
      el("div", { class: "ac-levels" }, ...SC.LEVELS.map(([name, icon, coins], k) => el("span", { class: `ac-level ${k < m.level ? "on" : ""}`.trim(), title: `${tr(name)}: ${num(m.levels[k])} · +${coins} 🪙` },
        el("span", {}, icon), el("small", {}, num(m.levels[k]))))),
      m.next != null ? el("div", { class: "ac-next" }, bar(m.value / m.next), el("small", {}, tr("{have} / {need} · next +{coins} 🪙", { have: num(m.value), need: num(m.next), coins: SC.LEVELS[m.level][2] })))
        : el("small", { class: "ac-done" }, tr("All three won!"))));
    const cups = subs.filter(({ sum }) => /^[a-z0-9]{1,20}$/.test(sum.id) && (show || sum.finished)).map(({ meta, sum }) => el("div", { class: `ac-cup ${sum.finished ? "won" : ""}`.trim() },
      el("span", { class: "ac-medal-ico" }, "🏆"), el("b", {}, tr(meta.name)),
      el("small", {}, sum.finished ? tr("Finished · +{n} 🪙", { n: num(250) }) : tr("{passed} of {all} stages · +{n} 🪙 when finished", { passed: sum.passed, all: sum.stages, n: num(250) }))));
    const weeks = [...claimed].filter((x) => x.startsWith("cup-week-")).length;
    return section("ac-achievements", tr("Achievements"),
      el("p", { class: "hint" }, tr("Each medal level and each cup pays its coins once: bronze +20, silver +50, gold +100, a subject finished +250, a week won in your club's Hall of Fame +100.")),
      el("div", { class: "ac-medals" }, ...medals),
      el("h3", {}, tr("Cups")),
      el("div", { class: "ac-medals" }, ...cups, window.SORA_CLUB_PAGE ? el("div", { class: `ac-cup ${weeks ? "won" : ""}`.trim() },
        el("span", { class: "ac-medal-ico" }, "🏆"), el("b", {}, tr("Week champion")), el("small", {}, weeks ? tr("Won {n} {weeks} · +100 🪙 each", { n: weeks, weeks: tr.n(weeks, "week", "weeks") })
          : tr("The most coins in your club in a week · +100 🪙"))) : ""));
  }

  // ---------- Sora personal: the PC and the phone on one balance ----------
  function linkBox() {
    const me = SC.me(), msg = el("p", { class: "hint" });
    if (me) {
      const code = el("code", { class: "ac-code" }, me.room);
      code.hidden = true;
      return section("ac-devices", tr("Your devices"), el("p", {}, tr("✓ This device keeps its coins online with your other linked devices: one balance on all of them.")),
        el("div", { class: "row" }, btn(tr("Show the code for another device"), () => { code.hidden = !code.hidden; }), btn(tr("Unlink this device"), () => { SC.unlink(); draw(); }, false, "link")), code,
        el("p", { class: "hint" }, tr("Keep the code to yourself: it opens your coins.")));
    }
    const input = el("input", { type: "text", placeholder: tr("Paste the code from your other device"), "aria-label": tr("The code from your other device"), autocomplete: "off" });
    const busy = async (f) => { msg.textContent = tr("Connecting…"); try { await f(); draw(); } catch (e) { msg.textContent = tr("Couldn't link: {why}. Check the internet connection and try again.", { why: e.message }); } };
    return section("ac-devices", tr("Your devices"),
      el("p", {}, tr("Link your PC and your phone, and they keep one balance: coins won on either show on both.")),
      el("div", { class: "row" }, btn(tr("Start: make a code"), () => busy(() => SC.link(null, document.getElementById("playerName")?.textContent || "Me")), true)),
      el("form", { class: "ac-form", onsubmit: (e) => { e.preventDefault(); const code = (input.value.match(/[A-Za-z0-9_-]{24}/) || [])[0]; if (!code) { msg.textContent = tr("That isn't a code: it's 24 letters, numbers and signs."); return; } busy(() => SC.link(code)); } },
        input, el("button", { type: "submit" }, tr("Link with the code"))),
      msg);
  }

  SC.onChange(() => { if (!document.querySelector(".coin-ach")) draw(); });
  setupFullscreen(root);
  window.SoraAccount = { draw };      // for tests
  draw();
})();
