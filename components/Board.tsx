'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { nextCellState, useQueensGame, type CellState, type Position } from '@/lib/game/useQueensGame'
import type { Level } from '@/lib/generator/types'
import { colorForRegion } from '@/lib/palette'
import { recordCompletion } from '@/lib/progress'
import { formatDuration } from '@/lib/time'
import { Cell } from './Cell'
import { CrownBurstLayer, type Spawn } from './three/CrownBurst'
import { WinConfetti } from './three/WinConfetti'

export function Board({ level, levelNumber, prevId, nextId }: { level: Level; levelNumber?: number; prevId?: string; nextId?: string }) {
  const { board, queens, conflictedQueens, isFinished, onClickCell, paintCell, undo, canUndo, reset } = useQueensGame(level.regions)
  const placed = queens.length
  const size = level.regions.length

  const [spawns, setSpawns] = useState<Spawn[]>([])
  const [showLetters, setShowLetters] = useState(true)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Elapsed time is tracked as accumulated time-so-far plus the current
  // running segment, so it can be paused (segment folded into the
  // accumulator, runStart cleared) while the tab is hidden and resumed
  // later without counting the away time.
  const accumulatedRef = useRef(0)
  const runStartRef = useRef<number | null>(document.hidden ? null : performance.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<{ timeMs: number; bestTimeMs: number } | null>(null)

  const currentElapsed = () =>
    accumulatedRef.current + (runStartRef.current !== null ? performance.now() - runStartRef.current : 0)

  useEffect(() => {
    if (isFinished) return
    const id = setInterval(() => setElapsedMs(currentElapsed()), 250)
    return () => clearInterval(id)
  }, [isFinished])

  useEffect(() => {
    if (isFinished) return
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (runStartRef.current !== null) {
          accumulatedRef.current += performance.now() - runStartRef.current
          runStartRef.current = null
        }
      } else {
        runStartRef.current = performance.now()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isFinished])

  useEffect(() => {
    if (!isFinished) return
    if (runStartRef.current !== null) {
      accumulatedRef.current += performance.now() - runStartRef.current
      runStartRef.current = null
    }
    const timeMs = accumulatedRef.current
    setElapsedMs(timeMs)
    setResult({ timeMs, bestTimeMs: recordCompletion(level.id, timeMs).bestTimeMs })
  }, [isFinished, level.id])

  const handleReset = () => {
    reset()
    accumulatedRef.current = 0
    runStartRef.current = document.hidden ? null : performance.now()
    setElapsedMs(0)
    setResult(null)
  }

  useEffect(() => {
    if (isFinished) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [isFinished])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo])

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
            x: added.col - (size - 1) / 2,
            y: (size - 1) / 2 - added.row,
            color: region.bg,
            bornAt: performance.now()
          }
        ])
      }
    }
    prevQueensRef.current = queens
  }, [queens, level.regions, size])

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex w-full max-w-[min(90vw,560px)] flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap">
            {placed} / {size} queens placed
          </span>
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatDuration(elapsedMs)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            onClick={undo}
            disabled={!canUndo}
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-white/10 dark:hover:bg-white/10"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleReset}
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
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
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

        <CrownBurstLayer spawns={spawns} size={size} onDone={id => setSpawns(s => s.filter(sp => sp.id !== id))} />
        <WinConfetti active={isFinished} />
      </div>

      <dialog
        ref={dialogRef}
        onClick={e => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="animate-win-in fixed inset-0 m-auto h-fit w-full max-w-xs rounded-2xl bg-white p-0 shadow-xl backdrop:bg-black/50 open:flex dark:bg-zinc-900"
      >
        <div className="relative flex w-full flex-col items-center gap-1 p-6 pt-8 text-center">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          <span className="mx-auto text-3xl">🎉</span>
          <span className="mt-1 block text-lg font-semibold text-zinc-900 dark:text-zinc-50">Solved!</span>
          {levelNumber && <span className="block text-sm text-zinc-500 dark:text-zinc-400">Level {levelNumber}</span>}
          {result && (
            <span className="mt-2 block text-sm text-zinc-600 dark:text-zinc-400">
              Time <span className="font-mono tabular-nums">{formatDuration(result.timeMs)}</span>
              {result.timeMs <= result.bestTimeMs ? (
                <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">New best!</span>
              ) : (
                <>
                  {' · '}Best <span className="font-mono tabular-nums">{formatDuration(result.bestTimeMs)}</span>
                </>
              )}
            </span>
          )}

          <div className="mt-5 flex w-full flex-col gap-2">
            {nextId && (
              <Link
                href={`/level/${nextId}`}
                className="btn-shine group flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-emerald-500/50 active:scale-[0.97]"
              >
                Next level
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            )}
            {prevId && (
              <Link
                href={`/level/${prevId}`}
                className="w-full rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-200 hover:scale-[1.02] hover:bg-black/5 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                ← Previous level
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </div>
  )
}
