/**
 * A tiny pixel-art toolkit: everything is drawn at native resolution on a small canvas, then the
 * canvas is shown scaled up with nearest-neighbour sampling, so every art pixel stays a crisp block.
 */

// 3×5 bitmap font (rows top to bottom, 3 bits each), with a 4 px advance
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111101101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101101111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', '-': '000000111000000',
  "'": '010010000000000', ':': '000010000010000', '!': '010010010000010', '?': '110001010000010', '&': '010101010101011',
  '/': '001001010100100', '(': '010100100100010', ')': '010001001001010', '+': '000010111010000', '#': '101111101111101',
  '>': '100010001010100', '<': '001010100010001', '·': '000000010000000', '%': '101001010100101',
}

/** Uppercases and strips accents; characters the font lacks are dropped */
export function pixelText(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split('')
    .filter((ch) => FONT[ch] !== undefined)
    .join('')
}

export class Px {
  readonly ctx: CanvasRenderingContext2D
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  px(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c)
  }

  /** Bresenham line */
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.px(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  /** Filled disc, pixel-centred */
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8))
      this.rect(cx - w, cy + y, w * 2 + 1, 1, c)
    }
  }

  /** Checkerboard dither of two colours over a rectangle */
  dither(x: number, y: number, w: number, h: number, a: string, b: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, (i + j) % 2 ? a : b)
  }

  /** Sprite from rows of characters; each character maps to a colour, '.' is transparent */
  sprite(rows: string[], colors: Record<string, string>, x: number, y: number, flip = false) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = flip ? row[row.length - 1 - i] : row[i]
        if (ch !== '.' && colors[ch]) this.px(x + i, y + j, colors[ch])
      }
    })
  }

  /** 3×5 pixel text, optionally at 2× or 3× per font pixel; returns the width drawn */
  text(s: string, x: number, y: number, c: string, maxWidth = Infinity, scale = 1) {
    let cx = x
    for (const ch of pixelText(s)) {
      if (cx - x + 3 * scale > maxWidth) break
      const g = FONT[ch]
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') this.rect(cx + i * scale, y + j * scale, scale, scale, c)
      cx += 4 * scale
    }
    return cx - x
  }

  /** Dotted ellipse outline; `every` skips points for a dashed look */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string | ((t: number) => string | null), points = 64, every = 1) {
    for (let i = 0; i < points; i += every) {
      const t = (i / points) * Math.PI * 2
      const col = typeof c === 'string' ? c : c(t)
      if (col) this.px(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), col)
    }
  }

  /** Filled rectangle with its corners cut by `r` pixels */
  round(x: number, y: number, w: number, h: number, r: number, c: string) {
    for (let j = 0; j < h; j++) {
      const d = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0
      const inset = d ? Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))) : 0
      this.rect(x + inset, y + j, w - inset * 2, 1, c)
    }
  }
}
