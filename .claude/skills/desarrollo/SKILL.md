---
name: desarrollo
description: Flujo de desarrollo por etapas para Surtido Planogramas. Empieza con una discusión con el usuario hasta acordar el requerimiento; luego agentes (arquitecto, UX/UI, seguridad e integridad, desarrollador, revisor de calidad), con dos aprobaciones del usuario y entregables guardados por etapa.
argument-hint: <descripción de la solicitud>
disable-model-invocation: true
---

# /desarrollo — flujo de desarrollo por etapas

Tú eres el **coordinador**. No diseñas ni programas: primero conversas con el usuario hasta que el
requerimiento quede claro, luego clasificas la solicitud, lanzas a cada agente con el mínimo
contexto, controlas las aprobaciones y cierras. Toda comunicación en español.

Solicitud: $ARGUMENTS

## Principios de tokens (obligatorios)

- Los agentes se pasan información **por archivos** en la carpeta de trabajo, nunca por la
  conversación. Al lanzar un agente le das solo: la carpeta, la etapa, los archivos que debe leer y la
  base del diff (cuando aplique). No copies contenido de entregables en el prompt.
- Tú no lees los entregables completos. Para presentar algo al usuario, lee solo las secciones que
  necesites (p. ej. “Decisiones” y la lista de tareas del `PLAN.md`).
- Lanza en paralelo (un solo mensaje con varias llamadas a Agent) los agentes independientes.
- Usa siempre los agentes del proyecto por su nombre (`subagent_type`): `arquitecto`, `disenador-ux`,
  `seguridad-integridad`, `desarrollador`, `revisor-calidad`.

## Etapa 0 — Discusión (tú y el usuario)

Antes de lanzar cualquier agente, **platica con el usuario** sobre lo que pidió. El objetivo es que
ambos estén seguros de que entendiste el requerimiento y de que el usuario logró darse a entender.

1. Si no hay solicitud en `$ARGUMENTS`, pídela y detente.
2. Lee lo mínimo para hablar con fundamento (el apartado del módulo en `Arquitectura/ESTADO_MODULOS.md`,
   la pantalla o el endpoint involucrado). No lances agentes en esta etapa.
3. Devuelve al usuario, en tus palabras: qué entendiste (objetivo y para quién), qué cambia en lo que
   ve o hace el usuario final, qué queda fuera, y las **dudas y ambigüedades** concretas (reglas de
   negocio, casos borde, permisos, datos, textos de la UI). Pregunta pocas cosas a la vez y propone
   una respuesta por defecto cuando la tengas.
4. Repite las rondas que hagan falta. Cuando no queden dudas, cierra con un **resumen del acuerdo**
   (qué se hará, criterios de aceptación, fuera de alcance) y pregunta explícitamente si es correcto.

**✋ Acuerdo**: no sigas a la preparación ni a los agentes sin un sí explícito del usuario al resumen.
Si el usuario pide saltar la discusión porque la solicitud ya es clara, confírmalo con el resumen del
acuerdo y sigue.

### Preparación (tú, tras el acuerdo)

1. Verifica `git status`: si hay cambios sin commitear ajenos a esta solicitud, pregunta antes de seguir.
2. Crea la rama `feat/<slug>` desde `develop` y la carpeta
   `Arquitectura/claudeplans/<AAAA-MM-DD>-<slug>/`. Guarda el commit base (`git rev-parse HEAD`).
3. Escribe `00_solicitud.md` con `plantillas/00_solicitud.md`: la solicitud tal cual, el acuerdo de
   la discusión, las preguntas resueltas, tu clasificación y las etapas que aplican. Este archivo es
   lo único que los agentes saben de la conversación: que el acuerdo quede completo ahí.

**Clasificación** (elige la menor que aplique; ante la duda, sube un nivel):

| Tamaño | Cuándo | Etapas |
|---|---|---|
| **S** | Cambio acotado de 1-3 archivos sin endpoints, sin BD y sin permisos (texto, estilo puntual, bug local) | Tú escribes un `PLAN.md` corto → aprobación 1 → desarrollador → revisor-calidad → aprobación 2 |
| **M** | Cambia un módulo existente o una pantalla | Arquitecto (etapas 1+3 en una sola llamada) · UX si hay front · Seguridad si hay endpoints, datos o permisos → aprobación 1 → desarrollo → revisión → aprobación 2 |
| **L** | Módulo nuevo, cambio de modelo de datos, permisos, flujos entre módulos o integraciones | Todas las etapas por separado |

