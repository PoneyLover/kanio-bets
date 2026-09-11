/**
 * SportsDataProvider - point d'extension pour brancher une source de donnees
 * sportives externe (API payante ou gratuite) sans toucher au reste de
 * l'application.
 *
 * Aujourd'hui : `DemoSportsDataProvider` lit les fixtures de demonstration
 * directement depuis la base (creees par le seed ou l'admin).
 *
 * Demain : une implementation `ExternalApiSportsDataProvider` pourrait
 * appeler une API tierce et renvoyer les memes DTO, permettant d'alimenter
 * automatiquement `EventsService` sans changer les controleurs ni le
 * frontend. Le choix de l'implementation active se fait dans un seul
 * endroit : `sports.routes.ts`.
 */

export interface FixtureDTO {
  externalId: string;
  sportKey: string;
  competitionName: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string; // ISO 8601
}

export interface ResultDTO {
  externalId: string;
  homeScore: number;
  awayScore: number;
  finishedAt: string; // ISO 8601
}

export interface SportsDataProvider {
  /** Liste les prochaines rencontres disponibles pour un sport donne. */
  listUpcomingFixtures(sportKey: string): Promise<FixtureDTO[]>;
  /** Renvoie le resultat d'une rencontre si elle est terminee, sinon null. */
  getResult(externalId: string): Promise<ResultDTO | null>;
}
