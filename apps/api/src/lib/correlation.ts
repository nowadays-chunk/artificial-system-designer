import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

const CORRELATION_HEADER = "x-correlation-id";

export function readCorrelationId(headers: IncomingHttpHeaders): string | null {
  const raw = headers[CORRELATION_HEADER];
  if (!raw) {
    return null;
  }

  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }

  return raw;
}

export function getOrCreateCorrelationId(headers: IncomingHttpHeaders): string {
  return readCorrelationId(headers) ?? randomUUID();
}

export function correlationHeaderName() {
  return CORRELATION_HEADER;
}

