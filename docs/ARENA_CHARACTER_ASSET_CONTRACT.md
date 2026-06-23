# Spincore Arena Character Asset Contract

This contract covers the first gameplay-character, stick, and core visual slice.
The runtime is complete without these files and falls back to procedural art.
These are artwork requirements, not menu-portrait requirements; never scale or
reuse the 512 x 512 menu portrait in the arena.

The machine-readable source is
`public/assets/characters/arena/arena-asset-contract.json`. Coordinates below
are PNG pixels from the top-left, with +X right and +Y down. Runtime angles use
screen-space radians.

## Existing Runtime Baseline

- Player collision radius: `21.5` world pixels. Physics rotation is locked.
- Procedural body scale: `0.84`; unscaled head radius `22`, torso length `25`,
  torso width `32`, with additional role-specific scale.
- Existing gameplay stick curve: length `64.4`, curve `30.8`, root offset `18`,
  and eight samples. The authoritative cradle socket is local `(76,20)`.
- Existing handed mount offsets are `+9` right-handed and `-9` left-handed.
  Aim controls stick rotation independently from body-facing rotation.
- Legacy generated stick texture: 108 x 82, root `(9,40)`, pocket `(76,51)`.
- Core collision radius: `11` world pixels. The new visual displays at 26 x 26
  while collision and scoring continue using the unchanged physics center.

The gameplay stick system remains authoritative for possession, charge,
release, fumble, and aim. The arena renderer consumes its mount, direction,
handedness signs, cradle socket, and charge value; it creates no duplicate
timers or collision state.

## Required Files

| Path | PNG | Alpha | Facing | Display | Critical anchors | Safe bounds | Z-order / treatment |
| --- | ---: | --- | --- | ---: | --- | --- | --- |
| `public/assets/characters/arena/field-player-body-base.png` | 128 x 128 | Transparent | Up | 68 x 68 | origin `(64,72)`, center `(64,62)`, head `(64,31)`, hand `(91,70)` | `(18,8,92,112)` | Body base. Neutral grayscale recolor regions; preserve outlines and luminance. |
| `public/assets/characters/arena/masks/field-player-skin-mask.png` | 128 x 128 | Transparent | Up | 68 x 68 | identical to body | `(18,8,92,112)` | Above base. White alpha selects skin only. |
| `public/assets/characters/arena/masks/field-player-uniform-primary-mask.png` | 128 x 128 | Transparent | Up | 68 x 68 | identical to body | `(18,8,92,112)` | Above skin. White alpha selects primary fabric. |
| `public/assets/characters/arena/masks/field-player-uniform-accent-mask.png` | 128 x 128 | Transparent | Up | 68 x 68 | identical to body | `(18,8,92,112)` | Above primary. White alpha selects trim/accent. |
| `public/assets/characters/arena/hair/arena-hair-01.png` | 128 x 128 | Transparent | Up | 68 x 68 | origin `(64,72)`, head `(64,31)` | `(34,8,60,52)` | Above body recolors. Neutral grayscale; hair tint preserves luminance. |
| `public/assets/sticks/arena/rookie-cesta-01.png` | 160 x 96 | Transparent | Right | 115.2 x 69.12 | grip/pivot `(24,48)`, pocket `(123,58)`, tip `(146,48)` | `(10,10,142,76)` | Separate object. Automatic front/behind body depth. |
| `public/assets/core/arena-core.png` | 64 x 64 | Transparent | Neutral | 26 x 26 | origin/pivot `(32,32)` | `(8,8,48,48)` | Above players; charge VFX above it. Include an asymmetric seam/highlight. |
| `public/assets/arena/crowd/spectator-uniform-mask.png` | 256 x 256 | Transparent | Atlas-aligned | 34 x 39 per 64 x 64 cell | exact atlas registration | full atlas | Optional clothing selection mask. |

## Body And Masks

The body and all three body masks must be exactly 128 x 128 and perfectly
registered. Do not crop individual layers. Artwork is authored facing up; the
renderer rotates the composite around `(64,72)`.

- **Body base:** transparent outside the character. Keep skin and uniform
  regions neutral enough for multiply tinting while retaining all highlights,
  shadows, antialiasing, and line work.
