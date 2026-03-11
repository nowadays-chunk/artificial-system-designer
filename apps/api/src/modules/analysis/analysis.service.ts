import { randomUUID } from "node:crypto";
import type {
  AnalysisScorecard,
  FindingSeverity,
  ValidationFinding,
} from "@asd/contracts/analysis";
import { validateGraphDocument, type GraphDocument, type GraphNode } from "@asd/contracts/graph";
import { saveAnalysisReport } from "./analysis.repository";

type ValidationRequestInput = {
  workspaceId: unknown;
  versionId?: unknown;
  graph: unknown;
  scenarioId?: unknown;
};

export type ValidationResponse = {
  reportId: string;
  findings: ValidationFinding[];
  scorecard: AnalysisScorecard;
};

function makeFinding(input: {
  ruleCode: string;
  severity: FindingSeverity;
  rationale: string;
  nodeIds?: string[];
  edgeIds?: string[];
  remediation: Array<{ label: string; description: string; command: string; params?: Record<string, string> }>;
}): ValidationFinding {
  return {
    id: randomUUID(),
    ruleCode: input.ruleCode,
    severity: input.severity,
    rationale: input.rationale,
    evidencePath: {
      nodeIds: input.nodeIds ?? [],
      edgeIds: input.edgeIds ?? [],
    },
    remediation: input.remediation.map((item) => ({
      id: randomUUID(),
      label: item.label,
      description: item.description,
      command: item.command,
      params: item.params ?? {},
    })),
  };
}

function isServiceLike(node: GraphNode) {
  const source = `${node.type} ${node.label}`.toLowerCase();
  return /service|api|gateway|compute|worker|backend|auth|bff|function/.test(source);
}

function isDataLike(node: GraphNode) {
  const source = `${node.type} ${node.label}`.toLowerCase();
  return /data|db|database|postgres|mysql|mongo|dynamo|spanner|redis|cache|queue|bucket|storage/.test(
    source,
  );
}

function isSecurityBoundary(node: GraphNode) {
  const source = `${node.type} ${node.label}`.toLowerCase();
  return /gateway|load.?balancer|reverse proxy|cdn|firewall|waf|shield/.test(source);
}

function isObservability(node: GraphNode) {
  const source = `${node.type} ${node.label}`.toLowerCase();
  return /metrics|trace|observability|monitor|log|collector|apm/.test(source);
}

function isBackupLike(node: GraphNode) {
  const source = `${node.type} ${node.label}`.toLowerCase();
  return /replica|backup|snapshot|archive|warehouse|storage/.test(source);
}

function scoreFromFindings(findings: ValidationFinding[], graph: GraphDocument): AnalysisScorecard {
  const penalties = findings.reduce(
    (acc, finding) => {
      if (finding.severity === "blocker") {
        acc.blocker += 20;
      } else if (finding.severity === "error") {
        acc.error += 12;
      } else if (finding.severity === "warn") {
        acc.warn += 7;
      } else {
        acc.info += 2;
      }
      return acc;
    },
    { blocker: 0, error: 0, warn: 0, info: 0 },
  );

  const base = 85;
  const graphComplexityPenalty = Math.max(0, graph.edges.length - graph.nodes.length) * 1.4;
  const totalPenalty =
    penalties.blocker + penalties.error + penalties.warn + penalties.info + graphComplexityPenalty;

  const resilience = Math.max(0, Math.min(100, base - totalPenalty));
  const security = Math.max(0, Math.min(100, base - penalties.blocker - penalties.error - penalties.warn * 0.8));
  const performance = Math.max(0, Math.min(100, base - graphComplexityPenalty - penalties.warn * 0.6));
  const cost = Math.max(0, Math.min(100, base - (graph.nodes.length * 0.8 + graph.edges.length * 0.4)));
  const maintainability = Math.max(
    0,
    Math.min(100, base - graphComplexityPenalty * 0.7 - penalties.warn - penalties.error * 0.8),
  );
  const overall = Math.round((resilience + security + performance + cost + maintainability) / 5);

  return {
    resilience: Math.round(resilience),
    security: Math.round(security),
    performance: Math.round(performance),
    cost: Math.round(cost),
    maintainability: Math.round(maintainability),
    overall,
  };
}

