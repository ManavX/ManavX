/**
 * Every animated SVG panel in the README. Each function returns a finished SVG string.
 * Content comes from the same sources as manav.world (universeData.ts), and live panels from
 * src/data/github.json and src/data/live.json.
 */
import { C, MONO_ADVANCE, Panel, esc, wrap } from './kit.mts'

const W = 1000
const VANCOUVER = 'America/Vancouver'

export type Github = {
  contributions: { total: number; activeDays: number; longestStreak: { length: number } }
  days: { date: string; count: number }[]
}
export type Live = {
  fetchedAt: string
  push: { repo: string; at: string; commits: number | null } | null
  music?: 'recent' | 'top' | null
  tracks: { rank: number; title: string; artists: string; url: string; cover: string | null; playedAt?: string | null }[] | null
}

// ── Time helpers (everything is said in Vancouver time) ──

function vancouver(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: VANCOUVER, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  return { hour: Number(parts.hour) % 24, minute: parts.minute, zone: parts.timeZoneName, date: `${parts.year}-${parts.month}-${parts.day}` }
}

function sky(hour: number) {
  if (hour >= 5 && hour < 7) return 'DAWN'
  if (hour >= 7 && hour < 17) return 'DAY'
  if (hour >= 17 && hour < 20) return 'DUSK'
  return 'NIGHT'
}

function ago(ms: number) {
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'UNDER AN HOUR AGO'
  if (h < 24) return `${h} H AGO`
  const d = Math.floor(h / 24)
  return d === 1 ? '1 DAY AGO' : `${d} DAYS AGO`
}

// ── 00 · Telemetry strip (live) ──

export async function telemetry(gh: Github, live: Live, now: Date) {
  const p = new Panel(W, 84, 1)
  p.frame({ stars: 18 })
  const v = vancouver(now)
  // The latest public push, or, when the recent work is all private, the latest active day
  let signal: string
  let detail: string
  const push = live.push && now.getTime() - Date.parse(live.push.at) < 14 * 86400000 ? live.push : null
  if (push) {
    signal = push.repo.toUpperCase()
    detail = `PUSH · ${ago(now.getTime() - Date.parse(push.at))}`
  } else {
    const last = [...gh.days].reverse().find((d) => d.count > 0)
    const days = last ? Math.round((Date.parse(v.date) - Date.parse(last.date)) / 86400000) : null
    signal = last ? `${last.count} CONTRIBUTION${last.count === 1 ? '' : 'S'}` : 'QUIET'
    detail = days === null ? 'NO RECENT ACTIVITY' : days <= 0 ? 'TODAY' : days === 1 ? 'YESTERDAY' : `${days} DAYS AGO`
  }
  p.text(28, 48, 'MANAV.WORLD', { size: 15, weight: 500, spacing: 0.32 })
  const field = (x: number, label: string, value: string, at: number, color = C.ink) => {
    p.text(x, 33, label, { size: 10, spacing: 0.24, fill: C.dim })
    p.decode(x, 57, value, at, { size: 15, spacing: 0.08, fill: color, glitch: false })
  }
  field(230, 'LOC', `VANCOUVER ${String(v.hour).padStart(2, '0')}:00 ${v.zone}`, 0.3)
  field(500, 'SKY', sky(v.hour), 0.5)
  field(600, 'LAST SIGNAL', `${signal} · ${detail}`, 0.7, C.ember)
  // Status lamp
  p.add(`<circle cx="${W - 34}" cy="42" r="4" fill="${C.orange}" class="lamp"/><circle cx="${W - 34}" cy="42" r="9" fill="none" stroke="${C.orange}" opacity=".4" class="lamp2"/>`)
  p.style('.lamp{animation:lamp 2.4s ease-in-out infinite}@keyframes lamp{50%{opacity:.35}}.lamp2{transform-origin:966px 42px;animation:ring 2.4s ease-out infinite}@keyframes ring{0%{transform:scale(.5);opacity:.6}100%{transform:scale(1.6);opacity:0}}')
  // The comet: a white head and a violet tail, as on manav.world, crossing every 12 s
  p.add(
    `<defs><linearGradient id="ct" x1="0" x2="1"><stop offset="0" stop-color="${C.violet}" stop-opacity="0"/><stop offset="1" stop-color="#d9f7ff" stop-opacity=".9"/></linearGradient></defs>` +
      `<g class="comet"><rect x="-150" y="14.5" width="140" height="1.6" rx=".8" fill="url(#ct)"/><circle cx="-9" cy="15.3" r="2.2" fill="#eafcff"/></g>`,
  )
  p.style(`.comet{animation:comet 12s cubic-bezier(.2,.6,.4,1) infinite 1.4s;opacity:0}@keyframes comet{0%{transform:translate(0,0);opacity:0}2%{opacity:1}22%{transform:translate(${W + 180}px,10px);opacity:0}100%{transform:translate(${W + 180}px,10px);opacity:0}}`)
  return p.render(
    'Telemetry',
    `Vancouver, ${String(v.hour).padStart(2, '0')}:00 ${v.zone}, ${sky(v.hour).toLowerCase()}. Last signal: ${signal.toLowerCase()}, ${detail.toLowerCase()}.`,
  )
}

