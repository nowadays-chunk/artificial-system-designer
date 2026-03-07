import { DiagramModeler } from "./diagram-modeler";
import {
  cloudProviders,
  learnMoreArticles,
  platformArchitecture,
  platformCounts,
  rollbackOperationGroups,
  simulationOperationGroups,
  supportedDesignPatterns,
  systemExamples,
  toolbarCategories,
  validationRules,
} from "./spec-data";

const navItems = [
  ["lab", "Live Lab"],
  ["coverage", "Spec Coverage"],
  ["scenarios", "Scenarios"],
  ["rules", "Rules"],
] as const;

const capabilities = [
  "Drag components from the spec-backed toolbar onto a large diagram canvas.",
  "Create connections between nodes, edit protocols, and inspect live cable traffic.",
  "Load full scenarios or step through guided architecture instructions with rollback.",
  "Simulate throughput, latency, resilience, cost, and validation outcomes in one surface.",
];

function SectionHeading({
  id,
  eyebrow,
  title,
  body,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <header id={id} className="scroll-mt-24 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
        {eyebrow}
      </p>
      <div className="max-w-4xl space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h2>
        <p className="text-sm leading-7 text-slate-700 md:text-base">{body}</p>
      </div>
    </header>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[1.5rem] border border-white/60 bg-white/74 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(239,246,255,0.96))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1640px] flex-col gap-16 px-5 py-8 md:px-8 lg:px-10">
        <section className="rounded-[2rem] border border-white/70 bg-white/68 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-700">
                Artificial System Designer
              </p>
              <div className="space-y-4">
                <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                  Diagram modeler for real system-design networks, not static boxes.
                </h1>
                <p className="max-w-4xl text-base leading-8 text-slate-700 md:text-lg">
                  This build turns the specification into a working topology lab: drag and drop
                  compute, networking, storage, security, and data components, connect them, load
                  guided scenarios, and run a simplified network simulation with server-level
                  telemetry and architecture-rule feedback.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {capabilities.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <nav className="flex flex-wrap gap-2">
                {navItems.map(([href, label]) => (
                  <a
                    key={href}
                    href={`#${href}`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-cyan-400 hover:text-slate-950"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-[0_24px_50px_rgba(15,23,42,0.25)]">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">What This Ships</p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                  <li>1. Load a scenario or start from a blank topology.</li>
                  <li>2. Drag components from the spec catalog onto the canvas.</li>
                  <li>3. Connect nodes, tune capacity and redundancy, then run traffic.</li>
                  <li>4. Watch server stress, edge traffic, validation, and score updates.</li>
                  <li>5. Step forward or backward through guided architecture construction.</li>
                </ol>
              </div>
              <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                  Coverage Snapshot
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Providers</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {cloudProviders.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scenarios</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {systemExamples.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Toolbar Categories
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {toolbarCategories.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rules</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {validationRules.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Architecture Layers"
              value={platformCounts.architectureLayers}
            />
            <StatCard
              label="Toolbar Components"
              value={platformCounts.toolbarComponents}
            />
            <StatCard
              label="Simulation Operations"
              value={platformCounts.simulationOperations}
            />
            <StatCard
              label="Rollback Operations"
              value={platformCounts.rollbackOperations}
            />
            <StatCard label="Scenario JSON Examples" value={platformCounts.scenarioExamples} />
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            id="lab"
            eyebrow="1. Live Lab"
            title="A drag-and-drop network modeler built directly from the specification"
            body="The canvas below reuses the existing scenario data, toolbar categories, patterns, and rules. You can load a full scenario, replay it step by step, or create a custom network and let the simulation estimate traffic flow, hotspot pressure, and architecture quality."
          />
          <DiagramModeler />
        </section>

        <section className="space-y-8">
          <SectionHeading
            id="coverage"
            eyebrow="2. Spec Coverage"
            title="Architecture planes, provider context, and pattern coverage remain visible"
            body="The modeler is not disconnected from the original spec. These cards show the platform planes, provider context, toolbar inventory, and design-pattern coverage that now feed the interactive workspace."
          />

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {platformArchitecture.map((section) => (
              <article
                key={section.id}
                className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                  {section.title}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{section.mission}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {section.primaryModules.map((module) => (
                    <span
                      key={module}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
            <article className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Simulated Providers
              </p>
              <div className="mt-5 grid gap-4">
                {cloudProviders.map((provider) => (
                  <div
                    key={provider.name}
                    className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
                  >
                    <h3 className="text-lg font-semibold text-slate-950">{provider.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {provider.positioning}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Toolbar Inventory
              </p>
              <div className="mt-5 space-y-3">
                {toolbarCategories.map((category) => (
                  <div
                    key={category.category}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <span className="font-medium text-slate-900">{category.category}</span>
                    <span className="text-sm text-slate-600">
                      {category.components.length} components
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Supported Patterns
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {supportedDesignPatterns.map((pattern) => (
                  <span
                    key={pattern}
                    className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-800"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            id="scenarios"
            eyebrow="3. Scenario Library"
            title="Scenario blueprints remain the source of guided topology and simulation intent"
            body="Each card below is a complete scenario already present in the spec. The lab can bootstrap from these examples and step through their architecture instructions while preserving pattern and scale context."
          />

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {systemExamples.map((scenario) => (
              <article
                key={scenario.system_name}
                className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
                      {scenario.system_name}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      {scenario.description}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {scenario.difficulty}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Peak RPS
                    </p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {scenario.scale.peak_requests_per_second}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Steps</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {scenario.architecture_steps.length}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  Hot path: {scenario.traffic_estimation.hot_path}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {scenario.design_patterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-900"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            id="rules"
            eyebrow="4. Rules And References"
            title="Operations, rollback domains, and learn-more material still anchor the product"
            body="The modeler is now the primary interaction layer, but it is still backed by the simulation and rollback vocabulary from the spec, together with the validation and learning material used to explain architectural trade-offs."
          />

          <div className="grid gap-5 xl:grid-cols-3">
            <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">Simulation Domains</h3>
              <div className="mt-4 space-y-3">
                {simulationOperationGroups.slice(0, 5).map((group) => (
                  <div key={group.domain} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="font-medium text-slate-900">{group.domain}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {group.operations.slice(0, 3).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">Rollback Domains</h3>
              <div className="mt-4 space-y-3">
                {rollbackOperationGroups.slice(0, 5).map((group) => (
                  <div key={group.domain} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="font-medium text-slate-900">{group.domain}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {group.operations.slice(0, 3).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">Validation Signals</h3>
              <ul className="mt-4 space-y-3">
                {validationRules.slice(0, 8).map((rule) => (
                  <li key={rule} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    {rule}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {learnMoreArticles.slice(0, 6).map((article) => (
              <article
                key={article.id}
                className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.07)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                  {article.primer_topic}
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-950">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{article.angle}</p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-cyan-800 underline underline-offset-4"
                >
                  Open primer reference
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
