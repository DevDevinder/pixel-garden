/**
 * rules.ts
 *
 * Collection of pixel “growth rules” for the Pixel Garden.
 *
 * Each rule:
 * - takes the current Grid
 * - returns a new Grid after one step of its behaviour
 *
 * The UI calls stepWithRule(...) in a loop to animate.
 */

import type { Grid, RgbColor } from "./cell";
import { averageColor, darkenColor } from "./colorUtils";
import { cloneGrid, getNeighbourCells } from "./gridUtils";

// ============================================================================
// #region Shared helpers
// ============================================================================

/**
 * Returns true if at least one cell in the grid is coloured.
 * Handy for rules that only want to "seed" when the canvas is empty.
 */
function gridHasAnyColor(grid: Grid): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell.color) return true;
    }
  }
  return false;
}

/**
 * Clamp a channel value to [0, 255].
 */
function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value | 0));
}

/**
 * Legacy helper name kept for older code paths.
 * Internally just uses clampChannel so logic stays in one place.
 */


/**
 * Very simple brightness measure (average of RGB channels).
 * Used in a few rules when deciding if a colour is “bright enough”
 * to send out streaks or highlights.
 */
function brightness(color: RgbColor): number {
  return (color.r + color.g + color.b) / 3;
}

/**
 * Pick a random element from an array.
 */
function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Random integer between min and max (inclusive).
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Paint a single cell, with bounds checks.
 * Passing `null` as colour clears the cell.
 */
function paintCell(
  grid: Grid,
  r: number,
  c: number,
  color: RgbColor | null
): void {
  const rowCount = grid.length;
  const colCount = grid[0]?.length ?? 0;
  if (r < 0 || r >= rowCount || c < 0 || c >= colCount) return;

  const cell = grid[r][c];
  cell.color = color;
  cell.age = color ? 0 : 0;
}

/**
 * Add a small random “shake” to a colour.
 * maxJitter controls how strong the shake is.
 */
function jitterColor(base: RgbColor, maxJitter: number): RgbColor {
  const j = () => randomInt(-maxJitter, maxJitter);
  return {
    r: clampChannel(base.r + j()),
    g: clampChannel(base.g + j()),
    b: clampChannel(base.b + j()),
  };
}

// ============================================================================
// #endregion Shared helpers
// ============================================================================

// ============================================================================
// #region World / Environment rules
// ============================================================================

/**
 * stepMoss
 *
 * Soft organic growth:
 * - Empty cells with 1–3 coloured neighbours adopt a blended colour.
 * - Coloured cells slowly darken over time.
 * - Cells with 6+ coloured neighbours are cleared (overcrowding).
 */
export function stepMoss(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const colouredCount = colouredNeighbours.length;

      const nextCell = next[r][c];

      if (!cell.color) {
        // “Birth”: start new moss where there is a small cluster nearby.
        if (colouredCount >= 1 && colouredCount <= 3) {
          const blended = averageColor(colouredNeighbours.map((n) => n.color!));
          if (blended) {
            nextCell.color = blended;
            nextCell.age = 0;
          }
        }
      } else {
        // Age and darken existing moss.
        nextCell.age = cell.age + 1;
        nextCell.color = darkenColor(cell.color, 0.02);

        // If surrounded, clear it out to stop blobs getting too dense.
        if (colouredCount >= 6) {
          nextCell.color = null;
          nextCell.age = 0;
        }
      }
    }
  }

  return next;
}

/**
 * stepCrystal
 *
 * Sharp, straight branches:
 * - Only looks at direct up/down/left/right neighbours.
 * - Empty cells that see exactly one coloured neighbour copy that colour.
 *   → produces long crystal-like spikes.
 */
export function stepCrystal(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  const dirs = [
    [-1, 0], // up
    [1, 0], // down
    [0, -1], // left
    [0, 1], // right
  ];

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      if (!cell.color) {
        const colours: RgbColor[] = [];

        // Only consider the 4 cardinal neighbours.
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < rowCount &&
            nc >= 0 &&
            nc < colCount &&
            previous[nr][nc].color
          ) {
            colours.push(previous[nr][nc].color!);
          }
        }

        // A single coloured neighbour “extends” its line.
        if (colours.length === 1) {
          nextCell.color = colours[0];
        }
      }
    }
  }

  return next;
}

/**
 * stepCoral
 *
 * Branching organic growth:
 * - Empty cells with 1–4 coloured neighbours join the structure.
 * - Cells with 6+ neighbours are removed, so coral doesn’t become a solid block.
 */
export function stepCoral(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const coloured = neighbours.filter((n) => n.color !== null);
      const nextCell = next[r][c];

      if (!cell.color) {
        if (coloured.length >= 1 && coloured.length <= 4) {
          nextCell.color = averageColor(coloured.map((n) => n.color!))!;
        }
      } else {
        // Overcrowded regions are trimmed away.
        if (coloured.length >= 6) {
          nextCell.color = null;
        }
      }
    }
  }

  return next;
}

/**
 * stepLava
 *
 * Fast, noisy expansion:
 * - Empty cells near any coloured neighbour can light up.
 * - Existing pixels tend towards bright reds/oranges over time.
 */
export function stepLava(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const coloured = neighbours.filter((n) => n.color !== null);
      const nextCell = next[r][c];

      if (!cell.color) {
        if (coloured.length >= 1 && Math.random() < 0.4) {
          // Pick one neighbour at random and copy its colour.
          nextCell.color =
            coloured[Math.floor(Math.random() * coloured.length)].color!;
        }
      } else {
        // Nudge colour toward hotter lava (more red, less green/blue).
        nextCell.color = {
          r: Math.min(cell.color.r + 5, 255),
          g: Math.max(cell.color.g - 3, 0),
          b: Math.max(cell.color.b - 8, 0),
        };
      }
    }
  }

  return next;
}

/**
 * stepTerrain
 *
 * Map-style patterns:
 * - Empty cells near 2–5 coloured neighbours take on a blended colour.
 * - Coloured pixels slowly adjust in green/blue to mimic elevation shading.
 */
export function stepTerrain(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const coloured = neighbours.filter((n) => n.color !== null);
      const nextCell = next[r][c];

      if (!cell.color) {
        if (coloured.length >= 2 && coloured.length <= 5) {
          nextCell.color = averageColor(coloured.map((n) => n.color!))!;
        }
      } else {
        // Use age to slowly adjust channels for a “height map” feel.
        const a = cell.age;
        nextCell.age = a + 1;

        nextCell.color = {
          r: cell.color.r,
          g: Math.max(cell.color.g - a * 0.2, 0),
          b: Math.max(cell.color.b - a * 0.4, 0),
        };
      }
    }
  }

  return next;
}

/**
 * stepSlime
 *
 * Blob-like shapes:
 * - Empty cells with 3+ neighbours can join a blob.
 * - Existing pixels darken slightly so blobs feel thicker.
 */
