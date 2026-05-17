import { platformTaxonomy } from "./taxonomy";
import type { PlatformKind, PlatformIntelligence } from "./types";

const webKeywords = ["browser", "responsive", "cookie", "local storage", "autofill", "accessibility", "zoom", "refresh", "network", "session"];
const mobileKeywords = ["android", "ios", "gesture", "permission", "keyboard", "deep link", "push", "offline", "background", "biometric", "orientation", "screen"];

export function getDefaultPlatformSelection(text: string): PlatformKind[] {
  const normalized = text.toLowerCase();
  const matches = new Set<PlatformKind>();

  if (webKeywords.some((keyword) => normalized.includes(keyword))) {
    matches.add("web");
  }

  if (mobileKeywords.some((keyword) => normalized.includes(keyword))) {
    matches.add("mobile");
  }

  if (matches.size === 0) {
    matches.add("web");
    matches.add("mobile");
  }

  return [...matches];
}

export function getPlatformConcernLabels(platform: PlatformKind) {
  return Object.values(platformTaxonomy[platform]);
}

export function buildPlatformIntelligence(platform: PlatformKind, concerns: string[]): PlatformIntelligence {
  return {
    platform,
    concerns,
    summary:
      platform === "web"
        ? "Web-specific QA intelligence for browser, responsive, and session behavior."
        : "Mobile-specific QA intelligence for gestures, permissions, device states, and OS behavior.",
  };
}
