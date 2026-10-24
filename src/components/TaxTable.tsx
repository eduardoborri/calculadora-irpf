import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { EXCLUSIVE_TAX_ID, PRESUMED_EXCLUSIVE_TAX_RATE } from "../constants";
import { TaxPaymentItem } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import CurrencyInput from "./shared/CurrencyInput";
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

export default function TaxTable({ items, totalTaxPaid, presumedExclusiveTax, dividendWithholding, onAdd, onRemove, onUpdate }: TaxTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-xl border border-secondary/10">
        <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
          <ReceiptText className="w-6 h-6" />
          2. Imposto Pago e Retenções
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-all active:scale-95 shadow-sm"
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
                <th className="table-header bg-secondary">Descrição do Imposto Pago</th>
                <th className="table-header bg-secondary text-right w-48">Valor (R$)</th>
                <th className="table-header bg-secondary w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => onUpdate(item.id, "label", e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-primary font-medium text-sm"
                      />
                      <Tooltip text={item.description} />
                    </div>
                    {item.id === EXCLUSIVE_TAX_ID && presumedExclusiveTax > 0 && (
                      <p className="mt-1 text-[11px] font-medium text-secondary">
                        Não informado — presumido {formatPercent(PRESUMED_EXCLUSIVE_TAX_RATE)} sobre os rendimentos de tributação
                        exclusiva/definitiva: {formatCurrency(presumedExclusiveTax)} (já incluído no total)
                      </p>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-gray-400 text-xs font-bold">R$</span>
                      <CurrencyInput
                        value={item.value}
                        onChange={(val) => onUpdate(item.id, "value", val)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-right text-primary font-bold"
                      />
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <button onClick={() => onRemove(item.id)} className="p-1 text-gray-300 hover:text-red-500 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {dividendWithholding > 0 && (
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <td className="table-cell text-sm text-primary font-medium">
                    Retenção de 10% sobre dividendos posteriores a 2025
                    <p className="text-[11px] text-secondary">Calculada na tabela de fontes pagadoras (fontes marcadas com retenção).</p>
                  </td>
                  <td className="table-cell text-right text-primary font-bold">{formatCurrency(dividendWithholding)}</td>
                  <td className="table-cell"></td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/5 font-bold">
                <td className="table-cell">TOTAL DO IMPOSTO PAGO</td>
                <td className="table-cell text-right text-secondary text-lg" colSpan={2}>
                  {formatCurrency(totalTaxPaid)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
