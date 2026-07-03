"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "../components/ThemeProvider";
import {
  BookOpen,
  CheckSquare,
  Cpu,
  Database,
  HelpCircle,
  Home,
  Key,
  Layers,
  Moon,
  Search,
  Shield,
  Sun,
  Terminal,
  Clock,
  ExternalLink,
} from "lucide-react";

// Checklist items from docs/SECOND_PROMPT_IMPLEMENTATION.md
const CHECKLIST_SECTIONS = [
  {
    id: "arch-design",
    title: "1. Infrastructure Architecture Design",
    items: [
      "Design the overall IT infrastructure architecture for the organization.",
      "Define logical, physical, and technical architecture models.",
      "Develop blueprints and reference architectures.",
      "Define infrastructure building blocks (servers, networks, storage, middleware).",
      "Ensure infrastructure scalability and modularity.",
    ],
  },
  {
    id: "modeling",
    title: "2. Infrastructure Modeling",
    items: [
      "Create architecture diagrams and models (UML, ArchiMate, etc.).",
      "Model infrastructure components and relationships.",
      "Define deployment models (on-premise, cloud, hybrid).",
      "Model capacity and performance scenarios.",
      "Maintain technical architecture documentation.",
    ],
  },
  {
    id: "standards",
    title: "3. Technology Selection and Standards",
    items: [
      "Evaluate hardware and software technologies.",
      "Select platforms, operating systems, virtualization solutions, and cloud services.",
      "Define technical standards and guidelines.",
      "Establish technology roadmaps.",
      "Recommend new technologies and innovations.",
    ],
  },
  {
    id: "strategy",
    title: "4. Infrastructure Strategy and Planning",
    items: [
      "Develop long-term infrastructure strategy.",
      "Align infrastructure with business objectives.",
      "Define infrastructure transformation plans.",
      "Create IT infrastructure roadmaps.",
      "Plan capacity and resource requirements.",
    ],
  },
  {
    id: "integration",
    title: "5. System Integration and Interoperability",
    items: [
      "Ensure compatibility between systems and platforms.",
      "Design integration architectures.",
      "Manage middleware and communication layers.",
      "Guarantee interoperability between applications and infrastructure.",
    ],
  },
  {
    id: "security",
    title: "6. Security Architecture",
    items: [
      "Define infrastructure security policies and standards.",
      "Integrate security mechanisms (firewalls, encryption, IAM).",
      "Ensure compliance with regulations and governance frameworks.",
      "Perform risk analysis and mitigation planning.",
      "Design secure network architectures.",
    ],
  },
  {
    id: "performance",
    title: "7. Performance and Availability Management",
    items: [
      "Define performance requirements and KPIs.",
      "Optimize system performance and resource utilization.",
      "Ensure high availability and fault tolerance.",
      "Implement load balancing and redundancy strategies.",
      "Monitor infrastructure health and performance metrics.",
    ],
  },
  {
    id: "oversight",
    title: "8. Infrastructure Implementation Oversight",
    items: [
      "Supervise deployment of infrastructure solutions.",
      "Validate implementation against architecture design.",
      "Provide technical guidance to engineering teams.",
      "Conduct architecture reviews and audits.",
      "Support migration and transformation projects.",
    ],
  },
  {
    id: "cloud",
    title: "9. Cloud and Virtualization Architecture",
    items: [
      "Design cloud infrastructure architectures (AWS, Azure, GCP).",
      "Plan hybrid or multi-cloud environments.",
      "Implement virtualization and containerization architectures.",
      "Manage cloud scalability and elasticity.",
    ],
  },
  {
    id: "disaster",
    title: "10. Disaster Recovery and Business Continuity",
    items: [
      "Design disaster recovery architectures.",
      "Define backup and recovery strategies.",
      "Ensure business continuity planning.",
      "Test failover and recovery mechanisms.",
    ],
  },
  {
    id: "governance",
    title: "11. Governance and Compliance",
    items: [
      "Define architecture governance processes.",
      "Ensure compliance with enterprise architecture frameworks.",
      "Maintain architecture documentation and standards.",
      "Conduct architecture reviews and change assessments.",
    ],
  },
  {
    id: "collaboration",
    title: "12. Collaboration and Stakeholder Communication",
    items: [
      "Work with network engineers, system administrators, and developers.",
      "Collaborate with security teams and business stakeholders.",
      "Provide technical consulting and architectural guidance.",
      "Participate in enterprise architecture boards.",
    ],
  },
  {
    id: "optimization",
    title: "13. Infrastructure Optimization",
    items: [
      "Identify performance bottlenecks.",
      "Improve cost efficiency of infrastructure.",
      "Optimize resource utilization and capacity.",
      "Recommend architecture improvements.",
    ],
  },
  {
    id: "lifecycle",
    title: "14. Lifecycle Management",
    items: [
      "Manage infrastructure lifecycle (design → deployment → operation → retirement).",
      "Plan system upgrades and migrations.",
      "Maintain configuration management and asset inventory.",
      "Manage technology obsolescence.",
    ],
  },
  {
    id: "documentation",
    title: "15. Documentation and Architecture Artifacts",
    items: [
      "Maintain architecture diagrams and technical documentation.",
      "Produce architecture decision records (ADRs).",
      "Document technical standards and policies.",
      "Maintain infrastructure catalogs and repositories.",
    ],
  },
];

