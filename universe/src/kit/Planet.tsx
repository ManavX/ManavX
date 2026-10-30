import { useMemo } from 'react'
import { AdditiveBlending, BackSide, Color, DoubleSide, Vector3 } from 'three'
import { PLANET_COLOR, PLANET_POSITION, PLANET_RADIUS, type Vec3 } from './universe'

/**
 * The orange planet from manav.world's galaxy, unnamed, with the same surface, halo and ring
 * shaders as the site; its clocks run whole cycles per loop.
 */

const ORANGE = new Color(PLANET_COLOR)
const PAPER = new Color('#F4F1EA')
const LIGHT_DIR = new Vector3(1, 0.35, -0.75).normalize()
const RING_INNER = PLANET_RADIUS * 1.55
const RING_OUTER = PLANET_RADIUS * 2.25
const TILT: Vec3 = [0.32, 0, -0.18]

const loopTime = /* glsl */ `
#define TAU 6.2831853
uniform float uTheta;
uniform float uPeriod;
float lt(float f) { return uTheta * max(1.0, floor(f * uPeriod / TAU + 0.5)); }
`

const noiseChunk = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x), mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x), mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise3(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
`

const vertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vObj = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const surface = /* glsl */ `
#define PI 3.14159265
uniform vec3 uLightDir;
uniform vec3 uOrange;
uniform vec3 uPaper;
uniform float uGlow;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
${loopTime}
${noiseChunk}

float surfaceLights(vec3 p, float rows, float land, float metro, float speed) {
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(p.z, p.x);
  float r = (lat / PI + 0.5) * rows;
  float row = floor(r);
  float rowLat = ((row + 0.5) / rows - 0.5) * PI;
  float cols = max(3.0, floor(rows * 2.0 * cos(rowLat)));
  float c = (lon / (2.0 * PI) + 0.5) * cols;
  vec2 cell = vec2(fract(c), fract(r)) - 0.5;
  vec2 id = vec2(floor(c), row);
  float h = hash21(id);
  float h2 = hash21(id + 31.7);
  float twinkle = 0.8 + 0.2 * sin(lt((0.6 + h2 * 2.4) * speed) + h * 40.0);
  float lit = step(0.5 - metro * 0.4, h) * land;
  float dotMask = smoothstep(0.34, 0.1, length(cell)) * lit * twinkle;
  float edge = min(0.5 - abs(cell.x), 0.5 - abs(cell.y));
  float street = smoothstep(0.08, 0.0, edge) * land * step(0.3, h2);
  return dotMask * 1.1 + street * 0.3 * (0.4 + metro);
}

void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vPosW);
  vec3 p = normalize(vObj);
  float landNoise = fbm(p * 2.2 + 3.7);
  float land = smoothstep(0.46, 0.52, landNoise);
  float metro = smoothstep(0.56, 0.7, landNoise);
  float far = smoothstep(45.0, 110.0, distance(cameraPosition, vPosW));
  float coarse = surfaceLights(p, 30.0, land, metro, 1.0);
  float fine = surfaceLights(p, 84.0, land, metro, 1.3);
  float lit = mix(fine * 0.9 + coarse * 0.15, coarse, far);
  float brightness = mix(0.55, 1.0, far);
  float sun = dot(n, uLightDir);
  float day = smoothstep(-0.08, 0.5, sun);
  float night = 1.0 - smoothstep(-0.3, 0.12, sun);
  vec3 dayCol = mix(vec3(0.035), vec3(0.34, 0.33, 0.31), land) * (0.3 + 0.7 * max(sun, 0.0));
  vec3 col = mix(vec3(0.006), dayCol, day);
  float glow = land * mix(0.05 + metro * 0.2, 0.12 + metro * 0.55, far);
  float lights = (glow + lit) * brightness;
  col += uOrange * lights * (0.35 + 1.45 * night) * uGlow;
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  float litLimb = smoothstep(-0.25, 0.55, sun);
  col += uPaper * fres * litLimb * 0.9;
  col += uOrange * fres * (1.0 - litLimb) * 0.08;
  gl_FragColor = vec4(col, 1.0);
}
`

const halo = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uOrange;
uniform vec3 uPaper;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vPosW);
  float i = pow(clamp(-dot(n, v), 0.0, 1.0), 3.0);
  float lit = smoothstep(-0.5, 0.6, dot(n, uLightDir));
  vec3 col = mix(uOrange * 0.55, uPaper * 0.9, lit) * i * (0.25 + 0.75 * lit);
  gl_FragColor = vec4(col, 1.0);
}
`

