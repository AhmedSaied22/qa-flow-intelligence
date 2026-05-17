import type { RequirementAnalysisOutput } from "../prompts/requirement-analysis/v1";

type GeminiSettings = {
  apiKey: string;
  model: string;
};

type ProviderMessage = {
  role: "system" | "user";
  content: string;
};

export async function runGeminiMessages(messages: ProviderMessage[], settings: GeminiSettings) {
  const body = {
    contents: messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 800,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error("gemini_request_failed");
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("gemini_invalid_response");
  }

  return JSON.parse(text) as RequirementAnalysisOutput;
}
