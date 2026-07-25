// Curated, perceptually-spaced palette for up to 18 puzzle regions.
// Each region is identified by a letter (A-R) and a distinguishable, pretty color.
export type RegionLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R'

export const REGION_LETTERS: RegionLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R']

export interface RegionColor {
  letter: RegionLetter
  /** Cell fill */
  bg: string
  /** Text/icon color for contrast on top of bg */
  fg: string
}

// 18 hand-picked hues, spaced around the wheel and alternated in
// lightness/saturation so neighbors never read as "the same color".
const PALETTE_HEX: [string, string][] = [
  ['#F87171', '#7F1D1D'], // A red
  ['#34D399', '#064E3B'], // B emerald
  ['#60A5FA', '#1E3A8A'], // C blue
  ['#FBBF24', '#78350F'], // D amber
  ['#A78BFA', '#3B0764'], // E violet
  ['#F472B6', '#831843'], // F pink
  ['#2DD4BF', '#134E4A'], // G teal
  ['#FB923C', '#7C2D12'], // H orange
  ['#818CF8', '#312E81'], // I indigo
  ['#A3E635', '#365314'], // J lime
  ['#22D3EE', '#164E63'], // K cyan
  ['#E879F9', '#701A75'], // L fuchsia
  ['#FCD34D', '#713F12'], // M yellow
  ['#4ADE80', '#14532D'], // N green
  ['#F97316', '#7C2D12'], // O deep orange
  ['#38BDF8', '#0C4A6E'], // P sky
  ['#FB7185', '#881337'], // Q rose
  ['#C084FC', '#4C1D95'] // R purple
]

export const REGION_COLORS: RegionColor[] = REGION_LETTERS.map((letter, i) => ({
  letter,
  bg: PALETTE_HEX[i][0],
  fg: PALETTE_HEX[i][1]
}))

export function colorForRegion(index: number): RegionColor {
  return REGION_COLORS[index]
}
