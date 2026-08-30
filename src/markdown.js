"use strict";

const { marked } = require("marked");

marked.setOptions({ gfm: true, breaks: false });

function wikiToMarkdown(src, universe) {
  return String(src || "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const title = (label || target).trim();
    const t = target.trim();
    if (t.startsWith("/")) return `[${title}](${t})`;
    if (t.includes("/")) return `[${title}](/wiki/${t})`;
    return `[${title}](/wiki/${universe}/${t})`;
  });
}

function renderMarkdown(src, universe) {
  const md = wikiToMarkdown(src, universe);
  let html = marked.parse(md || "") || "";
  html = html.replace(/<blockquote>/g, '<div class="callout">').replace(/<\/blockquote>/g, "</div>");
  return html;
}

module.exports = { renderMarkdown, wikiToMarkdown };
