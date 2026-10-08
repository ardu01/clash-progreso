# Propuesta de Diseño para 1.1.4 (auditoría de main `1b898df`, 1.1.3)

8 oct 2026 · Diseño. **No modifica el master** (`/workspace/clash-pwa-diseno/sistema.md`): los cambios de especificación van redactados abajo (§S) para aplicarlos cuando se aprueben.

**Banco de pruebas.** Playwright con Chrome a 390×844 (DPR 3, safe area 59/34) y 375×667 (iPhone SE, DPR 2, 20/0). UA de iPhone, `es-ES`, `Europe/Madrid`, reloj fijo `2026-10-08 06:00` (Madrid). Claro y oscuro, a 17 y 28 px (23 px en las comprobaciones de fechas). Se recorrieron 61 vistas por configuración: Roster; Progreso de C1, C2, #GUQUV98JG (TH13) y #R02YUVC0J (TH11) en cada categoría, más Equipamiento y fichas; Mejoras (por fin y por cuenta); Evolución; Ajustes; Importar (Pegar y Archivos). Además se probaron teclado y foco, nombres accesibles y movimiento reducido.

**Evidencias.** Las capturas están en `/workspace/pr4-review-caps/114/` (`evid/` con antes y después, `sweep/<disp>-<tema>-<px>/`) y las mediciones en `evid/evid.json`, `a11y.json` y `sweep/*/audit.json`. Cada arreglo marcado como «verificado» se probó inyectando el cambio, sin desborde horizontal ni recortes nuevos a 17 y 28 px.

---

## Hallazgos, por impacto

### 1. Alta. A 17 px, el «…» del título se come «ID deducido» y el «×N»
- **Qué pasa.** `.row__title` es un bloque con `nowrap` y `ellipsis`, y la insignia y el recuento van dentro. Cuando el nombre es largo, el recorte se lleva la información, que es justo lo que §5.3 y §10.7 piden mostrar siempre.
- **Casos medidos** (`evid/evid.json`, claves `B-*`):
  - 390 px: Colmillos eléctricos y Corazón ardiente (C1 Equipamiento, «ID deducido»), Torre de arqueras múltiple ×3 y Extractor de elixir oscuro ×2/×3.
  - 375 px: además Mochila cohete, Conjunto de explosivos ×2/×4 y Trampa de esqueletos ×4.
  - A 28 px no pasa: el bloque `@container` ≤ 19em ya parte el título.
- **Evidencia.** `evid/B-i14-17-antes-vs-fix.png` y los pares `evid/B-{i14,se}-{equip,defensas,trampas}-N-{antes,fix}.png`.
- **Código en 1b898df:**
  - `js/app.js:612`, `:620` (Héroes), `:776` (`detailRow`), `:838` (aldea nocturna), `:952` (`upRow`);
  - `css/components.css:30` y `:94-100`.
- **Arreglo (verificado).** El nombre se recorta solo; la insignia y el recuento no se encogen.
  ```js
  // app.js:776 (igual en 612, 620, 838 y 952)
  <span class="row__title row__title--meta"><span class="row__name">${esc(title)}</span>${cnt ? `<span class="num">${cnt}</span>` : ""}${badge}${idBadge}</span>
  ```
  ```css
  .row__title--meta { display: flex; align-items: baseline; }
  .row__title--meta > .row__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row__title--meta > .num, .row__title--meta > .badge { flex: none; }
  .row__title--meta > .num { margin-left: 0.25em; }          /* sustituye al &nbsp; */
  @container (max-width: 19em) {
    .row .row__title--meta { display: block; }
    .row .row__title--meta > .row__name { white-space: normal; overflow: visible; }
  }
  ```

