# Ítems sin imagen oficial

Generado el 7 oct 2026. Exportaciones: las 11 de `/workspace/coc/*_2026-10-07.json`. Total: **80** ítems, de ellos **55 faltantes** (ítem identificado, sin imagen oficial a mano) y **25 sin identificar** (ID sin nombre verificable).

Regla: no se ha sustituido ningún hueco por imágenes de wikis, Fandom, CDNs no oficiales ni `coc/assets/wiki/`. La PWA debe mostrar un marcador genérico propio (sin arte de Supercell) cuando `estado` no sea `ok` ni `id_deducido`.

## Por qué faltan

- **faltante**: el ítem tiene nombre verificado (datos estáticos de coc.py 4.0.0) pero no hay PNG en `coc/assets/oficial/` (descargado del Fan Kit). No se pudo buscar más en el Fan Kit desde aquí: el catálogo `https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets` es una SPA de Frontify que solo lista los assets con JavaScript (curl recibe una página vacía y su API interna responde 403 sin la sesión del navegador). Para completarlos hay que buscarlos en el Fan Kit con navegador y descargarlos a `coc/assets/oficial/` con su URL; luego basta con re-ejecutar `tools/build.py`.
- **sin_identificar**: el ID no está en los datos estáticos disponibles (coc.py 4.0.0) y no hay forma oficial de verificarlo; no se inventa nombre ni se asigna imagen.

## Equipamiento de héroe (9)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 90000016 | `hero-equipment/90000016` | — | sin_identificar | 1, 15, 17 | 11 |
| 90000047 | `hero-equipment/noble-iron` | Noble Iron | faltante | 1, 6 | 5 |
| 90000052 | `hero-equipment/90000052` | — | sin_identificar | 1, 15, 18 | 11 |
| 90000053 | `hero-equipment/90000053` | — | sin_identificar | 1, 27 | 11 |
| 90000056 | `hero-equipment/90000056` | — | sin_identificar | 4 | 1 |
| 90000057 | `hero-equipment/90000057` | — | sin_identificar | 1 | 11 |
| 90000059 | `hero-equipment/90000059` | — | sin_identificar | 1 | 1 |
| 90000060 | `hero-equipment/90000060` | — | sin_identificar | 1, 18, 22 | 11 |
| 90000061 | `hero-equipment/90000061` | — | sin_identificar | 1 | 11 |

## Tropas (2)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 4000109 | `troops/4000109` | — | sin_identificar | 2 | 1 |
| 4000177 | `troops/meteor-golem` | Meteor Golem | faltante | 3 | 1 |

## Máquinas de asedio (1)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 4000188 | `siege-machines/4000188` | — | sin_identificar | 1 | 1 |

## Hechizos (1)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 26000123 | `spells/26000123` | — | sin_identificar | 1 | 1 |

## Defensas (10)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 1000008 | `defenses/cannon` | Cannon | faltante | 1, 2, 7, 8, 9, 10, 11, 12, 13, 14, 15, 21 | 10 |
| 1000011 | `defenses/wizard-tower` | Wizard Tower | faltante | 1, 2, 4, 5, 7, 8, 9, 10, 11, 13, 17 | 11 |
| 1000012 | `defenses/air-defense` | Air Defense | faltante | 4, 7, 8, 9, 10, 11, 12, 13, 15 | 11 |
| 1000013 | `defenses/mortar` | Mortar | faltante | 7, 8, 9, 10, 11, 12, 13, 17 | 11 |
| 1000028 | `defenses/air-sweeper` | Air Sweeper | faltante | 3, 4, 5, 6, 7 | 11 |
| 1000031 | `defenses/eagle-artillery` | Eagle Artillery | faltante | 0, 1, 2, 3, 6 | 10 |
| 1000032 | `defenses/bomb-tower` | Bomb Tower | faltante | 1, 2, 3, 4, 5, 6, 9, 11, 12 | 11 |
| 1000072 | `defenses/spell-tower` | Spell Tower | faltante | 1, 4 | 2 |
| 1000079 | `defenses/multi-gear-tower` | Multi-Gear Tower | faltante | 2 | 1 |
| 1000102 | `defenses/super-wizard-tower` | Super Wizard Tower | faltante | 0 | 1 |

