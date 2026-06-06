import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient role", statusCode: 403 } });
      return;
    }

    const hasRole = roles.includes(req.user.role) || (req.user.role === "superadmin" && roles.includes("admin"));
    if (!hasRole) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient role", statusCode: 403 } });
      return;
    }

    if (["student", "professor", "alumni"].includes(req.user.role) && !req.user.isVerified) {
      res.status(403).json({
        success: false,
        error: {
          code: "PENDING_VERIFICATION",
          message: "Your academic registration is pending review by your university administrator.",
          statusCode: 403
        }
      });
      return;
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "superadmin") {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Super admin privileges are required for this action.",
        statusCode: 403
      }
    });
    return;
  }
  next();
}