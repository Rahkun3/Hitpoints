"use strict";

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const {
  CONTENT_DIR,
  UPLOADS_DIR,
  BUNDLED_CONTENT,
  BUNDLED_UPLOADS,
  UNIVERSE_IDS,
} = require("./config");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function isEmptyDir(dir) {
  if (!fs.existsSync(dir)) return true;
  return fs.readdirSync(dir).length === 0;
}

function ensureSeed() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (
    isEmptyDir(CONTENT_DIR) &&
    fs.existsSync(BUNDLED_CONTENT) &&
    path.resolve(CONTENT_DIR) !== path.resolve(BUNDLED_CONTENT)
  ) {
    copyDir(BUNDLED_CONTENT, CONTENT_DIR);
  }
  if (
    isEmptyDir(UPLOADS_DIR) &&
    fs.existsSync(BUNDLED_UPLOADS) &&
    path.resolve(UPLOADS_DIR) !== path.resolve(BUNDLED_UPLOADS)
  ) {
    copyDir(BUNDLED_UPLOADS, UPLOADS_DIR);
  }
}

function assertSafe(universe, slug) {
  if (!UNIVERSE_IDS.includes(universe)) {
    const err = new Error("Unknown universe");
    err.code = "BAD_UNIVERSE";
    throw err;
  }
  if (!SLUG_RE.test(slug)) {
    const err = new Error("Invalid slug (use lowercase letters, numbers, hyphens)");
    err.code = "BAD_SLUG";
    throw err;
  }
}

function articlePath(universe, slug) {
  assertSafe(universe, slug);
  const file = path.resolve(CONTENT_DIR, universe, `${slug}.md`);
  const root = path.resolve(CONTENT_DIR);
  if (!file.startsWith(root + path.sep) && file !== root) {
    const err = new Error("Invalid path");
    err.code = "BAD_PATH";
    throw err;
  }
  return file;
}

function parseFile(file, universeHint) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const data = parsed.data || {};
  const universe = data.universe || universeHint;
  const slug = data.slug || path.basename(file, ".md");
  const infobox = data.infobox && typeof data.infobox === "object" ? data.infobox : {};
  let seeAlso = data.seeAlso || [];
  if (!Array.isArray(seeAlso)) seeAlso = [];
  seeAlso = seeAlso.map((item) => {
    if (typeof item === "string") {
      if (item.includes("/")) {
        const parts = item.split("/");
        return { slug: parts[1], title: "", universe: parts[0] };
      }
      return { slug: item, title: "", universe };
    }
    return {
      slug: item.slug,
      title: item.title || "",
      universe: item.universe || universe,
    };
  });
  let badges = data.badges || [];
  if (typeof badges === "string") badges = badges.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    title: data.title || slug,
    universe,
    category: data.category || "Uncategorized",
    slug,
    badges,
    lede: data.lede || "",
    infobox,
    seeAlso,
    banner: data.banner || "",
    portrait: data.portrait || "",
    status: data.status === "draft" ? "draft" : "published",
    priority: data.priority != null && data.priority !== "" ? Number(data.priority) : null,
    body: parsed.content.replace(/^\n+/, ""),
    file,
  };
}

function listArticles({ universe, includeDrafts } = {}) {
  const universes = universe ? [universe] : UNIVERSE_IDS;
  const out = [];
  for (const uni of universes) {
    const dir = path.join(CONTENT_DIR, uni);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      try {
        const article = parseFile(path.join(dir, name), uni);
        if (!includeDrafts && article.status !== "published") continue;
        out.push(article);
      } catch (err) {
        console.error("Skip", name, err.message);
      }
    }
  }
  out.sort((a, b) => {
    if (a.universe !== b.universe) return a.universe.localeCompare(b.universe);
    const pa = a.priority == null ? 999 : a.priority;
    const pb = b.priority == null ? 999 : b.priority;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  });
  return out;
}

function getArticle(universe, slug, { includeDrafts } = {}) {
  const file = articlePath(universe, slug);
  if (!fs.existsSync(file)) return null;
  const article = parseFile(file, universe);
  if (!includeDrafts && article.status !== "published") return null;
  return article;
}

function saveArticle(input, { previous } = {}) {
  const universe = String(input.universe || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  assertSafe(universe, slug);

  const dir = path.join(CONTENT_DIR, universe);
  fs.mkdirSync(dir, { recursive: true });

  const fm = {
    title: String(input.title || "").trim() || slug,
    universe,
    category: String(input.category || "Uncategorized").trim(),
    slug,
    badges: Array.isArray(input.badges) ? input.badges.filter(Boolean) : [],
    lede: String(input.lede || "").trim(),
    infobox: input.infobox && typeof input.infobox === "object" ? input.infobox : {},
    seeAlso: (Array.isArray(input.seeAlso) ? input.seeAlso : []).map((item) => {
      if (typeof item === "string") return item;
      if (item.universe && item.universe !== universe) return item.universe + "/" + item.slug;
      return item.slug;
    }),
    banner: String(input.banner || "").trim(),
    portrait: String(input.portrait || "").trim(),
    status: input.status === "draft" ? "draft" : "published",
  };
  if (input.priority != null && input.priority !== "") {
    fm.priority = Number(input.priority);
  }

  const body = String(input.body || "").replace(/\s+$/, "") + "\n";
  const file = articlePath(universe, slug);
  fs.writeFileSync(file, matter.stringify(body, fm), "utf8");

  if (
    previous &&
    (previous.universe !== universe || previous.slug !== slug)
  ) {
    const old = articlePath(previous.universe, previous.slug);
    if (old !== file && fs.existsSync(old)) fs.unlinkSync(old);
  }
  return getArticle(universe, slug, { includeDrafts: true });
}

function deleteArticle(universe, slug) {
  const file = articlePath(universe, slug);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

function resolveSeeAlso(article, all) {
  const byKey = new Map(all.map((a) => [`${a.universe}/${a.slug}`, a]));
  return (article.seeAlso || [])
    .map((item) => {
      const uni = item.universe || article.universe;
      const key = `${uni}/${item.slug}`;
      const found = byKey.get(key);
      if (!found && !item.title) return null;
      return {
        universe: uni,
        slug: item.slug,
        title: item.title || (found && found.title) || item.slug,
        href: item.slug === "hub" ? `/wiki/${uni}` : `/wiki/${uni}/${item.slug}`,
      };
    })
    .filter(Boolean);
}

module.exports = {
  SLUG_RE,
  ensureSeed,
  listArticles,
  getArticle,
  saveArticle,
  deleteArticle,
  resolveSeeAlso,
  assertSafe,
};
