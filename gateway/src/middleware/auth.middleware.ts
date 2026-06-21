import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

/**
 * Validates a JWT from either:
 *  1. The `Authorization: Bearer <token>` header, OR
 *  2. The `skillgraph_access` httpOnly cookie
 *
 * Sets `req.user` on success; returns 401 on failure.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Prefer Authorization header; fall back to httpOnly cookie
  const header = req.header("authorization");
  let token: string | undefined;

  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length);
  } else if (req.cookies?.skillgraph_access) {
    token = req.cookies.skillgraph_access as string;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing bearer token", statusCode: 401 }
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      githubHandle: payload.githubHandle,
      universityId: payload.universityId,
      isVerified: payload.isVerified
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token", statusCode: 401 }
    });
  }
}