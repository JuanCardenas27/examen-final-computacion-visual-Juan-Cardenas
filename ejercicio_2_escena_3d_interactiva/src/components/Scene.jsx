import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

import Factory from './Factory';
import Lights from './Lights';
import RoboticArm from './RoboticArm';
import ConveyorBelt from './ConveyorBelt';
import MobileRobot from './MobileRobot';
import CameraRig from './CameraRig';
import { useStore } from '../store';
import { useKeyboard } from '../hooks/useKeyboard';
import { BELT, PALLET, BOX_SIZE, AGV_PICKUP_RADIUS } from '../layout';

// --- Poses del brazo (radianes). gripper: 1 = abierta, ~0.1 = cerrada ---
const POSE = {
  HOME:      { base: 0,    shoulder: -0.5, elbow: 1.2,  wrist: 0.3,  gripper: 1 },
  PICK_DOWN: { base: 0,    shoulder: 0.5,  elbow: 0.55, wrist: 0.55, gripper: 1 },
  LIFT:      { base: 0,    shoulder: 0.0,  elbow: 0.95, wrist: 0.4,  gripper: 0.12 },
  DROP_OVER: { base: 1.5,  shoulder: 0.15, elbow: 0.9,  wrist: 0.45, gripper: 0.12 },
  DROP_DOWN: { base: 1.5,  shoulder: 0.5,  elbow: 0.6,  wrist: 0.55, gripper: 0.12 },
};

const HALF = BOX_SIZE / 2;

