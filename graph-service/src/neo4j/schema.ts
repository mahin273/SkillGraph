import { runWrite } from "./driver.js";

export async function initializeSchema(): Promise<void> {
  console.log("[Neo4j Schema] Initializing constraints and indexes...");
  try {
    // Unique constraints
    await runWrite("CREATE CONSTRAINT student_id_unique IF NOT EXISTS FOR (s:Student) REQUIRE s.id IS UNIQUE");
    await runWrite("CREATE CONSTRAINT skill_name_unique IF NOT EXISTS FOR (sk:Skill) REQUIRE sk.name IS UNIQUE");
    await runWrite("CREATE CONSTRAINT role_id_unique IF NOT EXISTS FOR (r:Role) REQUIRE r.id IS UNIQUE");

    // Indexes for fast lookup
    await runWrite("CREATE INDEX student_handle_idx IF NOT EXISTS FOR (s:Student) ON (s.githubHandle)");
    await runWrite("CREATE INDEX skill_category_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.category)");

    console.log("[Neo4j Schema] Database schema constraints and indexes initialized successfully.");
  } catch (error) {
    console.error("[Neo4j Schema] Failed to initialize constraints/indexes:", error);
  }
}