# Entrega de Diseño para 1.1.2 (base: main `528c3d4`, v1.1.1)

## Qué hay en esta carpeta

- `docs/sistema.md` es el sistema unificado: un solo texto para el repo y la copia maestra de Diseño. Sustituye tal cual a `docs/sistema.md` del repo.
- `diff-vs-528c3d4.patch` es el diff unificado frente a `docs/sistema.md` de `528c3d4`. Se aplica limpio con `git apply` en la raíz del repo.
- Las secciones nuevas o tocadas son:
  - §5.3: separadores y `.row--account` en el lote.
  - §5.4: «Qué cuenta en el %».
  - §5.11: la regla de los 150 ms.
  - §7b.1: el aviso «Sin identificar» y el Logger.
  - §8.3, §8.4, §8.5, §8.6 y §8.8.
  - §8.11, nueva: las decisiones del 8 oct.
  - §10: los puntos 7, 15, 18 y 20 (nuevo).
  - La nota de cambios del 8 oct (1.1.1 y 1.1.2).

## Cambios que hay que implementar en 1.1.2

Las líneas son de `528c3d4`.

### 1. «N ítems sin identificar» con la misma comprobación que el %

Spec: §5.4 «Qué cuenta en el %», §7b.1 y §8.4.

- Hay que crear un solo helper, por ejemplo `outsidePct(index, id, th)` en `js/progress.js`.
  - Es verdadero si el ítem es desconocido (`presentItem(index, id).unknown`), **no** es `categoria === "crafting_module"` y `capsMaxFor(index, id, th) == null`.
  - `capsMaxFor` ya busca ID → `ALIAS` (`js/progress.js:13-19`) → `nombre_en` → caps. Es la misma búsqueda que da la barra y el %.
  - El `estado` del manifiesto no decide nada.
  - Las **dos** condiciones van juntas: se muestra como "?" **y** no tiene tope tras `ALIAS`. Solo «sin tope» metería ítems conocidos sin clave en caps (Ayuntamiento, Estación de crafteo, Cabaña de B.O.B). Precisión de Clash, 8 oct.
  - Además, el aviso cuenta solo los ítems de las secciones que alimentan el %; los ayudantes quedan fuera porque no son categoría de progreso. `levelsOf()` solo recorre `SECTIONS` (`js/import.js:7`), sin `helpers`; por eso `93000003` («?» en C1, sin clave en caps) no suma y C1 da 8. Decisión del Líder, 8 oct.
- Lo usan los dos sitios:
  - **Vista previa**: `countUnknown` en `js/import.js:188-197`, que alimenta `unknownCount` en `js/import.js:285`. Hoy solo excluye `crafting_module` y cuenta 107000008.
  - **Aviso de los detalles de categoría**: `unidentifiedOutside` en `js/app.js:716-724`, con el texto en `js/app.js:707-710`. Hoy usa el `estado`.
- Texto del aviso: `N ítems sin identificar no cuentan en el %.` o `1 ítem sin identificar no cuenta en el %.`.
  - **Se quita** la coletilla «salvo cuando el archivo de máximos les da un tope (laboratorio, defensas crafteadas y el guardián sin ficha)» (`js/app.js:709`).
  - Con N = 0 no se muestra el aviso. El grupo «Sin identificar» puede seguir saliendo.
- Singular de la vista previa: `1 ítem sin identificar: se guarda igual.` (`js/import.js:59-62`, `unknownMsg`; hoy dice «se guardan» también en singular).
- **Test nuevo** en `test/progress.test.mjs`, junto al de C2 (`:558-565`):
  - C1 da **8** en la vista previa (`changes.unknownCount`).
  - La suma de los avisos de las categorías más las piezas sin identificar de Equipamiento también da 8.
  - Las otras 10 cuentas dan **4** (`90000016`, `57`, `60`, `61`).
  - Defensas de C1 da 0 (sin aviso) y 107000008 no está en el recuento.
  - C2 y las 9 TH13/TH11 siguen dando 4.
  - Hoy C1 da 9. Comprobado con los datos del 07/10 y el manifiesto v1.2: C1 = Laboratorio 3 + Equipamiento 5.

### 2. Logger (107000008)

Spec: §7b.1 y §10.7.

- La clave en caps es `Guardian-Logger` (`ALIAS`, `js/progress.js:13-19`). Los porcentajes no cambian: ya cuenta (`Nv 1 / 5` en C1).
- La presentación llega con el próximo set de imágenes, en el que Imágenes lo pasa a `id_deducido` con `nombre_en` «Logger». Debe quedar así:
  - el título es `Logger`, sin nombre en español;
  - lleva `.badge` «ID deducido»;
  - la ficha lleva la footnote «Nombre en español sin confirmar»;
  - imagen del Fan Kit solo si existe; si no, iniciales y «Sin imagen».
