import { WebSocket, WebSocketServer } from "ws";



/**
 * @param {WebSocket} socket
 * @param {{ type: string; }} payload
 */
// used to send a JSON payload to a specific WebSocket client
function sendJson(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
  return;
}

/**
 * @param {import("ws").Server<typeof WebSocket, typeof import("node:http").IncomingMessage>} wss
 * @param {{ type: string; data: any; }} payload
 */

// used to broadcast a JSON payload to all connected WebSocket clients
function broadCast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(payload));
    }
    return;
  }
}


/**
 * @param {any} server
 */

// used to attach a WebSocket server to an existing HTTP server
// use case: const { broadcastMatchCreated } = attachWebSocketServer(server);
// then you can use broadcastMatchCreated(match) to broadcast a match creation event to all connected clients
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  wss.on("connection", (socket) => {
    sendJson(socket, { type:'welcome'});
    console.log("New WebSocket connection established");
  });

  /**
     * @param {any} match
     */
  function broadcastMatchCreated(match){
    broadCast(wss, {type:'match_created', data: match});
  }

  return {broadcastMatchCreated};
}
