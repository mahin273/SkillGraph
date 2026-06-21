import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./socket/index.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

app.get("/health", (_req, res) => res.json({ success: true, data: { service: "notification-service", status: "ok" } }));
registerSocketHandlers(io);

httpServer.listen(env.NOTIFICATION_SERVICE_PORT, () => {
  console.log(`SkillGraph notification service listening on ${env.NOTIFICATION_SERVICE_PORT}`);
});
