# CLAUDE.md

Contexto para Claude Code en este repositorio. Se carga en cada sesión y en cada agente: mantenerlo
corto; el detalle vive en los documentos de `Arquitectura/` enlazados abajo.

## Proyecto

Herramienta interna de Cemaco para gestionar planogramas: planogramas → versiones (ciclo borrador →
en desarrollo → piloto → publicado) → góndolas → secciones → niveles → posiciones de SKU, asignación
de versiones a tiendas, consulta para implementadores y captura asistida por foto/IA. Usuarios
autenticados con CAO; catálogo y jerarquía desde CATI.

- **MVP formal**: `front/` (React 19 + TypeScript + Vite) y `back/` (Express 5 + Knex + SQL Server).
- **Piloto de captura original**: `src/main.jsx` en la raíz — ver `Arquitectura/PILOTO_CAPTURA.md`.

Alcance en `ALCANCE_PROYECTO.md`, decisiones e historia en `MEMORIA_PROYECTO.md`, backlog en
`PENDIENTES_PROYECTO.md`. La documentación y los textos de la UI están en español; mantener ese idioma.

Artifact de diseño para prototipado: https://claude.ai/artifact/Fts1Mb1NXDCGQnb7ramEKv?sk=kMWPRZHdQe0T3z4333UJgw

## Comandos

```bash
cd back  && npm install && npm run dev      # API en http://localhost:3000/api/v1 (nodemon)
cd front && npm install && npm run dev      # Vite
cd back  && npm test                        # pruebas node:test (back/test/**)
cd front && npm test                        # pruebas Vitest (front/src/**/*.test.ts)
cd front && npx tsc -b && npm run lint      # tipos + oxlint + stylelint
cd back  && npm run migrate:status          # estado de migraciones (el .env local apunta a DEV)
```

Las versiones de dependencias están fijadas exactas (`.npmrc` con `save-exact=true`) para que local
y el CD de Azure usen lo mismo. Instalar paquetes nuevos con `npm install <paquete>` (queda exacto) y
justificar cada paquete nuevo en el plan.

## Mapa de documentación

| Tema | Documento |
|---|---|
| Estructura y reglas del backend (incluye método para un módulo nuevo) | `Arquitectura/ESTRUCTURA_BACKEND.md` |
| Estructura y reglas del frontend | `Arquitectura/ESTRUCTURA_FRONTEND.md` |
| Sistema de diseño (tokens, componentes base, estados) | `Arquitectura/DISENO_SISTEMA.md` |
| Estado de cada módulo y detalles de implementación | `Arquitectura/ESTADO_MODULOS.md` |
| Endpoints, casos de uso y contratos | `Arquitectura/ENDPOINTS.md`, `Arquitectura/CASOS_DE_USO.md`, `Arquitectura/Contratos/` |
| Modelo de datos | `Arquitectura/MODELO_DATOS_V3.mmd` |
| Pruebas Postman | `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md` |
| Despliegue | `Arquitectura/DESPLIEGUE_AZURE.md` |
| Deuda técnica | `Arquitectura/DEUDA_TECNICA.md` |

## Flujo de desarrollo: `/desarrollo`

Todo cambio funcional pasa por `/desarrollo <solicitud>` (`.claude/skills/desarrollo/SKILL.md`):
**discusión** con el usuario hasta quitar dudas y ambigüedades → ✋ acuerdo → clasificación S/M/L → **arquitecto** (impacto) → **disenador-ux** y **seguridad-integridad** (en
paralelo) → `PLAN.md` → ✋ aprobación del usuario → **desarrollador** → **revisor-calidad** +
seguridad sobre el diff (máx. 2 rondas) → ✋ aprobación → commits de código y de docs por separado.
Los entregables de cada etapa quedan en `Arquitectura/claudeplans/<AAAA-MM-DD>-<slug>/`.
Agentes en `.claude/agents/` (arquitecto, seguridad e integridad y revisor en Opus; UX y desarrollador
en Sonnet).

Guardas automáticas (`.claude/settings.json` → `.claude/hooks/`): se bloquea editar `.env`,
`src/data/realData.js` y el espejo de `postman/`; después de cada edición corre el linter del archivo
tocado (stylelint, oxlint o `node --check`) y devuelve los errores.

## Pruebas

- **Back**: `back/test/**/*.test.js` con `node:test` (sin dependencias). Prioridad: entidades y casos de
  uso con un repositorio falso inyectado (ver `back/test/domain/planograma.test.js`).
- **Front**: `*.test.ts` junto al módulo, con Vitest. Prioridad: `domain/` y `utils/` (lógica pura).
- **Postman**: pruebas manuales por endpoint (sección Backend abajo).
- Los workflows de DEV y PROD corren `npm test` antes de desplegar: si una prueba falla, no se publica.
- Todo cambio de lógica de dominio llega con su prueba.

## Deuda técnica

Lo que sabemos que hay que corregir y se pospone se registra en `Arquitectura/DEUDA_TECNICA.md`
(ID `DT-NN`, severidad, área, estado). Reglas:
- No se agrega deuda nueva sin registrarla; cada agente la reporta en su entregable y el coordinador
  la consolida en el cierre de `/desarrollo`.
- Antes de planear, revisar si el cambio toca una deuda abierta.
- Abiertas críticas/altas hoy: **DT-01** (parcial: permisos aplicados, falta el filtro por tienda) y
  **DT-10** (sin filtro por tienda del usuario).

## Deployment

**Antes de publicar cualquier cambio, leer [Arquitectura/DESPLIEGUE_AZURE.md](Arquitectura/DESPLIEGUE_AZURE.md).**
Ahí están los comandos exactos, la configuración por ambiente y lo que nunca se debe hacer.

