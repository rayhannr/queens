'use client'

import dynamic from 'next/dynamic'
import type { Level } from '@/lib/generator/types'

const Board = dynamic(() => import('./Board').then(m => m.Board), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full max-w-[min(90vw,560px)] animate-pulse items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
      <span className="text-sm text-zinc-400">Loading board…</span>
    </div>
  )
})

export function BoardClient({ level }: { level: Level }) {
  return <Board level={level} />
}
