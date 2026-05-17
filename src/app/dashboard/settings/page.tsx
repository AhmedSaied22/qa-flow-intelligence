import { redirect } from "next/navigation";

import { getGeminiQuotaRemaining, type AiProviderSettingsRow, type AiUsageEventRow } from "@/lib/ai/provider-settings";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const quotaLimit = Number(formData.get("quotaLimit") ?? 0);

  const payload = {
    owner_id: user.id,
    provider: "gemini",
    use_byok: useByok,
    gemini_api_key: apiKey || null,
    gemini_free_quota_limit: Number.isFinite(quotaLimit) ? quotaLimit : 0,
  };

  const { error } = await supabase
    .from("ai_provider_settings")
    .upsert(payload, { onConflict: "owner_id" });

  if (error) {
    redirect("/dashboard/settings?error=save-failed");
  }

  redirect("/dashboard/settings?saved=1");
}

export default async function AiProviderSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [settingsResult, usageResult] = await Promise.all([
    supabase.from("ai_provider_settings").select("*").maybeSingle(),
    supabase
      .from("ai_usage_events")
      .select("*")
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const settings = settingsResult.data as AiProviderSettingsRow | null;
  const usageEvents = (usageResult.data ?? []) as AiUsageEventRow[];
  const { quotaLimit, quotaUsed, quotaRemaining } = getGeminiQuotaRemaining(settings);

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">AI Provider Settings</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gemini setup</h1>
          <p className="text-sm text-muted-foreground">
            Configure free Gemini access or store your own key for future AI features.
          </p>
        </div>

        <form action={saveGeminiSettings} className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Gemini API key</span>
              <input
                name="geminiApiKey"
                type="password"
                placeholder="Paste your Gemini API key"
                className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
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
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              name="useByok"
              type="checkbox"
              defaultChecked={settings?.use_byok ?? false}
              className="size-4 rounded border"
            />
            Use BYOK for Gemini
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit">Save settings</Button>
            <p className="text-sm text-muted-foreground">No AI calls are made from this page.</p>
          </div>
        </form>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">Free Gemini usage</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Remaining usage: {quotaRemaining} of {quotaLimit}
          </p>
          <p className="text-sm text-muted-foreground">Used: {quotaUsed}</p>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">Recent usage events</h2>
          <div className="mt-3 space-y-2">
            {usageEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage events yet.</p>
            ) : (
              usageEvents.map((event) => (
                <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{event.provider}</p>
                  <p className="text-muted-foreground">
                    {event.model} - {event.source}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