// ── Section dividers ──

export async function divider(n: number, name: string) {
  const p = new Panel(W, 56, 10 + n)
  // Signal glyph: three arcs that pulse outward
  p.add(
    `<g transform="translate(14 28)" fill="none" stroke="${C.orange}" stroke-width="1.6" stroke-linecap="round">` +
      [6, 11, 16].map((r, i) => `<path d="M${r * 0.7} ${-r * 0.7}A${r} ${r} 0 0 1 ${r * 0.7} ${r * 0.7}" class="arc" style="animation-delay:${i * 0.25}s"/>`).join('') +
      `<circle r="2.2" fill="${C.orange}" stroke="none"/></g>`,
  )
  p.style('.arc{animation:arc 2.2s ease-out infinite}@keyframes arc{0%,100%{opacity:.25}30%{opacity:1}}')
  p.text(44, 33, `SIGNAL ${String(n).padStart(2, '0')}`, { size: 12, spacing: 0.28, fill: C.orange })
  const end = p.decode(168, 34, name, 0.2, { size: 18, weight: 500, spacing: 0.22, glitch: false })
  const x0 = 168 + name.length * 18 * (MONO_ADVANCE + 0.22) + 18
  // Carrier line with a packet running along it
  p.add(`<line x1="${x0}" y1="28.5" x2="${W - 16}" y2="28.5" stroke="${C.line}" class="fade" style="animation-delay:${end.toFixed(2)}s"/>`)
  p.add(`<circle cx="${x0}" cy="28.5" r="2" fill="${C.cyan}" class="pk"/>`)
  p.style(`.pk{opacity:0;animation:pk 6s linear infinite ${end.toFixed(2)}s}@keyframes pk{0%{transform:translateX(0);opacity:0}5%{opacity:1}55%{transform:translateX(${W - 16 - x0}px);opacity:1}56%,100%{transform:translateX(${W - 16 - x0}px);opacity:0}}`)
  return p.render(`${String(n).padStart(2, '0')} · ${name}`, `Section ${n}: ${name.toLowerCase()}.`)
}

// ── 01 · About ──

