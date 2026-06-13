import { prisma } from "@skillgraph/database";
import { env } from "../config/env.js";
import { decryptToken } from "../utils/crypto.js";
import { getRedis } from "../utils/redis.js";

type GithubRepositoryPayload = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  default_branch: string;
};

type GithubCommitPayload = {
  sha: string;
  commit: {
    message: string;
    author?: {
      date?: string;
    };
  };
};

async function githubJson<T>(url: string, token: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "skillgraph-gateway"
    }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw Object.assign(new Error(`GitHub request failed: ${url}`), {
      statusCode: 502,
      code: "GITHUB_FETCH_FAILED"
    });
  }
  return (await response.json()) as T;
}

async function fetchReadme(repoFullName: string, token: string) {
  const payload = await githubJson<{ content?: string; encoding?: string }>(
    `https://api.github.com/repos/${repoFullName}/readme`,
    token
  );
  if (!payload?.content || payload.encoding !== "base64") return "";
  return Buffer.from(payload.content, "base64").toString("utf8");
}

async function checkRateLimit(token: string): Promise<{ remaining: number; resetAt: number }> {
  const response = await fetch("https://api.github.com/rate_limit", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "skillgraph-gateway"
    }
  });
  const data = (await response.json()) as { resources: { core: { remaining: number; reset: number } } };
  return {
    remaining: data.resources.core.remaining,
    resetAt: data.resources.core.reset * 1000 // Convert to milliseconds
  };
}