### 2. Media-alta. La fecha y la hora se separan en dos líneas (`fmtWhen`/`fmtFin` con espacio normal)
- **Dónde.** Ya pasa **a 17 px** en el subtítulo del selector de cuenta de Progreso, en 390 y en 375 px: «…datos de mié 07/10 ⏎ 21:22», en C1 y C2.
  - A 23 px pasa en el meta de las tarjetas de Roster («próxima dom 11/10 ⏎ 21:46») y en el `large-sub` de Roster en SE.
  - A 28 px pasa en todos los «Tiempos estimados desde la exportación de…» de Mejoras › Por cuenta.
- **Evidencia.** `evid/H-i14-17-selector-fecha-partida.png` (antes), `evid/H-i14-17-selector-fix.png` (después), `evid/H-mejoras-i14-28.png` y `evid/H-{i14,se}-23-roster-card.png`.
- **Código.** `js/format.js:48-50` (`fmtFin`), que llama `js/app.js:344` (`fmtWhen`). Se usa en `app.js:502-503`, `:921` y `:955`.
- **Arreglo (verificado).** No hay tests que dependan del formato.
  ```js
  export function fmtFin(ms) {
    return finFmt.format(new Date(ms)).replace(/,/g, "").replace(/ /g, "\u00a0");   // «mié 07/10 21:22» no se parte
  }
  ```

### 3. Media. Los sheets (Ajustes, Importar y Ficha) no gestionan el foco
- **Qué se midió** (`a11y.json` y `evid/evid.json`, claves `A-*`), con teclado externo o iPad:
  - Al abrir, el foco se queda en `BODY`.
  - El primer Tab va a la tarjeta C1 **de detrás del velo**, así que no se ve ningún foco. Hay que pasar por todo el Roster y la tab bar antes de entrar al sheet.
  - Esc no cierra ni Ajustes ni la Ficha.
  - Al cerrar la Ficha, el foco vuelve a `BODY`, no a la fila que la abrió.
  - VoiceOver respeta `aria-modal`, pero su cursor no entra en el sheet al abrirlo.
- **Evidencia.** `evid/A-ajustes-tab1-foco-detras.png`: sheet abierto tras un Tab y sin anillo visible, porque el foco está en la tarjeta tapada.
- **Código.**
  - Sheets en `js/app.js:1157-1160` (Ajustes), `:1201-1204` (Importar) y `:1683-1686` (Ficha).
  - `render()` reescribe todo `#app` en `:1776`.
  - Cierre de la Ficha en `:1835`. No hay ningún `keydown` en `app.js`.
  - Solo Importar enfoca algo, `[data-import-focus]` en `:1786-1790`, y únicamente en ciertos estados.
- **Arreglo.**
  1. Al final de `render()`, si hay sheet: enfocar `.sheet h2` (con `tabindex="-1"`) y poner `inert` en `.navbar`, `#screen` y `.tabbar`.
  2. Añadir un `keydown` global: `Escape` hace lo mismo que el OK o el velo (`[data-close-ficha]`, `#/roster` para Ajustes, Cancelar para Importar).
  3. Guardar el que abrió el sheet (`state.focusReturn = '[data-ficha="ID"]'` o `[data-go="#/ajustes"]`) y enfocarlo tras cerrar.

### 4. Media. Las filas se leen duplicadas en VoiceOver
- **Qué pasa.** Una `role="img"` dentro de un `<button>` o `<a>` se suma al nombre accesible:
  - «Príncipe Esbirro Nv 31 / 95 **Nv 31 / 95**»;
  - «Defensas 70,1 % **Defensas: 70,1 %** Faltan 190 niveles».
  Medido con `aria_snapshot` en `scripts/axname.py`. El Roster sí está bien: lleva `aria-label` completo, como pide §9.
- **Código.**
  - `js/app.js:322` (`barHtml`);
  - llamado desde `:557` (`catRow`), `:620` (Héroes) y `:755` (`rowLevel`, usado en `detailRow` `:760-779`).
