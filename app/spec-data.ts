export type ArchitectureSection = {
  id: string;
  title: string;
  mission: string;
  responsibilities: string[];
  primaryModules: string[];
  scalingNotes: string[];
};

export type Tooltip = {
  what_happens: string;
  why_it_exists: string;
  when_to_use: string;
  common_pitfalls: string[];
};

export type ComponentSpec = {
  id: string;
  type: string;
  label: string;
  provider?: string;
  region?: string;
  parent?: string;
};

export type ComponentConfiguration = {
  component_id: string;
  settings: Record<string, string | number | boolean>;
};

export type ConnectionSpec = {
  from: string;
  to: string;
  protocol: string;
  purpose: string;
};

export type ArchitectureStep = {
  step_id: string;
  title: string;
  tooltip: Tooltip;
  learn_more_link: string;
  component_added: ComponentSpec[];
  component_configured: ComponentConfiguration[];
  connections_created: ConnectionSpec[];
  operations: string[];
  rollback_operations: string[];
};

export type Scenario = {
  schema_version: string;
  system_name: string;
  description: string;
  difficulty: "intermediate" | "advanced" | "expert";
  design_patterns: string[];
  description_mode: "teaching-estimate";
  scale: Record<string, string>;
  traffic_estimation: Record<string, string>;
  architecture_steps: ArchitectureStep[];
};

export type ToolbarComponent = {
  name: string;
  simulation_focus: string;
};

export type ToolbarCategory = {
  category: string;
  components: ToolbarComponent[];
};

export type OperationGroup = {
  domain: string;
  operations: string[];
};

export type LearnMoreArticle = {
  id: string;
  title: string;
  primer_topic: string;
  url: string;
  angle: string;
};

export type CloudProvider = {
  name: string;
  positioning: string;
  services: string[];
};

const primerBase =
  "https://github.com/donnemartin/system-design-primer/blob/master/README.md";

export const primerLinks = {
  systemDesignInterview:
    `${primerBase}#how-to-approach-a-system-design-interview-question`,
  performanceVsScalability: `${primerBase}#performance-vs-scalability`,
  latencyVsThroughput: `${primerBase}#latency-vs-throughput`,
  capTheorem: `${primerBase}#cap-theorem`,
  weakConsistency: `${primerBase}#weak-consistency`,
  eventualConsistency: `${primerBase}#eventual-consistency`,
  strongConsistency: `${primerBase}#strong-consistency`,
  failOver: `${primerBase}#fail-over`,
  replication: `${primerBase}#replication`,
  dns: `${primerBase}#domain-name-system`,
  cdn: `${primerBase}#content-delivery-network`,
  loadBalancer: `${primerBase}#load-balancer`,
  reverseProxy: `${primerBase}#reverse-proxy-web-server`,
  applicationLayer: `${primerBase}#application-layer`,
  microservices: `${primerBase}#microservices`,
  serviceDiscovery: `${primerBase}#service-discovery`,
  rdbms: `${primerBase}#relational-database-management-system-rdbms`,
  sharding: `${primerBase}#sharding`,
  sqlOrNoSql: `${primerBase}#sql-or-nosql`,
  cache: `${primerBase}#cache`,
  messageQueues: `${primerBase}#message-queues`,
  taskQueues: `${primerBase}#task-queues`,
  backPressure: `${primerBase}#back-pressure`,
  tcp: `${primerBase}#transmission-control-protocol-tcp`,
  udp: `${primerBase}#user-datagram-protocol-udp`,
  rpc: `${primerBase}#remote-procedure-call-rpc`,
  rest: `${primerBase}#representational-state-transfer-rest`,
  security: `${primerBase}#security`,
  latencyNumbers: `${primerBase}#latency-numbers-every-programmer-should-know`,
  appendix: `${primerBase}#appendix`,
};

export const tooltip = (
  what_happens: string,
  why_it_exists: string,
  when_to_use: string,
  common_pitfalls: string[],
): Tooltip => ({
  what_happens,
  why_it_exists,
  when_to_use,
  common_pitfalls,
});

export const component = (
  id: string,
  type: string,
  label: string,
  options: Partial<ComponentSpec> = {},
): ComponentSpec => ({
  id,
  type,
  label,
  ...options,
});

export const config = (
  component_id: string,
  settings: Record<string, string | number | boolean>,
): ComponentConfiguration => ({
  component_id,
  settings,
});

export const wire = (
  from: string,
  to: string,
  protocol: string,
  purpose: string,
): ConnectionSpec => ({
  from,
  to,
  protocol,
  purpose,
});

export const step = (input: ArchitectureStep): ArchitectureStep => input;

export const platformArchitecture: ArchitectureSection[] = [
  {
    id: "frontend",
    title: "Frontend",
    mission:
      "Deliver a Figma-like architecture lab where learners assemble systems, inspect state, run guided scenarios, and visualize behavior without leaving the canvas.",
    responsibilities: [
      "Infinite canvas with drag, connect, group, and zoom interactions",
      "Scenario player with Next, Back, Learn More, and supervised validation prompts",
      "Inspector panels for component config, cost, latency, security posture, and failure state",
      "Real-time overlays for traffic, traces, alerts, bottlenecks, and budget burn",
      "Interview mode, challenge mode, and architecture diff visualization",
    ],
    primaryModules: [
      "Canvas renderer",
      "Toolbar and search palette",
      "Topology inspector",
      "Scenario stepper",
      "Metrics and trace HUD",
      "AI architect copilot panel",
    ],
    scalingNotes: [
      "Use viewport-level virtualization for large graphs over 5,000 visible nodes",
      "Separate visual state from authoritative simulation state to keep interactions under 16 ms",
      "Cache rendered edge paths and only recompute dirty regions during drag or replay",
    ],
  },
  {
    id: "backend",
    title: "Backend",
    mission:
      "Serve authoritative scenario content, persist architecture versions, coordinate collaborative sessions, and expose policy engines used by the lab.",
    responsibilities: [
      "Scenario registry and curriculum management",
      "Workspace persistence, snapshots, branching, and replay history",
      "Collaboration sessions, comments, approvals, and instructor oversight",
      "Rule evaluation APIs for validation, scoring, and architecture suggestions",
      "Provider catalogs, cost models, component metadata, and article indexes",
    ],
    primaryModules: [
      "Scenario service",
      "Workspace service",
      "Validation service",
      "Cost and provider catalog service",
      "Learning-content service",
      "Auth and RBAC service",
    ],
    scalingNotes: [
      "Event-source user actions so scenarios can be replayed, diffed, and graded deterministically",
      "Store large canvas snapshots in object storage and index metadata in a relational store",
      "Keep article metadata cacheable at the edge because it changes rarely",
    ],
  },
  {
    id: "simulation-engine",
    title: "Simulation Engine",
    mission:
      "Turn architecture edits into validated system behavior by running a deterministic infrastructure, traffic, cost, security, and failure model.",
    responsibilities: [
      "Resolve topology dependencies and component lifecycle transitions",
      "Simulate request routing, queue backlogs, replication lag, cache hit ratios, and failover",
      "Inject failures such as region outages, packet loss, DNS faults, and queue lag",
      "Estimate cost, carbon footprint, and scaling side effects over time",
      "Surface suggested architectural improvements based on modeled bottlenecks",
    ],
    primaryModules: [
      "Discrete-event scheduler",
      "Traffic engine",
      "Failure and chaos engine",
      "Cost engine",
      "Security attack simulator",
      "Recommendation engine",
    ],
    scalingNotes: [
      "Model simulation ticks as immutable events so rollback and time travel stay exact",
      "Use worker pools for expensive graph analysis and Monte Carlo traffic experiments",
      "Persist simulation checkpoints so long-running labs can resume from stable milestones",
    ],
  },
  {
    id: "state-engine",
    title: "State Engine",
    mission:
      "Maintain the architecture graph, user action log, derived learning state, and deterministic undo or rollback semantics across all labs.",
    responsibilities: [
      "Track nodes, edges, containment hierarchies, and provider-specific component variants",
      "Store scenario progress, validation outcomes, score, and unlocked hints",
      "Support undo, redo, branch, merge, replay, diff, and supervised rollback",
      "Keep learning context aligned with topology state and failure timeline",
      "Coordinate optimistic UI edits with authoritative backend reconciliation",
    ],
    primaryModules: [
      "Topology graph store",
      "Command bus",
      "Projection engine",
      "Versioning subsystem",
      "Validation outcome cache",
    ],
    scalingNotes: [
      "Use normalized graph entities with derived selectors instead of duplicating component trees",
      "Maintain branchable timelines so interview mode can compare candidate approaches",
      "Emit stable event IDs for collaboration and instructor playback",
    ],
  },
  {
    id: "visualization-engine",
    title: "Visualization Engine",
    mission:
      "Render complex architecture graphs, time-series metrics, packet animations, query plans, and cost overlays in a way that stays educational under scale.",
    responsibilities: [
      "Route animated cables with protocol-aware styling",
      "Display topology containment such as regions, zones, clusters, shards, and pods",
      "Overlay metrics heatmaps, traces, queue depth, and incident blast radius",
      "Render SQL plans, shard distribution, and replication health panels",
      "Support export to diagrams, slide decks, walkthroughs, and assessment reports",
    ],
    primaryModules: [
      "Node renderer",
      "Edge renderer",
      "Layout and routing engine",
      "Charts and telemetry layer",
      "Diagram export subsystem",
    ],
    scalingNotes: [
      "Combine SVG for labels with canvas or WebGL for high-volume edges and particle pulses",
      "Precompute lane routing for repeated replay sessions to stabilize visual teaching cues",
      "Use progressive disclosure so advanced metrics appear only when learners need them",
    ],
  },
];

export const jsonSchemaDefinition = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "InteractiveSystemDesignScenario",
  type: "object",
  required: [
    "schema_version",
    "system_name",
    "description",
    "difficulty",
    "design_patterns",
    "scale",
    "traffic_estimation",
    "architecture_steps",
  ],
  properties: {
    schema_version: { type: "string", examples: ["1.0.0"] },
    system_name: { type: "string" },
    description: { type: "string" },
    difficulty: {
      type: "string",
      enum: ["intermediate", "advanced", "expert"],
    },
    description_mode: {
      type: "string",
      enum: ["teaching-estimate"],
    },
    design_patterns: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
        enum: [
          "MVC",
          "Clean Architecture",
          "Hexagonal",
          "Event Driven",
          "CQRS",
          "Saga",
          "Observer",
          "Factory",
          "Strategy",
          "Repository",
          "Unit of Work",
        ],
      },
    },
    scale: {
      type: "object",
      additionalProperties: { type: "string" },
      required: [
        "simulated_daily_active_users",
        "peak_requests_per_second",
        "regions",
        "availability_target",
      ],
    },
    traffic_estimation: {
      type: "object",
      additionalProperties: { type: "string" },
      required: [
        "read_write_ratio",
        "peak_event_rate",
        "hot_path",
        "bandwidth_profile",
      ],
    },
    architecture_steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [
          "step_id",
          "title",
          "tooltip",
          "learn_more_link",
          "component_added",
          "component_configured",
          "connections_created",
          "operations",
          "rollback_operations",
        ],
        properties: {
          step_id: { type: "string" },
          title: { type: "string" },
          tooltip: {
            type: "object",
            required: [
              "what_happens",
              "why_it_exists",
              "when_to_use",
              "common_pitfalls",
            ],
            properties: {
              what_happens: { type: "string" },
              why_it_exists: { type: "string" },
              when_to_use: { type: "string" },
              common_pitfalls: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          learn_more_link: {
            type: "string",
            format: "uri",
          },
          component_added: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "type", "label"],
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                label: { type: "string" },
                provider: { type: "string" },
                region: { type: "string" },
                parent: { type: "string" },
              },
            },
          },
          component_configured: {
            type: "array",
            items: {
              type: "object",
              required: ["component_id", "settings"],
              properties: {
                component_id: { type: "string" },
                settings: {
                  type: "object",
                  additionalProperties: {
                    type: ["string", "number", "boolean"],
                  },
                },
              },
            },
          },
          connections_created: {
            type: "array",
            items: {
              type: "object",
              required: ["from", "to", "protocol", "purpose"],
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                protocol: { type: "string" },
                purpose: { type: "string" },
              },
            },
          },
          operations: {
            type: "array",
            items: { type: "string" },
          },
          rollback_operations: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};

export const cloudProviders: CloudProvider[] = [
  {
    name: "AWS",
    positioning: "Primary reference provider for compute, managed databases, and edge-heavy labs.",
    services: ["EC2", "EKS", "Lambda", "RDS", "DynamoDB", "S3", "ElastiCache", "API Gateway", "CloudFront", "Route 53"],
  },
  {
    name: "Google Cloud",
    positioning: "Strong fit for analytics, global routing, data processing, and Kubernetes-focused scenarios.",
    services: ["Compute Engine", "GKE", "Cloud Run", "Cloud SQL", "Spanner", "Bigtable", "Cloud Storage", "Pub/Sub", "Cloud CDN", "Cloud DNS"],
  },
  {
    name: "Azure",
    positioning: "Enterprise-oriented provider for hybrid networking, identity, and managed platform services.",
    services: ["Virtual Machines", "AKS", "Functions", "Azure SQL", "Cosmos DB", "Blob Storage", "Redis Cache", "Event Hubs", "Front Door", "Azure DNS"],
  },
  {
    name: "Cloudflare",
    positioning: "Edge-first provider for DNS, CDN, security, worker compute, and traffic shaping.",
    services: ["DNS", "CDN", "Workers", "Load Balancing", "WAF", "D1", "R2", "Queues", "Turnstile", "Argo"],
  },
  {
    name: "DigitalOcean",
    positioning: "Simpler provider profile for smaller labs, startup architectures, and cost-comparison exercises.",
    services: ["Droplets", "Kubernetes", "Functions", "Managed Databases", "Spaces", "Load Balancers", "VPC", "Container Registry", "App Platform", "Cloud Firewalls"],
  },
];

export const supportedDesignPatterns = [
  "MVC",
  "Clean Architecture",
  "Hexagonal",
  "Event Driven",
  "CQRS",
  "Saga",
  "Observer",
  "Factory",
  "Strategy",
  "Repository",
  "Unit of Work",
];

