import express from "express";
import { clients } from "./server-ws";
import cors from "cors";
const INTERNAL_PORT = 4000;

export function startInternalHTTPServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  app.post("/broadcast", (req: any, res: any) => {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const client = clients.get(userId);

    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "User not connected" });
    }
  });

  return app.listen(INTERNAL_PORT, () => {
    console.log(`Internal HTTP server running on port ${INTERNAL_PORT}`);
  });
}
