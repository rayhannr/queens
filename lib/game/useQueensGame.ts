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

export function useQueensGame(regions: RegionLetter[][]) {
  const size = regions.length;
  const [board, setBoard] = useState<CellState[][]>(() => emptyBoard(size));
  const [queens, setQueens] = useState<Position[]>([]);

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
    setBoard((prevBoard) => {
      const current = prevBoard[row][col];
      let next: CellState = "empty";

      if (current === "empty") next = "blocker";
      else if (current === "blocker") {
        next = "queen";
        setQueens((prevQueens) => [...prevQueens, { row, col }]);
      } else if (current === "queen") {
        next = "empty";
        setQueens((prevQueens) => prevQueens.filter((q) => q.row !== row || q.col !== col));
      }

      const nextBoard = prevBoard.map((r) => r.slice());
      nextBoard[row][col] = next;
      return nextBoard;
    });
  }, []);

  const reset = useCallback(() => {
    setBoard(emptyBoard(size));
    setQueens([]);
  }, [size]);

  return { board, queens, conflictedQueens, isFinished, onClickCell, reset };
}
