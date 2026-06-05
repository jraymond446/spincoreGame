# Spincore Style Bible v0.1

## Core Visual Identity

Spincore is a bright, top-down arcade sports game about catching, charging, passing, and releasing a glowing Core through floating two-way goals.

The visual target is:

- GBA-era sports game charm, modernized
- Bright hardcourt / tennis-court-inspired arena
- Stubby top-down athletes
- Clean colorful readability
- Sports-first, not sci-fi-first
- Modern arcade polish, not neon cyberpunk
- Playful but competitive

Avoid:
- overly futuristic neon
- realistic anatomy
- visible feet from top-down
- cluttered character detail
- debug-circle visuals
- overly dark arenas
- characters that look like they are floating

## Visual Pillars

### 1. Readability
At mobile size, the player should instantly read:
- where the Core is
- which team is which
- who is controlled
- what role a player has
- where the legal cradle side of the stick is
- where the goals and keeper zones are

### 2. Sports Charm
The game should feel like an invented sport with history, teams, arenas, uniforms, equipment, and rivalries.

Think classic handheld sports games with modern smoothness.

### 3. Physical Feel
The visuals should reinforce the mechanics:
- catching should look like receiving
- charging should look contained but unstable
- release should look intentional
- brute contact should feel heavy
- support passing should feel smooth
- keeper saves should feel reactive

## Character Direction

Characters are stubby, anime-light, top-down athletes.

They should have:
- large readable head shape
- visible hair cap / hair shape
- compact jersey/body shape
- no visible feet in normal gameplay
- minimal limb detail
- subtle shadow under body
- strong team-color jersey block
- role-readable silhouette

Do not draw full legs or feet. From top-down, visible feet make players look like they are flying or lying down.

Suggested proportions:
- head/hair: large and readable
- torso/jersey: compact but team-color dominant
- limbs: implied only if needed
- feet: omitted
- shadow: soft ellipse under player

Players should be slightly smaller than the first 3v3 prototype. Reduce visual footprint by about 8–12% while keeping team and role readability.

## Character Components

Each player visual should be built from layers:

1. shadow
2. torso / jersey
3. head
4. hair cap
5. small role accent, if needed
6. stick
7. controlled-player ring, if applicable
8. debug labels only in debug mode

## Hair Direction

Hair is important because faces are not readable from top-down.

Use simple readable hair-cap shapes:
- short spiky
- rounded crop
- side-swept
- messy tuft
- tied-back nub
- blunt bob
- flat athletic cut

Hair colors should vary but stay slightly muted so team jerseys remain the dominant read.

## Team Color Direction

Team colors should be obvious from the jersey/body.

Initial teams:
- Team A: bright cyan / sky blue / white accents
- Team B: coral / warm red / gold accents

Avoid using hair color as the main team identifier.

## Role Visual Direction

### Keeper
Purpose: defend the floating goal.

Visual:
- slightly broader body
- planted silhouette
- calm centered stance
- subtle keeper accent
- larger shadow than striker/support

Feel:
- stable
- reactive
- grounded

### Striker
Purpose: score.

Visual:
- slightly sleeker body
- aggressive stance
- sharper stick posture
- energetic movement

Feel:
- fast
- attacking
- decisive

### Support
Purpose: pass, control, create flow.

Visual:
- balanced silhouette
- clean jersey read
- smoother stick posture
- less aggressive than striker

Feel:
- smart
- technical
- rhythmic

### Brute
Purpose: disrupt possession and force fumbles.

Visual:
- stockier body
- heavier stance
- thicker stick silhouette
- wider shadow
- compact, dense shape

Feel:
- physical
- stubborn
- disruptive

## Stick Direction

The stick is the identity of the sport.

Each stick must clearly show:
- inside cradle side
- outside deflect side
- readable curve
- readable style

The inside of the curve should be visually emphasized.

Use:
- inner highlight
- slightly brighter cradle edge
- pocket-like curve
- socket glow when catch-ready or cradled

Do not let the Core visually attach to the outside of the curve. If the Core is cradled, it must visually snap to the inside pocket/socket.

## Stick Styles

### Hook
Balanced all-rounder.
- smooth curve
- medium thickness
- classic silhouette

