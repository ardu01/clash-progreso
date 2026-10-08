# Entrega 2.0.0

8 oct 2026. PWA estática en GitHub Pages, sin backend y sin login. Parte de main `3d603da` (1.1.6).

`APP_VERSION` es `2.0.0` y `SHELL_CACHE` es `cp-shell-v11`. `IMAGE_CACHE` sigue en `cp-img-v4`: no cambia ningún PNG de `assets/` ni la fórmula de `frameOf()`.

Incluye la marca de nivel por encima del máximo del PR #8 (`.eq.is-over`, «máx. M», «máximo desactualizado»). No usa la versión ni la caché de ese PR.

## Qué cambia

- Las cuentas se añaden, se renombran y se borran. Las 11 que viajan con la app son datos de prueba. Puede haber varias Principal; si no hay ninguna, destaca la de TH más alto.
- Cinco pestañas: Cuentas, Progreso, Mejoras, Gráficos y Copia. Importar es un botón, no una pestaña.
- Progreso filtra por categoría, estado y nombre. El número del chip es el de las filas que se ven. En el título, ese número va en una píldora junto al nombre y el porcentaje baja a su línea, sin «·».
- Gráficos usa solo importaciones reales. Un único punto no se completa con una serie de ejemplo.
- Copia exporta todas las cuentas y todo el historial, y al restaurar fusiona por tag y fecha. No borra lo que solo está en el iPhone. El aviso «Copia guardada» queda encima de la tab bar y no intercepta toques. Cancelar Compartir no avisa.
- En Mejoras, la cabecera de cada cuenta enseña las chozas y las mejoras de constructor que devuelve `builderStatus`, y «Revisar constructores» si sobran. La mejora `extra` se etiqueta «B.O.B» y no se mezcla con ese exceso. En C1: 5 chozas, 6 mejoras de constructor y 1 de B.O.B.
- El selector «Solo maqueta · número de cuentas» no está en la app.
