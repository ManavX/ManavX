// Loop check: the jump from the last frame back to the first should look like any other frame step.
// Prints the mean absolute difference at the seam next to the median and largest ordinary steps.
// usage: node scripts/check-loop.mjs <video.mp4> [more.mp4 ...]
import { spawnSync } from 'node:child_process'

const W = 320
for (const file of process.argv.slice(2)) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).stdout.toString().trim()
  const [w, h] = probe.split(',').map(Number)
  const H = Math.round((h / w) * W / 2) * 2
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 }).stdout
  const size = W * H
  const n = raw.length / size
  const diff = (a, b) => {
    let s = 0
    for (let i = 0; i < size; i++) s += Math.abs(raw[a * size + i] - raw[b * size + i])
    return s / size
  }
  const steps = Array.from({ length: n - 1 }, (_, i) => diff(i, i + 1)).sort((a, b) => a - b)
  const seam = diff(n - 1, 0)
  const median = steps[Math.floor(steps.length / 2)]
  const p95 = steps[Math.floor(steps.length * 0.95)]
  const verdict = seam <= p95 ? 'seamless' : 'VISIBLE SEAM'
  console.log(`${file}: ${n} frames · seam ${seam.toFixed(2)} · median step ${median.toFixed(2)} · 95th ${p95.toFixed(2)} · max ${steps[steps.length - 1].toFixed(2)} → ${verdict}`)
}
