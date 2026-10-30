import { useMemo } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { Camera, Galaxy } from '../kit/Galaxy'
import { Comet } from '../kit/Comet'
import { Planet } from '../kit/Planet'
import { Post } from '../kit/Post'
import { Satellite } from '../kit/Satellite'
import { SignalText } from '../kit/SignalText'
import { C, INTER, MONO, useLoop } from '../kit/type'

/**
 * The hero, "Orbit": a title card in high orbit. The unnamed planet holds the right of the
 * frame, night side towards us; the galaxy hangs far behind; a probe circles once per loop and
 * a comet crosses the sky. The camera is locked off: everything that moves, moves inside a
 * still frame, which keeps the GIF small and every paused frame composed.
 */

const ORBIT_R = 8.6
// Probe orbit: inclined, and squashed a little in depth so it reads as an ellipse from here
const orbitPoint = (a: number): [number, number, number] => [Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R * 0.32, Math.sin(a) * ORBIT_R * 0.95]

export function Orbit({ drift = 0 }: { drift?: number }) {
  const { width, height } = useVideoConfig()
  const { theta, period, u } = useLoop()
  const cam: [number, number, number] = [-1.5 + Math.sin(theta) * 1.6 * drift, 2.4 + Math.sin(theta * 2) * 0.35 * drift, 25 + Math.cos(theta) * drift]
  const a = theta + 0.6
  const blink = Math.pow(Math.max(0, Math.sin(theta * 8)), 12)
  // The comet crosses the far sky once per loop, between 55% and 79% of the way through
  const comet = (u - 0.55) / 0.24

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[100, 35, -75]} intensity={2.2} />
        <Camera position={cam} target={[-10.5, 0.8, 0]} fov={36} />
        <group position={[-105, 26, -190]} rotation={[0.42, 0.5, 0.08]}>
          <Galaxy theta={theta} period={period} pointScale={(height / 900) * 1.6} gains={[0.7, 1, 1, 1, 1, 1]} />
        </group>
        <Comet t={comet} start={[-58, 30, -70]} end={[-8, 15, -60]} scale={height / 900} />
        <Planet theta={theta} period={period} position={[0, 0, 0]} spin={2.2} />
        <OrbitPath />
        <group position={orbitPoint(a)} rotation={[0.3, -a, 0.2]}>
          <Satellite on={blink} scale={1.1} />
        </group>
        <Post bloom={1.4} />
      </ThreeCanvas>
      <TitleCard />
    </AbsoluteFill>
  )
}

/** The probe's orbit, drawn faintly like the site's orbit guides */
function OrbitPath() {
  const geometry = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i <= 256; i++) pts.push(...orbitPoint((i / 256) * Math.PI * 2))
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#9CA3AF" transparent opacity={0.1} depthWrite={false} />
    </line>
  )
}

function TitleCard() {
  return (
    <AbsoluteFill
      style={{
        padding: '0 0 0 72px',
        justifyContent: 'center',
        background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 38%, rgba(0,0,0,0) 58%)',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.34em', color: C.orange }}><SignalText text="MANAV.WORLD / OBSERVATORY" seed={1} rate={0.6} /></div>
      <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 78, color: '#fff', letterSpacing: '-0.015em', marginTop: 14, lineHeight: 1 }}>
        <SignalText text="Manav Acharya" seed={2} rate={0.5} />
      </div>
      <div style={{ fontFamily: INTER, fontSize: 25, color: '#C9CCD2', marginTop: 20, lineHeight: 1.45, maxWidth: 560 }}>
        <SignalText text="Software engineer building full-stack products, AI systems and cloud infrastructure." seed={3} rate={0.3} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', color: C.hud, marginTop: 34 }}>
        <span style={{ color: C.hudDim }}>[</span> <SignalText text="ENTER THE GALAXY" seed={4} rate={0.5} /> <span style={{ color: C.hudDim }}>]</span>
        <span style={{ color: C.hudDim, marginLeft: 22, letterSpacing: '0.12em' }}><SignalText text="manav.world" seed={5} rate={1} /></span>
      </div>
    </AbsoluteFill>
  )
}
