# Plan 4.0

Auditoría del repo y plan de integración. Este documento no cambia la app. No hay código de la 4.0 en esta rama. Miguel lo aprueba antes de programar.

La auditoría mira dos sitios a la vez: lo que ya está en `main` y lo que está en cola en las 3.1.x. El diseño de pantallas de la 4.0 asume que esa cola se fusiona antes de programar. Si alguna 3.1.x no entra, se rehace solo el apartado de navegación, no el motor.

## 1. Qué hay hoy

### Publicado

`main` está en la **3.1.0** (commit `c4d6409`, PR #17). Cachés `cp-shell-v18` y `cp-img-v6`.

La barra publicada tiene cinco pestañas: Cuentas, Progreso, Mejoras, Gráficos y Copia. «Qué hacer ahora» ya sale del plan de cada cuenta (`ahoraDe`), no de una cola ocupada. El equipamiento ya no entra en la media de la aldea.

### En cola, sin fusionar

| PR | Versión | Qué aporta | Qué no aporta |
| --- | --- | --- | --- |
| [#18](https://github.com/ardu01/clash-progreso/pull/18) | 3.1.1 | PNG oficiales por nivel y Cuervo avaricioso | Lógica nueva |
| [#19](https://github.com/ardu01/clash-progreso/pull/19) | 3.1.2 | Inicio, barra Inicio / Cuentas / Mejoras / Análisis / Agenda, ranking, calor y criterio del plan | Motor nuevo |
| [#20](https://github.com/ardu01/clash-progreso/pull/20) | 3.1.3 | Menas, bomba aérea de TH18, costes de niveles bajos y topes de equipamiento | Porcentajes de las 11 cuentas (no cambian) |
| [#21](https://github.com/ardu01/clash-progreso/pull/21) | 3.1.4 | 15 PNG del lote 3 y nombres del texto del juego | Lógica nueva |

Esta auditoría está hecha sobre la punta de esa pila (3.1.4). Ahí la barra ya es la de la 3.1.2: Inicio, Cuentas, Mejoras, Análisis y Agenda. Copia y Acerca de se abren desde el ajuste de Inicio. `APP_VERSION` es `3.1.4`, `cp-shell-v22`, `cp-img-v8`. `ROSTER_VERSION` sigue en 2.

La 4.0 no repite imágenes, nombres, costes ni el estilo de la 3.1.2.

### Piezas que ya cubren parte del encargo

No se reescriben. La 4.0 las llama.

| Ya existe | Dónde | Sirve para | No llega a |
| --- | --- | --- | --- |
| Exportaciones por tag y fecha | IndexedDB `clash-progreso` v2, almacén `exports` | Historial real. La clave es `[tag, timestamp]` | Planes, sesiones, guerras |
| Copia fusionada | `js/backup.js` | No borra cuentas, puntos, planes ni marcas que solo están en el iPhone | El sueño, los filtros ni nada de la 4.0. La copia actual lleva cuentas, exportaciones, planes y provisionales |
| Roster v2 | `localStorage` `cp-roster` | Altas, bajas, alias, Principal, objetivo de TH, grupos (hasta 6) y meta `{ clave, pct }` | Una cuenta borrada no vuelve a sembrarse. No se sube `ROSTER_VERSION` |
| Plan por cuenta | `cp-planes`, `js/roadmap.js` | `maxear` o `rushear`, TH objetivo, foco ataque / defensa / muros / héroes, recurso y tope de duración. Línea de tiempo con constructores, laboratorio y casa de mascotas | Equilibrado, Principal, Mantenimiento, ni un plan distinto por escenario |
| Siguiente paso | `ahoraDe` | Cola libre ahora y el primer paso de esa cola | Un itinerario con minutos, ni marcar hecho |
| Orden de abrir hoy | Inicio, `prioridadDe` | La cola que queda libre antes. Sin hora exacta no entra | Duración de la visita ni estrategia de sesión |
| Agenda | `fleetAgenda`, 21 días | Cuándo queda libre cada cola | Eventos, guerras ni un calendario de descuentos |
| Marca provisional | `js/provisional.js` | El usuario declara un paso. Al importar, la exportación confirma o descarta. No cambia niveles ni % | Una sesión, una guerra ni un gemelo |
| Sueño | `cp-sueno`, `js/schedule.js` | Un tramo global en hora de Madrid. No se inventa la hora si el temporizador no es un número | Sueño distinto por cuenta en los datos reales. Un gemelo sí puede probar otro tramo, solo dentro de la simulación |
| Coste hasta el máximo | `js/costs.js`, `data/costes.json` | Oro, elixir, oscuro, muros, menas y segundos por nivel | El oro que hay en los almacenes. La exportación no lo trae |
| % de progreso | `js/progress.js` | Media de la aldea sin equipamiento. `groupScore` usa el mayor entre tope y colocados. El nivel 1 de equipamiento no cuenta | Un índice de equilibrio. Ese índice no sustituye estos % |
| Historial | `js/history.js` | Diferencia entre importaciones, ritmo semanal de Madrid, racha y categorías al máximo | El instante real de la subida. Solo se sabe en qué importación apareció |
| Objetivos de flota | Inicio | Cuentas por debajo de su `objetivo` de TH y fecha estimada del plan hasta el máximo del TH anterior | «5 cuentas en TH15» como meta con escenarios. No es el día de subir el ayuntamiento |
| Aviso de subida floja | `rushGaps` | Tras subir de TH, categorías bajo el 50 % del TH anterior | Una lista oficial de requisitos. No existe en los datos |
| Héroes de C1 | `HEROES_FUERA` = `#28PLGP0G2` | Fuera del plan, porque Miguel los sube con pociones | Un cuello de botella. La 4.0 tampoco los marca así |
| Constructores | `builderStatus` | Choza conocida, ocupados, libres. `extra` no ocupa un constructor normal | Inventar un constructor si el dato no está |
| Gráficos | `js/charts.js` | Líneas, calor, radar, barras | Informes para compartir |
| Nombres | `itemName` | Español del manifiesto si no está pendiente; si no, el inglés | Nombres inventados |

La app no tiene dependencias (`package.json` solo declara el tipo de módulo). Las pruebas son `node --test` sobre `test/progress.test.mjs`, `test/multicuenta.test.mjs` y `test/roadmap.test.mjs`. `js/app.js` concentra la interfaz (unas 4.700 líneas). IndexedDB solo guarda exportaciones y copias automáticas. El resto vive en `localStorage`.

La exportación trae edificios, trampas, tropas, hechizos, máquinas, héroes, mascotas, equipamiento, guardianes, ayudantes y `timer` en segundos desde `timestamp`. No trae oro, elixir, oscuro, nombre del jugador, clan, ataques ni estrellas. Lo que no está ahí es hipótesis o dato manual, y la pantalla lo dice.

## 2. Reglas que la 4.0 no afloja

- Sin servidor, sin login y sin pago. Sigue siendo una PWA estática.
- No se automatiza el cliente del juego. El usuario copia el JSON como hasta ahora.
- No se inventan máximos, costes, tiempos, requisitos de ayuntamiento ni resultados de guerra.
- No hay descuento oficial. Un evento es una hipótesis del usuario (tipo Martillamanía), marcada como simulación.
- Una simulación, una predicción o una sesión no escribe la exportación, no mueve niveles y no cambia el %.
- Acción declarada y estado confirmado van separados. Confirmado solo es lo que dice el JSON (`timer`, nivel, o la reconciliación que ya hace `reconcileProvisionals`).
- Los héroes de `#28PLGP0G2` no entran en el plan ni se llaman cuello de botella.
- `ROSTER_VERSION` sigue en 2. Una cuenta borrada no vuelve a sembrarse.
- La copia fusiona por tag y fecha y no borra lo que solo está en el iPhone.
- La lógica de `analyze` / `pct` no cambia sin un test de regresión de las 11 cuentas. En la 3.1.3 ninguna cambió de %.
- Siguen 12 tropas y 2 héroes de la aldea del constructor. No se añaden edificios de esa aldea.
- Nombres en español los que ya trae el manifiesto. No se traducen a mano los que siguen pendientes.
- El aviso de la Fan Content Policy sigue solo en Copia → Acerca de.
- Sin librerías nuevas. IndexedDB, canvas y los módulos actuales bastan.
- Cada fase deja la app usable. No hay una 4.0 a medias que rompa Inicio, el plan o la importación.

## 3. Motor común

La lógica nueva va en módulos pequeños. `js/app.js` solo pinta y engancha rutas. No se parte `app.js` en la 4.0.0: el riesgo de romper la 3.1.2 es mayor que el beneficio.

| Módulo nuevo | Hace | No hace |
| --- | --- | --- |
| `js/origen.js` | Etiqueta cada cifra: `importado`, `manual`, `provisional`, `plan`, `simulacion`, `prediccion`, más la hipótesis en una frase | Calcular |
| `js/prioridades.js` | Ordena cuentas y pasos con un presupuesto de minutos. Lo usan la sesión y el mantenimiento | Escribir datos |
| `js/simulacion.js` | Copia el plan y aplica descuentos, otro TH, otros constructores u otro sueño. Devuelve un resultado | Tocar `exports`, planes reales ni provisionales |
| `js/prediccion.js` | Proyecta el ritmo ya medido por `weeklyPace` en tres escenarios | Inventar un ritmo si no hay pares de importación |
| `js/sesion.js` | Itinerario, marcas de la visita y eficiencia | Confirmar una mejora |
| `js/evento.js` | Escenarios de descuento sobre el coste de `costes.json` | Suponer el descuento de Supercell |
| `js/guerra.js` | Guerras, ataques y alineación a partir de lo escrito y de los % ya calculados | Rellenar estrellas vacías |
| `js/gemelo.js` | Escenario guardado de una cuenta y el paso a plan real | Pisar una mejora con `timer` |
| `js/equilibrio.js` | Índice 0–100 y el desglose | Sustituir `media` |
| `js/diario.js` | Semana, mes y temporada a partir de `historyPairs` | Fechar un cambio en un instante que la importación no tiene |

Al importar, el orden es el de siempre y después un aviso, sin reescribir el JSON:

1. Se guarda la exportación (`putExport`).
2. `reconcileProvisionals` confirma o descarta marcas, como ahora.
3. Las sesiones abiertas de esa cuenta se marcan para recalcular. Lo ya marcado como hecho no se convierte en confirmado: sigue siendo declaración hasta que el JSON lo cubra.
4. Las predicciones de esas cuentas se recalculan y, si la fecha se mueve, se guarda la desviación con la hora de la importación.
5. El diario no crea un hito de nivel. El hito, si el usuario lo quiere, lo anota él. El resumen solo dice «visto en la importación del …».

El recálculo de un roadmap es caro. Inicio ya construye uno por cuenta en cada pintado. Con 50 cuentas no se multiplica eso por cada escenario. Regla: un roadmap real por cuenta, con clave `tag + timestamp + plan + sueño + minuto`. Los escenarios se calculan al pulsar Calcular, no en cada movimiento del control. El resultado se guarda en memoria hasta el siguiente cambio.

## 4. Datos y migración

### Orígenes

Cada registro lleva `origen` y, si hace falta, `hipotesis`.

| Origen | Ejemplo | Quién puede cambiarlo |
| --- | --- | --- |
| `importado` | Nivel, `timer`, TH, constructores | Solo una importación nueva |
| `manual` | Guerra, nota, ingresos, estrategia de equilibrio | El usuario |
| `provisional` | Marca del plan | El usuario. La importación la quita si el JSON la cubre o si no está |
| `plan` | Modo, TH objetivo, focos | El usuario, o un gemelo tras confirmación |
| `simulacion` | Evento, gemelo, sesión de prueba | Nadie fuera de su propio almacén |
| `prediccion` | Fecha de una meta y el escenario | El recálculo. No escribe el objetivo de la cuenta |

Un ingreso de oro es manual: la exportación no trae almacenes. Un «ataque hecho» de guerra es manual. Un héroe en mejora es importado (`timer`). Mezclarlos en un mismo número sin decir la fuente queda prohibido en la interfaz y en los tests.

### IndexedDB

Se sube `clash-progreso` de la versión 2 a la 3. Los almacenes `exports` y `copies` no se tocan en `onupgradeneeded`: solo se crean si faltan, como ahora.

Almacenes nuevos:

- `documentos`. Clave `id`. Índices `tipo` y `tag`. Aquí van sesión, mantenimiento, evento, guerra, gemelo, predicción, nota, hito y la estrategia de equilibrio.
- `recuperacion`. Copia literal de las claves de `localStorage` antes de migrar, con fecha y versión de app.
- `schema`. Un registro `{ id: "actual", version: 3, migrado: true | false }`.

`localStorage` que pasa a ser copia de seguridad, no la fuente, después de verificar:

- `cp-roster`, `cp-planes`, `cp-provisional`, `cp-sueno`.

Siguen en `localStorage` porque son presentación, no historial: tema, orden, filtros, cuenta seleccionada, gráficos, aviso, días de caducidad, segmento de la ficha.

La migración es recuperable:

1. Si `schema.version` ya es 3 y `migrado` es verdadero, no se repite.
2. Se lee `localStorage`. Si falta o está roto, se sigue con lo que hay y no se marca migrado.
3. Se escribe el volcado en `recuperacion` antes de crear documentos.
4. Se copian roster, planes, provisionales y sueño a `documentos`, con los mismos normalizadores de hoy (`normalizePlan`, `normalizeProvisional`, `migrateRoster`).
5. Se lee lo escrito y se compara el número de cuentas, de planes y de marcas. Si no cuadra, `migrado` queda en falso y la app sigue leyendo `localStorage`.
6. Si cuadra, la fuente pasa a IndexedDB y `localStorage` se deja escrito con el mismo contenido. No se borra en la 4.0.0. Borrarlo sería otra fase, y solo con un test de restaurar desde `recuperacion`.
7. Un fallo de IndexedDB no vacía el teléfono. La pantalla de Copia lo dice y ofrece exportar.

`cp-added` y `cp-seeded` no se reinterpretan. La regla de no resembrar una cuenta borrada sigue en `migrateRoster`.

### Copia

El JSON gana `"schema": 4` y secciones nuevas. Una copia vieja, sin esas secciones, restaura como hoy.

`mergeBackup` no cambia de criterio: lo que ya está en el iPhone gana; lo que solo viene en el archivo se añade. Eso vale para planes, marcas, sesiones, guerras, gemelos, predicciones y notas. No hay «gana el más nuevo» que borre un objetivo local.

El sueño entra en la copia. Hoy no entra, y se pierde al cambiar de aparato. Es dato del usuario, no un ajuste de pintura.

Restaurar no ejecuta simulaciones ni reescribe exportaciones. Después de fusionar, se recalculan predicciones y sesiones abiertas en memoria.

### Documentos (forma mínima)

Los campos de más se conservan al leer, para que una copia nueva no se quede coja en una app vieja de la misma 4.0. Lo que no se entiende se ignora, no se borra.

- **Sesión.** `id`, `creada`, `minutos` (10, 20, 30, 45, 60 o un número), `estrategia` (`equilibrado`, `principal`, `rush`, `maxear`, `mantenimiento`), `orden` de tags, `pasos[]` con `tag`, `id` de edificio, niveles, cola, minutos asignados, `estado` (`pendiente`, `hecho`, `saltado`, `pospuesto`). `estado` es declaración. `confirmado` solo se rellena al importar.
- **Mantenimiento.** La misma forma, más `dias` (`todos`, `finde` o una lista) y `topeMinutos`. No es otra copia del plan.
- **Evento.** Nombre, inicio, fin, descuento de recursos y de tiempo en tanto por uno, categorías excluidas, tope de constructores, escenarios con nombre. Todo `origen: simulacion`.
- **Guerra.** Nombre, clan, rival, tamaño, inicio, fin, participantes `{ tag, ataquesPrevistos, ataquesHechos, estrellas, pct, objetivo, nota }`. Lo no escrito queda `null`, no cero.
- **Gemelo.** `tag`, nombre, TH objetivo, estrategia, constructores, sueño, ingresos, y la lista de pasos simulados. `convertidoEnPlan` es la fecha, si el usuario confirmó.
- **Equilibrio.** `tag`, estrategia (`maxear`, `rush`, `ataque`, `defensa`, `heroes`, `muros`, `equilibrada`), pesos que suman 100, y el índice guardado solo como histórico con la fecha del cálculo.
- **Predicción.** Meta (por ejemplo «5 cuentas en TH15»), tags, fechas objetivo, escenario (`optimista`, `normal`, `conservador`), ritmo usado, `muestra` (cuántas semanas) y desviaciones `{ en, prevista, nueva, importacion }`.
- **Diario.** Nota o hito manual `{ tag | null, en, texto }`. Los resúmenes de periodo no se guardan como verdad: se calculan. Se puede guardar un informe exportado como archivo, no como progreso.

La estrategia de la sesión no pisa `plan.modo`. Rush y Maxear de la sesión leen el plan real. Equilibrado reparte minutos. Principal pone delante la cuenta Principal y luego el resto por la cola que queda libre antes. Mantenimiento usa el presupuesto diario del documento de mantenimiento.

La estrategia del índice es un lente. Puede arrancar copiando el plan (`maxear` → Maxear, `rushear` → Rush, foco ataque → Ataque, y así), pero queda en su propio documento.

## 5. Pantallas, dentro de la 3.1.2

No se añade una sexta pestaña. La barra sigue siendo Inicio, Cuentas, Mejoras, Análisis y Agenda.

| Función | Dónde se entra | Ruta | Pestaña activa | Qué no se duplica |
| --- | --- | --- | --- | --- |
| Sesión y mantenimiento | Inicio, fila «Mi sesión» junto a «Qué hacer ahora» | `#/sesion` | Inicio | El orden «Abrir hoy» sigue siendo la cola libre. La sesión es la visita con minutos |
| Eventos | Mejoras, segmento Costes / Evento, el mismo patrón que Análisis | `#/mejoras` con modo, o `#/evento` si el segmento se queda corto | Mejoras | El coste real hasta el máximo no lleva descuento |
| Gemelos | Fila en el plan de la cuenta | `#/progreso/:tag/gemelos` | Agenda, como el plan | El plan real no muestra el gemelo como paso confirmado |
| Equilibrio | Análisis, tercer segmento: Ranking / Gráficos / Equilibrio | `#/equilibrio` | Análisis | El ranking por media sigue igual |
| Predicción | Inicio, debajo de «Objetivos de flota», fila «Predicción» | `#/prediccion` | Inicio | La tarjeta de objetivos no cambia de significado: sigue siendo el plan hasta el máximo del TH anterior |
| Guerras | Inicio, fila «Guerras» | `#/guerras` y `#/guerras/:id` | Inicio | No usa los grupos de la cuenta como plantilla de guerra |
| Diario | Análisis, o la fila Historial de la cuenta para las notas de esa cuenta | `#/diario` y el historial actual | Análisis o Cuentas | El historial por cuenta sigue siendo cambios, ritmo y rachas. El diario los agrupa |

En 375 px de ancho las filas son las de `row--tile`. Los controles largos (minutos, estrategia, escenarios) van en segmento o en hoja, como Importar y Ajustes. No hay tablas anchas: la comparación de un gemelo es una lista de filas y, si cabe, el gráfico que ya sabe pintar `charts.js`.

Textos de estado, siempre visibles, no solo en un color:

- Simulación: «Simulación. No cambia la aldea.»
- Predicción con poca muestra: «Pocos datos. Hace falta más de una importación por cuenta.»
- Paso declarado: «Marcado por ti. La exportación aún no lo confirma.»
- Sin hora: la frase que ya usa el plan. No se inventa una hora.
- Guerra sin estrellas: «Sin anotar», no «0».

## 6. Fases y versiones

Cada fase es una versión que se puede instalar. Sube `SHELL_CACHE`. `IMAGE_CACHE` no sube: no hay PNG nuevos. `ROSTER_VERSION` no sube.

### 4.0.0 — Núcleo

`cp-shell-v23`. `cp-img-v8`.

- IndexedDB v3, `recuperacion`, migración verificada y lectura doble.
- `origen.js` y el gancho de importación, todavía sin pantallas nuevas: al importar, el comportamiento visible es el de la 3.1.4.
- La copia gana `schema: 4` y el sueño. Una copia 3.x sigue entrando.
- Caché en memoria del roadmap por cuenta.
- Tests de migración, de copia vieja y de que el % de las 11 cuentas no se mueve.

No entran sesiones ni botones nuevos en Inicio. Si el núcleo falla, no hay nada que desactivar en la interfaz.

### 4.0.1 — Sesión y mantenimiento

`cp-shell-v24`.

- `#/sesion` desde Inicio. Minutos 10 / 20 / 30 / 45 / 60 / personalizado.
- Estrategias Equilibrado, Principal, Rush, Maxear y Mantenimiento, sobre el orden que ya calcula `prioridadDe` y el criterio de `plan.js`.
- Itinerario: marcar, saltar, posponer, reordenar. Recalcular al importar sin convertir lo marcado en confirmado.
- Guardar la sesión y una comparación simple de eficiencia: minutos previstos, pasos marcados, pasos que luego confirmó un JSON. Si aún no hay JSON posterior, la eficiencia dice «sin confirmar».
- Mantenimiento: 10 / 20 / 30 minutos, solo fines de semana o personalizado. Tareas obligatorias (cola libre de constructor o laboratorio), recomendables (mejora larga que encaja en el sueño) y opcionales. Agrupa cuentas para no saltar de aldea en cada paso. Avisa si el presupuesto no cubre lo obligatorio. Estima el avance con el coste y el tiempo ya publicados, etiquetado como estimación.
- El mismo módulo `prioridades.js` para las dos.

### 4.0.2 — Eventos y gemelos

`cp-shell-v25`.

- Evento con descuento de recursos y de tiempo, fechas y nombre. Compara sin evento y con evento. Ahorro por cuenta y suma. Qué colas quedan libres dentro de las fechas. Qué cuentas conviene abrir. Subir de TH se muestra como el plan hasta el máximo del TH anterior, antes o durante la ventana, nunca como «el juego te deja subir». Varios escenarios, categorías excluidas, tope de constructores y requisitos que sí están en datos: edificio que ya tiene `timer`, nivel por debajo del máximo publicado, cola libre. Nada más.
- Gemelo desde una cuenta: TH objetivo, estrategia, número de constructores, sueño, ingresos manuales, mejoras en curso importadas. Coste y fechas. Ataque frente a defensa con los focos que el plan ya tiene. Gráfico o tabla. Guardar, renombrar, borrar.
- «Convertir en plan» pide confirmación, escribe solo el documento de plan y no crea provisionales encima de un `timer` confirmado.

### 4.0.3 — Equilibrio y predicción

`cp-shell-v26`.

- Índice 0–100 por cuenta según su estrategia. Cada componente se explica (qué % usa, qué peso tiene, qué falta). Cuellos de botella son categorías por debajo del peso, no los héroes de C1. Cumplimiento del plan: pasos del roadmap con hora frente a lo ya importado. Histórico del índice en cada importación. Índice global: media de índices de cuentas con la misma estrategia, con el TH escrito en cada fila. No hay una media de índices entre TH distintos ni entre estrategias distintas. Los % de Progreso no cambian.
- Predicción colectiva encima de `objetivo` y de `weeklyPace`. Metas del tipo «5 cuentas en TH15», fechas, obstáculos (cola sin hora, categoría bajo el 50 % al subir, coste sin fila en `costes.json`). Escenarios optimista, normal y conservador como factores del ritmo observado, dichos en la pantalla. Se actualiza al importar y guarda la desviación. Paneles a 30, 90, 180 y 365 días. Con menos de dos importaciones en la cuenta, «pocos datos» y sin fecha.

### 4.0.4 — Guerras y diario

`cp-shell-v27`.

- Guerras creadas a mano. Participantes elegidos entre las cuentas. Clan, rival, tamaño y fechas si el usuario los escribe. Ataques previstos, hechos y pendientes solo con números escritos. Objetivos, estrellas y % igual. Historial de guerras cerradas y estadísticas de lo anotado (no se rellena un ataque vacío). Alineación recomendada: ordena por laboratorio, héroes y ejército ya calculados, y avisa héroes con `timer`. Cuentas con ofensiva floja usan el mismo aviso que `rushGaps` cuando aplica, o el % de laboratorio y héroes si no acaba de subir de TH. Preparación lista lo que está importado. C1 no recibe un aviso de héroes como cuello.
- Diario: semana de Madrid (la de `history.js`), mes civil de Madrid y temporada. La temporada es un tramo con nombre y fechas que pone el usuario. Si no hay temporada, no se inventa la temporada del juego. El resumen cuenta niveles vistos entre importaciones, % en los extremos del tramo, mejoras con hora exacta, días de constructor sumando `timer` exactos, recursos estimados con `costes.json` (y «sin coste» donde falte la fila), subidas de TH vistas, objetivos, ritmo y rachas. Comparar dos tramos. Hitos y notas manuales. Informe en pantalla. Exportar JSON y una imagen de cifras, sin PNG del Fan Kit, generada en canvas. La tarjeta no afirma el minuto de una mejora.

### 4.0.5 — Integración

`cp-shell-v28`.

- Repaso de las ocho funciones con las 11 cuentas, altas y bajas, y un lote de 50.
- Inicio muestra las filas nuevas sin tapar «Qué hacer ahora», «Abrir hoy» ni «Objetivos de flota».
- Una simulación no deja rastro en `exports` ni en el %.
- Copiar y restaurar un teléfono con datos 3.1 y otro con datos 4.0.5.
- Safari iPhone, 375 px, claro y oscuro, sin red después de cargar la interfaz.
- Si algo de lo anterior falla, se corrige aquí. No se abre una función nueva.

## 7. Pruebas

Siguen en `node --test`. No se añade un framework. El iPhone se comprueba en WebKit, página nueva, `es-ES`, 375×812, claro y oscuro, `domcontentloaded`.

| Caso | Dónde se fija |
| --- | --- |
| Una cuenta y varias | 4.0.1 en adelante |
| Las 11, con TH distintos, y el % idéntico al de la 3.1.4 | Todas las fases |
| Alta, baja, y la baja no vuelve a sembrarse | 4.0.0 |
| Sin historial y datos incompletos | 4.0.3 y 4.0.4 muestran «pocos datos» o «sin anotar» |
| Provisionales: declarar no cambia el nivel; importar confirma o descarta | 4.0.0, ya cubierto, se mantiene |
| Objetivo incompatible (TH por debajo del actual, o sin coste) | 4.0.2 y 4.0.3, sin fecha inventada |
| Cambiar de estrategia no borra el plan ni el índice anterior | 4.0.1 y 4.0.3 |
| Importar dos veces el mismo JSON no duplica el punto | Ya existe. La 4.0 no crea otra desviación |
| Recursos que no llegan | 4.0.2: el ingreso es hipótesis; si no cubre el coste, se dice, no se ajusta el nivel |
| Sin red, tras instalar | 4.0.5 |
| Actualizar la PWA no borra historial ni objetivos | 4.0.0, con `recuperacion` |
| Copia vieja y copia nueva | 4.0.0 y 4.0.5 |
| 50 cuentas: Inicio y una sesión se calculan sin reconstruir cada escenario en cada toque | 4.0.1 y 4.0.5 |
| Pantalla estrecha y Safari | 4.0.5, y en cada fase la pantalla que esa fase añade |
| Simulación, predicción y sesión no escriben `exports` ni el plan, salvo «convertir en plan» confirmado | Test de cada fase que las introduce |

Los 88 tests de la 3.1.4 tienen que seguir en verde en cada fase. Un fallo ahí para la fase.

## 8. Riesgos

- **Doble fuente.** Roster en `localStorage` y en IndexedDB puede divergir si se escribe solo uno. La 4.0.0 escribe los dos hasta que `migrado` es verdadero, y el test lee los dos.
- **`app.js`.** Meter las ocho pantallas en el mismo archivo lo hace frágil. Las cuentas viven en módulos; la ruta y el HTML, en `app.js`, en funciones nuevas, sin reordenar las viejas.
- **Rendimiento.** `buildRoadmap` recorre el manifiesto. Cincuenta cuentas por cada movimiento de un descuento no entra en un iPhone. Calcular al pulsar y cachear.
- **Requisitos de TH.** No están en los datos (`RUSH_NOTE`). El evento y el gemelo hablan del máximo del TH anterior y de `rushGaps`. No se publica una lista de «te falta el laboratorio».
- **Recursos.** Sin oro en el JSON, el ahorro del evento es coste de tabla por descuento hipotético. No es «vas a gastar el oro que tienes».
- **Guerras.** Sin clan en el JSON, una estadística vacía parece un cero. La interfaz usa «sin anotar».
- **Diario.** Fechar la mejora en el `timestamp` de la importación miente. El texto es «visto en la importación».
- **C1.** Cualquier índice de héroes tiene que excluir `#28PLGP0G2` con el mismo constante `HEROES_FUERA`.
- **Copia.** Un merge que deje ganar al archivo borraría planes del iPhone. Se mantiene «el iPhone gana; el archivo rellena huecos».
- **Caché de la PWA.** Cada fase sube el shell. Olvidarlo sirve la interfaz vieja con datos nuevos.
- **Cola 3.1.x.** Programar la 4.0 encima de `main` (3.1.0) pinta la barra vieja. Se espera a fusionar #18–#21, o se parte desde `cursor/imagenes-3.1.4-2972` si Miguel quiere adelantar el código.

## 9. Qué queda fuera

- Aldea del constructor, más allá de las 12 tropas y 2 héroes.
- PNG, nombres y costes nuevos. Eso ya va en las 3.1.x.
- Reloj oficial de «mañana subes el ayuntamiento».
- Descuentos, guerras o temporadas leídos de Supercell.
- Servidor de avisos con la app cerrada. El aviso actual, con la app abierta, se queda como está.
- Borrar `localStorage` tras migrar. Como pronto, después de la 4.0.5 y con restauración probada.
- Una sexta pestaña.

## 10. Para aprobar

Miguel puede decir sí a las fases, o tachar una función de una fase sin rehacer el núcleo. El orden propuesto es el del encargo: núcleo, sesión y mantenimiento, eventos y gemelos, equilibrio y predicción, guerras y diario, integración.

Cuando haya un sí, la primera rama de código es la 4.0.0 y sale de la punta ya fusionada de las 3.1.x. Esta rama `plan/4.0` no se usa para programar.
