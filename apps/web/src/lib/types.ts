export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  balance: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  type:
    | "INITIAL_BALANCE"
    | "BET_PLACED"
    | "BET_WIN"
    | "BET_LOSS"
    | "BET_REFUND"
    | "ADMIN_CREDIT"
    | "ADMIN_DEBIT"
    | "BONUS";
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
}

export type EventStatus = "SCHEDULED" | "OPEN" | "SUSPENDED" | "CLOSED" | "FINISHED" | "CANCELLED";
export type MarketStatus = "OPEN" | "SUSPENDED" | "CLOSED" | "SETTLED" | "CANCELLED";
export type MarketType = "MATCH_WINNER" | "OVER_UNDER" | "CORRECT_SCORE" | "HANDICAP";
export type SelectionResult = "PENDING" | "WON" | "LOST" | "VOID";

export interface Selection {
  id: string;
  marketId: string;
  label: string;
  outcomeKey: string;
  currentOdds: string;
  minOdds: string;
  maxOdds: string;
  totalStaked: string;
  result: SelectionResult;
}

export interface Market {
  id: string;
  eventId: string;
  type: MarketType;
  name: string;
  line: string | null;
  status: MarketStatus;
  selections: Selection[];
}

export interface SportRef {
  id: string;
  key: string;
  name: string;
}

export interface Participant {
  id: string;
  name: string;
  shortName: string | null;
}

export interface EventItem {
  id: string;
  competitionId: string;
  competition: { id: string; name: string; country: string | null; sport: SportRef };
  homeParticipant: Participant;
  awayParticipant: Participant;
  startTime: string;
  status: EventStatus;
  resultPayload: { homeScore: number; awayScore: number } | null;
  markets: Market[];
}

export type BetType = "SIMPLE" | "COMBO";
export type BetStatus = "PENDING" | "WON" | "LOST" | "REFUNDED" | "CANCELLED";

export interface BetSelectionItem {
  id: string;
  selectionId: string;
  oddsTaken: string;
  selectionLabel: string;
  marketName: string;
  eventLabel: string;
  result: SelectionResult;
}

export interface Bet {
  id: string;
  type: BetType;
  stake: string;
  totalOdds: string;
  potentialPayout: string;
  status: BetStatus;
  placedAt: string;
  settledAt: string | null;
  payoutAmount: string | null;
  selections: BetSelectionItem[];
}

export interface PublicBet extends Bet {
  username: string;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  balance?: string;
  netProfit?: number;
  wins?: number;
  roi?: number | null;
  settledBets?: number;
}
