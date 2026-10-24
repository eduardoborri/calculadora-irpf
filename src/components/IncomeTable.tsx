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
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">1. Rendimentos Tributáveis e Isentos</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Linha
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header">Descrição do Rendimento</th>
                <th className="table-header text-center w-24">Sujeição</th>
                <th className="table-header text-right w-40">Valor Bruto (R$)</th>
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
                      className={`w-full px-3 py-1 text-xs font-bold rounded-md border transition-all active:scale-95 ${
                        item.isSubject
                          ? "bg-primary text-white border-primary/20 hover:bg-primary/90 shadow-sm"
                          : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      {item.isSubject ? "SIM" : "NÃO"}
                    </button>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-gray-500 text-xs font-bold">R$</span>
                      <CurrencyInput
                        value={item.value}
                        onChange={(val) => onUpdate(item.id, "value", val)}
                        ariaLabel={`Valor de ${item.label}`}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-right text-primary font-bold"
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
              <tr className="bg-primary/5 font-bold">
                <td className="table-cell" colSpan={2}>
                  TOTAL DOS RENDIMENTOS (sem lucros e dividendos — ver tabela de fontes)
                </td>
                <td className="table-cell text-right text-primary text-lg" colSpan={2}>
                  {formatCurrency(totalGrossIncome)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ShowAllRowsToggle showAll={showAll} hiddenCount={hiddenCount} onToggle={() => setShowAll((v) => !v)} />
      </div>
    </div>
  );
}
