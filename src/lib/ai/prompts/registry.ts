import { requirementAnalysisPrompt } from "./requirement-analysis/v1";

export const promptRegistry = {
  "requirement-analysis": requirementAnalysisPrompt,
} as const;

export type PromptId = keyof typeof promptRegistry;

export function getPrompt(promptId: PromptId) {
  return promptRegistry[promptId];
}
