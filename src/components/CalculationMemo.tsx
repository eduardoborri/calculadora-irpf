import { useState } from "react";
import { MAX_ALIQUOT, MAX_TAX_THRESHOLD, MIN_TAX_THRESHOLD } from "../constants";
import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";

interface CalculationMemoProps {
  results: CalculationResult;
  incomeItems: IncomeItem[];
  taxItems: TaxPaymentItem[];
  dividendSources: DividendSource[];
  // Where the inputs came from, e.g. "declaração importada (arquivo.pdf)".
  dataOrigin: string;
  onExportPdf: () => void;
}

interface MemoLine {
  key: string;
  operator: string;
  label: string;
  value: string;
  detail: { label: string; value: string }[];
  note?: string;
}

/**
 * The memória de cálculo: the whole apuração as one running calculation, with
 * the operators in their own column. It is the one bold element of the page.
 * Every line opens to show what it is made of and where the numbers came from.
 */
export default function CalculationMemo({ results, incomeItems, taxItems, dividendSources, dataOrigin, onExportPdf }: CalculationMemoProps) {
  const [open, setOpen] = useState<string | null>(null);
  const { subjectBase, minimumAliquot, minimumTaxDue, totalTaxPaid, reduction16B, additionalTax, refund, presumedExclusiveTax, dividends } = results;

  const sourceName = new Map(dividendSources.map((s) => [s.id, s.name]));
  const aliquotNote =
    subjectBase <= MIN_TAX_THRESHOLD
      ? `Base até ${formatCurrency(MIN_TAX_THRESHOLD)}: alíquota zero.`
      : subjectBase >= MAX_TAX_THRESHOLD
        ? `Base a partir de ${formatCurrency(MAX_TAX_THRESHOLD)}: alíquota máxima de ${formatPercent(MAX_ALIQUOT)}.`
        : `(${formatCurrency(subjectBase)} − ${formatCurrency(MIN_TAX_THRESHOLD)}) ÷ ${formatCurrency(MAX_TAX_THRESHOLD - MIN_TAX_THRESHOLD)} × ${formatPercent(MAX_ALIQUOT)}`;

  const lines: MemoLine[] = [
    {
      key: "base",
      operator: "",
      label: "Base sujeita",
      value: formatCurrency(subjectBase),
      detail: [
        ...incomeItems.filter((i) => i.isSubject && i.value !== 0).map((i) => ({ label: i.label, value: formatCurrency(i.value) })),
        ...(dividends.posteriorTotal > 0 ? [{ label: "Lucros e dividendos posteriores a 2025", value: formatCurrency(dividends.posteriorTotal) }] : []),
      ],
      note:
        dividends.protectedTotal > 0
          ? `Fora da base: ${formatCurrency(dividends.protectedTotal)} de dividendos deliberados até 2025. Origem: ${dataOrigin}.`
          : `Origem: ${dataOrigin}.`,
    },
    { key: "aliquota", operator: "×", label: "Alíquota", value: formatPercent(minimumAliquot), detail: [], note: aliquotNote },
    {
      key: "devido",
      operator: "=",
      label: "IRPF mínimo devido",
      value: formatCurrency(minimumTaxDue),
      detail: [],
      note: `${formatCurrency(subjectBase)} × ${formatPercent(minimumAliquot)}`,
    },
    {
      key: "pago",
      operator: "−",
      label: "Imposto pago ou retido",
      value: formatCurrency(totalTaxPaid),
      detail: [
        ...taxItems.filter((t) => t.value !== 0).map((t) => ({ label: t.label, value: formatCurrency(t.value) })),
        ...(presumedExclusiveTax > 0 ? [{ label: "Presumido: 15% sobre a tributação exclusiva", value: formatCurrency(presumedExclusiveTax) }] : []),
        ...(dividends.withholdingTotal > 0 ? [{ label: "Retenção de 10% sobre dividendos", value: formatCurrency(dividends.withholdingTotal) }] : []),
      ],
      note: "O imposto devido na declaração anual não entra, para não contar o mesmo imposto duas vezes.",
    },
    {
      key: "redutor",
      operator: "−",
      label: "Redutor do art. 16-B",
      value: formatCurrency(reduction16B),
      detail: dividends.perSource
        .filter((r) => r.redutor > 0)
        .map((r) => ({ label: `${sourceName.get(r.id) ?? "Fonte"} (${formatPercent(r.redutorRate)})`, value: formatCurrency(r.redutor) })),
      note:
        dividends.sourcesMissingPjData > 0
          ? `${dividends.sourcesMissingPjData} fonte(s) sem dados da PJ, sem redutor. Limitado ao saldo devido.`
          : "Limitado ao saldo devido; não gera restituição.",
    },
  ];

  return (
    <aside className="bg-primary text-white rounded-lg p-6 xl:sticky xl:top-6 space-y-5" aria-label="Memória de cálculo">
      <h2 className="text-[21px] font-semibold leading-tight">Memória de cálculo</h2>

      <ol className="space-y-1">
        {lines.map((line) => {
          const isOpen = open === line.key;
          return (
            <li key={line.key} className={line.key === "devido" ? "border-t border-white/20 pt-1" : ""}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : line.key)}
                aria-expanded={isOpen}
                className="w-full grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-2 py-1.5 text-left rounded hover:bg-white/5 cursor-pointer"
              >
                <span className="text-xl font-light text-white/60 text-center" aria-hidden="true">
                  {line.operator}
                </span>
                <span className="text-sm text-white/85 underline decoration-white/25 underline-offset-4">{line.label}</span>
                <span className="text-base font-semibold tabular-nums">{line.value}</span>
              </button>
              {isOpen && (
                <div className="ml-8 mb-2 mt-1 space-y-1 text-xs text-white/75 font-normal">
                  {line.detail.map((d) => (
                    <div key={d.label} className="flex justify-between gap-3">
                      <span>{d.label}</span>
                      <span className="tabular-nums whitespace-nowrap">{d.value}</span>
                    </div>
                  ))}
                  {line.note && <p className="text-white/60 leading-relaxed pt-0.5">{line.note}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="border-t-[3px] border-double border-white/30 pt-4 grid grid-cols-[1.5rem_1fr] gap-2 items-baseline">
        <span className="text-2xl font-light text-white/60 text-center" aria-hidden="true">
          =
        </span>
        <div>
          <p className="text-sm text-white/85">{refund > 0 ? "Restituição" : "Adicional a pagar"}</p>
          {additionalTax > 0 ? (
            <p className="mt-1 inline-block bg-accent text-white text-[32px] leading-none font-semibold px-2 py-1.5 rounded tabular-nums">
              {formatCurrency(additionalTax)}
            </p>
          ) : refund > 0 ? (
            <p className="mt-1 text-[32px] leading-none font-semibold tabular-nums">{formatCurrency(refund)}</p>
          ) : (
            <>
              <p className="mt-1 text-[32px] leading-none font-semibold tabular-nums">{formatCurrency(0)}</p>
              {totalTaxPaid > minimumTaxDue && (
                <p className="text-xs text-white/70 mt-2">
                  O imposto já pago supera o mínimo em {formatCurrency(totalTaxPaid - minimumTaxDue)}.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onExportPdf}
        className="w-full px-4 py-2.5 rounded border border-white/40 text-sm font-semibold hover:bg-white/10 cursor-pointer"
      >
        Exportar relatório em PDF
      </button>

      <details className="text-xs text-white/70 group">
        <summary className="cursor-pointer text-white/85 font-semibold list-none">Premissas aplicadas</summary>
        <ul className="mt-2 space-y-1.5 leading-relaxed list-disc pl-4 font-normal">
          <li>Alíquota zero até R$ 600 mil, linear até 10% em R$ 1,2 milhão.</li>
          <li>Dividendos deliberados até 31/12/2025 ficam fora da base; por padrão, tudo é tratado como posterior.</li>
          <li>Sem informação do imposto da tributação exclusiva, presume-se 15%.</li>
          <li>Redutor do art. 16-B por fonte: posterior × (efetiva da PJ + alíquota mínima − nominal do setor).</li>
          <li>Só a retenção sobre dividendos gera restituição.</li>
        </ul>
      </details>
    </aside>
  );
}
