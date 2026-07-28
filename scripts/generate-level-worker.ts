// Run via child_process.fork by generate-levels.ts. Computes exactly one
// board (CPU-bound backtracking + solver checks) for the given size and
// sends it back over IPC — the parent process assigns the real id (based
// on completion order) and owns all filesystem writes, so multiple workers
// can run at once without racing on disk or on id assignment.
import { generateLevel } from '../lib/generator/generate'

const size = Number(process.argv[2])

// id is a placeholder — the parent overwrites it once the result arrives.
const level = generateLevel('pending', size)

process.send!(level)