async function processIngestionJob(userId: string, jobId: string) {
  const redis = await getRedis();

  try {
    await redis.hDel(`ingestion:status:${userId}`, "error");

    // Update status to processing
    await redis.hSet(`ingestion:status:${userId}`, {
      status: "processing",
      startedAt: new Date().toISOString()
    });

    // Get GitHub access token
    const connection = await prisma.oauthConnection.findFirst({
      where: { userId, provider: "github" },
      orderBy: { createdAt: "desc" }
    });

    if (!connection) {
      throw new Error("GitHub connection not found");
    }

    const token = decryptToken(connection.accessTokenEnc);

    // Check rate limit
    const rateLimit = await checkRateLimit(token);
    if (rateLimit.remaining < 100) {
      console.log(`Rate limit low (${rateLimit.remaining}), re-queueing job for user ${userId}`);
      const delayUntil = rateLimit.resetAt + 60000; // Add 1 minute buffer
      await redis.zAdd("ingestion:schedule", { score: delayUntil, value: userId });
      await redis.hSet(`ingestion:status:${userId}`, {
        status: "rate_limited",
        rateLimitResetAt: new Date(rateLimit.resetAt).toISOString()
      });
      return;
    }

    // Fetch repositories
    const repos =
      (await githubJson<GithubRepositoryPayload[]>(
        "https://api.github.com/user/repos?visibility=public&affiliation=owner&per_page=50&sort=updated",
        token
      )) ?? [];

    // Handle zero repositories case
    if (repos.length === 0) {
      await redis.hSet(`ingestion:status:${userId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
        repositoryCount: "0",
        skillsFound: "0"
      });
      return;
    }

    const storedRepositories = [];
    for (const repo of repos) {
      const [readme, commits] = await Promise.all([
        fetchReadme(repo.full_name, token),
        githubJson<GithubCommitPayload[]>(
          `https://api.github.com/repos/${repo.full_name}/commits?per_page=50`,
          token
        )
      ]);

      const stored = await prisma.githubRepository.upsert({
        where: { githubRepoId: BigInt(repo.id) },
        update: {
          userId,
          repoName: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          starsCount: repo.stargazers_count,
          isFork: repo.fork,
          rawReadmeText: readme,
          lastIngestedAt: new Date()
        },
        create: {
          userId,
          githubRepoId: BigInt(repo.id),
          repoName: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          starsCount: repo.stargazers_count,
          isFork: repo.fork,
          rawReadmeText: readme,
          lastIngestedAt: new Date()
        }
      });

      for (const commit of commits ?? []) {
        await prisma.githubCommit.upsert({
          where: { sha: commit.sha },
          update: {
            message: commit.commit.message,
            committedAt: commit.commit.author?.date ? new Date(commit.commit.author.date) : new Date()
          },
          create: {
            repoId: stored.id,
            sha: commit.sha,
            message: commit.commit.message,
            committedAt: commit.commit.author?.date ? new Date(commit.commit.author.date) : new Date()
          }
        });
      }

      storedRepositories.push({
        id: stored.id,
        name: stored.repoName,
        fullName: stored.fullName,
        description: stored.description,
        language: stored.language,
        readme,
        commits: (commits ?? []).map((commit) => commit.commit.message)
      });
    }

    // Update status with repository count
    await redis.hSet(`ingestion:status:${userId}`, {
      repositoryCount: String(storedRepositories.length)
    });

    // Call NLP service
    const nlpResponse = await fetch(`${env.NLP_SERVICE_URL}/api/v1/nlp/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ student_id: userId, repositories: storedRepositories })
    });

    if (!nlpResponse.ok) {
      throw new Error("NLP extraction failed");
    }

    const nlpEnvelope = (await nlpResponse.json()) as { data: { extracted_skills: unknown[] } };

    // Call Graph service
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    });
    const graphRepositories = storedRepositories.map(({ id, name, fullName, description, language }) => ({
      id,
      name,
      fullName,
      description,
      language
    }));
    const graphResponse = await fetch(`${env.GRAPH_SERVICE_URL}/graph/update`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: userId,
        githubHandle: user?.githubHandle,
        publicHandle: user?.studentProfile?.publicHandle,
        repositories: graphRepositories,
        skills: nlpEnvelope.data.extracted_skills
      })
    });
    if (!graphResponse.ok) {
      throw new Error(`Graph update failed with status ${graphResponse.status}`);
    }

    // Update status to completed
    await redis.hDel(`ingestion:status:${userId}`, "error");
    await redis.hSet(`ingestion:status:${userId}`, {
      status: "completed",
      completedAt: new Date().toISOString(),
      skillsFound: String(nlpEnvelope.data.extracted_skills.length)
    });

    // Schedule next automatic re-ingestion in 72 hours
    const nextIngestionTime = Date.now() + 72 * 60 * 60 * 1000;
    await redis.zAdd("ingestion:schedule", { score: nextIngestionTime, value: userId });

    // Publish notification
    await redis.publish(
      "notifications:publish",
      JSON.stringify({
        type: "INGESTION_COMPLETE",
        userId,
        payload: {
          skillsFound: nlpEnvelope.data.extracted_skills.length,
          repositoryCount: storedRepositories.length
        }
      })
    );

    console.log(`Ingestion completed for user ${userId}: ${nlpEnvelope.data.extracted_skills.length} skills found`);
  } catch (error) {
    console.error(`Ingestion failed for user ${userId}:`, error);
    await redis.hSet(`ingestion:status:${userId}`, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Start the ingestion worker that processes jobs from the queue
 */
export async function startIngestionWorker() {
  const redis = await getRedis();
  console.log("Ingestion worker started");

  let lastId = "0-0"; // Process any queued jobs left behind before watching new messages.

  // Process jobs from the stream
  while (true) {
    try {
      const messages = await redis.xRead(
        { key: "ingestion:queue", id: lastId },
        { COUNT: 1, BLOCK: 5000 }
      );

      if (messages && messages.length > 0) {
        for (const message of messages) {
          for (const entry of message.messages) {
            const data = entry.message as { userId: string };
            console.log(`Processing ingestion job ${entry.id} for user ${data.userId}`);
            await processIngestionJob(data.userId, entry.id);
            // Remove processed message
            await redis.xDel("ingestion:queue", entry.id);
            lastId = entry.id; // Update last processed ID
          }
        }
      }

      // Check for scheduled re-ingestions
      const now = Date.now();
      const dueUsers = await redis.zRangeByScore("ingestion:schedule", 0, now);

      for (const userId of dueUsers) {
        console.log(`Triggering automatic re-ingestion for user ${userId}`);
        await redis.xAdd("ingestion:queue", "*", {
          userId,
          queuedAt: new Date().toISOString(),
          type: "automatic"
        });
        // Remove from schedule (will be re-added after processing)
        await redis.zRem("ingestion:schedule", userId);
      }
    } catch (error) {
      console.error("Ingestion worker error:", error);
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
