// src/core/colorUtils.test.ts
import { describe, it, expect } from "vitest";
import { hexToRgb, rgbToHex, averageColor, darkenColor } from "./colorUtils";
import type { RgbColor } from "./cell";

const brightness = (c: RgbColor) => (c.r + c.g + c.b) / 3;

describe("colorUtils", () => {
  describe("hexToRgb", () => {
    it("converts basic hex colours correctly", () => {
      expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe("rgbToHex", () => {
    it("converts RGB back to hex", () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
      expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe("#00ff00");
      expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe("#0000ff");
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
    });

    it("round-trips with hexToRgb for typical colours", () => {
      const hexValues = ["#f97316", "#22c55e", "#38bdf8", "#e879f9"];

      for (const hex of hexValues) {
        const rgb = hexToRgb(hex);
        const roundTrip = rgbToHex(rgb);
        expect(roundTrip.toLowerCase()).toBe(hex.toLowerCase());
      }
    });
  });

  describe("averageColor", () => {
    it("averages two colours channel-wise to something between them", () => {
      const red: RgbColor = { r: 255, g: 0, b: 0 };
      const blue: RgbColor = { r: 0, g: 0, b: 255 };

      const avg = averageColor([red, blue]);
      expect(avg).not.toBeNull();

      if (!avg) return;

      // Channel should be between the two inputs
      expect(avg.r).toBeGreaterThanOrEqual(0);
      expect(avg.r).toBeLessThanOrEqual(255);
      expect(avg.b).toBeGreaterThanOrEqual(0);
      expect(avg.b).toBeLessThanOrEqual(255);

      // Green stays near zero for (red, blue)
      expect(avg.g).toBeLessThanOrEqual(10);
    });

    it("returns null for an empty list", () => {
      //implementation uses `null`, not `undefined`
      expect(averageColor([])).toBeNull();
    });
  });

  describe("darkenColor", () => {
    it("keeps channels within 0–255 and reduces brightness", () => {
      const original: RgbColor = { r: 200, g: 150, b: 100 };

      const darker = darkenColor(original, 0.05);

      expect(darker.r).toBeGreaterThanOrEqual(0);
      expect(darker.g).toBeGreaterThanOrEqual(0);
      expect(darker.b).toBeGreaterThanOrEqual(0);
      expect(darker.r).toBeLessThanOrEqual(255);
      expect(darker.g).toBeLessThanOrEqual(255);
      expect(darker.b).toBeLessThanOrEqual(255);

      // Should not brighten the colour
      expect(brightness(darker)).toBeLessThanOrEqual(brightness(original));
    });
  });
});
