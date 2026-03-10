"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "./components/ThemeProvider";

const featureHighlights = [
  {
    title: "Conversion-ready flows",
    description:
      "Guide every team through guided architecture journeys, from concept to validated topology in minutes.",
    tag: "Activation",
  },
  {
    title: "Real-time architecture intelligence",
    description:
      "Live simulation, latency tracing, and resilience scoring keep decisions grounded in reality.",
    tag: "Insight",
  },
  {
    title: "Design system for systems",
    description:
      "Reusable nodes, layout lanes, and scenario recipes keep every workflow fast and consistent.",
    tag: "Speed",
  },
];

const trustSignals = [
  ["18k+", "Systems modeled"],
  ["42%", "Faster architecture reviews"],
  ["99.95%", "Simulation confidence"],
  ["24/7", "Ops visibility"],
];

const productSteps = [
  {
    title: "Import your intent",
    description: "Choose a scenario or start with a blank canvas in the modeler.",
  },
  {
    title: "Compose the topology",
    description: "Drag nodes, connect flows, and tune providers or regions instantly.",
  },
  {
    title: "Validate in real time",
    description: "Instant health, latency, and security scoring keeps you on track.",
  },
];

const testimonials = [
  {
    quote:
      "We replaced three separate tools and got architecture review time down by half. The simulator sold the decision internally.",
    name: "Maya Patel",
    role: "Principal Architect, Northlake",
  },
  {
    quote:
      "The modeler feels like a modern CAD tool for systems. The shortcuts and live scores keep our teams moving.",
    name: "Jonas Weber",
    role: "Head of Platform, VectorEdge",
  },
];