export default function Scene() {
  const armApi = useRef();         // expone la punta de la pinza
  const agvRef = useRef();         // grupo del robot móvil
  const boxRef = useRef();         // caja activa
  const target = useRef({ ...POSE.HOME }); // objetivo de ángulos del brazo

  const keys = useKeyboard();

  // Estado mutable del ciclo (sin re-renders)
  const sim = useRef({
    phase: 'feed',
    t: 0,
    boxPhase: 'belt', // 'belt' | 'carried' | 'pallet' | 'agv'
    beltX: BELT.startX,
    palletWait: 0,
    agvCarry: 0,
    entregadas: 0,
    lastFase: '',
  });

  const tmp = useRef(new THREE.Vector3()).current;

  // Copia una pose al objetivo
  const setPose = (p, gripperOverride) => {
    target.current.base = p.base;
    target.current.shoulder = p.shoulder;
    target.current.elbow = p.elbow;
    target.current.wrist = p.wrist;
    target.current.gripper = gripperOverride ?? p.gripper;
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // estabilidad si baja el framerate
    const st = useStore.getState();
    const s = sim.current;

    // -------- MODO MANUAL: los sliders controlan el brazo --------
    if (st.manualArm) {
      const j = st.joints;
      target.current.base = j.base;
      target.current.shoulder = j.shoulder;
      target.current.elbow = j.elbow;
      target.current.wrist = j.wrist;
      target.current.gripper = j.gripper;
      if (s.lastFase !== 'manual') { st.setFase('manual'); s.lastFase = 'manual'; }
    } else if (st.auto) {
      // -------- CICLO AUTOMÁTICO (máquina de estados) --------
      s.t += dt;
      const belt = st.beltSpeed;

      switch (s.phase) {
        case 'feed': // la banda acerca la caja al punto de recogida
          setPose(POSE.HOME);
          s.beltX += belt * 1.2 * dt;
          if (s.beltX >= BELT.pickX) {
            s.beltX = BELT.pickX;
            s.phase = 'reach'; s.t = 0;
          }
          break;
        case 'reach': // el brazo baja sobre la caja
          setPose(POSE.PICK_DOWN);
          if (s.t > 1.1) { s.phase = 'grab'; s.t = 0; }
          break;
        case 'grab': // cierra la pinza
          setPose(POSE.PICK_DOWN, 0.12);
          if (s.t > 0.5) { s.boxPhase = 'carried'; s.phase = 'lift'; s.t = 0; }
          break;
        case 'lift': // levanta la caja
          setPose(POSE.LIFT);
          if (s.t > 0.8) { s.phase = 'swing'; s.t = 0; }
          break;
        case 'swing': // gira hacia el pallet de salida
          setPose(POSE.DROP_OVER);
          if (s.t > 1.3) { s.phase = 'down'; s.t = 0; }
          break;
        case 'down': // baja sobre el pallet
          setPose(POSE.DROP_DOWN);
          if (s.t > 0.6) { s.boxPhase = 'pallet'; s.phase = 'release'; s.t = 0; s.palletWait = 0; }
          break;
        case 'release': // abre la pinza, suelta la caja
          setPose(POSE.DROP_DOWN, 1);
          if (s.t > 0.5) { s.phase = 'return'; s.t = 0; }
          break;
        case 'return': // vuelve al inicio
          setPose(POSE.HOME);
          if (s.t > 1.0) { s.phase = 'idle'; s.t = 0; }
          break;
        case 'idle': // espera a que el AGV recoja (o auto-entrega tras 6 s)
          setPose(POSE.HOME);
          s.palletWait += dt;
          if (s.boxPhase === 'agv') {
            // recogida por el robot móvil controlado por el usuario
          } else if (s.palletWait > 6) {
            s.entregadas += 1; s.phase = 'respawn'; s.t = 0;
          }
          break;
        case 'respawn': // nueva caja en la banda
          s.boxPhase = 'belt'; s.beltX = BELT.startX;
          s.phase = 'feed'; s.t = 0;
          break;
        default: break;
      }

      const etiqueta = { feed: 'alimentando banda', reach: 'descendiendo', grab: 'agarrando',
        lift: 'elevando', swing: 'girando al pallet', down: 'depositando',
        release: 'soltando', return: 'regresando', idle: 'esperando AGV', respawn: 'nueva caja' }[s.phase];
      if (etiqueta && s.lastFase !== etiqueta) { st.setFase(etiqueta); s.lastFase = etiqueta; }
    } else {
      // pausa total
      setPose(POSE.HOME);
      if (s.lastFase !== 'pausa') { st.setFase('pausa'); s.lastFase = 'pausa'; }
    }

    // -------- Recogida de la caja por el AGV cuando se acerca al pallet --------
    if (s.boxPhase === 'pallet' && agvRef.current) {
      const dx = agvRef.current.position.x - PALLET.x;
      const dz = agvRef.current.position.z - PALLET.z;
      if (Math.hypot(dx, dz) < AGV_PICKUP_RADIUS) {
        s.boxPhase = 'agv'; s.agvCarry = 0;
        s.entregadas += 1;
      }
    }
    // Una vez sobre el AGV, si se aleja del pallet se considera entregada
    if (s.boxPhase === 'agv' && agvRef.current) {
      s.agvCarry += dt;
      const dx = agvRef.current.position.x - PALLET.x;
      const dz = agvRef.current.position.z - PALLET.z;
      if (Math.hypot(dx, dz) > 2.5 || s.agvCarry > 6) {
        s.phase = 'respawn'; // reinicia la línea
      }
    }

    // -------- Posición de la caja según su fase --------
    if (boxRef.current) {
      const b = boxRef.current;
      if (s.boxPhase === 'belt') {
        b.position.set(s.beltX, BELT.topY + HALF, BELT.z);
        b.rotation.set(0, 0, 0);
      } else if (s.boxPhase === 'carried' && armApi.current?.tip.current) {
        armApi.current.tip.current.getWorldPosition(tmp);
        b.position.set(tmp.x, tmp.y - HALF - 0.04, tmp.z);
      } else if (s.boxPhase === 'pallet') {
        b.position.set(PALLET.x, PALLET.topY + 0.06 + HALF, PALLET.z);
      } else if (s.boxPhase === 'agv' && agvRef.current) {
        const a = agvRef.current.position;
        b.position.set(a.x, 0.5 + HALF, a.z);
        b.rotation.y = agvRef.current.rotation.y;
      }
    }
  });

  return (
    <>
      <CameraRig />
      <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={22}
        maxPolarAngle={Math.PI / 2.05} />

      <Lights on={useStore((s) => s.lightsOn)} />

      <Factory />
      <RoboticArm ref={armApi} target={target} />
      <ConveyorBelt />
      <MobileRobot ref={agvRef} keys={keys} />

      {/* Caja activa del ciclo */}
      <mesh ref={boxRef} castShadow position={[BELT.startX, BELT.topY + HALF, BELT.z]}>
        <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
        <meshStandardMaterial color="#c77b3b" roughness={0.7} metalness={0.1} />
      </mesh>

      <ContactShadows position={[0, 0.02, 0]} opacity={0.5} scale={20} blur={2.2} far={8} />
    </>
  );
}
