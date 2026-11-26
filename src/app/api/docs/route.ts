import { getOrCreateRequestId } from "@/lib/logger";
import { getFlowMindOpenApiSpec } from "@/lib/openapi";

export async function GET(req: Request): Promise<Response> {
  const requestId = getOrCreateRequestId(req.headers);
  const spec = getFlowMindOpenApiSpec();
  const escapedSpec = JSON.stringify(spec, null, 2).replace(/</g, "\\u003c");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PulseBoard AI API — OpenAPI 3.1.0</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 2rem; }
    main { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .badge { display: inline-block; background: #4f46e5; color: #fff; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; }
    pre { background: #020617; border: 1px solid #1e293b; border-radius: 0.75rem; padding: 1rem; overflow-x: auto; font-size: 0.8rem; line-height: 1.5; }
    a { color: #818cf8; }
  </style>
</head>
<body>
  <main>
    <h1>PulseBoard AI API <span class="badge">OpenAPI 3.1.0</span></h1>
    <p>Raw spec: <a href="/api/openapi.json">/api/openapi.json</a></p>
    <pre>${escapedSpec}</pre>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "x-request-id": requestId,
    },
  });
}
