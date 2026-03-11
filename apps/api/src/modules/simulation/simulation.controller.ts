import type { ServerResponse } from "node:http";
import { correlationHeaderName } from "../../lib/correlation";
import type { LogContext } from "../../lib/logger";
import { recordAuditEvent } from "../audit/audit.service";
import { requireWorkspaceRole } from "../auth/auth.service";
import type { RequestAuthContext } from "../auth/auth.types";
import { createSimulationRunService, getSimulationRunService } from "./simulation.service";

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader(correlationHeaderName(), correlationId);
  response.end(JSON.stringify(payload));
}

export async function handleCreateSimulationRunRequest(
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
    requireWorkspaceRole(auth, workspaceId, "editor");
    const result = createSimulationRunService({
      workspaceId,
      versionId: payload.versionId,
      scenarioId: payload.scenarioId,
      seed: payload.seed,
      profile: payload.profile,
      graph: payload.graph,
      trafficRps: payload.trafficRps,
    });
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      action: "simulation.run.create",
      resourceType: "workspace",
      resourceId: workspaceId,
      payload: { runId: result.runId },
    });

    writeJson(response, 201, result, correlationId);
    return { ...logContext, statusCode: 201 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode =
      message === "simulation_run_not_found"
        ? 404
        : message === "forbidden_workspace_access"
          ? 403
          : message.startsWith("invalid_")
          ? 400
          : 500;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}

export async function handleGetSimulationRunRequest(
  response: ServerResponse,
  runId: string,
  correlationId: string,
  logContext: LogContext,
  auth: RequestAuthContext,
) {
  try {
    const payload = getSimulationRunService(runId);
    requireWorkspaceRole(auth, payload.run.workspaceId, "viewer");
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      action: "simulation.run.read",
      resourceType: "simulation_run",
      resourceId: runId,
      payload: { workspaceId: payload.run.workspaceId },
    });
    writeJson(
      response,
      200,
      {
        runId: payload.run.id,
        status: payload.run.status,
        metrics: payload.metrics,
        scorecard: payload.scorecard,
        ticks: payload.ticks,
        findings: payload.findings,
      },
      correlationId,
    );
    return { ...logContext, statusCode: 200 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode =
      message === "simulation_run_not_found"
        ? 404
        : message === "forbidden_workspace_access"
          ? 403
          : 500;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}
