import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls, button, folder } from 'leva';

import Scene from './components/Scene';
import { useStore } from './store';

/**
 * Panel de control (leva). Provee la interacción por SLIDERS y BOTONES y
 * sincroniza sus valores con el store de zustand que consume la escena.
 */
function Panel() {
  const ctrl = useControls({
    Ciclo: folder({
      auto: { value: true, label: 'Ciclo automático' },
      beltSpeed: { value: 1.0, min: 0, max: 3, step: 0.1, label: 'Velocidad banda' },
    }),
    'Brazo (manual)': folder(
      {
        manual: { value: false, label: 'Control manual' },
        base: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
        shoulder: { value: -0.5, min: -1, max: 1.2, step: 0.01 },
        elbow: { value: 1.2, min: -0.3, max: 2, step: 0.01 },
        wrist: { value: 0.3, min: -1, max: 1, step: 0.01 },
        gripper: { value: 1, min: 0.1, max: 1, step: 0.01 },
      },
      { collapsed: true }
    ),
    Cámara: folder({
      'Vista orbital': button(() => useStore.getState().setCameraView('orbita')),
      'Vista superior': button(() => useStore.getState().setCameraView('superior')),
      'Detalle del brazo': button(() => useStore.getState().setCameraView('brazo')),
    }),
    Escena: folder({
      luces: { value: true, label: 'Luces encendidas' },
    }),
  });

  // Sincroniza los valores del panel con el store global.
  useEffect(() => {
    useStore.setState({
      auto: ctrl.auto,
      beltSpeed: ctrl.beltSpeed,
      manualArm: ctrl.manual,
      lightsOn: ctrl.luces,
      joints: {
        base: ctrl.base,
        shoulder: ctrl.shoulder,
        elbow: ctrl.elbow,
        wrist: ctrl.wrist,
        gripper: ctrl.gripper,
      },
    });
  }, [ctrl.auto, ctrl.beltSpeed, ctrl.manual, ctrl.luces,
      ctrl.base, ctrl.shoulder, ctrl.elbow, ctrl.wrist, ctrl.gripper]);

  return null;
}

/** HUD informativo: controles y estado actual del ciclo. */
function Hud() {
  const fase = useStore((s) => s.fase);
  const selected = useStore((s) => s.selected);
  return (
    <div className="hud">
      <h1>Controles</h1>
      <div>
        <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / flechas — mover el robot móvil (AGV)
      </div>
      <div>Ratón: arrastrar = orbitar · rueda = zoom · clic = seleccionar</div>
      <div>Panel (arriba dcha.): sliders del brazo, velocidad y vistas</div>
      <div className="estado">
        Fase del ciclo: <strong>{fase}</strong>
        <br />
        Seleccionado: <span className="selected">{selected ?? 'ninguno'}</span>
      </div>
    </div>
  );
}

export default function App() {
  const setSelected = useStore((s) => s.setSelected);

  return (
    <>
      <div className="titulo">
        Fábrica <span>Robótica</span> — Escena 3D interactiva
      </div>
      <Leva collapsed={false} />
      <Panel />
      <Hud />

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [7, 5, 8], fov: 50 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={['#0b0d12']} />
        <fog attach="fog" args={['#0b0d12', 18, 38]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </>
  );
}
