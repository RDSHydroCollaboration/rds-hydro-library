(() => {
const UI = {
  no: {title: "RDS Vannkraft-bibliotek", types: "Typetabell", map: "Kraftverksmal", search: "Søk…", expand: "Åpne alle", collapse: "Lukk alle", both: "Begge", dl: "Last ned språk:", code: "Kode", parent: "Overordnet", all: "Alle", foot: "Kun koder og egne foretrukne termer. Data: CC-BY-4.0, kode: MIT."},
  en: {title: "RDS Hydro Library", types: "Type table", map: "Plant template", search: "Search…", expand: "Expand all", collapse: "Collapse all", both: "Both", dl: "Download language:", code: "Code", parent: "Parent", all: "All", foot: "Codes and our own preferred terms only. Data: CC-BY-4.0, code: MIT."}
};
const $ = s => document.querySelector(s);
const nav = (navigator.language || "en").toLowerCase();
let lang = localStorage.getItem("lang") || (/^(no|nb|nn)/.test(nav) ? "no" : "en");
let types = [], cols = [], langs = [], attrs = [], plant = [], filters = {};
const open = new Set();

const lab = (o, l = lang) => (o.label ? o.label[l] || o.label.en : o["label_" + l] || o.label_en) || "";
const t = k => UI[lang][k];

function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const h = rows.shift();
  return {h, rows: rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])))};
}

function applyLang() {
  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);
  document.querySelectorAll("#lang button").forEach(b => b.classList.toggle("on", b.dataset.l === lang));
  $("#title").textContent = t("title"); document.title = t("title");
  $("#tab-types").textContent = t("types"); $("#tab-map").textContent = t("map");
  $("#q").placeholder = t("search");
  $("#expand").textContent = t("expand"); $("#collapse").textContent = t("collapse");
  $("#dl-lang-label").textContent = t("dl"); $("#dl-lang-label2").textContent = t("dl");
  $("#dl-lang option[value=both]").textContent = t("both");
  $("#foot").textContent = t("foot");
  renderFilters(); renderTable(); renderMap();
}

function renderFilters() {
  $("#filters").innerHTML = "";
  attrs.forEach(a => {
    const sel = document.createElement("select");
    const vals = [...new Set(types.map(r => r[a]).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">${a.slice(5)}: ${t("all")}</option>` + vals.map(v => `<option>${v}</option>`).join("");
    sel.value = filters[a] || "";
    sel.onchange = () => { filters[a] = sel.value; renderTable(); };
    $("#filters").append(sel);
  });
}

function renderTable() {
  const q = $("#q").value.trim().toLowerCase();
  const order = [lang, ...langs.filter(l => l !== lang)];
  $("#table thead").innerHTML = "<tr>" + [t("code"), ...order.map(l => l.toUpperCase()), t("parent"), ...attrs.map(a => a.slice(5))].map(h => `<th>${h}</th>`).join("") + "</tr>";
  const rows = types.filter(r => attrs.every(a => !filters[a] || r[a] === filters[a]))
    .filter(r => !q || [r.code, ...langs.map(l => r["label_" + l])].some(v => (v || "").toLowerCase().includes(q)));
  $("#table tbody").innerHTML = rows.map(r => "<tr>" + [r.code, ...order.map(l => r["label_" + l]), r.parent, ...attrs.map(a => r[a])]
    .map(v => `<td>${esc(v)}</td>`).join("") + "</tr>").join("");
}

const esc = s => String(s || "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

function renderMap() {
  const kids = {};
  plant.forEach(n => (kids[n.parent || ""] ||= []).push(n));
  const build = p => `<ul>${(kids[p] || []).map(n => {
    const has = (kids[n.code] || []).length, o = open.has(n.code);
    return `<li><span class="tg" data-c="${esc(n.code)}">${has ? (o ? "▾" : "▸") : "•"}</span><span class="node"><span class="code">${esc(n.code)}</span>${esc(lab(n))}</span>${has && o ? build(n.code) : ""}</li>`;
  }).join("")}</ul>`;
  $("#mm").innerHTML = build("");
  $("#mm").onclick = e => { const c = e.target.dataset.c; if (c) { open.has(c) ? open.delete(c) : open.add(c); renderMap(); } };
}

function pickLangs() { const v = $("#dl-lang").value; return v === "both" ? langs : [v]; }

function download(kind) {
  const L = pickLangs(), tpl = kind.startsWith("t"), fmt = kind.replace(/^t/, "");
  let head, rows, json;
  if (!tpl) {
    head = ["code", ...L.map(l => "label_" + l), "parent", ...attrs];
    rows = types.map(r => head.map(h => r[h] || ""));
    json = types.map(r => Object.fromEntries(head.map(h => [h, r[h] || ""])));
  } else {
    head = ["code", ...L.map(l => "label_" + l), "parent", "type"];
    rows = plant.map(n => [n.code, ...L.map(l => n.label[l] || ""), n.parent || "", n.type || ""]);
    json = plant.map(n => ({code: n.code, label: Object.fromEntries(L.map(l => [l, n.label[l] || ""])), parent: n.parent || null, type: n.type || null}));
  }
  const name = tpl ? "plant_template" : "types";
  if (fmt === "json") return save(new Blob([JSON.stringify(json, null, 2)], {type: "application/json"}), name + ".json");
  if (fmt === "csv") {
    const csv = [head, ...rows].map(r => r.map(v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(",")).join("\r\n");
    return save(new Blob(["\uFEFF" + csv], {type: "text/csv"}), name + ".csv");
  }
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws["!cols"] = head.map(h => ({wch: h.startsWith("label") ? 40 : 18}));
  ws["!autofilter"] = {ref: ws["!ref"]};
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, name);
  XLSX.writeFile(wb, name + ".xlsx");
}
function save(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); }

async function init() {
  const [c, p] = await Promise.all([fetch("data/types.csv").then(r => r.text()), fetch("data/plant_template.json").then(r => r.json())]);
  const parsed = parseCSV(c);
  types = parsed.rows; cols = parsed.h;
  langs = cols.filter(h => /^label_[a-z]{2,3}$/.test(h)).map(h => h.slice(6));
  langs = ["no", "en", ...langs.filter(l => l !== "no" && l !== "en")];
  attrs = cols.filter(h => h.startsWith("attr_"));
  plant = p;
  plant.filter(n => !n.parent).forEach(n => open.add(n.code));
  document.querySelectorAll("#lang button").forEach(b => b.onclick = () => { lang = b.dataset.l; applyLang(); });
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
    $("#types").hidden = b.dataset.t !== "types"; $("#map").hidden = b.dataset.t !== "map";
    document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("on", x === b));
  });
  $("#tab-types").classList.add("on");
  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => download(b.dataset.f));
  $("#q").oninput = renderTable;
  $("#expand").onclick = () => { plant.forEach(n => open.add(n.code)); renderMap(); };
  $("#collapse").onclick = () => { open.clear(); plant.filter(n => !n.parent).forEach(n => open.add(n.code)); renderMap(); };
  applyLang();
}
init();
})();
