"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformSelector } from "./platform-selector";
import { cn } from "@/lib/utils";
import type { PlatformKind } from "@/lib/platform/types";

type PreviewTestCase = {
  id?: string;
  title: string;
  type?: string;
  description: string;
  preconditions: string;
  steps: string[];
  test_data?: string[];
  expected_result: string;
  automation_candidate?: string;
  platform: PlatformKind;
  risk_level: "low" | "medium" | "high";
  status?: "draft" | "saved";
};

type TestCaseGenerationPanelProps = {
  requirementId: string;
  projectId: string;
  defaultPlatforms: PlatformKind[];
  hasSavedAnalysis: boolean;
};

type GenerationResponse = {
  cached?: boolean;
  generation?: { id: string };
  preview?: { test_cases?: PreviewTestCase[] };
  savedIndexes?: number[];
  message?: string;
};

type SaveResponse = {
  saved?: number;
  skipped?: number;
  items?: Array<{ title: string; skipped: boolean }>;
  message?: string;
};

function normalizeType(type?: string) {
  const value = (type ?? "functional").toLowerCase();
  if (value.includes("ui") || value.includes("ux")) return "ui/ux";
  if (value.includes("security")) return "security";
  if (value.includes("reliab")) return "reliability";
  if (value.includes("valid")) return "validation";
  if (value.includes("edge")) return "edge case";
  if (value.includes("performance")) return "reliability";
  return value || "functional";
}

function priorityLabel(riskLevel: PreviewTestCase["risk_level"]) {
  if (riskLevel === "high") return "Critical";
  if (riskLevel === "medium") return "High";
  return "Low";
}

