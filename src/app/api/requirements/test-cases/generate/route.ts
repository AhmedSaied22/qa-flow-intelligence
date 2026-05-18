import { NextResponse, type NextRequest } from "next/server";

import { getPrompt } from "@/lib/ai/prompts/registry";
import { hashAiInput } from "@/lib/ai/hash";
import { runGeminiMessages } from "@/lib/ai/providers/gemini";
import { GeminiParseError, GeminiResponseError } from "@/lib/ai/providers/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultRequirementPlatforms, type RequirementAnalysisOutput } from "@/lib/ai/prompts/requirement-analysis/v1";
import type { TestCaseGenerationOutput } from "@/lib/ai/prompts/test-case-generation/v1";
import type { PlatformKind } from "@/lib/platform/types";

function getTestCaseGenerationValidationErrors(value: unknown) {
  const errors: string[] = [];

  if (typeof value !== "object" || value === null) {
    return ["Output must be a JSON object."];
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.test_cases)) {
    errors.push("test_cases must be an array.");
    return errors;
  }

  if (record.test_cases.length === 0) {
    errors.push("test_cases must include at least one item.");
  }

  if (record.test_cases.length > 20) {
    errors.push("test_cases must not exceed 20 items.");
  }

  record.test_cases.forEach((item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push(`test_cases[${index}] must be an object.`);
      return;
    }

    const testCase = item as Record<string, unknown>;
    if (typeof testCase.title !== "string" || testCase.title.trim() === "") {
      errors.push(`test_cases[${index}].title must be a non-empty string.`);
    }
    if (typeof testCase.description !== "string" || testCase.description.trim() === "") {
      errors.push(`test_cases[${index}].description must be a non-empty string.`);
    }
    if (typeof testCase.preconditions !== "string") {
      errors.push(`test_cases[${index}].preconditions must be a string.`);
    }
    if (!Array.isArray(testCase.steps) || !testCase.steps.every((step) => typeof step === "string")) {
      errors.push(`test_cases[${index}].steps must be an array of strings.`);
    }
    if (typeof testCase.expected_result !== "string" || testCase.expected_result.trim() === "") {
      errors.push(`test_cases[${index}].expected_result must be a non-empty string.`);
    }
    if (testCase.platform !== "web" && testCase.platform !== "mobile") {
      errors.push(`test_cases[${index}].platform must be web or mobile.`);
    }
    if (testCase.risk_level !== "low" && testCase.risk_level !== "medium" && testCase.risk_level !== "high") {
      errors.push(`test_cases[${index}].risk_level must be low, medium, or high.`);
    }
    if (testCase.type !== undefined && typeof testCase.type !== "string") {
      errors.push(`test_cases[${index}].type must be a string when present.`);
    }
    if (testCase.test_data !== undefined && (!Array.isArray(testCase.test_data) || !testCase.test_data.every((entry) => typeof entry === "string"))) {
      errors.push(`test_cases[${index}].test_data must be an array of strings when present.`);
    }
    if (testCase.automation_candidate !== undefined && typeof testCase.automation_candidate !== "string") {
      errors.push(`test_cases[${index}].automation_candidate must be a string when present.`);
    }
  });

  return errors;
}

function normalizeTestCaseValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizeTestCaseValue).filter(Boolean).join("\n");
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return (
      (typeof record.text === "string" && record.text.trim()) ||
      (typeof record.value === "string" && record.value.trim()) ||
      JSON.stringify(record)
    );
  }
  return "";
}

function rateLimitMessage() {
  return "The AI service is rate limited right now. Please wait a moment and try again.";
}

