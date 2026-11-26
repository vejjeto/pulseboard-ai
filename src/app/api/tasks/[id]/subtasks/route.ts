import { handleApiError } from "@/lib/api-error";
import { addSubtask } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const AddSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

export async function POST(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const { id } = await context.params;
    const { title } = AddSubtaskSchema.parse((await req.json()) as unknown);
    const subtask = await addSubtask(id, title);
    return jsonResponse({ subtask }, requestId, { status: 201 });
  } catch (err) {
    return handleApiError(err, req);
  }
}
