import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  GATEWAY_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().default("postgresql://skillgraph:skillgraph@postgres:5432/skillgraph"),
  REDIS_URL: z.string().default("redis://redis:6379"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  GRAPH_SERVICE_URL: z.string().default("http://localhost:3001"),
  NLP_SERVICE_URL: z.string().default("http://localhost:8001"),
  TOKEN_ENCRYPTION_KEY: z.string().default("skillgraph-development-token-key"),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_ISSUER: z.string().default("skillgraph"),
  JWT_AUDIENCE: z.string().default("skillgraph-web"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("noreply@skillgraph.com")
});

export const env = envSchema.parse(process.env);