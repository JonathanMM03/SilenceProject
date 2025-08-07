const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");
const os = require("os");

const app = express();

// Obtener IP local
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal && iface.address !== "127.0.0.1") {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIp = getLocalIp();

// Middleware
app.use(cors());
app.use("/image", express.static(path.join(__dirname, "image")));
app.use("/js", express.static(path.join(__dirname, "js")));

app.get("/audio", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./index.html"));
});

app.get("/api/ip", (req, res) => {
  res.json({ ip: localIp, port: process.env.PORT });
});

// Un solo servidor HTTP y WebSocket juntos
const server = app.listen(process.env.PORT || 8000, () => {
  console.log(`🌐 Servidor escuchando en http://${localIp}:${process.env.PORT || 8000}`);
});

const wsServer = new WebSocket.Server({ server });
console.log("🟢 WebSocket adjunto al servidor HTTP");

// WebSocket handlers
let connectedClients = [];

wsServer.on("connection", (ws) => {
  console.log("Cliente conectado por WebSocket");
  connectedClients.push(ws);

  ws.on("message", (data) => {
    connectedClients.forEach((client, i) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      } else if (client.readyState !== WebSocket.OPEN) {
        connectedClients.splice(i, 1);
      }
    });
  });

  ws.on("close", () => {
    connectedClients = connectedClients.filter((c) => c !== ws);
    console.log("Cliente desconectado");
  });
});
