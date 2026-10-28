const STORAGE_KEY = 'queens:progress'

export interface LevelProgress {
  bestTimeMs: number
}

export type ProgressMap = Record<string, LevelProgress>

export function getLocalProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function setLocalProgress(map: ProgressMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function clearLocalProgress() {
  window.localStorage.removeItem(STORAGE_KEY)
}

/** Keeps the faster best time per level across both maps. */
export function mergeProgress(a: ProgressMap, b: ProgressMap): ProgressMap {
  const merged: ProgressMap = { ...a }
  for (const [id, entry] of Object.entries(b)) {
    const existing = merged[id]
    if (!existing || entry.bestTimeMs < existing.bestTimeMs) merged[id] = entry
  }
  return merged
}

/** Records a completion, keeping the faster of the new and any existing best time. */
export function withCompletion(map: ProgressMap, id: string, timeMs: number): ProgressMap {
  const existing = map[id]
  return { ...map, [id]: { bestTimeMs: existing ? Math.min(existing.bestTimeMs, timeMs) : timeMs } }
}
