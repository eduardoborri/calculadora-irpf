import { CalculationResult } from "../types";
import { formatCurrency } from "../utils/format";

interface ResultWaterfallProps {
  results: CalculationResult;
}

interface Step {
  label: string;
  value: string;
  left: number;
  width: number;
  color: string;
}

/**
 * Waterfall of the result: IRPF mínimo devido − imposto pago − redutor =
 * adicional. Bars share one scale (the larger of the minimum and the tax
 * paid), so it's visible at a glance what drives the result.
 */
export default function ResultWaterfall({ results }: ResultWaterfallProps) {
  const { minimumTaxDue: due, totalTaxPaid: paid, reduction16B: redutor, additionalTax: additional } = results;
  const scale = Math.max(due, paid);
  if (scale <= 0) return null;

  const pct = (v: number) => (v / scale) * 100;
  const paidUsed = Math.min(paid, due);
  const steps: Step[] = [
    { label: "IRPF mínimo devido", value: formatCurrency(due), left: 0, width: pct(due), color: "bg-primary" },
    { label: "(−) Imposto pago/retido", value: formatCurrency(paid), left: pct(due - paidUsed), width: pct(paid), color: "bg-secondary" },
  ];
  if (redutor > 0) {
    steps.push({ label: "(−) Redutor Art. 16-B", value: formatCurrency(redutor), left: pct(due - paidUsed - redutor), width: pct(redutor), color: "bg-secondary/50" });
  }
  steps.push({
    label: "(=) Adicional a pagar",
    value: formatCurrency(additional),
    left: 0,
    width: pct(additional),
    color: additional > 0 ? "bg-accent" : "bg-gray-200",
  });

  return (
    <div className="space-y-2" aria-label="Composição do resultado">
      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Composição do resultado</h4>
      {steps.map((s) => (
        <div key={s.label} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-text-gray">{s.label}</span>
            <span className="font-semibold text-primary">{s.value}</span>
          </div>
          <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`absolute inset-y-0 rounded-full ${s.color}`} style={{ left: `${s.left}%`, width: `${Math.max(s.width, s.width > 0 ? 1 : 0)}%` }} />
          </div>
        </div>
      ))}
      {paid > due && (
        <p className="text-xs text-text-gray">Imposto pago excede o mínimo em {formatCurrency(paid - due)} — sem adicional.</p>
      )}
    </div>
  );
}
