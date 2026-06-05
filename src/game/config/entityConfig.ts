export const coreConfig = {
  radius: 18,
  spawn: {
    x: 450,
    y: 700,
  },
  fillColor: 0xd8fbff,
  strokeColor: 0x41e6ff,
  glowColor: 0x21f0ff,
  trailColor: 0xaefbff,
  restitution: 0.92,
  friction: 0,
  frictionAir: 0.012,
  density: 0.003,
} as const

export const playerConfig = {
  spawn: {
    x: 450,
    y: 1050,
  },
  radius: 26,
  maxSpeed: 5.2,
  fillColor: 0x162b37,
  strokeColor: 0xffce5c,
  aimColor: 0xffe39b,
  frictionAir: 0.18,
  restitution: 0.35,
  stick: {
    length: 92,
    width: 13,
    curve: 44,
    rootOffset: 18,
    visualSampleCount: 8,
    color: 0xffcf68,
    shadowColor: 0x4b2f0d,
  },
} as const
