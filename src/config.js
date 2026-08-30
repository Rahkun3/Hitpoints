"use strict";

const path = require("path");

const ROOT = path.join(__dirname, "..");

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(ROOT, "data", "content");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT, "data", "uploads");
const BUNDLED_CONTENT = path.join(ROOT, "seed", "content");
const BUNDLED_UPLOADS = path.join(ROOT, "seed", "uploads");

const UNIVERSES = {
  witcher: {
    id: "witcher",
    name: "The Witcher",
    tag: "Live · Priority A",
    featured: true,
    blurb: "Sapkowski's Continent, CDPR's games, and Netflix's adaptation — tracked as Book, Game, Netflix, and Shared continuity.",
    meta: "People · Places · Lore · Media",
    card: "/uploads/witcher-card.png",
    banner: "/uploads/witcher-hub-banner.png",
    badges: ["Book", "Game", "Netflix", "Shared"],
    categories: ["People", "Places", "Lore & systems", "Timeline", "Media", "Guides"],
    continuity: "Books = Sapkowski literary canon; games = CDPR licensed post-saga; Netflix = separate adaptation. Shared = elements present across more than one continuity.",
  },
  dune: {
    id: "dune",
    name: "Dune",
    tag: "Live · Priority A",
    featured: true,
    blurb: "Arrakis, spice, and the Great Houses — Frank Herbert's novels, theatrical films, and TV tracked as Book, Film, Series, and Shared.",
    meta: "People · Places · Lore · Media",
    card: "/uploads/dune-card.png",
    banner: "/uploads/dune-hub-banner.png",
    badges: ["Book", "Film", "Series", "Shared"],
    categories: ["People", "Places", "Lore & systems", "Media", "Guides"],
    continuity: "Book = Frank Herbert novels (primary literary canon). Film = theatrical adaptations. Series = TV. Shared = elements across more than one continuity.",
  },
  warcraft: {
    id: "warcraft",
    name: "Warcraft",
    tag: "Stub · In progress",
    featured: false,
    blurb: "Azeroth across RTS, World of Warcraft, and the novels — Game, Book, and Shared tracks. Hub plus a first article stub.",
    meta: "People · Places · Lore · Media",
    card: "/uploads/warcraft-card.png",
    banner: "/uploads/warcraft-card.png",
    badges: ["Game", "Book", "Shared"],
    categories: ["People", "Places", "Lore & systems", "Media"],
    continuity: "Game = Blizzard titles (RTS + WoW). Book = licensed novels. Shared = elements that travel across more than one continuity.",
  },
  lotr: {
    id: "lotr",
    name: "The Lord of the Rings",
    tag: "Stub · In progress",
    featured: false,
    blurb: "Tolkien's legendarium and its screen adaptations — Book, Film, and Shared. Hub plus a first article stub.",
    meta: "People · Places · Lore · Media",
    card: "/uploads/lotr-card.png",
    banner: "/uploads/lotr-card.png",
    badges: ["Book", "Film", "Shared"],
    categories: ["People", "Places", "Lore & systems", "Media"],
    continuity: "Book = Tolkien's legendarium (primary). Film = Jackson and other screen adaptations. Shared = elements present across more than one continuity.",
  },
};

function badgeClass(badge) {
  const key = String(badge || "").toLowerCase();
  const map = {
    book: "on-book",
    novel: "on-book",
    game: "on-game",
    netflix: "on-netflix",
    series: "on-netflix",
    film: "on-film",
    shared: "on-shared",
  };
  return map[key] || "on-shared";
}

function categoryAnchor(cat) {
  const s = String(cat || "").toLowerCase();
  if (s.startsWith("people")) return "people";
  if (s.startsWith("place")) return "places";
  if (s.startsWith("lore")) return "lore";
  if (s.startsWith("time")) return "timeline";
  if (s.startsWith("media")) return "media";
  if (s.startsWith("guide")) return "guides";
  if (s.startsWith("hub")) return "hub";
  return s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
}

module.exports = {
  ROOT,
  CONTENT_DIR,
  UPLOADS_DIR,
  BUNDLED_CONTENT,
  BUNDLED_UPLOADS,
  UNIVERSES,
  UNIVERSE_IDS: Object.keys(UNIVERSES),
  PORT: Number(process.env.PORT) || 3000,
  ADMIN_USER: process.env.ADMIN_USER || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev-only-change-me",
  badgeClass,
  categoryAnchor,
};
