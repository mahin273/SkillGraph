import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { runWrite } from "../neo4j/driver.js";
import { prisma } from "@skillgraph/database";

const redis = new Redis(env.REDIS_URL);
const STREAM_KEY = "graph:update:queue";
const CONSUMER_GROUP = "graph-service";
const CONSUMER_NAME = `graph-service-${process.pid}`;
const BLOCK_MS = 5000;
const BATCH_SIZE = 10;

interface ExtractedSkill {
  skill_name: string;
  confidence: number;
  source_repos: string[];
}

interface GraphUpdateMessage {
  student_id: string;
  extracted_skills: ExtractedSkill[];
}

async function ensureConsumerGroup(redis: Redis): Promise<void> {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, CONSUMER_GROUP, "0", "MKSTREAM");
  } catch (err: unknown) {
    // BUSYGROUP means the group already exists — that's fine
    if (err instanceof Error && !err.message.includes("BUSYGROUP")) {
      throw err;
    }
  }
}

async function processMessage(message: GraphUpdateMessage): Promise<void> {
  const { student_id, extracted_skills } = message;

  if (!student_id || !Array.isArray(extracted_skills)) {
    console.warn("[graphUpdate.consumer] Skipping malformed message:", message);
    return;
  }

  // Fetch student's universityId and publicHandle from Postgres
  let universityId: string | null = null;
  let publicHandle: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: student_id },
      select: {
        universityId: true,
        studentProfile: {
          select: { publicHandle: true }
        }
      }
    });
    universityId = user?.universityId ?? null;
    publicHandle = user?.studentProfile?.publicHandle ?? null;
  } catch (err) {
    console.error(`[graphUpdate.consumer] Failed to query universityId and handle for student ${student_id}:`, err);
  }

  // Upsert Student node
  await runWrite(
    `
    MERGE (s:Student {id: $studentId})
    SET s.universityId = $universityId,
        s.handle = coalesce($publicHandle, s.handle),
        s.updatedAt = timestamp()
    `,
    { studentId: student_id, universityId, publicHandle }
  );

  // Upsert each Skill node and KNOWS edge
  for (const skill of extracted_skills) {
    const { skill_name, confidence, source_repos } = skill;
    if (!skill_name) continue;

    // proficiency = confidence (base; endorsements boost it later)
    const proficiency = confidence;
    const lastActive = Date.now();

    await runWrite(
      `
      MERGE (sk:Skill {name: $skillName})
      ON CREATE SET sk.category = 'Uncategorized'
      WITH sk
      MATCH (s:Student {id: $studentId})
      MERGE (s)-[r:KNOWS]->(sk)
      SET r.confidence = $confidence,
          r.proficiency = $proficiency,
          r.endorsementCount = coalesce(r.endorsementCount, 0),
          r.lastActive = $lastActive,
          r.dormant = false,
          r.sourceRepos = $sourceRepos
      `,
      {
        studentId: student_id,
        skillName: skill_name,
        confidence,
        proficiency,
        lastActive,
        sourceRepos: source_repos ?? []
      }
    );
  }

  // Invalidate Redis cache keys for this student
  try {
    const keys = await redis.keys(`career-gps:${student_id}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(
        `[graphUpdate.consumer] Invalidated ${keys.length} cached GPS paths for student ${student_id}`
      );
    }
  } catch (err) {
    console.error(
      `[graphUpdate.consumer] Failed to invalidate Redis cache for student ${student_id}:`,
      err
    );
  }

  console.log(
    `[graphUpdate.consumer] Synced ${extracted_skills.length} skills for student ${student_id}`
  );
}

export async function startGraphUpdateConsumer(): Promise<void> {
  await ensureConsumerGroup(redis);
  console.log(
    `[graphUpdate.consumer] Listening on stream "${STREAM_KEY}" as group "${CONSUMER_GROUP}"`
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const results = await redis.xreadgroup(
        "GROUP",
        CONSUMER_GROUP,
        CONSUMER_NAME,
        "COUNT",
        BATCH_SIZE,
        "BLOCK",
        BLOCK_MS,
        "STREAMS",
        STREAM_KEY,
        ">"
      );

      if (!results) continue;

      for (const [, entries] of results as [string, [string, string[]][]][]) {
        for (const [messageId, fields] of entries) {
          // Redis XREADGROUP returns fields as a flat [key, value, key, value, ...] array
          const fieldMap: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            fieldMap[fields[i]] = fields[i + 1];
          }

          let parsed: GraphUpdateMessage | null = null;
          try {
            // The NLP service publishes the payload as a JSON string in the "data" field
            const raw = fieldMap["data"] ?? fieldMap["payload"] ?? JSON.stringify(fieldMap);
            parsed = JSON.parse(raw) as GraphUpdateMessage;
          } catch {
            console.error(
              `[graphUpdate.consumer] Failed to parse message ${messageId}:`,
              fieldMap
            );
          }

          if (parsed) {
            try {
              await processMessage(parsed);
            } catch (err) {
              console.error(
                `[graphUpdate.consumer] Error processing message ${messageId}:`,
                err
              );
              // Don't ACK — leave for retry / dead-letter handling
              continue;
            }
          }

          // ACK the message so it won't be redelivered
          await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
        }
      }
    } catch (err) {
      console.error("[graphUpdate.consumer] Stream read error:", err);
      // Brief pause before retrying to avoid tight error loops
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}