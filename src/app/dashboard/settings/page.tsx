import { redirect } from "next/navigation";

import { UsageEventsPanel } from "@/components/ai/usage-events-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { aiProviderRegistry } from "@/lib/ai/provider-registry";
import { getGeminiQuotaRemaining, type AiProviderSettingsRow, type AiUsageEventRow } from "@/lib/ai/provider-settings";
import { runGeminiMessages } from "@/lib/ai/providers/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AiProviderSettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    test?: string;
  }>;
};

const GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-pro"] as const;

async function saveGeminiSettings(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  const useByok = formData.get("useByok") === "on";
  const apiKey = String(formData.get("geminiApiKey") ?? "").trim();
  const model = String(formData.get("geminiModel") ?? "gemini-flash-latest").trim() || "gemini-flash-latest";
  const quotaLimit = Number(formData.get("quotaLimit") ?? 0);
  const { data: currentSettings } = await supabase.from("ai_provider_settings").select("*").eq("owner_id", user.id).maybeSingle();

  const { error } = await supabase.from("ai_provider_settings").upsert(
    {
      owner_id: user.id,
      provider: "gemini",
      use_byok: useByok,
      gemini_model: GEMINI_MODELS.includes(model as (typeof GEMINI_MODELS)[number]) ? model : "gemini-flash-latest",
      gemini_api_key: apiKey || null,
      gemini_free_quota_limit: Number.isFinite(quotaLimit) ? quotaLimit : currentSettings?.gemini_free_quota_limit ?? 0,
      gemini_free_quota_used: useByok ? 0 : currentSettings?.gemini_free_quota_used ?? 0,
    },
    { onConflict: "owner_id" },
  );

  if (error) {
    redirect("/dashboard/settings?error=save-failed");
  }

  redirect("/dashboard/settings?saved=1");
}

async function testGeminiConnection() {
  "use server";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  const { data: settings } = await supabase.from("ai_provider_settings").select("*").eq("owner_id", user.id).maybeSingle();
  const apiKey = settings?.use_byok ? settings?.gemini_api_key ?? "" : settings?.gemini_api_key ?? process.env.GEMINI_API_KEY ?? "";
  const model = settings?.gemini_model ?? "gemini-flash-latest";

  if (!apiKey) {
    redirect("/dashboard/settings?test=missing-provider");
  }

  try {
    await runGeminiMessages(
      [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: JSON.stringify({ ping: true }) },
      ],
      { apiKey, model, maxOutputTokens: 64 },
    );
    redirect("/dashboard/settings?test=ok");
  } catch {
    redirect("/dashboard/settings?test=failed");
  }
}

