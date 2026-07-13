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
    (/** @type {{ isAlive?: boolean }} */ (socket)).isAlive = true; // Mark the socket as alive when a new connection is established
    //on connection we are attaching isAlive property to the socket object to keep track of the connection status
    socket.on('pong', () => {
      /** @type {{ isAlive?: boolean }} */ (socket).isAlive = true; // Mark the socket as alive when a pong is received
    });
    sendJson(socket, { type:'welcome'});
    socket.on('error',console.error);
    console.log("New WebSocket connection established");
  });

  // iterate over all connected clients every 30 seconds and check if they are alive, if not terminate the connection
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
       // cast ws to include isAlive property to satisfy typing
       if ((/** @type {{ isAlive?: boolean }} */ (ws)).isAlive === false) return ws.terminate(); // Terminate the connection if the client is not alive
       (/** @type {{ isAlive?: boolean }} */ (ws)).isAlive = false;
       ws.ping(); // Send a ping to the client to check if it's alive
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval); // Clear the interval when the WebSocket server is closed
  });

  /**
     * @param {any} match
     */
  function broadcastMatchCreated(match){
    broadCast(wss, {type:'match_created', data: match});
  }

  return {broadcastMatchCreated};
}
