import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { redactObject, DEFAULT_PII_KEYS, maskEmail } from "./pii";

export type LogLevel = "error" | "warn" | "info" | "debug" | "security";

export interface SecurityEvent {
  type: "auth" | "access" | "data" | "config" | "scan" | "brute_force" | "csrf" | "ssrf" | "integration";
  action: string;
  userId?: number | null;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

const CUSTOM_LEVELS = {
  levels: {
    error: 0,
    warn: 1,
    security: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    security: "magenta",
    info: "green",
    debug: "cyan",
  },
};

winston.addColors(CUSTOM_LEVELS.colors);

let currentConfig = {
  level: "info" as string,
  retentionDays: 90,
  piiMasking: true,
  securityEvents: true,
};

const METADATA_SKIP_KEYS = new Set(["level", "message", "timestamp", "service", "source"]);

const piiRedactFormat = winston.format((info) => {
  if (!currentConfig.piiMasking) return info;

  if (info.message && typeof info.message === "string") {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    info.message = info.message.replace(emailRegex, (match: string) => maskEmail(match));
  }

  if (info.stack && typeof info.stack === "string") {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    info.stack = info.stack.replace(emailRegex, (match: string) => maskEmail(match));
  }

  for (const key of Object.keys(info)) {
    if (METADATA_SKIP_KEYS.has(key)) continue;
    if (DEFAULT_PII_KEYS.includes(key)) {
      info[key] = "[redacted]";
    } else if (typeof info[key] === "object" && info[key] !== null) {
      info[key] = redactObject(info[key], DEFAULT_PII_KEYS);
    }
  }

  return info;
});

const logsDir = path.join(process.cwd(), "logs");

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
      return `${timestamp} [${level}] ${message}${metaStr}`;
    })
  ),
});

const fileTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: "app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxFiles: `${currentConfig.retentionDays}d`,
  maxSize: "20m",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const securityTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: "security-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxFiles: `${currentConfig.retentionDays}d`,
  maxSize: "20m",
  level: "security",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const errorTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxFiles: `${currentConfig.retentionDays}d`,
  maxSize: "20m",
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const logger = winston.createLogger({
  levels: CUSTOM_LEVELS.levels,
  level: currentConfig.level,
  format: winston.format.combine(
    piiRedactFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    consoleTransport,
    fileTransport,
    securityTransport,
    errorTransport,
  ],
  defaultMeta: { service: "audit-expert" },
});

export function updateLoggerConfig(config: {
  level?: string;
  retentionDays?: number;
  piiMasking?: boolean;
  securityEvents?: boolean;
}) {
  if (config.level) {
    currentConfig.level = config.level;
    logger.level = config.level;
  }
  if (config.retentionDays !== undefined) {
    currentConfig.retentionDays = config.retentionDays;
  }
  if (config.piiMasking !== undefined) {
    currentConfig.piiMasking = config.piiMasking;
  }
  if (config.securityEvents !== undefined) {
    currentConfig.securityEvents = config.securityEvents;
  }
}

export function getLoggerConfig() {
  return { ...currentConfig };
}

export function logSecurity(event: SecurityEvent) {
  if (!currentConfig.securityEvents) return;

  const details = event.details ? redactObject(event.details, DEFAULT_PII_KEYS) as Record<string, unknown> : {};

  const meta: Record<string, unknown> = {
    eventType: event.type,
    action: event.action,
    userId: event.userId,
    ip: event.ip,
    userAgent: event.userAgent,
    success: event.success,
    ...details,
  };

  if (currentConfig.piiMasking && meta.ip && typeof meta.ip === "string") {
    const parts = (meta.ip as string).split(".");
    if (parts.length === 4) {
      meta.ip = `${parts[0]}.${parts[1]}.***.***`;
    }
  }

  logger.log("security", `[SECURITY] ${event.type}:${event.action}`, meta);
}

export async function getRecentLogs(options: {
  level?: string;
  limit?: number;
  type?: "all" | "security" | "error";
}): Promise<Array<{ timestamp: string; level: string; message: string; meta?: Record<string, unknown> }>> {
  const fs = await import("fs");
  const readline = await import("readline");

  const limit = options.limit || 100;
  const type = options.type || "all";

  let logFile: string;
  const today = new Date().toISOString().split("T")[0];

  switch (type) {
    case "security":
      logFile = path.join(logsDir, `security-${today}.log`);
      break;
    case "error":
      logFile = path.join(logsDir, `error-${today}.log`);
      break;
    default:
      logFile = path.join(logsDir, `app-${today}.log`);
  }

  if (!fs.existsSync(logFile)) {
    return [];
  }

  const lines: string[] = [];
  const stream = fs.createReadStream(logFile, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line);
    }
  }

  const result = lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { timestamp: new Date().toISOString(), level: "info", message: line };
    }
  });

  if (options.level) {
    return result.filter((log: any) => log.level === options.level);
  }

  return result;
}

export async function getLogStats(): Promise<{
  totalToday: number;
  errorCount: number;
  securityCount: number;
  warnCount: number;
}> {
  const [allLogs, errorLogs, securityLogs] = await Promise.all([
    getRecentLogs({ type: "all", limit: 10000 }),
    getRecentLogs({ type: "error", limit: 10000 }),
    getRecentLogs({ type: "security", limit: 10000 }),
  ]);

  return {
    totalToday: allLogs.length,
    errorCount: errorLogs.length,
    securityCount: securityLogs.length,
    warnCount: allLogs.filter((l) => l.level === "warn").length,
  };
}

export default logger;
