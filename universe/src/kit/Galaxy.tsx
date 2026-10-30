import { useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { AdditiveBlending, PerspectiveCamera, Vector3 } from 'three'
import type { Vector3 as V3 } from 'three'
import { galaxyFragment, galaxyVertex } from './galaxyShader'
import { buildGalaxy, type Vec3 } from './universe'

export type GalaxyMode = 'collapse' | 'bang' | 'scatter' | 'galaxy'
const MODE: Record<GalaxyMode, number> = { collapse: 0, bang: 1, scatter: 2, galaxy: 3 }

type Props = {
  theta: number
  period: number
  mode?: GalaxyMode
  transition?: number
  /** Point size relative to the site at 900 px tall */
  pointScale: number
  textSize?: number
  text?: V3[]
  warp?: number
  fade?: number
  /** Brightness per particle type: bg, nebula, cluster, ring, core, beacon */
  gains?: [number, number, number, number, number, number]
  seed?: number
}

/** Every particle of manav.world's galaxy, drawn by its own shaders. */
export function Galaxy({
  theta,
  period,
  mode = 'galaxy',
  transition = 1,
  pointScale,
  textSize = 1.7,
  text,
  warp = 0,
  fade = 1,
  gains = [1, 1, 1, 1, 1, 1],
  seed = 7,
}: Props) {
  const geometry = useMemo(() => buildGalaxy(seed, text), [seed, text])
  const uniforms = useMemo(
    () => ({
      uTheta: { value: 0 },
      uPeriod: { value: period },
      uMode: { value: 3 },
      uTransition: { value: 1 },
      uPointScale: { value: 1 },
      uTextSize: { value: 1.7 },
      uWarp: { value: 0 },
      uFade: { value: 1 },
      uTypeGain: { value: [1, 1, 1, 1, 1, 1] },
    }),
    [period],
  )
  uniforms.uTheta.value = theta
  uniforms.uMode.value = MODE[mode]
  uniforms.uTransition.value = transition
  uniforms.uPointScale.value = pointScale
  uniforms.uTextSize.value = textSize
  uniforms.uWarp.value = warp
  uniforms.uFade.value = fade
  uniforms.uTypeGain.value = gains

  return (
    <points frustumCulled={false} geometry={geometry}>
      <shaderMaterial
        vertexShader={galaxyVertex}
        fragmentShader={galaxyFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

/** Puts the camera where a shot wants it, every frame (no R3F clock involved). */
export function Camera({ position, target, fov, roll = 0 }: { position: Vec3; target: Vec3; fov: number; roll?: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useLayoutEffect(() => {
    camera.position.set(...position)
    camera.up.set(Math.sin(roll), Math.cos(roll), 0)
    camera.lookAt(new Vector3(...target))
    camera.fov = fov
    camera.near = 0.1
    camera.far = 400
    camera.updateProjectionMatrix()
  })
  return null
}
