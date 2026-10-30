// Turns a rendered MP4 into an optimised GIF: ffmpeg resamples the frames, gifski picks the palettes.
// Given a folder of PNG frames instead (pixel art, which video compression would smear), it skips
// ffmpeg and hands gifski the lossless frames as they are.
// usage: node scripts/make-gif.mjs <in.mp4 | framesDir> <out.gif> [--fps 20] [--width 960] [--quality 80]

import { spawnSync } from 'node:child_process'
import { lstatSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [input, output, ...rest] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node scripts/make-gif.mjs <in.mp4 | framesDir> <out.gif> [--fps 20] [--width 960] [--quality 80]')
  process.exit(1)
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? rest[i + 1] : fallback
}
const fps = opt('fps', '20')
const width = opt('width', '960')
const quality = opt('quality', '80')

const platform = { win32: 'windows/gifski.exe', darwin: 'macos/gifski', linux: 'debian/gifski' }[process.platform]
const gifski = fileURLToPath(new URL(`../node_modules/gifski/bin/${platform}`, import.meta.url))

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] })
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`)
}

const direct = lstatSync(input).isDirectory()
const frames = direct ? input : mkdtempSync(join(tmpdir(), 'gif-frames-'))
try {
  if (!direct) run('ffmpeg', ['-v', 'error', '-i', input, '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`, join(frames, 'f%04d.png')])
  const files = readdirSync(frames).filter((f) => f.endsWith('.png')).sort().map((f) => join(frames, f))
  run(gifski, ['-q', '-r', fps, '-Q', quality, '-W', width, '-o', output, ...files])
  console.log(`${output}: ${files.length} frames, ${(statSync(output).size / 1048576).toFixed(2)} MB`)
} finally {
  if (!direct) rmSync(frames, { recursive: true, force: true })
}
