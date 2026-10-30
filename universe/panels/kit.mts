/**
 * Kit for the README's animated SVG panels, in the "deep-space signal" style: text arrives as a
 * transmission, decoding out of static under a scanning beam, then holds steady with the odd
 * flicker of interference. Pure CSS animation (no script), so GitHub can show it as an image.
 *
 * Body text is set in JetBrains Mono so every character has the same advance: words can be placed
 * exactly, and the static that stands in for a word is exactly as wide as the word.
 */

export const C = {
  void: '#000000',
  panel: '#05070b',
  line: 'rgba(255,255,255,0.09)',
  ink: '#E5E7EB',
  soft: '#B4B9C2',
  dim: '#6B7280',
  orange: '#FF6B1A',
  ember: '#FB923C',
  cyan: '#22D3EE',
  violet: '#A855F7',
}

export const MONO_ADVANCE = 0.6 // JetBrains Mono: every glyph is 0.6 em wide

// Static the decoder flashes before a word lands
const NOISE = '░▒▓<>/\\|=+*#%01'

type Family = 'inter' | 'mono'

export type TextOpts = {
  font?: Family
  size?: number
  weight?: number
  fill?: string
  spacing?: number // letter-spacing in em
  anchor?: 'start' | 'middle' | 'end'
  opacity?: number
}

/** Seeded randomness, so a panel renders identically every hour unless its data changed */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Splits text into lines of at most `max` characters, on spaces */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}

export class Panel {
  readonly w: number
  readonly h: number
  private parts: string[] = []
  private css: string[] = []
  private used: Record<string, Set<string>> = {}
  private seq = 0
  readonly random: () => number

  constructor(w: number, h: number, seed: number) {
    this.w = w
    this.h = h
    this.random = rng(seed)
  }

  add(svg: string) {
    this.parts.push(svg)
  }

  style(css: string) {
    this.css.push(css)
  }

  id(prefix = 'k') {
    return `${prefix}${(this.seq++).toString(36)}`
  }

  private use(font: Family, weight: number, text: string) {
    const key = `${font}:${weight}`
    const set = (this.used[key] ??= new Set())
    for (const ch of text) set.add(ch)
  }

  private attrs(o: TextOpts) {
    const font = o.font ?? 'mono'
    const weight = o.weight ?? (font === 'inter' ? 600 : 400)
    return {
      font,
      weight,
      a: `font-family="${font === 'inter' ? 'Inter, system-ui, sans-serif' : '\'JetBrains Mono\', ui-monospace, monospace'}" font-size="${o.size ?? 16}" font-weight="${weight}" fill="${o.fill ?? C.ink}"${o.spacing ? ` letter-spacing="${o.spacing}em"` : ''}${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}${o.opacity !== undefined ? ` opacity="${o.opacity}"` : ''}`,
    }
  }

  /** Plain text, shown from the start (still subject to a panel-level fade) */
  text(x: number, y: number, s: string, o: TextOpts = {}, extra = '') {
    const { font, weight, a } = this.attrs(o)
    this.use(font, weight, s)
    this.add(`<text x="${x}" y="${y}" ${a}${extra}>${esc(s)}</text>`)
  }

  private noise(len: number) {
    let s = ''
    for (let i = 0; i < len; i++) s += NOISE[Math.floor(this.random() * NOISE.length)]
    this.use('mono', 400, s)
    return s
  }

