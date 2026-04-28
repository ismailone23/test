const express = require("express");
const app = express();

// if behind proxy (Render, Vercel, Nginx, Cloudflare)
app.set("trust proxy", true);

app.get("/", (req, res) => {
  const ip = req.ip;
  res.send("Your IP: " + ip);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running"));
