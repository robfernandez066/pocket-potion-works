# Coder roadmap

The handoff is intentionally sequential. The reviewer should approve one task before the next begins.

## Task 1 — Reliability foundation

- **Model:** GPT-5.6 Sol, high reasoning
- **Chat:** Fresh chat
- **Why:** This task changes architectural boundaries and must reason carefully about timers, transactions, and hostile saves.
- **Outcome:** Separate testable economy/save logic from DOM rendering, add automated gameplay tests, and make save recovery resilient without changing the visible design.

## Task 2 — First-session content and balance

- **Model:** GPT-5.6 Terra, medium-high reasoning
- **Chat:** Continue Task 1 chat after review approval
- **Why:** It benefits from the architecture context, while the work is bounded and data-heavy.
- **Outcome:** Tune the first 10 minutes, expand content, guarantee completable order generation, and add economy simulations.

## Task 3 — Platform and monetization adapters

- **Model:** GPT-5.6 Sol, high reasoning
- **Chat:** Fresh chat
- **Why:** Billing, ads, privacy, lifecycle behavior, and native packaging are a new risk domain.
- **Outcome:** Define adapter boundaries and failure-safe flows without connecting production accounts or SDKs.

## Task 4 — Art, sound, and accessibility polish

- **Model:** GPT-5.6 Terra, medium reasoning; GPT Image 2 only for final raster assets if needed
- **Chat:** Fresh chat
- **Why:** Visual/audio work should start from the approved gameplay and platform contracts.
- **Outcome:** Improve feedback and identity while preserving performance, offline use, reduced motion, and accessibility.

## Task 5 — Release candidate

- **Model:** GPT-5.6 Sol, high reasoning
- **Chat:** Fresh chat
- **Why:** Release work needs an independent audit rather than accumulated assumptions.
- **Outcome:** Complete device QA, privacy/store materials, production integrations, packaging, and a go/no-go report.

Use `npm.cmd run handoff` for the exact next prompt and acceptance criteria.
