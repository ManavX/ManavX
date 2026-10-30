import { useLayoutEffect, useMemo, useRef } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { mulberry32 } from '../kit/rng'
import { SignalText } from '../kit/SignalText'
import { C, INTER, MONO, useLoop } from '../kit/type'
import { github, longDate, monthName, shortDate } from './github'

/**
 * The contribution year as an orbit, like the career rings on manav.world: 53 weeks around a
 * tilted ring, a star for every day (brighter for more contributions), consecutive active days
 * joined into constellations, and a comet lapping the year once per loop.
 * Drawn on a 2D canvas so the weekly refresh renders fast without a GPU.
 */

const TAU = Math.PI * 2
const TILT = 0.34
// Rows: Sunday on the inside, Saturday on the outside
const R_IN = 392
const ROW = 21
const GAP = 0.16 // radians left open at the front, where the year ends and starts

type Star = { x: number; y: number; depth: number; count: number; date: string; week: number; day: number; angle: number }

function layout(cx: number, cy: number) {
  const days = github.days
  const weeks = Math.ceil(days.length / 7)
  // Calendar weeks start on Sunday; the first week may be partial
  const firstWeekday = days[0].weekday
  return days.map((d, i): Star => {
    const slot = i + firstWeekday
    const week = Math.floor(slot / 7)
    const day = slot % 7
    // Clockwise from just right of the front (bottom) gap, round the back, ending just left of it
    const angle = Math.PI / 2 + GAP / 2 + ((week + 0.5) / weeks) * (TAU - GAP)
    const r = R_IN + day * ROW
    const z = Math.sin(angle) // 1 at the front, -1 at the back
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * TILT, depth: z, count: d.count, date: d.date, week, day, angle }
  })
}

