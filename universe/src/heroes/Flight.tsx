import { AbsoluteFill, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { Camera, Galaxy } from '../kit/Galaxy'
import { Planet } from '../kit/Planet'
import { Post } from '../kit/Post'
import { C, INTER, MONO, smooth, useLoop } from '../kit/type'

/**
 * Direction C, "Flight": the site's warp drive as a loop. Drop out of warp in front of the
 * galaxy, drift while the HUD reads out, type a command, and jump again. The loop seam sits
 * inside the white-out of the jump.
 */

const ARRIVE = 0.2
const JUMP = 0.84

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)

export function Flight() {
  const { width, height } = useVideoConfig()
  const { u, theta, period } = useLoop()
  // Arrive from deep space, settle, drift, then accelerate into the core and through
  let z: number
  if (u < ARRIVE) z = 34 + 160 * (1 - ease(u / ARRIVE))
  else if (u < JUMP) z = 34 - 4 * ((u - ARRIVE) / (JUMP - ARRIVE))
  else z = 30 - 40 * Math.pow((u - JUMP) / (1 - JUMP), 2.2)
  const warp = u < ARRIVE ? 1 - smooth(u / ARRIVE) : u > JUMP ? smooth((u - JUMP) / (1 - JUMP) * 1.3) : 0
  const cam: [number, number, number] = [Math.sin(theta) * 1.5, 4.6 + Math.sin(theta) * 0.4, z]
  const whiteout = Math.max(1 - smooth(u / 0.05), smooth((u - 0.965) / 0.035))
  const hud = smooth((u - ARRIVE + 0.02) / 0.06) * (1 - smooth((u - JUMP) / 0.05))

  const typed = 'goto manav.world'
  const chars = Math.round(typed.length * smooth((u - 0.58) / 0.16))

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <Camera position={cam} target={[0, 1.5, z - 36]} fov={42} />
        <Galaxy theta={theta} period={period} pointScale={(height / 900) * 1.25} warp={warp} />
        <Planet theta={theta} period={period} spin={0.6} />
        <Post bloom={1.5} />
      </ThreeCanvas>
      <AbsoluteFill style={{ backgroundColor: '#fff', opacity: whiteout }} />
      <AbsoluteFill style={{ fontFamily: MONO, color: C.hud }}>
        <div style={{ position: 'absolute', left: 40, top: 32, fontSize: 22, letterSpacing: '0.32em', fontWeight: 500 }}>MANAV.WORLD</div>
        <div style={{ position: 'absolute', left: 40, top: 70, fontSize: 13, letterSpacing: '0.18em', color: C.hudDim, lineHeight: 1.75, opacity: 0.9 }}>
          <div>
            POS <span style={{ color: '#9CA3AF', marginLeft: 14 }}>{fmt(cam[0])} {fmt(cam[1])} {fmt(cam[2])}</span>
          </div>
          <div>
            LOC <span style={{ color: '#9CA3AF', marginLeft: 14 }}>VANCOUVER</span>
          </div>
          <div>
            SYS <span style={{ color: '#9CA3AF', marginLeft: 14 }}>{warp > 0.05 ? 'WARP' : 'CRUISE'}</span>
          </div>
        </div>
        <div style={{ position: 'absolute', right: 40, top: 30, fontSize: 19, letterSpacing: '0.2em' }}>
          <span style={{ color: C.hudDim }}>[</span> HYPERDRIVE <span style={{ color: C.hudDim }}>]</span>
        </div>
        <div style={{ position: 'absolute', left: 40, bottom: 92, opacity: hud }}>
          <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 58, color: '#fff', letterSpacing: '0.04em' }}>MANAV ACHARYA</div>
          <div style={{ fontSize: 17, letterSpacing: '0.3em', marginTop: 10, color: '#C9CCD2' }}>
            SOFTWARE ENGINEER <span style={{ color: C.orange }}>·</span> FULL-STACK <span style={{ color: C.orange }}>·</span> AI{' '}
            <span style={{ color: C.orange }}>·</span> CLOUD
          </div>
        </div>
        <div style={{ position: 'absolute', left: 40, width: 560, bottom: 34, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12, fontSize: 17 }}>
          <span style={{ color: C.cyan }}>manav@world</span> <span style={{ color: C.hudDim }}>:~$</span> {typed.slice(0, chars)}
          <span style={{ opacity: Math.sin(theta * 12) > 0 ? 1 : 0, color: C.hud }}>▍</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const fmt = (v: number) => `${v < 0 ? '-' : '+'}${Math.abs(v).toFixed(1).padStart(4, '0')}`
