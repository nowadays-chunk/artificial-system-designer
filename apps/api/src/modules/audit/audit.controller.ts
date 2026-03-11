import type { ServerResponse } from "node:http";
import { correlationHeaderName } from "../../lib/correlation";
import type { LogContext } from "../../lib/logger";
import type { RequestAuthContext } from "../auth/auth.types";
import { verifyAuditChain } from "./audit.service";

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader(correlationHeaderName(), correlationId);
  response.end(JSON.stringify(payload));
}

export async function handleVerifyAuditChainRequest(
  response: ServerResponse,
  correlationId: string,
  logContext: LogContext,
  auth: RequestAuthContext,
) {
  try {
    const result = verifyAuditChain(auth.tenantId);
    writeJson(response, 200, result, correlationId);
    return { ...logContext, statusCode: 200 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    writeJson(response, 500, { error: message }, correlationId);
    return { ...logContext, statusCode: 500, error: message };
  }
}
