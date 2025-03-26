import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/dbSetup";
import { Request, Response } from "express";
import config from "../utils/config";
const saltRounds = 12;

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
      [email, hashedPassword]
    );
    res.status(201).json({ message: "User created" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
        expiresIn: "24h",
      });
      res.cookie("token", token, { httpOnly: true, secure: true });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
