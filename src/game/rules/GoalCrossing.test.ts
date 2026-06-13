import { evaluateGoalCrossing } from './GoalCrossing.ts'

type Case = {
  name: string
  previous: { x: number; y: number }
  current: { x: number; y: number }
  expected: boolean
}

const planeY = 100
const cases: Case[] = [
  {
    name: 'top goal fast crossing',
    previous: { x: 50, y: 125 },
    current: { x: 50, y: 80 },
    expected: true,
  },
  {
    name: 'bottom goal fast crossing',
    previous: { x: 50, y: 80 },
    current: { x: 50, y: 125 },
    expected: true,
  },
  {
    name: 'top goal slow roll',
    previous: { x: 42, y: 100.1 },
    current: { x: 42, y: 99.9 },
    expected: true,
  },
  {
    name: 'bottom goal slow roll',
    previous: { x: 58, y: 99.9 },
    current: { x: 58, y: 100.1 },
    expected: true,
  },
  {
    name: 'angled bank path through top goal',
    previous: { x: 20, y: 125 },
    current: { x: 70, y: 75 },
    expected: true,
  },
  {
    name: 'angled bank path through bottom goal',
    previous: { x: 70, y: 75 },
    current: { x: 20, y: 125 },
    expected: true,
  },
  {
    name: 'outside posts',
    previous: { x: 90, y: 125 },
    current: { x: 90, y: 75 },
    expected: false,
  },
  {
    name: 'post edge outside tolerance',
    previous: { x: 76, y: 125 },
    current: { x: 76, y: 75 },
    expected: false,
  },
  {
    name: 'travels along plane',
    previous: { x: 30, y: 100 },
    current: { x: 70, y: 100 },
    expected: false,
  },
  {
    name: 'moves behind goal outside posts',
    previous: { x: 90, y: 80 },
    current: { x: 92, y: 70 },
    expected: false,
  },
]

for (const testCase of cases) {
  const result = evaluateGoalCrossing({
    previousPosition: testCase.previous,
    currentPosition: testCase.current,
    planeY,
    minX: 30,
    maxX: 70,
    tolerance: 5,
    useSweptDetection: true,
  })

  if ((result.rejectedReason === null) !== testCase.expected) {
    throw new Error(
      `${testCase.name}: expected ${testCase.expected}, got ` +
        JSON.stringify(result),
    )
  }
}

console.info(`Goal crossing regression cases passed: ${cases.length}`)
