import React, { useEffect, useRef } from "react";
import type { Grid } from "../core/cell";
import { rgbToHex } from "../core/colorUtils";

interface GridCanvasProps {
  grid: Grid;
  cellSize: number;
  /**
   * Called whenever the user paints on a specific cell.
   * Used for clicks, mouse drags, and touch/pointer strokes.
   */
  onPaintCell?: (row: number, col: number) => void;
}

/**
 * GridCanvas
 *
 * - Draws the grid onto a <canvas>.
 * - Converts pointer coordinates (mouse or touch) into (row, col).
 * - Supports click, drag with mouse, and drag with finger on mobile so mobile users can use the tool.
 *
 * The parent decides which colour/tool is used; this component only
 * cares about “someone is painting cell [row, col] now”.
 */
export const GridCanvas: React.FC<GridCanvasProps> = ({
  grid,
  cellSize,
  onPaintCell,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // -----------------------------------------------
  // Draw the grid whenever it changes
  // -----------------------------------------------
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

  // -----------------------------------------------
  // Coordinate helpers (use rendered size so scaling works)
  // -----------------------------------------------
  const getCellFromClientCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { row: -1, col: -1 };

    const rect = canvas.getBoundingClientRect();
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    if (!rows || !cols || rect.width === 0 || rect.height === 0) {
      return { row: -1, col: -1 };
    }

    // Use rect size so it works even if the CSS shrinks the canvas down for responsiveness
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const col = Math.floor((x / rect.width) * cols);
    const row = Math.floor((y / rect.height) * rows);

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return { row: -1, col: -1 };
    }

    return { row, col };
  };

  const paintFromCoords = (clientX: number, clientY: number) => {
    if (!onPaintCell) return;
    const { row, col } = getCellFromClientCoords(clientX, clientY);
    if (row < 0 || col < 0) return;
    onPaintCell(row, col);
  };

  // -----------------------------------------------
  // Pointer events: one API for mouse and touch
  // -----------------------------------------------
  const handlePointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    // Only react to primary button / primary touch
    if (event.button !== 0 && event.pointerType === "mouse") return;

    // Prevent page scrolling / dragging when drawing
    if (event.preventDefault) event.preventDefault();

    const canvas = canvasRef.current;
    if (canvas && canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }

    isDrawingRef.current = true;
    paintFromCoords(event.clientX, event.clientY);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;

    if (event.preventDefault) event.preventDefault();
    paintFromCoords(event.clientX, event.clientY);
  };

  const handlePointerUpOrCancel = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (event.preventDefault) event.preventDefault();
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas && canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if capture was never set
      }
    }
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
      // Pointer events (covers mouse + touch on modern browsers)
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      style={{
        touchAction: "none", // for mobile to stop the page scrolling while drawing
      }}
    />
  );
};
