(function () {
  const body = document.getElementById("body");
  const preview = document.getElementById("preview");
  const universe = document.getElementById("universe");
  const addBtn = document.getElementById("add-infobox");
  if (!body || !preview) return;

  function wiki(src) {
    const uni = (universe && universe.value) || "witcher";
    return String(src || "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, function (_, target, label) {
      const title = (label || target).trim();
      const t = target.trim();
      if (t.indexOf("/") === 0) return "[" + title + "](" + t + ")";
      if (t.indexOf("/") >= 0) return "[" + title + "](/wiki/" + t + ")";
      return "[" + title + "](/wiki/" + uni + "/" + t + ")";
    });
  }

  function render() {
    if (!window.marked) {
      preview.textContent = body.value;
      return;
    }
    let html = marked.parse(wiki(body.value) || "") || "";
    html = html.replace(/<blockquote>/g, '<div class="callout">').replace(/<\/blockquote>/g, "</div>");
    preview.innerHTML = html;
  }

  body.addEventListener("input", render);
  if (universe) universe.addEventListener("change", render);
  render();

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      const wrap = document.getElementById("infobox-rows");
      const row = document.createElement("div");
      row.className = "infobox-edit-row";
      row.innerHTML = '<input type="text" name="infobox_key" placeholder="Label" /><input type="text" name="infobox_val" placeholder="Value" />';
      wrap.appendChild(row);
    });
  }
})();
