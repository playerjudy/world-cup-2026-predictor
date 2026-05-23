export type GroupLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type TeamId = string;
export type Outcome = "home" | "draw" | "away";
export type RoundKey = "R32" | "R16" | "QF" | "SF" | "F";

export interface Team {
  id: TeamId;
  group: GroupLetter;
  name: string;
  enName: string;
  code: string;
  flag: string;
  elo: number;
}

export interface Fixture {
  id: string;
  matchNo: number;
  group: GroupLetter;
  home: TeamId;
  away: TeamId;
  dateLabel: string;
  venue?: string;
  score?: [number, number];
}

export interface TeamStats {
  teamId: TeamId;
  group: GroupLetter;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  rank: number;
  fairPlay: number;
  needsRankingDecision?: boolean;
}

export interface FairPlayRecord {
  yellow: number;
  secondYellowRed: number;
  directRed: number;
  yellowThenRed: number;
}

export interface ThirdPlaceEntry extends TeamStats {
  qualified: boolean;
}

export interface ThirdSlot {
  matchNo: number;
  winnerSlot: string;
  allowedGroups: GroupLetter[];
  assignedGroup?: GroupLetter;
  source: "official-slot-constraint" | "manual-matrix";
}

export interface KnockoutMatch {
  id: string;
  matchNo: number;
  round: RoundKey;
  label: string;
  home?: TeamId;
  away?: TeamId;
  homeSource: string;
  awaySource: string;
  score?: [number, number];
  winner?: TeamId;
}

export interface TournamentState {
  fixtures: Record<string, Fixture>;
  knockoutScores: Record<number, [number, number]>;
  knockoutWinners: Record<number, TeamId>;
}
