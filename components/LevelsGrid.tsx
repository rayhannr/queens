'use client'

import { useWindowVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from '@/lib/generator/types'
import type { ProgressMap } from '@/lib/progress'
import { formatDuration } from '@/lib/time'
import { LevelPreview } from './LevelPreview'
import { useProgress } from './ProgressProvider'

type CompletionFilter = 'all' | 'completed' | 'incomplete'
type SolutionFilter = 'all' | 'unique' | 'multiple'

const FILTERS_STORAGE_KEY = 'queens:levels-filters'

interface StoredFilters {
  completionFilter: CompletionFilter
  solutionFilter: SolutionFilter
}

function readStoredFilters(): StoredFilters {
  if (typeof window === 'undefined') return { completionFilter: 'all', solutionFilter: 'all' }
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return { completionFilter: 'all', solutionFilter: 'all' }
    const parsed = JSON.parse(raw) as Partial<StoredFilters>
    return {
      completionFilter: parsed.completionFilter ?? 'all',
      solutionFilter: parsed.solutionFilter ?? 'all'
    }
  } catch {
    return { completionFilter: 'all', solutionFilter: 'all' }
  }
}

function writeStoredFilters(filters: StoredFilters) {
  window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
}

function FilterGroup<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? 'border-transparent bg-emerald-500 text-white'
              : 'border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function LevelsGrid({ levels }: { levels: Level[] }) {
  const { progress } = useProgress()
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all')
  const [solutionFilter, setSolutionFilter] = useState<SolutionFilter>('all')

  useEffect(() => {
    const stored = readStoredFilters()
    setCompletionFilter(stored.completionFilter)
    setSolutionFilter(stored.solutionFilter)
  }, [])

  useEffect(() => {
    writeStoredFilters({ completionFilter, solutionFilter })
  }, [completionFilter, solutionFilter])

  const filtered = useMemo(
    () =>
      levels
        .map((level, index) => ({ level, index }))
        .filter(({ level }) => {
          const completed = Boolean(progress[level.id])
          if (completionFilter === 'completed' && !completed) return false
          if (completionFilter === 'incomplete' && completed) return false
          if (solutionFilter === 'unique' && !level.hasUniqueSolution) return false
          if (solutionFilter === 'multiple' && level.hasUniqueSolution) return false
          return true
        }),
    [levels, progress, completionFilter, solutionFilter]
  )

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <FilterGroup
          value={completionFilter}
          onChange={setCompletionFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'completed', label: 'Completed' },
            { value: 'incomplete', label: 'Not completed' }
          ]}
        />
        <FilterGroup
          value={solutionFilter}
          onChange={setSolutionFilter}
          options={[
            { value: 'all', label: 'Any solution' },
            { value: 'unique', label: 'Unique' },
            { value: 'multiple', label: 'Multiple' }
          ]}
        />
      </div>

      {filtered.length === 0 && <p className="mt-12 text-sm text-zinc-500 dark:text-zinc-400">No levels match these filters.</p>}
      <VirtualLevelGrid items={filtered} progress={progress} />
    </>
  )
}

interface GridItem {
  level: Level
  index: number
}

function columnsForWidth(width: number) {
  if (width >= 768) return 5
  if (width >= 640) return 4
  return 3
}

// Divisible by 3, 4 and 5 so the static grid never ends on a partial row.
const STATIC_CARD_COUNT = 60

function VirtualLevelGrid({ items, progress }: { items: GridItem[]; progress: ProgressMap }) {
  const [columns, setColumns] = useState<number | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function measure() {
      setColumns(columnsForWidth(window.innerWidth))
      if (listRef.current) setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const cols = columns ?? 5
  const virtualizer = useWindowVirtualizer({
    count: columns ? Math.ceil(items.length / columns) : 0,
    estimateSize: () => 230,
    overscan: 3,
    gap: cols >= 4 ? 16 : 8,
    scrollMargin
  })

  const card = ({ level, index }: GridItem) => (
    <LevelCard key={level.id} level={level} number={index + 1} bestTimeMs={progress[level.id]?.bestTimeMs} />
  )

  return (
    <div ref={listRef} className="mt-8 w-full max-w-4xl">
      {columns === null ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">{items.slice(0, STATIC_CARD_COUNT).map(card)}</div>
      ) : (
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map(row => (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 grid w-full gap-2 sm:gap-4"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                transform: `translateY(${row.start - scrollMargin}px)`
              }}
            >
              {items.slice(row.index * columns, (row.index + 1) * columns).map(card)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LevelCard({ level, number, bestTimeMs }: { level: Level; number: number; bestTimeMs?: number }) {
  const size = level.regions.length
  const completed = bestTimeMs !== undefined
  return (
    // padding gives the badge and hover lift room: content-visibility clips to the box
    <div className="pointer-events-none -m-3 p-3 [contain-intrinsic-size:auto_220px] [content-visibility:auto]">
      <Link
        href={`/level/${level.id}`}
        className="group pointer-events-auto relative flex flex-col gap-1.5 rounded-xl border border-black/10 bg-white p-1.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900 sm:gap-3 sm:rounded-2xl sm:p-3"
      >
        {completed && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-sm">
            ✓
          </span>
        )}
        <LevelPreview level={level} />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Level {number}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {size}×{size} · {size} colors
          </span>
          {completed && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Best {formatDuration(bestTimeMs)}</span>
          )}
        </div>
      </Link>
    </div>
  )
}
