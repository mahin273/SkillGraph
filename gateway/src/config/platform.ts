import { prisma } from "@skillgraph/database";

export type PlatformConfig = {
  skillDecayRate: number;
  scanCooldownHours: number;
  sessionDurationSeconds: number;
  isMaintenanceMode: boolean;
  isIngestionDisabled: boolean;
  isNlpThrottled: boolean;
};

const CONFIG_KEY = "global";

export const defaultPlatformConfig: PlatformConfig = {
  skillDecayRate: 0.15,
  scanCooldownHours: 1,
  sessionDurationSeconds: 900,
  isMaintenanceMode: false,
  isIngestionDisabled: false,
  isNlpThrottled: false
};

export let globalConfig: PlatformConfig = { ...defaultPlatformConfig };

function normalizeConfig(value: unknown): PlatformConfig {
  const config = typeof value === "object" && value !== null ? value as Partial<PlatformConfig> : {};

  return {
    skillDecayRate: typeof config.skillDecayRate === "number" ? config.skillDecayRate : defaultPlatformConfig.skillDecayRate,
    scanCooldownHours: typeof config.scanCooldownHours === "number" ? config.scanCooldownHours : defaultPlatformConfig.scanCooldownHours,
    sessionDurationSeconds: typeof config.sessionDurationSeconds === "number" ? config.sessionDurationSeconds : defaultPlatformConfig.sessionDurationSeconds,
    isMaintenanceMode: typeof config.isMaintenanceMode === "boolean" ? config.isMaintenanceMode : defaultPlatformConfig.isMaintenanceMode,
    isIngestionDisabled: typeof config.isIngestionDisabled === "boolean" ? config.isIngestionDisabled : defaultPlatformConfig.isIngestionDisabled,
    isNlpThrottled: typeof config.isNlpThrottled === "boolean" ? config.isNlpThrottled : defaultPlatformConfig.isNlpThrottled
  };
}

export async function loadPlatformConfig(): Promise<PlatformConfig> {
  const record = await prisma.platformConfig.findUnique({
    where: { key: CONFIG_KEY }
  });

  globalConfig = normalizeConfig(record?.value);
  return globalConfig;
}

export async function updatePlatformConfig(patch: Partial<PlatformConfig>): Promise<PlatformConfig> {
  const next = normalizeConfig({ ...globalConfig, ...patch });

  await prisma.platformConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: next },
    update: { value: next }
  });

  globalConfig = next;
  return globalConfig;
}
