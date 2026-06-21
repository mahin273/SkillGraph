import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "production" ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "development" 
});
