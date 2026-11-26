export const EMBEDDING_DIMENSIONS = 64;
const TRIGRAM_DIMS = 48;

export type SemanticMode = "OpenAI Embeddings" | "Demo Local Vector";

export interface SemanticTaskInput {
  id: string;
  title: string;
  description: string;
  embeddingJson?: string | null;
}

export interface SemanticMatch<
  T extends SemanticTaskInput = SemanticTaskInput,
> {
  task: T;
  score: number;
  similarityPercent: number;
}

// 16 domain concept clusters (dims 48..63) enabling cross-term semantic recall without exact substring matches.
const SEMANTIC_CLUSTERS: ReadonlyArray<readonly string[]> = [
  [
    "stripe",
    "pago",
    "pagos",
    "billing",
    "checkout",
    "suscrip",
    "factura",
    "cobro",
    "cobros",
    "payment",
    "invoice",
    "tarjeta",
    "card",
  ],
  [
    "auth",
    "login",
    "oauth",
    "jwt",
    "rbac",
    "seguridad",
    "security",
    "sesion",
    "session",
    "token",
    "permiso",
    "acceso",
    "password",
  ],
  [
    "telemetria",
    "telemetry",
    "opentelemetry",
    "metricas",
    "metrics",
    "latencia",
    "latency",
    "p95",
    "rendimiento",
    "performance",
    "observab",
    "monitor",
  ],
  [
    "dark",
    "light",
    "tema",
    "theme",
    "token",
    "tokens",
    "wcag",
    "contraste",
    "accesib",
    "color",
    "paleta",
    "oscuro",
    "claro",
    "css",
  ],
  [
    "movil",
    "mobile",
    "touch",
    "drag",
    "drop",
    "dnd",
    "arrastrar",
    "tarjeta",
    "kanban",
    "columna",
    "scroll",
  ],
  [
    "tabla",
    "table",
    "csv",
    "json",
    "export",
    "exportar",
    "descarga",
    "filtro",
    "tanstack",
    "ordenar",
    "sort",
  ],
  [
    "calendario",
    "calendar",
    "fecha",
    "fechas",
    "due",
    "vencimiento",
    "plazo",
    "mensual",
    "mes",
    "schedule",
  ],
  [
    "ia",
    "ai",
    "llm",
    "zod",
    "prompt",
    "rag",
    "agente",
    "decompose",
    "desglosar",
    "heurist",
    "openai",
    "gemini",
    "modelo",
  ],
  [
    "vector",
    "pgvector",
    "embedding",
    "embeddings",
    "semantic",
    "semantica",
    "duplicad",
    "similitud",
    "cosine",
    "hnsw",
    "busqueda",
  ],
  [
    "db",
    "database",
    "sqlite",
    "postgres",
    "postgresql",
    "drizzle",
    "schema",
    "esquema",
    "migracion",
    "relacional",
    "sql",
  ],
  [
    "test",
    "tests",
    "pruebas",
    "vitest",
    "playwright",
    "e2e",
    "ci",
    "pipeline",
    "lint",
    "biome",
    "typecheck",
    "build",
    "verificacion",
  ],
  [
    "webhook",
    "webhooks",
    "hmac",
    "sha256",
    "firma",
    "firmado",
    "idempoten",
    "evento",
    "reintento",
  ],
  [
    "onboarding",
    "landing",
    "hero",
    "cta",
    "demo",
    "preview",
    "producto",
    "valor",
  ],
  [
    "wip",
    "cuello",
    "bottleneck",
    "sobrecarga",
    "salud",
    "health",
    "insights",
    "riesgo",
    "bloqueo",
  ],
  [
    "rollback",
    "error",
    "red",
    "network",
    "503",
    "optimista",
    "snapshot",
    "revertir",
    "fallo",
  ],
  [
    "fractional",
    "fraccional",
    "index",
    "indexing",
    "position",
    "posicion",
    "rebalance",
    "rebalanceo",
    "biseccion",
    "gap",
  ],
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function normalizeVector(vec: number[]): number[] {
  let normSq = 0;
  for (const val of vec) {
    normSq += val * val;
  }
  if (normSq === 0) {
    return vec.map(() => 0);
  }
  const invNorm = 1 / Math.sqrt(normSq);
  return vec.map((val) => Number((val * invNorm).toFixed(6)));
}

export function computeLocalEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const normalized = normalizeText(text);
  if (!normalized) {
    return vec;
  }

  const tokens = normalized.split(" ").filter((t) => t.length >= 2);
  for (const token of tokens) {
    const tokenDim = fnv1aHash(`tok:${token}`) % TRIGRAM_DIMS;
    vec[tokenDim] = (vec[tokenDim] ?? 0) + 2.2;

    if (token.length >= 3) {
      for (let i = 0; i <= token.length - 3; i += 1) {
        const tri = token.slice(i, i + 3);
        const triDim = fnv1aHash(`tri:${tri}`) % TRIGRAM_DIMS;
        vec[triDim] = (vec[triDim] ?? 0) + 1.0;
      }
    }

    for (let cIdx = 0; cIdx < SEMANTIC_CLUSTERS.length; cIdx += 1) {
      const cluster = SEMANTIC_CLUSTERS[cIdx];
      if (!cluster) continue;
      if (cluster.some((kw) => token.includes(kw) || kw.includes(token))) {
        const dim = TRIGRAM_DIMS + cIdx;
        vec[dim] = (vec[dim] ?? 0) + 3.5;
      }
    }
  }

  return normalizeVector(vec);
}

