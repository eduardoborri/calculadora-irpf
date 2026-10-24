import { Fragment, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
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

const cellInput = "w-full bg-transparent border-none focus:ring-0 p-0 text-right text-primary font-semibold text-sm";
const fieldBox = "flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded focus-within:ring-2 focus-within:ring-secondary/40";

export default function DividendSourcesTable({ sources, summary, onAdd, onRemove, onUpdate }: DividendSourcesTableProps) {
  const resultById = new Map(summary.perSource.map((r) => [r.id, r]));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="section-title">Lucros e dividendos por fonte pagadora</h2>
        <button onClick={onAdd} className="text-action">
          <Plus className="w-4 h-4" />
          Adicionar fonte
        </button>
      </div>

      <p className="text-sm text-text-gray leading-relaxed max-w-[72ch]">
        Só a parcela posterior a 2025 entra na base, gera retenção e redutor do art. 16-B. Por padrão, tudo é tratado como posterior: informe na
        coluna amarela o que foi deliberado até 31/12/2025. Abra a linha para informar os dados da PJ.
      </p>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr>
                <th className="table-header w-8"></th>
                <th className="table-header">Fonte pagadora</th>
                <th className="table-header text-right w-36">Total recebido</th>
                <th className="table-header text-right w-36">Deliberado até 2025</th>
                <th className="table-header text-right w-36">Posterior (sujeito)</th>
                <th className="table-header text-right w-32">Redutor</th>
                <th className="table-header text-center w-24">Retenção 10%</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-gray-500 py-6" colSpan={8}>
                    Nenhuma fonte cadastrada. Importe a declaração ou adicione manualmente.
                  </td>
                </tr>
              )}
              {sources.map((source) => {
                const r = resultById.get(source.id);
                const isOpen = expanded.has(source.id);
                const invalid = source.protectedAmount > source.total || source.protectedAmount < 0;
                return (
                  <Fragment key={source.id}>
                    <tr className={`border-b border-gray-100 align-top ${isOpen ? "bg-paper" : "hover:bg-paper/60"}`}>
                      <td className="table-cell">
                        {!source.isAggregate && (
                          <button
                            onClick={() => toggle(source.id)}
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Recolher" : "Expandir"} dados da PJ de ${source.name}`}
                            className="p-1 rounded text-secondary hover:bg-paper cursor-pointer"
                          >
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={source.name}
                          aria-label="Nome da fonte pagadora"
                          onChange={(e) => onUpdate(source.id, "name", e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-primary font-medium text-sm"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {source.cnpj && <span className="text-xs text-gray-500">{source.cnpj}</span>}
                          {source.isSimples && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary">Simples Nacional</span>
                          )}
                          {source.isAggregate && <span className="text-xs text-gray-500">Agrupamento — sem redutor</span>}
                          {r?.missingPjData && (
                            <button
                              onClick={() => !isOpen && toggle(source.id)}
                              className="text-xs font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent flex items-center gap-1 cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3" /> Sem dados da PJ — redutor zerado
                            </button>
                          )}
                          {invalid && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                              Parcela protegida maior que o total
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <CurrencyInput
                          value={source.total}
                          onChange={(v) => onUpdate(source.id, "total", v)}
                          ariaLabel={`Total recebido de ${source.name}`}
                          className={cellInput}
                        />
                      </td>
                      <td className="table-cell bg-yellow-50">
                        <CurrencyInput
                          value={source.protectedAmount}
                          onChange={(v) => onUpdate(source.id, "protectedAmount", v)}
                          ariaLabel={`Parcela deliberada até 2025 de ${source.name}`}
                          className={cellInput}
                        />
                      </td>
                      <td className="table-cell text-right text-sm font-semibold text-primary">{formatCurrency(r?.posterior ?? 0)}</td>
                      <td className="table-cell text-right text-sm font-semibold text-secondary">{r && r.redutor > 0 ? formatCurrency(r.redutor) : "—"}</td>
                      <td className="table-cell text-center">
                        <input
                          type="checkbox"
                          checked={source.withholding}
                          onChange={(e) => onUpdate(source.id, "withholding", e.target.checked)}
                          aria-label={`Retenção de 10% na fonte para ${source.name}`}
                          className="w-4 h-4 accent-primary"
                          title="Marque se os pagamentos desta fonte superam R$ 50 mil no mês (retenção de 10% sobre a parcela posterior)"
                        />
                      </td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => onRemove(source.id)}
                          aria-label={`Excluir fonte ${source.name}`}
                          className="p-1 text-gray-500 hover:text-accent rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {isOpen && !source.isAggregate && (
                      <tr className="border-b border-rule bg-paper">
                        <td></td>
                        <td className="px-4 pb-4 pt-1" colSpan={7}>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-primary">Lucro contábil da PJ (antes de IRPJ/CSLL)</span>
                              <div className={fieldBox}>
                                <span className="text-xs text-gray-500 font-semibold">R$</span>
                                <CurrencyInput value={source.pjProfit} onChange={(v) => onUpdate(source.id, "pjProfit", v)} className={cellInput} />
                              </div>
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-primary">IRPJ + CSLL devidos</span>
                              <div className={fieldBox}>
                                <span className="text-xs text-gray-500 font-semibold">R$</span>
                                <CurrencyInput value={source.pjTax} onChange={(v) => onUpdate(source.id, "pjTax", v)} className={cellInput} />
                              </div>
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-primary">Setor (alíquota nominal)</span>
                              <select
                                value={source.nominalRate}
                                onChange={(e) => onUpdate(source.id, "nominalRate", parseFloat(e.target.value))}
                                className="w-full text-sm px-3 py-2 border border-yellow-200 rounded bg-yellow-50 text-primary"
                              >
                                {PJ_NOMINAL_RATES.map((rate) => (
                                  <option key={rate.value} value={rate.value}>
                                    {rate.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-primary">CNPJ</span>
                              <input
                                type="text"
                                value={source.cnpj}
                                placeholder="00.000.000/0000-00"
                                onChange={(e) => onUpdate(source.id, "cnpj", e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded bg-white text-primary"
                              />
                            </label>
                            <label className="flex items-center gap-2 pt-6 text-sm text-primary">
                              <input
                                type="checkbox"
                                checked={source.isSimples}
                                onChange={(e) => onUpdate(source.id, "isSimples", e.target.checked)}
                                className="w-4 h-4 accent-primary"
                              />
                              Empresa do Simples Nacional
                            </label>
                            <div className="text-sm text-primary bg-white rounded border border-rule p-3 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-text-gray">Alíquota efetiva</span>
                                <strong className="font-semibold">
                                  {r?.effectiveRate === null || r === undefined ? "—" : formatPercent(r.effectiveRate)}
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-gray">% do redutor</span>
                                <strong className="font-semibold">{formatPercent(r?.redutorRate ?? 0)}</strong>
                              </div>
                            </div>
                          </div>
                          {source.note && <p className="text-xs text-secondary mt-3 leading-snug">{source.note}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td></td>
                <td>Total</td>
                <td className="text-right tabular-nums">{formatCurrency(summary.total)}</td>
                <td className="text-right tabular-nums">{formatCurrency(summary.protectedTotal)}</td>
                <td className="text-right tabular-nums">{formatCurrency(summary.posteriorTotal)}</td>
                <td className="text-right tabular-nums text-secondary">{formatCurrency(summary.redutorPotential)}</td>
                <td className="text-right tabular-nums" colSpan={2}>
                  {summary.withholdingTotal > 0 ? formatCurrency(summary.withholdingTotal) : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {summary.sourcesMissingPjData > 0 && (
        <p className="text-sm text-accent flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          {summary.sourcesMissingPjData} fonte(s) com dividendo sujeito sem dados da PJ — o redutor dessas fontes está zerado.
        </p>
      )}
    </section>
  );
}
