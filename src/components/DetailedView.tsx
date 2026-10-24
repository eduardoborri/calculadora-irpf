import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import CalculationMemo from "./CalculationMemo";
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
// memo pinned on the right.
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
  return (
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
        <DividendSourcesTable
          sources={dividendSources}
          summary={results.dividends}
          onAdd={onAddSource}
          onRemove={onRemoveSource}
          onUpdate={onUpdateSource}
        />
      </div>

      <CalculationMemo
        results={results}
        incomeItems={incomeItems}
        taxItems={taxItems}
        dividendSources={dividendSources}
        dataOrigin={dataOrigin}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}