export async function computeTextEmbedding(
  text: string,
): Promise<{ vector: number[]; mode: SemanticMode }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const clean = text.trim();
  if (apiKey && clean.length > 0) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: clean,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data?: Array<{ embedding?: number[] }>;
        };
        const rawVec = json.data?.[0]?.embedding;
        if (Array.isArray(rawVec) && rawVec.length === EMBEDDING_DIMENSIONS) {
          return {
            vector: normalizeVector(rawVec),
            mode: "OpenAI Embeddings",
          };
        }
      }
    } catch {
      // Fall back to deterministic local vector embedding on timeout or network failure.
    }
  }

  return {
    vector: computeLocalEmbedding(clean),
    mode: "Demo Local Vector",
  };
}

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, raw));
}

export function parseEmbeddingJson(
  raw: string | null | undefined,
): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === EMBEDDING_DIMENSIONS &&
      parsed.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveTaskVector(
  task: SemanticTaskInput,
  mode: SemanticMode,
): Promise<number[]> {
  if (mode === "Demo Local Vector") {
    const cached = parseEmbeddingJson(task.embeddingJson);
    if (cached) return cached;
    return computeLocalEmbedding(`${task.title} ${task.description}`);
  }
  const res = await computeTextEmbedding(`${task.title} ${task.description}`);
  return res.vector;
}

export async function findSemanticMatches<T extends SemanticTaskInput>(
  query: string,
  tasks: readonly T[],
  minScore = 0.2,
): Promise<{ mode: SemanticMode; matches: SemanticMatch<T>[] }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { mode: "Demo Local Vector", matches: [] };
  }

  const { vector: queryVector, mode } = await computeTextEmbedding(trimmed);
  const taskVectors = await Promise.all(
    tasks.map((task) => resolveTaskVector(task, mode)),
  );

  const matches: SemanticMatch<T>[] = [];
  for (let i = 0; i < tasks.length; i += 1) {
    const task = tasks[i];
    const vec = taskVectors[i];
    if (!task || !vec) continue;
    const score = cosineSimilarity(queryVector, vec);
    if (score >= minScore) {
      matches.push({
        task,
        score: Number(score.toFixed(4)),
        similarityPercent: Math.round(score * 100),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return { mode, matches };
}

export async function detectDuplicateTasks<T extends SemanticTaskInput>(
  title: string,
  description: string,
  existingTasks: readonly T[],
  threshold = 0.52,
): Promise<{ mode: SemanticMode; duplicates: SemanticMatch<T>[] }> {
  const combined = `${title.trim()} ${description.trim()}`.trim();
  if (combined.length < 4) {
    return { mode: "Demo Local Vector", duplicates: [] };
  }
  const { mode, matches } = await findSemanticMatches(
    combined,
    existingTasks,
    threshold,
  );
  return {
    mode,
    duplicates: matches.slice(0, 5),
  };
}
