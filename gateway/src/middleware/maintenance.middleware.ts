import { globalConfig } from "../config/platform.js";
import { fail } from "../utils/apiResponse.js";
import { Request, Response, NextFunction } from "express";

export function checkMaintenanceMode(req: Request, res: Response, next: NextFunction) {
  // Allow admin calls and auth/login calls through even in maintenance mode
  const isAdminRoute = req.path.startsWith("/api/v1/admin") || req.path.startsWith("/admin");
  const isAuthRoute = req.path.startsWith("/api/v1/auth") || req.path.startsWith("/auth");
  if (globalConfig.isMaintenanceMode && !isAdminRoute && !isAuthRoute) {
    fail(res, "MAINTENANCE_MODE", "Platform is temporarily offline for maintenance. Please check back later.", 503);
    return;
  }
  next();
}

export function checkIngestionDisabled(req: Request, res: Response, next: NextFunction) {
  if (globalConfig.isIngestionDisabled) {
    fail(res, "INGESTION_DISABLED", "Manual GitHub repository scanning is temporarily disabled by the administrator.", 503);
    return;
  }
  next();
}
