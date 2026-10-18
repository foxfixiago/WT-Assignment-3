"use strict";
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const CATEGORIES = ["Food", "Travel", "Study", "Bills", "Other"];

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------- Storage: JSON file holding an array ---------- */
function readData() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function writeData(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Server-side validation ---------- */
function validate(data) {
  const errors = {};
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { _form: "Expense must be a JSON object." };
  }
  const title = String(data.title ?? "").trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length < 3) errors.title = "Title must be at least 3 characters.";
  else if (title.length > 50) errors.title = "Title must be 50 characters or fewer.";
  else if (!/^[\w\s.,&'()\-]+$/.test(title)) errors.title = "Title has invalid characters.";

  const raw = String(data.amount ?? "").trim();
  if (raw === "") errors.amount = "Amount is required.";
  else if (isNaN(Number(raw))) errors.amount = "Amount must be a number.";
  else if (Number(raw) <= 0) errors.amount = "Amount must be greater than 0.";
  else if (Number(raw) > 1000000) errors.amount = "Amount cannot exceed ₹10,00,000.";
  else if (!/^\d+(\.\d{1,2})?$/.test(raw)) errors.amount = "Use at most 2 decimal places.";

  if (!CATEGORIES.includes(data.category)) errors.category = "Please select a valid category.";

  const date = String(data.date ?? "");
  if (!date) errors.date = "Date is required.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) errors.date = "Date is not valid.";
  else if (date > today()) errors.date = "Date cannot be in the future.";

  return errors;
}
const clean = d => ({ id: newId(), title: String(d.title).trim(), amount: Number(d.amount), category: d.category, date: d.date });

/* ---------- API routes ---------- */
app.get("/api/expenses", (req, res) => res.json(readData()));

app.post("/api/expenses", (req, res) => {
  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  const list = readData();
  const item = clean(req.body);
  list.push(item);
  writeData(list);
  res.status(201).json(item);
});

app.post("/api/expenses/import", (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ errors: { _form: "JSON must be an array of expenses." } });
  for (let i = 0; i < req.body.length; i++) {
    const errs = Object.values(validate(req.body[i]));
    if (errs.length) return res.status(400).json({ errors: { _form: `Record ${i + 1}: ${errs[0]} Nothing was imported.` } });
  }
  const list = readData().concat(req.body.map(clean));
  writeData(list);
  res.status(201).json({ imported: req.body.length });
});

app.delete("/api/expenses/:id", (req, res) => {
  const list = readData();
  const next = list.filter(e => e.id !== req.params.id);
  if (next.length === list.length) return res.status(404).json({ errors: { _form: "Expense not found." } });
  writeData(next);
  res.json({ deleted: req.params.id });
});

app.delete("/api/expenses", (req, res) => { writeData([]); res.json({ cleared: true }); });

/* ---------- Error handling: malformed JSON, unknown routes ---------- */
app.use("/api", (req, res) => res.status(404).json({ errors: { _form: "Route not found." } }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ errors: { _form: "Malformed JSON in request body." } });
  console.error(err);
  res.status(500).json({ errors: { _form: "Internal server error." } });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
