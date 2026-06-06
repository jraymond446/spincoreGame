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
    const sideCount = Math.max(3, Math.round(20 * density))
    const bottomCount = Math.max(8, Math.round(44 * density))

    if (!this.simplified) {
      this.addSideMembers(-1, sideCount, 17)
      this.addSideMembers(1, sideCount, 41)
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
    const minDistance = 118
    const maxDistance =
      arenaPresentationConfig.sidelineDecorationWidth - 20
    const clusterCenters = [
      arenaConfig.height * 0.35,
      arenaConfig.height * 0.73,
    ]

    for (let index = 0; index < count; index += 1) {
      const cluster = index % clusterCenters.length
      const localIndex = Math.floor(index / clusterCenters.length)
      const column = localIndex % 3
      const row = Math.floor(localIndex / 3)
      const distance = Phaser.Math.Linear(
        minDistance,
        maxDistance,
        column / 2,
      )

      this.members.push(
        this.createMember(
          edgeX + side * distance,
          clusterCenters[cluster] + row * 25 + seeded(index + seedOffset) * 8,
          index + seedOffset,
        ),
      )
    }
  }

  private addBottomMembers(count: number, seedOffset: number): void {
    const bottom = arenaConfig.center.y + arenaConfig.height / 2
    const rows = this.simplified ? 1 : 2

    for (let index = 0; index < count; index += 1) {
      const row = index % rows
      const across = seeded(index + seedOffset)
      const y = bottom + 58 + row * 25 + seeded(index + 211) * 5

      this.members.push(
        this.createMember(
          Phaser.Math.Linear(72, arenaConfig.width - 72, across),
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
      const bodyY = member.y + bob + 4 * member.scale
      const headY = member.y + bob - 3 * member.scale

      this.graphics.fillStyle(0x06151b, alpha * 0.2)
      this.graphics.fillEllipse(
        member.x,
        member.y + 7,
        15 * member.scale,
        6 * member.scale,
      )
      this.graphics.fillStyle(member.shirtColor, alpha * 0.68)
      this.graphics.fillRoundedRect(
        member.x - 6 * member.scale,
        bodyY - 2 * member.scale,
        12 * member.scale,
        8 * member.scale,
        3 * member.scale,
      )
      this.graphics.fillStyle(0xdca57b, alpha * 0.78)
      this.graphics.fillCircle(
        member.x,
        headY,
        5.4 * member.scale,
      )
      this.graphics.fillStyle(member.hairColor, alpha * 0.9)
      this.graphics.fillCircle(
        member.x,
        headY - 2.2 * member.scale,
        5 * member.scale,
      )
    }
  }
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453

  return value - Math.floor(value)
}
