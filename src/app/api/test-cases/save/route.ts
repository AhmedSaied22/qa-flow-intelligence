import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function normalizePriority(value: unknown): "critical" | "high" | "medium" | "low" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return null;
}

function isRetryableNetworkError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = (error?.message ?? "").toLowerCase();
  const code = (error?.code ?? "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("retryable") ||
    message.includes("econnreset") ||
    message.includes("enotfound") ||
    code.includes("timeout")
  );
}

function saveRequestErrorResponse(error: { message?: string | null; code?: string | null } | null | undefined, fallback: string) {
  if (isRetryableNetworkError(error)) {
    return NextResponse.json(
      { error: "network_error", message: "Connection lost. Selected test cases were not saved yet. Please reconnect and try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: "save_request_failed", message: fallback }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("Test case save auth check failed", { message: userError.message });
    return saveRequestErrorResponse(userError, "Could not verify your session. Please try again.");
  }

  if (!userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const generationId = typeof body?.generationId === "string" ? body.generationId : "";
  const selectedIndexes: number[] = [];
  if (Array.isArray(body?.selectedIndexes)) {
    for (const index of body.selectedIndexes as unknown[]) {
      if (typeof index === "number" && Number.isInteger(index) && index >= 0) {
        selectedIndexes.push(index);
      }
    }
  }
  const uniqueSelectedIndexes = Array.from(new Set(selectedIndexes));

  if (!generationId || uniqueSelectedIndexes.length === 0) {
    console.info("Test case save validation failed", {
      generationIdPresent: Boolean(generationId),
      selectedIndexesCount: uniqueSelectedIndexes.length,
    });
    return NextResponse.json({ error: "missing_selection" }, { status: 400 });
  }

  const { data: generation, error: generationError } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("id", generationId)
    .eq("owner_id", userData.user.id)
    .eq("status", "success")
    .maybeSingle();

  if (generationError) {
    console.error("Test case save generation lookup failed", {
      code: generationError.code,
      message: generationError.message,
      details: generationError.details,
      generationId,
    });
    return saveRequestErrorResponse(generationError, "Could not load the generated test cases.");
  }

  if (!generation?.output_json || generation.generation_type !== "Generate practical test cases from requirement analysis.") {
    console.info("Test case save generation lookup failed", {
      generationId,
      found: Boolean(generation?.output_json),
      generationType: generation?.generation_type,
    });
    return NextResponse.json({ error: "generation_not_found" }, { status: 404 });
  }

  const preview = generation.output_json as {
    test_cases: Array<{
      title: string;
      description: string;
      preconditions: string;
      steps: string[];
      expected_result: string;
      platform: string;
      risk_level: string;
      priority?: string;
      type?: string;
      test_data?: string[];
      automation_candidate?: string;
    }>;
  };

  const selectedCases = uniqueSelectedIndexes
    .map((index: number) => preview.test_cases[index])
    .filter(Boolean);

  if (selectedCases.length === 0) {
    console.info("Test case save selection empty after filtering", {
      generationId,
      selectedIndexes: uniqueSelectedIndexes,
    });
    return NextResponse.json({ error: "no_cases_selected" }, { status: 400 });
  }

  const { data: existingCases, error: existingCasesError } = await supabase
    .from("test_cases")
    .select("id,title,platform,requirement_id")
    .eq("requirement_id", generation.requirement_id ?? "")
    .eq("status", "active");

  if (existingCasesError) {
    console.error("Test case save existing case lookup failed", {
      code: existingCasesError.code,
      message: existingCasesError.message,
      details: existingCasesError.details,
    });
    return saveRequestErrorResponse(existingCasesError, "Could not verify existing saved test cases.");
  }

  const existingKeySet = new Set(
    (existingCases ?? []).map((item) => `${item.requirement_id}:${item.platform}:${normalizeTitle(item.title)}`),
  );

  const inserted: Array<{ title: string; skipped: boolean }> = [];
  const failures: Array<{ title: string; reason: string }> = [];

  for (const testCase of selectedCases) {
    if (!generation.project_id || !generation.requirement_id) {
      return NextResponse.json({ error: "generation_missing_links" }, { status: 400 });
    }

    const duplicateKey = `${generation.requirement_id}:${testCase.platform}:${normalizeTitle(testCase.title)}`;
    if (existingKeySet.has(duplicateKey)) {
      inserted.push({ title: testCase.title, skipped: true });
      continue;
    }

    const insertPayload = {
      project_id: generation.project_id,
      requirement_id: generation.requirement_id,
      ai_generation_id: generation.id,
      title: testCase.title,
      description: testCase.description,
      preconditions: testCase.preconditions,
      steps: testCase.steps,
      expected_result: testCase.expected_result,
      platform: testCase.platform,
      risk_level: testCase.risk_level,
      priority:
        normalizePriority(testCase.priority) ??
        (testCase.risk_level === "high" ? "critical" : testCase.risk_level === "medium" ? "high" : "low"),
      case_type: testCase.type ?? "functional",
      test_data: testCase.test_data ?? [],
      automation_candidate: testCase.automation_candidate ?? null,
      status: "active",
    };

    const { data: createdCase, error } = await supabase
      .from("test_cases")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !createdCase) {
      console.error("Test case save insert failed", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        title: testCase.title,
        platform: testCase.platform,
      });
      if (error?.code === "42501") {
        return NextResponse.json(
          {
            error: "forbidden",
            message: "Supabase blocked saving test cases because permissions or RLS policies rejected the insert.",
          },
          { status: 403 },
        );
      }
      if (error?.code === "PGRST204") {
        return NextResponse.json(
          {
            error: "schema_cache_stale",
            message: "The Living Test Suite migration is not visible to Supabase PostgREST yet. Reload schema cache before saving full test case metadata.",
          },
          { status: 409 },
        );
      }
      if (isRetryableNetworkError(error)) {
        return saveRequestErrorResponse(error, "Selected test cases could not be saved.");
      }
      failures.push({ title: testCase.title, reason: error?.code ?? "insert_failed" });
      continue;
    }

    const versionPayload = {
      test_case_id: createdCase.id,
      version_number: 1,
      title: createdCase.title,
      description: createdCase.description,
      preconditions: createdCase.preconditions,
      steps: createdCase.steps,
      expected_result: createdCase.expected_result,
      platform: createdCase.platform,
      risk_level: createdCase.risk_level,
      priority: createdCase.priority,
      case_type: createdCase.case_type,
      test_data: createdCase.test_data,
      automation_candidate: createdCase.automation_candidate,
      status: createdCase.status,
      change_reason: "Initial saved version",
    };

    const { error: versionError } = await supabase.from("test_case_versions").insert(versionPayload);

    if (versionError) {
      console.error("Test case version insert failed", {
        code: versionError.code,
        message: versionError.message,
        details: versionError.details,
        testCaseId: createdCase.id,
      });
      if (isRetryableNetworkError(versionError)) {
        return saveRequestErrorResponse(versionError, "The test case was saved, but its initial version could not be created.");
      }
      failures.push({ title: createdCase.title, reason: versionError.code ?? "version_insert_failed" });
    }

    inserted.push({ title: createdCase.title, skipped: false });
  }

  const saved = inserted.filter((item) => !item.skipped).length;
  const skipped = inserted.filter((item) => item.skipped).length;

  if (failures.length > 0 && saved === 0) {
    return NextResponse.json(
      {
        error: "save_failed",
        message: "Selected test cases could not be saved. Check server logs for safe Supabase error details.",
        saved,
        skipped,
        failures,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    saved,
    skipped,
    failures: failures.length,
    message:
      saved > 0
        ? `${saved} test cases saved to the living test suite.`
        : skipped > 0
          ? "Selected test cases are already saved in the living test suite."
          : "No new test cases were saved.",
    items: inserted,
  });
}
