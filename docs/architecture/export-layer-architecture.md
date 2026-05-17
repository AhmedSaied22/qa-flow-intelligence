# Export Layer Architecture

## Purpose

Export functionality must be isolated behind adapter modules so MVP exports can stay simple while future integrations can grow safely.

MVP exports may include Markdown and CSV only.

Do not implement full Jira, TestRail, Zephyr, Excel, or API-based integrations in the MVP.

## Core Rules

- Export logic must not be scattered across UI components.
- Export adapters should receive normalized data and return a file payload or export result.
- Export adapters should not own database authorization checks.
- Server-side actions should validate ownership before calling export logic.
- Future external integrations should be added as adapters, not mixed into core test-suite logic.

## Suggested Folder Structure

```text
lib/exports/
  registry.ts
  types.ts
  adapters/
    markdown.ts
    csv.ts
    excel.future.ts
    jira.future.ts
    testrail.future.ts
    zephyr.future.ts
```

Future placeholder files should not be created until needed. The structure above defines the intended direction.

## Export Adapter Contract

Each adapter should conceptually define:

- `id`: Stable adapter ID.
- `label`: Human-readable label.
- `supportedEntities`: Supported export subjects, such as test cases or regression runs.
- `validateInput`: Validates normalized export input.
- `generate`: Produces export output.
- `contentType`: MIME type for file downloads.
- `fileExtension`: File extension.

## MVP Export Adapters

### Markdown

Purpose:

- Human-readable test suite or requirement analysis export.
- Useful for sharing with teams, clients, or documentation.

Initial supported exports:

- Selected test cases.
- Requirement analysis summary.
- Regression recommendation summary.

### CSV

Purpose:

- Spreadsheet-friendly export of test cases.

Initial supported fields:

- Test Case ID
- Title
- Description
- Preconditions
- Steps
- Test Data
- Expected Result
- Priority
- Risk Level
- Type
- Platform
- Linked Requirement
- Review Status
- Automation Candidate
- Automation Complexity
- Suggested Framework

## Future Export Adapters

Future adapters may include:

- Excel
- Jira
- TestRail
- Zephyr
- API-based custom integrations

These should be implemented only after MVP workflows are stable.

## External Integration Guidance

Future external integrations should include:

- Explicit user authorization.
- Clear field mapping.
- Dry-run or preview mode.
- Error handling for partial failures.
- Export history.
- Rate limit handling.
- No hard dependency on one external vendor.

## Background Job Readiness

Small MVP exports can be synchronous.

Large exports and external integrations should later move to background jobs. See [Background Jobs Roadmap](background-jobs-roadmap.md).

## MVP Non-Goals

Do not implement in MVP:

- Jira integration.
- TestRail integration.
- Zephyr integration.
- Excel generation unless explicitly assigned.
- Scheduled exports.
- Complex export templates.

The MVP should only establish a clean adapter boundary and support simple Markdown/CSV exports later.
