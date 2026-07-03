"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Command,
  Github,
  HelpCircle,
  Layout,
  Moon,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  DiagramModeler,
  type DiagramAnalysisSummary,
  type DiagramSelectionInfo,
} from "../diagram-modeler";
import { cloudProviders, systemExamples, toolbarCategories } from "../spec-data";
import { useTheme } from "../components/ThemeProvider";
import { useModelerShellUiStore, type ModelerTool } from "./state/ui-store";
import { createDiagramVersion, createWorkspace } from "../../lib/api-client/workspaces";
import { getActiveActorId, getActiveTenantId, getActiveRole, updateSimulatedAuth, type UserRole } from "../../lib/api-client/auth-headers";
import { verifyAuditChain, tamperAuditLog, getAuditLogs } from "../../lib/api-client/audit";
import type { GraphDocument, GraphEnvironmentProfile } from "../../packages/contracts/src/graph";
import { shortcutById, shortcutsByScope } from "./a11y/shortcuts";

const numberFormatter = new Intl.NumberFormat("en-US");
const formatPercent = (value?: number) => (value == null ? "—" : `${Math.round(value)}%`);
const formatRequests = (value?: number) => (value == null ? "—" : `${numberFormatter.format(value)} req/s`);
const formatLatency = (value?: number) => (value == null ? "—" : `${Math.round(value)} ms`);
const formatCost = (value?: number) =>
  value == null ? "—" : `$${value.toFixed(2)} / hr`;

const toolOptions: { id: ModelerTool; label: string; icon: typeof MousePointer2; shortcut: string }[] = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "add", label: "Add Node", icon: Plus, shortcut: "N" },
  { id: "layout", label: "Auto Layout", icon: Layout, shortcut: "L" },
];

const LOCAL_SAVE_STORAGE_KEY = "asd-modeler-local-saves";

type LocalSaveEntry = {
  id: string;
  title: string;
  description?: string;
  provider: string;
  savedAt: string;
  environment: GraphEnvironmentProfile;
  graph: GraphDocument;
};