export default function DocsPage() {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("guide");
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Load checklist progress from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("asd_docs_checklist_progress");
      if (saved) {
        try {
          setCompletedItems(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleToggleCheck = (itemId: string) => {
    const next = { ...completedItems, [itemId]: !completedItems[itemId] };
    setCompletedItems(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("asd_docs_checklist_progress", JSON.stringify(next));
    }
  };

  // Checklist Calculations
  const totalItems = useMemo(() => {
    return CHECKLIST_SECTIONS.reduce((acc, sec) => acc + sec.items.length, 0);
  }, []);

  const completedCount = useMemo(() => {
    return Object.values(completedItems).filter(Boolean).length;
  }, [completedItems]);

  const completionPercent = useMemo(() => {
    if (totalItems === 0) return 0;
    return Math.round((completedCount / totalItems) * 100);
  }, [completedCount, totalItems]);

  const filteredChecklist = useMemo(() => {
    if (!searchQuery) return CHECKLIST_SECTIONS;
    const query = searchQuery.toLowerCase();
    return CHECKLIST_SECTIONS.map((sec) => {
      const matchingItems = sec.items.filter((item) =>
        item.toLowerCase().includes(query)
      );
      if (sec.title.toLowerCase().includes(query) || matchingItems.length > 0) {
        return {
          ...sec,
          items: matchingItems.length > 0 ? matchingItems : sec.items,
        };
      }
      return null;
    }).filter((sec): sec is typeof CHECKLIST_SECTIONS[number] => sec !== null);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-panel/85 backdrop-blur-xl px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-cyan-500" />
            <span className="font-semibold tracking-tight text-lg">System Designer Docs</span>
          </Link>
          <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider">
            Sandbox Modeler
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/modeler"
            className="text-sm font-medium hover:text-cyan-500 transition"
          >
            Go to Modeler
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-full border border-line p-2.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto min-h-0">
        {/* Sidebar Nav */}
        <aside className="w-80 border-r border-line bg-panel/50 p-6 hidden md:flex flex-col gap-6 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search guide & checklist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-line bg-background/60 text-sm outline-none focus:border-cyan-500 transition"
            />
          </div>

          <nav className="flex flex-col gap-1 text-sm font-medium">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-slate-400 mb-2 px-3">
              Guides & Reference
            </p>
            <button
              onClick={() => setActiveSection("guide")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                activeSection === "guide"
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-2 border-cyan-500"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Keyboard Modeler Guide
            </button>
            <button
              onClick={() => setActiveSection("formulas")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                activeSection === "formulas"
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-2 border-cyan-500"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80"
              }`}
            >
              <Cpu className="h-4 w-4" />
              Simulation Metrics formulas
            </button>
            <button
              onClick={() => setActiveSection("sandbox")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                activeSection === "sandbox"
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-2 border-cyan-500"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80"
              }`}
            >
              <Database className="h-4 w-4" />
              Local Storage DB & Security
            </button>

            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-slate-400 mt-6 mb-2 px-3">
              Architect Checklist
            </p>
            <button
              onClick={() => setActiveSection("checklist")}
              className={`flex items-center justify-between px-3 py-2 rounded-xl transition ${
                activeSection === "checklist"
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-2 border-cyan-500"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CheckSquare className="h-4 w-4" />
                Duties Checklist
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold">
                {completionPercent}%
              </span>
            </button>
          </nav>

          {/* Progress Card */}
          <div className="mt-auto rounded-3xl border border-line bg-panel p-4 shadow-sm flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-500">CHECKLIST PROGRESS</p>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex items-center justify-center rounded-full bg-cyan-500/10 border-2 border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                {completionPercent}%
              </div>
              <div>
                <p className="text-sm font-semibold">{completedCount} / {totalItems}</p>
                <p className="text-xs text-slate-500">Tasks Completed</p>
              </div>
            </div>
            <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto max-h-[calc(100vh-64px)]">
          <div className="max-w-4xl mx-auto space-y-12 pb-24">
            
            {activeSection === "guide" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Keyboard Modeler Guide</h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    Artificial System Designer supports rich, keyboard-first operations. Master these keystrokes and controls to rapidly sketch and simulate high-performance cloud topologies.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Terminal className="text-cyan-500 h-5 w-5" />
                      Editor Modes & Tool Hotkeys
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex justify-between items-center py-1 border-b border-line/50">
                        <span>Select Mode (Pointer)</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">V</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1 border-b border-line/50">
                        <span>Add Node Tool</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">N</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1 border-b border-line/50">
                        <span>Auto-Layout Graph</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">L</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1 border-b border-line/50">
                        <span>Undo last action</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">Ctrl + Z</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1">
                        <span>Redo action</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">Ctrl + Y</kbd>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Layers className="text-cyan-500 h-5 w-5" />
                      Connection & Selection controls
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex justify-between items-start py-1 border-b border-line/50">
                        <span className="flex flex-col">
                          <span>Quick connection</span>
                          <span className="text-xs text-slate-500">Hold Shift, click source node, then target node</span>
                        </span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold whitespace-nowrap">Shift + Click</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1 border-b border-line/50">
                        <span>Delete node/edge</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">Delete / Backspace</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1 border-b border-line/50">
                        <span>Open search palette</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">Ctrl + F</kbd>
                      </li>
                      <li className="flex justify-between items-center py-1">
                        <span>Open / Step simulator</span>
                        <kbd className="px-2 py-0.5 rounded border border-line bg-background text-xs font-semibold">Ctrl + Enter</kbd>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-3xl border border-line bg-panel p-6 space-y-4 shadow-sm">
                  <h3 className="font-semibold text-lg">Canvas Controls</h3>
                  <div className="grid gap-4 sm:grid-cols-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="p-4 rounded-2xl bg-background/50 border border-line">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400 mb-1">Pan Canvas</p>
                      <p className="text-xs">Click and hold any empty area of the canvas, then drag to scroll infinite grid.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-background/50 border border-line">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400 mb-1">Zoom Viewport</p>
                      <p className="text-xs">Use mouse scroll wheel or pinch to zoom in and out around cursor center.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-background/50 border border-line">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400 mb-1">Multi-Select</p>
                      <p className="text-xs">Hold Shift and drag a selection bounding box over multiple nodes to group or auto-layout.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "formulas" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Simulation Metrics Formulas</h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    The local simulation engine calculates realistic telemetry based on graph topology, traffic throughput (RPS), complexity coefficients, and stress profiles.
                  </p>
                </div>

                <div className="rounded-3xl border border-line bg-panel p-6 space-y-4 shadow-sm">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Cpu className="text-cyan-500 h-5 w-5" />
                    How Telemetry is Computed
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    When you run a simulation, the engine runs 24 sequential ticks. Each tick generates metrics according to the following formulas:
                  </p>

                  <div className="space-y-4 pt-4">
                    <div className="p-4 rounded-2xl bg-background/50 border border-line space-y-2">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400 text-sm">1. Complexity Coefficient (\(C_x\))</p>
                      <p className="text-xs leading-relaxed">
                        Complexity scales based on the ratio of edges to nodes, reflecting inter-service communication overhead:
                      </p>
                      <div className="bg-panel px-3 py-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
                        {"C_x = \\text{clamp}(1 + \\frac{\\text{edgeCount}}{\\max(1, \\text{nodeCount} \\times 2.2)}, 1, 2.2)"}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-background/50 border border-line space-y-2">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400 text-sm">2. Saturation Percentage (\(S\))</p>
                      <p className="text-xs leading-relaxed">
                        Measures service utilization and load limits. High throughput relative to node density spikes saturation:
                      </p>
                      <div className="bg-panel px-3 py-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
                        {"S = \\text{clamp}((\\frac{\\text{throughputRps}}{\\max(1, \\text{nodeCount} \\times 9500)}) \\times 100, 2, 100)"}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-background/50 border border-line space-y-2">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400 text-sm">
                        {"3. Error Rate (\\(E_{rate}\\))"}
                      </p>
                      <p className="text-xs leading-relaxed">
                        Error rates scale exponentially as saturation crosses threshold zones, amplified by profile constraints:
                      </p>
                      <div className="bg-panel px-3 py-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
                        {"E_{rate} = \\text{clamp}((\\frac{S}{28}) \\times P_{\\text{error\\_multiplier}} + \\text{jitter} \\times 2.5, 0, 45)"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm space-y-4">
                  <h3 className="font-semibold text-lg">Stress Profiles Multipliers</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="py-3 px-4 font-semibold">Profile</th>
                          <th className="py-3 px-4 font-semibold text-center">Load Scale</th>
                          <th className="py-3 px-4 font-semibold text-center">Latency Scale</th>
                          <th className="py-3 px-4 font-semibold text-center">Error Scale</th>
                          <th className="py-3 px-4 font-semibold text-center">Resilience Penalty</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-600 dark:text-slate-300">
                        <tr className="border-b border-line/50">
                          <td className="py-3 px-4 font-semibold text-foreground">normal</td>
                          <td className="py-3 px-4 text-center">1.00x</td>
                          <td className="py-3 px-4 text-center">1.00x</td>
                          <td className="py-3 px-4 text-center">1.00x</td>
                          <td className="py-3 px-4 text-center">1.00x</td>
                        </tr>
                        <tr className="border-b border-line/50">
                          <td className="py-3 px-4 font-semibold text-foreground">burst</td>
                          <td className="py-3 px-4 text-center text-cyan-500">1.42x</td>
                          <td className="py-3 px-4 text-center">1.26x</td>
                          <td className="py-3 px-4 text-center">1.24x</td>
                          <td className="py-3 px-4 text-center text-rose-500">0.92x</td>
                        </tr>
                        <tr className="border-b border-line/50">
                          <td className="py-3 px-4 font-semibold text-foreground">regional outage</td>
                          <td className="py-3 px-4 text-center">1.18x</td>
                          <td className="py-3 px-4 text-center text-cyan-500">1.44x</td>
                          <td className="py-3 px-4 text-center text-rose-500">1.48x</td>
                          <td className="py-3 px-4 text-center text-rose-500">0.75x</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">dependency failure</td>
                          <td className="py-3 px-4 text-center">1.08x</td>
                          <td className="py-3 px-4 text-center">1.36x</td>
                          <td className="py-3 px-4 text-center text-rose-500">1.66x</td>
                          <td className="py-3 px-4 text-center text-rose-500">0.80x</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "sandbox" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">LocalStorage DB & Cryptographic Sandbox</h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    Learn how the in-browser sandbox persists entities, enforces tenant-isolation, and creates tamper-proof sequential block hashes.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Database className="text-cyan-500 h-5 w-5" />
                      Browser Storage Design
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      All databases are simulated synchronously using standardized key formats inside `window.localStorage`:
                    </p>
                    <ul className="space-y-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                      <li className="p-2 rounded bg-background/50 border border-line">
                        <span className="font-semibold text-cyan-500">asd_sim_workspaces:</span> List of workspaces (tenant-scoped)
                      </li>
                      <li className="p-2 rounded bg-background/50 border border-line">
                        <span className="font-semibold text-cyan-500">asd_sim_versions:</span> Architecture graph revisions
                      </li>
                      <li className="p-2 rounded bg-background/50 border border-line">
                        <span className="font-semibold text-cyan-500">asd_sim_runs:</span> 24-tick simulation runs telemetry
                      </li>
                      <li className="p-2 rounded bg-background/50 border border-line">
                        <span className="font-semibold text-cyan-500">asd_sim_audit_logs:</span> Cryptographic security ledger
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Shield className="text-cyan-500 h-5 w-5" />
                      Cryptographic Chain Chaining
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      To prevent database tampering and maintain compliance audits, events are chained together sequentially using hashes:
                    </p>
                    <div className="p-3 rounded-2xl bg-background/50 border border-line text-xs space-y-2 leading-relaxed">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400">Block Hash Equation:</p>
                      <div className="bg-panel px-2 py-1.5 rounded font-mono text-[0.65rem]">
                        H_i = \text{Hash}( \text{tenantId} \parallel \text{actorId} \parallel \text{role} \parallel \text{action} \parallel \text{timestamp} \parallel \text{payload} \parallel H_{i-1} )
                      </div>
                      <p className="text-[0.7rem] text-slate-500">
                        If any past block is modified (e.g. payload edit), re-verifying the chain detects the hash mismatch instantly and alerts the governance system.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "checklist" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-bold tracking-tight">Duties & Checklist</h1>
                    <span className="text-sm font-semibold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-cyan-600 dark:text-cyan-400">
                      {completedCount} of {totalItems} completed ({completionPercent}%)
                    </span>
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    Check off your practical duties as an IT Infrastructure Architect. Your progress is saved locally.
                  </p>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search checklist duties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-2xl border border-line bg-panel text-sm outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-6">
                  {filteredChecklist.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-3xl border border-line bg-panel p-6 shadow-sm space-y-4"
                    >
                      <h3 className="font-semibold text-lg border-b border-line pb-2 flex justify-between items-center">
                        {section.title}
                        <span className="text-xs text-slate-500">
                          {section.items.filter((itm) => completedItems[`${section.id}-${itm}`]).length} / {section.items.length} done
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {section.items.map((item, index) => {
                          const itemId = `${section.id}-${item}`;
                          const isChecked = !!completedItems[itemId];
                          return (
                            <label
                              key={index}
                              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? "border-cyan-500/30 bg-cyan-500/5 text-slate-800 dark:text-slate-200"
                                  : "border-line/60 bg-background/40 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCheck(itemId)}
                                className="mt-1 accent-cyan-500 rounded border-line focus:ring-cyan-500"
                              />
                              <span className="text-sm">{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {filteredChecklist.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No matching checklist duties found.</p>
                  )}
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