export function stepSlime(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const coloured = neighbours.filter((n) => n.color !== null);
      const nextCell = next[r][c];

      if (!cell.color) {
        if (coloured.length >= 3 && Math.random() < 0.2) {
          nextCell.color = averageColor(coloured.map((n) => n.color!))!;
        }
      } else {
        nextCell.color = darkenColor(cell.color, 0.01);
      }
    }
  }

  return next;
}

/**
 * stepSnowfall
 *
 * Frozen, sparse branching:
 * - Empty cells with exactly one neighbour may grow.
 * - Existing pixels darken extremely slowly for a frosty look.
 */
export function stepSnowfall(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const coloured = neighbours.filter((n) => n.color !== null);
      const nextCell = next[r][c];

      if (!cell.color) {
        if (coloured.length === 1 && Math.random() < 0.15) {
          nextCell.color = coloured[0].color!;
        }
      } else {
        nextCell.color = darkenColor(cell.color, 0.005);
      }
    }
  }

  return next;
}

/**
 * stepChaos
 *
 * Fully random scribble:
 * - Random new pixels appear with random colours.
 * - Existing colours occasionally jump around in RGB space.
 * - Small chance any pixel disappears to avoid freezing.
 */
export function stepChaos(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      if (!cell.color) {
        // New random pixels appear from empty space.
        if (Math.random() < 0.02) {
          nextCell.color = {
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256),
          };
          nextCell.age = 0;
        }
      } else {
        nextCell.age = cell.age + 1;

        // Small colour jump to keep patterns moving.
        if (Math.random() < 0.08) {
          const jitter = () => Math.floor(Math.random() * 51) - 25; // -25..25
          nextCell.color = {
            r: clampChannel(cell.color.r + jitter()),
            g: clampChannel(cell.color.g + jitter()),
            b: clampChannel(cell.color.b + jitter()),
          };
        }

        // Occasional full erase.
        if (Math.random() < 0.004) {
          nextCell.color = null;
          nextCell.age = 0;
        }
      }
    }
  }

  return next;
}

// ============================================================================
// #endregion World / Environment rules
// ============================================================================

// ============================================================================
// #region MagicDraw family
// ============================================================================

/**
 * stepMagicDraw
 *
 * Symmetric “sketch” of character-like shapes:
 * - Seeds appear more often near the vertical centre line.
 * - Pixels are mirrored horizontally, so shapes are roughly symmetrical.
 * - Small clusters tend to grow limbs and branches.
 * - Old lonely pixels are removed so it doesn’t turn into static noise.
 */
export function stepMagicDraw(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;
  const centerCol = Math.floor(colCount / 2);

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const colouredCount = colouredNeighbours.length;

      // Distance from vertical centre, normalised to [0, 1].
      const distFromCenter = Math.abs(c - centerCol);
      const normDist = centerCol > 0 ? distFromCenter / centerCol : 0;

      // Mirror column for symmetry.
      const mirrorCol = colCount - 1 - c;
      const mirrorCell =
        mirrorCol >= 0 && mirrorCol < colCount ? next[r][mirrorCol] : null;

      if (!cell.color) {
        // Basic seed chance is small, but boosted near the middle rows and columns.
        const baseSeedChance = 0.004;
        const centerBoost = 1 - normDist * 0.9;
        const rowFactor =
          r > rowCount * 0.2 && r < rowCount * 0.8 ? 1.4 : 0.7;

        const seedChance = baseSeedChance * centerBoost * rowFactor;

        if (Math.random() < seedChance && !cell.color) {
          const newColor: RgbColor = {
            r: 100 + Math.floor(Math.random() * 156),
            g: 80 + Math.floor(Math.random() * 176),
            b: 80 + Math.floor(Math.random() * 176),
          };
          nextCell.color = newColor;
          nextCell.age = 0;

          // Mirror the seed so both sides grow together.
          if (mirrorCell && mirrorCol !== c) {
            mirrorCell.color = { ...newColor };
            mirrorCell.age = 0;
          }
          continue;
        }

        // Growth from small local groups, often mirrored.
        if (colouredCount >= 1 && colouredCount <= 3 && Math.random() < 0.45) {
          const blended = averageColor(
            colouredNeighbours.map((n) => n.color!)
          );
          if (blended) {
            nextCell.color = blended;
            nextCell.age = 0;

            if (mirrorCell && mirrorCol !== c) {
              mirrorCell.color = { ...blended };
              mirrorCell.age = 0;
            }
          }
        }
      } else {
        // Existing pixels slowly darken and wobble a bit in colour.
        nextCell.age = cell.age + 1;

        if (Math.random() < 0.07 && cell.color) {
          const jitter = () => Math.floor(Math.random() * 31) - 15;
          nextCell.color = {
            r: clampChannel(cell.color.r + jitter()),
            g: clampChannel(cell.color.g + jitter()),
            b: clampChannel(cell.color.b + jitter()),
          };
        }

        if (nextCell.color) {
          nextCell.color = darkenColor(nextCell.color, 0.01);
        }

        // Old isolated pixels are occasionally cleared out.
        if (colouredCount === 0 && cell.age > 10 && Math.random() < 0.1) {
          nextCell.color = null;
          nextCell.age = 0;
        }
      }
    }
  }

  return next;
}

/**
 * stepMagicDraw2
 *
 * Looser, streaky version of Magic Draw:
 * - Still slightly biased towards the centre, but not strictly symmetric.
 * - Mid-aged pixels can send out short streaks that overwrite old colours.
 * - Some streaks are mirrored, giving loose symmetry instead of perfect.
 */
