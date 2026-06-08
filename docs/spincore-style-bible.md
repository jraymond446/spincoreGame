# Spincore Visual North Star

## Core direction
Spincore should look like an original premium handheld sports game inspired by mid-gen Pokemon readability and GBA sports-game presentation.

## Pillars
- bright
- sporty
- readable
- cute/chibi
- top-down
- clean
- original

## Camera
- mostly overhead
- slightly stylized
- portrait layout

## Court
- bright blue court
- simple white markings
- floating goals
- visible keeper rings
- roomy play geometry

## Arena
- mostly white stands / arena shell
- audience made of simple colorful chibi heads/sprites
- side benches and crowd are supportive, not noisy

## Characters
- chibi athletes
- anime-lite hair silhouettes
- clean uniforms
- readable team colors
- no emphasized feet

## Sticks
- hollowed baseball bat + jai alai cesta hybrid
- thick, sporty, premium
- original design
- readable inner pocket

## UI
- chunky handheld sports-game UI
- clean scoreboard
- strong team color accents
- readable at mobile size

## Avoid
- direct Pokemon designs
- Nintendo branding
- exact GBA UI copies
- neon sci-fi
- generic debug shapes
- overly realistic rendering

## Implemented visual language
- court blue is saturated cobalt with pale blue secondary markings
- arena architecture uses cool white, light gray-blue, and navy edging
- team identity is concentrated in uniforms, sticks, goals, and scoreboard rails
- cream and gold are reserved for official match UI and important feedback
- dark navy outlines replace pure black for a softer illustrated finish
- players use compact overhead silhouettes with oversized hair/head reads
- cesta-bats use colored composite shells and a clearly hollow inner pocket
- crowd and bench figures stay lower contrast than athletes and the Core

## Asset-ready boundaries
- gameplay bodies, keeper zones, cradle zones, sockets, and goal planes remain
  invisible simulation data
- generated Phaser art is a placeholder rendering layer, never physics truth
- production art should preserve each renderer's origin, facing direction, and
  socket conventions
- replacement assets belong under `public/assets/` in the matching `ui`,
  `court`, `players`, `sticks`, or `crowd` directory

## Originality guardrails
- borrow readability, density, and color discipline rather than characters,
  logos, layouts, or sprite construction
- use Spincore-specific equipment, role silhouettes, arena geometry, and marks
- keep the scoreboard and match panels recognizably Spincore in shape and color
- do not trace, recolor, or rebuild any reference image element one-for-one
