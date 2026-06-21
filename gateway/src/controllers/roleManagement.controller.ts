import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";

// GET /api/v1/admin/roles
export async function listRoles(req: Request, res: Response) {
  try {
    const roles = await prisma.industryRole.findMany({
      include: {
        requirements: {
          include: {
            skill: {
              include: { category: true }
            }
          },
          orderBy: { criticality: "desc" }
        }
      },
      orderBy: { title: "asc" }
    });

    const data = roles.map((role) => ({
      id: role.id,
      title: role.title,
      description: role.description,
      source: role.source,
      createdAt: role.createdAt,
      requiredSkills: role.requirements.map((req) => ({
        id: req.skill.id,
        name: req.skill.name,
        category: req.skill.category?.name ?? "Uncategorized",
        criticality: req.criticality
      }))
    }));

    ok(res, data);
  } catch (error) {
    console.error("[listRoles] Error:", error);
    fail(res, "SERVER_ERROR", "Internal server error", 500);
  }
}

// POST /api/v1/admin/roles
export async function createRole(req: Request, res: Response) {
  try {
    const { title, description, requirements } = req.body as {
      title?: string;
      description?: string;
      requirements?: Array<{ skillId: string; criticality: number }>;
    };

    if (!title) {
      fail(res, "INVALID_BODY", "Role title is required", 400);
      return;
    }

    // Check if title is unique
    const existing = await prisma.industryRole.findUnique({
      where: { title }
    });

    if (existing) {
      fail(res, "DUPLICATE_ROLE", "A role with this title already exists", 400);
      return;
    }

    const newRole = await prisma.industryRole.create({
      data: {
        title,
        description,
        source: "Professor Override",
        requirements: requirements && Array.isArray(requirements)
          ? {
              createMany: {
                data: requirements.map((req) => ({
                  skillId: req.skillId,
                  criticality: req.criticality
                }))
              }
            }
          : undefined
      },
      include: {
        requirements: {
          include: {
            skill: true
          }
        }
      }
    });

    ok(res, newRole, 201);
  } catch (error) {
    console.error("[createRole] Error:", error);
    fail(res, "SERVER_ERROR", "Internal server error", 500);
  }
}

// PUT /api/v1/admin/roles/:id
export async function updateRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, requirements } = req.body as {
      title?: string;
      description?: string;
      requirements?: Array<{ skillId: string; criticality: number }>;
    };

    if (!title) {
      fail(res, "INVALID_BODY", "Role title is required", 400);
      return;
    }

    const role = await prisma.industryRole.findUnique({
      where: { id }
    });

    if (!role) {
      fail(res, "ROLE_NOT_FOUND", "Role not found", 404);
      return;
    }

    // Check unique title if changed
    if (title !== role.title) {
      const existing = await prisma.industryRole.findUnique({
        where: { title }
      });
      if (existing) {
        fail(res, "DUPLICATE_ROLE", "A role with this title already exists", 400);
        return;
      }
    }

    // Use transaction to update role and recreate requirements
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing requirements for this role
      await tx.roleRequirement.deleteMany({
        where: { roleId: id }
      });

      // 2. Update role title, description, and create new requirements
      return tx.industryRole.update({
        where: { id },
        data: {
          title,
          description,
          requirements: requirements && Array.isArray(requirements)
            ? {
                createMany: {
                  data: requirements.map((req) => ({
                    skillId: req.skillId,
                    criticality: req.criticality
                  }))
                }
              }
            : undefined
        },
        include: {
          requirements: {
            include: {
              skill: true
            }
          }
        }
      });
    });

    ok(res, updated);
  } catch (error) {
    console.error("[updateRole] Error:", error);
    fail(res, "SERVER_ERROR", "Internal server error", 500);
  }
}

// DELETE /api/v1/admin/roles/:id
export async function deleteRole(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const role = await prisma.industryRole.findUnique({
      where: { id }
    });

    if (!role) {
      fail(res, "ROLE_NOT_FOUND", "Role not found", 404);
      return;
    }

    await prisma.industryRole.delete({
      where: { id }
    });

    ok(res, { deleted: true });
  } catch (error) {
    console.error("[deleteRole] Error:", error);
    fail(res, "SERVER_ERROR", "Internal server error", 500);
  }
}