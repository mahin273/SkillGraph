import { Router } from "express";
import { saveSimulation, getSimulations, deleteSimulation } from "../controllers/simulator.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/save", requireAuth, saveSimulation);
router.get("/:studentId", requireAuth, getSimulations);
router.delete("/:id", requireAuth, deleteSimulation);

export default router;