import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { endorsementsRouter } from "./endorsements.routes.js";
import { ingestionRouter } from "./ingestion.routes.js";
import { matchmakerRouter } from "./matchmaker.routes.js";
import notificationsRouter from "./notifications.routes.js";
import { proxyRouter } from "./proxy.routes.js";
import { teamRouter } from "./team.routes.js";
import { resourcesRouter } from "./resources.routes.js";
import { roleManagementRouter } from "./roleManagement.routes.js";
import { decayRouter } from "./decay.routes.js";
import simulatorRouter from "./simulator.routes.js";
import { resumeRouter } from "./resume.routes.js";
import { careerFairRouter } from "./careerFair.routes.js";
import { mentorshipRouter } from "./mentorship.routes.js";
import { alumniVerificationRouter } from "./alumniVerification.routes.js";
import { adminRouter } from "./admin.routes.js";
import { checkMaintenanceMode } from "../middleware/maintenance.middleware.js";
export const router = Router();

router.use(checkMaintenanceMode)
router.use("/auth", authRouter);
router.use("/ingestion", ingestionRouter);
router.use("/matchmaker", matchmakerRouter);
router.use("/endorsements", endorsementsRouter);
router.use("/notifications", notificationsRouter);
router.use("/team", teamRouter);
router.use("/resources", resourcesRouter);
router.use("/skills", decayRouter);
router.use("/simulator", simulatorRouter);
router.use("/resume", resumeRouter);
router.use("/career-fair", careerFairRouter);
router.use("/mentors", mentorshipRouter);
router.use("/", alumniVerificationRouter);
router.use("/", roleManagementRouter);
router.use("/", proxyRouter);
router.use("/",adminRouter)
