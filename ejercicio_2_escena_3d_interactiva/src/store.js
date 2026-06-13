import { create } from 'zustand';

/**
 * Estado compartido de la escena.
 *
 * Solo guarda valores de UI y configuración que cambian con baja frecuencia
 * (toggles, sliders, selección). La animación por frame NO pasa por aquí: se
 * resuelve con refs mutables dentro de useFrame para evitar re-renders.
 */
export const useStore = create((set) => ({
  // --- Ciclo automático de pick-and-place ---
  auto: true,
  toggleAuto: () => set((s) => ({ auto: !s.auto })),

  // --- Banda transportadora ---
  beltSpeed: 1.0, // multiplicador de velocidad

  // --- Brazo robótico: modo manual con sliders ---
  manualArm: false,
  joints: { base: 0, shoulder: -0.6, elbow: 1.2, wrist: 0.4, gripper: 1 },
  setJoint: (name, value) =>
    set((s) => ({ joints: { ...s.joints, [name]: value } })),

  // --- Iluminación ---
  lightsOn: true,
  toggleLights: () => set((s) => ({ lightsOn: !s.lightsOn })),

  // --- Cámara ---
  cameraView: 'orbita', // 'orbita' | 'superior' | 'brazo'
  camPulse: 0, // sube en cada clic para forzar la recolocación aunque no cambie la vista
  setCameraView: (v) => set((s) => ({ cameraView: v, camPulse: s.camPulse + 1 })),

  // --- Selección por clic del ratón ---
  selected: null,
  setSelected: (name) => set({ selected: name }),

  // --- Etiqueta de la fase actual (solo para el HUD) ---
  fase: 'inicio',
  setFase: (fase) => set({ fase }),

  // Helpers para que leva escriba la configuración de una sola vez
  setConfig: (partial) => set(partial),
}));
