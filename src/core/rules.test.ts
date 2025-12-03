// src/core/rules.test.ts
import { describe, it, expect } from "vitest";
import type { Grid, RgbColor } from "./cell";
import { createEmptyGrid } from "./gridUtils";
import {
  stepMoss,
  stepCrystal,
  stepTerrain,
  stepSlime,
  stepSnowfall,
  stepChaos,
  stepLava,
  stepMagicDraw,
  stepMagicDraw2,
  stepAvatar,
  stepAvatar2,
  stepMagicPortrait,
  stepMagicPortrait2,
  stepMagicDrawAura,
  stepWithRule,
  type GrowthRuleName,
} from "./rules";

const isValidColor = (color: RgbColor | null) => {
  if (!color) return true;
  const { r, g, b } = color;
  return (
    Number.isInteger(r) &&
    Number.isInteger(g) &&
    Number.isInteger(b) &&
    r >= 0 &&
    r <= 255 &&
    g >= 0 &&
    g <= 255 &&
    b >= 0 &&
    b <= 255
  );
};

const assertValidGridShapeAndColors = (grid: Grid, rows: number, cols: number) => {
  expect(grid.length).toBe(rows);
  grid.forEach((row) => {
    expect(row.length).toBe(cols);
    row.forEach((cell) => {
      expect(isValidColor(cell.color)).toBe(true);
      expect(Number.isInteger(cell.age)).toBe(true);
      expect(cell.age).toBeGreaterThanOrEqual(0);
    });
  });
};

describe("rules core", () => {
  describe("stepMoss", () => {
    it("spreads from a single seed into neighbouring cells", () => {
      const grid = createEmptyGrid(3, 3);
      grid[1][1].color = { r: 0, g: 255, b: 0 };
      grid[1][1].age = 0;

      const next = stepMoss(grid);

      let colouredCount = 0;
      next.forEach((row) =>
        row.forEach((cell) => {
          if (cell.color) colouredCount++;
        })
      );

      expect(colouredCount).toBe(9);
      assertValidGridShapeAndColors(next, 3, 3);
    });
  });

  describe("stepCrystal", () => {
    it("grows straight branches from a single seed", () => {
      const grid = createEmptyGrid(3, 3);
      const seedColor = { r: 0, g: 0, b: 255 };
      grid[1][1].color = seedColor;
      grid[1][1].age = 0;

      const next = stepCrystal(grid);

      expect(next[1][1].color).toEqual(seedColor);
      expect(next[0][1].color).toEqual(seedColor);
      expect(next[2][1].color).toEqual(seedColor);
      expect(next[1][0].color).toEqual(seedColor);
      expect(next[1][2].color).toEqual(seedColor);

      expect(next[0][0].color).toBeNull();
      expect(next[0][2].color).toBeNull();
      expect(next[2][0].color).toBeNull();
      expect(next[2][2].color).toBeNull();

      assertValidGridShapeAndColors(next, 3, 3);
    });
  });

  describe("stepTerrain", () => {
    it("adjusts terrain colours as cells age", () => {
      const grid = createEmptyGrid(3, 3);
      const baseColor = { r: 50, g: 200, b: 100 };

      grid[1][1].color = baseColor;
      grid[1][0].color = baseColor;
      grid[1][2].color = baseColor;
      grid[0][1].color = baseColor;
      grid[2][1].color = baseColor;

      const next = stepTerrain(grid);

      const centre = next[1][1];
      expect(centre.color).toBeDefined();
      expect(centre.age).toBeGreaterThan(0);

      if (centre.color) {
        expect(centre.color.g).toBeLessThanOrEqual(baseColor.g);
        expect(centre.color.b).toBeLessThanOrEqual(baseColor.b);
      }

      assertValidGridShapeAndColors(next, 3, 3);
    });
  });

  describe("stepSlime", () => {
    it("handles multi-neighbour blobs without breaking grid shape", () => {
      const grid = createEmptyGrid(3, 3);
      const c1 = { r: 0, g: 255, b: 0 };
      const c2 = { r: 0, g: 200, b: 50 };

      grid[1][0].color = c1;
      grid[1][2].color = c2;
      grid[0][1].color = c1;
      grid[2][1].color = c2;

      const next = stepSlime(grid);

      assertValidGridShapeAndColors(next, 3, 3);

      // There should be at least one coloured cell somewhere
      let colouredCount = 0;
      next.forEach((row) =>
        row.forEach((cell) => {
          if (cell.color) colouredCount++;
        })
      );
      expect(colouredCount).toBeGreaterThan(0);
    });
  });

  describe("stepSnowfall", () => {
    it("spreads single-pixel snow into neighbours slowly", () => {
      const grid = createEmptyGrid(3, 3);
      grid[1][1].color = { r: 255, g: 255, b: 255 };

      const next = stepSnowfall(grid);

      expect(next[1][1].color).not.toBeNull();
      assertValidGridShapeAndColors(next, 3, 3);
    });
  });
});

describe("rules random / generative", () => {
  const randomRules: Array<{
    name: string;
    fn: (grid: Grid) => Grid;
  }> = [
    { name: "lava", fn: stepLava },
    { name: "chaos", fn: stepChaos },
    { name: "magicDraw", fn: stepMagicDraw },
    { name: "magicDraw2", fn: stepMagicDraw2 },
    { name: "avatar", fn: stepAvatar },
    { name: "avatar2", fn: stepAvatar2 },
    { name: "magicPortrait", fn: stepMagicPortrait },
    { name: "magicPortrait2", fn: stepMagicPortrait2 },
    { name: "magicDrawAura", fn: stepMagicDrawAura },
  ];

  randomRules.forEach(({ name, fn }) => {
    it(`"${name}" produces a valid grid without changing dimensions`, () => {
      const rows = 16;
      const cols = 16;

      const grid = createEmptyGrid(rows, cols);

      const centreRow = Math.floor(rows / 2);
      const centreCol = Math.floor(cols / 2);
      grid[centreRow][centreCol].color = { r: 200, g: 100, b: 150 };
      grid[centreRow][centreCol].age = 0;

      const next = fn(grid);

      assertValidGridShapeAndColors(next, rows, cols);
    });
  });
});

describe("stepWithRule dispatcher", () => {
  it("delegates to the requested rule and preserves grid shape", () => {
    const rows = 8;
    const cols = 8;
    const grid = createEmptyGrid(rows, cols);
    grid[4][4].color = { r: 255, g: 0, b: 0 };
    grid[4][4].age = 0;

    const rulesToCheck: GrowthRuleName[] = [
      "moss",
      "crystal",
      "coral",
      "lava",
      "terrain",
      "slime",
      "snowfall",
      "chaos",
      "magicDraw",
      "magicDraw2",
      "avatar",
      "avatar2",
      "magicPortrait",
      "magicPortrait2",
      "magicDrawAura",
    ];

    for (const rule of rulesToCheck) {
      const next = stepWithRule(rule, grid);
      assertValidGridShapeAndColors(next, rows, cols);
    }
  });

  it('uses "moss" as the default rule when an unknown name is passed', () => {
    const rows = 5;
    const cols = 5;
    const grid = createEmptyGrid(rows, cols);
    grid[2][2].color = { r: 0, g: 255, b: 0 };

    // @ts-expect-error intentional incorrect rule name to trigger default
    const next = stepWithRule("unknown-rule", grid);

    const mossResult = stepMoss(grid);

    expect(next).toEqual(mossResult);
  });
});
