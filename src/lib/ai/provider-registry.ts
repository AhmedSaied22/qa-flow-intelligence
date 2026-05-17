export type AiProviderKey = "gemini";

export type AiProviderConfig = {
  key: AiProviderKey;
  name: string;
  active: boolean;
  supportsByok: boolean;
  modelLabel: string;
};

export const aiProviderRegistry: AiProviderConfig[] = [
  {
    key: "gemini",
    name: "Gemini",
    active: true,
    supportsByok: true,
    modelLabel: "gemini-flash-latest",
  },
];
