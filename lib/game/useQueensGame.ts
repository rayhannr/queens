'use client'

import { useMemo, useState, useCallback } from 'react'
import type { RegionLetter } from '../palette'

export type CellState = 'empty' | 'blocker' | 'queen'

export interface Position {
  row: number
  col: number
}

function emptyBoard(size: number): CellState[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 'empty' as CellState))
}

export function nextCellState(current: CellState): CellState {
  if (current === 'empty') return 'blocker'
  if (current === 'blocker') return 'queen'
  return 'empty'
}

interface HistoryEntry {
  row: number
  col: number
  prev: CellState
}

interface GameState {
  board: CellState[][]
  queens: Position[]
  history: HistoryEntry[]
}

function emptyState(size: number): GameState {
  return { board: emptyBoard(size), queens: [], history: [] }
}

export function useQueensGame(regions: RegionLetter[][]) {
  const size = regions.length
  const [{ board, queens, history }, setState] = useState<GameState>(() => emptyState(size))

  const conflictedQueens = useMemo(() => {
    const conflicted = new Set<string>()
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const a = queens[i]
        const b = queens[j]

        const sameRow = a.row === b.row
        const sameCol = a.col === b.col
        const adjacent = Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1
        const sameRegion = regions[a.row][a.col] === regions[b.row][b.col]

        if (sameRow || sameCol || adjacent || sameRegion) {
          conflicted.add(`${a.row}-${a.col}`)
          conflicted.add(`${b.row}-${b.col}`)
        }
      }
    }
    return conflicted
  }, [queens, regions])

  const isFinished = queens.length === size && conflictedQueens.size === 0

  const onClickCell = useCallback((row: number, col: number) => {
    setState(({ board: prevBoard, queens: prevQueens, history: prevHistory }) => {
      const current = prevBoard[row][col]
      const next = nextCellState(current)
      let nextQueens = prevQueens

      if (next === 'queen') {
        nextQueens = [...prevQueens, { row, col }]
      } else if (current === 'queen') {
        nextQueens = prevQueens.filter(q => q.row !== row || q.col !== col)
      }

      const nextBoard = prevBoard.map(r => r.slice())
      nextBoard[row][col] = next
      return { board: nextBoard, queens: nextQueens, history: [...prevHistory, { row, col, prev: current }] }
    })
  }, [])

  const paintCell = useCallback((row: number, col: number, from: CellState, to: CellState) => {
    setState(prev => {
      const { board: prevBoard, queens: prevQueens, history: prevHistory } = prev
      if (prevBoard[row][col] !== from) return prev

      let nextQueens = prevQueens
      if (to === 'queen') {
        nextQueens = [...prevQueens, { row, col }]
      } else if (from === 'queen') {
        nextQueens = prevQueens.filter(q => q.row !== row || q.col !== col)
      }

      const nextBoard = prevBoard.map(r => r.slice())
      nextBoard[row][col] = to
      return { board: nextBoard, queens: nextQueens, history: [...prevHistory, { row, col, prev: from }] }
    })
  }, [])

  const undo = useCallback(() => {
    setState(({ board: prevBoard, queens: prevQueens, history: prevHistory }) => {
      if (prevHistory.length === 0) return { board: prevBoard, queens: prevQueens, history: prevHistory }

      const last = prevHistory[prevHistory.length - 1]
      const current = prevBoard[last.row][last.col]
      let nextQueens = prevQueens

      if (last.prev === 'queen') {
        nextQueens = [...prevQueens, { row: last.row, col: last.col }]
      } else if (current === 'queen') {
        nextQueens = prevQueens.filter(q => q.row !== last.row || q.col !== last.col)
      }

      const nextBoard = prevBoard.map(r => r.slice())
      nextBoard[last.row][last.col] = last.prev
      return { board: nextBoard, queens: nextQueens, history: prevHistory.slice(0, -1) }
    })
  }, [])

  const reset = useCallback(() => {
    setState(emptyState(size))
  }, [size])

  return { board, queens, conflictedQueens, isFinished, onClickCell, paintCell, undo, canUndo: history.length > 0, reset }
}
