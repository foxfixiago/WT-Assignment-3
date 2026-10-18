"use strict";

/* Client only sends raw input and displays what the SERVER says.
   All validation happens in server.js. */
let expenses = [];
const $ = id => document.getElementById(id);
const fmt = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);

async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function refresh() {
  try {
    const r = await api("/api/expenses");
    expenses = r.ok ? r.data : [];
  } catch { banner("Cannot reach the server.", false); }
  render();
}

function showErrors(errors = {}) {
  ["title", "amount", "category", "date"].forEach(f => {
    $("e-" + f).textContent = errors[f] || "";
    $(f).classList.toggle("bad", Boolean(errors[f]));
  });
}
function banner(msg, ok) {
  const b = $("banner");
  b.textContent = msg;
  b.className = ok ? "ok" : "fail";
  setTimeout(() => (b.className = ""), 3500);
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const cat = $("filter").value;
  const [key, dir] = $("sort").value.split("-");

  const visible = expenses
    .filter(e => (!cat || e.category === cat) && e.title.toLowerCase().includes(q))
    .sort((a, b) => {
      const r = key === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return dir === "asc" ? r : -r;
    });

  $("tbody").innerHTML = visible.map(e => `
    <tr>
      <td>${escapeHtml(e.title)}</td><td>${e.category}</td><td>${e.date}</td>
      <td class="amt">${fmt(e.amount)}</td>
      <td><button class="del" data-id="${e.id}" aria-label="Delete ${escapeHtml(e.title)}">Delete</button></td>
    </tr>`).join("");
  $("empty").hidden = visible.length > 0;

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = expenses.reduce((a, e) => ((a[e.category] = (a[e.category] || 0) + e.amount), a), {});
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  $("s-total").textContent = fmt(total);
  $("s-count").textContent = expenses.length;
  $("s-top").textContent = top ? top[0] : "–";
  $("json").textContent = JSON.stringify(expenses, null, 2);
}

$("form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const payload = { title: $("title").value, amount: $("amount").value, category: $("category").value, date: $("date").value };
  try {
    const { ok, data } = await api("/api/expenses", "POST", payload);
    if (!ok) {
      showErrors(data.errors);
      banner("Server rejected the data. Fix the highlighted fields.", false);
      return;
    }
    showErrors();
    ev.target.reset(); $("date").value = today();
    banner("Expense saved on the server.", true);
    refresh();
  } catch { banner("Cannot reach the server.", false); }
});

$("tbody").addEventListener("click", async ev => {
  const id = ev.target.dataset.id;
  if (!id) return;
  await api("/api/expenses/" + id, "DELETE");
  refresh();
});
["search", "filter", "sort"].forEach(id => $(id).addEventListener("input", render));

$("copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(expenses, null, 2)); banner("JSON copied.", true); }
  catch { banner("Copy blocked by the browser.", false); }
});
$("download").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" }));
  Object.assign(document.createElement("a"), { href: url, download: "expenses.json" }).click();
  URL.revokeObjectURL(url);
});
$("clear").addEventListener("click", async () => {
  if (expenses.length && confirm("Delete all expenses?")) { await api("/api/expenses", "DELETE"); refresh(); }
});

$("importBtn").addEventListener("click", async () => {
  const out = $("e-import");
  const text = $("import").value.trim();
  if (!text) { out.textContent = "Paste a JSON array first."; return; }
  let list;
  try { list = JSON.parse(text); } catch (e) { out.textContent = "Invalid JSON: " + e.message; return; }
  const { ok, data } = await api("/api/expenses/import", "POST", list);   // server validates every record
  if (!ok) { out.textContent = data.errors?._form || "Import failed."; return; }
  out.textContent = ""; $("import").value = "";
  banner(`${data.imported} expense(s) imported.`, true);
  refresh();
});

$("date").value = today();
$("date").max = today();
refresh();
