# Directorio de Endpoints — API Planogramas Cemaco

Inventario de todos los endpoints a desarrollar en el backend REST. Los endpoints están organizados
por recurso. Las rutas usan el prefijo base `/api/v1`.

Para cada endpoint se indica: método HTTP, ruta, actor(es) que lo consumen, caso de uso de
referencia y descripción funcional.

Los contratos detallados (request/response bodies, códigos de error, ejemplos) se documentarán
por separado en archivos de contrato individuales.

---

## 1. Planogramas

Gestión del planograma como entidad raíz: creación, edición, listado y archivado.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/planogramas` | Analista / Implementador | CU-01-04 | Lista planogramas. Admite filtros por `departamento`, `categoria` y `estado`. Paginado. |
| `POST` | `/planogramas` | Analista | CU-01-01 | Crea un nuevo planograma con nombre, departamento y subcategorías de referencia. |
| `GET` | `/planogramas/{id}` | Analista / Implementador | CU-01-05 | Retorna el detalle completo de un planograma: metadatos, subcategorías de referencia y resumen de versiones. |
| `PATCH` | `/planogramas/{id}` | Analista | CU-01-02 | Modifica nombre, departamento o subcategorías de referencia. Solo acepta los campos enviados (partial update). |
| `POST` | `/planogramas/{id}/archivar` | Analista | CU-01-03 | Marca el planograma como `archivado`. No elimina datos. |

---

## 2. Versiones

Ciclo de vida de una versión de planograma: creación, promoción de estado y asignación a tiendas.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/planogramas/{id}/versiones` | Analista | CU-02-06 | Lista todas las versiones de un planograma con su estado, tipo y tiendas asignadas. |
| `POST` | `/planogramas/{id}/versiones` | Analista | CU-02-01 / CU-02-02 | Crea una nueva versión. Si lleva `version_base_id`, crea una versión especial por tienda derivada de esa base. |
| `GET` | `/versiones/{id}` | Analista / Implementador | CU-01-05 | Retorna el detalle completo de una versión: góndolas, niveles y posiciones anidadas. |
| `PATCH` | `/versiones/{id}` | Analista | — | Modifica metadatos de la versión (notas, código). |
| `POST` | `/versiones/{id}/promover` | Analista | CU-02-03 / CU-02-04 | Avanza el estado de la versión al siguiente (`en_desarrollo` → `piloto` → `publicado`). El body indica tiendas piloto cuando el estado destino es `piloto`. Si la versión es de línea base, cada paso archiva automáticamente la versión base que ocupaba el estado destino para el mismo planograma+tipo (piloto anterior al promover a piloto, publicada anterior al promover a publicado); las versiones especiales por tienda no archivan ninguna anterior. |
| `POST` | `/versiones/{id}/archivar` | Analista | CU-02-07 | Marca la versión como `archivado` directamente, sin esperar a que otra versión la reemplace. Solo permitido desde `borrador`, `en_desarrollo` o `piloto` — una versión `publicado` solo se archiva automáticamente cuando otra la reemplaza (ver `/promover`). |
| `GET` | `/versiones/{id}/tiendas` | Analista | CU-02-05 | Lista las tiendas asignadas a una versión. |
| `PUT` | `/versiones/{id}/tiendas` | Analista | CU-02-05 | Reemplaza el listado completo de tiendas asignadas a la versión. |
| `PATCH` | `/versiones/{id}/guardar` | Analista | CU-06-01 | Persiste el estado actual del planograma sin cambiar su estado. Partial update de posiciones, góndolas y niveles en un solo request. |
| `GET` | `/versiones/{id}/validar-publicacion` | Analista | CU-06-02 | Verifica que la versión no tiene errores bloqueantes antes de publicar. Retorna lista de errores/advertencias. |
| `GET` | `/versiones/{id}/estructura` | Analista / Implementador | CU-07-01 | Retorna la versión completa con góndolas, niveles y posiciones anidadas en un solo response. Acepta query param `?vistaImplementador=true` para filtrar campos de edición. |
| `GET` | `/versiones/{id}/capacidad` | Analista | CU-04-07 | Retorna el espacio disponible por nivel en la versión. Usado para refrescar la vista de capacidad tras operaciones de movimiento o copia. |

---

## 3. Góndolas

