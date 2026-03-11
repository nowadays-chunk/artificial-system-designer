"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  cloudProviders,
  systemExamples,
  toolbarCategories,
  validationRules,
  type Scenario,
} from "./spec-data";
import type { GraphDocument } from "../packages/contracts/src/graph";
import { useGraphStore } from "./modeler/state/graph-store";
import { useSimulationStore } from "./modeler/state/sim-store";
import { useDiagramUiStore } from "./modeler/state/ui-store";
import { shortcutById, shortcutsByScope } from "./modeler/a11y/shortcuts";
import { validateArchitectureAnalysis } from "../lib/api-client/analysis";
import { createSimulationRun, getSimulationRun } from "../lib/api-client/simulation";
import type { ValidationFinding } from "../packages/contracts/src/analysis";
import type { SimulationTick as ApiSimulationTick } from "../packages/contracts/src/simulation";

type PaletteItem = {
  key: string;
  name: string;
  category: string;
  focus: string;
  canonicalType: string;
};

type DiagramNode = {
  id: string;
  label: string;
  type: string;
  category: string;
  focus: string;
  x: number;
  y: number;
  width: number;
  height: number;
  provider?: string;
  region?: string;
  settings: Record<string, string | number | boolean>;
};

type DiagramEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: string;
  purpose: string;
};

type ValidationMessage = {
  level: "warn" | "reject" | "note";
  rule: string;
  detail: string;
};

type SimulationNodeState = {
  requests: number;
  latency: number;
  cpu: number;
  errorRate: number;
  queueDepth: number;
  health: "healthy" | "strained" | "critical";
};

type SimulationSnapshot = {
  tick: number;
  demand: number;
  avgLatency: number;
  throughput: number;
  resilience: number;
  security: number;
  performance: number;
  costEfficiency: number;
  clarity: number;
  overallScore: number;
  estimatedCost: number;
  nodeState: Record<string, SimulationNodeState>;
  edgeTraffic: Record<string, number>;
  activeEdgeIds: string[];
  events: string[];
};

type RemoteSimulationRun = {
  runId: string;
  status: string;
  ticks: ApiSimulationTick[];
  scorecard: {
    resilience: number;
    security: number;
    performance: number;
    cost: number;
    overall: number;
  };
};

type NodeSelection = { kind: "node"; id: string };
type EdgeSelection = { kind: "edge"; id: string };
type Selection = NodeSelection | EdgeSelection | null;

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
};

type NodeProfile = {
  kind:
  | "client"
  | "edge"
  | "service"
  | "compute"
  | "data"
  | "cache"
  | "queue"
  | "storage"
  | "security"
  | "observability"
  | "region"
  | "ai";
  capacity: number;
  baseLatency: number;
  passThrough: number;
  costWeight: number;
  cacheHitRate: number;
  resilienceBonus: number;
  securityBonus: number;
};

export type DiagramSelectionInfo =
  | {
    kind: "node";
    id: string;
    label: string;
    type: string;
    category: string;
    focus: string;
    provider?: string;
    region?: string;
  }
  | {
    kind: "edge";
    id: string;
    protocol: string;
    purpose: string;
  }
  | null;

const CANVAS_WIDTH = 1760;
const CANVAS_HEIGHT = 1080;
const NODE_WIDTH = 184;
const NODE_HEIGHT = 110;
const MAX_ALERTS = 6;
const PROTOCOL_OPTIONS = [
  "HTTPS",
  "HTTP",
  "TCP",
  "gRPC",
  "WebSockets",
  "Message Queue",
  "Replication",
  "TLS",
] as const;

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

const CATEGORY_COLORS: Record<
  string,
  { accent: string; surface: string; shadow: string }
> = {
  Compute: {
    accent: "#f97316",
    surface: "rgba(249, 115, 22, 0.14)",
    shadow: "rgba(249, 115, 22, 0.24)",
  },
  Networking: {
    accent: "#06b6d4",
    surface: "rgba(6, 182, 212, 0.13)",
    shadow: "rgba(6, 182, 212, 0.22)",
  },
  "Application Layer": {
    accent: "#3b82f6",
    surface: "rgba(59, 130, 246, 0.14)",
    shadow: "rgba(59, 130, 246, 0.22)",
  },
  Databases: {
    accent: "#10b981",
    surface: "rgba(16, 185, 129, 0.12)",
    shadow: "rgba(16, 185, 129, 0.22)",
  },
  "Database Features": {
    accent: "#14b8a6",
    surface: "rgba(20, 184, 166, 0.12)",
    shadow: "rgba(20, 184, 166, 0.22)",
  },
  Messaging: {
    accent: "#f59e0b",
    surface: "rgba(245, 158, 11, 0.14)",
    shadow: "rgba(245, 158, 11, 0.24)",
  },
  Storage: {
    accent: "#8b5cf6",
    surface: "rgba(139, 92, 246, 0.12)",
    shadow: "rgba(139, 92, 246, 0.22)",
  },
  Clients: {
    accent: "#ec4899",
    surface: "rgba(236, 72, 153, 0.12)",
    shadow: "rgba(236, 72, 153, 0.22)",
  },
  Security: {
    accent: "#ef4444",
    surface: "rgba(239, 68, 68, 0.12)",
    shadow: "rgba(239, 68, 68, 0.22)",
  },
  Observability: {
    accent: "#6366f1",
    surface: "rgba(99, 102, 241, 0.12)",
    shadow: "rgba(99, 102, 241, 0.24)",
  },
  "AI/ML/Analytics": {
    accent: "#0f766e",
    surface: "rgba(15, 118, 110, 0.13)",
    shadow: "rgba(15, 118, 110, 0.24)",
  },
  default: {
    accent: "#64748b",
    surface: "rgba(100, 116, 139, 0.12)",
    shadow: "rgba(100, 116, 139, 0.18)",
  },
};

const CATEGORY_X: Record<string, number> = {
  Clients: 80,
  Networking: 280,
  Security: 280,
  "Application Layer": 560,
  Compute: 860,
  Databases: 1160,
  "Database Features": 1160,
  Storage: 1400,
  Messaging: 1400,
  Observability: 1440,
  "AI/ML/Analytics": 1440,
};

const paletteCatalog: PaletteItem[] = toolbarCategories.flatMap((category) =>
  category.components.map((component) => ({
    key: normalizeToken(component.name),
    name: component.name,
    category: category.category,
    focus: component.simulation_focus,
    canonicalType: toCanonicalType(component.name),
  })),
);

const paletteLookup = new Map(
  paletteCatalog.map((item) => [normalizeToken(item.name), item]),
);

