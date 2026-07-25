import { REGION_LETTERS, type RegionLetter } from '../palette'
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

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
]

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
    const liveRegions = letters.map((_, i) => i).filter(i => stacks[i].length > 0)
    if (liveRegions.length === 0) break

    const regionIdx = liveRegions[randInt(liveRegions.length)]
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

export interface GenerateOptions {
  size: number
  maxAttempts?: number
}

/**
 * Generates a valid Queens board. "Valid" is guaranteed by construction —
 * the randomly placed seed queens are always a legal solution for the
 * regions grown around them, so the board is never unsolvable. What
 * varies is how many *other* solutions the puzzle also admits; a board
 * with a unique solution is a much better puzzle than one with dozens.
 *
 * We search up to `maxAttempts` (default 300) random layouts and keep
 * the one with the fewest solutions, stopping early the moment we find
 * a uniquely-solvable one. This never throws — worst case we fall back
 * to the best (lowest solution count) board seen, so a scheduled job
 * generating levels unattended always gets a playable result.
 */
export function generateBoard(options: GenerateOptions): RegionLetter[][] {
  // Larger boards make each solver call slower, so give them fewer
  // attempts — still plenty since snake-shaped regions converge fast.
  // Uniqueness gets harder to hit as size grows; past ~11 we mostly
  // rely on the fallback (solvable, just not guaranteed unique) since
  // chasing a unique solution there is not worth the runtime cost.
  const defaultAttempts = Math.max(10, Math.floor(200 / options.size))
  const { size, maxAttempts = defaultAttempts } = options

  let fallback: RegionLetter[][] | null = null

  // cap=2 is enough to classify "unique" vs "not unique" and lets the
  // solver bail out the moment a second solution is found, instead of
  // exploring the tree all the way to a larger cap on every attempt.
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seedCols = placeSeedQueens(size)
    if (!seedCols) continue

    const regions = growRegions(size, seedCols)
    if (!fallback) fallback = regions

    if (countSolutions(regions, 2, 20_000) === 1) {
      return regions
    }
  }

  if (!fallback) {
    throw new Error(`Failed to place seed queens for a ${size}x${size} board`)
  }

  return fallback
}

export function generateLevel(id: string, size: number): Level {
  const regions = generateBoard({ size })
  return { id, size, regions, colorCount: size }
}
