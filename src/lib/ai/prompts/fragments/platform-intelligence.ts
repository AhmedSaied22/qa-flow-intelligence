import { getPlatformConcernLabels } from "@/lib/platform/helpers";
import type { PlatformKind } from "@/lib/platform/types";

export function buildPlatformIntelligenceFragment(platforms: PlatformKind[]) {
  return platforms
    .map((platform) => {
      const labels = getPlatformConcernLabels(platform).map((label) => `- ${label}`).join("\n");

      return [
        `Platform: ${platform.toUpperCase()}`,
        "Consider these QA intelligence areas:",
        labels,
      ].join("\n");
    })
    .join("\n\n");
}
