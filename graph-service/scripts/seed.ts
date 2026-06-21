import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import neo4j from "neo4j-driver";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();
const seedPath = path.resolve(__dirname, "../seeds/demo.seed.cypher");
const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const user = process.env.NEO4J_USER ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "skillgraph-password";

function splitCypherStatements(cypher: string) {
  return cypher
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

try {
  const cypher = await fs.readFile(seedPath, "utf8");
  const statements = splitCypherStatements(cypher);

  for (const statement of statements) {
    await session.run(statement);
  }

  console.log(`Seeded Neo4j Bangladesh demo graph with ${statements.length} statements.`);
} finally {
  await session.close();
  await driver.close();
}