export const toolbarCategories: ToolbarCategory[] = [
  {
    category: "Compute",
    components: [
      { name: "VM", simulation_focus: "Baseline compute node with CPU and memory sizing" },
      { name: "Bare Metal", simulation_focus: "High-throughput dedicated host with fixed capacity" },
      { name: "Autoscaling Group", simulation_focus: "Elastic fleet with target-tracking policies" },
      { name: "Kubernetes Cluster", simulation_focus: "Container orchestration, scheduling, and rolling deploys" },
      { name: "Docker Container", simulation_focus: "Single-service runtime unit inside a node" },
      { name: "Serverless Function", simulation_focus: "Burst scaling with cold-start trade-offs" },
      { name: "GPU Worker", simulation_focus: "Acceleration for ML inference or training" },
      { name: "Batch Worker", simulation_focus: "Background processing for queues and pipelines" },
      { name: "Job Scheduler", simulation_focus: "Cron and workflow-based compute orchestration" },
      { name: "Edge Worker", simulation_focus: "Low-latency compute near users for personalization" },
    ],
  },
  {
    category: "Networking",
    components: [
      { name: "Router", simulation_focus: "Routing tables, BGP-like path choices, and ACL checks" },
      { name: "Gateway", simulation_focus: "Ingress boundary for services and private networks" },
      { name: "NAT Gateway", simulation_focus: "Outbound internet egress for private subnets" },
      { name: "VPN Tunnel", simulation_focus: "Encrypted private network connectivity" },
      { name: "Firewall", simulation_focus: "Layered ingress and egress policy enforcement" },
      { name: "WAF", simulation_focus: "Application-layer threat filtering and bot mitigation" },
      { name: "CDN", simulation_focus: "Edge caching and origin shielding behavior" },
      { name: "Layer 4 Load Balancer", simulation_focus: "Transport-level balancing across targets" },
      { name: "Layer 7 Load Balancer", simulation_focus: "Header, path, and cookie-aware routing" },
      { name: "Reverse Proxy", simulation_focus: "Connection pooling, TLS termination, and caching" },
    ],
  },
  {
    category: "Application Layer",
    components: [
      { name: "Monolith", simulation_focus: "Single deployable app with shared code and database pressure" },
      { name: "Backend Service", simulation_focus: "Core business logic and API handling" },
      { name: "Web Server", simulation_focus: "Static asset serving and request termination" },
      { name: "API Gateway", simulation_focus: "Authentication, rate limiting, and request shaping" },
      { name: "GraphQL Server", simulation_focus: "Schema federation and query fan-out trade-offs" },
      { name: "Backend for Frontend", simulation_focus: "Client-specific response composition" },
      { name: "Microservice", simulation_focus: "Independent deployability with service contracts" },
      { name: "Event Processor", simulation_focus: "Async event consumption and enrichment" },
      { name: "Workflow Orchestrator", simulation_focus: "Saga and state-machine driven processes" },
      { name: "Search Service", simulation_focus: "Query fanout, indexing, and relevance tuning" },
    ],
  },
  {
    category: "Databases",
    components: [
      { name: "PostgreSQL", simulation_focus: "Transactional relational storage with replicas" },
      { name: "MySQL", simulation_focus: "Relational write path with partitioning and tuning" },
      { name: "MongoDB", simulation_focus: "Document storage with shard keys and replicas" },
      { name: "Redis", simulation_focus: "In-memory cache, counters, and ephemeral state" },
      { name: "Cassandra", simulation_focus: "Wide-column storage for write-heavy global workloads" },
      { name: "DynamoDB", simulation_focus: "Managed key-value and document access patterns" },
      { name: "Elasticsearch", simulation_focus: "Full-text search indexing and aggregations" },
      { name: "ClickHouse", simulation_focus: "Analytical columnar queries over large event streams" },
      { name: "Neo4j", simulation_focus: "Graph traversals and relationship-heavy workloads" },
      { name: "Time-Series DB", simulation_focus: "Metrics retention, rollups, and downsampling" },
    ],
  },
  {
    category: "Database Features",
    components: [
      { name: "Read Replica", simulation_focus: "Scale-out reads with lag awareness" },
      { name: "Shard Set", simulation_focus: "Horizontal partitioning boundaries and rebalancing" },
      { name: "Partition Map", simulation_focus: "Routing layer for shard ownership" },
      { name: "Index Builder", simulation_focus: "B-tree and inverted index maintenance" },
      { name: "Query Analyzer", simulation_focus: "Execution plan visualization and bottleneck hints" },
      { name: "OLAP Replica", simulation_focus: "Analytical offload from hot transaction paths" },
      { name: "CDC Stream", simulation_focus: "Change data capture into downstream systems" },
      { name: "Backup Vault", simulation_focus: "Restore point objectives and retention policy" },
      { name: "Connection Pool", simulation_focus: "Session reuse and head-of-line pressure control" },
      { name: "Data Migration", simulation_focus: "Online schema changes and phased cutovers" },
    ],
  },
  {
    category: "Messaging",
    components: [
      { name: "Kafka", simulation_focus: "Partitioned event streaming with consumer lag" },
      { name: "RabbitMQ", simulation_focus: "Queue-based work distribution and acknowledgments" },
      { name: "SQS", simulation_focus: "Managed queue semantics and visibility timeouts" },
      { name: "Pub/Sub", simulation_focus: "Fanout delivery to multiple subscribers" },
      { name: "Event Bus", simulation_focus: "Domain event choreography and contract evolution" },
      { name: "Stream Processor", simulation_focus: "Windowed aggregations and exactly-once trade-offs" },
      { name: "Dead Letter Queue", simulation_focus: "Poison message isolation and replay" },
      { name: "Scheduler Queue", simulation_focus: "Deferred execution and retry policies" },
      { name: "Webhook Bus", simulation_focus: "Partner delivery reliability and backoff" },
      { name: "Notification Fanout", simulation_focus: "Multichannel push, email, and SMS dispatch" },
    ],
  },
  {
    category: "Storage",
    components: [
      { name: "S3 Bucket", simulation_focus: "Highly durable object storage and lifecycle rules" },
      { name: "Object Storage", simulation_focus: "Provider-neutral object layer for blobs" },
      { name: "File Storage", simulation_focus: "Shared file access semantics across services" },
      { name: "Block Storage", simulation_focus: "Low-level disks attached to compute instances" },
      { name: "Archive Vault", simulation_focus: "Cold storage and restore delay modeling" },
      { name: "Snapshot Repository", simulation_focus: "Versioned backups and point-in-time restore" },
      { name: "Artifact Registry", simulation_focus: "Immutable package and image distribution" },
      { name: "CDN Origin", simulation_focus: "Origin performance and cache fill path" },
      { name: "Media Storage Tier", simulation_focus: "Hot, warm, and cold asset storage economics" },
      { name: "Backup Blob Store", simulation_focus: "Bulk recovery workflow and integrity checks" },
    ],
  },
  {
    category: "Clients",
    components: [
      { name: "Browser", simulation_focus: "Interactive user flow and static asset loading" },
      { name: "Mobile App", simulation_focus: "Flaky network behavior and push notifications" },
      { name: "Desktop App", simulation_focus: "Long-lived sync sessions and background jobs" },
      { name: "IoT Device", simulation_focus: "Low-power constrained connectivity patterns" },
      { name: "Edge POP", simulation_focus: "Regional ingress distribution and low-latency routing" },
      { name: "Smart TV", simulation_focus: "Adaptive bitrate streaming over fixed screens" },
      { name: "CLI Client", simulation_focus: "Automated API access and bulk workflows" },
      { name: "Partner API Client", simulation_focus: "Third-party integration and contract stability" },
      { name: "Admin Console", simulation_focus: "Privileged operations and audit trails" },
      { name: "Backoffice Tool", simulation_focus: "Internal workflows with elevated data access" },
    ],
  },
  {
    category: "Security",
    components: [
      { name: "Auth Server", simulation_focus: "Session issuance and token minting" },
      { name: "OAuth Provider", simulation_focus: "Delegated authorization flows" },
      { name: "JWT Issuer", simulation_focus: "Signed token lifecycle and claim propagation" },
      { name: "Identity Provider", simulation_focus: "Federation, SSO, and user directories" },
      { name: "RBAC Engine", simulation_focus: "Role and permission evaluation" },
      { name: "Secrets Vault", simulation_focus: "Secret rotation and short-lived credentials" },
      { name: "KMS", simulation_focus: "Envelope encryption and key hierarchy" },
      { name: "Certificate Manager", simulation_focus: "TLS issuance, renewal, and revocation" },
      { name: "Bastion Host", simulation_focus: "Privileged access controls and session logging" },
      { name: "SIEM Sink", simulation_focus: "Security event aggregation and triage" },
    ],
  },
  {
    category: "Observability",
    components: [
      { name: "Logging Pipeline", simulation_focus: "Structured logs, routing, and retention" },
      { name: "Metrics Collector", simulation_focus: "Time-series ingest and cardinality control" },
      { name: "Tracing Gateway", simulation_focus: "Distributed traces and span propagation" },
      { name: "Alert Manager", simulation_focus: "Thresholds, deduplication, and escalation" },
      { name: "SLO Tracker", simulation_focus: "Error budgets and reliability governance" },
    ],
  },
  {
    category: "AI/ML/Analytics",
    components: [
      { name: "Model Inference Server", simulation_focus: "Low-latency model serving with concurrency limits" },
      { name: "Vector Database", simulation_focus: "Approximate nearest-neighbor retrieval" },
      { name: "Embedding Service", simulation_focus: "Feature generation for semantic search" },
      { name: "Feature Store", simulation_focus: "Online and offline feature parity" },
      { name: "Recommendation Engine", simulation_focus: "Ranking models and feedback loops" },
    ],
  },
];

export const simulationOperationGroups: OperationGroup[] = [
  {
    domain: "Compute Provisioning",
    operations: [
      "create_vm",
      "resize_vm",
      "start_bare_metal_host",
      "create_auto_scaling_group",
      "attach_instance_profile",
      "deploy_serverless_function",
      "warm_serverless_pool",
      "schedule_batch_worker",
      "pin_gpu_workload",
      "evict_unhealthy_node",
    ],
  },
  {
    domain: "Container Orchestration",
    operations: [
      "create_kubernetes_cluster",
      "add_worker_node",
      "deploy_container_set",
      "apply_horizontal_pod_autoscaler",
      "rollout_canary_release",
      "configure_service_mesh",
      "inject_sidecar_proxy",
      "set_pod_disruption_budget",
      "taint_node_pool",
      "migrate_workload_namespace",
    ],
  },
  {
    domain: "Ingress and Edge",
    operations: [
      "create_dns_zone",
      "configure_geo_dns",
      "attach_cdn_distribution",
      "set_origin_shield",
      "create_layer4_load_balancer",
      "create_layer7_load_balancer",
      "attach_reverse_proxy",
      "configure_tls_termination",
      "enable_http3",
      "map_custom_domain",
    ],
  },
  {
    domain: "Routing and Network Control",
    operations: [
      "create_router",
      "add_static_route",
      "configure_nat_gateway",
      "create_private_subnet",
      "create_public_subnet",
      "peer_virtual_network",
      "attach_vpn_tunnel",
      "enable_port_forwarding",
      "shape_egress_bandwidth",
      "reserve_anycast_ip",
    ],
  },
  {
    domain: "Security Enforcement",
    operations: [
      "create_firewall_policy",
      "deploy_waf",
      "enable_rate_limit",
      "enforce_tls",
      "rotate_keys",
      "create_secrets_vault",
      "attach_kms_key",
      "configure_rbac",
      "enable_audit_logging",
      "deploy_bot_detection",
    ],
  },
  {
    domain: "Application Delivery",
    operations: [
      "deploy_monolith",
      "deploy_backend_service",
      "deploy_microservice",
      "create_api_gateway",
      "publish_graphql_schema",
      "register_service_discovery_record",
      "configure_bff_service",
      "deploy_event_processor",
      "configure_workflow_orchestrator",
      "enable_feature_flag",
    ],
  },
  {
    domain: "Relational Data",
    operations: [
      "create_sql_cluster",
      "promote_read_replica",
      "configure_multi_az_failover",
      "apply_schema_migration",
      "create_connection_pool",
      "enable_query_cache",
      "add_covering_index",
      "partition_table",
      "configure_logical_replication",
      "enable_point_in_time_recovery",
    ],
  },
  {
    domain: "NoSQL and Search",
    operations: [
      "create_document_store",
      "create_wide_column_cluster",
      "create_key_value_table",
      "create_search_index",
      "define_shard_key",
      "rebalance_shards",
      "enable_multi_master_replication",
      "create_vector_index",
      "configure_ttl_policy",
      "seed_geo_partition",
    ],
  },
  {
    domain: "Caching",
    operations: [
      "create_cache_cluster",
      "enable_cache_aside",
      "enable_write_through_cache",
      "configure_refresh_ahead",
      "configure_request_coalescing",
      "set_cache_ttl",
      "pin_hot_keys",
      "enable_session_cache",
      "warm_cache_region",
      "flush_cache_namespace",
    ],
  },
  {
    domain: "Messaging and Streaming",
    operations: [
      "create_kafka_topic",
      "increase_topic_partitions",
      "create_rabbitmq_queue",
      "attach_dead_letter_queue",
      "create_pubsub_topic",
      "deploy_stream_processor",
      "configure_retry_policy",
      "enable_outbox_pattern",
      "throttle_consumer_group",
      "drain_queue_backlog",
    ],
  },
  {
    domain: "Storage and Media",
    operations: [
      "create_object_bucket",
      "enable_versioned_storage",
      "attach_block_volume",
      "mount_shared_file_system",
      "configure_lifecycle_policy",
      "snapshot_volume",
      "replicate_object_storage",
      "tier_media_assets",
      "enable_deduplication",
      "archive_cold_data",
    ],
  },
  {
    domain: "Traffic Simulation",
    operations: [
      "simulate_traffic",
      "increase_concurrency",
      "simulate_peak_load",
      "simulate_flash_crowd",
      "simulate_mobile_network_variability",
      "throttle_bandwidth",
      "inject_packet_loss",
      "simulate_ddos",
      "shift_geo_traffic",
      "replay_production_trace",
    ],
  },
  {
    domain: "Failure and Recovery",
    operations: [
      "kill_server",
      "crash_service",
      "simulate_region_outage",
      "simulate_dns_failure",
      "slow_database",
      "fill_disk",
      "trigger_memory_leak",
      "create_network_partition",
      "delay_message_queue",
      "start_recovery_drill",
    ],
  },
  {
    domain: "Observability",
    operations: [
      "enable_logging",
      "enable_metrics",
      "enable_tracing",
      "create_alert",
      "publish_slo",
      "configure_log_sampling",
      "render_dependency_graph",
      "record_synthetic_probe",
      "open_incident_timeline",
      "correlate_trace_to_log",
    ],
  },
  {
    domain: "Identity and Access",
    operations: [
      "create_auth_server",
      "enable_oauth_flow",
      "issue_jwt",
      "configure_identity_provider",
      "create_service_account",
      "scope_api_token",
      "require_mfa",
      "enable_step_up_auth",
      "map_role_bindings",
      "expire_compromised_session",
    ],
  },
  {
    domain: "Multi-Region",
    operations: [
      "add_region",
      "create_availability_zone",
      "enable_replication",
      "configure_global_load_balancing",
      "configure_active_active_topology",
      "configure_active_passive_topology",
      "measure_replication_lag",
      "simulate_failover",
      "promote_secondary_region",
      "pin_data_residency_policy",
    ],
  },
  {
    domain: "AI and Analytics",
    operations: [
      "deploy_model",
      "scale_gpu_cluster",
      "cache_embeddings",
      "create_feature_store",
      "process_training_job",
      "schedule_retraining",
      "deploy_recommendation_ranker",
      "create_vector_database",
      "backfill_experiment_metrics",
      "serve_online_features",
    ],
  },
  {
    domain: "FinOps and Capacity",
    operations: [
      "estimate_monthly_cost",
      "simulate_auto_scaling_cost",
      "compare_cloud_providers",
      "set_budget_guardrail",
      "forecast_capacity",
      "estimate_bandwidth_cost",
      "estimate_storage_growth",
      "reserve_compute_commitment",
      "flag_cost_anomaly",
      "optimize_idle_resources",
    ],
  },
  {
    domain: "Versioning and Collaboration",
    operations: [
      "commit_architecture",
      "branch_architecture",
      "merge_architecture_branch",
      "rollback_version",
      "diff_architecture",
      "annotate_design_review",
      "assign_instructor_checkpoint",
      "record_decision_log",
      "share_read_only_replay",
      "lock_exam_mode",
    ],
  },
  {
    domain: "Interview and Training Control",
    operations: [
      "start_guided_lab",
      "unlock_hint",
      "score_design",
      "ask_interviewer_question",
      "enable_timebox",
      "freeze_canvas_step",
      "reveal_reference_solution",
      "grade_failure_response",
      "issue_badge",
      "publish_lab_completion",
    ],
  },
];

