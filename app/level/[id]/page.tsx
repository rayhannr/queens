import Link from "next/link";
import { notFound } from "next/navigation";
import { LEVELS } from "@/lib/levels/data";
import { BoardClient } from "@/components/BoardClient";

export function generateStaticParams() {
  return LEVELS.map((level) => ({ id: level.id }));
}

export default async function LevelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = LEVELS.findIndex((l) => l.id === id);
  const level = LEVELS[index];
  if (!level) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-12 dark:from-transparent dark:to-transparent">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Levels
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {level.size}×{level.size} · {level.colorCount} colors
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Level {index + 1}
        </h1>

        <BoardClient level={level} />
      </div>
    </div>
  );
}
