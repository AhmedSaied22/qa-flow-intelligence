import { createHash } from "crypto";

export function hashAiInput(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
