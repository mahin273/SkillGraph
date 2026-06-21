import type { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { getRedis } from "../utils/redis.js";
import { prisma } from "@skillgraph/database";

type NotificationEvent = {
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export function registerSocketHandlers(io: Server) {
  // JWT authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Missing token"));
    }

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.data.githubHandle = payload.githubHandle;
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;

    // Join user to their personal room
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected and joined room user:${userId}`);

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  // Subscribe to Redis Pub/Sub for notifications
  initializeRedisPubSub(io);
}

async function initializeRedisPubSub(io: Server) {
  try {
    const subscriber = await getRedis();
    const subscriberClient = subscriber.duplicate();
    await subscriberClient.connect();

    await subscriberClient.subscribe("notifications:publish", async (message) => {
      try {
        const event: NotificationEvent = JSON.parse(message);
        const payload = event.payload ?? event.data ?? {};

        // Fan out event to the correct user's room
        io.to(`user:${event.userId}`).emit("notification", {
          type: event.type,
          payload,
          timestamp: new Date().toISOString()
        });

        // Persist notification to database
        await prisma.systemNotification.create({
          data: {
            userId: event.userId,
            type: event.type,
            payload: payload as any,
            isRead: false
          }
        });

        console.log(`Notification sent to user ${event.userId}: ${event.type}`);
      } catch (error) {
        console.error("Error processing notification:", error);
      }
    });

    console.log("Redis Pub/Sub subscriber initialized for notifications:publish");
  } catch (error) {
    console.error("Failed to initialize Redis Pub/Sub:", error);
  }
}
