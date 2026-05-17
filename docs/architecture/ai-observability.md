# AI Observability

## Purpose

QA Flow Intelligence must track enough AI metadata to improve reliability, reduce cost, debug failures, and optimize prompts over time.

AI observability must never expose sensitive user secrets, raw API keys, or unsafe logs.

## What to Track

Track these categories for every AI task:

- Provider used.
- Model used.
- Prompt version.
- Generation type.
- Response time.
- Token input count.
- Token output count.
- Estimated cost when available.
- Cache hit or miss.
- Success or failure status.
- Safe error code and safe error message.

## Recommended `ai_generations` Metadata

Recommended fields:

- `provider`
- `model`
- `prompt_version`
- `generation_type`
- `input_hash`
- `cache_status`
- `status`
- `response_time_ms`
- `token_input`
- `token_output`
- `estimated_cost`
- `error_code`
- `error_message`
- `created_at`

Recommended `cache_status` values:

- `hit`
- `miss`
- `bypass`
- `refresh`

Recommended `status` values:

- `success`
- `failed`
- `cached`
- `cancelled`

## Recommended `ai_usage_events` Metadata

Recommended fields:

- `owner_id`
- `ai_generation_id`
- `provider`
- `model`
- `source`
- `tokens_in`
- `tokens_out`
- `response_time_ms`
- `cache_hit`
- `created_at`

Recommended `source` values:

- `free_default`
- `byok`

## Sensitive Data Rules

Never store or expose:

- Raw API keys.
- Authorization headers.
- Provider secret IDs in user-visible logs.
- Full raw provider errors when they may include sensitive details.
- Unredacted request payloads containing private user data unless explicitly needed and protected by RLS.

Safe observability should focus on metadata, not secret-bearing payloads.

## Failure Tracking

AI failures should record:

- Provider.
- Model.
- Prompt version.
- Generation type.
- Safe error code.
- Safe error message.
- Response time.
- Whether the request used free default access or BYOK.

The UI should show human-friendly errors without leaking provider internals.

## Cost Optimization Uses

Observability data should help answer:

- Which prompts are most expensive?
- Which prompts fail most often?
- Which provider/model has the best reliability?
- Which tasks benefit from caching?
- Which tasks can move to cheaper models?
- Which prompt versions produce better structured outputs?

## Cache Observability

Each AI generation should make cache behavior explicit:

- Cache hit: Existing output reused.
- Cache miss: New provider call made.
- Cache bypass: User or system intentionally skipped cache.
- Cache refresh: Existing cache replaced with a new generation.

Cache metadata is required for token and cost analysis.

## MVP Requirements

MVP should track observability metadata in the database, but does not need a full internal analytics dashboard.

Initial visibility can be limited to:

- User-facing usage count.
- Free quota remaining.
- Basic provider/model metadata in admin/debug logs.

Future versions can add internal dashboards for prompt performance and cost trends.
