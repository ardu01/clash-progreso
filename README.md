# Clash Progreso

PWA estática para seguir el progreso de 11 cuentas de Clash of Clans. Sin backend, sin login y sin llamadas a redes de Supercell en tiempo de ejecución: las imágenes salen del repositorio.

This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.

## Cómo abrirla

La app usa rutas relativas y está pensada para GitHub Pages en `https://ardu01.github.io/clash-progreso/`.

En local, sírvela bajo ese mismo subpath:

```bash
mkdir -p /tmp/pages
ln -s "$PWD" /tmp/pages/clash-progreso
python3 -m http.server 8765 --directory /tmp/pages
```

Abre `http://127.0.0.1:8765/clash-progreso/#/roster`.

## Probar sin conexión

1. Carga la app una vez con red (el service worker guarda la interfaz, los JSON, el manifiesto y solo los ayuntamientos y los héroes: 14 archivos, 9.624.126 bytes).
2. En Chrome: Application → Service Workers → Offline, o corta la red.
3. Recarga `#/roster`. El roster, el progreso, las mejoras y la evolución siguen disponibles.
4. Las demás imágenes se guardan al verlas. En Ajustes, el botón muestra lo que falta con `fmtBytes(total_bytes − ya guardados)`. El total sale de `assets/manifest.json` → `peso_imagenes.total_bytes` (41.314.444 bytes, que se ve como 41,3 MB), no de una cifra escrita a mano. Las imágenes con `pesado: true` no entran en esa descarga.
5. Importar: Ajustes o Roster → Importar. Pega un JSON o elige varios archivos. Tiene que traer `tag`, `timestamp` y el ayuntamiento `1000001`.

## Datos

- Exportaciones del 7 de octubre de 2026 en `data/2026-10-07/`.
- `data/snapshots.csv` es la referencia del histórico de ese día.
- Máximos por ayuntamiento: **solo** `data/caps_clashrecord.json` (ClashRecord). No hay otra tabla de niveles en la app.
- Nombres e imágenes: **solo** `assets/manifest.json` y los PNG de `assets/images/` (Fan Kit, sin modificar). Lo que no tiene imagen oficial está en `assets/FALTANTES.md`.

## Porcentajes y el CSV

Casi todas las categorías coinciden con `snapshots.csv` (redondeo par a 1 decimal). La media es la media de esos porcentajes ya redondeados, sin mascotas si el ayuntamiento es menor de 14.

El % de equipamiento no cuenta piezas de nivel 1 ni sin identificar. Las tropas, hechizos y asedios sin identificar (4000109, 26000123, 4000188) tampoco entran en el máximo de laboratorio. En defensas crafteadas y el guardián sin ficha, el tope sale de `caps_clashrecord.json` cuando hay una correspondencia única; la pantalla sigue diciendo «sin identificar» y no usa el nombre inglés del archivo de máximos.

Defensas frente a un TH (el suyo o el siguiente): cada edificio colocado se compara con el máximo de ese TH, también si el cupo ya es 0 por una fusión. Las que faltan son el recuento de ClashRecord menos las colocadas, y ese hueco no baja de cero. Inferno Artillery no está en el manifiesto; en TH17 suma un hueco de nivel 0 al denominador.

La ofensiva es la media del % de laboratorio y del % de héroes, con el redondeo de `offense_pct` en `roster_snapshot.py`.

Desvíos que quedan frente a `snapshots.csv`:

- `#R02YUVC0J` defensas 54,4 % (el CSV dice 55,6 %). En TH11 el archivo de máximos cuenta 5 torres de magos y esta cuenta tiene 4; la que falta entra como 0. La media queda 49,2 % (el CSV dice 49,4 %) y hacia TH12, 45,8 % y 41,7 % de media (el CSV dice 46,8 % y 41,9 %). La ofensiva sí coincide: 41,1 %.
- C2, defensas hacia TH17: 61,3 % (el CSV dice 61,7 %). El % de TH16 sí es 66,9 %. La décima que falta es Inferno Artillery, sin ficha en el manifiesto, que entra como 0/5. La media hacia TH17 queda 46,0 % (el CSV dice 45,9 %).
- C2, laboratorio 45,4 % (el CSV dice 44,9 %) porque Ruin Witch y Angry Spell ya no cuentan. La ofensiva queda 34,5 % (el CSV dice 34,2 %). En C1 el laboratorio pasa de 62,3 % a 63,1 % y la ofensiva de 54,1 % a 54,5 %. `#GUQUV98JG` sigue en 43,2 %.

Constructores: el total es la suma de `cnt` de `1000015`. Ocupan constructor las mejoras con `timer` en edificios (incluido el laboratorio `1000007` y la casa de mascotas `1000068`), trampas, héroes y guardianes, salvo las que llevan `extra: true`. Esas salen en la misma lista con el subtítulo B.O.B, no suman un punto y no restan libres. Las de tropas, hechizos y asedios no ocupan constructor. Con estas exportaciones ninguna cuenta tiene libres. C1 tiene 6 ocupados para 5: se muestra el recuento y el chip «Revisar constructores», sin señalar una mejora concreta y sin un libre negativo.

## Aviso

This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.
