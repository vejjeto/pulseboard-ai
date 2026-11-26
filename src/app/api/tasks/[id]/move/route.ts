import { handleApiError } from "@/lib/api-error";
import { MoveTaskSchema, moveTask } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse, problemResponse } from "@/lib/problem-details";
import { emitSignedWebhook } from "@/lib/webhooks";
import type { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isCompletedColumnTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return normalized.includes("complet") || normalized.includes("done");
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const { id } = await context.params;
    const body = MoveTaskSchema.parse((await req.json()) as unknown);

    if (body.simulateError || req.headers.get("x-simulate-error") === "1") {
      return problemResponse({
        title: "Service Unavailable",
        status: 503,
        detail: "Error simulado de red al mover la tarjeta. Rollback activado.",
        instance: req.nextUrl.pathname,
        requestId,
      });
    }

    const result = await moveTask(id, body);

    if (
      result.previousColumnId !== result.task.columnId &&
      isCompletedColumnTitle(result.columnTitle)
    ) {
      void emitSignedWebhook({
        event: "task.completed",
        source: "pulseboard-ai",
        data: {
          taskId: result.task.id,
          columnTitle: result.columnTitle,
        },
      }).catch(() => undefined);
    }

    return jsonResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
