# Entrega de Diseño para 1.1.3 (base: main `c5224d0`, v1.1.2)

## Qué hay en esta carpeta

- `docs/sistema.md` es el sistema unificado: sustituye tal cual a `docs/sistema.md` del repo y es igual a la copia maestra de Diseño. La maestra anterior está en `backup/sistema-pre-1.1.3.md`.
- `diff-vs-c5224d0.patch` es el diff unificado frente a `docs/sistema.md` de `c5224d0` (+32 / −8 líneas, 8 hunks). Se aplica limpio con `git apply` en la raíz del repo.
- Las secciones nuevas o tocadas son:
  - §5.3: `.row--account .row__sub { overflow-wrap: break-word; }`, en el bloque CSS y en el párrafo de Dynamic Type.
  - §8.4: la fila «No válido», el footer de «Se omiten» y la regla de la muestra en la tabla de errores. Se quitan los restos de «subtítulo = nombre del archivo» y de «punto abierto en §8.11».
  - §8.8: el subtítulo de las filas «No válido».
  - §8.11.8: la muestra sin espacio antes de «…».
  - §8.12, nueva: las decisiones de 1.1.3.
  - §10.15 y §10.18.
  - La nota de cambios del 8 oct (1.1.2 publicada y especificación de 1.1.3).
- Referencia probada, que no forma parte del sistema: `/workspace/pr4-review-caps/113/referencia-codigo-vs-c5224d0.patch` (+26 / −11 líneas, 5 archivos). Con ella pasan los 27 tests y las capturas de antes y después están en la misma carpeta.

## Cambios que hay que implementar en 1.1.3

Las líneas son de `c5224d0`.

### 1. Fila «No válido»: solo el primer motivo

Spec: §8.4 «Lote» y §8.12.1–3.

- El código está en `omitSubtitle`, `js/import.js:497-506`.
  - Hoy junta todos los `issues` con `join(" ")` (l.502) y usa el `parseError.msg` entero (l.501).
  - Debe quedarse con el primero y quitarle el punto final.
- Texto que no empieza por `{`: si `item.parseError.preview` existe (`js/parse.js:44`), el motivo es `` `Empieza por «${preview}»` ``. No lleva «El archivo no es una exportación».
  - Queda `nota.txt · Empieza por «https://link.cla…»`.
- Entre el nombre y el `·` va `\u00a0`: `` `${name}\u00a0· ${reason}` ``.
- Lo más limpio es un helper `omitReason(item)` exportado (el motivo sin el nombre), que `omitSubtitle` usa y que sirve también para el punto 3.
- La tarjeta de error de Pegar no cambia: sigue con todos los motivos, uno por línea (`js/app.js:1365`).
- Tests en `test/progress.test.mjs`:
  - `:733`: `"c1.json\u00a0· El archivo está incompleto"`;
  - `:735`: `"nota.txt\u00a0· Empieza por «https://link.cla…»"`;
  - caso nuevo: `{"foo":1}` → `"foo.json\u00a0· Falta el tag de la cuenta"`.

### 2. `clipPreview`: `trimEnd()` antes de «…»

Spec: §8.4, tabla de errores, y §8.12.5.

- Hay que cambiar `js/parse.js:7` a `chars.slice(0, 16).join("").trimEnd() + "…"`.
- Test junto a `:291`: `parseLoose("abcdefghijklmno  xyzzzz").preview === "abcdefghijklmno…"`.
- Hoy sale `abcdefghijklmno …`, y a 23 px el `…»` queda solo en otra línea, en la tarjeta y en la fila.

### 3. Sin footer `No es una exportación válida.` en «Se omiten»

Spec: §8.4 «Lote» y §8.12.6.

- Hay que cambiar `omitFoot`, `js/app.js:1476-1481`.
  - La línea 1479 pasa a `if (items.some((i) => i.kind === "invalid" && !omitReason(i))) bits.push(BAD_FOOT);`.
  - `omitReason` se importa en `js/app.js:9-12`.
- Hoy toda fila no válida tiene motivo, así que el footer no sale nunca. `BAD_FOOT` (`js/import.js:41`) se queda como red de seguridad.
- El footer de `Duplicada` (`:1478`) no cambia.

### 4. Nombre de archivo largo sin espacios (hallazgo nuevo)

Spec: §5.3 y §8.12.4.

- Hay que añadir `.row--account .row__sub { overflow-wrap: break-word; }` detrás de `.row__sub` en `css/components.css:31`.
- Por qué: hoy, a 28 px, `exportacion_cuenta_principal_TH17.json` se corta (`…TH17.jso`, 36 px fuera; la `.list` tiene `overflow: hidden`). Captura en `/workspace/pr4-review-caps/113/nombre-largo-28-light.png`.
- Con el cambio, Roster sale idéntico píxel a píxel a 17 y 28 px, en claro y en oscuro.

### 5. Versión y cachés

- `js/caches.js:1-2`: `APP_VERSION = "1.1.3"` y `SHELL_CACHE = "cp-shell-v7"`. Cambian JS, CSS y el manifiesto, que va en el shell (`sw.js:22`).
- `IMAGE_CACHE` sigue en **`cp-img-v4`**: ningún PNG cambia.
- **1.1.3 lleva el manifiesto v1.3.2**:
  - origen: `/workspace/clash-pwa-imagenes/v1.3.2/manifest.json`, sha256 `cec90f014ab914a11cb05a9c33c86a371c3ac11f10bbde376671763b0cd16c31`;
  - respecto a v1.3.1 solo cambia la cabecera (`version_set_imagenes` «v1.3.2» y `versiones_congeladas`);
  - va a `assets/manifest.json`, junto con el `missing.json` / `FALTANTES.md` de ese set si cambian;
  - los porcentajes y las imágenes no cambian.

## Comprobación esperada

Medido con la referencia, en Chrome a 390×844, DPR 2:
- Lote con 9 filas «No válido», de 17 a 32 px, en claro y en oscuro:
  - ningún subtítulo desborda;
  - ningún `·`, `»` ni `…»` empieza línea hasta 28 px;
  - a 28 px las filas tienen como mucho 2 líneas de subtítulo (antes 4);
  - no hay footer «No es una exportación válida.».
- Capturas de antes y después: `/workspace/pr4-review-caps/113/antes-despues-lote-17.png` y `-28.png`.

## Para Imágenes (no es cambio de Diseño, no bloquea 1.1.3)

- **Cajas con alfa > 8 en `build.py`**, para un set posterior con revisión de todas las imágenes.
- El impacto está calculado con los PNG de v1.3.2 y la fórmula de `frameOf` (`js/app.js:192-206`):
  - de 171 imágenes con caja, la caja cambia en 96, pero `z` solo cambia en 10;
  - más de un 5 %: Alquimista 93000002 (+9,0 %), Tiradora 107000000 (+7,2 %) y Balón punzante 90000014 (+5,1 %);
  - cerca del límite: Mina de rastreo aéreo 12000006 (+4,5 % de 40 a 72 px; centro +5 % en x a 96 px);
  - ninguna empieza ni deja de encuadrarse.
- La tabla completa está en `/workspace/pr4-review-caps/113/umbral/LISTA.md`.

## Comprobaciones de la entrega

- `maqueta/css/sistema.css` está regenerado con `tools/extract_css.py` (35 bloques; una regla nueva en §5.3).
- `check_css.py` da el mismo resultado que antes: llaves OK, `--cx/--cy/--z` sin definir, y `format/replace` como falsos positivos que ya estaban.
- El parche se aplica limpio sobre `c5224d0` (`git apply --check`) y el resultado es idéntico a `docs/sistema.md` de esta carpeta.
