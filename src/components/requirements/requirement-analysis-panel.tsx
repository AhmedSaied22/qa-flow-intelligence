"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformSelector } from "./platform-selector";
import type { PlatformKind } from "@/lib/platform/types";

type RequirementAnalysisPanelProps = {
  requirementId: string;
  projectId: string;
  defaultPlatforms: PlatformKind[];
  initialAnalysis?: unknown;
};

type AnalysisState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  analysis?: unknown;
};

type RequirementAnalysis = {
  summary: string;
  risk_level: "low" | "medium" | "high";
  ambiguities: string[];
  missing_details: string[];
  edge_cases: string[];
  platform_focus: Array<{
    platform: PlatformKind;
    highlights: string[];
  }>;
  suggested_test_case_count: number;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRequirementAnalysis(value: unknown): value is RequirementAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.summary === "string" &&
    (record.risk_level === "low" || record.risk_level === "medium" || record.risk_level === "high") &&
    isStringArray(record.ambiguities) &&
    isStringArray(record.missing_details) &&
    isStringArray(record.edge_cases) &&
    typeof record.suggested_test_case_count === "number" &&
    Array.isArray(record.platform_focus) &&
    record.platform_focus.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const platformRecord = item as Record<string, unknown>;
      return (
        (platformRecord.platform === "web" || platformRecord.platform === "mobile") &&
        isStringArray(platformRecord.highlights)
      );
    })
  );
}

function EmptyList({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">No {label.toLowerCase()} found.</p>;
}

function AnalysisList({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) {
    return <EmptyList label={label} />;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${label}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-t pt-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

function RequirementAnalysisResult({ analysis }: { analysis: unknown }) {
  if (!isRequirementAnalysis(analysis)) {
    if (process.env.NODE_ENV !== "development") {
      return <p className="text-sm text-muted-foreground">Analysis is saved, but it could not be displayed.</p>;
    }

    return (
      <details className="rounded-md border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer text-sm font-medium">Debug analysis payload</summary>
        <pre className="mt-3 overflow-auto">{JSON.stringify(analysis, null, 2)}</pre>
      </details>
    );
  }

  const riskClassName =
    analysis.risk_level === "high"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
      : analysis.risk_level === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className={riskClassName}>
          {analysis.risk_level} risk
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border bg-muted/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Core coverage</p>
          <p className="text-sm font-medium">5 cases</p>
        </div>
        <div className="rounded-md border bg-muted/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended suite</p>
          <p className="text-sm font-medium">10 cases</p>
        </div>
        <div className="rounded-md border bg-muted/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Extended</p>
          <p className="text-sm font-medium">Full coverage available</p>
        </div>
      </div>

      <AnalysisSection title="Summary">
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      </AnalysisSection>

      <AnalysisSection title="Ambiguities">
        <AnalysisList items={analysis.ambiguities} label="Ambiguities" />
      </AnalysisSection>

      <AnalysisSection title="Missing Details">
        <AnalysisList items={analysis.missing_details} label="Missing details" />
      </AnalysisSection>

      <AnalysisSection title="Edge Cases">
        <AnalysisList items={analysis.edge_cases} label="Edge cases" />
      </AnalysisSection>

      <AnalysisSection title="Platform Focus">
        {analysis.platform_focus.length === 0 ? (
          <EmptyList label="Platform focus" />
        ) : (
          <div className="space-y-3">
            {analysis.platform_focus.map((item) => (
              <div key={item.platform} className="space-y-2">
                <Badge variant="secondary" className="capitalize">
                  {item.platform}
                </Badge>
                <AnalysisList items={item.highlights} label={`${item.platform} highlights`} />
              </div>
            ))}
          </div>
        )}
      </AnalysisSection>
    </div>
  );
}

export function RequirementAnalysisPanel({
  requirementId,
  projectId,
  defaultPlatforms,
  initialAnalysis,
}: RequirementAnalysisPanelProps) {
  const router = useRouter();
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [platforms, setPlatforms] = useState<PlatformKind[]>(defaultPlatforms);
  const [isPending, startTransition] = useTransition();
  const canRetry = useMemo(() => state.status === "error" || state.status === "success", [state.status]);
  const displayedAnalysis = state.status === "success" ? state.analysis : initialAnalysis;
  const needsProviderSetup =
    state.message === "No AI provider configured. Add a Gemini API key in AI Settings to run analysis.";

  async function runAnalysis() {
    setState({ status: "loading" });

    const response = await fetch("/api/requirements/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementId, projectId, platforms }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { analysis?: unknown; message?: string; error?: string; cached?: boolean }
      | null;

    if (!response.ok) {
      setState({
        status: "error",
        message: payload?.message ?? "Requirement analysis could not be completed.",
      });
      return;
    }

    setState({
      status: "success",
      analysis: payload?.analysis,
      message: payload?.cached ? "Cached result reused." : "Analysis completed.",
    });
    window.dispatchEvent(
      new CustomEvent("requirement-analysis:saved", {
        detail: { requirementId },
      }),
    );
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Requirement risk analysis</h2>
        <p className="text-sm text-muted-foreground">
          Check for ambiguity, missing details, and edge cases.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform</p>
        <PlatformSelector value={platforms} onChange={setPlatforms} />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => startTransition(runAnalysis)}
          disabled={isPending || state.status === "loading"}
        >
          {state.status === "loading" ? "Analyzing..." : "Run analysis"}
        </Button>
        {canRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(runAnalysis)}
            disabled={isPending || state.status === "loading"}
          >
            Retry
          </Button>
        ) : null}
      </div>

      {state.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          {needsProviderSetup ? (
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/dashboard/settings">
              Open AI Settings
            </Link>
          ) : null}
        </div>
      ) : null}

      {displayedAnalysis ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {state.status === "success" ? state.message : "Saved analysis."}
          </p>
          <RequirementAnalysisResult analysis={displayedAnalysis} />
        </div>
      ) : null}
    </section>
  );
}
