import { Router } from "express";
import { getCareerGPS, saveCareerGPS, getCareerGPSHistory } from "../controllers/careerGps.controller.js";

const router = Router();

router.get("/career-gps", getCareerGPS);
router.post("/career-gps/save", saveCareerGPS);
router.get("/career-gps/history/:studentId", getCareerGPSHistory);

export default router;
