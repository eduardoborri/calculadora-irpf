import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_INCOME_ITEMS } from "../constants";
import { IncomeItem } from "../types";
import { formatCurrency } from "../utils/format";
import CurrencyInput from "./shared/CurrencyInput";
import LabelField from "./shared/LabelField";
import ShowAllRowsToggle from "./shared/ShowAllRowsToggle";
import Tooltip from "./shared/Tooltip";

interface IncomeTableProps {
  items: IncomeItem[];
  totalGrossIncome: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof IncomeItem, value: any) => void;
}

const isDefaultRow = (id: string) => DEFAULT_INCOME_ITEMS.some((d) => d.id === id);

export default function IncomeTable({ items, totalGrossIncome, onAdd, onRemove, onUpdate }: IncomeTableProps) {
  const [showAll, setShowAll] = useState(false);
  // Empty default rows are hidden once there is data: rows with a value and rows the
  // user added stay visible. With everything empty (manual entry) all rows show.
  const hasData = items.some((item) => item.value !== 0);
  const visible = items.filter((item) => showAll || !hasData || item.value !== 0 || !isDefaultRow(item.id));
  const hiddenCount = items.length - visible.length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="section-title">Rendimentos</h2>
        <button onClick={onAdd} className="text-action">
          <Plus className="w-4 h-4" />
          Adicionar rendimento
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          {/* Below 640px each row becomes two lines: the description and its delete
              button, then the base toggle and the value field at full width. */}
          <table className="w-full border-collapse max-sm:block">
            <thead className="max-sm:hidden">
              <tr>
                <th className="table-header">Rendimento</th>
                <th className="table-header text-center w-28">Entra na base</th>
                <th className="table-header text-right w-44">Valor bruto (R$)</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {visible.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0 max-sm:grid max-sm:grid-cols-[7rem_1fr_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-2 max-sm:px-4 max-sm:py-3"
                >
                  <td className="table-cell max-sm:row-start-1 max-sm:col-start-1 max-sm:col-span-2 max-sm:p-0 max-sm:border-0">
                    <div className="flex items-start">
                      <LabelField value={item.label} ariaLabel="Descrição do rendimento" onChange={(v) => onUpdate(item.id, "label", v)} />
                      <Tooltip text={item.description} />
                    </div>
                  </td>
                  <td className="table-cell max-sm:row-start-2 max-sm:col-start-1 max-sm:p-0 max-sm:border-0">
                    <button
                      onClick={() => onUpdate(item.id, "isSubject", !item.isSubject)}
                      aria-pressed={item.isSubject}
                      aria-label={`Sujeito ao IRPF mínimo: ${item.isSubject ? "sim" : "não"}`}
                      className={`w-full px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        item.isSubject
                          ? "bg-secondary/10 text-primary font-semibold border-secondary/30 hover:bg-secondary/20"
                          : "bg-white text-text-gray font-normal border-rule hover:bg-paper"
                      }`}
                    >
                      <span className="sm:hidden">Na base: </span>
                      {item.isSubject ? "Sim" : "Não"}
                    </button>
                  </td>
                  <td className="table-cell text-right max-sm:row-start-2 max-sm:col-start-2 max-sm:col-span-2 max-sm:p-0 max-sm:border-0">
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
                  <td className="table-cell text-center max-sm:row-start-1 max-sm:col-start-3 max-sm:p-0 max-sm:border-0">
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
            </tbody>
            <tfoot className="max-sm:block">
              <tr className="table-total max-sm:flex max-sm:justify-between max-sm:gap-4 max-sm:border-t-[3px] max-sm:border-double max-sm:border-rule">
                <td colSpan={2} className="max-sm:border-0">
                  Total, sem lucros e dividendos
                </td>
                <td className="text-right tabular-nums max-sm:border-0">{formatCurrency(totalGrossIncome)}</td>
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