function normalizeGeneratedTitle(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTestCaseGenerationOutput(value: unknown, limit: 5 | 10 | 20) {
  const sourceRecord =
    Array.isArray(value) ? { test_cases: value } : typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

  if (!sourceRecord) return value;

  return {
    ...sourceRecord,
    test_cases: Array.isArray(sourceRecord.test_cases)
      ? sourceRecord.test_cases.slice(0, limit).map((item) => {
          if (typeof item !== "object" || item === null) return item;
          const testCase = item as Record<string, unknown>;
          const steps =
            Array.isArray(testCase.steps) && testCase.steps.length > 0
              ? testCase.steps.map(normalizeTestCaseValue).filter(Boolean)
              : typeof testCase.steps === "string"
                ? testCase.steps
                    .split(/\r?\n|[•*-]\s+/)
                    .map((step) => step.trim())
                    .filter(Boolean)
                : [];
          const testData =
            Array.isArray(testCase.test_data) ? testCase.test_data.map(normalizeTestCaseValue).filter(Boolean) : undefined;
          const automationCandidateValue = testCase.automation_candidate;
          const automationCandidate =
            automationCandidateValue === undefined || automationCandidateValue === null
              ? undefined
              : normalizeTestCaseValue(automationCandidateValue);

          return {
            ...testCase,
            title: normalizeTestCaseValue(testCase.title),
            description: normalizeTestCaseValue(testCase.description),
            preconditions: normalizeTestCaseValue(testCase.preconditions),
            steps,
            expected_result: normalizeTestCaseValue(testCase.expected_result),
            risk_level: typeof testCase.risk_level === "string" ? testCase.risk_level.toLowerCase() : testCase.risk_level,
            type: typeof testCase.type === "string" ? testCase.type.trim() : testCase.type,
            test_data: testData,
            automation_candidate: automationCandidate,
          };
        })
      : sourceRecord.test_cases,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requirementId = typeof body?.requirementId === "string" ? body.requirementId : "";
  const limit = body?.limit === 5 || body?.limit === 10 || body?.limit === 20 ? body.limit : 10;
  const platforms = Array.isArray(body?.platforms)
    ? body.platforms.filter((platform: unknown): platform is PlatformKind => platform === "web" || platform === "mobile")
    : [];

  if (!requirementId) {
    return NextResponse.json({ error: "missing_requirement_id", message: "Requirement id is missing." }, { status: 400 });
  }

  const [{ data: requirement }, { data: project }, { data: settings }] = await Promise.all([
    supabase.from("requirements").select("*").eq("id", requirementId).maybeSingle(),
    supabase.from("projects").select("*").eq("id", body?.projectId ?? "").maybeSingle(),
    supabase.from("ai_provider_settings").select("*").eq("owner_id", userData.user.id).maybeSingle(),
  ]);

  if (!requirement || !project || project.owner_id !== userData.user.id || requirement.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const analysisGeneration = await supabase
    .from("ai_generations")
    .select("*")
    .eq("owner_id", userData.user.id)
    .eq("requirement_id", requirement.id)
    .eq("status", "success")
    .eq("generation_type", "Analyze requirements for ambiguity, missing details, and risk.")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const selectedPlatforms = platforms.length > 0 ? platforms : getDefaultRequirementPlatforms(requirement);
  const analysisPrompt = getPrompt("requirement-analysis");
  const analysisInput = {
    title: requirement.title,
    description: requirement.description,
    projectName: project.name,
    platforms: selectedPlatforms,
  };
  const analysisInputHash = hashAiInput({
    promptVersion: `${analysisPrompt.id}@${analysisPrompt.version}`,
    input: analysisInput,
  });
  const cachedAnalysis = analysisGeneration.data?.output_json
    ? null
    : await supabase
        .from("ai_generations")
        .select("*")
        .eq("owner_id", userData.user.id)
        .eq("prompt_version", `${analysisPrompt.id}@${analysisPrompt.version}`)
        .eq("input_hash", analysisInputHash)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  const analysisSource = analysisGeneration.data?.output_json ? analysisGeneration.data : cachedAnalysis?.data;

  if (!analysisSource?.output_json) {
    return NextResponse.json(
      {
        error: "missing_requirement_analysis",
        message: "No saved requirement analysis was found for this requirement. Run analysis again, then generate test cases.",
      },
      { status: 400 },
    );
  }

  if (!analysisSource.requirement_id || analysisSource.requirement_id !== requirement.id) {
    const { error: linkError } = await supabase.from("ai_generations").insert({
      owner_id: userData.user.id,
      project_id: project.id,
      requirement_id: requirement.id,
      provider: analysisSource.provider,
      model: analysisSource.model,
      prompt_version: analysisSource.prompt_version,
      generation_type: analysisSource.generation_type,
      input_hash: analysisSource.input_hash,
      output_json: analysisSource.output_json,
      cache_status: "hit",
      status: "success",
      response_time_ms: 0,
      token_input: null,
      token_output: null,
      estimated_cost: null,
    });

    if (linkError) {
      console.info("Test case generation analysis cache link failed", {
        code: linkError.code,
        message: linkError.message,
        requirementId: requirement.id,
        projectId: project.id,
      });
    }
  }

  const analysis = analysisSource.output_json as RequirementAnalysisOutput;
  const prompt = getPrompt("test-case-generation");
  const model = settings?.gemini_model ?? "gemini-flash-latest";
  const input = {
    projectName: project.name,
    requirementTitle: requirement.title,
    requirementDescription: requirement.description,
    requirementAnalysis: analysis,
    platforms: selectedPlatforms,
    limit,
  };

  if (!prompt.validateInput(input)) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "The saved analysis could not be used for test case generation.",
      },
      { status: 400 },
    );
  }

  const inputHash = hashAiInput({ promptVersion: `${prompt.id}@${prompt.version}`, input });

  const cached = await supabase
    .from("ai_generations")
    .select("*")
    .eq("owner_id", userData.user.id)
    .eq("prompt_version", `${prompt.id}@${prompt.version}`)
    .eq("input_hash", inputHash)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached.data?.output_json) {
    const { data: cachedSavedCases } = await supabase
      .from("test_cases")
      .select("title,platform")
      .eq("ai_generation_id", cached.data.id)
      .eq("status", "active");

    const cachedSavedIndexSet = new Set(
      (cachedSavedCases ?? []).map((item) => `${item.platform}:${normalizeGeneratedTitle(item.title)}`),
    );
    const cachedPreview = cached.data.output_json as { test_cases?: Array<{ title?: string; platform?: string }> };
    const cachedSavedIndexes = Array.isArray(cachedPreview.test_cases)
      ? cachedPreview.test_cases
          .map((item, index) =>
            item?.title && item?.platform && cachedSavedIndexSet.has(`${item.platform}:${normalizeGeneratedTitle(item.title)}`)
              ? index
              : -1,
          )
          .filter((index) => index >= 0)
      : [];

    await supabase.from("ai_usage_events").insert({
      owner_id: userData.user.id,
      ai_generation_id: cached.data.id,
      provider: cached.data.provider,
      model: cached.data.model,
      source: settings?.use_byok ? "byok" : "free_default",
      tokens_in: 0,
      tokens_out: 0,
      response_time_ms: 0,
      cache_hit: true,
    });

    return NextResponse.json({
      cached: true,
      generation: cached.data,
      preview: cached.data.output_json,
      savedIndexes: cachedSavedIndexes,
    });
  }

  const apiKey = settings?.gemini_api_key ?? process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "gemini_not_configured",
        message: "No AI provider configured. Add a Gemini API key in AI Settings to generate test cases.",
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();

  try {
    const generationPrompt = prompt.buildMessages(input);
    const response = await runGeminiMessages<TestCaseGenerationOutput>(generationPrompt, {
      apiKey,
      model,
      maxOutputTokens: limit === 5 ? 2600 : limit === 10 ? 4200 : 7000,
    });
    const preview = normalizeTestCaseGenerationOutput(response, limit);

    if (!prompt.validateOutput(preview)) {
      const validationErrors = getTestCaseGenerationValidationErrors(preview);
      console.info("Test case generation schema validation failed", {
        provider: "gemini",
        model,
        parsedTopLevelKeys: typeof response === "object" && response !== null ? Object.keys(response as Record<string, unknown>).slice(0, 20) : [],
        normalizedTopLevelKeys: typeof preview === "object" && preview !== null ? Object.keys(preview as Record<string, unknown>).slice(0, 20) : [],
        validationErrors,
      });
      return NextResponse.json(
        {
          error: "invalid_ai_output",
          message: `Gemini returned structured content that did not match the required test case schema. ${validationErrors.join(" ")}`,
        },
        { status: 502 },
      );
    }

    const generationPayload = {
      owner_id: userData.user.id,
      project_id: project.id,
      requirement_id: requirement.id,
      provider: "gemini",
      model,
      prompt_version: `${prompt.id}@${prompt.version}`,
      generation_type: prompt.task,
      input_hash: inputHash,
      output_json: preview,
      cache_status: "miss",
      status: "success",
      response_time_ms: Date.now() - startedAt,
      token_input: null,
      token_output: null,
      estimated_cost: null,
    };

    const { data: generation, error } = await supabase.from("ai_generations").insert(generationPayload).select("*").single();

    if (error) {
      console.error("Test case generation persist failed", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ error: "generation_persist_failed" }, { status: 500 });
    }

    const { data: savedCases } = await supabase
      .from("test_cases")
      .select("title,platform")
      .eq("ai_generation_id", generation.id)
      .eq("status", "active");

    const savedIndexSet = new Set((savedCases ?? []).map((item) => `${item.platform}:${normalizeGeneratedTitle(item.title)}`));
    const savedIndexes = Array.isArray(preview.test_cases)
      ? preview.test_cases
          .map((item, index) =>
            item?.title && item?.platform && savedIndexSet.has(`${item.platform}:${normalizeGeneratedTitle(item.title)}`)
              ? index
              : -1,
          )
          .filter((index) => index >= 0)
      : [];

    await supabase.from("ai_usage_events").insert({
      owner_id: userData.user.id,
      ai_generation_id: generation.id,
      provider: "gemini",
      model,
      source: settings?.use_byok ? "byok" : "free_default",
      tokens_in: 0,
      tokens_out: 0,
      response_time_ms: generation.response_time_ms ?? null,
      cache_hit: false,
    });

    return NextResponse.json({ cached: false, generation, preview, savedIndexes });
  } catch (error) {
    if (error instanceof GeminiResponseError) {
      console.info("Test case generation Gemini response status", {
        provider: "gemini",
        model,
        status: error.status,
      });
    }
    if (error instanceof GeminiParseError) {
      console.info("Test case generation Gemini parse failed", {
        provider: "gemini",
        model,
        candidatesExists: error.candidatesExists,
        contentPartsExists: error.contentPartsExists,
        textExists: error.textExists,
        textLength: error.textLength,
        finishReason: error.finishReason,
        textExcerpt: error.textExcerpt.slice(0, 300),
        textTail: error.textTail.slice(0, 300),
      });
    }
    const { data: failure } = await supabase
      .from("ai_generations")
      .insert({
        owner_id: userData.user.id,
        project_id: project.id,
        requirement_id: requirement.id,
        provider: "gemini",
        model,
        prompt_version: `${prompt.id}@${prompt.version}`,
        generation_type: prompt.task,
        input_hash: inputHash,
        cache_status: "miss",
        status: "failed",
        response_time_ms: Date.now() - startedAt,
        error_code: "gemini_request_failed",
        error_message:
          error instanceof GeminiParseError
            ? error.finishReason === "MAX_TOKENS"
              ? "The AI response was too long. Try generating fewer cases."
              : "Gemini returned content that could not be parsed into structured JSON."
            : error instanceof GeminiResponseError && error.status === 429
              ? rateLimitMessage()
            : "The test case generation request could not be completed.",
      })
      .select("*")
      .single();

    if (failure) {
      await supabase.from("ai_usage_events").insert({
        owner_id: userData.user.id,
        ai_generation_id: failure.id,
        provider: "gemini",
        model,
        source: settings?.use_byok ? "byok" : "free_default",
        tokens_in: 0,
        tokens_out: 0,
        response_time_ms: failure.response_time_ms ?? null,
        cache_hit: false,
      });
    }

    return NextResponse.json(
      {
        error: "generation_failed",
        message:
          error instanceof GeminiParseError
            ? error.finishReason === "MAX_TOKENS"
              ? "The AI response was too long. Try generating fewer cases."
              : "Gemini returned content that could not be parsed into structured JSON."
            : error instanceof GeminiResponseError && error.status === 429
              ? rateLimitMessage()
            : "Test case generation could not be completed.",
      },
      { status: 502 },
    );
  }
}
