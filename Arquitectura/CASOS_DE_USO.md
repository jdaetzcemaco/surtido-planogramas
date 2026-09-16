# Casos de uso — Sistema de Planogramas Cemaco

Actores:
- **Analista**: analista de categorías, diseña y mantiene planogramas.
- **Implementador**: personal de tienda, consulta planogramas para montaje.
- **Sistema**: agente de visión / procesos automáticos.

---

## CU-01 — Gestión de planogramas

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-01-01 | Crear planograma | Analista | Crea un nuevo planograma con nombre, departamento y lista de subcategorías de referencia. |
| CU-01-02 | Editar planograma | Analista | Modifica nombre, departamento o subcategorías de referencia de un planograma existente. |
| CU-01-03 | Archivar planograma | Analista | Marca un planograma como archivado cuando ya no está en uso. |
| CU-01-04 | Listar planogramas | Analista / Implementador | Consulta el listado de planogramas filtrando por departamento, categoría o estado. |
| CU-01-05 | Ver detalle de planograma | Analista / Implementador | Consulta el contenido completo de un planograma: versiones, góndolas, niveles y posiciones. |

---

## CU-02 — Versiones y ciclo de vida

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-02-01 | Crear versión | Analista | Crea una nueva versión (TG / TM / TE) de un planograma existente. |
| CU-02-02 | Crear versión especial por tienda | Analista | Crea una versión derivada de una versión base para una tienda específica. |
| CU-02-03 | Promover versión a piloto | Analista | Cambia el estado de una versión de `en_desarrollo` a `piloto` y asigna tiendas piloto. |
| CU-02-04 | Promover versión a publicado | Analista | Aprueba el piloto y publica la versión; la versión anterior pasa a `archivado`. |
| CU-02-05 | Asignar tiendas a versión | Analista | Agrega o quita tiendas del listado de tiendas que usan una versión. |
| CU-02-06 | Consultar versiones de un planograma | Analista | Ve el historial de versiones con sus estados y tiendas asignadas. |
| CU-02-07 | Archivar versión manualmente | Analista | Retira una versión en `borrador`, `en_desarrollo` o `piloto` sin esperar a que otra la reemplace. |

---

## CU-03 — Góndolas y niveles

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-03-01 | Agregar góndola | Analista | Agrega una góndola a una versión de planograma ingresando nombre y medidas (ancho, alto, profundidad). |
| CU-03-02 | Editar medidas de góndola | Analista | Modifica las medidas de una góndola existente. |
| CU-03-03 | Reordenar góndolas | Analista | Cambia el orden de las góndolas dentro de una versión. |
| CU-03-04 | Eliminar góndola | Analista | Elimina una góndola; requiere confirmación si tiene niveles con posiciones asignadas. |
| CU-03-05 | Agregar nivel | Analista | Agrega un nivel a una góndola definiendo orden, altura desde el piso, tipo de accesorio y tamaño. |
| CU-03-06 | Editar nivel | Analista | Modifica altura, accesorio o ancho disponible de un nivel existente. |
| CU-03-07 | Reordenar niveles | Analista | Cambia el orden vertical de los niveles dentro de una góndola. |
| CU-03-08 | Eliminar nivel | Analista | Elimina un nivel; requiere confirmación si tiene posiciones asignadas. |

---

## CU-04 — Posiciones y productos

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-04-01 | Agregar posición | Analista | Asigna un SKU a una posición en un nivel, definiendo facings o ancho asignado. |
| CU-04-02 | Editar posición | Analista | Modifica atributos de una posición: facings, cantidad apilable, unidades por facing, accesorios de montaje, perfil de redondeo, modo, flags y observaciones. |
| CU-04-03 | Mover posición (drag & drop) | Analista | Arrastra una posición a otro nivel o columna dentro del mismo nivel. |
| CU-04-04 | Copiar posición | Analista | Copia una posición con Ctrl+C para duplicarla. |
| CU-04-05 | Pegar posición | Analista | Pega la posición copiada en el nivel superior o inferior por defecto (Ctrl+V). |
| CU-04-06 | Eliminar posición | Analista | Elimina una posición de un nivel. |
| CU-04-07 | Ver capacidad en tiempo real | Analista | El sistema muestra el espacio disponible restante en el nivel mientras se agregan o editan posiciones. |
| CU-04-08 | Aceptar alerta de desborde | Analista | El analista reconoce explícitamente que un producto cruza el límite físico de la góndola y agrega una nota de desborde. |
| CU-04-09 | Agregar accesorio de montaje a posición | Analista | Agrega uno o más accesorios con nota libre a una posición (ej. "a la derecha"). |
| CU-04-10 | Deshacer / Rehacer acción | Analista | Revierte o repite la última acción de edición con Ctrl+Z / Ctrl+Y. |
| CU-04-11 | Eliminar accesorio de montaje de posición | Analista | Quita un accesorio de montaje previamente asignado a una posición. |
| CU-04-12 | Actualizar dimensiones de producto | Analista | Corrige el ancho, alto y profundidad físicos de un producto en la tabla local; el sistema marca la fuente como `MANUAL` y las dimensiones como validadas. |
| CU-04-13 | Validar dimensiones de producto | Analista | Confirma que las dimensiones físicas ya guardadas de un producto son correctas, sin modificarlas. Requiere que las tres medidas sean mayores a 0. |
| CU-04-14 | Ver inventario de producto en ficha | Analista | Al abrir la ficha de un producto en el editor, el sistema consulta el stock SAP por centro (vía CATI) y lo muestra como bloque adicional, sin filtrar por tienda. |
| CU-04-15 | Ver ficha técnica de producto en ficha | Analista | Al abrir la ficha de un producto en el editor, el sistema consulta la ficha técnica enriquecida por CATI (descripción, características, advertencias de uso) y la muestra como bloque adicional, colapsable igual que el resto de bloques de la ficha. |