Alta, edición, reordenamiento y eliminación de góndolas dentro de una versión.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/versiones/{id}/gondolas` | Analista | CU-01-05 | Lista las góndolas de una versión ordenadas por `orden`. |
| `GET` | `/gondolas/{id}` | Analista | CU-03-02 | Retorna el detalle completo de una góndola: nombre, medidas, posición en tienda. |
| `GET` | `/gondolas/{id}/resumen` | Analista | CU-03-04 | Retorna nombre de la góndola y conteos de niveles y posiciones. Usado antes del diálogo de confirmación de eliminación. |
| `POST` | `/versiones/{id}/gondolas` | Analista | CU-03-01 | Agrega una góndola a la versión con nombre, medidas y posición en tienda. |
| `PATCH` | `/gondolas/{id}` | Analista | CU-03-02 | Modifica nombre, medidas o posición en tienda de una góndola. |
| `PATCH` | `/versiones/{id}/gondolas/reordenar` | Analista | CU-03-03 | Reordena las góndolas de la versión. El body envía el array de IDs en el nuevo orden. |
| `DELETE` | `/gondolas/{id}` | Analista | CU-03-04 | Elimina una góndola. Retorna `409 Conflict` si tiene niveles con posiciones asignadas, a menos que el cliente envíe el flag `forzar=true`. |

---

## 4. Niveles

Alta, edición, reordenamiento y eliminación de niveles dentro de una góndola.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/gondolas/{id}/niveles` | Analista | CU-01-05 | Lista los niveles de una góndola ordenados de abajo hacia arriba (`orden` ascendente). |
| `GET` | `/niveles/{id}` | Analista | CU-03-06 | Retorna el detalle de un nivel: orden, altura, accesorio principal, ancho disponible. |
| `GET` | `/niveles/{id}/resumen` | Analista | CU-03-08 | Retorna nombre del nivel y conteo de posiciones. Usado antes del diálogo de confirmación de eliminación. |
| `POST` | `/gondolas/{id}/niveles` | Analista | CU-03-05 | Agrega un nivel a la góndola con orden, altura, tipo de accesorio y tamaño. |
| `PATCH` | `/niveles/{id}` | Analista | CU-03-06 | Modifica altura, accesorio principal, ancho disponible u otras propiedades del nivel. |
| `PATCH` | `/gondolas/{id}/niveles/reordenar` | Analista | CU-03-07 | Reordena los niveles de la góndola. El body envía el array de IDs en el nuevo orden. |
| `DELETE` | `/niveles/{id}` | Analista | CU-03-08 | Elimina un nivel. Retorna `409 Conflict` si tiene posiciones, a menos que el cliente envíe `forzar=true`. |

---

## 5. Posiciones

Gestión de posiciones (SKUs) dentro de un nivel: alta, edición, movimiento, copia y eliminación.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/niveles/{id}/posiciones` | Analista | CU-01-05 | Lista las posiciones de un nivel ordenadas por `orden_horizontal`. Incluye capacidad disponible restante del nivel. |
| `GET` | `/posiciones/{id}` | Analista | CU-04-02 | Retorna el detalle completo de una posición para el panel de edición del Analista. |
| `POST` | `/niveles/{id}/posiciones` | Analista | CU-04-01 | Agrega una posición al nivel asignando SKU y facings (o ancho asignado). Retorna `422` si el nivel queda en desborde sin el flag de confirmación. |
| `PATCH` | `/posiciones/{id}` | Analista | CU-04-02 | Modifica atributos de la posición: facings, cantidad apilable, unidades por facing, perfil de redondeo, modo, flags (cross, display, desborde) y observaciones. |
| `PATCH` | `/posiciones/{id}/mover` | Analista | CU-04-03 | Mueve la posición a otro nivel o a otro orden dentro del mismo nivel. El body especifica `nivel_id_destino` y `orden_destino`. |
| `POST` | `/posiciones/{id}/copiar` | Analista | CU-04-04 / CU-04-05 | Duplica la posición. El body especifica `nivel_id_destino` y `orden_destino`. |
| `DELETE` | `/posiciones/{id}` | Analista | CU-04-06 | Elimina una posición del nivel. |
| `GET` | `/posiciones/{id}/accesorios` | Analista | CU-04-09 | Lista los accesorios de montaje asignados a la posición. |
| `POST` | `/posiciones/{id}/accesorios` | Analista | CU-04-09 | Agrega un accesorio de montaje a la posición con nota libre. |
| `DELETE` | `/posiciones/{id}/accesorios/{accesorioId}` | Analista | CU-04-11 | Quita un accesorio de montaje de la posición. |
| `GET` | `/posiciones/por-sku` | Analista | CU-05-01 | Busca todas las posiciones de una versión que usan un SKU específico. Query params: `sku` (requerido) y `versionId` (requerido). |

---

## 6. Sustitución de SKUs

Flujo completo de sustitución: iniciar, confirmar y consultar historial.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/versiones/{id}/sustituciones` | Analista | CU-05-04 | Lista el historial de sustituciones de la versión: SKU original, sustituto, motivo, fecha y posiciones afectadas. |
| `POST` | `/versiones/{id}/sustituciones` | Analista | CU-05-01 / CU-05-03 | Ejecuta una sustitución: reemplaza el SKU original por el sustituto en las posiciones indicadas y registra el historial. El body incluye `sku_original`, `sku_sustituto`, `posicion_ids` y `motivo`. |

