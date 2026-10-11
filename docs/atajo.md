# Atajo de iPhone para pegar varias aldeas

Clash Progreso acepta varias exportaciones JSON a la vez. El atajo las acumula en el portapapeles y, al terminar, abre la app con todas.

La app no tiene servidor. El atajo solo abre una dirección de esta misma PWA.

## Dónde se copia en el juego

El menú en inglés, comprobado, es:

**Settings → More Settings → Data Export → Copy.**

La app muestra, hasta poder comprobarlo en el cliente en español:

**Ajustes → Más ajustes → Exportar datos → Copiar.**

El juego copia un JSON. No crea un archivo y no incluye el nombre del jugador.

## Qué hace el atajo

1. Crea un atajo en la app Atajos.
2. Añade una acción **Pedir entrada** (texto) o un bucle en el que, en cada vuelta, elijas **Copiar** en el juego y el atajo haga **Obtener contenido del portapapeles**.
3. Junta cada copia con la anterior. Sirve un salto de línea entre objetos, o pegarlos uno detrás de otro: la app separa cada `{ ... }`.
4. Al terminar, abre Clash Progreso con el lote.

Safari y la app instalada en la pantalla de inicio **no comparten** cuentas ni historial. El atajo tiene que abrir la misma que uses para jugar con los datos: si importas desde el icono, el atajo debe abrir el icono, no una pestaña nueva de Safari.

## Abrir la app con el lote

La dirección es:

`https://ardu01.github.io/clash-progreso/#lote=` + el texto del lote pasado por `encodeURIComponent`.

Los tags llevan `#`. Sin esa codificación, la dirección se corta.

También vale `?lote=` o `datos=` en la consulta o en el hash. Al abrirla, la app guarda las exportaciones válidas y deja la pantalla en Cuentas. Si alguna no se puede guardar, abre el campo de pegado con el texto.

`readText()` sin un toque de la persona falla. Por eso el atajo mete los datos en la dirección, en vez de pedirle a la página que lea el portapapeles al arrancar.

## Si la dirección es demasiado larga

iOS limita lo que cabe en una URL. Si el lote no entra:

1. El atajo copia el texto juntado al portapapeles.
2. Abre `https://ardu01.github.io/clash-progreso/`.
3. En Cuentas, toca **Pegar exportación**.

Si Safari no deja leer el portapapeles, se abre Importar: mantén pulsado el campo y elige Pegar.

## Qué se guarda

Cada objeto con tag y fecha de exportación se añade o actualiza esa cuenta. Una exportación más antigua se queda solo en el historial. Una repetida no se vuelve a guardar. El resumen del lote dice cuáles cuentas siguen sin actualizar.