function priorityClassName(riskLevel: PreviewTestCase["risk_level"]) {
  if (riskLevel === "high") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (riskLevel === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function riskClassName(riskLevel: PreviewTestCase["risk_level"]) {
  if (riskLevel === "high") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (riskLevel === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function typeClassName(type: string) {
  if (type.includes("security")) return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300";
  if (type.includes("reliab")) return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  if (type.includes("validation")) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (type.includes("edge")) return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  if (type.includes("ui")) return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  return "border-border bg-muted/30 text-muted-foreground";
}

function statusClassName(status?: PreviewTestCase["status"]) {
  return status === "saved"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-border bg-muted/30 text-muted-foreground";
}

function automationSummary(item: PreviewTestCase) {
  const candidate = item.automation_candidate?.trim();
  if (!candidate) {
    return {
      candidate: "No",
      framework: "N/A",
      effort: "N/A",
      notes: "No automation guidance provided.",
    };
  }

  const normalized = candidate.toLowerCase();
  return {
    candidate: "Yes",
    framework: normalized.includes("playwright")
      ? "Playwright"
      : normalized.includes("cypress")
        ? "Cypress"
        : normalized.includes("webdriverio")
          ? "WebdriverIO"
          : "Suggested manually",
    effort: normalized.includes("high") ? "High" : normalized.includes("low") ? "Low" : "Medium",
    notes: candidate,
  };
}

function selectedIndexesFrom(selected: boolean[]) {
  return selected.map((checked, index) => (checked ? index : -1)).filter((index) => index >= 0);
}

export function TestCaseGenerationPanel({
  requirementId,
  projectId,
  defaultPlatforms,
  hasSavedAnalysis,
}: TestCaseGenerationPanelProps) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<PlatformKind[]>(defaultPlatforms);
  const [analysisSavedInSession, setAnalysisSavedInSession] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ready" | "error" | "saving";
    message?: string;
    generationId?: string;
    preview?: PreviewTestCase[];
    selected: boolean[];
  }>({ status: "idle", selected: [] });

  const selectedCount = useMemo(() => state.selected.filter(Boolean).length, [state.selected]);
  const analysisAvailable = hasSavedAnalysis || analysisSavedInSession;
  const canRetry = state.status === "error" || state.status === "ready";

  useEffect(() => {
    function handleAnalysisSaved(event: Event) {
      const detail = (event as CustomEvent<{ requirementId?: string }>).detail;
      if (detail?.requirementId === requirementId) {
        setAnalysisSavedInSession(true);
        setState((current) =>
          current.status === "idle"
            ? { ...current, message: "Analysis saved. Test case generation is ready." }
            : current,
        );
      }
    }

    window.addEventListener("requirement-analysis:saved", handleAnalysisSaved);
    return () => window.removeEventListener("requirement-analysis:saved", handleAnalysisSaved);
  }, [requirementId]);

  async function generatePreview() {
    setState((current) => ({ ...current, status: "loading", message: undefined }));

    const response = await fetch("/api/requirements/test-cases/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementId, projectId, platforms }),
    });

    const payload = (await response.json().catch(() => null)) as GenerationResponse | null;

    if (!response.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        selected: [],
        message: payload?.message ?? "Test case generation failed.",
      }));
      return;
    }

    const preview = payload?.preview?.test_cases ?? [];
    const savedIndexes = new Set(payload?.savedIndexes ?? []);
    const normalizedPreview = preview.map((item, index) => ({
      ...item,
      status: savedIndexes.has(index) ? ("saved" as const) : ("draft" as const),
    }));

    setState({
      status: "ready",
      generationId: payload?.generation?.id,
      preview: normalizedPreview,
      selected: normalizedPreview.map((item) => item.status !== "saved"),
      message:
        preview.length === 0
          ? "No test cases were generated."
          : savedIndexes.size > 0
            ? `${savedIndexes.size} generated test cases are already saved.`
            : "Preview ready.",
    });

    setDrawerIndex(0);
    setDrawerOpen(normalizedPreview.length > 0);
  }

  async function saveSelected() {
    if (!state.generationId || !state.preview?.length) return;

    const selectedIndexes = selectedIndexesFrom(state.selected);
    if (selectedIndexes.length === 0) return;

    setState((current) => ({ ...current, status: "saving", message: undefined }));

    const response = await fetch("/api/test-cases/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationId: state.generationId, selectedIndexes }),
    });

    const payload = (await response.json().catch(() => null)) as SaveResponse | null;

    if (!response.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: payload?.message ?? "Could not save selected test cases.",
      }));
      return;
    }

    const savedCount = payload?.saved ?? 0;
    const skippedCount = payload?.skipped ?? 0;

    setState((current) => {
      const updatedPreview = current.preview?.map((item, index) =>
        current.selected[index]
          ? {
              ...item,
              status: "saved" as const,
            }
          : item,
      );

      const updatedSelected = current.selected.map((checked, index) => {
        const item = current.preview?.[index];
        return checked && item ? false : checked;
      });

      return {
        ...current,
        status: "ready",
        preview: updatedPreview,
        selected: updatedSelected,
        message:
          savedCount > 0
            ? `${savedCount} test cases saved to the living test suite.`
            : skippedCount > 0
              ? "Selected test cases are already saved in the living test suite."
              : "No new test cases were saved.",
      };
    });

    router.refresh();
  }

  function setAllSelections(selected: boolean) {
    setState((current) => ({
      ...current,
      selected: current.preview ? current.preview.map((item) => (item.status === "saved" ? false : selected)) : [],
    }));
  }

  const currentItem = drawerOpen && drawerIndex !== null ? state.preview?.[drawerIndex] : undefined;
  const allCasesSaved = state.preview?.length ? state.preview.every((item) => item.status === "saved") : false;
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Test case generation</h2>
        <p className="text-sm text-muted-foreground">
          Generate practical cases from the saved analysis, review them, then save only what you want.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform</p>
        <PlatformSelector value={platforms} onChange={setPlatforms} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => startTransition(generatePreview)}
          disabled={!analysisAvailable || isPending || state.status === "loading" || state.status === "saving"}
        >
          {state.status === "loading" ? "Generating..." : "Generate first 10 test cases"}
        </Button>
        {canRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(generatePreview)}
            disabled={isPending || state.status === "loading" || state.status === "saving"}
          >
            Retry
          </Button>
        ) : null}
        {state.preview?.length ? (
          <>
            <Button type="button" variant="outline" onClick={() => setAllSelections(true)} disabled={state.status === "saving"}>
              Select all
            </Button>
            <Button type="button" variant="outline" onClick={() => setAllSelections(false)} disabled={state.status === "saving"}>
              Clear selection
            </Button>
          </>
        ) : null}
      </div>

      {state.message ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            state.status === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : state.message.includes("saved to the living test suite")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-muted/20 text-muted-foreground",
          )}
        >
          {state.message}
        </div>
      ) : null}

      {!analysisAvailable ? <p className="text-sm text-muted-foreground">Run requirement analysis first to generate test cases.</p> : null}

      {state.preview?.length ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[44px_82px_minmax(280px,1fr)_104px_104px_118px_104px_92px_128px] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span />
                <span>ID</span>
                <span>Title</span>
                <span>Priority</span>
                <span>Platform</span>
                <span>Type</span>
                <span>Severity</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y">
                {state.preview.map((item, index) => {
                  const typeLabel = normalizeType(item.type);
                  const isActive = drawerOpen && drawerIndex === index;
                  return (
                    <div
                      key={`${item.id ?? item.title}-${index}`}
                      className={cn(
                        "grid grid-cols-[44px_82px_minmax(280px,1fr)_104px_104px_118px_104px_92px_128px] items-center gap-3 px-3 py-3",
                        item.status === "saved" && "bg-emerald-500/5",
                        isActive && "bg-muted/40 ring-1 ring-inset ring-border",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={state.selected[index] ?? false}
                        disabled={item.status === "saved"}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            selected: current.selected.map((checked, selectedIndex) =>
                              selectedIndex === index ? event.target.checked : checked,
                            ),
                          }))
                        }
                        className="size-4 rounded border"
                        aria-label={`Select test case ${index + 1}`}
                      />
                      <div className="text-xs font-medium text-muted-foreground">
                        {item.id ?? `TC-${String(index + 1).padStart(2, "0")}`}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge variant="secondary" className={cn("w-fit", priorityClassName(item.risk_level))}>
                        {priorityLabel(item.risk_level)}
                      </Badge>
                      <Badge variant="secondary" className="w-fit capitalize">
                        {item.platform}
                      </Badge>
                      <Badge variant="secondary" className={cn("w-fit capitalize", typeClassName(typeLabel))}>
                        {typeLabel}
                      </Badge>
                      <Badge variant="secondary" className={cn("w-fit", riskClassName(item.risk_level))}>
                        {item.risk_level}
                      </Badge>
                      <Badge variant="secondary" className={cn("w-fit", statusClassName(item.status ?? "draft"))}>
                        {item.status ?? "draft"}
                      </Badge>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDrawerIndex(index);
                            setDrawerOpen(true);
                          }}
                        >
                          View details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 px-3 py-3 shadow-sm backdrop-blur">
            <Button type="button" onClick={saveSelected} disabled={state.status === "saving" || selectedCount === 0 || allCasesSaved}>
              {allCasesSaved ? "Already saved" : state.status === "saving" ? "Saving..." : "Save selected"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {selectedCount} of {state.preview.length} selected
            </p>
          </div>
        </div>
      ) : null}

      {currentItem ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/35 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close details"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-[460px] flex-col border-l bg-background shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {currentItem.id ?? `TC-${String((drawerIndex ?? 0) + 1).padStart(2, "0")}`}
                </p>
                <h3 className="text-base font-semibold leading-tight">{currentItem.title}</h3>
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setDrawerOpen(false)} aria-label="Close details">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 border-b px-5 py-3">
              <Badge variant="secondary" className={cn("w-fit", priorityClassName(currentItem.risk_level))}>
                {priorityLabel(currentItem.risk_level)}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {currentItem.platform}
              </Badge>
              <Badge variant="secondary" className={cn("capitalize", typeClassName(normalizeType(currentItem.type)))}>
                {normalizeType(currentItem.type)}
              </Badge>
              <Badge variant="secondary" className={cn(riskClassName(currentItem.risk_level))}>
                Severity: {currentItem.risk_level}
              </Badge>
              <Badge variant="secondary" className={cn(statusClassName(currentItem.status ?? "draft"))}>
                {currentItem.status ?? "draft"}
              </Badge>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Description</h4>
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{currentItem.description}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Preconditions</h4>
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  {currentItem.preconditions || "Not provided."}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Steps</h4>
                {currentItem.steps.length > 0 ? (
                  <ol className="space-y-2">
                    {currentItem.steps.map((step, stepIndex) => (
                      <li key={`${currentItem.title}-step-${stepIndex}`} className="flex gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {stepIndex + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No steps provided.</p>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Test data</h4>
                {currentItem.test_data?.length ? (
                  <ul className="space-y-2">
                    {currentItem.test_data.map((entry, dataIndex) => (
                      <li
                        key={`${currentItem.title}-data-${dataIndex}`}
                        className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-mono text-muted-foreground"
                      >
                        {entry}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided.</p>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Expected result</h4>
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{currentItem.expected_result}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Automation candidate</h4>
                {(() => {
                  const automation = automationSummary(currentItem);
                  return (
                    <div className="space-y-3 rounded-md border bg-muted/20 px-3 py-3 text-sm">
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                        <span className="text-muted-foreground">Candidate</span>
                        <span className="font-medium">{automation.candidate}</span>
                        <span className="text-muted-foreground">Suggested framework</span>
                        <span className="font-medium">{automation.framework}</span>
                        <span className="text-muted-foreground">Complexity / effort</span>
                        <span className="font-medium">{automation.effort}</span>
                      </div>
                      <div className="border-t pt-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                        <p className="mt-1 text-sm text-muted-foreground">{automation.notes}</p>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
