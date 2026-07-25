import type { Level } from '@/lib/generator/types'
import { colorForRegion } from '@/lib/palette'

// Pure server-renderable preview — a static swatch grid, no interactivity.
export function LevelPreview({ level }: { level: Level }) {
  return (
    <div
      className="grid aspect-square w-full overflow-hidden rounded-lg"
      style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
    >
      {level.regions.flatMap((row, r) =>
        row.map((letter, c) => <div key={`${r}-${c}`} style={{ backgroundColor: colorForRegion(letter.charCodeAt(0) - 65).bg }} />)
      )}
    </div>
  )
}
