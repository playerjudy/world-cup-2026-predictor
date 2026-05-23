import { FIXTURES, TEAMS, teamById } from "../data/worldCup2026";
import type { FairPlayRecord, Fixture, TeamId } from "../types";
import {
  buildKnockoutBracket,
  initialFixtures,
} from "./tournament";

export interface SimulationResult {
  championCounts: Record<TeamId, number>;
  simulations: number;
}

export interface FullSimulation {
  fixtures: Record<string, Fixture>;
  winners: Record<number, TeamId>;
  scores: Record<number, [number, number]>;
}

export function randomizeGroupStage(): Record<string, Fixture> {
  const fixtures = initialFixtures();
  for (const fixture of Object.values(fixtures)) {
    fixtures[fixture.id] = { ...fixture, score: simulateScore(fixture.home, fixture.away) };
  }
  return fixtures;
}

export function predictGroupStageByStrength(): Record<string, Fixture> {
  const fixtures = initialFixtures();
  for (const fixture of Object.values(fixtures)) {
    fixtures[fixture.id] = { ...fixture, score: predictScoreByStrength(fixture.home, fixture.away) };
  }
  return fixtures;
}

export function runMonteCarlo(iterations: number, baseFixtures?: Record<string, Fixture>): SimulationResult {
  const championCounts: Record<TeamId, number> = {};

  for (let i = 0; i < iterations; i += 1) {
    const fixtures = baseFixtures ? fillMissingFixtures(baseFixtures) : randomizeGroupStage();
    const winners: Record<number, TeamId> = {};
    const scores: Record<number, [number, number]> = {};
    for (const matchNo of knockoutOrder) {
      const bracket = buildKnockoutBracket(fixtures, winners, scores);
      const match = bracket.find((item) => item.matchNo === matchNo);
      if (!match?.home || !match.away) continue;
      const winner = simulateKnockoutWinner(match.home, match.away);
      winners[match.matchNo] = winner;
      scores[match.matchNo] = winner === match.home ? [2, 1] : [1, 2];
    }

    const champion = winners[104];
    if (champion) championCounts[champion] = (championCounts[champion] ?? 0) + 1;
  }

  return { championCounts, simulations: iterations };
}

export function simulateFullTournament(baseFixtures?: Record<string, Fixture>): FullSimulation {
  const fixtures = baseFixtures ? fillMissingFixtures(baseFixtures) : randomizeGroupStage();
  const winners: Record<number, TeamId> = {};
  const scores: Record<number, [number, number]> = {};

  for (const matchNo of knockoutOrder) {
    const bracket = buildKnockoutBracket(fixtures, winners, scores);
    const match = bracket.find((item) => item.matchNo === matchNo);
    if (!match?.home || !match.away) continue;
    const winner = simulateKnockoutWinner(match.home, match.away);
    const winningScore = simulateWinningScore();
    winners[matchNo] = winner;
    scores[matchNo] = winner === match.home ? winningScore : [winningScore[1], winningScore[0]];
  }

  return { fixtures, winners, scores };
}

export function shareState(
  fixtures: Record<string, Fixture>,
  winners: Record<number, TeamId>,
  scores: Record<number, [number, number]>,
  fairPlay: Record<TeamId, FairPlayRecord>,
  language: "zh" | "en",
) {
  return `v2.${toBase64Url(JSON.stringify(compactSharePayload(fixtures, winners, scores, fairPlay, language)))}`;
}

export function shareStateJson(
  fixtures: Record<string, Fixture>,
  winners: Record<number, TeamId>,
  scores: Record<number, [number, number]>,
  fairPlay: Record<TeamId, FairPlayRecord>,
  language: "zh" | "en",
) {
  return JSON.stringify({ fixtures, winners, scores, fairPlay, language }, null, 2);
}

export function loadSharedState(hash: string) {
  try {
    if (hash.startsWith("v2.")) {
      const payload = JSON.parse(fromBase64Url(hash.slice(3))) as CompactSharePayload;
      return expandCompactPayload(payload);
    }
    const raw = decodeURIComponent(atob(hash));
    return JSON.parse(raw) as {
      g?: [string, [number, number]][];
      k?: Record<number, TeamId>;
      s?: Record<number, [number, number]>;
      fp?: Record<TeamId, FairPlayRecord>;
      l?: "zh" | "en";
    };
  } catch {
    return undefined;
  }
}

type CompactSharePayload = {
  v: 2;
  g: [number, number, number][];
  w: [number, number][];
  s: [number, number, number][];
  f: [number, number, number, number, number][];
  l: 0 | 1;
};

const fixtureIndexById = new Map(FIXTURES.map((fixture, index) => [fixture.id, index]));
const teamIndexById = new Map(TEAMS.map((team, index) => [team.id, index]));

