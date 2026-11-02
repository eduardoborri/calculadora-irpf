import { SimulationResult } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import CurrencyInput from "./shared/CurrencyInput";
import SimSliderField from "./shared/SimSliderField";

export interface SimulatorState {
  simPeriod: "annual" | "monthly";
  simTaxableIncome: number;
  simFinancialIncome: number;
  simRuralIncome: number;
  simTaxedDividends: number;
  simExemptDividends: number;
  simDeductionMode: "simplified" | "complete";
  simDependents: number;
  simOtherDeductions: number;
}

interface SimulatorProps extends SimulatorState {
  simResults: SimulationResult;
  onPeriodChange: (period: "annual" | "monthly") => void;
  onTaxableIncomeChange: (val: number) => void;
  onFinancialIncomeChange: (val: number) => void;
  onRuralIncomeChange: (val: number) => void;
  onTaxedDividendsChange: (val: number) => void;
  onExemptDividendsChange: (val: number) => void;
  onDeductionModeChange: (mode: "simplified" | "complete") => void;
  onDependentsChange: (val: number) => void;
  onOtherDeductionsChange: (val: number) => void;
  onApplySimulation: () => void;
  onExportPdf: () => void;
}

interface ResultLine {
  operator: string;
  label: string;
  value: string;
  note?: string;
  ruled?: boolean;
}

