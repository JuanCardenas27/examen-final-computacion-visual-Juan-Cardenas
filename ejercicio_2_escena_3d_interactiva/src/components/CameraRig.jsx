import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * Aplica los presets de cámara seleccionados por botón, con una transición
 * suave. Mueve la cámara y el objetivo de OrbitControls; al terminar libera el
 * control para que el usuario pueda seguir orbitando con el ratón.
 *
 * Se reacciona a `camPulse` (un contador que sube en CADA clic) y no solo al
 * nombre de la vista, de modo que volver a pulsar el mismo botón —aunque ya
 * estés en esa vista o hayas orbitado— vuelve a recolocar la cámara.
 */
const VISTAS = {
  orbita:   { pos: [7, 5, 8],     target: [0.5, 1, 0.6] },
  superior: { pos: [0.5, 12, 0.6], target: [0.5, 0.5, 0.6] },
  brazo:    { pos: [2.5, 2.6, 4],  target: [0.6, 1.6, 0.8] },
};

export default function CameraRig() {
  const { camera, controls } = useThree();
  const cameraView = useStore((s) => s.cameraView);
  const camPulse = useStore((s) => s.camPulse);

  // Destino activo de la transición (null = sin transición; control libre).
  const destino = useRef(null);

  useEffect(() => {
    const v = VISTAS[cameraView] ?? VISTAS.orbita;
    destino.current = {
      pos: new THREE.Vector3(...v.pos),
      target: new THREE.Vector3(...v.target),
    };
  }, [cameraView, camPulse]);

  useFrame((_, dt) => {
    const d = destino.current;
    if (!d) return;
    const k = Math.min(1, dt * 4);
    camera.position.lerp(d.pos, k);
    if (controls) {
      controls.target.lerp(d.target, k);
      controls.update();
    } else {
      camera.lookAt(d.target);
    }
    // Al llegar cerca, termina la transición y devuelve el control al usuario.
    if (camera.position.distanceTo(d.pos) < 0.03) destino.current = null;
  });

  return null;
}
