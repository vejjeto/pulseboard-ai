import {
  BoardInsightsRequestSchema,
  generateBoardInsights,
} from "@/lib/ai-service";
import { handleApiError } from "@/lib/api-error";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const raw = await req.text();
    const parsedBody = raw ? (JSON.parse(raw) as unknown) : {};
    const { boardId } = BoardInsightsRequestSchema.parse(parsedBody);
    const result = await generateBoardInsights(boardId);
    return jsonResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
