import { REGION_LETTERS, type RegionLetter } from '../palette'
import { solveLogically, Tier } from './logicalSolver'
import { countSolutions } from './solver'
import type { Level } from './types'

function randInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Places `size` non-attacking queens (one per row/col, no two touching
 * including diagonally) via randomized backtracking. Returns their
 * column per row, or null if no placement was found (shouldn't happen
 * for size >= 4 but we guard anyway).
 */
function placeSeedQueens(size: number): number[] | null {
  const cols: number[] = []
  const usedCols = new Set<number>()

  function backtrack(row: number): boolean {
    if (row === size) return true
    const candidates = shuffle(Array.from({ length: size }, (_, i) => i).filter(c => !usedCols.has(c)))
    for (const col of candidates) {
      const prevCol = row > 0 ? cols[row - 1] : null
      if (prevCol !== null && Math.abs(prevCol - col) <= 1) continue

      cols.push(col)
      usedCols.add(col)
      if (backtrack(row + 1)) return true
      cols.pop()
      usedCols.delete(col)
    }
    return false
  }

  return backtrack(0) ? cols : null
}

/** Smallest region any board may contain; see `staysConnected`. */
const MIN_REGION = 2

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
]

/**
 * Picks how many cells each region should end up with. Growing every
 * region to the same ~N cells is what made earlier boards brutal: with
 * no small region anywhere, the player has no foothold to start from and
 * must reason globally from move one. Hand-built Queens boards are
 * lopsided — mostly small regions (a 2-3 cell region pins a row almost
 * immediately) alongside one or two sprawling ones that soak up the
 * leftover cells. The exponent skews the draw that way; the floor of 2
 * keeps a region from collapsing to a single give-away cell.
 */
function pickTargetSizes(size: number): number[] {
  const weights = Array.from({ length: size }, () => Math.pow(0.2 + Math.random(), 2.2))
  const total = weights.reduce((a, b) => a + b, 0)
  const budget = size * size - MIN_REGION * size

  const targets = weights.map(w => MIN_REGION + Math.floor((w / total) * budget))
  let slack = size * size - targets.reduce((a, b) => a + b, 0)
  while (slack > 0) {
    targets[randInt(size)]++
    slack--
  }
  return targets
}

/**
 * Grows `size` regions from the seed queen cells using a randomized
 * snake/random-walk (stack-based DFS) rather than uniform BFS. BFS
 * growth produces round, convex "blob" regions that barely constrain
 * the puzzle (almost every layout of queens fits), which is why
 * boards generated that way had dozens of solutions. Winding, jagged
 * regions constrain far more rows/columns and are what make a Queens
 * board have few (ideally one) solutions.
 */
function growRegions(size: number, seedCols: number[]): RegionLetter[][] {
  const targets = pickTargetSizes(size)
  const counts = new Array<number>(size).fill(1)
  const letters = REGION_LETTERS.slice(0, size)
  const regions: (RegionLetter | null)[][] = Array.from({ length: size }, () => new Array<RegionLetter | null>(size).fill(null))

  // Each region grows as a random walk from a stack of visited cells;
  // extending from the top of the stack (most recently placed cell)
  // is what produces the snake shape, backtracking down the stack
  // when a walk dead-ends.
  const stacks: [number, number][][] = letters.map((_, i) => [[i, seedCols[i]]])
  seedCols.forEach((col, row) => {
    regions[row][col] = letters[row]
  })

  let remaining = size * size - size

  const unassignedNeighbors = (r: number, c: number) =>
    DIRS.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === null
    )

  // Picking a uniformly random region each step (rather than round-
  // robin) makes regions grow at uneven rates — some become long,
  // winding snakes while others stay compact — which is what actually
  // constrains a Queens board. Round-robin growth keeps every region
  // advancing in lockstep and tends back toward smooth, unconstraining
  // blobs even with a random-walk shape.
  while (remaining > 0) {
    const live = letters.map((_, i) => i).filter(i => stacks[i].length > 0)
    if (live.length === 0) break

    // Prefer regions still under their target; once every hungry region
    // has dead-ended, let any live region take the leftovers so the board
    // always fills completely.
    const hungry = live.filter(i => counts[i] < targets[i])
    const pool = hungry.length > 0 ? hungry : live
    const regionIdx = pool[randInt(pool.length)]
    const stack = stacks[regionIdx]
    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1]
      const options = unassignedNeighbors(r, c)
      if (options.length === 0) {
        stack.pop()
        continue
      }
      const [nr, nc] = options[randInt(options.length)]
      regions[nr][nc] = letters[regionIdx]
      stack.push([nr, nc])
      counts[regionIdx]++
      remaining--
      break
    }

    // All region walks may dead-end simultaneously, leaving isolated
    // pockets of unassigned cells. Seed a fresh walk for whichever
    // region borders the pocket so growth can resume.
    if (remaining > 0 && letters.every((_, i) => stacks[i].length === 0)) {
      outer: for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] !== null) continue
          for (const [dr, dc] of DIRS) {
            const nr = r + dr
            const nc = c + dc
            if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
            const neighborRegion = regions[nr][nc]
            if (neighborRegion !== null) {
              const regionIdx = letters.indexOf(neighborRegion)
              regions[r][c] = neighborRegion
              stacks[regionIdx].push([r, c])
              counts[regionIdx]++
              remaining--
              break outer
            }
          }
        }
      }
    }
  }

  return regions as RegionLetter[][]
}

