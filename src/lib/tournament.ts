import { FIXTURES, GROUPS, TEAMS, teamById } from "../data/worldCup2026";
import type {
  FairPlayRecord,
  Fixture,
  GroupLetter,
  KnockoutMatch,
  TeamId,
  TeamStats,
  ThirdPlaceEntry,
  ThirdSlot,
} from "../types";

export type FairPlayTable = Record<TeamId, FairPlayRecord>;

export const THIRD_PLACE_SLOTS: ThirdSlot[] = [
  { matchNo: 74, winnerSlot: "1E", allowedGroups: ["A", "B", "C", "D", "F"], source: "official-slot-constraint" },
  { matchNo: 77, winnerSlot: "1I", allowedGroups: ["C", "D", "F", "G", "H"], source: "official-slot-constraint" },
  { matchNo: 79, winnerSlot: "1A", allowedGroups: ["C", "E", "F", "H", "I"], source: "official-slot-constraint" },
  { matchNo: 80, winnerSlot: "1L", allowedGroups: ["E", "H", "I", "J", "K"], source: "official-slot-constraint" },
  { matchNo: 81, winnerSlot: "1D", allowedGroups: ["B", "E", "F", "I", "J"], source: "official-slot-constraint" },
  { matchNo: 82, winnerSlot: "1G", allowedGroups: ["A", "E", "H", "I", "J"], source: "official-slot-constraint" },
  { matchNo: 85, winnerSlot: "1B", allowedGroups: ["E", "F", "G", "I", "J"], source: "official-slot-constraint" },
  { matchNo: 87, winnerSlot: "1K", allowedGroups: ["D", "E", "I", "J", "L"], source: "official-slot-constraint" },
];

export const initialFixtures = (): Record<string, Fixture> =>
  Object.fromEntries(FIXTURES.map((fixture) => [fixture.id, { ...fixture }]));

export function groupFixtures(fixtures: Record<string, Fixture>, group: GroupLetter) {
  return Object.values(fixtures)
    .filter((fixture) => fixture.group === group)
    .sort((a, b) => a.matchNo - b.matchNo);
}

export function computeGroupTable(
  fixtures: Record<string, Fixture>,
  group: GroupLetter,
  fairPlay: FairPlayTable = {},
): TeamStats[] {
  const rows = TEAMS.filter((team) => team.group === group).map((team) =>
    emptyStats(team.id, group, fairPlayScore(fairPlay[team.id])),
  );

  for (const fixture of groupFixtures(fixtures, group)) {
    if (!fixture.score) continue;
    const [homeGoals, awayGoals] = fixture.score;
    const home = rows.find((row) => row.teamId === fixture.home)!;
    const away = rows.find((row) => row.teamId === fixture.away)!;

    applyScore(home, homeGoals, awayGoals);
    applyScore(away, awayGoals, homeGoals);
  }

  return rankGroupRows(rows, fixtures, group);
}

export function computeAllTables(fixtures: Record<string, Fixture>, fairPlay: FairPlayTable = {}) {
  return Object.fromEntries(GROUPS.map((group) => [group, computeGroupTable(fixtures, group, fairPlay)])) as Record<
    GroupLetter,
    TeamStats[]
  >;
}

export function computeThirdPlaceTable(fixtures: Record<string, Fixture>, fairPlay: FairPlayTable = {}): ThirdPlaceEntry[] {
  const thirds = GROUPS.map((group) => computeGroupTable(fixtures, group, fairPlay)[2]).sort(compareThirdPlaceRows);
  return thirds.map((row, index) => ({ ...row, qualified: index < 8 }));
}

export interface ThirdPlaceBoundaryAnalysis {
  hasBoundaryDispute: boolean;
  definiteQualified: ThirdPlaceEntry[];
  disputed: ThirdPlaceEntry[];
  slotsAvailable: number;
  defaultQualifiedGroups: GroupLetter[];
}

export function analyzeThirdPlaceBoundary(thirdTable: ThirdPlaceEntry[]): ThirdPlaceBoundaryAnalysis {
  const sorted = [...thirdTable].sort(compareThirdPlaceRows);
  const defaultQualifiedGroups = sorted.slice(0, 8).map((entry) => entry.group);
  const eighth = sorted[7];
  const ninth = sorted[8];

  if (!eighth || !ninth || !sameThirdPlaceBoundary(eighth, ninth)) {
    return {
      hasBoundaryDispute: false,
      definiteQualified: sorted.slice(0, 8),
      disputed: [],
      slotsAvailable: 0,
      defaultQualifiedGroups,
    };
  }

  const disputed = sorted.filter((entry) => sameThirdPlaceBoundary(entry, eighth));
  const definiteQualified = sorted.filter(
    (entry) => compareThirdPlaceBoundary(entry, eighth) < 0,
  );

  return {
    hasBoundaryDispute: true,
    definiteQualified,
    disputed,
    slotsAvailable: Math.max(0, 8 - definiteQualified.length),
    defaultQualifiedGroups,
  };
}

