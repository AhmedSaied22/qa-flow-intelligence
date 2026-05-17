import type { PlatformKind } from "@/lib/platform/types";

export function buildTestCasePlatformFragment(platforms: PlatformKind[]) {
  return platforms
    .map((platform) =>
      platform === "web"
        ? [
            "Web-specific QA focus:",
            "- Responsive behavior",
            "- Browser compatibility",
            "- Session expiration",
            "- Cookies and local storage",
            "- Autofill",
            "- Accessibility basics",
            "- Zoom behavior",
            "- Refresh and network behavior",
          ].join("\n")
        : [
            "Mobile-specific QA focus:",
            "- Android back behavior",
            "- iOS gestures",
            "- Permissions",
            "- Keyboard behavior",
            "- Deep links",
            "- Push notifications",
            "- Offline/background states",
            "- Biometric auth",
            "- Orientation",
            "- Screen sizes",
          ].join("\n"),
    )
    .join("\n\n");
}
