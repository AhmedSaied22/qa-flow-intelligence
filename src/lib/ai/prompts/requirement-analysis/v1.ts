import type { PromptModule } from "@/lib/ai/types";
import { buildPlatformIntelligenceFragment } from "@/lib/ai/prompts/fragments/platform-intelligence";
import type { PlatformKind } from "@/lib/platform/types";
import { getDefaultPlatformSelection } from "@/lib/platform/helpers";

export type RequirementAnalysisInput = {
  title: string;
  description: string | null;
  projectName: string;
  platforms: PlatformKind[];
};

export type RequirementAnalysisOutput = {
  summary: string;
  risk_level: "low" | "medium" | "high";
  ambiguities: string[];
  missing_details: string[];
  edge_cases: string[];
  platform_focus: Array<{
    platform: PlatformKind;
    highlights: string[];
  }>;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOutput(value: unknown): value is RequirementAnalysisOutput {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.summary === "string" &&
    ["low", "medium", "high"].includes(String(record.risk_level)) &&
    isStringArray(record.ambiguities) &&
    isStringArray(record.missing_details) &&
    isStringArray(record.edge_cases) &&
    Array.isArray(record.platform_focus) &&
    record.platform_focus.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const platformRecord = item as Record<string, unknown>;
      return (
        (platformRecord.platform === "web" || platformRecord.platform === "mobile") &&
        isStringArray(platformRecord.highlights)
      );
    })
  );
}

export const requirementAnalysisPrompt: PromptModule<
  RequirementAnalysisInput,
  RequirementAnalysisOutput
> = {
  id: "requirement-analysis",
  version: "v1",
  task: "Analyze requirements for ambiguity, missing details, and risk.",
  modelTier: "medium",
  maxOutputTokens: 800,
  cachePolicy: "reuse",
  validateInput(input): input is RequirementAnalysisInput {
    if (typeof input !== "object" || input === null) return false;
    const record = input as Record<string, unknown>;
    return (
      typeof record.title === "string" &&
      typeof record.projectName === "string" &&
      (record.description === null || typeof record.description === "string") &&
      Array.isArray(record.platforms) &&
      record.platforms.every((platform) => platform === "web" || platform === "mobile")
    );
  },
  validateOutput: isOutput,
  buildMessages(input) {
    return [
      {
        role: "system",
        content:
          "Return only valid JSON for requirement analysis with summary, risk_level, ambiguities, missing_details, and edge_cases.",
      },
      {
        role: "user",
        content: [
          JSON.stringify(input),
          buildPlatformIntelligenceFragment(input.platforms),
        ].join("\n\n"),
      },
    ];
  },
};

export function getDefaultRequirementPlatforms(input: {
  title: string;
  description: string | null;
}) {
  return getDefaultPlatformSelection([input.title, input.description ?? ""].join(" "));
}
