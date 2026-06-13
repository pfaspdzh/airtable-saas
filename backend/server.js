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

// 🧠 SIMPLE IN-MEMORY CACHE (wichtig gegen OSM limit)
const geoCache = {};

// 🌍 GEOCODING (OpenStreetMap)
async function getCoords(place) {
  if (!place) return null;

  if (geoCache[place]) return geoCache[place];

  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
      encodeURIComponent(place),
      {
        headers: {
          "User-Agent": "saas-app"
        }
      }
    );

    const json = await res.json();

    if (!json || !json[0]) return null;

    const coords = {
      lat: parseFloat(json[0].lat),
      lon: parseFloat(json[0].lon)
    };

    geoCache[place] = coords;

    return coords;

  } catch (e) {
    return null;
  }
}

// 📏 DISTANZ (Haversine)
function distanceKm(a, b) {
  const R = 6371;

  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// 🌐 FRONTEND
app.get("/", async (req, res) => {

  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) return res.send("Fehler beim Laden");

  const cities = [...new Set(data.map(d => d.Ort).filter(Boolean))];

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SaaS Distance Sort</title>

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

input, select, button {
  padding:8px;
  border:1px solid #ccc;
  border-radius:6px;
}

.container { padding:10px; overflow-x:auto; }

table {
  width:100%;
  min-width:900px;
  border-collapse:collapse;
  background:white;
}

th, td {
  padding:8px;
  border-bottom:1px solid #eee;
  font-size:13px;
}

th { background:#fafafa; }

tr:hover { background:#f0f7ff; }
</style>

</head>

<body>

<div class="header">📍 SaaS – Echte Distanz Sortierung</div>

<div class="filters">

<input id="userLoc" placeholder="Ort eingeben (z.B. Zürich)" />

<select id="suggest">
  <option value="">Vorschlag</option>
  ${cities.map(c => `<option value="${c}">${c}</option>`).join("")}
</select>

<button onclick="sortByDistance()">Sortieren</button>

</div>

<div class="container">

<table>
<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Typus</th>
<th>Distanz (km)</th>
</tr>
</thead>

<tbody id="body"></tbody>

</table>

</div>

<script>

const data = ${JSON.stringify(data)};

let cache = {};

async function getCoords(place) {
  if (!place) return null;

  if (cache[place]) return cache[place];

  try {
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

  } catch (e) {
    return null;
  }
}

function distanceKm(a, b) {
  const R = 6371;

  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function render(rows) {

  let html = "";

  rows.forEach(r => {
    html += "<tr>" +
      "<td>" + (r.Name || "") + "</td>" +
      "<td>" + (r.Ort || "") + "</td>" +
      "<td>" + (r.Typus || "") + "</td>" +
      "<td>" + (r.dist ? r.dist.toFixed(1) : "-") + "</td>" +
      "</tr>";
  });

  document.getElementById("body").innerHTML = html;
}

async function sortByDistance() {

  const place =
    document.getElementById("userLoc").value ||
    document.getElementById("suggest").value;

  if (!place) {
    render(data);
    return;
  }

  const user = await getCoords(place);

  if (!user) {
    alert("Ort nicht gefunden");
    return;
  }

  const enriched = [];

  for (const d of data) {

    let dist = 999999;

    const target = await getCoords(d.Ort);

    if (target) {
      dist = distanceKm(user, target);
    }

    enriched.push({ ...d, dist });
  }

  enriched.sort((a, b) => a.dist - b.dist);

  render(enriched);
}

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
