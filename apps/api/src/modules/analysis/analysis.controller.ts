import type { ServerResponse } from "node:http";
import { correlationHeaderName } from "../../lib/correlation";
import type { LogContext } from "../../lib/logger";
import { recordAuditEvent } from "../audit/audit.service";
import { requireWorkspaceRole } from "../auth/auth.service";
import type { RequestAuthContext } from "../auth/auth.types";
import { validateArchitectureService } from "./analysis.service";

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader(correlationHeaderName(), correlationId);
  response.end(JSON.stringify(payload));
}

export async function handleValidateAnalysisRequest(
  response: ServerResponse,
  body: unknown,
  correlationId: string,
  logContext: LogContext,
  auth: RequestAuthContext,
) {
  try {
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : "";
    if (!workspaceId) {
      throw new Error("invalid_workspace_id");
    }
    requireWorkspaceRole(auth, workspaceId, "viewer");
    const result = validateArchitectureService({
      graph: payload.graph,
      scenarioId: payload.scenarioId,
    });
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      action: "analysis.validate",
      resourceType: "workspace",
      resourceId: workspaceId,
      payload: { reportId: result.reportId },
    });
    writeJson(response, 200, result, correlationId);
    return { ...logContext, statusCode: 200 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode =
      message.startsWith("invalid_graph_document:") || message === "invalid_workspace_id"
        ? 400
        : message === "forbidden_workspace_access"
          ? 403
          : 500;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}