export function stepMagicDraw2(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;
  const centerRow = Math.floor(rowCount / 2);
  const centerCol = Math.floor(colCount / 2);

  const directions: Array<[number, number]> = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];
      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const colouredCount = colouredNeighbours.length;

      const distRow = Math.abs(r - centerRow);
      const distCol = Math.abs(c - centerCol);
      const normRadial =
        Math.sqrt(distRow * distRow + distCol * distCol) /
        Math.sqrt(centerRow * centerRow + centerCol * centerCol || 1);

      const mirrorCol = colCount - 1 - c;
      const mirrorCell =
        mirrorCol >= 0 && mirrorCol < colCount ? next[r][mirrorCol] : null;

      if (!cell.color) {
        // Seeds: slightly more likely near the centre.
        const baseSeedChance = 0.0025;
        const centreBoost = 1.3 - normRadial;
        const seedChance = baseSeedChance * Math.max(0.3, centreBoost);

        if (Math.random() < seedChance) {
          const newColor: RgbColor = {
            r: 80 + Math.floor(Math.random() * 176),
            g: 80 + Math.floor(Math.random() * 176),
            b: 80 + Math.floor(Math.random() * 176),
          };
          nextCell.color = newColor;
          nextCell.age = 0;

          // Some seeds are mirrored.
          if (mirrorCell && mirrorCol !== c && Math.random() < 0.4) {
            mirrorCell.color = { ...newColor };
            mirrorCell.age = 0;
          }

          continue;
        }

        // Normal growth from local neighbours.
        if (
          colouredCount >= 1 &&
          colouredCount <= 3 &&
          Math.random() < 0.45
        ) {
          const blended = averageColor(
            colouredNeighbours.map((n) => n.color!)
          );
          if (blended) {
            nextCell.color = blended;
            nextCell.age = 0;

            if (mirrorCell && mirrorCol !== c && Math.random() < 0.35) {
              mirrorCell.color = { ...blended };
              mirrorCell.age = 0;
            }
          }
        }
      } else {
        // Existing pixel: darken and occasionally jitter.
        nextCell.age = cell.age + 1;

        if (cell.color) {
          nextCell.color = darkenColor(cell.color, 0.01);
        }

        if (nextCell.color && Math.random() < 0.06) {
          nextCell.color = jitterColor(nextCell.color, 10);
        }

        if (nextCell.color) {
          const b = brightness(nextCell.color);
          const age = nextCell.age;

          // Mid-aged pixels throw out short streaks that overwrite older areas.
          if (
            age >= 5 &&
            age <= 40 &&
            b >= 60 &&
            b <= 200 &&
            Math.random() < 0.14
          ) {
            const [dr, dc] =
              directions[Math.floor(Math.random() * directions.length)];
            const length = 1 + Math.floor(Math.random() * 4);
            let currR = r;
            let currC = c;

            for (let i = 0; i < length; i++) {
              currR += dr;
              currC += dc;
              if (
                currR < 0 ||
                currR >= rowCount ||
                currC < 0 ||
                currC >= colCount
              ) {
                break;
              }

              const target = next[currR][currC];

              const src = nextCell.color;
              const streakColor: RgbColor = {
                r: clampChannel(src.r + 25),
                g: clampChannel(src.g + 25),
                b: clampChannel(src.b + 30),
              };

              target.color = streakColor;
              target.age = 0;

              // Occasionally mirror the streak as well.
              if (Math.random() < 0.25) {
                const mc = colCount - 1 - currC;
                if (mc >= 0 && mc < colCount) {
                  const mirrorTarget = next[currR][mc];
                  mirrorTarget.color = { ...streakColor };
                  mirrorTarget.age = 0;
                }
              }
            }
          }
        }

        // Clean up very old isolated pixels so the sketch keeps moving.
        if (
          nextCell.color &&
          nextCell.age > 40 &&
          colouredCount <= 1 &&
          Math.random() < 0.3
        ) {
          nextCell.color = null;
          nextCell.age = 0;
        }
      }
    }
  }

  return next;
}

/**
 * stepMagicDrawAura
 *
 * Colourful aura effect around the centre:
 * - Only draws inside a circular ring around the middle of the grid.
 * - Inside that ring it behaves like a softer MagicDraw.
 * - Outer and inner regions are left untouched, so avatars/portraits
 *   drawn in the middle are not destroyed.
 */
export function stepMagicDrawAura(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;

  const centerRow = Math.floor(rowCount / 2);
  const centerCol = Math.floor(colCount / 2);

  const minDim = Math.min(rowCount, colCount);
  const innerRadius = minDim * 0.22;
  const outerRadius = minDim * 0.48;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      const dy = r - centerRow;
      const dx = c - centerCol;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Ignore anything outside the aura ring.
      if (dist < innerRadius || dist > outerRadius) {
        continue;
      }

      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const colouredCount = colouredNeighbours.length;

      const mirrorCol = colCount - 1 - c;
      const mirrorCell =
        mirrorCol >= 0 && mirrorCol < colCount ? next[r][mirrorCol] : null;

      if (!cell.color) {
        // Slightly centre-biased seeding inside the ring.
        const distFromCenterCol = Math.abs(c - centerCol);
        const normDistCol =
          centerCol > 0 ? distFromCenterCol / centerCol : 0;

        const baseSeedChance = 0.0035;
        const centerBoost = 1 - normDistCol * 0.9;
        const rowFactor =
          r > rowCount * 0.2 && r < rowCount * 0.8 ? 1.4 : 0.7;

        const seedChance = baseSeedChance * centerBoost * rowFactor;

        if (Math.random() < seedChance) {
          const newColor: RgbColor = {
            r: 100 + Math.floor(Math.random() * 156),
            g: 80 + Math.floor(Math.random() * 176),
            b: 80 + Math.floor(Math.random() * 176),
          };
          nextCell.color = newColor;
          nextCell.age = 0;

          if (mirrorCell && mirrorCol !== c) {
            mirrorCell.color = { ...newColor };
            mirrorCell.age = 0;
          }
          continue;
        }

        // Normal MagicDraw-style growth.
        if (colouredCount >= 1 && colouredCount <= 3 && Math.random() < 0.45) {
          const blended = averageColor(
            colouredNeighbours.map((n) => n.color!)
          );
          if (blended) {
            nextCell.color = blended;
            nextCell.age = 0;

            if (mirrorCell && mirrorCol !== c) {
              mirrorCell.color = { ...blended };
              mirrorCell.age = 0;
            }
          }
        }
      } else {
        // Inside the ring, existing pixels gently wobble and darken,
        // but are never fully deleted here.
        nextCell.age = cell.age + 1;

        if (Math.random() < 0.06 && cell.color) {
          nextCell.color = jitterColor(cell.color, 10);
        }

        if (nextCell.color) {
          nextCell.color = darkenColor(nextCell.color, 0.007);
        }
      }
    }
  }

  return next;
}

// ============================================================================
// #endregion MagicDraw family
// ============================================================================

// ============================================================================
// #region Avatar / portrait rules
// ============================================================================

/**
 * stepAvatar
 *
 * Two-stage rule:
 * 1) When the grid is almost empty, it paints a clear humanoid “skeleton”
 *    (head, torso, arms, legs) in the centre.
 * 2) After that, it behaves more like a generic growth rule to gently
 *    grow and soften the sprite.
 */
