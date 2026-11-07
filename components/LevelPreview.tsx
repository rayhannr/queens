import type { Level } from '@/lib/generator/types'
import { colorForRegion } from '@/lib/palette'

function regionPaths(regions: Level['regions']) {
  const paths = new Map<string, string>()
  regions.forEach((row, r) => {
    let c = 0
    while (c < row.length) {
      const letter = row[c]
      let end = c + 1
      while (end < row.length && row[end] === letter) end++
      const run = end - c
      paths.set(letter, `${paths.get(letter) ?? ''}M${c} ${r}h${run}v1h-${run}z`)
      c = end
    }
  })
  return [...paths]
}

export function LevelPreview({ level }: { level: Level }) {
  const size = level.regions.length
  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="aspect-square w-full rounded-lg">
      {regionPaths(level.regions).map(([letter, d]) => (
        <path key={letter} d={d} fill={colorForRegion(letter.charCodeAt(0) - 65).bg} />
      ))}
    </svg>
  )
}
