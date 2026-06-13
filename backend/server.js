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

// 🌐 FRONTEND (WICHTIG!)
app.get("/", async (req, res) => {
  const { data } = await supabase.from("projects").select("*");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Airtable SaaS</title>
<style>
body { font-family: Arial; background:#f6f6f6; margin:0; }
table { width:100%; border-collapse:collapse; background:white; }
th,td { padding:10px; border-bottom:1px solid #eee; }
th { background:#fafafa; }
.header { padding:10px; background:white; }
</style>
</head>
<body>

<div class="header">
<h2>📊 Airtable SaaS</h2>
</div>

<table>
<tr>
<th>Name</th>
<th>Stufe</th>
<th>Status</th>
<th>Ort</th>
</tr>

${
  data.map(d => `
  <tr>
    <td>${d.Name ?? ""}</td>
    <td>${d.Stufe ?? ""}</td>
    <td>${d.Status ?? ""}</td>
    <td>${d.Ort ?? ""}</td>
  </tr>
  `).join("")
}

</table>

</body>
</html>
  `);
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Supabase SaaS läuft auf", PORT);
});
