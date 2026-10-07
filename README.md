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
4. Las demás imágenes se guardan al verlas. En Ajustes, «Descargar todas (~40 MB)» baja el resto usando los `bytes` de `assets/manifest.json` (130 archivos, 41.314.444 bytes en total).
5. Importar: Ajustes o Roster → Importar. Pega un JSON o elige varios archivos. Tiene que traer `tag`, `timestamp` y el ayuntamiento `1000001`.

## Datos

- Exportaciones del 7 de octubre de 2026 en `data/2026-10-07/`.
- `data/snapshots.csv` es la referencia del histórico de ese día.
- Máximos por ayuntamiento: **solo** `data/caps_clashrecord.json` (ClashRecord). No hay otra tabla de niveles en la app.
- Nombres e imágenes: **solo** `assets/manifest.json` y los PNG de `assets/images/` (Fan Kit, sin modificar). Lo que no tiene imagen oficial está en `assets/FALTANTES.md`.

## Porcentajes y el CSV

Casi todas las categorías coinciden con `snapshots.csv` (redondeo par a 1 decimal). La media es la media de esos porcentajes ya redondeados, sin mascotas si el ayuntamiento es menor de 14.

El % de equipamiento no cuenta piezas de nivel 1 ni sin identificar. En laboratorio, defensas crafteadas y el guardián sin ficha, el tope sale de `caps_clashrecord.json` cuando hay una correspondencia única; la pantalla sigue diciendo «sin identificar» y no usa el nombre inglés del archivo de máximos.

Desvíos que quedan, con la misma regla en todas las cuentas:

- `#R02YUVC0J` defensas 54,4 % (el CSV dice 55,6 %). En TH11 el archivo de máximos cuenta 5 torres de magos y esta cuenta tiene 4; la que falta entra como 0. Quitar solo esa torre daría 55,6 %, pero un X-Bow ausente en otras cuentas sí entra en el denominador. La media queda 49,2 % (el CSV dice 49,4 %) y el avance hacia TH12, 45,8 % y 41,7 % de media (el CSV dice 46,8 % y 41,9 %).
- C2, defensas hacia TH17: 58,1 % (el CSV dice 61,7 %). El % de TH16 sí es 66,9 %. El cupo de TH17 ya da por hechas fusiones que esta aldea no tiene, y el denominador queda más alto. La media hacia TH17 queda 45,5 % frente a 45,9 %.
- El % ofensivo del CSV no se reproduce con estos máximos. La app no inventa la cifra: en el resumen aparece «—».

Constructores: el total es la suma de `cnt` de `1000015`. Ocupan constructor las mejoras de edificios, muros, trampas y héroes. El laboratorio (`1000007`), la casa de mascotas (`1000068`) y los ayudantes no ocupan constructor ni dan huecos extra. Si hay más mejoras que cabañas, se muestra «N ocupados» y el chip «Revisar constructores», nunca un libre negativo.

## Aviso

This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.
