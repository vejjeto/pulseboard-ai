import { handleApiError } from "@/lib/api-error";
import { deleteTask, updateTask } from "@/lib/board-service";
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
    const body = (await req.json()) as unknown;
    const updated = await updateTask(
      id,
      body as Parameters<typeof updateTask>[1],
    );
    if (!updated) {
      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: "Task not found",
        instance: req.nextUrl.pathname,
        requestId,
      });
    }
    return jsonResponse({ task: updated }, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const { id } = await context.params;
    const deleted = await deleteTask(id);
    if (!deleted) {
      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: "Task not found",
        instance: req.nextUrl.pathname,
        requestId,
      });
    }
    return jsonResponse({ deleted: true, id }, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
