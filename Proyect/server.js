import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware para parsear JSON
app.use(express.json({ limit: "10mb" }));

// Servir carpeta public/
app.use(express.static("public"));

// Endpoint /notify que recibe imagen desde n8n
app.post("/notify", (req, res) => {
  const { url } = req.body; // n8n envía { url: "..." }
  console.log("📩 URL recibida desde n8n:", url);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "image", image: url }));
    }
  });
  res.json({ ok: true });
});


// WebSocket
wss.on("connection", (ws) => {
  console.log("🟢 Cliente conectado por WebSocket");
});

const PORT = 3000;
server.listen(PORT, () =>
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
);
