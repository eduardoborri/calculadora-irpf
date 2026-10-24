import { motion } from "motion/react";
import { Download, FileText, Plus, Settings2, ShieldCheck, TrendingUp } from "lucide-react";
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

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      {/* Description Card */}
      <div className="card p-6 border-l-4 border-primary bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            Simulador de Impacto por Alíquota IRPF
          </h3>
          <p className="text-sm text-text-gray font-medium">
            Simule diferentes composições de rendimentos tributáveis e isentos para analisar instantaneamente as alíquotas efetivas e impactos sob a
            legislação ordinária do IRPF frente ao IRPF Mínimo (GSGA-PR / Lei 15.270/2025).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPeriodChange("annual")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
              isAnnual ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            ANUAL (Exercício)
          </button>
          <button
            onClick={() => onPeriodChange("monthly")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
              !isAnnual ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            MENSAL (Referência)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Parameter Controls - 5 Cols */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card p-6 space-y-6 bg-white">
            <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary text-sm">Ajuste de rendimentos</h3>
            </div>

            <SimSliderField
              label="Rendimentos Tributados (Alíquota Progressiva)"
              description="Provável base sob salários, pró-labore, consultorias e aluguéis. Sujeita à tabela progressiva ordinária e contemplada no IRPF Mínimo."
              value={simTaxableIncome}
              onChange={onTaxableIncomeChange}
              max={incomeMax}
              step={incomeStep}
              quickIncrements={[10000, 50000, 100000]}
              isAnnual={isAnnual}
              withTopBorder={false}
            />

            <SimSliderField
              label="Aplicações Financeiras (Tributado a 15%)"
              description="Rendimentos de investimentos financeiros de renda fixa e fundos com IR retido sob alíquota definitiva de 15%. Contemplados no IRPF Mínimo."
              value={simFinancialIncome}
              onChange={onFinancialIncomeChange}
              max={incomeMax}
              step={incomeStep}
              quickIncrements={[10000, 50000, 100000]}
              isAnnual={isAnnual}
            />

            <SimSliderField
              label="Atividade Rural (Tributado a 5,5%)"
              description="Ganhos líquidos apurados da exploração pesqueira ou agropecuária rural. Alíquota padrão efetiva de 5,5%. Contemplados no IRPF Mínimo."
              value={simRuralIncome}
              onChange={onRuralIncomeChange}
              max={incomeMax}
              step={incomeStep}
              quickIncrements={[10000, 50000, 100000]}
              isAnnual={isAnnual}
            />

            <SimSliderField
              label="Lucros e Dividendos Tributados (Retenção do IRPF mínimo, pós dez/2025)"
              description="Dividendos deliberados após dezembro de 2025 sujeitos à retenção na fonte do IRPF Mínimo. Contemplados integralmente na base de cálculo do IRPF Mínimo."
              value={simTaxedDividends}
              onChange={onTaxedDividendsChange}
              max={dividendMax}
              step={dividendStep}
              quickIncrements={[100000, 500000, 1000000]}
              isAnnual={isAnnual}
              accent="secondary"
            />

            <SimSliderField
              label="Lucros e Dividendos Isentos (Pré-2026 ou < R$ 50 mil mensais)"
              description="Rendimentos pré-2026 ou sem retenção por estarem abaixo de R$ 50 mil mensais. Totalmente isentos do IRPF ordinário e do IRPF Mínimo."
              value={simExemptDividends}
              onChange={onExemptDividendsChange}
              max={dividendMax}
              step={dividendStep}
              quickIncrements={[100000, 500000, 1000000]}
              isAnnual={isAnnual}
              accent="secondary"
            />
          </div>

          {/* Deductions parameter Card */}
          <div className="card p-6 space-y-6 bg-white">
            <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              <h3 className="font-bold text-primary text-sm">Deduções Básicas (IRPF Comum)</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <button
                onClick={() => onDeductionModeChange("simplified")}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  simDeductionMode === "simplified" ? "bg-white text-primary shadow-sm font-extrabold" : "text-gray-500 hover:text-gray-600"
                }`}
              >
                Desconto Simplificado (20%)
              </button>
              <button
                onClick={() => onDeductionModeChange("complete")}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  simDeductionMode === "complete" ? "bg-white text-primary shadow-sm font-extrabold" : "text-gray-500 hover:text-gray-600"
                }`}
              >
                Deduções Completas
              </button>
            </div>

            {simDeductionMode === "simplified" ? (
              <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl space-y-2">
                <span className="text-xs font-bold text-primary uppercase">Regra de simplificação aplicada:</span>
                <p className="text-xs text-text-gray leading-relaxed">
                  {isAnnual
                    ? "Desconto automático linear de 20% aplicável aos rendimentos, fixado e limitado ao teto anual federal máximo de R$ 16.754,34 na Declaração Simplificada."
                    : "Desconto padrão mensal fixo no valor de R$ 564,80 para composição direta da renda mensal líquida."}
                </p>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-primary/10">
                  <span className="font-semibold text-text-gray">Dedução calculada:</span>
                  <span className="font-bold text-primary">{formatCurrency(simResults.deductionAmount)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-primary">
                    <span>Dependentes</span>
                    <span>
                      {simDependents} {simDependents === 1 ? "dependente" : "dependentes"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={simDependents}
                      onChange={(e) => onDependentsChange(parseInt(e.target.value) || 0)}
                      className="flex-1 accent-primary h-2 bg-gray-100 rounded-lg cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-text-gray">
                    Desconto dedutível de {formatCurrency(isAnnual ? 2275.08 : 189.59)} por dependente registrado.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary">Outras Deduções Estimadas (Educação, Saúde etc.)</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-gray-500 font-bold text-xs">R$</span>
                    <CurrencyInput
                      value={simOtherDeductions}
                      onChange={onOtherDeductionsChange}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-primary text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-secondary/5 border border-secondary/15 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-secondary uppercase">Abatimento Geral Total:</span>
                  <span className="font-extrabold text-secondary text-sm">{formatCurrency(simResults.deductionAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparisons & Chart - 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Comparative highlight decks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Progressive card */}
            <div className="card p-5 bg-white border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <span className="text-xs opacity-70 font-bold uppercase tracking-wider text-primary">Análise IRPF</span>
                <h4 className="text-sm font-extrabold text-primary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Tabela Ordinária Geral
                </h4>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-text-gray font-medium">Base de cálculo líquida:</span>
                <p className="text-base font-bold text-primary">{formatCurrency(simResults.netBase)}</p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-xs text-text-gray block font-medium">Alíquota Efetiva:</span>
                  <span className="text-xs font-black bg-primary/5 text-primary px-2 py-0.5 rounded">
                    {formatPercent(simResults.standardEffectiveRate / 100)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-gray block font-medium">Imposto de Renda:</span>
                  <span className="text-lg font-black text-primary">{formatCurrency(simResults.standardTaxDue)}</span>
                </div>
              </div>
            </div>

            {/* GSGA-PR Minimum card */}
            <div className="card p-5 bg-white border border-secondary/25 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <span className="text-xs opacity-70 font-bold uppercase tracking-wider text-secondary">REGRA MINÍMA LEGAL</span>
                <h4 className="text-sm font-extrabold text-secondary flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  IRPF Mínimo (GSGA-PR)
                </h4>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-text-gray font-medium">Base de cálculo global:</span>
                <p className="text-base font-bold text-secondary">{formatCurrency(simResults.minimumBase)}</p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-xs text-text-gray block font-medium">Piso Legal Efetivo:</span>
                  <span className="text-xs font-black bg-secondary/5 text-secondary px-2 py-0.5 rounded">
                    {formatPercent(simResults.minimumRate)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-gray block font-medium">Exigência Mínima:</span>
                  <span className="text-lg font-black text-secondary">{formatCurrency(simResults.minimumTaxDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conclusion compare card */}
          <div
            className={`p-6 rounded-2xl shadow-md border ${
              simResults.additionalMinTax > 0 ? "bg-accent text-white border-accent/15" : "bg-secondary text-white border-secondary/40"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2.5 rounded-xl">
                {simResults.additionalMinTax > 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <ShieldCheck className="w-6 h-6 text-white" />}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold tracking-[0.15em] opacity-85 text-white">Análise de Diferencial Obrigatório</span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                    {simResults.additionalMinTax > 0 ? "Adicional Devido" : "Cumprimento Concluído"}
                  </span>
                </div>

                {simResults.additionalMinTax > 0 ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white">Adicional de {formatCurrency(simResults.additionalMinTax)}</p>
                    <p className="text-xs leading-relaxed opacity-90 text-white font-medium">
                      O imposto devido pelas regras ordinárias e deduções do IRPF ({formatCurrency(simResults.standardTaxDue)}) não é suficiente para
                      atingir o piso mínimo exigido ({formatCurrency(simResults.minimumTaxDue)}). É gerado um adendo obrigatório para regularização da
                      diferença.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xl font-black text-white">Isento de Adicional Tributário!</p>
                    <p className="text-xs leading-relaxed opacity-90 text-white font-medium">
                      Sua contribuição ordinária no IRPF progressivo ({formatCurrency(simResults.standardTaxDue)}) já atende ou supera plenamente a cota
                      mínima legal de {formatPercent(simResults.minimumRate)} decretada ({formatCurrency(simResults.minimumTaxDue)}). Nenhum imposto extra
                      se aplica.
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-white/15 flex justify-between items-center text-xs font-bold text-white uppercase">
                  <span>imposto combinado consolidado:</span>
                  <span>
                    {formatCurrency(simResults.totalCombinedTax)} (Efetivo: {formatPercent(simResults.finalEffectiveRate / 100)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onExportPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              Salvar Relatório PDF Simplificado
            </button>
          </div>

          {/* Progress gauge visualizer */}
          <div className="card p-6 space-y-4 bg-white">
            <div className="flex justify-between items-center text-xs font-bold text-primary">
              <span>Enquadramento nas Alíquotas Progressivas (IRPF Geral)</span>
              <span className="text-xs text-text-gray font-medium">Base Deduzida: {formatCurrency(simResults.netBase)}</span>
            </div>

            <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200 flex shadow-inner">
              {simResults.brackets.map((br, index) => {
                const previousLimit = index === 0 ? 0 : simResults.brackets[index - 1].limit;
                const limit = br.limit === Infinity ? simResults.brackets[3].limit * 1.8 : br.limit;
                const bracketWidth = limit - previousLimit;
                const totalSpan = simResults.brackets[3].limit * 1.8;
                const percentWidth = (bracketWidth / totalSpan) * 100;

                let activePercentage = 0;
                if (simResults.netBase > previousLimit) {
                  const completedInBracket = Math.min(simResults.netBase - previousLimit, bracketWidth);
                  activePercentage = (completedInBracket / bracketWidth) * 100;
                }

                return (
                  <div key={br.id} className="relative h-full flex" style={{ width: `${percentWidth}%` }}>
                    <div
                      className={`absolute inset-0 border-r border-white/20 ${
                        index === simResults.activeBracketIndex ? "bg-primary/5" : "bg-gray-200/45"
                      }`}
                    />
                    {activePercentage > 0 && <div className="absolute inset-y-0 left-0 bg-primary/75" style={{ width: `${activePercentage}%` }} />}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-center leading-none">
              {simResults.brackets.map((br, index) => (
                <div
                  key={br.id}
                  className={`p-2 rounded transition-all ${
                    index === simResults.activeBracketIndex ? "bg-primary text-white scale-102 shadow font-bold" : "bg-gray-50 text-gray-500 text-xs"
                  }`}
                >
                  <div className="uppercase opacity-75 text-xs mb-0.5 select-none font-black">Faixa {index + 1}</div>
                  <div className="text-xs font-black">{br.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Precise bracket list with highlighted active state */}
          <div className="card p-6 space-y-4 bg-white">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <FileText className="w-4.5 h-4.5 text-primary" />
              <h4 className="font-extrabold text-primary text-xs uppercase tracking-wider">
                Tabela Progressiva Oficial RFB ({isAnnual ? "Tabela Anual de Ajuste" : "Tabela Mensal de Retenção"})
              </h4>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-2.5 text-primary font-bold">Faixa</th>
                    <th className="p-2.5 text-primary font-bold">Percentuais e Limites de Cálculo (R$)</th>
                    <th className="p-2.5 text-primary font-bold text-center">Alíquota</th>
                    <th className="p-2.5 text-primary font-bold text-right">Parcela a Deduzir</th>
                  </tr>
                </thead>
                <tbody>
                  {simResults.brackets.map((br, index) => {
                    const previousLimit = index === 0 ? 0 : simResults.brackets[index - 1].limit;
                    const isActive = index === simResults.activeBracketIndex;
                    return (
                      <tr
                        key={br.id}
                        className={`border-b border-gray-100 last:border-0 transition-all ${
                          isActive ? "bg-primary/5 font-extrabold text-primary border-l-4 border-l-primary" : "text-text-gray"
                        }`}
                      >
                        <td className="p-2.5">Faixa {index + 1}</td>
                        <td className="p-2.5">
                          {index === 0
                            ? `Até ${formatCurrency(br.limit)}`
                            : br.limit === Infinity
                            ? `Acima de ${formatCurrency(previousLimit)}`
                            : `De ${formatCurrency(previousLimit + 0.01)} a ${formatCurrency(br.limit)}`}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold ${isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>
                            {br.rate === 0 ? "Isento" : formatPercent(br.rate)}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs">{br.deduction === 0 ? "—" : formatCurrency(br.deduction)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-text-gray font-medium leading-relaxed max-w-sm">
                * Alíquotas e deduções conforme legislação vigente. O desconto simplificado é deduzido antes do enquadramento.
              </p>

              <button
                onClick={onApplySimulation}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-all shadow active:scale-95 text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                Aplicar Valores na Apuração
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
