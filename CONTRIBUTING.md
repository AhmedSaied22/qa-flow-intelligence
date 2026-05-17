# Contributing to QA Flow Intelligence

Thanks for your interest in contributing. This repository is intentionally **architecture-first** and **chunk-based** to keep the product consistent and implementation safe.

## Architecture-First Workflow

Before implementing behavior:

- Update or add planning docs (`PLAN.md` and `docs/**`) first.
- Ensure new work aligns with the architecture docs under `docs/architecture`.
- If a change is architectural (data model, AI orchestration patterns, exports, background jobs), document it in the relevant architecture file first.
- For long-lived decisions, add an ADR under `docs/decisions`.

## Chunk-Based Implementation Workflow

Work is executed in small, explicit implementation chunks (example: "Chunk 1.2", "Chunk 1.3").

Rules:

- Do not implement anything outside the currently approved chunk.
- If the chunk does not mention a subsystem, do not add it "just because" (examples: auth, Supabase, AI calls, migrations).
- Keep commits small and reviewable, aligned to the chunk boundaries.

How chunks work:

- `PLAN.md` defines the roadmap and chunk boundaries.
- Each chunk has acceptance criteria and a test checklist.
- If you find missing requirements, first propose a doc update to clarify the chunk before coding.

## Branch Naming Conventions

Use short, descriptive branch names:

- `docs/<topic>` for documentation-only changes
- `chore/<topic>` for tooling/config-only changes
- `feat/chunk-<phase>-<chunk>-<short-topic>` for implementation chunks

Examples:

- `docs/open-source-readiness`
- `feat/chunk-1-2-auth-foundation`

## Commit Message Conventions

Use conventional-style prefixes:

- `docs: ...`
- `chore: ...`
- `feat: ...`
- `fix: ...`
- `test: ...`
- `refactor: ...`

Commits should map to a single chunk or a single doc task.

## Coding Standards

- TypeScript only (no JS files unless required by tooling).
- Prefer small, composable components with clear boundaries.
- Keep UI consistent with the minimal SaaS direction (shadcn/ui + Tailwind).
- No secrets committed. `.env*` stays untracked.
- Avoid introducing new dependencies unless they clearly support the current chunk.
- Follow existing lint and typecheck rules.

## Proposing Changes

If you want to propose a change that affects scope:

1. Open an issue describing the proposed change and the motivation.
2. Update planning docs first (or propose a PR that only updates docs).
3. After docs are approved/merged, implement in a follow-up chunk PR.

## Local Development

Prereqs:

- Node.js 20+
- npm

Setup:

```bash
npm install
npm run dev
```

Checks:

```bash
npm run lint
npx tsc --noEmit
```

## Non-Goals for MVP Contributions

Please do not add these unless a chunk explicitly calls for them:

- Payments
- Full Jira/TestRail/Zephyr integrations
- Enterprise role hierarchy and complex permissions
- Full automation generation (Playwright/Selenium/Cypress/Appium) before Phase 3

