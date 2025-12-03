import React, { useEffect, useRef } from "react";
import type { Grid } from "../core/cell";
import { rgbToHex } from "../core/colorUtils";

interface GridCanvasProps {
  grid: Grid;
  cellSize: number;
  /**
   * Called whenever the user paints on a specific cell.
   * Used for both simple clicks and drag strokes.
   */
  onPaintCell?: (row: number, col: number) => void;
}

/**
 * GridCanvas
 *
 * Responsible for:
 * - Drawing the grid onto a <canvas>.
 * - Translating mouse events into (row, col) coordinates.
 * - Handling “click and drag” painting.
 *
 * It does NOT know about colours, tools or rules – that all lives in the parent.
 */
export const GridCanvas: React.FC<GridCanvasProps> = ({
  grid,
  cellSize,
  onPaintCell,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Draw the grid whenever it changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const width = cols * cellSize;
    const height = rows * cellSize;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, width, height);

    // Cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];

        if (cell.color) {
          ctx.fillStyle = rgbToHex(cell.color);
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        } else {
          // Very light grid lines when empty.
          ctx.strokeStyle = "rgba(255,255,255,0.05)";
          ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [grid, cellSize]);

  const getCellFromEvent = (
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { row: -1, col: -1 };

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const row = Math.floor(y / cellSize);
    const col = Math.floor(x / cellSize);
    return { row, col };
  };

  const handleMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    event.preventDefault(); // stop browser trying to drag the canvas image
    if (!onPaintCell) return;

    const { row, col } = getCellFromEvent(event);
    if (row < 0 || col < 0) return;

    isDrawingRef.current = true;
    onPaintCell(row, col);
  };

  const handleMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    if (!isDrawingRef.current || !onPaintCell) return;

    event.preventDefault(); // avoid drag / scroll behaviour
    const { row, col } = getCellFromEvent(event);
    if (row < 0 || col < 0) return;

    onPaintCell(row, col);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const width = cols * cellSize;
  const height = rows * cellSize;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="grid-canvas"
      draggable={false}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
};