export async function about() {
  // Rows: a one-line summary, then NOW and BEFORE with the details in a second column
  const LABEL_X = 40
  const VALUE_X = 150
  const ROW = 30
  const summary = 'Full-stack engineer · Vancouver · SFU Computing Science.'
  const now = wrap('Alebex. CRM, Twilio calling and a RAG sales copilot for an agentic voice AI platform, plus its public developer API.', 74)
  const before = ['TideSpark (CI/CD, Kubernetes, LLM infrastructure)', 'Operto (Python automation on AWS)', 'YMCA BC (IT)']
  const nowY = 200
  const beforeY = nowY + now.length * ROW + 14
  const portfolioY = beforeY + before.length * ROW + 22
  const p = new Panel(W, portfolioY + 66, 21)
  p.frame()
  p.text(40, 50, 'INCOMING TRANSMISSION', { size: 12, spacing: 0.3, fill: C.orange })
  p.text(268, 50, '· ORIGIN VANCOUVER, BC · 49.28°N 123.12°W', { size: 12, spacing: 0.2, fill: C.dim })
  let t = p.title(40, 104, "Hi, I'm Manav Acharya.", 0.3, { size: 38 })
  t = p.decode(40, 152, summary, t - 0.25, { size: 18, fill: C.ink })
  const companies = { 'Alebex.': C.ember, TideSpark: C.ink, Operto: C.ink, YMCA: C.ink, BC: C.ink }
  p.text(LABEL_X, nowY, 'NOW', { size: 12, spacing: 0.3, fill: C.orange })
  now.forEach((line, i) => {
    t = p.decode(VALUE_X, nowY + i * ROW, line, t - 0.25, { size: 18, fill: C.soft, accent: companies })
  })
  p.text(LABEL_X, beforeY, 'BEFORE', { size: 12, spacing: 0.3, fill: C.dim })
  before.forEach((line, i) => {
    t = p.decode(VALUE_X, beforeY + i * ROW, line, t - 0.25, { size: 18, fill: C.soft, accent: companies })
  })
  // A thin rule between the columns, like a log's margin
  p.add(`<line x1="${VALUE_X - 18}" y1="${nowY - 18}" x2="${VALUE_X - 18}" y2="${beforeY + (before.length - 1) * ROW + 6}" stroke="${C.line}" class="fade" style="animation-delay:.6s"/>`)
  t = p.decode(40, portfolioY, 'My portfolio is a 3D galaxy you can fly through: manav.world', t, { size: 18, accent: { 'manav.world': C.orange } })
  p.decode(40, portfolioY + 44, '— END OF MESSAGE', t + 0.2, { size: 13, spacing: 0.24, fill: C.dim, glitch: false })
  p.cursor(40 + 16 * 13 * (MONO_ADVANCE + 0.24) + 6, portfolioY + 44, 14, t + 0.6)
  const decoded = t
  // Carrier wave, top right: a sine that scrolls through a window
  const wave = Array.from({ length: 81 }, (_, i) => `${i === 0 ? 'M' : 'L'}${i * 4} ${(Math.sin((i / 20) * Math.PI * 2) * 9 * (0.6 + 0.4 * Math.sin(i / 7))).toFixed(1)}`).join('')
  p.add(
    `<defs><clipPath id="wv"><rect x="${W - 200}" y="34" width="160" height="40"/></clipPath></defs>` +
      `<g clip-path="url(#wv)"><g class="wave" transform="translate(${W - 200} 54)"><path d="${wave}" fill="none" stroke="${C.cyan}" stroke-width="1.4" opacity=".8"/></g></g>` +
      `<rect x="${W - 200}" y="34" width="160" height="40" fill="none" stroke="${C.line}"/>`,
  )
  p.text(W - 200, 92, 'CARRIER LOCKED', { size: 10, spacing: 0.24, fill: C.dim })
  p.style(`.wave{animation:wave 2s linear infinite}@keyframes wave{from{transform:translate(${W - 200}px,54px)}to{transform:translate(${W - 280}px,54px)}}`)
  p.beam(70, p.h - 30, 0.1, 14, decoded)
  return p.render(
    'About Manav Acharya',
    `Hi, I'm Manav Acharya. ${summary} Now: ${now.join(' ')} Before: ${before.join('; ')}. My portfolio is a 3D galaxy you can fly through: manav.world.`,
  )
}

// ── Contact buttons (one SVG each, so each can carry its own link) ──

export async function button(n: number, label: string, value: string, note: string, seed: number) {
  const p = new Panel(W, 62, 40 + seed)
  p.frame({ stars: 8, corners: false, radius: 8 })
  p.text(24, 37, `CH-${String(n).padStart(2, '0')}`, { size: 12, spacing: 0.24, fill: C.orange })
  p.text(100, 37, label, { size: 12, spacing: 0.24, fill: C.dim })
  p.decode(260, 39, value, 0.3 + n * 0.12, { size: 19, weight: 500, glitch: false })
  p.text(W - 64, 37, note, { size: 11, spacing: 0.2, fill: C.dim, anchor: 'end' })
  // Signal bars, then the arrow
  p.add(
    `<g transform="translate(${W - 48} 24)">` +
      [0, 1, 2, 3].map((i) => `<rect x="${i * 5}" y="${12 - i * 4}" width="3" height="${4 + i * 4}" fill="${C.cyan}" class="bar" style="animation-delay:${(i * 0.18 + n * 0.1).toFixed(2)}s"/>`).join('') +
      `</g>`,
  )
  p.style('.bar{animation:bar 1.8s ease-in-out infinite}@keyframes bar{0%,100%{opacity:.25}40%{opacity:1}}')
  return p.render(`${label}: ${value}`, `${label}: ${value}`)
}

// ── Constellations (skills): each cluster's stars gather into a picture, hold, then drift apart ──

type Side = 'l' | 'r' | 't' | 'b'
type Node = [x: number, y: number, label?: string, side?: Side]
type Art = { name: string; picture: string; color: string; nodes: Node[]; edges: [number, number][] }

