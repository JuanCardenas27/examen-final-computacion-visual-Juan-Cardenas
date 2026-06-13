import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';

/**
 * Robot móvil autónomo (AGV) controlado por el usuario con el TECLADO.
 *  - Avanza/retrocede en la dirección a la que mira y gira sobre su eje.
 *  - Las ruedas giran proporcionalmente al avance.
 *  - Cuando se acerca al pallet recoge la caja depositada por el brazo
 *    (la lógica de enganche vive en el director, que lee este grupo por ref).
 *
 * Se expone el grupo raíz mediante ref para que el director conozca su
 * posición y pueda "pegar" la caja encima de la plataforma.
 */
const VEL = 3.2; // m/s
const GIRO = 2.2; // rad/s

const MobileRobot = forwardRef(function MobileRobot({ keys }, ref) {
  const wheels = useRef([]);

  const setSelected = useStore((s) => s.setSelected);
  const selected = useStore((s) => s.selected);
  const resaltado = selected === 'Robot móvil (AGV)';

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = keys.current;
    let mov = 0;
    if (k.forward) mov += 1;
    if (k.backward) mov -= 1;
    let giro = 0;
    if (k.left) giro += 1;
    if (k.right) giro -= 1;

    g.rotation.y += giro * GIRO * dt;
    if (mov !== 0) {
      const d = mov * VEL * dt;
      g.position.x += Math.sin(g.rotation.y) * d;
      g.position.z += Math.cos(g.rotation.y) * d;
      // Límite del recinto
      g.position.x = Math.max(-10, Math.min(10, g.position.x));
      g.position.z = Math.max(-6, Math.min(6, g.position.z));
      // Giro de ruedas
      wheels.current.forEach((w) => w && (w.rotation.x += d * 6));
    }
  });

  const cuerpo = {
    color: resaltado ? '#ffe08a' : '#d8dde6',
    metalness: 0.6,
    roughness: 0.4,
    emissive: resaltado ? '#5a4500' : '#000000',
  };

  return (
    <group ref={ref} position={[2.2, 0, 3.4]}
      onPointerDown={(e) => { e.stopPropagation(); setSelected('Robot móvil (AGV)'); }}>
      {/* Chasis */}
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.3, 1.3]} />
        <meshStandardMaterial {...cuerpo} />
      </mesh>
      {/* Plataforma de carga */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.8, 0.08, 1.0]} />
        <meshStandardMaterial color="#3b4049" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Mástil con luz de estado (emisiva) */}
      <mesh position={[0, 0.62, -0.55]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 12]} />
        <meshStandardMaterial color="#41454d" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, -0.55]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={1.6} />
      </mesh>
      {/* Ruedas */}
      {[
        [-0.5, 0.18, 0.45],
        [0.5, 0.18, 0.45],
        [-0.5, 0.18, -0.45],
        [0.5, 0.18, -0.45],
      ].map((p, i) => (
        <mesh
          key={i}
          ref={(el) => (wheels.current[i] = el)}
          position={p}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.18, 0.18, 0.12, 18]} />
          <meshStandardMaterial color="#15181d" metalness={0.2} roughness={0.85} />
        </mesh>
      ))}
      {/* Flecha indicadora de "frente" */}
      <mesh position={[0, 0.46, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.2, 12]} />
        <meshStandardMaterial color="#7fb4ff" emissive="#1b3a66" />
      </mesh>
    </group>
  );
});

export default MobileRobot;
