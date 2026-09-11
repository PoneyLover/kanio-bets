# Algorithme de cotes dynamiques (OddsService)

Implementation : [`apps/api/src/modules/odds/odds.service.ts`](../apps/api/src/modules/odds/odds.service.ts)
Configuration : [`apps/api/src/modules/odds/oddsConfig.ts`](../apps/api/src/modules/odds/oddsConfig.ts)
Tests unitaires : [`apps/api/tests/unit/odds.service.test.ts`](../apps/api/tests/unit/odds.service.test.ts)

## Principe

Les cotes evoluent en fonction de la repartition reelle des mises entre les
selections d'un meme marche, tout en restant ancrees sur les cotes initiales
tant que peu d'argent virtuel a ete mise (pour eviter qu'un seul gros pari sur
un marche neuf ne fasse s'effondrer une cote).

## Parametres (configurables via `.env`, voir `oddsConfig.ts`)

| Parametre        | Variable d'env          | Role                                                             | Defaut |
|------------------|--------------------------|-------------------------------------------------------------------|--------|
| `margin`         | `ODDS_MARGIN`            | Marge du bookmaker (overround) retiree de la cote juste           | 0.06   |
| `smoothingK`     | `ODDS_SMOOTHING_K`       | "Mise virtuelle" du prior : plus il est grand, plus il faut de volume reel pour faire bouger les cotes | 50     |
| `maxDeltaRatio`  | `ODDS_MAX_DELTA_RATIO`   | Variation maximale autorisee par recalcul (proportion de la cote actuelle) | 0.15   |
| `minOdds`/`maxOdds` | par selection (DB)    | Bornes absolues definies a la creation du marche                  | 1.05 / 15 |

## Formule

Pour un marche avec des selections `i = 1..n` :

1. **Probabilite a priori** (deduite des cotes actuelles) :

   ```
   prior_i = (1 / cote_i) / somme_j(1 / cote_j)
   ```

2. **Probabilite empirique** (deduite des mises cumulees `mise_i`) :

   ```
   pool = somme_i(mise_i)
   empirique_i = mise_i / pool          (si pool > 0, sinon = prior_i)
   ```

3. **Poids du volume reel** vs le prior, via la constante de lissage `K` :

   ```
   w = pool / (pool + K)
   ```

   - Pool = 0 KAN -> w = 0 -> les cotes ne bougent pas (seul le prior compte).
   - Pool = K KAN -> w = 0.5 -> poids egal entre prior et empirique.
   - Pool >> K -> w -> 1 -> les cotes suivent presque entierement la repartition reelle.

4. **Probabilite mixee et cote juste** :

   ```
   probabilite_i = w * empirique_i + (1 - w) * prior_i
   cote_juste_i  = 1 / probabilite_i
   cote_book_i   = cote_juste_i * (1 - margin)
   ```

5. **Bornage** : `cote_book_i` est d'abord bornee par `[minOdds_i, maxOdds_i]`,
   puis la variation par rapport a la cote actuelle est limitee a
   `± maxDeltaRatio` avant un dernier bornage aux memes limites. Le resultat
   est arrondi a 3 decimales.

## Exemple chiffre

Marche "Vainqueur du match" : PSG (1.80), Nul (3.50), Marseille (4.20).
`K = 50`, `margin = 0.06`.

Un utilisateur mise **100 KAN sur PSG**. Avant ce pari, `pool = 0` -> aucune
mise anterieure -> les cotes ne bougent pas au premier recalcul tant que le
seul historique est ce pari : `pool = 100`, `w = 100 / (100 + 50) = 0.667`.

- `prior_PSG = (1/1.80) / (1/1.80 + 1/3.50 + 1/4.20) = 0.5556 / 0.9974 ≈ 0.5571`
- `empirique_PSG = 100 / 100 = 1` (toute la mise est sur PSG)
- `probabilite_PSG = 0.667*1 + 0.333*0.5571 ≈ 0.8524`
- `cote_juste_PSG = 1 / 0.8524 ≈ 1.173`
- `cote_book_PSG = 1.173 * 0.94 ≈ 1.102`
- Variation max autorisee : `1.80 * (1 - 0.15) = 1.53` -> la cible (1.102) est
  hors de la fenetre autorisee -> la cote est plafonnee a **1.53** pour ce
  recalcul (protection anti-a-coup). Un futur pari confirmant la tendance
  continuera de la faire baisser, toujours par pas de 15% maximum.

## Garanties

- **La cote utilisee pour un pari est figee** (`BetSelection.oddsTaken`) et
  n'est jamais modifiee retroactivement, quelle que soit l'evolution ulterieure
  de `Selection.currentOdds`.
- **Historique complet** : chaque changement de cote cree une ligne
  `OddsHistory` (cote precedente, nouvelle cote, raison, date).
- **Concurrence** : le recalcul s'execute dans la meme transaction Postgres
  que le placement du pari, apres verrouillage (`SELECT ... FOR UPDATE`) des
  lignes `selections` du marche, ce qui serialise les recalculs concurrents.
