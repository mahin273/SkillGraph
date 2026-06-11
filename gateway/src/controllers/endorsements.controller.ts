import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { env } from "../config/env.js";
import { fail, ok } from "../utils/apiResponse.js";
import { getRedis } from "../utils/redis.js";

export async function submitEndorsement(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { endorsedId, skillId, skillName } = req.body as { endorsedId?: string; skillId?: string; skillName?: string };
  if (!endorsedId || (!skillId && !skillName)) {
    fail(res, "INVALID_ENDORSEMENT", "endorsedId and skillId or skillName are required", 400);
    return;
  }

  // Validate endorser != endorsee
  if (req.user.id === endorsedId) {
    fail(res, "SELF_ENDORSEMENT", "Cannot endorse yourself", 422);
    return;
  }

  const skill = skillId
    ? await prisma.skill.findUnique({ where: { id: skillId } })
    : await prisma.skill.findUnique({ where: { name: skillName } });
  if (!skill) {
    fail(res, "SKILL_NOT_FOUND", "Skill does not exist", 404);
    return;
  }

  // Check project_collaborators for shared project
  const sharedProject = await prisma.projectCollaborator.findFirst({
    where: {
      userId: req.user.id,
      project: {
        collaborators: {
          some: {
            userId: endorsedId
          }
        }
      }
    }
  });

  if (!sharedProject) {
    fail(res, "NO_SHARED_PROJECT", "You must share a project with this student to endorse them", 403);
    return;
  }

  // Check for duplicate triple (endorser, endorsee, skill)
  const existingEndorsement = await prisma.peerEndorsement.findUnique({
    where: { endorserId_endorsedId_skillId: { endorserId: req.user.id, endorsedId, skillId: skill.id } }
  });

  if (existingEndorsement) {
    fail(res, "DUPLICATE_ENDORSEMENT", "You have already endorsed this skill for this student", 409);
    return;
  }

  // Write to peer_endorsements
  const endorsement = await prisma.peerEndorsement.create({
    data: { endorserId: req.user.id, endorsedId, skillId: skill.id }
  });

  // Call Graph Service to increment endorsementCount
  const graphResponse = await fetch(`${env.GRAPH_SERVICE_URL}/graph/endorsements`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ studentId: endorsedId, skillName: skill.name })
  }).catch(() => undefined);

  // Check if endorsementCount reached 2 and set endorsed = true
  if (graphResponse?.ok) {
    const graphData = await graphResponse.json();
    // The graph service increments the count, we need to check if it's >= 2
    const endorsementCount = await prisma.peerEndorsement.count({
      where: { endorsedId, skillId: skill.id }
    });

    if (endorsementCount >= 2) {
      // Set endorsed = true when count >= 2
      await fetch(`${env.GRAPH_SERVICE_URL}/graph/endorsements/mark-endorsed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: endorsedId, skillName: skill.name })
      }).catch(() => undefined);
    }
  }

  // Publish ENDORSEMENT_RECEIVED event to notifications:publish Redis channel
  try {
    const redis = await getRedis();
    const endorser = await prisma.user.findUnique({ where: { id: req.user.id } });
    await redis.publish("notifications:publish", JSON.stringify({
      type: "ENDORSEMENT_RECEIVED",
      userId: endorsedId,
      payload: {
        skill: skill.name,
        fromUser: endorser?.fullName || "Unknown",
        fromUserId: req.user.id,
        endorsementId: endorsement.id
      }
    }));
  } catch (error) {
    console.error("Failed to publish endorsement notification:", error);
  }

  ok(res, endorsement, 201);
}

export async function listEndorsements(req: Request, res: Response) {
  const endorsements = await prisma.peerEndorsement.findMany({
    where: { endorsedId: req.params.studentId },
    include: {
      skill: true,
      endorser: { select: { id: true, fullName: true, githubHandle: true, avatarUrl: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  ok(res, endorsements);
}

export async function deleteEndorsement(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const endorsement = await prisma.peerEndorsement.findUnique({ 
    where: { id: req.params.id }, 
    include: { skill: true } 
  });
  
  if (!endorsement) {
    fail(res, "ENDORSEMENT_NOT_FOUND", "Endorsement does not exist", 404);
    return;
  }
  
  const userRole = req.user.role as string;
  if (endorsement.endorserId !== req.user.id && userRole !== "admin" && userRole !== "superadmin") {
    fail(res, "FORBIDDEN", "Only the endorser or an admin can delete this endorsement", 403);
    return;
  }

  // Delete the endorsement record
  await prisma.peerEndorsement.delete({ where: { id: endorsement.id } });

  // Decrement endorsementCount on the KNOWS edge
  await fetch(`${env.GRAPH_SERVICE_URL}/graph/endorsements/decrement`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 
      studentId: endorsement.endorsedId, 
      skillName: endorsement.skill.name 
    })
  }).catch(() => undefined);

  ok(res, null);
}
