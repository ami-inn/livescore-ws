import express from "express";
import { matchesRouter } from "./routes/matches.js";
import http from "http";
import { attachWebSocketServer } from "./ws/server.js";


const app = express();
const server = http.createServer(app);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.use('/matches', matchesRouter);

const {broadcastMatchCreated} = attachWebSocketServer(server)

app.locals.broadcastMatchCreated = broadcastMatchCreated; // store the broadcast function in app.locals so it can be accessed in routes


const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";


server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

// used to broadcast a match creation event to all connected clients
// this function is doing the same thing as the broadcastMatchCreated function in the attachWebSocketServer function, but it's defined here so it can be used in the matchesRouter
app.listen(PORT, HOST, () => {
  const baseUrl =  HOST === '0.0.0.0'?`http://localhost:${PORT}`:`http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(`WebSocket server is running on ${baseUrl.replace('http', 'ws')}/ws`);
});
