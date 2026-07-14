// @ts-nocheck
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
    broadCast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
}
