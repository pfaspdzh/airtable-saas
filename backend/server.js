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

// 📊 GET DATA (ECHTE DB)
app.get("/data", async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) {
    console.error("DB ERROR:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 🧪 TEST ROUTE
app.get("/", (req, res) => {
  res.send("Supabase Backend läuft ✔");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
