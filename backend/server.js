const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY
);

app.get("/data", async (req, res) => {
const { data, error } = await supabase
.from("projects")
.select("*");

if (error) {
return res.status(500).json(error);
}

res.json(data);
});

app.get("/", async (req, res) => {

const { data, error } = await supabase
.from("projects")
.select("*");

if (error) {
return res.send("Fehler beim Laden");
}

const uniqueCities = [...new Set(
data.map(x => x.Ort).filter(Boolean)
)];

res.send(`

<!DOCTYPE html>

<html lang="de">
<head>

<meta charset="UTF-8">

<title>Airtable SaaS</title>

<style>

body{
  font-family:Arial,sans-serif;
  margin:0;
  background:#f5f6f8;
}

.header{
  background:white;
  padding:15px;
  border-bottom:1px solid #ddd;
  font-weight:bold;
}

.filters{
  background:white;
  padding:15px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  border-bottom:1px solid #ddd;
}

input,select,button{
  padding:8px;
}

.container{
  padding:10px;
  overflow-x:auto;
}

table{
  width:100%;
  min-width:1000px;
  background:white;
  border-collapse:collapse;
}

th,td{
  border-bottom:1px solid #eee;
  padding:8px;
  text-align:left;
}

th{
  background:#fafafa;
}

tr:hover{
  background:#f0f7ff;
}

</style>

</head>
<body>

<div class="header">
📊 Airtable SaaS
</div>

<div class="filters">

<input
id="userLoc"
placeholder="Ort eingeben"
/>

<select id="suggest">

<option value="">
Ort wählen
</option>

${uniqueCities.map(city => `

<option value="${city}">
${city}
</option>
`).join("")}

</select>

<button onclick="sortByDistance()">
Nach Nähe sortieren
</button>

</div>

<div class="container">

<table>

<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Typus</th>
<th>Stufen</th>
<th>Distanz</th>
</tr>
</thead>

<tbody id="body"></tbody>

</table>

</div>

<script>

const data = ${JSON.stringify(data)};

const cache = {};

async function getCoords(place){

  if(!place) return null;

  if(cache[place]){
    return cache[place];
  }

  const response = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&q="
    + encodeURIComponent(place)
  );

  const json = await response.json();

  if(!json[0]){
    return null;
  }

  const coords = {
    lat:parseFloat(json[0].lat),
    lon:parseFloat(json[0].lon)
  };

  cache[place] = coords;

  return coords;
}

function distanceKm(a,b){

  const R = 6371;

  const dLat =
    (b.lat-a.lat) * Math.PI/180;

  const dLon =
    (b.lon-a.lon) * Math.PI/180;

  const x =
    Math.sin(dLat/2) * Math.sin(dLat/2)
    +
    Math.cos(a.lat*Math.PI/180)
    *
    Math.cos(b.lat*Math.PI/180)
    *
    Math.sin(dLon/2)
    *
    Math.sin(dLon/2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(x),
      Math.sqrt(1-x)
    );

  return R*c;
}

function render(rows){

  let html = "";

  rows.forEach(function(d){

    html +=
      "<tr>" +
      "<td>" + (d.Name || "") + "</td>" +
      "<td>" + (d.Ort || "") + "</td>" +
      "<td>" + (d.Typus || "") + "</td>" +
      "<td>" + (d.Stufen || "") + "</td>" +
      "<td>" +
      (
        d.dist
        ? Number(d.dist).toFixed(1)
        : "-"
      ) +
      "</td>" +
      "</tr>";

  });

  document.getElementById("body").innerHTML =
    html;
}

async function sortByDistance(){

  const input =
    document.getElementById("userLoc").value;

  const dropdown =
    document.getElementById("suggest").value;

  const place =
    input || dropdown;

  if(!place){
    render(data);
    return;
  }

  const user =
    await getCoords(place);

  if(!user){
    alert("Ort nicht gefunden");
    return;
  }

  const enriched =
    await Promise.all(

      data.map(async function(row){

        const target =
          await getCoords(row.Ort);

        let dist = 999999;

        if(target){
          dist =
            distanceKm(
              user,
              target
            );
        }

        return {
          ...row,
          dist
        };

      })

    );

  enriched.sort(
    (a,b) => a.dist - b.dist
  );

  render(enriched);
}

document
.getElementById("suggest")
.addEventListener(
  "change",
  function(e){
    document
      .getElementById("userLoc")
      .value =
      e.target.value;
  }
);

render(data);

</script>

</body>
</html>
`);
});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(
"Server läuft auf Port",
PORT
);
});
