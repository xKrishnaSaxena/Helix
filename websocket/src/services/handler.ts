import { verifyJWT } from "./auth";
import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function handleConnection(ws: WebSocket, req: any) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(1000, "Authentication required");
    return;
  }

  try {
    const decoded = verifyJWT(token);
    if (typeof decoded === "object" && "userId" in decoded) {
      (ws as any).userId = String(decoded.userId);
      clients.add(ws);
      console.log(`New client connected: ${(ws as any).userId}`);
    }
  } catch (error) {
    ws.close(1000, "Invalid token");
  }

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`User ${(ws as any).userId} disconnected`);
  });
}

export function getWebSocketClients() {
  return clients;
}
