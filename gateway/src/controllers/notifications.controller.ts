import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, fail } from "../utils/apiResponse.js";

/**
 * GET /api/v1/notifications
 * Returns all unread notifications for the authenticated user
 */
export const getUnreadNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const notifications = await prisma.systemNotification.findMany({
    where: {
      userId,
      isRead: false
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return ok(res, notifications);
});

/**
 * PUT /api/v1/notifications/:id/read
 * Marks a notification as read
 */
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const notification = await prisma.systemNotification.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!notification) {
    return fail(res, "NOT_FOUND", "Notification not found", 404);
  }

  const updated = await prisma.systemNotification.update({
    where: { id },
    data: { isRead: true }
  });

  return ok(res, updated);
});

/**
 * PUT /api/v1/notifications/read-all
 * Marks all notifications as read for the authenticated user
 */
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  await prisma.systemNotification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: {
      isRead: true
    }
  });

  return ok(res, { success: true });
});
