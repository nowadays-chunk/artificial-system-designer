import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { correlationHeaderName, getOrCreateCorrelationId } from "./lib/correlation";
import { createSqlAdapter } from "./lib/db/adapter";
import { readDbConfigFromEnv } from "./lib/db/config";
import { runPendingMigrations } from "./lib/db/migrations";
import { logger } from "./lib/logger";
import { resolveRequestAuth } from "./modules/auth/auth.service";
import { handleHealthRequest } from "./modules/health/health.controller";
import { handleValidateAnalysisRequest } from "./modules/analysis/analysis.controller";
import {
  handleCreateSimulationRunRequest,
  handleGetSimulationRunRequest,
} from "./modules/simulation/simulation.controller";
import {
  handleCreateDiagramVersionRequest,
  handleCreateWorkspaceRequest,
  handleGetWorkspaceRequest,
} from "./modules/workspace/workspace.controller";

const startedAtMs = Date.now();
const defaultPort = 4010;

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader(correlationHeaderName(), correlationId);
  response.end(JSON.stringify(payload));
}

function parseJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

async function routeRequest(request: IncomingMessage, response: ServerResponse) {
  const started = Date.now();
  const correlationId = getOrCreateCorrelationId(request.headers);
  const auth = resolveRequestAuth(request.headers);
  const route = (request.url ?? "/").split("?")[0];
  const method = request.method ?? "GET";
  const logContext = {
    correlationId,
    route,
    method,
    service: "asd-api",
    actorId: auth.actorId,
    tenantId: auth.tenantId,
  };

  if (route === "/api/health" && method === "GET") {
    const context = handleHealthRequest(response, startedAtMs, correlationId, logContext);
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  if (route === "/api/workspaces" && method === "POST") {
    const body = await parseJsonBody(request);
    const context = await handleCreateWorkspaceRequest(response, body, correlationId, logContext, auth);
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  if (route === "/api/analysis/validate" && method === "POST") {
    const body = await parseJsonBody(request);
    const context = await handleValidateAnalysisRequest(response, body, correlationId, logContext, auth);
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  if (route === "/api/simulations/runs" && method === "POST") {
    const body = await parseJsonBody(request);
    const context = await handleCreateSimulationRunRequest(
      response,
      body,
      correlationId,
      logContext,
      auth,
    );
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  const simulationRunMatch = route.match(/^\/api\/simulations\/runs\/([^/]+)$/);
  if (simulationRunMatch && method === "GET") {
    const context = await handleGetSimulationRunRequest(
      response,
      simulationRunMatch[1],
      correlationId,
      logContext,
      auth,
    );
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  const workspaceMatch = route.match(/^\/api\/workspaces\/([^/]+)$/);
  if (workspaceMatch && method === "GET") {
    const context = await handleGetWorkspaceRequest(
      response,
      workspaceMatch[1],
      correlationId,
      logContext,
      auth,
    );
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  const versionsMatch = route.match(/^\/api\/workspaces\/([^/]+)\/diagram-versions$/);
  if (versionsMatch && method === "POST") {
    const body = await parseJsonBody(request);
    const context = await handleCreateDiagramVersionRequest(
      response,
      versionsMatch[1],
      body,
      correlationId,
      logContext,
      auth,
    );
    logger.info("request.completed", {
      ...context,
      durationMs: Date.now() - started,
    });
    return;
  }

  writeJson(response, 404, { error: "Not Found" }, correlationId);
  logger.warn("request.not_found", {
    ...logContext,
    statusCode: 404,
    durationMs: Date.now() - started,
  });
}

export function startApiServer(port = defaultPort) {
  const server = createServer(async (request, response) => {
    try {
      await routeRequest(request, response);
    } catch (error) {
      const correlationId = getOrCreateCorrelationId(request.headers);
      const message = error instanceof Error ? error.message : "unknown_error";
      const statusCode = message === "invalid_json" ? 400 : 500;
      logger.error("request.failed", {
        correlationId,
        route: request.url ?? "/",
        method: request.method ?? "GET",
        service: "asd-api",
        error: message,
      });
      writeJson(
        response,
        statusCode,
        { error: statusCode === 400 ? "invalid_json" : "Internal Server Error" },
        correlationId,
      );
    }
  });

  server.listen(port, () => {
    logger.info("api.started", { port, service: "asd-api" });
  });

  return server;
}

export async function bootstrapApiServer(port = defaultPort) {
  const dbConfig = readDbConfigFromEnv();
  if (dbConfig.runMigrationsOnBoot) {
    const adapter = createSqlAdapter(dbConfig);
    const migrationResult = await runPendingMigrations({ config: dbConfig, adapter });
    logger.info("migrations.completed", {
      provider: migrationResult.provider,
      targetKey: migrationResult.targetKey,
      appliedCount: migrationResult.applied.length,
      skippedCount: migrationResult.skipped.length,
      applied: migrationResult.applied,
    });
  }
  return startApiServer(port);
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? defaultPort);
  bootstrapApiServer(Number.isFinite(port) ? port : defaultPort).catch((error) => {
    const message = error instanceof Error ? error.message : "unknown_error";
    logger.error("api.bootstrap_failed", { error: message });
    process.exit(1);
  });
}