export function stepAvatar(previous: Grid): Grid {
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;
  const next = cloneGrid(previous);
  const centerX = Math.floor(colCount / 2);

  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // Measure how full the grid is to decide when to paint the initial avatar.
  let colouredTotal = 0;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (previous[r][c].color) colouredTotal++;
    }
  }
  const totalCells = rowCount * colCount || 1;
  const fillRatio = colouredTotal / totalCells;

  if (fillRatio < 0.005) {
    const skin: RgbColor = {
      r: randInt(190, 245),
      g: randInt(150, 220),
      b: randInt(130, 210),
    };
    const shirt: RgbColor = {
      r: randInt(50, 200),
      g: randInt(50, 200),
      b: randInt(80, 220),
    };
    const trousers: RgbColor = {
      r: randInt(10, 80),
      g: randInt(10, 80),
      b: randInt(110, 210),
    };
    const outline: RgbColor = {
      r: clampChannel(skin.r - 80),
      g: clampChannel(skin.g - 80),
      b: clampChannel(skin.b - 80),
    };
    const eye: RgbColor = { r: 10, g: 10, b: 10 };

    const headTop = Math.floor(rowCount * 0.1);
    const headBottom = Math.floor(rowCount * 0.3);
    const headHeight = headBottom - headTop;
    const headRadiusX = Math.max(2, Math.floor(colCount * 0.15));
    const headRadiusY = Math.max(2, Math.floor(headHeight / 2));

    const torsoTop = headBottom;
    const torsoBottom = Math.floor(rowCount * 0.6);
    const torsoHalfWidth = Math.max(2, Math.floor(colCount * 0.18));

    const legsTop = torsoBottom;
    const legsBottom = Math.floor(rowCount * 0.9);
    const legHalfWidth = Math.max(1, Math.floor(torsoHalfWidth * 0.5));

    const headCenterY = Math.floor((headTop + headBottom) / 2);

    // HEAD (ellipse).
    for (let r = headTop; r <= headBottom; r++) {
      for (let c = centerX - headRadiusX; c <= centerX + headRadiusX; c++) {
        const dx = (c - centerX) / (headRadiusX || 1);
        const dy = (r - headCenterY) / (headRadiusY || 1);
        if (dx * dx + dy * dy <= 1.0) {
          paintCell(next, r, c, skin);
        }
      }
    }

    // Head outline as a thin ring around the ellipse.
    for (let r = headTop; r <= headBottom; r++) {
      for (let c = centerX - headRadiusX; c <= centerX + headRadiusX; c++) {
        const dx = (c - centerX) / (headRadiusX || 1);
        const dy = (r - headCenterY) / (headRadiusY || 1);
        const d = dx * dx + dy * dy;
        if (d > 0.9 && d <= 1.05) {
          paintCell(next, r, c, outline);
        }
      }
    }

    // Eyes.
    const eyeRow = headTop + Math.floor(headHeight * 0.4);
    const eyeOffsetX = Math.max(2, Math.floor(headRadiusX * 0.5));
    paintCell(next, eyeRow, centerX - eyeOffsetX, eye);
    paintCell(next, eyeRow, centerX + eyeOffsetX, eye);

    // Mouth.
    const mouthRow = headTop + Math.floor(headHeight * 0.75);
    for (let c = centerX - 1; c <= centerX + 1; c++) {
      paintCell(next, mouthRow, c, outline);
    }

    // Torso block.
    for (let r = torsoTop; r <= torsoBottom; r++) {
      for (let c = centerX - torsoHalfWidth; c <= centerX + torsoHalfWidth; c++) {
        paintCell(next, r, c, shirt);
      }
    }

    // Torso outline on the sides.
    for (let r = torsoTop; r <= torsoBottom; r++) {
      paintCell(next, r, centerX - torsoHalfWidth, outline);
      paintCell(next, r, centerX + torsoHalfWidth, outline);
    }

    // Legs as two columns under the torso.
    for (let r = legsTop; r <= legsBottom; r++) {
      for (let c = centerX - legHalfWidth - 1; c <= centerX - 1; c++) {
        paintCell(next, r, c, trousers);
      }
      for (let c = centerX + 1; c <= centerX + legHalfWidth + 1; c++) {
        paintCell(next, r, c, trousers);
      }
    }

    // Leg outlines on the outer edges.
    for (let r = legsTop; r <= legsBottom; r++) {
      paintCell(next, r, centerX - legHalfWidth - 1, outline);
      paintCell(next, r, centerX + legHalfWidth + 1, outline);
    }

    // Simple straight arms as a horizontal line.
    const armRow = torsoTop + Math.floor((torsoBottom - torsoTop) * 0.3);
    const armReach = torsoHalfWidth + Math.max(1, Math.floor(colCount * 0.08));
    for (let c = centerX - armReach; c <= centerX + armReach; c++) {
      if (Math.abs(c - centerX) > torsoHalfWidth) {
        paintCell(next, armRow, c, outline);
      }
    }

    return next;
  }

  // After seeding: treat the avatar more like a living pattern.
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const localCount = colouredNeighbours.length;

      if (!cell.color) {
        if (localCount > 0 && Math.random() < 0.25) {
          const blended = averageColor(
            colouredNeighbours.map((n) => n.color!)
          );
          if (blended) {
            const nc = jitterColor(blended, 8);
            nextCell.color = nc;
            nextCell.age = 0;
          }
        }
      } else {
        nextCell.age = cell.age + 1;

        if (cell.color) {
          let col = darkenColor(cell.color, 0.01);
          if (Math.random() < 0.05) {
            col = jitterColor(col, 5);
          }
          nextCell.color = col;
        }

        // Remove very old isolated pixels to keep the shape fairly clean.
        if (nextCell.age > 80 && localCount <= 1 && Math.random() < 0.3) {
          nextCell.color = null;
          nextCell.age = 0;
        }
      }
    }
  }

  return next;
}

/**
 * stepAvatar2
 *
 * Fuzzier, more “painted” avatar:
 * - On an empty grid, builds a character out of noisy strokes instead of rectangles.
 * - Uses loose vertical symmetry and a slight “gravity” bias so shapes stand upright.
 * - After seeding, continues growing and trimming around the figure.
 */