**Seguridad es obligatoria** si se toca: endpoints, consultas, migraciones, autenticación/permisos,
subida o exportación de archivos, integraciones externas.

## Etapa 1 — Impacto (arquitecto)

Lanza `arquitecto`, etapa 1, con la carpeta. En tamaño M pídele en la misma llamada etapa 1 y 3
(si no hay UX ni Seguridad) o solo etapa 1 (si los hay).
Si `01_arquitectura.md` trae **preguntas abiertas**, preséntalas al usuario y espera respuesta antes
de seguir; anótalas resueltas al final de `00_solicitud.md`.

## Etapa 2 — Diseño y seguridad (en paralelo)

Lanza a la vez, según apliquen: `disenador-ux` (etapa diseño) y `seguridad-integridad` (etapa 2).

## Etapa 3 — Plan (arquitecto)

Lanza `arquitecto`, etapa 3. Resultado: `PLAN.md`.

## ✋ Aprobación 1 — Plan

Presenta al usuario, breve: objetivo, decisiones clave, lista de tareas (ID + título), migraciones,
controles de seguridad bloqueantes, componentes/tokens nuevos de UX, fuera de alcance, y la ruta del
`PLAN.md` para que lo lea completo. Pregunta si aprueba. Con cambios pedidos, relanza al arquitecto
(etapa 3) con esos cambios anotados en `00_solicitud.md`. **No sigas sin un sí explícito.**

## Etapa 4 — Implementación (desarrollador)

Lanza `desarrollador` con la carpeta: implementa `PLAN.md` y escribe `04_implementacion.md`.
Si reporta bloqueos de diseño, vuelve al arquitecto (etapa 3) y luego al desarrollador.

## Etapa 5 — Revisión (en paralelo)

Lanza `revisor-calidad` y, si aplica, `seguridad-integridad` (etapa 5), ambos con la base del diff
(`git diff <commit base>` incluyendo archivos nuevos: pídeles revisar también `git status --short`).
- Hallazgos **Bloqueantes o Importantes** → lanza `desarrollador` con la lista de archivos de
  revisión a corregir (“Correcciones ronda N”) y repite la revisión solo de lo corregido.
- **Máximo 2 rondas.** Si después de la segunda quedan bloqueantes, detente y preséntalos al usuario.
- Los **Menores** no regresan al desarrollador: van al cierre como sugerencias.

## ✋ Aprobación 2 — Entrega

Presenta: qué se hizo, resultado de pruebas/lint/build, veredictos de revisión, menores pendientes,
desviaciones del plan, deuda nueva y propuestas al sistema de diseño. Sugiere al usuario probar la
funcionalidad (o pruébala tú con el navegador si es visible). Pregunta si aprueba. **No hagas commit
sin un sí explícito.**

## Etapa 6 — Cierre (tú, tras la aprobación 2)

1. **Commit de código** en `feat/<slug>` con mensaje en el estilo del repo (`add: …` / `fix: …`).
2. **Commit de documentación aparte** (convención del repo: no mezclar código y docs):
   - `CLAUDE.md`: estado de módulos y tabla de migraciones por ambiente si cambiaron.
   - `Arquitectura/DEUDA_TECNICA.md`: deuda nueva de los entregables (siguiente `DT-NN`) y deuda resuelta.
   - `Arquitectura/DISENO_SISTEMA.md` / `tokens.css` / `.stylelintrc.json`: solo propuestas de UX que
     el usuario aprobó.
   - Contratos en `Arquitectura/Contratos/` si cambiaron.
   - Los entregables de la carpeta de trabajo van en este commit.
3. Pregunta si integrar `feat/<slug>` a `develop`. Publicar (push al fork) solo si el usuario lo pide,
   siguiendo `Arquitectura/DESPLIEGUE_AZURE.md`.
