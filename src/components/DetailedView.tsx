import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import DividendSourcesTable from "./DividendSourcesTable";
import IncomeTable from "./IncomeTable";
import ResultsSummary from "./ResultsSummary";
import TaxTable from "./TaxTable";

interface DetailedViewProps {
  incomeItems: IncomeItem[];
  taxItems: TaxPaymentItem[];
  dividendSources: DividendSource[];
  results: CalculationResult;
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

export default function DetailedView({
  incomeItems,
  taxItems,
  dividendSources,
  results,
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
    <div className="space-y-10">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-10">
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

        <div className="xl:col-span-4 space-y-6">
          <ResultsSummary results={results} onExportPdf={onExportPdf} />
        </div>
      </div>

      {/* Full width: the per-source table has too many columns for the 8/12 column */}
      <DividendSourcesTable
        sources={dividendSources}
        summary={results.dividends}
        onAdd={onAddSource}
        onRemove={onRemoveSource}
        onUpdate={onUpdateSource}
      />
    </div>
  );
}