export const rollbackOperationGroups: OperationGroup[] = [
  {
    domain: "Compute Rollback",
    operations: [
      "delete_vm",
      "restore_vm_size",
      "stop_bare_metal_host",
      "remove_auto_scaling_group",
      "detach_instance_profile",
      "delete_serverless_function",
      "release_serverless_pool",
      "cancel_batch_worker",
      "unpin_gpu_workload",
      "rejoin_evicted_node",
    ],
  },
  {
    domain: "Container Rollback",
    operations: [
      "delete_kubernetes_cluster",
      "remove_worker_node",
      "undeploy_container_set",
      "remove_horizontal_pod_autoscaler",
      "rollback_canary_release",
      "remove_service_mesh",
      "remove_sidecar_proxy",
      "clear_pod_disruption_budget",
      "untaint_node_pool",
      "restore_workload_namespace",
    ],
  },
  {
    domain: "Edge Rollback",
    operations: [
      "delete_dns_zone",
      "disable_geo_dns",
      "detach_cdn_distribution",
      "disable_origin_shield",
      "delete_layer4_load_balancer",
      "delete_layer7_load_balancer",
      "detach_reverse_proxy",
      "disable_tls_termination",
      "disable_http3",
      "remove_custom_domain",
    ],
  },
  {
    domain: "Network Rollback",
    operations: [
      "delete_router",
      "remove_static_route",
      "disable_nat_gateway",
      "delete_private_subnet",
      "delete_public_subnet",
      "unpeer_virtual_network",
      "detach_vpn_tunnel",
      "disable_port_forwarding",
      "reset_egress_bandwidth_policy",
      "release_anycast_ip",
    ],
  },
  {
    domain: "Security Rollback",
    operations: [
      "delete_firewall_policy",
      "remove_waf",
      "disable_rate_limit",
      "allow_plaintext_for_lab",
      "restore_previous_keys",
      "delete_secrets_vault",
      "detach_kms_key",
      "remove_rbac_rules",
      "disable_audit_logging",
      "disable_bot_detection",
    ],
  },
  {
    domain: "Application Rollback",
    operations: [
      "undeploy_monolith",
      "undeploy_backend_service",
      "undeploy_microservice",
      "delete_api_gateway",
      "withdraw_graphql_schema",
      "deregister_service_discovery_record",
      "delete_bff_service",
      "stop_event_processor",
      "disable_workflow_orchestrator",
      "disable_feature_flag",
    ],
  },
  {
    domain: "Relational Rollback",
    operations: [
      "delete_sql_cluster",
      "demote_promoted_replica",
      "disable_multi_az_failover",
      "rollback_schema_migration",
      "delete_connection_pool",
      "disable_query_cache",
      "drop_covering_index",
      "merge_partitioned_table",
      "disable_logical_replication",
      "disable_point_in_time_recovery",
    ],
  },
  {
    domain: "NoSQL Rollback",
    operations: [
      "delete_document_store",
      "delete_wide_column_cluster",
      "delete_key_value_table",
      "drop_search_index",
      "remove_shard_key",
      "restore_previous_shard_map",
      "disable_multi_master_replication",
      "drop_vector_index",
      "remove_ttl_policy",
      "clear_geo_partition",
    ],
  },
  {
    domain: "Cache Rollback",
    operations: [
      "delete_cache_cluster",
      "disable_cache_aside",
      "disable_write_through_cache",
      "disable_refresh_ahead",
      "disable_request_coalescing",
      "reset_cache_ttl",
      "unpin_hot_keys",
      "disable_session_cache",
      "cool_cache_region",
      "restore_cache_namespace",
    ],
  },
  {
    domain: "Messaging Rollback",
    operations: [
      "delete_kafka_topic",
      "restore_topic_partition_count",
      "delete_rabbitmq_queue",
      "detach_dead_letter_queue",
      "delete_pubsub_topic",
      "stop_stream_processor",
      "reset_retry_policy",
      "disable_outbox_pattern",
      "unthrottle_consumer_group",
      "requeue_drained_backlog",
    ],
  },
  {
    domain: "Storage Rollback",
    operations: [
      "delete_object_bucket",
      "disable_versioned_storage",
      "detach_block_volume",
      "unmount_shared_file_system",
      "remove_lifecycle_policy",
      "revert_volume_snapshot",
      "disable_object_storage_replication",
      "restore_single_media_tier",
      "disable_deduplication",
      "rehydrate_archived_data",
    ],
  },
  {
    domain: "Traffic Rollback",
    operations: [
      "stop_traffic_simulation",
      "restore_concurrency_baseline",
      "end_peak_load_simulation",
      "end_flash_crowd",
      "reset_mobile_network_variability",
      "remove_bandwidth_throttle",
      "heal_packet_loss",
      "end_ddos_simulation",
      "restore_geo_traffic_profile",
      "stop_trace_replay",
    ],
  },
  {
    domain: "Failure Rollback",
    operations: [
      "restart_server",
      "recover_service",
      "restore_region",
      "restore_dns",
      "normalize_database_latency",
      "free_disk_space",
      "patch_memory_leak",
      "heal_network_partition",
      "clear_message_queue_delay",
      "end_recovery_drill",
    ],
  },
  {
    domain: "Observability Rollback",
    operations: [
      "disable_logging",
      "disable_metrics",
      "disable_tracing",
      "delete_alert",
      "withdraw_slo",
      "reset_log_sampling",
      "hide_dependency_graph",
      "stop_synthetic_probe",
      "close_incident_timeline",
      "decouple_trace_from_log",
    ],
  },
  {
    domain: "Identity Rollback",
    operations: [
      "delete_auth_server",
      "disable_oauth_flow",
      "revoke_jwt_issuer",
      "disconnect_identity_provider",
      "delete_service_account",
      "widen_api_token_scope_for_lab_reset",
      "disable_mfa_requirement",
      "disable_step_up_auth",
      "remove_role_bindings",
      "restore_expired_session",
    ],
  },
  {
    domain: "Region Rollback",
    operations: [
      "remove_region",
      "delete_availability_zone",
      "disable_replication",
      "disable_global_load_balancing",
      "disable_active_active_topology",
      "disable_active_passive_topology",
      "stop_replication_lag_measurement",
      "cancel_failover",
      "demote_promoted_region",
      "remove_data_residency_policy",
    ],
  },
  {
    domain: "AI Rollback",
    operations: [
      "undeploy_model",
      "shrink_gpu_cluster",
      "evict_embedding_cache",
      "delete_feature_store",
      "cancel_training_job",
      "cancel_retraining_schedule",
      "undeploy_recommendation_ranker",
      "delete_vector_database",
      "remove_experiment_metrics",
      "stop_online_feature_serving",
    ],
  },
  {
    domain: "FinOps Rollback",
    operations: [
      "clear_monthly_cost_estimate",
      "clear_auto_scaling_cost_simulation",
      "clear_cloud_provider_comparison",
      "remove_budget_guardrail",
      "clear_capacity_forecast",
      "clear_bandwidth_cost_estimate",
      "clear_storage_growth_estimate",
      "release_compute_commitment",
      "dismiss_cost_anomaly",
      "restore_idle_resource_profile",
    ],
  },
  {
    domain: "Versioning Rollback",
    operations: [
      "discard_architecture_commit",
      "delete_architecture_branch",
      "revert_branch_merge",
      "restore_rolled_back_version",
      "close_architecture_diff",
      "remove_design_review_annotation",
      "clear_instructor_checkpoint",
      "delete_decision_log_entry",
      "revoke_replay_share",
      "unlock_exam_mode",
    ],
  },
  {
    domain: "Training Rollback",
    operations: [
      "stop_guided_lab",
      "hide_hint",
      "clear_design_score",
      "dismiss_interviewer_question",
      "disable_timebox",
      "unfreeze_canvas_step",
      "hide_reference_solution",
      "clear_failure_response_grade",
      "revoke_badge",
      "unpublish_lab_completion",
    ],
  },
];

const primerTopicSeeds = [
  { topic: "Performance vs Scalability", url: primerLinks.performanceVsScalability },
  { topic: "Latency vs Throughput", url: primerLinks.latencyVsThroughput },
  { topic: "CAP Theorem", url: primerLinks.capTheorem },
  { topic: "Weak Consistency", url: primerLinks.weakConsistency },
  { topic: "Eventual Consistency", url: primerLinks.eventualConsistency },
  { topic: "Strong Consistency", url: primerLinks.strongConsistency },
  { topic: "Replication", url: primerLinks.replication },
  { topic: "Domain Name System", url: primerLinks.dns },
  { topic: "Content Delivery Network", url: primerLinks.cdn },
  { topic: "Load Balancer", url: primerLinks.loadBalancer },
  { topic: "Reverse Proxy", url: primerLinks.reverseProxy },
  { topic: "Application Layer", url: primerLinks.applicationLayer },
  { topic: "Microservices", url: primerLinks.microservices },
  { topic: "Service Discovery", url: primerLinks.serviceDiscovery },
  { topic: "RDBMS", url: primerLinks.rdbms },
  { topic: "Sharding", url: primerLinks.sharding },
  { topic: "SQL or NoSQL", url: primerLinks.sqlOrNoSql },
  { topic: "Cache", url: primerLinks.cache },
  { topic: "Message Queues", url: primerLinks.messageQueues },
  { topic: "Security", url: primerLinks.security },
];

const articleAngles = [
  "Mental model",
  "Trade-off lab",
  "Failure mode",
  "Capacity checkpoint",
  "Architecture review",
];

export const learnMoreArticles: LearnMoreArticle[] = primerTopicSeeds.flatMap(
  (seed, topicIndex) =>
    articleAngles.map((angle, angleIndex) => ({
      id: `article-${topicIndex + 1}-${angleIndex + 1}`,
      title: `${seed.topic}: ${angle} for simulator tooltips`,
      primer_topic: seed.topic,
      url: seed.url,
      angle:
        angle === "Mental model"
          ? "Short conceptual explainer used when the learner first places the component."
          : angle === "Trade-off lab"
            ? "Focused comparison prompt for choosing one topology over another."
            : angle === "Failure mode"
              ? "Incident-oriented explainer that pairs with chaos simulation steps."
              : angle === "Capacity checkpoint"
                ? "Back-of-the-envelope framing for throughput, latency, or growth estimates."
                : "Instructor-style rubric for reviewing the learner decision after validation.",
    })),
);

export const systemExamples: Scenario[] = [];