  /**
   * A line of mono text that decodes word by word, left to right, starting at `at` seconds.
   * Each word flashes as static for a beat, then lands. Words in `accent` take that colour.
   * Returns when the last word lands.
   */
  decode(x: number, y: number, s: string, at: number, o: TextOpts & { accent?: Record<string, string>; glitch?: boolean } = {}) {
    const size = o.size ?? 16
    const spacing = o.spacing ?? 0
    const advance = size * (MONO_ADVANCE + spacing)
    const { font, weight, a } = this.attrs({ ...o, font: 'mono' })
    let col = 0
    let t = at
    for (const word of s.split(' ')) {
      if (word) {
        const wx = x + col * advance
        const fill = o.accent?.[word]
        this.use(font, weight, word)
        const nz = this.noise(word.length)
        const na = a.replace(/fill="[^"]*"/, `fill="${C.cyan}"`)
        // Some landed words catch interference later on, at their own slow rhythm
        const glitch = o.glitch !== false && this.random() < 0.06
        const period = 9 + Math.floor(this.random() * 9)
        const phase = (this.random() * period).toFixed(2)
        this.add(
          `<text x="${wx}" y="${y}" ${na} class="nz" style="animation-delay:${t.toFixed(2)}s">${esc(nz)}</text>` +
            `<text x="${wx}" y="${y}" ${a.replace(/fill="[^"]*"/, `fill="${fill ?? o.fill ?? C.ink}"`)} class="rv${glitch ? ' gl' : ''}" style="animation-delay:${(t + 0.16).toFixed(2)}s${glitch ? `,${phase}s;animation-duration:.2s,${period}s` : ''}">${esc(word)}</text>` +
            (glitch ? `<text x="${wx}" y="${y}" ${na} class="gn" style="animation-delay:${phase}s;animation-duration:${period}s">${esc(this.noise(word.length))}</text>` : ''),
        )
        t += 0.022 + word.length * 0.004
      }
      col += word.length + 1
    }
    return t + 0.16
  }

  /** A display line (Inter) that flickers in from static, as one piece */
  title(x: number, y: number, s: string, at: number, o: TextOpts = {}) {
    const size = o.size ?? 32
    const { font, weight, a } = this.attrs({ font: 'inter', ...o })
    this.use(font, weight, s)
    const nz = this.noise(Math.max(4, Math.round(s.length * 0.9)))
    const { a: na } = this.attrs({ font: 'mono', size: size * 0.9, fill: C.cyan, anchor: o.anchor })
    this.add(
      `<text x="${x}" y="${y}" ${na} class="nz" style="animation-delay:${at.toFixed(2)}s">${esc(nz)}</text>` +
        `<text x="${x}" y="${y}" ${a} class="rv rt" style="animation-delay:${(at + 0.2).toFixed(2)}s">${esc(s)}</text>`,
    )
    return at + 0.6
  }

  /** Panel ground: near-black card, hairline border, HUD corner brackets and a seeded starfield */
  frame(o: { stars?: number; corners?: boolean; radius?: number } = {}) {
    const r = o.radius ?? 10
    this.add(`<rect x="0.5" y="0.5" width="${this.w - 1}" height="${this.h - 1}" rx="${r}" fill="${C.panel}" stroke="${C.line}"/>`)
    const n = o.stars ?? Math.round((this.w * this.h) / 9000)
    let stars = ''
    for (let i = 0; i < n; i++) {
      const x = (8 + this.random() * (this.w - 16)).toFixed(1)
      const y = (8 + this.random() * (this.h - 16)).toFixed(1)
      const big = this.random() < 0.12
      const tw = Math.floor(this.random() * 4)
      stars += `<circle cx="${x}" cy="${y}" r="${big ? 1.1 : 0.6}" fill="#fff" opacity="${(0.25 + this.random() * 0.45).toFixed(2)}" class="tw${tw}"/>`
    }
    this.add(`<g>${stars}</g>`)
    if (o.corners !== false) {
      const k = 12
      const m = 8
      const L = this.w - m
      const B = this.h - m
      this.add(
        `<path d="M${m} ${m + k}V${m}H${m + k}M${L - k} ${m}H${L}V${m + k}M${L} ${B - k}V${B}H${L - k}M${m + k} ${B}H${m}V${B - k}" fill="none" stroke="${C.dim}" stroke-width="1" opacity="0.7"/>`,
      )
    }
  }

  /** The scanning beam: sweeps down once while the panel decodes, then faintly every `every` s */
  beam(from: number, to: number, at = 0.1, every = 14, sweep = 2) {
    const id = this.id('b')
    this.add(
      `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".8" stop-color="${C.cyan}" stop-opacity=".10"/><stop offset="1" stop-color="${C.cyan}" stop-opacity=".35"/></linearGradient></defs>` +
        `<g class="beam" style="--d:${to - from}px;animation-delay:${at}s,${(at + sweep + 0.2).toFixed(2)}s;animation-duration:${sweep.toFixed(2)}s,${every}s"><rect x="10" y="${from - 60}" width="${this.w - 20}" height="60" fill="url(#${id})"/><rect x="10" y="${from - 1}" width="${this.w - 20}" height="1" fill="${C.cyan}" opacity=".5"/></g>`,
    )
  }

