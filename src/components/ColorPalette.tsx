import React from "react";

interface ColorPaletteProps {
  colors: string[];
  selected: string;
  onSelect: (hex: string) => void;
}

/**
 * ColorPalette
 *
 * Renders a row of colour swatches.
 * Responsible for colour selection UI.
 */
export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  selected,
  onSelect,
}) => {
  return (
    <div className="palette">
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          className={`palette-swatch ${
            selected === hex ? "palette-swatch--selected" : ""
          }`}
          style={{ backgroundColor: hex }}
          onClick={() => onSelect(hex)}
          aria-label={`Select colour ${hex}`}
        />
      ))}
    </div>
  );
};
