"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PlatformSelector } from "./platform-selector";
import type { PlatformKind } from "@/lib/platform/types";

type RequirementAnalysisPanelProps = {
  requirementId: string;
  projectId: string;
  defaultPlatforms: PlatformKind[];
};

type AnalysisState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  analysis?: unknown;
};

export function RequirementAnalysisPanel({
  requirementId,
  projectId,
  defaultPlatforms,
}: RequirementAnalysisPanelProps) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [platforms, setPlatforms] = useState<PlatformKind[]>(defaultPlatforms);
  const [isPending, startTransition] = useTransition();
  const canRetry = useMemo(() => state.status === "error" || state.status === "success", [state.status]);

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
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <pre className="overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
            {JSON.stringify(state.analysis, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
