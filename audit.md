# Auditoría de imágenes

## Ronda 3

11 oct 2026. Miguel aprobó usar imágenes sacadas del juego por terceros para lo que el Fan Kit no tiene, marcadas como no oficiales (`official: false`). Van en la 3.1.7 porque la 3.1.1 ya está publicada. Fuentes: ClashKingAssets (`ClashKingInc/ClashKingAssets` @ b8f42a7; crédito «ClashKing») y el wiki de Fandom (clashofclans.fandom.com, archivos subidos por usuarios). El arte es © Supercell y se usa bajo la Fan Content Policy. Cada entrada de `unofficial_images` guarda la URL, la página, la atribución y el sha256 del archivo de origen; si se publica, también la ruta y el sha256 de la copia.

Prioridad: si ya hay un PNG oficial de ese nivel, se queda el oficial. Lo no oficial solo cubre el hueco. Los de menos de 200 px (`low_res`) solo entran cuando no hay nada mejor de ese nivel. Los PNG publicados se recomprimen (compresión 9) y, si el lado largo pasa de 512 px, se reducen sin recorte. `precarga` sigue en false: la instalación no cambia (220 archivos, 21.579.962 bytes). La caché de imágenes pasa a `cp-img-v9`.

### Qué se publica

25 archivos nuevos en `assets/images/levels/` (642 en total). Cubren 23 niveles que estaban prestados, más la torre multiusos, la defensa artesanal y el portal portátil:

- Bomba aérea 13, cuartel oscuro 11 y 13, caldero de hechizos oscuros 7 y 8, águila de artillería 7, consejo heroico 12, monolito 5, mortero 18, torre de arqueras múltiple 3, trampa de esqueletos 5, caldero de hechizos 8 y torre de hechizos 4.
- Mina aérea buscadora 7 y 8: el mismo archivo de 120×171 (no hay oficial de esos niveles). Las dos claves quedan como imagen propia.
- Trampa con muelle 6 a 13: sprites de unos 64×61. No hay oficial de esos niveles. Los pares 7-8, 9-10 y 11-12 traen el mismo archivo y comparten PNG.
- Torre multiusos 1 y 2, en largo alcance y en ataque rápido (cuatro PNG de Fandom). Sigue `faltante`: no hay PNG del Fan Kit. La ficha del nivel muestra los dos modos.
- Defensa artesanal y portal portátil: un icono para todos los niveles. Siguen `faltante`. El edificio se llama «Defensa artesanal».

### Qué no se publica

- Herrería 10: Fandom agrupa el 9 y el 10. Sigue la oficial del 9 (`images/buildings/blacksmith.png`).
- Bomba aérea 12: Fandom la agrupa con el 11 y el archivo no oficial mide 100×140. El nivel 12 usa la oficial `images/levels/air-bomb_11.png`.
- Bomba 12: el archivo no oficial mide 75×76 y se ve como el 11. Sigue la oficial del 11 (`images/traps/bomb.png`).
- Módulos de la defensa artesanal (102000033–102000041 y los tipos 103000011–103000013): no tienen icono propio. Siguen con el render oficial de su defensa (vela, cazahéroes, catapulta explosiva).
- Guardianes: no hay arte por nivel. No se descarga nada.
- Base del constructor: el lote trae 42 imágenes (mina de oro, almacén de oro, torre Tesla, cañón, choza de B.O.T.O. y trampa con muelle). No se copian y no se añaden edificios. Las 12 tropas y los 2 héroes que ya estaban no cambian.

Quedan 35 niveles prestados. El detalle de cada archivo (URL, autor y sha256) está en `assets/manifest.json`, secciones `unofficial_images` y `unofficial_notes`.
