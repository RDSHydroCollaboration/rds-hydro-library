(() => {
const UI = {
  no: {title: "RDS Vannkraft-bibliotek", types: "Typetabell", map: "Kraftverksmal", search: "Søk…", expand: "Åpne alle", collapse: "Lukk alle", both: "Begge", dl: "Last ned språk:", code: "Kode", parent: "Overordnet", all: "Alle", foot: "Kun koder og egne foretrukne termer. Data: CC-BY-4.0, kode: MIT.", choice: "Valg", or: "eller", choiceNote: "Valg: velg én av alternativene under.", select: "Velg en node for å se informasjon.", ebl: "EBL-kode", comment: "Kommentar", type: "Type", draft: "Engelsk term er et utkast som venter på godkjenning.", desc: "Beskrivelse", pfx: "Typekoder starter alltid med %"},
  en: {title: "RDS Hydro Library", types: "Type table", map: "Plant template", search: "Search…", expand: "Expand all", collapse: "Collapse all", both: "Both", dl: "Download language:", code: "Code", parent: "Parent", all: "All", foot: "Codes and our own preferred terms only. Data: CC-BY-4.0, code: MIT.", choice: "Choice", or: "or", choiceNote: "Choice: pick one of the alternatives below.", select: "Select a node to see its information.", ebl: "EBL code", comment: "Comment", type: "Type", draft: "English term is a draft awaiting approval.", desc: "Description", pfx: "Type codes always start with %"}
};
const $ = s => document.querySelector(s);
const nav = (navigator.language || "en").toLowerCase();
let lang = localStorage.getItem("lang") || (/^(no|nb|nn)/.test(nav) ? "no" : "en");
let types = [], cols = [], langs = [], attrs = [], plant = [], filters = {}, hasDesc = false;
const open = new Set(), collapsed = new Set();

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
  $("#tx-expand").textContent = t("expand"); $("#tx-collapse").textContent = t("collapse");
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
  const dom = attrs.includes("attr_domain") ? "attr_domain" : null;
  const rest = attrs.filter(a => a !== dom);
  const head = [...(dom ? [""] : []), `<span class="pfx" title="${esc(t("pfx"))}">%</span>${t("code")}`, ...order.map(l => l.toUpperCase()), ...(hasDesc ? [t("desc")] : []), ...rest.map(a => a.slice(5))];
  $("#table thead").innerHTML = "<tr>" + head.map((h, i) => `<th${dom && i === 0 ? ' class="dom"' : ""}>${h}</th>`).join("") + "</tr>";
  const byCode = Object.fromEntries(types.map(r => [r.code, r]));
  const kids = {};
  types.forEach(r => (kids[byCode[r.parent] ? r.parent : ""] ||= []).push(r));
  const filtering = q || attrs.some(a => filters[a]);
  const hit = new Set();
  if (filtering) {
    types.filter(r => attrs.every(a => !filters[a] || r[a] === filters[a]))
      .filter(r => !q || [r.code, ...langs.map(l => r["label_" + l]), ...langs.map(l => r["desc_" + l])].some(v => (v || "").toLowerCase().includes(q)))
      .forEach(r => { for (let x = r; x; x = byCode[x.parent]) hit.add(x.code); });
  }
  const out = [];
  const walk = (p, depth) => (kids[p] || []).forEach(r => {
    if (filtering && !hit.has(r.code)) return;
    const n = (kids[r.code] || []).length, closed = !filtering && collapsed.has(r.code);
    out.push({r, depth, n, closed});
    if (n && !closed) walk(r.code, depth + 1);
  });
  walk("", 0);
  const tg = (r, n, closed) => n ? `<span class="tg" data-t="${esc(r.code)}">${closed ? "▸" : "▾"}</span>` : `<span class="tg leaf"></span>`;
  $("#table tbody").innerHTML = out.map(({r, depth, n, closed}) =>
    `<tr class="d${Math.min(depth, 3)}${n ? " parent" : ""}">`
    + (dom ? `<td class="dom"><span class="dm dm-${esc(r[dom])}" title="${esc(r[dom])}">${esc(r[dom])}</span></td>` : "")
    + `<td class="code" style="padding-left:${8 + depth * 22}px">${tg(r, n, closed)}<span class="pfx" title="${esc(t("pfx"))}">%</span>${esc(r.code)}</td>`
    + [...order.map(l => r["label_" + l]), ...(hasDesc ? [r["desc_" + lang] || r.desc_en] : []), ...rest.map(a => r[a])]
      .map((v, i) => `<td${i === 0 ? ' class="lbl"' : ""}>${esc(v)}</td>`).join("") + "</tr>").join("");
}

const esc = s => String(s || "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

let selected = null;
const byId = () => Object.fromEntries(plant.map(n => [n.id, n]));

function renderMap() {
  const kids = {};
  plant.forEach(n => (kids[n.parent || ""] ||= []).push(n));
  const build = p => `<ul${(byId()[p] || {}).kind === "choice" ? ' class="alts"' : ""}>${(kids[p] || []).map(n => {
    const has = (kids[n.id] || []).length, o = open.has(n.id), ch = n.kind === "choice";
    const cls = "node" + (ch ? " choice" : "") + (n.id === selected ? " sel" : "");
    const title = ch ? `<span class="code">${t("choice")}</span>` : (n.code ? `<span class="code">${esc(n.code)}</span>` : "");
    return `<li data-or="${t("or")}"><span class="tg" data-c="${esc(n.id)}">${has ? (o ? "▾" : "▸") : "•"}</span><span class="${cls}" data-s="${esc(n.id)}">${title}${esc(lab(n))}</span>${has && o ? build(n.id) : ""}</li>`;
  }).join("")}</ul>`;
  $("#mm").innerHTML = build("");
  $("#mm").onclick = e => {
    const c = e.target.dataset.c, s = e.target.closest("[data-s]");
    if (c) { open.has(c) ? open.delete(c) : open.add(c); renderMap(); }
    else if (s) { selected = s.dataset.s; renderMap(); }
  };
  renderInfo();
}

function renderInfo() {
  const n = byId()[selected], el = $("#info");
  if (!n) { el.innerHTML = `<p class="muted">${t("select")}</p>`; return; }
  const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v).replace(/\n/g, "<br>")}</dd>` : "";
  const names = ["no", "en", ...langs.filter(l => l !== "no" && l !== "en")].filter(l => n.label[l]);
  el.innerHTML = `<h2>${esc(lab(n))}</h2>${n.kind === "choice" ? `<p class="badge">${t("choiceNote")}</p>` : ""}<dl>`
    + row(t("code"), n.code)
    + names.map(l => row(l === lang ? l.toUpperCase() + " ●" : l.toUpperCase(), n.label[l])).join("")
    + row(t("ebl"), n.ebl_code) + row(t("comment"), n.comment) + row(t("type"), n.type)
    + `</dl>` + (n.en_draft ? `<p class="muted">${t("draft")}</p>` : "");
}
function pickLangs() { const v = $("#dl-lang").value; return v === "both" ? langs : [v]; }

function download(kind) {
  const L = pickLangs(), tpl = kind.startsWith("t"), fmt = kind.replace(/^t/, "");
  let head, rows, json;
  if (!tpl) {
    head = ["code", ...L.map(l => "label_" + l), ...L.map(l => "desc_" + l).filter(h => cols.includes(h)), "parent", ...attrs];
    rows = types.map(r => head.map(h => r[h] || ""));
    json = types.map(r => Object.fromEntries(head.map(h => [h, r[h] || ""])));
  } else {
    head = ["id", "code", ...L.map(l => "label_" + l), "parent", "kind", "ebl_code", "type", "comment"];
    rows = plant.map(n => [n.id, n.code, ...L.map(l => n.label[l] || ""), n.parent || "", n.kind || "", n.ebl_code || "", n.type || "", n.comment || ""]);
    json = plant.map(n => ({...n, label: Object.fromEntries(L.map(l => [l, n.label[l] || ""]))}));
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
  hasDesc = cols.some(h => h.startsWith("desc_"));
  plant = p;
  plant.filter(n => !n.parent).forEach(n => open.add(n.id));
  document.querySelectorAll("#lang button").forEach(b => b.onclick = () => { lang = b.dataset.l; applyLang(); });
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
    $("#types").hidden = b.dataset.t !== "types"; $("#map").hidden = b.dataset.t !== "map";
    document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("on", x === b));
  });
  $("#tab-types").classList.add("on");
  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => download(b.dataset.f));
  $("#q").oninput = renderTable;
  $("#table").onclick = e => {
    const c = e.target.dataset.t;
    if (c) { collapsed.has(c) ? collapsed.delete(c) : collapsed.add(c); renderTable(); }
  };
  $("#tx-expand").onclick = () => { collapsed.clear(); renderTable(); };
  $("#tx-collapse").onclick = () => { types.forEach(r => { if (types.some(x => x.parent === r.code)) collapsed.add(r.code); }); renderTable(); };
  $("#expand").onclick = () => { plant.forEach(n => open.add(n.id)); renderMap(); };
  $("#collapse").onclick = () => { open.clear(); plant.filter(n => !n.parent).forEach(n => open.add(n.id)); renderMap(); };
  applyLang();
}
init();
})();