## Trampas (5)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 12000002 | `traps/giant-bomb` | Giant Bomb | faltante | 1, 3, 4, 5, 6, 7 | 11 |
| 12000006 | `traps/seeking-air-mine` | Seeking Air Mine | faltante | 1, 2, 3 | 11 |
| 12000008 | `traps/skeleton-trap` | Skeleton Trap | faltante | 1, 2, 4 | 11 |
| 12000016 | `traps/tornado-trap` | Tornado Trap | faltante | 1, 2, 3 | 10 |
| 12000020 | `traps/giga-bomb` | Giga Bomb | faltante | 1 | 1 |

## Muros (1)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 1000010 | `buildings/wall` | Wall | faltante | 1, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18 | 11 |

## Edificios (no defensivos) (18)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 1000000 | `buildings/army-camp` | Army Camp | faltante | 7, 8, 9, 11, 13 | 11 |
| 1000002 | `buildings/elixir-collector` | Elixir Collector | faltante | 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 | 11 |
| 1000003 | `buildings/elixir-storage` | Elixir Storage | faltante | 4, 5, 6, 7, 9, 11, 13, 14, 15, 16, 17, 18 | 11 |
| 1000004 | `buildings/gold-mine` | Gold Mine | faltante | 5, 6, 7, 8, 9, 10, 11, 12, 15, 17 | 11 |
| 1000005 | `buildings/gold-storage` | Gold Storage | faltante | 4, 5, 6, 7, 9, 10, 11, 12, 14, 17 | 11 |
| 1000006 | `buildings/barracks` | Barracks | faltante | 11, 12, 13, 14, 17, 19 | 11 |
| 1000015 | `buildings/builder-s-hut` | Builder's Hut | faltante | 1, 3, 6 | 11 |
| 1000020 | `buildings/spell-factory` | Spell Factory | faltante | 4, 5, 6, 8, 9 | 11 |
| 1000023 | `buildings/dark-elixir-drill` | Dark Elixir Drill | faltante | 2, 3, 4, 5, 6, 7, 8, 9, 10 | 11 |
| 1000024 | `buildings/dark-elixir-storage` | Dark Elixir Storage | faltante | 4, 5, 6, 7, 11 | 11 |
| 1000026 | `buildings/dark-barracks` | Dark Barracks | faltante | 6, 7, 8, 9, 13 | 11 |
| 1000029 | `buildings/dark-spell-factory` | Dark Spell Factory | faltante | 3, 4, 5, 6, 8 | 11 |
| 1000059 | `buildings/workshop` | Workshop | faltante | 1, 2, 3, 6, 9 | 6 |
| 1000064 | `buildings/bob-s-hut` | B.O.B's Hut | faltante | 1 | 1 |
| 1000068 | `buildings/pet-house` | Pet House | faltante | 8, 11 | 2 |
| 1000071 | `buildings/hero-hall` | Hero Hall | faltante | 3, 4, 5, 6, 9, 11 | 11 |
| 1000093 | `buildings/helper-hut` | Helper Hut | faltante | 1 | 11 |
| 1000097 | `buildings/crafting-station` | Crafting Station | faltante | — | 11 |

## Ayudantes (4)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 93000000 | `helpers/builder-s-apprentice` | Builder's Apprentice | faltante | 2, 4, 5 | 5 |
| 93000001 | `helpers/lab-assistant` | Lab Assistant | faltante | 1 | 8 |
| 93000002 | `helpers/alchemist` | Alchemist | faltante | 1 | 3 |
| 93000003 | `helpers/93000003` | — | sin_identificar | 1 | 1 |

