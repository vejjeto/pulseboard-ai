import crypto from "node:crypto";
import { logger } from "./logger";

const DEFAULT_WEBHOOK_SECRET = "pulseboard-dev-webhook-secret";

export interface SignedWebhookPayload {
  event: string;
  source: string;
  data: Record<string, unknown>;
}

export function signHmacSha256(payload: string, secret: string): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyHmacSha256(
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }
  const expected = signHmacSha256(payload, secret);
  const actualBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export async function emitSignedWebhook(
  input: SignedWebhookPayload,
): Promise<boolean> {
  const webhookUrl = process.env.WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return false;
  }

  const secret = process.env.WEBHOOK_SECRET?.trim() || DEFAULT_WEBHOOK_SECRET;
  const body = JSON.stringify({
    ...input,
    timestamp: new Date().toISOString(),
  });
  const signature = signHmacSha256(body, secret);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Event": input.event,
      "X-Webhook-Source": input.source,
      "X-Portfolio-Signature": signature,
    },
    signal: AbortSignal.timeout(4000),
    body,
  });

  if (!response.ok) {
    logger.warn(
      { event: input.event, status: response.status },
      "Signed webhook delivery returned non-2xx status",
    );
    return false;
  }
  return true;
}
