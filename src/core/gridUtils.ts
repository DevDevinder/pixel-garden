import type { CellState, Grid } from "./cell";

/**
 * Create a new, empty grid where all cells are clear and age 0.
 */
export function createEmptyGrid(rows: number, cols: number): Grid {
  const grid: Grid = [];
  for (let r = 0; r < rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ color: null, age: 0 });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Deep clone a grid by cloning each cell.
 * This ensures the simulation logic remains purely functional.
 */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) =>
    row.map((cell) => ({
      color: cell.color ? { ...cell.color } : null,
      age: cell.age,
    }))
  );
}

/**
 * Return the list of neighbouring cells around the (row, col) position.
 * Uses 8-neighbourhood (diagonals included).
 */
export function getNeighbourCells(grid: Grid, row: number, col: number) {
  const neighbours: CellState[] = [];
  const rowCount = grid.length;
  const colCount = grid[0]?.length ?? 0;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rowCount && nc >= 0 && nc < colCount) {
        neighbours.push(grid[nr][nc]);
      }
    }
  }

  return neighbours;
}
