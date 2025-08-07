const path = require("path");
const express = require("express");
const WebSocket = require("ws");
const os = require("os");
const cors = require("cors");

const app = express();

const WS_PORT = process.env.PORT || 8888;
const HTTP_PORT = process.env.PORT || 80;

// Obtener IP local automáticamente
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
          iface.family === "IPv4" &&
          !iface.internal &&
          iface.address !== "127.0.0.1"
      ) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIp = getLocalIp();

// Habilitar CORS para todas las rutas
app.use(cors());

// Servidor WebSocket
const wsServer = new WebSocket.Server({ port: WS_PORT }, () =>
    console.log(`🟢 WebSocket escuchando en ws://${localIp}:${WS_PORT}`)
);

// Clientes conectados
let connectedClients = [];

wsServer.on("connection", (ws, req) => {
  console.log("Cliente conectado por WebSocket");

  connectedClients.push(ws);

  ws.on("message", (data) => {
    // Reenvío a otros clientes
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

// Servidor HTTP
app.use("/image", express.static(path.join(__dirname, "image")));
app.use("/js", express.static(path.join(__dirname, "js")));

app.get("/audio", (req, res) =>
    res.sendFile(path.resolve(__dirname, "./index.html"))
);

app.get("/api/ip", (req, res) => {
  res.json({ ip: localIp, port: WS_PORT });
});

app.listen(HTTP_PORT, () =>
    console.log(`🌐 Servidor HTTP escuchando en http://${localIp}:${HTTP_PORT}`)
);
