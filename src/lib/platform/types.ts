export type PlatformKind = "web" | "mobile";

export type MobilePlatformConcern =
  | "android_back_behavior"
  | "ios_gestures"
  | "permissions"
  | "keyboard_behavior"
  | "deep_links"
  | "push_notifications"
  | "offline_background_states"
  | "biometric_auth"
  | "orientation"
  | "screen_sizes";

export type WebPlatformConcern =
  | "responsive_behavior"
  | "browser_compatibility"
  | "session_expiration"
  | "cookies_local_storage"
  | "autofill"
  | "accessibility_basics"
  | "zoom_behavior"
  | "refresh_network_behavior";

export type PlatformIntelligence = {
  platform: PlatformKind;
  concerns: string[];
  summary: string;
};
