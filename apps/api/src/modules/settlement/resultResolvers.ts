import type { MarketType } from "../../lib/prisma";

export interface MatchResultPayload {
  homeScore: number;
  awayScore: number;
}

export type ResolvedOutcome = "WON" | "LOST" | "VOID";

/**
 * Determine si une selection (identifiee par son outcomeKey) est gagnante,
 * perdante, ou "void" (remboursee - egalite exacte sur une ligne over/under
 * par exemple) au vu du resultat brut de l'evenement.
 *
 * Isole ici pour pouvoir ajouter facilement de nouveaux types de marche
 * (HANDICAP, CORRECT_SCORE...) sans toucher a SettlementService.
 */
export function resolveOutcome(
  marketType: MarketType,
  outcomeKey: string,
  result: MatchResultPayload,
  line: number | null
): ResolvedOutcome {
  switch (marketType) {
    case "MATCH_WINNER": {
      const winner = result.homeScore > result.awayScore ? "HOME" : result.homeScore < result.awayScore ? "AWAY" : "DRAW";
      return outcomeKey === winner ? "WON" : "LOST";
    }

    case "OVER_UNDER": {
      if (line === null) throw new Error("Marche OVER_UNDER sans ligne definie");
      const total = result.homeScore + result.awayScore;
      if (total === line) return "VOID"; // push exact (rare avec des lignes .5)
      const isOver = total > line;
      if (outcomeKey === "OVER") return isOver ? "WON" : "LOST";
      if (outcomeKey === "UNDER") return !isOver ? "WON" : "LOST";
      throw new Error(`outcomeKey inconnu pour OVER_UNDER: ${outcomeKey}`);
    }

    case "HANDICAP": {
      if (line === null) throw new Error("Marche HANDICAP sans ligne definie");
      // Handicap applique a l'equipe a domicile : outcomeKey HOME/AWAY
      const adjustedHome = result.homeScore + line;
      if (adjustedHome === result.awayScore) return "VOID";
      const homeWinsAdjusted = adjustedHome > result.awayScore;
      if (outcomeKey === "HOME") return homeWinsAdjusted ? "WON" : "LOST";
      if (outcomeKey === "AWAY") return !homeWinsAdjusted ? "WON" : "LOST";
      throw new Error(`outcomeKey inconnu pour HANDICAP: ${outcomeKey}`);
    }

    case "CORRECT_SCORE": {
      const actual = `${result.homeScore}-${result.awayScore}`;
      return outcomeKey === actual ? "WON" : "LOST";
    }

    default:
      throw new Error(`Type de marche non supporte par le settlement: ${marketType}`);
  }
}
