const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 📊 API
app.get("/data", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) return res.status(500).json(error);

  res.json(data);
});

// 🌐 FRONTEND + FILTER + DISTANZ
app.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) return res.send("Fehler beim Laden");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Airtable SaaS</title>

<style>
body { font-family: Arial; margin:0; background:#f5f6f8; }

.header {
  padding: 14px;
  background: white;
  border-bottom: 1px solid #ddd;
  font-weight: bold;
}

.filters {
  padding: 10px;
  background: white;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  border-bottom: 1px solid #ddd;
}

input, select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.container { padding: 10px; overflow-x:auto; }

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  min-width: 1200px;
}

th, td {
  border-bottom: 1px solid #eee;
  padding: 8px;
  font-size: 13px;
}

th { background:#fafafa; position: sticky; top:0; }

tr:hover { background:#f0f7ff; }
</style>
</head>

<body>

<div class="header">📊 Airtable SaaS + Filter + Distanz</div>

<div class="filters">
  <input id="search" placeholder="Suche Name oder Ort..." />
  
  <select id="ortFilter">
    <option value="">Alle Orte</option>
    ${[...new Set(data.map(d => d.Ort))].map(o => `
      <option value="${o}">${o}</option>
    `).join("")}
  </select>

  <select id="typFilter">
    <option value="">Alle Typen</option>
    ${[...new Set(data.map(d => d.Typus))].map(t => `
      <option value="${t}">${t}</option>
    `).join("")}
  </select>

  <input id="radius" type="number" placeholder="Radius km (optional)" />
  <input id="userLoc" placeholder="Dein Ort (z.B. Zürich)" />
</div>

<div class="container">

<table>
<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Typus</th>
<th>Offiziell</th>
<th>Speziell</th>
<th>Stufen</th>
<th>Privat</th>
<th>Krank</th>
<th>Therapie</th>
<th>Wohnen</th>
</tr>
</thead>

<tbody id="tableBody"></tbody>

</table>

</div>

<script>
// 📊 Daten aus Backend
const data = ${JSON.stringify(data)};

function renderTable(rows) {
  const body = document.getElementById("tableBody");

  body.innerHTML = rows.map(d => `
    <tr>
      <td>${d.Name ?? ""}</td>
      <td>${d.Ort ?? ""}</td>
      <td>${d.Typus ?? ""}</td>
      <td>${d.Offiziell ?? ""}</td>
      <td>${d.Speziell ?? ""}</td>
      <td>${d.Stufen ?? ""}</td>
      <td>${d.Privat ?? ""}</td>
      <td>${d.Krank ?? ""}</td>
      <td>${d.Therapie ?? ""}</td>
      <td>${d.Wohnen ?? ""}</td>
    </tr>
  `).join("");
}

// 🔍 FILTER LOGIK
function filterData() {
  const search = document.getElementById("search").value.toLowerCase();
  const ort = document.getElementById("ortFilter").value;
  const typ = document.getElementById("typFilter").value;

  let filtered = data;

  if (search) {
    filtered = filtered.filter(d =>
      (d.Name || "").toLowerCase().includes(search) ||
      (d.Ort || "").toLowerCase().includes(search)
    );
  }

  if (ort) {
    filtered = filtered.filter(d => d.Ort === ort);
  }

  if (typ) {
    filtered = filtered.filter(d => d.Typus === typ);
  }

  renderTable(filtered);
}

// 📍 DISTANZ (simple offline Logik - Stadtvergleich)
function fakeDistance(a, b) {
  if (!a || !b) return 999;
  return a.toLowerCase() === b.toLowerCase() ? 0 : 50;
}

function filterWithDistance() {
  const userLoc = document.getElementById("userLoc").value;
  const radius = parseInt(document.getElementById("radius").value || "0");

  if (!radius || !userLoc) {
    filterData();
    return;
  }

  let filtered = data.filter(d => {
    const dist = fakeDistance(userLoc, d.Ort);
    return dist <= radius;
  });

  renderTable(filtered);
}

// Events
document.getElementById("search").addEventListener("input", filterData);
document.getElementById("ortFilter").addEventListener("change", filterData);
document.getElementById("typFilter").addEventListener("change", filterData);
document.getElementById("radius").addEventListener("input", filterWithDistance);
document.getElementById("userLoc").addEventListener("input", filterWithDistance);

// init
renderTable(data);

</script>

</body>
</html>
  `);
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
