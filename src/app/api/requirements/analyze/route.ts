import { NextResponse, type NextRequest } from "next/server";

import { getPrompt } from "@/lib/ai/prompts/registry";
import { hashAiInput } from "@/lib/ai/hash";
import { runGeminiMessages } from "@/lib/ai/providers/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultRequirementPlatforms } from "@/lib/ai/prompts/requirement-analysis/v1";
import type { PlatformKind } from "@/lib/platform/types";

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
    .maybeSingle();

  if (cached.data?.output_json) {
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
      analysis: cached.data.output_json,
    });
  }

  const apiKey = settings?.gemini_api_key ?? process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json({ error: "gemini_not_configured" }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const analysis = await runGeminiMessages(prompt.buildMessages(input), {
      apiKey,
      model: "gemini-1.5-flash",
    });

    if (!prompt.validateOutput(analysis)) {
      return NextResponse.json({ error: "invalid_ai_output" }, { status: 502 });
    }

    const generationPayload = {
      owner_id: userData.user.id,
      provider: "gemini",
      model: "gemini-1.5-flash",
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
      model: "gemini-1.5-flash",
      source: settings?.use_byok ? "byok" : "free_default",
      tokens_in: 0,
      tokens_out: 0,
      response_time_ms: generation.response_time_ms ?? null,
      cache_hit: false,
    });

    return NextResponse.json({ cached: false, generation, analysis });
  } catch {
    const { data: failure } = await supabase
      .from("ai_generations")
      .insert({
        owner_id: userData.user.id,
        provider: "gemini",
        model: "gemini-1.5-flash",
        prompt_version: `${prompt.id}@${prompt.version}`,
        generation_type: prompt.task,
        input_hash: inputHash,
        cache_status: "miss",
        status: "failed",
        response_time_ms: Date.now() - startedAt,
        error_code: "gemini_request_failed",
        error_message: "The requirement analysis request could not be completed.",
      })
      .select("*")
      .single();

    if (failure) {
      await supabase.from("ai_usage_events").insert({
        owner_id: userData.user.id,
        ai_generation_id: failure.id,
        provider: "gemini",
        model: "gemini-1.5-flash",
        source: settings?.use_byok ? "byok" : "free_default",
        tokens_in: 0,
        tokens_out: 0,
        response_time_ms: failure.response_time_ms ?? null,
        cache_hit: false,
      });
    }

    return NextResponse.json(
      { error: "analysis_failed", message: "Requirement analysis could not be completed." },
      { status: 502 },
    );
  }
}
