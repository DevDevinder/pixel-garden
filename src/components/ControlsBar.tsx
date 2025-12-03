import React from "react";
import type { GrowthRuleName } from "../core/rules";
import { ColorPalette } from "./ColorPalette";

type Tool = "brush" | "eraser";

interface ControlsBarProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onStepOnce: () => void;
  onClear: () => void;
  onRandomSeeds: () => void;
  currentRule: GrowthRuleName;
  onChangeRule: (rule: GrowthRuleName) => void;
  speedMs: number;
  onChangeSpeedMs: (ms: number) => void;
  paletteColors: string[];
  selectedColor: string;
  onSelectColor: (hex: string) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

/**
 * Grouped rule metadata used by the rule selector.
 */
const RULE_GROUPS: {
  label: string;
  options: { value: GrowthRuleName; label: string }[];
}[] = [
  {
    label: "World & Biomes",
    options: [
      { value: "moss", label: "Moss – organic growth" },
      { value: "crystal", label: "Crystal – sharp branching" },
      { value: "coral", label: "Coral – alien plantlife" },
      { value: "lava", label: "Lava – explosive fire" },
      { value: "terrain", label: "Terrain – maps & hills" },
      { value: "slime", label: "Slime – round creatures" },
      { value: "snowfall", label: "Snowfall – icy fractals" },
      { value: "chaos", label: "Chaos – endless random drawing" },
      { value: "magicDrawAura", label: "Magic Draw Aura – colorful energy" },
    ],
  },
  {
    label: "MagicDraws",
    options: [
      { value: "magicDraw", label: "Magic Draw – unpredictable art" },
      { value: "magicDraw2", label: "Magic Draw 2 – streaky sprites" },
    ],
  },
  {
    label: "Avatars & Portraits",
    options: [
      { value: "avatar", label: "Avatar – create a face" },
      { value: "magicPortrait", label: "Magic Portrait – abstract faces" },
      { value: "magicPortrait2", label: "Magic Portrait2 – pixel portraits" },
      { value: "avatar2", label: "Avatar2 – full-body characters" },
    ],
  },
];

interface PlaybackControlsProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onStepOnce: () => void;
  onClear: () => void;
  onRandomSeeds: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isRunning,
  onToggleRunning,
  onStepOnce,
  onClear,
  onRandomSeeds,
}) => (
  <div className="controls-row">
    <button type="button" onClick={onToggleRunning}>
      {isRunning ? "Pause" : "Play"}
    </button>
    <button type="button" onClick={onStepOnce} disabled={isRunning}>
      Step
    </button>
    <button type="button" onClick={onClear}>
      Clear
    </button>
    <button type="button" onClick={onRandomSeeds}>
      Random Seeds
    </button>
  </div>
);

interface RuleAndSpeedControlsProps {
  currentRule: GrowthRuleName;
  onChangeRule: (rule: GrowthRuleName) => void;
  speedMs: number;
  onChangeSpeedMs: (ms: number) => void;
}

const RuleAndSpeedControls: React.FC<RuleAndSpeedControlsProps> = ({
  currentRule,
  onChangeRule,
  speedMs,
  onChangeSpeedMs,
}) => (
  <div className="controls-row">
    <label className="controls-field">
      Rule:
      <select
        value={currentRule}
        onChange={(e) => onChangeRule(e.target.value as GrowthRuleName)}
      >
        {RULE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>

    <label className="controls-field">
      Speed:
      <input
        type="range"
        min={50}
        max={800}
        step={50}
        value={speedMs}
        onChange={(e) => onChangeSpeedMs(Number(e.target.value))}
      />
      <span>{speedMs} ms</span>
    </label>
  </div>
);

interface BrushControlsProps {
  paletteColors: string[];
  selectedColor: string;
  onSelectColor: (hex: string) => void;
}

const BrushControls: React.FC<BrushControlsProps> = ({
  paletteColors,
  selectedColor,
  onSelectColor,
}) => (
  <div className="controls-row">
    <span>Brush colour:</span>
    <ColorPalette
      colors={paletteColors}
      selected={selectedColor}
      onSelect={onSelectColor}
    />
    <input
      type="color"
      value={selectedColor}
      onChange={(e) => onSelectColor(e.target.value)}
      className="controls-color-input"
      aria-label="Custom brush colour"
    />
  </div>
);

interface ToolControlsProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

const ToolControls: React.FC<ToolControlsProps> = ({ tool, onToolChange }) => (
  <div className="controls-row">
    <span>Tool:</span>
    <div className="controls-tool-buttons">
      <button
        type="button"
        onClick={() => onToolChange("brush")}
        className={
          tool === "brush" ? "tool-button tool-button--active" : "tool-button"
        }
      >
        Brush
      </button>
      <button
        type="button"
        onClick={() => onToolChange("eraser")}
        className={
          tool === "eraser" ? "tool-button tool-button--active" : "tool-button"
        }
      >
        Eraser
      </button>
    </div>
  </div>
);

/**
 * ControlsBar
 */
export const ControlsBar: React.FC<ControlsBarProps> = (props) => {
  const {
    isRunning,
    onToggleRunning,
    onStepOnce,
    onClear,
    onRandomSeeds,
    currentRule,
    onChangeRule,
    speedMs,
    onChangeSpeedMs,
    paletteColors,
    selectedColor,
    onSelectColor,
    tool,
    onToolChange,
  } = props;

  return (
    <div className="controls">
      <PlaybackControls
        isRunning={isRunning}
        onToggleRunning={onToggleRunning}
        onStepOnce={onStepOnce}
        onClear={onClear}
        onRandomSeeds={onRandomSeeds}
      />

      <RuleAndSpeedControls
        currentRule={currentRule}
        onChangeRule={onChangeRule}
        speedMs={speedMs}
        onChangeSpeedMs={onChangeSpeedMs}
      />

      <BrushControls
        paletteColors={paletteColors}
        selectedColor={selectedColor}
        onSelectColor={onSelectColor}
      />

      <ToolControls tool={tool} onToolChange={onToolChange} />
    </div>
  );
};
