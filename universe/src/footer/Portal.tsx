import { useMemo } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'
import { Camera, Galaxy } from '../kit/Galaxy'
import { Post } from '../kit/Post'
import { mulberry32, gaussian } from '../kit/rng'
import { Satellite } from '../kit/Satellite'
import { SignalText } from '../kit/SignalText'
import { C, INTER, MONO, smooth, useLoop } from '../kit/type'

/**
 * Footer: the probe from the hero flies out of frame and into a portal, a ring in the colours
 * of the site's contact beacon with the galaxy showing through it. The probe arrives, the
 * portal flares, settles, and the next pass begins out of shot.
 */

const PORTAL: [number, number, number] = [15, 0.2, -6]
const R = 4.6
// Just below the bottom edge of the frame, close to the camera
const START = new Vector3(1.5, -5.4, 17)
const ARRIVE = 0.6

const vertex = /* glsl */ `
#define TAU 6.2831853
attribute vec4 aInfo; // kind (0 ring, 1 inflow, 2 core), angle, radius, birth
attribute vec3 particleColor;
uniform float uTheta;
uniform float uPulse;
uniform float uScale;
uniform float uR;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float kind = aInfo.x;
  float a0 = aInfo.y;
  float r0 = aInfo.z;
  float birth = aInfo.w;
  vec3 p;
  float alpha = 1.0;
  float size = 1.6;
  if (kind < 0.5) {
    // The rim turns once per loop and breathes with the pulse
    float a = a0 + uTheta;
    float r = r0 * (1.0 + uPulse * 0.06);
    p = vec3(cos(a) * r, sin(a) * r, position.z);
    alpha = 0.55 + 0.45 * sin(uTheta * 3.0 + birth * TAU);
    size = 1.4 + birth * 1.6;
  } else if (kind < 1.5) {
    // Inflow: spirals from the rim to the centre, twice per loop
    float k = fract(birth + uTheta / TAU * 2.0);
    float r = uR * (1.0 - k);
    float a = a0 + k * 4.0;
    p = vec3(cos(a) * r, sin(a) * r, -k * 1.5);
    alpha = smoothstep(0.0, 0.15, k) * (1.0 - smoothstep(0.75, 1.0, k)) * 0.8;
    size = 1.2 + (1.0 - k) * 1.2;
  } else {
    p = position;
    alpha = 0.7 + 0.3 * sin(uTheta * 2.0 + birth * TAU);
    size = 2.4;
  }
  vColor = particleColor * (1.0 + uPulse * 1.2);
  vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = size * uScale * (80.0 / max(-mv.z, 2.0)) * (1.0 + uPulse * 0.4);
  gl_Position = projectionMatrix * mv;
}
`

const fragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.15, 0.0, d);
  float a = (smoothstep(0.5, 0.0, d) + core * 0.5) * vAlpha;
  gl_FragColor = vec4(vColor + vec3(core * 0.4), a);
}
`

function usePortalGeometry() {
  return useMemo(() => {
    const rng = mulberry32(31)
    const cyan = new Color('#22D3EE')
    const white = new Color('#E8FBFF')
    const orange = new Color('#FF6B1A')
    const info: number[] = []
    const pos: number[] = []
    const col: number[] = []
    const add = (kind: number, a: number, r: number, z: number, c: Color) => {
      info.push(kind, a, r, rng())
      pos.push(0, 0, z)
      col.push(c.r, c.g, c.b)
    }
    for (let i = 0; i < 2600; i++) {
      const a = rng() * Math.PI * 2
      const pick = rng()
      const c = (pick < 0.12 ? orange : pick < 0.55 ? cyan : white).clone().offsetHSL(0, 0, (rng() - 0.5) * 0.15)
      add(0, a, R + gaussian(rng, 0, 0.16), gaussian(rng, 0, 0.12), c)
    }
    for (let i = 0; i < 1400; i++) add(1, rng() * Math.PI * 2, 0, 0, cyan.clone().lerp(white, rng() * 0.6))
    for (let i = 0; i < 260; i++) {
      const r = Math.abs(gaussian(rng, 0, 0.35))
      const a = rng() * Math.PI * 2
      info.push(2, 0, 0, rng())
      pos.push(Math.cos(a) * r, Math.sin(a) * r, 0)
      col.push(white.r, white.g, white.b)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aInfo', new Float32BufferAttribute(info, 4))
    g.setAttribute('particleColor', new Float32BufferAttribute(col, 3))
    return g
  }, [])
}

export function Portal() {
  const { width, height } = useVideoConfig()
  const { theta, period, u } = useLoop()
  const geometry = usePortalGeometry()
  const uniforms = useMemo(() => ({ uTheta: { value: 0 }, uPulse: { value: 0 }, uScale: { value: 1 }, uR: { value: R } }), [])
  // Flare as the probe goes through, fading by the end of the loop
  const pulse = u > ARRIVE ? Math.exp(-(u - ARRIVE) * 14) : 0
  uniforms.uTheta.value = theta
  uniforms.uPulse.value = pulse
  uniforms.uScale.value = height / 900

  // The probe accelerates from behind the camera into the portal
  const k = Math.min(1, u / ARRIVE)
  const travel = Math.pow(k, 1.35)
  const end = new Vector3(...PORTAL)
  const probe = START.clone().lerp(end, travel)
  const heading = end.clone().sub(START)
  const yaw = Math.atan2(heading.x, heading.z)
  const shown = u < ARRIVE ? 1 - smooth((k - 0.96) / 0.04) : 0
  const blink = Math.pow(Math.max(0, Math.sin(theta * 8)), 12)

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[100, 35, -75]} intensity={2.2} />
        <Camera position={[0, 0, 30]} target={[0, 0, 0]} fov={32} />
        {/* The galaxy, small and far, framed by the ring */}
        <group position={[PORTAL[0] * 3.2, PORTAL[1] * 3.2, -70]} rotation={[0.35, 0, 0]} scale={0.32}>
          <Galaxy theta={theta} period={period} pointScale={(height / 900) * 1.4} gains={[0, 1, 1, 1, 1, 1]} />
        </group>
        <group position={PORTAL} rotation={[0, -0.32, 0]}>
          <points geometry={geometry} frustumCulled={false}>
            <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
          </points>
        </group>
        <Stars theta={theta} scale={height / 900} />
        {shown > 0.01 && (
          <group position={probe} rotation={[0, yaw, 0]} scale={shown}>
            <Satellite on={blink} scale={1.7} />
            <mesh position={[0, 0, -0.7]}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshBasicMaterial color={new Color('#FF6B1A').multiplyScalar(4)} toneMapped={false} />
            </mesh>
          </group>
        )}
        <Post bloom={1.4} />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          padding: '0 0 0 64px',
          justifyContent: 'center',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 60%)',
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.34em', color: C.orange }}><SignalText text="CONTINUE EXPLORING" seed={11} rate={0.6} /></div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 56, color: '#fff', letterSpacing: '-0.015em', marginTop: 12, lineHeight: 1 }}>
          <SignalText text="Enter the galaxy" seed={12} rate={0.4} />
        </div>
        <div style={{ fontFamily: INTER, fontSize: 21, color: '#C9CCD2', marginTop: 14 }}>
          <SignalText text="An explorable 3D galaxy of my work." seed={13} rate={0.3} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', color: C.hud, marginTop: 22 }}>
          <span style={{ color: C.hudDim }}>[</span> <SignalText text="MANAV.WORLD" seed={14} rate={1} /> <span style={{ color: C.hudDim }}>]</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/** A still starfield behind the portal, twinkling in whole cycles per loop */
function Stars({ theta, scale }: { theta: number; scale: number }) {
  const geometry = useMemo(() => {
    const rng = mulberry32(9)
    const n = 1400
    const pos = new Float32Array(n * 3)
    const info = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      pos.set([(rng() - 0.5) * 160, (rng() - 0.5) * 60, -40 - rng() * 40], i * 3)
      info.set([rng() * Math.PI * 2, 1 + Math.floor(rng() * 3)], i * 2)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aTwinkle', new Float32BufferAttribute(info, 2))
    return g
  }, [])
  const uniforms = useMemo(() => ({ uTheta: { value: 0 }, uScale: { value: 1 } }), [])
  uniforms.uTheta.value = theta
  uniforms.uScale.value = scale
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          attribute vec2 aTwinkle;
          uniform float uTheta;
          uniform float uScale;
          varying float vA;
          void main() {
            vA = 0.35 + 0.35 * sin(uTheta * aTwinkle.y + aTwinkle.x);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 1.6 * uScale * (80.0 / max(-mv.z, 2.0));
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(vec3(1.0), smoothstep(0.5, 0.0, d) * vA);
          }
        `}
      />
    </points>
  )
}
