// Prints what the cabin scene shows from live data (which tracks, and whether they're recent or
// top), so the hourly workflow can tell whether the cabin needs re-rendering.
// usage: node scripts/cabin-signature.mjs > cabin.json
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const live = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/live.json', import.meta.url)), 'utf8'))
process.stdout.write(JSON.stringify({ music: live.music ?? null, tracks: (live.tracks ?? []).slice(0, 5).map((t) => t.id ?? t.title) }) + '\n')
