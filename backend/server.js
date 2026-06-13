const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

// 📦 einfache Demo-Daten (später Supabase)
app.get("/data", (req, res) => {

    const data = JSON.parse(fs.readFileSync("./data.json", "utf8"));

    res.json(data);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});