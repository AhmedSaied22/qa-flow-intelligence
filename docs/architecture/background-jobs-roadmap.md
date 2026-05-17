# Background Jobs Roadmap

## Purpose

The MVP should keep workflows synchronous where practical, but the architecture must be ready to move long-running work into background jobs later.

Do not implement a queue in the MVP unless explicitly required.

## MVP Position

MVP behavior:

- AI calls run synchronously from server-side actions or route handlers.
- Exports run synchronously for small Markdown and CSV outputs.
- Regression analysis runs synchronously for small projects.
- The code should isolate long-running business logic behind service functions so future workers can call the same logic.

## Future Background Job Candidates

Move these tasks to background jobs when usage or runtime requires it:

- Long AI test case generation.
- Requirement impact analysis for large suites.
- Regression analysis for large projects.
- Coverage report snapshots.
- Markdown and CSV export generation for large datasets.
- Future Excel exports.
- Future Jira, TestRail, Zephyr, or API-based exports.
- Future automation generation.
- Bulk automation candidate scoring.

## Architecture Readiness Rules

Implementation should:

- Keep core task logic in service modules, not directly inside UI components.
- Use explicit task input objects.
- Save durable task records before starting long work where appropriate.
- Store task status in database tables when the task may become async later.
- Make task outputs reloadable from saved records.
- Avoid relying on in-memory state for AI or export results.

## Suggested Future Status Values

For future async-compatible tables, use statuses like:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

MVP tables may use simpler statuses, but should not block these future states.

## Possible Future Queue Options

Possible future tools:

- Supabase Edge Functions
- Inngest
- Trigger.dev
- BullMQ with Redis
- Cloud Tasks
- Firebase-compatible task runner

No queue provider is selected for MVP.

## Design Pattern

Use this conceptual separation:

```text
UI action
  -> validates user input
  -> checks authorization
  -> calls service function
  -> service performs synchronous work in MVP
  -> future job runner can call the same service function
```

This keeps the MVP simple while avoiding a rewrite later.

## Data Persistence Guidance

Long-running or future-background tasks should save:

- Task owner.
- Project ID.
- Task type.
- Input summary or input hash.
- Status.
- Started timestamp.
- Completed timestamp.
- Error metadata.
- Output reference.

For AI tasks, `ai_generations` remains the main observability and output record.

## MVP Non-Goals

Do not implement in MVP:

- Queue workers.
- Retry dashboards.
- Cron scheduling.
- Complex task orchestration.
- Distributed locks.
- Enterprise-grade job monitoring.

The MVP should only preserve clean boundaries so these can be added later.
