import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const env = z
  .object({
    GRAPH_SERVICE_PORT: z.coerce.number().default(3001),
    NEO4J_URI: z.string().default("bolt://neo4j:7687"),
    NEO4J_USER: z.string().default("neo4j"),
    NEO4J_PASSWORD: z.string().default("skillgraph-password"),
    REDIS_URL: z.string().default("redis://redis:6379"),
    DATABASE_URL: z.string().optional()
  })
  .parse(process.env);