function compactSharePayload(
  fixtures: Record<string, Fixture>,
  winners: Record<number, TeamId>,
  scores: Record<number, [number, number]>,
  fairPlay: Record<TeamId, FairPlayRecord>,
  language: "zh" | "en",
): CompactSharePayload {
  return {
    v: 2,
    g: Object.values(fixtures)
      .filter((fixture) => fixture.score && fixtureIndexById.has(fixture.id))
      .map((fixture) => [fixtureIndexById.get(fixture.id)!, fixture.score![0], fixture.score![1]]),
    w: Object.entries(winners)
      .filter(([, teamId]) => teamIndexById.has(teamId))
      .map(([matchNo, teamId]) => [Number(matchNo), teamIndexById.get(teamId)!]),
    s: Object.entries(scores).map(([matchNo, score]) => [Number(matchNo), score[0], score[1]]),
    f: Object.entries(fairPlay)
      .filter(([, record]) => record.yellow || record.secondYellowRed || record.directRed || record.yellowThenRed)
      .filter(([teamId]) => teamIndexById.has(teamId))
      .map(([teamId, record]) => [
        teamIndexById.get(teamId)!,
        record.yellow,
        record.secondYellowRed,
        record.directRed,
        record.yellowThenRed,
      ]),
    l: language === "zh" ? 0 : 1,
  };
}

function expandCompactPayload(payload: CompactSharePayload) {
  const winners = Object.fromEntries(
    (payload.w ?? [])
      .map(([matchNo, teamIndex]) => [matchNo, TEAMS[teamIndex]?.id])
      .filter(([, teamId]) => teamId),
  ) as Record<number, TeamId>;
  const scores = Object.fromEntries((payload.s ?? []).map(([matchNo, home, away]) => [matchNo, [home, away]])) as Record<
    number,
    [number, number]
  >;
  const fairPlay = Object.fromEntries(
    (payload.f ?? [])
      .map(([teamIndex, yellow, secondYellowRed, directRed, yellowThenRed]) => [
        TEAMS[teamIndex]?.id,
        { yellow, secondYellowRed, directRed, yellowThenRed },
      ])
      .filter(([teamId]) => teamId),
  ) as Record<TeamId, FairPlayRecord>;

  return {
    g: (payload.g ?? [])
      .map(([fixtureIndex, home, away]) => [FIXTURES[fixtureIndex]?.id, [home, away]] as [string | undefined, [number, number]])
      .filter(([id]) => id) as [string, [number, number]][],
    k: winners,
    s: scores,
    fp: fairPlay,
    l: payload.l === 1 ? "en" : "zh",
  };
}

function toBase64Url(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  return atob(padded);
}

function fillMissingFixtures(baseFixtures: Record<string, Fixture>) {
  const fixtures = Object.fromEntries(Object.entries(baseFixtures).map(([id, fixture]) => [id, { ...fixture }]));
  for (const fixture of FIXTURES) {
    if (!fixtures[fixture.id]?.score) {
      fixtures[fixture.id] = { ...fixture, score: simulateScore(fixture.home, fixture.away) };
    }
  }
  return fixtures;
}

function simulateScore(home: TeamId, away: TeamId): [number, number] {
  const homeWin = winProbability(home, away) + 0.04;
  const draw = 0.22;
  const roll = Math.random();
  if (roll < draw) return [weightedGoals(home), weightedGoals(home)];
  if (roll < draw + homeWin * (1 - draw)) return [weightedGoals(home) + 1, weightedGoals(away)];
  return [weightedGoals(home), weightedGoals(away) + 1];
}

function predictScoreByStrength(home: TeamId, away: TeamId): [number, number] {
  const diff = teamById[home].elo - teamById[away].elo;
  const gap = Math.abs(diff);
  if (gap < 35) return [1, 1];
  const favoriteGoals = gap > 180 ? 3 : gap > 80 ? 2 : 2;
  const underdogGoals = gap > 80 ? 0 : 1;
  return diff > 0 ? [favoriteGoals, underdogGoals] : [underdogGoals, favoriteGoals];
}

function simulateKnockoutWinner(home: TeamId, away: TeamId) {
  return Math.random() < winProbability(home, away) ? home : away;
}

function simulateWinningScore(): [number, number] {
  const winnerGoals = Math.random() > 0.8 ? 3 : 2;
  const loserGoals = Math.random() > 0.65 ? 1 : 0;
  return [winnerGoals, loserGoals];
}

function winProbability(home: TeamId, away: TeamId) {
  const diff = teamById[home].elo - teamById[away].elo;
  return 1 / (1 + 10 ** (-diff / 420));
}

function weightedGoals(teamId: TeamId) {
  const eliteBoost = Math.max(0, teamById[teamId].elo - 1700) / 500;
  const roll = Math.random() + eliteBoost;
  if (roll > 1.35) return 3;
  if (roll > 0.78) return 2;
  if (roll > 0.28) return 1;
  return 0;
}

export const knockoutOrder = [
  73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101,
  102, 104,
];
