/**
 * manav.world's particle shaders (src/shaders/particle.*.glsl), reworked for video loops:
 * every motion is a whole number of cycles per loop (uTheta runs 0 → 2π once per loop), so the
 * last frame flows into the first. Interaction (hover, pointer, sigils) is left out.
 *
 * uMode: 0 = galaxy pulled into the core, 1 = bang (core → name), 2 = name scatters into the
 * galaxy, 3 = galaxy. uTransition runs 0 → 1 within a mode.
 */

/** Simplex + curl noise from the site's vertex shader, shared by every particle shader here */
export const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 snoiseVec3(vec3 x) {
  return vec3(snoise(x), snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)), snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4)));
}
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 px0 = snoiseVec3(p - dx);
  vec3 px1 = snoiseVec3(p + dx);
  vec3 py0 = snoiseVec3(p - dy);
  vec3 py1 = snoiseVec3(p + dy);
  vec3 pz0 = snoiseVec3(p - dz);
  vec3 pz1 = snoiseVec3(p + dz);
  return normalize(vec3(py1.z - py0.z - pz1.y + pz0.y, pz1.x - pz0.x - px1.z + px0.z, px1.y - px0.y - py1.x + py0.x) + 1e-5);
}
`

export const galaxyVertex = /* glsl */ `
#define TAU 6.2831853
attribute vec3 targetPosition;
attribute vec3 textPosition;
attribute vec3 particleColor;
attribute vec4 aInfo;   // particleType, groupId, ringArc, unused
attribute vec4 aMotion; // particleSize, birthTime, twinkleSpeed, orbitSpeed
attribute float orbitPhase;

uniform float uTheta;
uniform float uPeriod;
uniform float uMode;
uniform float uTransition;
uniform float uPointScale;
uniform float uTextSize;
uniform float uWarp;
uniform float uFade;
// Brightness per particle type: bg, nebula, cluster, ring, core, beacon
uniform float uTypeGain[6];

varying vec3 vColor;
varying float vOpacity;
varying float vType;
varying vec3 vStreak;
varying float vTrail;

${noise}

// The site's "uTime * f", turned into the nearest whole number of cycles per loop
float lt(float f) { return uTheta * max(1.0, floor(f * uPeriod / TAU + 0.5)); }

vec3 galaxyPosition(float type, float birth, float orbitSpeed, float ringArc) {
  vec3 tp = targetPosition;
  float c = cos(uTheta);
  float s = sin(uTheta);
  if (type < 0.5) {
    return tp + vec3(sin(uTheta + birth * TAU), cos(uTheta + birth * 8.1), 0.0) * 0.05;
  } else if (type < 1.5) {
    // Gas drifts through a curl field; the field's offset travels a circle so it comes back
    float r1 = 0.04 * uPeriod / TAU;
    float r2 = 0.052 * uPeriod / TAU;
    vec3 gas = tp;
    gas += curlNoise(gas * 0.35 + vec3(c, s, 0.0) * r1) * 0.9;
    gas += curlNoise(gas * 0.6 + vec3(s, c, -s) * r2) * 0.45;
    return gas;
  } else if (type < 2.5) {
    float a = lt(orbitSpeed) + orbitPhase;
    return tp + vec3(sin(a * 3.0), cos(a * 3.0 + 1.3), sin(a * 2.0 + 0.7)) * 0.08;
  } else if (type < 3.5) {
    // Ring dust holds its place; a comet laps the ring once per loop, its tail the tenure arc
    float radius = length(tp.xz);
    float flow = orbitPhase;
    float head = uTheta + radius * 1.7;
    float behind = mod(head - flow, TAU);
    float trail = clamp(1.0 - behind / max(ringArc, 0.01), 0.0, 1.0);
    vTrail = trail * trail;
    return vec3(cos(flow) * radius, tp.y + sin(uTheta + birth * TAU) * 0.1, sin(flow) * radius);
  } else if (type < 4.5) {
    float pulse = 1.0 + sin(lt(0.8)) * 0.15;
    float a = lt(orbitSpeed) + orbitPhase;
    return tp * pulse + vec3(cos(a), sin(a * 0.7 + 1.0), sin(a * 1.3 + 2.0)) * 0.1;
  }
  // Beacon: waves roll outward, a whole number per loop
  float waves = 2.0 * max(1.0, floor(0.25 * uPeriod + 0.5));
  float wave = mod(uTheta / TAU * waves + birth, 2.0);
  return tp + normalize(tp - vec3(0.0, -12.0, -20.0) + vec3(0.001)) * wave * 2.0;
}

