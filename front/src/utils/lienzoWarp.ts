export interface PuntoLienzo {
  x: number;
  y: number;
}

export type LadoLienzo = 'top' | 'right' | 'bottom' | 'left';

export interface EsquinasLienzo {
  tl: PuntoLienzo;
  tr: PuntoLienzo;
  br: PuntoLienzo;
  bl: PuntoLienzo;
}

export type IntermediosLienzo = Record<LadoLienzo, PuntoLienzo[]>;

const RESOLUCION_MALLA = 32;
const MAX_DIMENSION_SALIDA = 2200;
const MIN_DIMENSION_SALIDA = 120;

export function esquinasPorDefecto(anchoNatural: number, altoNatural: number): EsquinasLienzo {
  const margenX = anchoNatural * 0.08;
  const margenY = altoNatural * 0.08;
  return {
    tl: { x: margenX, y: margenY },
    tr: { x: anchoNatural - margenX, y: margenY },
    br: { x: anchoNatural - margenX, y: altoNatural - margenY },
    bl: { x: margenX, y: altoNatural - margenY },
  };
}

/** Devuelve los puntos de un lado (esquina a esquina, con sus nodos intermedios en medio) en la
 * dirección que usa `interpolarCoons` para parametrizar u/v — no es la dirección de dibujo del
 * contorno completo, ver `contornoCompleto`. */
export function puntosDeLado(esquinas: EsquinasLienzo, intermedios: IntermediosLienzo, lado: LadoLienzo): PuntoLienzo[] {
  switch (lado) {
    case 'top':
      return [esquinas.tl, ...intermedios.top, esquinas.tr];
    case 'bottom':
      return [esquinas.bl, ...intermedios.bottom, esquinas.br];
    case 'left':
      return [esquinas.tl, ...intermedios.left, esquinas.bl];
    case 'right':
      return [esquinas.tr, ...intermedios.right, esquinas.br];
  }
}

/** Contorno cerrado en sentido horario, para dibujar el área seleccionada (distinto del orden de
 * `puntosDeLado`, pensado para la parametrización u/v de la malla, no para dibujo). */
export function contornoCompleto(esquinas: EsquinasLienzo, intermedios: IntermediosLienzo): PuntoLienzo[] {
  return [
    esquinas.tl,
    ...intermedios.top,
    esquinas.tr,
    ...intermedios.right,
    esquinas.br,
    ...[...intermedios.bottom].reverse(),
    esquinas.bl,
    ...[...intermedios.left].reverse(),
  ];
}

function distancia(a: PuntoLienzo, b: PuntoLienzo): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function largoPolilinea(puntos: PuntoLienzo[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) total += distancia(puntos[i - 1], puntos[i]);
  return total;
}

function puntoEnPolilinea(puntos: PuntoLienzo[], t: number): PuntoLienzo {
  const acumuladas = [0];
  for (let i = 1; i < puntos.length; i++) {
    acumuladas.push(acumuladas[i - 1] + distancia(puntos[i - 1], puntos[i]));
  }
  const total = acumuladas[acumuladas.length - 1];
  if (total === 0) return puntos[0];

  const objetivo = t * total;
  for (let i = 1; i < puntos.length; i++) {
    if (objetivo <= acumuladas[i] || i === puntos.length - 1) {
      const largoSegmento = acumuladas[i] - acumuladas[i - 1] || 1;
      const localT = Math.min(1, Math.max(0, (objetivo - acumuladas[i - 1]) / largoSegmento));
      return {
        x: puntos[i - 1].x + (puntos[i].x - puntos[i - 1].x) * localT,
        y: puntos[i - 1].y + (puntos[i].y - puntos[i - 1].y) * localT,
      };
    }
  }
  return puntos[puntos.length - 1];
}

/** Interpolación transfinita (parche de Coons): mapea un punto (u,v) del rectángulo de salida
 * (0..1 en ambos ejes) al punto correspondiente dentro del área fuente delimitada por las cuatro
 * curvas de borde — cada lado puede tener nodos intermedios que lo curvan para no cortar en línea
 * recta cuando el ángulo de toma deja productos fuera de un lado. */