export function stepAvatar2(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;
  const centerRow = Math.floor(rowCount / 2);
  const centerCol = Math.floor(colCount / 2);

  // ---------- 1) Seed stage: fuzzy avatar skeleton ----------
  if (!gridHasAnyColor(previous)) {
    const skinOptions: RgbColor[] = [
      { r: 255, g: 224, b: 189 },
      { r: 234, g: 192, b: 134 },
      { r: 198, g: 134, b: 66 },
      { r: 141, g: 85, b: 36 },
    ];
    const hairOptions: RgbColor[] = [
      { r: 40, g: 30, b: 20 },
      { r: 80, g: 60, b: 20 },
      { r: 30, g: 30, b: 40 },
      { r: 140, g: 60, b: 40 },
      { r: 200, g: 140, b: 80 },
    ];
    const clothesOptions: RgbColor[] = [
      { r: 52, g: 152, b: 219 },
      { r: 46, g: 204, b: 113 },
      { r: 231, g: 76, b: 60 },
      { r: 142, g: 68, b: 173 },
      { r: 243, g: 156, b: 18 },
      { r: 26, g: 188, b: 156 },
    ];
    const legOptions: RgbColor[] = [
      { r: 40, g: 40, b: 40 },
      { r: 70, g: 70, b: 70 },
      { r: 30, g: 60, b: 90 },
    ];

    const skin = randomChoice(skinOptions);
    const hair = randomChoice(hairOptions);
    const clothes = randomChoice(clothesOptions);
    const legColor = randomChoice(legOptions);

    const eyeWhite: RgbColor = { r: 245, g: 245, b: 245 };
    const pupil: RgbColor = { r: 20, g: 20, b: 20 };

    const minHeight = Math.floor(rowCount * 0.35);
    const maxHeight = Math.floor(rowCount * 0.6);
    const avatarHeight =
      minHeight + Math.floor(Math.random() * Math.max(2, maxHeight - minHeight));

    const topRow = centerRow - Math.floor(avatarHeight * 0.45);
    const bottomRow = topRow + avatarHeight;

    const headHeight = Math.max(3, Math.round(avatarHeight * 0.18));
    const torsoHeight = Math.max(3, Math.round(avatarHeight * 0.28));

    const headTop = topRow;
    const headBottom = headTop + headHeight;
    const torsoTop = headBottom;
    const torsoBottom = torsoTop + torsoHeight;
    const legTop = torsoBottom;
    const legBottom = bottomRow;

    /**
     * Draw a noisy horizontal stroke centred around the character.
     * Used for head / torso rows so the sprite feels hand-painted.
     */
    const fuzzyStrokeRow = (
      r: number,
      baseHalfWidth: number,
      color: RgbColor,
      density: number
    ) => {
      if (r < 0 || r >= rowCount) return;
      const jitterWidth = baseHalfWidth + (Math.random() < 0.5 ? 0 : 1);
      for (let dc = -jitterWidth - 1; dc <= jitterWidth + 1; dc++) {
        const offset =
          Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const c = centerCol + dc + offset;
        if (c < 0 || c >= colCount) continue;
        if (Math.random() < density) {
          next[r][c].color = { ...color };
          next[r][c].age = 0;
        }
      }
    };

    // Head blob.
    const headHalfWidth = 1 + Math.floor(Math.random() * 2);
    for (let r = headTop; r <= headBottom; r++) {
      const localFactor =
        1 - Math.abs(r - (headTop + headBottom) / 2) / (headHeight + 0.5);
      const density = 0.4 + localFactor * 0.5;
      fuzzyStrokeRow(r, headHalfWidth, skin, density);
    }

    // Hair above the head plus possible side puff.
    for (let r = headTop - 2; r < headTop; r++) {
      fuzzyStrokeRow(r, headHalfWidth + 1, hair, 0.5 + Math.random() * 0.3);
    }
    if (Math.random() < 0.7) {
      fuzzyStrokeRow(
        headTop + Math.floor(headHeight * 0.4),
        headHalfWidth + 2,
        hair,
        0.25
      );
    }

    // Simple eyes.
    const eyeRow = headTop + Math.max(1, Math.floor(headHeight * 0.4));
    const eyeOffset = headHalfWidth + 1;
    const placeEye = (colOffset: number) => {
      const c = centerCol + colOffset;
      if (eyeRow < 0 || eyeRow >= rowCount || c < 0 || c >= colCount) return;
      next[eyeRow][c].color = { ...eyeWhite };
      next[eyeRow][c].age = 0;
      const pupilCol =
        c + (Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1);
      if (pupilCol >= 0 && pupilCol < colCount) {
        next[eyeRow][pupilCol].color = { ...pupil };
        next[eyeRow][pupilCol].age = 0;
      }
    };
    placeEye(-eyeOffset);
    placeEye(eyeOffset);

    // Torso as a wider fuzzy blob.
    const torsoHalfWidth = headHalfWidth + 1 + Math.floor(Math.random() * 2);
    for (let r = torsoTop; r <= torsoBottom; r++) {
      const localFactor =
        1 - Math.abs(r - (torsoTop + torsoBottom) / 2) / (torsoHeight + 0.5);
      const density = 0.45 + localFactor * 0.4;
      fuzzyStrokeRow(r, torsoHalfWidth, clothes, density);
    }

    // Simple arm hints.
    if (Math.random() < 0.8) {
      const armRow =
        torsoTop + Math.floor(torsoHeight * (0.3 + Math.random() * 0.3));
      const armLength = 2 + Math.floor(Math.random() * 3);
      for (const sign of [-1, 1] as const) {
        for (let i = 0; i < armLength; i++) {
          const rArm =
            armRow +
            (Math.random() < 0.5
              ? 0
              : Math.random() < 0.5
              ? -1
              : 1);
          const cArm = centerCol + sign * (torsoHalfWidth + 1 + i);
          if (
            rArm < 0 ||
            rArm >= rowCount ||
            cArm < 0 ||
            cArm >= colCount ||
            Math.random() > 0.7
          )
            continue;
          next[rArm][cArm].color = { ...clothes };
          next[rArm][cArm].age = 0;
        }
      }
    }

    // Legs as two vertical sets of fuzzy strokes.
    const legSplit = Math.random() < 0.6 ? 1 : 0;
    for (let r = legTop; r <= legBottom; r++) {
      const legFactor =
        (r - legTop) / Math.max(1, legBottom - legTop); // 0 → top, 1 → bottom
      const density = 0.4 + legFactor * 0.3;
      const offsets = [-legSplit - 1, legSplit + 1];
      for (const off of offsets) {
        const offset =
          Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const c = centerCol + off + offset;
        if (r < 0 || r >= rowCount || c < 0 || c >= colCount) continue;
        if (Math.random() < density) {
          next[r][c].color = { ...legColor };
          next[r][c].age = 0;
        }
      }
    }

    return next;
  }

  // ---------- 2) Growth stage ----------
  const minDim = Math.min(rowCount, colCount);
  const innerRadius = minDim * 0.15;
  const outerRadius = minDim * 0.55;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      const dy = r - centerRow;
      const dx = c - centerCol;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const colouredCount = colouredNeighbours.length;

      // Existing pixels always get a bit of shading and sometimes colour wobble.
      if (cell.color) {
        nextCell.age = cell.age + 1;
        nextCell.color = darkenColor(cell.color, 0.01);

        if (Math.random() < 0.015 && nextCell.color) {
          nextCell.color = jitterColor(nextCell.color, 4);
        }
      }

      // Outside the main ring we do very little.
      if (dist < innerRadius || dist > outerRadius) {
        continue;
      }

      const mirrorCol = colCount - 1 - c;
      const mirrorCell =
        mirrorCol >= 0 && mirrorCol < colCount ? next[r]?.[mirrorCol] : null;

      if (!cell.color) {
        const distFromCenterCol = Math.abs(c - centerCol);
        const normDistCol =
          centerCol > 0 ? distFromCenterCol / centerCol : 0;

        const verticalBias = r >= centerRow ? 1.3 : 0.8; // slightly favour lower half
        const baseSeedChance = 0.0025;
        const columnCenterBoost = 1 - normDistCol * 0.9;
        let seedChance = baseSeedChance * columnCenterBoost * verticalBias;

        if (colouredCount > 0) seedChance *= 1.5;

        if (Math.random() < seedChance) {
          let newColor: RgbColor;
          if (colouredNeighbours.length > 0 && Math.random() < 0.7) {
            const blended = averageColor(
              colouredNeighbours.map((n) => n.color!)
            );
            newColor =
              blended ??
              ({
                r: 100 + Math.floor(Math.random() * 156),
                g: 80 + Math.floor(Math.random() * 176),
                b: 80 + Math.floor(Math.random() * 176),
              } as RgbColor);
          } else {
            newColor = {
              r: 100 + Math.floor(Math.random() * 156),
              g: 80 + Math.floor(Math.random() * 176),
              b: 80 + Math.floor(Math.random() * 176),
            };
          }

          nextCell.color = newColor;
          nextCell.age = 0;

          // Fairly strong horizontal mirroring to keep figures upright.
          if (mirrorCell && mirrorCol !== c && Math.random() < 0.7) {
            mirrorCell.color = { ...newColor };
            mirrorCell.age = 0;
          }
          continue;
        }

        // Standard growth from small neighbour groups.
        if (colouredCount >= 1 && colouredCount <= 3 && Math.random() < 0.55) {
          const blended = averageColor(
            colouredNeighbours.map((n) => n.color!)
          );
          if (blended) {
            nextCell.color = blended;
            nextCell.age = 0;

            if (mirrorCell && mirrorCol !== c && Math.random() < 0.7) {
              mirrorCell.color = { ...blended };
              mirrorCell.age = 0;
            }
          }
        }
      } else {
        // Light clean-up of old specks away from the core.
        if (dist > innerRadius * 1.4 && colouredCount === 0 && cell.age > 20) {
          if (Math.random() < 0.06) {
            nextCell.color = null;
            nextCell.age = 0;
          }
        }
      }
    }
  }

  return next;
}

