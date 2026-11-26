import { handleApiError } from "@/lib/api-error";
import { resetDemoBoard } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const payload = await resetDemoBoard();
    return jsonResponse(payload, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
