import { REGION_LETTERS, type RegionLetter } from "../palette";
import { hasUniqueSolution } from "./solver";
import type { Level } from "./types";

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Places `size` non-attacking queens (one per row/col, no two touching
 * including diagonally) via randomized backtracking. Returns their
 * column per row, or null if no placement was found (shouldn't happen
 * for size >= 4 but we guard anyway).
 */
function placeSeedQueens(size: number): number[] | null {
  const cols: number[] = [];
  const usedCols = new Set<number>();

  function backtrack(row: number): boolean {
    if (row === size) return true;
    const candidates = shuffle(
      Array.from({ length: size }, (_, i) => i).filter((c) => !usedCols.has(c))
    );
    for (const col of candidates) {
      const prevCol = row > 0 ? cols[row - 1] : null;
      if (prevCol !== null && Math.abs(prevCol - col) <= 1) continue;

      cols.push(col);
      usedCols.add(col);
      if (backtrack(row + 1)) return true;
      cols.pop();
      usedCols.delete(col);
    }
    return false;
  }

  return backtrack(0) ? cols : null;
}

/**
 * Grows `size` regions outward (BFS-style) from the seed queen cells
 * until every cell on the board belongs to exactly one region.
 */
function growRegions(size: number, seedCols: number[]): RegionLetter[][] {
  const letters = REGION_LETTERS.slice(0, size);
  const regions: (RegionLetter | null)[][] = Array.from({ length: size }, () =>
    new Array<RegionLetter | null>(size).fill(null)
  );

  const frontier: [number, number][][] = letters.map((_, i) => [[i, seedCols[i]]]);
  seedCols.forEach((col, row) => {
    regions[row][col] = letters[row];
  });

  let remaining = size * size - size;
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];

  while (remaining > 0) {
    const order = shuffle(letters.map((_, i) => i));
    let progressed = false;

    for (const regionIdx of order) {
      const queue = frontier[regionIdx];
      const nextFrontier: [number, number][] = [];

      for (const [r, c] of shuffle(queue)) {
        for (const [dr, dc] of shuffle(dirs)) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (regions[nr][nc] !== null) continue;

          regions[nr][nc] = letters[regionIdx];
          remaining--;
          progressed = true;
          nextFrontier.push([nr, nc]);
        }
      }

      frontier[regionIdx] = frontier[regionIdx].concat(nextFrontier);
      if (remaining === 0) break;
    }

    // If nothing grew (fully boxed in pockets), assign any leftover
    // cell to a random adjacent region to guarantee termination.
    if (!progressed) {
      outer: for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] !== null) continue;
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
            const neighborRegion = regions[nr][nc];
            if (neighborRegion !== null) {
              regions[r][c] = neighborRegion;
              remaining--;
              break outer;
            }
          }
        }
      }
    }
  }

  return regions as RegionLetter[][];
}

export interface GenerateOptions {
  size: number;
  maxAttempts?: number;
}

/**
 * Generates a single valid, uniquely-solvable Queens board. Retries with
 * a fresh random layout until the solver confirms exactly one solution,
 * or throws after `maxAttempts` (default 500) so a scheduled job never
 * spins forever on a bad size.
 */
export function generateBoard(options: GenerateOptions): RegionLetter[][] {
  const { size, maxAttempts = 500 } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seedCols = placeSeedQueens(size);
    if (!seedCols) continue;

    const regions = growRegions(size, seedCols);
    if (hasUniqueSolution(regions)) {
      return regions;
    }
  }

  throw new Error(`Failed to generate a valid ${size}x${size} board after ${maxAttempts} attempts`);
}

export function generateLevel(id: string, size: number): Level {
  const regions = generateBoard({ size });
  return { id, size, regions, colorCount: size };
}
