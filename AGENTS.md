# SpinCore Agent Guide

## Project

SpinCore is a TypeScript + Phaser 3 arena-sport game built with Vite. The
default branch is `master`. Preserve the existing game concept and make
incremental, test-backed changes rather than broad rewrites.

## Commands

- Install: `npm ci`
- Develop: `npm run dev`
- Test: `npm test`
- Build/type-check: `npm run build`
- Preview production build: `npm run preview`

Use Node 22.12 or newer. Before handing off a change, run `npm test` and
`npm run build`. Add a focused regression case for gameplay-rule changes.

## Architecture

- `src/game/scenes/GameScene.ts`: match orchestration; keep domain rules in
  focused systems rather than growing this file.
- `src/game/systems`: possession, input, defense, AI, keeper, match-flow, and
  other runtime systems.
- `src/game/config`: canonical gameplay and visual tuning values.
- `src/game/lab`: live tuning controls and persistence. Keep defaults, lab
  schema, validation, application, and UI controls synchronized.
- `src/game/arena` and `src/game/rendering`: field layout and presentation.
- `src/app` and `src/ui`: menus, shell, progression, and reusable UI.
- `src/save`, `src/match`, `src/equipment`, `src/league`, `src/franchise`:
  non-rendering game state and progression.

## Gameplay Invariants

- Human- and AI-controlled players use the same possession, vulnerability,
  interruption, fumble, collision, and keeper rules unless an intentional
  difference is documented and tested.
- The explicit slash control is contextual: off-ball it slashes; while
  carrying it performs a quick release/pass.
- Charging never grants blanket possession immunity. Legal slashes/checks can
  interrupt a charge or force a fumble through the shared carrier-disruption
  policy.
- Power moves remain interruptible. AI should use them only when the action is
  plausibly open, not as invulnerable scripted sequences.
- Charged direct shots against a set keeper should be uncommon; bank shots,
  passes, and movement should carry strategic value.
- Keep player and AI action timing legible. Do not fix feel problems solely by
  raising speed or force without checking animation, collision, and recovery.

## Arena and Asset Contracts

- Gameplay geometry comes from `ArenaLayout` and the files in
  `src/game/config`; rendering should consume that geometry rather than define
  a second field shape.
- Arena body canvas: 128x128, origin `(64,72)`, head anchor `(64,31)`.
- Arena stick canvas: 160x96, pivot/grip `(24,48)`, pocket `(123,58)`.
- Arena core canvas: 64x64, origin `(32,32)`.
- Preserve masks, anchors, safe bounds, handedness, and layer ordering when
  replacing or animating assets.
- Finalize playing-field geometry and presentation before major collision or
  animation retuning. Visual-only changes must not silently alter physics.

## Change Discipline

- Search for all consumers before changing shared config or state names.
- Prefer extracting pure policy functions from Phaser-dependent systems so
  gameplay rules can be regression tested in Node.
- Avoid unrelated formatting or large-file rewrites.
- Keep the working tree clean and report any pre-existing changes.
- Never commit generated `node_modules`, `dist`, local saves, or secrets.

