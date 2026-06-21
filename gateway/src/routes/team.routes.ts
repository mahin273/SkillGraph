import { Router } from "express";
import { prisma } from "@skillgraph/database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, fail } from "../utils/apiResponse.js";

export const teamRouter = Router();

async function respondToInvite(userId: string, inviteId: string, response: "accepted" | "declined") {
  const notifications = await prisma.systemNotification.findMany({
    where: {
      userId,
      type: "TEAM_INVITE_RECEIVED"
    }
  });
  const notification = notifications.find((item) => {
    const payload = item.payload as Record<string, unknown>;
    return payload.inviteId === inviteId;
  });

  if (!notification) return null;

  const payload = notification.payload as Record<string, unknown>;
  const fromUserId = typeof payload.fromUserId === "string" ? payload.fromUserId : undefined;
  const projectName = typeof payload.projectName === "string" ? payload.projectName : "your project";
  const responder = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.systemNotification.update({
    where: { id: notification.id },
    data: { isRead: true }
  });

  if (fromUserId && responder) {
    await prisma.systemNotification.create({
      data: {
        userId: fromUserId,
        type: response === "accepted" ? "TEAM_INVITE_ACCEPTED" : "TEAM_INVITE_DECLINED",
        payload: {
          byUser: responder.fullName,
          byUserId: userId,
          projectName,
          inviteId
        }
      }
    });
  }

  return notification;
}

teamRouter.put("/invite/:inviteId/accept", requireAuth, asyncHandler(async (req, res) => {
  const notification = await respondToInvite(req.user!.id, req.params.inviteId, "accepted");

  if (!notification) {
    return fail(res, "NOT_FOUND", "Invitation not found", 404);
  }

  return ok(res, { status: "accepted" });
}));

teamRouter.put("/invite/:inviteId/decline", requireAuth, asyncHandler(async (req, res) => {
  const notification = await respondToInvite(req.user!.id, req.params.inviteId, "declined");

  if (!notification) {
    return fail(res, "NOT_FOUND", "Invitation not found", 404);
  }

  return ok(res, { status: "declined" });
}));
