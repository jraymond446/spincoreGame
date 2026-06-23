# Spincore Arena Asset Contract

All arena PNGs use the canonical portrait-oriented Rookie geometry. Artwork must
not contain players, spectators, field markings, team crests, goals, scores, or
UI unless the slot explicitly says otherwise.

## Required Rookie Slice

### `venues/rookie/rookie-shell.png`

- 1368 x 1820 transparent PNG
- Maps 1:1 to the full venue bounds
- Playable court rectangle begins at pixel `(184, 78)`
- Playable court rectangle is exactly `1000 x 1600`
- Draw only architecture outside the court opening: stands, rails, concourse,
  tunnels, benches/background dressing, and venue shadows
- The full `1000 x 1600` court opening must remain transparent

### `surfaces/standard-blue.png`

- 1000 x 1600 opaque PNG
- Seamless court material and subtle wear only
- No boundary, midfield, service, keeper-area, or center-circle markings
- No crest, logo, goal, player, core, crowd, text, or UI

### `scoreboards/rookie-frame.png`

- 1560 x 164 transparent PNG, authored at 2x for a 780 x 82 CSS frame
- Decorative frame only
- Keep the interior content zones transparent
- No team names, crests, score digits, match rules, or statistics
- Protect a 20 px safe area around every 2x edge so mobile scaling remains clean

### `crowd/spectator-atlas.png`

- 256 x 256 transparent PNG
- 4 columns x 4 rows
- 16 frames, each exactly 64 x 64
- Top-down chibi spectators centered consistently in every frame
- Include seated and standing/cheering poses, varied skin and hair, and neutral
  grayscale clothing that can coexist with dynamic team-colored placeholders
- No floor, seat, shadow box, text, or frame padding beyond the 64 x 64 cell

## Optional Team Crests

Save 256 x 256 transparent square PNGs under `crests/<team-id>.png`.
The first Rookie IDs are:

- `rookie-scrappers.png`
- `wall-rats.png`
- `canal-sparks.png`
- `crease-crashers.png`
- `net-ghosts.png`
- `apex-circuit.png`

Custom career clubs intentionally fall back to generated initials and team
colors until a user-logo system exists.