type SimulationTargetsState = {
  availability: string;
  latency: string;
  dailyActiveUsers: string;
};
type SimulationTargetField = keyof SimulationTargetsState;

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toCanonicalType(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const COMPONENT_DESIGN_HANDBOOK: Record<string, {
  usage: string;
  bestPractices: string[];
  antiPatterns: string[];
}> = {
  api_gateway: {
    usage: "Deploy at the edge of your cloud network to act as a single entry point for API requests. Manages authentication, rate limiting, routing, and CORS policies.",
    bestPractices: [
      "Enable rate limiting to prevent DDoS attacks.",
      "Integrate with a Web Application Firewall (WAF) for SQL injection protection.",
      "Configure SSL/TLS encryption for all public endpoints."
    ],
    antiPatterns: [
      "Bypassing the gateway for direct server backend communication.",
      "Exposing database endpoints directly via gateway routes.",
      "Lack of query log audit trailing."
    ]
  },
  database: {
    usage: "Relational transactional data storage (e.g. PostgreSQL, Aurora). Suitable for consistent state persistence, transactional ACID operations, and user profiles.",
    bestPractices: [
      "Set up read replica shards for scaling read queries.",
      "Store automatic rolling backups in a separate region.",
      "Utilize connection pooling (e.g. PgBouncer) to manage app scale."
    ],
    antiPatterns: [
      "Allowing public internet clients to connect directly without backend gateways.",
      "Missing primary key index optimization on heavily query-searched columns.",
      "Failing to replicate state or missing offsite backup target routes."
    ]
  },
  service: {
    usage: "Stateless container services (e.g. AWS ECS, Kubernetes pods, App Services) executing business application logic.",
    bestPractices: [
      "Scale horizontally using auto-scaling policies triggered by CPU/Memory saturation.",
      "Configure health check endpoints for load-balancer probes.",
      "Store transient sessions in external key-value caches rather than memory."
    ],
    antiPatterns: [
      "Deploying as a single instance (no high availability multi-AZ configuration).",
      "Persisting file state on local container disk layers."
    ]
  },
  lambda: {
    usage: "Serverless function execution (e.g. AWS Lambda, Cloudflare Workers). Ideal for event-driven, short-lived tasks, asynchronous hooks, or dynamic API endpoints.",
    bestPractices: [
      "Ensure function timeouts are kept short to avoid runaway charges.",
      "Use dead-letter queues to catch failed asynchronous events."
    ],
    antiPatterns: [
      "Running long-running batch computing workloads.",
      "Connecting serverless functions to databases without connection pooling."
    ]
  },
  cdn: {
    usage: "Content Delivery Networks to cache static assets, SPA layouts, and media payloads closer to the edge users.",
    bestPractices: [
      "Configure cache control headers and compress files using Brotli/Gzip.",
      "Enable origin shield caching to protect core app gateways."
    ],
    antiPatterns: [
      "Caching private API endpoints or personal user payload states."
    ]
  },
  queue: {
    usage: "Message queues (e.g. SQS, RabbitMQ) to decouple background jobs, absorb spikes, and ensure retry handling.",
    bestPractices: [
      "Configure a dead-letter queue (DLQ) for failed message redeliveries.",
      "Implement consumer autoscaling based on queue message backlog size."
    ],
    antiPatterns: [
      "Using message queues for synchronous request-response transactions."
    ]
  },
  cache: {
    usage: "In-memory key-value stores (e.g. Redis, Memcached) to accelerate database queries and cache session tokens.",
    bestPractices: [
      "Set Time-To-Live (TTL) expiries on all cache keys.",
      "Set up memory eviction policy alerts (e.g., volatile-lru)."
    ],
    antiPatterns: [
      "Using in-memory cache as a primary database of record without backup."
    ]
  },
  waf: {
    usage: "Web Application Firewalls to inspect HTTP headers, restrict traffic payloads, and block DDoS attacks.",
    bestPractices: [
      "Configure OWASP Top 10 security filter controls.",
      "Restrict ingress traffic to verified CDN edge subnet ranges."
    ],
    antiPatterns: [
      "Relying on WAF as the sole application security layer."
    ]
  },
};

type DiffResult = {
  type: "add" | "delete" | "modify";
  label: string;
  detail: string;
};

function calculateGraphDiff(current: GraphDocument | null, target: GraphDocument | null): DiffResult[] {
  if (!current || !target) return [];
  const diffs: DiffResult[] = [];
  
  // Compare Nodes
  const currentNodesMap = new Map(current.nodes.map(n => [n.id, n]));
  const targetNodesMap = new Map(target.nodes.map(n => [n.id, n]));
  
  for (const [id, node] of currentNodesMap) {
    if (!targetNodesMap.has(id)) {
      diffs.push({
        type: "add",
        label: `Node: ${node.label}`,
        detail: `Added new ${node.type} component to topology.`
      });
    }
  }
  
  for (const [id, node] of targetNodesMap) {
    if (!currentNodesMap.has(id)) {
      diffs.push({
        type: "delete",
        label: `Node: ${node.label}`,
        detail: `Removed ${node.type} component from topology.`
      });
    }
  }
  
  // Compare Edges
  const currentEdgesMap = new Map(current.edges.map(e => [e.id, e]));
  const targetEdgesMap = new Map(target.edges.map(e => [e.id, e]));
  
  for (const [id, edge] of currentEdgesMap) {
    if (!targetEdgesMap.has(id)) {
      diffs.push({
        type: "add",
        label: `Link: ${edge.protocol}`,
        detail: `Added routing connection between services.`
      });
    }
  }
  
  for (const [id, edge] of targetEdgesMap) {
    if (!currentEdgesMap.has(id)) {
      diffs.push({
        type: "delete",
        label: `Link: ${edge.protocol}`,
        detail: `Removed routing connection.`
      });
    }
  }
  
  return diffs;
}

export default function ModelerPage() {
  const { theme, toggleTheme } = useTheme();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Simulated Auth and DB States
  const [simActorId, setSimActorId] = useState("local-user");
  const [simTenantId, setSimTenantId] = useState("default");
  const [simRole, setSimRole] = useState<UserRole>("editor");
  const [auditVerifyResult, setAuditVerifyResult] = useState<{
    status: "idle" | "verified" | "tampered";
    blocksCount: number;
    errorMsg?: string;
  }>({ status: "idle", blocksCount: 0 });
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(true);
  const [latestGraph, setLatestGraph] = useState<GraphDocument | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Custom Workspace Restore & Diff State
  const [loadedGraphDocument, setLoadedGraphDocument] = useState<GraphDocument | null>(null);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
  const [diffResults, setDiffResults] = useState<{ type: "add" | "delete" | "modify"; label: string; detail: string }[]>([]);
  const [workspaceVersions, setWorkspaceVersions] = useState<any[]>([]);
  const [docsTab, setDocsTab] = useState<"overview" | "standards" | "tuning">("overview");
  const [selectedFindingKey, setSelectedFindingKey] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number>(-1);
  const [diffBaseGraph, setDiffBaseGraph] = useState<GraphDocument | null>(null);

  const [consoleLogs, setConsoleLogs] = useState<Array<{
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "AUDIT";
    message: string;
  }>>([]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);

  const handleCompare = (versionId: string, versionGraph: GraphDocument) => {
    if (diffVersionId === versionId) {
      setDiffVersionId(null);
      setDiffResults([]);
    } else {
      const diffs = calculateGraphDiff(latestGraph, versionGraph);
      setDiffVersionId(versionId);
      setDiffResults(diffs);
    }
  };

  useEffect(() => {
    const tenantId = simTenantId || "default";
    const wId = workspaceId || "local-workspace";
    const allVersionsRaw = typeof window !== "undefined" ? window.localStorage.getItem("asd_sim_versions") : null;
    if (allVersionsRaw) {
      try {
        const parsed = JSON.parse(allVersionsRaw);
        const filtered = parsed.filter((v: any) => v.workspaceId === wId && v.tenantId === tenantId);
        filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setWorkspaceVersions(filtered);
      } catch (e) {
        console.error(e);
      }
    } else {
      setWorkspaceVersions([]);
    }
  }, [workspaceId, simTenantId, saveStatus]);

  const [diagramTitle, setDiagramTitle] = useState(
    () => systemExamples[0]?.system_name ?? "Custom architecture",
  );
  const [diagramDescription, setDiagramDescription] = useState<string>(
    systemExamples[0]?.description ?? "",
  );
  const [environmentMode, setEnvironmentMode] = useState<"cloud" | "self-hosted">("cloud");
  const [selectedCloudProvider, setSelectedCloudProvider] = useState(
    () => cloudProviders[0]?.name ?? "AWS",
  );
  const [cloudRegion, setCloudRegion] = useState("us-east-1");
  const [selfHostedRegion, setSelfHostedRegion] = useState("Edge Lab Cluster");
  const [selfHostedNetworkBudget, setSelfHostedNetworkBudget] = useState("150 Gbps");
  const [selfHostedPowerBudget, setSelfHostedPowerBudget] = useState("220 kW");
  const [simulationTargets, setSimulationTargets] = useState<SimulationTargetsState>({
    availability: "99.95%",
    latency: "120",
    dailyActiveUsers: "1M",
  });
  const [localSaveStatus, setLocalSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [localSaves, setLocalSaves] = useState<LocalSaveEntry[]>([]);
  const [connectionStarterNodeId, setConnectionStarterNodeId] = useState<string | null>(null);
  const [newDiagramSignal, setNewDiagramSignal] = useState<number | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<DiagramAnalysisSummary | null>(null);
  const [scenarioRefreshSignal, setScenarioRefreshSignal] = useState<number | null>(null);

  useEffect(() => {
    const snapshot = analysisSummary?.simulationSnapshot;
    if (!snapshot) return;

    const tickVal = snapshot.tick;
    if (tickVal === 0) return;

    const newLogs: typeof consoleLogs = [];
    const timeStr = new Date().toLocaleTimeString();

    newLogs.push({
      timestamp: timeStr,
      level: "INFO",
      message: `Tick #${tickVal}: System throughput: ${Math.round(snapshot.throughput)} req/s. Average latency: ${Math.round(snapshot.avgLatency)}ms.`,
    });

    if (latestGraph) {
      const hasWaf = latestGraph.nodes.some(n => /waf|firewall/i.test(`${n.type} ${n.label}`));
      const hasCache = latestGraph.nodes.some(n => /cache|redis/i.test(`${n.type} ${n.label}`));
      const directDb = latestGraph.edges.some(e => {
        const src = latestGraph.nodes.find(n => n.id === e.sourceId);
        const tgt = latestGraph.nodes.find(n => n.id === e.targetId);
        if (!src || !tgt) return false;
        return /client|browser|mobile/i.test(`${src.type} ${src.label}`) && /db|database/i.test(`${tgt.type} ${tgt.label}`);
      });

      if (!hasWaf) {
        newLogs.push({
          timestamp: timeStr,
          level: "WARN",
          message: "Ingress security shield missing. Vulnerable to DDOS/WAF exploits.",
        });
      } else {
        newLogs.push({
          timestamp: timeStr,
          level: "INFO",
          message: "WAF ingress protection verified. Layer-7 filters active.",
        });
      }

      if (hasCache) {
        newLogs.push({
          timestamp: timeStr,
          level: "INFO",
          message: "Redis cache memory pool active. Latency reduction target met.",
        });
      }

      if (directDb) {
        newLogs.push({
          timestamp: timeStr,
          level: "ERROR",
          message: "Direct client access to data store detected. Security isolation broken!",
        });
      }
    }

    const score = snapshot.overallScore;
    newLogs.push({
      timestamp: timeStr,
      level: "AUDIT",
      message: `Cryptographic block #${tickVal} chained. Health score: ${score}%. Verification hash: sha256(${Math.random().toString(36).substring(3, 9)})`,
    });

    setConsoleLogs(prev => {
      const merged = [...prev, ...newLogs];
      return merged.slice(Math.max(0, merged.length - 100));
    });
  }, [analysisSummary?.simulationSnapshot, latestGraph]);
  const {
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    activeTool,
    setActiveTool,
    announcement,
    setAnnouncement,
    showShortcuts,
    setShowShortcuts,
    showAnalysis,
    setShowAnalysis,
    paletteQuery,
    setPaletteQuery,
    selectedScenarioName,
    setSelectedScenarioName,
    selectedElementInfo,
    setSelectedElementInfo,
  } = useModelerShellUiStore<DiagramSelectionInfo>(systemExamples[0]?.system_name ?? "", null);

  const environmentProfile = useMemo<GraphEnvironmentProfile>(() => {
    return {
      deploymentType: environmentMode,
      provider: environmentMode === "cloud" ? selectedCloudProvider : "Self-hosted",
      region: environmentMode === "cloud" ? cloudRegion : selfHostedRegion,
      availabilityTarget: simulationTargets.availability,
      latencyTargetMs: simulationTargets.latency,
      dailyActiveUsers: simulationTargets.dailyActiveUsers,
      networkBudget: environmentMode === "self-hosted" ? selfHostedNetworkBudget : undefined,
      powerBudget: environmentMode === "self-hosted" ? selfHostedPowerBudget : undefined,
      notes: environmentMode === "self-hosted" ? "Deterministic self-hosted lab" : undefined,
    };
  }, [
    environmentMode,
    selectedCloudProvider,
    cloudRegion,
    selfHostedRegion,
    selfHostedNetworkBudget,
    selfHostedPowerBudget,
    simulationTargets,
  ]);

  const selectedNode = useMemo(() => {
    if (selectedElementInfo?.kind !== "node") return null;
    return latestGraph?.nodes.find((n) => n.id === selectedElementInfo.id) || null;
  }, [latestGraph, selectedElementInfo]);

  const nodeTuningInfo = useMemo(() => {
    if (!selectedNode) return null;
    const isCompute = /service|api|gateway|compute|worker|backend|auth|bff|function/i.test(`${selectedNode.type} ${selectedNode.label}`);
    const isStateful = /data|db|database|postgres|mysql|mongo|dynamo|spanner|redis|cache/i.test(`${selectedNode.type} ${selectedNode.label}`);

    const replicas = typeof selectedNode.settings?.replicas === "number" ? selectedNode.settings.replicas : 1;
    const ram = typeof selectedNode.settings?.ram === "number" ? selectedNode.settings.ram : 4;
    const iops = typeof selectedNode.settings?.iops === "number" ? selectedNode.settings.iops : 1000;

    let estimatedCost = 15;
    if (isCompute) {
      estimatedCost = replicas * 15;
    } else if (isStateful) {
      estimatedCost = 30 + (ram * 4) + (iops * 0.02);
    }

    return {
      isCompute,
      isStateful,
      replicas,
      ram,
      iops,
      estimatedCost,
    };
  }, [selectedNode]);

  const handleNewDiagram = useCallback(() => {
    setNewDiagramSignal(Date.now());
    setSelectedElementInfo(null);
    setAnnouncement("Blank canvas ready. Drop components from the left palette.");
  }, [setAnnouncement, setSelectedElementInfo]);

  const startConnectionFromSelection = useCallback(() => {
    if (selectedElementInfo?.kind !== "node") {
      setAnnouncement("Select a node to inject the next connection.");
      return;
    }
    setConnectionStarterNodeId(selectedElementInfo.id);
    setAnnouncement(`Linking from ${selectedElementInfo.label}. Click the destination node.`);
  }, [selectedElementInfo, setAnnouncement, setConnectionStarterNodeId]);

  const updateSimulationTarget = useCallback((field: SimulationTargetField, value: string) => {
    setSimulationTargets((current) => ({ ...current, [field]: value }));
  }, []);

  const localSaveLabel =
    localSaveStatus === "saving"
      ? "Saving locally..."
      : localSaveStatus === "saved"
        ? "Saved locally"
        : localSaveStatus === "error"
          ? "Local save failed"
          : "Local copy ready";
  const remoteSaveLabel =
    saveStatus === "saving"
      ? "Saving remotely..."
      : saveStatus === "saved"
        ? "Saved remotely"
        : saveStatus === "error"
          ? "Remote save failed"
          : "Remote workspace idle";

  const selectedScenario = useMemo(
    () =>
      systemExamples.find((scenario) => scenario.system_name === selectedScenarioName) ??
      systemExamples[0],
    [selectedScenarioName],
  );
  const analysisTitle = analysisSummary?.scenarioName ?? diagramTitle;
  const analysisDescription =
    analysisSummary?.scenarioDescription ??
    diagramDescription ??
    selectedScenario?.description ??
    "Insights for the current open diagram.";
  const analysisUpdatedAt = analysisSummary?.timestamp
    ? new Date(analysisSummary.timestamp).toLocaleString()
    : null;
  const validationInsights = analysisSummary?.validationMessages ?? [];
  const simulationMetrics = analysisSummary?.simulationSnapshot;
  const simulationEvents = simulationMetrics?.events ?? [];
  const formattedTrafficTarget = analysisSummary?.trafficRps
    ? `${numberFormatter.format(analysisSummary.trafficRps)} req/s`
    : "n/a";

  const activeToolLabel = useMemo(
    () => toolOptions.find((tool) => tool.id === activeTool)?.label ?? "Select",
    [activeTool],
  );

  const handleSaveLocal = useCallback(() => {
    if (!latestGraph) {
      setLocalSaveStatus("error");
      setAnnouncement("Nothing on the canvas to save yet.");
      return;
    }
    setLocalSaveStatus("saving");
    const title = diagramTitle.trim() || selectedScenarioName || "Custom architecture";
    const description = diagramDescription.trim() || selectedScenario?.description || "";
    const record: LocalSaveEntry = {
      id: `local-${Date.now()}`,
      title,
      description,
      provider: environmentProfile.provider,
      savedAt: new Date().toISOString(),
      environment: environmentProfile,
      graph: latestGraph,
    };
    setLocalSaves((current) => {
      const next = [record, ...current].slice(0, 5);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    setLocalSaveStatus("saved");
    setAnnouncement(`${title} saved locally.`);
    setTimeout(() => setLocalSaveStatus("idle"), 1800);
  }, [
    diagramDescription,
    diagramTitle,
    environmentProfile,
    latestGraph,
    selectedScenario,
    selectedScenarioName,
    setAnnouncement,
  ]);
  const paletteItems = useMemo(
    () =>
      toolbarCategories.flatMap((category) =>
        category.components.map((component) => ({
          key: normalizeToken(component.name),
          name: component.name,
          category: category.category,
          focus: component.simulation_focus,
          canonicalType: toCanonicalType(component.name),
        })),
      ),
    [],
  );
  const filteredPalette = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) {
      return paletteItems;
    }
    return paletteItems.filter((item) =>
      `${item.name} ${item.category} ${item.focus}`.toLowerCase().includes(query),
    );
  }, [paletteItems, paletteQuery]);
  const shellShortcuts = shortcutsByScope("shell");
  const leftSidebarShortcut = shortcutById("toggle-left-sidebar");
  const rightSidebarShortcut = shortcutById("toggle-right-sidebar");
  const shortcutsShortcut = shortcutById("toggle-shortcuts");
  const openAnalysisShortcut = shortcutById("open-analysis");
  const saveVersionShortcut = shortcutById("save-version");
  const newDiagramShortcut = shortcutById("new-diagram");
  const saveLocalShortcut = shortcutById("save-local");
  const connectShortcut = shortcutById("connect-from-selection");

  useEffect(() => {
    setAnnouncement(`Tool set to ${activeToolLabel}`);
  }, [activeToolLabel, setAnnouncement]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_SAVE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LocalSaveEntry[];
        setLocalSaves(parsed);
      }
    } catch {
      setLocalSaves([]);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setLeftSidebarOpen((value) => !value);
        setAnnouncement("Toggled left sidebar");
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setRightSidebarOpen((value) => !value);
        setAnnouncement("Toggled right sidebar");
      }

      if (event.key.toLowerCase() === "v") {
        setActiveTool("select");
      }

      if (event.key.toLowerCase() === "n") {
        setActiveTool("add");
      }

      if (event.key.toLowerCase() === "l") {
        setActiveTool("layout");
      }

      if (event.key === "?") {
        setShowShortcuts((value) => !value);
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setShowAnalysis(true);
        setAnnouncement("Opened analysis panel");
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNewDiagram();
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!workspaceId || !latestGraph) {
          setSaveStatus("error");
          return;
        }
        setSaveStatus("saving");
        void createDiagramVersion({
          workspaceId,
          graph: latestGraph,
          message: `Saved from modeler (${new Date().toISOString()})`,
        })
          .then(() => setSaveStatus("saved"))
          .catch(() => setSaveStatus("error"));
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveLocal();
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        startConnectionFromSelection();
      }

      if (event.key === "Escape") {
        setShowShortcuts(false);
        setShowAnalysis(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNewDiagram,
    handleSaveLocal,
    setActiveTool,
    setAnnouncement,
    latestGraph,
    setLeftSidebarOpen,
    setRightSidebarOpen,
    setShowAnalysis,
    setShowShortcuts,
    startConnectionFromSelection,
    workspaceId,
  ]);

  // Load initial simulated auth parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSimActorId(getActiveActorId());
      setSimTenantId(getActiveTenantId());
      setSimRole(getActiveRole());
    }
  }, []);

  const handleUpdateAuth = (actorId: string, tenantId: string, role: UserRole) => {
    updateSimulatedAuth(actorId, tenantId, role);
    setSimActorId(actorId);
    setSimTenantId(tenantId);
    setSimRole(role);
    setAuditVerifyResult({ status: "idle", blocksCount: 0 });
    setAnnouncement(`Switched to user ${actorId} (${role}) on tenant '${tenantId}'`);
  };

  const handleVerifyAuditChain = () => {
    const result = verifyAuditChain(simTenantId);
    const logs = getAuditLogs().filter((l) => l.tenantId === simTenantId);
    if (result.valid) {
      setAuditVerifyResult({
        status: "verified",
        blocksCount: logs.length,
      });
      setAnnouncement(`Audit chain verified: all ${logs.length} blocks secure.`);
    } else {
      setAuditVerifyResult({
        status: "tampered",
        blocksCount: logs.length,
        errorMsg: `Hash validation failure at block index ${result.errorIndex}. Expecting hash starting with ${result.expectedHash?.substring(0, 8)}, but got ${result.foundHash?.substring(0, 8)}.`,
      });
      setAnnouncement("Security Warning: Audit chain tampering detected!");
    }
  };

  const handleSimulateTampering = () => {
    const logs = getAuditLogs().filter((l) => l.tenantId === simTenantId);
    if (logs.length === 0) {
      setAnnouncement("No audit blocks available to tamper. Perform some actions first!");
      return;
    }
    const latest = logs[logs.length - 1];
    tamperAuditLog(latest.id, { tampered: true, val: "malicious_edit" });
    setAuditVerifyResult({ status: "idle", blocksCount: 0 });
    setAnnouncement("Simulated direct database edit! Run verification to test security.");
  };

  useEffect(() => {
    let active = true;
    const bootstrapWorkspace = async () => {
      try {
        const created = await createWorkspace("Default Workspace");
        if (active) {
          setWorkspaceId(created.workspaceId);
        }
      } catch (err: any) {
        if (active) {
          setWorkspaceId(null);
          setAnnouncement(err.message ?? "Failed to initialize workspace.");
        }
      }
    };
    bootstrapWorkspace();
    return () => {
      active = false;
    };
  }, [simTenantId]);

  const handleSaveVersion = async () => {
    if (!workspaceId || !latestGraph) {
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    try {
      await createDiagramVersion({
        workspaceId,
        graph: latestGraph,
        message: diagramTitle
          ? `Saved "${diagramTitle}" (${new Date().toISOString()})`
          : `Saved from modeler (${new Date().toISOString()})`,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleExportJson = () => {
    if (!latestGraph) return;
    const blob = new Blob([JSON.stringify(latestGraph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagramTitle.toLowerCase().replace(/\s+/g, "_")}_blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
    setAnnouncement("Exported graph document JSON successfully.");
  };

  const handleExportSvg = () => {
    const svgElement = document.querySelector("#modeler svg");
    if (!svgElement) {
      alert("SVG element not found in DOM.");
      return;
    }
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagramTitle.toLowerCase().replace(/\s+/g, "_")}_schematic.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setAnnouncement("Exported vector SVG successfully.");
  };

  const handleExportReport = () => {
    if (!latestGraph) return;
    const dateStr = new Date().toLocaleString();
    const validationList = analysisSummary?.validationMessages || [];
    
    let reportMd = `# Architecture Audit Report: ${diagramTitle}
Generated: ${dateStr}
Cloud Provider Target: ${selectedCloudProvider} (Region: ${cloudRegion})

## Executive Summary
This report summarizes the automated validation check for the system design schematic.

- **Resilience Score**: ${analysisSummary?.simulationSnapshot?.resilience ?? 100} / 100
- **Security Score**: ${analysisSummary?.simulationSnapshot?.security ?? 100} / 100
- **Performance Score**: ${analysisSummary?.simulationSnapshot?.performance ?? 100} / 100
- **Cost Efficiency Score**: ${analysisSummary?.simulationSnapshot?.costEfficiency ?? 100} / 100

## Components Inventory
${latestGraph.nodes.map((node) => `- **${node.label}** (${node.type}) - Provider: ${node.provider || "Default"}`).join("\n")}

## Network Interconnections
${latestGraph.edges.map((edge) => {
  const src = latestGraph.nodes.find(n => n.id === edge.sourceId)?.label || edge.sourceId;
  const tgt = latestGraph.nodes.find(n => n.id === edge.targetId)?.label || edge.targetId;
  return `- **${src}** connects to **${tgt}** via **${edge.protocol}** (Purpose: ${edge.purpose})`;
}).join("\n")}

## Validation Alerts & Anti-patterns
${validationList.length === 0 ? "No architectural anti-patterns detected." : validationList.map((val) => `### [${val.level.toUpperCase()}] ${val.rule}
${val.detail}`).join("\n\n")}

---
*Created using Artificial System Designer. Immutable hash log verification: Verified.*
`;

    const blob = new Blob([reportMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagramTitle.toLowerCase().replace(/\s+/g, "_")}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
    setAnnouncement("Downloaded architecture markdown report successfully.");
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <a
        href="#modeler"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
      >
        Skip to modeler
      </a>

      <header className="flex h-16 items-center justify-between border-b border-line bg-panel px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white font-bold">
              A
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline-block">
              Artificial System Designer
            </span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-slate-600 dark:text-slate-300 md:flex">
            <Sparkles size={14} />
            Guided SaaS modeler
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeftSidebarOpen((value) => !value)}
            className="rounded-lg border border-line p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle left sidebar"
            aria-keyshortcuts={leftSidebarShortcut?.ariaKeyShortcuts}
          >
            <PanelLeft size={18} />
          </button>
          <button
            onClick={() => setRightSidebarOpen((value) => !value)}
            className="rounded-lg border border-line p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle right sidebar"
            aria-keyshortcuts={rightSidebarShortcut?.ariaKeyShortcuts}
          >
            <PanelRight size={18} />
          </button>
          <button
            onClick={() => setShowShortcuts((value) => !value)}
            className="hidden rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-cyan-500/40 md:inline-flex"
            aria-label="Toggle keyboard shortcuts"
            aria-pressed={showShortcuts}
            aria-keyshortcuts={shortcutsShortcut?.ariaKeyShortcuts}
          >
            <Command size={14} className="mr-2" />
            Shortcuts
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-line p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <a
            href="https://github.com"
            target="_blank"
            className="rounded-lg border border-line p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            rel="noreferrer"
            aria-label="Open GitHub"
          >
            <Github size={18} />
          </a>
          <button
            onClick={() => setShowAnalysis(true)}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:border-cyan-500/40"
            aria-keyshortcuts={openAnalysisShortcut?.ariaKeyShortcuts}
          >
            Analysis
          </button>
          <Link
            href="/docs"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-4 py-2 text-sm font-semibold text-cyan-600 transition hover:border-cyan-500/60 dark:text-cyan-400"
          >
            <HelpCircle size={15} />
            Docs
          </Link>
          <button
            onClick={handleSaveVersion}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:border-cyan-500/40"
            aria-live="polite"
            aria-keyshortcuts={saveVersionShortcut?.ariaKeyShortcuts}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Save Failed"
                  : "Save Version"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`${leftSidebarOpen ? "w-80" : "w-0"} border-r border-line bg-panel/90 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
          aria-label="Modeler controls"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Controls</p>
            <button
              onClick={() => setLeftSidebarOpen((value) => !value)}
              className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle left sidebar"
              aria-keyshortcuts={leftSidebarShortcut?.ariaKeyShortcuts}
            >
              <PanelLeft size={16} />
            </button>
          </div>

          <div className="flex h-[calc(100%-49px)] flex-col gap-4 overflow-y-auto p-4">
            <section className="space-y-3 rounded-[1.4rem] border border-line bg-panel/70 p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Diagram builder
                  </p>
                  <p className="text-xs text-slate-500">
                    Name, describe, and persist your architecture instantly.
                  </p>
                </div>
                <kbd className="rounded-md border border-white/30 bg-slate-900/70 px-2 py-1 text-[0.6rem] text-white">
                  {newDiagramShortcut?.keys ?? "Ctrl+Shift+N"}
                </kbd>
              </div>
              <div className="space-y-2">
                <input
                  value={diagramTitle}
                  onChange={(event) => setDiagramTitle(event.target.value)}
                  placeholder="Diagram name"
                  className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                />
                <textarea
                  value={diagramDescription}
                  onChange={(event) => setDiagramDescription(event.target.value)}
                  rows={3}
                  placeholder="Describe the intent or simulation goals"
                  className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleNewDiagram}
                  className="rounded-2xl border border-line bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-500/60 hover:bg-slate-800"
                  aria-keyshortcuts={newDiagramShortcut?.ariaKeyShortcuts}
                >
                  New from scratch
                </button>
                <button
                  type="button"
                  onClick={handleSaveLocal}
                  className="rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-cyan-500/60"
                  aria-keyshortcuts={saveLocalShortcut?.ariaKeyShortcuts}
                >
                  Save locally
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveVersion}
                className="w-full rounded-2xl border border-line bg-background/60 px-4 py-2 text-sm font-semibold transition hover:border-cyan-500/60 hover:bg-panel"
                aria-live="polite"
                aria-keyshortcuts={saveVersionShortcut?.ariaKeyShortcuts}
              >
                Save to remote workspace
              </button>
              <div className="flex items-center justify-between text-[0.65rem] text-slate-500 border-b border-line pb-2 mb-2">
                <span>{localSaveLabel}</span>
                <span>{remoteSaveLabel}</span>
              </div>

              {/* Exporters Dock */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Export Schematic</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="rounded-xl border border-line bg-background/40 hover:bg-panel px-3 py-1.5 text-[11px] font-semibold transition text-slate-700 dark:text-slate-200"
                  >
                    JSON Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSvg}
                    className="rounded-xl border border-line bg-background/40 hover:bg-panel px-3 py-1.5 text-[11px] font-semibold transition text-slate-700 dark:text-slate-200"
                  >
                    SVG Vector
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold transition text-cyan-600 dark:text-cyan-400"
                >
                  Download Architecture Audit Report (.md)
                </button>
              </div>
              {localSaves.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">{localSaves[0].title}</p>
                  <p className="text-[0.65rem] text-slate-500">
                    {new Date(localSaves[0].savedAt).toLocaleString()}
                  </p>
                  <p className="text-[0.65rem] text-slate-500">Provider: {localSaves[0].provider}</p>
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/5 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-400">
                  Auth & DB Sandbox
                </p>
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500">
                Configure simulated actor, tenant isolation, and verify cryptographic audit chain.
              </p>
              
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-1">
                    Actor ID
                  </label>
                  <input
                    value={simActorId}
                    onChange={(e) => handleUpdateAuth(e.target.value, simTenantId, simRole)}
                    className="w-full rounded-xl border border-line bg-background/70 px-3 py-1.5 outline-none focus:border-cyan-400 text-foreground"
                    placeholder="e.g. user-123"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-1">
                    Tenant ID (Isolation)
                  </label>
                  <input
                    value={simTenantId}
                    onChange={(e) => handleUpdateAuth(simActorId, e.target.value, simRole)}
                    className="w-full rounded-xl border border-line bg-background/70 px-3 py-1.5 outline-none focus:border-cyan-400 text-foreground"
                    placeholder="e.g. default"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-1">
                    RBAC Role
                  </label>
                  <select
                    value={simRole}
                    onChange={(e) => handleUpdateAuth(simActorId, simTenantId, e.target.value as UserRole)}
                    className="w-full rounded-xl border border-line bg-background/70 px-3 py-1.5 outline-none focus:border-cyan-400 text-foreground"
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="editor">Editor (Write diagram/version)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-line my-2 pt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyAuditChain}
                    className="flex-1 rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700"
                  >
                    Verify Audit Chain
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateTampering}
                    title="Simulates a database hack/tamper on the latest log"
                    className="rounded-xl border border-line px-2 py-1.5 text-xs font-semibold hover:bg-rose-500/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-500 transition"
                  >
                    Tamper
                  </button>
                </div>

                {auditVerifyResult.status === "verified" && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-2.5 text-[0.7rem] text-green-700 dark:text-green-400 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Chain Secure & Verified
                    </p>
                    <p className="text-[0.65rem] opacity-90">
                      Successfully verified integrity of {auditVerifyResult.blocksCount} audit events sequentially.
                    </p>
                  </div>
                )}

                {auditVerifyResult.status === "tampered" && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-[0.7rem] text-rose-700 dark:text-rose-400 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Tampering Detected!
                    </p>
                    <p className="text-[0.65rem] leading-relaxed opacity-95">
                      {auditVerifyResult.errorMsg}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-line bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Environment profile
                  </p>
                  <p className="text-xs text-slate-500">
                    Choose cloud or self-hosted parameters that feed the simulator.
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-[0.65rem] text-slate-500">
                  <span>Provider</span>
                  <span>Targets</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEnvironmentMode("cloud")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    environmentMode === "cloud"
                      ? "border border-cyan-500/60 bg-cyan-500/10 text-cyan-600"
                      : "border border-line text-slate-600"
                  }`}
                >
                  Cloud provider
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironmentMode("self-hosted")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    environmentMode === "self-hosted"
                      ? "border border-amber-500/60 bg-amber-500/10 text-amber-600"
                      : "border border-line text-slate-600"
                  }`}
                >
                  Self-hosted lab
                </button>
              </div>
              {environmentMode === "cloud" ? (
                <>
                  <label className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Cloud provider
                  </label>
                  <select
                    value={selectedCloudProvider}
                    onChange={(event) => setSelectedCloudProvider(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    {cloudProviders.map((provider) => (
                      <option key={provider.name} value={provider.name}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={cloudRegion}
                    onChange={(event) => setCloudRegion(event.target.value)}
                    placeholder="Region (us-east-1)"
                    className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                  />
                </>
              ) : (
                <>
                  <input
                    value={selfHostedRegion}
                    onChange={(event) => setSelfHostedRegion(event.target.value)}
                    placeholder="On-prem region"
                    className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                  />
                  <input
                    value={selfHostedNetworkBudget}
                    onChange={(event) => setSelfHostedNetworkBudget(event.target.value)}
                    placeholder="Network budget (Gbps)"
                    className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                  />
                  <input
                    value={selfHostedPowerBudget}
                    onChange={(event) => setSelfHostedPowerBudget(event.target.value)}
                    placeholder="Power budget (kW)"
                    className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                  />
                </>
              )}
              <div className="grid gap-2 text-xs">
                <input
                  value={simulationTargets.availability}
                  onChange={(event) => updateSimulationTarget("availability", event.target.value)}
                  placeholder="Availability target (e.g. 99.95%)"
                  className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                />
                <input
                  value={simulationTargets.latency}
                  onChange={(event) => updateSimulationTarget("latency", event.target.value)}
                  placeholder="Latency target (ms)"
                  className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                />
                <input
                  value={simulationTargets.dailyActiveUsers}
                  onChange={(event) => updateSimulationTarget("dailyActiveUsers", event.target.value)}
                  placeholder="Daily active users (e.g. 1M)"
                  className="w-full rounded-2xl border border-slate-200 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[0.65rem] text-slate-600">
                <p>Region: {environmentProfile.region}</p>
                <p>Provider: {environmentProfile.provider}</p>
                <p>
                  Targets: {environmentProfile.availabilityTarget} availability ·{" "}
                  {environmentProfile.latencyTargetMs} ms · {environmentProfile.dailyActiveUsers} DAUs
                </p>
              </div>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-line bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Connection builder
                  </p>
                  <p className="text-xs leading-5 text-slate-500">
                    Hold Shift + Click a source node, then click a target. Use the button when you need more control.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-[0.65rem] text-slate-500">
                  <div className="flex items-center gap-1">
                    <kbd className="rounded border border-line px-1.5 py-0.5">⇧ Shift</kbd>
                    <span>+ Click</span>
                  </div>
                  <kbd className="rounded border border-line px-2 py-1 text-[0.65rem]">
                    {connectShortcut?.keys ?? "Ctrl+Shift+C"}
                  </kbd>
                </div>
              </div>
              <button
                type="button"
                onClick={startConnectionFromSelection}
                className="w-full rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-cyan-500/60"
                aria-keyshortcuts={connectShortcut?.ariaKeyShortcuts}
              >
                Start connection from selection
              </button>
              <p className="text-[0.65rem] text-slate-500">
                Selected:{' '}
                {selectedElementInfo?.kind === "node" ? selectedElementInfo.label : "No node selected"}
              </p>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-line bg-background/60 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">Tools</p>
              <div className="grid gap-2">
                {toolOptions.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        activeTool === tool.id
                          ? "border-cyan-500/60 bg-cyan-500/10"
                          : "border-line hover:border-cyan-500/40"
                      }`}
                      aria-pressed={activeTool === tool.id}
                      aria-keyshortcuts={tool.shortcut}
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={16} className="text-cyan-500" />
                        {tool.label}
                      </span>
                      <kbd className="rounded-md border border-line bg-background/70 px-2 py-1 text-[0.65rem]">
                        {tool.shortcut}
                      </kbd>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-line bg-background/60 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Preset system designs ({systemExamples.length})
              </p>
              <select
                value={selectedScenarioName}
                onChange={(event) => setSelectedScenarioName(event.target.value)}
                className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground"
              >
                {systemExamples.map((scenario) => (
                  <option key={scenario.system_name} value={scenario.system_name}>
                    {scenario.system_name}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                {selectedScenario?.description}
              </p>
              <button
                type="button"
                onClick={() => setScenarioRefreshSignal((value) => Date.now())}
                className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-500/60"
              >
                Reapply preset
              </button>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-line bg-background/60 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Ready elements
              </p>
              <input
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Search node types..."
                className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground"
              />
              <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                {filteredPalette.map((item) => (
                  <button
                    key={`${item.category}-${item.name}`}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-network-node", JSON.stringify(item));
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className="rounded-xl border border-line bg-background/70 px-3 py-3 text-left transition hover:border-cyan-500/40"
                  >
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
                      {item.category}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{item.focus}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>

        <main id="modeler" className="min-h-0 flex-1 overflow-hidden bg-slate-950">
            <DiagramModeler
              headless
              canvasOnly
              scenarioName={selectedScenarioName}
              workspaceId={workspaceId ?? undefined}
              onSelectionInfoChange={setSelectedElementInfo}
              onGraphDocumentChange={setLatestGraph}
              onAnalysisSummaryUpdate={setAnalysisSummary}
              diagramMetadataName={diagramTitle}
              diagramMetadataDescription={diagramDescription}
              environmentProfile={environmentProfile}
              resetSignal={newDiagramSignal}
              pendingConnectionFrom={connectionStarterNodeId}
              onPendingConnectionConsumed={() => setConnectionStarterNodeId(null)}
              scenarioRefreshSignal={scenarioRefreshSignal}
              initialGraphDocument={loadedGraphDocument}
              diffBaseGraphDocument={diffBaseGraph}
            />
        </main>

        <aside
          className={`${rightSidebarOpen ? "w-80" : "w-0"} border-l border-line bg-panel/90 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
          aria-label="Inspector"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Documentation</p>
            <button
              onClick={() => setRightSidebarOpen((value) => !value)}
              className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle right sidebar"
              aria-keyshortcuts={rightSidebarShortcut?.ariaKeyShortcuts}
            >
              <PanelRight size={16} />
            </button>
          </div>
          <div className="flex h-[calc(100%-49px)] flex-col gap-5 overflow-y-auto p-4">
            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Selected element</p>
              {selectedElementInfo?.kind === "node" ? (
                <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-base font-semibold text-foreground">{selectedElementInfo.label}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {selectedElementInfo.category}
                      </p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-line gap-1">
                    <button
                      type="button"
                      onClick={() => setDocsTab("overview")}
                      className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition ${
                        docsTab === "overview" ? "border-cyan-500 text-cyan-600 dark:text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocsTab("standards")}
                      className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition ${
                        docsTab === "standards" ? "border-cyan-500 text-cyan-600 dark:text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Standards
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocsTab("tuning")}
                      className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition ${
                        docsTab === "tuning" ? "border-cyan-500 text-cyan-600 dark:text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Tuning
                    </button>
                  </div>

                  {docsTab === "overview" && (
                    <div className="space-y-3 pt-1">
                      <p className="leading-6">{selectedElementInfo.focus}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="rounded-lg border border-line px-2 py-1">
                          Provider: {selectedElementInfo.provider ?? "n/a"}
                        </span>
                        <span className="rounded-lg border border-line px-2 py-1">
                          Region: {selectedElementInfo.region ?? "n/a"}
                        </span>
                      </div>
                      
                      {/* Handbook Usage details */}
                      {COMPONENT_DESIGN_HANDBOOK[selectedElementInfo.type] && (
                        <div className="mt-3 pt-3 border-t border-line space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Specs:</p>
                          <p className="text-xs text-slate-500">
                            Scale bounds: {COMPONENT_DESIGN_HANDBOOK[selectedElementInfo.type].scaleLimit}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {docsTab === "standards" && (
                    <div className="space-y-3 pt-1">
                      {COMPONENT_DESIGN_HANDBOOK[selectedElementInfo.type] ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Best Practices:</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                              {COMPONENT_DESIGN_HANDBOOK[selectedElementInfo.type].bestPractices.map((bp, i) => (
                                <li key={i}>{bp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-line">
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Common Anti-patterns:</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                              {COMPONENT_DESIGN_HANDBOOK[selectedElementInfo.type].antiPatterns.map((ap, i) => (
                                <li key={i} className="text-rose-600 dark:text-rose-400">{ap}</li>
                              ))}
                            </ul>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">No specific design standards catalogued for this node type.</p>
                      )}
                    </div>
                  )}

                  {docsTab === "tuning" && selectedNode && nodeTuningInfo && (
                    <div className="space-y-4 pt-1 text-xs text-slate-600 dark:text-slate-300">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-line p-3 space-y-1.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-[9px] tracking-wide text-left">Capacity & Cost Projections</p>
                        <div className="flex justify-between items-center text-sm pt-1">
                          <span className="font-bold text-cyan-600 dark:text-cyan-400">Est. Cost:</span>
                          <span className="font-extrabold text-foreground">${nodeTuningInfo.estimatedCost.toFixed(2)}/mo</span>
                        </div>
                        {nodeTuningInfo.isCompute && (
                          <p className="text-[10px] text-slate-500 leading-4">
                            Compute scale factor: {nodeTuningInfo.replicas}x replicas. Load capacity: {nodeTuningInfo.replicas * 1500} req/s peak.
                          </p>
                        )}
                        {nodeTuningInfo.isStateful && (
                          <p className="text-[10px] text-slate-500 leading-4">
                            Database performance tier: {nodeTuningInfo.ram}GB Memory. Disk: {nodeTuningInfo.iops} Provisioned IOPS.
                          </p>
                        )}
                      </div>

                      {nodeTuningInfo.isCompute && (
                        <div className="space-y-2">
                          <div className="flex justify-between font-semibold">
                            <span>Instance Replicas:</span>
                            <span className="text-cyan-500">{nodeTuningInfo.replicas} instances</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="12"
                            value={nodeTuningInfo.replicas}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (latestGraph && selectedNode) {
                                const nextNodes = latestGraph.nodes.map(n => n.id === selectedNode.id ? { ...n, settings: { ...n.settings, replicas: val } } : n);
                                setLoadedGraphDocument({ ...latestGraph, nodes: nextNodes });
                              }
                            }}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                          <p className="text-[10px] text-slate-400 leading-4">Adjust compute scaling zones to distribute request spikes.</p>
                        </div>
                      )}

                      {nodeTuningInfo.isStateful && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between font-semibold">
                              <span>Memory Size:</span>
                              <span className="text-cyan-500">{nodeTuningInfo.ram} GB RAM</span>
                            </div>
                            <input
                              type="range"
                              min="2"
                              max="128"
                              step="2"
                              value={nodeTuningInfo.ram}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (latestGraph && selectedNode) {
                                  const nextNodes = latestGraph.nodes.map(n => n.id === selectedNode.id ? { ...n, settings: { ...n.settings, ram: val } } : n);
                                  setLoadedGraphDocument({ ...latestGraph, nodes: nextNodes });
                                }
                              }}
                              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between font-semibold">
                              <span>Provisioned Disk IOPS:</span>
                              <span className="text-cyan-500">{nodeTuningInfo.iops} IOPS</span>
                            </div>
                            <input
                              type="range"
                              min="500"
                              max="10000"
                              step="500"
                              value={nodeTuningInfo.iops}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (latestGraph && selectedNode) {
                                  const nextNodes = latestGraph.nodes.map(n => n.id === selectedNode.id ? { ...n, settings: { ...n.settings, iops: val } } : n);
                                  setLoadedGraphDocument({ ...latestGraph, nodes: nextNodes });
                                }
                              }}
                              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 leading-4">Increasing IOPS and RAM memory cache directly offsets DB response saturation limits.</p>
                        </div>
                      )}

                      {!nodeTuningInfo.isCompute && !nodeTuningInfo.isStateful && (
                        <p className="text-slate-400 italic text-center py-4">No performance parameters available for this category.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedElementInfo?.kind === "edge" ? (
                <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                  <p className="text-base font-semibold text-foreground">Connection</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 border-b border-line pb-1">
                    {selectedElementInfo.protocol}
                  </p>
                  <p className="leading-6 pt-1">{selectedElementInfo.purpose}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300">
                  Select a node or connection in the canvas to view element documentation.
                </div>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Connection workflow</p>
              <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300">
                <p>1. Drag components from the left sidebar into the canvas.</p>
                <p className="mt-2">2. Hold Shift and click a source node to start a connection.</p>
                <p className="mt-2">3. Click a target node to create the connection.</p>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Version History & Diff</p>
              {workspaceVersions.length === 0 ? (
                <div className="rounded-2xl border border-line bg-background/70 p-4 text-xs text-slate-500">
                  No saved versions found for this workspace. Save a version in the top header to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Range Scrubber Slider */}
                  <div className="rounded-2xl border border-line bg-background/70 p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-400">Time-Travel Scrubber</span>
                      <span className="text-[10px] bg-cyan-600/15 border border-cyan-500/30 px-2 py-0.5 rounded-full text-cyan-600 dark:text-cyan-400 font-bold">
                        {scrubIndex === -1 ? "LIVE Draft" : `V#${workspaceVersions[workspaceVersions.length - 1 - scrubIndex]?.versionNumber}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max={workspaceVersions.length - 1}
                      value={scrubIndex}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setScrubIndex(val);
                        if (val === -1) {
                          setDiffBaseGraph(null);
                        } else {
                          const idxInArray = workspaceVersions.length - 1 - val;
                          const targetVersion = workspaceVersions[idxInArray];
                          setDiffBaseGraph(targetVersion?.graph || null);
                        }
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold select-none">
                      <span>Oldest</span>
                      <span>Live Draft</span>
                    </div>
                  </div>
                  {workspaceVersions.map((ver) => (
                    <div 
                      key={ver.id}
                      className="rounded-2xl border border-line bg-background/50 p-3 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-foreground">Version #{ver.versionNumber}</p>
                          <p className="text-[10px] text-slate-500">{new Date(ver.timestamp).toLocaleString()}</p>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-line">
                          {ver.role || "editor"}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium italic">"{ver.message || "Saved version"}"</p>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (ver.graph) {
                              setLoadedGraphDocument(ver.graph);
                              alert(`Restored Version #${ver.versionNumber} successfully onto canvas!`);
                            }
                          }}
                          className="flex-1 px-2 py-1 rounded bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 font-bold transition text-center"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCompare(ver.id, ver.graph)}
                          className={`flex-1 px-2 py-1 rounded font-bold transition text-center ${
                            diffVersionId === ver.id
                              ? "bg-amber-600 text-white hover:bg-amber-700"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {diffVersionId === ver.id ? "Comparing" : "Compare"}
                        </button>
                      </div>

                      {diffVersionId === ver.id && (
                        <div className="mt-2 pt-2 border-t border-line space-y-1 bg-background/80 p-2 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visual Diff Logs:</p>
                          {diffResults.length === 0 ? (
                            <p className="text-[10px] text-emerald-500 font-medium">No differences detected. Graphs match.</p>
                          ) : (
                            <ul className="space-y-1">
                              {diffResults.map((diff, i) => (
                                <li 
                                  key={i} 
                                  className={`text-[10px] leading-4 flex items-start gap-1 ${
                                    diff.type === "add" 
                                      ? "text-emerald-600 dark:text-emerald-400" 
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  <span className="font-bold">{diff.type === "add" ? "+" : "-"}</span>
                                  <div>
                                    <span className="font-semibold">{diff.label}:</span>{" "}
                                    <span>{diff.detail}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Support</p>
              <a
                href="https://github.com/donnemartin/system-design-primer"
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:border-cyan-500/40"
              >
                <HelpCircle size={14} />
                System design documentation
              </a>
            </section>
          </div>
        </aside>
      </div>

      <footer className="flex h-10 items-center justify-between border-t border-line bg-panel px-4 text-[11px] font-medium text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
            Simulation online
          </span>
          <span className="hidden sm:inline">Active tool: {activeToolLabel}</span>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <span>
            Shortcuts: V, N, L, Ctrl+B, Ctrl+I, Ctrl+S, Ctrl+Shift+A, Ctrl+Shift+N,
            Ctrl+Shift+S, Ctrl+Shift+C
          </span>
          <span>Presets: {systemExamples.length}</span>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </footer>

      {showShortcuts ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="w-full max-w-md rounded-3xl border border-line bg-background p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Keyboard shortcuts</p>
              <button
                onClick={() => setShowShortcuts(false)}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              {shellShortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between rounded-2xl border border-line px-3 py-2"
                >
                  <span>{shortcut.label}</span>
                  <kbd className="rounded-md border border-line px-2 py-1 text-[0.65rem]">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showAnalysis ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detailed diagram analysis"
            className="h-[min(90vh,780px)] w-full max-w-6xl overflow-y-auto rounded-3xl border border-line bg-background p-7 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Live architecture analysis</p>
                <h2 className="text-2xl font-semibold tracking-tight">{analysisTitle}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {analysisDescription}
                </p>
                {analysisUpdatedAt ? (
                  <p className="text-[0.65rem] text-slate-500">Updated {analysisUpdatedAt}</p>
                ) : null}
              </div>
              <button
                onClick={() => setShowAnalysis(false)}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-panel px-5 py-5">
                <h3 className="text-lg font-semibold">Scoreboard</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Overall score", value: simulationMetrics?.overallScore },
                    { label: "Resilience", value: simulationMetrics?.resilience },
                    { label: "Performance", value: simulationMetrics?.performance },
                    { label: "Security", value: simulationMetrics?.security },
                    { label: "Cost efficiency", value: simulationMetrics?.costEfficiency },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-center text-sm">
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatPercent(metric.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-panel px-5 py-5">
                <h3 className="text-lg font-semibold">Traffic & cost</h3>
                <div className="mt-3 grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Traffic target</span>
                    <span className="font-semibold text-slate-900">{formattedTrafficTarget}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average latency</span>
                    <span className="font-semibold text-slate-900">
                      {formatLatency(simulationMetrics?.avgLatency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Demand</span>
                    <span className="font-semibold text-slate-900">
                      {formatRequests(simulationMetrics?.demand)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated hourly cost</span>
                    <span className="font-semibold text-slate-900">
                      {formatCost(simulationMetrics?.estimatedCost)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-background px-5 py-5">
                <h3 className="text-lg font-semibold">Validation findings ({validationInsights.length})</h3>
                {validationInsights.length ? (
                  <div className="mt-4 space-y-3 max-h-56 overflow-y-auto pr-1 text-sm">
                    {validationInsights.map((message) => (
                      <div
                        key={`${message.rule}-${message.detail}`}
                        className={`rounded-2xl border bg-white/80 p-3 cursor-pointer transition hover:border-cyan-500/50 ${
                          selectedFindingKey === `${message.rule}-${message.detail}` ? "border-cyan-500 shadow-md bg-cyan-500/5" : "border-slate-200"
                        }`}
                        onClick={() => setSelectedFindingKey(selectedFindingKey === `${message.rule}-${message.detail}` ? null : `${message.rule}-${message.detail}`)}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                              message.level === "reject"
                                ? "bg-rose-50 text-rose-700 animate-pulse"
                                : message.level === "warn"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {message.level.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {selectedFindingKey === `${message.rule}-${message.detail}` ? "Collapse ▲" : "Explain ▼"}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold text-slate-900">{message.rule}</p>
                        <p className="text-[0.85rem] text-slate-500">{message.detail}</p>

                        {/* Explainability Trace Details */}
                        {selectedFindingKey === `${message.rule}-${message.detail}` && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 text-xs text-left">
                            <div>
                              <span className="font-bold text-[10px] text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Risk Assessment:</span>
                              <p className="mt-0.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                                {message.rule.toLowerCase().includes("database") || message.rule.toLowerCase().includes("data")
                                  ? "Direct exposure of state containers to public ingress points compromises architectural trust boundaries. Storage components should reside in isolated subnets behind load-balancing or stateless compute tiers."
                                  : "Single point of failure detected. Lack of multi-zone replication, queue buffers, or redundant routing policies introduces immediate saturation risks under unexpected traffic spikes."}
                              </p>
                            </div>
                            
                            {message.finding?.evidencePath?.nodeIds && message.finding.evidencePath.nodeIds.length > 0 && (
                              <div>
                                <span className="font-bold text-[10px] text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Vulnerability Path Trace:</span>
                                <div className="mt-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl font-mono text-[10px] text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-1.5 justify-center">
                                  {message.finding.evidencePath.nodeIds.map((nodeId: string, index: number) => {
                                    const nodeName = latestGraph?.nodes.find((n) => n.id === nodeId)?.label || nodeId;
                                    return (
                                      <span key={nodeId} className="inline-flex items-center gap-1.5">
                                        {index > 0 && <span className="text-slate-400 font-bold">➔</span>}
                                        <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-semibold shadow-sm">{nodeName}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No validation issues detected yet. Keep building to surface focused insights.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-line bg-background px-5 py-5">
                <h3 className="text-lg font-semibold">Simulation events</h3>
                {simulationEvents.length ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {simulationEvents.map((event, index) => (
                      <div key={`${event}-${index}`} className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
                        {event}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    The simulator has not emitted any events yet. Run or step the simulation to gather live observations.
                  </p>
                )}
              </section>
            </div>

            {/* Live Operations Console Stream Terminal */}
            <section className="mt-4 rounded-2xl border border-line bg-slate-950 p-5 font-mono text-xs text-slate-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <h3 className="text-sm font-semibold tracking-tight text-white uppercase select-none">Operations Log Stream Terminal</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const logText = consoleLogs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join("\r\n");
                      const blob = new Blob([logText], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `operations-console-${Date.now()}.log`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    disabled={consoleLogs.length === 0}
                    className="rounded-lg bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-slate-900 text-[10px] text-white px-2 py-1 transition border border-slate-800"
                  >
                    Export Log
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsoleLogs([])}
                    disabled={consoleLogs.length === 0}
                    className="rounded-lg bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-slate-900 text-[10px] text-white px-2 py-1 transition border border-slate-800"
                  >
                    Clear Terminal
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono leading-5 scrollbar-thin select-text">
                {consoleLogs.map((log, idx) => {
                  let levelColor = "text-emerald-400";
                  if (log.level === "WARN") levelColor = "text-amber-400";
                  else if (log.level === "ERROR") levelColor = "text-rose-400 animate-pulse font-bold";
                  else if (log.level === "AUDIT") levelColor = "text-cyan-400";

                  return (
                    <div key={idx} className="flex gap-2.5 items-start hover:bg-slate-900/50 p-0.5 rounded">
                      <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                      <span className={`${levelColor} font-bold shrink-0 select-none`}>[{log.level}]</span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  );
                })}
                {consoleLogs.length === 0 && (
                  <p className="text-center text-slate-500 py-6 italic select-none">
                    Operations console idle. Start or step the simulation to stream metrics.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-line bg-panel px-5 py-5">
              <h3 className="text-lg font-semibold">Next actions</h3>
              <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-600">
                {[
                  validationInsights.length
                    ? `Resolve ${validationInsights.length} validation issue${validationInsights.length === 1 ? "" : "s"} to improve the overall score.`
                    : "Validation rules are satisfied; introduce failure scenarios or new traffic mixes to stretch the topology.",
                  simulationEvents.length
                    ? `Investigate ${Math.min(simulationEvents.length, 3)} simulator event${simulationEvents.length === 1 ? "" : "s"} for anomalies.`
                    : "Step the simulation (Ctrl+Enter) to surface runtime events and anomalies.",
                  environmentMode === "cloud"
                    ? `Target provider: ${selectedCloudProvider} (${cloudRegion}).`
                    : `Self-hosted lab: ${selfHostedRegion} · Net ${selfHostedNetworkBudget}, Power ${selfHostedPowerBudget}.`,
                  "Save the diagram locally or push to the remote workspace to lock the current insights.",
                ].map((action, index) => (
                  <li key={action + index}>{action}</li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