const scenarioVersion = "1.0.0";

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Twitter",
  description:
    "Teaching scenario for a global social stream optimized for fanout, hot-key mitigation, search, and multi-region resilience.",
  difficulty: "expert",
  design_patterns: ["Event Driven", "CQRS", "Saga", "Repository"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "320M",
    peak_requests_per_second: "2.4M",
    regions: "6 active regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "120:1",
    peak_event_rate: "420K tweet writes/sec",
    hot_path: "home timeline read",
    bandwidth_profile: "media-heavy spikes during global events",
  },
  architecture_steps: [
    step({
      step_id: "twitter-01",
      title: "Establish the global edge",
      tooltip: tooltip(
        "Create DNS, CDN, and edge load balancing so timeline reads terminate close to users.",
        "The read path dominates and must stay close to users while shielding origins.",
        "Use this for global, cache-heavy workloads with uneven traffic bursts.",
        ["Ignoring invalidation for hot media", "Using one region for TLS termination"],
      ),
      learn_more_link: primerLinks.cdn,
      component_added: [
        component("twitter-dns", "dns", "Global DNS", { provider: "Cloudflare", region: "global" }),
        component("twitter-cdn", "cdn", "Media CDN", { provider: "Cloudflare", region: "global" }),
        component("twitter-edge-lb", "layer7_load_balancer", "Edge Router"),
      ],
      component_configured: [
        config("twitter-dns", { geo_routing: true, ttl_seconds: 30 }),
        config("twitter-cdn", { origin_shield: true, cache_policy: "stale-while-revalidate" }),
      ],
      connections_created: [
        wire("Browser", "Global DNS", "HTTPS", "Resolve nearest edge"),
        wire("Global DNS", "Media CDN", "HTTPS", "Serve cached media"),
        wire("Media CDN", "Edge Router", "HTTPS", "Forward misses"),
      ],
      operations: [
        "create_dns_zone",
        "configure_geo_dns",
        "attach_cdn_distribution",
        "create_layer7_load_balancer",
        "configure_tls_termination",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "disable_geo_dns",
        "detach_cdn_distribution",
        "delete_layer7_load_balancer",
        "disable_tls_termination",
      ],
    }),
    step({
      step_id: "twitter-02",
      title: "Deploy API gateway and timeline services",
      tooltip: tooltip(
        "Put an API gateway in front of timeline, profile, and tweet-write services.",
        "The gateway centralizes auth, quotas, and request shaping before requests fan into bounded services.",
        "Use this when multiple clients share policy concerns but require separate downstream services.",
        ["Packing business logic into the gateway", "Missing per-endpoint throttles"],
      ),
      learn_more_link: primerLinks.applicationLayer,
      component_added: [
        component("twitter-api", "api_gateway", "Twitter API Gateway"),
        component("twitter-timeline", "microservice", "Timeline Service"),
        component("twitter-profile", "microservice", "Profile Service"),
      ],
      component_configured: [
        config("twitter-api", { oauth: true, rate_limit_rps: "2000000" }),
        config("twitter-timeline", { pattern: "CQRS", read_optimized: true }),
      ],
      connections_created: [
        wire("Edge Router", "Twitter API Gateway", "HTTPS", "Ingress for app traffic"),
        wire("Twitter API Gateway", "Timeline Service", "gRPC", "Read timeline composition"),
        wire("Twitter API Gateway", "Profile Service", "gRPC", "Fetch profile summaries"),
      ],
      operations: [
        "create_api_gateway",
        "deploy_microservice",
        "register_service_discovery_record",
        "enable_rate_limit",
        "enable_feature_flag",
      ],
      rollback_operations: [
        "delete_api_gateway",
        "undeploy_microservice",
        "deregister_service_discovery_record",
        "disable_rate_limit",
        "disable_feature_flag",
      ],
    }),
    step({
      step_id: "twitter-03",
      title: "Secure the write path",
      tooltip: tooltip(
        "Introduce auth, RBAC, and WAF protection before accepting tweet writes.",
        "Public write surfaces are spam and abuse magnets at global scale.",
        "Use this when clients can mutate shared state or publish content.",
        ["Long-lived tokens", "No bot or credential abuse controls"],
      ),
      learn_more_link: primerLinks.security,
      component_added: [
        component("twitter-auth", "auth_server", "Auth Service"),
        component("twitter-rbac", "rbac_engine", "Moderation RBAC"),
        component("twitter-waf", "waf", "Edge WAF"),
      ],
      component_configured: [
        config("twitter-auth", { oauth_flows: "PKCE,client_credentials", jwt_ttl_minutes: 15 }),
        config("twitter-waf", { bot_detection: true, api_abuse_rules: true }),
      ],
      connections_created: [
        wire("Twitter API Gateway", "Auth Service", "HTTPS", "Validate and mint tokens"),
        wire("Edge Router", "Edge WAF", "HTTPS", "Filter hostile ingress"),
        wire("Auth Service", "Moderation RBAC", "HTTPS", "Authorize sensitive actions"),
      ],
      operations: [
        "create_auth_server",
        "enable_oauth_flow",
        "issue_jwt",
        "deploy_waf",
        "configure_rbac",
      ],
      rollback_operations: [
        "delete_auth_server",
        "disable_oauth_flow",
        "revoke_jwt_issuer",
        "remove_waf",
        "remove_rbac_rules",
      ],
    }),
    step({
      step_id: "twitter-04",
      title: "Model asynchronous fanout",
      tooltip: tooltip(
        "Publish tweet events to Kafka and let workers fan them into follower timelines.",
        "A queue decouples write acknowledgements from expensive secondary updates.",
        "Use this when writes trigger broad downstream work.",
        ["Fanout-on-write without guardrails", "No dead-letter queue"],
      ),
      learn_more_link: primerLinks.messageQueues,
      component_added: [
        component("twitter-kafka", "kafka", "Tweet Event Stream"),
        component("twitter-fanout", "batch_worker", "Fanout Workers"),
        component("twitter-dlq", "dead_letter_queue", "Tweet DLQ"),
      ],
      component_configured: [
        config("twitter-kafka", { partitions: 512, replication_factor: 3 }),
        config("twitter-fanout", { autoscale_on_lag: true, max_workers: 4000 }),
      ],
      connections_created: [
        wire("Twitter API Gateway", "Tweet Event Stream", "Message queue", "Publish tweet writes"),
        wire("Tweet Event Stream", "Fanout Workers", "Message queue", "Distribute fanout jobs"),
        wire("Fanout Workers", "Tweet DLQ", "Message queue", "Capture failures"),
      ],
      operations: [
        "create_kafka_topic",
        "increase_topic_partitions",
        "schedule_batch_worker",
        "attach_dead_letter_queue",
        "drain_queue_backlog",
      ],
      rollback_operations: [
        "delete_kafka_topic",
        "restore_topic_partition_count",
        "cancel_batch_worker",
        "detach_dead_letter_queue",
        "requeue_drained_backlog",
      ],
    }),
    step({
      step_id: "twitter-05",
      title: "Accelerate reads with cache, graph data, and search",
      tooltip: tooltip(
        "Use Redis for timeline fragments, a graph store for follows, and Elasticsearch for discovery.",
        "Read latency dominates experience and each access pattern wants its own specialized store.",
        "Use this when timelines, graph traversals, and text search all sit on the critical path.",
        ["Cache stampedes", "Sending search to the primary write store"],
      ),
      learn_more_link: primerLinks.cache,
      component_added: [
        component("twitter-redis", "redis", "Timeline Cache"),
        component("twitter-graph", "neo4j", "Follow Graph"),
        component("twitter-search", "elasticsearch", "Search Cluster"),
      ],
      component_configured: [
        config("twitter-redis", { ttl_seconds: 45, request_coalescing: true }),
        config("twitter-search", { shard_count: 128, replicas: 2 }),
      ],
      connections_created: [
        wire("Timeline Service", "Timeline Cache", "TCP", "Serve cached home timelines"),
        wire("Timeline Service", "Follow Graph", "gRPC", "Resolve fanout targets"),
        wire("Twitter API Gateway", "Search Cluster", "HTTPS", "Serve search queries"),
      ],
      operations: [
        "create_cache_cluster",
        "enable_cache_aside",
        "set_cache_ttl",
        "create_search_index",
        "pin_hot_keys",
      ],
      rollback_operations: [
        "delete_cache_cluster",
        "disable_cache_aside",
        "reset_cache_ttl",
        "drop_search_index",
        "unpin_hot_keys",
      ],
    }),
    step({
      step_id: "twitter-06",
      title: "Shard, replicate, and observe",
      tooltip: tooltip(
        "Split hot datasets across shards, replicate across regions, and instrument latency and cost.",
        "The lab should teach both how the design scales and how it fails or becomes expensive.",
        "Use this to close every scenario with resilience and FinOps reasoning.",
        ["Poor shard-key choice", "No visibility into replication lag or queue burn"],
      ),
      learn_more_link: primerLinks.sharding,
      component_added: [
        component("twitter-cassandra", "cassandra", "Tweet Store"),
        component("twitter-repl", "replication", "Cross-region Replication"),
        component("twitter-metrics", "metrics_collector", "Metrics Collector"),
      ],
      component_configured: [
        config("twitter-cassandra", { consistency: "LOCAL_QUORUM", regions: 6 }),
        config("twitter-metrics", { dashboards: "latency,queue_lag,cost,replication" }),
      ],
      connections_created: [
        wire("Twitter API Gateway", "Tweet Store", "TCP", "Persist tweets"),
        wire("Tweet Store", "Cross-region Replication", "TCP", "Replicate asynchronously"),
        wire("Timeline Service", "Metrics Collector", "HTTPS", "Publish SLO telemetry"),
      ],
      operations: [
        "create_wide_column_cluster",
        "define_shard_key",
        "enable_replication",
        "enable_metrics",
        "estimate_monthly_cost",
      ],
      rollback_operations: [
        "delete_wide_column_cluster",
        "remove_shard_key",
        "disable_replication",
        "disable_metrics",
        "clear_monthly_cost_estimate",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Instagram",
  description:
    "Teaching scenario for media feeds, fanout, reels delivery, notifications, and discovery ranking.",
  difficulty: "expert",
  design_patterns: ["CQRS", "Event Driven", "Observer", "Repository"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "480M",
    peak_requests_per_second: "2.2M",
    regions: "7 app regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "140:1",
    peak_event_rate: "650K media and interaction events/sec",
    hot_path: "home feed and reels playback",
    bandwidth_profile: "image and short-video heavy with viral spikes",
  },
  architecture_steps: [
    step({
      step_id: "insta-01",
      title: "Create app edge, auth, and media CDN",
      tooltip: tooltip(
        "Use CDN and edge routing for media-heavy reads while separating auth and profile flows.",
        "Social products serve huge amounts of cached media alongside dynamic feed metadata.",
        "Use this for products where media egress dominates cost and latency.",
        ["Serving reels directly from origin", "Mixing auth with media delivery"],
      ),
      learn_more_link: primerLinks.cdn,
      component_added: [
        component("insta-dns", "dns", "App DNS"),
        component("insta-cdn", "cdn", "Media CDN"),
        component("insta-auth", "auth_server", "Auth Service"),
      ],
      component_configured: [
        config("insta-cdn", { image_resizing: true, short_video_cache: true }),
        config("insta-auth", { oauth: true, risk_scoring: true }),
      ],
      connections_created: [
        wire("Mobile App", "App DNS", "HTTPS", "Resolve nearest edge"),
        wire("App DNS", "Media CDN", "HTTPS", "Send media traffic to edge"),
        wire("Mobile App", "Auth Service", "HTTPS", "Authenticate sessions"),
      ],
      operations: [
        "create_dns_zone",
        "configure_geo_dns",
        "attach_cdn_distribution",
        "create_auth_server",
        "enable_oauth_flow",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "disable_geo_dns",
        "detach_cdn_distribution",
        "delete_auth_server",
        "disable_oauth_flow",
      ],
    }),
    step({
      step_id: "insta-02",
      title: "Build feed cache, graph, and ranking path",
      tooltip: tooltip(
        "Store pre-ranked feed fragments in cache, keep a graph service for follows, and rank reads online.",
        "Social feeds need fresh ranking without rebuilding the entire feed every request.",
        "Use this when the feed is read-heavy but must stay personalized and recent.",
        ["Computing the whole feed on every request", "No hot-key mitigation for celebrity users"],
      ),
      learn_more_link: primerLinks.cache,
      component_added: [
        component("insta-feed", "microservice", "Feed Service"),
        component("insta-feed-cache", "redis", "Feed Cache"),
        component("insta-ranker", "recommendation_engine", "Feed Ranker"),
      ],
      component_configured: [
        config("insta-feed-cache", { ttl_seconds: 60, request_coalescing: true }),
        config("insta-ranker", { online_features: true, freshness_bias: true }),
      ],
      connections_created: [
        wire("Media CDN", "Feed Service", "gRPC", "Request home feed metadata"),
        wire("Feed Service", "Feed Cache", "TCP", "Serve cached feed slices"),
        wire("Feed Service", "Feed Ranker", "gRPC", "Re-rank feed candidates"),
      ],
      operations: [
        "deploy_microservice",
        "create_cache_cluster",
        "enable_cache_aside",
        "configure_request_coalescing",
        "deploy_recommendation_ranker",
      ],
      rollback_operations: [
        "undeploy_microservice",
        "delete_cache_cluster",
        "disable_cache_aside",
        "disable_request_coalescing",
        "undeploy_recommendation_ranker",
      ],
    }),
    step({
      step_id: "insta-03",
      title: "Create media ingest and interaction fanout",
      tooltip: tooltip(
        "Split uploads into a processing path and publish likes, comments, and follows onto an event bus.",
        "Uploads and interactions are bursty and should not slow the primary feed request path.",
        "Use this when creators upload media that must be transformed before delivery.",
        ["Publishing reels directly from sources", "Incrementing counters synchronously everywhere"],
      ),
      learn_more_link: primerLinks.messageQueues,
      component_added: [
        component("insta-upload", "api_gateway", "Media Upload API"),
        component("insta-origin", "object_storage", "Media Origin"),
        component("insta-events", "kafka", "Interaction Stream"),
      ],
      component_configured: [
        config("insta-upload", { resumable_uploads: true, virus_scanning: true }),
        config("insta-events", { partitions: 256, retention_days: 3 }),
      ],
      connections_created: [
        wire("Mobile App", "Media Upload API", "HTTPS", "Upload photos and reels"),
        wire("Media Upload API", "Media Origin", "HTTPS", "Persist source media"),
        wire("Feed Service", "Interaction Stream", "Message queue", "Publish interaction events"),
      ],
      operations: [
        "create_api_gateway",
        "create_object_bucket",
        "create_kafka_topic",
        "create_pubsub_topic",
        "enable_write_through_cache",
      ],
      rollback_operations: [
        "delete_api_gateway",
        "delete_object_bucket",
        "delete_kafka_topic",
        "delete_pubsub_topic",
        "disable_write_through_cache",
      ],
    }),
    step({
      step_id: "insta-04",
      title: "Add discovery, abuse controls, and viral event observability",
      tooltip: tooltip(
        "Index users and hashtags, add embeddings for discovery, protect public APIs with WAF rules, and simulate viral spikes.",
        "Discovery and abuse resistance are both first-class concerns in public social systems.",
        "Use this when products mix keyword search, recommendation, and public attack surfaces.",
        ["Using only keyword search", "No SIEM feedback into account risk decisions"],
      ),
      learn_more_link: primerLinks.security,
      component_added: [
        component("insta-search", "elasticsearch", "Discovery Search"),
        component("insta-vector", "vector_database", "Discovery Vector DB"),
        component("insta-waf", "waf", "API WAF"),
      ],
      component_configured: [
        config("insta-search", { shard_count: 72, ranking_signals: true }),
        config("insta-waf", { credential_stuffing: true, api_abuse_rules: true }),
      ],
      connections_created: [
        wire("Interaction Stream", "Discovery Search", "Message queue", "Index searchable content"),
        wire("Interaction Stream", "Discovery Vector DB", "Message queue", "Refresh semantic vectors"),
        wire("Media CDN", "API WAF", "HTTPS", "Filter malicious public traffic"),
      ],
      operations: [
        "create_search_index",
        "create_vector_database",
        "deploy_waf",
        "simulate_flash_crowd",
        "compare_cloud_providers",
      ],
      rollback_operations: [
        "drop_search_index",
        "delete_vector_database",
        "remove_waf",
        "end_flash_crowd",
        "clear_cloud_provider_comparison",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Spotify",
  description:
    "Teaching scenario for low-latency audio streaming, playlists, recommendations, and offline sync.",
  difficulty: "advanced",
  design_patterns: ["Microservices", "Event Driven", "Strategy", "Repository"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "250M",
    peak_requests_per_second: "1.3M",
    regions: "7 audio regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "90:2",
    peak_event_rate: "40M playback events/minute",
    hot_path: "music playback session and recommendation refresh",
    bandwidth_profile: "steady audio egress with sync bursts and heavy recommendation traffic",
  },
  architecture_steps: [
    step({
      step_id: "spotify-01",
      title: "Deploy the audio streaming edge",
      tooltip: tooltip(
        "Set up geo routing and CDN for audio chunk delivery and playlist asset fetches.",
        "Audio streaming needs low startup delay and reliable edge delivery at global scale.",
        "Use this for high-volume media products with huge concurrent sessions.",
        ["Treating audio delivery as a file-download problem", "No regional failover for manifests"],
      ),
      learn_more_link: primerLinks.cdn,
      component_added: [
        component("sp-dns", "dns", "Audio Geo DNS"),
        component("sp-cdn", "cdn", "Audio CDN"),
        component("sp-edge", "layer7_load_balancer", "Streaming Edge Router"),
      ],
      component_configured: [
        config("sp-cdn", { chunk_cache: true, origin_shield: true }),
        config("sp-edge", { low_latency_audio_paths: true }),
      ],
      connections_created: [
        wire("Mobile App", "Audio Geo DNS", "HTTPS", "Resolve nearest audio edge"),
        wire("Audio Geo DNS", "Audio CDN", "HTTPS", "Route chunk requests"),
        wire("Audio CDN", "Streaming Edge Router", "HTTPS", "Forward control-plane misses"),
      ],
      operations: [
        "create_dns_zone",
        "configure_geo_dns",
        "attach_cdn_distribution",
        "set_origin_shield",
        "create_layer7_load_balancer",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "disable_geo_dns",
        "detach_cdn_distribution",
        "disable_origin_shield",
        "delete_layer7_load_balancer",
      ],
    }),
    step({
      step_id: "spotify-02",
      title: "Separate auth, subscriptions, and playlists",
      tooltip: tooltip(
        "Use identity, subscription, profile, playlist, and cache layers to govern playback rights and user state.",
        "Subscription tier affects playback rights, quality, and offline download features.",
        "Use this when product entitlements differ across user cohorts.",
        ["Embedding subscription logic in every service", "No caching strategy for playlists"],
      ),
      learn_more_link: primerLinks.security,
      component_added: [
        component("sp-auth", "identity_provider", "Identity Provider"),
        component("sp-subs", "microservice", "Subscription Service"),
        component("sp-catalog-db", "postgresql", "Catalog DB"),
        component("sp-playlist", "microservice", "Playlist Service"),
        component("sp-playlist-cache", "redis", "Playlist Cache"),
      ],
      component_configured: [
        config("sp-auth", { sso: true, device_binding: true }),
        config("sp-playlist-cache", { ttl_seconds: 45, write_through: true }),
      ],
      connections_created: [
        wire("Streaming Edge Router", "Identity Provider", "HTTPS", "Authenticate playback"),
        wire("Streaming Edge Router", "Subscription Service", "gRPC", "Validate entitlements"),
        wire("Streaming Edge Router", "Catalog DB", "TCP", "Resolve track metadata"),
        wire("Playlist Service", "Playlist Cache", "TCP", "Cache playlist fragments"),
      ],
      operations: [
        "configure_identity_provider",
        "deploy_microservice",
        "create_cache_cluster",
        "enable_write_through_cache",
        "require_mfa",
      ],
      rollback_operations: [
        "disconnect_identity_provider",
        "undeploy_microservice",
        "delete_cache_cluster",
        "disable_write_through_cache",
        "disable_mfa_requirement",
      ],
    }),
    step({
      step_id: "spotify-03",
      title: "Issue playback manifests and stream behavior events",
      tooltip: tooltip(
        "Generate playback manifests, check rights, and stream listening behavior into recommendation systems.",
        "Fresh listening behavior strongly influences the next song, playlist, and home recommendations.",
        "Use this when user actions should quickly shape ranking outputs.",
        ["No cache for short-lived playback state", "Using only nightly jobs for recommendations"],
      ),
      learn_more_link: primerLinks.messageQueues,
      component_added: [
        component("sp-manifest", "microservice", "Playback Manifest Service"),
        component("sp-session-cache", "redis", "Playback Session Cache"),
        component("sp-events", "kafka", "Playback Event Stream"),
        component("sp-features", "feature_store", "Music Feature Store"),
      ],
      component_configured: [
        config("sp-manifest", { hls_audio: true, adaptive_bitrate: true }),
        config("sp-session-cache", { ttl_seconds: 240, geo_replication: true }),
      ],
      connections_created: [
        wire("Streaming Edge Router", "Playback Manifest Service", "gRPC", "Initialize playback"),
        wire("Playback Manifest Service", "Playback Session Cache", "TCP", "Persist session state"),
        wire("Playback Manifest Service", "Playback Event Stream", "Message queue", "Emit listening events"),
        wire("Playback Event Stream", "Music Feature Store", "Message queue", "Update rank features"),
      ],
      operations: [
        "deploy_microservice",
        "create_cache_cluster",
        "enable_session_cache",
        "create_kafka_topic",
        "create_feature_store",
      ],
      rollback_operations: [
        "undeploy_microservice",
        "delete_cache_cluster",
        "disable_session_cache",
        "delete_kafka_topic",
        "delete_feature_store",
      ],
    }),
    step({
      step_id: "spotify-04",
      title: "Support offline sync, replication, and cost visibility",
      tooltip: tooltip(
        "Use download orchestration, per-device keys, regional replicas, and cost overlays for bandwidth plus inference spend.",
        "Offline support changes storage, rights enforcement, and device sync semantics while global scale changes catalog placement.",
        "Use this when premium clients need local availability during poor connectivity.",
        ["Trusting the client with unlimited offline rights", "Ignoring GPU or inference spend"],
      ),
      learn_more_link: primerLinks.replication,
      component_added: [
        component("sp-offline", "workflow_orchestrator", "Offline Sync Orchestrator"),
        component("sp-region-b", "cloud_region", "Secondary Audio Region"),
        component("sp-finops", "metrics_collector", "Streaming Cost Panel"),
      ],
      component_configured: [
        config("sp-offline", { max_devices: 5, quota_mb: 10000 }),
        config("sp-finops", { metrics: "startup_ms,cdn_hit_ratio,inference_cost" }),
      ],
      connections_created: [
        wire("Playback Manifest Service", "Offline Sync Orchestrator", "gRPC", "Prepare offline package"),
        wire("Catalog DB", "Secondary Audio Region", "TCP", "Replicate catalog data"),
        wire("Playback Event Stream", "Streaming Cost Panel", "HTTPS", "Overlay traffic and spend"),
      ],
      operations: [
        "configure_workflow_orchestrator",
        "add_region",
        "enable_replication",
        "estimate_bandwidth_cost",
        "flag_cost_anomaly",
      ],
      rollback_operations: [
        "disable_workflow_orchestrator",
        "remove_region",
        "disable_replication",
        "clear_bandwidth_cost_estimate",
        "dismiss_cost_anomaly",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Dropbox",
  description:
    "Teaching scenario for sync metadata, block storage, deduplication, versioning, and cross-device consistency.",
  difficulty: "advanced",
  design_patterns: ["Clean Architecture", "Repository", "Observer", "Saga"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "90M",
    peak_requests_per_second: "650K",
    regions: "5 primary sync regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "3:2",
    peak_event_rate: "8M file change events/hour",
    hot_path: "delta sync and file block upload",
    bandwidth_profile: "desktop-heavy sync bursts and large file uploads",
  },
  architecture_steps: [
    step({
      step_id: "dropbox-01",
      title: "Create sync ingress and device auth",
      tooltip: tooltip(
        "Build an ingress path for desktop and mobile sync clients with resumable uploads and device auth.",
        "File sync requires durable authentication and efficient reconnect behavior across devices.",
        "Use this when clients maintain background synchronization over long periods.",
        ["Treating sync uploads like ordinary browser forms", "No device-level revocation path"],
      ),
      learn_more_link: primerLinks.security,
      component_added: [
        component("dbx-api", "api_gateway", "Sync API"),
        component("dbx-auth", "auth_server", "Device Auth"),
        component("dbx-edge", "reverse_proxy", "Sync Reverse Proxy"),
      ],
      component_configured: [
        config("dbx-api", { resumable_uploads: true, rate_limit_rps: 300000 }),
        config("dbx-auth", { device_trust: true, session_rotation_minutes: 30 }),
      ],
      connections_created: [
        wire("Desktop App", "Sync Reverse Proxy", "HTTPS", "Upload and sync requests"),
        wire("Sync Reverse Proxy", "Sync API", "HTTPS", "Forward authenticated traffic"),
        wire("Sync API", "Device Auth", "HTTPS", "Validate device sessions"),
      ],
      operations: [
        "create_api_gateway",
        "attach_reverse_proxy",
        "create_auth_server",
        "issue_jwt",
        "enable_rate_limit",
      ],
      rollback_operations: [
        "delete_api_gateway",
        "detach_reverse_proxy",
        "delete_auth_server",
        "revoke_jwt_issuer",
        "disable_rate_limit",
      ],
    }),
    step({
      step_id: "dropbox-02",
      title: "Split metadata from block storage",
      tooltip: tooltip(
        "Use a transactional metadata store for file trees and separate object storage for file blocks.",
        "Directory structure and permissions are transactional, but content blocks are large immutable blobs.",
        "Use this when metadata updates and binary data have different consistency and cost needs.",
        ["Storing file blobs inside the metadata DB", "No version model for rename and delete"],
      ),
      learn_more_link: primerLinks.rdbms,
      component_added: [
        component("dbx-meta", "postgresql", "Metadata DB"),
        component("dbx-blocks", "object_storage", "Block Store"),
        component("dbx-replica", "read_replica", "Metadata Replica"),
      ],
      component_configured: [
        config("dbx-meta", { shards: 24, transactions: true }),
        config("dbx-blocks", { versioning: true, dedupe_ready: true }),
      ],
      connections_created: [
        wire("Sync API", "Metadata DB", "TCP", "Mutate file tree metadata"),
        wire("Sync API", "Block Store", "HTTPS", "Upload content blocks"),
        wire("Metadata DB", "Metadata Replica", "TCP", "Scale reads"),
      ],
      operations: [
        "create_sql_cluster",
        "promote_read_replica",
        "create_object_bucket",
        "enable_versioned_storage",
        "define_shard_key",
      ],
      rollback_operations: [
        "delete_sql_cluster",
        "demote_promoted_replica",
        "delete_object_bucket",
        "disable_versioned_storage",
        "remove_shard_key",
      ],
    }),
    step({
      step_id: "dropbox-03",
      title: "Enable block deduplication and change notifications",
      tooltip: tooltip(
        "Split files into hashed blocks, reuse stored blocks, and publish file change events for delta sync.",
        "Chunking reduces transfer cost while event-driven notifications keep sync responsive.",
        "Use this when large files are synced repeatedly or across many devices.",
        ["Chunk sizes too large for delta sync", "Polling every path aggressively"],
      ),
      learn_more_link: primerLinks.messageQueues,
      component_added: [
        component("dbx-chunker", "backend_service", "Chunking Service"),
        component("dbx-hash", "key_value_store", "Block Hash Index"),
        component("dbx-events", "pubsub", "Sync Event Bus"),
      ],
      component_configured: [
        config("dbx-chunker", { chunk_mb: 4, rolling_hash: true }),
        config("dbx-events", { message_ordering: "per_path", retries: 6 }),
      ],
      connections_created: [
        wire("Sync API", "Chunking Service", "HTTPS", "Split uploads into blocks"),
        wire("Chunking Service", "Block Hash Index", "HTTPS", "Check existing blocks"),
        wire("Metadata DB", "Sync Event Bus", "Message queue", "Emit path changes"),
      ],
      operations: [
        "deploy_backend_service",
        "create_key_value_table",
        "enable_deduplication",
        "create_pubsub_topic",
        "configure_retry_policy",
      ],
      rollback_operations: [
        "undeploy_backend_service",
        "delete_key_value_table",
        "disable_deduplication",
        "delete_pubsub_topic",
        "reset_retry_policy",
      ],
    }),
    step({
      step_id: "dropbox-04",
      title: "Version files, replicate, and protect sharing",
      tooltip: tooltip(
        "Keep immutable revisions, replicate metadata and blocks across regions, and protect shared links with keys and audit logging.",
        "Sync systems need conflict safety, disaster recovery, and secure external sharing.",
        "Use this when the product supports collaboration plus public or semi-public sharing.",
        ["Silently overwriting conflicts", "Non-expiring public links"],
      ),
      learn_more_link: primerLinks.replication,
      component_added: [
        component("dbx-versioning", "workflow_orchestrator", "Version Resolver"),
        component("dbx-region-b", "cloud_region", "Secondary Sync Region"),
        component("dbx-kms", "kms", "Sharing Key Manager"),
      ],
      component_configured: [
        config("dbx-versioning", { conflict_mode: "fork_then_merge", revision_graph: true }),
        config("dbx-region-b", { failover_ready: true, backup_restore_drills: true }),
      ],
      connections_created: [
        wire("Sync Event Bus", "Version Resolver", "Message queue", "Resolve revisions"),
        wire("Metadata DB", "Secondary Sync Region", "TCP", "Replicate metadata"),
        wire("Sync API", "Sharing Key Manager", "HTTPS", "Sign shared links"),
      ],
      operations: [
        "configure_workflow_orchestrator",
        "add_region",
        "enable_replication",
        "attach_kms_key",
        "enable_audit_logging",
      ],
      rollback_operations: [
        "disable_workflow_orchestrator",
        "remove_region",
        "disable_replication",
        "detach_kms_key",
        "disable_audit_logging",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Google Docs",
  description:
    "Teaching scenario for collaborative editing, realtime presence, operational transforms or CRDTs, and durable revision history.",
  difficulty: "expert",
  design_patterns: ["Observer", "Hexagonal", "CQRS", "Unit of Work"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "220M",
    peak_requests_per_second: "1.4M",
    regions: "6 collaboration regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "2:3",
    peak_event_rate: "14M edit operations/minute",
    hot_path: "collaborative edit session",
    bandwidth_profile: "interactive small messages with bursty media embeds",
  },
  architecture_steps: [
    step({
      step_id: "gdocs-01",
      title: "Create realtime ingress and auth",
      tooltip: tooltip(
        "Route browser sessions through edge gateways capable of WebSockets and strict auth.",
        "Realtime editing requires stable, authenticated long-lived channels.",
        "Use this when browser clients exchange frequent collaborative updates.",
        ["Falling back to polling for everything", "No session affinity for collaboration rooms"],
      ),
      learn_more_link: primerLinks.security,
      component_added: [
        component("gdocs-api", "api_gateway", "Realtime API Gateway"),
        component("gdocs-auth", "identity_provider", "Workspace Identity"),
        component("gdocs-edge", "layer7_load_balancer", "Realtime Edge Router"),
      ],
      component_configured: [
        config("gdocs-api", { websocket_upgrade: true, room_affinity: true }),
        config("gdocs-auth", { sso: true, document_scopes: true }),
      ],
      connections_created: [
        wire("Browser", "Realtime Edge Router", "HTTPS", "Enter collaboration edge"),
        wire("Realtime Edge Router", "Realtime API Gateway", "HTTPS", "Forward session traffic"),
        wire("Realtime API Gateway", "Workspace Identity", "HTTPS", "Authorize document access"),
      ],
      operations: [
        "create_api_gateway",
        "configure_identity_provider",
        "create_layer7_load_balancer",
        "enable_oauth_flow",
        "enable_rate_limit",
      ],
      rollback_operations: [
        "delete_api_gateway",
        "disconnect_identity_provider",
        "delete_layer7_load_balancer",
        "disable_oauth_flow",
        "disable_rate_limit",
      ],
    }),
    step({
      step_id: "gdocs-02",
      title: "Maintain session state and merge edits",
      tooltip: tooltip(
        "Store collaboration membership in cache and merge edits through a dedicated OT or CRDT engine backed by an operation log.",
        "Collaborative correctness depends on conflict resolution semantics, not just persistence.",
        "Use this when many clients mutate the same document concurrently.",
        ["Applying edits in arrival order", "No causal metadata for offline clients"],
      ),
      learn_more_link: primerLinks.eventualConsistency,
      component_added: [
        component("gdocs-presence", "redis", "Presence Cache"),
        component("gdocs-merge", "workflow_orchestrator", "OT/CRDT Engine"),
        component("gdocs-oplog", "kafka", "Document Operation Log"),
      ],
      component_configured: [
        config("gdocs-presence", { ttl_seconds: 12, pubsub: true }),
        config("gdocs-oplog", { partitions: 128, ordering: "per_document" }),
      ],
      connections_created: [
        wire("Realtime API Gateway", "Presence Cache", "TCP", "Track room membership"),
        wire("Realtime API Gateway", "OT/CRDT Engine", "WebSockets", "Submit edits"),
        wire("OT/CRDT Engine", "Document Operation Log", "Message queue", "Persist ordered ops"),
      ],
      operations: [
        "create_cache_cluster",
        "configure_workflow_orchestrator",
        "create_kafka_topic",
        "increase_topic_partitions",
        "pin_hot_keys",
      ],
      rollback_operations: [
        "delete_cache_cluster",
        "disable_workflow_orchestrator",
        "delete_kafka_topic",
        "restore_topic_partition_count",
        "unpin_hot_keys",
      ],
    }),
    step({
      step_id: "gdocs-03",
      title: "Persist documents, revisions, and exports",
      tooltip: tooltip(
        "Separate canonical document snapshots from revision history and export artifacts.",
        "Realtime edits need durable snapshots and point-in-time recovery without bloating the hot path.",
        "Use this when documents evolve continuously but must remain recoverable.",
        ["Storing only the latest state", "No snapshot compaction strategy"],
      ),
      learn_more_link: primerLinks.rdbms,
      component_added: [
        component("gdocs-doc-db", "postgresql", "Document Metadata DB"),
        component("gdocs-snapshots", "object_storage", "Snapshot Store"),
        component("gdocs-search", "elasticsearch", "Document Search"),
      ],
      component_configured: [
        config("gdocs-doc-db", { pitr: true, read_replicas: 4 }),
        config("gdocs-snapshots", { compaction_interval_minutes: 5, versioning: true }),
      ],
      connections_created: [
        wire("OT/CRDT Engine", "Document Metadata DB", "TCP", "Persist document metadata"),
        wire("OT/CRDT Engine", "Snapshot Store", "HTTPS", "Write periodic snapshots"),
        wire("Document Metadata DB", "Document Search", "HTTPS", "Index searchable metadata"),
      ],
      operations: [
        "create_sql_cluster",
        "enable_point_in_time_recovery",
        "create_object_bucket",
        "enable_versioned_storage",
        "create_search_index",
      ],
      rollback_operations: [
        "delete_sql_cluster",
        "disable_point_in_time_recovery",
        "delete_object_bucket",
        "disable_versioned_storage",
        "drop_search_index",
      ],
    }),
    step({
      step_id: "gdocs-04",
      title: "Replicate collaboration control plane and test chaos",
      tooltip: tooltip(
        "Keep room routing and document state available across regions and test failover with trace-driven observability.",
        "Collaborative users expect sessions to survive regional incidents with minimal disruption.",
        "Use this when active collaborative sessions must be recoverable after a region issue.",
        ["Trying to replicate every keystroke synchronously worldwide", "Watching latency without merge correctness"],
      ),
      learn_more_link: primerLinks.failOver,
      component_added: [
        component("gdocs-region-a", "cloud_region", "Primary Collaboration Region"),
        component("gdocs-region-b", "cloud_region", "Secondary Collaboration Region"),
        component("gdocs-traces", "tracing_gateway", "Realtime Trace Collector"),
      ],
      component_configured: [
        config("gdocs-region-b", { warm_room_capacity: true }),
        config("gdocs-traces", { metrics: "edit_ack_ms,session_recovery,merge_divergence" }),
      ],
      connections_created: [
        wire("Primary Collaboration Region", "Secondary Collaboration Region", "HTTPS", "Replicate sessions and metadata"),
        wire("Realtime Edge Router", "Secondary Collaboration Region", "HTTPS", "Failover route"),
        wire("OT/CRDT Engine", "Realtime Trace Collector", "HTTPS", "Trace edit merges"),
      ],
      operations: [
        "add_region",
        "enable_replication",
        "configure_active_passive_topology",
        "simulate_failover",
        "enable_tracing",
      ],
      rollback_operations: [
        "remove_region",
        "disable_replication",
        "disable_active_passive_topology",
        "cancel_failover",
        "disable_tracing",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "WhatsApp",
  description:
    "Teaching scenario for end-to-end messaging, connection state, group fanout, and abuse-resistant mobile delivery.",
  difficulty: "expert",
  design_patterns: ["Event Driven", "Observer", "Saga", "Strategy"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "1.7B",
    peak_requests_per_second: "4.2M",
    regions: "10 messaging regions",
    availability_target: "99.999%",
  },
  traffic_estimation: {
    read_write_ratio: "1:1.3",
    peak_event_rate: "120M messages/minute",
    hot_path: "message ingest, delivery ack, and presence",
    bandwidth_profile: "mobile-first with frequent network churn",
  },
  architecture_steps: [
    step({
      step_id: "whatsapp-01",
      title: "Set up mobile edge routing",
      tooltip: tooltip(
        "Use geo DNS, a connection balancer, and mobile gateways optimized for long-lived sessions.",
        "Messaging apps hold massive numbers of concurrent connections and need fast reconnection handling.",
        "Use this when devices reconnect often and stateful sessions need metro affinity.",
        ["One-session-region design", "Ignoring reconnect storms after ISP outages"],
      ),
      learn_more_link: primerLinks.dns,
      component_added: [
        component("wa-dns", "dns", "Chat Geo DNS"),
        component("wa-lb", "layer4_load_balancer", "Persistent Connection Balancer"),
        component("wa-gateway", "reverse_proxy", "Mobile Session Gateway"),
      ],
      component_configured: [
        config("wa-dns", { low_ttl: true, connection_affinity: true }),
        config("wa-lb", { protocol: "TCP", session_stickiness: true }),
      ],
      connections_created: [
        wire("Mobile App", "Chat Geo DNS", "HTTPS", "Resolve messaging edge"),
        wire("Chat Geo DNS", "Mobile Session Gateway", "HTTPS", "Send users to local ingress"),
        wire("Mobile Session Gateway", "Persistent Connection Balancer", "TCP", "Assign socket owner"),
      ],
      operations: [
        "create_dns_zone",
        "configure_geo_dns",
        "create_layer4_load_balancer",
        "attach_reverse_proxy",
        "enforce_tls",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "disable_geo_dns",
        "delete_layer4_load_balancer",
        "detach_reverse_proxy",
        "allow_plaintext_for_lab",
      ],
    }),
    step({
      step_id: "whatsapp-02",
      title: "Establish identity, presence, and contact discovery",
      tooltip: tooltip(
        "Create identity, phone-number mapping, privacy-aware contact lookup, and a presence cache.",
        "Messaging identity is globally addressable while presence is extremely hot and ephemeral.",
        "Use this when account identity and connection ownership are distinct concerns.",
        ["Overprivileging contact APIs", "Persisting presence in a slow database"],
      ),
      learn_more_link: primerLinks.cache,
      component_added: [
        component("wa-idp", "identity_provider", "Identity Provider"),
        component("wa-contact", "microservice", "Contact Discovery Service"),
        component("wa-presence", "redis", "Presence Cache"),
      ],
      component_configured: [
        config("wa-idp", { phone_binding: true, device_rotation_checks: true }),
        config("wa-presence", { ttl_seconds: 15, pubsub: true }),
      ],
      connections_created: [
        wire("Mobile Session Gateway", "Identity Provider", "HTTPS", "Authenticate device"),
        wire("Mobile App", "Contact Discovery Service", "HTTPS", "Resolve contacts privately"),
        wire("Mobile Session Gateway", "Presence Cache", "TCP", "Track connection state"),
      ],
      operations: [
        "configure_identity_provider",
        "deploy_microservice",
        "create_cache_cluster",
        "set_cache_ttl",
        "enable_rate_limit",
      ],
      rollback_operations: [
        "disconnect_identity_provider",
        "undeploy_microservice",
        "delete_cache_cluster",
        "reset_cache_ttl",
        "disable_rate_limit",
      ],
    }),
    step({
      step_id: "whatsapp-03",
      title: "Queue messages and store encrypted history",
      tooltip: tooltip(
        "Publish messages to a durable stream, deliver asynchronously, and persist encrypted envelopes in a write-optimized store.",
        "The sender should get a fast acknowledgement even if the receiver is offline.",
        "Use this when end-user writes need durable acceptance before downstream delivery completes.",
        ["Blocking ack on push delivery", "No dead-letter queue for poison messages"],
      ),
      learn_more_link: primerLinks.messageQueues,
      component_added: [
        component("wa-msg-topic", "kafka", "Message Stream"),
        component("wa-delivery-workers", "batch_worker", "Delivery Workers"),
        component("wa-store", "cassandra", "Encrypted Message Store"),
      ],
      component_configured: [
        config("wa-msg-topic", { partitions: 1024, replication_factor: 3 }),
        config("wa-store", { consistency: "QUORUM", ttl_days: 30 }),
      ],
      connections_created: [
        wire("Mobile Session Gateway", "Message Stream", "Message queue", "Publish accepted messages"),
        wire("Message Stream", "Delivery Workers", "Message queue", "Drive recipient delivery"),
        wire("Delivery Workers", "Encrypted Message Store", "TCP", "Persist durable message history"),
      ],
      operations: [
        "create_kafka_topic",
        "schedule_batch_worker",
        "create_wide_column_cluster",
        "configure_ttl_policy",
        "attach_dead_letter_queue",
      ],
      rollback_operations: [
        "delete_kafka_topic",
        "cancel_batch_worker",
        "delete_wide_column_cluster",
        "remove_ttl_policy",
        "detach_dead_letter_queue",
      ],
    }),
    step({
      step_id: "whatsapp-04",
      title: "Deliver media, protect keys, and test mobile chaos",
      tooltip: tooltip(
        "Serve attachments from object storage and CDN, rotate keys, and simulate packet loss or reconnect storms.",
        "Realtime messaging fails under network churn and abuse before it fails under steady synthetic load.",
        "Use this to teach resilience under realistic mobile internet conditions.",
        ["Static rate limits", "Testing only on stable Wi-Fi"],
      ),
      learn_more_link: primerLinks.latencyNumbers,
      component_added: [
        component("wa-media", "object_storage", "Media Store"),
        component("wa-media-cdn", "cdn", "Media CDN"),
        component("wa-kms", "kms", "Key Management Service"),
      ],
      component_configured: [
        config("wa-media", { signed_urls: true, versioning: true }),
        config("wa-kms", { rotate_days: 30, envelope_encryption: true }),
      ],
      connections_created: [
        wire("Mobile App", "Media CDN", "HTTPS", "Fetch encrypted attachments"),
        wire("Media CDN", "Media Store", "HTTPS", "Retrieve misses"),
        wire("Mobile Session Gateway", "Key Management Service", "HTTPS", "Protect device keys"),
      ],
      operations: [
        "create_object_bucket",
        "attach_cdn_distribution",
        "attach_kms_key",
        "simulate_mobile_network_variability",
        "inject_packet_loss",
      ],
      rollback_operations: [
        "delete_object_bucket",
        "detach_cdn_distribution",
        "detach_kms_key",
        "reset_mobile_network_variability",
        "heal_packet_loss",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "YouTube",
  description:
    "Teaching scenario for creator ingest, transcoding, search, recommendation, and high-bandwidth video playback.",
  difficulty: "expert",
  design_patterns: ["Event Driven", "CQRS", "Factory", "Repository"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "500M",
    peak_requests_per_second: "2.1M",
    regions: "9 serving regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "250:1",
    peak_event_rate: "40K uploads/minute plus massive playback reads",
    hot_path: "video playback and recommendation refresh",
    bandwidth_profile: "extreme CDN egress with creator upload bursts",
  },
  architecture_steps: [
    step({
      step_id: "youtube-01",
      title: "Deploy playback edge and creator ingress",
      tooltip: tooltip(
        "Use DNS, CDN, and edge routing for viewers while keeping upload ingress separate for creators.",
        "Upload reliability, auth, and moderation need different controls than playback.",
        "Use this when one product has both heavyweight writes and lightweight public reads.",
        ["Sending uploads through the playback path", "No separation between upload and playback edges"],
      ),
      learn_more_link: primerLinks.cdn,
      component_added: [
        component("yt-dns", "dns", "Video Geo DNS"),
        component("yt-cdn", "cdn", "Video CDN"),
        component("yt-upload-api", "api_gateway", "Upload API"),
      ],
      component_configured: [
        config("yt-cdn", { adaptive_bitrate_cache: true, origin_shield: true }),
        config("yt-upload-api", { multipart_uploads: true, resumable: true }),
      ],
      connections_created: [
        wire("Browser", "Video Geo DNS", "HTTPS", "Resolve nearest playback edge"),
        wire("Video Geo DNS", "Video CDN", "HTTPS", "Serve viewers"),
        wire("Browser", "Upload API", "HTTPS", "Upload creator content"),
      ],
      operations: [
        "create_dns_zone",
        "attach_cdn_distribution",
        "set_origin_shield",
        "create_api_gateway",
        "enable_rate_limit",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "detach_cdn_distribution",
        "disable_origin_shield",
        "delete_api_gateway",
        "disable_rate_limit",
      ],
    }),
    step({
      step_id: "youtube-02",
      title: "Build upload storage and transcoding",
      tooltip: tooltip(
        "Persist masters in object storage and fan out transcoding jobs across worker fleets.",
        "One upload becomes many formats, thumbnails, subtitles, and regional variants.",
        "Use this when media ingest creates asynchronous derivative pipelines.",
        ["Treating transcoding as synchronous", "No storage tiering"],
      ),
      learn_more_link: primerLinks.taskQueues,
      component_added: [
        component("yt-origin", "object_storage", "Master Video Store"),
        component("yt-transcode", "workflow_orchestrator", "Transcode Workflow"),
        component("yt-workers", "batch_worker", "Media Workers"),
      ],
      component_configured: [
        config("yt-origin", { versioning: true, checksum_validation: true }),
        config("yt-transcode", { priorities: "live,shorts,longform", retries: 6 }),
      ],
      connections_created: [
        wire("Upload API", "Master Video Store", "HTTPS", "Store originals"),
        wire("Master Video Store", "Transcode Workflow", "HTTPS", "Emit ingest events"),
        wire("Transcode Workflow", "Media Workers", "Message queue", "Schedule jobs"),
      ],
      operations: [
        "create_object_bucket",
        "enable_versioned_storage",
        "configure_workflow_orchestrator",
        "schedule_batch_worker",
        "tier_media_assets",
      ],
      rollback_operations: [
        "delete_object_bucket",
        "disable_versioned_storage",
        "disable_workflow_orchestrator",
        "cancel_batch_worker",
        "restore_single_media_tier",
      ],
    }),
    step({
      step_id: "youtube-03",
      title: "Persist metadata, search, and playback sessions",
      tooltip: tooltip(
        "Store authoritative metadata separately from search indices and playback session state.",
        "Transactional metadata, search queries, and playback control all have different performance needs.",
        "Use this when metadata writes and discovery traffic diverge heavily.",
        ["Querying the metadata DB for full-text search", "No cache for manifest sessions"],
      ),
      learn_more_link: primerLinks.rdbms,
      component_added: [
        component("yt-meta-db", "postgresql", "Video Metadata DB"),
        component("yt-search", "elasticsearch", "Search Cluster"),
        component("yt-session-cache", "redis", "Playback Session Cache"),
      ],
      component_configured: [
        config("yt-meta-db", { multi_az: true, pitr: true }),
        config("yt-session-cache", { ttl_seconds: 300, geo_replication: true }),
      ],
      connections_created: [
        wire("Upload API", "Video Metadata DB", "TCP", "Persist metadata"),
        wire("Video Metadata DB", "Search Cluster", "HTTPS", "Project searchable documents"),
        wire("Video CDN", "Playback Session Cache", "TCP", "Store session state"),
      ],
      operations: [
        "create_sql_cluster",
        "enable_point_in_time_recovery",
        "create_search_index",
        "create_cache_cluster",
        "enable_session_cache",
      ],
      rollback_operations: [
        "delete_sql_cluster",
        "disable_point_in_time_recovery",
        "drop_search_index",
        "delete_cache_cluster",
        "disable_session_cache",
      ],
    }),
    step({
      step_id: "youtube-04",
      title: "Add recommendations and creator analytics",
      tooltip: tooltip(
        "Stream viewer events into recommendation services and analytical stores for creators.",
        "Discovery and creator reporting both depend on large event histories, but only one sits on the hot path.",
        "Use this when behavioral events need both online and offline consumers.",
        ["Refreshing recommendations only nightly", "Running creator reports on serving databases"],
      ),
      learn_more_link: primerLinks.messageQueues,
      component_added: [
        component("yt-events", "kafka", "Viewer Event Stream"),
        component("yt-features", "feature_store", "Recommendation Feature Store"),
        component("yt-ranker", "recommendation_engine", "Recommendation Ranker"),
        component("yt-lake", "data_lake", "Creator Analytics Lake"),
      ],
      component_configured: [
        config("yt-events", { partitions: 320, retention_days: 7 }),
        config("yt-ranker", { models: "home,related,shorts", online_experiments: true }),
      ],
      connections_created: [
        wire("Video CDN", "Viewer Event Stream", "Message queue", "Emit watch events"),
        wire("Viewer Event Stream", "Recommendation Feature Store", "Message queue", "Materialize features"),
        wire("Recommendation Feature Store", "Recommendation Ranker", "gRPC", "Serve ranking features"),
        wire("Viewer Event Stream", "Creator Analytics Lake", "Message queue", "Persist analytics"),
      ],
      operations: [
        "create_kafka_topic",
        "deploy_recommendation_ranker",
        "create_feature_store",
        "estimate_storage_growth",
        "simulate_flash_crowd",
      ],
      rollback_operations: [
        "delete_kafka_topic",
        "undeploy_recommendation_ranker",
        "delete_feature_store",
        "clear_storage_growth_estimate",
        "end_flash_crowd",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Amazon Marketplace",
  description:
    "Teaching scenario for large-scale catalog, search, inventory, checkout, and seller-facing analytics.",
  difficulty: "expert",
  design_patterns: ["Clean Architecture", "Saga", "CQRS", "Repository"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "420M",
    peak_requests_per_second: "3.3M",
    regions: "7 commerce regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "80:3",
    peak_event_rate: "12M inventory changes/day plus checkout spikes",
    hot_path: "product detail page and checkout",
    bandwidth_profile: "catalog reads dominate, checkout bursts during events",
  },
  architecture_steps: [
    step({
      step_id: "amazon-01",
      title: "Build the commerce edge",
      tooltip: tooltip(
        "Use CDN, DNS, and an edge proxy for browse-heavy catalog traffic.",
        "Marketplace traffic is browse-heavy with highly cacheable assets and semi-cacheable product fragments.",
        "Use this for retail systems with large anonymous browse traffic.",
        ["Serving product images from origin only", "Caching price-critical fragments too aggressively"],
      ),
      learn_more_link: primerLinks.cdn,
      component_added: [
        component("amz-dns", "dns", "Marketplace DNS"),
        component("amz-cdn", "cdn", "Commerce CDN"),
        component("amz-edge", "reverse_proxy", "Edge Reverse Proxy"),
      ],
      component_configured: [
        config("amz-cdn", { fragment_caching: true, image_optimization: true }),
        config("amz-edge", { tls_termination: true, request_coalescing: true }),
      ],
      connections_created: [
        wire("Browser", "Marketplace DNS", "HTTPS", "Resolve nearest edge"),
        wire("Marketplace DNS", "Commerce CDN", "HTTPS", "Route catalog traffic"),
        wire("Commerce CDN", "Edge Reverse Proxy", "HTTPS", "Forward dynamic misses"),
      ],
      operations: [
        "create_dns_zone",
        "attach_cdn_distribution",
        "attach_reverse_proxy",
        "configure_tls_termination",
        "configure_request_coalescing",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "detach_cdn_distribution",
        "detach_reverse_proxy",
        "disable_tls_termination",
        "disable_request_coalescing",
      ],
    }),
    step({
      step_id: "amazon-02",
      title: "Separate identity, cart, catalog, and search",
      tooltip: tooltip(
        "Isolate identity, cart state, the catalog database, and read-optimized search.",
        "Checkout-grade consistency differs from casual browse session data and search indexing.",
        "Use this when some commerce data needs strong consistency while other state can be cached or denormalized.",
        ["Keeping carts only in cache", "Joining many catalog tables on the hot read path"],
      ),
      learn_more_link: primerLinks.strongConsistency,
      component_added: [
        component("amz-auth", "identity_provider", "Account Identity"),
        component("amz-cart", "microservice", "Cart Service"),
        component("amz-catalog-db", "postgresql", "Catalog DB"),
        component("amz-search", "elasticsearch", "Product Search"),
      ],
      component_configured: [
        config("amz-auth", { step_up_for_checkout: true, sso: true }),
        config("amz-catalog-db", { shards: 32, read_replicas: 6 }),
      ],
      connections_created: [
        wire("Edge Reverse Proxy", "Account Identity", "HTTPS", "Authenticate account"),
        wire("Edge Reverse Proxy", "Cart Service", "gRPC", "Mutate cart state"),
        wire("Catalog DB", "Product Search", "HTTPS", "Project search documents"),
      ],
      operations: [
        "configure_identity_provider",
        "deploy_microservice",
        "create_sql_cluster",
        "create_search_index",
        "add_covering_index",
      ],
      rollback_operations: [
        "disconnect_identity_provider",
        "undeploy_microservice",
        "delete_sql_cluster",
        "drop_search_index",
        "drop_covering_index",
      ],
    }),
    step({
      step_id: "amazon-03",
      title: "Coordinate inventory, order, and payment saga",
      tooltip: tooltip(
        "Use an order workflow to reserve inventory, authorize payment, and publish order lifecycle events.",
        "Checkout spans inventory, payment, tax, fraud, and shipment domains.",
        "Use this when strong business guarantees are needed without one monolithic transaction.",
        ["Locking inventory globally", "No compensation if payment succeeds after reservation expiry"],
      ),
      learn_more_link: primerLinks.capTheorem,
      component_added: [
        component("amz-order-saga", "workflow_orchestrator", "Order Saga Coordinator"),
        component("amz-inventory", "microservice", "Inventory Service"),
        component("amz-events", "kafka", "Order Event Stream"),
      ],
      component_configured: [
        config("amz-order-saga", { compensations: true, fraud_timeout_seconds: 45 }),
        config("amz-inventory", { optimistic_reservation: true, partition_key: "sku" }),
      ],
      connections_created: [
        wire("Cart Service", "Order Saga Coordinator", "gRPC", "Submit checkout"),
        wire("Order Saga Coordinator", "Inventory Service", "gRPC", "Reserve stock"),
        wire("Order Saga Coordinator", "Order Event Stream", "Message queue", "Publish order lifecycle"),
      ],
      operations: [
        "configure_workflow_orchestrator",
        "deploy_microservice",
        "create_kafka_topic",
        "enable_outbox_pattern",
        "create_service_account",
      ],
      rollback_operations: [
        "disable_workflow_orchestrator",
        "undeploy_microservice",
        "delete_kafka_topic",
        "disable_outbox_pattern",
        "delete_service_account",
      ],
    }),
    step({
      step_id: "amazon-04",
      title: "Add recommendations, seller analytics, and event-day validation",
      tooltip: tooltip(
        "Stream browse events into recommendation services and analytical stores, then validate the design under flash-sale demand.",
        "Retail architectures must survive high-conversion traffic without sacrificing checkout reliability.",
        "Use this when both personalization and event-day resilience matter.",
        ["Only load-testing browse pages", "No write-capacity protection for inventory hot keys"],
      ),
      learn_more_link: primerLinks.latencyNumbers,
      component_added: [
        component("amz-features", "feature_store", "Retail Feature Store"),
        component("amz-recs", "recommendation_engine", "Merchandising Ranker"),
        component("amz-lake", "data_lake", "Seller Data Lake"),
      ],
      component_configured: [
        config("amz-recs", { online_serving: true, re_rank_search: true }),
        config("amz-lake", { retention_days: 730, compression: true }),
      ],
      connections_created: [
        wire("Edge Reverse Proxy", "Retail Feature Store", "Message queue", "Publish browse events"),
        wire("Retail Feature Store", "Merchandising Ranker", "gRPC", "Serve ranking features"),
        wire("Order Event Stream", "Seller Data Lake", "Message queue", "Persist order history"),
      ],
      operations: [
        "create_feature_store",
        "deploy_recommendation_ranker",
        "estimate_storage_growth",
        "simulate_peak_load",
        "simulate_auto_scaling_cost",
      ],
      rollback_operations: [
        "delete_feature_store",
        "undeploy_recommendation_ranker",
        "clear_storage_growth_estimate",
        "end_peak_load_simulation",
        "clear_auto_scaling_cost_simulation",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Netflix",
  description:
    "Teaching scenario for video distribution, playback control, recommendation loops, and cost-aware multi-region streaming.",
  difficulty: "expert",
  design_patterns: ["Event Driven", "Saga", "Strategy", "Repository"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "260M",
    peak_requests_per_second: "1.6M",
    regions: "8 serving regions plus global edge",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "300:1",
    peak_event_rate: "85 Tbps video egress equivalent",
    hot_path: "playback session negotiation and adaptive bitrate delivery",
    bandwidth_profile: "extreme CDN and origin traffic",
  },
  architecture_steps: [
    step({
      step_id: "netflix-01",
      title: "Build the global streaming edge",
      tooltip: tooltip(
        "Put geo DNS, CDN, and global routing in front of playback traffic.",
        "Streaming systems win or lose on edge capacity, origin shielding, and path selection.",
        "Use this for high-bandwidth media products with worldwide audiences.",
        ["Serving hot media from origin", "Ignoring regional ISP variability"],
      ),
      learn_more_link: primerLinks.cdn,
      component_added: [
        component("netflix-dns", "dns", "Playback Geo DNS"),
        component("netflix-cdn", "cdn", "Streaming CDN"),
        component("netflix-router", "layer7_load_balancer", "Global Playback Router"),
      ],
      component_configured: [
        config("netflix-cdn", { cache_key: "asset+codec+region", origin_shield: true }),
        config("netflix-router", { geo_latency_routing: true, failover_mode: "regional" }),
      ],
      connections_created: [
        wire("Smart TV", "Playback Geo DNS", "HTTPS", "Resolve nearest streaming edge"),
        wire("Playback Geo DNS", "Streaming CDN", "HTTPS", "Send clients to edge"),
        wire("Streaming CDN", "Global Playback Router", "HTTPS", "Forward misses"),
      ],
      operations: [
        "create_dns_zone",
        "configure_geo_dns",
        "attach_cdn_distribution",
        "set_origin_shield",
        "configure_global_load_balancing",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "disable_geo_dns",
        "detach_cdn_distribution",
        "disable_origin_shield",
        "disable_global_load_balancing",
      ],
    }),
    step({
      step_id: "netflix-02",
      title: "Deploy device-aware APIs and playback control",
      tooltip: tooltip(
        "Use an API gateway, BFFs, identity, catalog, manifest generation, and a playback session cache.",
        "Different devices need different payloads, while entitlement and manifest logic sit on the control plane.",
        "Use this when one backend serves mobile, web, and TV clients with subscription rules.",
        ["Letting every client call many services", "No cache for short-lived playback state"],
      ),
      learn_more_link: primerLinks.applicationLayer,
      component_added: [
        component("netflix-api", "api_gateway", "Consumer API Gateway"),
        component("netflix-bff-tv", "bff_service", "TV Playback BFF"),
        component("netflix-auth", "identity_provider", "Identity Provider"),
        component("netflix-catalog", "microservice", "Catalog Service"),
        component("netflix-manifest", "microservice", "Manifest Generator"),
        component("netflix-cache", "redis", "Playback Session Cache"),
      ],
      component_configured: [
        config("netflix-api", { grpc_downstream: true, oauth: true }),
        config("netflix-cache", { ttl_seconds: 600, geo_replication: true }),
      ],
      connections_created: [
        wire("Global Playback Router", "Consumer API Gateway", "HTTPS", "Ingress for session setup"),
        wire("Consumer API Gateway", "Identity Provider", "HTTPS", "Authenticate and authorize"),
        wire("Consumer API Gateway", "Manifest Generator", "gRPC", "Generate playback sessions"),
      ],
      operations: [
        "create_api_gateway",
        "configure_bff_service",
        "configure_identity_provider",
        "deploy_microservice",
        "enable_session_cache",
      ],
      rollback_operations: [
        "delete_api_gateway",
        "delete_bff_service",
        "disconnect_identity_provider",
        "undeploy_microservice",
        "disable_session_cache",
      ],
    }),
    step({
      step_id: "netflix-03",
      title: "Create media pipeline and recommendations",
      tooltip: tooltip(
        "Store master assets in object storage, transcode them asynchronously, and feed recommendations from playback events.",
        "Streaming and recommendation loops are distinct but tightly coupled by user behavior.",
        "Use this when uploads create many renditions and engagement drives ranking.",
        ["Publishing incomplete renditions", "Training recommendations only in batch"],
      ),
      learn_more_link: primerLinks.taskQueues,
      component_added: [
        component("netflix-origin", "object_storage", "Origin Asset Store"),
        component("netflix-transcode", "workflow_orchestrator", "Transcoding Workflow"),
        component("netflix-events", "kafka", "Playback Event Stream"),
        component("netflix-recs", "recommendation_engine", "Recommendation Ranker"),
      ],
      component_configured: [
        config("netflix-origin", { versioning: true, lifecycle: "hot->warm->archive" }),
        config("netflix-events", { partitions: 256, retention_hours: 48 }),
      ],
      connections_created: [
        wire("Origin Asset Store", "Transcoding Workflow", "HTTPS", "Emit ingest events"),
        wire("Transcoding Workflow", "Streaming CDN", "HTTPS", "Publish completed renditions"),
        wire("Playback Event Stream", "Recommendation Ranker", "Message queue", "Update ranking features"),
      ],
      operations: [
        "create_object_bucket",
        "configure_workflow_orchestrator",
        "create_kafka_topic",
        "deploy_recommendation_ranker",
        "serve_online_features",
      ],
      rollback_operations: [
        "delete_object_bucket",
        "disable_workflow_orchestrator",
        "delete_kafka_topic",
        "undeploy_recommendation_ranker",
        "stop_online_feature_serving",
      ],
    }),
    step({
      step_id: "netflix-04",
      title: "Deploy active-active regions and observe QoE",
      tooltip: tooltip(
        "Replicate playback control-plane data across regions, test failover, and overlay QoE with egress cost.",
        "Streaming quality must be measured across user experience, resilience, and economics.",
        "Use this when regional isolation and egress cost materially affect the design.",
        ["Assuming synchronous global writes everywhere", "Watching QoE without cost context"],
      ),
      learn_more_link: primerLinks.failOver,
      component_added: [
        component("netflix-region-us", "cloud_region", "US Playback Region"),
        component("netflix-region-eu", "cloud_region", "EU Playback Region"),
        component("netflix-qoe", "metrics_collector", "QoE Metrics Collector"),
      ],
      component_configured: [
        config("netflix-region-eu", { warm_capacity_percent: 70, failover_ready: true }),
        config("netflix-qoe", { metrics: "startup_time,rebuffer_ratio,egress_cost" }),
      ],
      connections_created: [
        wire("US Playback Region", "EU Playback Region", "HTTPS", "Replicate playback state"),
        wire("Global Playback Router", "EU Playback Region", "HTTPS", "Failover route"),
        wire("QoE Metrics Collector", "Global Playback Router", "HTTPS", "Expose burn and cost overlays"),
      ],
      operations: [
        "add_region",
        "enable_replication",
        "configure_active_active_topology",
        "simulate_failover",
        "estimate_bandwidth_cost",
      ],
      rollback_operations: [
        "remove_region",
        "disable_replication",
        "disable_active_active_topology",
        "cancel_failover",
        "clear_bandwidth_cost_estimate",
      ],
    }),
  ],
});

systemExamples.push({
  schema_version: scenarioVersion,
  system_name: "Uber",
  description:
    "Teaching scenario for geo-aware dispatch, real-time location, trip orchestration, and incident-tolerant pricing.",
  difficulty: "expert",
  design_patterns: ["Event Driven", "Saga", "Strategy", "Hexagonal"],
  description_mode: "teaching-estimate",
  scale: {
    simulated_daily_active_users: "140M",
    peak_requests_per_second: "1.1M",
    regions: "12 metro-aware regions",
    availability_target: "99.99%",
  },
  traffic_estimation: {
    read_write_ratio: "18:7",
    peak_event_rate: "18M location pings/minute",
    hot_path: "real-time dispatch and ETA updates",
    bandwidth_profile: "mobile-heavy with unstable network quality",
  },
  architecture_steps: [
    step({
      step_id: "uber-01",
      title: "Create geo-aware ingress",
      tooltip: tooltip(
        "Use geo DNS and regional mobile gateways to steer riders and drivers to the nearest metro stack.",
        "Dispatch accuracy depends on keeping control loops close to moving vehicles.",
        "Use this for location-sensitive systems with metro-local workloads.",
        ["Routing every trip to one global region", "No metro-level failover boundary"],
      ),
      learn_more_link: primerLinks.dns,
      component_added: [
        component("uber-dns", "dns", "Ride Geo DNS"),
        component("uber-lb", "layer4_load_balancer", "Realtime Load Balancer"),
        component("uber-edge", "reverse_proxy", "Regional Mobile Gateway"),
      ],
      component_configured: [
        config("uber-dns", { geo_routing: true, metro_stickiness: true }),
        config("uber-lb", { protocol: "TCP+TLS", health_checks: "every_3s" }),
      ],
      connections_created: [
        wire("Mobile App", "Ride Geo DNS", "HTTPS", "Resolve metro endpoint"),
        wire("Ride Geo DNS", "Regional Mobile Gateway", "HTTPS", "Send users to local ingress"),
        wire("Regional Mobile Gateway", "Realtime Load Balancer", "TCP", "Low-latency handoff"),
      ],
      operations: [
        "create_dns_zone",
        "configure_geo_dns",
        "create_layer4_load_balancer",
        "attach_reverse_proxy",
        "enforce_tls",
      ],
      rollback_operations: [
        "delete_dns_zone",
        "disable_geo_dns",
        "delete_layer4_load_balancer",
        "detach_reverse_proxy",
        "allow_plaintext_for_lab",
      ],
    }),
    step({
      step_id: "uber-02",
      title: "Introduce trip APIs and realtime location",
      tooltip: tooltip(
        "Create auth, trip APIs, socket gateways, and a location event stream backed by a hot cache.",
        "Realtime location drives dispatch, ETA, and fraud checks while auth gates every mutation.",
        "Use this when multiple actors operate on the same moving state.",
        ["Handling location pings synchronously", "No back-pressure during surges"],
      ),
      learn_more_link: primerLinks.backPressure,
      component_added: [
        component("uber-api", "api_gateway", "Trip API Gateway"),
        component("uber-auth", "auth_server", "Mobility Auth Service"),
        component("uber-trip", "microservice", "Trip Service"),
        component("uber-socket", "backend_service", "Realtime Session Gateway"),
        component("uber-location-topic", "kafka", "Location Event Stream"),
        component("uber-location-cache", "redis", "Live Location Cache"),
      ],
      component_configured: [
        config("uber-api", { websocket_upgrade: true, rate_limit_rps: "900000" }),
        config("uber-location-cache", { ttl_seconds: 20, geo_index: true }),
      ],
      connections_created: [
        wire("Regional Mobile Gateway", "Trip API Gateway", "HTTPS", "API entry point"),
        wire("Mobile App", "Realtime Session Gateway", "WebSockets", "Bi-directional location updates"),
        wire("Realtime Session Gateway", "Location Event Stream", "Message queue", "Publish location pings"),
      ],
      operations: [
        "create_api_gateway",
        "create_auth_server",
        "deploy_backend_service",
        "create_kafka_topic",
        "create_cache_cluster",
      ],
      rollback_operations: [
        "delete_api_gateway",
        "delete_auth_server",
        "undeploy_backend_service",
        "delete_kafka_topic",
        "delete_cache_cluster",
      ],
    }),
    step({
      step_id: "uber-03",
      title: "Build dispatch, pricing, and trip saga",
      tooltip: tooltip(
        "Consume live locations in a dispatch engine, query geo-aware supply, and coordinate pricing or payment as a saga.",
        "Dispatch is the business core and its workflow spans services that cannot share one transaction.",
        "Use this when matching depends on near-real-time geospatial state.",
        ["Global transaction across dispatch and payments", "Running geospatial queries on the trip store"],
      ),
      learn_more_link: primerLinks.capTheorem,
      component_added: [
        component("uber-dispatch", "workflow_orchestrator", "Dispatch Engine"),
        component("uber-geo-db", "document_store", "Geospatial Driver Store"),
        component("uber-pricing", "microservice", "Pricing Service"),
        component("uber-saga", "workflow_orchestrator", "Trip Saga Coordinator"),
      ],
      component_configured: [
        config("uber-dispatch", { matching_strategy: "nearest+quality+acceptance_score" }),
        config("uber-pricing", { surge_strategy: "zone_supply_ratio", recalculation_seconds: 30 }),
      ],
      connections_created: [
        wire("Location Event Stream", "Dispatch Engine", "Message queue", "Consume live supply"),
        wire("Dispatch Engine", "Geospatial Driver Store", "HTTPS", "Query nearby drivers"),
        wire("Trip Service", "Trip Saga Coordinator", "gRPC", "Drive trip lifecycle"),
      ],
      operations: [
        "configure_workflow_orchestrator",
        "create_document_store",
        "deploy_microservice",
        "seed_geo_partition",
        "enable_outbox_pattern",
      ],
      rollback_operations: [
        "disable_workflow_orchestrator",
        "delete_document_store",
        "undeploy_microservice",
        "clear_geo_partition",
        "disable_outbox_pattern",
      ],
    }),
    step({
      step_id: "uber-04",
      title: "Deploy multi-region recovery and abuse controls",
      tooltip: tooltip(
        "Replicate metro state, simulate failover, and add SIEM-backed abuse detection.",
        "Mobility systems must degrade by city or region instead of failing globally.",
        "Use this when local disasters or provider outages should not halt the platform.",
        ["Manual-only region recovery", "No anomaly telemetry for account abuse"],
      ),
      learn_more_link: primerLinks.failOver,
      component_added: [
        component("uber-primary", "cloud_region", "Primary Dispatch Region"),
        component("uber-secondary", "cloud_region", "Secondary Dispatch Region"),
        component("uber-siem", "siem_sink", "Fraud and Abuse SIEM"),
      ],
      component_configured: [
        config("uber-secondary", { warm_standby: true, replicated_queues: true }),
        config("uber-siem", { correlation_rules: "credential_stuffing,location_spoofing" }),
      ],
      connections_created: [
        wire("Primary Dispatch Region", "Secondary Dispatch Region", "HTTPS", "Replicate trip state"),
        wire("Ride Geo DNS", "Secondary Dispatch Region", "HTTPS", "Failover route"),
        wire("Mobility Auth Service", "Fraud and Abuse SIEM", "HTTPS", "Forward security events"),
      ],
      operations: [
        "add_region",
        "configure_active_passive_topology",
        "enable_replication",
        "simulate_failover",
        "deploy_bot_detection",
      ],
      rollback_operations: [
        "remove_region",
        "disable_active_passive_topology",
        "disable_replication",
        "cancel_failover",
        "disable_bot_detection",
      ],
    }),
  ],
});

export const uiAnimationIdeas = [
  "Protocol-aware cable pulses where HTTP appears as steady packets, Kafka as burst trains, and WebSockets as continuous streams.",
  "Node wake-up animation that expands from a cold gray outline into a provider-colored live component when provisioned.",
  "Containment zoom transitions for regions, zones, clusters, shards, and pods so hierarchy feels spatially coherent.",
  "Traffic heat shimmer on overloaded nodes with color moving from cool blue to warning amber to critical red.",
  "Failure blast-radius ring that expands across dependent services when a region or database outage is injected.",
  "Rollback rewind animation that retracts cables and fades component state in reverse command order.",
  "Query plan animation that highlights index use, table scans, joins, and shard routing step by step.",
  "CDN cache-hit sparkles on edge nodes and long miss-path streaks back to origin to teach cache effectiveness.",
  "Auto-scaling ghost nodes that preview potential capacity expansion before actual provisioning occurs.",
  "Cost drip overlay where expensive paths accumulate animated spend markers over time.",
  "Trace waterfall playback that fans spans from ingress through async queues and background workers.",
  "Packet loss visualization using skipped pulse segments and jitter on affected network links.",
  "Queue backlog animation where message stacks grow vertically and collapse as consumers catch up.",
  "Live replication lag meter drawn as a stretching tether between primary and replica databases.",
  "Security shield layer that brightens around components when WAF, RBAC, or TLS policies are enabled.",
  "AI assistant suggestion beam that briefly highlights the recommended component or connection path.",
  "Interview mode timer pressure animation with subtle border acceleration and checkpoint markers.",
  "Version diff animation that color-codes added, modified, and removed components between design commits.",
  "Reel or video streaming visualization with bitrate bars responding to simulated bandwidth conditions.",
  "Connection hover tooltips that pin themselves near the cable midpoint and follow rerouted edges smoothly.",
];

export const validationRules = [
  "Warn when a public-facing service has no load balancer or gateway in front of it.",
  "Flag any database with write traffic but no backup or point-in-time recovery plan.",
  "Warn when a single-region deployment serves global traffic without failover routing.",
  "Flag single points of failure for auth, DNS, routing, or primary database components.",
  "Warn when a write-heavy workload uses only one cache tier and no durable store.",
  "Reject direct client access to internal databases or queues.",
  "Warn when media-heavy applications have no CDN or edge cache.",
  "Flag missing dead-letter queues on business-critical asynchronous flows.",
  "Warn when a queue has consumers but no retry or backoff policy.",
  "Reject a sharded database design that omits a shard key or routing layer.",
  "Warn when a shard key is based on a known hot-spot dimension such as celebrity ID or region only.",
  "Flag relational write paths that scale only through replicas rather than partitioning or queue decoupling.",
  "Warn when a search service is fed from the serving database without indexing.",
  "Reject synchronous fanout to large audiences without buffering or queueing.",
  "Warn when a session-based realtime product lacks sticky routing or session ownership.",
  "Flag a collaborative editor without conflict resolution semantics.",
  "Warn when a payment or checkout workflow lacks compensating transactions or saga semantics.",
  "Flag object storage being used as a transactional metadata source of truth.",
  "Warn when the same database is used for both OLTP and heavy analytics without isolation.",
  "Flag queries missing indices when the scenario models high cardinality lookups or ordered scans.",
  "Warn when auth tokens are long-lived and used by public clients without rotation.",
  "Reject plaintext public traffic for endpoints that handle credentials, payments, or personal data.",
  "Warn when RBAC or audit logging is missing for administrative surfaces.",
  "Flag WAF absence on high-risk public APIs that simulate abuse or credential attacks.",
  "Warn when secrets are embedded directly in service configuration instead of a vault or KMS.",
  "Flag external file sharing flows without signed URLs or expiry semantics.",
  "Warn when a multi-region design assumes zero replication lag for mutable data.",
  "Reject active-active writes on stores that the scenario marks as conflict-intolerant without merge logic.",
  "Warn when a cache invalidation path does not exist for mutable read models.",
  "Flag read-heavy systems that query primary stores before checking cache or materialized views.",
  "Warn when cache TTL is longer than freshness tolerance for timelines, prices, or entitlements.",
  "Flag asynchronous event streams without idempotent consumer assumptions.",
  "Warn when a system depends on at-least-once delivery but lacks dedupe or outbox patterns.",
  "Reject network topologies that expose private subnets directly to the internet without a gateway or firewall.",
  "Warn when NAT or egress routing is missing for private workloads that call external APIs.",
  "Flag missing observability on critical paths: ingress, data stores, queues, and background workers.",
  "Warn when SLOs are defined without corresponding alerts or burn-rate policies.",
  "Flag cost-inefficient designs where global CDN miss traffic overwhelms origin economics.",
  "Warn when auto-scaling exists without capacity limits, cooldowns, or budget constraints.",
  "Reject training or inference architectures that attach GPU workloads without any cost visibility.",
  "Warn when mobile-focused designs assume stable bandwidth and no packet loss behavior.",
  "Flag long-running batch or export jobs on the same nodes that serve latency-sensitive traffic.",
  "Warn when data residency requirements conflict with replica placement.",
  "Reject designs that let public clients publish directly to internal event buses.",
  "Warn when API gateways become monoliths by containing complex business workflows.",
  "Flag missing service discovery when microservices are scaled dynamically.",
  "Warn when schema migrations are destructive and no rollback path is defined.",
  "Flag labs that have forward operations but no reverse rollback commands.",
  "Warn when interview-mode scoring cannot explain which validation rules were triggered.",
  "Flag scenario steps whose learn-more links do not map to a valid teaching topic.",
];

export const gamificationIdeas = [
  "Architect score composed of scalability, resilience, security, cost, and clarity subscores.",
  "Progressive lab tiers that unlock once the learner satisfies validation rules without hints.",
  "Time-boxed interview mode with separate scores for speed and final architecture quality.",
  "Badges for eliminating single points of failure, improving cache hit ratio, or reducing blast radius.",
  "Chaos mastery achievements for recovering within the scenario recovery budget.",
  "Provider-neutral challenge medals for completing the same scenario on AWS, GCP, and Azure equivalents.",
  "Cost efficiency stars awarded when the learner meets SLOs under a budget ceiling.",
  "Trade-off journals where the learner earns points for recording and defending architectural decisions.",
  "Daily architecture drills with streak tracking and adaptive difficulty.",
  "Scenario branches where a learner unlocks harder traffic and failure variants after a clean run.",
  "Peer review points for accurately spotting flaws in another saved architecture.",
  "Instructor checkpoints that grade how well the learner justifies sharding, caching, or multi-region choices.",
  "Replay trophies for completing a full forward and backward simulation without validation errors.",
  "Red-team missions where the learner must defend the architecture from SQL injection, DDoS, or token theft.",
  "Blue-team missions where the learner restores the system after chaos injections under a recovery timer.",
  "Architecture diff challenges that reward the smallest effective fix from a broken baseline.",
  "Seasonal leaderboards per scenario, weighted to discourage hint overuse.",
  "Component discovery collection book that tracks which infrastructure patterns a learner has used successfully.",
  "Narrated boss battles representing launches, outages, celebrity events, or Black Friday load.",
  "Mentor comments that evolve from explicit hints to terse review notes as the learner progresses.",
];

export const platformCounts = {
  architectureLayers: platformArchitecture.length,
  toolbarComponents: toolbarCategories.reduce(
    (count, category) => count + category.components.length,
    0,
  ),
  simulationOperations: simulationOperationGroups.reduce(
    (count, group) => count + group.operations.length,
    0,
  ),
  rollbackOperations: rollbackOperationGroups.reduce(
    (count, group) => count + group.operations.length,
    0,
  ),
  learnMoreArticles: learnMoreArticles.length,
  scenarioExamples: systemExamples.length,
};

const assertCount = (label: string, actual: number, expected: number) => {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected} but received ${actual}`);
  }
};

assertCount("Toolbar components", platformCounts.toolbarComponents, 100);
assertCount("Simulation operations", platformCounts.simulationOperations, 200);
assertCount("Rollback operations", platformCounts.rollbackOperations, 200);
assertCount("Learn-more articles", platformCounts.learnMoreArticles, 100);
assertCount("Scenario examples", platformCounts.scenarioExamples, 10);
