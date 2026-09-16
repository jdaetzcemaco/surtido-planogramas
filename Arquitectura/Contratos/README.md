# Contratos de API — Planogramas Cemaco

Directorio de contratos detallados por endpoint. Cada archivo describe: parámetros de entrada, reglas de negocio, comportamiento esperado, esquemas JSON de request/response, ejemplos y códigos de error.

Cada contrato aquí define la cobertura mínima que debe tener su carpeta correspondiente en la colección Postman — ver [[ESTANDAR_PRUEBAS_POSTMAN]].

Los contratos están organizados por recurso e incluyen anotaciones de arquitectura con guías de **Clean Code**, **Arquitectura Hexagonal** y **principios SOLID** para orientar la implementación.

---

## Estructura

| Carpeta | Recurso | Endpoints |
|---------|---------|-----------|
| `01_planogramas/` | Planogramas | GET lista, POST crear, GET detalle, PATCH editar, POST archivar |
| `02_versiones/` | Versiones | GET lista, POST crear, GET detalle, PATCH metadatos, POST promover, GET/PUT tiendas, PATCH guardar, GET estructura |
| `03_gondolas/` | Góndolas | GET lista, POST agregar, PATCH editar, PATCH reordenar, DELETE, GET resumen |
| `04_niveles/` | Niveles | POST agregar, PATCH editar, PATCH reordenar, DELETE, GET resumen |
| `05_posiciones/` | Posiciones | POST agregar, PATCH editar, POST mover, POST copiar, DELETE, GET accesorios, POST accesorio, DELETE accesorio, GET capacidad, GET detalle implementador |
| `06_sustituciones/` | Sustituciones | GET historial, POST ejecutar, GET por-sku |
| `07_exportacion/` | Exportación | GET JSON, GET CSV, GET validar publicación |
| `08_catalogo/` | Catálogo (CATI) | GET buscar productos, GET detalle producto, GET stock producto, GET ficha técnica producto |
| `09_accesorios/` | Accesorios | GET lista, GET detalle |
| `10_tiendas/` | Tiendas | GET lista, GET planogramas por tienda |
| `11_jerarquia/` | Jerarquía (CATI) | GET áreas, GET departamentos |
| `12_sesiones_captura/` | Captura *(fuera de MVP)* | Referencia de diseño |
| `13_adjuntos/` | Adjuntos | GET lista, POST agregar, PUT reemplazar, DELETE eliminar, GET descargar |

---

## Convenciones de los contratos

- **Prefijo base:** `/api/v1`
- **Autenticación:** `Authorization: Bearer {jwt}` en todos los endpoints.
- **Paginación:** `{ data: [], total, page, pageSize }` en endpoints de lista.
- **Partial update:** los PATCH solo modifican los campos enviados.
- **Errores:** schema estándar `{ error: string, campo?: string }` para 4xx.

## Errores HTTP estándar

| Código | Significado |
|--------|-------------|
| `400` | Validación de entrada fallida |
| `401` | No autenticado (JWT ausente o expirado) |
| `403` | Sin permiso para la operación |
| `404` | Recurso no encontrado |
| `409` | Conflicto de estado (ej. nombre duplicado, ya archivado) |
| `422` | Entidad no procesable (ej. versión en estado inválido para la operación) |
| `503` | Servicio externo (CATI) no disponible |

---

## Principios de arquitectura recurrentes

### Arquitectura Hexagonal
- Todos los accesos externos (CATI, BD) pasan por **puertos** (`interface`) e **implementaciones** inyectadas.
- Los casos de uso (`*UseCase`) no dependen de implementaciones concretas, solo de interfaces.
- Anti-corruption Layer en todos los adaptadores de CATI (`CatiMapper`).

### SOLID
- **SRP**: un caso de uso = una responsabilidad. Un repositorio = una entidad.
- **OCP**: listas de estrategias inyectables para validaciones y transformaciones extensibles.
- **DIP**: los casos de uso dependen de interfaces, nunca de SQL directo.
- **ISP**: separar interfaces de lectura (`IReadRepository`) de escritura (`IWriteRepository`).

### Clean Code
- Transacciones explícitas para operaciones que modifican múltiples tablas.
- Guard clauses al inicio de los casos de uso (verificar estado antes de operar).
- Value objects para medidas, estados, tipos de accesorio.
- Mappers dedicados para transformación entre capas.
- Documentar side effects en contratos y comentarios de código.

---

*Generado: 2026-07-10 | Proyecto: IA Planogramas Cemaco*
