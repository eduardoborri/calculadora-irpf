import { AlertTriangle, Landmark, Plus, Trash2 } from "lucide-react";
import { PJ_NOMINAL_RATES } from "../constants";
import { DividendSource, DividendSummary } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import CurrencyInput from "./shared/CurrencyInput";

interface DividendSourcesTableProps {
  sources: DividendSource[];
  summary: DividendSummary;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof DividendSource, value: any) => void;
}

const cellInput = "w-full bg-transparent border-none focus:ring-0 p-0 text-right text-primary font-bold text-xs";

export default function DividendSourcesTable({ sources, summary, onAdd, onRemove, onUpdate }: DividendSourcesTableProps) {
  const resultById = new Map(summary.perSource.map((r) => [r.id, r]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Landmark className="w-6 h-6" />
          3. Lucros e Dividendos por Fonte Pagadora (Redutor Art. 16-B)
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Fonte
        </button>
      </div>

      <p className="text-xs text-text-gray leading-relaxed">
        Uma linha por fonte pagadora. Só a parcela <strong>posterior a 2025</strong> entra na base do IRPF mínimo, gera retenção e redutor; a
        parcela <strong>deliberada até 31/12/2025</strong> fica protegida. Por padrão, tudo é alocado como posterior. Redutor por fonte =
        parcela posterior × máx(0; alíquota efetiva da PJ + alíquota do IRPF mínimo − alíquota nominal do setor).
      </p>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr>
                <th className="table-header">Fonte pagadora</th>
                <th className="table-header text-right w-32">Total recebido</th>
                <th className="table-header text-right w-32">Deliberado até 2025</th>
                <th className="table-header text-right w-32">Posterior (sujeito)</th>
                <th className="table-header text-right w-32">Lucro da PJ</th>
                <th className="table-header text-right w-32">IRPJ + CSLL</th>
                <th className="table-header text-center w-40">Setor (nominal)</th>
                <th className="table-header text-right w-24">Alíq. efetiva</th>
                <th className="table-header text-right w-32">Redutor</th>
                <th className="table-header text-center w-20">Retenção 10%</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-gray-400 text-xs py-6" colSpan={11}>
                    Nenhuma fonte cadastrada. Importe a declaração ou adicione manualmente.
                  </td>
                </tr>
              )}
              {sources.map((source) => {
                const r = resultById.get(source.id);
                const invalid = source.protectedAmount > source.total || source.protectedAmount < 0;
                return (
                  <tr key={source.id} className="border-b border-gray-100 last:border-0 align-top hover:bg-gray-50">
                    <td className="table-cell">
                      <input
                        type="text"
                        value={source.name}
                        onChange={(e) => onUpdate(source.id, "name", e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-primary font-medium text-sm"
                      />
                      {!source.isAggregate && (
                        <input
                          type="text"
                          value={source.cnpj}
                          placeholder="CNPJ"
                          onChange={(e) => onUpdate(source.id, "cnpj", e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-400 text-[11px]"
                        />
                      )}
                      <label className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                        <input
                          type="checkbox"
                          checked={source.isSimples}
                          disabled={source.isAggregate}
                          onChange={(e) => onUpdate(source.id, "isSimples", e.target.checked)}
                          className="w-3 h-3 accent-primary"
                        />
                        Simples Nacional
                      </label>
                      {source.note && <p className="text-[10px] text-secondary mt-1 leading-snug">{source.note}</p>}
                      {r?.missingPjData && (
                        <p className="text-[10px] text-accent mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Sem dados da PJ: redutor zerado.
                        </p>
                      )}
                      {invalid && <p className="text-[10px] text-accent mt-1">Parcela protegida maior que o total.</p>}
                    </td>
                    <td className="table-cell">
                      <CurrencyInput value={source.total} onChange={(v) => onUpdate(source.id, "total", v)} className={cellInput} />
                    </td>
                    <td className="table-cell bg-yellow-50">
                      <CurrencyInput
                        value={source.protectedAmount}
                        onChange={(v) => onUpdate(source.id, "protectedAmount", v)}
                        className={cellInput}
                      />
                    </td>
                    <td className="table-cell text-right text-xs font-bold text-primary">{formatCurrency(r?.posterior ?? 0)}</td>
                    {source.isAggregate ? (
                      <td className="table-cell text-center text-[10px] text-gray-400" colSpan={4}>
                        Agrupamento de fontes pequenas — sem redutor
                      </td>
                    ) : (
                      <>
                        <td className="table-cell bg-yellow-50">
                          <CurrencyInput value={source.pjProfit} onChange={(v) => onUpdate(source.id, "pjProfit", v)} className={cellInput} />
                        </td>
                        <td className="table-cell bg-yellow-50">
                          <CurrencyInput value={source.pjTax} onChange={(v) => onUpdate(source.id, "pjTax", v)} className={cellInput} />
                        </td>
                        <td className="table-cell">
                          <select
                            value={source.nominalRate}
                            onChange={(e) => onUpdate(source.id, "nominalRate", parseFloat(e.target.value))}
                            className="w-full text-[10px] py-1 border border-primary/20 rounded bg-white text-primary"
                          >
                            {PJ_NOMINAL_RATES.map((rate) => (
                              <option key={rate.value} value={rate.value}>
                                {rate.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="table-cell text-right text-xs">
                          {r?.effectiveRate === null || r === undefined ? "—" : formatPercent(r.effectiveRate)}
                        </td>
                      </>
                    )}
                    <td className="table-cell text-right text-xs font-bold text-accent">{r && r.redutor > 0 ? formatCurrency(r.redutor) : "—"}</td>
                    <td className="table-cell text-center">
                      <input
                        type="checkbox"
                        checked={source.withholding}
                        onChange={(e) => onUpdate(source.id, "withholding", e.target.checked)}
                        className="w-4 h-4 accent-primary"
                        title="Marque se os pagamentos desta fonte superam R$ 50 mil no mês (retenção de 10% sobre a parcela posterior)"
                      />
                    </td>
                    <td className="table-cell text-center">
                      <button onClick={() => onRemove(source.id)} className="p-1 text-gray-300 hover:text-red-500 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-primary/5 font-bold text-xs">
                <td className="table-cell">TOTAL</td>
                <td className="table-cell text-right">{formatCurrency(summary.total)}</td>
                <td className="table-cell text-right">{formatCurrency(summary.protectedTotal)}</td>
                <td className="table-cell text-right text-primary">{formatCurrency(summary.posteriorTotal)}</td>
                <td className="table-cell" colSpan={4}></td>
                <td className="table-cell text-right text-accent">{formatCurrency(summary.redutorPotential)}</td>
                <td className="table-cell text-right" colSpan={2}>
                  {summary.withholdingTotal > 0 ? formatCurrency(summary.withholdingTotal) : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {summary.sourcesMissingPjData > 0 && (
        <p className="text-xs text-accent flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          {summary.sourcesMissingPjData} fonte(s) com dividendo sujeito sem dados da PJ — o redutor dessas fontes está zerado.
        </p>
      )}
    </div>
  );
}
