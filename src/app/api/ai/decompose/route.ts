import { DecomposeRequestSchema, decomposeGoal } from "@/lib/ai-service";
import { handleApiError } from "@/lib/api-error";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  try {
    const body = DecomposeRequestSchema.parse((await req.json()) as unknown);
    const result = await decomposeGoal(body);
    return jsonResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, req);
  }
}
