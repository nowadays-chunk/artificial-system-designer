"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  Github,
  HelpCircle,
  Layout,
  Menu,
  Moon,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react";
import { DiagramModeler } from "../diagram-modeler";
import { useTheme } from "../components/ThemeProvider";

const toolOptions = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "add", label: "Add Node", icon: Plus, shortcut: "N" },
  { id: "layout", label: "Auto Layout", icon: Layout, shortcut: "L" },
];

const featureControls = [
  { label: "Template", options: ["Blank", "API Platform", "Realtime Analytics", "Global Commerce"] },
  { label: "Grid", options: ["12 columns", "16 columns", "Auto"] },
  { label: "Connection Style", options: ["Curved", "Orthogonal", "Straight"] },
];

const inspectorPresets = [
  { label: "Simulation Mode", options: ["Live", "Replay", "Compare"] },
  { label: "Detail Level", options: ["Essential", "Expanded", "Audit"] },
];

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function ModelerPage() {
  const { theme, toggleTheme } = useTheme();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState("select");
  const [announcement, setAnnouncement] = useState("Modeler ready");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const activeToolLabel = useMemo(
    () => toolOptions.find((tool) => tool.id === activeTool)?.label ?? "Select",
    [activeTool],
  );

  useEffect(() => {
    setAnnouncement(`Tool set to ${activeToolLabel}`);
  }, [activeToolLabel]);

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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            onClick={() => setShowShortcuts((value) => !value)}
            className="hidden rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-cyan-500/40 md:inline-flex"
            aria-label="Toggle keyboard shortcuts"
            aria-pressed={showShortcuts}
            aria-keyshortcuts="?"
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
          <button className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700">
            Export
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`${leftSidebarOpen ? "w-72" : "w-0"} border-r border-line bg-panel/90 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
          aria-label="Modeler controls"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Controls</p>
            <button
              onClick={() => setLeftSidebarOpen((value) => !value)}
              className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle left sidebar"
              aria-keyshortcuts="Control+B"
            >
              <PanelLeft size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto p-4">
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
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">Quick setup</p>
              <button className="w-full rounded-xl border border-line bg-background/70 px-4 py-2 text-left text-sm font-medium transition hover:border-cyan-500/40">
                New model
              </button>
              {featureControls.map((control) => (
                <label key={control.label} className="grid gap-2 text-xs font-semibold text-slate-500">
                  {control.label}
                  <select className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground">
                    {control.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </section>

            <section className="space-y-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">Accessibility</p>
              <div className="rounded-2xl border border-line bg-background/70 p-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-foreground">Keyboard + mouse parity</p>
                <p className="mt-2 text-xs leading-relaxed">
                  Use V, N, and L to switch tools. Toggle sidebars with Ctrl+B and Ctrl+I.
                </p>
              </div>
            </section>
          </div>
        </aside>

        <main id="modeler" className="relative flex-1 overflow-hidden">
          <div className="absolute left-4 top-4 z-20 flex gap-2">
            <button
              onClick={() => setLeftSidebarOpen((value) => !value)}
              className="rounded-xl border border-line bg-panel px-2.5 py-2 backdrop-blur hover:bg-white dark:hover:bg-slate-800"
              aria-label="Toggle left sidebar"
              aria-keyshortcuts="Control+B"
            >
              <Menu size={18} />
            </button>
            <button
              onClick={() => setRightSidebarOpen((value) => !value)}
              className="rounded-xl border border-line bg-panel px-2.5 py-2 backdrop-blur hover:bg-white dark:hover:bg-slate-800"
              aria-label="Toggle right sidebar"
              aria-keyshortcuts="Control+I"
            >
              <PanelRight size={18} />
            </button>
          </div>

          <DiagramModeler />

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-line bg-panel px-2 py-2 backdrop-blur-lg shadow-2xl">
            <button
              className="rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              className="rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
            <div className="h-6 w-px bg-line" />
            <button
              className="rounded-xl p-2 text-red-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Delete (Del)"
            >
              <Trash2 size={18} />
            </button>
            <div className="h-6 w-px bg-line" />
            <button
              className="rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </main>

        <aside
          className={`${rightSidebarOpen ? "w-80" : "w-0"} border-l border-line bg-panel/90 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
          aria-label="Inspector"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Inspector</p>
            <button
              onClick={() => setRightSidebarOpen((value) => !value)}
              className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle right sidebar"
              aria-keyshortcuts="Control+I"
            >
              <PanelRight size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-6 overflow-y-auto p-4">
            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Properties</p>
              <label className="grid gap-2 text-xs font-semibold text-slate-500">
                Node label
                <input
                  type="text"
                  placeholder="Select a node"
                  className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-slate-500">
                Provider
                <select className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground">
                  <option>AWS</option>
                  <option>Azure</option>
                  <option>GCP</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-slate-500">
                Region
                <input
                  type="text"
                  placeholder="us-east-1"
                  className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground"
                />
              </label>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Automation</p>
              {inspectorPresets.map((control) => (
                <label key={control.label} className="grid gap-2 text-xs font-semibold text-slate-500">
                  {control.label}
                  <select className="w-full rounded-xl border border-line bg-background/80 px-3 py-2 text-sm text-foreground">
                    {control.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-500">Action center</p>
              <div className="rounded-2xl border border-line bg-background/70 p-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-foreground">Live validation</p>
                <p className="mt-2 text-xs leading-relaxed">
                  Validation runs as you connect nodes. Use shortcuts to iterate without losing momentum.
                </p>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:border-cyan-500/40">
                <HelpCircle size={14} />
                Support & documentation
              </button>
            </section>
          </div>
        </aside>
      </div>

      <footer className="flex h-10 items-center justify-between border-t border-line bg-panel px-4 text-[11px] font-medium text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Simulation online
          </span>
          <span className="hidden sm:inline">Active tool: {activeToolLabel}</span>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <span>Shortcuts: V, N, L, Ctrl+B, Ctrl+I</span>
          <span>v1.1.0</span>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </footer>

      {showShortcuts ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-line bg-background p-6 shadow-2xl">
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
              <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2">
                <span>Toggle left sidebar</span>
                <kbd className="rounded-md border border-line px-2 py-1 text-[0.65rem]">Ctrl+B</kbd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2">
                <span>Toggle right sidebar</span>
                <kbd className="rounded-md border border-line px-2 py-1 text-[0.65rem]">Ctrl+I</kbd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2">
                <span>Select tool</span>
                <kbd className="rounded-md border border-line px-2 py-1 text-[0.65rem]">V</kbd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2">
                <span>Add node tool</span>
                <kbd className="rounded-md border border-line px-2 py-1 text-[0.65rem]">N</kbd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2">
                <span>Auto layout</span>
                <kbd className="rounded-md border border-line px-2 py-1 text-[0.65rem]">L</kbd>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
