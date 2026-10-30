import { useMemo } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { github } from '../data/github'
import { Camera } from '../kit/Galaxy'
import { noise } from '../kit/galaxyShader'
import { Post } from '../kit/Post'
import { mulberry32 } from '../kit/rng'
import { SignalText } from '../kit/SignalText'
import { sampleSigil } from '../kit/sigils'
import { C, INTER, MONO, useLoop } from '../kit/type'
import { nebula } from '../kit/universe'

/**
 * Projects as the site shows them: each one a nebula in its own colour whose particles gather
 * into its sigil. One after another, each sigil loosens back into gas and re-forms, so at any
 * moment at least three are readable.
 */

const WORLDS = [
  {
    key: 'context-snap',
    repo: 'context-snap',
    name: 'Context Snap',
    color: '#3B82F6',
    line: 'Saves and restores a whole browser session in one click.',
    stack: 'JS · CHROME + FIREFOX APIS',
  },
  {
    key: 'chess-puzzle-gen',
    repo: 'chess-puzzle-generator',
    name: 'Chess Puzzle Generator',
    color: '#769656',
    line: 'Turns your own Chess.com games into Stockfish-checked puzzles.',
    stack: 'NEXT.JS · STOCKFISH · PRISMA',
  },
  {
    key: 'spotify-auto-curator',
    repo: 'spotify-auto-curator',
    name: 'Spotify Auto Curator',
    color: '#1DB954',
    line: 'Keeps playlists curated from how you actually listen.',
    stack: 'NEXT.JS · POSTGRES · REDIS',
  },
  {
    key: 'multiplayer-io',
    repo: 'multiplayer-io-game',
    name: 'Multiplayer IO Game',
    color: '#FF6B6B',
    line: 'A real-time arena running on its own physics engine.',
    stack: 'NODE.JS · SOCKET.IO',
  },
]

const PER = 3000
// 320 px columns: the camera (fov 30 at 32.5 units) shows 29.86 px per unit at 520 px tall
const SPACING = 320 / 29.86
const SIGIL = 7.2
const Y = 2.0 // sigil centre, world units above the frame centre
const SPOTIFY = 2

const vertex = /* glsl */ `
#define TAU 6.2831853
attribute vec3 nebulaPosition;
attribute vec3 sigilPosition;
attribute vec3 particleColor;
attribute vec4 aInfo; // world index, size, birth, unused
uniform float uTheta;
uniform float uPeriod;
uniform float uForm[4];
uniform float uScale;
varying vec3 vColor;
varying float vOpacity;
varying float vFocus;
${noise}
float lt(float f) { return uTheta * max(1.0, floor(f * uPeriod / TAU + 0.5)); }
void main() {
  int w = int(aInfo.x + 0.5);
  float size = aInfo.y;
  float birth = aInfo.z;
  float form = uForm[0];
  if (w == 1) form = uForm[1];
  else if (w == 2) form = uForm[2];
  else if (w == 3) form = uForm[3];

  // Gas: the site's two curl passes, with offsets that travel a circle once per loop
  float c = cos(uTheta);
  float s = sin(uTheta);
  vec3 gas = nebulaPosition;
  gas += curlNoise(gas * 0.6 + vec3(c, s, 0.0) * (0.04 * uPeriod / TAU)) * 0.5;
  gas += curlNoise(gas * 1.0 + vec3(s, c, -s) * (0.052 * uPeriod / TAU)) * 0.25;

  vec3 sig = sigilPosition;
  if (w == ${SPOTIFY}) {
    // Equaliser bars bounce, as on the site (the bars are centred on y = 0)
    float centre = aInfo.w;
    sig.y = centre + (sig.y - centre) * (0.7 + 0.3 * sin(lt(4.0) + sig.x * 1.8));
  }
  vec2 shimmer = vec2(sin(lt(1.7) + birth * 40.0), cos(lt(1.3) + birth * 31.0)) * 0.04;
  sig.xy += shimmer;

  float m = clamp(form * 1.6 - birth * 0.6, 0.0, 1.0);
  m = m * m * m * (m * (m * 6.0 - 15.0) + 10.0);
  vec3 pos = mix(gas, sig, m);
  vFocus = m;

  float twinkle = 0.5 + 0.5 * sin(lt(0.4) + birth * 3.14159);
  twinkle = mix(twinkle, 0.9, m);
  vColor = particleColor;
  vOpacity = twinkle;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float dist = max(-mv.z, 2.0);
  float baseSize = mix(size * 1.8, 1.7, m);
  gl_PointSize = clamp(baseSize * twinkle * uScale * (80.0 / dist), 0.5, 40.0 * uScale);
  gl_Position = projectionMatrix * mv;
}
`

