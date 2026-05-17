# QA Flow Intelligence Plan

## Executive Summary

QA Flow Intelligence is an AI-powered QA intelligence SaaS for Junior, Mid-level, and Senior QA Engineers. The platform helps users analyze requirements, detect gaps and risks, generate practical platform-aware test cases, maintain a living test suite, understand coverage, and prepare for future automation support.

Positioning: **Generate the right test cases, not more test cases.**

This document is the main high-level source of truth for the project roadmap. Detailed subsystem architecture lives in the dedicated architecture documents linked below.

## Architecture References

- [AI Prompt Registry](docs/architecture/ai-prompt-registry.md)
- [AI Observability](docs/architecture/ai-observability.md)
- [Background Jobs Roadmap](docs/architecture/background-jobs-roadmap.md)
- [Export Layer Architecture](docs/architecture/export-layer-architecture.md)

## Product Definition

The product should feel like an AI QA Copilot and testing intelligence platform, not a basic test case generator. It guides QA engineers from requirements to reviewed, living regression coverage.

Primary goals:

- Analyze requirements for ambiguity, missing details, and risk.
- Generate practical Web and Mobile test cases.
- Save, edit, review, approve, reject, and version test cases.
- Track requirement changes and impacted test cases.
- Show coverage and regression intelligence.
- Keep future automation support structurally ready without building full automation in the MVP.

## Target Users

- Junior QA Engineers who need guidance and practical examples.
- Mid-level QA Engineers who need faster, more consistent coverage.
- Senior QA Engineers who need review control, risk reasoning, and maintainable suites.
- Future users include QA Leads, freelancers, small QA teams, and software companies.

## Final Tech Stack

Frontend:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend, database, auth, and storage:

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime where useful

Authentication:

- Start with Google login.
- Keep architecture ready for email login later.

AI:

- Limited free Gemini option where possible.
- BYOK support, starting with Gemini.
- Future provider support for OpenAI and Claude.
- Server-side AI calls only.
- Provider logic must remain abstracted.

Hosting:

- Firebase App Hosting for the Next.js app.
- Supabase remains responsible for database, auth, storage, and realtime.
- Keep architecture portable for future hosting changes.

## Core User Journeys

1. User logs in with Google, creates a project, adds a requirement, runs AI analysis, reviews risks and gaps, generates test cases, and saves selected cases.
2. User manages the living test suite by filtering, editing, commenting, approving, rejecting, and versioning test cases.
3. User edits a requirement and sees affected test cases and regression recommendations.
4. User reviews coverage by requirement, platform, risk level, and approval status.
5. User configures AI provider settings and adds a BYOK key when free Gemini limits are reached.

## Core Features

1. Requirement Gap & Risk Detector
2. Platform DNA: Mobile + Web Testing Intelligence
3. Living Test Suite
4. Regression Intelligence
5. Test Coverage Intelligence
6. Smart Approval Workflow

## Big Phase Roadmap

### Phase 1: Foundation and First Three Features

Build the app foundation and support:

- Requirement Gap & Risk Detector
- Platform DNA Intelligence
- Living Test Suite

Key chunks:

- Bootstrap Next.js SaaS foundation.
- Add Supabase Auth and profile setup.
- Add projects.
- Add requirements and requirement versions.
- Add AI provider settings.
- Add AI requirement analysis.
- Add platform DNA prompt support.
- Add AI test case generation and save flow.
- Add living test suite management.
- Harden Phase 1 flows.

### Phase 2: Regression, Coverage, and Approval

Build:

- Regression Intelligence
- Test Coverage Intelligence
- Smart Approval Workflow

Key chunks:

- Add review statuses and review events.
- Add comments.
- Add coverage dashboard.
- Add requirement change impact detection.
- Add regression runs.
- Harden Phase 2 flows.

### Phase 3: Future Automation Readiness

Prepare for future automation support without implementing full automation generation.

Future-ready areas:

- Automation candidate metadata.
- Suggested framework.
- Selector notes.
- Test data needs.
- Automation artifact schema.
- Future support for Playwright, Selenium, Cypress, Appium, Java, JavaScript, TypeScript, and Python.

## Database Schema Summary

Planned Supabase PostgreSQL tables:

- `profiles`
- `projects`
- `requirements`
- `requirement_versions`
- `test_cases`
- `test_case_versions`
- `comments`
- `ai_generations`
- `ai_provider_settings`
- `ai_usage_events`
- `coverage_reports`
- `regression_runs`
- `regression_run_cases`
- `review_events`
- Future `automation_artifacts`

