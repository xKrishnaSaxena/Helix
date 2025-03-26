import { encrypt } from "../utils/encryption.js";
import pool from "../db/dbSetup.js";
import { Request, Response } from "express";

export const saveCredentials = async (req: Request, res: Response) => {
  const { host, port, user, password, dbName } = req.body;
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;

  try {
    const encryptedHost = encrypt(host);
    const encryptedPort = encrypt(port);
    const encryptedUser = encrypt(user);
    const encryptedPassword = encrypt(password);
    const encryptedDbName = encrypt(dbName);

    await pool.query(
      `INSERT INTO user_dbs 
        (user_id, encrypted_host, encrypted_port, encrypted_user, encrypted_password, encrypted_dbName)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        encryptedHost,
        encryptedPort,
        encryptedUser,
        encryptedPassword,
        encryptedDbName,
      ]
    );

    res.status(201).json({ success: true });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
};
