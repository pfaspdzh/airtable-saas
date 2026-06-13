const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const data = [
  { Name: "Projekt A", Stufe: "1", Status: "Ja", Ort: "Zürich" },
  { Name: "Projekt B", Stufe: "2", Status: "Nein", Ort: "Bern" },
  { Name: "Projekt C", Stufe: "3", Status: "Ja", Ort: "Basel" },
  { Name: "Projekt D", Stufe: "4", Status: "Nein", Ort: "Zürich" }
];

app.get("/data", (req, res) => {
  res.json(data);
});

app.get("/", (req, res) => {
  res.send("Backend läuft ✔");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