export function validateArchitectureService(input: ValidationRequestInput): ValidationResponse {
  if (typeof input.workspaceId !== "string" || input.workspaceId.length === 0) {
    throw new Error("invalid_workspace_id");
  }
  const graphValidation = validateGraphDocument(input.graph);
  if (!graphValidation.ok) {
    throw new Error(`invalid_graph_document:${graphValidation.errors.join(";")}`);
  }

  const graph = input.graph as GraphDocument;
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const incomingByNodeId = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const current = incomingByNodeId.get(edge.targetId) ?? [];
    current.push(edge.id);
    incomingByNodeId.set(edge.targetId, current);
  }

  const findings: ValidationFinding[] = [];
  const serviceNodes = graph.nodes.filter((node) => isServiceLike(node));
  const dataNodes = graph.nodes.filter((node) => isDataLike(node));
  const hasSecurityBoundary = graph.nodes.some((node) => isSecurityBoundary(node));
  const hasObservabilityLayer = graph.nodes.some((node) => isObservability(node));
  const hasBackupLayer = graph.nodes.some((node) => isBackupLike(node));

  const publicService = serviceNodes.find((node) => (incomingByNodeId.get(node.id) ?? []).length === 0);
  if (publicService && !hasSecurityBoundary) {
    findings.push(
      makeFinding({
        ruleCode: "PUBLIC_INGRESS_WITHOUT_SHIELD",
        severity: "warn",
        rationale: `${publicService.label} is exposed without an ingress control layer.`,
        nodeIds: [publicService.id],
        remediation: [
          {
            label: "Add ingress boundary",
            description: "Place an API gateway/load balancer/WAF in front of public services.",
            command: "graph.addNode",
            params: { suggestedType: "api_gateway" },
          },
        ],
      }),
    );
  }

  const directClientToDataEdge = graph.edges.find((edge) => {
    const source = nodesById.get(edge.sourceId);
    const target = nodesById.get(edge.targetId);
    if (!source || !target) {
      return false;
    }
    const sourceText = `${source.type} ${source.label}`.toLowerCase();
    return /client|browser|mobile|frontend/.test(sourceText) && isDataLike(target);
  });

  if (directClientToDataEdge) {
    const source = nodesById.get(directClientToDataEdge.sourceId);
    const target = nodesById.get(directClientToDataEdge.targetId);
    findings.push(
      makeFinding({
        ruleCode: "DIRECT_CLIENT_TO_DATA",
        severity: "blocker",
        rationale: `${source?.label ?? "Client"} talks directly to ${target?.label ?? "data store"}. Route it through an API or queue boundary.`,
        nodeIds: [directClientToDataEdge.sourceId, directClientToDataEdge.targetId],
        edgeIds: [directClientToDataEdge.id],
        remediation: [
          {
            label: "Insert service boundary",
            description: "Add an application service between clients and stateful systems.",
            command: "graph.insertNodeBetween",
            params: { edgeId: directClientToDataEdge.id, suggestedType: "app_service" },
          },
        ],
      }),
    );
  }

  if (dataNodes.length > 0 && !hasBackupLayer) {
    findings.push(
      makeFinding({
        ruleCode: "DATA_WITHOUT_BACKUP",
        severity: "warn",
        rationale: `${dataNodes[0].label} has stateful traffic but no visible backup or recovery layer.`,
        nodeIds: [dataNodes[0].id],
        remediation: [
          {
            label: "Add backup target",
            description: "Model replication, backups, or archive storage for stateful nodes.",
            command: "graph.addNode",
            params: { suggestedType: "backup_storage" },
          },
        ],
      }),
    );
  }

  if (graph.nodes.length >= 4 && !hasObservabilityLayer) {
    findings.push(
      makeFinding({
        ruleCode: "MISSING_OBSERVABILITY",
        severity: "warn",
        rationale: "The topology has critical paths but no metrics, tracing, or logging plane.",
        remediation: [
          {
            label: "Add observability plane",
            description: "Add metrics/log/trace components and route telemetry from core nodes.",
            command: "graph.addNode",
            params: { suggestedType: "observability_stack" },
          },
        ],
      }),
    );
  }

  const publicApiNode = graph.nodes.find((node) =>
    /api|gateway|auth|service|graphql|bff|backend|search/i.test(`${node.type} ${node.label}`),
  );
  const hasWaf = graph.nodes.some((node) => /waf|firewall|shield/i.test(`${node.type} ${node.label}`));
  if (publicApiNode && !hasWaf) {
    findings.push(
      makeFinding({
        ruleCode: "PUBLIC_API_WITHOUT_WAF",
        severity: "warn",
        rationale: "A public API or auth surface exists without a WAF or firewall control.",
        nodeIds: [publicApiNode.id],
        remediation: [
          {
            label: "Add WAF control",
            description: "Model a WAF/firewall ahead of public ingress.",
            command: "graph.addNode",
            params: { suggestedType: "waf" },
          },
        ],
      }),
    );
  }

  const limitedFindings = findings.slice(0, 6);
  const scorecard = scoreFromFindings(limitedFindings, graph);
  const summary = `Generated ${limitedFindings.length} finding(s) for ${graph.nodes.length} node(s) and ${graph.edges.length} edge(s).`;
  const saved = saveAnalysisReport({
    workspaceId: input.workspaceId,
    versionId: typeof input.versionId === "string" && input.versionId.length > 0 ? input.versionId : undefined,
    scenarioId: typeof input.scenarioId === "string" && input.scenarioId.length > 0 ? input.scenarioId : undefined,
    summary,
    findings: limitedFindings,
    scorecard,
  });

  return {
    reportId: saved.reportId,
    findings: limitedFindings,
    scorecard,
  };
}
