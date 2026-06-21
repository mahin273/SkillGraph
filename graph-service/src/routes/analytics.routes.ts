import { Router } from "express";
import {
  getSkillHeatmap,
  getIndustryGap,
  getMissingSkills,
  getSkillTrends
} from "../controllers/analytics.controller.js";

const router = Router();

router.get("/analytics/skill-heatmap", getSkillHeatmap);
router.get("/analytics/industry-gap", getIndustryGap);
router.get("/analytics/missing-skills", getMissingSkills);
router.get("/analytics/trend", getSkillTrends);

export default router;