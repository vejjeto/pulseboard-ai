# PulseBoard AI

[![CI](https://github.com/vejjeto/pulseboard-ai/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

**PulseBoard AI** es un workspace Kanban e inteligencia de proyectos **standalone** construido con Next.js 15 (React Compiler habilitado), Drizzle ORM, búsqueda semántica lista para `pgvector`, TanStack Table v8 y flujos de IA validados con Zod. Ofrece *drag-and-drop* optimista en `0 ms` con rollback automático ante fallos de red, *Fractional Indexing* $O(1)$, detección en vivo de tareas duplicadas y observabilidad RFC 7807 sin requerir API keys externas en modo demo local (`/demo`).

## Qué hace este proyecto

**PulseBoard AI** es un tablero de gestión de proyectos con vistas de Kanban (*arrastrar y soltar*), tabla y calendario. Además de organizar tareas por columnas y prioridades, detecta automáticamente si una tarea nueva se parece a otra ya existente, permite buscar por significado (búsqueda semántica) y ayuda a desglosar objetivos en subtareas con IA (o con un motor determinista local en modo demo).

---

## Arquitectura

```mermaid
flowchart LR
  UI["UI Tablero (Kanban · TanStack Table · Calendario)"] -->|Optimistic 0ms + Rollback| API["Next.js App Router API (/api/*)"]
  UI -->|Ctrl+K / Detector Duplicados| SEM["Búsqueda Semántica y Duplicados"]
  API -->|Fractional Index O(1)| DB["SQLite (Local) / PostgreSQL + pgvector (HNSW)"]
  API -->|Esquema Zod| AI["IA Decompose e Insights (OpenAI / Gemini / Demo Local)"]
  SEM -->|Similitud Coseno 64-dim| DB
```

---

## Decisiones Técnicas Clave (ADRs)

### ADR 1: *Fractional Indexing* $O(1)$ con Rebalanceo por Columna
- **Decisión**: Las posiciones se almacenan como flotantes `REAL` / `doublePrecision` espaciados por `1024`. Al mover una tarjeta se calcula el punto medio `(prev + next) / 2` actualizando **1 sola fila**. Solo cuando `|next - prev| < 1` se rebalancea esa columna (`1024, 2048, ...`) dentro de una transacción.
- **Por qué**: Evita reescribir $O(N)$ filas en cada movimiento manteniendo un orden numérico legible.

### ADR 2: Búsqueda Semántica `pgvector` + Fallback Local Determinístico (64-dim)
- **Decisión**: El esquema PostgreSQL de producción (`src/db/schema.pg.ts`) declara `vector("embedding", { dimensions: 64 })` con índice HNSW coseno (`vector_cosine_ops` / `<=>`). En entornos locales/demo sin `OPENAI_API_KEY` ni Postgres, `src/core/semantic-search.ts` calcula un embedding normalizado de 64 dimensiones por trigramas y clusters semánticos almacenado como `embedding_json` en SQLite.
- **Por qué**: Permite búsqueda semántica (`/api/tasks/semantic-search`) y alertas en vivo de duplicados (`/api/tasks/check-duplicates`) tanto en demos zero-config como en despliegues `pgvector`.

### ADR 3: UI Optimista en `0 ms` con Rollback por Snapshot y RFC 7807
- **Decisión**: `@dnd-kit` actualiza inmediatamente la caché de TanStack Query al soltar la tarjeta (`0 ms`) mientras persiste en `PATCH /api/tasks/[id]/move`. Todos los endpoints `/api/*` emiten `x-request-id` y errores RFC 7807 `application/problem+json` (`400`/`404`/`503`), disparando rollback automático y notificación *toast*.
- **Por qué**: Garantiza fluidez instantánea sin divergencias silenciosas entre cliente y servidor.

---

## Ejecución Local en 3 Pasos

```bash
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Abre [http://localhost:3004](http://localhost:3004) (o entra directo a [http://localhost:3004/demo](http://localhost:3004/demo)).

---

## Trade-offs Honestos (100 → 100k Registros)

1. **SQLite → PostgreSQL + `pgvector`**: SQLite local (`node:sqlite`) maneja 100–5.000 tareas sin configuración; escrituras concurrentes multi-instancia y búsquedas vectoriales sobre 100k+ tareas requieren activar `schema.pg.ts` en PostgreSQL 17 con el índice HNSW `tasks_embedding_hnsw_idx`.
2. **Escaneo coseno en memoria → Operador `<=>` en BD**: `findSemanticMatches` compara tareas en memoria de Node.js (ideal para <2.000 tareas por tablero); a 100k tareas conviene delegar `ORDER BY embedding <=> $1::vector LIMIT 10` directamente a PostgreSQL.
3. **Mutaciones sincrónicas → Cola asíncrona en analíticas**: Las alertas de cuellos de botella y desgloses IA se calculan bajo demanda; a gran escala conviene pre-agregar métricas por tablero en segundo plano.