## Guardianes (3)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 107000000 | `guardians/longshot` | Longshot | faltante | 1 | 1 |
| 107000001 | `guardians/smasher` | Smasher | faltante | 1 | 1 |
| 107000008 | `guardians/107000008` | — | sin_identificar | 1 | 1 |

## Aldea del constructor: héroes (2)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 28000003 | `builder-base/bb-battle-machine` | Battle Machine | faltante | 1, 23 | 2 |
| 28000005 | `builder-base/bb-battle-copter` | Battle Copter | faltante | 15, 22 | 2 |

## Aldea del constructor: tropas (12)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 4000031 | `builder-base/bb-raged-barbarian` | Raged Barbarian | faltante | 13 | 1 |
| 4000032 | `builder-base/bb-sneaky-archer` | Sneaky Archer | faltante | 9 | 1 |
| 4000033 | `builder-base/bb-beta-minion` | Beta Minion | faltante | 10 | 1 |
| 4000034 | `builder-base/bb-boxer-giant` | Boxer Giant | faltante | 13 | 1 |
| 4000035 | `builder-base/bb-bomber` | Bomber | faltante | 12 | 1 |
| 4000036 | `builder-base/bb-power-pekka` | Power P.E.K.K.A | faltante | 20 | 1 |
| 4000037 | `builder-base/bb-cannon-cart` | Cannon Cart | faltante | 11 | 1 |
| 4000038 | `builder-base/bb-drop-ship` | Drop Ship | faltante | 11 | 1 |
| 4000041 | `builder-base/bb-baby-dragon` | Baby Dragon | faltante | 20 | 1 |
| 4000042 | `builder-base/bb-night-witch` | Night Witch | faltante | 17 | 1 |
| 4000070 | `builder-base/bb-hog-glider` | Hog Glider | faltante | 20 | 1 |
| 4000106 | `builder-base/bb-electrofire-wizard` | Electrofire Wizard | faltante | 20 | 1 |

## Estación de crafteo: tipos (3)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 103000011 | `crafting/103000011` | — | sin_identificar | — | 11 |
| 103000012 | `crafting/103000012` | — | sin_identificar | — | 11 |
| 103000013 | `crafting/103000013` | — | sin_identificar | — | 11 |

## Estación de crafteo: módulos (9)

| ID | key | nombre (juego) | estado | niveles en export. | cuentas |
|---|---|---|---|---|---|
| 102000033 | `crafting/102000033` | — | sin_identificar | 1 | 11 |
| 102000034 | `crafting/102000034` | — | sin_identificar | 1 | 11 |
| 102000035 | `crafting/102000035` | — | sin_identificar | 1 | 11 |
| 102000036 | `crafting/102000036` | — | sin_identificar | 1, 5 | 11 |
| 102000037 | `crafting/102000037` | — | sin_identificar | 1, 2, 4 | 11 |
| 102000038 | `crafting/102000038` | — | sin_identificar | 1, 2 | 11 |
| 102000039 | `crafting/102000039` | — | sin_identificar | 1 | 11 |
| 102000040 | `crafting/102000040` | — | sin_identificar | 1 | 11 |
| 102000041 | `crafting/102000041` | — | sin_identificar | 1 | 11 |

## Notas

- Equipamiento sin identificar (90000016, 90000052, 90000053, 90000056, 90000057, 90000059, 90000060, 90000061): en `coc/assets/oficial/equipment/` hay PNG oficiales de equipamiento que ningún ID conocido usa (Duque Dragón: Electro Fangs, Fire Heart, Flame Blower, Rocket Backpack, Stun Blast; Reina: Monolith Arrow). Probablemente algunos de esos IDs correspondan a ellos, pero no se asignan sin verificación.
- Los IDs 93000003 (ayudante), 107000008 (guardián), 4000109 (tropa), 4000188 (máquina de asedio) y 26000123 (hechizo) tampoco están en los datos estáticos; se marcan igualmente `sin_identificar`.
- Noble Iron (90000047) y Meteor Golem (4000177) están identificados pero no hay PNG del Fan Kit descargado.
