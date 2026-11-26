import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createRequestLogger, getOrCreateRequestId } from "./logger";

export interface ProblemIssue {
  path: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId: string;
  errors?: ProblemIssue[];
}

export interface CreateProblemOptions {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId?: string;
  errors?: ProblemIssue[];
}

const PROBLEM_TYPE_BY_STATUS: Record<number, { type: string; title: string }> =
  {
    400: { type: "https://httpstatuses.io/400", title: "Bad Request" },
    404: { type: "https://httpstatuses.io/404", title: "Not Found" },
    422: { type: "https://httpstatuses.io/422", title: "Unprocessable Entity" },
    500: {
      type: "https://httpstatuses.io/500",
      title: "Internal Server Error",
    },
    503: { type: "https://httpstatuses.io/503", title: "Service Unavailable" },
  };

export function buildProblemDetails(
  options: CreateProblemOptions,
): ProblemDetails {
  const requestId = options.requestId ?? getOrCreateRequestId();
  const payload: ProblemDetails = {
    type:
      options.type ??
      PROBLEM_TYPE_BY_STATUS[options.status]?.type ??
      "about:blank",
    title: options.title,
    status: options.status,
    detail: options.detail,
    requestId,
  };
  if (options.instance) {
    payload.instance = options.instance;
  }
  if (options.errors && options.errors.length > 0) {
    payload.errors = options.errors;
  }
  return payload;
}

export function problemResponse(
  options: CreateProblemOptions,
): NextResponse<ProblemDetails> {
  const problem = buildProblemDetails(options);
  return NextResponse.json(problem, {
    status: problem.status,
    headers: {
      "Content-Type": "application/problem+json",
      "x-request-id": problem.requestId,
    },
  });
}

export function jsonResponse<T>(
  data: T,
  requestId: string,
  init?: ResponseInit,
): NextResponse<T> {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", requestId);
  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

export function handleProblemError(
  err: unknown,
  options?: { headers?: Headers; instance?: string },
): NextResponse<ProblemDetails> {
  const requestId = getOrCreateRequestId(options?.headers);
  const reqLog = createRequestLogger(requestId);

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    reqLog.warn({ status: 400, errors }, "Request validation failed");
    return problemResponse({
      type: "https://httpstatuses.io/400",
      title: "Validation Failed",
      status: 400,
      detail: errors[0]?.message ?? "Request payload failed schema validation",
      ...(options?.instance ? { instance: options.instance } : {}),
      requestId,
      errors,
    });
  }

  if (err instanceof SyntaxError) {
    reqLog.warn({ status: 400, err: err.message }, "Malformed JSON payload");
    return problemResponse({
      type: "https://httpstatuses.io/400",
      title: "Malformed JSON",
      status: 400,
      detail: "Request body must be valid JSON",
      ...(options?.instance ? { instance: options.instance } : {}),
      requestId,
    });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const status = message.toLowerCase().includes("not found") ? 404 : 500;
  const meta = PROBLEM_TYPE_BY_STATUS[status] ?? PROBLEM_TYPE_BY_STATUS[500]!;

  if (status >= 500) {
    reqLog.error({ status, err: message }, "Unhandled API error");
  } else {
    reqLog.info({ status, detail: message }, "Resource not found");
  }

  return problemResponse({
    type: meta.type,
    title: meta.title,
    status,
    detail: message,
    ...(options?.instance ? { instance: options.instance } : {}),
    requestId,
  });
}
