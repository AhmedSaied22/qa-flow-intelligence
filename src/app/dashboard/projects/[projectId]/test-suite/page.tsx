import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LivingTestSuiteWorkspace } from "@/components/test-suite/living-test-suite-workspace";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

type TestCase = Database["public"]["Tables"]["test_cases"]["Row"];
type TestCaseVersion = Database["public"]["Tables"]["test_case_versions"]["Row"];
type TestCaseView = TestCase & {
  requirement_title: string;
  ai_provider: string | null;
  ai_model: string | null;
  current_version: number;
  latest_version_created_at?: string;
  latest_version_change_reason?: string | null;
};

type SuiteActionResult = {
  ok: false;
  type: "network" | "timeout" | "server" | "validation";
  message: string;
};

function classifySupabaseError(error: { message?: string | null; code?: string | null } | null | undefined): SuiteActionResult {
  const message = (error?.message ?? "").toLowerCase();
  const code = (error?.code ?? "").toLowerCase();

  if (message.includes("timeout") || message.includes("timed out") || code.includes("timeout")) {
    return { ok: false, type: "timeout", message: "The save request timed out. Check your connection and try again." };
  }

  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("connection") ||
    message.includes("econnreset") ||
    message.includes("enotfound") ||
    message.includes("retryable")
  ) {
    return { ok: false, type: "network", message: "Connection lost. Your changes were not saved yet. Please reconnect and try again." };
  }

  return { ok: false, type: "server", message: "Failed to save changes. Please try again." };
}

function linesToArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeJsonLines(value: Json): Json {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean) as Json;
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean) as Json;
  }

  return [];
}

