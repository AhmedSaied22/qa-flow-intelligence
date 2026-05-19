import type { PromptModule } from "@/lib/ai/types";
import { buildTestCasePlatformFragment } from "@/lib/ai/prompts/fragments/test-case-generation";
import type { PlatformKind } from "@/lib/platform/types";

type RequirementAnalysisSummary = {
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

export type TestCaseGenerationInput = {
  projectName: string;
  requirementTitle: string;
  requirementDescription: string | null;
  requirementAnalysis: RequirementAnalysisSummary;
  platforms: PlatformKind[];
  limit: 5 | 10 | 20;
};

export type GeneratedTestCase = {
  id?: string;
  title: string;
  type?: string;
  priority?: "critical" | "high" | "medium" | "low";
  description: string;
  preconditions: string;
  steps: string[];
  test_data?: string[];
  expected_result: string;
  automation_candidate?: string;
  platform: PlatformKind;
  risk_level: "low" | "medium" | "high";
};

export type TestCaseGenerationOutput = {
  test_cases: GeneratedTestCase[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOutput(value: unknown): value is TestCaseGenerationOutput {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.test_cases) && record.test_cases.length > 0 && record.test_cases.length <= 20 && record.test_cases.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const testCase = item as Record<string, unknown>;
    return (
      typeof testCase.title === "string" &&
      typeof testCase.description === "string" &&
      typeof testCase.preconditions === "string" &&
      isStringArray(testCase.steps) &&
      typeof testCase.expected_result === "string" &&
      (testCase.platform === "web" || testCase.platform === "mobile") &&
      ["low", "medium", "high"].includes(String(testCase.risk_level)) &&
      (testCase.type === undefined || typeof testCase.type === "string") &&
      (testCase.priority === undefined || ["critical", "high", "medium", "low"].includes(String(testCase.priority))) &&
      (testCase.test_data === undefined || isStringArray(testCase.test_data)) &&
      (testCase.automation_candidate === undefined || typeof testCase.automation_candidate === "string")
    );
  });
}

export const testCaseGenerationPrompt: PromptModule<
  TestCaseGenerationInput,
  TestCaseGenerationOutput
> = {
  id: "test-case-generation",
  version: "v3",
  task: "Generate practical test cases from requirement analysis.",
  modelTier: "medium",
  maxOutputTokens: 3600,
  cachePolicy: "reuse",
  validateInput(input): input is TestCaseGenerationInput {
    if (typeof input !== "object" || input === null) return false;
    const record = input as Record<string, unknown>;
    return (
      typeof record.projectName === "string" &&
      typeof record.requirementTitle === "string" &&
      (record.requirementDescription === null || typeof record.requirementDescription === "string") &&
      typeof record.requirementAnalysis === "object" &&
      record.requirementAnalysis !== null &&
      (record.limit === 5 || record.limit === 10 || record.limit === 20) &&
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
          [
            "Return JSON only. No markdown, no explanations, no code fences.",
            `Return compact JSON with test_cases as an array of at most ${input.limit} practical QA test cases.`,
            `Do not exceed ${input.limit} test cases.`,
            "Use short descriptions and short steps.",
            "Do not generate automation code.",
            "Do not duplicate similar cases across platforms.",
            "Each test case object should include title, description, preconditions, steps, expected_result, platform, risk_level, and priority.",
            "Priority must be one of: critical, high, medium, low. Severity risk_level must be one of: high, medium, low.",
            "If helpful, include optional compact fields: type, test_data, automation_candidate.",
            "If present, automation_candidate must be a short string, not an object.",
            "Keep each step short.",
          ].join(" "),
      },
      {
        role: "user",
        content: [JSON.stringify(input), buildTestCasePlatformFragment(input.platforms)].join("\n\n"),
      },
    ];
  },
};
