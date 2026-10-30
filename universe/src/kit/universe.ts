/**
 * The galaxy as manav.world draws it: the same objects, positions, colours and particle recipes
 * as the site (src/data/universeData.ts and src/utils/nebulaGenerator.ts in manav-world),
 * with Math.random swapped for a seeded generator so renders are reproducible.
 */
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'
import { gaussian, mulberry32, type Rng } from './rng'

export type Vec3 = [number, number, number]

// Particle types, as in the site's shaders
export const PTYPE = { bg: 0, nebula: 1, cluster: 2, ring: 3, core: 4, beacon: 5 } as const

export const PROJECTS: { id: string; name: string; color: string; position: Vec3 }[] = [
  { id: 'context-snap', name: 'Context Snap', color: '#3B82F6', position: [5, 7, -10] },
  { id: 'spotify-auto-curator', name: 'Spotify Auto Curator', color: '#1DB954', position: [12, 3, -8] },
  { id: 'chess-puzzle-gen', name: 'Chess Puzzle Generator', color: '#769656', position: [-10, -2, -12] },
  { id: 'multiplayer-io', name: 'Multiplayer IO Game', color: '#FF6B6B', position: [8, -5, -15] },
  { id: 'edulink', name: 'EduLink Platform', color: '#4ECDC4', position: [-14, 4, -6] },
]

export const SKILLS: { id: string; name: string; color: string; position: Vec3 }[] = [
  { id: 'languages', name: 'Languages', color: '#06B6D4', position: [6, 8, -5] },
  { id: 'ai-ml', name: 'AI / ML + Data', color: '#F59E0B', position: [-5, 6, -10] },
  { id: 'frameworks', name: 'Frameworks', color: '#8B5CF6', position: [15, -1, -3] },
  { id: 'cloud-devops', name: 'Cloud + DevOps', color: '#F97316', position: [-12, -6, -8] },
  { id: 'tools', name: 'DBs + Tools', color: '#14B8A6', position: [3, -8, -14] },
]

// Comet tail length on each ring: a year of tenure sweeps half the ring (site: tenureArc)
export const EXPERIENCES: { id: string; company: string; color: string; radius: number; months: number }[] = [
  { id: 'alebex', company: 'Alebex', color: '#FB923C', radius: 18, months: 5 },
  { id: 'tidespark', company: 'TideSpark', color: '#E5E7EB', radius: 24, months: 7 },
  { id: 'operto', company: 'Operto', color: '#B4B9C2', radius: 30, months: 8 },
  { id: 'ymca', company: 'YMCA BC', color: '#858B97', radius: 36, months: 8 },
]
const tenureArc = (months: number) => Math.min(Math.PI * 1.2, Math.max(0.35, (months / 12) * Math.PI))

export const BEACON: Vec3 = [0, -12, -20]
// The unnamed planet, where the site puts it
export const PLANET_POSITION: Vec3 = [-24, 28, -92]
export const PLANET_RADIUS = 6
export const PLANET_COLOR = '#FF6B1A'

export interface Particle {
  position: Vector3
  color: Color
  size: number
  orbitSpeed: number
  orbitPhase: number
  type: number
  group: number
  ringArc?: number
}

export function nebula(rng: Rng, center: Vector3, baseColor: string, count: number, group: number): Particle[] {
  const color = new Color(baseColor)
  const core = color.clone().offsetHSL(-0.02, -0.1, 0.18)
  const rim = color.clone().offsetHSL(0.09, 0.05, -0.12)
  return Array.from({ length: count }, () => {
    const r = Math.abs(gaussian(rng, 0, 2.5))
    const theta = rng() * Math.PI * 2
    const phi = rng() * Math.PI
    const spiral = theta + r * 0.4
    const k = Math.min(1, r / 5)
    const c = k < 0.5 ? core.clone().lerp(color, k * 2) : color.clone().lerp(rim, (k - 0.5) * 2)
    c.offsetHSL((rng() - 0.5) * 0.03, (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.12)
    return {
      position: new Vector3(
        center.x + r * Math.sin(phi) * Math.cos(spiral),
        center.y + r * Math.sin(phi) * Math.sin(spiral) * 0.6,
        center.z + r * Math.cos(phi),
      ),
      color: c,
      size: 1.0 + rng() * 3.0,
      orbitSpeed: 0.05 + rng() * 0.15,
      orbitPhase: rng() * Math.PI * 2,
      type: PTYPE.nebula,
      group,
    }
  })
}

function cluster(rng: Rng, center: Vector3, baseColor: string, count: number, group: number): Particle[] {
  const color = new Color(baseColor)
  return Array.from({ length: count }, () => {
    const r = Math.abs(gaussian(rng, 0, 1.2))
    const theta = rng() * Math.PI * 2
    const phi = Math.acos(2 * rng() - 1)
    return {
      position: new Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi),
      ),
      color: color.clone().offsetHSL(0, 0, (rng() - 0.3) * 0.3),
      size: 1.5 + rng() * 2.0,
      orbitSpeed: 0.02 + rng() * 0.05,
      orbitPhase: rng() * Math.PI * 2,
      type: PTYPE.cluster,
      group,
    }
  })
}

function ring(rng: Rng, radius: number, baseColor: string, count: number, group: number, ringArc: number): Particle[] {
  const color = new Color(baseColor)
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const jitter = gaussian(rng, 0, 0.3)
    return {
      position: new Vector3((radius + jitter) * Math.cos(angle), gaussian(rng, 0, 0.15), (radius + jitter) * Math.sin(angle)),
      color: color.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.15),
      size: 1.0 + rng() * 1.5,
      orbitSpeed: 0.1 + rng() * 0.1,
      orbitPhase: angle,
      type: PTYPE.ring,
      group,
      ringArc,
    }
  })
}