const ringVertex = /* glsl */ `
varying vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const ringFragment = /* glsl */ `
uniform vec3 uOrange;
uniform vec3 uPaper;
uniform float uInner;
uniform float uOuter;
varying vec3 vLocal;
${loopTime}
float hash(float x) { return fract(sin(x * 91.7) * 43758.5453); }
void main() {
  float t = (length(vLocal.xy) - uInner) / (uOuter - uInner);
  float band = floor(t * 38.0);
  float bandA = hash(band) * 0.6 + 0.15;
  float lane = step(0.86, hash(band + 7.0));
  float fade = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.75, t);
  float ang = atan(vLocal.y, vLocal.x);
  // Traffic in the lanes: dashes move one dash-length per loop
  float dash = step(0.55, fract(ang * 9.0 + uTheta / TAU + band));
  vec3 col = mix(uPaper * 0.5, uOrange * 1.4, lane);
  float a = fade * mix(bandA * 0.16, 0.5 * dash, lane);
  gl_FragColor = vec4(col * a, a);
}
`

type Props = {
  theta: number
  period: number
  position?: Vec3
  /** Turn about the planet's axis (fixed per shot; the planet does not spin during a loop) */
  spin?: number
  /** Strength of the surface lights, 1 = as on the site */
  glow?: number
  scale?: number
}

export function Planet({ theta, period, position = PLANET_POSITION, spin = 0, glow = 1, scale = 1 }: Props) {
  const uniforms = useMemo(
    () => ({
      surface: {
        uLightDir: { value: LIGHT_DIR },
        uOrange: { value: ORANGE },
        uPaper: { value: PAPER },
        uTheta: { value: 0 },
        uPeriod: { value: period },
        uGlow: { value: glow },
      },
      halo: { uLightDir: { value: LIGHT_DIR }, uOrange: { value: ORANGE }, uPaper: { value: PAPER } },
      ring: {
        uOrange: { value: ORANGE },
        uPaper: { value: PAPER },
        uInner: { value: RING_INNER },
        uOuter: { value: RING_OUTER },
        uTheta: { value: 0 },
        uPeriod: { value: period },
      },
    }),
    [period, glow],
  )
  uniforms.surface.uTheta.value = theta
  uniforms.ring.uTheta.value = theta

  return (
    <group position={position} rotation={TILT} scale={scale}>
      <group rotation={[0, spin, 0]}>
        <mesh>
          <sphereGeometry args={[PLANET_RADIUS, 128, 96]} />
          <shaderMaterial vertexShader={vertex} fragmentShader={surface} uniforms={uniforms.surface} />
        </mesh>
        <mesh scale={1.1}>
          <sphereGeometry args={[PLANET_RADIUS, 64, 48]} />
          <shaderMaterial
            vertexShader={vertex}
            fragmentShader={halo}
            uniforms={uniforms.halo}
            side={BackSide}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2 - 0.22, 0, 0]}>
          <ringGeometry args={[RING_INNER, RING_OUTER, 256, 1]} />
          <shaderMaterial
            vertexShader={ringVertex}
            fragmentShader={ringFragment}
            uniforms={uniforms.ring}
            side={DoubleSide}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  )
}