---

## 7. Exportación

Descarga del planograma completo en distintos formatos.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/versiones/{id}/exportar/json` | Analista | CU-06-03 | Retorna el planograma completo como JSON con estructura estable para integración externa. Content-type: `application/json`. |
| `GET` | `/versiones/{id}/exportar/csv` | Analista | CU-06-04 | Retorna el planograma como CSV con una fila por posición, compatible con análisis en Excel. Content-type: `text/csv`. |

---

## 8. Catálogo de productos

Búsqueda y consulta del catálogo de productos. La fuente de verdad de la búsqueda/detalle general
es CATI (API interna de Cemaco); esos 2 endpoints actúan como proxy/caché para el frontend. Las
dimensiones físicas, en cambio, tienen una porción de escritura LOCAL (tabla `Producto`, distinta
del proxy): un analista puede corregirlas a mano o validar las que ya trae CATI — ver los 2
endpoints `PATCH .../dimensiones*`, servidos por un módulo de dominio separado (`domain/producto/`,
no `catalogo`).

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/catalog/productos` | Analista | CU-04-01 / CU-05-02 | Busca productos del catálogo. Filtros: `sku`, `gtin`, `marca`, `nombre`, `subcategoria`, `categoria_nivel1`, `categoria_nivel2`, `solo_con_stock`. Paginado. Se puede navegar solo por `subcategoria` (sin texto de búsqueda) para el drill-down de jerarquía. |
| `GET` | `/catalog/productos/{sku}` | Analista | CU-04-02 | Retorna el detalle de un producto: dimensiones, imagen, precio, jerarquía, SKU sustituto sugerido, fuente de dimensiones y si están validadas. |
| `PATCH` | `/catalog/productos/{sku}/dimensiones` | Analista | CU-04-12 | Actualiza `ancho_cm`/`alto_cm`/`profundidad_cm` del producto local; marca `fuente_dimensiones='MANUAL'` y `dimensiones_validadas=true`. |
| `PATCH` | `/catalog/productos/{sku}/dimensiones/validar` | Analista | CU-04-13 | Marca `dimensiones_validadas=true` sin modificar las medidas; requiere que las tres sean mayores a 0 (`422` si no). |
| `GET` | `/catalog/productos/{sku}/stock` | Analista | CU-04-14 | Retorna el stock SAP del producto por centro (proxy a CATI, sin filtrar ni cachear). Arreglo vacío si no tiene inventario registrado. |
| `GET` | `/catalog/productos/{sku}/ficha-tecnica` | Analista | CU-04-15 | Retorna la ficha técnica del producto enriquecida por CATI, como pares `etiqueta`/`valor` (proxy a CATI, HTML traducido a texto plano, sin cachear). Arreglo vacío si no tiene ficha técnica registrada. |

---

## 9. Accesorios

Catálogo de accesorios de gondolería disponibles para asignar a niveles y posiciones.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/accesorios` | Analista | CU-03-05 / CU-04-09 | Lista todos los accesorios disponibles. Filtro opcional por `tipo` (GANCHO, BANDEJA, BARRA, CANASTA, OTRO). |
| `GET` | `/accesorios/{id}` | Analista | — | Retorna el detalle de un accesorio: código, tipo, dimensiones y notas de capacidad. |

---

## 10. Tiendas

Lookup de tiendas de la cadena para asignarlas a versiones de planograma.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/tiendas` | Analista | CU-02-05 | Lista todas las tiendas activas con código, nombre y tipo (GRANDE, MEDIANA, EXPRESS). |
| `GET` | `/tiendas/{id}/planogramas` | Implementador | CU-07-01 | Lista los planogramas activos de una tienda. Filtros: `departamento`, `estado` (por defecto `publicado`). |

---

## 12. Jerarquía

