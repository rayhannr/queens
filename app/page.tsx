import { LevelsGrid } from '@/components/LevelsGrid'
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

      <LevelsGrid levels={LEVELS} />
    </div>
  )
}