// Coordinates are relative to each cluster's centre; a node without a label is a minor star
const ARTS: Art[] = [
  {
    name: 'LANGUAGES',
    picture: 'a rocket',
    color: '#06B6D4',
    nodes: [[0, -88, 'TypeScript', 'r'], [20, -50, 'JavaScript', 'r'], [20, 38, 'Python', 'r'], [42, 64, 'Java', 'r'], [10, 52], [0, 86, 'SQL', 'b'], [-10, 52], [-42, 64, 'Go', 'l'], [-20, 38, 'C++', 'l'], [-20, -50, 'C#', 'l'], [0, -20]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]],
  },
  {
    name: 'AI + DATA',
    picture: 'a satellite',
    color: '#F59E0B',
    nodes: [
      [-16, -16], [16, -16], [16, 16], [-16, 16],
      [-80, -16, 'PyTorch', 'l'], [-34, -16], [-34, 16], [-80, 16, 'TensorFlow', 'l'],
      [34, -16], [80, -16, 'LangChain', 'r'], [80, 16, 'LangGraph', 'r'], [34, 16],
      [0, -40],
      [-24, -54, 'Hugging Face', 'l'], [24, -54, 'Pandas', 'r'], [0, -70, 'OpenAI API', 't'],
      [0, 60, 'NumPy', 'b'],
      [-57, -16], [-57, 16], [57, -16], [57, 16],
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [8, 9], [9, 10], [10, 11], [11, 8], [5, 0], [1, 8], [12, 0], [12, 1], [13, 15], [15, 14], [13, 12], [14, 12], [2, 16], [3, 16], [17, 18], [19, 20]],
  },
  {
    name: 'FRAMEWORKS',
    picture: 'an astronaut',
    color: '#8B5CF6',
    nodes: [
      [0, -92, 'React', 't'], [22, -70, 'Next.js', 'r'], [16, -48], [-16, -48], [-22, -70, 'Node.js', 'l'],
      [-30, -38], [30, -38], [-62, -2, 'Express', 'l'], [62, -2, 'FastAPI', 'r'],
      [-20, 22], [20, 22], [-28, 54, 'Flask', 'l'], [28, 54, '.NET', 'r'], [-34, 88, 'Angular', 'l'], [34, 88, 'Three.js', 'r'],
      [80, 28, 'Tailwind', 'r'],
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [3, 5], [2, 6], [5, 6], [5, 7], [6, 8], [5, 9], [6, 10], [9, 10], [9, 11], [11, 13], [10, 12], [12, 14], [10, 15]],
  },
  {
    name: 'CLOUD + DEVOPS',
    picture: 'a UFO',
    color: '#F97316',
    nodes: [
      [0, -50, 'AWS', 't'], [-28, -38, 'GCP', 'l'], [28, -38, 'Docker', 'r'], [-38, -16], [38, -16],
      [-98, 2, 'Kubernetes', 'l'], [98, 2, 'Railway', 'r'], [-58, 20, 'Terraform', 'l'], [58, 20, 'Vercel', 'r'], [-18, 26], [18, 26],
      [-44, 84, 'Prefect', 'l'], [44, 84, 'Elastic', 'r'], [0, 92, 'n8n', 'b'],
    ],
    edges: [[3, 1], [1, 0], [0, 2], [2, 4], [5, 3], [3, 4], [4, 6], [5, 7], [7, 9], [9, 10], [10, 8], [8, 6], [9, 11], [10, 12], [11, 13], [13, 12]],
  },
  {
    name: 'DATABASES',
    picture: 'a telescope',
    color: '#14B8A6',
    nodes: [[-74, -14, 'PostgreSQL', 'l'], [46, -74, 'Redis', 't'], [56, -54, 'MongoDB', 'r'], [-66, 6], [-6, -30], [0, 10, 'GraphQL', 'r'], [-50, 84, 'Firebase', 'l'], [52, 84, 'Supabase', 'r'], [2, 92, 'Prisma', 'b']],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [5, 7], [5, 8]],
  },
]

