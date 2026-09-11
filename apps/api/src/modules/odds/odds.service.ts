import { Prisma } from "@kanio/db";
import type { PrismaTransactionClient } from "../../types/prismaTx";
import { dbTable } from "../../lib/dbSchema";
import { oddsConfig } from "./oddsConfig";

/**
 * OddsService - moteur de cotes dynamiques.
 *
 * ============================== ALGORITHME ==================================
 * Voir docs/ODDS_ALGORITHM.md pour la version detaillee avec exemples chiffres.
 * Resume :
 *
 * 1. Pour chaque selection d'un marche, on estime une probabilite "prior"
 *    a partir de sa cote actuelle : priorProb = 1 / coteActuelle, normalisee
 *    pour que la somme des priors du marche fasse 1.
 * 2. On calcule la probabilite "empirique" observee a partir de la repartition
 *    reelle des mises : empirique = miseCumulee_i / miseCumuleeTotale.
 * 3. On mixe les deux avec un poids w qui grandit avec le volume mise total,
 *    via une constante de lissage K (mise "virtuelle" du prior) :
 *       w = pool / (pool + K)
 *       probabiliteMixee = w * empirique + (1 - w) * prior
 *    -> avec peu de mises, les cotes bougent peu (le prior domine) ; avec
 *       beaucoup de volume, les cotes suivent la repartition reelle du marche.
 * 4. Cote "juste" = 1 / probabiliteMixee, a laquelle on retire la marge du
 *    bookmaker (overround) : coteBook = coteJuste * (1 - margin).
 * 5. La nouvelle cote est bornee :
 *      - par les bornes min/max propres a la selection (protection contre les
 *        cotes aberrantes) ;
 *      - par une variation maximale autorisee par rapport a la cote actuelle
 *        (maxDeltaRatio), pour eviter les a-coups violents a chaque pari.
 * 6. Le resultat est arrondi a 3 decimales. Si la cote change, une ligne est
 *    ajoutee dans OddsHistory. La cote deja utilisee dans un ticket de pari
 *    (BetSelection.oddsTaken) n'est JAMAIS modifiee retroactivement : seule
 *    `Selection.currentOdds` evolue pour les *prochains* paris.
 * ==============================================================================
 */

export interface SelectionSnapshot {
  id: string;
  currentOdds: number;
  minOdds: number;
  maxOdds: number;
  totalStaked: number;
}

export interface OddsUpdate {
  id: string;
  previousOdds: number;
  newOdds: number;
  changed: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Fonction pure (aucun acces DB) - facilement testable unitairement.
 * Calcule les nouvelles cotes d'un marche a partir de l'etat de ses selections.
 */
export function computeUpdatedOdds(
  selections: SelectionSnapshot[],
  config: { margin: number; smoothingK: number; maxDeltaRatio: number; hardFloor: number; hardCeiling: number } = oddsConfig
): OddsUpdate[] {
  const pool = selections.reduce((sum, s) => sum + s.totalStaked, 0);

  // Marche degenere, ou aucune mise encore placee : rien a inferer, on ne
  // touche pas aux cotes (elles restent celles fixees a la creation du marche).
  if (selections.length < 2 || pool === 0) {
    return selections.map((s) => ({ id: s.id, previousOdds: s.currentOdds, newOdds: s.currentOdds, changed: false }));
  }

  const priorRaw = selections.map((s) => 1 / s.currentOdds);
  const priorSum = priorRaw.reduce((a, b) => a + b, 0);
  const priorNorm = priorRaw.map((p) => p / priorSum);

  const w = pool / (pool + config.smoothingK);

  return selections.map((s, i) => {
    const empirical = s.totalStaked / pool;
    const blendedProb = w * empirical + (1 - w) * priorNorm[i];
    const fairOdds = 1 / blendedProb;
    const bookOdds = fairOdds * (1 - config.margin);

    const minBound = Math.max(s.minOdds, config.hardFloor);
    const maxBound = Math.min(s.maxOdds, config.hardCeiling);
    const boundedTarget = clamp(bookOdds, minBound, maxBound);

    const deltaLower = s.currentOdds * (1 - config.maxDeltaRatio);
    const deltaUpper = s.currentOdds * (1 + config.maxDeltaRatio);
    const limited = clamp(boundedTarget, deltaLower, deltaUpper);

    const newOdds = round3(clamp(limited, minBound, maxBound));
    const changed = Math.abs(newOdds - s.currentOdds) >= 0.001;

    return { id: s.id, previousOdds: s.currentOdds, newOdds, changed };
  });
}

export const OddsService = {
  computeUpdatedOdds,

  /**
   * Recalcule et persiste les cotes de toutes les selections d'un marche.
   * Doit etre appele dans une transaction Prisma ou les lignes `selections`
   * du marche ont deja ete verrouillees (FOR UPDATE) par l'appelant, pour
   * garantir la coherence sous concurrence.
   */
  async recalculateMarketOdds(tx: PrismaTransactionClient, marketId: string, reason: string): Promise<OddsUpdate[]> {
    const selections = await tx.selection.findMany({ where: { marketId } });
    const snapshots: SelectionSnapshot[] = selections.map((s) => ({
      id: s.id,
      currentOdds: s.currentOdds.toNumber(),
      minOdds: s.minOdds.toNumber(),
      maxOdds: s.maxOdds.toNumber(),
      totalStaked: s.totalStaked.toNumber(),
    }));

    const updates = computeUpdatedOdds(snapshots);

    for (const update of updates) {
      if (!update.changed) continue;
      await tx.selection.update({
        where: { id: update.id },
        data: { currentOdds: new Prisma.Decimal(update.newOdds) },
      });
      await tx.oddsHistory.create({
        data: {
          selectionId: update.id,
          previousOdds: new Prisma.Decimal(update.previousOdds),
          newOdds: new Prisma.Decimal(update.newOdds),
          reason,
        },
      });
    }

    return updates;
  },

  /** Enregistre la cote initiale d'une selection nouvellement creee (marche admin). */
  async recordInitialOdds(tx: PrismaTransactionClient, selectionId: string, odds: number) {
    await tx.oddsHistory.create({
      data: {
        selectionId,
        previousOdds: new Prisma.Decimal(odds),
        newOdds: new Prisma.Decimal(odds),
        reason: "INITIAL",
      },
    });
  },

  /** Verrouille (FOR UPDATE) toutes les selections d'un marche pour serialiser les recalculs concurrents. */
  async lockMarketSelections(tx: PrismaTransactionClient, marketId: string) {
    await tx.$queryRaw(Prisma.sql`
      SELECT id FROM ${dbTable("selections")} WHERE market_id = ${marketId} FOR UPDATE
    `);
  },
};
