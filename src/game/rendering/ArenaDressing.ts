import Phaser from 'phaser'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { ArenaShellRenderer } from './ArenaShellRenderer'
import { BenchRenderer } from './BenchRenderer'
import { CrowdRenderer } from './CrowdRenderer'

export class ArenaDressing {
  private readonly shell: ArenaShellRenderer
  private readonly crowd: CrowdRenderer
  private readonly benches: BenchRenderer

  constructor(scene: Phaser.Scene) {
    this.shell = new ArenaShellRenderer(scene)
    this.crowd = new CrowdRenderer(scene)
    this.benches = new BenchRenderer(scene)
    this.layout(scene.scale.width)
  }

  layout(viewportWidth: number): void {
    const simplified =
      viewportWidth <= arenaPresentationConfig.mobileBreakpoint

    this.shell.draw(simplified)
    this.crowd.setSimplified(simplified)
    this.benches.draw(simplified)
  }

  update(time: number): void {
    this.crowd.update(time)
  }

  destroy(): void {
    this.shell.destroy()
    this.crowd.destroy()
    this.benches.destroy()
  }
}
