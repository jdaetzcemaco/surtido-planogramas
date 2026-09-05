import { useEffect, useState } from 'react';
import type { TemaLienzo } from '../domain/lienzo/lienzo.types';

const CLAVE_STORAGE = 'lienzo:tema';

function leerTemaGuardado(): TemaLienzo {
  try {
    return window.localStorage.getItem(CLAVE_STORAGE) === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    // localStorage puede no estar disponible (navegación privada, permisos del navegador) — el
    // Lienzo simplemente arranca en modo claro en ese caso, sin recordar la preferencia.
    return 'claro';
  }
}

/**
 * Tema claro/oscuro exclusivo de la vista Lienzo — el resto de la aplicación sigue usando
 * únicamente el tema claro de siempre (`styles/tokens.css`), sin cambios. Se recuerda en
 * `localStorage` para que el usuario no tenga que volver a elegirlo cada vez que entra.
 */
export function useTemaLienzo() {
  const [tema, setTema] = useState<TemaLienzo>(leerTemaGuardado);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_STORAGE, tema);
    } catch {
      // Ver comentario de leerTemaGuardado — si no se puede persistir, el toggle sigue
      // funcionando para la sesión actual, solo no sobrevive a un refresh.
    }
  }, [tema]);

  function alternarTema() {
    setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro'));
  }

  return { tema, alternarTema };
}
