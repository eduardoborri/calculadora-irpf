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
}

// One estimated income: label and amount on one line, what it covers below,
// then the slider and the quick increments. Rows are divided by the parent.
export default function SimSliderField({ label, description, value, onChange, max, step, quickIncrements, isAnnual }: SimSliderFieldProps) {
  return (
    <div className="space-y-2 py-5">
      <div className="flex justify-between items-baseline gap-4 text-sm">
        <label className="font-semibold text-primary">{label}</label>
        <span className="font-semibold text-primary tabular-nums whitespace-nowrap">{formatCurrency(value)}</span>
      </div>
      <p className="text-xs text-text-gray leading-normal">{description}</p>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full accent-primary h-2 cursor-pointer"
      />
      <QuickIncrementButtons value={value} onChange={onChange} max={max} increments={quickIncrements} isAnnual={isAnnual} />
    </div>
  );
}