- **Arreglo.**
  - Nueva opción `barHtml(…, { decorative: true })` que pinta `aria-hidden="true"`, sin `role` ni `aria-label`. Se usa en las barras que van **dentro de una fila** cuyo texto ya dice lo mismo.
  - Para no perder la segunda referencia: la fila lleva `aria-label`, p. ej. «Príncipe Esbirro, nivel 31 de 95» o «Defensas, 70,1 %, TH17 64,0 %, faltan 190 niveles». Si es `id_deducido`, se añade «, ID deducido».

### 5. Media. «ID deducido»/ID en la Ficha con contraste 4,09:1 (claro)
- **Qué pasa.** `.badge-id` (`--label-2` sobre `--fill-3`) pasa en listas, porque va sobre `--bg-2` blanco. En el sheet va sobre `--bg` #F2F2F7: compuesto da 227,227,233 y el contraste es **4,09** (< 4,5). Sale en las 36 vistas de ficha en claro; en oscuro pasa.
- **Evidencia.** `evid/D-ficha-badge-id-light.png`.
- **Código.** `js/app.js:1725` (`<p class="badge badge-id">`) y `:1707` (`badge` «sin identificar»); `css/components.css:94-102`.
- **Arreglo.** Con fondo `--bg-2`: 5,23 en claro y > 7 en oscuro.
  ```css
  .sheet .badge:not(.badge--soft) { background: var(--bg-2); }
  ```

### 6. Media-baja. El select del gráfico mide 20 px de alto
- **Qué pasa.** En Evolución, «Media del roster ▾» mide 108×20 a 17 px y 178×33 a 28 px. HIG y §9 piden 44.
- **Evidencia.** `evid/E-chart-select-20px.png` y `evid/E-chart-select-fix-44px.png`.
- **Código.** `js/app.js:1010`; `css/views.css:85-90` (`padding: 0`).
- **Arreglo (verificado).** 108×44 sin moverse nada:
  ```css
  .chart-select { padding-block: 12px; margin-block: -12px; }
  ```

### 7. Baja. Ajustes a 28 px parte cifras y el botón queda sin aire
- **Qué pasa.**
  - «0 de ⏎ 185» parte el contador.
  - «Descargar todas (61,0 ⏎ MB)» separa el número de la unidad, y el texto de dos líneas toca los bordes del botón: `.btn` tiene `padding: 0 var(--sp-5)`.
- **Evidencia.** `evid/F-ajustes-28.png` y `evid/F-ajustes-28-fix.png`.
- **Código.** `js/app.js:1174` (contador), `:1137-1143`; `js/format.js:80-83` (`fmtBytes`, `+ " MB"`); `css/components.css:188`.
- **Arreglo (verificado).**
  - `fmtBytes`: `+ "\u00a0MB"`.
  - CSS:
    ```css
    .offline-dl__top .num { white-space: nowrap; }
    .btn { padding-block: var(--sp-2); }   /* min-height 50 manda a 17 px: no cambia nada */
    ```

### 8. Baja. Resumen de Progreso apretado en SE a 28 px
- **Qué pasa.** «64,0 %» queda a unos 4 px del divisor, porque la columna izquierda tiene `padding-right: var(--sp-1)`. «54,5 %» llega justo al borde del contenido. No se recorta, pero se ve pegado. Además, la implementación no coincide con §7b: el spec pide `padding: var(--sp-3) var(--sp-4)` y `border-left`, y el código usa `--sp-2 --sp-1` con `box-shadow`.
- **Evidencia.** `evid/G-summary-se-28-antes.png` y `evid/G-summary-se-28-fix.png`.
- **Código.** `css/views.css:10-15`; `js/app.js:520-526`.
- **Arreglo (verificado).** Se apila solo en SE a 28 px y en 390 px a 28 px. A 17 y 23 px no cambia nada.
  ```css
  .section:has(> .summary) { container-type: inline-size; }
  @container (max-width: 13em) {
    .summary { grid-template-columns: 1fr; }
    .summary > div + div { box-shadow: inset 0 0.5px var(--separator); padding-left: var(--sp-1); }
  }
  ```