export function interpolarCoons(esquinas: EsquinasLienzo, intermedios: IntermediosLienzo, u: number, v: number): PuntoLienzo {
  const { tl, tr, br, bl } = esquinas;
  const arriba = puntoEnPolilinea(puntosDeLado(esquinas, intermedios, 'top'), u);
  const abajo = puntoEnPolilinea(puntosDeLado(esquinas, intermedios, 'bottom'), u);
  const izquierda = puntoEnPolilinea(puntosDeLado(esquinas, intermedios, 'left'), v);
  const derecha = puntoEnPolilinea(puntosDeLado(esquinas, intermedios, 'right'), v);

  const x =
    (1 - v) * arriba.x + v * abajo.x + (1 - u) * izquierda.x + u * derecha.x -
    ((1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + (1 - u) * v * bl.x + u * v * br.x);
  const y =
    (1 - v) * arriba.y + v * abajo.y + (1 - u) * izquierda.y + u * derecha.y -
    ((1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + (1 - u) * v * bl.y + u * v * br.y);

  return { x, y };
}

/** Usa el largo de arco de cada lado (no la distancia recta esquina-a-esquina) para que el
 * rectángulo de salida refleje el área real delimitada, aunque un lado esté curvado por nodos
 * intermedios que la alejan de la línea recta entre sus dos esquinas. */
export function calcularDimensionesSalida(esquinas: EsquinasLienzo, intermedios: IntermediosLienzo): { ancho: number; alto: number } {
  const anchoArriba = largoPolilinea(puntosDeLado(esquinas, intermedios, 'top'));
  const anchoAbajo = largoPolilinea(puntosDeLado(esquinas, intermedios, 'bottom'));
  const altoIzquierda = largoPolilinea(puntosDeLado(esquinas, intermedios, 'left'));
  const altoDerecha = largoPolilinea(puntosDeLado(esquinas, intermedios, 'right'));

  const anchoBase = Math.max(anchoArriba, anchoAbajo);
  const altoBase = Math.max(altoIzquierda, altoDerecha);
  const escala = Math.min(1, MAX_DIMENSION_SALIDA / Math.max(anchoBase, altoBase, 1));

  return {
    ancho: Math.max(MIN_DIMENSION_SALIDA, Math.round(anchoBase * escala)),
    alto: Math.max(MIN_DIMENSION_SALIDA, Math.round(altoBase * escala)),
  };
}

function invertir3x3(m: number[][]): number[][] | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-9) return null;
  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

interface MatrizAfin {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** Matriz afín que mapea el triángulo fuente (s0,s1,s2) sobre el triángulo destino (d0,d1,d2) —
 * pieza base para deformar la imagen en parches planos, ya que Canvas2D no soporta
 * transformaciones proyectivas de forma nativa (ver `aplanarImagen`). */
function matrizAfinPorTriangulo(
  s0: PuntoLienzo,
  s1: PuntoLienzo,
  s2: PuntoLienzo,
  d0: PuntoLienzo,
  d1: PuntoLienzo,
  d2: PuntoLienzo,
): MatrizAfin | null {
  const inv = invertir3x3([
    [s0.x, s0.y, 1],
    [s1.x, s1.y, 1],
    [s2.x, s2.y, 1],
  ]);
  if (!inv) return null;

  const u = [d0.x, d1.x, d2.x];
  const v = [d0.y, d1.y, d2.y];
  const combinar = (fila: number[], valores: number[]) => fila[0] * valores[0] + fila[1] * valores[1] + fila[2] * valores[2];

  return {
    a: combinar(inv[0], u), c: combinar(inv[1], u), e: combinar(inv[2], u),
    b: combinar(inv[0], v), d: combinar(inv[1], v), f: combinar(inv[2], v),
  };
}

function expandirTriangulo(p0: PuntoLienzo, p1: PuntoLienzo, p2: PuntoLienzo, eps = 0.75): PuntoLienzo[] {
  const cx = (p0.x + p1.x + p2.x) / 3;
  const cy = (p0.y + p1.y + p2.y) / 3;
  return [p0, p1, p2].map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const largo = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / largo) * eps, y: p.y + (dy / largo) * eps };
  });
}

function dibujarTrianguloWarp(
  ctx: CanvasRenderingContext2D,
  imagen: CanvasImageSource,
  s0: PuntoLienzo, s1: PuntoLienzo, s2: PuntoLienzo,
  d0: PuntoLienzo, d1: PuntoLienzo, d2: PuntoLienzo,
) {
  const m = matrizAfinPorTriangulo(s0, s1, s2, d0, d1, d2);
  if (!m) return;

  // Se expande levemente el triángulo destino (no el fuente) para tapar las costuras de
  // antialiasing entre triángulos vecinos — la transformación sigue siendo válida un poco más
  // allá del triángulo original.
  const [e0, e1, e2] = expandirTriangulo(d0, d1, d2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(e0.x, e0.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.drawImage(imagen, 0, 0);
  ctx.restore();
}

/** Endereza la región delimitada por `esquinas`/`intermedios` a un rectángulo recto: subdivide la
 * región en una malla y dibuja cada celda como dos triángulos con su propia transformación afín,
 * usando `interpolarCoons` para ubicar los puntos fuente de cada celda de la malla. */
export function aplanarImagen(imagen: HTMLImageElement, esquinas: EsquinasLienzo, intermedios: IntermediosLienzo): HTMLCanvasElement {
  const { ancho, alto } = calcularDimensionesSalida(esquinas, intermedios);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el lienzo de salida.');

  const n = RESOLUCION_MALLA;
  const malla: PuntoLienzo[][] = [];
  for (let j = 0; j <= n; j++) {
    const fila: PuntoLienzo[] = [];
    for (let i = 0; i <= n; i++) {
      fila.push(interpolarCoons(esquinas, intermedios, i / n, j / n));
    }
    malla.push(fila);
  }

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const d00 = { x: (i / n) * ancho, y: (j / n) * alto };
      const d10 = { x: ((i + 1) / n) * ancho, y: (j / n) * alto };
      const d01 = { x: (i / n) * ancho, y: ((j + 1) / n) * alto };
      const d11 = { x: ((i + 1) / n) * ancho, y: ((j + 1) / n) * alto };
      const s00 = malla[j][i];
      const s10 = malla[j][i + 1];
      const s01 = malla[j + 1][i];
      const s11 = malla[j + 1][i + 1];

      dibujarTrianguloWarp(ctx, imagen, s00, s10, s11, d00, d10, d11);
      dibujarTrianguloWarp(ctx, imagen, s00, s11, s01, d00, d11, d01);
    }
  }

  return canvas;
}