---

## CU-05 — Sustitución de SKUs

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-05-01 | Iniciar sustitución de SKU | Analista | Selecciona una o más posiciones con el SKU a reemplazar y abre el flujo de sustitución. |
| CU-05-02 | Seleccionar SKU sustituto | Analista | Busca y elige el SKU sustituto del catálogo; el sistema sugiere `Producto.sku_sustituto` si existe. |
| CU-05-03 | Confirmar sustitución | Analista | Ingresa el motivo y confirma; el sistema actualiza las posiciones y registra el historial. |
| CU-05-04 | Consultar historial de sustituciones | Analista | Ve el listado de sustituciones realizadas en una versión: SKU original, sustituto, motivo, fecha y posiciones afectadas. |

---

## CU-06 — Publicación y exportación

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-06-01 | Guardar borrador | Analista | Persiste el estado actual del planograma sin cambiar su estado. |
| CU-06-02 | Publicar versión | Analista | Cambia el estado a `publicado` tras validar que no hay errores bloqueantes. |
| CU-06-03 | Exportar planograma a JSON | Analista | Descarga el planograma completo en formato JSON con estructura estable para integración. |
| CU-06-04 | Exportar planograma a CSV | Analista | Descarga el planograma como CSV con una fila por posición, compatible con el análisis en Excel. |

---

## CU-07 — Consulta para implementadores (personal de tienda)

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-07-01 | Ver planograma asignado a tienda | Implementador | Consulta el planograma activo de su tienda para una categoría específica. |
| CU-07-02 | Ver detalle de posición | Implementador | Consulta los atributos de una posición: SKU, imagen, facings, accesorios y notas de montaje. |

---

## CU-09 — Adjuntos de versión de planograma

| ID | Nombre | Actor | Descripción |
|---|---|---|---|
| CU-09-01 | Agregar adjunto | Analista | Sube un archivo (imagen o PDF) y lo asocia a una versión de planograma. |
| CU-09-02 | Listar adjuntos | Analista | Consulta los adjuntos de una versión. |
| CU-09-03 | Reemplazar adjunto | Analista | Sube un archivo nuevo que reemplaza el contenido de un adjunto existente, conservando su id. |
| CU-09-04 | Eliminar adjunto | Analista | Elimina un adjunto de la versión. |
| CU-09-05 | Descargar adjunto | Analista | Descarga el archivo de un adjunto a través del backend. |

---

## Fuera de alcance del MVP — fase siguiente

| ID | Nombre | Fase |
|---|---|---|
| CU-08-01 | Iniciar sesión de captura fotográfica | Siguiente |
| CU-08-02 | Confirmar medidas de góndola en captura | Siguiente |
| CU-08-03 | Tomar foto de módulo | Siguiente |
| CU-08-04 | Validar calidad de foto | Siguiente |
| CU-08-05 | Retomar foto de módulo | Siguiente |
| CU-08-06 | Confirmar niveles propuestos por agente | Siguiente |
| CU-08-07 | Revisar propuesta de detección | Siguiente |
| CU-08-08 | Aceptar / editar / rechazar detección | Siguiente |
| CU-08-09 | Auditar planograma contra foto | Posterior |
| CU-08-10 | Ver métricas de performance por posición | Posterior (requiere Fabric/VTEX) |
| CU-08-11 | Alertas de productos sin stock en planograma | Posterior |
