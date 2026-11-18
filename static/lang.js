/* The app's language. Apps are in English; an app can also be in Russian (sites.json "languages", the first is its default), chosen
   in Settings and kept in this browser.
   - tr("English text", { values }) gives an interface text in the app's language, with {name} filled in from the values;
     tr.n(count, "stage", "stages") gives the word for a count.
   - The Russian words are in lang-ru.js, loaded only by apps in Russian, before this file.
   - A page's own texts (the menu, the title) are marked data-t (data-t-title for a tooltip) and put into the language as the page opens.
   - The language is chosen in Settings (common.js), which calls SoraLang.set().
   Loaded early on every page; in English it changes nothing. */
"use strict";
const SoraLang = (() => {
  const langs = window.SORA_LANGS || ["en"], dict = window.SORA_DICT || {};
  const NAMES = { en: "English", ru: "Русский" };
  let lang = langs[0];
  try { const saved = localStorage.getItem("lang"); if (langs.includes(saved)) lang = saved; } catch { /* default */ }
  document.documentElement.lang = lang;
  const words = lang === "en" ? {} : dict[lang] || {};

  const fill = (s, v) => (v ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : String(s));
  function t(s, v) { return fill(words[s] ?? s, v); }
  // Russian has three forms: 1 этап, 2 этапа, 5 этапов (21 этап, 22 этапа, 11 этапов)
  function n(count, one, many) {
    const forms = words[`${one}|${many}`];
    if (!forms) return count === 1 ? one : many;
    const a = Math.abs(count) % 100, b = a % 10;
    return forms[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2];
  }
  // the texts a page carries: each kept in English (data-t-src) so the page can be put into a language again
  function apply(root = document) {
    if (lang === "en") return;
    for (const e of root.querySelectorAll("[data-t]")) {
      if (!e.dataset.tSrc) e.dataset.tSrc = e.textContent.trim();
      e.textContent = t(e.dataset.tSrc);
    }
    for (const e of root.querySelectorAll("[data-t-title]")) {
      if (!e.dataset.tTitleSrc) e.dataset.tTitleSrc = e.title;
      e.title = t(e.dataset.tTitleSrc);
    }
    if (root === document) document.title = document.title.split(" · ").map((x) => t(x)).join(" · ");
  }
  // changing the language reloads the page, as everything on it is in the language
  function set(next) {
    try { localStorage.setItem("lang", next); } catch { /* full */ }
    location.reload();
  }
  document.addEventListener("DOMContentLoaded", () => apply());
  return { lang, langs, names: NAMES, t, n, apply, set };
})();
window.SoraLang = SoraLang;
const tr = SoraLang.t;
tr.n = SoraLang.n;