export function markThirdPlaceQualified(
  thirdTable: ThirdPlaceEntry[],
  qualifiedGroups: GroupLetter[],
): ThirdPlaceEntry[] {
  const qualified = new Set(qualifiedGroups);
  return thirdTable.map((entry) => ({ ...entry, qualified: qualified.has(entry.group) }));
}

export function deriveThirdPlaceSlots(qualifiedGroups: GroupLetter[]): ThirdSlot[] {
  const groups = [...qualifiedGroups].sort();
  const result = searchThirdPlaceAssignment(groups);
  if (!result) {
    return THIRD_PLACE_SLOTS.map((slot) => ({ ...slot, assignedGroup: undefined }));
  }
  return THIRD_PLACE_SLOTS.map((slot) => ({ ...slot, assignedGroup: result[slot.matchNo] }));
}

export function buildRoundOf32(
  fixtures: Record<string, Fixture>,
  fairPlay: FairPlayTable = {},
  qualifiedThirdGroups?: GroupLetter[],
): KnockoutMatch[] {
  const tables = computeAllTables(fixtures, fairPlay);
  const thirdRows = GROUPS.map((group) => tables[group][2]).sort(compareThirdPlaceRows);
  const qualifiedGroups = qualifiedThirdGroups ?? thirdRows.slice(0, 8).map((entry) => entry.group);
  const qualifiedGroupSet = new Set(qualifiedGroups);
  const thirds = thirdRows.filter((entry) => qualifiedGroupSet.has(entry.group));
  const slots = deriveThirdPlaceSlots(thirds.map((entry) => entry.group));
  const thirdByGroup = Object.fromEntries(thirds.map((entry) => [entry.group, entry.teamId])) as Partial<
    Record<GroupLetter, TeamId>
  >;
  const thirdTeamForMatch = (matchNo: number) => {
    const group = slots.find((slot) => slot.matchNo === matchNo)?.assignedGroup;
    return group ? thirdByGroup[group] : undefined;
  };
  const rank = (group: GroupLetter, index: number) => tables[group][index]?.teamId;

  return [
    match(73, "R32", "32 强", rank("A", 1), rank("B", 1), "2A", "2B"),
    match(74, "R32", "32 强", rank("E", 0), thirdTeamForMatch(74), "1E", "3A/B/C/D/F"),
    match(75, "R32", "32 强", rank("F", 0), rank("C", 1), "1F", "2C"),
    match(76, "R32", "32 强", rank("C", 0), rank("F", 1), "1C", "2F"),
    match(77, "R32", "32 强", rank("I", 0), thirdTeamForMatch(77), "1I", "3C/D/F/G/H"),
    match(78, "R32", "32 强", rank("E", 1), rank("I", 1), "2E", "2I"),
    match(79, "R32", "32 强", rank("A", 0), thirdTeamForMatch(79), "1A", "3C/E/F/H/I"),
    match(80, "R32", "32 强", rank("L", 0), thirdTeamForMatch(80), "1L", "3E/H/I/J/K"),
    match(81, "R32", "32 强", rank("D", 0), thirdTeamForMatch(81), "1D", "3B/E/F/I/J"),
    match(82, "R32", "32 强", rank("G", 0), thirdTeamForMatch(82), "1G", "3A/E/H/I/J"),
    match(83, "R32", "32 强", rank("K", 1), rank("L", 1), "2K", "2L"),
    match(84, "R32", "32 强", rank("H", 0), rank("J", 1), "1H", "2J"),
    match(85, "R32", "32 强", rank("B", 0), thirdTeamForMatch(85), "1B", "3E/F/G/I/J"),
    match(86, "R32", "32 强", rank("J", 0), rank("H", 1), "1J", "2H"),
    match(87, "R32", "32 强", rank("K", 0), thirdTeamForMatch(87), "1K", "3D/E/I/J/L"),
    match(88, "R32", "32 强", rank("D", 1), rank("G", 1), "2D", "2G"),
  ];
}

