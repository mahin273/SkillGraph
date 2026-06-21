import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../controllers/notifications.controller.js";

const router = Router();

router.get("/", requireAuth, getUnreadNotifications);
router.put("/:id/read", requireAuth, markNotificationAsRead);
router.put("/read-all", requireAuth, markAllNotificationsAsRead);

export default router;
