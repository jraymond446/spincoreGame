import type { League, LeagueStanding, LeagueTeam } from './leagueTypes'

export const defaultLeagues: League[] = [
  {
    id: 'rookie_circuit',
    name: 'Rookie Circuit',
    description:
      'Six neighborhood clubs stand between your created player and a first circuit title.',
    teams: [
      team('rookie-scrappers', 'Rookie Scrappers', 'SCR', 1, 'balanced', 'development'),
      team('wall-rats', 'Wall Rats', 'RAT', 2, 'bankHunter', 'patient'),
      team('canal-sparks', 'Canal Sparks', 'SPK', 3, 'speed', 'balanced'),
      team('crease-crashers', 'Crease Crashers', 'CRC', 4, 'bruiser', 'volatile'),
      team('net-ghosts', 'Net Ghosts', 'NGH', 5, 'keeperFirst', 'patient'),
      team('apex-circuit', 'Apex Circuit', 'APX', 6, 'showtime', 'starHunters'),
    ],
    standings: standings([
      ['rookie-scrappers', 2, 2, 17, 16, 'W1'],
      ['wall-rats', 2, 1, 14, 12, 'L1'],
      ['canal-sparks', 1, 2, 12, 14, 'W1'],
      ['crease-crashers', 2, 2, 18, 18, 'L2'],
      ['net-ghosts', 3, 1, 20, 13, 'W2'],
      ['apex-circuit', 4, 0, 20, 8, 'W4'],
    ]),
    schedule: [
      schedule('rookie-01', 'rookie-scrappers'),
      schedule('rookie-02', 'wall-rats'),
      schedule('rookie-03', 'canal-sparks'),
      schedule('rookie-04', 'crease-crashers'),
      schedule('rookie-05', 'net-ghosts'),
      schedule('rookie-06', 'apex-circuit'),
    ],
  },
  league(
    'metro_circuit',
    'Metro Circuit',
    'Regional clubs with defined identities, payroll pressure, and deeper benches.',
    [
      ['river-kings', 'River Kings', 'RVK', 'balanced', 'balanced'],
      ['glass-yard', 'Glass Yard', 'GLS', 'bankHunter', 'patient'],
      ['foundry-club', 'Foundry Club', 'FND', 'bruiser', 'budget'],
      ['north-loop', 'North Loop', 'NLP', 'speed', 'development'],
      ['station-22', 'Station 22', 'S22', 'keeperFirst', 'balanced'],
      ['southline-static', 'Southline Static', 'STS', 'showtime', 'starHunters'],
      ['arcade-union', 'Arcade Union', 'ARC', 'bankHunter', 'volatile'],
      ['redhook-roll', 'Redhook Roll', 'RHR', 'balanced', 'patient'],
      ['tower-side', 'Tower Side', 'TWR', 'speed', 'balanced'],
      ['iron-pier', 'Iron Pier', 'IRN', 'bruiser', 'budget'],
      ['neon-yard', 'Neon Yard', 'NYD', 'showtime', 'volatile'],
      ['civic-core', 'Civic Core', 'CVC', 'keeperFirst', 'development'],
    ],
  ),
  league(
    'pro_circuit',
    'Pro Circuit',
    'Professional clubs with sharper roster construction and heavier transaction stakes.',
    [
      ['capital-walls', 'Capital Walls', 'CAP', 'balanced', 'starHunters'],
      ['harbor-halo', 'Harbor Halo', 'HRB', 'keeperFirst', 'patient'],
      ['midnight-bank', 'Midnight Bank', 'MBK', 'bankHunter', 'balanced'],
      ['summit-bolt', 'Summit Bolt', 'SMT', 'speed', 'development'],
      ['union-hammer', 'Union Hammer', 'UNH', 'bruiser', 'volatile'],
      ['golden-lane', 'Golden Lane', 'GLN', 'showtime', 'starHunters'],
      ['bayline-flicker', 'Bayline Flicker', 'BFL', 'speed', 'balanced'],
      ['old-town-guard', 'Old Town Guard', 'OTG', 'keeperFirst', 'budget'],
      ['blue-mesa', 'Blue Mesa', 'BMS', 'balanced', 'patient'],
      ['steel-saints', 'Steel Saints', 'STL', 'bruiser', 'balanced'],
      ['orbit-city', 'Orbit City', 'ORB', 'showtime', 'volatile'],
      ['wallhaven', 'Wallhaven', 'WLH', 'bankHunter', 'patient'],
      ['crossbar-club', 'Crossbar Club', 'CBC', 'keeperFirst', 'balanced'],
      ['highline-rush', 'Highline Rush', 'HLR', 'speed', 'starHunters'],
      ['lowlight-locks', 'Lowlight Locks', 'LLK', 'bruiser', 'budget'],
      ['cinder-banks', 'Cinder Banks', 'CBK', 'bankHunter', 'development'],
      ['solar-arc', 'Solar Arc', 'SLA', 'showtime', 'balanced'],
      ['meadow-grid', 'Meadow Grid', 'MDG', 'balanced', 'development'],
    ],
  ),
  league(
    'apex_league',
    'Apex League',
    'The top level of Spincore, built for long-running seasons and an evolving professional ecosystem.',
    [
      ['apex-north', 'Apex North', 'ANR', 'balanced', 'starHunters'],
      ['apex-south', 'Apex South', 'AST', 'showtime', 'starHunters'],
      ['coast-comets', 'Coast Comets', 'CCT', 'speed', 'balanced'],
      ['metro-monarchs', 'Metro Monarchs', 'MON', 'balanced', 'patient'],
      ['iron-orbit', 'Iron Orbit', 'IOR', 'bruiser', 'volatile'],
      ['glasshouse', 'Glasshouse', 'GLH', 'bankHunter', 'balanced'],
      ['keeper-kings', 'Keeper Kings', 'KPK', 'keeperFirst', 'patient'],
      ['neon-royal', 'Neon Royal', 'NRL', 'showtime', 'volatile'],
      ['capital-core', 'Capital Core', 'CCR', 'balanced', 'starHunters'],
      ['summit-saints', 'Summit Saints', 'SMS', 'keeperFirst', 'balanced'],
      ['river-rush', 'River Rush', 'RVR', 'speed', 'development'],
      ['old-port', 'Old Port', 'OPT', 'bankHunter', 'budget'],
      ['blacktop', 'Blacktop', 'BLK', 'bruiser', 'volatile'],
      ['skyline', 'Skyline', 'SKY', 'showtime', 'starHunters'],
      ['west-wall', 'West Wall', 'WST', 'bankHunter', 'patient'],
      ['east-echo', 'East Echo', 'ECH', 'speed', 'balanced'],
      ['forge-fc', 'Forge FC', 'FRG', 'bruiser', 'balanced'],
      ['blue-rail', 'Blue Rail', 'BLR', 'keeperFirst', 'development'],
      ['casino-core', 'Casino Core', 'CSC', 'showtime', 'volatile'],
      ['station-city', 'Station City', 'SCY', 'balanced', 'budget'],
      ['lunar-line', 'Lunar Line', 'LNR', 'bankHunter', 'starHunters'],
      ['atlas-yard', 'Atlas Yard', 'ATY', 'bruiser', 'patient'],
      ['brighton-bank', 'Brighton Bank', 'BRB', 'bankHunter', 'balanced'],
      ['redline-reign', 'Redline Reign', 'RLR', 'speed', 'volatile'],
      ['northstar', 'Northstar', 'NST', 'keeperFirst', 'patient'],
      ['velvet-grid', 'Velvet Grid', 'VLG', 'showtime', 'balanced'],
      ['civic-crown', 'Civic Crown', 'CVR', 'balanced', 'development'],
      ['harbor-hold', 'Harbor Hold', 'HBH', 'keeperFirst', 'budget'],
      ['opal-arc', 'Opal Arc', 'OPL', 'speed', 'starHunters'],
      ['titan-wall', 'Titan Wall', 'TTW', 'bruiser', 'starHunters'],
    ],
  ),
]

