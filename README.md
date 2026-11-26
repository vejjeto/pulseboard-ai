# PulseBoard AI

[![CI](https://github.com/diego/pulseboard-ai/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

**PulseBoard AI** is a standalone 2026 Kanban & project intelligence workspace built with Next.js 15 (React Compiler enabled), Drizzle ORM, `pgvector`-ready semantic search, TanStack Table v8, and Zod-validated AI workflows. It delivers 0ms optimistic drag-and-drop with automatic network rollback, $O(1)$ fractional indexing, live semantic duplicate detection, and RFC 7807 observability out of the box—with zero external API keys required for local demo mode (`/demo`).

---

## Architecture

```mermaid
flowchart LR
  UI["Board UI (Kanban · TanStack Table · Calendar)"] -->|Optimistic 0ms + Rollback| API["Next.js App Router API (/api/*)"]
  UI -->|Ctrl+K / Live Duplicate Check| SEM["Semantic Search & Duplicate Detector"]
  API -->|O(1) Fractional Index| DB["SQLite (Local) / PostgreSQL + pgvector (HNSW)"]
  API -->|Zod Schema Guard| AI["AI Decompose & Board Insights (OpenAI / Gemini / Demo Local)"]
  API -->|HMAC-SHA256| WH["Signed Webhooks (task.completed)"]
  SEM -->|64-dim Cosine Similarity| DB
```

---

## Architectural Decision Records (ADRs)

### ADR 1: $O(1)$ Fractional Indexing with Single-Column Rebalance
- **Decision**: Positions are stored as `REAL` / `doublePrecision` floats spaced by `1024`. Moving a task bisects `(prev + next) / 2` and updates **1 row**. Only when `|next - prev| < 1` does the server rebalance that single column (`1024, 2048, ...`) inside a transaction.
- **Why**: Avoids $O(N)$ row rewrites on every drag-and-drop while keeping human-readable numeric ordering.

### ADR 2: `pgvector` Semantic Search + Deterministic 64-Dim Local Fallback
- **Decision**: Production PostgreSQL schema (`src/db/schema.pg.ts`) declares `vector("embedding", { dimensions: 64 })` with an HNSW cosine index (`vector_cosine_ops` / `<=>`). In local/demo environments without `OPENAI_API_KEY` or Postgres, `src/core/semantic-search.ts` computes a normalized 64-dim trigram + domain-cluster embedding stored as `embedding_json` in SQLite.
- **Why**: Enables semantic search (`/api/tasks/semantic-search`) and live duplicate warnings (`/api/tasks/check-duplicates`) in both zero-config local demos and production `pgvector` deployments.

### ADR 3: 0ms Optimistic UI with Snapshot Rollback & RFC 7807 Errors
- **Decision**: `@dnd-kit` updates TanStack Query cache immediately on drop (`0ms`) while persisting to `PATCH /api/tasks/[id]/move`. All `/api/*` endpoints emit `x-request-id` and RFC 7807 `application/problem+json` on errors (`400`/`404`/`503`), triggering an automatic UI snapshot rollback and toast notification.
- **Why**: Guarantees responsive board interactions without silent state divergence.

---

## 3-Step Local Setup

```bash
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Open [http://localhost:3004](http://localhost:3004) (or jump straight to [http://localhost:3004/demo](http://localhost:3004/demo)).

---

## Honest 100 → 100k Scale Trade-Offs

1. **SQLite → PostgreSQL + `pgvector`**: Local SQLite (`node:sqlite`) handles 100–5,000 tasks in-process with zero setup, but concurrent multi-instance writes and 100k+ vector scans require switching to `schema.pg.ts` on PostgreSQL 17 with the `tasks_embedding_hnsw_idx` HNSW index.
2. **In-Memory Cosine Scan → Database `<=>` Operator**: `findSemanticMatches` currently scans board tasks in Node.js memory (ideal for <2,000 tasks per board). At 100k tasks, push `ORDER BY embedding <=> $1::vector LIMIT 10` directly into PostgreSQL.
3. **Synchronous Webhook Dispatch → Queue**: `emitSignedWebhook` uses a 4s `AbortSignal.timeout` fire-and-forget `fetch`. At high throughput, offload webhook delivery and retries to a durable background queue.