export function buildKnockoutBracket(
  fixtures: Record<string, Fixture>,
  winners: Record<number, TeamId>,
  scores: Record<number, [number, number]>,
  fairPlay: FairPlayTable = {},
  qualifiedThirdGroups?: GroupLetter[],
): KnockoutMatch[] {
  const r32 = buildRoundOf32(fixtures, fairPlay, qualifiedThirdGroups).map((m) => hydrateKnockout(m, winners, scores));
  const team = (matchNo: number) => winners[matchNo];
  const r16 = [
    match(89, "R16", "16 强", team(73), team(74), "胜 73", "胜 74"),
    match(90, "R16", "16 强", team(75), team(76), "胜 75", "胜 76"),
    match(91, "R16", "16 强", team(77), team(78), "胜 77", "胜 78"),
    match(92, "R16", "16 强", team(79), team(80), "胜 79", "胜 80"),
    match(93, "R16", "16 强", team(81), team(82), "胜 81", "胜 82"),
    match(94, "R16", "16 强", team(83), team(84), "胜 83", "胜 84"),
    match(95, "R16", "16 强", team(85), team(86), "胜 85", "胜 86"),
    match(96, "R16", "16 强", team(87), team(88), "胜 87", "胜 88"),
  ].map((m) => hydrateKnockout(m, winners, scores));
  const qf = [
    match(97, "QF", "8 强", team(89), team(90), "胜 89", "胜 90"),
    match(98, "QF", "8 强", team(91), team(92), "胜 91", "胜 92"),
    match(99, "QF", "8 强", team(93), team(94), "胜 93", "胜 94"),
    match(100, "QF", "8 强", team(95), team(96), "胜 95", "胜 96"),
  ].map((m) => hydrateKnockout(m, winners, scores));
  const sf = [
    match(101, "SF", "半决赛", team(97), team(98), "胜 97", "胜 98"),
    match(102, "SF", "半决赛", team(99), team(100), "胜 99", "胜 100"),
  ].map((m) => hydrateKnockout(m, winners, scores));
  const final = [match(104, "F", "决赛", team(101), team(102), "胜 101", "胜 102")].map((m) =>
    hydrateKnockout(m, winners, scores),
  );

  return [...r32, ...r16, ...qf, ...sf, ...final];
}

export function setOutcome(fixture: Fixture, outcome: "home" | "draw" | "away"): Fixture {
  const score: [number, number] =
    outcome === "home" ? [2, 0] : outcome === "away" ? [0, 2] : [1, 1];
  return { ...fixture, score };
}

export function generateFixturesForOrder(group: GroupLetter, orderedTeamIds: TeamId[]): Fixture[] {
  return FIXTURES.filter((fixture) => fixture.group === group).map((fixture) => {
    const homeRank = orderedTeamIds.indexOf(fixture.home);
    const awayRank = orderedTeamIds.indexOf(fixture.away);
    if (homeRank === -1 || awayRank === -1) return fixture;
    const diff = Math.abs(homeRank - awayRank);
    if (homeRank < awayRank) return { ...fixture, score: [diff >= 2 ? 3 : 2, 0] };
    return { ...fixture, score: [0, diff >= 2 ? 3 : 2] };
  });
}

function emptyStats(teamId: TeamId, group: GroupLetter, fairPlay: number): TeamStats {
  return {
    teamId,
    group,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    rank: 0,
    fairPlay,
  };
}

function applyScore(row: TeamStats, goalsFor: number, goalsAgainst: number) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDiff = row.goalsFor - row.goalsAgainst;
  if (goalsFor > goalsAgainst) {
    row.wins += 1;
    row.points += 3;
  } else if (goalsFor === goalsAgainst) {
    row.draws += 1;
    row.points += 1;
  } else {
    row.losses += 1;
  }
}

function rankGroupRows(rows: TeamStats[], fixtures: Record<string, Fixture>, group: GroupLetter) {
  const sorted = [...rows].sort((a, b) => compareGroupRows(a, b, rows, fixtures, group));
  return sorted.map((row, index, allRows) => ({
    ...row,
    rank: index + 1,
    needsRankingDecision:
      (index > 0 && compareBeforeRankingDecision(row, allRows[index - 1], rows, fixtures, group) === 0) ||
      (index < allRows.length - 1 && compareBeforeRankingDecision(row, allRows[index + 1], rows, fixtures, group) === 0),
  }));
}

function compareGroupRows(
  a: TeamStats,
  b: TeamStats,
  rows: TeamStats[],
  fixtures: Record<string, Fixture>,
  group: GroupLetter,
) {
  return (
    compareBeforeRankingDecision(a, b, rows, fixtures, group) ||
    teamById[a.teamId].code.localeCompare(teamById[b.teamId].code)
  );
}

