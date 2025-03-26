import { Pool } from "pg";
import { decrypt } from "../utils/encryption.js";
import pool from "../db/dbSetup.js";
export const getUserDatabase = async (userId: string) => {
  const result = await pool.query(
    "SELECT * FROM user_databases WHERE user_id = $1",
    [userId]
  );

  if (!result.rows[0]) throw new Error("No database configured");

  const credentials = result.rows[0];
  return new Pool({
    host: decrypt(credentials.encrypted_host),
    port: parseInt(decrypt(credentials.encrypted_port)),
    user: decrypt(credentials.encrypted_user),
    password: decrypt(credentials.encrypted_password),
    ssl: credentials.ssl ? { rejectUnauthorized: false } : false,
  });
};
