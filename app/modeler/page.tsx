"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { DiagramModeler, type DiagramSelectionInfo } from "../diagram-modeler";
import { systemExamples, toolbarCategories } from "../spec-data";
import { useTheme } from "../components/ThemeProvider";
import { useModelerShellUiStore, type ModelerTool } from "./state/ui-store";
import { createDiagramVersion, createWorkspace } from "../../lib/api-client/workspaces";
import type { GraphDocument } from "../../packages/contracts/src/graph";
import { shortcutById, shortcutsByScope } from "./a11y/shortcuts";

const toolOptions: { id: ModelerTool; label: string; icon: typeof MousePointer2; shortcut: string }[] = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "add", label: "Add Node", icon: Plus, shortcut: "N" },
  { id: "layout", label: "Auto Layout", icon: Layout, shortcut: "L" },
];

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

export default function ModelerPage() {
  const { theme, toggleTheme } = useTheme();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [latestGraph, setLatestGraph] = useState<GraphDocument | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
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

  const activeToolLabel = useMemo(
    () => toolOptions.find((tool) => tool.id === activeTool)?.label ?? "Select",
    [activeTool],
  );
  const selectedScenario = useMemo(
    () =>
      systemExamples.find((scenario) => scenario.system_name === selectedScenarioName) ??
      systemExamples[0],
    [selectedScenarioName],
  );
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

  useEffect(() => {
    setAnnouncement(`Tool set to ${activeToolLabel}`);
  }, [activeToolLabel, setAnnouncement]);

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

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
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

      if (event.key === "Escape") {
        setShowShortcuts(false);
        setShowAnalysis(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    setActiveTool,
    setAnnouncement,
    latestGraph,
    setLeftSidebarOpen,
    setRightSidebarOpen,
    setShowAnalysis,
    setShowShortcuts,
    workspaceId,
  ]);

  useEffect(() => {
    let active = true;
    const bootstrapWorkspace = async () => {
      try {
        const created = await createWorkspace("Default Workspace");
        if (active) {
          setWorkspaceId(created.workspaceId);
        }
      } catch {
        if (active) {
          setWorkspaceId(null);
        }
      }
    };
    bootstrapWorkspace();
    return () => {
      active = false;
    };
  }, []);

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
        message: `Saved from modeler (${new Date().toISOString()})`,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
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

          <div className="flex h-[calc(100%-49px)] flex-col gap-5 overflow-y-auto p-4">
            <section className="space-y-3">
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

            <section className="space-y-3">
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
            </section>

            <section className="space-y-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">Ready elements</p>
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
                    <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">{item.category}</p>
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
            onSelectionInfoChange={setSelectedElementInfo}
            onGraphDocumentChange={setLatestGraph}
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
                <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="text-base font-semibold text-foreground">{selectedElementInfo.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {selectedElementInfo.category} / {selectedElementInfo.type}
                  </p>
                  <p className="mt-3 leading-6">{selectedElementInfo.focus}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className="rounded-lg border border-line px-2 py-1">
                      Provider: {selectedElementInfo.provider ?? "n/a"}
                    </span>
                    <span className="rounded-lg border border-line px-2 py-1">
                      Region: {selectedElementInfo.region ?? "n/a"}
                    </span>
                  </div>
                </div>
              ) : selectedElementInfo?.kind === "edge" ? (
                <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="text-base font-semibold text-foreground">Connection</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {selectedElementInfo.protocol}
                  </p>
                  <p className="mt-3 leading-6">{selectedElementInfo.purpose}</p>
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
          <span>Shortcuts: V, N, L, Ctrl+B, Ctrl+I, Ctrl+S, Ctrl+Shift+A</span>
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
            aria-label="Final summary analysis"
            className="h-[min(84vh,760px)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-line bg-background p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Final Summary Analysis</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{selectedScenario?.system_name}</h2>
              </div>
              <button
                onClick={() => setShowAnalysis(false)}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {selectedScenario?.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {selectedScenario?.design_patterns.map((pattern) => (
                <span key={pattern} className="rounded-full border border-line bg-panel px-3 py-1 text-xs">
                  {pattern}
                </span>
              ))}
            </div>

            <section className="mt-6 rounded-2xl border border-line bg-panel px-5 py-5">
              <h3 className="text-lg font-semibold">Scale Profile</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {selectedScenario
                  ? Object.entries(selectedScenario.scale).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-semibold text-foreground">{key.replaceAll("_", " ")}:</span> {value}
                    </li>
                  ))
                  : null}
              </ul>
            </section>

            <section className="mt-6 rounded-2xl border border-line bg-panel px-5 py-5">
              <h3 className="text-lg font-semibold">Next Actions</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                <li>Drag components from the left panel to extend this baseline.</li>
                <li>Connect critical paths with Shift+Click source then target.</li>
                <li>Validate each selected node’s documentation in the right sidebar.</li>
              </ol>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
