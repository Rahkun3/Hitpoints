"use strict";

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const HANDOFF = path.resolve(ROOT, "..", "hitpoints-handoff");
const DEST = path.join(ROOT, "data", "content");
const SEED = path.join(ROOT, "seed", "content");
const UPLOADS_SRC = path.join(ROOT, "data", "uploads");
const UPLOADS_SEED = path.join(ROOT, "seed", "uploads");

const SOURCES = [
  { dir: path.join(HANDOFF, "priority-a"), universe: "witcher" },
  { dir: path.join(HANDOFF, "dune-wave2"), universe: "dune" },
  { dir: path.join(HANDOFF, "warcraft-priority-a"), universe: "warcraft" },
  { dir: path.join(HANDOFF, "lotr-priority-a"), universe: "lotr" },
];

const HUB_FILES = {
  "the-witcher.md": true,
  "warcraft.md": true,
  "middle-earth.md": true,
};

const PRIORITY = {
  witcher: [
    "hub",
    "reading-order",
    "geralt-of-rivia",
    "ciri",
    "yennefer-of-vengerberg",
    "the-continent",
    "kaer-morhen",
    "books",
    "games",
    "netflix",
  ],
  dune: [
    "hub",
    "leto-atreides",
    "baron-harkonnen",
    "fremen",
    "caladan",
    "giedi-prime",
    "bene-gesserit",
    "spacing-guild",
    "kwisatz-haderach",
    "houses",
    "villeneuve-films",
  ],
  warcraft: [
    "hub",
    "azeroth",
    "warcraft-iii",
    "world-of-warcraft",
    "arthas-menethil",
    "thrall",
    "jaina-proudmoore",
    "stormwind",
    "orgrimmar",
    "burning-legion",
    "reading-play-order",
  ],
  lotr: [
    "hub",
    "reading-order",
    "frodo-baggins",
    "aragorn",
    "gandalf",
    "galadriel",
    "jackson-films",
    "the-silmarillion",
    "middle-earth",
  ],
};

const MEDIA = {
  "witcher/hub": { banner: "/uploads/witcher-hub-banner.png" },
  "witcher/geralt-of-rivia": { portrait: "/uploads/geralt.png" },
  "witcher/ciri": { portrait: "/uploads/ciri.png" },
  "witcher/yennefer-of-vengerberg": { portrait: "/uploads/yennefer.png" },
  "witcher/kaer-morhen": { banner: "/uploads/kaer-morhen.png" },
  "witcher/the-continent": { banner: "/uploads/continent.png" },
  "dune/hub": { banner: "/uploads/dune-hub-banner.png" },
  "warcraft/hub": { banner: "/uploads/warcraft-card.png" },
  "lotr/hub": { banner: "/uploads/lotr-card.png" },
};

