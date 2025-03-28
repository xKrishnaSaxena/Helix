import express from "express";
import {
  deleteWebhook,
  getAllWebhooks,
  setIndexingPreferences,
} from "../controllers/indexing";
import { authenticateUser } from "../middlewares/auth";

const router = express.Router();

router.post("/setPreferences", authenticateUser, setIndexingPreferences);
router.delete("/deleteWebhook", authenticateUser, deleteWebhook);
router.get("/getAllWebhooks", authenticateUser, getAllWebhooks);
export default router;
