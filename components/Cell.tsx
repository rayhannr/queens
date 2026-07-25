'use client'

import type { CellState } from '@/lib/game/useQueensGame'
import type { RegionColor } from '@/lib/palette'

interface CellProps {
  state: CellState
  region: RegionColor
  isConflicted: boolean
  showLetters: boolean
  onClick: () => void
}

export function Cell({ state, region, isConflicted, showLetters, onClick }: CellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex aspect-square w-full select-none items-center justify-center rounded-md border transition-all duration-150 ${
        isConflicted ? 'border-red-500 ring-2 ring-red-500/70' : 'border-black/10 dark:border-white/10'
      } hover:brightness-110 active:scale-95`}
      style={{ backgroundColor: region.bg }}
      aria-label={`Cell region ${region.letter}, ${state}`}
    >
      {showLetters && state !== 'queen' && (
        <span
          className="pointer-events-none select-none text-[clamp(14px,4vw,26px)] font-medium leading-none"
          style={{ color: region.fg, textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
        >
          {region.letter}
        </span>
      )}

      {state === 'queen' && (
        <span
          className={`animate-queen-pop text-[clamp(14px,4vw,28px)] leading-none drop-shadow-sm ${isConflicted ? 'text-red-600' : ''}`}
          style={{ color: isConflicted ? undefined : region.fg }}
        >
          ♛
        </span>
      )}

      {state === 'blocker' && (
        <svg
          className="pointer-events-none h-1/3 w-1/3"
          viewBox="0 0 24 24"
          fill="none"
          stroke={region.fg}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ opacity: 0.55 }}
          aria-hidden="true"
        >
          <path d="M5 5 L19 19 M19 5 L5 19" />
        </svg>
      )}
    </button>
  )
}
