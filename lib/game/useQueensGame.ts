"use client";

import { useMemo, useState, useCallback } from "react";
import type { RegionLetter } from "../palette";

export type CellState = "empty" | "blocker" | "queen";

export interface Position {
  row: number;
  col: number;
}

function emptyBoard(size: number): CellState[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => "empty" as CellState));
}

interface GameState {
  board: CellState[][];
  queens: Position[];
}

function emptyState(size: number): GameState {
  return { board: emptyBoard(size), queens: [] };
}

export function useQueensGame(regions: RegionLetter[][]) {
  const size = regions.length;
  // board and queens are derived together from a single click, so they
  // live in one state update — kept as two separate useState calls (with
  // setQueens invoked as a side effect from inside the setBoard updater),
  // the updater stopped being pure and React StrictMode's dev-mode double
  // invocation of updaters silently double-added queens on every click.
  const [{ board, queens }, setState] = useState<GameState>(() => emptyState(size));

  const conflictedQueens = useMemo(() => {
    const conflicted = new Set<string>();
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const a = queens[i];
        const b = queens[j];

        const sameRow = a.row === b.row;
        const sameCol = a.col === b.col;
        const adjacent = Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
        const sameRegion = regions[a.row][a.col] === regions[b.row][b.col];

        if (sameRow || sameCol || adjacent || sameRegion) {
          conflicted.add(`${a.row}-${a.col}`);
          conflicted.add(`${b.row}-${b.col}`);
        }
      }
    }
    return conflicted;
  }, [queens, regions]);

  const isFinished = queens.length === size && conflictedQueens.size === 0;

  const onClickCell = useCallback((row: number, col: number) => {
    setState(({ board: prevBoard, queens: prevQueens }) => {
      const current = prevBoard[row][col];
      let next: CellState = "empty";
      let nextQueens = prevQueens;

      if (current === "empty") {
        next = "blocker";
      } else if (current === "blocker") {
        next = "queen";
        nextQueens = [...prevQueens, { row, col }];
      } else if (current === "queen") {
        next = "empty";
        nextQueens = prevQueens.filter((q) => q.row !== row || q.col !== col);
      }

      const nextBoard = prevBoard.map((r) => r.slice());
      nextBoard[row][col] = next;
      return { board: nextBoard, queens: nextQueens };
    });
  }, []);

  const reset = useCallback(() => {
    setState(emptyState(size));
  }, [size]);

  return { board, queens, conflictedQueens, isFinished, onClickCell, reset };
}
