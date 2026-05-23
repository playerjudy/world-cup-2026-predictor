import { describe, expect, it } from "vitest";
import { GROUPS } from "../data/worldCup2026";
import {
  analyzeThirdPlaceBoundary,
  computeThirdPlaceTable,
  deriveThirdPlaceSlots,
  initialFixtures,
  setOutcome,
  THIRD_PLACE_SLOTS,
} from "./tournament";
import type { GroupLetter, ThirdPlaceEntry } from "../types";

describe("2026 tournament logic", () => {
  it("allocates every qualified third-place group to one valid round-of-32 slot", () => {
    const combinations = choose(GROUPS, 8);

    for (const combo of combinations) {
      const allocation = deriveThirdPlaceSlots(combo);
      const assigned = allocation.map((slot) => slot.assignedGroup).filter(Boolean);
      expect(new Set(assigned).size).toBe(8);
      expect(assigned.sort()).toEqual([...combo].sort());

      for (const slot of allocation) {
        expect(slot.assignedGroup).toBeTruthy();
        expect(slot.allowedGroups).toContain(slot.assignedGroup);
      }
    }
  });

  it("sorts best third-place teams by points, goal difference, then goals scored", () => {
    const fixtures = initialFixtures();
    Object.values(fixtures).forEach((fixture) => {
      fixtures[fixture.id] = setOutcome(fixture, "draw");
    });

    const thirdTable = computeThirdPlaceTable(fixtures);

    expect(thirdTable).toHaveLength(12);
    expect(thirdTable.filter((row) => row.qualified)).toHaveLength(8);
  });

  it("keeps official candidate groups on the match slots", () => {
    expect(THIRD_PLACE_SLOTS.find((slot) => slot.matchNo === 74)?.allowedGroups).toEqual(["A", "B", "C", "D", "F"]);
    expect(THIRD_PLACE_SLOTS.find((slot) => slot.matchNo === 87)?.allowedGroups).toEqual(["D", "E", "I", "J", "L"]);
  });

  it("does not block when ties are only inside the qualified third-place group", () => {
    const table = GROUPS.map((group, index) => thirdEntry(group, index < 8 ? 4 : 2));
    const boundary = analyzeThirdPlaceBoundary(table);

    expect(boundary.hasBoundaryDispute).toBe(false);
  });

  it("flags only unresolved ties across the eighth and ninth third-place boundary", () => {
    const table = GROUPS.map((group, index) => thirdEntry(group, index < 7 ? 6 : index < 9 ? 4 : 1));
    const boundary = analyzeThirdPlaceBoundary(table);

    expect(boundary.hasBoundaryDispute).toBe(true);
    expect(boundary.slotsAvailable).toBe(1);
    expect(boundary.disputed.map((entry) => entry.group)).toEqual(["H", "I"]);
  });
});

function choose(items: GroupLetter[], size: number, start = 0, prefix: GroupLetter[] = []): GroupLetter[][] {
  if (prefix.length === size) return [prefix];
  const results: GroupLetter[][] = [];
  for (let i = start; i < items.length; i += 1) {
    results.push(...choose(items, size, i + 1, [...prefix, items[i]]));
  }
  return results;
}

function thirdEntry(group: GroupLetter, points: number): ThirdPlaceEntry {
  return {
    teamId: `team-${group}`,
    group,
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 3,
    goalsAgainst: 3,
    goalDiff: 0,
    points,
    rank: 3,
    fairPlay: 0,
    qualified: false,
  };
}