export default async function AiProviderSettingsPage({ searchParams }: AiProviderSettingsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [settingsResult, usageResult] = await Promise.all([
    supabase.from("ai_provider_settings").select("*").maybeSingle(),
    supabase.from("ai_usage_events").select("*").eq("owner_id", userData.user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const settings = settingsResult.data as AiProviderSettingsRow | null;
  const usageEvents = (usageResult.data ?? []) as AiUsageEventRow[];
  const activeProvider = aiProviderRegistry[0];
  const usingByok = settings?.use_byok ?? false;
  const selectedModel = settings?.gemini_model ?? "gemini-flash-latest";
  const { quotaLimit, quotaUsed, quotaRemaining } = getGeminiQuotaRemaining(settings);
  const providerError =
    params?.test === "missing-provider"
      ? "No AI provider configured. Add a Gemini API key in AI Settings to run analysis."
      : params?.test === "failed"
        ? "Connection test failed. Check the saved Gemini API key and try again."
        : params?.error === "save-failed"
          ? "Settings could not be saved. Please try again."
          : null;
  const recentGenerationIds = usageEvents.map((event) => event.ai_generation_id).filter((id): id is string => Boolean(id));
  const { data: recentGenerations } = recentGenerationIds.length
    ? await supabase
        .from("ai_generations")
        .select("id, generation_type, model, status, token_input, token_output, response_time_ms, error_message, error_code")
        .in("id", recentGenerationIds)
    : { data: [] };

  const generationMap = Object.fromEntries((recentGenerations ?? []).map((generation) => [generation.id, generation]));
  const providerCards = [
    {
      ...activeProvider,
      status: settings?.gemini_api_key ? "Configured" : "Not configured",
      connection: settings?.gemini_api_key ? "Ready" : "Not connected",
      model: selectedModel,
      byok: usingByok ? "On" : "Off",
      hint: settings?.gemini_api_key ? "Saved key: ••••" : "No saved Gemini key yet",
      activeCard: true,
    },
    { key: "openai", name: "OpenAI", status: "Coming soon", connection: "Not available", model: "—", byok: "—", hint: "Future provider slot", activeCard: false },
    { key: "claude", name: "Claude", status: "Coming soon", connection: "Not available", model: "—", byok: "—", hint: "Future provider slot", activeCard: false },
    { key: "openrouter", name: "OpenRouter", status: "Coming soon", connection: "Not available", model: "—", byok: "—", hint: "Future provider slot", activeCard: false },
    { key: "ollama", name: "Ollama Local", status: "Coming soon", connection: "Not available", model: "—", byok: "—", hint: "Future provider slot", activeCard: false },
  ] as const;

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">AI Provider Settings</p>
          <h1 className="text-2xl font-semibold tracking-tight">AI Providers</h1>
          <p className="text-sm text-muted-foreground">Configure active providers and review recent usage.</p>
        </div>

        <div className="grid gap-3">
          {providerCards.map((provider) => (
            <article key={provider.key} className={cn("rounded-lg border p-4", provider.activeCard ? "bg-background" : "bg-muted/20")}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-sm text-muted-foreground">Status: {provider.status}</p>
                  <p className="text-sm text-muted-foreground">Connection: {provider.connection}</p>
                  <p className="text-sm text-muted-foreground">Model: {provider.model}</p>
                  <p className="text-sm text-muted-foreground">BYOK: {provider.byok}</p>
                  <p className="text-sm text-muted-foreground">{provider.hint}</p>
                  {provider.activeCard && providerError ? <p className="text-sm text-destructive">{providerError}</p> : null}
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs",
                    provider.activeCard && settings?.gemini_api_key
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-muted bg-muted/30 text-muted-foreground",
                  )}
                >
                  {provider.activeCard ? (settings?.gemini_api_key ? "Configured" : "Not configured") : provider.status}
                </span>
              </div>

              {provider.activeCard ? (
                <form action={saveGeminiSettings} className="mt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium">Gemini API key</span>
                      <input
                        name="geminiApiKey"
                        type="password"
                        placeholder={settings?.gemini_api_key ? "Replace Gemini API key" : "Paste your Gemini API key"}
                        className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium">Gemini model</span>
                      <select
                        name="geminiModel"
                        defaultValue={selectedModel}
                        className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="gemini-flash-latest">gemini-flash-latest</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                      </select>
                    </label>

                    {!usingByok ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium">Free quota limit</span>
                        <input
                          name="quotaLimit"
                          type="number"
                          min={0}
                          defaultValue={quotaLimit}
                          className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </label>
                    ) : (
                      <div className="space-y-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        Free quota applies only to platform-managed keys.
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input name="useByok" type="checkbox" defaultChecked={usingByok} className="size-4 rounded border" />
                    Use BYOK for Gemini
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit">Save settings</Button>
                    <Button type="submit" formAction={testGeminiConnection} variant="outline">
                      Test connection
                    </Button>
                    <p className="text-sm text-muted-foreground">No AI calls are made from this page.</p>
                  </div>
                </form>
              ) : null}
            </article>
          ))}
        </div>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">Free Gemini usage</h2>
          {usingByok ? (
            <p className="mt-2 text-sm text-muted-foreground">BYOK is enabled, so free quota is not enforced.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Remaining usage: {quotaRemaining} of {quotaLimit}</p>
              <p className="text-sm text-muted-foreground">Used: {quotaUsed}</p>
            </>
          )}
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">Recent usage events</h2>
          <div className="mt-3">
            <UsageEventsPanel events={usageEvents} generationMap={generationMap} />
          </div>
        </section>
      </section>
    </AppShell>
  );
}
