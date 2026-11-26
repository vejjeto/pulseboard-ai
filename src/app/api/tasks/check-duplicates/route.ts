import { detectDuplicateTasks } from "@/core/semantic-search";
import { handleApiError } from "@/lib/api-error";
import { listSemanticTasks } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CheckDuplicatesSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  boardId: z.string().min(1).optional(),
  threshold: z.number().min(0).max(1).optional().default(0.52),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const body = CheckDuplicatesSchema.parse((await req.json()) as unknown);
    const boardTasks = await listSemanticTasks(body.boardId);
    const { mode, duplicates } = await detectDuplicateTasks(
      body.title,
      body.description,
      boardTasks,
      body.threshold,
    );

    return jsonResponse(
      {
        mode,
        duplicates: duplicates.map((d) => ({
          taskId: d.task.id,
          title: d.task.title,
          columnId: d.task.columnId,
          priority: d.task.priority,
          score: d.score,
          similarityPercent: d.similarityPercent,
        })),
      },
      requestId,
    );
  } catch (err) {
    return handleApiError(err, req);
  }
}
