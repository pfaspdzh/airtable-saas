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

// 🌐 FRONTEND
app.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) return res.send("Fehler");

  const uniqueCities = [...new Set(data.map(d => d.Ort).filter(Boolean))];

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Airtable SaaS</title>

<style>
body { font-family: Arial; margin:0; background:#f5f6f8; }

.header {
  padding:12px;
  background:white;
  border-bottom:1px solid #ddd;
  font-weight:bold;
}

.filters {
  padding:10px;
  background:white;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  border-bottom:1px solid #ddd;
}

input, select {
  padding:8px;
  border:1px solid #ccc;
  border-radius:6px;
}

.container { padding:10px; overflow-x:auto; }

table {
  width:100%;
  min-width:1000px;
  border-collapse:collapse;
  background:white;
}

th, td {
  padding:8px;
  border-bottom:1px solid #eee;
  font-size:13px;
}

th { background:#fafafa; position:sticky; top:0; }

tr:hover { background:#f0f7ff; }
</style>
</head>

<body>

<div class="header">📊 SaaS – Sortierung nach Nähe + freie Orte</div>

<div class="filters">

  <!-- 🎯 freier Ort (wichtig!) -->
  <input id="userLoc" placeholder="Ort eingeben (z.B. Zürich, Paris, Berlin)" />

  <!-- 📍 Dropdown nur als Hilfe -->
  <select id="suggest">
    <option value="">oder Vorschlag wählen</option>
    ${uniqueCities.map(c => `<option value="${c}">${c}</option>`).join("")}
  </select>

  <button onclick="sortByDistance()">Nach Nähe sortieren</button>

</div>

<div class="container">

<table>
<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Typus</th>
<th>Stufen</th>
<th>Distanz (km)</th>
</tr>
</thead>

<tbody id="body"></tbody>
</table>

</div>

<script>
const data = ${JSON.stringify(data)};

let cache = {};

// 🌍 OpenStreetMap Geocoding
async function getCoords(place) {
  if (!place) return null;
  if (cache[place]) return cache[place];

  const res = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&q=" +
    encodeURIComponent(place)
  );

  const json = await res.json();
  if (!json[0]) return null;

  const coords = {
    lat: parseFloat(json[0].lat),
    lon: parseFloat(json[0].lon)
  };

  cache[place] = coords;
  return coords;
}

// 📏 Distanz (Haversine)
function distanceKm(a, b) {
  const R = 6371;

  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;

  const x =
    Math.sin(dLat/2) ** 2 +
    Math.cos(a.lat * Math.PI/180) *
    Math.cos(b.lat * Math.PI/180) *
    Math.sin(dLon/2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

// 🎯 SORTIERUNG NACH NÄHE
async function sortByDistance() {

  const input = document.getElementById("userLoc").value;
  const select = document.getElementById("suggest").value;

  const place = input || select;

  if (!place) {
    render(data);
    return;
  }

  const user = await getCoords(place);
  if (!user) {
    alert("Ort nicht gefunden");
    return;
  }

  const enriched = await Promise.all(
    data.map(async d => {
      const target = await getCoords(d.Ort);
      let dist = 999999;

      if (target) {
        dist = distanceKm(user, target);
      }

      return { ...d, dist };
    })
  );

  enriched.sort((a,b) => a.dist - b.dist);

  render(enriched);
}

// 🧾 RENDER
function render(rows) {
  document.getElementById("body").innerHTML = rows.map(d => `
    <tr>
      <td>${d.Name || ""}</td>
      <td>${d.Ort || ""}</td>
      <td>${d.Typus || ""}</td>
      <td>${d.Stufen || ""}</td>
      <td>${d.dist ? d.dist.toFixed(1) : "-"}</td>
    </tr>
  `).join("");
}

// INIT
render(data);

document.getElementById("suggest").addEventListener("change", e => {
  document.getElementById("userLoc").value = e.target.value;
});

</script>

</body>
</html>
  `);
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf", PORT);
});