const fragment = /* glsl */ `
varying vec3 vColor;
varying float vOpacity;
varying float vFocus;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;
  float edge = mix(0.05, 0.2, vFocus);
  float alpha = smoothstep(0.5, edge, dist) * vOpacity * mix(0.7, 0.95, vFocus);
  float inner = smoothstep(0.3, 0.0, dist) * mix(0.4, 0.8, vFocus);
  gl_FragColor = vec4(vColor * (0.8 + inner), alpha);
}
`

// Each world loosens into gas once per loop, a quarter-loop apart
function formOf(u: number, i: number) {
  const centre = 0.125 + i * 0.25
  let d = Math.abs(u - centre)
  d = Math.min(d, 1 - d)
  const k = Math.max(0, 1 - d / 0.11)
  return 1 - k * k * (3 - 2 * k)
}

export function Worlds() {
  const { width, height } = useVideoConfig()
  const { theta, period, u } = useLoop()
  const geometry = useMemo(() => {
    const n = PER * WORLDS.length
    const neb = new Float32Array(n * 3)
    const sig = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const info = new Float32Array(n * 4)
    WORLDS.forEach((w, i) => {
      const cx = (i - 1.5) * SPACING
      const rng = mulberry32(100 + i)
      const gas = nebula(rng, new Vector3(0, 0, 0), w.color, PER, i)
      const points = sampleSigil(w.key, PER, SIGIL, 200 + i)
      gas.forEach((p, j) => {
        const k = i * PER + j
        // The site's nebulae are ~5 units across; these sit closer together, so they are smaller
        neb.set([cx + p.position.x * 0.62, Y + p.position.y * 0.62, p.position.z * 0.62], k * 3)
        sig.set([cx + points[j * 3], Y + points[j * 3 + 1], points[j * 3 + 2]], k * 3)
        col.set([p.color.r, p.color.g, p.color.b], k * 3)
        info.set([i, p.size, rng(), Y], k * 4)
      })
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('nebulaPosition', new Float32BufferAttribute(neb, 3))
    g.setAttribute('sigilPosition', new Float32BufferAttribute(sig, 3))
    g.setAttribute('particleColor', new Float32BufferAttribute(col, 3))
    g.setAttribute('aInfo', new Float32BufferAttribute(info, 4))
    return g
  }, [])
  const uniforms = useMemo(
    () => ({ uTheta: { value: 0 }, uPeriod: { value: period }, uForm: { value: [1, 1, 1, 1] }, uScale: { value: 1 } }),
    [period],
  )
  uniforms.uTheta.value = theta
  uniforms.uForm.value = WORLDS.map((_, i) => formOf(u, i))
  uniforms.uScale.value = height / 900

  const langs = github.languageBytes
  const total = langs.reduce((a, l) => a + l.bytes, 0)

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <Camera position={[0, 0, 32.5]} target={[0, 0, 0]} fov={30} />
        <points geometry={geometry} frustumCulled={false}>
          <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
        </points>
        <Post bloom={1.2} />
      </ThreeCanvas>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: 40, top: 30, fontFamily: MONO, fontSize: 15, letterSpacing: '0.3em', color: C.hud }}>
          <span style={{ color: C.orange }}><SignalText text="OBSERVATORY" seed={41} rate={1} /></span> <span style={{ color: C.hudDim }}>/</span> <SignalText text="WORLDS I'VE BUILT" seed={42} rate={0.4} />
        </div>
        {WORLDS.map((w, i) => (
          <div key={w.key} style={{ position: 'absolute', left: i * 320 + 10, width: 300, top: 352, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.3em', color: w.color }}><SignalText text={`NEBULA ${String(i + 1).padStart(2, '0')}`} seed={20 + i} rate={0.7} /></div>
            <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 23, color: '#fff', letterSpacing: '-0.015em', lineHeight: 1.15, whiteSpace: 'nowrap' }}><SignalText text={w.name} seed={30 + i} rate={0.35} /></div>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', height: 3, gap: 3 }}>
            {langs.map((l) => (
              <div key={l.name} style={{ flex: l.bytes / total, background: l.color ?? C.hud, opacity: 0.85 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 13, letterSpacing: '0.16em', color: C.hudDim }}>
            <span>
              {langs.map((l, i) => (
                <span key={l.name}>
                  {i > 0 && <span style={{ margin: '0 10px' }}>·</span>}
                  <span style={{ color: C.hud }}><SignalText text={l.name.toUpperCase()} seed={70 + i} rate={0.6} /></span> <SignalText text={`${Math.round((l.bytes / total) * 100)}%`} seed={80 + i} rate={0.4} />
                </span>
              ))}
            </span>
            <SignalText text="CODE BY LANGUAGE ACROSS THESE FOUR REPOS" seed={40} rate={0.3} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
