import { useEffect, useState } from 'react'
import { AbsoluteFill, useDelayRender, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import type { Vector3 } from 'three'
import { Camera, Galaxy, type GalaxyMode } from '../kit/Galaxy'
import { Planet } from '../kit/Planet'
import { Post } from '../kit/Post'
import { C, INTER, MONO, inter, smooth, useLoop } from '../kit/type'
import { sampleText } from '../kit/universe'

/**
 * Direction A, "Ignition": the site's own opening, as a loop. The name hangs in space, scatters
 * into the galaxy, the galaxy falls back into the core, and the bang writes the name again.
 */

// Beats, as fractions of the loop
const HOLD = 0.34
const SCATTER = 0.52
const GALAXY = 0.76
const COLLAPSE = 0.87

function beat(u: number): { mode: GalaxyMode; t: number } {
  if (u < HOLD) return { mode: 'bang', t: 1 }
  if (u < SCATTER) return { mode: 'scatter', t: (u - HOLD) / (SCATTER - HOLD) }
  if (u < GALAXY) return { mode: 'galaxy', t: 1 }
  if (u < COLLAPSE) return { mode: 'collapse', t: (u - GALAXY) / (COLLAPSE - GALAXY) }
  return { mode: 'bang', t: (u - COLLAPSE) / (1 - COLLAPSE) }
}

function useName(text: string) {
  const [points, setPoints] = useState<Vector3[] | null>(null)
  const { delayRender, continueRender } = useDelayRender()
  const [handle] = useState(() => delayRender('Sampling the name'))
  useEffect(() => {
    inter.waitUntilDone().then(() => {
      setPoints(sampleText(text, 19400, 11, 160, inter.fontFamily, 2.4))
      continueRender(handle)
    })
  }, [text, handle, continueRender])
  return points
}

export function Ignition() {
  const { width, height } = useVideoConfig()
  const { u, theta, period } = useLoop()
  const name = useName('MANAV ACHARYA')
  const { mode, t } = beat(u)
  // A slow closed drift, so the parallax between core, nebulae and planet keeps moving
  const cam: [number, number, number] = [Math.sin(theta) * 4, 5 + Math.sin(theta * 2) * 0.8, 36 + Math.cos(theta) * 2]
  // Flash as the bang goes off
  const flash = mode === 'bang' && u > COLLAPSE ? Math.max(0, 1 - t * 5) : 0
  const shown = u < HOLD ? 1 : u < SCATTER ? 1 - smooth((u - HOLD) / 0.06) : u > COLLAPSE ? smooth((u - COLLAPSE - 0.04) / 0.08) : 0

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      {name && (
        <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
          <color attach="background" args={['#000000']} />
          <Camera position={cam} target={[0, 3.2, 0]} fov={40} />
          <Galaxy theta={theta} period={period} mode={mode} transition={t} pointScale={(height / 900) * 1.25} textSize={1.9} text={name} />
          <Planet theta={theta} period={period} spin={0.6} />
          <Post bloom={1.5} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{ backgroundColor: '#fff', opacity: flash * 0.5, mixBlendMode: 'screen' }} />
      <Hud subtitleOpacity={0.55 + 0.45 * shown} />
    </AbsoluteFill>
  )
}

function Hud({ subtitleOpacity }: { subtitleOpacity: number }) {
  return (
    <AbsoluteFill style={{ fontFamily: MONO, color: C.hud }}>
      <div style={{ position: 'absolute', left: 40, top: 32, fontSize: 22, letterSpacing: '0.32em', fontWeight: 500 }}>MANAV.WORLD</div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 50,
          textAlign: 'center',
          fontSize: 21,
          letterSpacing: '0.34em',
          color: C.hud,
          opacity: subtitleOpacity,
        }}
      >
        SOFTWARE ENGINEER <span style={{ color: C.orange }}>·</span> FULL-STACK <span style={{ color: C.orange }}>·</span> AI{' '}
        <span style={{ color: C.orange }}>·</span> CLOUD INFRASTRUCTURE
      </div>
      <div style={{ position: 'absolute', right: 40, top: 30, fontSize: 19, letterSpacing: '0.2em', color: C.hud }}>
        <span style={{ color: C.hudDim }}>[</span> ENTER THE GALAXY <span style={{ color: C.hudDim }}>]</span>
      </div>
      <div style={{ position: 'absolute', left: 40, bottom: 18, fontSize: 13, letterSpacing: '0.24em', color: C.hudDim, fontFamily: MONO }}>
        manav@world <span style={{ color: C.hudDim }}>:~$</span>
      </div>
      <div style={{ position: 'absolute', right: 40, bottom: 18, fontSize: 13, letterSpacing: '0.24em', color: C.hudDim, fontFamily: INTER }} />
    </AbsoluteFill>
  )
}
