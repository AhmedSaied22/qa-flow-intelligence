"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

type SavedTestCase = {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  steps: unknown;
  expected_result: string | null;
  platform: string;
  risk_level: string;
  status: string;
  ai_generation_id: string | null;
  created_at: string;
  provider: string | null;
  model: string | null;
};

type TestCaseGenerationPanelProps = {
  requirementId: string;
  projectId: string;
  defaultPlatforms: PlatformKind[];
  hasSavedAnalysis: boolean;
  initialSavedTestCases: SavedTestCase[];
};

type GenerationResponse = {
  cached?: boolean;
  generation?: { id: string };
  preview?: { test_cases?: PreviewTestCase[] };
  savedIndexes?: number[];
  message?: string;
};

type GenerationLimit = 5 | 10 | 20;

const generationOptions: Array<{
  value: GenerationLimit;
  label: string;
  description: string;
}> = [
  { value: 5, label: "Quick coverage", description: "5" },
  { value: 10, label: "Recommended suite", description: "10" },
  { value: 20, label: "Extended coverage", description: "20" },
];

type SaveResponse = {
  saved?: number;
  skipped?: number;
  items?: Array<{ title: string; skipped: boolean }>;
  message?: string;
};

type FilterValue = "all" | string;
type DrawerSource = "preview" | "saved";

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
  if (riskLevel === "high") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  if (riskLevel === "medium") return "border-orange-200 bg-orange-50 text-orange-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function riskClassName(riskLevel: PreviewTestCase["risk_level"]) {
  if (riskLevel === "high") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  if (riskLevel === "medium") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function typeClassName(type: string) {
  if (type.includes("security")) return "border-rose-200 bg-rose-50 text-rose-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-300";
  if (type.includes("reliab")) return "border-sky-200 bg-sky-50 text-sky-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300";
  if (type.includes("integration")) return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  if (type.includes("validation")) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  if (type.includes("edge")) return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300";
  if (type.includes("ui")) return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-muted/30 dark:text-muted-foreground";
}

function statusClassName(status?: PreviewTestCase["status"]) {
  return status === "saved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-border dark:bg-muted/30 dark:text-muted-foreground";
}

