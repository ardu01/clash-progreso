# Estructura de pantallas

Mapa de la 3.1.16. La 3.1.11 ya está en main; esta limpieza no reescribe esa versión: ordena lo que hay para que cada sitio tenga un solo trabajo. El estilo sigue siendo Clash (marrón, dorado, azul oscuro).

Cada pestaña de la barra hace una cosa. Ajustes y Copia no están en la barra: se abren con el engranaje de Inicio.

| Lugar | Para qué | Rutas |
| --- | --- | --- |
| Inicio | Resumen de la flota y la acción de hoy | `#/inicio`, `#/ahora`, `#/actualizar` |
| Cuentas | Lista y detalle de cada cuenta | `#/roster`, `#/progreso/TAG`, `#/progreso/TAG/CATEGORÍA`, `#/perfil/TAG`, `#/progreso/TAG/historial`, `#/importar` |
| Plan | Las 11 aldeas y el detalle de cada una. No es pestaña: tarjeta de Inicio y botón redondo | `#/plan`, `#/progreso/TAG/plan` |
| Mejoras | En curso, costes y equipamiento | `#/mejoras`, `#/equipo`, `#/equipo/TAG` |
| Análisis | Gráficos, ranking y comparativa | `#/ranking`, `#/graficos` |
| Agenda | El tiempo, y la entrada a Operaciones | `#/agenda`, `#/operaciones` |
| Operaciones | Dentro de Agenda: sesión, mantenimiento, simulación, gemelos, equilibrio, predicción, guerras, diario, plantillas, estrategias y prioridades | `#/operaciones` |
| Atención | Bandeja, excepciones, presupuesto, ventanas, hibernación, detector y rescate. Sin pestaña nueva | `#/inicio`, `#/agenda`, `#/roster` |
| Aparte | Copia, tema, acerca de | `#/copia` (engranaje de Inicio) |

## Qué va en cada sitio

**Inicio.** Arriba, la tarjeta Plan abre el hub de las 11 aldeas. Debajo: cifras de la flota, Actualizar todas, Qué hacer ahora, las tres próximas finalizaciones, el orden de Abrir hoy, los objetivos de flota y la siguiente cuenta. La lista completa de aldeas no se repite aquí: un enlace abre Cuentas.

**Cuentas.** Pegar, buscar, ordenar, filtrar y la lista. Cada fila abre el progreso de esa aldea (categorías, perfil, historial, aldea del constructor). El resumen de la flota es una cifra; el detalle de constructores, laboratorios y mascotas está en ⓘ.

**Plan.** No está en la barra. La tarjeta de Inicio abre `#/plan`. El botón redondo, encima de la barra y sin cambiarla, lleva el martillo oficial del Fan Kit y abre el mismo hub en una hoja. Se puede arrastrar: se pega al borde más cercano, respeta la safe area y la barra, y recuerda el sitio. Las 11 aldeas a la vez: qué poner a mejorar ahora, constructores libres y ocupados, próxima finalización y coste con iconos oficiales. Filtros de ayuntamiento, grupo y constructores (Todas, Libres, Ocupadas). Tocar una cuenta abre su detalle (Ahora, Hecho, sesiones, Maxear o Subir TH).

**Mejoras.** Tres modos: En curso, Costes (hasta el máximo del ayuntamiento actual) y Equipo (flota y cada cuenta). El plan no se repite aquí.

**Análisis.** Ranking, con la comparativa de dos o tres cuentas, y los gráficos.

**Agenda.** Finalizaciones en 24 h, en 7 días o por cuenta, más lo que está en curso (por fin o por cuenta) y las horas de sueño. La hora es la de Madrid. La entrada Operaciones abre el resto de vistas; no es una pestaña de la barra.

## Qué se movió

- La lista larga de Inicio pasa a Cuentas. En Inicio queda la siguiente cuenta.
- Los saltos de Cuentas a Qué hacer ahora, Ranking y Agenda salen de esa pantalla. Cada uno vive en su pestaña.
- El hub del plan resalta Inicio. El detalle de una cuenta resalta Cuentas. El equipamiento resalta Mejoras. Historial sigue en la cuenta.
- Lo que estaba en Mejoras como «por fin» y «por cuenta» (mejoras en curso) pasa a Agenda, en En curso.
- Las explicaciones largas salen de la pantalla. El texto queda en un ⓘ que se abre al tocar. Los títulos, las cifras, los iconos y los controles se quedan a la vista.

## Componentes

Toda la app usa los mismos: tarjeta (`.card`), cabecera de sección (tablón `.section-header`), chip o filtro (`.chip-row`), barra (`.bar` / `.meter`) y fila (`.row`). El margen de sección y el relleno de fila son los de siempre, también en Inicio y en Cuentas. La fila de cuenta sigue en tres columnas: miniatura, texto, Perfil y Editar.
