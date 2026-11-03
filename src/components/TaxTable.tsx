import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_TAX_ITEMS, EXCLUSIVE_TAX_ID, PRESUMED_EXCLUSIVE_TAX_RATE } from "../constants";
import { TaxPaymentItem } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import CurrencyInput from "./shared/CurrencyInput";
import LabelField from "./shared/LabelField";
import ShowAllRowsToggle from "./shared/ShowAllRowsToggle";
import Tooltip from "./shared/Tooltip";

interface TaxTableProps {
  items: TaxPaymentItem[];
  totalTaxPaid: number;
  presumedExclusiveTax: number;
  dividendWithholding: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof TaxPaymentItem, value: any) => void;
}

const isDefaultRow = (id: string) => DEFAULT_TAX_ITEMS.some((d) => d.id === id);

export default function TaxTable({ items, totalTaxPaid, presumedExclusiveTax, dividendWithholding, onAdd, onRemove, onUpdate }: TaxTableProps) {
  const [showAll, setShowAll] = useState(false);
  // Same rule as the income table; the exclusive-tax row also stays visible while
  // it carries the 15% presumption.
  const keep = (item: TaxPaymentItem) => item.value !== 0 || !isDefaultRow(item.id) || (item.id === EXCLUSIVE_TAX_ID && presumedExclusiveTax > 0);
  const hasData = presumedExclusiveTax > 0 || items.some((i) => i.value !== 0);
  const visible = items.filter((item) => showAll || !hasData || keep(item));
  const hiddenCount = items.length - visible.length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="section-title">Imposto pago ou retido</h2>
        <button onClick={onAdd} className="text-action">
          <Plus className="w-4 h-4" />
          Adicionar imposto
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          {/* Below 640px each row becomes two lines: the description and its delete
              button, then the value field at full width. */}
          <table className="w-full border-collapse max-sm:block">
            <thead className="max-sm:hidden">
              <tr>
                <th className="table-header">Imposto</th>
                <th className="table-header text-right w-44">Valor (R$)</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-2 max-sm:px-4 max-sm:py-3"
                >
                  <td className="table-cell max-sm:row-start-1 max-sm:col-start-1 max-sm:p-0 max-sm:border-0">
                    <div className="flex items-start">
                      <LabelField value={item.label} ariaLabel="Descrição do imposto" onChange={(v) => onUpdate(item.id, "label", v)} />
                      <Tooltip text={item.description} />
                    </div>
                    {item.id === EXCLUSIVE_TAX_ID && presumedExclusiveTax > 0 && (
                      <p className="mt-1 text-xs font-medium text-secondary">
                        Não informado — presumido {formatPercent(PRESUMED_EXCLUSIVE_TAX_RATE)} sobre os rendimentos de tributação
                        exclusiva/definitiva: {formatCurrency(presumedExclusiveTax)} (já incluído no total)
                      </p>
                    )}
                  </td>
                  <td className="table-cell text-right max-sm:row-start-2 max-sm:col-start-1 max-sm:col-span-2 max-sm:p-0 max-sm:border-0">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-gray-500 text-xs font-semibold">R$</span>
                      <CurrencyInput
                        value={item.value}
                        onChange={(val) => onUpdate(item.id, "value", val)}
                        ariaLabel={`Valor de ${item.label}`}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-right text-primary font-semibold"
                      />
                    </div>
                  </td>
                  <td className="table-cell text-center max-sm:row-start-1 max-sm:col-start-2 max-sm:p-0 max-sm:border-0">
                    <button
                      onClick={() => onRemove(item.id)}
                      aria-label={`Excluir linha ${item.label}`}
                      className="p-1 text-gray-500 hover:text-accent rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {dividendWithholding > 0 && (
                <tr className="max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:px-4 max-sm:py-3">
                  <td className="table-cell text-sm text-primary font-medium max-sm:p-0 max-sm:border-0">
                    Retenção na fonte sobre dividendos posteriores a 2025
                    <p className="text-xs text-text-gray">Calculada na tabela de fontes pagadoras, nas fontes marcadas com retenção (10% da parcela posterior ou o valor informado).</p>
                  </td>
                  <td className="table-cell text-right text-primary font-semibold tabular-nums max-sm:p-0 max-sm:border-0">
                    {formatCurrency(dividendWithholding)}
                  </td>
                  <td className="table-cell max-sm:hidden"></td>
                </tr>
              )}
            </tbody>
            <tfoot className="max-sm:block">
              <tr className="table-total max-sm:flex max-sm:justify-between max-sm:gap-4 max-sm:border-t-[3px] max-sm:border-double max-sm:border-rule">
                <td className="max-sm:border-0">Total considerado</td>
                <td className="text-right tabular-nums max-sm:border-0">{formatCurrency(totalTaxPaid)}</td>
                <td className="max-sm:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ShowAllRowsToggle showAll={showAll} hiddenCount={hiddenCount} onToggle={() => setShowAll((v) => !v)} />
      </div>
    </section>
  );
}
