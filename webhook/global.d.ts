import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      ENCRYPTION_KEY: string;
      HELIUS_API_KEY: string;
    }
  }

  namespace Express {
    interface Request {
      user?: {
        id: string;
      } & JwtPayload;
    }
  }
}
