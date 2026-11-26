import type { NextResponse } from "next/server";
import { type ProblemDetails, handleProblemError } from "./problem-details";

export function handleApiError(
  err: unknown,
  req?: { headers?: Headers; nextUrl?: { pathname: string } },
): NextResponse<ProblemDetails> {
  return handleProblemError(err, {
    ...(req?.headers ? { headers: req.headers } : {}),
    ...(req?.nextUrl?.pathname ? { instance: req.nextUrl.pathname } : {}),
  });
}
