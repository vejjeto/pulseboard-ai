import { env } from "@/lib/env";

export interface OpenApiRouteMeta {
  path: string;
  method: "get" | "post" | "patch" | "delete";
  tag: string;
  summary: string;
  requestBodyDescription?: string;
  responseDescription?: string;
}

const ROUTES: OpenApiRouteMeta[] = [
  {
    path: "/api/health",
    method: "get",
    tag: "Observability",
    summary: "Service health status and database latency for pulseboard-ai",
    responseDescription:
      "Health status payload with dbLatencyMs and uptimeSeconds",
  },
  {
    path: "/api/board",
    method: "get",
    tag: "Board",
    summary: "Load board, columns, tasks, subtasks, users, and labels",
  },
  {
    path: "/api/tasks",
    method: "post",
    tag: "Tasks",
    summary:
      "Create a task at the end of a column with O(1) Fractional Indexing",
  },
  {
    path: "/api/tasks/{id}",
    method: "patch",
    tag: "Tasks",
    summary: "Update task properties, priority, column, or labels",
  },
  {
    path: "/api/tasks/{id}",
    method: "delete",
    tag: "Tasks",
    summary: "Delete a task and cascade its subtasks",
  },
  {
    path: "/api/tasks/{id}/move",
    method: "patch",
    tag: "Tasks",
    summary:
      "Move a task in O(1) via Fractional Indexing and emit HMAC-SHA256 webhook on Done",
  },
  {
    path: "/api/tasks/semantic-search",
    method: "get",
    tag: "Semantic Search",
    summary:
      "Search tasks by semantic meaning using 64-dim embeddings (pgvector / local fallback)",
  },
  {
    path: "/api/tasks/check-duplicates",
    method: "post",
    tag: "Semantic Search",
    summary:
      "Detect potential duplicate tasks before creation using cosine similarity",
  },
  {
    path: "/api/columns/{id}/move",
    method: "patch",
    tag: "Columns",
    summary: "Reorder a column in O(1) via Fractional Indexing",
  },
  {
    path: "/api/tasks/{id}/subtasks",
    method: "post",
    tag: "Subtasks",
    summary: "Add a subtask checklist item to a task",
  },
  {
    path: "/api/subtasks/{id}",
    method: "patch",
    tag: "Subtasks",
    summary: "Toggle or edit a subtask",
  },
  {
    path: "/api/subtasks/{id}",
    method: "delete",
    tag: "Subtasks",
    summary: "Delete a subtask",
  },
  {
    path: "/api/ai/decompose",
    method: "post",
    tag: "AI",
    summary: "Decompose a goal into 4-6 Zod-validated tasks with subtasks",
  },
  {
    path: "/api/ai/board-insights",
    method: "post",
    tag: "AI",
    summary:
      "Compute board health score, WIP excesses, overdue tasks, and bottlenecks",
  },
  {
    path: "/api/demo/reset",
    method: "post",
    tag: "Demo",
    summary: "Idempotently reset the demo board (4 columns, 12 tasks)",
  },
];

export function getFlowMindOpenApiSpec(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of ROUTES) {
    paths[route.path] ??= {};
    paths[route.path]![route.method] = {
      tags: [route.tag],
      summary: route.summary,
      responses: {
        "200": {
          description: route.responseDescription ?? "Successful JSON response",
        },
        "400": {
          description: "RFC 7807 Problem Details (application/problem+json)",
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "PulseBoard AI API",
      version: "2.0.0",
      description:
        "Standalone Kanban & Semantic Search API: O(1) Fractional Indexing, optimistic rollback, pgvector/local cosine similarity search, Zod AI decomposition, RFC 7807 Problem Details, and HMAC-SHA256 webhooks.",
    },
    servers: [{ url: env.NEXT_PUBLIC_APP_URL }],
    paths,
  };
}
