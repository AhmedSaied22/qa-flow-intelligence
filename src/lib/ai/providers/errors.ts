export class AiProviderConfigurationError extends Error {
  constructor(message = "No AI provider configured") {
    super(message);
    this.name = "AiProviderConfigurationError";
  }
}

export class GeminiResponseError extends Error {
  status: number;

  constructor(status: number, message = "gemini_request_failed") {
    super(message);
    this.name = "GeminiResponseError";
    this.status = status;
  }
}

export class GeminiParseError extends Error {
  candidatesExists: boolean;
  contentPartsExists: boolean;
  textExists: boolean;
  textExcerpt: string;
  textTail: string;
  textLength: number;
  finishReason: string | null;

  constructor(details: {
    candidatesExists: boolean;
    contentPartsExists: boolean;
    textExists: boolean;
    textExcerpt: string;
    textTail?: string;
    textLength?: number;
    finishReason?: string | null;
  }) {
    super("gemini_parse_failed");
    this.name = "GeminiParseError";
    this.candidatesExists = details.candidatesExists;
    this.contentPartsExists = details.contentPartsExists;
    this.textExists = details.textExists;
    this.textExcerpt = details.textExcerpt;
    this.textTail = details.textTail ?? "";
    this.textLength = details.textLength ?? details.textExcerpt.length;
    this.finishReason = details.finishReason ?? null;
  }
}
