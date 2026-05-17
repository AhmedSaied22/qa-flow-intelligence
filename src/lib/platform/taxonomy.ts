import type { MobilePlatformConcern, WebPlatformConcern } from "./types";

export const mobilePlatformConcerns: Record<MobilePlatformConcern, string> = {
  android_back_behavior: "Android back behavior",
  ios_gestures: "iOS gestures",
  permissions: "Permissions and system access",
  keyboard_behavior: "Keyboard behavior and focus handling",
  deep_links: "Deep links and app routing",
  push_notifications: "Push notifications",
  offline_background_states: "Offline and background states",
  biometric_auth: "Biometric authentication",
  orientation: "Orientation changes",
  screen_sizes: "Screen sizes and density variations",
};

export const webPlatformConcerns: Record<WebPlatformConcern, string> = {
  responsive_behavior: "Responsive behavior",
  browser_compatibility: "Browser compatibility",
  session_expiration: "Session expiration",
  cookies_local_storage: "Cookies and local storage",
  autofill: "Autofill behavior",
  accessibility_basics: "Accessibility basics",
  zoom_behavior: "Zoom behavior",
  refresh_network_behavior: "Refresh and network behavior",
};

export const platformTaxonomy = {
  web: webPlatformConcerns,
  mobile: mobilePlatformConcerns,
} as const;
