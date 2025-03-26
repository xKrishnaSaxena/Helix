import express, { NextFunction, Request, Response } from "express";
import { handleWebhook } from "./controllers/webhookController";

const app = express();

app.use(express.json());

app.post(
  "/webhook",
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.query.userId || !req.query.type) {
      res.status(400).json({ error: "Missing webhook parameters" });
    }
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: "Expected array payload" });
    }
    next();
  },
  handleWebhook
);

app.listen(3002, () => {
  console.log("Webhook server running on port 3002");
});
