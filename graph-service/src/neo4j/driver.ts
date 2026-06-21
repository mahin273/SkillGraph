import neo4j from "neo4j-driver";
import { env } from "../config/env.js";

export const driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD));

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
