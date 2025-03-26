import express from "express";
import { setIndexingPreferences } from "../controllers/indexing";
import { authenticateUser } from "../middlewares/auth";

const router = express.Router();

router.post("/setPreferences", authenticateUser, setIndexingPreferences);

export default router;
