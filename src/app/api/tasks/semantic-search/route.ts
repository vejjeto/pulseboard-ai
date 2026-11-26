import { findSemanticMatches } from "@/core/semantic-search";
import { handleApiError } from "@/lib/api-error";
import { listSemanticTasks } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const boardId = req.nextUrl.searchParams.get("boardId") ?? undefined;
    const minScoreParam = req.nextUrl.searchParams.get("minScore");
    const minScore = minScoreParam !== null ? Number(minScoreParam) : 0.2;

    if (!q) {
      return jsonResponse(
        { query: "", mode: "Demo Local Vector", matches: [] },
        requestId,
      );
    }

    const boardTasks = await listSemanticTasks(boardId);
    const { mode, matches } = await findSemanticMatches(
      q,
      boardTasks,
      Number.isFinite(minScore) ? minScore : 0.2,
    );

    return jsonResponse(
      {
        query: q,
        mode,
        matches: matches.map((m) => ({
          taskId: m.task.id,
          title: m.task.title,
          columnId: m.task.columnId,
          priority: m.task.priority,
          score: m.score,
          similarityPercent: m.similarityPercent,
        })),
      },
      requestId,
    );
  } catch (err) {
    return handleApiError(err, req);
  }
}