function statusLabel(status?: PreviewTestCase["status"]) {
  return status === "saved" ? "Saved to suite" : "Not saved yet";
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

function normalizeSteps(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function toPreviewFromSaved(item: SavedTestCase): PreviewTestCase {
  return {
    id: item.id.slice(0, 8),
    title: item.title,
    type: "saved",
    description: item.description ?? "",
    preconditions: item.preconditions ?? "",
    steps: normalizeSteps(item.steps),
    expected_result: item.expected_result ?? "",
    platform: item.platform === "web" ? "web" : "mobile",
    risk_level: item.risk_level === "high" || item.risk_level === "medium" || item.risk_level === "low" ? item.risk_level : "medium",
    status: "saved",
  };
}

function matchesFilters(
  item: PreviewTestCase,
  filters: {
    severity: FilterValue;
    type: FilterValue;
    platform: FilterValue;
  },
) {
  return (
    (filters.severity === "all" || item.risk_level === filters.severity) &&
    (filters.type === "all" || normalizeType(item.type) === filters.type) &&
    (filters.platform === "all" || item.platform === filters.platform)
  );
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border bg-muted/15 p-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

export function TestCaseGenerationPanel({
  requirementId,
  projectId,
  defaultPlatforms,
  hasSavedAnalysis,
  initialSavedTestCases,
}: TestCaseGenerationPanelProps) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<PlatformKind[]>(defaultPlatforms);
  const [generationLimit, setGenerationLimit] = useState<GenerationLimit>(10);
  const [optimisticSavedTestCases, setOptimisticSavedTestCases] = useState<SavedTestCase[]>([]);
  const [analysisSavedInSession, setAnalysisSavedInSession] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  const [drawerSource, setDrawerSource] = useState<DrawerSource>("preview");
  const [drawerItem, setDrawerItem] = useState<PreviewTestCase | null>(null);
  const [severityFilter, setSeverityFilter] = useState<FilterValue>("all");
  const [typeFilter, setTypeFilter] = useState<FilterValue>("all");
  const [platformFilter, setPlatformFilter] = useState<FilterValue>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | DrawerSource>("all");
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
  const savedTestCases = useMemo(() => {
    const persistedKeys = new Set(initialSavedTestCases.map((item) => `${item.platform}:${item.title.trim().toLowerCase()}`));
    return [
      ...optimisticSavedTestCases.filter((item) => !persistedKeys.has(`${item.platform}:${item.title.trim().toLowerCase()}`)),
      ...initialSavedTestCases,
    ];
  }, [initialSavedTestCases, optimisticSavedTestCases]);
  const savedTitleSet = useMemo(
    () => new Set(savedTestCases.map((item) => `${item.platform}:${item.title.trim().toLowerCase()}`)),
    [savedTestCases],
  );
  const filters = useMemo(
    () => ({ severity: severityFilter, type: typeFilter, platform: platformFilter }),
    [platformFilter, severityFilter, typeFilter],
  );
  const filteredPreview = useMemo(
    () =>
      (state.preview ?? [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => (sourceFilter === "all" || sourceFilter === "preview") && matchesFilters(item, filters)),
    [filters, sourceFilter, state.preview],
  );
  const filteredSaved = useMemo(
    () =>
      savedTestCases
        .map((saved, index) => ({ item: toPreviewFromSaved(saved), saved, index }))
        .filter(({ item }) => (sourceFilter === "all" || sourceFilter === "saved") && matchesFilters(item, filters)),
    [filters, savedTestCases, sourceFilter],
  );
  const visibleDrawerItems = drawerSource === "preview" ? filteredPreview.map(({ item }) => item) : filteredSaved.map(({ item }) => item);

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
      body: JSON.stringify({ requirementId, projectId, platforms, limit: generationLimit }),
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
    preview.forEach((item, index) => {
      if (savedTitleSet.has(`${item.platform}:${item.title.trim().toLowerCase()}`)) {
        savedIndexes.add(index);
      }
    });
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
    setDrawerSource("preview");
    setDrawerItem(normalizedPreview[0] ?? null);
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
    const newlySaved = (state.preview ?? [])
      .filter((item, index) => state.selected[index])
      .map<SavedTestCase>((item) => ({
        id: item.id ?? `${item.platform}:${item.title}`,
        title: item.title,
        description: item.description,
        preconditions: item.preconditions,
        steps: item.steps,
        expected_result: item.expected_result,
        platform: item.platform,
        risk_level: item.risk_level,
        status: "active",
        ai_generation_id: state.generationId ?? null,
        created_at: new Date().toISOString(),
        provider: null,
        model: null,
      }));

    if (newlySaved.length > 0) {
      setOptimisticSavedTestCases((existing) => {
        const keys = new Set(existing.map((item) => `${item.platform}:${item.title.trim().toLowerCase()}`));
        return [...newlySaved.filter((item) => !keys.has(`${item.platform}:${item.title.trim().toLowerCase()}`)), ...existing];
      });
    }

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
      selected: current.preview
        ? current.preview.map((item, index) =>
            filteredPreview.some((preview) => preview.index === index) && item.status !== "saved" ? selected : false,
          )
        : [],
    }));
  }

  const currentItem = drawerOpen ? drawerItem : undefined;
  const allCasesSaved = state.preview?.length ? state.preview.every((item) => item.status === "saved") : false;
  const currentDrawerPosition = currentItem ? visibleDrawerItems.findIndex((item) => item.title === currentItem.title && item.platform === currentItem.platform) : -1;
  const canGoPrevious = currentDrawerPosition > 0;
  const canGoNext = currentDrawerPosition >= 0 && currentDrawerPosition < visibleDrawerItems.length - 1;

  function moveDrawer(direction: -1 | 1) {
    const nextItem = visibleDrawerItems[currentDrawerPosition + direction];
    if (!nextItem) return;
    setDrawerItem(nextItem);
    const nextIndex =
      drawerSource === "preview"
        ? filteredPreview.find((entry) => entry.item === nextItem)?.index
        : filteredSaved.find((entry) => entry.item === nextItem)?.index;
    setDrawerIndex(nextIndex ?? null);
  }
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

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage depth</p>
        <div className="flex flex-wrap gap-2">
          {generationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGenerationLimit(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                generationLimit === option.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              <span className="block font-medium">{option.label}</span>
              <span className={cn("block text-xs", generationLimit === option.value ? "text-primary-foreground/75" : "text-muted-foreground")}>
                {option.description} cases
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => startTransition(generatePreview)}
          disabled={!analysisAvailable || isPending || state.status === "loading" || state.status === "saving"}
        >
          {state.status === "loading" ? "Generating..." : `Generate ${generationLimit} test cases`}
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

      {(state.preview?.length || savedTestCases.length > 0) ? (
        <div className="grid gap-2 rounded-lg border bg-muted/10 p-3 sm:grid-cols-4">
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Source
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as "all" | DrawerSource)}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
            >
              <option value="all">All</option>
              <option value="preview">Generated</option>
              <option value="saved">Saved</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Severity
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
            >
              <option value="all">All</option>
              <option value="functional">Functional</option>
              <option value="security">Security</option>
              <option value="reliability">Reliability</option>
              <option value="ui/ux">UI/UX</option>
              <option value="integration">Integration</option>
              <option value="validation">Validation</option>
              <option value="edge case">Edge case</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Platform
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
            >
              <option value="all">All</option>
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
            </select>
          </label>
        </div>
      ) : null}

      {state.preview?.length && sourceFilter !== "saved" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">AI-generated draft preview</p>
              <h3 className="text-sm font-medium">Review generated cases before saving</h3>
            </div>
            <Badge variant="secondary">Draft preview</Badge>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[44px_82px_minmax(340px,1fr)_112px_104px_128px_104px_128px_136px] items-center gap-4 border-b bg-muted/30 px-3 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">
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
                {filteredPreview.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No generated draft cases match the current filters.
                  </div>
                ) : null}
                {filteredPreview.map(({ item, index }) => {
                  const typeLabel = normalizeType(item.type);
                  const isActive = drawerOpen && drawerSource === "preview" && drawerIndex === index;
                  return (
                    <div
                      key={`${item.id ?? item.title}-${index}`}
                      className={cn(
                        "grid grid-cols-[44px_82px_minmax(340px,1fr)_112px_104px_128px_104px_128px_136px] items-center gap-4 px-3 py-3.5 transition-colors hover:bg-muted/20",
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
                        {statusLabel(item.status)}
                      </Badge>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDrawerIndex(index);
                            setDrawerSource("preview");
                            setDrawerItem(item);
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
            <p className="text-xs text-muted-foreground">
              {allCasesSaved ? "All generated cases are already saved." : "Selected drafts will be saved into the living test suite."}
            </p>
          </div>
        </div>
      ) : null}

      {sourceFilter !== "preview" ? (
      <section className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saved Test Suite</p>
            <h3 className="text-sm font-medium">Persistent cases for this requirement</h3>
          </div>
          <Badge variant="secondary">{filteredSaved.length} shown</Badge>
        </div>

        {savedTestCases.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No saved test cases yet. Generate, review, then save selected cases into the suite.
          </div>
        ) : filteredSaved.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No saved test cases match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[900px] divide-y">
              {filteredSaved.map(({ item: previewItem, saved: item, index }) => {
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid grid-cols-[82px_minmax(340px,1fr)_104px_112px_138px_136px] items-center gap-4 px-3 py-3.5 transition-colors hover:bg-muted/20",
                      drawerOpen && drawerSource === "saved" && drawerIndex === index && "bg-muted/40 ring-1 ring-inset ring-border",
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">TC-{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[item.provider, item.model].filter(Boolean).join(" / ") || "Saved case"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit capitalize">
                      {item.platform}
                    </Badge>
                    <Badge variant="secondary" className={cn("w-fit", riskClassName(previewItem.risk_level))}>
                      {previewItem.risk_level}
                    </Badge>
                    <Badge variant="secondary" className={cn("w-fit", statusClassName("saved"))}>
                      Saved to suite
                    </Badge>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDrawerIndex(index);
                          setDrawerSource("saved");
                          setDrawerItem(previewItem);
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
        )}
      </section>
      ) : null}

      {currentItem ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/35 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close details"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-[520px] flex-col border-l bg-background shadow-xl">
            <div className="sticky top-0 z-10 space-y-3 border-b bg-background px-5 py-4">
              <div className="flex items-start justify-between gap-3">
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {currentDrawerPosition >= 0 ? `${currentDrawerPosition + 1} of ${visibleDrawerItems.length}` : "Case details"}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => moveDrawer(-1)} disabled={!canGoPrevious}>
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => moveDrawer(1)} disabled={!canGoNext}>
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
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
                {statusLabel(currentItem.status)}
              </Badge>
            </div>

            <div className="scroll-smooth flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <DetailCard title="Description">
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{currentItem.description}</p>
              </DetailCard>

              <DetailCard title="Preconditions">
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  {currentItem.preconditions || "Not provided."}
                </p>
              </DetailCard>

              <DetailCard title="Steps">
                {currentItem.steps.length > 0 ? (
                  <ol className="space-y-2">
                    {currentItem.steps.map((step, stepIndex) => (
                      <li key={`${currentItem.title}-step-${stepIndex}`} className="flex gap-3 rounded-md border bg-background px-3 py-2.5 text-sm">
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
              </DetailCard>

              <DetailCard title="Test data">
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
              </DetailCard>

              <DetailCard title="Expected result">
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{currentItem.expected_result}</p>
              </DetailCard>

              <DetailCard title="Automation candidate">
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
              </DetailCard>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
