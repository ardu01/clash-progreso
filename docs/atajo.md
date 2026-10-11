# Actualizar todas las cuentas

Clash Progreso recorre las cuentas dentro de la app. No hace falta la app Atajos.

Sirve en Safari y también al abrir Clash Progreso desde el icono de inicio. Las dos no comparten cuentas ni historial: si juegas desde el icono, vuelve al icono; si juegas en una pestaña, vuelve a esa pestaña.

## Dónde se copia en el juego

El menú en inglés, comprobado, es:

**Settings → More Settings → Data Export → Copy.**

Hasta poder comprobarlo en el cliente en español, la app muestra:

**Ajustes → Más ajustes → Exportar datos → Copiar.**

El juego copia un JSON. No crea un archivo y no incluye el nombre del jugador.

## En la app

1. En **Inicio** o en **Cuentas**, toca **Actualizar todas**.
2. La lista sale en el orden de **Abrir hoy**: primero la cuenta cuya cola del plan queda libre antes. El orden no se mueve al pegar. Arriba verás el progreso, por ejemplo `4/11`, y la siguiente cuenta.
3. Abre esa aldea en el juego, copia la exportación y vuelve a Clash Progreso.
4. Toca **Pegar esta cuenta**. Ese toque lee el portapapeles. Si iOS pregunta, confirma Pegar.
5. La app mira la etiqueta del JSON, marca esa cuenta y la guarda en el momento. Puedes pegar otra cuenta de la lista: no tiene que ser la que estaba sugerida.
6. Sigue hasta el final. El resumen dice cuáles cambiaron, cuáles quedaron igual, cuáles solo entraron al histórico y cuáles no se pegaron.

**Dejar para luego** no borra la lista. Si iOS cierra la app, al abrirla la lista sigue donde estaba.

## Si no deja leer el portapapeles

Toca **Pegar a mano**, mantén pulsado el campo y elige Pegar. Luego **Guardar este pegado**.

Un texto que no sea una exportación no marca la cuenta. Una etiqueta que no esté en la lista no añade una cuenta nueva.

## Dirección antigua

Un atajo viejo todavía puede abrir la app con `#lote=` (el texto va con `encodeURIComponent`, porque los tags llevan `#`). También valen `?lote=` y `datos=`. No es el camino de esta versión: Actualizar todas no depende de esa dirección.
