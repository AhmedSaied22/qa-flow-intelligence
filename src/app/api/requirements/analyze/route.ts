import { NextResponse, type NextRequest } from "next/server";

import { getPrompt } from "@/lib/ai/prompts/registry";
import { hashAiInput } from "@/lib/ai/hash";
import { runGeminiMessages } from "@/lib/ai/providers/gemini";
import { GeminiParseError, GeminiResponseError, AiProviderConfigurationError } from "@/lib/ai/providers/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultRequirementPlatforms } from "@/lib/ai/prompts/requirement-analysis/v1";
import type { PlatformKind } from "@/lib/platform/types";

function getRequirementAnalysisValidationErrors(value: unknown) {
  const errors: string[] = [];

  if (typeof value !== "object" || value === null) {
    return ["Output must be a JSON object."];
  }

  const record = value as Record<string, unknown>;
  if (typeof record.summary !== "string") errors.push("summary must be a string.");
  if (!["low", "medium", "high"].includes(String(record.risk_level))) {
    errors.push("risk_level must be low, medium, or high.");
  }
  if (!Array.isArray(record.ambiguities) || !record.ambiguities.every((item) => typeof item === "string")) {
    errors.push("ambiguities must be an array of strings.");
  }
  if (!Array.isArray(record.missing_details) || !record.missing_details.every((item) => typeof item === "string")) {
    errors.push("missing_details must be an array of strings.");
  }
  if (!Array.isArray(record.edge_cases) || !record.edge_cases.every((item) => typeof item === "string")) {
    errors.push("edge_cases must be an array of strings.");
  }
  if (typeof record.suggested_test_case_count !== "number") {
    errors.push("suggested_test_case_count must be a number.");
  }
  if (
    !Array.isArray(record.platform_focus) ||
    !record.platform_focus.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const platformRecord = item as Record<string, unknown>;
      return (
        (platformRecord.platform === "web" || platformRecord.platform === "mobile") &&
        Array.isArray(platformRecord.highlights) &&
        platformRecord.highlights.every((highlight) => typeof highlight === "string")
      );
    })
  ) {
    errors.push("platform_focus must include web/mobile items with string highlights.");
  }

  return errors;
}

function getSafeTopLevelKeys(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value as Record<string, unknown>).slice(0, 20);
}

function stringifyAnalysisItem(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "object" || value === null) return "";

  const record = value as Record<string, unknown>;
  const preferredKeys = ["text", "summary", "title", "description", "detail", "issue", "message", "scenario", "risk"];
  const preferredValue = preferredKeys.map((key) => record[key]).find((item) => typeof item === "string");

  if (typeof preferredValue === "string") {
    return preferredValue;
  }

  return JSON.stringify(record);
}

function normalizeStringArrayItems(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map(stringifyAnalysisItem).filter((item) => item.length > 0);
}

