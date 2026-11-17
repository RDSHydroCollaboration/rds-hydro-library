(() => {
const S = {
  no: {edit: "Rediger", exit: "Avslutt redigering", bar: "Redigeringsmodus", changes: "endringer", none: "ingen endringer ennå",
    submit: "Send til gjennomgang", exp: "Eksporter filer", discard: "Forkast utkast", add: "Legg til", addChild: "Ny underordnet", del: "Slett", ed: "Rediger",
    addRoot: "Ny kode", save: "Lagre", cancel: "Avbryt", code: "Kode", parent: "Overordnet", root: "(ingen – toppnivå)", choice: "Valg-node (velg én av alternativene under)",
    ebl: "EBL-kode", comment: "Kommentar", type: "Type", desc: "Beskrivelse", label: "Term", errCode: "Kode mangler eller har mellomrom.", errDup: "Koden finnes allerede.",
    errLab: "Både norsk og engelsk term må fylles ut.", confirmDel: "Slette %n oppføring(er) inkludert underordnede?", confirmDiscard: "Forkaste alle endringer i utkastet?",
    guide: "Endringene lagres kun i nettleseren din til du sender dem til gjennomgang. Etter gjennomgang av vedlikeholdere blir de en del av biblioteket.",
    howto: "Filene er lastet ned. Dra dem inn i dette innlegget før du sender. Vedlikeholdere gjennomgår koder og oversettelser.", add_: "Lagt til", chg_: "Endret", rm_: "Fjernet", types: "Typetabell", tpl: "Kraftverksmal"},
  en: {edit: "Edit", exit: "Exit edit mode", bar: "Edit mode", changes: "changes", none: "no changes yet",
    submit: "Submit for review", exp: "Export files", discard: "Discard draft", add: "Add", addChild: "Add child", del: "Delete", ed: "Edit",
    addRoot: "New code", save: "Save", cancel: "Cancel", code: "Code", parent: "Parent", root: "(none – top level)", choice: "Choice node (pick one of the alternatives below)",
    ebl: "EBL code", comment: "Comment", type: "Type", desc: "Description", label: "Term", errCode: "Code is missing or contains spaces.", errDup: "This code already exists.",
    errLab: "Both Norwegian and English terms are required.", confirmDel: "Delete %n entr(y/ies) including children?", confirmDiscard: "Discard all changes in the draft?",
    guide: "Changes are kept in your browser only until you submit them for review. Once the maintainers approve, they become part of the library.",
    howto: "The files have been downloaded. Drag them into this issue before submitting. Maintainers review codes and translations.", add_: "Added", chg_: "Changed", rm_: "Removed", types: "Type table", tpl: "Plant template"}
};
const REPO = "RDSHydroCollaboration/rds-hydro-library";
const KEY = "rds_draft";
const $ = s => document.querySelector(s);
const A = () => window.RDSApp;
const T = k => S[A().lang][k];
const esc = s => A().esc(s);
const clone = o => JSON.parse(JSON.stringify(o));
let base = null;

const E = window.RDSEdit = {
  on: false,
  rowActions(k) {
    const inTypes = !$("#types").hidden;
    return `<button class="ib" data-ea="edit" data-k="${esc(k)}" title="${T("ed")}">✎</button>`
      + `<button class="ib" data-ea="add" data-k="${esc(k)}" title="${T("addChild")}">＋</button>`
      + `<button class="ib danger" data-ea="del" data-k="${esc(k)}" title="${T("del")}">🗑</button>`;
  },
  relabel() {
    if (!base) return;
    $("#edit-toggle .l").textContent = E.on ? T("exit") : T("edit");
    bar();
  }
};

const isTypes = () => !$("#types").hidden;
const dataset = () => (isTypes() ? A().types : A().plant);
const keyOf = n => (isTypes() ? n.code : n.id);

function save() { localStorage.setItem(KEY, JSON.stringify({types: A().types, plant: A().plant})); }

function diff() {
  const out = [];
  [["types", "code", T("types")], ["plant", "id", T("tpl")]].forEach(([k, id, name]) => {
    const b = Object.fromEntries(base[k].map(r => [r[id], r])), c = Object.fromEntries(A()[k].map(r => [r[id], r]));
    Object.keys(c).forEach(x => { if (!b[x]) out.push({m: "+", name, key: x, row: c[x]}); else if (JSON.stringify(b[x]) !== JSON.stringify(c[x])) out.push({m: "~", name, key: x, row: c[x]}); });
    Object.keys(b).forEach(x => { if (!c[x]) out.push({m: "-", name, key: x, row: b[x]}); });
  });
  return out;
}

function bar() {
  const el = $("#editbar");
  el.hidden = !E.on;
  if (!E.on) return;
  const n = diff().length;
  el.innerHTML = `<b>✎ ${T("bar")}</b><span class="muted">${T("guide")}</span><span class="cnt">${n ? n + " " + T("changes") : T("none")}</span>`
    + `<button id="eb-add">＋ ${T("addRoot")}</button><button id="eb-sub" ${n ? "" : "disabled"}>${T("submit")}</button>`
    + `<button id="eb-exp" ${n ? "" : "disabled"}>${T("exp")}</button><button id="eb-dis" ${n ? "" : "disabled"}>${T("discard")}</button>`;
  $("#eb-add").onclick = () => openForm(null, "");
  $("#eb-sub").onclick = submit;
  $("#eb-exp").onclick = exportFiles;
  $("#eb-dis").onclick = () => { if (confirm(T("confirmDiscard"))) { A().set(clone(base.types), clone(base.plant)); localStorage.removeItem(KEY); A().refresh(); bar(); } };
}

function toggle() {
  E.on = !E.on;
  document.body.classList.toggle("editing", E.on);
  if (E.on) {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    A().set(d ? d.types : clone(base.types), d ? d.plant : clone(base.plant));
  } else {
    save();
    A().set(clone(base.types), clone(base.plant));
  }
  A().refresh(); E.relabel();
}

function descendants(rows, idKey, root) {
  const out = new Set([root]); let grew = true;
  while (grew) { grew = false; rows.forEach(r => { if (r.parent && out.has(r.parent) && !out.has(r[idKey])) { out.add(r[idKey]); grew = true; } }); }
  return out;
}

function openForm(key, parentKey) {
  const types = isTypes(), rows = dataset(), idKey = types ? "code" : "id", langs = A().langs;
  const cur = key ? rows.find(r => r[idKey] === key) : null;
  const v = f => (cur ? (f.startsWith("label_") && !types ? cur.label[f.slice(6)] : types ? cur[f] : cur[f]) : "") || "";
  const banned = cur ? descendants(rows, idKey, key) : new Set();
  const opts = rows.filter(r => !banned.has(r[idKey])).map(r => {
    const name = types ? "%" + r.code + " – " + (r.label_no || r.label_en) : (r.code || "") + " " + (r.label.no || "") + "  [" + r.id + "]";
    return `<option value="${esc(r[idKey])}"${(cur ? cur.parent : parentKey) === r[idKey] ? " selected" : ""}>${esc(name)}</option>`;
  }).join("");
  const field = (id, lbl, val, extra = "") => `<label>${lbl}<input id="f-${id}" value="${esc(val)}" ${extra}></label>`;
  let html = `<h3>${cur ? T("ed") : T("add")} – ${types ? T("types") : T("tpl")}</h3>`;
  html += `<label>${T("parent")}<select id="f-parent"><option value="">${T("root")}</option>${opts}</select></label>`;
  if (types) html += field("code", `<span class="pfx">%</span>${T("code")}`, v("code"), cur ? "" : "");
  else html += field("code", T("code"), v("code"));
  langs.forEach(l => { html += field("label_" + l, `${T("label")} ${l.toUpperCase()}${l === "no" || l === "en" ? " *" : ""}`, types ? v("label_" + l) : (cur ? cur.label[l] || "" : "")); });
  if (types) {
    if (A().hasDesc) langs.forEach(l => { if (A().cols.includes("desc_" + l)) html += `<label>${T("desc")} ${l.toUpperCase()}<textarea id="f-desc_${l}" rows="2">${esc(v("desc_" + l))}</textarea></label>`; });
    A().attrs.filter(a => a !== "attr_no_draft").forEach(a => {
      const vals = [...new Set(A().types.map(r => r[a]).filter(Boolean))].sort();
      html += `<label>${a.slice(5)}<input id="f-${a}" list="dl-${a}" value="${esc(cur ? v(a) : ((rows.find(r => r[idKey] === parentKey) || {})[a] || ""))}"><datalist id="dl-${a}">${vals.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>`;
    });
  } else {
    html += `<label class="chk"><input type="checkbox" id="f-choice" ${cur && cur.kind === "choice" ? "checked" : ""}> ${T("choice")}</label>`;
    html += field("ebl_code", T("ebl"), v("ebl_code")) + field("type", T("type"), v("type"));
    html += `<label>${T("comment")}<textarea id="f-comment" rows="3">${esc(v("comment"))}</textarea></label>`;
  }
  html += `<p class="err" id="f-err"></p><div class="btns"><button id="f-save" class="primary">${T("save")}</button><button id="f-cancel">${T("cancel")}</button></div>`;
  const dlg = $("#editdlg"); dlg.innerHTML = `<form method="dialog" onsubmit="return false">${html}</form>`;
  dlg.showModal();
  $("#f-cancel").onclick = () => dlg.close();
  $("#f-save").onclick = () => {
    const g = id => ($("#f-" + id).value || "").trim(), err = m => { $("#f-err").textContent = m; };
    const choice = !types && $("#f-choice").checked;
    let code = g("code"); if (types) code = code.replace(/^%+/, "");
    if (/\s/.test(code) || (!code && (types || !choice))) return err(T("errCode"));
    if (!g("label_no") || !g("label_en")) return err(T("errLab"));
    if (types && rows.some(r => r.code === code && r !== cur)) return err(T("errDup"));
    const parent = g("parent") || (types ? "" : null);
    let row;
    if (types) {
      row = cur || Object.fromEntries(A().cols.map(c => [c, ""]));
      const oldCode = cur && cur.code;
      Object.assign(row, {code, parent: parent || ""});
      langs.forEach(l => { row["label_" + l] = g("label_" + l); });
      if (A().hasDesc) langs.forEach(l => { if (A().cols.includes("desc_" + l)) row["desc_" + l] = g("desc_" + l); });
      A().attrs.filter(a => a !== "attr_no_draft").forEach(a => { row[a] = g(a); });
      if (A().cols.includes("attr_no_draft") && (!cur || cur.label_no !== g("label_no"))) row.attr_no_draft = "false";
      if (!cur) A().types.push(row);
      else if (oldCode !== code) A().types.forEach(r => { if (r.parent === oldCode) r.parent = code; });
    } else {
      row = cur || {id: newId(parent, code || "VALG"), code: "", label: {}, parent};
      row.code = choice ? "" : code; row.parent = parent;
      const enChanged = cur && cur.label.en !== g("label_en");
      langs.forEach(l => { const x = g("label_" + l); if (x) row.label[l] = x; else delete row.label[l]; });
      if (!cur || enChanged) delete row.en_draft;
      ["ebl_code", "type", "comment"].forEach(f => { const x = g(f); if (x) row[f] = x; else delete row[f]; });
      if (choice) row.kind = "choice"; else delete row.kind;
      if (!cur) A().plant.push(row);
      if (parent) A().open.add(parent);
    }
    if (parent) A().collapsed.delete(parent);
    save(); dlg.close(); A().refresh(); bar();
  };
}

function newId(parent, base0) {
  const ids = new Set(A().plant.map(n => n.id)), b = (parent ? parent + "/" : "") + base0;
  let id = b, i = 2; while (ids.has(id)) id = b + "-" + i++;
  return id;
}

function del(key) {
  const types = isTypes(), idKey = types ? "code" : "id", rows = dataset();
  const set = descendants(rows, idKey, key);
  if (!confirm(T("confirmDel").replace("%n", set.size))) return;
  const keep = rows.filter(r => !set.has(r[idKey]));
  types ? A().set(keep, A().plant) : A().set(A().types, keep);
  if (A().selected && set.has(A().selected)) A().select(null);
  save(); A().refresh(); bar();
}

function csvText() {
  const q = v => (/[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
  return [A().cols, ...A().types.map(r => A().cols.map(c => r[c] || ""))].map(r => r.map(q).join(",")).join("\n") + "\n";
}
function dl(text, name, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function exportFiles() {
  const d = diff();
  if (d.some(x => x.name === T("types"))) dl(csvText(), "types.csv", "text/csv");
  if (d.some(x => x.name === T("tpl"))) setTimeout(() => dl(JSON.stringify(A().plant, null, 1) + "\n", "plant_template.json", "application/json"), 300);
}

function submit() {
  const d = diff(), sym = {"+": T("add_"), "~": T("chg_"), "-": T("rm_")};
  const line = x => `- ${sym[x.m]} (${x.name}): \`${x.key}\` – ${x.row.label_no || (x.row.label && x.row.label.no) || ""} / ${x.row.label_en || (x.row.label && x.row.label.en) || ""}`;
  let body = "## Proposed changes\n\n" + d.map(line).join("\n");
  if (body.length > 5500) body = body.slice(0, 5500) + "\n- …";
  body += "\n\n---\n" + T("howto") + "\n\nSource: edit mode on the library site.";
  exportFiles();
  window.open(`https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Suggested changes (" + d.length + ")")}&body=${encodeURIComponent(body)}`, "_blank");
}

document.addEventListener("rds-ready", () => {
  base = {types: clone(A().types), plant: clone(A().plant)};
  document.body.insertAdjacentHTML("beforeend", `<dialog id="editdlg"></dialog>`);
  $("header").insertAdjacentHTML("afterend", `<div id="editbar" class="editbar" hidden></div>`);
  $("#lang").insertAdjacentHTML("beforebegin", `<button id="edit-toggle" class="edit-toggle"><svg class="ic"><use href="#i-edit"/></svg><span class="l"></span></button>`);
  $("#edit-toggle").onclick = toggle;
  const onClick = e => {
    const b = e.target.closest("[data-ea]"); if (!b) return;
    const k = b.dataset.k;
    if (b.dataset.ea === "edit") openForm(k, "");
    else if (b.dataset.ea === "add") openForm(null, k);
    else del(k);
  };
  $("#table").addEventListener("click", onClick);
  $("#info").addEventListener("click", onClick);
  E.relabel();
});
})();