function mergeCaseSnapshot(testCase: TestCaseView, version?: TestCaseVersion | null): TestCaseView {
  return {
    ...testCase,
    description: version?.description ?? testCase.description,
    preconditions: version?.preconditions ?? testCase.preconditions,
    steps: version?.steps ?? testCase.steps,
    test_data: version?.test_data ?? testCase.test_data,
    expected_result: version?.expected_result ?? testCase.expected_result,
    priority: version?.priority ?? testCase.priority,
    risk_level: version?.risk_level ?? testCase.risk_level,
    case_type: version?.case_type ?? testCase.case_type,
    platform: version?.platform ?? testCase.platform,
    automation_candidate: version?.automation_candidate ?? testCase.automation_candidate,
    status: testCase.status,
    current_version: version?.version_number ?? 1,
    latest_version_created_at: version?.created_at ?? testCase.updated_at,
    latest_version_change_reason: version?.change_reason ?? null,
  };
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function jsonToLines(value: Json): string[] {
  return normalizeJsonLines(value) as string[];
}

async function updateTestCase(formData: FormData) {
  "use server";

  const testCaseId = textValue(formData, "testCaseId");
  if (!testCaseId) {
    return { ok: false, type: "validation", message: "Select a test case before saving changes." } satisfies SuiteActionResult;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Living test suite auth check failed", { message: userError.message });
    return classifySupabaseError(userError);
  }
  if (!userData.user) redirect("/login");

  const { data: existing, error: existingError } = await supabase
    .from("test_cases")
    .select("*")
    .eq("id", testCaseId)
    .maybeSingle();

  if (existingError) {
    console.error("Load test case before update failed", { code: existingError.code, message: existingError.message, details: existingError.details, testCaseId });
    return classifySupabaseError(existingError);
  }

  if (!existing) {
    notFound();
  }

  const { data: project, error: projectError } = await supabase.from("projects").select("owner_id").eq("id", existing.project_id).maybeSingle();

  if (projectError) {
    console.error("Load project before test case update failed", { code: projectError.code, message: projectError.message, details: projectError.details, testCaseId });
    return classifySupabaseError(projectError);
  }

  if (!project || project.owner_id !== userData.user.id) {
    notFound();
  }

  const updatePayload = {
    title: textValue(formData, "title") || existing.title,
    description: textValue(formData, "description") || null,
    preconditions: textValue(formData, "preconditions") || null,
    steps: linesToArray(textValue(formData, "steps")) as Json,
    test_data: linesToArray(textValue(formData, "testData")) as Json,
    expected_result: textValue(formData, "expectedResult") || null,
    priority: textValue(formData, "priority") || existing.priority,
    risk_level: textValue(formData, "riskLevel") || existing.risk_level,
    case_type: textValue(formData, "caseType") || existing.case_type,
    platform: textValue(formData, "platform") || existing.platform,
    automation_candidate: textValue(formData, "automationCandidate") || null,
  };

  const hasChanges =
    updatePayload.title !== existing.title ||
    updatePayload.description !== existing.description ||
    updatePayload.preconditions !== existing.preconditions ||
    !arraysEqual(jsonToLines(updatePayload.steps), jsonToLines(existing.steps)) ||
    !arraysEqual(jsonToLines(updatePayload.test_data), jsonToLines(existing.test_data)) ||
    updatePayload.expected_result !== existing.expected_result ||
    updatePayload.priority !== existing.priority ||
    updatePayload.risk_level !== existing.risk_level ||
    updatePayload.case_type !== existing.case_type ||
    updatePayload.platform !== existing.platform ||
    updatePayload.automation_candidate !== existing.automation_candidate;

  if (!updatePayload.title) {
    return { ok: false, type: "validation", message: "Please provide at least a title before saving." } satisfies SuiteActionResult;
  }

  if (!hasChanges) {
    redirect(`/dashboard/projects/${existing.project_id}/test-suite?success=nochanges`);
  }

  const { data: updated, error } = await supabase.from("test_cases").update(updatePayload).eq("id", testCaseId).select("*").single();
  if (error || !updated) {
    console.error("Update test case failed", { code: error?.code, message: error?.message, details: error?.details, testCaseId });
    return classifySupabaseError(error);
  }

  const { data: latestVersion, error: latestVersionError } = await supabase
    .from("test_case_versions")
    .select("version_number")
    .eq("test_case_id", testCaseId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestVersionError) {
    console.error("Load latest test case version failed", { code: latestVersionError.code, message: latestVersionError.message, details: latestVersionError.details, testCaseId });
    return classifySupabaseError(latestVersionError);
  }

  const nextVersion = (latestVersion?.version_number ?? 0) + 1;
  const { error: versionError } = await supabase.from("test_case_versions").insert({
    test_case_id: updated.id,
    version_number: nextVersion,
    title: updated.title,
    description: updated.description,
    preconditions: updated.preconditions,
    steps: normalizeJsonLines(updated.steps),
    test_data: normalizeJsonLines(updated.test_data),
    expected_result: updated.expected_result,
    platform: updated.platform,
    risk_level: updated.risk_level,
    priority: updated.priority,
    case_type: updated.case_type,
    automation_candidate: updated.automation_candidate,
    status: updated.status,
    change_reason: textValue(formData, "changeReason") || "Edited in living test suite",
  });

  if (versionError) {
    console.error("Create test case version failed", {
      code: versionError.code,
      message: versionError.message,
      details: versionError.details,
      testCaseId,
    });
    return classifySupabaseError(versionError);
  }

  redirect(`/dashboard/projects/${existing.project_id}/test-suite?success=updated`);
}

async function toggleTestCaseStatus(formData: FormData) {
  "use server";

  const testCaseId = textValue(formData, "testCaseId");
  const nextStatus = textValue(formData, "nextStatus") === "inactive" ? "inactive" : "active";
  if (!testCaseId) {
    return { ok: false, type: "validation", message: "Select a test case before changing its status." } satisfies SuiteActionResult;
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Living test suite status auth check failed", { message: userError.message });
    return classifySupabaseError(userError);
  }
  if (!userData.user) redirect("/login");

  const { data: existing, error: existingError } = await supabase
    .from("test_cases")
    .select("*")
    .eq("id", testCaseId)
    .maybeSingle();

  if (existingError) {
    console.error("Load test case before status update failed", { code: existingError.code, message: existingError.message, details: existingError.details, testCaseId });
    return classifySupabaseError(existingError);
  }

  if (!existing) {
    notFound();
  }

  const { data: project, error: projectError } = await supabase.from("projects").select("owner_id").eq("id", existing.project_id).maybeSingle();

  if (projectError) {
    console.error("Load project before status update failed", { code: projectError.code, message: projectError.message, details: projectError.details, testCaseId });
    return classifySupabaseError(projectError);
  }

  if (!project || project.owner_id !== userData.user.id) {
    notFound();
  }

  const { error } = await supabase.from("test_cases").update({ status: nextStatus }).eq("id", testCaseId);
  if (error) {
    console.error("Toggle test case status failed", { code: error.code, message: error.message, details: error.details, testCaseId });
    return classifySupabaseError(error);
  }

  redirect(`/dashboard/projects/${existing.project_id}/test-suite?success=${nextStatus}`);
}

export default async function LivingTestSuitePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}>) {
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("Living test suite page auth check failed", { message: userError.message });
    const authIssue = classifySupabaseError(userError);
    return (
      <AppShell>
        <section className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-5 text-sm text-amber-100">
          <h1 className="text-base font-semibold">Connection issue</h1>
          <p className="mt-2">{authIssue.message}</p>
        </section>
      </AppShell>
    );
  }

  if (!userData.user) {
    notFound();
  }

  const [projectResult, requirementsResult, testCasesResult] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("requirements").select("id,title").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("test_cases").select("*").eq("project_id", projectId).order("updated_at", { ascending: false }),
  ]);

  const loadError = projectResult.error ?? requirementsResult.error ?? testCasesResult.error;
  if (loadError) {
    console.error("Living test suite page load failed", { code: loadError.code, message: loadError.message, details: loadError.details, projectId });
    const loadIssue = classifySupabaseError(loadError);
    return (
      <AppShell>
        <section className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-5 text-sm text-amber-100">
          <h1 className="text-base font-semibold">Could not load the living test suite</h1>
          <p className="mt-2">{loadIssue.message}</p>
        </section>
      </AppShell>
    );
  }

  const { data: project } = projectResult;
  const { data: requirements } = requirementsResult;
  const { data: testCases } = testCasesResult;

  if (!project || project.owner_id !== userData.user.id) {
    notFound();
  }

  const requirementMap = new Map((requirements ?? []).map((requirement) => [requirement.id, requirement.title]));
  const generationIds = Array.from(new Set((testCases ?? []).map((item) => item.ai_generation_id).filter((id): id is string => typeof id === "string")));
  const testCaseIds = (testCases ?? []).map((item) => item.id);

  const [generationsResult, versionsResult] = await Promise.all([
    generationIds.length > 0
      ? supabase.from("ai_generations").select("id,provider,model").in("id", generationIds)
      : Promise.resolve({ data: [], error: null }),
    testCaseIds.length > 0
      ? supabase.from("test_case_versions").select("*").in("test_case_id", testCaseIds).order("version_number", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const metadataLoadError = generationsResult.error ?? versionsResult.error;
  if (metadataLoadError) {
    console.error("Living test suite metadata load failed", { code: metadataLoadError.code, message: metadataLoadError.message, details: metadataLoadError.details, projectId });
    const loadIssue = classifySupabaseError(metadataLoadError);
    return (
      <AppShell>
        <section className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-5 text-sm text-amber-100">
          <h1 className="text-base font-semibold">Could not load test case metadata</h1>
          <p className="mt-2">{loadIssue.message}</p>
        </section>
      </AppShell>
    );
  }

  const { data: generations } = generationsResult;
  const { data: versions } = versionsResult;

  const generationMap = new Map((generations ?? []).map((generation) => [generation.id, generation]));
  const currentVersionMap = new Map<string, number>();
  const latestVersionMap = new Map<string, TestCaseVersion>();
  for (const version of versions ?? []) {
    currentVersionMap.set(version.test_case_id, Math.max(currentVersionMap.get(version.test_case_id) ?? 0, version.version_number));
    if (!latestVersionMap.has(version.test_case_id)) {
      latestVersionMap.set(version.test_case_id, version);
    }
  }

  const enrichedCases = ((testCases ?? []) as TestCase[]).map((testCase) => {
    const generation = testCase.ai_generation_id ? generationMap.get(testCase.ai_generation_id) : null;
    const latestVersion = latestVersionMap.get(testCase.id) ?? null;
    return mergeCaseSnapshot(
      {
        ...testCase,
        requirement_title: requirementMap.get(testCase.requirement_id) ?? "Unknown requirement",
        ai_provider: generation?.provider ?? null,
        ai_model: generation?.model ?? null,
        current_version: currentVersionMap.get(testCase.id) ?? 1,
      },
      latestVersion,
    );
  });

  const message =
    query.success === "updated"
      ? "Test case updated and a new version was saved."
      : query.success === "nochanges"
        ? "No changes were detected, so the test case version was not incremented."
      : query.success === "inactive"
        ? "Test case deactivated."
        : query.success === "active"
          ? "Test case reactivated."
          : query.error === "validation"
            ? "Please provide at least a title before saving."
          : query.error
            ? "The living test suite action could not be completed."
            : null;

  return (
    <AppShell>
      <section className="space-y-5">
        <Link className={buttonVariants({ variant: "ghost", size: "sm" }) + " px-2"} href={`/dashboard/projects/${projectId}`}>
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Living Test Suite</p>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Manage saved cases, versions, and active coverage for this project.</p>
          </div>
          <div className="rounded-lg border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
            {enrichedCases.filter((item) => item.status === "active").length} active / {enrichedCases.length} total
          </div>
        </div>

        {message ? (
          <div
            className={
              "rounded-lg border px-3 py-2 text-sm " +
              (query.error
                ? "border-rose-300/50 bg-rose-500/10 text-rose-300"
                : "border-emerald-300/40 bg-emerald-500/10 text-emerald-200")
            }
          >
            {message}
          </div>
        ) : null}

        <LivingTestSuiteWorkspace
          testCases={enrichedCases}
          versions={versions ?? []}
          requirements={requirements ?? []}
          updateAction={updateTestCase}
          toggleStatusAction={toggleTestCaseStatus}
        />
      </section>
    </AppShell>
  );
}
