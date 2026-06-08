# Spincore Asset Override Pipeline

Spincore keeps generated Phaser visuals as its default art. PNG files placed in
the supported `public/assets` slots override only the matching visible layer.
Missing files, failed image loads, and invalid crowd sheets fall back to the
generated art.

Vite serves files in `public` from the site root, so
`public/assets/sticks/hook.png` is loaded as `/assets/sticks/hook.png`.

## Stick Assets

Supported files:

- `public/assets/sticks/hook.png`
- `public/assets/sticks/cradle.png`
- `public/assets/sticks/hammer.png`
- `public/assets/sticks/whip.png`
- `public/assets/sticks/fork.png`

Use a transparent PNG with a logical canvas of `108 x 82` pixels. Integer-scale
versions such as `216 x 164` are also supported and are normalized at runtime.

The sprite should:

- Face right.
- Place the handle/root at logical pixel `(9, 40)`.
- Place the pocket seat near logical pixel `(76, 51)`.
- Keep the root and pocket positions stable across all five styles.
- Leave enough transparent padding for the pocket and charge effects.

The code continues to position the art from the gameplay cradle socket. Stick
collision, cradle zones, release aim, and charge behavior do not come from the
PNG.

## Player Assets

Supported files:

- `public/assets/players/player_base.png`
- `public/assets/players/team_a.png`
- `public/assets/players/team_b.png`

Player assets are centered, face right, and render at a logical `64 x 64`
display size before role and animation scaling.

The preferred composition is:

1. `player_base.png`: skin, hair, neutral body details, and shared outline.
2. `team_a.png` or `team_b.png`: transparent jersey, trim, and team-specific
   details on an identical canvas.

Either layer can also work independently. A team file may be a full character
sprite if a layered workflow is not useful yet. Keep transparent padding and
alignment identical between all player files.

The external player sprite replaces the generated character drawing only. The
physics body, shadow, controlled-player marker, debug labels, and separate stick
visual remain code-driven.

## Crowd Sheet

Supported file:

- `public/assets/crowd/crowd_sheet.png`

The crowd sheet uses `32 x 32` pixel frames arranged left-to-right and
top-to-bottom. Each frame should contain one centered, transparent top-down
spectator. Frames are displayed at roughly `24 x 28` logical pixels and inherit
the existing subtle crowd bob.

If the sheet is missing or does not produce valid frames, the procedural crowd
renderer remains active.

## Replacement Workflow

1. Export the PNG with transparency into the exact `public/assets` path.
2. Reload the browser. A hard reload is useful after replacing a file with the
   same name.
3. Check both 3v3 and Stick Lab.
4. Verify desktop and mobile portrait framing.
5. Remove or rename the PNG to confirm the procedural fallback still appears.
6. Run `npm run build`.

No import statement or asset manifest edit is required for the supported slots.
The paths and display contracts live in
`src/game/config/assetOverrideConfig.ts`.

## Gameplay Separation

Assets are presentation only. Do not align gameplay by changing physics values
to fit a sprite. Adjust transparent padding and artwork anchors instead.

These remain defined in code:

- Player and Core physics bodies
- Stick root, cradle socket, legal cradle zone, and deflect zone
- Goal posts and scoring planes
- Keeper areas and no-body zones
- Arena boundaries and formation positions