function normalizeRequirementAnalysisOutput(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  return {
    ...record,
    risk_level: typeof record.risk_level === "string" ? record.risk_level.toLowerCase() : record.risk_level,
    ambiguities: normalizeStringArrayItems(record.ambiguities),
    missing_details: normalizeStringArrayItems(record.missing_details),
    edge_cases: normalizeStringArrayItems(record.edge_cases),
    suggested_test_case_count:
      typeof record.suggested_test_case_count === "string" && record.suggested_test_case_count.trim() !== "" && Number.isFinite(Number(record.suggested_test_case_count))
        ? Number(record.suggested_test_case_count)
        : record.suggested_test_case_count,
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
  const platforms = Array.isArray(body?.platforms)
    ? body.platforms.filter((platform: unknown): platform is PlatformKind => platform === "web" || platform === "mobile")
    : [];

  if (!requirementId) {
    return NextResponse.json({ error: "missing_requirement_id" }, { status: 400 });
  }

  const [{ data: requirement }, { data: project }, { data: settings }] = await Promise.all([
    supabase.from("requirements").select("*").eq("id", requirementId).maybeSingle(),
    supabase
      .from("projects")
      .select("*")
      .eq("id", body?.projectId ?? "")
      .maybeSingle(),
    supabase.from("ai_provider_settings").select("*").eq("owner_id", userData.user.id).maybeSingle(),
  ]);

  if (!requirement || !project || project.owner_id !== userData.user.id || requirement.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const prompt = getPrompt("requirement-analysis");
  const input = {
    title: requirement.title,
    description: requirement.description,
    projectName: project.name,
    platforms: platforms.length > 0 ? platforms : getDefaultRequirementPlatforms(requirement),
  };

  if (!prompt.validateInput(input)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
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
    let cachedGeneration = cached.data;

    if (cached.data.requirement_id !== requirement.id || cached.data.project_id !== project.id) {
      const { data: linkedGeneration, error: linkError } = await supabase
        .from("ai_generations")
        .insert({
          owner_id: userData.user.id,
          project_id: project.id,
          requirement_id: requirement.id,
          provider: cached.data.provider,
          model: cached.data.model,
          prompt_version: cached.data.prompt_version,
          generation_type: cached.data.generation_type,
          input_hash: cached.data.input_hash,
          output_json: cached.data.output_json,
          cache_status: "hit",
          status: "success",
          response_time_ms: 0,
          token_input: null,
          token_output: null,
          estimated_cost: null,
        })
        .select("*")
        .single();

      if (linkError) {
        console.info("Requirement analysis cache link failed", {
          code: linkError.code,
          message: linkError.message,
          requirementId: requirement.id,
          projectId: project.id,
        });
      }

      cachedGeneration = linkedGeneration ?? cached.data;
    }

    await supabase.from("ai_usage_events").insert({
      owner_id: userData.user.id,
      ai_generation_id: cachedGeneration.id,
      provider: cachedGeneration.provider,
      model: cachedGeneration.model,
      source: settings?.use_byok ? "byok" : "free_default",
      tokens_in: 0,
      tokens_out: 0,
      response_time_ms: 0,
      cache_hit: true,
    });

    return NextResponse.json({
      cached: true,
      generation: cachedGeneration,
      analysis: cachedGeneration.output_json,
    });
  }

  const apiKey = settings?.use_byok ? settings?.gemini_api_key ?? "" : settings?.gemini_api_key ?? process.env.GEMINI_API_KEY ?? "";
  const model = settings?.gemini_model ?? "gemini-flash-latest";
  console.info("Requirement analysis provider loaded", {
    provider: "gemini",
    keyExists: Boolean(apiKey),
    model,
  });
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "gemini_not_configured",
        message: "No AI provider configured. Add a Gemini API key in AI Settings to run analysis.",
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();

  try {
    const generationPrompt = prompt.buildMessages(input);
    const rawAnalysis = await runGeminiMessages<unknown>(generationPrompt, {
      apiKey,
      model,
      maxOutputTokens: prompt.maxOutputTokens,
    });
    const analysis = normalizeRequirementAnalysisOutput(rawAnalysis);

    if (!prompt.validateOutput(analysis)) {
      const validationErrors = getRequirementAnalysisValidationErrors(analysis);
      console.info("Requirement analysis schema validation failed", {
        provider: "gemini",
        model,
        parsedTopLevelKeys: getSafeTopLevelKeys(rawAnalysis),
        normalizedTopLevelKeys: getSafeTopLevelKeys(analysis),
        validationErrors,
      });

      const { data: failure } = await supabase
        .from("ai_generations")
        .insert({
          owner_id: userData.user.id,
          provider: "gemini",
          model,
          prompt_version: `${prompt.id}@${prompt.version}`,
          generation_type: prompt.task,
          input_hash: inputHash,
          cache_status: "miss",
          status: "failed",
          response_time_ms: Date.now() - startedAt,
          error_code: "invalid_ai_output",
          error_message: `Gemini returned structured content that did not match the required analysis schema: ${validationErrors.join(" ")}`,
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
          error: "invalid_ai_output",
          message: `Gemini returned structured content that did not match the required analysis schema. ${validationErrors.join(" ")}`,
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
      output_json: analysis,
      cache_status: "miss",
      status: "success",
      response_time_ms: Date.now() - startedAt,
      token_input: null,
      token_output: null,
      estimated_cost: null,
    };

    const { data: generation, error } = await supabase
      .from("ai_generations")
      .insert(generationPayload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "generation_persist_failed" }, { status: 500 });
    }

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

    return NextResponse.json({ cached: false, generation, analysis });
  } catch (error) {
    if (error instanceof GeminiResponseError) {
      console.info("Requirement analysis Gemini response status", {
        provider: "gemini",
        model,
        status: error.status,
      });
    }
    if (error instanceof GeminiParseError) {
      console.info("Requirement analysis Gemini parse failed", {
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
        provider: "gemini",
        model,
        prompt_version: `${prompt.id}@${prompt.version}`,
        generation_type: prompt.task,
        input_hash: inputHash,
        cache_status: "miss",
        status: "failed",
        response_time_ms: Date.now() - startedAt,
        error_code:
          error instanceof AiProviderConfigurationError
            ? "provider_not_configured"
            : error instanceof GeminiResponseError
              ? `gemini_http_${error.status}`
              : "gemini_request_failed",
        error_message:
          error instanceof AiProviderConfigurationError
            ? "No AI provider configured. Add a Gemini API key in AI Settings to run analysis."
            : error instanceof GeminiResponseError
              ? error.status === 404
                ? "Selected Gemini model is unavailable. Try gemini-flash-latest or choose another model."
                : "Gemini returned an error response."
              : error instanceof GeminiParseError
                ? error.finishReason === "MAX_TOKENS"
                  ? "Gemini returned truncated JSON before the analysis could be parsed."
                  : "Gemini returned content that could not be parsed into structured JSON."
              : "The requirement analysis request could not be completed.",
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
          error: "analysis_failed",
          message:
            error instanceof AiProviderConfigurationError
              ? "No AI provider configured. Add a Gemini API key in AI Settings to run analysis."
              : error instanceof GeminiResponseError && error.status === 404
              ? "Selected Gemini model is unavailable. Try gemini-flash-latest or choose another model."
              : error instanceof GeminiParseError
                ? error.finishReason === "MAX_TOKENS"
                  ? "Gemini returned truncated JSON before the analysis could be parsed. Try running analysis again."
                  : "Gemini returned content that could not be parsed into structured JSON."
              : "Requirement analysis could not be completed.",
      },
      { status: 502 },
    );
  }
}
