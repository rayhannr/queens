'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Level } from '@/lib/generator/types'
import { getAllProgress, type ProgressMap } from '@/lib/progress'
import { formatDuration } from '@/lib/time'
import { LevelPreview } from './LevelPreview'

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
  const [progress, setProgress] = useState<ProgressMap>({})
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all')
  const [solutionFilter, setSolutionFilter] = useState<SolutionFilter>('all')

  useEffect(() => {
    setProgress(getAllProgress())
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

      {filtered.length === 0 ? (
        <p className="mt-12 text-sm text-zinc-500 dark:text-zinc-400">No levels match these filters.</p>
      ) : (
        <div className="mt-8 grid w-full max-w-4xl grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
          {filtered.map(({ level, index }) => {
            const levelProgress = progress[level.id]
            return (
              <Link
                key={level.id}
                href={`/level/${level.id}`}
                className="group relative flex flex-col gap-1.5 rounded-xl border border-black/10 bg-white p-1.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900 sm:gap-3 sm:rounded-2xl sm:p-3"
              >
                {levelProgress && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-sm">
                    ✓
                  </span>
                )}
                <LevelPreview level={level} />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Level {index + 1}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {level.regions.length}×{level.regions.length} · {level.regions.length} colors
                  </span>
                  {levelProgress && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Best {formatDuration(levelProgress.bestTimeMs)}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
