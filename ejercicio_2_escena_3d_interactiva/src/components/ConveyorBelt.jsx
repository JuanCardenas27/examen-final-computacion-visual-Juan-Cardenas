import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';
import { BELT } from '../layout';

/**
 * Banda transportadora. Es estructura estática + dos rodillos que giran y una
 * serie de "tablillas" que se desplazan a lo largo de la banda y se reciclan,
 * dando la sensación de movimiento. La velocidad la controla el usuario desde
 * el panel (store.beltSpeed). También es seleccionable con clic.
 */
const W = 0.8; // ancho de la banda
const NUM_TABLILLAS = 18;

export default function ConveyorBelt() {
  const rollerA = useRef();
  const rollerB = useRef();
  const tablillasRef = useRef([]);

  const setSelected = useStore((s) => s.setSelected);
  const selected = useStore((s) => s.selected);
  const resaltado = selected === 'Banda transportadora';

  const half = BELT.length / 2;
  const yTop = BELT.topY;

  // Posiciones iniciales de las tablillas repartidas a lo largo de la banda
  const tablillas = useMemo(
    () =>
      Array.from({ length: NUM_TABLILLAS }, (_, i) => ({
        x: -half + (i / NUM_TABLILLAS) * BELT.length,
      })),
    [half]
  );

  useFrame((_, dt) => {
    const v = useStore.getState().beltSpeed * 1.2;
    // Rodillos giran (eje alineado con Z tras rotar la geometría)
    const spin = v * dt * 4;
    if (rollerA.current) rollerA.current.rotation.z -= spin;
    if (rollerB.current) rollerB.current.rotation.z -= spin;
    // Tablillas se desplazan en +X y se reciclan
    tablillasRef.current.forEach((m) => {
      if (!m) return;
      m.position.x += v * dt;
      if (m.position.x > half) m.position.x -= BELT.length;
    });
  });

  const gomaColor = resaltado ? '#7a7f3a' : '#1c1f25';

  return (
    <group position={[0, 0, BELT.z]} onPointerDown={(e) => { e.stopPropagation(); setSelected('Banda transportadora'); }}>
      {/* Superficie de la banda (goma) */}
      <mesh position={[0, yTop, 0]} receiveShadow>
        <boxGeometry args={[BELT.length, 0.08, W]} />
        <meshStandardMaterial color={gomaColor} metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Tablillas en movimiento */}
      {tablillas.map((t, i) => (
        <mesh
          key={i}
          ref={(el) => (tablillasRef.current[i] = el)}
          position={[t.x, yTop + 0.05, 0]}
          castShadow
        >
          <boxGeometry args={[0.12, 0.04, W * 0.95]} />
          <meshStandardMaterial color="#2b2f37" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* Marcos laterales */}
      {[-W / 2 - 0.06, W / 2 + 0.06].map((z, i) => (
        <mesh key={i} position={[0, yTop - 0.05, z]} castShadow>
          <boxGeometry args={[BELT.length, 0.18, 0.08]} />
          <meshStandardMaterial color="#5b616e" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}

      {/* Rodillos en los extremos (eje a lo largo de Z) */}
      <mesh ref={rollerA} position={[-half, yTop - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, W + 0.1, 20]} />
        <meshStandardMaterial color="#8a8f98" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh ref={rollerB} position={[half, yTop - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, W + 0.1, 20]} />
        <meshStandardMaterial color="#8a8f98" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Patas de soporte */}
      {[-half + 0.5, 0, half - 0.5].map((x, i) => (
        <group key={i}>
          {[-W / 2, W / 2].map((z, j) => (
            <mesh key={j} position={[x, (yTop - 0.1) / 2, z]} castShadow>
              <boxGeometry args={[0.1, yTop - 0.1, 0.1]} />
              <meshStandardMaterial color="#41454d" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
