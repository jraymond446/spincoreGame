import { arenaConfig } from '../config/arenaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Team } from './matchTypes'

const centerX = arenaConfig.center.x
const top = arenaConfig.center.y - arenaConfig.height / 2
const bottom = arenaConfig.center.y + arenaConfig.height / 2

export const teams: Team[] = [
  {
    id: 'team-a',
    name: 'Team A',
    side: 'A',
    color: playerRuntimeConfig.teamAColor,
    accentColor: playerRuntimeConfig.teamAAccent,
    defendedGoalId: 'bottom-goal',
    attackedGoalId: 'top-goal',
    roster: [
      {
        id: 'a-keeper',
        teamId: 'team-a',
        teamSide: 'A',
        role: 'keeper',
        controllerType: 'ai',
        archetypeId: 'keeper',
        spawn: { x: centerX, y: bottom - 150 },
      },
      {
        id: 'a-support',
        teamId: 'team-a',
        teamSide: 'A',
        role: 'support',
        controllerType: 'ai',
        archetypeId: 'support',
        spawn: { x: centerX - 185, y: arenaConfig.center.y + 150 },
      },
      {
        id: 'a-striker',
        teamId: 'team-a',
        teamSide: 'A',
        role: 'striker',
        controllerType: 'human',
        archetypeId: 'striker',
        spawn: { x: centerX + 115, y: arenaConfig.center.y + 280 },
      },
    ],
  },
  {
    id: 'team-b',
    name: 'Team B',
    side: 'B',
    color: playerRuntimeConfig.teamBColor,
    accentColor: playerRuntimeConfig.teamBAccent,
    defendedGoalId: 'top-goal',
    attackedGoalId: 'bottom-goal',
    roster: [
      {
        id: 'b-keeper',
        teamId: 'team-b',
        teamSide: 'B',
        role: 'keeper',
        controllerType: 'ai',
        archetypeId: 'keeper',
        spawn: { x: centerX, y: top + 150 },
      },
      {
        id: 'b-brute',
        teamId: 'team-b',
        teamSide: 'B',
        role: 'brute',
        controllerType: 'ai',
        archetypeId: 'brute',
        spawn: { x: centerX + 185, y: arenaConfig.center.y - 150 },
      },
      {
        id: 'b-striker',
        teamId: 'team-b',
        teamSide: 'B',
        role: 'striker',
        controllerType: 'ai',
        archetypeId: 'striker',
        spawn: { x: centerX - 115, y: arenaConfig.center.y - 280 },
      },
    ],
  },
]
