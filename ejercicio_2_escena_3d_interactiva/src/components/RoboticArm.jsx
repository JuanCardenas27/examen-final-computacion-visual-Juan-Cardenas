import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * Brazo robótico industrial de 4 ejes con pinza.
 *
 * Demuestra la JERARQUÍA de objetos y las TRANSFORMACIONES anidadas:
 *   base (rotación Y) → hombro (rot X) → codo (rot X) → muñeca (rot X) → pinza
 * Cada grupo hereda la transformación de su padre.
 *
 * No decide la animación: cada frame interpola (lerp) sus ángulos hacia los
 * objetivos que le entrega el director de la escena mediante `target`
 * (un ref con {base, shoulder, elbow, wrist, gripper}). Expone hacia afuera,
 * vía ref, el Object3D de la PUNTA de la pinza para que el director pueda
 * "pegar" la caja a la pinza durante el transporte.
 */
const LERP_SPEED = 7;

const RoboticArm = forwardRef(function RoboticArm({ target }, ref) {
  const baseRef = useRef();
  const shoulderRef = useRef();
  const elbowRef = useRef();
  const wristRef = useRef();
  const fingerL = useRef();
  const fingerR = useRef();
  const tipRef = useRef();

  const setSelected = useStore((s) => s.setSelected);
  const selected = useStore((s) => s.selected);
  const resaltado = selected === 'Brazo robótico';

  // Exponemos la punta de la pinza al director.
  useImperativeHandle(ref, () => ({ tip: tipRef }), []);

  useFrame((_, dt) => {
    const t = target.current;
    const k = Math.min(1, dt * LERP_SPEED);
    if (baseRef.current)
      baseRef.current.rotation.y = THREE.MathUtils.lerp(
        baseRef.current.rotation.y, t.base, k);
    if (shoulderRef.current)
      shoulderRef.current.rotation.x = THREE.MathUtils.lerp(
        shoulderRef.current.rotation.x, t.shoulder, k);
    if (elbowRef.current)
      elbowRef.current.rotation.x = THREE.MathUtils.lerp(
        elbowRef.current.rotation.x, t.elbow, k);
    if (wristRef.current)
      wristRef.current.rotation.x = THREE.MathUtils.lerp(
        wristRef.current.rotation.x, t.wrist, k);

    // Apertura de la pinza (escala/posición de los dedos): 1 = abierta.
    const gap = 0.05 + 0.11 * THREE.MathUtils.clamp(t.gripper, 0, 1);
    if (fingerL.current) fingerL.current.position.x = THREE.MathUtils.lerp(
      fingerL.current.position.x, -gap, k);
    if (fingerR.current) fingerR.current.position.x = THREE.MathUtils.lerp(
      fingerR.current.position.x, gap, k);
  });

  const metal = {
    color: resaltado ? '#ffe08a' : '#c9ced6',
    metalness: 0.9,
    roughness: 0.35,
    emissive: resaltado ? '#5a4500' : '#000000',
  };
  const oscuro = { color: '#3b4049', metalness: 0.8, roughness: 0.4 };
  const acento = { color: '#f48c06', metalness: 0.6, roughness: 0.5 };

  const onSelect = (e) => {
    e.stopPropagation();
    setSelected('Brazo robótico');
  };

  return (
    <group onPointerDown={onSelect}>
      {/* ----- BASE (rota sobre Y) ----- */}
      <group ref={baseRef}>
        {/* Pedestal */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.65, 0.4, 32]} />
          <meshStandardMaterial {...oscuro} />
        </mesh>
        {/* Torreta giratoria */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.42, 0.35, 32]} />
          <meshStandardMaterial {...metal} />
        </mesh>

        {/* ----- HOMBRO (rota sobre X) ----- */}
        <group ref={shoulderRef} position={[0, 0.72, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 24, 24]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {/* Brazo superior (longitud 1.3 hacia +Y) */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[0.26, 1.3, 0.26]} />
            <meshStandardMaterial {...metal} />
          </mesh>

          {/* ----- CODO (rota sobre X) ----- */}
          <group ref={elbowRef} position={[0, 1.3, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.2, 24, 24]} />
              <meshStandardMaterial {...acento} />
            </mesh>
            {/* Antebrazo (longitud 1.1) */}
            <mesh position={[0, 0.55, 0]} castShadow>
              <boxGeometry args={[0.2, 1.1, 0.2]} />
              <meshStandardMaterial {...metal} />
            </mesh>

            {/* ----- MUÑECA (rota sobre X) ----- */}
            <group ref={wristRef} position={[0, 1.1, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.16, 0.16, 0.2, 20]} />
                <meshStandardMaterial {...oscuro} />
              </mesh>

              {/* ----- PINZA ----- */}
              <group position={[0, 0.18, 0]}>
                {/* Palma */}
                <mesh castShadow>
                  <boxGeometry args={[0.32, 0.1, 0.2]} />
                  <meshStandardMaterial {...acento} />
                </mesh>
                {/* Dedos (se abren/cierran sobre X) */}
                <mesh ref={fingerL} position={[-0.12, 0.16, 0]} castShadow>
                  <boxGeometry args={[0.06, 0.26, 0.16]} />
                  <meshStandardMaterial {...oscuro} />
                </mesh>
                <mesh ref={fingerR} position={[0.12, 0.16, 0]} castShadow>
                  <boxGeometry args={[0.06, 0.26, 0.16]} />
                  <meshStandardMaterial {...oscuro} />
                </mesh>
                {/* Punta: referencia para "pegar" la caja durante el transporte */}
                <object3D ref={tipRef} position={[0, 0.28, 0]} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

export default RoboticArm;
