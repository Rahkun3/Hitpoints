"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const { PORT, SESSION_SECRET, UPLOADS_DIR, ROOT, UNIVERSES, badgeClass, categoryAnchor } = require("./config");
const content = require("./content");

content.ensureSeed();

const app = express();
app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    name: "hp.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.COOKIE_SECURE === "true",
    },
  })
);

app.use((req, res, next) => {
  res.locals.admin = !!(req.session && req.session.admin);
  res.locals.universes = UNIVERSES;
  res.locals.universeList = Object.values(UNIVERSES);
  res.locals.badgeClass = badgeClass;
  res.locals.categoryAnchor = categoryAnchor;
  res.locals.active = "";
  res.locals.description = "";
  next();
});

app.get("/vendor/marked.min.js", (_req, res) => {
  res.sendFile(require.resolve("marked/marked.min.js"));
});

app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1h", fallthrough: true }));
app.use(express.static(path.join(ROOT, "public"), { maxAge: "1h" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/", require("./routes/public"));
app.use("/admin", require("./routes/admin"));

app.use((req, res) => {
  res.status(404).render("404", { title: "Not found" });
});

app.use((err, req, res, _next) => {
  console.error(err);
  if (req.path.startsWith("/admin") && req.xhr) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
  res.status(500).send("Server error");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`hitpoints.eu cms listening on http://0.0.0.0:${PORT}`);
});
