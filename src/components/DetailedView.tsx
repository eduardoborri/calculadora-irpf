import { useEffect, useRef, useState } from "react";
import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import CalculationMemo, { resultSummary } from "./CalculationMemo";
import DividendSourcesTable from "./DividendSourcesTable";
import IncomeTable from "./IncomeTable";
import TaxTable from "./TaxTable";

interface DetailedViewProps {
  incomeItems: IncomeItem[];
  taxItems: TaxPaymentItem[];
  dividendSources: DividendSource[];
  results: CalculationResult;
  dataOrigin: string;
  onAddIncome: () => void;
  onRemoveIncome: (id: string) => void;
  onUpdateIncome: (id: string, field: keyof IncomeItem, value: any) => void;
  onAddTax: () => void;
  onRemoveTax: (id: string) => void;
  onUpdateTax: (id: string, field: keyof TaxPaymentItem, value: any) => void;
  onAddSource: () => void;
  onRemoveSource: (id: string) => void;
  onUpdateSource: (id: string, field: keyof DividendSource, value: any) => void;
  onExportPdf: () => void;
}

// Inputs on the left, read top to bottom like a demonstrativo; the calculation
// memo pinned on the right. The dividends table has seven columns, so it runs
// the full width under both. Whenever the memo is out of view (below the
// tables on a phone or tablet, or while editing the dividends), a bar at the
// bottom of the screen keeps the answer in sight.
export default function DetailedView({
  incomeItems,
  taxItems,
  dividendSources,
  results,
  dataOrigin,
  onAddIncome,
  onRemoveIncome,
  onUpdateIncome,
  onAddTax,
  onRemoveTax,
  onUpdateTax,
  onAddSource,
  onRemoveSource,
  onUpdateSource,
  onExportPdf,
}: DetailedViewProps) {
  const memoRef = useRef<HTMLDivElement>(null);
  const [memoVisible, setMemoVisible] = useState(true);

  useEffect(() => {
    const el = memoRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setMemoVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const summary = resultSummary(results);

  return (
    <div className="space-y-12 pb-16">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-10 items-start">
        <div className="space-y-12 min-w-0">
          <IncomeTable
            items={incomeItems}
            totalGrossIncome={results.totalGrossIncome - results.dividends.total}
            onAdd={onAddIncome}
            onRemove={onRemoveIncome}
            onUpdate={onUpdateIncome}
          />
          <TaxTable
            items={taxItems}
            totalTaxPaid={results.totalTaxPaid}
            presumedExclusiveTax={results.presumedExclusiveTax}
            dividendWithholding={results.dividends.withholdingTotal}
            onAdd={onAddTax}
            onRemove={onRemoveTax}
            onUpdate={onUpdateTax}
          />
        </div>

        <div ref={memoRef} className="xl:sticky xl:top-6 scroll-mt-6">
          <CalculationMemo
            results={results}
            incomeItems={incomeItems}
            taxItems={taxItems}
            dividendSources={dividendSources}
            dataOrigin={dataOrigin}
            onExportPdf={onExportPdf}
          />
        </div>
      </div>

      <DividendSourcesTable
        sources={dividendSources}
        summary={results.dividends}
        onAdd={onAddSource}
        onRemove={onRemoveSource}
        onUpdate={onUpdateSource}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-20 bg-primary text-white transition-transform duration-200 ${
          memoVisible ? "translate-y-full pointer-events-none" : "translate-y-0"
        }`}
        aria-hidden={memoVisible}
      >
        <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-sm text-white/85">{summary.label}</span>
            <span className="text-xl font-semibold tabular-nums">{summary.value}</span>
          </p>
          <button
            type="button"
            tabIndex={memoVisible ? -1 : 0}
            onClick={() => memoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 text-sm font-semibold underline underline-offset-4 decoration-white/40 hover:decoration-white rounded px-1 cursor-pointer"
          >
            Ver memória de cálculo
          </button>
        </div>
      </div>
    </div>
  );
}
