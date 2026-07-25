import type { RegionLetter } from '../palette'

/**
 * Backtracking solver for a Queens board: one queen per row, per column,
 * per color region, and no two queens may touch (including diagonally).
 * Counts solutions up to `cap` (default 2) so callers can distinguish
 * "unsolvable" / "unique solution" / "multiple solutions" without paying
 * for a full search on easy boards.
 */
/**
 * `nodeBudget` bounds how many row-placements the search may explore
 * before giving up. A weakly-constrained board (few regions actually
 * narrowing the layout) can otherwise take seconds to even find its
 * 2nd solution as N grows — the generator only needs to know "not
 * unique" quickly to move on to the next candidate, so on budget
 * exhaustion we report `cap` (treated as "too many, reject") rather
 * than searching to completion.
 */
export function countSolutions(regions: RegionLetter[][], cap = 2, nodeBudget = 200_000): number {
  const size = regions.length
  const usedCols = new Array<boolean>(size).fill(false)
  const usedRegions = new Set<RegionLetter>()
  const queenCols: number[] = []
  let found = 0
  let nodes = 0
  let budgetExceeded = false

  function backtrack(row: number) {
    if (found >= cap || budgetExceeded) return
    if (row === size) {
      found++
      return
    }
    for (let col = 0; col < size; col++) {
      if (usedCols[col]) continue
      const region = regions[row][col]
      if (usedRegions.has(region)) continue

      const prevCol = row > 0 ? queenCols[row - 1] : null
      if (prevCol !== null && Math.abs(prevCol - col) <= 1) continue

      nodes++
      if (nodes > nodeBudget) {
        budgetExceeded = true
        return
      }

      usedCols[col] = true
      usedRegions.add(region)
      queenCols.push(col)

      backtrack(row + 1)

      usedCols[col] = false
      usedRegions.delete(region)
      queenCols.pop()

      if (found >= cap || budgetExceeded) return
    }
  }

  backtrack(0)
  return budgetExceeded ? cap : found
}

export function hasUniqueSolution(regions: RegionLetter[][]): boolean {
  return countSolutions(regions, 2) === 1
}