const ruleBook = {
  publicIngress:
    validationRules.find((rule) =>
      rule.startsWith("Warn when a public-facing service has no load balancer"),
    ) ?? "Warn when a public-facing service has no load balancer or gateway in front of it.",
  directClientToData:
    validationRules.find((rule) =>
      rule.startsWith("Reject direct client access to internal databases"),
    ) ?? "Reject direct client access to internal databases or queues.",
  singleRegion:
    validationRules.find((rule) =>
      rule.startsWith("Warn when a single-region deployment serves global traffic"),
    ) ?? "Warn when a single-region deployment serves global traffic without failover routing.",
  dbBackup:
    validationRules.find((rule) =>
      rule.startsWith("Flag any database with write traffic but no backup"),
    ) ?? "Flag any database with write traffic but no backup or point-in-time recovery plan.",
  mediaWithoutCdn:
    validationRules.find((rule) =>
      rule.startsWith("Warn when media-heavy applications have no CDN"),
    ) ?? "Warn when media-heavy applications have no CDN or edge cache.",
  serviceDiscovery:
    validationRules.find((rule) =>
      rule.startsWith("Flag missing service discovery when microservices"),
    ) ?? "Flag missing service discovery when microservices are scaled dynamically.",
  observability:
    validationRules.find((rule) =>
      rule.startsWith("Flag missing observability on critical paths"),
    ) ?? "Flag missing observability on critical paths: ingress, data stores, queues, and background workers.",
  waf:
    validationRules.find((rule) =>
      rule.startsWith("Flag WAF absence on high-risk public APIs"),
    ) ?? "Flag WAF absence on high-risk public APIs that simulate abuse or credential attacks.",
};

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toCanonicalType(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function titleFromType(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function parseCompactNumber(value: string) {
  const match = value.match(/([\d.]+)\s*([KMB])?/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const suffix = match[2]?.toUpperCase();
  const multiplier =
    suffix === "B" ? 1_000_000_000 : suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;

  return Math.round(amount * multiplier);
}

function getCategoryTheme(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}

function getSettingNumber(
  settings: Record<string, string | number | boolean>,
  key: string,
  fallback: number,
) {
  const raw = settings[key];
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function inferPaletteItem(type?: string, label?: string): PaletteItem {
  const candidates = [label, type?.replace(/_/g, " "), type].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const normalized = normalizeToken(candidate);
    const direct = paletteLookup.get(normalized);
    if (direct) {
      return direct;
    }

    const partial = paletteCatalog.find(
      (item) => normalized.includes(item.key) || item.key.includes(normalized),
    );
    if (partial) {
      return partial;
    }
  }

  const haystack = `${type ?? ""} ${label ?? ""}`.toLowerCase();
  if (/browser|mobile|ios|android|client|frontend|app/.test(haystack)) {
    return {
      key: "client",
      name: label ?? "Client",
      category: "Clients",
      focus: "Entry point that generates user demand, sessions, and bandwidth pressure.",
      canonicalType: type ?? "client",
    };
  }
  if (/dns|gateway|router|cdn|load.?balancer|proxy|nat|vpn/.test(haystack)) {
    return {
      key: "network",
      name: label ?? titleFromType(type ?? "network_component"),
      category: "Networking",
      focus: "Traffic shaping, ingress control, and routing behavior across the graph.",
      canonicalType: type ?? "network_component",
    };
  }
  if (/waf|firewall|vault|kms|iam|auth|siem|security/.test(haystack)) {
    return {
      key: "security",
      name: label ?? titleFromType(type ?? "security_component"),
      category: "Security",
      focus: "Identity, policy enforcement, and attack-surface reduction.",
      canonicalType: type ?? "security_component",
    };
  }
  if (/redis|cache/.test(haystack)) {
    return {
      key: "cache",
      name: label ?? "Cache",
      category: "Database Features",
      focus: "Read acceleration, hot-key behavior, and hit-ratio trade-offs.",
      canonicalType: type ?? "cache",
    };
  }
  if (/kafka|queue|stream|pubsub|event hub|event|broker/.test(haystack)) {
    return {
      key: "queue",
      name: label ?? "Event Stream",
      category: "Messaging",
      focus: "Back-pressure, buffering, consumer lag, and asynchronous decoupling.",
      canonicalType: type ?? "event_stream",
    };
  }
  if (/storage|bucket|blob|object|warehouse|lake/.test(haystack)) {
    return {
      key: "storage",
      name: label ?? "Object Storage",
      category: "Storage",
      focus: "Durable storage, replication, and bulk data movement.",
      canonicalType: type ?? "object_storage",
    };
  }
  if (/database|postgres|mysql|sql|document|search|dynamo|mongo|spanner|db/.test(haystack)) {
    return {
      key: "database",
      name: label ?? "Database",
      category: "Databases",
      focus: "Durability, indexing, replication, and write amplification.",
      canonicalType: type ?? "database",
    };
  }
  if (/metrics|trace|monitor|logging|log|collector|observability/.test(haystack)) {
    return {
      key: "observability",
      name: label ?? "Telemetry",
      category: "Observability",
      focus: "Metrics, traces, alerts, and operational visibility.",
      canonicalType: type ?? "telemetry",
    };
  }
  if (/vector|feature|ml|model|inference|training|analytics|ai/.test(haystack)) {
    return {
      key: "ai",
      name: label ?? "Analytics",
      category: "AI/ML/Analytics",
      focus: "Inference, feature pipelines, and analytical fanout.",
      canonicalType: type ?? "analytics",
    };
  }
  if (/region|zone|subnet|vpc/.test(haystack)) {
    return {
      key: "region",
      name: label ?? "Cloud Region",
      category: "Networking",
      focus: "Failure-domain boundaries and latency-aware placement.",
      canonicalType: type ?? "cloud_region",
    };
  }
  if (/cluster|vm|worker|function|container|gpu|serverless|compute/.test(haystack)) {
    return {
      key: "compute",
      name: label ?? "Compute Node",
      category: "Compute",
      focus: "Compute saturation, scheduling, and scaling headroom.",
      canonicalType: type ?? "compute_node",
    };
  }

  return {
    key: normalizeToken(label ?? type ?? "service"),
    name: label ?? titleFromType(type ?? "service"),
    category: "Application Layer",
    focus: "Core business logic, request coordination, and service decomposition.",
    canonicalType: type ?? "service",
  };
}

function createNode(
  item: PaletteItem,
  id: string,
  x: number,
  y: number,
  overrides: Partial<DiagramNode> = {},
): DiagramNode {
  return {
    id,
    label: overrides.label ?? item.name,
    type: overrides.type ?? item.canonicalType,
    category: overrides.category ?? item.category,
    focus: overrides.focus ?? item.focus,
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    provider: overrides.provider,
    region: overrides.region,
    settings: {
      capacity_factor: 1,
      redundancy: 1,
      ...overrides.settings,
    },
  };
}

function layoutPositionForCategory(category: string, index: number) {
  const column = CATEGORY_X[category] ?? 840;
  const row = index % 6;
  const band = Math.floor(index / 6);

  return {
    x: clamp(column + band * 52, 48, CANVAS_WIDTH - NODE_WIDTH - 48),
    y: 90 + row * 150 + band * 18,
  };
}

function buildScenarioGraph(scenario: Scenario, stepCount: number) {
  const limitedSteps = scenario.architecture_steps.slice(0, stepCount);
  const nodesById = new Map<string, DiagramNode>();
  const aliasToId = new Map<string, string>();
  const edges: DiagramEdge[] = [];
  const edgeKeys = new Set<string>();
  const laneCounts = new Map<string, number>();

  const nextPosition = (category: string) => {
    const nextIndex = laneCounts.get(category) ?? 0;
    laneCounts.set(category, nextIndex + 1);
    return layoutPositionForCategory(category, nextIndex);
  };

  const ensureAlias = (key: string, nodeId: string) => {
    aliasToId.set(normalizeToken(key), nodeId);
  };

  const ensureNode = (reference: string, type?: string) => {
    const normalized = normalizeToken(reference);
    const existingId = aliasToId.get(normalized);
    if (existingId) {
      return existingId;
    }

    const item = inferPaletteItem(type, reference);
    const id = `external-${normalizeToken(reference)}`;
    if (!nodesById.has(id)) {
      const position = nextPosition(item.category);
      nodesById.set(
        id,
        createNode(item, id, position.x, position.y, {
          label: reference,
          type: type ?? item.canonicalType,
          category: item.category,
          focus: item.focus,
        }),
      );
    }

    ensureAlias(reference, id);
    return id;
  };

  for (const step of limitedSteps) {
    for (const component of step.component_added) {
      if (nodesById.has(component.id)) {
        continue;
      }

      const item = inferPaletteItem(component.type, component.label);
      const position = nextPosition(item.category);
      nodesById.set(
        component.id,
        createNode(item, component.id, position.x, position.y, {
          label: component.label,
          type: component.type,
          provider: component.provider,
          region: component.region,
          settings: component.parent ? { parent: component.parent } : {},
        }),
      );
      ensureAlias(component.id, component.id);
      ensureAlias(component.label, component.id);
    }

    for (const configuration of step.component_configured) {
      const targetId =
        aliasToId.get(normalizeToken(configuration.component_id)) ?? configuration.component_id;
      const existing = nodesById.get(targetId);
      if (!existing) {
        continue;
      }

      nodesById.set(targetId, {
        ...existing,
        settings: {
          ...existing.settings,
          ...configuration.settings,
        },
      });
    }

    for (let index = 0; index < step.connections_created.length; index += 1) {
      const connection = step.connections_created[index];
      const sourceId = ensureNode(connection.from);
      const targetId = ensureNode(connection.to);
      const edgeKey = `${sourceId}|${targetId}|${connection.protocol}|${connection.purpose}`;
      if (edgeKeys.has(edgeKey)) {
        continue;
      }

      edgeKeys.add(edgeKey);
      edges.push({
        id: `edge-${step.step_id}-${index}`,
        sourceId,
        targetId,
        protocol: connection.protocol,
        purpose: connection.purpose,
      });
    }
  }

  const nodes = [...nodesById.values()].sort(
    (left, right) => left.x - right.x || left.y - right.y,
  );

  return { nodes, edges };
}

function autoLayout(nodes: DiagramNode[]) {
  const laneCounts = new Map<string, number>();

  return nodes.map((node) => {
    const nextIndex = laneCounts.get(node.category) ?? 0;
    laneCounts.set(node.category, nextIndex + 1);
    const position = layoutPositionForCategory(node.category, nextIndex);

    return {
      ...node,
      x: position.x,
      y: position.y,
    };
  });
}

function getNodeProfile(node: DiagramNode): NodeProfile {
  const tokens = `${node.type} ${node.label} ${node.category}`.toLowerCase();
  const capacityFactor = clamp(getSettingNumber(node.settings, "capacity_factor", 1), 0.5, 6);
  const redundancy = clamp(getSettingNumber(node.settings, "redundancy", 1), 1, 6);

  let profile: NodeProfile = {
    kind: "service",
    capacity: 12_000,
    baseLatency: 12,
    passThrough: 0.82,
    costWeight: 3,
    cacheHitRate: 0,
    resilienceBonus: 4,
    securityBonus: 2,
  };

  if (/browser|mobile|client|frontend|app/.test(tokens)) {
    profile = {
      kind: "client",
      capacity: 120_000,
      baseLatency: 4,
      passThrough: 0.92,
      costWeight: 0.8,
      cacheHitRate: 0,
      resilienceBonus: 2,
      securityBonus: 1,
    };
  } else if (/dns|cdn|gateway|router|proxy|load.?balancer|nat|vpn|region/.test(tokens)) {
    profile = {
      kind: /region/.test(tokens) ? "region" : "edge",
      capacity: /cdn|dns/.test(tokens) ? 95_000 : 45_000,
      baseLatency: /region/.test(tokens) ? 2 : 7,
      passThrough: 0.94,
      costWeight: 2,
      cacheHitRate: /cdn/.test(tokens) ? 0.35 : 0,
      resilienceBonus: 10,
      securityBonus: 4,
    };
  } else if (/waf|firewall|vault|kms|iam|auth|siem|security/.test(tokens)) {
    profile = {
      kind: "security",
      capacity: 55_000,
      baseLatency: 9,
      passThrough: 0.88,
      costWeight: 2.4,
      cacheHitRate: 0,
      resilienceBonus: 7,
      securityBonus: 18,
    };
  } else if (/redis|cache/.test(tokens)) {
    profile = {
      kind: "cache",
      capacity: 38_000,
      baseLatency: 5,
      passThrough: 0.38,
      costWeight: 2.6,
      cacheHitRate: 0.62,
      resilienceBonus: 5,
      securityBonus: 2,
    };
  } else if (/kafka|queue|stream|pubsub|event hub|event stream|broker|topic/.test(tokens)) {
    profile = {
      kind: "queue",
      capacity: 72_000,
      baseLatency: 14,
      passThrough: 0.58,
      costWeight: 3,
      cacheHitRate: 0,
      resilienceBonus: 8,
      securityBonus: 2,
    };
  } else if (/storage|bucket|blob|object|warehouse|lake/.test(tokens)) {
    profile = {
      kind: "storage",
      capacity: 24_000,
      baseLatency: 18,
      passThrough: 0.22,
      costWeight: 3.8,
      cacheHitRate: 0,
      resilienceBonus: 6,
      securityBonus: 2,
    };
  } else if (/database|postgres|mysql|sql|document|search|dynamo|mongo|spanner|warehouse|db/.test(tokens)) {
    profile = {
      kind: "data",
      capacity: /search/.test(tokens) ? 16_000 : 8_500,
      baseLatency: /search/.test(tokens) ? 16 : 22,
      passThrough: 0.28,
      costWeight: 4.6,
      cacheHitRate: 0,
      resilienceBonus: 5,
      securityBonus: 3,
    };
  } else if (/metrics|trace|monitor|logging|log|collector|observability/.test(tokens)) {
    profile = {
      kind: "observability",
      capacity: 48_000,
      baseLatency: 8,
      passThrough: 0.16,
      costWeight: 2.1,
      cacheHitRate: 0,
      resilienceBonus: 6,
      securityBonus: 4,
    };
  } else if (/vector|feature|ml|model|inference|training|analytics|ai/.test(tokens)) {
    profile = {
      kind: "ai",
      capacity: 11_000,
      baseLatency: 24,
      passThrough: 0.34,
      costWeight: 5.4,
      cacheHitRate: 0,
      resilienceBonus: 3,
      securityBonus: 1,
    };
  } else if (/cluster|vm|worker|function|container|gpu|serverless|compute/.test(tokens)) {
    profile = {
      kind: "compute",
      capacity: /serverless|function/.test(tokens) ? 28_000 : 14_500,
      baseLatency: /gpu/.test(tokens) ? 20 : 13,
      passThrough: 0.8,
      costWeight: /gpu/.test(tokens) ? 5.8 : 3.5,
      cacheHitRate: 0,
      resilienceBonus: 5,
      securityBonus: 2,
    };
  }

  return {
    ...profile,
    capacity: profile.capacity * capacityFactor * redundancy,
    resilienceBonus: profile.resilienceBonus + (redundancy - 1) * 4,
  };
}

function isHighRiskApi(node: DiagramNode) {
  return /api|gateway|auth|service|graphql|bff|backend|search/i.test(
    `${node.type} ${node.label}`,
  );
}

function isMediaHeavyScenario(scenario: Scenario | undefined) {
  if (!scenario) {
    return false;
  }

  const source = `${scenario.system_name} ${scenario.description} ${scenario.traffic_estimation.hot_path}`.toLowerCase();
  return /stream|video|audio|media|cdn|playback/.test(source);
}

function evaluateValidation(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  scenario: Scenario | undefined,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, DiagramEdge[]>();
  const outgoing = new Map<string, DiagramEdge[]>();

  for (const edge of edges) {
    const nextIncoming = incoming.get(edge.targetId) ?? [];
    nextIncoming.push(edge);
    incoming.set(edge.targetId, nextIncoming);

    const nextOutgoing = outgoing.get(edge.sourceId) ?? [];
    nextOutgoing.push(edge);
    outgoing.set(edge.sourceId, nextOutgoing);
  }

  const hasShield = nodes.some((node) =>
    /gateway|load.?balancer|reverse proxy|cdn|firewall|waf/i.test(
      `${node.type} ${node.label}`,
    ),
  );
  const observabilityCount = nodes.filter((node) => getNodeProfile(node).kind === "observability")
    .length;
  const regionCount = nodes.filter((node) =>
    /region|multi-region/i.test(`${node.type} ${node.label}`),
  ).length;
  const serviceNodes = nodes.filter((node) =>
    ["service", "compute"].includes(getNodeProfile(node).kind),
  );
  const dataNodes = nodes.filter((node) =>
    ["data", "cache", "storage"].includes(getNodeProfile(node).kind),
  );
  const publicFacing = serviceNodes.filter((node) => (incoming.get(node.id) ?? []).length === 0);
  if (publicFacing.length > 0 && !hasShield) {
    messages.push({
      level: "warn",
      rule: ruleBook.publicIngress,
      detail: `${publicFacing[0].label} is exposed without an ingress control layer.`,
    });
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      continue;
    }

    const sourceKind = getNodeProfile(source).kind;
    const targetKind = getNodeProfile(target).kind;
    if (
      sourceKind === "client" &&
      (targetKind === "data" || targetKind === "queue" || targetKind === "storage")
    ) {
      messages.push({
        level: "reject",
        rule: ruleBook.directClientToData,
        detail: `${source.label} talks directly to ${target.label}. Route it through an API or queue boundary.`,
      });
      break;
    }
  }

  const expectedRegions =
    scenario && parseCompactNumber(scenario.scale.regions) > 1
      ? parseCompactNumber(scenario.scale.regions)
      : scenario && /global|multi|active-active|active-passive/i.test(scenario.scale.regions)
        ? 2
        : 0;
  if (expectedRegions > 1 && regionCount < 2) {
    messages.push({
      level: "warn",
      rule: ruleBook.singleRegion,
      detail: `The selected scenario expects global traffic, but the graph shows only ${Math.max(regionCount, 1)} region boundary.`,
    });
  }

  if (dataNodes.length > 0) {
    const hasBackupLikeNode = nodes.some((node) =>
      /replica|backup|snapshot|storage|archive|warehouse/i.test(
        `${node.type} ${node.label}`,
      ),
    );
    if (!hasBackupLikeNode) {
      messages.push({
        level: "warn",
        rule: ruleBook.dbBackup,
        detail: `${dataNodes[0].label} has stateful traffic but no backup or durable recovery layer is visible.`,
      });
    }
  }

  if (isMediaHeavyScenario(scenario)) {
    const hasCdn = nodes.some((node) => /cdn|edge cache|cache/i.test(`${node.type} ${node.label}`));
    if (!hasCdn) {
      messages.push({
        level: "warn",
        rule: ruleBook.mediaWithoutCdn,
        detail: "This scenario has a media-heavy hot path, but the canvas has no CDN or edge cache.",
      });
    }
  }

  if (serviceNodes.length >= 3) {
    const hasServiceDiscovery = nodes.some((node) =>
      /service discovery|registry|mesh|kubernetes|cluster|dns/i.test(
        `${node.type} ${node.label}`,
      ),
    );
    if (!hasServiceDiscovery) {
      messages.push({
        level: "warn",
        rule: ruleBook.serviceDiscovery,
        detail: `You have ${serviceNodes.length} service or compute nodes but no visible discovery or service-mesh layer.`,
      });
    }
  }

  if (nodes.length >= 4 && observabilityCount === 0) {
    messages.push({
      level: "warn",
      rule: ruleBook.observability,
      detail: "The topology has critical paths but no metrics, tracing, or logging plane.",
    });
  }

  const publicApiExists = nodes.some((node) => isHighRiskApi(node));
  const hasWaf = nodes.some((node) => /waf|firewall|shield/i.test(`${node.type} ${node.label}`));
  if (publicApiExists && !hasWaf) {
    messages.push({
      level: "warn",
      rule: ruleBook.waf,
      detail: "A public API or auth surface exists without a WAF or firewall control.",
    });
  }

  return messages.slice(0, MAX_ALERTS);
}

function findingToValidationMessage(finding: ValidationFinding): ValidationMessage {
  const level =
    finding.severity === "blocker" || finding.severity === "error"
      ? "reject"
      : finding.severity === "warn"
        ? "warn"
        : "note";

  return {
    level,
    rule: finding.ruleCode,
    detail: finding.rationale,
  };
}

function hashGraphSeed(graph: GraphDocument, scenarioName: string) {
  const source = `${scenarioName}:${graph.nodes.length}:${graph.edges.length}:${graph.nodes
    .map((node) => node.id)
    .join("|")}:${graph.edges.map((edge) => edge.id).join("|")}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function defaultProtocol(source: DiagramNode, target: DiagramNode) {
  const sourceProfile = getNodeProfile(source);
  const targetProfile = getNodeProfile(target);

  if (targetProfile.kind === "queue") {
    return "Message Queue";
  }
  if (targetProfile.kind === "data" || targetProfile.kind === "storage") {
    return "TCP";
  }
  if (sourceProfile.kind === "client" || sourceProfile.kind === "edge") {
    return "HTTPS";
  }
  if (sourceProfile.kind === "service" || targetProfile.kind === "service") {
    return "gRPC";
  }
  return "HTTPS";
}

function deriveConcepts(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  scenario: Scenario | undefined,
) {
  const concepts: string[] = [];
  const hasMessaging = nodes.some((node) => getNodeProfile(node).kind === "queue");
  const hasCache = nodes.some((node) => getNodeProfile(node).kind === "cache");
  const hasSecurity = nodes.some((node) => getNodeProfile(node).kind === "security");
  const hasObservability = nodes.some((node) => getNodeProfile(node).kind === "observability");
  const regionCount = nodes.filter((node) =>
    /region|availability/i.test(`${node.type} ${node.label}`),
  ).length;
  const hasAi = nodes.some((node) => getNodeProfile(node).kind === "ai");
  const heavyDataFanout = edges.length > nodes.length * 1.1;

  if (hasCache) {
    concepts.push("Edge caching and hot-path shielding");
  }
  if (hasMessaging) {
    concepts.push("Event-driven decoupling and back-pressure");
  }
  if (regionCount >= 2) {
    concepts.push("Multi-region failover and blast-radius control");
  }
  if (hasSecurity) {
    concepts.push("Zero-trust ingress and security segmentation");
  }
  if (hasObservability) {
    concepts.push("Trace-first operations and SLO visibility");
  }
  if (hasAi) {
    concepts.push("Analytics or inference sidecar flows");
  }
  if (heavyDataFanout) {
    concepts.push("High fanout path optimization");
  }
  if (scenario?.design_patterns.includes("CQRS")) {
    concepts.push("CQRS read/write separation");
  }
  if (scenario?.design_patterns.includes("Saga")) {
    concepts.push("Compensating transactions and workflow orchestration");
  }
  if (scenario?.design_patterns.includes("Event Driven")) {
    concepts.push("Asynchronous state propagation");
  }

  return concepts.slice(0, 6);
}

function simulateTopology(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  trafficRps: number,
  tick: number,
  validationMessages: ValidationMessage[],
): SimulationSnapshot {
  const nodeState: Record<string, SimulationNodeState> = {};
  const edgeTraffic: Record<string, number> = {};

  if (nodes.length === 0) {
    return {
      tick,
      demand: 0,
      avgLatency: 0,
      throughput: 0,
      resilience: 0,
      security: 0,
      performance: 0,
      costEfficiency: 0,
      clarity: 0,
      overallScore: 0,
      estimatedCost: 0,
      nodeState,
      edgeTraffic,
      activeEdgeIds: [],
      events: ["Drop components onto the canvas or load a guided scenario to start the simulation."],
    };
  }

  const outgoing = new Map<string, DiagramEdge[]>();
  const incoming = new Map<string, DiagramEdge[]>();
  for (const edge of edges) {
    const nextOutgoing = outgoing.get(edge.sourceId) ?? [];
    nextOutgoing.push(edge);
    outgoing.set(edge.sourceId, nextOutgoing);

    const nextIncoming = incoming.get(edge.targetId) ?? [];
    nextIncoming.push(edge);
    incoming.set(edge.targetId, nextIncoming);
  }

  const orderedNodes = [...nodes].sort((left, right) => left.x - right.x || left.y - right.y);
  const entryNodes = orderedNodes.filter((node) => {
    const profile = getNodeProfile(node);
    return (
      (incoming.get(node.id) ?? []).length === 0 ||
      profile.kind === "client" ||
      profile.kind === "edge"
    );
  });

  const demand = Math.round(
    trafficRps * (0.88 + ((Math.sin(tick / 2.6) + 1) / 2) * 0.28),
  );
  const loadMap = new Map<string, number>();
  const activeEdgeIds = new Set<string>();

  for (const node of entryNodes.length > 0 ? entryNodes : orderedNodes.slice(0, 1)) {
    loadMap.set(node.id, (loadMap.get(node.id) ?? 0) + demand / Math.max(entryNodes.length, 1));
  }

  let totalLatencyWeight = 0;
  let totalRequests = 0;
  let estimatedCost = 0;
  const critical: string[] = [];
  const strained: string[] = [];

  for (const node of orderedNodes) {
    const incomingLoad = loadMap.get(node.id) ?? 0;
    const profile = getNodeProfile(node);
    const outEdges = outgoing.get(node.id) ?? [];
    const utilization = profile.capacity > 0 ? incomingLoad / profile.capacity : 0;
    const saturationPenalty = utilization > 1 ? (utilization - 1) * 28 : utilization * 6;
    const queueDepth =
      profile.kind === "queue"
        ? Math.max(0, Math.round((incomingLoad - profile.capacity) / 7))
        : Math.max(0, Math.round((incomingLoad - profile.capacity) / 30));
    const latency = round(
      profile.baseLatency +
      utilization * profile.baseLatency * 1.8 +
      queueDepth / (profile.kind === "queue" ? 65 : 190),
      1,
    );
    const cpu = round(clamp(utilization * 72 + saturationPenalty + outEdges.length * 4 + 6, 0, 99), 1);
    const errorRate = round(clamp(Math.max(0, utilization - 0.94) * 22, 0, 35), 1);
    const health =
      cpu >= 88 || errorRate >= 12
        ? "critical"
        : cpu >= 66 || queueDepth > 240
          ? "strained"
          : "healthy";

    nodeState[node.id] = {
      requests: Math.round(incomingLoad),
      latency,
      cpu,
      errorRate,
      queueDepth,
      health,
    };

    if (health === "critical") {
      critical.push(node.label);
    } else if (health === "strained") {
      strained.push(node.label);
    }

    totalLatencyWeight += incomingLoad * latency;
    totalRequests += incomingLoad;
    estimatedCost +=
      profile.costWeight *
      (1 + cpu / 140) *
      clamp(getSettingNumber(node.settings, "redundancy", 1), 1, 6);

    if (outEdges.length > 0) {
      const routedLoad =
        profile.kind === "cache"
          ? incomingLoad * (1 - profile.cacheHitRate)
          : profile.kind === "queue"
            ? Math.min(incomingLoad, profile.capacity) * profile.passThrough
            : incomingLoad * profile.passThrough;
      const perEdge = routedLoad / outEdges.length;

      for (const edge of outEdges) {
        edgeTraffic[edge.id] = round(perEdge, 0);
        if (perEdge > 0.5) {
          activeEdgeIds.add(edge.id);
        }
        loadMap.set(edge.targetId, (loadMap.get(edge.targetId) ?? 0) + perEdge);
      }
    }
  }

  const avgLatency = round(totalRequests > 0 ? totalLatencyWeight / totalRequests : 0, 1);
  const throughput = Math.round(totalRequests * (1 - critical.length * 0.03));
  const loadBalancers = nodes.filter((node) =>
    /load.?balancer|gateway|proxy|cdn|dns/i.test(`${node.type} ${node.label}`),
  ).length;
  const queues = nodes.filter((node) => getNodeProfile(node).kind === "queue").length;
  const securityControls = nodes.filter((node) => getNodeProfile(node).kind === "security").length;
  const observability = nodes.filter((node) => getNodeProfile(node).kind === "observability").length;
  const multiRegion = nodes.filter((node) => /region|zone/i.test(`${node.type} ${node.label}`)).length;
  const resilience = clamp(
    42 +
    loadBalancers * 8 +
    queues * 7 +
    multiRegion * 9 +
    observability * 4 -
    critical.length * 8 -
    validationMessages.filter((message) => message.level !== "note").length * 5,
    0,
    100,
  );
  const security = clamp(
    32 + securityControls * 14 + observability * 4 - validationMessages.length * 5,
    0,
    100,
  );
  const performance = clamp(100 - avgLatency * 1.7 - critical.length * 12 - strained.length * 5, 0, 100);
  const costEfficiency = clamp(100 - estimatedCost * 1.5, 0, 100);
  const clarity = clamp(100 - Math.max(0, edges.length - nodes.length * 1.4) * 5, 35, 100);
  const overallScore = round(
    (resilience + security + performance + costEfficiency + clarity) / 5,
    1,
  );

  const hotNodes = [...orderedNodes]
    .sort((left, right) => (nodeState[right.id]?.cpu ?? 0) - (nodeState[left.id]?.cpu ?? 0))
    .slice(0, 3);
  const events = hotNodes.map((node) => {
    const state = nodeState[node.id];
    if (!state) {
      return `${node.label} is idle.`;
    }

    if (state.health === "critical") {
      return `${node.label} is saturated at ${state.cpu}% CPU with ${state.queueDepth} queued requests.`;
    }
    if (state.health === "strained") {
      return `${node.label} is running hot at ${state.cpu}% CPU. Add capacity or buffer the traffic path.`;
    }
    return `${node.label} is stable at ${formatNumber(state.requests)} req/s and ${state.latency} ms latency.`;
  });

  if (validationMessages.length > 0) {
    events.push(validationMessages[0].detail);
  }
  if (activeEdgeIds.size === 0) {
    events.push("Create connections between components so the traffic engine can route demand.");
  }

  return {
    tick,
    demand,
    avgLatency,
    throughput,
    resilience: round(resilience, 1),
    security: round(security, 1),
    performance: round(performance, 1),
    costEfficiency: round(costEfficiency, 1),
    clarity: round(clarity, 1),
    overallScore,
    estimatedCost: round(estimatedCost, 1),
    nodeState,
    edgeTraffic,
    activeEdgeIds: [...activeEdgeIds],
    events: events.slice(0, MAX_ALERTS),
  };
}

function connectionPath(source: DiagramNode, target: DiagramNode) {
  const startX = source.x + (source.x <= target.x ? source.width : 0);
  const endX = target.x + (source.x <= target.x ? 0 : target.width);
  const startY = source.y + source.height / 2;
  const endY = target.y + target.height / 2;
  const delta = Math.max(Math.abs(endX - startX) * 0.42, 120);

  return `M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}`;
}

function midpoint(source: DiagramNode, target: DiagramNode) {
  const startX = source.x + source.width / 2;
  const startY = source.y + source.height / 2;
  const endX = target.x + target.width / 2;
  const endY = target.y + target.height / 2;

  return {
    x: (startX + endX) / 2,
    y: (startY + endY) / 2,
  };
}

function scoreTone(value: number) {
  if (value >= 80) {
    return "text-emerald-700";
  }
  if (value >= 60) {
    return "text-amber-700";
  }
  return "text-rose-700";
}

function isEditableElement(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function healthTone(state: SimulationNodeState | undefined) {
  if (!state || state.health === "healthy") {
    return {
      border: "rgba(16, 185, 129, 0.42)",
      badge: "bg-emerald-100 text-emerald-800",
      glow: "0 18px 40px rgba(16, 185, 129, 0.12)",
    };
  }
  if (state.health === "strained") {
    return {
      border: "rgba(245, 158, 11, 0.45)",
      badge: "bg-amber-100 text-amber-800",
      glow: "0 18px 40px rgba(245, 158, 11, 0.16)",
    };
  }
  return {
    border: "rgba(239, 68, 68, 0.46)",
    badge: "bg-rose-100 text-rose-800",
    glow: "0 18px 40px rgba(239, 68, 68, 0.18)",
  };
}

function metricCard(label: string, value: string, helper: string, tone?: string) {
  return (
    <article className="rounded-[1.4rem] border border-white/60 bg-white/78 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${tone ?? "text-slate-950"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{helper}</p>
    </article>
  );
}

export function DiagramModeler({
  headless = false,
  canvasOnly = false,
  scenarioName,
  workspaceId,
  onSelectionInfoChange,
  onGraphDocumentChange,
}: {
  headless?: boolean;
  canvasOnly?: boolean;
  scenarioName?: string;
  workspaceId?: string;
  onSelectionInfoChange?: (selection: DiagramSelectionInfo) => void;
  onGraphDocumentChange?: (graph: GraphDocument) => void;
}) {

  const canvasRef = useRef<HTMLDivElement>(null);
  const generatedIdRef = useRef(0);
  const initialScenarioName = scenarioName ?? systemExamples[0]?.system_name ?? "";
  const initialScenario =
    systemExamples.find((scenario) => scenario.system_name === initialScenarioName) ??
    systemExamples[0];
  const initialGuidedStepCount = initialScenario?.architecture_steps.length ?? 0;
  const initialGraph = initialScenario
    ? buildScenarioGraph(initialScenario, initialGuidedStepCount)
    : { nodes: [], edges: [] };
  const initialTrafficRps = initialScenario
    ? clamp(parseCompactNumber(initialScenario.scale.peak_requests_per_second), 400, 1_400_000)
    : 20_000;

  const {
    selectedScenarioName,
    setSelectedScenarioName,
    guidedStepCount,
    setGuidedStepCount,
    paletteQuery,
    setPaletteQuery,
    draftPurpose,
    setDraftPurpose,
    draftProtocol,
    setDraftProtocol,
  } = useDiagramUiStore(initialScenarioName, initialGuidedStepCount);

  const {
    nodes,
    edges,
    selection,
    setSelection,
    pendingConnectionSourceId,
    setPendingConnectionSourceId,
    dragState,
    setDragState,
    updateNode,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    updateEdge,
    replaceGraph,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGraphStore<DiagramNode, DiagramEdge, Selection, DragState>(
    initialGraph.nodes,
    initialGraph.edges,
    null,
  );

  const {
    trafficRps,
    setTrafficRps,
    isRunning,
    setIsRunning,
    tick,
    setTick,
    resetTick,
  } = useSimulationStore(initialTrafficRps);

  const selectedScenario = useMemo(
    () =>
      systemExamples.find((scenario) => scenario.system_name === selectedScenarioName) ??
      systemExamples[0],
    [selectedScenarioName],
  );
  const deferredPaletteQuery = useDeferredValue(paletteQuery);
  const activeWorkspaceId = workspaceId ?? "local-workspace";
  const canvasShortcuts = shortcutsByScope("canvas");
  const stepTickShortcut = shortcutById("step-tick");
  const toggleRunShortcut = shortcutById("toggle-run");
  const autoLayoutShortcut = shortcutById("auto-layout");
  const clearSelectionShortcut = shortcutById("clear-selection");
  const deleteShortcut = shortcutById("delete-element");
  const [remoteValidationMessages, setRemoteValidationMessages] = useState<ValidationMessage[] | null>(
    null,
  );
  const [remoteSimulationRun, setRemoteSimulationRun] = useState<RemoteSimulationRun | null>(null);

  const graphDocument = useMemo<GraphDocument>(
    () => ({
      schemaVersion: "1.0",
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        category: node.category,
        focus: node.focus,
        provider: node.provider,
        region: node.region,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        settings: node.settings,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        protocol: edge.protocol,
        purpose: edge.purpose,
      })),
      metadata: {
        name: selectedScenarioName,
      },
    }),
    [edges, nodes, selectedScenarioName],
  );

  const localValidationMessages = useMemo(
    () => evaluateValidation(nodes, edges, selectedScenario),
    [edges, nodes, selectedScenario],
  );
  const validationMessages = remoteValidationMessages ?? localValidationMessages;
  const localSimulation = useMemo(
    () => simulateTopology(nodes, edges, trafficRps, tick, validationMessages),
    [edges, nodes, tick, trafficRps, validationMessages],
  );
  const simulation = useMemo(() => {
    if (!remoteSimulationRun || remoteSimulationRun.ticks.length === 0) {
      return localSimulation;
    }

    const normalizedTickIndex = (Math.max(1, tick) - 1) % remoteSimulationRun.ticks.length;
    const remoteTick = remoteSimulationRun.ticks[normalizedTickIndex];
    if (!remoteTick) {
      return localSimulation;
    }

    return {
      ...localSimulation,
      tick,
      demand: remoteTick.metrics.throughputRps,
      avgLatency: remoteTick.metrics.latencyMsP50,
      throughput: remoteTick.metrics.throughputRps,
      resilience: remoteSimulationRun.scorecard.resilience,
      security: remoteSimulationRun.scorecard.security,
      performance: remoteSimulationRun.scorecard.performance,
      costEfficiency: remoteSimulationRun.scorecard.cost,
      overallScore: remoteSimulationRun.scorecard.overall,
      estimatedCost: remoteTick.metrics.estimatedCostPerHourUsd,
      events: remoteTick.events.slice(0, MAX_ALERTS),
    };
  }, [localSimulation, remoteSimulationRun, tick]);
  const concepts = useMemo(
    () => deriveConcepts(nodes, edges, selectedScenario),
    [edges, nodes, selectedScenario],
  );
  const filteredPalette = useMemo(() => {
    const query = deferredPaletteQuery.trim().toLowerCase();
    if (!query) {
      return paletteCatalog;
    }

    return paletteCatalog.filter((item) =>
      `${item.name} ${item.category} ${item.focus}`.toLowerCase().includes(query),
    );
  }, [deferredPaletteQuery]);

  const selectedNode =
    selection?.kind === "node" ? nodes.find((node) => node.id === selection.id) ?? null : null;
  const selectedEdge =
    selection?.kind === "edge" ? edges.find((edge) => edge.id === selection.id) ?? null : null;
  const activeStep =
    guidedStepCount > 0 && selectedScenario
      ? selectedScenario.architecture_steps[guidedStepCount - 1]
      : null;
  const topNodes = [...nodes]
    .filter((node) => simulation.nodeState[node.id])
    .sort(
      (left, right) =>
        (simulation.nodeState[right.id]?.cpu ?? 0) -
        (simulation.nodeState[left.id]?.cpu ?? 0),
    )
    .slice(0, 5);

  const nextGeneratedId = (prefix: string) => {
    generatedIdRef.current += 1;
    return `${prefix}-${generatedIdRef.current}`;
  };

  const applyScenarioSelection = useCallback((scenarioName: string) => {
    const scenario =
      systemExamples.find((item) => item.system_name === scenarioName) ?? systemExamples[0];
    if (!scenario) {
      return;
    }

    const stepCount = scenario.architecture_steps.length;
    setSelectedScenarioName(scenario.system_name);
    setGuidedStepCount(stepCount);
    setTrafficRps(clamp(parseCompactNumber(scenario.scale.peak_requests_per_second), 400, 1_400_000));
    startTransition(() => {
      const nextGraph = buildScenarioGraph(scenario, stepCount);
      replaceGraph(nextGraph.nodes, nextGraph.edges, null);
      resetTick();
    });
  }, [replaceGraph, resetTick, setGuidedStepCount, setSelectedScenarioName, setTrafficRps]);

  useEffect(() => {
    let active = true;

    const runAnalysis = async () => {
      try {
        const report = await validateArchitectureAnalysis({
          graph: graphDocument,
          workspaceId: activeWorkspaceId,
          scenarioId: selectedScenarioName || undefined,
        });
        if (!active) {
          return;
        }
        setRemoteValidationMessages(report.findings.map(findingToValidationMessage).slice(0, MAX_ALERTS));
      } catch {
        if (!active) {
          return;
        }
        setRemoteValidationMessages(null);
      }
    };

    void runAnalysis();
    return () => {
      active = false;
    };
  }, [activeWorkspaceId, graphDocument, selectedScenarioName]);

  useEffect(() => {
    let active = true;

    const runRemoteSimulation = async () => {
      try {
        const seed = hashGraphSeed(graphDocument, selectedScenarioName);
        const created = await createSimulationRun({
          workspaceId: activeWorkspaceId,
          versionId: "live-graph",
          scenarioId: selectedScenarioName || "custom",
          seed,
          profile: "normal",
          graph: graphDocument,
          trafficRps,
        });
        const run = await getSimulationRun(created.runId);
        if (!active) {
          return;
        }
        setRemoteSimulationRun({
          runId: run.runId,
          status: run.status,
          ticks: run.ticks,
          scorecard: run.scorecard,
        });
      } catch {
        if (!active) {
          return;
        }
        setRemoteSimulationRun(null);
      }
    };

    void runRemoteSimulation();
    return () => {
      active = false;
    };
  }, [activeWorkspaceId, graphDocument, selectedScenarioName, trafficRps]);

  const loadScenarioSteps = (stepCount: number) => {
    if (!selectedScenario) {
      return;
    }

    const safeStepCount = clamp(stepCount, 0, selectedScenario.architecture_steps.length);
    setGuidedStepCount(safeStepCount);
    startTransition(() => {
      const nextGraph = buildScenarioGraph(selectedScenario, safeStepCount);
      replaceGraph(nextGraph.nodes, nextGraph.edges, null);
      resetTick();
    });
  };

  const handleGlobalPointerMove = useEffectEvent((event: PointerEvent) => {
    if (!dragState || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const nextX = clamp(
      event.clientX - rect.left - dragState.offsetX,
      24,
      CANVAS_WIDTH - NODE_WIDTH - 24,
    );
    const nextY = clamp(
      event.clientY - rect.top - dragState.offsetY,
      24,
      CANVAS_HEIGHT - NODE_HEIGHT - 24,
    );

    updateNode(dragState.nodeId, (node) => ({
      ...node,
      x: nextX,
      y: nextY,
    }));
  });

  const handleGlobalPointerUp = useEffectEvent(() => {
    setDragState(null);
  });

  useEffect(() => {
    if (!dragState) {
      return;
    }

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection?.kind === "node") {
          removeNode(selection.id);
          setSelection(null);
        } else if (selection?.kind === "edge") {
          removeEdge(selection.id);
          setSelection(null);
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        setTick((current) => current + 1);
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        replaceGraph(autoLayout(nodes), edges, selection);
        setTick((current) => current + 1);
      }

      if (event.key === " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setIsRunning((current) => !current);
      }

      if (selection?.kind === "node" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const delta = event.shiftKey ? 25 : 10;
        updateNode(selection.id, (node) => ({
          ...node,
          x:
            event.key === "ArrowLeft"
              ? clamp(node.x - delta, 24, CANVAS_WIDTH - NODE_WIDTH - 24)
              : event.key === "ArrowRight"
                ? clamp(node.x + delta, 24, CANVAS_WIDTH - NODE_WIDTH - 24)
                : node.x,
          y:
            event.key === "ArrowUp"
              ? clamp(node.y - delta, 24, CANVAS_HEIGHT - NODE_HEIGHT - 24)
              : event.key === "ArrowDown"
                ? clamp(node.y + delta, 24, CANVAS_HEIGHT - NODE_HEIGHT - 24)
                : node.y,
        }));
      }

      if (event.key === "Escape") {
        setSelection(null);
        setPendingConnectionSourceId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    redo,
    replaceGraph,
    edges,
    nodes,
    removeEdge,
    removeNode,
    selection,
    setIsRunning,
    setPendingConnectionSourceId,
    setSelection,
    setTick,
    undo,
    updateNode,
  ]);


  const handleNodePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    nodeId: string,
  ) => {
    if (pendingConnectionSourceId) {
      return;
    }

    const node = nodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    setSelection({ kind: "node", id: nodeId });
    const rect = event.currentTarget.getBoundingClientRect();
    setDragState({
      nodeId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  const handleNodeClick = (nodeId: string, withShiftKey = false) => {
    if (!pendingConnectionSourceId) {
      if (withShiftKey) {
        const source = nodes.find((node) => node.id === nodeId);
        if (!source) {
          return;
        }
        setDraftProtocol(defaultProtocol(source, source));
        setDraftPurpose("Primary request flow");
        setPendingConnectionSourceId(nodeId);
      }
      setSelection({ kind: "node", id: nodeId });
      return;
    }

    if (pendingConnectionSourceId === nodeId) {
      setPendingConnectionSourceId(null);
      return;
    }

    const source = nodes.find((node) => node.id === pendingConnectionSourceId);
    const target = nodes.find((node) => node.id === nodeId);
    if (!source || !target) {
      return;
    }

    const newEdge: DiagramEdge = {
      id: nextGeneratedId(`edge-${pendingConnectionSourceId}-${nodeId}`),
      sourceId: pendingConnectionSourceId,
      targetId: nodeId,
      protocol: draftProtocol || defaultProtocol(source, target),
      purpose: draftPurpose.trim() || "Primary request flow",
    };

    addEdge(newEdge);
    setPendingConnectionSourceId(null);
    setSelection({ kind: "edge", id: newEdge.id });
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const raw = event.dataTransfer.getData("application/x-network-node");
    if (!raw || !canvasRef.current) {
      return;
    }

    const item = JSON.parse(raw) as PaletteItem;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp(
      event.clientX - rect.left - NODE_WIDTH / 2,
      24,
      CANVAS_WIDTH - NODE_WIDTH - 24,
    );
    const y = clamp(
      event.clientY - rect.top - NODE_HEIGHT / 2,
      24,
      CANVAS_HEIGHT - NODE_HEIGHT - 24,
    );
    const id = nextGeneratedId(item.canonicalType);

    const node = createNode(item, id, x, y, {
      provider: cloudProviders[0]?.name,
    });

    addNode(node);
    setSelection({ kind: "node", id });
  };

  const handleCanvasClick = () => {
    if (pendingConnectionSourceId) {
      return;
    }
    setSelection(null);
  };

  const inspectorNodeState = selectedNode ? simulation.nodeState[selectedNode.id] : undefined;
  const isCanvasOnly = headless && canvasOnly;

  useEffect(() => {
    if (!scenarioName || scenarioName === selectedScenarioName) {
      return;
    }
    applyScenarioSelection(scenarioName);
  }, [applyScenarioSelection, scenarioName, selectedScenarioName]);

  useEffect(() => {
    if (!onSelectionInfoChange) {
      return;
    }

    if (selectedNode) {
      onSelectionInfoChange({
        kind: "node",
        id: selectedNode.id,
        label: selectedNode.label,
        type: selectedNode.type,
        category: selectedNode.category,
        focus: selectedNode.focus,
        provider: selectedNode.provider,
        region: selectedNode.region,
      });
      return;
    }

    if (selectedEdge) {
      onSelectionInfoChange({
        kind: "edge",
        id: selectedEdge.id,
        protocol: selectedEdge.protocol,
        purpose: selectedEdge.purpose,
      });
      return;
    }

    onSelectionInfoChange(null);
  }, [selectedNode, selectedEdge, onSelectionInfoChange]);

  useEffect(() => {
    if (!onGraphDocumentChange) {
      return;
    }

    onGraphDocumentChange(graphDocument);
  }, [graphDocument, onGraphDocumentChange]);

  return (
    <div className={`${headless ? "flex flex-col h-full w-full" : "grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]"}`}>
      {!headless && (
        <aside className="space-y-5">

          <section className="rounded-[1.8rem] border border-white/70 bg-panel/80 border-line shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700">
                  Guided Scenario
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Spec-backed lab bootstrap
                </h3>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
                {selectedScenario?.difficulty}
              </span>
            </div>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Scenario
            </label>
            <select
              value={selectedScenarioName}
              onChange={(event) => applyScenarioSelection(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            >
              {systemExamples.map((scenario) => (
                <option key={scenario.system_name} value={scenario.system_name}>
                  {scenario.system_name}
                </option>
              ))}
            </select>

            {selectedScenario ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-slate-700">{selectedScenario.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedScenario.design_patterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Peak RPS
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {selectedScenario.scale.peak_requests_per_second}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Regions
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {selectedScenario.scale.regions}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Step Playback
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {guidedStepCount} / {selectedScenario?.architecture_steps.length ?? 0} spec
                    steps applied
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadScenarioSteps(0)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                >
                  Blank canvas
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadScenarioSteps(guidedStepCount - 1)}
                  className="rounded-full border border-slate-200 bg-panel border-line shadow-lg"
                >
                  Roll back step
                </button>
                <button
                  type="button"
                  onClick={() => loadScenarioSteps(guidedStepCount + 1)}
                  className="rounded-full border border-slate-200 bg-panel border-line shadow-lg"
                >
                  Apply next step
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadScenarioSteps(selectedScenario?.architecture_steps.length ?? guidedStepCount)
                  }
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Load full lab
                </button>
              </div>
              {activeStep ? (
                <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-700">
                    Current Step
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-slate-950">{activeStep.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {activeStep.tooltip.what_happens}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeStep.operations.slice(0, 4).map((operation) => (
                      <span
                        key={operation}
                        className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-900"
                      >
                        {operation}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  The workspace is blank. Drag components from the palette to build your own network
                  model.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-white/70 bg-panel/80 border-line shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700">
                  Component Palette
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Drag spec components
                </h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {filteredPalette.length} items
              </span>
            </div>

            <input
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              placeholder="Search load balancer, queue, cache..."
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            />

            <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
              {filteredPalette.map((item) => {
                const theme = getCategoryTheme(item.category);
                return (
                  <button
                    key={`${item.category}-${item.name}`}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/x-network-node",
                        JSON.stringify(item),
                      );
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className="w-full rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]"
                    style={{
                      background: `linear-gradient(140deg, ${theme.surface}, rgba(255,255,255,0.95))`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          {item.category}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[0.68rem] font-medium"
                        style={{
                          color: theme.accent,
                          background: "rgba(255,255,255,0.74)",
                        }}
                      >
                        Drag
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{item.focus}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      )}
      <section className={`${headless ? "h-full w-full" : ""} ${isCanvasOnly ? "h-full" : "space-y-5"}`}>
        {!isCanvasOnly ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-white/70 bg-white/78 px-5 py-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Live Diagram
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                Connect components and simulate traffic
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTick((current) => current + 1)}
                aria-keyshortcuts={stepTickShortcut?.ariaKeyShortcuts}
                className="rounded-full border border-slate-200 bg-panel border-line shadow-lg"
              >
                Step tick
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-cyan-300"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-cyan-300"
              >
                Redo
              </button>
              <button
                type="button"
                onClick={() => setIsRunning((current) => !current)}
                aria-keyshortcuts={toggleRunShortcut?.ariaKeyShortcuts}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {isRunning ? "Pause simulation" : "Run simulation"}
              </button>
              <button
                type="button"
                onClick={() => {
                  replaceGraph(autoLayout(nodes), edges, selection);
                  setTick((current) => current + 1);
                }}
                aria-keyshortcuts={autoLayoutShortcut?.ariaKeyShortcuts}
                className="rounded-full border border-slate-200 bg-panel border-line shadow-lg"
              >
                Auto-layout
              </button>
              <button
                type="button"
                onClick={() => {
                  replaceGraph([], [], null);
                  setGuidedStepCount(0);
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}

        <div className={isCanvasOnly ? "h-full bg-slate-950 p-4" : "rounded-[1.8rem] border border-white/70 bg-panel border-line shadow-md"}>
          {!isCanvasOnly ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Traffic Pressure
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    type="range"
                    min={400}
                    max={1_400_000}
                    step={200}
                    value={trafficRps}
                    onChange={(event) => setTrafficRps(Number(event.target.value))}
                    className="w-full accent-cyan-600"
                  />
                  <div className="min-w-[130px] rounded-2xl bg-slate-950 px-4 py-3 text-right text-sm font-medium text-white">
                    {formatNumber(trafficRps)} req/s
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {concepts.map((concept) => (
                  <span
                    key={concept}
                    className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-900"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {!isCanvasOnly && pendingConnectionSourceId ? (
            <div className="mt-5 rounded-[1.35rem] border border-cyan-200 bg-cyan-50/90 px-4 py-4">
              <p className="text-sm font-medium text-cyan-900">
                Linking from{" "}
                {nodes.find((node) => node.id === pendingConnectionSourceId)?.label ??
                  "selected node"}
                . Click a target node to create the connection.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_120px]">
                <select
                  value={draftProtocol}
                  onChange={(event) =>
                    setDraftProtocol(event.target.value as (typeof PROTOCOL_OPTIONS)[number])
                  }
                  className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  {PROTOCOL_OPTIONS.map((protocol) => (
                    <option key={protocol} value={protocol}>
                      {protocol}
                    </option>
                  ))}
                </select>
                <input
                  value={draftPurpose}
                  onChange={(event) => setDraftPurpose(event.target.value)}
                  className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                  placeholder="Purpose of this connection"
                />
                <button
                  type="button"
                  onClick={() => setPendingConnectionSourceId(null)}
                  aria-keyshortcuts={clearSelectionShortcut?.ariaKeyShortcuts}
                  className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm text-cyan-900 transition hover:border-cyan-300"
                >
                  Cancel link
                </button>
              </div>
            </div>
          ) : null}

          <div className={`${isCanvasOnly ? "h-full overflow-auto" : "mt-5 overflow-auto rounded-[1.6rem] border border-slate-200 bg-slate-950/92 p-4"}`}>
            <div
              ref={canvasRef}
              className="network-grid relative overflow-hidden rounded-[1.35rem]"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
              role="region"
              tabIndex={0}
              aria-label="Architecture canvas"
              aria-describedby="modeler-canvas-shortcuts"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleCanvasDrop}
              onClick={handleCanvasClick}
            >
              <p id="modeler-canvas-shortcuts" className="sr-only">
                Canvas shortcuts: {canvasShortcuts.map((shortcut) => `${shortcut.label}: ${shortcut.keys}`).join(", ")}.
              </p>
              <svg
                className="absolute inset-0 h-full w-full"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
              >
                <defs>
                  <linearGradient id="edge-base" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(56, 189, 248, 0.24)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0.7)" />
                  </linearGradient>
                  <linearGradient id="edge-active" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>

                {edges.map((edge) => {
                  const source = nodes.find((node) => node.id === edge.sourceId);
                  const target = nodes.find((node) => node.id === edge.targetId);
                  if (!source || !target) {
                    return null;
                  }

                  const path = connectionPath(source, target);
                  const labelPoint = midpoint(source, target);
                  const isSelected = selection?.kind === "edge" && selection.id === edge.id;
                  const isActive = simulation.activeEdgeIds.includes(edge.id);

                  return (
                    <g key={edge.id}>
                      <path
                        d={path}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={10}
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="url(#edge-base)"
                        strokeWidth={isSelected ? 4 : 3}
                        strokeLinecap="round"
                      />
                      {isActive ? (
                        <path
                          d={path}
                          fill="none"
                          stroke="url(#edge-active)"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeDasharray="14 10"
                          className="edge-flow"
                        />
                      ) : null}
                      <path
                        d={path}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={18}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select connection ${edge.protocol} from ${source.label} to ${target.label}`}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelection({ kind: "edge", id: edge.id });
                          }
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelection({ kind: "edge", id: edge.id });
                        }}
                      />
                      <g transform={`translate(${labelPoint.x - 56} ${labelPoint.y - 20})`}>
                        <rect
                          width="112"
                          height="40"
                          rx="16"
                          fill={isSelected ? "rgba(15,23,42,0.95)" : "rgba(15,23,42,0.72)"}
                          stroke="rgba(255,255,255,0.10)"
                        />
                        <text
                          x="56"
                          y="16"
                          textAnchor="middle"
                          fill="rgba(224,242,254,0.92)"
                          fontSize="10"
                          style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}
                        >
                          {edge.protocol}
                        </text>
                        <text
                          x="56"
                          y="29"
                          textAnchor="middle"
                          fill="rgba(226,232,240,0.86)"
                          fontSize="10"
                        >
                          {formatNumber(simulation.edgeTraffic[edge.id] ?? 0)} rps
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {nodes.map((node) => {
                const theme = getCategoryTheme(node.category);
                const state = simulation.nodeState[node.id];
                const tone = healthTone(state);
                const isSelected = selection?.kind === "node" && selection.id === node.id;
                const isConnectionSource = pendingConnectionSourceId === node.id;

                const cardStyle: CSSProperties = {
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  borderColor: isSelected ? theme.accent : tone.border,
                  background: `linear-gradient(145deg, ${theme.surface}, rgba(10, 16, 30, 0.92))`,
                  boxShadow: isSelected ? `0 20px 55px ${theme.shadow}` : tone.glow,
                };

                return (
                  <button
                    key={node.id}
                    type="button"
                    onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleNodeClick(node.id, event.shiftKey);
                    }}
                    aria-pressed={isSelected}
                    aria-keyshortcuts={deleteShortcut?.ariaKeyShortcuts}
                    aria-label={`Node ${node.label}. ${state?.health ?? "idle"} health. ${state ? `${formatNumber(state.requests)} requests per second.` : "No traffic."}`}
                    className="absolute overflow-hidden rounded-[1.35rem] border px-4 py-3 text-left text-white transition duration-150 hover:-translate-y-0.5"
                    style={cardStyle}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold leading-5 text-white">{node.label}</p>
                          <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-300">
                            {titleFromType(node.type)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.64rem] font-medium ${tone.badge}`}
                        >
                          {state?.health ?? "idle"}
                        </span>
                      </div>
                      <div className="mt-auto flex items-end justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-300">
                            {state ? `${formatNumber(state.requests)} req/s` : "No traffic"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {node.provider ?? node.category}
                          </p>
                        </div>
                        {isConnectionSource ? (
                          <span className="rounded-full bg-cyan-100 px-2 py-1 text-[0.64rem] font-medium text-cyan-900">
                            linking
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}

              {nodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="max-w-md rounded-[1.8rem] border border-cyan-400/20 bg-slate-950/80 px-8 py-7 text-center shadow-[0_30px_80px_rgba(8,145,178,0.18)]">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">
                      Start Modeling
                    </p>
                    <h4 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      Drop components, create links, then run the network.
                    </h4>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Use the palette to place routers, services, caches, queues, databases, or
                      observability nodes. The simulator will estimate traffic flow, server load,
                      latency, and resilience patterns.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      {!headless && (
        <aside className="space-y-5">

          <section className="rounded-[1.8rem] border border-white/70 bg-panel/80 border-line shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700">
                  Simulation HUD
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Server-level telemetry
                </h3>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                Tick {simulation.tick}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {metricCard(
                "Demand",
                formatNumber(simulation.demand),
                "Input traffic applied to entry nodes this tick.",
              )}
              {metricCard(
                "Latency",
                `${simulation.avgLatency} ms`,
                "Average end-to-end service latency across active paths.",
                scoreTone(simulation.performance),
              )}
              {metricCard(
                "Throughput",
                `${formatNumber(simulation.throughput)} req/s`,
                "Effective volume after contention and critical failures.",
              )}
              {metricCard(
                "Overall Score",
                `${simulation.overallScore}/100`,
                "Balanced view across resilience, security, performance, cost, and clarity.",
                scoreTone(simulation.overallScore),
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Resilience
                </p>
                <p className={`mt-2 text-xl font-semibold ${scoreTone(simulation.resilience)}`}>
                  {simulation.resilience}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Security
                </p>
                <p className={`mt-2 text-xl font-semibold ${scoreTone(simulation.security)}`}>
                  {simulation.security}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Performance
                </p>
                <p className={`mt-2 text-xl font-semibold ${scoreTone(simulation.performance)}`}>
                  {simulation.performance}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Cost Efficiency
                </p>
                <p className={`mt-2 text-xl font-semibold ${scoreTone(simulation.costEfficiency)}`}>
                  {simulation.costEfficiency}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.45rem] border border-slate-200 bg-slate-50/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Hottest Nodes
                </p>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  est. cost {simulation.estimatedCost}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {topNodes.map((node) => {
                  const state = simulation.nodeState[node.id];
                  const tone = healthTone(state);
                  return (
                    <div
                      key={node.id}
                      className="rounded-2xl border bg-white px-4 py-3"
                      style={{ borderColor: tone.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{node.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{titleFromType(node.type)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[0.64rem] font-medium ${tone.badge}`}>
                          {state.health}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-slate-600">
                        <div>
                          <p className="font-semibold text-slate-900">{state.cpu}%</p>
                          <p>CPU</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{state.latency} ms</p>
                          <p>Latency</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{state.errorRate}%</p>
                          <p>Error</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{state.queueDepth}</p>
                          <p>Queue</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-white/70 bg-panel/80 border-line shadow-xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700">
              Validation
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Rules and incident feed
            </h3>

            <div className="mt-4 space-y-3">
              <ul aria-live="polite" className="space-y-3">
                {validationMessages.map((message) => (
                  <li
                  key={`${message.rule}-${message.detail}`}
                  className="rounded-[1.35rem] border px-4 py-4"
                  style={{
                    borderColor:
                      message.level === "reject"
                        ? "rgba(239,68,68,0.32)"
                        : "rgba(245,158,11,0.30)",
                    background:
                      message.level === "reject"
                        ? "rgba(254, 242, 242, 0.86)"
                        : "rgba(255, 251, 235, 0.88)",
                  }}
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {message.level}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{message.rule}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{message.detail}</p>
                  </li>
                ))}
              </ul>
              {validationMessages.length === 0 ? (
                <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/90 px-4 py-4">
                  <p className="text-sm font-medium text-emerald-900">
                    No major validation issues are currently triggered.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-[1.45rem] border border-slate-200 bg-slate-50/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Simulation Events
              </p>
              <ul aria-live="polite" className="mt-3 space-y-3">
                {simulation.events.map((eventText) => (
                  <li
                    key={eventText}
                    className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {eventText}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-white/70 bg-panel/80 border-line shadow-xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700">
              Inspector
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Configure the selected element
            </h3>

            {selectedNode ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Node label
                  </label>
                  <input
                    value={selectedNode.label}
                    onChange={(event) =>
                      updateNode(selectedNode.id, (node) => ({
                        ...node,
                        label: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Provider
                    </label>
                    <select
                      value={selectedNode.provider ?? ""}
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => ({
                          ...node,
                          provider: event.target.value || undefined,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                    >
                      <option value="">None</option>
                      {cloudProviders.map((provider) => (
                        <option key={provider.name} value={provider.name}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Region
                    </label>
                    <input
                      value={selectedNode.region ?? ""}
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => ({
                          ...node,
                          region: event.target.value || undefined,
                        }))
                      }
                      placeholder="eu-west-1"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Capacity factor
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={6}
                      step={0.1}
                      value={getSettingNumber(selectedNode.settings, "capacity_factor", 1)}
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => ({
                          ...node,
                          settings: {
                            ...node.settings,
                            capacity_factor: Number(event.target.value),
                          },
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Redundancy
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      step={1}
                      value={getSettingNumber(selectedNode.settings, "redundancy", 1)}
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => ({
                          ...node,
                          settings: {
                            ...node.settings,
                            redundancy: Number(event.target.value),
                          },
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                    />
                  </div>
                </div>

                {inspectorNodeState ? (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Runtime
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="font-semibold text-slate-950">
                          {formatNumber(inspectorNodeState.requests)} req/s
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Traffic</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="font-semibold text-slate-950">
                          {inspectorNodeState.latency} ms
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Latency</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="font-semibold text-slate-950">{inspectorNodeState.cpu}%</p>
                        <p className="mt-1 text-xs text-slate-500">CPU</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="font-semibold text-slate-950">
                          {inspectorNodeState.errorRate}%
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Error rate</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Simulation focus
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{selectedNode.focus}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftProtocol(defaultProtocol(selectedNode, selectedNode));
                        setDraftPurpose("Primary request flow");
                        setPendingConnectionSourceId(selectedNode.id);
                      }}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Start connection
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeNode(selectedNode.id);
                        setSelection(null);
                      }}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                    >
                      Remove node
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedEdge ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Protocol
                  </label>
                  <select
                    value={selectedEdge.protocol}
                    onChange={(event) =>
                      updateEdge(selectedEdge.id, (edge) => ({
                        ...edge,
                        protocol: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    {PROTOCOL_OPTIONS.map((protocol) => (
                      <option key={protocol} value={protocol}>
                        {protocol}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Purpose
                  </label>
                  <input
                    value={selectedEdge.purpose}
                    onChange={(event) =>
                      updateEdge(selectedEdge.id, (edge) => ({
                        ...edge,
                        purpose: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeEdge(selectedEdge.id);
                    setSelection(null);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                >
                  Remove connection
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4">
                <p className="text-sm leading-6 text-slate-700">
                  Select a node to edit capacity, redundancy, provider, or region. Select a cable to
                  change protocol semantics. The simulator updates live as you edit the topology.
                </p>
              </div>
            )}
          </section>
        </aside>
      )}
    </div>
  );
}
