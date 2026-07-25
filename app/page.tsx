import Link from 'next/link'
import { LevelPreview } from '@/components/LevelPreview'
import { LEVELS } from '@/lib/levels/data'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-16 dark:from-transparent dark:to-transparent">
      <div className="flex w-full max-w-4xl flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Queens</h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Place one queen per row, column, and color region — no two queens may touch, even diagonally.
        </p>
      </div>

      <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {LEVELS.map((level, i) => (
          <Link
            key={level.id}
            href={`/level/${level.id}`}
            className="group flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900"
          >
            <LevelPreview level={level} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Level {i + 1}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {level.regions.length}×{level.regions.length} · {level.regions.length} colors
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
