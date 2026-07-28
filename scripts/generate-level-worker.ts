// Run via child_process.fork by generate-levels.ts. Computes exactly one
// level (CPU-bound backtracking + solver checks) and sends it back over IPC
// — the parent process owns all filesystem writes so multiple workers can
// run at once without racing on disk.
import { generateLevel } from '../lib/generator/generate'

const id = process.argv[2]
const size = Number(process.argv[3])

const level = generateLevel(id, size)

process.send!(level)
