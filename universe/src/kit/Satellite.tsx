import { Color } from 'three'

const hull = '#8a8f99'
const panel = '#3b4a66'
const blink = new Color('#ff6b1a').multiplyScalar(3)

/** A small low-poly probe: hull, two solar wings, a dish and a beacon that blinks on the loop. */
export function Satellite({ on, scale = 1 }: { on: number; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.5, 0.36, 0.36]} />
        <meshStandardMaterial color={hull} metalness={0.7} roughness={0.35} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.78, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.95, 0.02, 0.34]} />
            <meshStandardMaterial color={panel} metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[-side * 0.5, 0, 0]}>
            <boxGeometry args={[0.1, 0.03, 0.03]} />
            <meshStandardMaterial color={hull} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.27, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.12, 12, 1, true]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} side={2} />
      </mesh>
      <mesh position={[0.18, -0.2, 0.16]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color={blink} toneMapped={false} transparent opacity={on} />
      </mesh>
    </group>
  )
}