All user-owned tables must use Supabase Row Level Security. User data isolation is required from the first database migration.

## AI Architecture Summary

AI logic must be centralized, provider-abstracted, cache-aware, and server-side only.

Detailed prompt registry rules live in [AI Prompt Registry](docs/architecture/ai-prompt-registry.md).

Detailed AI observability rules live in [AI Observability](docs/architecture/ai-observability.md).

High-level AI rules:

- Do not scatter prompts through components or route handlers.
- Store prompt version metadata with every AI generation.
- Cache AI outputs using task-specific input hashes.
- Use structured JSON outputs where possible.
- Use cheap models for formatting and strong models for deep QA reasoning.
- Never expose API keys to the frontend.

## Token and Cost Optimization Summary

The platform must avoid repeated AI calls and oversized prompts.

Required practices:

- Save AI generations.
- Reuse summarized requirement context.
- Hash AI inputs and reuse cached results.
- Separate analysis, generation, impact, and regression prompts.
- Send compact existing test case summaries instead of full histories.
- Track usage and provider metadata for future optimization.

## Security Summary

Security requirements:

- Supabase RLS on all user-owned tables.
- Server-side AI calls only.
- Secure BYOK storage.
- No API keys in client responses, logs, or committed files.
- Input validation for forms and AI outputs.
- Basic rate limiting for AI actions.
- Free Gemini usage limits to avoid abuse.

## UI/UX Page Plan

Main pages:

1. Landing Page
2. Login Page
3. Dashboard
4. Projects Page
5. Project Details Page
6. New Requirement Analysis Page
7. Requirement Details Page
8. Generated Test Cases Page
9. Living Test Suite Page
10. Test Case Details Page
11. Coverage Dashboard
12. Regression Intelligence Page
13. Review / Approval Page
14. AI Provider Settings Page
15. User Settings Page

UI style should be premium, minimal, modern, clean, productivity-first, and support dark/light mode.

## Folder Structure Summary

Planned implementation structure:

```text
app/
components/
lib/
  ai/
    prompts/
    providers/
    schemas/
  supabase/
  validation/
types/
supabase/
  migrations/
tests/
docs/
  architecture/
```

The detailed export adapter structure is documented in [Export Layer Architecture](docs/architecture/export-layer-architecture.md).

## Supabase Setup Summary

Implementation should:

- Create a Supabase project.
- Enable Google OAuth.
- Add migrations in small, reviewable steps.
- Enable RLS immediately for each user-owned table.
- Add secure handling for AI provider keys.
- Keep file uploads out of MVP unless explicitly required later.

## GitHub Workflow

Use small, chunk-based commits.

Suggested chunk D1 commit:

```text
docs: establish planning and architecture documentation structure
```

Recommended implementation workflow:

- One branch per feature or phase.
- One clear commit per small chunk where possible.
- Pull requests should include screenshots for UI changes, migration notes for database changes, AI-call notes for AI changes, and test results.

## Testing Strategy

Test layers:

- Unit tests for validation, AI schema parsing, coverage calculations, and status transitions.
- Integration tests for Supabase access, RLS policies, versioning, and AI caching.
- E2E tests for project creation, requirement analysis, test generation, approval, coverage, and regression workflows.
- AI tests should use mocked provider responses in CI.

## Risks and Edge Cases

Primary risks:

- AI output duplication.
- Bloated test case generation.
- Malformed AI JSON.
- Exposed AI provider keys.
- Weak RLS policies.
- Misleading coverage metrics.
- Premature automation scope.
- Free AI abuse.

Mitigations:

- Structured prompts and schemas.
- Prompt registry with versions.
- AI observability metadata.
- RLS tests.
- Conservative MVP scope.
- Free usage limits and BYOK fallback.

## Future Automation Roadmap

Future automation features may include:

- Generate Playwright tests.
- Generate Selenium tests.
- Generate Cypress tests.
- Generate Appium tests.
- Suggest stable selectors.
- Mark automation candidates.
- Estimate automation complexity.
- Suggest required test data.
- Generate Page Object Model structure.
- Generate API automation scenarios.

Do not implement full automation generation in early phases.

## Implementation Instructions for Future Agents

- Implement one chunk at a time.
- Do not jump ahead to future phases.
- Do not add payment, Jira, TestRail, Zephyr, enterprise roles, or full automation unless explicitly assigned.
- Keep `PLAN.md` high-level.
- Put detailed subsystem architecture in `docs/architecture`.
- Keep AI prompts centralized and versioned.
- Keep future background jobs and exports adapter-ready, but MVP synchronous and simple.
