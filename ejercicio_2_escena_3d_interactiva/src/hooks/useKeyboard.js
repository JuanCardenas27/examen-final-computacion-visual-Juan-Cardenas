import { useEffect, useRef } from 'react';

/**
 * Hook de teclado. Devuelve un ref con el estado (presionado/no) de cada
 * tecla relevante, sin provocar re-renders (se lee dentro de useFrame).
 *
 * Controles del robot móvil (AGV):
 *   W / ArrowUp    -> adelante
 *   S / ArrowDown  -> atrás
 *   A / ArrowLeft  -> girar a la izquierda
 *   D / ArrowRight -> girar a la derecha
 */
export function useKeyboard() {
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const mapa = {
      KeyW: 'forward',
      ArrowUp: 'forward',
      KeyS: 'backward',
      ArrowDown: 'backward',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
    };

    const down = (e) => {
      const accion = mapa[e.code];
      if (accion) {
        keys.current[accion] = true;
        // Evita que las flechas hagan scroll de la página
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
    };
    const up = (e) => {
      const accion = mapa[e.code];
      if (accion) keys.current[accion] = false;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return keys;
}
