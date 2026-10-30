// Seam check on rendered PNGs (no video encoding in the way): the step from the last frame to the
// first should be no bigger than the steps either side of it. Values are mean absolute
// differences of 8-bit grey, full resolution.
// usage: node scripts/check-seam.mjs <dir with element-*.png> <lastFrame>
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const [dir, last] = [process.argv[2], Number(process.argv[3])]
// Remotion pads frame numbers to the width of the range it rendered
const name = (n) => [3, 2, 1].map((w) => join(dir, `element-${String(n).padStart(w, '0')}.png`)).find(existsSync)
const grey = (n) => execFileSync('ffmpeg', ['-v', 'error', '-i', name(n), '-vf', 'format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 })
const diff = (a, b) => {
  const x = grey(a)
  const y = grey(b)
  let s = 0
  for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i])
  return s / x.length
}
const steps = [[last - 2, last - 1], [last - 1, last], [last, 0], [0, 1]]
for (const [a, b] of steps) console.log(`${`${a}→${b}`.padEnd(10)} ${diff(a, b).toFixed(4)}${b === 0 ? '  ← seam' : ''}`)
