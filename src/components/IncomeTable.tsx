import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_INCOME_ITEMS } from "../constants";
import { IncomeItem } from "../types";
import { formatCurrency } from "../utils/format";
import CurrencyInput from "./shared/CurrencyInput";
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
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="section-title">Rendimentos</h2>
        <button onClick={onAdd} className="text-action">
          <Plus className="w-4 h-4" />
          Adicionar rendimento
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header">Rendimento</th>
                <th className="table-header text-center w-28">Entra na base</th>
                <th className="table-header text-right w-44">Valor bruto (R$)</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={item.label}
                        aria-label="Descrição do rendimento"
                        onChange={(e) => onUpdate(item.id, "label", e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-primary font-medium text-sm"
                      />
                      <Tooltip text={item.description} />
                    </div>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => onUpdate(item.id, "isSubject", !item.isSubject)}
                      aria-pressed={item.isSubject}
                      aria-label={`Sujeito ao IRPF mínimo: ${item.isSubject ? "sim" : "não"}`}
                      className={`w-full px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                        item.isSubject
                          ? "bg-primary text-white border-primary hover:bg-primary/90"
                          : "bg-white text-text-gray border-rule hover:bg-paper"
                      }`}
                    >
                      {item.isSubject ? "Sim" : "Não"}
                    </button>
                  </td>
                  <td className="table-cell text-right">
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
                  <td className="table-cell text-center">
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
            <tfoot>
              <tr className="table-total">
                <td colSpan={2}>Total, sem lucros e dividendos</td>
                <td className="text-right tabular-nums">{formatCurrency(totalGrossIncome)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ShowAllRowsToggle showAll={showAll} hiddenCount={hiddenCount} onToggle={() => setShowAll((v) => !v)} />
      </div>
    </section>
  );
}