Resumen:
- Se desarrolla en `origin` (`jdaetzcemaco/surtido-planogramas`) y se publica en el remoto `fork`
  (`DavidAVentura/Planogramas`), que es el repo oficial mientras no exista el repo de organización.
- El fork nunca tiene commits propios. Publicar es empujar la rama de `origin` al fork, sin `--force`:
  - DEV: `git push fork origin/develop:refs/heads/develop`
  - PROD: fast-forward de `main` a `develop` en `origin` y luego `git push fork origin/main:refs/heads/main`
- GitHub Actions del fork despliega a Azure: `develop` → App Service `planogramas-api-dev` + Static
  Web App DEV; `main` → `planogramas-api-prod` + Static Web App prod.
- Publicar solo cuando el usuario lo pida; prod, solo si lo pide explícitamente.
- DigitalOcean y `jcddash.com/surtido` (`DEPLOY_SURTIDO.md`) eran del prototipo y ya no se usan.

## Convenciones de trabajo especificas de este repo

- No editar `src/data/realData.js` a mano; regenerarlo desde los Excel fuente en `data-fuente/`.
- No mezclar cambios solo de documentacion con cambios funcionales en el mismo paso sin avisar
  (segun `MEMORIA_PROYECTO.md`) — estos archivos `.md` en espanol se usan activamente como memoria
  del proyecto entre sesiones/agentes.
- Toda comunicacion, documentacion y contenido relacionado a este proyecto se lleva en espanol.


---

## Backend (`back/`)

### Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express 5
- **Base de datos**: SQL Server
- **Query builder**: Knex (con driver `tedious`)
- **Variables de entorno**: cargadas exclusivamente en `back/src/config/env.js`; ese archivo es el
  unico punto de acceso a `process.env`. El resto del codigo importa las variables desde ahi, nunca
  lee `process.env` directamente.

### Principios de diseño

- **Arquitectura hexagonal**: el dominio (entidades, casos de uso) no depende de Express ni de MySQL.
  Los adaptadores (HTTP, base de datos) dependen del dominio, nunca al reves.
- **SOLID**: cada modulo tiene una responsabilidad unica; se prefiere composicion sobre herencia.
- **Clean Code**: funciones cortas y con nombre descriptivo; sin logica compleja inline en rutas.
- **Patron Repository**: toda consulta a la BD pasa por un repositorio; los casos de uso reciben
  el repositorio por inyeccion de dependencia.
- **Simplicidad sobre ingenieria de mas**: preferir la solucion directa antes que la rebuscada.
  Agregar abstracciones solo cuando el problema real las justifica.

### Comandos del backend

```bash
cd back
npm install
npm run dev      # nodemon index.js — recarga en caliente
npm start        # node index.js — produccion
```

### Convencion de carpetas del backend

Ver la propuesta aprobada de estructura de carpetas en `Arquitectura/ESTRUCTURA_BACKEND.md`.
Los modulos siguen la nomenclatura en espanol para mantener coherencia con el dominio del proyecto
(planogramas, gondolas, niveles, posiciones, etc.).

### Convencion de errores HTTP

- `400` validacion de request
- `401` no autenticado
- `403` sin permiso
- `404` recurso no encontrado
- `409` conflicto de estado (ej. gondola con posiciones al intentar eliminar)
- `422` entidad no procesable (ej. desborde de nivel sin flag de confirmacion)

Toda respuesta de error usa la forma `{ error: { code, message, details? } }`.
Toda respuesta paginada usa `{ data: [], total, page, pageSize }`.

### Pruebas Postman

Cada módulo del backend debe tener su carpeta equivalente de pruebas manuales en
`postman/planogramas-import.postman_collection.json` (único archivo editable a mano — el resto de
`postman/` es un espejo auto-generado por Postman Cloud, no tocar). Reglas de estructura, cobertura
mínima y repetibilidad de estas pruebas: ver
[Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md](Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md).

### Estado de los módulos

Implementados end-to-end: 01 planogramas, 02 versiones, 03 góndolas, 04 niveles, 05 posiciones,
08 catálogo, 09 accesorios, 10 tiendas, 11 jerarquía, 15 asignaciones, 18 secciones, 19 SKU en la
versión, 21 consolidado de tiendas; sin Postman todavía: 13 adjuntos y agente-extractor; pendientes:
06 sustituciones y 07 exportación. **Antes de tocar un módulo, leer su apartado en `Arquitectura/ESTADO_MODULOS.md`**
(reglas no obvias: lógica compartida que no se debe duplicar, clonado de secciones, etc.).

### Estado de las migraciones por ambiente

| Ambiente | BD | Última migración aplicada | Pendientes | Verificado |
|----------|----|---------------------------|------------|------------|
| DEV | `OTB` | `018_autor_nombre_evidencia_adjunto.js` | Ninguna | 2026-10-16 (migrate + rollback + migrate en OTB; `sys.columns`: `nvarchar(150) NULL` en `EvidenciaImplementacion` y `Adjunto`) |
| PROD | `db-planogramas` | `018_autor_nombre_evidencia_adjunto.js` | Ninguna | 2026-10-16 (`npm run migrate:prod`; luego carga de datos de DEV con `migrar:dev-a-prod`, verificada con `--verificar`) |

> **Mantener esta tabla al día.** Cada vez que se cree una migración nueva o se aplique
> (`npm run migrate`) en un ambiente, actualizar la fila correspondiente con la última migración
> aplicada, las pendientes y la fecha de verificación. Comprobarlo con `npm run migrate:status`
> desde `back/` apuntando al ambiente (el `.env` local apunta a DEV). Si al implementar algo se
> agrega una migración sin aplicarla, anotarla en "Pendientes" del ambiente que corresponda.
