import { handleApiError } from "@/lib/api-error";
import { createTask } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const body = (await req.json()) as unknown;
    const task = await createTask(body as Parameters<typeof createTask>[0]);
    return jsonResponse({ task }, requestId, { status: 201 });
  } catch (err) {
    return handleApiError(err, req);
  }
}