  /** Blinking block cursor */
  cursor(x: number, y: number, size: number, at: number) {
    this.add(`<rect x="${x}" y="${y - size * 0.82}" width="${size * 0.55}" height="${size}" fill="${C.ink}" class="cur" style="animation-delay:${at}s,${at}s"/>`)
  }

  /** Assembles the SVG, embedding exactly the glyphs it uses from Inter and JetBrains Mono */
  async render(title: string, desc: string): Promise<string> {
    const fonts = await embedFonts(this.used)
    const css = `${fonts}
.nz{opacity:0;animation:nz .2s linear both}
@keyframes nz{0%{opacity:0}1%{opacity:.85}99%{opacity:.85}100%{opacity:0}}
.rv{animation:rv .2s ease-out both}
@keyframes rv{from{opacity:0}}
.rt{animation-duration:.5s}
.gl{animation-name:rv,gl;animation-timing-function:ease-out,linear;animation-iteration-count:1,infinite;animation-fill-mode:both,none}
@keyframes gl{0%,95%{opacity:1}95.5%,97%{opacity:0}97.5%{opacity:1}}
.gn{opacity:0;animation:gn 12s linear infinite}
@keyframes gn{0%,95%{opacity:0}95.5%,97%{opacity:.8}97.5%{opacity:0}}
.beam{transform:translateY(0);opacity:0;animation-name:beam,beamr;animation-timing-function:cubic-bezier(.3,0,.7,1),cubic-bezier(.3,0,.7,1);animation-iteration-count:1,infinite;animation-fill-mode:none,none}
@keyframes beam{0%{opacity:1;transform:translateY(0)}100%{opacity:1;transform:translateY(var(--d))}}
@keyframes beamr{0%{opacity:.2;transform:translateY(0)}14%{opacity:.2;transform:translateY(var(--d))}14.1%,100%{opacity:0;transform:translateY(var(--d))}}
.cur{animation:rv .2s both,cur 1.1s steps(1,end) infinite}
@keyframes cur{50%{opacity:0}}
.tw0{animation:tw 3.1s ease-in-out infinite}.tw1{animation:tw 4.3s ease-in-out infinite 1s}.tw2{animation:tw 5.7s ease-in-out infinite 2s}
@keyframes tw{50%{opacity:.08}}
.fade{animation:rv .6s ease-out both}
${this.css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.beam,.nz,.gn{opacity:0}}`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc><style>${css}</style>${this.parts.join('')}</svg>\n`
  }
}

// ── Fonts: Google Fonts can cut a file down to just the characters a panel uses ──

const FAMILY: Record<Family, string> = { inter: 'Inter', mono: 'JetBrains Mono' }
const fontCache = new Map<string, string>()

async function subset(family: string, weight: number, chars: string): Promise<string | null> {
  const key = `${family}:${weight}:${chars}`
  if (fontCache.has(key)) return fontCache.get(key)!
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(chars)}`
  // A current browser's user agent, so the CSS points at WOFF2
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
  try {
    const css = await (await fetch(url, { headers: { 'User-Agent': ua } })).text()
    const src = css.match(/url\((https:[^)]+)\)/)?.[1]
    if (!src) return null
    const font = Buffer.from(await (await fetch(src)).arrayBuffer()).toString('base64')
    const face = `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${font}) format('woff2')}`
    fontCache.set(key, face)
    return face
  } catch {
    return null
  }
}

async function embedFonts(used: Record<string, Set<string>>) {
  const faces = await Promise.all(
    Object.entries(used).map(([key, set]) => {
      const [font, weight] = key.split(':')
      // Always include the space and digits, so small data changes don't need new glyphs
      const chars = [...new Set([...set, ' ', ...'0123456789'])].sort().join('')
      return subset(FAMILY[font as Family], Number(weight), chars)
    }),
  )
  // A missing face falls back to the system stack named on each text element
  return faces.filter(Boolean).join('')
}
