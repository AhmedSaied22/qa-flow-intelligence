import type { Database } from "@/lib/supabase/database.types";

export type AiProviderSettingsRow =
  Database["public"]["Tables"]["ai_provider_settings"]["Row"];

export type AiUsageEventRow = Database["public"]["Tables"]["ai_usage_events"]["Row"];

export function getGeminiQuotaRemaining(settings: AiProviderSettingsRow | null) {
  const quotaLimit = settings?.gemini_free_quota_limit ?? 0;
  const quotaUsed = settings?.gemini_free_quota_used ?? 0;

  return {
    quotaLimit,
    quotaUsed,
    quotaRemaining: Math.max(quotaLimit - quotaUsed, 0),
  };
}
