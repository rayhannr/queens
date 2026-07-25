import type { RegionLetter } from '../palette'

export interface Level {
  id: string
  /** regions[row][col] = region letter that cell belongs to */
  regions: RegionLetter[][]
}
