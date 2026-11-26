import { getOrCreateRequestId } from "@/lib/logger";
import { getFlowMindOpenApiSpec } from "@/lib/openapi";
import { jsonResponse } from "@/lib/problem-details";
import type { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req.headers);
  return jsonResponse(getFlowMindOpenApiSpec(), requestId);
}
