import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { env } from "../config/env.js";
import { fail, ok } from "../utils/apiResponse.js";
import { decryptToken } from "../utils/crypto.js";
import { getRedis } from "../utils/redis.js";
import { globalConfig } from "./admin.controller.js";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

function getRateLimitWindowMs(): number {
  if (env.NODE_ENV === "development") {
    return 5 * 1000;
  }
  return globalConfig.scanCooldownHours * 60 * 60 * 1000;
}

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
  if (!response.ok) throw Object.assign(new Error(`GitHub request failed: ${url}`), { statusCode: 502, code: "GITHUB_FETCH_FAILED" });
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

/**
 * Schedule a user for automatic re-ingestion 72 hours from now
 */
async function scheduleNextIngestion(userId: string) {
  const redis = await getRedis();
  const nextIngestionTime = Date.now() + SEVENTY_TWO_HOURS_MS;
  await redis.zAdd("ingestion:schedule", { score: nextIngestionTime, value: userId });
}

/**
 * Check if user is rate-limited for manual re-ingestion
 */
async function getManualIngestionAvailableAt(userId: string): Promise<Date | undefined> {
  const redis = await getRedis();
  const lastManualIngestion = await redis.get(`ingestion:ratelimit:${userId}`);
  if (!lastManualIngestion) return undefined;

  const lastManualIngestionAt = parseInt(lastManualIngestion, 10);
  if (Number.isNaN(lastManualIngestionAt)) return undefined;

  const availableAt = lastManualIngestionAt + getRateLimitWindowMs();
  return Date.now() < availableAt ? new Date(availableAt) : undefined;
}

/**
 * Set rate limit for manual re-ingestion
 */
async function setRateLimit(userId: string) {
  const redis = await getRedis();
  await redis.set(`ingestion:ratelimit:${userId}`, Date.now().toString(), {
    PX: getRateLimitWindowMs()
  });
}

export async function triggerIngestion(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const manualIngestionAvailableAt = await getManualIngestionAvailableAt(req.user.id);
  if (manualIngestionAvailableAt) {
    const retryAfterSeconds = Math.max(1, Math.ceil((manualIngestionAvailableAt.getTime() - Date.now()) / 1000));
    res.setHeader("Retry-After", retryAfterSeconds.toString());
    fail(res, "RATE_LIMITED", `Please wait until ${manualIngestionAvailableAt.toISOString()} before triggering another ingestion`, 429);
    return;
  }

  const connection = await prisma.oauthConnection.findFirst({
    where: { userId: req.user.id, provider: "github" },
    orderBy: { createdAt: "desc" }
  });
  if (!connection) {
    fail(res, "GITHUB_NOT_CONNECTED", "Connect GitHub before triggering ingestion", 409);
    return;
  }

  // Publish ingestion job to Redis Stream
  const redis = await getRedis();
  const jobId = await redis.xAdd("ingestion:queue", "*", {
    userId: req.user.id,
    queuedAt: new Date().toISOString(),
    type: "manual"
  });

  // Set rate limit and schedule next automatic ingestion
  await setRateLimit(req.user.id);
  await scheduleNextIngestion(req.user.id);
  const nextManualIngestionAvailableAt = new Date(Date.now() + getRateLimitWindowMs());

  // Store job status in Redis
  await redis.hSet(`ingestion:status:${req.user.id}`, {
    jobId,
    status: "queued",
    queuedAt: new Date().toISOString()
  });

  ok(res, {
    status: "queued",
    stream: "ingestion:queue",
    jobId,
    manualIngestionAvailableAt: nextManualIngestionAvailableAt.toISOString(),
    message: "Ingestion job queued for processing"
  }, 202);
}

export async function getIngestionStatus(req: Request, res: Response) {
  const redis = await getRedis();
  const statusData = await redis.hGetAll(`ingestion:status:${req.params.userId}`);
  const manualIngestionAvailableAt = await getManualIngestionAvailableAt(req.params.userId);
  
  if (!statusData || Object.keys(statusData).length === 0) {
    // Check if user has any repositories (legacy check)
    const repositoryCount = await prisma.githubRepository.count({ where: { userId: req.params.userId } });
    const latest = await prisma.githubRepository.findFirst({
      where: { userId: req.params.userId },
      orderBy: { lastIngestedAt: "desc" }
    });

    ok(res, {
      userId: req.params.userId,
      status: latest?.lastIngestedAt ? "completed" : "not_started",
      repositoryCount,
      lastIngestedAt: latest?.lastIngestedAt,
      manualIngestionAvailableAt: manualIngestionAvailableAt?.toISOString()
    });
    return;
  }

  ok(res, {
    userId: req.params.userId,
    status: statusData.status,
    jobId: statusData.jobId,
    queuedAt: statusData.queuedAt,
    startedAt: statusData.startedAt,
    completedAt: statusData.completedAt,
    manualIngestionAvailableAt: manualIngestionAvailableAt?.toISOString(),
    repositoryCount: statusData.repositoryCount ? parseInt(statusData.repositoryCount, 10) : undefined,
    skillsFound: statusData.skillsFound ? parseInt(statusData.skillsFound, 10) : undefined,
    error: statusData.error
  });
}