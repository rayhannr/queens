import type { RegionLetter } from "../palette";

/**
 * Backtracking solver for a Queens board: one queen per row, per column,
 * per color region, and no two queens may touch (including diagonally).
 * Counts solutions up to `cap` (default 2) so callers can distinguish
 * "unsolvable" / "unique solution" / "multiple solutions" without paying
 * for a full search on easy boards.
 */
export function countSolutions(regions: RegionLetter[][], cap = 2): number {
  const size = regions.length;
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Set<RegionLetter>();
  const queenCols: number[] = [];
  let found = 0;

  function backtrack(row: number) {
    if (found >= cap) return;
    if (row === size) {
      found++;
      return;
    }
    for (let col = 0; col < size; col++) {
      if (usedCols[col]) continue;
      const region = regions[row][col];
      if (usedRegions.has(region)) continue;

      const prevCol = row > 0 ? queenCols[row - 1] : null;
      if (prevCol !== null && Math.abs(prevCol - col) <= 1) continue;

      usedCols[col] = true;
      usedRegions.add(region);
      queenCols.push(col);

      backtrack(row + 1);

      usedCols[col] = false;
      usedRegions.delete(region);
      queenCols.pop();

      if (found >= cap) return;
    }
  }

  backtrack(0);
  return found;
}

export function hasUniqueSolution(regions: RegionLetter[][]): boolean {
  return countSolutions(regions, 2) === 1;
}
