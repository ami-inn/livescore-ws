import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";



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

  wss.on("connection",async (socket,req) => {

    if(wsArcjet){
      try {
        const decision = await wsArcjet.protect(req); // Analyze the WebSocket upgrade request and apply the defined security rules
         if(decision.isDenied()) {
          const code = decision.reason.isRateLimit()?1013:1008; // Use 1013 for rate limiting and 1008 for other security violations
          const reason = decision.reason.isRateLimit()?"Too Many Requests":"Forbidden"; // Provide a reason for the closure
          socket.close(code, reason); // Close the WebSocket connection with the appropriate code and reason
          return;
         }
      } catch (error) {
        console.error("Error in Arcjet WebSocket security middleware:", error);
        socket.close(1011, "Internal Server Error"); // Close the connection with an error code
        return;
      }
    }

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