### 9. Baja. La tabla `.sr-only` del gráfico lee la fecha en ISO
- **Qué pasa.** VoiceOver lee «2026-10-07» en la tabla del gráfico.
- **Código.** `js/app.js:1110` (`esc(p.day)`).
- **Arreglo.** Usar `p.label` o `dd/mm` como en el eje (`:1108`).

### 10. Baja. `input[type=file]` sin nombre y enfocable
- **Qué pasa.** El input mide 1×1 y no tiene nombre accesible, pero se puede enfocar. VoiceOver llega a él como «botón, sin etiqueta».
- **Código.** `js/app.js:1206`; `css/views.css:122`.
- **Arreglo.** Añadirle `tabindex="-1" aria-hidden="true"`. Se abre desde «Elegir archivos…» (`data-act="pick"`, `:1315`).

**Higiene (no puntúa).**
- `app.js` tiene 18 `style="…px"` en línea (`:535`, `:562`, `:564`, `:597`, `:813`, `:886-887`, `:915-923`, `:998-1004`, `:1016`, `:1178` y `:1268`), casi todos `margin-top: 8px/12px`. Conviene pasarlos a clases con tokens (`.mt-2`/`.mt-3`) cuando se toque esa zona.
- En §10, el ítem 20 va antes del 19.

## Verificado sin problemas
- **Mejoras.** Las 69 mejoras y los 6 ayudantes tienen su fin, recalculado como `timestamp + timer` en Europe/Madrid, y coinciden 75 de 75 con la UI.
- **Evolución.** 29 subidas pendientes, «20 de 49 subidas desde TH11», «1 de 11 en objetivo». Objetivo TH18 + TH17 + 9×TH15.
- **Héroes.** En 6.º lugar. En C1, el detalle va ordenado por «Pendientes» y nada lo presenta como cuello de botella.
- **Aviso FCP.** Al pie de todas las vistas y sheets.
- **Datos.** Sin «undefined», «NaN» ni «null» en ningún texto.
- **Accesibilidad básica.**
  - Movimiento reducido: animaciones de 0,01 ms (150/320 ms sin preferencia).
  - `:focus-visible` de 3 px.
  - `lang="es"`.
  - `aria-current` en la tab bar.
  - Todas las barras con etiqueta.
- **Contraste.** Pasa en oscuro en todas las vistas. En claro, el único fallo es el n.º 5.
- **Maquetación.** Sin desborde horizontal en ninguna vista ni configuración. La safe area está bien en la nav, la tab bar y los sheets.
- **Consola.** Limpia.
- **Enlace FCP en línea.** Mide 14–22 px de alto, pero es un enlace dentro de un párrafo, que es la excepción de WCAG 2.5.8. No se toca.

---

## §S. Cambios de especificación propuestos para `sistema.md` (borrador; el master no se ha tocado)

**§5.3, CSS de filas.** Añadir tras la regla `.row__title` (l. ~386):
```css
/* Título con insignia o recuento (1.1.4): se recorta solo el nombre */
.row__title--meta { display: flex; align-items: baseline; }
.row__title--meta > .row__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row__title--meta > .num, .row__title--meta > .badge { flex: none; }
.row__title--meta > .num { margin-left: 0.25em; }
```
y dentro del `@container (max-width: 19em)`:
```css
.row .row__title--meta { display: block; }
.row .row__title--meta > .row__name { white-space: normal; overflow: visible; }
```
**§5.3, párrafo «Dynamic Type en filas»** (l. 402). Añadir: «A tamaño normal, en las filas con insignia o `×N`, el título es `.row__title--meta`: el «…» recorta solo `.row__name`, y «ID deducido», el ID y `×N` se ven siempre (1.1.4).»

**§5.13, Sheet.** Añadir el párrafo «Foco»: «Al abrir un sheet, el foco va a su `h2` (`tabindex="-1"`). Mientras está abierto, `.navbar`, `#screen` y `.tabbar` llevan `inert`. Esc cierra igual que OK, el velo o Cancelar. Al cerrar, el foco vuelve al control que lo abrió (la fila `[data-ficha]`, «Ajustes» o «Importar»).»

