import express from "express";
import { env } from "./config/env.js";
import { graphRouter } from "./routes/graph.routes.js";
import careerGpsRouter from "./routes/careerGps.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import simulatorRouter from "./routes/simulator.routes.js";
import { startGraphUpdateConsumer } from "./consumers/graphUpdate.consumer.js";
import{initializeSchema}from "./neo4j/schema.js";
const app = express();

app.use(express.json({ limit: "10mb" }));
app.get("/health", (_req, res) => res.json({ success: true, data: { service: "graph-service", status: "ok" } }));
app.use("/graph", careerGpsRouter);
app.use("/graph", analyticsRouter);
app.use("/graph", simulatorRouter);
app.use("/graph", graphRouter);


initializeSchema().catch((err) => {
  console.error("[Neo4j Schema] Failed to initialize on startup:", err);
});

app.listen(env.GRAPH_SERVICE_PORT, () => {
  console.log(`SkillGraph graph service listening on ${env.GRAPH_SERVICE_PORT}`);
});

// Start the Redis Stream consumer in the background
startGraphUpdateConsumer().catch((err) => {
  console.error("[graphUpdate.consumer] Fatal error:", err);
  process.exit(1);
});