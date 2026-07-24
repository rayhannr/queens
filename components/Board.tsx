"use client";

import { colorForRegion } from "@/lib/palette";
import { useQueensGame } from "@/lib/game/useQueensGame";
import { Cell } from "./Cell";
import type { Level } from "@/lib/generator/types";

export function Board({ level }: { level: Level }) {
  const { board, queens, conflictedQueens, isFinished, onClickCell, reset } = useQueensGame(level.regions);
  const placed = queens.length;

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div
        className="grid w-full max-w-[min(90vw,560px)] gap-1 rounded-xl bg-black/5 p-2 shadow-inner dark:bg-white/5 sm:gap-1.5 sm:p-3"
        style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
      >
        {board.map((row, r) =>
          row.map((state, c) => (
            <Cell
              key={`${r}-${c}`}
              state={state}
              region={colorForRegion(level.regions[r][c].charCodeAt(0) - 65)}
              isConflicted={conflictedQueens.has(`${r}-${c}`)}
              onClick={() => onClickCell(r, c)}
            />
          ))
        )}
      </div>

      <div className="flex w-full max-w-[min(90vw,560px)] items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          {placed} / {level.size} queens placed
        </span>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          Reset
        </button>
      </div>

      {isFinished && (
        <div className="animate-win-in rounded-full bg-emerald-500/15 px-5 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Solved! 🎉
        </div>
      )}
    </div>
  );
}
