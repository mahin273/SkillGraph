import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import type { Server, Socket } from "socket.io";

// Mock dependencies
jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: jest.fn()
}));

const mockRedisClient = {
  duplicate: jest.fn().mockReturnThis(),
  connect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockImplementation((channel, cb) => {
    (mockRedisClient as any)._subscribeCallback = cb;
    return Promise.resolve();
  })
};

jest.unstable_mockModule("../src/utils/redis.js", () => ({
  getRedis: jest.fn().mockResolvedValue(mockRedisClient)
}));

jest.unstable_mockModule("@skillgraph/database", () => ({
  prisma: {
    systemNotification: {
      create: jest.fn().mockResolvedValue({})
    }
  }
}));

const { verifyToken } = await import("../src/utils/jwt.js");
const { prisma } = await import("@skillgraph/database");
const { registerSocketHandlers } = await import("../src/socket/index.js");

describe("Socket Connection and Notification Handlers", () => {
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIo = {
      use: jest.fn().mockImplementation((fn: any) => {
        mockIo._middleware = fn;
      }),
      on: jest.fn().mockImplementation((event: string, fn: any) => {
        mockIo._connectionHandler = fn;
      }),
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
  });

  test("should authenticate socket connection using JWT middleware", async () => {
    registerSocketHandlers(mockIo as any);

    // Verify middleware registered
    expect(mockIo.use).toHaveBeenCalled();

    const mockSocket = {
      handshake: { auth: { token: "valid-token" } },
      data: {}
    } as any;
    const mockNext = jest.fn();

    // Mock token verification success
    (verifyToken as any).mockReturnValueOnce({ sub: "user-123", role: "USER", githubHandle: "gh-user" });

    // Call the middleware
    mockIo._middleware(mockSocket, mockNext);

    expect(verifyToken).toHaveBeenCalledWith("valid-token");
    expect(mockSocket.data.userId).toBe("user-123");
    expect(mockSocket.data.role).toBe("USER");
    expect(mockSocket.data.githubHandle).toBe("gh-user");
    expect(mockNext).toHaveBeenCalledWith();
  });

  test("should deny socket connection if token is missing", async () => {
    registerSocketHandlers(mockIo as any);

    const mockSocket = {
      handshake: { auth: {} },
      data: {}
    } as any;
    const mockNext = jest.fn();

    mockIo._middleware(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toContain("Missing token");
  });

  test("should handle socket connection and join personal room", async () => {
    registerSocketHandlers(mockIo as any);

    const mockSocket = {
      data: { userId: "user-123" },
      join: jest.fn(),
      on: jest.fn()
    } as any;

    // Trigger connection
    mockIo._connectionHandler(mockSocket);

    expect(mockSocket.join).toHaveBeenCalledWith("user:user-123");
  });

  test("should handle Redis publication and forward to socket room", async () => {
    registerSocketHandlers(mockIo as any);

    // Wait for async redis pub/sub initialization to set up the subscription callback
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRedisClient.subscribe).toHaveBeenCalledWith("notifications:publish", expect.any(Function));

    const notificationPayload = {
      userId: "user-123",
      type: "TEST_NOTIFICATION",
      payload: { message: "Hello world" }
    };

    const emitMock = jest.fn();
    mockIo.to.mockReturnValue({ emit: emitMock });

    // Trigger the subscription callback
    const subscribeCallback = (mockRedisClient as any)._subscribeCallback;
    await subscribeCallback(JSON.stringify(notificationPayload));

    expect(mockIo.to).toHaveBeenCalledWith("user:user-123");
    expect(emitMock).toHaveBeenCalledWith("notification", expect.objectContaining({
      type: "TEST_NOTIFICATION",
      payload: { message: "Hello world" }
    }));

    // Verify DB persistence
    expect(prisma.systemNotification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        type: "TEST_NOTIFICATION",
        payload: { message: "Hello world" },
        isRead: false
      }
    });
  });
});