export async function constellations() {
  const p = new Panel(W, 640, 70)
  p.frame()
  const centres: [number, number][] = [[170, 210], [500, 210], [830, 210], [335, 482], [665, 482]]
  const CYCLE = 14
  let t = 0.3
  ARTS.forEach((art, c) => {
    const [cx, cy] = centres[c]
    // Clusters run out of step, so one is always mid-change while the rest hold
    const delay = -(c * 2.8)
    p.text(cx, cy - 142, `CLUSTER ${String(c + 1).padStart(2, '0')}`, { size: 10, spacing: 0.26, fill: C.dim, anchor: 'middle' })
    t = p.decode(cx - (art.name.length * 13 * (MONO_ADVANCE + 0.16)) / 2, cy - 122, art.name, t - 0.2, { size: 13, weight: 500, spacing: 0.16, fill: art.color, glitch: false })
    // Lines draw in after the stars gather and fade before they drift apart
    const d = art.edges.map(([a, b]) => `M${cx + art.nodes[a][0]} ${cy + art.nodes[a][1]}L${cx + art.nodes[b][0]} ${cy + art.nodes[b][1]}`).join('')
    const len = art.edges.reduce((sum, [a, b]) => sum + Math.hypot(art.nodes[a][0] - art.nodes[b][0], art.nodes[a][1] - art.nodes[b][1]), 0)
    p.add(`<path d="${d}" fill="none" stroke="${art.color}" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="${len.toFixed(0)}" class="cl" style="--len:${len.toFixed(0)};animation-delay:${delay.toFixed(1)}s"/>`)
    art.nodes.forEach(([x, y, label, side]) => {
      const dx = ((p.random() - 0.5) * 130).toFixed(0)
      const dy = ((p.random() - 0.5) * 110).toFixed(0)
      const X = cx + x
      const Y = cy + y
      const g = `<g class="gather" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${delay.toFixed(1)}s">`
      if (!label) {
        p.add(`${g}<circle cx="${X}" cy="${Y}" r="1.3" fill="${art.color}" opacity=".8"/></g>`)
        return
      }
      p.add(
        `${g}<circle cx="${X}" cy="${Y}" r="6" fill="${art.color}" opacity=".22"/><path d="M${X - 7} ${Y}H${X + 7}M${X} ${Y - 7}V${Y + 7}" stroke="${art.color}" stroke-width=".8" opacity=".75"/><circle cx="${X}" cy="${Y}" r="2" fill="#fff" class="tw${Math.floor(p.random() * 3)}"/>`,
      )
      const pos =
        side === 'l' ? { x: X - 11, y: Y + 4, a: 'end' as const } : side === 'r' ? { x: X + 11, y: Y + 4, a: 'start' as const } : side === 't' ? { x: X, y: Y - 13, a: 'middle' as const } : { x: X, y: Y + 21, a: 'middle' as const }
      p.text(pos.x, pos.y, label, { size: 13, fill: C.ink, anchor: pos.a }, ` paint-order="stroke" stroke="${C.panel}" stroke-width="3"`)
      p.add('</g>')
    })
  })
  p.style(`.gather{animation:gather ${CYCLE}s cubic-bezier(.4,0,.2,1) infinite}
@keyframes gather{0%{transform:translate(var(--dx),var(--dy));opacity:.15}12%{transform:translate(0,0);opacity:1}91%{transform:translate(0,0);opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:.15}}
.cl{animation:cl ${CYCLE}s linear infinite}
@keyframes cl{0%,11%{stroke-dashoffset:var(--len);opacity:0}12%{opacity:1}28%{stroke-dashoffset:0;opacity:1}87%{stroke-dashoffset:0;opacity:1}91%,100%{stroke-dashoffset:0;opacity:0}}`)
  return p.render(
    'Skills as constellations',
    ARTS.map((a) => `${a.name.toLowerCase()}, drawn as ${a.picture}: ${a.nodes.filter((n) => n[2]).map((n) => n[2]).join(', ')}`).join('. ') + '.',
  )
}

// ── On the receiver (Spotify, live) ──

