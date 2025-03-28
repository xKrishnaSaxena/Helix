import express from "express";
import { handleWebhook } from "./controllers/webhookController";

import cors from "cors";
const HTTP_PORT = 3001;
const app = express();
app.use(cors());
app.use(express.json());

app.post(
  "/webhook",
  (req, res, next) => {
    if (!req.query.userId || !req.query.type) {
      res.status(400).json({ error: "Missing webhook parameters" });
      return;
    }
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: "Expected array payload" });
      return;
    }
    next();
  },
  handleWebhook
);

app.listen(HTTP_PORT, () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
});
