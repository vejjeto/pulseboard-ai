import { handleApiError } from "@/lib/api-error";
import { MoveColumnSchema, moveColumn } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse, problemResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const { id } = await context.params;
    const body = MoveColumnSchema.parse((await req.json()) as unknown);

    if (body.simulateError || req.headers.get("x-simulate-error") === "1") {
      return problemResponse({
        title: "Service Unavailable",
        status: 503,
        detail:
          "Error simulado de red al reordenar la columna. Rollback activado.",
        instance: req.nextUrl.pathname,
        requestId,
      });
    }

    const result = await moveColumn(id, body);
    return jsonResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
