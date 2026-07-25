const STORAGE_KEY = 'queens:progress'

export interface LevelProgress {
  bestTimeMs: number
}

export type ProgressMap = Record<string, LevelProgress>

function readAll(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function writeAll(map: ProgressMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getAllProgress(): ProgressMap {
  return readAll()
}

export function getLevelProgress(id: string): LevelProgress | undefined {
  return readAll()[id]
}

/** Records a completion, keeping the faster of the new and any existing best time. */
export function recordCompletion(id: string, timeMs: number): LevelProgress {
  const map = readAll()
  const existing = map[id]
  const bestTimeMs = existing ? Math.min(existing.bestTimeMs, timeMs) : timeMs
  const progress = { bestTimeMs }
  map[id] = progress
  writeAll(map)
  return progress
}