Consulta de la jerarquía de productos (Área → Departamento → Familia → Categoría → Subcategoría) desde CATI. El backend actúa como proxy autenticado; el frontend nunca llama a CATI directamente.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/jerarquia/areas` | Analista | CU-01-01 / CU-01-02 / CU-01-04 | Lista todas las áreas activas desde CATI. |
| `GET` | `/jerarquia/departamentos` | Analista | CU-01-01 / CU-01-02 / CU-01-04 | Lista departamentos de un área. Query param requerido: `area` (ID de área). |
| `GET` | `/jerarquia/familias` | Analista | CU-01-01 / CU-01-02 / CU-01-04 | Lista familias de un departamento. Query param requerido: `departamento` (ID de departamento). |
| `GET` | `/jerarquia/categorias` | Analista | CU-01-01 / CU-01-02 / CU-01-04 | Lista categorías de una familia. Query param requerido: `familia` (ID de familia). |
| `GET` | `/jerarquia/subcategorias` | Analista | CU-01-01 / CU-01-02 / CU-01-04 | Lista subcategorías de una categoría. Query param requerido: `categoria` (ID de categoría). El id resultante es el que se usa como filtro `subcategoria` en `GET /catalog/productos/buscar`. |

---

## 13. Sesiones de captura fotográfica *(fase siguiente — fuera del MVP)*

Endpoints del flujo de captura: iniciar sesión, subir fotos, confirmar propuesta del agente de visión.
Quedan listados como referencia para el diseño; no se desarrollarán en la iteración actual.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `POST` | `/sesiones-captura` | Analista | CU-08-01 | Inicia una sesión de captura asociada a una versión de planograma. Especifica tipo de flujo (CREACION / AUDITORIA), góndola objetivo (en auditoría) y filtro de jerarquía. |
| `GET` | `/sesiones-captura/{id}` | Analista | CU-08-01 | Retorna el estado actual de la sesión con sus fotos y propuesta. |
| `POST` | `/sesiones-captura/{id}/fotos` | Sistema | CU-08-03 | Registra una foto de módulo en la sesión. El body incluye la imagen en base64 o una URL temporal de storage. Retorna métricas de calidad calculadas en el backend y el flag `valida`. |
| `POST` | `/sesiones-captura/{id}/fotos/{fotoId}/retomar` | Sistema | CU-08-05 | Marca la foto como inválida y habilita el retake del módulo correspondiente. |
| `POST` | `/sesiones-captura/{id}/ejecutar-agente` | Sistema | CU-08-07 | Dispara el agente de visión (Claude Vision vía n8n) sobre las fotos validadas de la sesión. Genera las `DeteccionPropuesta`. Operación asíncrona; retorna un `job_id` para polling. |
| `GET` | `/sesiones-captura/{id}/propuesta` | Analista | CU-08-07 | Retorna la propuesta de detección completa: filas por nivel, SKU candidato, confianza y alternativas. |
| `PATCH` | `/sesiones-captura/{id}/propuesta/detecciones/{deteccionId}` | Analista | CU-08-08 | Acepta, edita o rechaza una detección individual de la propuesta. |
| `POST` | `/sesiones-captura/{id}/aceptar` | Analista | CU-08-08 | Confirma la propuesta completa y materializa las posiciones aceptadas en la versión de planograma asociada. |

---

## 14. Adjuntos

Archivos (imágenes o PDFs) que el analista asocia a una versión de planograma — cada versión (TG/TM/TE, o especial por tienda) tiene su propio set de adjuntos, independiente de las demás. El binario vive en Azure Blob Storage, en un contenedor privado; el backend nunca expone una URL directa del blob — la descarga siempre pasa por `GET /adjuntos/{id}/descargar`, que hace streaming del archivo.

| Método | Ruta | Actor | CU | Descripción |
|--------|------|-------|----|-------------|
| `GET` | `/versiones/{id}/adjuntos` | Analista | CU-09-02 | Lista los adjuntos de una versión, más recientes primero. |
| `POST` | `/versiones/{id}/adjuntos` | Analista | CU-09-01 | Sube un adjunto nuevo. Body: `nombre_original`, `tipo_mime`, `archivo_base64`. Requiere que la versión esté en modo editable. |
| `PUT` | `/adjuntos/{id}` | Analista | CU-09-03 | Reemplaza el archivo de un adjunto existente, conservando su id. Mismo body que agregar. |
| `DELETE` | `/adjuntos/{id}` | Analista | CU-09-04 | Elimina un adjunto (fila + blob en Azure). Requiere que la versión esté en modo editable. |
| `GET` | `/adjuntos/{id}/descargar` | Analista | CU-09-05 | Descarga el archivo — streaming desde Azure Blob Storage a través del backend. |

---

## Notas generales de diseño

- **Autenticación**: todos los endpoints requieren JWT de Entra ID (pendiente, ver asks en `REUNION_TECNICA.md`). El header es `Authorization: Bearer {token}`.
- **Versionado**: prefijo `/api/v1` en todas las rutas.
- **Errores estándar**: `400` validación, `401` no autenticado, `403` sin permiso, `404` recurso no encontrado, `409` conflicto de estado, `422` entidad no procesable (ej. desborde sin confirmación).
- **Paginación**: los endpoints de listado retornan `{ data: [], total, page, pageSize }`.
- **Partial update**: todos los `PATCH` aceptan solo los campos enviados; los omitidos no se modifican.
- **Pruebas**: cada módulo listado aquí debe tener su carpeta equivalente en la colección Postman — ver [[ESTANDAR_PRUEBAS_POSTMAN]].
