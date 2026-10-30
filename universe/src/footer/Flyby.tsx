import { useMemo } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Vector3 } from 'three'
import { Camera, Galaxy } from '../kit/Galaxy'
import { Planet } from '../kit/Planet'
import { Post } from '../kit/Post'
import { mulberry32 } from '../kit/rng'
import { SignalText } from '../kit/SignalText'
import { C, INTER, MONO, useLoop } from '../kit/type'

/**
 * Footer: a low-poly ship climbs out from just below the camera, engines towards us, and departs
 * for the galaxy, shrinking to a spark at its core; beside it, the call to board. The ship is out
 * of frame (or gone) at the start and end of each loop, so the seam is just sky.
 */

// The galaxy the ship heads for, and its route there between 6% and 78% of the loop
const GALAXY = new Vector3(30, 7, -130)
const START = new Vector3(8, -6.5, 20)
const BEND = new Vector3(13, -2, 8)
const ENTER = 0.06
const EXIT = 0.78
function path(u: number) {
  const k = (u - ENTER) / (EXIT - ENTER)
  // Climbs out slowly while it's big in frame, then accelerates away
  const e = k <= 0 ? k * 0.3 : k >= 1 ? 1 + (k - 1) * 0.1 : Math.pow(k, 1.7)
  // Quadratic curve: start → bend → galaxy
  const a = START.clone().lerp(BEND, e)
  const b = BEND.clone().lerp(GALAXY, e)
  return a.lerp(b, e)
}

const hull = new Color('#2a2d35')
const trim = new Color('#8a8f99')

