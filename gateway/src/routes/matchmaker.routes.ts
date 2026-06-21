import { Router } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "@skillgraph/database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, fail } from "../utils/apiResponse.js";

export const matchmakerRouter = Router();

matchmakerRouter.post("/invite", requireAuth, asyncHandler(async (req, res) => {
  const senderId = req.user!.id;
  const {
    candidateId,
    projectName,
    requiredSkills,
    message
  } = req.body as {
    candidateId?: string;
    projectName?: string;
    requiredSkills?: string[];
    message?: string;
  };

  if (!candidateId || !projectName) {
    return fail(res, "BAD_REQUEST", "candidateId and projectName are required", 400);
  }

  if (candidateId === senderId) {
    return fail(res, "BAD_REQUEST", "You cannot invite yourself", 400);
  }

  const [sender, candidate] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId } }),
    prisma.user.findUnique({ where: { id: candidateId } })
  ]);

  if (!sender || !candidate) {
    return fail(res, "NOT_FOUND", "Sender or candidate not found", 404);
  }

  const notification = await prisma.systemNotification.create({
    data: {
      userId: candidateId,
      type: "TEAM_INVITE_RECEIVED",
      payload: {
        inviteId: randomUUID(),
        projectName,
        fromUser: sender.fullName,
        fromUserId: senderId,
        requiredSkills: requiredSkills ?? [],
        message: message ?? ""
      }
    }
  });

  return ok(res, { notificationId: notification.id });
}));
