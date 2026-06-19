import './ColorPicker.scss';

export const CHART_COLORS = [
  '#F94144', '#F3722C', '#F8961E', '#F9C74F', '#E9D8A6',
  '#90BE6D', '#43AA8B', '#0A9396', '#005F73', '#577590',
  '#277DA1', '#CA6702', '#BB3E03', '#AE2012', '#9B2226',
  '#656D4A', '#414833', '#936639', '#A68A64', '#001219',
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker">
      <button
        className={`color-picker__none${!value ? ' color-picker__none--active' : ''}`}
        onClick={() => onChange(null)}
        type="button"
        title="No color"
      >
        ✕
      </button>
      {CHART_COLORS.map((c) => (
        <button
          key={c}
          className={`color-picker__swatch${value === c ? ' color-picker__swatch--active' : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
          type="button"
          title={c}
          aria-label={c}
        />
      ))}
    </div>
  );
}