function humanize(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function mapCategory(cat, isHub) {
  if (isHub) return "Hub";
  const c = String(cat || "Uncategorized");
  if (c === "Universe") return "Hub";
  if (c === "Lore") return "Lore & systems";
  return c;
}

function loadSources() {
  const articles = [];
  for (const src of SOURCES) {
    if (!fs.existsSync(src.dir)) {
      console.warn("Missing source", src.dir);
      continue;
    }
    for (const name of fs.readdirSync(src.dir)) {
      if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
      const file = path.join(src.dir, name);
      const parsed = matter(fs.readFileSync(file, "utf8"));
      const isHub = !!HUB_FILES[name];
      const slug = isHub ? "hub" : path.basename(name, ".md");
      articles.push({
        universe: src.universe,
        slug,
        isHub,
        title: parsed.data.title || slug,
        data: parsed.data,
        body: parsed.content.replace(/^\n+/, ""),
      });
    }
  }
  return articles;
}

function duneHub() {
  return {
    universe: "dune",
    slug: "hub",
    isHub: true,
    title: "Dune",
    data: {
      title: "Dune",
      category: "Hub",
      badges: ["Book", "Film", "Series", "Shared"],
      lede:
        "Arrakis, spice, and the Great Houses — Frank Herbert's novels, theatrical films, and TV tracked as Book, Film, Series, and Shared.",
      infobox: {
        LiteraryCanon: "Frank Herbert novels (Dune 1965 through Chapterhouse: Dune)",
        Film: "Lynch 1984 and Villeneuve 2021/2024 — separate theatrical tracks",
        Series: "Syfy 2000 / 2003 and later TV — not Film",
      },
      seeAlso: [
        "leto-atreides",
        "baron-harkonnen",
        "fremen",
        "bene-gesserit",
        "houses",
        "villeneuve-films",
      ],
    },
    body: `**Dune** is Frank Herbert's science-fiction cycle, set around the desert world **Arrakis** and the spice **melange**. Literary canon is the six Herbert novels. Theatrical films (Lynch 1984; Villeneuve 2021/2024) and TV are separate tracks — they share names, not one plot.

Use badges (**Book** / **Film** / **Series** / **Shared**) on every article. Book = Frank Herbert only. Film lines stay distinct from each other. Series starts with Syfy *Frank Herbert's Dune* (2000) and *Children of Dune* (2003). Brian Herbert / Kevin J. Anderson is an optional labeled track, never Book.

> **Continuity rule:** Shared means a name, role, or core relationship that actually holds in more than one continuity. It is not a fourth canon and not a license to mash plots.

Wave 2 stubs cover houses, Fremen, Bene Gesserit, the Guild, and Villeneuve's films. Start from the people and lore sections below.
`,
  };
}

function buildLookup(articles) {
  const byTitle = new Map();
  for (const a of articles) {
    byTitle.set(a.title.toLowerCase(), a);
    byTitle.set(slugify(a.title), a);
    byTitle.set(a.slug, a);
  }
  const aliases = [
    ["the witcher", "witcher", "hub"],
    ["middle-earth", "lotr", "hub"],
    ["warcraft", "warcraft", "hub"],
    ["dune", "dune", "hub"],
    ["cirilla fiona elen riannon", "witcher", "ciri"],
    ["ciri", "witcher", "ciri"],
    ["duke leto atreides i", "dune", "leto-atreides"],
    ["leto atreides", "dune", "leto-atreides"],
    ["baron vladimir harkonnen", "dune", "baron-harkonnen"],
    ["great houses", "dune", "houses"],
    ["reading and play order", "warcraft", "reading-play-order"],
  ];
  for (const [title, universe, slug] of aliases) {
    if (!byTitle.has(title)) {
      const found = articles.find((a) => a.universe === universe && a.slug === slug);
      if (found) byTitle.set(title, found);
    }
  }
  return byTitle;
}

function resolveSeeAlso(raw, article, lookup) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    let title = "";
    let hintUni = article.universe;
    let hintSlug = "";
    if (typeof item === "string") {
      title = item;
    } else if (item && typeof item === "object") {
      title = item.title || item.slug || "";
      hintUni = item.universe || hintUni;
      hintSlug = item.slug || "";
    }
    const key = String(title || hintSlug).toLowerCase();
    const found =
      lookup.get(key) ||
      lookup.get(slugify(title)) ||
      lookup.get(hintSlug) ||
      null;
    const universe = found ? found.universe : hintUni;
    const slug = found ? found.slug : slugify(hintSlug || title);
    if (!slug) continue;
    const id = universe + "/" + slug;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      universe,
      slug,
      title: found ? found.title : title || slug,
    });
  }
  return out;
}

function writeArticle(a, lookup) {
  const infoboxIn = a.data.infobox && typeof a.data.infobox === "object" ? a.data.infobox : {};
  const infobox = {};
  for (const [k, v] of Object.entries(infoboxIn)) {
    infobox[humanize(k)] = v;
  }
  const fm = {
    title: a.title,
    universe: a.universe,
    category: mapCategory(a.data.category, a.isHub),
    slug: a.slug,
    badges: Array.isArray(a.data.badges) ? a.data.badges : [],
    lede: a.data.lede || "",
    infobox,
    seeAlso: resolveSeeAlso(a.data.seeAlso, a, lookup),
    banner: "",
    portrait: "",
    status: "published",
  };
  if (a.data.badgeNote) infobox["Badge note"] = a.data.badgeNote;
  const pri = (PRIORITY[a.universe] || []).indexOf(a.slug);
  if (pri >= 0) fm.priority = pri + 1;
  const media = MEDIA[a.universe + "/" + a.slug];
  if (media) Object.assign(fm, media);

  const body = String(a.body || "").replace(/\s+$/, "") + "\n";
  const destDir = path.join(DEST, a.universe);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, a.slug + ".md");
  fs.writeFileSync(dest, matter.stringify(body, fm), "utf8");
  return dest;
}

function main() {
  if (!fs.existsSync(HANDOFF)) {
    console.error("Handoff folder not found:", HANDOFF);
    process.exit(1);
  }
  const existing = [];
  for (const uni of ["witcher", "dune", "warcraft", "lotr"]) {
    const dir = path.join(DEST, uni);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".md")) existing.push(uni + "/" + name);
    }
  }
  if (existing.length && !process.argv.includes("--force")) {
    console.log("Content already seeded (" + existing.length + " files). Pass --force to overwrite.");
    copyDir(DEST, SEED);
    copyDir(UPLOADS_SRC, UPLOADS_SEED);
    return;
  }

  const articles = loadSources();
  if (!articles.some((a) => a.universe === "dune" && a.slug === "hub")) {
    articles.push(duneHub());
  }
  const lookup = buildLookup(articles);
  const written = [];
  for (const a of articles) written.push(writeArticle(a, lookup));
  copyDir(DEST, SEED);
  copyDir(UPLOADS_SRC, UPLOADS_SEED);
  console.log("Seeded " + written.length + " articles into data/content and seed/content");
}

main();
