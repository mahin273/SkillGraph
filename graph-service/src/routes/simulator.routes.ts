import { Router } from "express";
import { runSimulation } from "../controllers/simulator.controller.js";

const router = Router();

router.post("/simulator/run", runSimulation);

export default router;