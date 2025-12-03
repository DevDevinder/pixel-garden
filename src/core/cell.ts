/**
 * Basic RGB colour representation.
 * Using explicit r/g/b.
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Represents the state of a single cell in the grid.
 *
 * - color: null if empty; otherwise the cells RGB colour.
 * - age: number of simulation steps this cell has been alive.
 */
export interface CellState {
  color: RgbColor | null;
  age: number;
}

/**
 * A 2D grid of CellState objects.
 * The first index is the row, the second index is the column.
 */
export type Grid = CellState[][];

export const GRID_ROWS = 32;
export const GRID_COLS = 32;
