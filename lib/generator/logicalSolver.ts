import type { RegionLetter } from '../palette'

/**
 * Difficulty tier of the hardest deduction a board required. A board that
 * only ever needs tier 1 is trivial; one needing tier 4 asks the player to
 * reason about groups of regions at once.
 */
export const enum Tier {
  /** A row/column/region has exactly one candidate left. */
  Single = 1,
  /** A region's candidates all share one row/column, clearing the rest of that line. */
  RegionConfined = 2,
  /** A row/column's candidates all sit in one region, clearing the rest of that region. */
  LineConfined = 3,
  /** A cell is knocked out by *every* remaining placement of some row/column/region. */
  ForcedElimination = 4,
  /** k regions confined to exactly k lines (or vice versa), clearing the rest. */
  GroupExclusion = 5
}

export interface LogicalSolveResult {
  /** False when propagation stalled — the board can only be finished by guessing. */
  solved: boolean
  hardestTier: Tier
  /** How many deductions of tier 3+ were needed. A rough "how grindy" measure. */
  advancedSteps: number
  /** Queens pinned down before finishing or stalling. Drives the generator's local search. */
  placed: number
  /** Cells still ambiguous when propagation ended. Breaks ties between equally-stuck boards. */
  candidatesLeft: number
}

type Cell = number

/**
 * Solves a Queens board the way a person does: by repeatedly applying
 * elimination rules, never by guessing and backtracking. This is the
 * measure of difficulty that matters — `countSolutions` tells you a board
 * has one answer, but not whether a human can *find* it without trial and
 * error. Boards that stall here are the ones that feel unfair.
 */
