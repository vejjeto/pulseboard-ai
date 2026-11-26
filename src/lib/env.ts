import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("data/app.db"),
  ),
  POSTGRES_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:3004"),
  ),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  WEBHOOK_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): AppEnv {
  if (source.SKIP_ENV_VALIDATION === "true") {
    const safe = EnvSchema.safeParse(source);
    if (safe.success) {
      return safe.data;
    }
    return {
      NODE_ENV:
        source.NODE_ENV === "production" || source.NODE_ENV === "test"
          ? source.NODE_ENV
          : "development",
      DATABASE_URL: source.DATABASE_URL?.trim() || "data/app.db",
      POSTGRES_URL: undefined,
      NEXT_PUBLIC_APP_URL: "http://localhost:3004",
      OPENAI_API_KEY: source.OPENAI_API_KEY?.trim() || undefined,
      GEMINI_API_KEY: source.GEMINI_API_KEY?.trim() || undefined,
      WEBHOOK_URL: undefined,
      WEBHOOK_SECRET: source.WEBHOOK_SECRET?.trim() || undefined,
      LOG_LEVEL: "info",
    };
  }

  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export const env: AppEnv = parseEnv(process.env);
