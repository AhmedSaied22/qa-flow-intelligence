import { requirementAnalysisPrompt } from "./requirement-analysis/v1";
import { testCaseGenerationPrompt } from "./test-case-generation/v1";

export const promptRegistry = {
  "requirement-analysis": requirementAnalysisPrompt,
  "test-case-generation": testCaseGenerationPrompt,
} as const;

export type PromptId = keyof typeof promptRegistry;

export function getPrompt<T extends PromptId>(promptId: T): (typeof promptRegistry)[T] {
  return promptRegistry[promptId];
}
