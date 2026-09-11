import { describe, expect, it } from "vitest";
import { computeUpdatedOdds, type SelectionSnapshot } from "../../src/modules/odds/odds.service";

const config = { margin: 0.06, smoothingK: 50, maxDeltaRatio: 0.15, hardFloor: 1.01, hardCeiling: 1000 };

function selections(overrides: Partial<SelectionSnapshot>[]): SelectionSnapshot[] {
  const base: SelectionSnapshot = { id: "x", currentOdds: 2, minOdds: 1.05, maxOdds: 15, totalStaked: 0 };
  return overrides.map((o, i) => ({ ...base, id: `sel-${i}`, ...o }));
}

describe("OddsService.computeUpdatedOdds", () => {
  it("ne change rien tant qu'aucune mise n'a ete placee", () => {
    const input = selections([
      { currentOdds: 1.8, totalStaked: 0 },
      { currentOdds: 3.5, totalStaked: 0 },
      { currentOdds: 4.2, totalStaked: 0 },
    ]);
    const result = computeUpdatedOdds(input, config);
    expect(result.every((r) => !r.changed)).toBe(true);
    expect(result.map((r) => r.newOdds)).toEqual([1.8, 3.5, 4.2]);
  });

  it("fait baisser la cote de la selection qui recoit toutes les mises", () => {
    const input = selections([
      { currentOdds: 1.8, totalStaked: 500 },
      { currentOdds: 3.5, totalStaked: 0 },
      { currentOdds: 4.2, totalStaked: 0 },
    ]);
    const result = computeUpdatedOdds(input, config);
    const home = result.find((r) => r.id === "sel-0")!;
    expect(home.newOdds).toBeLessThan(1.8);
  });

  it("fait monter la cote des selections qui ne recoivent aucune mise face a du volume ailleurs", () => {
    const input = selections([
      { currentOdds: 1.8, totalStaked: 1000 },
      { currentOdds: 3.5, totalStaked: 0 },
      { currentOdds: 4.2, totalStaked: 0 },
    ]);
    const result = computeUpdatedOdds(input, config);
    const draw = result.find((r) => r.id === "sel-1")!;
    const away = result.find((r) => r.id === "sel-2")!;
    expect(draw.newOdds).toBeGreaterThan(3.5);
    expect(away.newOdds).toBeGreaterThan(4.2);
  });

  it("ne depasse jamais la variation maximale autorisee par recalcul", () => {
    const input = selections([
      { currentOdds: 1.8, totalStaked: 1_000_000 },
      { currentOdds: 3.5, totalStaked: 0 },
      { currentOdds: 4.2, totalStaked: 0 },
    ]);
    const result = computeUpdatedOdds(input, config);
    for (const r of result) {
      const maxMove = r.previousOdds * config.maxDeltaRatio;
      expect(Math.abs(r.newOdds - r.previousOdds)).toBeLessThanOrEqual(maxMove + 0.001);
    }
  });

  it("respecte toujours les bornes min/max de chaque selection", () => {
    const input = selections([
      { currentOdds: 1.1, minOdds: 1.05, maxOdds: 1.5, totalStaked: 1_000_000 },
      { currentOdds: 10, minOdds: 1.05, maxOdds: 15, totalStaked: 0 },
    ]);
    // Beaucoup d'iterations pour laisser la cote converger vers ses bornes
    let current = input;
    for (let i = 0; i < 50; i++) {
      const result = computeUpdatedOdds(current, config);
      current = current.map((s, idx) => ({ ...s, currentOdds: result[idx].newOdds }));
    }
    expect(current[0].currentOdds).toBeGreaterThanOrEqual(1.05);
    expect(current[0].currentOdds).toBeLessThanOrEqual(1.5);
    expect(current[1].currentOdds).toBeLessThanOrEqual(15);
  });

  it("ne modifie jamais moins de 2 selections (marche degenere) et ne plante pas", () => {
    const input = selections([{ currentOdds: 1.5, totalStaked: 100 }]);
    const result = computeUpdatedOdds(input, config);
    expect(result).toEqual([{ id: "sel-0", previousOdds: 1.5, newOdds: 1.5, changed: false }]);
  });

  it("converge vers la probabilite empirique quand le volume mise est tres superieur a K", () => {
    // 90% des mises sur HOME, 10% sur AWAY, avec un volume enorme (>> K=50)
    const input = selections([
      { currentOdds: 2, totalStaked: 90_000 },
      { currentOdds: 2, totalStaked: 10_000 },
    ]);
    const result = computeUpdatedOdds(input, { ...config, maxDeltaRatio: 1 }); // pas de limite de variation ici
    const home = result.find((r) => r.id === "sel-0")!;
    const away = result.find((r) => r.id === "sel-1")!;
    // Cote juste attendue ~ 1/0.9 = 1.111, avec marge 6% -> ~1.044
    expect(home.newOdds).toBeCloseTo(1.044, 1);
    expect(away.newOdds).toBeGreaterThan(home.newOdds);
  });
});
