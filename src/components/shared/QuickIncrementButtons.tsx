import { formatCurrency } from "../../utils/format";

interface QuickIncrementButtonsProps {
  value: number;
  onChange: (val: number) => void;
  max: number;
  increments: number[];
  isAnnual: boolean;
}

const ANNUAL_TO_MONTHLY = 0.0833;

export default function QuickIncrementButtons({
  value,
  onChange,
  max,
  increments,
  isAnnual,
}: QuickIncrementButtonsProps) {
  const multiplier = isAnnual ? 1 : ANNUAL_TO_MONTHLY;
  const buttonClass =
    "text-xs font-semibold px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded hover:bg-gray-100 transition-all cursor-pointer";

  return (
    <div className="flex gap-2">
      {increments.map((base) => {
        const increment = Math.round(base * multiplier);
        return (
          <button
            key={base}
            type="button"
            onClick={() => onChange(Math.min(max, value + increment))}
            className={buttonClass}
          >
            +{formatCurrency(increment).replace(",00", "")}
          </button>
        );
      })}
      <button type="button" onClick={() => onChange(0)} className={buttonClass}>
        Zerar
      </button>
    </div>
  );
}
