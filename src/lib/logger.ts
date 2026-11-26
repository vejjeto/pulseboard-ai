import crypto from "node:crypto";
import pino, { type Logger } from "pino";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "*.apiKey",
  "*.api_key",
  "*.token",
  "*.secret",
  "*.password",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "WEBHOOK_SECRET",
  "DATABASE_URL",
  "POSTGRES_URL",
];

export const logger: Logger = pino({
  name: "pulseboard-ai",
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "test" ? "silent" : "info"),
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  base: {
    service: "pulseboard-ai",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function getOrCreateRequestId(headers?: Pick<Headers, "get">): string {
  const existing = headers?.get("x-request-id")?.trim();
  return existing && existing.length > 0 ? existing : crypto.randomUUID();
}

export function createRequestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}
