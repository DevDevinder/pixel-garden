// src/core/gridUtils.test.ts
import { describe, it, expect } from "vitest";
import { createEmptyGrid, cloneGrid, getNeighbourCells } from "./gridUtils";
import type { Grid } from "./cell";

describe("gridUtils", () => {
  describe("createEmptyGrid", () => {
    it("creates a grid with the requested dimensions", () => {
      const rows = 4;
      const cols = 3;

      const grid = createEmptyGrid(rows, cols);

      expect(grid.length).toBe(rows);
      grid.forEach((row) => expect(row.length).toBe(cols));
    });

    it("initialises all cells to empty colour and age 0", () => {
      const grid = createEmptyGrid(2, 2);

      for (const row of grid) {
        for (const cell of row) {
          expect(cell.color).toBeNull();
          expect(cell.age).toBe(0);
        }
      }
    });
  });

  describe("cloneGrid", () => {
    it("returns a deep copy (no shared cell references)", () => {
      const original = createEmptyGrid(2, 2);
      original[0][0].color = { r: 255, g: 0, b: 0 };
      original[0][0].age = 5;

      const copy = cloneGrid(original);

      // Same shape
      expect(copy.length).toBe(original.length);
      expect(copy[0].length).toBe(original[0].length);

      // Same values
      expect(copy[0][0].color).toEqual({ r: 255, g: 0, b: 0 });
      expect(copy[0][0].age).toBe(5);

      // But different object references
      expect(copy).not.toBe(original);
      expect(copy[0]).not.toBe(original[0]);
      expect(copy[0][0]).not.toBe(original[0][0]);

      // Changing copy does not affect the original
      copy[0][0].color = { r: 0, g: 255, b: 0 };
      expect(original[0][0].color).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe("getNeighbourCells", () => {
    const buildSimpleGrid = (): Grid => {
      const grid = createEmptyGrid(3, 3);
      // Just to have something non null to look at
      grid[1][1].color = { r: 255, g: 255, b: 255 };
      return grid;
    };

    it("returns 8 neighbours for a centre cell", () => {
      const grid = buildSimpleGrid();
      const neighbours = getNeighbourCells(grid, 1, 1);

      expect(neighbours.length).toBe(8);
    });

    it("returns 3 neighbours for a corner cell", () => {
      const grid = buildSimpleGrid();
      const neighbours = getNeighbourCells(grid, 0, 0);

      expect(neighbours.length).toBe(3);
    });

    it("returns valid cells within bounds only", () => {
      const grid = buildSimpleGrid();
      const neighbours = getNeighbourCells(grid, 0, 0);

      for (const cell of neighbours) {
        expect(cell).toBeDefined();
      }
    });
  });
});
