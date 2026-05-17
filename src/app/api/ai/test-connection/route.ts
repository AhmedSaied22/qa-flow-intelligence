import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runGeminiMessages } from "@/lib/ai/providers/gemini";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: settings } = await supabase.from("ai_provider_settings").select("*").eq("owner_id", userData.user.id).maybeSingle();
  const apiKey = settings?.use_byok ? settings?.gemini_api_key ?? "" : settings?.gemini_api_key ?? process.env.GEMINI_API_KEY ?? "";
  const model = settings?.gemini_model ?? "gemini-flash-latest";

  if (!apiKey) {
    return NextResponse.json(
      { error: "gemini_not_configured", message: "No AI provider configured. Add a Gemini API key in AI Settings to run analysis." },
      { status: 400 },
    );
  }

  try {
    const response = await runGeminiMessages(
      [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: JSON.stringify({ ping: true }) },
      ],
      { apiKey, model, maxOutputTokens: 64 },
    );

    return NextResponse.json({ ok: true, response });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number((error as { status?: unknown }).status) : undefined;
    if (status === 404) {
      return NextResponse.json(
        {
          error: "model_unavailable",
          message: "Selected Gemini model is unavailable. Try gemini-flash-latest or choose another model.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "connection_failed", message: error instanceof Error ? error.message : "Connection test failed." }, { status: 502 });
  }
}