function Ship({ throttle }: { throttle: number }) {
  // Delta wings as one flat triangle pair
  const wings = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute([0.9, 0, 0, -1.3, 0, 1.9, -1.5, 0, 0.3, 0.9, 0, 0, -1.5, 0, -0.3, -1.3, 0, -1.9], 3))
    g.computeVertexNormals()
    return g
  }, [])
  const glow = new Color('#FF6B1A').multiplyScalar(3 + throttle * 2)
  return (
    <group>
      {/* Fuselage: a long faceted cone pointing forward (+x) */}
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[0.4, 0, 0]}>
        <coneGeometry args={[0.42, 3.4, 7]} />
        <meshStandardMaterial color={hull} metalness={0.75} roughness={0.35} flatShading />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.65, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.7, 7]} />
        <meshStandardMaterial color={hull} metalness={0.75} roughness={0.35} flatShading />
      </mesh>
      {/* Canopy */}
      <mesh position={[0.35, 0.28, 0]} scale={[0.75, 0.22, 0.26]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#0b1622" metalness={0.9} roughness={0.15} emissive={new Color('#22D3EE')} emissiveIntensity={0.25} />
      </mesh>
      <mesh geometry={wings} position={[-0.6, -0.08, 0]}>
        <meshStandardMaterial color={trim} metalness={0.8} roughness={0.3} flatShading side={DoubleSide} />
      </mesh>
      {/* Tail fin */}
      <mesh position={[-1.5, 0.45, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.7, 0.55, 0.05]} />
        <meshStandardMaterial color={trim} metalness={0.8} roughness={0.3} flatShading />
      </mesh>
      {/* Engines and their glow */}
      {[-0.32, 0.32].map((z) => (
        <group key={z} position={[-2.05, -0.05, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.2, 0.3, 10]} />
            <meshStandardMaterial color="#15171c" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[-0.17, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.15, 16]} />
            <meshBasicMaterial color={glow} toneMapped={false} side={DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Wingtip lights */}
      <mesh position={[-1.3, 0, 1.9]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={new Color('#22D3EE').multiplyScalar(3)} toneMapped={false} />
      </mesh>
      <mesh position={[-1.3, 0, -1.9]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={new Color('#FF6B1A').multiplyScalar(3)} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Exhaust: glowing points along where the engines just were */
function Exhaust({ u, scale }: { u: number; scale: number }) {
  const N = 140
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aFade', new Float32BufferAttribute(Float32Array.from({ length: N }, (_, i) => i / (N - 1)), 1))
    return g
  }, [])
  const rng = useMemo(() => mulberry32(77), [])
  const jitter = useMemo(() => Array.from({ length: N }, () => [rng() - 0.5, rng() - 0.5]), [rng])
  const uniforms = useMemo(() => ({ uScale: { value: 1 } }), [])
  uniforms.uScale.value = scale
  const attr = geometry.getAttribute('position') as Float32BufferAttribute
  for (let i = 0; i < N; i++) {
    // Each point sits where the engines were a moment ago, spreading as it ages
    const back = path(u - i * 0.0007)
    const ahead = path(u - i * 0.0007 + 0.001)
    const dir = ahead.clone().sub(back).normalize()
    const engine = back.clone().addScaledVector(dir, -2.2)
    const spread = (i / N) * 0.9
    attr.setXYZ(i, engine.x, engine.y + jitter[i][0] * spread, engine.z + jitter[i][1] * spread)
  }
  attr.needsUpdate = true
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          attribute float aFade;
          uniform float uScale;
          varying float vFade;
          void main() {
            vFade = aFade;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.0 + 9.0 * pow(1.0 - aFade, 2.0)) * uScale * (60.0 / max(-mv.z, 1.0));
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying float vFade;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            vec3 col = mix(vec3(1.0, 0.75, 0.45), vec3(0.13, 0.83, 0.93), vFade);
            gl_FragColor = vec4(col, smoothstep(0.5, 0.0, d) * pow(1.0 - vFade, 1.6) * 0.9);
          }
        `}
      />
    </points>
  )
}

export function Flyby() {
  const { width, height } = useVideoConfig()
  const { u, theta, period } = useLoop()
  const pos = path(u)
  const next = path(u + 0.002)
  const heading = next.clone().sub(pos)
  const yaw = -Math.atan2(heading.z, heading.x)
  const pitch = Math.atan2(heading.y, Math.hypot(heading.x, heading.z))
  // A slow bank through the pass
  const bank = 0.25 - Math.sin(Math.min(1, Math.max(0, (u - ENTER) / (EXIT - ENTER))) * Math.PI) * 0.35
  const visible = u > ENTER - 0.04 && u < EXIT + 0.06
  // Fades into the galaxy's glow at the end of the run
  const fade = 1 - Math.min(1, Math.max(0, (u - EXIT + 0.08) / 0.12))
  const throttle = Math.max(0, Math.sin(theta * 6))

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[100, 35, -75]} intensity={2.4} />
        <directionalLight position={[-40, 10, 60]} intensity={0.5} color="#FF6B1A" />
        <Camera position={[0, 0, 30]} target={[0, 0, 0]} fov={32} />
        <group position={GALAXY.toArray()} rotation={[0.45, 0.3, 0.06]} scale={0.7}>
          <Galaxy theta={theta} period={period} pointScale={(height / 900) * 1.5} gains={[0.6, 1, 1, 1, 1, 1]} />
        </group>
        <Planet theta={theta} period={period} position={[-6, 9, -95]} spin={2.2} scale={0.5} />
        {visible && (
          <>
            <Exhaust u={u} scale={height / 900} />
            <group position={pos} rotation={[bank, yaw, pitch]} scale={fade * 1.5}>
              <Ship throttle={throttle} />
            </group>
          </>
        )}
        <Post bloom={1.3} />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          padding: '0 0 0 64px',
          justifyContent: 'center',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 38%, rgba(0,0,0,0) 55%)',
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.34em', color: C.orange }}>
          <SignalText text="NOW BOARDING · GATE MANAV.WORLD" seed={91} rate={0.5} />
        </div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 60, color: '#fff', letterSpacing: '-0.015em', marginTop: 12, lineHeight: 1 }}>
          <SignalText text="Board the ship" seed={92} rate={0.5} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', color: C.hud, marginTop: 24 }}>
          <span style={{ color: C.hudDim }}>[</span> <SignalText text="MANAV.WORLD" seed={93} rate={1} /> <span style={{ color: C.hudDim }}>]</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