export async function receiver(live: Live, now: Date) {
  const tracks = live.tracks ?? []
  const recent = live.music === 'recent'
  const p = new Panel(W, tracks.length ? 96 + tracks.length * 58 + 24 : 180, 80)
  p.frame()
  const v = vancouver(new Date(live.fetchedAt || now))
  p.text(40, 46, 'ON THE RECEIVER', { size: 12, spacing: 0.3, fill: C.orange })
  p.text(214, 46, recent ? '· RECENTLY PLAYED' : '· TOP TRACKS · LAST 4 WEEKS', { size: 12, spacing: 0.2, fill: C.dim })
  p.text(W - 40, 46, `UPDATED ${String(v.hour).padStart(2, '0')}:00 ${v.zone}`, { size: 11, spacing: 0.2, fill: C.dim, anchor: 'end' })
  if (!tracks.length) {
    p.decode(40, 110, 'NO SIGNAL. The receiver will pick up again next hour.', 0.4, { size: 16, fill: C.soft })
    return p.render('On the receiver', 'Recently played tracks are unavailable right now.')
  }
  // The waveform is one periodic tile drawn twice; sliding it one tile per cycle never shows a seam
  const BARS = 32
  const STEP = 6
  const TILE = BARS * STEP
  const WIDTH = 300
  let t = 0.3
  tracks.forEach((tr, i) => {
    const y = 84 + i * 58
    p.text(40, y + 30, String(i + 1).padStart(2, '0'), { size: 14, fill: C.dim, spacing: 0.1 })
    if (tr.cover) {
      const id = p.id('cv')
      p.add(`<defs><clipPath id="${id}"><rect x="80" y="${y + 6}" width="40" height="40" rx="4"/></clipPath></defs><image href="${tr.cover}" x="80" y="${y + 6}" width="40" height="40" clip-path="url(#${id})" class="fade" style="animation-delay:${t.toFixed(2)}s"/>`)
    }
    const title = tr.title.length > 40 ? `${tr.title.slice(0, 39)}…` : tr.title
    const artists = tr.artists.length > 40 ? `${tr.artists.slice(0, 39)}…` : tr.artists
    t = p.title(138, y + 24, title, t, { size: 18 })
    const when = tr.playedAt ? ` · ${ago(now.getTime() - Date.parse(tr.playedAt)).toLowerCase()}` : ''
    t = p.decode(138, y + 44, artists + when, t - 0.4, { size: 13, fill: C.soft, glitch: false })
    const phase = p.random() * Math.PI * 2
    const bars: string[] = []
    // The strip slides one tile per cycle, so it must reach past the window by a full tile
    const count = Math.ceil((WIDTH + TILE) / STEP) + 1
    for (let k = 0; k < count; k++) {
      // Every term repeats exactly once per tile, so the tile edges always match up
      const a = ((k % BARS) / BARS) * Math.PI * 2
      const env = 0.55 + 0.25 * Math.sin(a + phase) + 0.12 * Math.sin(a * 2 + phase * 1.7) + 0.08 * Math.sin(a * 5 + phase * 0.6)
      const h = 3 + 22 * Math.max(0.08, env)
      bars.push(`<rect x="${k * STEP}" y="${(-h / 2).toFixed(1)}" width="3" height="${h.toFixed(1)}" rx="1.5"/>`)
    }
    const id = p.id('wf')
    const x0 = W - 40 - WIDTH
    p.add(
      `<defs><clipPath id="${id}"><rect x="${x0}" y="${y}" width="${WIDTH}" height="52"/></clipPath>` +
        `<linearGradient id="${id}e"><stop offset="0" stop-color="${C.panel}"/><stop offset="1" stop-color="${C.panel}" stop-opacity="0"/></linearGradient>` +
        `<linearGradient id="${id}f"><stop offset="0" stop-color="${C.panel}" stop-opacity="0"/><stop offset="1" stop-color="${C.panel}"/></linearGradient></defs>` +
        `<g clip-path="url(#${id})"><g transform="translate(${x0} ${y + 26})"><g class="wf">${bars.join('')}</g></g></g>` +
        // Soft edges, so bars slide in and out of the window
        `<rect x="${x0}" y="${y}" width="28" height="52" fill="url(#${id}e)"/><rect x="${x0 + WIDTH - 28}" y="${y}" width="28" height="52" fill="url(#${id}f)"/>`,
    )
  })
  p.style(`.wf{fill:#1DB954;opacity:.85;animation:wf 4s linear infinite}@keyframes wf{from{transform:translateX(0)}to{transform:translateX(-${TILE}px)}}`)
  p.beam(64, p.h - 20, 0.1, 14, t)
  return p.render('On the receiver', `${recent ? 'Recently played on Spotify' : 'My top tracks on Spotify over the last four weeks'}: ${tracks.map((tr) => `${tr.title} by ${tr.artists}`).join('; ')}.`)
}

// ── Sign-off ──

export async function signoff() {
  const p = new Panel(W, 50, 99)
  const s = 'END OF TRANSMISSION'
  const width = s.length * 13 * (MONO_ADVANCE + 0.3)
  const end = p.decode(W / 2 - width / 2, 30, s, 0.3, { size: 13, spacing: 0.3, fill: C.dim, glitch: false })
  p.cursor(W / 2 + width / 2 + 4, 30, 13, end)
  return p.render('End of transmission', 'End of transmission.')
}

export { esc }
