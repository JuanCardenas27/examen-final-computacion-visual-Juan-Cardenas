import { PALLET } from '../layout';

/**
 * Entorno estático de la fábrica: suelo, paredes, vigas de techo, rejas de
 * seguridad y la mesa/pallet de salida. Todo con materiales PBR
 * (meshStandardMaterial con metalness/roughness).
 */
export default function Factory() {
  return (
    <group>
      {/* Suelo de hormigón pulido */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Franja de demarcación amarilla alrededor de la celda del brazo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.7, 2.95, 48]} />
        <meshStandardMaterial color="#f2b705" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Pared trasera */}
      <mesh position={[0, 4, -8]} receiveShadow>
        <boxGeometry args={[40, 8, 0.4]} />
        <meshStandardMaterial color="#2a2e36" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Pared lateral izquierda */}
      <mesh position={[-12, 4, 0]} receiveShadow>
        <boxGeometry args={[0.4, 8, 40]} />
        <meshStandardMaterial color="#2a2e36" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Vigas de techo metálicas */}
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, 7.8, -2]} castShadow>
          <boxGeometry args={[0.4, 0.4, 14]} />
          <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}

      {/* Mesa / pallet de salida donde el brazo deposita las cajas */}
      <group position={[PALLET.x, 0, PALLET.z]}>
        <mesh position={[0, PALLET.topY, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.12, 1.2]} />
          <meshStandardMaterial color="#8a8f98" roughness={0.5} metalness={0.7} />
        </mesh>
        {[
          [-0.5, -0.5],
          [0.5, -0.5],
          [-0.5, 0.5],
          [0.5, 0.5],
        ].map(([px, pz], i) => (
          <mesh key={i} position={[px, PALLET.topY / 2, pz]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, PALLET.topY, 12]} />
            <meshStandardMaterial color="#55585f" roughness={0.4} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Cajas decorativas apiladas al fondo */}
      <group position={[-5, 0, -5]}>
        {[
          [0, 0.4, 0],
          [0.85, 0.4, 0],
          [0.42, 1.22, 0],
        ].map((p, i) => (
          <mesh key={i} position={p} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color="#9c6b3f" roughness={0.8} metalness={0.05} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