// Same language as the apuração: plain section headings over white panels on
// the left, and the answer on the right as a running calculation in the
// petróleo panel, pinned while the sliders move. On a phone the answer comes
// first.
export default function Simulator({
  simPeriod,
  simTaxableIncome,
  simFinancialIncome,
  simRuralIncome,
  simTaxedDividends,
  simExemptDividends,
  simDeductionMode,
  simDependents,
  simOtherDeductions,
  simResults,
  onPeriodChange,
  onTaxableIncomeChange,
  onFinancialIncomeChange,
  onRuralIncomeChange,
  onTaxedDividendsChange,
  onExemptDividendsChange,
  onDeductionModeChange,
  onDependentsChange,
  onOtherDeductionsChange,
  onApplySimulation,
  onExportPdf,
}: SimulatorProps) {
  const isAnnual = simPeriod === "annual";
  const incomeMax = isAnnual ? 50000000 : 4166666;
  const incomeStep = isAnnual ? 50000 : 5000;
  const dividendMax = isAnnual ? 100000000 : 8333333;
  const dividendStep = isAnnual ? 100000 : 10000;
  const r = simResults;

  const lines: ResultLine[] = [
    { operator: "", label: "Base do IRPF mínimo", value: formatCurrency(r.minimumBase), note: "Rendimentos tributáveis, aplicações, atividade rural e dividendos posteriores a 2025." },
    { operator: "×", label: "Alíquota mínima", value: formatPercent(r.minimumRate) },
    { operator: "=", label: "IRPF mínimo exigido", value: formatCurrency(r.minimumTaxDue), ruled: true },
    {
      operator: "−",
      label: "IRPF pela tabela progressiva",
      value: formatCurrency(r.standardTaxDue),
      note: `Tabela sobre ${formatCurrency(r.netBase)}, mais 15% das aplicações e 5,5% da atividade rural. Efetiva de ${formatPercent(
        r.standardEffectiveRate / 100
      )}.`,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="section-title">Simulação por faixas de renda</h2>
          <p className="text-sm text-text-gray max-w-[72ch]">
            Compara o IRPF pela tabela progressiva com o IRPF mínimo da Lei nº 15.270/2025 para uma composição estimada de rendas.
          </p>
        </div>
        <div className="segmented self-start md:self-auto" role="group" aria-label="Período da simulação">
          <button type="button" aria-pressed={isAnnual} onClick={() => onPeriodChange("annual")}>
            Anual
          </button>
          <button type="button" aria-pressed={!isAnnual} onClick={() => onPeriodChange("monthly")} title="Valores mensais, só como referência">
            Mensal (referência)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 items-start">
        <aside className="lg:order-2 lg:sticky lg:top-6 bg-primary text-white rounded-lg p-6 space-y-5" aria-label="Resultado da simulação">
          <h3 className="text-[21px] font-semibold leading-tight">Resultado da simulação</h3>

          <ol className="space-y-2">
            {lines.map((line) => (
              <li key={line.label} className={line.ruled ? "border-t border-white/20 pt-2" : ""}>
                <div className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-2">
                  <span className="text-xl text-white/60 text-center" aria-hidden="true">
                    {line.operator}
                  </span>
                  <span className="text-sm text-white/85">{line.label}</span>
                  <span className="text-base font-semibold tabular-nums">{line.value}</span>
                </div>
                {line.note && <p className="ml-8 mt-0.5 text-xs text-white/70 leading-relaxed">{line.note}</p>}
              </li>
            ))}
          </ol>

          <div className="border-t-[3px] border-double border-white/30 pt-4 grid grid-cols-[1.5rem_1fr] gap-2 items-baseline">
            <span className="text-2xl text-white/60 text-center" aria-hidden="true">
              =
            </span>
            <div>
              <p className="text-sm text-white/85">IRPF-M adicional</p>
              <p className="mt-1 text-[32px] leading-none font-semibold tabular-nums">{formatCurrency(r.additionalMinTax)}</p>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                {r.additionalMinTax > 0
                  ? `A tabela progressiva fica ${formatCurrency(r.additionalMinTax)} abaixo do mínimo exigido.`
                  : `A tabela progressiva já supera o mínimo em ${formatCurrency(r.standardTaxDue - r.minimumTaxDue)}.`}{" "}
                Imposto total de {formatCurrency(r.totalCombinedTax)}, efetiva de {formatPercent(r.finalEffectiveRate / 100)}.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onApplySimulation}
              className="w-full px-4 py-2.5 rounded bg-white text-primary text-sm font-semibold hover:bg-paper cursor-pointer"
            >
              Aplicar valores na apuração
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="w-full px-4 py-2.5 rounded border border-white/40 text-sm font-semibold hover:bg-white/10 cursor-pointer"
            >
              Exportar relatório em PDF
            </button>
          </div>
        </aside>

        <div className="lg:order-1 space-y-12 min-w-0">
          <section className="space-y-3">
            <h3 className="section-title">Rendimentos estimados</h3>
            <div className="card px-6 divide-y divide-rule/60">
              <SimSliderField
                label="Rendimentos tributáveis (tabela progressiva)"
                description="Salários, pró-labore, consultorias e aluguéis. Sujeitos à tabela progressiva e incluídos na base do IRPF mínimo."
                value={simTaxableIncome}
                onChange={onTaxableIncomeChange}
                max={incomeMax}
                step={incomeStep}
                quickIncrements={[10000, 50000, 100000]}
                isAnnual={isAnnual}
              />
              <SimSliderField
                label="Aplicações financeiras (15% definitivo)"
                description="Renda fixa e fundos com imposto retido à alíquota definitiva de 15%. Incluídas na base do IRPF mínimo."
                value={simFinancialIncome}
                onChange={onFinancialIncomeChange}
                max={incomeMax}
                step={incomeStep}
                quickIncrements={[10000, 50000, 100000]}
                isAnnual={isAnnual}
              />
              <SimSliderField
                label="Atividade rural (5,5%)"
                description="Resultado da exploração agropecuária ou pesqueira, à alíquota efetiva padrão de 5,5%. Incluída na base do IRPF mínimo."
                value={simRuralIncome}
                onChange={onRuralIncomeChange}
                max={incomeMax}
                step={incomeStep}
                quickIncrements={[10000, 50000, 100000]}
                isAnnual={isAnnual}
              />
              <SimSliderField
                label="Dividendos posteriores a 2025"
                description="Deliberados a partir de 2026, sujeitos à retenção na fonte e incluídos integralmente na base do IRPF mínimo."
                value={simTaxedDividends}
                onChange={onTaxedDividendsChange}
                max={dividendMax}
                step={dividendStep}
                quickIncrements={[100000, 500000, 1000000]}
                isAnnual={isAnnual}
              />
              <SimSliderField
                label="Dividendos isentos"
                description="Deliberados até 2025, ou abaixo de R$ 50 mil por mês e sem retenção. Fora do IRPF ordinário e do IRPF mínimo."
                value={simExemptDividends}
                onChange={onExemptDividendsChange}
                max={dividendMax}
                step={dividendStep}
                quickIncrements={[100000, 500000, 1000000]}
                isAnnual={isAnnual}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="section-title">Deduções da tabela progressiva</h3>
              <div className="segmented self-start" role="group" aria-label="Modelo de dedução">
                <button type="button" aria-pressed={simDeductionMode === "simplified"} onClick={() => onDeductionModeChange("simplified")}>
                  Desconto simplificado
                </button>
                <button type="button" aria-pressed={simDeductionMode === "complete"} onClick={() => onDeductionModeChange("complete")}>
                  Deduções completas
                </button>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              {simDeductionMode === "simplified" ? (
                <p className="text-sm text-text-gray leading-relaxed">
                  {isAnnual
                    ? "Desconto de 20% sobre os rendimentos tributáveis, limitado a R$ 16.754,34 na declaração simplificada."
                    : "Desconto mensal fixo de R$ 564,80."}
                </p>
              ) : (
                <>
                  <label className="block space-y-2">
                    <span className="flex justify-between text-sm font-semibold text-primary">
                      <span>Dependentes</span>
                      <span className="tabular-nums">{simDependents}</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={simDependents}
                      onChange={(e) => onDependentsChange(parseInt(e.target.value) || 0)}
                      className="w-full accent-primary h-2 cursor-pointer"
                    />
                    <span className="block text-xs text-text-gray">{formatCurrency(isAnnual ? 2275.08 : 189.59)} por dependente.</span>
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-sm font-semibold text-primary">Outras deduções estimadas (educação, saúde etc.)</span>
                    <span className="flex items-center gap-2 px-3 py-2 bg-white border border-rule rounded">
                      <span className="text-gray-500 font-semibold text-xs">R$</span>
                      <CurrencyInput
                        value={simOtherDeductions}
                        onChange={onOtherDeductionsChange}
                        ariaLabel="Outras deduções estimadas"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-primary text-sm font-semibold"
                      />
                    </span>
                  </label>
                </>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-rule/60 text-sm">
                <span className="text-text-gray">Dedução considerada</span>
                <span className="font-semibold text-primary tabular-nums">{formatCurrency(r.deductionAmount)}</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="section-title">Tabela progressiva</h3>
              <p className="text-sm text-text-gray">
                {isAnnual ? "Tabela anual de ajuste" : "Tabela mensal"} da Receita Federal. Base após deduções de {formatCurrency(r.netBase)}, na faixa{" "}
                {r.activeBracketIndex + 1}.
              </p>
            </div>
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="table-header">Faixa</th>
                      <th className="table-header">Base de cálculo</th>
                      <th className="table-header text-right">Alíquota</th>
                      <th className="table-header text-right">Parcela a deduzir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.brackets.map((br, index) => {
                      const previousLimit = index === 0 ? 0 : r.brackets[index - 1].limit;
                      const isActive = index === r.activeBracketIndex;
                      return (
                        <tr
                          key={br.id}
                          aria-current={isActive ? "true" : undefined}
                          className={isActive ? "bg-secondary/10 font-semibold text-primary" : "text-ink"}
                        >
                          <td className="table-cell whitespace-nowrap">{index + 1}</td>
                          <td className="table-cell">
                            {index === 0
                              ? `Até ${formatCurrency(br.limit)}`
                              : br.limit === Infinity
                                ? `Acima de ${formatCurrency(previousLimit)}`
                                : `De ${formatCurrency(previousLimit + 0.01)} a ${formatCurrency(br.limit)}`}
                          </td>
                          <td className="table-cell text-right tabular-nums">{br.rate === 0 ? "Isento" : formatPercent(br.rate)}</td>
                          <td className="table-cell text-right tabular-nums">{br.deduction === 0 ? "—" : formatCurrency(br.deduction)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-text-gray">Alíquotas e deduções conforme a legislação vigente. O desconto é aplicado antes do enquadramento.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
