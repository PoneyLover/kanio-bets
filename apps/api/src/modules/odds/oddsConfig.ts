import { env } from "../../env";

/**
 * Parametres de l'algorithme de cotes dynamiques.
 * Tous sont surchargeables via variables d'environnement (voir .env.example)
 * sans toucher au code. Voir docs/ODDS_ALGORITHM.md pour la formule complete.
 */
export const oddsConfig = {
  /** Marge du "bookmaker" (overround) retiree des cotes justes. 0.06 = 6%. */
  margin: env.ODDS_MARGIN,
  /**
   * Poids du "prior" (cotes actuelles) exprime comme une mise virtuelle.
   * Plus il est grand, plus il faut de volume mise reel pour faire bouger
   * les cotes de facon significative (protection contre la manipulation
   * par un petit nombre de gros paris).
   */
  smoothingK: env.ODDS_SMOOTHING_K,
  /** Variation maximale autorisee par recalcul, en proportion de la cote actuelle. */
  maxDeltaRatio: env.ODDS_MAX_DELTA_RATIO,
  /** Bornes absolues de securite si une selection n'en definit pas. */
  hardFloor: 1.01,
  hardCeiling: 1000,
} as const;
