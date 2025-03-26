import express from "express";
import { saveCredentials } from "../controllers/db";
import { authenticateUser } from "../middlewares/auth";

const router = express.Router();

router.post("/saveCredentials", authenticateUser, saveCredentials);

export default router;