/**
 * stepMagicPortrait
 *
 * Portrait that slowly builds itself:
 * - Uses rough “zones” for hair, face and torso.
 * - Background, skin, hair and clothing are grown separately.
 * - Eyes and mouth can appear as small clusters in the right area.
 * This rule fills out over many steps, so it’s good to watch over time.
 */
export function stepMagicPortrait(previous: Grid): Grid {
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;
  const next = cloneGrid(previous);
  const centerX = Math.floor(colCount / 2);

  // Overall fill ratio to tweak how aggressive seeding is.
  let colouredTotal = 0;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (previous[r][c].color) colouredTotal++;
    }
  }
  const fillRatio = colouredTotal / (rowCount * colCount || 1);

  // Rough vertical layout.
  const faceTop = Math.floor(rowCount * 0.2);
  const faceBottom = Math.floor(rowCount * 0.7);
  const faceHeight = faceBottom - faceTop;
  const faceMiddleRow = faceTop + Math.floor(faceHeight * 0.5);
  const faceLowerRow = faceTop + Math.floor(faceHeight * 0.75);
  const faceUpperRow = faceTop + Math.floor(faceHeight * 0.35);
  const hairTop = Math.floor(rowCount * 0.05);
  const hairBottom = faceTop + Math.floor(faceHeight * 0.45);
  const torsoTop = faceBottom - Math.floor(faceHeight * 0.2);

  const nominalFaceHalfWidth = Math.max(4, Math.floor(colCount * 0.2));

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const localCount = colouredNeighbours.length;

      const distFromCenter = Math.abs(c - centerX);
      const maxCenter = Math.max(centerX, 1);
      const centerBias = 1 - distFromCenter / maxCenter;

      const inFaceVertical = r >= faceTop && r < faceBottom;
      const inHairVertical = r >= hairTop && r < hairBottom;
      const inTorsoVertical = r >= torsoTop;

      const faceHalfWidthDynamic = Math.max(
        3,
        nominalFaceHalfWidth -
          Math.floor(
            (Math.abs(r - faceMiddleRow) / (faceHeight || 1)) * 3
          )
      );
      const inFaceHorizontal =
        Math.abs(c - centerX) <= faceHalfWidthDynamic;

      const inFace = inFaceVertical && inFaceHorizontal;
      const inHair = inHairVertical && inFaceHorizontal;
      const inTorso =
        inTorsoVertical &&
        Math.abs(c - centerX) <= faceHalfWidthDynamic * 1.4;

      const bgBase = 30 + Math.floor((r / (rowCount || 1)) * 50);
      const bgColor: RgbColor = {
        r: clampChannel(bgBase + randomInt(-8, 8)),
        g: clampChannel(bgBase + randomInt(-8, 8)),
        b: clampChannel(bgBase + randomInt(5, 20)),
      };

      if (!cell.color) {
        // Background outside any “body” zones.
        if (!inFace && !inTorso && !inHair) {
          const bgSeedBase = fillRatio < 0.02 ? 0.05 : 0.01;
          const bgSeedChance = bgSeedBase * (0.5 + 0.5 * centerBias);

          if (localCount === 0 && Math.random() < bgSeedChance) {
            nextCell.color = bgColor;
            nextCell.age = 0;
            continue;
          }

          if (localCount > 0 && Math.random() < 0.2) {
            const blended = averageColor(
              colouredNeighbours.map((n) => n.color!)
            );
            if (blended) {
              // Pull blended background gently towards bgColor.
              nextCell.color = {
                r: clampChannel((2 * blended.r + bgColor.r) / 3),
                g: clampChannel((2 * blended.g + bgColor.g) / 3),
                b: clampChannel((2 * blended.b + bgColor.b) / 3),
              };
              nextCell.age = 0;
              continue;
            }
          }
          continue;
        }

        // Face area.
        if (inFace) {
          const faceSeedBase = 0.01;
          const densityFactor =
            fillRatio < 0.05 ? 2.0 : fillRatio < 0.2 ? 1.0 : 0.5;
          const faceSeedChance =
            faceSeedBase * densityFactor * (0.2 + 0.8 * centerBias);

          const baseSkin: RgbColor = {
            r: randomInt(180, 245),
            g: randomInt(135, 220),
            b: randomInt(120, 210),
          };

          if (localCount === 0 && Math.random() < faceSeedChance) {
            nextCell.color = baseSkin;
            nextCell.age = 0;

            if (Math.random() < 0.7) {
              const mirrorC = colCount - 1 - c;
              if (mirrorC !== c && mirrorC >= 0 && mirrorC < colCount) {
                const mirror = next[r][mirrorC];
                mirror.color = { ...baseSkin };
                mirror.age = 0;
              }
            }
            continue;
          }

          if (localCount > 0 && Math.random() < 0.4) {
            const blended = averageColor(
              colouredNeighbours.map((n) => n.color!)
            );
            if (blended) {
              const tColor: RgbColor = {
                r: clampChannel(blended.r + randomInt(5, 15)),
                g: clampChannel(blended.g + randomInt(0, 10)),
                b: clampChannel(blended.b + randomInt(-10, 5)),
              };
              nextCell.color = tColor;
              nextCell.age = 0;

              if (Math.random() < 0.5) {
                const mirrorC = colCount - 1 - c;
                if (mirrorC !== c && mirrorC >= 0 && mirrorC < colCount) {
                  const mirror = next[r][mirrorC];
                  mirror.color = { ...tColor };
                  mirror.age = 0;
                }
              }
              continue;
            }
          }
        }

        // Hair area above the face.
        if (inHair && !inFace) {
          const hairSeedBase = 0.01;
          const hairSeedChance =
            hairSeedBase * (0.3 + 0.7 * centerBias) *
            (fillRatio < 0.1 ? 2.0 : 0.8);

          if (localCount === 0 && Math.random() < hairSeedChance) {
            const hairColor: RgbColor = {
              r: randomInt(20, 120),
              g: randomInt(10, 80),
              b: randomInt(10, 70),
            };
            nextCell.color = hairColor;
            nextCell.age = 0;

            if (Math.random() < 0.7) {
              const mirrorC = colCount - 1 - c;
              if (mirrorC !== c && mirrorC >= 0 && mirrorC < colCount) {
                const mirror = next[r][mirrorC];
                mirror.color = { ...hairColor };
                mirror.age = 0;
              }
            }
            continue;
          }

          if (localCount > 0 && Math.random() < 0.4) {
            const blended = averageColor(
              colouredNeighbours.map((n) => n.color!)
            );
            if (blended) {
              nextCell.color = {
                r: clampChannel(blended.r + randomInt(-5, 15)),
                g: clampChannel(blended.g + randomInt(-5, 10)),
                b: clampChannel(blended.b + randomInt(-5, 10)),
              };
              nextCell.age = 0;
              continue;
            }
          }
        }

        // Torso / shoulders below the head.
        if (inTorso && !inFace) {
          const torsoSeedBase = 0.008;
          const torsoSeedChance =
            torsoSeedBase * (0.3 + 0.7 * centerBias) *
            (fillRatio < 0.1 ? 2.0 : 0.7);

          if (localCount === 0 && Math.random() < torsoSeedChance) {
            const clothColor: RgbColor = {
              r: randomInt(40, 160),
              g: randomInt(40, 160),
              b: randomInt(60, 200),
            };
            nextCell.color = clothColor;
            nextCell.age = 0;
            continue;
          }

          if (localCount > 0 && Math.random() < 0.35) {
            const blended = averageColor(
              colouredNeighbours.map((n) => n.color!)
            );
            if (blended) {
              nextCell.color = {
                r: clampChannel(blended.r + randomInt(-5, 10)),
                g: clampChannel(blended.g + randomInt(-5, 10)),
                b: clampChannel(blended.b + randomInt(-5, 10)),
              };
              nextCell.age = 0;
              continue;
            }
          }
        }

        // Eyes and mouth are “feature seeds” that can appear on top of skin.
        if (inFace) {
          if (
            r >= faceUpperRow - 1 &&
            r <= faceUpperRow + 1 &&
            Math.random() < 0.02 * (0.3 + 0.7 * centerBias)
          ) {
            const offset = Math.max(
              2,
              Math.floor(nominalFaceHalfWidth * 0.5)
            );
            const leftEyeCol = centerX - offset;
            const rightEyeCol = centerX + offset;
            const eyeColor: RgbColor = { r: 10, g: 10, b: 10 };

            if (c === leftEyeCol || c === rightEyeCol) {
              nextCell.color = eyeColor;
              nextCell.age = 0;
            }
          }

          if (
            r >= faceLowerRow - 1 &&
            r <= faceLowerRow + 1 &&
            Math.random() < 0.015 * (0.3 + 0.7 * centerBias)
          ) {
            const mouthColor: RgbColor = {
              r: randomInt(140, 210),
              g: randomInt(40, 100),
              b: randomInt(60, 130),
            };
            const mouthHalfWidth = 2;
            if (Math.abs(c - centerX) <= mouthHalfWidth) {
              nextCell.color = mouthColor;
              nextCell.age = 0;
            }
          }
        }
      } else {
        // Existing pixels for this rule simply darken a little and jitter.
        nextCell.age = cell.age + 1;

        if (cell.color) {
          nextCell.color = darkenColor(cell.color, 0.008);
        }

        if (nextCell.color && Math.random() < 0.04) {
          nextCell.color = jitterColor(nextCell.color, 6);
        }

        if (nextCell.age > 80 && localCount <= 1 && Math.random() < 0.3) {
          nextCell.color = null;
          nextCell.age = 0;
        }
      }
    }
  }

  return next;
}

