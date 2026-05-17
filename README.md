# QA Flow Intelligence

AI-powered QA intelligence platform for **Web + Mobile** testing: from requirements to risk-aware, reviewable, living regression coverage.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

## Vision

Help QA engineers generate **the right test cases, not more test cases** by combining requirement gap detection, platform-specific testing intelligence, and a living test suite with coverage and regression insights.

## Main Features (Planned)

- Requirement Gap & Risk Detector (missing requirements, ambiguity, QA questions, risk reasoning)
- Platform DNA (deep Web + Mobile testing intelligence)
- Living Test Suite (versioned, linked to requirements, reviewable)
- Regression Intelligence (what to rerun and why)
- Test Coverage Intelligence (coverage by requirement, platform, risk, review status)
- Smart Approval Workflow (draft -> review -> approved/rejected, comments, history)
- Future automation readiness (planned later): Playwright, Selenium, Cypress, Appium

## Tech Stack

Frontend:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend services (planned; not implemented yet):

- Supabase (Auth, PostgreSQL, Storage, Realtime)

Deployment target (planned):

- Firebase App Hosting (Next.js)

## Architecture Philosophy

This repo is **architecture-first** and **chunk-based**:

- Architecture and subsystem decisions live in docs and drive implementation.
- Work is implemented in small, explicit chunks defined in `PLAN.md`.
- No implementation outside approved chunks.

Start here:

- `PLAN.md` (roadmap and chunk definitions)
- `docs/architecture/*` (subsystem architecture)

## AI Strategy

- Default limited free AI option: Gemini (rate-limited to avoid abuse)
- BYOK (Bring Your Own Key): users can add their own provider key
- Provider abstraction so Gemini can be first, with OpenAI and Claude later
- Server-side AI calls only (no hardcoded paid keys, no keys in the frontend)

## Current Roadmap

The roadmap is defined in `PLAN.md` and organized into 3 phases:

- Phase 1: foundation + first 3 core features
- Phase 2: regression + coverage + approval workflow
- Phase 3: automation readiness (schema and architecture first, generation later)

## Current Implementation Status

- Chunk 1.1 completed: Project bootstrap (Next.js + Tailwind + shadcn/ui + theme foundation)

## Local Setup

Prereqs:

- Node.js 20+
- npm

Install and run:

```bash
npm install
npm run dev
```

Checks:

```bash
npm run lint
npx tsc --noEmit
```

## Folder Structure (High-Level)

```text
src/
  app/              Next.js routes/layouts
  components/       UI + shared components
  lib/              shared utilities (future: AI, db, exports)
docs/
  architecture/     subsystem architecture docs
  roadmap/          roadmap-related docs
  decisions/        ADRs (architecture decisions)
```

## Contributing

See `CONTRIBUTING.md`.

Key rule: plan first, implement later, and keep changes scoped to the current approved chunk.

## Future Roadmap Notes

- Automation support is planned later (Phase 3 readiness, then generation).
- Export adapters are planned as an isolated layer (Markdown/CSV MVP; Jira/TestRail later).
- Background job readiness is planned, but MVP stays synchronous.

## Open Source Note

This project is shared in public to make QA intelligence workflows transparent, reviewable, and improvable by the community. Contributions that improve clarity, docs, and maintainability are especially welcome.
