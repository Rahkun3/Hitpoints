"use strict";

const crypto = require("crypto");
const { ADMIN_USER, ADMIN_PASSWORD } = require("./config");

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, Buffer.alloc(left.length));
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function attemptLogin(user, pass) {
  return safeEqual(user, ADMIN_USER) && safeEqual(pass, ADMIN_PASSWORD);
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  const nextUrl = req.originalUrl || "/admin";
  res.redirect("/admin/login?next=" + encodeURIComponent(nextUrl));
}

module.exports = { attemptLogin, requireAdmin };
