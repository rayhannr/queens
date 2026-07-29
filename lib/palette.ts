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

// 18 colors picked and checked pairwise (not just hue-wheel math) so no two
// ever read as "the same color" at a glance, including for color-blind
// players. Each entry mixes hue, lightness, AND saturation differences from
// its neighbors so no single channel has to carry the distinction. One entry
// (H) is monochrome grey — flat colors are fair game as long as they contrast
// the dark board background.
const PALETTE_HEX: [string, string][] = [
  ['#F23636', '#590303'], // A red
  ['#FFFFFF', '#1A1A1A'], // B white (monochrome)
  ['#9A06E5', '#3C025A'], // C purple
  ['#F2D336', '#594C03'], // D gold
  ['#36C2F2', '#053B4E'], // E sky
  ['#E50650', '#5A021F'], // F crimson
  ['#0E7A4F', '#053322'], // G forest green (cool, not yellow-green)
  ['#808080', '#1A1A1A'], // H grey (monochrome)
  ['#E59A06', '#5A3C02'], // I amber
  ['#0EA5A5', '#053333'], // J teal
  ['#EB2F8C', '#510B36'], // K hot pink
  ['#82E505', '#2C4E02'], // L lime
  ['#4646C9', '#0D0D4A'], // M indigo
  ['#EBA684', '#51220B'], // N peach
  ['#025943', '#5CF0CF'], // O deep teal (light fg)
  ['#F236F2', '#590359'], // P magenta
  ['#8A6D3B', '#F2E3C6'], // Q brown (light fg)
  ['#3B5EE0', '#0A163D'] // R royal blue
]

export const REGION_COLORS: RegionColor[] = REGION_LETTERS.map((letter, i) => ({
  letter,
  bg: PALETTE_HEX[i][0],
  fg: PALETTE_HEX[i][1]
}))

export function colorForRegion(index: number): RegionColor {
  return REGION_COLORS[index]
}
