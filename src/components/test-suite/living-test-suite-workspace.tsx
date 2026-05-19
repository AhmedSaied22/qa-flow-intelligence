"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database, Json } from "@/lib/supabase/database.types";

type TestCase = Database["public"]["Tables"]["test_cases"]["Row"] & {
  requirement_title: string;
  ai_provider: string | null;
  ai_model: string | null;
  current_version: number;
  latest_version_created_at?: string;
};

type TestCaseVersion = Database["public"]["Tables"]["test_case_versions"]["Row"];
type RequirementOption = { id: string; title: string };
type TestCaseActionResult =
  | void
  | {
      ok: false;
      type: "network" | "timeout" | "server" | "validation";
      message: string;
    };
type TestCaseAction = (formData: FormData) => Promise<TestCaseActionResult>;

type LivingTestSuiteWorkspaceProps = {
  testCases: TestCase[];
  versions: TestCaseVersion[];
  requirements: RequirementOption[];
  updateAction: TestCaseAction;
  toggleStatusAction: TestCaseAction;
};

type FilterValue = "all" | string;

function jsonArray(value: Json | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function lines(value: Json | string | null | undefined) {
  return jsonArray(value).join("\n");
}

function normalizeText(value?: string | null, fallback = "Not provided.") {
  const text = value?.trim();
  return text ? text : fallback;
}

function normalizedValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatRelativeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) return `Updated ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `Updated ${formatDate(value)}`;
}

function priorityClassName(priority?: string | null) {
  const normalized = normalizedValue(priority);
  if (normalized === "critical") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (normalized === "high") return "border-orange-400/30 bg-orange-500/10 text-orange-200";
  if (normalized === "medium") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
}

function severityClassName(severity?: string | null) {
  const normalized = normalizedValue(severity);
  if (normalized === "high") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (normalized === "medium") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
}

function typeClassName(type?: string | null) {
  const normalized = normalizedValue(type);
  if (normalized.includes("security")) return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200";
  if (normalized.includes("reliab")) return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
  if (normalized.includes("integration")) return "border-blue-400/30 bg-blue-500/10 text-blue-200";
  if (normalized.includes("ui")) return "border-violet-400/30 bg-violet-500/10 text-violet-200";
  if (normalized.includes("validation")) return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  return "border-slate-400/30 bg-slate-500/10 text-slate-200";
}

function statusClassName(status?: string | null) {
  return normalizedValue(status) === "active"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : "border-slate-400/30 bg-slate-500/10 text-slate-200";
}

function caseTypeLabel(type?: string | null) {
  const normalized = normalizedValue(type);
  return normalized || "functional";
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function VersionContentView({ version }: { version: TestCaseVersion }) {
  return (
    <div className="space-y-4 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-200">Historical version, read-only</p>
          <h3 className="text-sm font-semibold">Version {version.version_number}: {version.title}</h3>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(version.created_at)}
            {version.change_reason ? ` - ${version.change_reason}` : ""}
          </p>
        </div>
        <Badge variant="secondary" className={statusClassName(version.status)}>
          {normalizeText(version.status, "active")}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className={priorityClassName(version.priority)}>
          {normalizeText(version.priority, "low")}
        </Badge>
        <Badge variant="secondary" className={severityClassName(version.risk_level)}>
          Risk: {normalizeText(version.risk_level, "low")}
        </Badge>
        <Badge variant="secondary" className={typeClassName(version.case_type)}>
          {caseTypeLabel(version.case_type)}
        </Badge>
        <Badge variant="secondary" className="w-fit capitalize">
          {normalizeText(version.platform, "web")}
        </Badge>
      </div>

      <DetailCard title="Description">
        <p className="text-sm text-muted-foreground">{normalizeText(version.description)}</p>
      </DetailCard>
      <DetailCard title="Preconditions">
        <p className="text-sm text-muted-foreground">{normalizeText(version.preconditions)}</p>
      </DetailCard>
      <DetailCard title="Steps">
        {jsonArray(version.steps).length ? (
          <ol className="space-y-2">
            {jsonArray(version.steps).map((step, index) => (
              <li key={`${version.id}-step-${index}`} className="flex gap-3 rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No steps were captured for this version.</p>
        )}
      </DetailCard>
      <DetailCard title="Test data">
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lines(version.test_data) || "Not provided."}</p>
      </DetailCard>
      <DetailCard title="Expected result">
        <p className="text-sm text-muted-foreground">{normalizeText(version.expected_result)}</p>
      </DetailCard>
      <DetailCard title="Automation candidate">
        <p className="text-sm text-muted-foreground">{normalizeText(version.automation_candidate)}</p>
      </DetailCard>
    </div>
  );
}

export function LivingTestSuiteWorkspace({
  testCases,
  versions,
  requirements,
  updateAction,
  toggleStatusAction,
}: LivingTestSuiteWorkspaceProps) {
  const [platform, setPlatform] = useState<FilterValue>("all");
  const [type, setType] = useState<FilterValue>("all");
  const [priority, setPriority] = useState<FilterValue>("all");
  const [severity, setSeverity] = useState<FilterValue>("all");
  const [status, setStatus] = useState<FilterValue>("active");
  const [requirementId, setRequirementId] = useState<FilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"details" | "edit">("details");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCases = useMemo(
    () =>
      testCases.filter(
        (item) =>
          (platform === "all" || normalizedValue(item.platform) === platform) &&
          (type === "all" || normalizedValue(item.case_type) === type) &&
          (priority === "all" || normalizedValue(item.priority) === priority) &&
          (severity === "all" || normalizedValue(item.risk_level) === severity) &&
          (status === "all" || normalizedValue(item.status) === status) &&
          (requirementId === "all" || item.requirement_id === requirementId),
      ),
    [platform, priority, requirementId, severity, status, testCases, type],
  );

  const selectedCase = filteredCases.find((item) => item.id === selectedId) ?? null;
  const selectedIndex = selectedCase ? filteredCases.findIndex((item) => item.id === selectedCase.id) : -1;
  const selectedVersions = selectedCase
    ? versions.filter((version) => version.test_case_id === selectedCase.id).sort((a, b) => b.version_number - a.version_number)
    : [];
  const selectedVersion = selectedVersions.find((version) => version.id === selectedVersionId) ?? null;

  const activeCount = filteredCases.filter((item) => normalizedValue(item.status) === "active").length;

  function openCase(item: TestCase, nextMode: "details" | "edit" = "details") {
    setSelectedId(item.id);
    setMode(nextMode);
    setSelectedVersionId(null);
    setEditError(null);
    setActionError(null);
  }

  function moveSelection(direction: -1 | 1) {
    const next = filteredCases[selectedIndex + direction];
    if (next) openCase(next, mode);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/10 p-3 md:grid-cols-6">
        <Filter label="Platform" value={platform} onChange={setPlatform} options={["web", "mobile"]} />
        <Filter label="Type" value={type} onChange={setType} options={["functional", "security", "reliability", "ui/ux", "integration", "validation", "edge case"]} />
        <Filter label="Priority" value={priority} onChange={setPriority} options={["critical", "high", "medium", "low"]} />
        <Filter label="Severity" value={severity} onChange={setSeverity} options={["high", "medium", "low"]} />
        <Filter label="Status" value={status} onChange={setStatus} options={["active", "inactive"]} includeAllLabel="Show all" />
        <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Requirement
          <select
            value={requirementId}
            onChange={(event) => setRequirementId(event.target.value)}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            <option value="all">All</option>
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {requirement.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{activeCount} active in current view</span>
        <span>{filteredCases.length} total in current view</span>
      </div>

      {filteredCases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
          No test cases match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/60">
          <div className="min-w-[1260px]">
            <div className="sticky top-0 grid grid-cols-[90px_minmax(320px,1fr)_minmax(240px,0.9fr)_96px_120px_110px_110px_120px_130px_170px] items-center gap-4 border-b border-border/70 bg-muted/25 px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>Code</span>
              <span>Title</span>
              <span>Requirement</span>
              <span>Platform</span>
              <span>Type</span>
              <span>Priority</span>
              <span>Severity</span>
              <span>Status</span>
              <span>Updated</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-border/60">
              {filteredCases.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "grid grid-cols-[90px_minmax(320px,1fr)_minmax(240px,0.9fr)_96px_120px_110px_110px_120px_130px_170px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/15",
                    selectedCase?.id === item.id && "bg-muted/30 ring-1 ring-inset ring-border/70",
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">TC-{String(index + 1).padStart(3, "0")}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">Version {item.current_version}</p>
                  </div>
                  <span className="truncate text-sm text-muted-foreground">{item.requirement_title}</span>
                  <Badge variant="secondary" className="w-fit capitalize">
                    {normalizeText(item.platform, "web")}
                  </Badge>
                  <Badge variant="secondary" className={cn("w-fit capitalize", typeClassName(item.case_type))}>
                    {caseTypeLabel(item.case_type)}
                  </Badge>
                  <Badge variant="secondary" className={cn("w-fit capitalize", priorityClassName(item.priority || "low"))}>
                    {normalizeText(item.priority, "low")}
                  </Badge>
                  <Badge variant="secondary" className={cn("w-fit capitalize", severityClassName(item.risk_level || "low"))}>
                    {normalizeText(item.risk_level, "low")}
                  </Badge>
                  <Badge variant="secondary" className={cn("w-fit capitalize", statusClassName(item.status))}>
                    {normalizeText(item.status, "active")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(item.updated_at)}</span>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openCase(item)}>
                      View
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => openCase(item, "edit")}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedCase ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-5 py-10 text-center text-sm text-muted-foreground">
          Select a test case to view details and versions.
        </div>
      ) : null}

      {selectedCase ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/35 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close details" onClick={() => setSelectedId(null)} />
          <aside className="relative flex h-full w-full max-w-[600px] flex-col border-l border-border/70 bg-background shadow-xl">
            <div className="sticky top-0 z-10 space-y-3 border-b border-border/70 bg-background px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span>TC-{String(selectedIndex + 1).padStart(3, "0")}</span>
                    <span>Version {selectedCase.current_version}</span>
                    {formatRelativeDate(selectedCase.latest_version_created_at) ? <span>- {formatRelativeDate(selectedCase.latest_version_created_at)}</span> : null}
                  </div>
                  <h2 className="text-base font-semibold leading-tight">{selectedCase.title}</h2>
                  <p className="text-xs text-muted-foreground">Requirement: {selectedCase.requirement_title}</p>
                </div>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => setSelectedId(null)} aria-label="Close details">
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={mode === "details" ? "default" : "outline"} size="sm" onClick={() => setMode("details")}>
                    Details
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "edit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedVersionId(null);
                      setMode("edit");
                    }}
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => moveSelection(-1)} disabled={selectedIndex <= 0}>
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => moveSelection(1)} disabled={selectedIndex >= filteredCases.length - 1}>
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {mode === "details" ? (
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {actionError ? (
                  <div className="rounded-md border border-rose-300/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {actionError}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className={priorityClassName(selectedCase.priority || "low")}>
                    {normalizeText(selectedCase.priority, "low")}
                  </Badge>
                  <Badge variant="secondary" className={severityClassName(selectedCase.risk_level || "low")}>
                    Severity: {normalizeText(selectedCase.risk_level, "low")}
                  </Badge>
                  <Badge variant="secondary" className={typeClassName(selectedCase.case_type)}>
                    {caseTypeLabel(selectedCase.case_type)}
                  </Badge>
                  <Badge variant="secondary" className={statusClassName(selectedCase.status)}>
                    {normalizeText(selectedCase.status, "active")}
                  </Badge>
                </div>

                <DetailCard title="Description">
                  <p className="text-sm text-muted-foreground">{normalizeText(selectedCase.description)}</p>
                </DetailCard>
                <DetailCard title="Preconditions">
                  <p className="text-sm text-muted-foreground">{normalizeText(selectedCase.preconditions)}</p>
                </DetailCard>
                <DetailCard title="Steps">
                  {jsonArray(selectedCase.steps).length ? (
                    <ol className="space-y-2">
                      {jsonArray(selectedCase.steps).map((step, index) => (
                        <li key={`${selectedCase.id}-step-${index}`} className="flex gap-3 rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm">
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {index + 1}
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
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lines(selectedCase.test_data) || "Not provided."}</p>
                </DetailCard>
                <DetailCard title="Expected result">
                  <p className="text-sm text-muted-foreground">{normalizeText(selectedCase.expected_result)}</p>
                </DetailCard>
                <DetailCard title="AI generation reference">
                  <p className="text-sm text-muted-foreground">
                    {selectedCase.ai_provider && selectedCase.ai_model ? `${selectedCase.ai_provider} / ${selectedCase.ai_model}` : "No AI generation reference."}
                  </p>
                </DetailCard>
                <DetailCard title="Automation candidate">
                  <p className="text-sm text-muted-foreground">{normalizeText(selectedCase.automation_candidate)}</p>
                </DetailCard>
                <DetailCard title="Version history">
                  {selectedVersions.length ? (
                    <div className="space-y-2">
                      {selectedVersions.map((version) => (
                        <button
                          key={version.id}
                          type="button"
                          onClick={() => {
                            setSelectedVersionId(version.id);
                            setMode("details");
                          }}
                          className={cn(
                            "w-full rounded-md border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/20",
                            selectedVersionId === version.id && "border-amber-400/50 bg-amber-500/10",
                          )}
                        >
                          <p className="text-sm font-medium">Version {version.version_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(version.created_at) ?? formatDate(version.created_at)}
                            {version.change_reason ? ` - ${version.change_reason}` : ""}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{version.title}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No version history found.</p>
                  )}
                </DetailCard>
                {selectedVersion ? <VersionContentView version={selectedVersion} /> : null}
              </div>
            ) : (
              <form
                action={(formData) => {
                  const title = String(formData.get("title") ?? "").trim();
                  const stepLines = String(formData.get("steps") ?? "")
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean);

                  if (!title) {
                    setEditError("Title is required.");
                    return;
                  }
                  if (stepLines.length === 0) {
                    setEditError("At least one step is required.");
                    return;
                  }

                  setEditError(null);
                  setActionError(null);
                  startTransition(async () => {
                    try {
                      const result = await updateAction(formData);
                      if (result && !result.ok) {
                        setEditError(result.message);
                        return;
                      }
                      setMode("details");
                    } catch (error) {
                      console.error("Living test suite save request failed", error);
                      setEditError("Connection lost. Your changes were not saved yet. Please reconnect and try again.");
                    }
                  });
                }}
                className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
              >
                {editError ? (
                  <div className="rounded-md border border-rose-300/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {editError}
                  </div>
                ) : null}
                <input type="hidden" name="testCaseId" value={selectedCase.id} />
                <Field name="title" label="Title" defaultValue={selectedCase.title} />
                <TextArea name="description" label="Description" defaultValue={selectedCase.description ?? ""} />
                <TextArea name="preconditions" label="Preconditions" defaultValue={selectedCase.preconditions ?? ""} />
                <TextArea name="steps" label="Steps" defaultValue={lines(selectedCase.steps)} rows={6} />
                <TextArea name="testData" label="Test data" defaultValue={lines(selectedCase.test_data)} />
                <TextArea name="expectedResult" label="Expected result" defaultValue={selectedCase.expected_result ?? ""} />
                <TextArea name="automationCandidate" label="Automation candidate" defaultValue={selectedCase.automation_candidate ?? ""} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select name="priority" label="Priority" defaultValue={selectedCase.priority} options={["critical", "high", "medium", "low"]} />
                  <Select name="riskLevel" label="Severity" defaultValue={selectedCase.risk_level} options={["high", "medium", "low"]} />
                  <Select name="caseType" label="Type" defaultValue={selectedCase.case_type} options={["functional", "security", "reliability", "ui/ux", "integration", "validation", "edge case"]} />
                  <Select name="platform" label="Platform" defaultValue={selectedCase.platform} options={["web", "mobile"]} />
                </div>
                <Field name="changeReason" label="Change reason" placeholder="Optional note for version history" />
                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-background/95 py-3 backdrop-blur">
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Saving..." : "Save changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setMode("details")}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {mode === "details" ? (
              <form
                action={(formData) => {
                  setActionError(null);
                  startTransition(async () => {
                    try {
                      const result = await toggleStatusAction(formData);
                      if (result && !result.ok) {
                        setActionError(result.message);
                      }
                    } catch (error) {
                      console.error("Living test suite status request failed", error);
                      setActionError("Connection lost. The status change was not saved yet. Please reconnect and try again.");
                    }
                  });
                }}
                className="border-t border-border/70 bg-background/95 px-5 py-3"
              >
                <input type="hidden" name="testCaseId" value={selectedCase.id} />
                <input type="hidden" name="nextStatus" value={normalizedValue(selectedCase.status) === "active" ? "inactive" : "active"} />
                <Button type="submit" variant="outline" disabled={isPending}>
                  {isPending ? "Saving..." : normalizedValue(selectedCase.status) === "active" ? "Deactivate" : "Reactivate"}
                </Button>
              </form>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  includeAllLabel = "All",
}: {
  label: string;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  options: string[];
  includeAllLabel?: string;
}) {
  return (
    <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
      >
        <option value="all">{includeAllLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