void main() {
  float type = aInfo.x;
  float ringArc = aInfo.z;
  float size = aMotion.x;
  float birth = aMotion.y;
  float twinkleSpeed = aMotion.z;
  float orbitSpeed = aMotion.w;
  vType = type;
  vTrail = 0.0;

  vec3 galaxy = galaxyPosition(type, birth, orbitSpeed, ringArc);
  // The name shimmers a little while it hangs there
  vec3 name = textPosition + vec3(sin(lt(0.6) + birth * TAU), cos(lt(0.5) + birth * 9.0), 0.0) * 0.03;
  float t = clamp(uTransition, 0.0, 1.0);
  vec3 pos = galaxy;
  float textness = 0.0;
  // Background stars stay where they are: the name is made of the galaxy's objects
  if (type < 0.5) {
  } else if (uMode < 0.5) {
    // Everything falls into the core, inner things first
    float k = clamp((t - birth * 0.25) / 0.75, 0.0, 1.0);
    k = k * k * k;
    pos = mix(galaxy, vec3(0.0), k);
  } else if (uMode < 1.5) {
    float delay = birth * 0.3;
    float k = clamp((t - delay) / (1.0 - delay), 0.0, 1.0);
    k = 1.0 - pow(1.0 - k, 3.0);
    pos = mix(vec3(0.0), name, k);
    textness = 1.0;
  } else if (uMode < 2.5) {
    float delay = birth * 0.2;
    float k = clamp((t - delay) / (1.0 - delay), 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    pos = mix(name, galaxy, k);
    textness = 1.0 - k;
  }

  float twinkle;
  if (type < 0.5) twinkle = 0.3 + 0.7 * sin(lt(twinkleSpeed * 0.5) + birth * TAU);
  else if (type < 1.5) twinkle = 0.5 + 0.5 * sin(lt(0.4) + birth * 3.14159);
  else if (type < 2.5) twinkle = 0.4 + 0.6 * pow(sin(lt(twinkleSpeed * 2.0) + birth * TAU) * 0.5 + 0.5, 3.0);
  else if (type < 3.5) twinkle = mix(0.6 + 0.4 * sin(lt(1.5) + orbitPhase * 3.0), 1.0, vTrail);
  else if (type < 4.5) twinkle = 0.7 + 0.3 * sin(lt(0.8));
  else twinkle = 0.3 + 0.7 * pow(sin(lt(1.2) + birth * 3.14159) * 0.5 + 0.5, 2.0);
  // While they spell the name, every particle glows steadily
  twinkle = mix(twinkle, 0.85, textness);

  int ti = int(type + 0.5);
  float gain = uTypeGain[0];
  if (ti == 1) gain = uTypeGain[1];
  else if (ti == 2) gain = uTypeGain[2];
  else if (ti == 3) gain = uTypeGain[3];
  else if (ti == 4) gain = uTypeGain[4];
  else if (ti == 5) gain = uTypeGain[5];
  vColor = mix(particleColor, mix(particleColor, vec3(1.0), 0.35), textness);
  vOpacity = twinkle * uFade * mix(gain, 1.0, textness);
  // Not yet born during the bang
  if (type > 0.5 && uMode > 0.5 && uMode < 1.5 && t < birth * 0.3) vOpacity = 0.0;

  float mult = 1.0;
  if (type < 0.5) mult = 0.6;
  else if (type < 1.5) mult = 1.8;
  else if (type < 2.5) mult = 1.2;
  else if (type < 3.5) mult = 1.0 + vTrail * 1.4;
  else if (type < 4.5) mult = 2.0;
  else mult = 1.5;
  float baseSize = mix(size * mult, uTextSize, textness);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float dist = max(-mv.z, 2.0);
  gl_PointSize = clamp(baseSize * twinkle * uPointScale * (80.0 / dist), 0.5, 40.0 * uPointScale);
  gl_Position = projectionMatrix * mv;

  // Warp streaks: sprites stretch away from the centre of the frame
  vStreak = vec3(1.0, 0.0, 1.0);
  if (uWarp > 0.001) {
    vec2 ndc = gl_Position.xy / gl_Position.w;
    float radial = length(ndc);
    float stretch = 1.0 + uWarp * (type < 0.5 ? 7.0 : 2.0) * clamp(radial, 0.0, 1.2);
    vec2 dir = radial > 0.001 ? ndc / radial : vec2(1.0, 0.0);
    dir.y = -dir.y;
    vStreak = vec3(dir, stretch);
    gl_PointSize = min(gl_PointSize * stretch, 96.0 * uPointScale);
  }
}
`

// The site's fragment shader, unchanged apart from the varyings it no longer needs
export const galaxyFragment = /* glsl */ `
varying vec3 vColor;
varying float vOpacity;
varying float vType;
varying vec3 vStreak;
varying float vTrail;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  if (vStreak.z > 1.001) {
    vec2 d = vStreak.xy;
    uv = vec2(dot(uv, d), dot(uv, vec2(-d.y, d.x)) * vStreak.z);
  }
  float dist = length(uv);
  if (dist > 0.5) discard;
  float alpha;
  vec3 col;
  if (vType < 0.5) {
    alpha = smoothstep(0.5, 0.0, dist) * vOpacity;
    col = vColor + vec3(smoothstep(0.08, 0.0, dist) * 0.8);
  } else if (vType < 1.5) {
    alpha = smoothstep(0.5, 0.05, dist) * vOpacity * 0.7;
    col = vColor * (0.8 + smoothstep(0.3, 0.0, dist) * 0.4);
  } else if (vType < 2.5) {
    float core = smoothstep(0.12, 0.0, dist);
    float spike1 = smoothstep(0.04, 0.0, abs(uv.x)) * smoothstep(0.5, 0.0, abs(uv.y)) * 0.4;
    float spike2 = smoothstep(0.04, 0.0, abs(uv.y)) * smoothstep(0.5, 0.0, abs(uv.x)) * 0.4;
    alpha = (smoothstep(0.5, 0.0, dist) + spike1 + spike2) * vOpacity;
    col = vColor + vec3(core);
  } else if (vType < 3.5) {
    alpha = smoothstep(0.5, 0.0, dist) * vOpacity * (0.9 + vTrail * 0.4);
    col = vColor + vec3(smoothstep(0.1, 0.0, dist) * (0.3 + vTrail * 0.9)) + vec3(vTrail * 0.35);
  } else if (vType < 4.5) {
    float corona = smoothstep(0.5, 0.1, dist) * 0.6;
    float core = smoothstep(0.15, 0.0, dist);
    alpha = (corona + core) * vOpacity;
    col = vColor + vec3(core * 0.5, core * 0.3, 0.0);
  } else {
    float ring = smoothstep(0.05, 0.0, abs(dist - 0.3)) * 0.8;
    float core = smoothstep(0.15, 0.0, dist);
    alpha = (ring + core) * vOpacity;
    col = vColor + vec3(core * 0.3);
  }
  gl_FragColor = vec4(col, alpha);
}
`
