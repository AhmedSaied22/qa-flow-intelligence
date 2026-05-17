# AI Prompt Registry System

## Purpose

QA Flow Intelligence must use a centralized, versioned AI prompt registry. Prompts are product-critical logic and must be reusable, testable, auditable, and optimizable over time.

No AI prompts should be scattered inline inside random components, route handlers, server actions, or utility files.

## Core Rules

- All production prompts must live in centralized prompt modules.
- Each prompt must have a stable ID and explicit version.
- Each AI generation must store the prompt version used.
- Prompt modules must define input expectations and output expectations.
- Prompt changes must be treated like product logic changes and reviewed carefully.
- Components should never construct full prompts directly.

## Suggested Folder Structure

```text
lib/ai/prompts/
  registry.ts
  types.ts
  requirement-analysis/
    v1.ts
  test-case-generation/
    v1.ts
  regression-analysis/
    v1.ts
  coverage-summary/
    v1.ts
  impact-analysis/
    v1.ts
  output-repair/
    v1.ts
```

## Prompt Module Contract

Each prompt module should conceptually define:

- `id`: Stable prompt ID, such as `requirement-analysis`.
- `version`: Version string, such as `v1`.
- `task`: AI task category.
- `modelTier`: Expected model strength, such as `cheap`, `medium`, or `strong`.
- `inputSchema`: Validation schema for prompt input.
- `outputSchema`: Validation schema for AI output.
- `buildMessages`: Function that builds provider-neutral messages.
- `maxOutputTokens`: Suggested output size limit.
- `cachePolicy`: Whether and how outputs can be reused.

## Prompt Version Format

Store prompt versions in `ai_generations.prompt_version` using this format:

```text
{prompt_id}@{version}
```

Examples:

```text
requirement-analysis@v1
test-case-generation@v1
regression-analysis@v1
coverage-summary@v1
impact-analysis@v1
output-repair@v1
```

## Registry Responsibilities

The prompt registry should:

- Export all available prompts from one central place.
- Prevent unknown prompt IDs from being used.
- Make prompt version lookup explicit.
- Support future side-by-side prompt versions.
- Provide metadata needed for logging and observability.

## Versioning Guidelines

Create a new prompt version when:

- Output schema changes.
- Prompt behavior changes meaningfully.
- Risk prioritization rules change.
- Platform DNA instructions change.
- Token strategy changes substantially.

Do not create a new version for:

- Typo-only edits that do not affect behavior.
- Internal comments.
- Test fixture changes.

## Testing Guidelines

Prompt tests should verify:

- Inputs are validated before building prompts.
- Outputs match the expected schema.
- Required QA fields are present.
- Platform-specific behavior is separated for Web and Mobile.
- The prompt does not request unnecessary project history.

CI should use mocked AI responses, not live provider calls.

## Relationship to AI Generations

Every saved AI generation must include:

- Prompt ID and version in `ai_generations.prompt_version`.
- Provider used.
- Model used.
- Input hash.
- Generation type.
- Output JSON when available.
- Status and error metadata.

This makes it possible to compare prompt quality, cache outputs safely, and optimize cost over time.