**§7b.2, Resumen** (l. 1099-1106). Sustituir el CSS por:
```css
.summary { display: grid; grid-template-columns: 1fr 1fr; padding: 0; }
.summary > div { min-width: 0; padding: var(--sp-2) var(--sp-1); }
.summary > div + div { box-shadow: inset 0.5px 0 var(--separator); padding-left: var(--sp-4); }
.section:has(> .summary) { container-type: inline-size; }
@container (max-width: 13em) {             /* SE y 390 px a 28 px: una columna */
  .summary { grid-template-columns: 1fr; }
  .summary > div + div { box-shadow: inset 0 0.5px var(--separator); padding-left: var(--sp-1); }
}
```
Así el spec refleja lo que hay e incluye el apilado.

**§7d, `.chart-select`** (l. 1351). Cambiar `padding: 0` por `padding: 12px 0; margin: -12px 0;`, con el comentario «/* 44 px de alto táctil sin mover nada */».

**Formatos** (§7c/§8, junto a la hora de fin). «La fecha y hora (`fmtFin`/`fmtWhen`, «mié 07/10 21:22») y los tamaños (`61,0 MB`) llevan espacios de no separación: nunca se parten. Los recuentos «N de M» en trailing llevan `nowrap`.»

**`.btn`** (§5.x Botones). Cambiar `padding: 0 var(--sp-5)` por `padding: var(--sp-2) var(--sp-5)`.

**§9, Contraste.** Añadir: «`.badge` neutra (`--fill-3`) solo sobre `--bg-2`. Sobre `--bg` (sheets) da 4,09:1, así que en sheets lleva fondo `--bg-2` (5,2:1).»

**§9, Lectores de pantalla.** Sustituir la segunda viñeta por:
«Cada fila es un único `<a>`/`<button>` con un texto completo, sin repeticiones:
- en el Roster, "C2 Secundaria, TH16, objetivo TH17, media 48,8 %";
- en el detalle, "Príncipe Esbirro, nivel 31 de 95" (+ ", ID deducido");
- en Categorías, "Defensas, 70,1 %, TH17 64,0 %, faltan 190 niveles".
La barra de dentro de una fila es decorativa (`aria-hidden="true"`); las barras sueltas siguen con `role="img"` y `aria-label`. Las tablas `.sr-only` usan fechas legibles (`07/10`), nunca ISO. El `input[type=file]` oculto lleva `tabindex="-1"` y `aria-hidden`.»

**§10, Checklist.** Reordenar 19 y 20, y añadir:
- 21. [ ] A 17 px, en 375 y 390 px, ninguna fila recorta «ID deducido», el ID ni `×N` (C1 Equipamiento: Corazón ardiente, Colmillos eléctricos; Defensas: Torre de arqueras múltiple ×3; Trampas en SE: Trampa de esqueletos ×4).
- 22. [ ] Fecha y hora nunca en dos líneas (selector de Progreso a 17 px; Roster a 23 px; Mejoras › Por cuenta a 28 px). `MB` y «N de M» tampoco.
- 23. [ ] Sheets con teclado: el foco entra al abrir, Tab no sale al fondo, Esc cierra y el foco vuelve al que lo abrió.
- 24. [ ] Nombres accesibles sin duplicar (filas de detalle y de Categorías). El `.badge-id` de la Ficha pasa de 4,5:1 en claro. El select de Evolución mide ≥ 44 px de alto.

**Nota de cambios** (para añadir al aplicarlo). «8 oct 2026, auditoría de 1.1.3 (`1b898df`) y especificación de 1.1.4: título de fila con meta (§5.3), foco en sheets (§5.13), resumen apilado a 28 px (§7b), objetivo del select (§7d), NBSP en fechas y tamaños, `.btn` con padding vertical, contraste de `.badge` en sheets y nombres accesibles de filas (§9), y checklist 21–24 (§10).»
