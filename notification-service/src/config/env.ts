import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const env = z
  .object({
    NOTIFICATION_SERVICE_PORT: z.coerce.number().default(3002),
    REDIS_URL: z.string().default("redis://redis:6379"),
    JWT_PUBLIC_KEY: z.string().optional(),
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_ISSUER: z.string().default("skillgraph"),
    JWT_AUDIENCE: z.string().default("skillgraph-web")
  })
  .parse(process.env);
