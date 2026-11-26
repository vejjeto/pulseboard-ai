import { POST as resetRoute } from "@/app/api/demo/reset/route";
import { GET as healthRoute } from "@/app/api/health/route";
import { GET as openApiRoute } from "@/app/api/openapi.json/route";
import { PATCH as moveTaskRoute } from "@/app/api/tasks/[id]/move/route";
import { PATCH as updateTaskRoute } from "@/app/api/tasks/[id]/route";
import { POST as checkDuplicatesRoute } from "@/app/api/tasks/check-duplicates/route";
import { GET as semanticSearchRoute } from "@/app/api/tasks/semantic-search/route";
import {
  computeLocalEmbedding,
  cosineSimilarity,
  detectDuplicateTasks,
  findSemanticMatches,
} from "@/core/semantic-search";
import { closeDbForTests, getSqlite } from "@/db";
import {
  BoardInsightsResultSchema,
  DecomposeResultSchema,
  decomposeGoal,
  generateBoardInsights,
} from "@/lib/ai-service";
import {
  createTask,
  getBoardData,
  moveColumn,
  moveTask,
  resetDemoBoard,
} from "@/lib/board-service";
import { parseEnv } from "@/lib/env";
import { computePosition, rebalancePositions } from "@/lib/fractional-index";
import { signHmacSha256, verifyHmacSha256 } from "@/lib/webhooks";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("PulseBoard AI — Core & Integration Suite", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = ":memory:";
    Reflect.deleteProperty(process.env, "OPENAI_API_KEY");
    Reflect.deleteProperty(process.env, "GEMINI_API_KEY");
    closeDbForTests();
  });

  afterEach(() => {
    Reflect.deleteProperty(process.env, "WEBHOOK_URL");
    Reflect.deleteProperty(process.env, "WEBHOOK_SECRET");
    vi.restoreAllMocks();
    closeDbForTests();
  });

  it("1. computes fractional index for empty, prepend, append, and midpoint", () => {
    expect(computePosition(null, null)).toEqual({
      position: 1024,
      needsRebalance: false,
    });
    expect(computePosition(null, 1024)).toEqual({
      position: 512,
      needsRebalance: false,
    });
    expect(computePosition(2048, null)).toEqual({
      position: 3072,
      needsRebalance: false,
    });
    expect(computePosition(1024, 2048)).toEqual({
      position: 1536,
      needsRebalance: false,
    });

    const rebalanced = rebalancePositions(["a", "b", "c"]);
    expect(rebalanced).toEqual([
      { id: "a", position: 1024 },
      { id: "b", position: 2048 },
      { id: "c", position: 3072 },
    ]);
  });

  it("2. triggers gap < 1 detection cleanly in computePosition", () => {
    const tight = computePosition(100, 100.5);
    expect(tight.needsRebalance).toBe(true);
    expect(tight.position).toBe(100.25);

    const prependTight = computePosition(null, 1.5);
    expect(prependTight.needsRebalance).toBe(true);
    expect(prependTight.position).toBe(0.75);
  });

  it("3. persists single-row task move without rebalancing unrelated columns", async () => {
    const before = await getBoardData();
    const backlogTasks = before.tasks.filter(
      (t) => t.columnId === "col-backlog",
    );
    const devTasks = before.tasks.filter((t) => t.columnId === "col-dev");
    const movingTask = backlogTasks[0]!;
    const dev0 = devTasks[0]!;
    const dev1 = devTasks[1]!;

    const result = await moveTask(movingTask.id, {
      targetColumnId: "col-dev",
      prevTaskId: dev0.id,
      nextTaskId: dev1.id,
    });

    expect(result.rebalanced).toBe(false);
    expect(result.updatedRowsCount).toBe(1);
    expect(result.task.columnId).toBe("col-dev");
    expect(result.task.position).toBe((dev0.position + dev1.position) / 2);

    const after = await getBoardData();
    const afterBacklog = after.tasks.filter(
      (t) => t.columnId === "col-backlog",
    );
    expect(afterBacklog.map((t) => t.position)).toEqual(
      backlogTasks.slice(1).map((t) => t.position),
    );
  });

  it("4. repeated bisection triggers single-column rebalance while leaving other columns untouched", async () => {
    const initial = await getBoardData();
    const designTasks = initial.tasks.filter(
      (t) => t.columnId === "col-design",
    );
    const anchorA = designTasks[0];
    const anchorB = designTasks[1];

    const donePositionsBefore = initial.tasks
      .filter((t) => t.columnId === "col-done")
      .map((t) => ({ id: t.id, position: t.position }));

    const sqlite = getSqlite();
    sqlite
      .prepare("UPDATE tasks SET position = ? WHERE id = ?")
      .run(1024, anchorA!.id);
    sqlite
      .prepare("UPDATE tasks SET position = ? WHERE id = ?")
      .run(1024.5, anchorB!.id);

    const taskToInsert = initial.tasks.find(
      (t) => t.columnId === "col-backlog",
    );
    expect(taskToInsert).toBeDefined();

    const moveResult = await moveTask(taskToInsert!.id, {
      targetColumnId: "col-design",
      prevTaskId: anchorA!.id,
      nextTaskId: anchorB!.id,
    });

    expect(moveResult.rebalanced).toBe(true);
    expect(moveResult.updatedRowsCount).toBe(4);

    const after = await getBoardData();
    const rebalancedDesign = after.tasks.filter(
      (t) => t.columnId === "col-design",
    );
    expect(rebalancedDesign.map((t) => t.position)).toEqual([
      1024, 2048, 3072, 4096,
    ]);
    expect(rebalancedDesign.map((t) => t.id)).toEqual([
      anchorA!.id,
      taskToInsert!.id,
      anchorB!.id,
      designTasks[2]!.id,
    ]);

    const donePositionsAfter = after.tasks
      .filter((t) => t.columnId === "col-done")
      .map((t) => ({ id: t.id, position: t.position }));
    expect(donePositionsAfter).toEqual(donePositionsBefore);
  });

  it("5. reorders columns with single-row fractional update", async () => {
    const before = await getBoardData();
    const colDone = before.columns.find((c) => c.id === "col-done")!;
    const colBacklog = before.columns[0]!;
    const colDesign = before.columns[1]!;

    const moved = await moveColumn(colDone.id, {
      prevColumnId: colBacklog.id,
      nextColumnId: colDesign.id,
    });

    expect(moved.rebalanced).toBe(false);
    expect(moved.column.position).toBe(1536);

    const after = await getBoardData();
    expect(after.columns.map((c) => c.id)).toEqual([
      "col-backlog",
      "col-done",
      "col-design",
      "col-dev",
    ]);
  });

  it("6. returns 503 RFC 7807 Problem Details on simulated network error without mutating DB", async () => {
    const before = await getBoardData();
    const targetTask = before.tasks[0]!;

    const req = new NextRequest(
      `http://localhost:3004/api/tasks/${targetTask.id}/move`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-sim-503",
        },
        body: JSON.stringify({
          targetColumnId: "col-done",
          simulateError: true,
        }),
      },
    );

    const res = await moveTaskRoute(req, {
      params: Promise.resolve({ id: targetTask.id }),
    });
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(res.headers.get("x-request-id")).toBe("req-sim-503");

    const after = await getBoardData();
    const unchanged = after.tasks.find((t) => t.id === targetTask.id)!;
    expect(unchanged.columnId).toBe(targetTask.columnId);
    expect(unchanged.position).toBe(targetTask.position);
  });

  it("7. decomposes a goal via Local Heuristic Engine with strict Zod validation and optional persistence", async () => {
    const board = await getBoardData();
    const initialCount = board.tasks.length;

    const preview = await decomposeGoal({
      boardId: board.board.id,
      goal: "Lanzar pasarela de pagos con Stripe",
      persist: false,
    });

    expect(DecomposeResultSchema.safeParse(preview).success).toBe(true);
    expect(preview.mode).toBe("Demo AI local");
    expect(preview.tasks.length).toBeGreaterThanOrEqual(4);
    expect(preview.tasks.length).toBeLessThanOrEqual(6);
    expect(
      preview.tasks.some((t) => t.title.toLowerCase().includes("stripe")),
    ).toBe(true);
    expect(preview.persisted).toBe(false);
    expect(preview.createdTaskIds).toHaveLength(0);

    const persisted = await decomposeGoal({
      boardId: board.board.id,
      goal: "Lanzar pasarela de pagos con Stripe",
      columnId: "col-backlog",
      persist: true,
    });

    expect(persisted.persisted).toBe(true);
    expect(persisted.createdTaskIds).toHaveLength(persisted.tasks.length);

    const after = await getBoardData();
    expect(after.tasks.length).toBe(initialCount + persisted.tasks.length);
  });

  it("8. detects overloaded WIP columns, overdue tasks, and priority bottlenecks in board insights", async () => {
    const insights = await generateBoardInsights(undefined);

    expect(BoardInsightsResultSchema.safeParse(insights).success).toBe(true);
    expect(insights.mode).toBe("Demo AI local");

    const overloadedDev = insights.overloadedColumns.find(
      (c) => c.columnId === "col-dev",
    );
    expect(overloadedDev).toBeDefined();
    expect(overloadedDev!.taskCount).toBe(4);
    expect(overloadedDev!.wipLimit).toBe(3);

    expect(insights.priorityBottlenecks.length).toBeGreaterThanOrEqual(1);
    expect(insights.priorityBottlenecks[0]!.columnTitle).toBe("En Desarrollo");
    expect(insights.overdueTasks.length).toBeGreaterThanOrEqual(1);
    expect(insights.healthScore).toBeLessThan(96);
  });

  it("9. resets demo board idempotently via service and POST /api/demo/reset", async () => {
    const created = await createTask({
      boardId: "board-flowmind-q4",
      columnId: "col-backlog",
      title: "Tarea temporal de prueba",
      priority: "Low",
    });
    expect(created.title).toBe("Tarea temporal de prueba");

    const modified = await getBoardData();
    expect(modified.tasks.length).toBe(13);

    const res = await resetRoute(
      new NextRequest("http://localhost:3004/api/demo/reset", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tasks: unknown[]; columns: unknown[] };
    expect(body.tasks).toHaveLength(12);
    expect(body.columns).toHaveLength(4);

    const secondReset = await resetDemoBoard();
    expect(secondReset.tasks).toHaveLength(12);
    expect(secondReset.columns).toHaveLength(4);
  });

  it("10. returns standardized health response from GET /api/health", async () => {
    const res = await healthRoute(
      new Request("http://localhost:3004/api/health"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    const body = (await res.json()) as {
      status: string;
      service: string;
      dbLatencyMs: number;
      uptimeSeconds: number;
      version: string;
      timestamp: string;
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("pulseboard-ai");
    expect(typeof body.dbLatencyMs).toBe("number");
    expect(body.dbLatencyMs).toBeGreaterThanOrEqual(0);
    expect(body.version).toBe("2.0.0");
  });

  it("11. serves OpenAPI 3.1.0 specification from GET /api/openapi.json", async () => {
    const res = await openApiRoute(
      new NextRequest("http://localhost:3004/api/openapi.json"),
    );
    expect(res.status).toBe(200);
    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, Record<string, unknown>>;
    };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("PulseBoard AI API");
    expect(spec.paths["/api/health"]?.get).toBeDefined();
    expect(spec.paths["/api/tasks/{id}/move"]?.patch).toBeDefined();
    expect(spec.paths["/api/tasks/semantic-search"]?.get).toBeDefined();
    expect(spec.paths["/api/tasks/check-duplicates"]?.post).toBeDefined();
    expect(spec.paths["/api/ai/decompose"]?.post).toBeDefined();
  });

  it("12. signs and emits HMAC-SHA256 task.completed webhook when moving task into Completado", async () => {
    const secret = "test-pulseboard-webhook-secret";
    process.env.WEBHOOK_URL = "https://example.test/webhooks/pulseboard";
    process.env.WEBHOOK_SECRET = secret;

    const samplePayload = JSON.stringify({
      event: "task.completed",
      taskId: "t-1",
    });
    const sampleSig = signHmacSha256(samplePayload, secret);
    expect(verifyHmacSha256(samplePayload, sampleSig, secret)).toBe(true);
    expect(verifyHmacSha256(samplePayload, sampleSig, "wrong-secret")).toBe(
      false,
    );

    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const before = await getBoardData();
    const backlogTask = before.tasks.find((t) => t.columnId === "col-backlog")!;

    const req = new NextRequest(
      `http://localhost:3004/api/tasks/${backlogTask.id}/move`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetColumnId: "col-done" }),
      },
    );

    const res = await moveTaskRoute(req, {
      params: Promise.resolve({ id: backlogTask.id }),
    });
    expect(res.status).toBe(200);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://example.test/webhooks/pulseboard");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Webhook-Event"]).toBe("task.completed");
    expect(headers["X-Webhook-Source"]).toBe("pulseboard-ai");

    const rawBody = String(init.body);
    expect(
      verifyHmacSha256(rawBody, headers["X-Portfolio-Signature"], secret),
    ).toBe(true);
    const envelope = JSON.parse(rawBody) as {
      event: string;
      source: string;
      data: { taskId: string; columnTitle: string };
    };
    expect(envelope.event).toBe("task.completed");
    expect(envelope.source).toBe("pulseboard-ai");
    expect(envelope.data).toEqual({
      taskId: backlogTask.id,
      columnTitle: "Completado",
    });
  });

  it("13. computes normalized embeddings, cosine similarity, semantic recall, and duplicate detection", async () => {
    const v1 = computeLocalEmbedding("Integrar pasarela de pagos Stripe");
    const v2 = computeLocalEmbedding(
      "Configurar checkout y cobros con tarjeta",
    );
    const v3 = computeLocalEmbedding("Tokens dark mode WCAG contraste");

    expect(v1).toHaveLength(64);
    expect(cosineSimilarity(v1, v1)).toBeCloseTo(1, 4);
    expect(cosineSimilarity(v1, v2)).toBeGreaterThan(cosineSimilarity(v1, v3));

    const tasks = [
      {
        id: "t1",
        title: "Pasarela de cobros",
        description: "Checkout con factura y tarjeta",
      },
      {
        id: "t2",
        title: "Dark mode WCAG",
        description: "Paleta de colores y contraste",
      },
    ];
    const { mode, matches } = await findSemanticMatches(
      "stripe billing",
      tasks,
      0.15,
    );
    expect(mode).toBe("Demo Local Vector");
    expect(matches[0]?.task.id).toBe("t1");
    expect(matches[0]?.similarityPercent).toBeGreaterThan(20);

    const dupRes = await detectDuplicateTasks(
      "Pasarela de cobros",
      "Checkout con tarjeta",
      tasks,
      0.5,
    );
    expect(dupRes.duplicates.length).toBeGreaterThanOrEqual(1);
    expect(dupRes.duplicates[0]?.task.id).toBe("t1");
  });

  it("14. exposes GET /api/tasks/semantic-search and POST /api/tasks/check-duplicates", async () => {
    await getBoardData();

    const searchReq = new NextRequest(
      "http://localhost:3004/api/tasks/semantic-search?q=telemetria%20latencia",
    );
    const searchRes = await semanticSearchRoute(searchReq);
    expect(searchRes.status).toBe(200);
    expect(searchRes.headers.get("x-request-id")).toBeTruthy();
    const searchBody = (await searchRes.json()) as {
      mode: string;
      matches: Array<{ taskId: string; similarityPercent: number }>;
    };
    expect(searchBody.mode).toBe("Demo Local Vector");
    expect(searchBody.matches.length).toBeGreaterThanOrEqual(1);

    const dupReq = new NextRequest(
      "http://localhost:3004/api/tasks/check-duplicates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Motor Fractional Indexing",
          description: "Bisección de posiciones y rebalanceo",
        }),
      },
    );
    const dupRes = await checkDuplicatesRoute(dupReq);
    expect(dupRes.status).toBe(200);
    const dupBody = (await dupRes.json()) as {
      duplicates: Array<{ taskId: string; similarityPercent: number }>;
    };
    expect(dupBody.duplicates.length).toBeGreaterThanOrEqual(1);
  });

  it("15. validates env fail-fast and returns RFC 7807 Problem Details + x-request-id on 404/400", async () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_APP_URL: "not-a-valid-url",
      }),
    ).toThrow(/Invalid environment configuration/);

    const bypassed = parseEnv({
      SKIP_ENV_VALIDATION: "true",
      NEXT_PUBLIC_APP_URL: "not-a-valid-url",
    });
    expect(bypassed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3004");

    const notFoundReq = new NextRequest(
      "http://localhost:3004/api/tasks/nonexistent-id",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-404-check",
        },
        body: JSON.stringify({ title: "Updated" }),
      },
    );
    const notFoundRes = await updateTaskRoute(notFoundReq, {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(notFoundRes.headers.get("x-request-id")).toBe("req-404-check");
    const problem = (await notFoundRes.json()) as {
      status: number;
      title: string;
      requestId: string;
    };
    expect(problem.status).toBe(404);
    expect(problem.requestId).toBe("req-404-check");
  });
});
