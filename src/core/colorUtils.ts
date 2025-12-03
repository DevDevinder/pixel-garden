import type { RgbColor } from "./cell";

/**
 * Convert a hex colour string (e.g., "#ff8800") to an RgbColor.
 * Returns a default colour if parsing fails.
 */
export function hexToRgb(hex: string): RgbColor {
  let sanitized = hex.replace("#", "");
  if (sanitized.length === 3) {
    sanitized =
      sanitized[0] +
      sanitized[0] +
      sanitized[1] +
      sanitized[1] +
      sanitized[2] +
      sanitized[2];
  }

  const num = parseInt(sanitized, 16);
  if (Number.isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert an RgbColor to a hex string (e.g., "#ff8800").
 */
export function rgbToHex(color: RgbColor): string {
  const toHex = (value: number) =>
    value.toString(16).padStart(2, "0").toLowerCase();
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Blend multiple colours by averaging their RGB channels.
 * Returns null if the input array is empty.
 */
export function averageColor(colors: RgbColor[]): RgbColor | null {
  if (colors.length === 0) return null;

  const sum = colors.reduce(
    (acc, c) => {
      acc.r += c.r;
      acc.g += c.g;
      acc.b += c.b;
      return acc;
    },
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
  };
}

/**
 * Darken a colour by a given factor in the range [0, 1],
 * where 0 means no change and 1 would make the colour fully black.
 */
export function darkenColor(color: RgbColor, factor: number): RgbColor {
  const clampedFactor = Math.min(Math.max(factor, 0), 1);
  return {
    r: Math.round(color.r * (1 - clampedFactor)),
    g: Math.round(color.g * (1 - clampedFactor)),
    b: Math.round(color.b * (1 - clampedFactor)),
  };
}
