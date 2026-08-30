"use strict";

const path = require("path");
const express = require("express");
const multer = require("multer");
const { UNIVERSES, UNIVERSE_IDS, UPLOADS_DIR } = require("../config");
const content = require("../content");
const { attemptLogin, requireAdmin } = require("../auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "upload", ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "upload";
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Images only (png, jpg, webp, gif, svg)"), ok);
  },
});

router.get("/login", (req, res) => {
  if (req.session && req.session.admin) return res.redirect("/admin");
  res.render("admin/login", {
    title: "Admin login — hitpoints.eu",
    error: req.query.error === "1",
    next: req.query.next || "/admin",
    layoutMinimal: true,
  });
});

router.post("/login", (req, res) => {
  const user = (req.body.username || "").trim();
  const pass = req.body.password || "";
  const nextUrl = req.body.next && String(req.body.next).startsWith("/") ? req.body.next : "/admin";
  if (!attemptLogin(user, pass)) {
    return res.redirect("/admin/login?error=1&next=" + encodeURIComponent(nextUrl));
  }
  req.session.admin = true;
  res.redirect(nextUrl);
});

router.post("/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

router.get("/", requireAdmin, (req, res) => {
  const filter = UNIVERSE_IDS.includes(req.query.universe) ? req.query.universe : "";
  const articles = content.listArticles({
    universe: filter || undefined,
    includeDrafts: true,
  });
  res.render("admin/list", {
    title: "Articles — Admin · hitpoints.eu",
    articles,
    filter,
    flash: req.query.saved ? "saved" : req.query.deleted ? "deleted" : "",
  });
});

router.get("/new", requireAdmin, (req, res) => {
  const universe = UNIVERSE_IDS.includes(req.query.universe) ? req.query.universe : "witcher";
  const meta = UNIVERSES[universe];
  res.render("admin/edit", {
    title: "New article — Admin · hitpoints.eu",
    isNew: true,
    article: {
      title: "",
      universe,
      category: meta.categories[0] || "People",
      slug: "",
      badges: [],
      lede: "",
      infobox: {},
      seeAlso: [],
      banner: "",
      portrait: "",
      status: "published",
      priority: "",
      body: "",
    },
    previousUniverse: "",
    previousSlug: "",
    error: "",
  });
});

router.get("/:universe/:slug/edit", requireAdmin, (req, res) => {
  const article = content.getArticle(req.params.universe, req.params.slug, { includeDrafts: true });
  if (!article) return res.status(404).render("404", { title: "Not found", active: "" });
  res.render("admin/edit", {
    title: `Edit ${article.title} — Admin · hitpoints.eu`,
    isNew: false,
    article,
    previousUniverse: article.universe,
    previousSlug: article.slug,
    error: "",
  });
});

function parseInfobox(body) {
  const keys = [].concat(body.infobox_key || []);
  const vals = [].concat(body.infobox_val || []);
  const infobox = {};
  for (let i = 0; i < keys.length; i++) {
    const k = String(keys[i] || "").trim();
    if (!k) continue;
    infobox[k] = String(vals[i] || "").trim();
  }
  return infobox;
}

function parseSeeAlso(raw, universe) {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      if (token.includes("/")) {
        const [uni, slug] = token.split("/");
        return { universe: uni, slug, title: "" };
      }
      return { universe, slug: token, title: "" };
    });
}

function parseBadges(body) {
  return [].concat(body.badges || []).map(String).filter(Boolean);
}

router.post("/save", requireAdmin, upload.fields([
  { name: "banner_file", maxCount: 1 },
  { name: "portrait_file", maxCount: 1 },
]), (req, res) => {
  const universe = String(req.body.universe || "").trim();
  const slug = String(req.body.slug || "").trim().toLowerCase();
  const previousUniverse = String(req.body.previous_universe || "").trim();
  const previousSlug = String(req.body.previous_slug || "").trim();

  const files = req.files || {};
  const bannerFile = files.banner_file && files.banner_file[0];
  const portraitFile = files.portrait_file && files.portrait_file[0];

  const payload = {
    title: req.body.title,
    universe,
    category: req.body.category,
    slug,
    badges: parseBadges(req.body),
    lede: req.body.lede,
    infobox: parseInfobox(req.body),
    seeAlso: parseSeeAlso(req.body.seeAlso, universe),
    banner: bannerFile ? `/uploads/${bannerFile.filename}` : String(req.body.banner || "").trim(),
    portrait: portraitFile ? `/uploads/${portraitFile.filename}` : String(req.body.portrait || "").trim(),
    status: req.body.status === "draft" ? "draft" : "published",
    priority: req.body.priority,
    body: req.body.body,
  };

  try {
    content.saveArticle(payload, {
      previous: previousUniverse && previousSlug ? { universe: previousUniverse, slug: previousSlug } : null,
    });
    res.redirect("/admin?saved=1");
  } catch (err) {
    const meta = UNIVERSES[universe] || UNIVERSES.witcher;
    res.status(400).render("admin/edit", {
      title: "Edit article — Admin · hitpoints.eu",
      isNew: !previousSlug,
      article: { ...payload, body: payload.body || "" },
      previousUniverse,
      previousSlug,
      error: err.message || "Could not save",
      universes: UNIVERSES,
    });
  }
});

router.post("/:universe/:slug/delete", requireAdmin, (req, res) => {
  try {
    content.deleteArticle(req.params.universe, req.params.slug);
  } catch (err) {
    return res.status(400).send(err.message);
  }
  res.redirect("/admin?deleted=1");
});

router.post("/upload", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
