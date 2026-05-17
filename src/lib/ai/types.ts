export type AiModelTier = "cheap" | "medium" | "strong";

export type PromptModule<Input = unknown, Output = unknown> = {
  id: string;
  version: string;
  task: string;
  modelTier: AiModelTier;
  maxOutputTokens: number;
  cachePolicy: "reuse" | "bypass" | "refresh";
  validateInput: (input: unknown) => input is Input;
  validateOutput: (output: unknown) => output is Output;
  buildMessages: (input: Input) => Array<{ role: "system" | "user"; content: string }>;
};
