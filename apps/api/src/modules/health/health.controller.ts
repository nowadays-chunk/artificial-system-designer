import type { ServerResponse } from "node:http";
import { correlationHeaderName } from "../../lib/correlation";
import type { LogContext } from "../../lib/logger";
import { getHealthStatus } from "./health.service";

export function handleHealthRequest(
  response: ServerResponse,
  startedAtMs: number,
  correlationId: string,
  logContext: LogContext,
) {
  const payload = getHealthStatus(startedAtMs);
  response.statusCode = 200;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader(correlationHeaderName(), correlationId);
  response.end(JSON.stringify(payload));
  return {
    ...logContext,
    statusCode: 200,
  };
}

