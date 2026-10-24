import { formatCurrency } from "../../utils/format";
import QuickIncrementButtons from "./QuickIncrementButtons";

interface SimSliderFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (val: number) => void;
  max: number;
  step: number;
  quickIncrements: number[];
  isAnnual: boolean;
  accent?: "primary" | "secondary";
  withTopBorder?: boolean;
}

export default function SimSliderField({
  label,
  description,
  value,
  onChange,
  max,
  step,
  quickIncrements,
  isAnnual,
  accent = "primary",
  withTopBorder = true,
}: SimSliderFieldProps) {
  const badgeClass = accent === "primary" ? "text-primary bg-primary/5" : "text-secondary bg-secondary/5";
  const sliderAccentClass = accent === "primary" ? "accent-primary" : "accent-secondary";

  return (
    <div className={`space-y-3 ${withTopBorder ? "pt-4 border-t border-gray-150" : ""}`}>
      <div className="flex justify-between items-center text-sm">
        <label className="font-bold text-primary">{label}</label>
        <span className={`font-black px-2.5 py-1 rounded-lg ${badgeClass}`}>{formatCurrency(value)}</span>
      </div>
      <p className="text-xs text-text-gray leading-normal">{description}</p>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`flex-1 ${sliderAccentClass} h-2 bg-gray-100 rounded-lg cursor-pointer`}
        />
      </div>
      <QuickIncrementButtons value={value} onChange={onChange} max={max} increments={quickIncrements} isAnnual={isAnnual} />
    </div>
  );
}
