import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

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

  if (!generationId || selectedIndexes.length === 0) {
    console.info("Test case save validation failed", {
      generationIdPresent: Boolean(generationId),
      selectedIndexesCount: selectedIndexes.length,
    });
    return NextResponse.json({ error: "missing_selection" }, { status: 400 });
  }

  const { data: generation } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("id", generationId)
    .eq("owner_id", userData.user.id)
    .eq("status", "success")
    .maybeSingle();

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
    }>;
  };

  const selectedCases = selectedIndexes
    .map((index: number) => preview.test_cases[index])
    .filter(Boolean);

  if (selectedCases.length === 0) {
    console.info("Test case save selection empty after filtering", {
      generationId,
      selectedIndexes,
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
    return NextResponse.json({ error: "existing_case_lookup_failed", message: "Could not verify existing saved test cases." }, { status: 500 });
  }

  const existingKeySet = new Set(
    (existingCases ?? []).map((item) => `${item.requirement_id}:${item.platform}:${normalizeTitle(item.title)}`),
  );

  const inserted: Array<{ title: string; skipped: boolean }> = [];

  for (const testCase of selectedCases) {
    if (!generation.project_id || !generation.requirement_id) {
      return NextResponse.json({ error: "generation_missing_links" }, { status: 400 });
    }

    const duplicateKey = `${generation.requirement_id}:${testCase.platform}:${normalizeTitle(testCase.title)}`;
    if (existingKeySet.has(duplicateKey)) {
      inserted.push({ title: testCase.title, skipped: true });
      continue;
    }

    const { data: createdCase, error } = await supabase
      .from("test_cases")
      .insert({
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
        status: "active",
      })
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
      continue;
    }

    const { error: versionError } = await supabase.from("test_case_versions").insert({
      test_case_id: createdCase.id,
      version_number: 1,
      title: createdCase.title,
      description: createdCase.description,
      preconditions: createdCase.preconditions,
      steps: createdCase.steps,
      expected_result: createdCase.expected_result,
      platform: createdCase.platform,
      risk_level: createdCase.risk_level,
      status: createdCase.status,
    });

    if (versionError) {
      console.error("Test case version insert failed", {
        code: versionError.code,
        message: versionError.message,
        details: versionError.details,
        testCaseId: createdCase.id,
      });
    }

    inserted.push({ title: createdCase.title, skipped: false });
  }

  return NextResponse.json({ saved: inserted.filter((item) => !item.skipped).length, skipped: inserted.filter((item) => item.skipped).length, items: inserted });
}
