import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing'
import { HalfFloatType } from 'three'

/**
 * The site's high-quality post stack (bloom, AgX tone mapping, vignette), built directly on
 * postprocessing so it is ready on the very first frame Remotion asks for. Grain is left out:
 * GIFs can't afford it.
 */
export function Post({ bloom = 1.5, threshold = 0.2, vignette = 0.8 }: { bloom?: number; threshold?: number; vignette?: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 4 })
    c.addPass(new RenderPass(scene, camera))
    c.addPass(
      new EffectPass(
        camera,
        new BloomEffect({ intensity: bloom, luminanceThreshold: threshold, luminanceSmoothing: 0.9, mipmapBlur: true }),
        new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
        new VignetteEffect({ eskil: false, offset: 0.1, darkness: vignette }),
      ),
    )
    return c
  }, [gl, scene, camera, bloom, threshold, vignette])
  useMemo(() => composer.setSize(size.width, size.height), [composer, size.width, size.height])
  useEffect(() => () => composer.dispose(), [composer])
  // Priority 1 takes over from R3F's own render; this runs inside Remotion's advance(), not on a clock
  useFrame(() => composer.render(), 1)
  return null
}