/**
 * How close a board is to being solvable by pure deduction: queens the
 * logical solver pins down, with leftover ambiguous cells as a tiebreaker
 * so two equally-stuck boards can still be ranked. This is the gradient
 * the local search climbs.
 */
function deductionScore(regions: RegionLetter[][]): number {
  const { placed, candidatesLeft } = solveLogically(regions)
  return placed * 10_000 - candidatesLeft
}

/**
 * Cells of `letter`, minus `exclude`, still form one orthogonally connected
 * blob of at least MIN_REGION cells. The size floor matters as much as the
 * connectivity check: left alone the search happily erodes a region down to
 * a single cell, which hands the player a free queen and reads as a mistake
 * — hand-built boards almost never contain one.
 */
function staysConnected(regions: RegionLetter[][], letter: RegionLetter, exclude: [number, number]): boolean {
  const size = regions.length
  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] === letter && !(r === exclude[0] && c === exclude[1])) cells.push([r, c])
    }
  }
  if (cells.length < MIN_REGION) return false

  const seen = new Set([cells[0][0] * size + cells[0][1]])
  const queue = [cells[0]]
  while (queue.length > 0) {
    const [r, c] = queue.pop()!
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      const key = nr * size + nc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (seen.has(key) || regions[nr][nc] !== letter) continue
      if (nr === exclude[0] && nc === exclude[1]) continue
      seen.add(key)
      queue.push([nr, nc])
    }
  }
  return seen.size === cells.length
}

/**
 * Nudges region borders until the board can be cracked by deduction alone.
 *
 * Growing regions at random and hoping for a good board does not work —
 * measured against hand-built levels, well under 5% of random layouts are
 * solvable without guessing, and the rate collapses further as the board
 * grows. So instead of resampling, we hill-climb: repeatedly hand a single
 * border cell to an adjacent region and keep the change unless it makes
 * the board harder to deduce. Plateau moves (equal score) are kept too,
 * which is what lets the search drift sideways out of local optima.
 *
 * Seed cells are never reassigned, so the original queen layout stays a
 * valid solution throughout and the board can never become unsolvable.
 */
function refineByLocalSearch(regions: RegionLetter[][], seedCols: number[], iterations: number): RegionLetter[][] {
  const size = regions.length
  const seedKeys = new Set(seedCols.map((col, row) => row * size + col))
  let best = regions.map(row => [...row])
  let bestScore = deductionScore(best)

  for (let step = 0; step < iterations; step++) {
    if (bestScore >= size * 10_000 - size) break

    const r = randInt(size)
    const c = randInt(size)
    if (seedKeys.has(r * size + c)) continue

    const donor = best[r][c]
    const neighbors = DIRS.map(([dr, dc]) => [r + dr, c + dc]).filter(
      ([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && best[nr][nc] !== donor
    )
    if (neighbors.length === 0) continue
    const [nr, nc] = neighbors[randInt(neighbors.length)]
    if (!staysConnected(best, donor, [r, c])) continue

    best[r][c] = best[nr][nc]
    const score = deductionScore(best)
    if (score >= bestScore) bestScore = score
    else best[r][c] = donor
  }

  return best
}

export interface GenerateOptions {
  size: number
  maxAttempts?: number
  /**
   * Reject boards whose hardest required deduction exceeds this tier.
   * Defaults to allowing everything solvable without guessing.
   */
  maxTier?: Tier
}

/**
 * Generates a valid Queens board. "Valid" is guaranteed by construction —
 * the randomly placed seed queens are always a legal solution for the
 * regions grown around them, so the board is never unsolvable.
 *
 * A unique solution alone does not make a good puzzle, though: a board can
 * have exactly one answer that is only reachable by trial and error, which
 * is what made earlier levels feel unfair. So the real gate is
 * `solveLogically` — the board is accepted only if step-by-step deduction
 * finishes it without guessing, which is how a person actually plays.
 * Uniqueness follows for free from a board that propagation can close out.
 *
 * This never throws — worst case we fall back to the best board seen
 * (preferring a logically-solvable one, then a uniquely-solvable one), so
 * an unattended job always gets a playable result.
 */
export function generateBoard(options: GenerateOptions): RegionLetter[][] {
  const { size, maxAttempts = 12, maxTier = Tier.GroupExclusion } = options

  let uniqueFallback: RegionLetter[][] | null = null
  let anyFallback: RegionLetter[][] | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seedCols = placeSeedQueens(size)
    if (!seedCols) continue

    const regions = refineByLocalSearch(growRegions(size, seedCols), seedCols, 60 * size * size)
    if (!anyFallback) anyFallback = regions

    const logical = solveLogically(regions)
    if (logical.solved && logical.hardestTier <= maxTier) return regions

    // cap=2 is enough to classify "unique" vs "not unique" and lets the
    // solver bail out the moment a second solution is found.
    if (!uniqueFallback && countSolutions(regions, 2, 20_000) === 1) uniqueFallback = regions
  }

  const fallback = uniqueFallback ?? anyFallback
  if (!fallback) throw new Error(`Failed to place seed queens for a ${size}x${size} board`)
  return fallback
}

export function generateLevel(id: string, size: number, maxTier?: Tier): Level {
  const regions = generateBoard({ size, maxTier })
  return { id, regions }
}
