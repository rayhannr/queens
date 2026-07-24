"use client";

import type { RegionColor } from "@/lib/palette";
import type { CellState } from "@/lib/game/useQueensGame";

interface CellProps {
  state: CellState;
  region: RegionColor;
  isConflicted: boolean;
  onClick: () => void;
}

export function Cell({ state, region, isConflicted, onClick }: CellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex aspect-square w-full select-none items-center justify-center rounded-md border transition-all duration-150 ${
        isConflicted
          ? "border-red-500 ring-2 ring-red-500/70"
          : "border-black/10 dark:border-white/10"
      } hover:brightness-110 active:scale-95`}
      style={{ backgroundColor: region.bg }}
      aria-label={`Cell region ${region.letter}, ${state}`}
    >
      <span
        className="absolute left-1 top-0.5 text-[9px] font-semibold opacity-50 sm:text-[10px]"
        style={{ color: region.fg }}
      >
        {region.letter}
      </span>

      {state === "queen" && (
        <span
          className={`animate-queen-pop text-[clamp(14px,4vw,28px)] leading-none drop-shadow-sm ${
            isConflicted ? "text-red-600" : ""
          }`}
          style={{ color: isConflicted ? undefined : region.fg }}
        >
          ♛
        </span>
      )}

      {state === "blocker" && (
        <span
          className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2"
          style={{ backgroundColor: region.fg, opacity: 0.55 }}
        />
      )}
    </button>
  );
}
