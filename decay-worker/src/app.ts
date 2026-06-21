import cron from "node-cron";
import { runDecayCycle } from "./jobs/decayCycle.job.js";

cron.schedule("0 2 * * *", () => {
  void runDecayCycle();
});

console.log("SkillGraph decay worker scheduled.");
