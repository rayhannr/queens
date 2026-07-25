import type { RegionLetter } from '../palette'

export interface Level {
  id: string
  /** Board is size x size */
  size: number
  /** regions[row][col] = region letter that cell belongs to */
  regions: RegionLetter[][]
  /** number of distinct regions == size */
  colorCount: number
}
