import crypto from "crypto";
import config from "./config";
const algorithm: string = "aes-256-cbc";

if (!config.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is not set");
}

const key: Buffer = Buffer.from(config.ENCRYPTION_KEY, "hex");

export interface EncryptionResult {
  iv: string;
  encryptedData: string;
}

export const encrypt = (text: string): string => {
  const iv: Buffer = crypto.randomBytes(16);
  const cipher: crypto.Cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted: string = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const textParts: string[] = encryptedText.split(":");
  if (textParts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }

  const iv: Buffer = Buffer.from(textParts[0], "hex");
  const encrypted: string = textParts[1];

  const decipher: crypto.Decipher = crypto.createDecipheriv(algorithm, key, iv);

  let decrypted: string = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
