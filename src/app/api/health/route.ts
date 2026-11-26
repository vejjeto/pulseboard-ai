import { getSqlite } from "@/db";
import { getOrCreateRequestId } from "@/lib/logger";
import { jsonResponse, problemResponse } from "@/lib/problem-details";

export async function GET(req: Request): Promise<Response> {
  const requestId = getOrCreateRequestId(req.headers);
  const start = performance.now();

  try {
    const sqlite = getSqlite();
    sqlite.prepare("SELECT 1").get();
    const dbLatencyMs = Number((performance.now() - start).toFixed(2));

    return jsonResponse(
      {
        status: "ok",
        service: "pulseboard-ai",
        version: "2.0.0",
        dbLatencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      requestId,
    );
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Database health check failed";
    return problemResponse({
      title: "Service Unavailable",
      status: 503,
      detail,
      requestId,
    });
  }
}
