import { handleApiError } from "@/lib/api-error";
import { deleteSubtask, updateSubtask } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse, problemResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UpdateSubtaskSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const { id } = await context.params;
    const body = UpdateSubtaskSchema.parse((await req.json()) as unknown);
    const subtask = await updateSubtask(id, {
      ...(body.completed !== undefined ? { completed: body.completed } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
    });
    if (!subtask) {
      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: "Subtask not found",
        instance: req.nextUrl.pathname,
        requestId,
      });
    }
    return jsonResponse({ subtask }, requestId);
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
    const deleted = await deleteSubtask(id);
    if (!deleted) {
      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: "Subtask not found",
        instance: req.nextUrl.pathname,
        requestId,
      });
    }
    return jsonResponse({ deleted: true, id }, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
