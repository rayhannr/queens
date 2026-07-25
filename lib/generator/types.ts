import type { RegionLetter } from '../palette'

export interface Level {
  id: string
  /** regions[row][col] = region letter that cell belongs to */
  regions: RegionLetter[][]
  /** false only for the rare generation fallback that couldn't confirm uniqueness */
  hasUniqueSolution: boolean
}
