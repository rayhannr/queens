'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueensGame, type Position } from '@/lib/game/useQueensGame'
import type { Level } from '@/lib/generator/types'
import { colorForRegion } from '@/lib/palette'
import { Cell } from './Cell'
import { CrownBurstLayer, type Spawn } from './three/CrownBurst'
import { WinConfetti } from './three/WinConfetti'

export function Board({ level }: { level: Level }) {
  const { board, queens, conflictedQueens, isFinished, onClickCell, reset } = useQueensGame(level.regions)
  const placed = queens.length

  const [spawns, setSpawns] = useState<Spawn[]>([])
  const [showLetters, setShowLetters] = useState(true)
  const prevQueensRef = useRef<Position[]>([])

  useEffect(() => {
    const prev = prevQueensRef.current
    if (queens.length > prev.length) {
      const added = queens.find(q => !prev.some(p => p.row === q.row && p.col === q.col))
      if (added) {
        const region = colorForRegion(level.regions[added.row][added.col].charCodeAt(0) - 65)
        setSpawns(s => [
          ...s,
          {
            id: `${added.row}-${added.col}-${Date.now()}`,
            x: added.col - (level.size - 1) / 2,
            y: (level.size - 1) / 2 - added.row,
            color: region.bg,
            bornAt: performance.now()
          }
        ])
      }
    }
    prevQueensRef.current = queens
  }, [queens, level.regions, level.size])

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex w-full max-w-[min(90vw,560px)] items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          {placed} / {level.size} queens placed
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium">
            <span>Letters</span>
            <button
              type="button"
              role="switch"
              aria-checked={showLetters}
              onClick={() => setShowLetters(v => !v)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                showLetters ? 'bg-emerald-500' : 'bg-black/20 dark:bg-white/20'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                  showLetters ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="relative w-full max-w-[min(90vw,560px)]">
        <div
          className="grid gap-1 rounded-xl bg-black/5 p-2 shadow-inner dark:bg-white/5 sm:gap-1.5 sm:p-3"
          style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
        >
          {board.map((row, r) =>
            row.map((state, c) => (
              <Cell
                key={`${r}-${c}`}
                state={state}
                region={colorForRegion(level.regions[r][c].charCodeAt(0) - 65)}
                isConflicted={conflictedQueens.has(`${r}-${c}`)}
                showLetters={showLetters}
                onClick={() => onClickCell(r, c)}
              />
            ))
          )}
        </div>

        <CrownBurstLayer spawns={spawns} size={level.size} onDone={id => setSpawns(s => s.filter(sp => sp.id !== id))} />
        <WinConfetti active={isFinished} />
      </div>

      {isFinished && (
        <div className="animate-win-in rounded-full bg-emerald-500/15 px-5 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Solved! 🎉
        </div>
      )}
    </div>
  )
}
