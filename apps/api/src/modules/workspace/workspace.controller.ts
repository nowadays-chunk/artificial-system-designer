import type { ServerResponse } from "node:http";
import { correlationHeaderName } from "../../lib/correlation";
import type { LogContext } from "../../lib/logger";
import { recordAuditEvent } from "../audit/audit.service";
import { requireWorkspaceRole } from "../auth/auth.service";
import type { RequestAuthContext } from "../auth/auth.types";
import {
  createDiagramVersionService,
  createWorkspaceService,
  getWorkspaceService,
} from "./workspace.service";

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader(correlationHeaderName(), correlationId);
  response.end(JSON.stringify(payload));
}

export async function handleCreateWorkspaceRequest(
  response: ServerResponse,
  body: unknown,
  correlationId: string,
  logContext: LogContext,
  auth: RequestAuthContext,
) {
  try {
    const name = typeof body === "object" && body !== null ? (body as { name?: unknown }).name : undefined;
    const workspace = createWorkspaceService(name, auth.actorId, auth.tenantId);
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      action: "workspace.create",
      resourceType: "workspace",
      resourceId: workspace.id,
      payload: { name: workspace.name },
    });
    writeJson(response, 201, { workspaceId: workspace.id, createdAt: workspace.createdAt }, correlationId);
    return { ...logContext, statusCode: 201 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode = message === "invalid_workspace_name" ? 400 : 500;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}

export async function handleGetWorkspaceRequest(
  response: ServerResponse,
  workspaceId: string,
  correlationId: string,
  logContext: LogContext,
  auth: RequestAuthContext,
) {
  try {
    requireWorkspaceRole(auth, workspaceId, "viewer");
    const workspace = getWorkspaceService(workspaceId, auth.tenantId);
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      action: "workspace.read",
      resourceType: "workspace",
      resourceId: workspaceId,
    });
    writeJson(response, 200, workspace, correlationId);
    return { ...logContext, statusCode: 200 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode = message === "workspace_not_found" ? 404 : message === "forbidden_workspace_access" ? 403 : 500;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}

export async function handleCreateDiagramVersionRequest(
  response: ServerResponse,
  workspaceId: string,
  body: unknown,
  correlationId: string,
  logContext: LogContext,
  auth: RequestAuthContext,
) {
  try {
    requireWorkspaceRole(auth, workspaceId, "editor");
    const parsed = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const version = createDiagramVersionService({
      workspaceId,
      tenantId: auth.tenantId,
      baseVersionId: parsed.baseVersionId,
      graph: parsed.graph,
      message: parsed.message,
    });
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      action: "workspace.version.create",
      resourceType: "diagram_version",
      resourceId: version.id,
      payload: { workspaceId, number: version.number },
    });
    writeJson(response, 201, { versionId: version.id, number: version.number }, correlationId);
    return { ...logContext, statusCode: 201 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const statusCode =
      message === "workspace_not_found" ? 404 : message === "forbidden_workspace_access" ? 403 : 400;
    writeJson(response, statusCode, { error: message }, correlationId);
    return { ...logContext, statusCode, error: message };
  }
}
