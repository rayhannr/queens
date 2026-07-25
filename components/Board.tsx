'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { nextCellState, useQueensGame, type CellState, type Position } from '@/lib/game/useQueensGame'
import type { Level } from '@/lib/generator/types'
import { colorForRegion } from '@/lib/palette'
import { Cell } from './Cell'
import { CrownBurstLayer, type Spawn } from './three/CrownBurst'
import { WinConfetti } from './three/WinConfetti'

export function Board({ level, levelNumber, prevId, nextId }: { level: Level; levelNumber?: number; prevId?: string; nextId?: string }) {
  const { board, queens, conflictedQueens, isFinished, onClickCell, paintCell, reset } = useQueensGame(level.regions)
  const placed = queens.length

  const [spawns, setSpawns] = useState<Spawn[]>([])
  const [showLetters, setShowLetters] = useState(true)
  const [showSolvedModal, setShowSolvedModal] = useState(false)

  useEffect(() => {
    if (isFinished) setShowSolvedModal(true)
  }, [isFinished])

  const prevQueensRef = useRef<Position[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ from: CellState; to: CellState } | null>(null)

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const cellEl = el?.closest('[data-row]') as HTMLElement | null
    if (!cellEl) return null
    return { row: Number(cellEl.dataset.row), col: Number(cellEl.dataset.col) }
  }

  const handlePointerDown = (e: React.PointerEvent, row: number, col: number) => {
    const current = board[row][col]
    dragRef.current = { from: current, to: nextCellState(current) }
    onClickCell(row, col)
    gridRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const pos = cellAt(e.clientX, e.clientY)
    if (!pos) return
    const { from, to } = dragRef.current
    paintCell(pos.row, pos.col, from, to)
  }

  const endDrag = () => {
    dragRef.current = null
  }

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
          ref={gridRef}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="grid gap-1 rounded-xl bg-black/5 p-2 shadow-inner dark:bg-white/5 sm:gap-1.5 sm:p-3"
          style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
        >
          {board.map((row, r) =>
            row.map((state, c) => (
              <Cell
                key={`${r}-${c}`}
                row={r}
                col={c}
                state={state}
                region={colorForRegion(level.regions[r][c].charCodeAt(0) - 65)}
                isConflicted={conflictedQueens.has(`${r}-${c}`)}
                showLetters={showLetters}
                onClick={e => {
                  if (e.detail === 0) onClickCell(r, c)
                }}
                onPointerDown={e => handlePointerDown(e, r, c)}
              />
            ))
          )}
        </div>

        <CrownBurstLayer spawns={spawns} size={level.size} onDone={id => setSpawns(s => s.filter(sp => sp.id !== id))} />
        <WinConfetti active={isFinished} />
      </div>

      {isFinished && showSolvedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowSolvedModal(false)}>
          <div
            className="animate-win-in flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Solved! 🎉</span>
            {levelNumber && <span className="text-sm text-zinc-500 dark:text-zinc-400">Level {levelNumber}</span>}
            <div className="flex w-full items-center gap-2">
              {prevId ? (
                <Link
                  href={`/level/${prevId}`}
                  className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="flex-1" />
              )}
              {nextId ? (
                <Link
                  href={`/level/${nextId}`}
                  className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                >
                  Next →
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSolvedModal(false)}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
