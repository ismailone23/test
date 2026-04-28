require("dotenv").config();
const express = require("express");
const { createClient } = require("redis");
const app = express();
const username = process.env.REDIS_USERNAME;
const password = process.env.REDIS_PASSWORD;
const host = process.env.REDIS_SOCKET_HOST;
const port = process.env.REDIS_SOCKET_PORT;

// if behind proxy (Render, Vercel, Nginx, Cloudflare)
app.set("trust proxy", true);
// Redis connection
const client = createClient({
  username,
  password,
  socket: {
    host,
    port,
  },
});
client.on("error", (err) => console.log("Redis Client Error", err));
client.connect();

app.get("/", async (req, res) => {
  const ip = req.ip;

  // Store IP in Redis
  try {
    await client.lPush("ips", ip);
    await client.expire("ips", 3600); // expire after 1 hour
    res.send("Your IP: " + ip);
  } catch (err) {
    res.send("Error storing IP: " + err.message);
  }
});

// Bonus: view all stored IPs
app.get("/ips", async (req, res) => {
  try {
    const ips = await client.lRange("ips", 0, -1);
    res.json({ ips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running"));
