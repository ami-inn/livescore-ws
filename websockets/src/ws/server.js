// @ts-nocheck
import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";


const matchSubscribers = new Map(); // Map to store matchId and its corresponding set of WebSocket clients
// using map because it prevents duplicates and allows for easy addition and removal of clients

//explain the use case of subscribe unsubscribe and cleanUpSubscriptions functions
// the subscribe function is used to add a WebSocket client to the set of subscribers for a specific matchId. This allows the server to keep track of which clients are interested in receiving updates for that match. When a new event occurs for that match, the server can broadcast the update to all subscribed clients.
// the unsubscribe function is used to remove a WebSocket client from the set of subscribers for a specific matchId. This is useful when a client no longer wants to receive updates for that match, such as when they navigate away from the match page or close their browser. By removing the client from the subscribers set, the server can avoid sending unnecessary updates to that client.

// the cleanUpSubscriptions function is used to remove a WebSocket client from all match subscriptions when the client disconnects or closes their connection. This ensures that the server does not keep references to disconnected clients, which could lead to memory leaks and unnecessary resource usage. It iterates through all matchIds that the client was subscribed to and calls the unsubscribe function for each one.

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if(!subscribers) return;

  subscribers.delete(socket);
  if(subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}


function cleanUpSubscriptions(socket) {
  for(const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if(!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for(const client of subscribers){
    if(client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * @param {import("ws").Server<typeof WebSocket, typeof import("node:http").IncomingMessage>} wss
 * @param {{ type: string; data: any; }} payload
 */

// used to broadcast a JSON payload to all connected WebSocket clients
function broadCastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(payload));
    }
    return;
  }
}

function handlMessage(socket, data) {
  let message;
  try {

    message = JSON.parse(data.toString());
    
  } catch (error) {
    sendJson(socket, { type: "error", message: "Invalid JSON format" });
  }

  if(message.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }
  if(message.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
    return;
  }
}


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
 * @param {any} server
 */

// used to attach a WebSocket server to an existing HTTP server
// use case: const { broadcastMatchCreated } = attachWebSocketServer(server);
// then you can use broadcastMatchCreated(match) to broadcast a match creation event to all connected clients
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true, // we are not creating a new HTTP server, but attaching to an existing one
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== "/ws") {
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
          } else {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          }
          socket.destroy();
          return;
        }
      } catch (e) {
        console.error("WS upgrade protection error", e);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (socket, req) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set(); // Initialize a set to keep track of the matchIds this socket is subscribed to
    socket.on("message", (data) => {
      handlMessage(socket, data);
    });

    socket.on('error', (err) => {
      
      
       console.error('WebSocket error:', err);
       socket.terminate(); // Terminate the connection on error
    });

    socket.on('close', () => {
      cleanUpSubscriptions(socket); // Clean up subscriptions when the socket is closed
    });

    sendJson(socket, { type: "welcome" });

    socket.on("error", () => {
      socket.terminate();
    });

    socket.on("close", () => {
      // cleanupSubscriptions(socket);
    });

    socket.on("error", console.error);
  });

  // iterate over all connected clients every 30 seconds and check if they are alive, if not terminate the connection
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // cast ws to include isAlive property to satisfy typing
      if (/** @type {{ isAlive?: boolean }} */ (ws).isAlive === false)
        return ws.terminate(); // Terminate the connection if the client is not alive
      /** @type {{ isAlive?: boolean }} */ (ws).isAlive = false;
      ws.ping(); // Send a ping to the client to check if it's alive
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval); // Clear the interval when the WebSocket server is closed
  });

  /**
   * @param {any} match
   */
  function broadcastMatchCreated(match) {
    broadCastToAll(wss, { type: "match_created", data: match });
  }

  function broadCastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadCastCommentary };
}