/**
 * stepMagicPortrait2
 *
 * Quicker, more compact portrait:
 * - Starts with a small fuzzy face and hair blob around the centre.
 * - Uses MagicDraw-style growth in a ring around that core.
 * - Keeps a rough vertical symmetry for “face-like” structure.
 */
export function stepMagicPortrait2(previous: Grid): Grid {
  const next = cloneGrid(previous);
  const rowCount = previous.length;
  const colCount = previous[0]?.length ?? 0;
  const centerRow = Math.floor(rowCount / 2);
  const centerCol = Math.floor(colCount / 2);

  // ---------- 1) Initial fuzzy face core ----------
  if (!gridHasAnyColor(previous)) {
    const skinOptions: RgbColor[] = [
      { r: 255, g: 224, b: 189 },
      { r: 234, g: 192, b: 134 },
      { r: 198, g: 134, b: 66 },
      { r: 141, g: 85, b: 36 },
    ];
    const hairOptions: RgbColor[] = [
      { r: 40, g: 30, b: 20 },
      { r: 80, g: 60, b: 20 },
      { r: 20, g: 20, b: 40 },
      { r: 140, g: 60, b: 40 },
      { r: 200, g: 140, b: 80 },
    ];
    const eyeWhite: RgbColor = { r: 245, g: 245, b: 245 };
    const pupil: RgbColor = { r: 20, g: 20, b: 20 };

    const skin = randomChoice(skinOptions);
    const hair = randomChoice(hairOptions);

    const faceRadiusRow = 2 + Math.floor(Math.random() * 3);
    const faceRadiusCol = 2 + Math.floor(Math.random() * 3);

    // Skin core as a rough ellipse.
    for (let dr = -faceRadiusRow; dr <= faceRadiusRow; dr++) {
      for (let dc = -faceRadiusCol; dc <= faceRadiusCol; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r < 0 || r >= rowCount || c < 0 || c >= colCount) continue;

        const norm =
          (Math.abs(dr) / (faceRadiusRow + 0.5)) ** 2 +
          (Math.abs(dc) / (faceRadiusCol + 0.5)) ** 2;

        const baseProb = 1 - norm;
        const noise = (Math.random() - 0.5) * 0.3;
        const p = baseProb + noise;

        if (p > 0.3) {
          next[r][c].color = { ...skin };
          next[r][c].age = 0;
        }
      }
    }

    // Hair above the face.
    const hairRows = 1 + Math.floor(Math.random() * 2);
    for (let dr = -faceRadiusRow - hairRows; dr < -faceRadiusRow + 1; dr++) {
      for (let dc = -faceRadiusCol - 1; dc <= faceRadiusCol + 1; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r < 0 || r >= rowCount || c < 0 || c >= colCount) continue;
        const prob = 0.4 + Math.random() * 0.4;
        if (Math.random() < prob) {
          next[r][c].color = { ...hair };
          next[r][c].age = 0;
        }
      }
    }

    // Simple eye hints.
    const eyeRow = centerRow + Math.floor(-faceRadiusRow * 0.2);
    const eyeOffset = 1 + Math.floor(faceRadiusCol * 0.6);
    const leftEyeCol = centerCol - eyeOffset;
    const rightEyeCol = centerCol + eyeOffset;

    const placeEye = (er: number, ec: number) => {
      if (er < 0 || er >= rowCount || ec < 0 || ec >= colCount) return;
      next[er][ec].color = { ...eyeWhite };
      next[er][ec].age = 0;
      const pupilCol =
        ec + (Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1);
      if (pupilCol >= 0 && pupilCol < colCount) {
        next[er][pupilCol].color = { ...pupil };
        next[er][pupilCol].age = 0;
      }
    };

    placeEye(eyeRow, leftEyeCol);
    placeEye(eyeRow, rightEyeCol);

    // Small mouth hint.
    if (Math.random() < 0.9) {
      const mouthRow = centerRow + Math.floor(faceRadiusRow * 0.4);
      const mouthWidth = 1 + Math.floor(Math.random() * 2);
      const mouthLeft = centerCol - Math.floor(mouthWidth / 2);
      const mouthColor: RgbColor =
        Math.random() < 0.5
          ? { r: 180, g: 60, b: 80 }
          : { r: 120, g: 40, b: 50 };

      for (let dc = 0; dc < mouthWidth; dc++) {
        const c = mouthLeft + dc;
        if (mouthRow < 0 || mouthRow >= rowCount || c < 0 || c >= colCount)
          continue;
        next[mouthRow][c].color = { ...mouthColor };
        next[mouthRow][c].age = 0;
      }
    }

    return next;
  }

  // ---------- 2) Growth ring around the face ----------
  const minDim = Math.min(rowCount, colCount);
  const innerRadius = minDim * 0.1;
  const outerRadius = minDim * 0.48;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = previous[r][c];
      const nextCell = next[r][c];

      const dy = r - centerRow;
      const dx = c - centerCol;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const neighbours = getNeighbourCells(previous, r, c);
      const colouredNeighbours = neighbours.filter((n) => n.color !== null);
      const colouredCount = colouredNeighbours.length;

      // Gently age existing pixels.
      if (cell.color) {
        nextCell.age = cell.age + 1;
        nextCell.color = darkenColor(cell.color, 0.008);

        if (Math.random() < 0.02 && nextCell.color) {
          nextCell.color = jitterColor(nextCell.color, 4);
        }
      }

      // Only do strong growth inside a ring around the centre.
      if (dist < innerRadius || dist > outerRadius) {
        continue;
      }

      const mirrorCol = colCount - 1 - c;
      const mirrorCell =
        mirrorCol >= 0 && mirrorCol < colCount
          ? next[centerRow + dy]?.[mirrorCol]
          : null;

      if (!cell.color) {
        const distFromCenterCol = Math.abs(c - centerCol);
        const normDistCol =
          centerCol > 0 ? distFromCenterCol / centerCol : 0;

        const baseSeedChance = 0.0025;
        const columnCenterBoost = 1 - normDistCol * 0.9;

        const verticalFaceBand =
          r > centerRow - minDim * 0.2 && r < centerRow + minDim * 0.25
            ? 1.6
            : 0.5;

        let seedChance =
          baseSeedChance * columnCenterBoost * verticalFaceBand;

        if (colouredCount > 0) {
          seedChance *= 1.5;
        }

        if (Math.random() < seedChance) {
          let newColor: RgbColor;
          if (colouredNeighbours.length > 0 && Math.random() < 0.7) {
            const blended = averageColor(
              colouredNeighbours.map((n) => n.color!)
            );
            newColor =
              blended ??
              ({
                r: 100 + Math.floor(Math.random() * 156),
                g: 80 + Math.floor(Math.random() * 176),
                b: 80 + Math.floor(Math.random() * 176),
              } as RgbColor);
          } else {
            newColor = {
              r: 100 + Math.floor(Math.random() * 156),
              g: 80 + Math.floor(Math.random() * 176),
              b: 80 + Math.floor(Math.random() * 176),
            };
          }

          nextCell.color = newColor;
          nextCell.age = 0;

          if (mirrorCell && mirrorCol !== c && Math.random() < 0.7) {
            mirrorCell.color = { ...newColor };
            mirrorCell.age = 0;
          }
          continue;
        }

        if (colouredCount >= 1 && colouredCount <= 3 && Math.random() < 0.5) {
          const blended = averageColor(
            colouredNeighbours.map((n) => n.color!)
          );
          if (blended) {
            nextCell.color = blended;
            nextCell.age = 0;

            if (mirrorCell && mirrorCol !== c && Math.random() < 0.7) {
              mirrorCell.color = { ...blended };
              mirrorCell.age = 0;
            }
          }
        }
      } else {
        // Soft cleanup for old noise further out from the core.
        if (dist > innerRadius * 1.5 && colouredCount === 0 && cell.age > 18) {
          if (Math.random() < 0.08) {
            nextCell.color = null;
            nextCell.age = 0;
          }
        }
      }
    }
  }

  return next;
}

