# ADR 0001: Tech Stack Selection

## Context

QA Flow Intelligence needs a stack that is modern, opinionated, and practical for a QA intelligence SaaS. The project is also being organized as architecture-first and chunk-based so implementation can stay controlled as the codebase grows.

## Decision

We will build the product with:

- `Next.js` for the frontend and application framework.
- `Supabase` for backend services, database, auth, storage, and realtime.
- `Firebase App Hosting` as the planned deployment target for the Next.js app.
- `BYOK` AI support so users can supply their own provider keys.
- An `architecture-first` workflow where docs and chunk plans guide implementation.

## Consequences

- The app stays aligned with a strong SaaS-friendly React framework and a simple deployment target.
- Supabase keeps backend concerns consolidated without introducing early infrastructure sprawl.
- BYOK reduces dependency on a single paid model provider and supports a low-friction free tier.
- Architecture-first documentation makes future chunks easier to implement safely and review consistently.

