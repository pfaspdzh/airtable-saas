const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 SUPABASE CONNECT
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 📊 API ENDPOINT
app.get("/data", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 🌐 FRONTEND (SAUBERE TABELLE)
app.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) {
    return res.send("Fehler beim Laden der Daten");
  }

  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Airtable SaaS</title>

<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  background: #f4f6f8;
}

.header {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ddd;
  font-size: 18px;
  font-weight: bold;
}

.container {
  padding: 16px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  min-width: 1200px;
  table-layout: fixed;
}

th, td {
  border-bottom: 1px solid #eee;
  padding: 10px;
  text-align: left;
  font-size: 13px;
  word-break: break-word;
}

th {
  background: #fafafa;
  position: sticky;
  top: 0;
}

tr:hover {
  background: #f0f7ff;
}
</style>

</head>

<body>

<div class="header">📊 Airtable SaaS</div>

<div class="container">

<table>
<thead>
<tr>
<th>Name</th>
<th>Ort</th>
<th>Adresse</th>
<th>Typus</th>
<th>Offiziell</th>
<th>Speziell</th>
<th>Stufen</th>
<th>Privat</th>
<th>Krank</th>
<th>Therapie</th>
<th>Wohnen</th>
<th>ID</th>
</tr>
</thead>

<tbody>
${
  data.map(d => `
  <tr>
    <td>${d.Name ?? ""}</td>
    <td>${d.Ort ?? ""}</td>
    <td>${d.Adresse ?? ""}</td>
    <td>${d.Typus ?? ""}</td>
    <td>${d.Offiziell ?? ""}</td>
    <td>${d.Speziell ?? ""}</td>
    <td>${d.Stufen ?? ""}</td>
    <td>${d.Privat ?? ""}</td>
    <td>${d.Krank ?? ""}</td>
    <td>${d.Therapie ?? ""}</td>
    <td>${d.Wohnen ?? ""}</td>
    <td>${d.id ?? ""}</td>
  </tr>
  `).join("")
}
</tbody>

</table>

</div>

</body>
</html>
  `);
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
