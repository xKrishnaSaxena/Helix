import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../utils/config";
interface JwtPayloadWithUserId extends JwtPayload {
  userId: string;
}
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET!
    ) as JwtPayloadWithUserId;

    req.user = {
      id: decoded.userId,
      ...decoded,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown authentication error" });
    }
  }
};
