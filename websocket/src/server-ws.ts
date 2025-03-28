import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { verifyJWT } from "./services/auth";

const WS_PORT = 3002;

export const clients = new Map<string, WebSocket>();

export function startWebSocketServer() {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const params = new URL(req.url || "", `http://${req.headers.host}`);
    const token = params.searchParams.get("token");

    if (!token) {
      ws.close(1000, "Authentication required");
      return;
    }

    const { userId } = verifyJWT(token);

    if (userId) {
      clients.set(userId.toString(), ws);
      console.log(`User ${userId} connected`);

      ws.on("close", () => {
        clients.delete(userId.toString());
        console.log(`User ${userId} disconnected`);
      });
    } else {
      ws.close(1000, "Invalid token");
    }
  });

  server.listen(WS_PORT, () => {
    console.log(`WebSocket server running on port ${WS_PORT}`);
  });

  return { wss, clients };
}
