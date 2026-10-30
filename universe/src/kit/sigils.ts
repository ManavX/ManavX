/**
 * Project sigils, as manav.world draws them (src/utils/sigilSampler.ts): each shape is drawn on a
 * 256 px canvas and sampled into points, which a project's particles fly to. Sampling is seeded.
 */
import { mulberry32 } from './rng'

const CANVAS = 256

type Draw = (ctx: CanvasRenderingContext2D) => void

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.stroke()
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function bars(ctx: CanvasRenderingContext2D, heights: number[], bar: number, gap: number) {
  const total = heights.length * bar + (heights.length - 1) * gap
  heights.forEach((h, i) => {
    const height = h * 190
    ctx.fillRect((CANVAS - total) / 2 + i * (bar + gap), (CANVAS - height) / 2, bar, height)
  })
}

export const SIGILS: Record<string, Draw> = {
  'context-snap': (ctx) => {
    ctx.lineWidth = 6
    for (const o of [-34, 0, 34]) {
      const x = 46 + o
      const y = 74 + o
      roundRect(ctx, x, y, 132, 92, 10)
      roundRect(ctx, x + 10, y - 18, 46, 18, 5)
    }
  },
  'spotify-auto-curator': (ctx) => bars(ctx, [0.3, 0.6, 0.9, 0.5, 1, 0.7, 0.4, 0.8, 0.35], 14, 9),
  'chess-puzzle-gen': (ctx) => {
    ctx.font = '210px "Segoe UI Symbol", "DejaVu Sans", "Noto Sans Symbols 2", "Arial Unicode MS", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('♞︎', CANVAS / 2, CANVAS / 2 + 10)
  },
  'multiplayer-io': (ctx) => {
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(128, 128, 108, 0, Math.PI * 2)
    ctx.stroke()
    const players: [number, number, number][] = [
      [96, 104, 30], [170, 92, 16], [150, 168, 22], [82, 172, 11], [124, 58, 9], [194, 144, 8],
    ]
    for (const [x, y, r] of players) dot(ctx, x, y, r)
  },
}

function filledPixels(key: string): number[] {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS
  canvas.height = CANVAS
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = 'white'
  ctx.strokeStyle = 'white'
  SIGILS[key](ctx)
  const data = ctx.getImageData(0, 0, CANVAS, CANVAS).data
  const filled: number[] = []
  for (let i = 0; i < CANVAS * CANVAS; i++) if (data[i * 4 + 3] > 128) filled.push(i)
  if (filled.length < 50) throw new Error(`Sigil "${key}" drew nothing (missing glyph font?)`)
  return filled
}

/** `count` points as [x, y, depthJitter] triples centred on 0, `size` world units across. */
export function sampleSigil(key: string, count: number, size: number, seed: number): Float32Array {
  const rng = mulberry32(seed)
  const filled = filledPixels(key)
  const scale = size / CANVAS
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const px = filled[Math.floor(rng() * filled.length)]
    const x = (px % CANVAS) + rng()
    const y = Math.floor(px / CANVAS) + rng()
    out[i * 3] = (x - CANVAS / 2) * scale
    out[i * 3 + 1] = (CANVAS / 2 - y) * scale
    out[i * 3 + 2] = (rng() - 0.5) * 0.4
  }
  return out
}
