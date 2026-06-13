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

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Airtable SaaS</title>

<style>
body { font-family: Arial; margin:0; background:#f5f6f8; }

.header {
  padding: 12px;
  background:white;
  font-weight:bold;
  border-bottom:1px solid #ddd;
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
  min-width:1100px;
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

<div class="header">📊 Airtable SaaS + Echte OSM Distanz</div>

<div class="filters">
  <input id="search" placeholder="Suche..." />
  <input id="userLoc" placeholder="Dein Ort (z.B. Zürich)" />
  <input id="radius" type="number" placeholder="Radius km" />
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
  if (cache[place]) return cache[place];

  const url = \`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(place)}\`;

  const res = await fetch(url);
  const json = await res.json();

  if (!json[0]) return null;

  const coords = {
    lat: parseFloat(json[0].lat),
    lon: parseFloat(json[0].lon)
  };

  cache[place] = coords;
  return coords;
}

// 📏 Haversine Formel (echte Distanz)
function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;

  const x =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(a.lat * Math.PI/180) *
    Math.cos(b.lat * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));

  return R * c;
}

// 🧠 Render Tabelle
async function render() {
  const userLoc = document.getElementById("userLoc").value;
  const radius = parseFloat(document.getElementById("radius").value || "0");

  let userCoords = null;

  if (userLoc) {
    userCoords = await getCoords(userLoc);
  }

  const rows = await Promise.all(data.map(async d => {
    let dist = "-";

    if (userCoords && d.Ort) {
      const target = await getCoords(d.Ort);

      if (target) {
        dist = distanceKm(userCoords, target).toFixed(1);
      }
    }

    if (radius && dist !== "-" && parseFloat(dist) > radius) {
      return null;
    }

    return \`
      <tr>
        <td>\${d.Name || ""}</td>
        <td>\${d.Ort || ""}</td>
        <td>\${d.Typus || ""}</td>
        <td>\${d.Stufen || ""}</td>
        <td>\${dist}</td>
      </tr>
    \`;
  }));

  document.getElementById("body").innerHTML =
    rows.filter(Boolean).join("");
}

// Events
document.getElementById("userLoc").addEventListener("input", render);
document.getElementById("radius").addEventListener("input", render);

// init
render();

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