type TeamStyle = LeagueTeam['style']
type MarketProfile = LeagueTeam['marketProfile']

type TeamInput = [
  id: string,
  name: string,
  shortName: string,
  style: TeamStyle,
  marketProfile: MarketProfile,
]

function league(
  id: string,
  name: string,
  description: string,
  inputs: TeamInput[],
): League {
  const teams = buildTeams(inputs)

  return {
    id,
    name,
    description,
    teams,
    standings: createBaselineStandings(teams),
    schedule: [],
  }
}

function buildTeams(inputs: TeamInput[]): LeagueTeam[] {
  return inputs.map(([id, name, shortName, style, marketProfile], index) =>
    team(id, name, shortName, index + 1, style, marketProfile),
  )
}

function team(
  id: string,
  name: string,
  shortName: string,
  seed: number,
  style: TeamStyle,
  marketProfile: MarketProfile,
): LeagueTeam {
  return {
    id,
    opponentTeamId: id,
    seed,
    name,
    shortName,
    style,
    marketProfile,
  }
}

function standings(
  rows: Array<
    [
      teamId: string,
      wins: number,
      losses: number,
      pointsFor: number,
      pointsAgainst: number,
      streak: string,
    ]
  >,
): LeagueStanding[] {
  return rows.map(([teamId, wins, losses, pointsFor, pointsAgainst, streak]) => ({
    teamId,
    wins,
    losses,
    pointsFor,
    pointsAgainst,
    streak,
  }))
}

function createBaselineStandings(teams: LeagueTeam[]): LeagueStanding[] {
  return teams.map((leagueTeam) => {
    const wins = Math.max(0, 12 - leagueTeam.seed)
    const losses = Math.max(0, leagueTeam.seed - 1)

    return {
      teamId: leagueTeam.id,
      wins,
      losses,
      pointsFor: 5 * wins + 2 * losses + Math.max(0, 8 - leagueTeam.seed),
      pointsAgainst: 2 * wins + 5 * losses + Math.max(0, leagueTeam.seed - 3),
      streak: leagueTeam.seed <= 3 ? `W${4 - leagueTeam.seed}` : `L${Math.min(4, leagueTeam.seed - 2)}`,
    }
  })
}

function schedule(id: string, opponentTeamId: string): League['schedule'][number] {
  return {
    id,
    opponentTeamId,
    played: false,
  }
}
