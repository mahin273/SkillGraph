import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { publicLimiter } from "./middleware/rateLimit.middleware.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./utils/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(publicLimiter);

app.get("/favicon.ico", (_req, res) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.status(204).end();
});

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { service: "gateway", status: "ok" } });
});

app.use((req, res, next) => {
  if (req.path === "/api/auth/google/callback") {
    req.url = req.url.replace("/api/auth/google/callback", "/api/v1/auth/google/callback");
  }
  next();
});

app.use("/api/v1", router);
app.use(errorHandler);
