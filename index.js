require("dotenv").config();
const express = require("express");
const path = require("path");
const { createClient } = require("redis");
const app = express();
const username = process.env.REDIS_USERNAME;
const password = process.env.REDIS_PASSWORD;
const host = process.env.REDIS_SOCKET_HOST;
const port = process.env.REDIS_SOCKET_PORT;
const ipsPassword = process.env.IPS_PASSWORD;

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

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];

  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp.trim();
  }

  return req.ip;
}

app.get("/", async (req, res) => {
  const ip = getClientIp(req);
  const now = new Date().toISOString();

  try {
    // Check if IP already exists
    const existingData = await client.hGet("ip_visits", ip);

    if (existingData) {
      // IP exists - update last visit and increment count
      const data = JSON.parse(existingData);
      data.lastSeen = now;
      data.visits += 1;
      await client.hSet("ip_visits", ip, JSON.stringify(data));
    } else {
      // New IP - create entry
      const data = {
        firstSeen: now,
        lastSeen: now,
        visits: 1,
      };
      await client.hSet("ip_visits", ip, JSON.stringify(data));
    }

    res.sendFile(path.join(__dirname, "got_you.gif"));
  } catch (err) {
    res.send("Error storing IP: " + err.message);
  }
});

// View all stored IPs with details
app.get("/ips", async (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Enter password to view IPs</h2>
        <form method="POST" action="/ips">
          <input
            type="password"
            name="password"
            placeholder="Password"
            style="padding: 8px; width: 240px;"
          />
          <button type="submit" style="padding: 8px 12px;">Submit</button>
        </form>
      </body>
    </html>
  `);
});

app.use(express.urlencoded({ extended: true }));

app.post("/ips", async (req, res) => {
  const providedPassword = req.body.password;

  if (!ipsPassword || providedPassword !== ipsPassword) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const allIps = await client.hGetAll("ip_visits");

    const formatted = {};
    for (const [ip, data] of Object.entries(allIps)) {
      formatted[ip] = JSON.parse(data);
    }

    res.json({
      totalUnique: Object.keys(formatted).length,
      ips: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running"));
