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

// 📊 DATA
app.get("/data", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) return res.status(500).json(error);

  res.json(data);
});

// 🧠 CACHE
const cache = {};

// 🌍 GEOCODING (2 SOURCES)
async function getCoords(place) {
  if (!place) return null;
  if (cache[place]) return cache[place];

  // 1️⃣ OPENSTREETMAP
  try {
    let res = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
      encodeURIComponent(place),
      {
        headers: { "User-Agent": "saas-app" }
      }
    );

    let json = await res.json();

    if (json?.[0]) {
      const coords = {
        lat: parseFloat(json[0].lat),
        lon: parseFloat(json[0].lon)
      };
      cache[place] = coords;
      return coords;
    }
  } catch (e) {}

  // 2️⃣ FALLBACK (wichtig!)
  try {
    let res = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(place)
    );

    let json = await res.json();

    if (json?.results?.[0]) {
      const coords = {
        lat: json.results[0].latitude,
        lon: json.results[0].longitude
      };
      cache[place] = coords;
      return coords;
    }
  } catch (e) {}

  return null;
}

// 📏 DISTANCE
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

  const { data } = await supabase
    .from("projects")
    .select("*");

  const cities = [...new Set(data.map(d => d.Ort).filter(Boolean))];

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SaaS Distance</title>

<style>
body{font-family:Arial;margin:0;background:#f5f6f8}
.header{padding:12px;background:#fff;border-bottom:1px solid #ddd}
.filters{padding:10px;background:#fff;display:flex;gap:10px;flex-wrap:wrap}
input,select,button{padding:8px}
table{width:100%;background:#fff;border-collapse:collapse}
td,th{padding:8px;border-bottom:1px solid #eee}
th{background:#fafafa}
</style>
</head>

<body>

<div class="header">📍 SaaS – stabile Distanzsuche</div>

<div class="filters">
<input id="loc" placeholder="Ort (z.B. Zürich, Berlin, Paris)" />
<select id="s">
<option value="">Vorschläge</option>
${cities.map(c => `<option value="${c}">${c}</option>`).join("")}
</select>
<button onclick="run()">Sortieren</button>
</div>

<table>
<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Distanz</th>
</tr>
</thead>
<tbody id="t"></tbody>
</table>

<script>

const data = ${JSON.stringify(data)};
const cache = {};

async function getCoords(place){

  if(cache[place]) return cache[place];

  try{
    let r = await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(place));
    let j = await r.json();

    if(j?.results?.[0]){
      let c = {
        lat:j.results[0].latitude,
        lon:j.results[0].longitude
      };
      cache[place]=c;
      return c;
    }
  }catch(e){}

  return null;
}

function dist(a,b){
  const R=6371;
  const dLat=(b.lat-a.lat)*Math.PI/180;
  const dLon=(b.lon-a.lon)*Math.PI/180;

  const x=Math.sin(dLat/2)**2+
    Math.cos(a.lat*Math.PI/180)*
    Math.cos(b.lat*Math.PI/180)*
    Math.sin(dLon/2)**2;

  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function render(rows){
  document.getElementById("t").innerHTML =
    rows.map(r=>
      "<tr><td>"+r.Name+"</td><td>"+r.Ort+"</td><td>"+(r.d? r.d.toFixed(1):"-")+"</td></tr>"
    ).join("");
}

async function run(){

  const place =
    document.getElementById("loc").value ||
    document.getElementById("s").value;

  const user = await getCoords(place);

  if(!user){
    alert("Ort nicht gefunden (versuch: Zürich, Zurich, Switzerland)");
    return;
  }

  let arr = [];

  for(let r of data){

    let target = await getCoords(r.Ort);

    let d = 999999;

    if(target){
      d = dist(user,target);
    }

    arr.push({...r,d});

  }

  arr.sort((a,b)=>a.d-b.d);

  render(arr);
}

render(data);

document.getElementById("s").onchange=(e)=>{
  document.getElementById("loc").value=e.target.value;
};

</script>

</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