export function YearOrbit() {
  const { width, height } = useVideoConfig()
  const { theta, u } = useLoop()
  const canvas = useRef<HTMLCanvasElement>(null)
  const cx = width / 2
  const cy = height / 2 + 6
  const stars = useMemo(() => layout(cx, cy), [cx, cy])
  const c = github.contributions
  const max = c.busiestDay.count
  const longest = c.longestStreak
  const dust = useMemo(() => {
    const rng = mulberry32(5)
    return Array.from({ length: 900 }, () => ({ x: rng() * width, y: rng() * height, r: 0.3 + rng() * 0.9, a: 0.15 + rng() * 0.5, p: rng() * TAU, k: 1 + Math.floor(rng() * 3) }))
  }, [width, height])

  useLayoutEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'lighter'

    for (const d of dust) {
      ctx.fillStyle = `rgba(255,255,255,${d.a * (0.6 + 0.4 * Math.sin(theta * d.k + d.p))})`
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, TAU)
      ctx.fill()
    }

    // The core, softly, behind the numbers
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300)
    core.addColorStop(0, 'rgba(255,247,237,0.10)')
    core.addColorStop(0.5, 'rgba(255,247,237,0.03)')
    core.addColorStop(1, 'rgba(255,247,237,0)')
    ctx.fillStyle = core
    ctx.fillRect(0, 0, width, height)

    // Comet: laps the ring once per loop on the middle row; days light up as it passes
    const weeks = Math.ceil((github.days.length + github.days[0].weekday) / 7)
    // A full turn per loop, gap included, so the comet is back where it started
    const head = Math.PI / 2 + GAP / 2 + u * TAU
    const near = (a: number) => {
      const behind = (head - a + TAU * 2) % TAU
      return behind < 0.9 ? Math.pow(1 - behind / 0.9, 2) : 0
    }

    // Faint orbit guides, one per weekday
    for (let day = 0; day < 7; day++) {
      ctx.strokeStyle = 'rgba(180,185,194,0.07)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(cx, cy, R_IN + day * ROW, (R_IN + day * ROW) * TILT, 0, 0, TAU)
      ctx.stroke()
    }

    // Constellations: each active day joins its active neighbours (the next day, and the same day next week)
    const inLongest = (s: Star) => s.date >= longest.start! && s.date <= longest.end!
    const at = new Map(stars.map((s) => [s.week * 7 + s.day, s]))
    const links: [Star, Star][] = []
    for (const a of stars) {
      if (!a.count) continue
      const down = a.day < 6 ? at.get(a.week * 7 + a.day + 1) : undefined
      const next = at.get((a.week + 1) * 7 + a.day)
      if (down?.count) links.push([a, down])
      if (next?.count) links.push([a, next])
    }
    for (const [a, b] of links) {
      const hot = inLongest(a) && inLongest(b)
      const glow = near(b.angle)
      const depth = 0.55 + 0.45 * (b.depth + 1) / 2
      ctx.strokeStyle = hot ? `rgba(255,107,26,${0.55 * depth + glow * 0.4})` : `rgba(229,231,235,${(0.16 + glow * 0.5) * depth})`
      ctx.lineWidth = hot ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Stars
    for (const s of stars) {
      const depth = 0.5 + 0.5 * (s.depth + 1) / 2
      const glow = near(s.angle)
      if (!s.count) {
        ctx.fillStyle = `rgba(156,163,175,${0.14 * depth + glow * 0.25})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, 1.1 * depth, 0, TAU)
        ctx.fill()
        continue
      }
      const k = Math.log1p(s.count) / Math.log1p(max)
      const twinkle = 0.85 + 0.15 * Math.sin(theta * (1 + (s.week % 3)) + s.day * 1.7 + s.week)
      const r = (1.6 + k * 5.2) * depth * (1 + glow * 0.5)
      const hot = inLongest(s)
      const rgb = hot ? '255,140,70' : k > 0.6 ? '255,236,214' : '214,226,255'
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4)
      g.addColorStop(0, `rgba(${rgb},${(0.55 + 0.45 * k) * twinkle * depth + glow * 0.4})`)
      g.addColorStop(0.25, `rgba(${rgb},${0.22 * twinkle * depth + glow * 0.2})`)
      g.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(s.x, s.y, r * 4, 0, TAU)
      ctx.fill()
      ctx.fillStyle = `rgba(255,255,255,${(0.7 + 0.3 * k) * depth})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, Math.max(0.8, r * 0.35), 0, TAU)
      ctx.fill()
    }

    // Comet head and tail
    const cr = R_IN + 3 * ROW
    for (let j = 0; j < 120; j++) {
      const a = head - j * 0.006
      const x = cx + Math.cos(a) * cr
      const y = cy + Math.sin(a) * cr * TILT
      const f = 1 - j / 120
      ctx.fillStyle = `rgba(255,${150 + 90 * f},${90 + 140 * f},${0.28 * f * f})`
      ctx.beginPath()
      ctx.arc(x, y, 0.8 + 2.6 * f * f, 0, TAU)
      ctx.fill()
    }
    void weeks
  }, [stars, dust, theta, u, width, height, cx, cy, max, longest])

  // Where to pin the callouts
  const peak = stars.find((s) => s.date === c.busiestDay.date)!
  const streakMid = stars.find((s) => s.date >= longest.start! && s.date <= longest.end! && s.day === 3) ?? stars[0]
  const months = stars.filter((s, i) => i === 0 || s.date.slice(8) === '01').filter((s) => s.date.slice(8) === '01')

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <canvas ref={canvas} width={width} height={height} style={{ position: 'absolute', inset: 0 }} />
      {months.map((s) => {
        const r = R_IN + 7 * ROW + 16
        const x = cx + Math.cos(s.angle) * r
        const y = cy + Math.sin(s.angle) * r * TILT + (s.depth > 0 ? 12 : -12)
        return (
          <div
            key={s.date}
            style={{
              position: 'absolute',
              left: x - 30,
              top: y - 9,
              width: 60,
              textAlign: 'center',
              fontFamily: MONO,
              fontSize: 13,
              letterSpacing: '0.18em',
              color: C.hudDim,
              opacity: 0.55 + 0.45 * (s.depth + 1) / 2,
            }}
          >
            <SignalText text={monthName(Number(s.date.slice(5, 7)) - 1)} seed={Number(s.date.slice(5, 7)) + 60} rate={0.4} />
          </div>
        )
      })}
      <Callout x={streakMid.x} y={streakMid.y} lx={40} ly={92} w={292} color={C.orange} tag="LONGEST STREAK" value={`${longest.length} DAYS · ${shortDate(longest.start!)} – ${shortDate(longest.end!)}`} />
      <Callout x={peak.x} y={peak.y} lx={40} ly={528} w={300} color={C.cyan} tag="BUSIEST DAY" value={`${c.busiestDay.count} CONTRIBUTIONS · ${shortDate(c.busiestDay.date)}`} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', top: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.34em', color: C.orange }}><SignalText text="CONTRIBUTIONS · LAST 12 MONTHS" seed={50} rate={0.4} /></div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 104, color: '#fff', lineHeight: 1.05, marginTop: 6, letterSpacing: '-0.02em' }}><SignalText text={String(c.total)} seed={51} rate={1} /></div>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.2em', color: '#C9CCD2', marginTop: 8 }}>
          <SignalText text={`${c.activeDays} ACTIVE DAYS · ${longest.length}-DAY STREAK · ${c.currentStreak} DAYS RUNNING`} seed={55} rate={0.35} />
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 20, textAlign: 'center', fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', color: C.hudDim }}>
        <SignalText text={`${longDate(github.period.from)} – ${longDate(github.period.to)} · GITHUB CONTRIBUTION CALENDAR · PRIVATE WORK COUNTED, NOT SHOWN`} seed={52} rate={0.15} />
      </div>
      <div style={{ position: 'absolute', left: 40, top: 30, fontFamily: MONO, fontSize: 15, letterSpacing: '0.3em', color: C.hud }}>
        <span style={{ color: C.orange }}><SignalText text="OBSERVATORY" seed={53} rate={1} /></span> <span style={{ color: C.hudDim }}>/</span> <SignalText text="A YEAR ON GITHUB" seed={54} rate={0.5} />
      </div>
    </AbsoluteFill>
  )
}

/** Site-style leader line: a ring on the star, a line to the end of a label whose top-left is (lx, ly). */
function Callout({ x, y, lx, ly, w, color, tag, value }: { x: number; y: number; lx: number; ly: number; w: number; color: string; tag: string; value: string }) {
  const ex = lx + w + 14
  const ey = ly + 30
  const d = Math.hypot(ex - x, ey - y)
  return (
    <>
      <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width="100%" height="100%">
        <circle cx={x} cy={y} r={9} fill="none" stroke={color} strokeWidth={1.2} opacity={0.9} />
        <polyline points={`${x + ((ex - x) / d) * 9},${y + ((ey - y) / d) * 9} ${ex},${ey}`} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
      </svg>
      <div style={{ position: 'absolute', top: ly, left: lx, fontFamily: MONO, whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.3em', color }}><SignalText text={tag} seed={tag.length * 7} rate={0.6} /></div>
        <div style={{ fontSize: 16, letterSpacing: '0.12em', color: C.hud, marginTop: 6 }}><SignalText text={value} seed={value.length * 13} rate={0.3} /></div>
      </div>
    </>
  )
}