export function solveLogically(regions: RegionLetter[][]): LogicalSolveResult {
  const size = regions.length
  const cellCount = size * size

  const regionLetters = [...new Set(regions.flat())]
  const regionOf = new Array<number>(cellCount)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) regionOf[r * size + c] = regionLetters.indexOf(regions[r][c])
  }

  const candidate = new Array<boolean>(cellCount).fill(true)
  const groupSolved = {
    row: new Array<boolean>(size).fill(false),
    col: new Array<boolean>(size).fill(false),
    region: new Array<boolean>(regionLetters.length).fill(false)
  }
  let placed = 0

  const rowOf = (i: Cell) => Math.floor(i / size)
  const colOf = (i: Cell) => i % size

  const cellsWhere = (pred: (i: Cell) => boolean): Cell[] => {
    const out: Cell[] = []
    for (let i = 0; i < cellCount; i++) if (candidate[i] && pred(i)) out.push(i)
    return out
  }

  const rowCells = (r: number) => cellsWhere(i => rowOf(i) === r)
  const colCells = (c: number) => cellsWhere(i => colOf(i) === c)
  const regionCells = (g: number) => cellsWhere(i => regionOf[i] === g)

  function placeQueen(i: Cell) {
    const r = rowOf(i)
    const c = colOf(i)
    const g = regionOf[i]
    for (let j = 0; j < cellCount; j++) {
      if (!candidate[j]) continue
      if (rowOf(j) === r || colOf(j) === c || regionOf[j] === g) candidate[j] = false
      else if (Math.abs(rowOf(j) - r) <= 1 && Math.abs(colOf(j) - c) <= 1) candidate[j] = false
    }
    groupSolved.row[r] = true
    groupSolved.col[c] = true
    groupSolved.region[g] = true
    placed++
  }

  /** Tier 1: any unsolved row/col/region down to a single candidate. */
  function findSingle(): boolean {
    for (let r = 0; r < size; r++) {
      if (groupSolved.row[r]) continue
      const cells = rowCells(r)
      if (cells.length === 1) return (placeQueen(cells[0]), true)
    }
    for (let c = 0; c < size; c++) {
      if (groupSolved.col[c]) continue
      const cells = colCells(c)
      if (cells.length === 1) return (placeQueen(cells[0]), true)
    }
    for (let g = 0; g < regionLetters.length; g++) {
      if (groupSolved.region[g]) continue
      const cells = regionCells(g)
      if (cells.length === 1) return (placeQueen(cells[0]), true)
    }
    return false
  }

  /** Tier 2: a region's candidates all lie in one row/col — clear the rest of that line. */
  function findRegionConfined(): boolean {
    for (let g = 0; g < regionLetters.length; g++) {
      if (groupSolved.region[g]) continue
      const cells = regionCells(g)
      if (cells.length < 2) continue
      for (const axis of ['row', 'col'] as const) {
        const of = axis === 'row' ? rowOf : colOf
        const lines = new Set(cells.map(of))
        if (lines.size !== 1) continue
        const line = [...lines][0]
        let changed = false
        for (let i = 0; i < cellCount; i++) {
          if (candidate[i] && of(i) === line && regionOf[i] !== g) {
            candidate[i] = false
            changed = true
          }
        }
        if (changed) return true
      }
    }
    return false
  }

  /** Tier 3: a row/col's candidates all lie in one region — clear the rest of that region. */
  function findLineConfined(): boolean {
    for (const axis of ['row', 'col'] as const) {
      const solvedFlags = axis === 'row' ? groupSolved.row : groupSolved.col
      for (let line = 0; line < size; line++) {
        if (solvedFlags[line]) continue
        const cells = axis === 'row' ? rowCells(line) : colCells(line)
        if (cells.length < 2) continue
        const groups = new Set(cells.map(i => regionOf[i]))
        if (groups.size !== 1) continue
        const g = [...groups][0]
        const of = axis === 'row' ? rowOf : colOf
        let changed = false
        for (let i = 0; i < cellCount; i++) {
          if (candidate[i] && regionOf[i] === g && of(i) !== line) {
            candidate[i] = false
            changed = true
          }
        }
        if (changed) return true
      }
    }
    return false
  }

  /**
   * Tier 4: pick an unsolved row/column/region and ask what every one of
   * its remaining placements has in common. Any cell that all of them
   * knock out is dead regardless of which placement turns out to be
   * right, so it can go now. This is the "wherever the queen goes in
   * here, it kills that square" move, and it is the workhorse of
   * hand-built boards — tiers 2 and 3 are just the cheap special cases of
   * it that are quicker to spot.
   */
  function findForcedElimination(): boolean {
    const groups: Cell[][] = []
    for (let r = 0; r < size; r++) if (!groupSolved.row[r]) groups.push(rowCells(r))
    for (let c = 0; c < size; c++) if (!groupSolved.col[c]) groups.push(colCells(c))
    for (let g = 0; g < regionLetters.length; g++) if (!groupSolved.region[g]) groups.push(regionCells(g))

    const hits = new Int32Array(cellCount)
    for (const cells of groups) {
      if (cells.length < 2) continue
      hits.fill(0)
      for (const i of cells) {
        const r = rowOf(i)
        const c = colOf(i)
        const g = regionOf[i]
        for (let j = 0; j < cellCount; j++) {
          if (!candidate[j] || j === i) continue
          const jr = rowOf(j)
          const jc = colOf(j)
          if (jr === r || jc === c || regionOf[j] === g || (Math.abs(jr - r) <= 1 && Math.abs(jc - c) <= 1)) hits[j]++
        }
      }
      let changed = false
      for (let j = 0; j < cellCount; j++) {
        if (candidate[j] && hits[j] === cells.length) {
          candidate[j] = false
          changed = true
        }
      }
      if (changed) return true
    }
    return false
  }

  /**
   * Tier 5: if k "units" between them can only reach k "slots", those units
   * own those slots outright and everyone else can be cleared out of them.
   *
   * Concretely, in the region→row direction: say four rows hold regions
   * A..G, but A, C, D and G appear nowhere outside those four rows. Those
   * four regions need four queens and have only four rows to put them in,
   * so the rows are spoken for — every B, E and F cell in them can go.
   *
   * The same argument runs with the roles swapped (k rows whose cells sit
   * in only k regions pin those regions to those rows), so both directions
   * are checked. Tiers 2 and 3 are the k=1 cases of the two directions.
   *
   * `k` runs to half the board because the two directions are duals: a
   * k-subset on one side is the complement of an (N-k)-subset on the
   * other, so checking small k on both sides covers the large-k cases too.
   */
  function findGroupExclusion(): boolean {
    const openRegions = Array.from({ length: regionLetters.length }, (_, g) => g).filter(g => !groupSolved.region[g])

    for (const axis of ['row', 'col'] as const) {
      const of = axis === 'row' ? rowOf : colOf
      const solvedFlags = axis === 'row' ? groupSolved.row : groupSolved.col
      const openLines = Array.from({ length: size }, (_, l) => l).filter(l => !solvedFlags[l])

      // [units, slotOf, unitOf] for each direction of the argument.
      const directions: [number[], (i: Cell) => number, (i: Cell) => number][] = [
        [openRegions, of, i => regionOf[i]],
        [openLines, i => regionOf[i], of]
      ]

      for (const [units, slotOf, unitOf] of directions) {
        const slotsByUnit = new Map<number, Set<number>>(units.map(u => [u, new Set<number>()]))
        for (let i = 0; i < cellCount; i++) {
          if (candidate[i]) slotsByUnit.get(unitOf(i))?.add(slotOf(i))
        }

        for (let k = 2; k <= Math.floor(size / 2); k++) {
          for (const combo of combinations(units, k)) {
            const union = new Set<number>()
            for (const u of combo) for (const s of slotsByUnit.get(u)!) union.add(s)
            if (union.size !== k) continue

            let changed = false
            for (let i = 0; i < cellCount; i++) {
              if (candidate[i] && union.has(slotOf(i)) && !combo.includes(unitOf(i))) {
                candidate[i] = false
                changed = true
              }
            }
            if (changed) return true
          }
        }
      }
    }
    return false
  }

  const rules: [Tier, () => boolean][] = [
    [Tier.Single, findSingle],
    [Tier.RegionConfined, findRegionConfined],
    [Tier.LineConfined, findLineConfined],
    [Tier.ForcedElimination, findForcedElimination],
    [Tier.GroupExclusion, findGroupExclusion]
  ]

  let hardestTier = Tier.Single
  let advancedSteps = 0

  const countCandidates = () => candidate.reduce((n, c) => n + (c ? 1 : 0), 0)

  while (placed < size) {
    const applied = rules.find(([, apply]) => apply())
    if (!applied) return { solved: false, hardestTier, advancedSteps, placed, candidatesLeft: countCandidates() }
    const [tier] = applied
    if (tier > hardestTier) hardestTier = tier
    if (tier >= Tier.LineConfined) advancedSteps++
  }

  return { solved: true, hardestTier, advancedSteps, placed, candidatesLeft: countCandidates() }
}

function combinations(items: number[], k: number): number[][] {
  const out: number[][] = []
  const build = (start: number, acc: number[]) => {
    if (acc.length === k) return void out.push([...acc])
    for (let i = start; i < items.length; i++) {
      acc.push(items[i])
      build(i + 1, acc)
      acc.pop()
    }
  }
  build(0, [])
  return out
}
