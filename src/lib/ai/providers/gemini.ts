import { GeminiParseError, GeminiResponseError } from "./errors";

type GeminiSettings = {
  apiKey: string;
  model: string;
  maxOutputTokens?: number;
};

type ProviderMessage = {
  role: "system" | "user";
  content: string;
};

type GeminiResponseShape = {
  text?: string;
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export function extractGeminiText(responseJson: GeminiResponseShape) {
  const candidates = responseJson?.candidates;
  const content = candidates?.[0]?.content;
  const parts = content?.parts;
  const partsText = parts?.find((part) => typeof part.text === "string")?.text;
  const directText = typeof responseJson?.text === "string" ? responseJson.text : undefined;
  const text = partsText ?? directText;
  const finishReason = candidates?.[0]?.finishReason ?? null;

  return {
    candidatesExists: Array.isArray(candidates) && candidates.length > 0,
    contentPartsExists: Array.isArray(parts) && parts.length > 0,
    finishReason,
    text,
  };
}

export function parseGeminiJsonText<T>(
  text: string,
  details: {
    candidatesExists: boolean;
    contentPartsExists: boolean;
    finishReason?: string | null;
  } = { candidatesExists: false, contentPartsExists: false },
): T {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(withoutFence) as T;
  } catch {
    const firstObject = withoutFence.match(/\{[\s\S]*\}/);
    const firstArray = withoutFence.match(/\[[\s\S]*\]/);
    const candidate = firstObject?.[0] ?? firstArray?.[0];

    if (!candidate) {
      throw new GeminiParseError({
        candidatesExists: details.candidatesExists,
        contentPartsExists: details.contentPartsExists,
        textExists: true,
        textExcerpt: withoutFence.slice(0, 300),
        textTail: withoutFence.slice(-300),
        textLength: withoutFence.length,
        finishReason: details.finishReason ?? null,
      });
    }

    try {
      return JSON.parse(candidate) as T;
    } catch {
      throw new GeminiParseError({
        candidatesExists: details.candidatesExists,
        contentPartsExists: details.contentPartsExists,
        textExists: true,
        textExcerpt: withoutFence.slice(0, 300),
        textTail: withoutFence.slice(-300),
        textLength: withoutFence.length,
        finishReason: details.finishReason ?? null,
      });
    }
  }
}

export async function runGeminiMessages<T = unknown>(messages: ProviderMessage[], settings: GeminiSettings): Promise<T> {
  const body = {
    contents: messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: settings.maxOutputTokens ?? 800,
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

  console.info("Gemini response status", {
    model: settings.model,
    status: response.status,
  });

  if (!response.ok) {
    throw new GeminiResponseError(response.status, "gemini_request_failed");
  }

  const json = await response.json();
  const { candidatesExists, contentPartsExists, finishReason, text } = extractGeminiText(json);

  if (typeof text !== "string") {
    throw new GeminiParseError({
      candidatesExists,
      contentPartsExists,
      textExists: false,
      textExcerpt: "",
      finishReason,
    });
  }

  return parseGeminiJsonText<T>(text, { candidatesExists, contentPartsExists, finishReason });
}
