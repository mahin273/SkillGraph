import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient role", statusCode: 403 } });
      return;
    }

    const userRole = req.user.role as string;
    const hasRole = roles.includes(req.user.role) || (userRole === "superadmin" && roles.includes("admin"));
    if (!hasRole) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient role", statusCode: 403 } });
      return;
    }

    if (["student", "professor", "alumni"].includes(userRole) && !req.user.isVerified) {
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
  const userRole = req.user?.role as string | undefined;
  if (!req.user || userRole !== "superadmin") {
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