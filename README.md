# Queens

A web version of the LinkedIn-style "Queens" puzzle: place one queen per row, column, and
color region, with no two queens touching (even diagonally). Built with Next.js, React Three
Fiber (for the ambient background/effects), and Tailwind CSS.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the level picker.

## Project structure

- `app/` — Next.js App Router pages: the level picker (`app/page.tsx`) and the per-level
  board (`app/level/[id]/page.tsx`).
- `components/` — Board rendering (`Board`, `BoardClient`, `Cell`, `LevelPreview`) and
  decorative `three/` components (ambient background, win confetti, crown burst).
- `lib/game/useQueensGame.ts` — Client-side game state hook: cell cycling (empty → blocker →
  queen), history/undo, and win detection.
- `lib/generator/` — Procedural level generation:
  - `generate.ts` — builds a board by seeding non-attacking queens, growing colored regions
    around them, and validating the result.
  - `logicalSolver.ts` — solves a board using only human-style deduction (no guessing); used
    to guarantee generated levels are solvable without backtracking.
  - `solver.ts` — brute-force solution counter, used to confirm a board has a unique solution.
- `lib/levels/data.ts` — **auto-generated**, do not hand-edit. The list of shipped levels.
- `lib/palette.ts` — region letter/color definitions.
- `scripts/generate-levels.ts` — appends newly generated levels to `lib/levels/data.ts`. Run
  with `npm run generate:level [count]`.

## Level generation

Levels are generated so that every board has a unique solution reachable by pure logical
deduction — no trial-and-error required. A GitHub Actions workflow
(`.github/workflows/generate-level.yml`) runs this on a schedule to drop new levels
automatically; each run only appends, never rewrites existing levels.

## Scripts

- `npm run dev` — start the dev server.
- `npm run build` / `npm run start` — production build/serve.
- `npm run lint` — lint with oxlint.
- `npm run format` / `npm run format:check` — format with oxfmt.
- `npm run generate:level [count]` — generate and append new levels.

## Notes for contributors

This project pins a pre-release/breaking version of Next.js — see
[AGENTS.md](AGENTS.md) before making framework-related changes, and read the docs under
`node_modules/next/dist/docs/` rather than relying on prior Next.js knowledge.
