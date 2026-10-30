// Renders the README assets: an MP4 master, an optimised GIF, a still PNG (the reduced-motion
// fallback) and a small JPG thumbnail for each.
// usage: node scripts/render.mjs [hero|worlds|year|portal ...] [--out ../assets] [--gl angle]

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
// The still frame is the one that reads best paused: the composition's own resting state
// `props` feeds a composition its live data (the cabin shows the recently played tracks)
export const ASSETS = {
  hero: { id: 'HeroOrbit', gif: { width: 1280, fps: 25, quality: 80 }, still: 0 },
  year: { id: 'YearOrbit', gif: { width: 1280, fps: 20, quality: 80 }, still: 75 },
  cabin: { id: 'Cabin', gif: { width: 1280, fps: 15, quality: 90 }, still: 100, props: 'src/data/live.json', pixel: true },
  flyby: { id: 'Flyby', gif: { width: 1280, fps: 25, quality: 80 }, still: 70 },
}

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const names = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const out = resolve(ROOT, flag('out', '../assets'))
const gl = flag('gl', null)
mkdirSync(out, { recursive: true })

const run = (cmd, cmdArgs) => {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs[0]} failed`)
}
const mb = (f) => `${(statSync(f).size / 1048576).toFixed(2)} MB`

for (const name of names.length ? names : Object.keys(ASSETS)) {
  const a = ASSETS[name]
  if (!a) throw new Error(`Unknown asset "${name}"`)
  const mp4 = join(out, `${name}.mp4`)
  const gif = join(out, `${name}.gif`)
  const png = join(out, `${name}.png`)
  const jpg = join(out, `${name}-thumb.jpg`)
  const glArgs = [...(gl ? [`--gl=${gl}`] : []), ...(a.props ? [`--props=${a.props}`] : [])]
  run('npx', ['remotion', 'render', a.id, mp4, '--codec=h264', '--crf=17', '--pixel-format=yuv420p', '--log=error', ...glArgs])
  run('npx', ['remotion', 'still', a.id, png, `--frame=${a.still}`, '--log=error', ...glArgs])
  const gifArgs = ['--fps', String(a.gif.fps), '--width', String(a.gif.width), '--quality', String(a.gif.quality)]
  if (a.pixel) {
    // Pixel art goes to the GIF from lossless frames, so no edge is smeared by video compression
    const frames = mkdtempSync(join(tmpdir(), 'pixel-frames-'))
    run('npx', ['remotion', 'render', a.id, frames, '--sequence', '--image-format=png', '--log=error', ...glArgs])
    run('node', ['scripts/make-gif.mjs', frames, gif, ...gifArgs])
    rmSync(frames, { recursive: true, force: true })
  } else run('node', ['scripts/make-gif.mjs', mp4, gif, ...gifArgs])
  run('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', 'scale=640:-1', '-q:v', '4', jpg])
  console.log(`${name}: gif ${mb(gif)} · mp4 ${mb(mp4)} · png ${mb(png)} · thumb ${mb(jpg)}`)
}