- **Skin mask:** white alpha over every skin pixel, including shaded and
  highlighted skin. Exclude hair, facial features, outlines, and clothing.
- **Uniform primary:** white alpha over primary jersey, shorts, and socks,
  including all corresponding shaded variations. Exclude skin and outlines.
- **Uniform accent:** white alpha over sleeves, collar, trim, sock stripes, and
  shoes, including all corresponding shaded variations.

Masks select pixels only. The runtime multiplies the requested color over the
neutral body base so the original luminance and outline detail remain visible.
Do not paint flat final colors into a mask.

## Hair

`arena-hair-01.png` uses the same 128 x 128 canvas and `(64,72)` origin as the
body. The intended hair/head registration point is `(64,31)`. All menu hair IDs
currently map deterministically to this simplified first arena hair; future
arena hairs can expand that map without changing saves.

Author neutral grayscale hair with its own highlights, shadows, outline, and
transparent antialiased edge. The runtime applies saved hair color as a tint.

## Stick

The first stick is authored horizontally, pointing right, on a 160 x 96 canvas.
Its runtime scale is `0.72`, yielding a 115.2 x 69.12 display canvas.

- Grip and rotation pivot: `(24,48)`
- Pocket/core center: `(123,58)`
- Tip: `(146,48)`
- Safe bounds: `(10,10)` through `(152,86)`
- Default angle: `0` radians

The runtime solves the stick transform so the authored pocket lands on the
existing gameplay cradle socket. For left-handed players it mirrors local Y,
including grip, pivot, pocket, and tip anchors. Supply one right-facing PNG;
do not author a second left-handed asset.

Automatic depth uses hysteresis: a pocket clearly above the player renders
behind the body, and a pocket clearly below renders in front. Lab controls can
force either layer for inspection.

### Runtime attachment fit

The gameplay mount-to-cradle vector is slightly longer and more curved than
the authored pivot-to-pocket vector. The renderer applies an explicit
attachment-only correction of `1.0235477016564258` scale and
`0.049907065938394224` radians (2.86 degrees, mirrored by handedness). This
keeps the gameplay hand on `(24,48)` while registering `(123,58)` to the base
cradle socket. During possession, the renderer may solve the rigid transform
from the live gameplay mount and cradle points. This affects presentation only;
stick collision samples and possession geometry remain unchanged.

## Core

The core uses a 64 x 64 canvas with center `(32,32)` and a 48 x 48 safe art
region. It displays at 26 x 26. Include one readable asymmetric seam, highlight,
or inset so rotation remains visible; perfectly radial artwork defeats the spin
cue.

The runtime supplies the glow, trail, charge tint, rim, rising streaks, radial
sparks, and one-time full-charge ring procedurally. No VFX texture is required.
Reduced-motion mode retains a stable bright rim and static aura while disabling
vibration, rising streaks, and the expanding confirmation ring.

## Crowd Mask

The optional crowd mask must align exactly with `spectator-atlas.png`: 256 x
256, four columns by four rows, each cell 64 x 64. White alpha covers only
recolorable clothing. Exclude skin, hair, outlines, faces, and transparent cell
padding. If absent, the existing crowd atlas renders unchanged.

## Runtime Layers

1. Procedural shadow
2. Body base
3. Skin multiply selection
4. Uniform-primary multiply selection
5. Uniform-accent multiply selection
6. Tinted hair overlay
7. Optional equipment overlap
8. Selection ring and gameplay indicators
9. Stick below or above body according to aim
10. Core
11. Charge and possession VFX

## Guide Templates

- `docs/asset-templates/arena-character-template.png` (128 x 128)
- `docs/asset-templates/arena-stick-template.png` (160 x 96)
- `docs/asset-templates/arena-core-template.png` (64 x 64)

Guide legend: navy is the canvas boundary, cyan is the center axis, yellow is
the safe/expected visible bound, red is the body/core origin, magenta is visual
center, green is head or grip, orange is rotation pivot, bright cyan is pocket,
purple is tip, and white is authored forward direction. The templates are
technical guides only and must not ship as final artwork.
