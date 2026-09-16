# Contrato: Listar Adjuntos de una Versión

**Método:** `GET`
**Ruta:** `/api/v1/versiones/{id}/adjuntos`
**Actor:** Analista
**Caso de uso:** CU-09-02

---

## Descripción

Lista los adjuntos (imágenes o PDFs) asociados a una versión de planograma, más recientes primero. Como TG/TM/TE son filas separadas de `PlanogramaVersion`, cada una tiene su propio set de adjuntos — este endpoint nunca mezcla adjuntos de otra versión, aunque pertenezcan al mismo planograma.

No requiere que la versión esté en modo editable — la consulta está disponible sin importar el estado (incluso `publicado` o `archivado`).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

---

## Response — 200 OK

```json
[
  {
    "id": 5,
    "versionId": 10,
    "nombreOriginal": "foto-rack-frontal.jpg",
    "tipoMime": "image/jpeg",
    "tamanoBytes": 842311,
    "blobContainer": "adjuntos",
    "blobPath": "versiones/10/3f2a1c9e-foto-rack-frontal.jpg",
    "blobUrl": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/3f2a1c9e-foto-rack-frontal.jpg",
    "subidoPor": "sistema",
    "createdAt": "2026-09-16T14:32:00.000Z"
  }
]
```

`blobUrl` es la URL base del blob **sin SAS** — el contenedor es privado, así que no sirve para descarga directa desde el navegador; se incluye solo como referencia/debug. Para descargar el archivo, usar `GET /adjuntos/{id}/descargar` (ver contrato correspondiente).

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> `ListarAdjuntosUseCase` recibe `(adjuntoRepo, versionRepo, versionId)` — valida que la versión exista delegando en `VersionRepository`, sin acoplarse a Knex ni a Azure Storage.
