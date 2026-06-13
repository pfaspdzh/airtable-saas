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

// 🧠 Cache
const cache = {};

// 🌍 Geocoding (Open-Meteo – stabil & kein Blocking)
async function getCoords(place) {
  if (!place) return null;
  if (cache[place]) return cache[place];

  try {
    const res = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(place)
    );

    const json = await res.json();

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

// 📏 Distanz
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

// 🧠 Wikipedia Gemeinden (fix eingebaut – keine API nötig)
const ZUERICH_GEMEINDEN = [
  "Adliswil",
  "Aesch (ZH)",
  "Aeugst am Albis",
  "Affoltern am Albis",
  "Altikon",
  "Andelfingen",
  "Bachenbülach",
  "Bachs",
  "Bäretswil",
  "Bassersdorf",
  "Bauma",
  "Benken (ZH)",
  "Berg am Irchel",
  "Birmensdorf (ZH)",
  "Bonstetten",
  "Boppelsen",
  "Brütten",
  "Bubikon",
  "Buch am Irchel",
  "Buchs (ZH)",
  "Bülach",
  "Dachsen",
  "Dägerlen",
  "Dällikon",
  "Dänikon",
  "Dättlikon",
  "Dielsdorf",
  "Dietikon",
  "Dietlikon",
  "Dinhard",
  "Dorf",
  "Dübendorf",
  "Dürnten",
  "Egg",
  "Eglisau",
  "Elgg",
  "Ellikon an der Thur",
  "Elsau",
  "Embrach",
  "Erlenbach (ZH)",
  "Fällanden",
  "Fehraltorf",
  "Feuerthalen",
  "Fischenthal",
  "Flaach",
  "Flurlingen",
  "Freienstein-Teufen",
  "Geroldswil",
  "Glattfelden",
  "Gossau (ZH)",
  "Greifensee",
  "Grüningen",
  "Hagenbuch",
  "Hausen am Albis",
  "Hedingen",
  "Henggart",
  "Herrliberg",
  "Hettlingen",
  "Hinwil",
  "Hittnau",
  "Hochfelden",
  "Hombrechtikon",
  "Horgen",
  "Höri",
  "Hüntwangen",
  "Hüttikon",
  "Illnau-Effretikon",
  "Kappel am Albis",
  "Kilchberg (ZH)",
  "Kleinandelfingen",
  "Kloten",
  "Knonau",
  "Küsnacht",
  "Langnau am Albis",
  "Laufen-Uhwiesen",
  "Lindau",
  "Lufingen",
  "Männedorf",
  "Marthalen",
  "Maschwanden",
  "Maur",
  "Meilen",
  "Mettmenstetten",
  "Mönchaltorf",
  "Neerach",
  "Neftenbach",
  "Niederglatt",
  "Niederhasli",
  "Niederweningen",
  "Nürensdorf",
  "Oberembrach",
  "Oberengstringen",
  "Oberglatt",
  "Oberrieden",
  "Oberweningen",
  "Obfelden",
  "Oetwil am See",
  "Oetwil an der Limmat",
  "Opfikon",
  "Ossingen",
  "Otelfingen",
  "Ottenbach",
  "Pfäffikon",
  "Pfungen",
  "Rafz",
  "Regensberg",
  "Regensdorf",
  "Rheinau",
  "Richterswil",
  "Rickenbach (ZH)",
  "Rifferswil",
  "Rorbas",
  "Rümlang",
  "Rüschlikon",
  "Russikon",
  "Rüti (ZH)",
  "Schlatt (ZH)",
  "Schleinikon",
  "Schlieren",
  "Schöfflisdorf",
  "Schwerzenbach",
  "Seegräben",
  "Seuzach",
  "Stadel",
  "Stammheim",
  "Stäfa",
  "Stallikon",
  "Steinmaur",
  "Thalheim an der Thur",
  "Thalwil",
  "Trüllikon",
  "Truttikon",
  "Turbenthal",
  "Uetikon am See",
  "Uitikon",
  "Unterengstringen",
  "Urdorf",
  "Uster",
  "Volken",
  "Volketswil",
  "Wädenswil",
  "Wald (ZH)",
  "Wallisellen",
  "Wangen-Brüttisellen",
  "Wasterkingen",
  "Weiach",
  "Weiningen (ZH)",
  "Weisslingen",
  "Wettswil am Albis",
  "Wetzikon",
  "Wiesendangen",
  "Wil (ZH)",
  "Wila",
  "Wildberg",
  "Winkel",
  "Winterthur",
  "Zell (ZH)",
  "Zollikon",
  "Zumikon",
  "Zürich"
];

// 🌐 FRONTEND
app.get("/", async (req, res) => {

  const { data } = await supabase
    .from("projects")
    .select("*");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Zürich SaaS</title>

<style>
body{font-family:Arial;margin:0;background:#f5f6f8}
.header{padding:12px;background:#fff;border-bottom:1px solid #ddd;font-weight:bold}
.filters{padding:10px;background:#fff;display:flex;gap:10px;flex-wrap:wrap}
input,select,button{padding:8px}
table{width:100%;background:#fff;border-collapse:collapse}
td,th{padding:8px;border-bottom:1px solid #eee}
th{background:#fafafa}
</style>
</head>

<body>

<div class="header">📍 SaaS – Kanton Zürich (Wikipedia Daten)</div>

<div class="filters">

<input id="loc" placeholder="Ort eingeben" />

<select id="drop">
<option value="">Gemeinde wählen</option>
${ZUERICH_GEMEINDEN.map(o => `<option value="${o}">${o}</option>`).join("")}
</select>

<button onclick="run()">Sortieren</button>

</div>

<table>
<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Distanz (km)</th>
</tr>
</thead>

<tbody id="t"></tbody>
</table>

<script>

const data = ${JSON.stringify(data)};
const cache = {};

async function getCoords(place){
  if(cache[place]) return cache[place];

  const res = await fetch(
    "https://geocoding-api.open-meteo.com/v1/search?name="
    + encodeURIComponent(place)
  );

  const json = await res.json();

  if(json?.results?.[0]){
    const c = {
      lat: json.results[0].latitude,
      lon: json.results[0].longitude
    };

    cache[place]=c;
    return c;
  }

  return null;
}

function dist(a,b){
  const R=6371;

  const dLat=(b.lat-a.lat)*Math.PI/180;
  const dLon=(b.lon-a.lon)*Math.PI/180;

  const x=
    Math.sin(dLat/2)**2+
    Math.cos(a.lat*Math.PI/180)*
    Math.cos(b.lat*Math.PI/180)*
    Math.sin(dLon/2)**2;

  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function render(rows){
  document.getElementById("t").innerHTML =
    rows.map(r=>
      "<tr><td>"+r.Name+"</td><td>"+r.Ort+"</td><td>"+(r.d?r.d.toFixed(1):"-")+"</td></tr>"
    ).join("");
}

async function run(){

  const place =
    document.getElementById("loc").value ||
    document.getElementById("drop").value;

  const user = await getCoords(place);

  if(!user){
    alert("Bitte gültige Zürcher Gemeinde wählen");
    return;
  }

  const arr = [];

  for(const r of data){

    const target = await getCoords(r.Ort);

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

document.getElementById("drop").onchange=(e)=>{
  document.getElementById("loc").value=e.target.value;
};

</script>

</body>
</html>
  `);
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
