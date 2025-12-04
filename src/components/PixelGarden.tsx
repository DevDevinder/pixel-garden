import React, { useEffect, useState, useCallback } from "react";
import { GRID_COLS, GRID_ROWS, type Grid } from "../core/cell";
import { hexToRgb } from "../core/colorUtils";
import { createEmptyGrid, cloneGrid } from "../core/gridUtils";
import { stepWithRule, type GrowthRuleName } from "../core/rules";
import { GridCanvas } from "./GridCanvas";
import { ControlsBar } from "./ControlsBar";

export type Tool = "brush" | "eraser";

const DEFAULT_SPEED_MS = 200;
const BASE_CELL_SIZE = 16;

const DEFAULT_PALETTE = [
  "#f97316", // warm orange
  "#22c55e", // green
  "#38bdf8", // blue
  "#e879f9", // pink
  "#facc15", // yellow
  "#a855f7", // purple
  "#000000", // black
  "#ffffff", // white 
];

/**
 * PixelGarden
 *
 * Owns the simulation + painting state:
 * - current grid
 * - chosen growth rule
 * - timer / play state
 * - brush colour
 * - active tool (brush / eraser)
 */
export const PixelGarden: React.FC = () => {
  const [grid, setGrid] = useState<Grid>(() =>
    createEmptyGrid(GRID_ROWS, GRID_COLS)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [growthRule, setGrowthRule] = useState<GrowthRuleName>("moss");
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS);
  const [selectedHexColor, setSelectedHexColor] = useState(DEFAULT_PALETTE[0]);
  const [tool, setTool] = useState<Tool>("brush");

  // Responsive cell size so the grid fits smaller screens
  const [cellSize, setCellSize] = useState<number>(BASE_CELL_SIZE);

  useEffect(() => {
    const updateSize = () => {
      // rough available width
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 320;

      // leave some padding
      const maxCanvasWidth = viewportWidth - 32;
      const idealCell = Math.floor(maxCanvasWidth / GRID_COLS);

      // clamp a bit so it never gets *too* tiny or massive
      const responsive = Math.max(8, Math.min(BASE_CELL_SIZE, idealCell));

      setCellSize(responsive);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  /**
   * One simulated step using the current rule.
   */
  const stepSimulation = useCallback(() => {
    setGrid((previousGrid) => stepWithRule(growthRule, previousGrid));
  }, [growthRule]);

  /**
   * Clear everything back to an empty grid.
   */
  const clearGrid = useCallback(() => {
    setGrid(createEmptyGrid(GRID_ROWS, GRID_COLS));
  }, []);

  /**
   * Sprinkle some random “seed” pixels onto the canvas using the current brush colour.
   */
  const addRandomSeeds = useCallback(() => {
    setGrid((previousGrid) => {
      const next = cloneGrid(previousGrid);
      const seedsToAdd = Math.floor(GRID_ROWS * GRID_COLS * 0.05); // 5% of cells

      const brushColor = hexToRgb(selectedHexColor);

      for (let i = 0; i < seedsToAdd; i++) {
        const row = Math.floor(Math.random() * GRID_ROWS);
        const col = Math.floor(Math.random() * GRID_COLS);
        const cell = next[row][col];
        cell.color = brushColor;
        cell.age = 0;
      }

      return next;
    });
  }, [selectedHexColor]);

  /**
   * Paint handler used by the canvas for both click and drag.
   */
  const handlePaintCell = useCallback(
    (row: number, col: number) => {
      setGrid((previousGrid) => {
        const next = cloneGrid(previousGrid);
        const cell = next[row]?.[col];
        if (!cell) return previousGrid;

        if (tool === "eraser") {
          cell.color = null;
          cell.age = 0;
        } else {
          cell.color = hexToRgb(selectedHexColor);
          cell.age = 0;
        }

        return next;
      });
    },
    [tool, selectedHexColor]
  );

  /**
   * Timer for continuous simulation when “Play” is active.
   */
  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      stepSimulation();
    }, speedMs);

    return () => {
      window.clearInterval(id);
    };
  }, [isRunning, speedMs, stepSimulation]);

  return (
    <div className="garden">
      <div className="garden-layout">
        <ControlsBar
          isRunning={isRunning}
          onToggleRunning={() => setIsRunning((running) => !running)}
          onStepOnce={stepSimulation}
          onClear={clearGrid}
          onRandomSeeds={addRandomSeeds}
          currentRule={growthRule}
          onChangeRule={setGrowthRule}
          speedMs={speedMs}
          onChangeSpeedMs={setSpeedMs}
          paletteColors={DEFAULT_PALETTE}
          selectedColor={selectedHexColor}
          onSelectColor={setSelectedHexColor}
          tool={tool}
          onToolChange={setTool}
        />

        <div className="garden-canvas-wrapper">
          <GridCanvas
            grid={grid}
            cellSize={cellSize}
            onPaintCell={handlePaintCell}
          />
        </div>
      </div>

      <p className="garden-hint">
        Hint: Some modes need you to place an initial seed and others work
        better with no seeds. Try mixing different rules and colours to see what
        you can get!
        <br />
        Tip: using <strong>"avatar"</strong> after{" "}
        <strong>"avatar2"</strong> or <strong>"magicPortrait2"</strong> can help
        smooth out details and bring things to life.
      </p>
    </div>
  );
};
