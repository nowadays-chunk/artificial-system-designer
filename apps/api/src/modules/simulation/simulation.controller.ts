import type { ServerResponse } from "node:http";
import { correlationHeaderName } from "../../lib/correlation";
import type { LogContext } from "../../lib/logger";
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
) {
  try {
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const result = createSimulationRunService({
      workspaceId: payload.workspaceId,
      versionId: payload.versionId,
      scenarioId: payload.scenarioId,
      seed: payload.seed,
      profile: payload.profile,
      graph: payload.graph,
      trafficRps: payload.trafficRps,
    });

    writeJson(response, 201, result, correlationId);
    return { ...logContext, statusCode: 201 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode =
      message === "simulation_run_not_found"
        ? 404
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
) {
  try {
    const payload = getSimulationRunService(runId);
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
    const statusCode = message === "simulation_run_not_found" ? 404 : 500;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}