// ============================================================================
// #endregion Avatar / portrait rules
// ============================================================================

// ============================================================================
// #region Rule manager
// ============================================================================

/**
 * Name of each available growth rule.
 * Used by the UI to choose behaviour.
 */
export type GrowthRuleName =
  | "moss"
  | "crystal"
  | "coral"
  | "lava"
  | "terrain"
  | "slime"
  | "snowfall"
  | "chaos"
  | "magicDraw"
  | "magicDraw2"
  | "avatar"
  | "magicPortrait"
  | "magicPortrait2"
  | "avatar2"
  | "magicDrawAura";

/**
 * Dispatch helper: pick a rule by name and apply one simulation step.
 */
export function stepWithRule(rule: GrowthRuleName, grid: Grid): Grid {
  switch (rule) {
    case "crystal":
      return stepCrystal(grid);
    case "coral":
      return stepCoral(grid);
    case "lava":
      return stepLava(grid);
    case "terrain":
      return stepTerrain(grid);
    case "slime":
      return stepSlime(grid);
    case "snowfall":
      return stepSnowfall(grid);
    case "chaos":
      return stepChaos(grid);
    case "magicDraw":
      return stepMagicDraw(grid);
    case "magicDraw2":
      return stepMagicDraw2(grid);
    case "avatar":
      return stepAvatar(grid);
    case "magicPortrait":
      return stepMagicPortrait(grid);
    case "magicPortrait2":
      return stepMagicPortrait2(grid);
    case "avatar2":
      return stepAvatar2(grid);
    case "magicDrawAura":
      return stepMagicDrawAura(grid);
    case "moss":
    default:
      return stepMoss(grid);
  }
}

// ============================================================================
// #endregion Rule manager
// ============================================================================