function OrbitIllustration() {
  return (
    <svg
      viewBox="0 0 960 760"
      className="h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orbit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0ea5e9" stopOpacity="0.22" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect x="64" y="58" width="832" height="640" rx="120" fill="url(#orbit)" />
      <circle cx="480" cy="380" r="210" stroke="#38bdf8" strokeOpacity="0.15" strokeWidth="2" />
      <circle cx="480" cy="380" r="310" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="2" />
      <circle cx="480" cy="380" r="120" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="2" />
      <path
        d="M260 260C340 190 450 160 520 170C610 185 700 260 730 350"
        stroke="#38bdf8"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeDasharray="8 10"
      />
      <path
        d="M240 510C320 570 430 610 520 600C620 585 720 520 760 440"
        stroke="#0ea5e9"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="10 12"
      />
      <rect x="420" y="320" width="120" height="120" rx="32" fill="url(#core)" />
      <rect x="234" y="392" width="90" height="90" rx="24" fill="#0ea5e9" fillOpacity="0.24" />
      <rect x="650" y="230" width="86" height="86" rx="26" fill="#38bdf8" fillOpacity="0.18" />
      <circle cx="660" cy="520" r="28" fill="#22d3ee" fillOpacity="0.32" />
      <circle cx="300" cy="250" r="22" fill="#38bdf8" fillOpacity="0.28" />
    </svg>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
      >
        Skip to content
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-panel/80 backdrop-blur-xl border-b border-line shadow-lg" : ""
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7h6l2-3h8v6l-2 3h-7l-2 3H4z"
                />
              </svg>
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">Artificial System Designer</p>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-500">SaaS Studio</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
            <a className="opacity-70 transition hover:opacity-100" href="#value">
              Value
            </a>
            <a className="opacity-70 transition hover:opacity-100" href="#workflow">
              Workflow
            </a>
            <a className="opacity-70 transition hover:opacity-100" href="#pricing">
              Pricing
            </a>
            <a className="opacity-70 transition hover:opacity-100" href="#stories">
              Stories
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-full border border-line p-2.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 5a7 7 0 100 14 7 7 0 000-14z"
                  />
                </svg>
              )}
            </button>
            <Link
              href="/modeler"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-xl transition hover:scale-[1.02]"
            >
              Open Modeler
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="pt-28">
        <section className="relative overflow-hidden px-6 pb-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-20 left-1/2 h-96 w-[34rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[140px]" />
            <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-cyan-600 dark:text-cyan-300">
                Conversion-ready system design
                <span className="h-2 w-2 rounded-full bg-cyan-500" aria-hidden="true" />
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
                  Launch a product-led system designer that teams actually adopt.
                </h1>
                <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                  A modern SaaS platform for architecture creation, modeling, and simulation. The
                  modeler is built for clarity, accessible controls, and fast validation cycles.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/modeler"
                  className="rounded-2xl bg-cyan-600 px-6 py-3 text-center text-base font-semibold text-white shadow-2xl shadow-cyan-500/25 transition hover:-translate-y-0.5"
                >
                  Start designing now
                </Link>
                <button className="rounded-2xl border border-line bg-panel px-6 py-3 text-base font-semibold transition hover:border-cyan-500/40">
                  Book a product tour
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 sm:grid-cols-4">
                {trustSignals.map(([value, label]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-2xl font-semibold tracking-tight">{value}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] border border-white/40 bg-white/70 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/70" />
              <div className="relative rounded-[2.5rem] border border-line bg-panel/80 p-6 shadow-xl backdrop-blur">
                <div className="aspect-[4/3] overflow-hidden rounded-[2rem] bg-slate-950/90">
                  <OrbitIllustration />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {featureHighlights.map((feature) => (
                    <div key={feature.title} className="rounded-2xl border border-line bg-background/70 p-4">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-cyan-500">
                        {feature.tag}
                      </p>
                      <p className="mt-2 text-base font-semibold">{feature.title}</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="value" className="border-y border-line bg-slate-50/70 px-6 py-24 dark:bg-slate-900/30">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-500">Why teams convert</p>
              <h2 className="text-4xl font-semibold tracking-tight">A complete SaaS conversion path</h2>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                From first click to production-ready architecture, every screen is optimized for
                clarity and momentum. Use structured components, live scoring, and guided
                validations to remove friction.
              </p>
              <div className="grid gap-4">
                {[
                  "Guided templates that make the first model effortless",
                  "Accessibility-first controls with keyboard and mouse parity",
                  "Unified light and dark mode across every page and component",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-line bg-background/70 p-4">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-500" aria-hidden="true" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              {[
                ["Product-led onboarding", "Personalized start flows and shortcuts highlight core value."],
                ["Scenario playbooks", "Load system patterns or import specs from existing services."],
                ["High-impact exports", "Generate reports, share live models, and export to design systems."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl border border-line bg-panel/80 p-6 shadow-lg">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-500">Workflow</p>
                <h2 className="text-4xl font-semibold tracking-tight">Design, simulate, and share</h2>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  The modeler experience is built around clear spatial layout, a responsive
                  inspector, and instant validation that follows your cursor and keyboard.
                </p>
              </div>
              <Link
                href="/modeler"
                className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2 text-sm font-semibold transition hover:border-cyan-500/40"
              >
                Explore the modeler
              </Link>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {productSteps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-line bg-panel/70 p-6 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-500">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-line bg-slate-50/70 px-6 py-24 dark:bg-slate-900/30">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-500">Pricing</p>
              <h2 className="text-4xl font-semibold tracking-tight">Plans that scale with your team</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  name: "Starter",
                  price: "$0",
                  detail: "Solo architects and evaluation",
                  features: ["1 workspace", "Core components", "Community templates"],
                },
                {
                  name: "Studio",
                  price: "$49",
                  detail: "Product and platform teams",
                  features: ["Unlimited models", "Live simulation", "Team sharing"],
                  accent: true,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  detail: "Security + governance",
                  features: ["Private libraries", "SSO + audit logs", "Dedicated success"],
                },
              ].map((plan) => (
                <article
                  key={plan.name}
                  className={`flex h-full flex-col rounded-3xl border p-6 shadow-xl ${
                    plan.accent
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-line bg-panel/70"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-500">{plan.name}</p>
                  <p className="mt-4 text-3xl font-semibold">{plan.price}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{plan.detail}</p>
                  <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`mt-8 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      plan.accent
                        ? "bg-cyan-600 text-white hover:bg-cyan-700"
                        : "border border-line hover:border-cyan-500/40"
                    }`}
                  >
                    {plan.name === "Enterprise" ? "Talk to sales" : "Choose plan"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="stories" className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-500">Stories</p>
              <h2 className="text-4xl font-semibold tracking-tight">Teams feel the velocity</h2>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {testimonials.map((story) => (
                <article key={story.name} className="rounded-3xl border border-line bg-panel/80 p-6 shadow-xl">
                  <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">"{story.quote}"</p>
                  <div className="mt-6">
                    <p className="text-sm font-semibold">{story.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{story.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-6 pb-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-16 top-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-[120px]" />
            <div className="absolute bottom-0 right-12 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
          </div>
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2.5rem] border border-line bg-panel/80 p-10 shadow-2xl backdrop-blur md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-500">Ready to build</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Open the modeler and start designing</h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Bring a system to life in a few clicks, with light and dark modes shared across the entire suite.
              </p>
            </div>
            <Link
              href="/modeler"
              className="rounded-2xl bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-xl"
            >
              Launch Modeler
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-lg font-semibold">Artificial System Designer</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              A conversion-first SaaS experience for system modeling.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-600 dark:text-slate-300">
            <a href="#value" className="hover:text-cyan-500">
              Value
            </a>
            <a href="#workflow" className="hover:text-cyan-500">
              Workflow
            </a>
            <a href="#pricing" className="hover:text-cyan-500">
              Pricing
            </a>
            <a href="#stories" className="hover:text-cyan-500">
              Stories
            </a>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>(c) 2026 Artificial System Designer. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-cyan-500">
              Privacy
            </a>
            <a href="#" className="hover:text-cyan-500">
              Terms
            </a>
            <a href="#" className="hover:text-cyan-500">
              Accessibility
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