### Cradle
Control stick.
- deeper pocket
- wider inner curve
- smooth technical look

### Hammer
Power/brute stick.
- thicker shaft
- heavier head
- blunt curve

### Whip
Fast release stick.
- thinner profile
- longer taper
- sleek curve

### Fork
Disruption stick.
- split/notched suggestion
- technical shape
- good for deflections/steals

## Stick Stance

The current compass-like stick behavior is not the target.

Desired stance:
- more like hockey / tennis / field hockey
- stick sits beside and slightly ahead of the player
- catch-ready presents the inside cradle toward the Core
- release feels like forehand/backhand follow-through
- not a spear pointing directly at the mouse/pointer

The player should not need awkward pointer placement to catch.

Catch mode:
- auto-orient the cradle opening toward the Core when the Core is nearby
- snap/assist Core toward inside socket
- reduce passive deflection while trying to catch

Release mode:
- pointer/touch direction controls release aim
- charge affects release force
- stick follows through visually

## Arena Direction

The arena should be bright and sporty, inspired by tennis hardcourts.

Target:
- modern bright hardcourt
- clean court lines
- tennis/basketball/soccer-inspired layout language
- not dark neon sci-fi
- not cluttered
- readable on mobile

Court palette:
- bright blue or blue-green hardcourt surface
- slightly darker outer area
- white/cyan court lines
- warm accents for sticks/goals
- high-contrast Core glow

The arena should feel like a legitimate sport court.

## Court Markings

Use markings that imply official sport structure:
- center line
- center circle / faceoff mark
- keeper zone circles
- goal plane markers
- subtle service-box-like geometry
- behind-goal space

The court can borrow from tennis visually without literally becoming tennis.

## Goals

Goals are floating two-way gates.

Visual requirements:
- clearly readable scoring plane
- elegant sports equipment, not sci-fi machinery
- two anchor nodes
- clear pass-through line
- subtle glow
- readable from either direction

Keeper zones should be visible but not debug-heavy:
- outer keeper circle
- inner no-body circle if applicable
- subtle in normal mode
- stronger in debug mode

## Core Direction

The Core should be the brightest and most important moving object.

Base:
- glowing orb
- crisp center
- soft outer halo
- always readable

States:
- free: clean glow
- stable cradle: contained glow
- charging: brighter pulse
- overcharged: unstable flicker
- fumble: sputtering burst
- release: directional trail

Charge should have gameplay meaning, not only color.

## Animation Direction

Movement:
- subtle bob
- slight lean toward movement
- no visible feet needed

Catch:
- small snap-in effect
- Core visibly enters inside cradle

Cradle:
- Core spins or pulses in pocket
- charge color builds
- player looks loaded

Release:
- clear follow-through
- brief trail
- body recoil

Brute contact:
- heavier impact flash
- chunkier displacement

Keeper save:
- short reactive swat

## UI Direction

Normal gameplay UI should be minimal:
- score
- first to target
- controlled player indicator
- charge feedback near player/Core

Debug UI:
- collapsible
- hidden by default on mobile
- never block the court by default

## Technical Art Rules

1. Separate gameplay bodies from visuals.
2. Do not rely on visual feet.
3. Core must never appear cradled outside the stick curve.
4. Inside cradle must be visually obvious.
5. Player visuals should be smaller and cleaner than debug circles.
6. Bright court readability beats decorative detail.
7. Animation should support feel before polish.
8. Mobile readability comes first.

## Immediate Visual Tasks

Priority order:

1. Shrink player visuals by 8–12%.
2. Remove visible feet.
3. Replace debug circles with top-down stubby athletes.
4. Add hair cap and jersey body.
5. Make team colors obvious.
6. Create role silhouettes for keeper, striker, support, brute.
7. Improve stick visuals and inside-cradle readability.
8. Snap cradled Core visually to inside socket.
9. Shift arena toward bright hardcourt style.
10. Replace compass-like stick posture with hockey/tennis-ready stance.

## One-Sentence Target

Spincore should look like a bright modern GBA-era arcade sports game: stubby top-down athletes, clean team colors, tennis-court-inspired arenas, readable curved sticks, and a glowing Core that feels dangerous to hold and satisfying to release.