function compareBeforeRankingDecision(
  a: TeamStats,
  b: TeamStats,
  rows: TeamStats[],
  fixtures: Record<string, Fixture>,
  group: GroupLetter,
) {
  const tiedTeams = rows.filter((row) => row.points === a.points && row.points === b.points).map((row) => row.teamId);
  const aH2h = headToHeadStats(a.teamId, tiedTeams, fixtures, group);
  const bH2h = headToHeadStats(b.teamId, tiedTeams, fixtures, group);
  return (
    b.points - a.points ||
    bH2h.points - aH2h.points ||
    bH2h.goalDiff - aH2h.goalDiff ||
    bH2h.goalsFor - aH2h.goalsFor ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    b.fairPlay - a.fairPlay
  );
}

function headToHeadStats(teamId: TeamId, tiedTeams: TeamId[], fixtures: Record<string, Fixture>, group: GroupLetter) {
  const stats = { points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
  for (const fixture of groupFixtures(fixtures, group)) {
    if (!fixture.score || !tiedTeams.includes(fixture.home) || !tiedTeams.includes(fixture.away)) continue;
    if (fixture.home !== teamId && fixture.away !== teamId) continue;
    const [homeGoals, awayGoals] = fixture.score;
    const goalsFor = fixture.home === teamId ? homeGoals : awayGoals;
    const goalsAgainst = fixture.home === teamId ? awayGoals : homeGoals;
    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;
    stats.goalDiff = stats.goalsFor - stats.goalsAgainst;
    if (goalsFor > goalsAgainst) stats.points += 3;
    if (goalsFor === goalsAgainst) stats.points += 1;
  }
  return stats;
}

function compareThirdPlaceRows(a: TeamStats, b: TeamStats) {
  return (
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    b.fairPlay - a.fairPlay ||
    GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group)
  );
}

function compareThirdPlaceBoundary(a: TeamStats, b: TeamStats) {
  return b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || b.fairPlay - a.fairPlay;
}

function sameThirdPlaceBoundary(a: TeamStats, b: TeamStats) {
  return compareThirdPlaceBoundary(a, b) === 0;
}

export function fairPlayScore(record?: FairPlayRecord) {
  if (!record) return 0;
  return (
    record.yellow * -1 +
    record.secondYellowRed * -3 +
    record.directRed * -4 +
    record.yellowThenRed * -5
  );
}

function searchThirdPlaceAssignment(groups: GroupLetter[]) {
  const slots = [...THIRD_PLACE_SLOTS].sort(
    (a, b) =>
      a.allowedGroups.filter((group) => groups.includes(group)).length -
      b.allowedGroups.filter((group) => groups.includes(group)).length,
  );
  const assignment: Record<number, GroupLetter> = {};
  const used = new Set<GroupLetter>();

  const dfs = (slotIndex: number): boolean => {
    if (slotIndex === slots.length) return true;
    const slot = slots[slotIndex];
    const candidates = slot.allowedGroups
      .filter((group) => groups.includes(group) && !used.has(group))
      .sort((a, b) => {
        const aFuture = futureFlex(a, slots, slotIndex);
        const bFuture = futureFlex(b, slots, slotIndex);
        return aFuture - bFuture || GROUPS.indexOf(a) - GROUPS.indexOf(b);
      });
    for (const group of candidates) {
      used.add(group);
      assignment[slot.matchNo] = group;
      if (dfs(slotIndex + 1)) return true;
      used.delete(group);
      delete assignment[slot.matchNo];
    }
    return false;
  };

  return dfs(0) ? assignment : undefined;
}

function futureFlex(group: GroupLetter, slots: ThirdSlot[], slotIndex: number) {
  return slots.slice(slotIndex + 1).filter((slot) => slot.allowedGroups.includes(group)).length;
}

function match(
  matchNo: number,
  round: KnockoutMatch["round"],
  label: string,
  home: TeamId | undefined,
  away: TeamId | undefined,
  homeSource: string,
  awaySource: string,
): KnockoutMatch {
  return {
    id: `${round}-${matchNo}`,
    matchNo,
    round,
    label,
    home,
    away,
    homeSource,
    awaySource,
  };
}

function hydrateKnockout(matchItem: KnockoutMatch, winners: Record<number, TeamId>, scores: Record<number, [number, number]>) {
  return {
    ...matchItem,
    score: scores[matchItem.matchNo],
    winner: winners[matchItem.matchNo],
  };
}
