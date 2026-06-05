import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { hairColorPalette } from '../data/visualPalettes'

type CrowdMember = {
  x: number
  y: number
  phase: number
  shirtColor: number
  hairColor: number
  scale: number
}

export class CrowdRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private members: CrowdMember[] = []
  private simplified = false
  private lastDrawTime = Number.NEGATIVE_INFINITY

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-14)
    this.rebuild()
  }

  setSimplified(simplified: boolean): void {
    if (this.simplified === simplified) {
      return
    }

    this.simplified = simplified
    this.rebuild()
  }

  update(time: number): void {
    if (!arenaPresentationConfig.showCrowd) {
      this.graphics.setVisible(false)
      return
    }

    this.graphics.setVisible(true)

    if (
      time - this.lastDrawTime <
      arenaPresentationConfig.crowd.redrawIntervalMs
    ) {
      return
    }

    this.lastDrawTime = time
    this.draw(time)
  }

  destroy(): void {
    this.graphics.destroy()
  }

  private rebuild(): void {
    this.members = []
    const density =
      arenaPresentationConfig.crowdDensity *
      (this.simplified &&
      arenaPresentationConfig.mobileCrowdSimplified
        ? arenaPresentationConfig.crowd.mobileDensityMultiplier
        : 1)
    const sideCount = Math.max(4, Math.round(38 * density))
    const bottomCount = Math.max(8, Math.round(62 * density))

    if (!this.simplified) {
      this.addSideMembers(-1, sideCount, 17)
      this.addSideMembers(1, sideCount, 41)
    } else {
      this.addSideMembers(-1, Math.ceil(sideCount * 0.45), 17)
      this.addSideMembers(1, Math.ceil(sideCount * 0.45), 41)
    }

    this.addBottomMembers(bottomCount, 83)
    this.lastDrawTime = Number.NEGATIVE_INFINITY
  }

  private addSideMembers(
    side: -1 | 1,
    count: number,
    seedOffset: number,
  ): void {
    const edgeX =
      arenaConfig.center.x + side * arenaConfig.width / 2
    const minDistance = this.simplified ? 44 : 62
    const maxDistance = this.simplified
      ? 66
      : arenaPresentationConfig.sidelineDecorationWidth - 16

    for (let index = 0; index < count; index += 1) {
      const row = index % (this.simplified ? 1 : 3)
      const along = seeded(index + seedOffset)
      const distance = Phaser.Math.Linear(
        minDistance,
        maxDistance,
        this.simplified ? 0.2 : row / 2,
      )

      this.members.push(
        this.createMember(
          edgeX + side * distance,
          Phaser.Math.Linear(
            arenaConfig.height * 0.35,
            arenaConfig.height * 0.94,
            along,
          ),
          index + seedOffset,
        ),
      )
    }
  }

  private addBottomMembers(count: number, seedOffset: number): void {
    const bottom = arenaConfig.center.y + arenaConfig.height / 2
    const rows = this.simplified ? 1 : 3

    for (let index = 0; index < count; index += 1) {
      const row = index % rows
      const across = seeded(index + seedOffset)
      const y = bottom + 48 + row * 27 + seeded(index + 211) * 6

      this.members.push(
        this.createMember(
          Phaser.Math.Linear(48, arenaConfig.width - 48, across),
          y,
          index + seedOffset,
        ),
      )
    }
  }

  private createMember(
    x: number,
    y: number,
    seed: number,
  ): CrowdMember {
    const shirtColors = arenaPresentationConfig.crowd.shirtColors

    return {
      x,
      y,
      phase: seeded(seed + 401) * Math.PI * 2,
      shirtColor:
        shirtColors[Math.floor(seeded(seed + 17) * shirtColors.length)],
      hairColor:
        hairColorPalette[
          Math.floor(seeded(seed + 29) * hairColorPalette.length)
        ],
      scale: Phaser.Math.Linear(0.82, 1.12, seeded(seed + 53)),
    }
  }

  private draw(time: number): void {
    this.graphics.clear()

    for (const member of this.members) {
      const bob =
        Math.sin(
          time * arenaPresentationConfig.crowd.bobSpeed +
            member.phase,
        ) * arenaPresentationConfig.crowd.bobAmplitude
      const alpha = arenaPresentationConfig.crowd.alpha
      const bodyY = member.y + bob + 5 * member.scale
      const headY = member.y + bob - 3 * member.scale

      this.graphics.fillStyle(0x06151b, alpha * 0.28)
      this.graphics.fillEllipse(
        member.x,
        member.y + 9,
        18 * member.scale,
        8 * member.scale,
      )
      this.graphics.fillStyle(member.shirtColor, alpha * 0.68)
      this.graphics.fillRoundedRect(
        member.x - 7 * member.scale,
        bodyY - 3 * member.scale,
        14 * member.scale,
        10 * member.scale,
        3 * member.scale,
      )
      this.graphics.fillStyle(0xdca57b, alpha * 0.78)
      this.graphics.fillCircle(
        member.x,
        headY,
        6.2 * member.scale,
      )
      this.graphics.fillStyle(member.hairColor, alpha * 0.9)
      this.graphics.fillCircle(
        member.x,
        headY - 2.2 * member.scale,
        5.8 * member.scale,
      )
    }
  }
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453

  return value - Math.floor(value)
}
