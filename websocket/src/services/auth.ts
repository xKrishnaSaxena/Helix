import jwt from "jsonwebtoken";
import sanitizedConfig from "../config/config";
const JWT_SECRET = sanitizedConfig.JWT_SECRET;
export function verifyJWT(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      userId?: string;
    };
    if (!decoded.userId) {
      throw new Error("Token missing userId");
    }
    return decoded;
  } catch (error: any) {
    console.log("Token expired");
    throw new Error("Invalid or expired token");
  }
}
