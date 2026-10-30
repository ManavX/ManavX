import { useMemo } from 'react'
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import type { Vec3 } from './universe'

/**
 * manav.world's comet (src/components/canvas/Comets.tsx; on the site each one is a recent
 * GitHub push): a white head and a violet tail streaking across the sky. Here it is driven by
 * `t` (0 → 1 across one pass) instead of a clock.
 */

const TRAIL = 110
const SPACING = 0.16

const vertexShader = /* glsl */ `
attribute float aFade;
uniform float uScale;
varying float vFade;
void main() {
  vFade = aFade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (1.5 + 8.0 * pow(1.0 - aFade, 2.5)) * uScale * (60.0 / max(-mv.z, 1.0));
  gl_Position = projectionMatrix * mv;
}
`

const fragmentShader = /* glsl */ `
uniform float uAlpha;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  vec3 head = vec3(0.85, 0.97, 1.0);
  vec3 tail = vec3(0.66, 0.33, 0.97);
  float a = smoothstep(0.5, 0.0, d) * pow(1.0 - vFade, 1.5) * uAlpha;
  gl_FragColor = vec4(mix(head, tail, vFade), a);
}
`

export function Comet({ t, start, end, scale }: { t: number; start: Vec3; end: Vec3; scale: number }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(TRAIL * 3), 3))
    g.setAttribute('aFade', new Float32BufferAttribute(Float32Array.from({ length: TRAIL }, (_, i) => i / (TRAIL - 1)), 1))
    return g
  }, [])
  const uniforms = useMemo(() => ({ uAlpha: { value: 0 }, uScale: { value: 1 } }), [])

  const k = Math.min(1, Math.max(0, t))
  const eased = 1 - Math.pow(1 - k, 2)
  const a = new Vector3(...start)
  const b = new Vector3(...end)
  const dir = b.clone().sub(a).normalize()
  const head = a.clone().lerp(b, eased)
  const grow = Math.min(1, k * 4)
  const attr = geometry.getAttribute('position') as Float32BufferAttribute
  for (let i = 0; i < TRAIL; i++) {
    attr.setXYZ(i, head.x - dir.x * i * SPACING * grow, head.y - dir.y * i * SPACING * grow, head.z - dir.z * i * SPACING * grow)
  }
  attr.needsUpdate = true
  uniforms.uAlpha.value = t > 0 && t < 1 ? Math.sin(Math.PI * k) : 0
  uniforms.uScale.value = scale

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}