- No hay que meter ninguna excepción en el código: la app ya lee el `estado` y `nombre_pendiente` del manifiesto.
- Comprobación: con el manifiesto nuevo, Defensas de C1 muestra «Logger» con su barra en «Pendientes».

### 3. «Validando…» solo tras 150 ms, nunca como destello

Spec: §5.11 y §8.3 #5.

- Hoy se pinta siempre y se quita a los 2 frames (unos 33 ms medidos):
  - `validateTexts` en `js/app.js:1533-1546`, con `paintFrame` en `:1529-1531`;
  - `files.onchange` en `js/app.js:1963-1980`.
- El temporizador de 150 ms arranca cuando el texto ya está disponible (tras resolverse `readText()`) o al elegir los archivos, **nunca** mientras el sistema espera al usuario (globo «Pegar» de iOS). Corregido el 8 oct tras la revisión del PR #4:
  - si vence antes de tener el resultado, se pone `phase = "validating"` y se hace `render()`;
  - al terminar se hace `clearTimeout` y se pinta el resultado directamente;
  - con varios archivos hay que ceder el hilo entre archivos (`await`) para que el temporizador pueda vencer.
- Comprobación: con CPU normal no aparece nunca; con CPU ralentizada ×20 sí aparece.

### 4. Archivos siempre abre el lote, también con 1 archivo

Spec: §8.3.

- Hay que cambiar `phase = items.length > 1 ? "batch" : "single"` en `js/app.js:1978` para que, desde Archivos, sea siempre `"batch"`.
- `validateTexts` (`:1544`) sigue igual para Pegar.
- Resultado esperado:
  - el resumen es `1 archivo · 1 listo` y el botón `Importar 1 cuenta` (ya existen en `batchSummary`, `js/import.js:428-443`, y en `importActions`, `js/app.js:1282-1287`);
  - la vista previa se abre tocando la fila (`‹ Importar`);
  - «Pegar otra» (`js/app.js:1295-1315`) no aparece en el flujo Archivos.

### 5. Media sin cambio: `49,0 % · sin cambio`

Spec: §8.4 y §8.5.

- Hoy sale `49,0 % → 49,0 % sin cambio` y a 17 px parte línea. El código está en:
  - `mediaLine`, `js/import.js:492-496`;
  - `mediaDelta`, `js/import.js:178-186`;
  - `kvHtml`, `js/app.js:1410-1416`.
- Si `delta.dir === "flat"`, la fila debe ser `fmtPct(mediaTo)` + ` · ` + `<span class="delta">sin cambio</span>`, sin flecha.
- Con cambio queda igual: `48,8 % → 50,1 %` con la `.delta` en `nowrap` (ya está en `css/views.css:129`).
- Medido: `49,0 % · sin cambio` cabe en una línea a 17 px, en una columna `dd` de 158 px.

### 6. «Empieza por «…».»: el final va pegado

Spec: §8.4 y §8.6.

- El texto sale de `js/parse.js:35` y se parte en `errorCard`, `js/app.js:1344-1353`, donde se mete la muestra en `.tag`.
- Hay que meter el último carácter de la muestra, `»` y `.` juntos en `<span class="nowrap">`:
  `Empieza por «<span class="tag">https://link.clasho</span><span class="nowrap"><span class="tag">f</span>».</span>`
- Hay que añadir `.nowrap { white-space: nowrap; }`, en `css/base.css` o en `css/components.css`.
- Un `&nbsp;` no sirve: no hay espacio y `overflow-wrap: anywhere` corta entre cualquier par de caracteres.
- Probado con 7 muestras, de 17 a 32 px: no queda ningún `.`, `»` ni `».` suelto y no hay desborde. Hoy, sin el cambio, el `.` queda suelto.

## Pendiente de decisión (no bloquea 1.1.2)

- Con el punto 4, un archivo ilegible pasa a ser una fila «No válido» con el nombre del archivo, y los textos de archivo de `parseLoose` (`El archivo está incompleto.`…) ya no se ven en ningún sitio.
  - La propuesta de Diseño es poner como subtítulo `<archivo> · <motivo sin punto>`.
  - La alternativa es quitar esos textos.
  - Detalle en §8.11.

## Comprobaciones de la entrega

- `maqueta/css/sistema.css` está regenerado con `tools/extract_css.py` (35 bloques).
- `check_css.py` da llaves OK y el mismo resultado que antes: `--cx/--cy/--z` sin definir y `format/replace` como falsos positivos, que ya estaban.
- El parche se aplica limpio sobre `528c3d4` (`git apply --check`).


## Añadido por Diseño (8 oct, 06:45)
- Fila «No válido» del lote: subtítulo `<archivo> · <motivo sin punto final>` (§8.11.7).
- Muestra de «Empieza por» con «…» si pasa de 20 caracteres; el grupo nowrap queda `…».` (§8.11.8).
- Singular `1 ítem sin identificar: se guarda igual.` (§8.11.9).
