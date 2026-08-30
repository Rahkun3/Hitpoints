"use strict";

const express = require("express");
const { UNIVERSES, UNIVERSE_IDS, categoryAnchor } = require("../config");
const content = require("../content");
const { renderMarkdown } = require("../markdown");

const router = express.Router();

function hubHref(universe) {
  return `/wiki/${universe}`;
}

function articleHref(universe, slug) {
  if (slug === "hub") return hubHref(universe);
  return `/wiki/${universe}/${slug}`;
}

router.get("/", (req, res) => {
  const articles = content.listArticles();
  const counts = {};
  for (const id of UNIVERSE_IDS) counts[id] = 0;
  for (const a of articles) {
    if (a.slug !== "hub") counts[a.universe] = (counts[a.universe] || 0) + 1;
  }
  res.render("home", {
    title: "hitpoints.eu — Fantasy & Sci-Fi Wiki Hub",
    description:
      "hitpoints.eu — a modern wiki hub for gaming, fantasy, and sci-fi universes. Continuity-aware. Canon-clear.",
    active: "home",
    counts,
  });
});

router.get("/wiki/:universe", (req, res) => {
  const { universe } = req.params;
  const meta = UNIVERSES[universe];
  if (!meta) return res.status(404).render("404", { title: "Not found", active: "" });

  const hub = content.getArticle(universe, "hub");
  const articles = content.listArticles({ universe }).filter((a) => a.slug !== "hub");
  const grouped = {};
  for (const cat of meta.categories) grouped[cat] = [];
  for (const a of articles) {
    const key = meta.categories.includes(a.category) ? a.category : a.category;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }
  const priority = articles.filter((a) => a.priority != null).sort((a, b) => a.priority - b.priority);

  res.render("hub", {
    title: `${meta.name} — hitpoints.eu`,
    description: hub && hub.lede ? hub.lede : meta.blurb,
    active: universe,
    universe,
    meta,
    hub,
    articles,
    grouped,
    priority,
    bodyHtml: hub ? renderMarkdown(hub.body, universe) : "",
    articleHref,
    categoryAnchor,
  });
});

router.get("/wiki/:universe/:slug", (req, res) => {
  const { universe, slug } = req.params;
  const meta = UNIVERSES[universe];
  if (!meta) return res.status(404).render("404", { title: "Not found", active: "" });
  if (slug === "hub") return res.redirect(`/wiki/${universe}`);

  const article = content.getArticle(universe, slug);
  if (!article) return res.status(404).render("404", { title: "Not found", active: universe });

  const all = content.listArticles({ universe: article.universe });
  const seeAlso = content.resolveSeeAlso(article, content.listArticles());
  const infoboxRows = Object.entries(article.infobox || {});

  res.render("article", {
    title: `${article.title} — ${meta.name} · hitpoints.eu`,
    description: article.lede || `${article.title} on hitpoints.eu`,
    active: universe,
    universe,
    meta,
    article,
    seeAlso,
    infoboxRows,
    bodyHtml: renderMarkdown(article.body, universe),
    categoryAnchor,
    articleHref,
    all,
  });
});

module.exports = router;