function coreStar(rng: Rng, count: number): Particle[] {
  const coreColor = new Color('#FFF7ED')
  return Array.from({ length: count }, () => {
    const r = Math.abs(gaussian(rng, 0, 0.8))
    const theta = rng() * Math.PI * 2
    const phi = Math.acos(2 * rng() - 1)
    return {
      position: new Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)),
      color: coreColor.clone().offsetHSL((rng() - 0.5) * 0.02, 0, -rng() * 0.2),
      size: 2.0 + rng() * 3.0,
      orbitSpeed: 0.1 + rng() * 0.2,
      orbitPhase: rng() * Math.PI * 2,
      type: PTYPE.core,
      group: 30,
    }
  })
}

function beacon(rng: Rng, count: number): Particle[] {
  const color = new Color('#22D3EE')
  const center = new Vector3(...BEACON)
  return Array.from({ length: count }, () => {
    const r = rng() * 2.0
    const theta = rng() * Math.PI * 2
    const phi = Math.acos(2 * rng() - 1)
    return {
      position: new Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi),
      ),
      color: color.clone().offsetHSL((rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.2),
      size: 1.5 + rng() * 2.5,
      orbitSpeed: 0.3 + rng() * 0.5,
      orbitPhase: rng() * Math.PI * 2,
      type: PTYPE.beacon,
      group: 31,
    }
  })
}

export const COUNTS = { bg: 15000, nebula: 3000, cluster: 200, ring: 400, core: 1500, beacon: 300 }

/**
 * Every particle of the galaxy in one geometry, laid out like the site's ParticleSystem.
 * `text` (optional) gives each particle a second home: a point on the name.
 */
export function buildGalaxy(seed = 7, text?: Vector3[]): BufferGeometry {
  const rng = mulberry32(seed)
  const all: Particle[] = []
  all.push(...coreStar(rng, COUNTS.core))
  PROJECTS.forEach((p, i) => all.push(...nebula(rng, new Vector3(...p.position), p.color, COUNTS.nebula, i)))
  SKILLS.forEach((s, i) => all.push(...cluster(rng, new Vector3(...s.position), s.color, COUNTS.cluster, 10 + i)))
  EXPERIENCES.forEach((e, i) => all.push(...ring(rng, e.radius, e.color, COUNTS.ring, 20 + i, tenureArc(e.months))))
  all.push(...beacon(rng, COUNTS.beacon))
  for (let i = 0; i < COUNTS.bg; i++) {
    const r = 30 + rng() * 70
    const theta = rng() * Math.PI * 2
    const phi = Math.acos(2 * rng() - 1)
    all.push({
      position: new Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)),
      color: new Color('#ffffff').offsetHSL(0, 0, -rng() * 0.4),
      size: 0.3 + rng() * 1.0,
      orbitSpeed: 0.001 + rng() * 0.005,
      orbitPhase: rng() * Math.PI * 2,
      type: PTYPE.bg,
      group: -1,
    })
  }

  const n = all.length
  const target = new Float32Array(n * 3)
  const textPos = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const info = new Float32Array(n * 4)
  const motion = new Float32Array(n * 4)
  const phase = new Float32Array(n)
  all.forEach((p, i) => {
    target.set([p.position.x, p.position.y, p.position.z], i * 3)
    const t = text?.length ? text[i % text.length] : p.position
    textPos.set([t.x, t.y, t.z], i * 3)
    colors.set([p.color.r, p.color.g, p.color.b], i * 3)
    info.set([p.type, p.group, p.ringArc ?? 0, 0], i * 4)
    motion.set([p.size, rng(), 0.5 + rng() * 2.0, p.orbitSpeed], i * 4)
    phase[i] = p.orbitPhase
  })
  const geo = new BufferGeometry()
  // The shader places every particle; this attribute only sizes the draw call
  geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3))
  geo.setAttribute('targetPosition', new Float32BufferAttribute(target, 3))
  geo.setAttribute('textPosition', new Float32BufferAttribute(textPos, 3))
  geo.setAttribute('particleColor', new Float32BufferAttribute(colors, 3))
  geo.setAttribute('aInfo', new Float32BufferAttribute(info, 4))
  geo.setAttribute('aMotion', new Float32BufferAttribute(motion, 4))
  geo.setAttribute('orbitPhase', new Float32BufferAttribute(phase, 1))
  return geo
}

/**
 * Points on a line of text, the way the site samples the name for its Big Bang
 * (bold Inter on a canvas, every other pixel, 0.032 units per pixel).
 */
export function sampleText(text: string, count: number, seed = 11, fontSize = 160, family = 'Inter', yOffset = 0): Vector3[] {
  const rng = mulberry32(seed)
  const W = 2048
  const H = 400
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.font = `bold ${fontSize}px ${family}, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, H / 2)
  const img = ctx.getImageData(0, 0, W, H).data
  const filled: [number, number][] = []
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (img[(y * W + x) * 4 + 3] > 128) filled.push([x, y])
  const scale = 0.032
  return Array.from({ length: count }, () => {
    const [x, y] = filled[Math.floor(rng() * filled.length)]
    return new Vector3((x - W / 2) * scale, (H / 2 - y) * scale + yOffset, (rng() - 0.5) * 0.5)
  })
}
