/* The books in the app's language (lang.js), for Study Quest and Study Duel: loaded after the books (study/<book>.js) and before the
   game that uses them. */
"use strict";
// ---------- a book in the app's language (lang.js) ----------
// A book can carry its texts again in Russian: any of its objects (the book, a chapter, a stage, a card) may have "ru", whose fields
// replace the English ones. English terms written [[term]] show in brackets on the cards and in the explanations, and are left out of
// the questions and answers, so they are never what's tested. A card keeps the bracketed version in withTerms, for showing.
(() => {
  const lang = window.SoraLang?.lang || "en";
  if (lang === "en") return;
  const TERM = /\s*\[\[([^\]]+)\]\]/g;
  const plain = (v) => (Array.isArray(v) ? v.map(plain) : typeof v === "string" ? v.replace(TERM, "") : v);
  const withTerms = (v) => (Array.isArray(v) ? v.map(withTerms) : typeof v === "string" ? v.replace(TERM, " ($1)") : v);
  function localize(o) {
    if (Array.isArray(o)) return o.forEach(localize);
    if (!o || typeof o !== "object") return;
    const mine = o[lang];
    if (mine && typeof mine === "object" && !Array.isArray(mine)) {
      const shown = {};
      for (const [k, v] of Object.entries(mine)) {
        o[k] = k === "why" ? withTerms(v) : plain(v);
        if (k !== "why" && JSON.stringify(o[k]) !== JSON.stringify(withTerms(v))) shown[k] = withTerms(v);
      }
      if (Object.keys(shown).length) o.withTerms = shown;
      delete o[lang];
    }
    for (const v of Object.values(o)) if (v && typeof v === "object") localize(v);
  }
  localize(window.StudyBooks || []);
})();
