import { handleApiError } from "@/lib/api-error";
import { getBoardData } from "@/lib/board-service";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const boardId = req.nextUrl.searchParams.get("boardId") ?? undefined;
    const payload = await getBoardData(boardId);
    return jsonResponse(payload, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
