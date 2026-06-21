import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "skillgraph";

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function runRead<T>(cypher: string, params: Record<string, unknown> = {}) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject()) as T[];
  } finally {
    await session.close();
  }
}

export async function runWrite<T>(cypher: string, params: Record<string, unknown> = {}) {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject()) as T[];
  } finally {
    await session.close();
  }
}