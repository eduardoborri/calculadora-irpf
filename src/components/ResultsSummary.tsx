import { ChevronRight, Download, Info, TrendingUp } from "lucide-react";
import { CalculationResult } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import ResultWaterfall from "./ResultWaterfall";

interface ResultsSummaryProps {
  results: CalculationResult;
  onExportPdf: () => void;
}

export default function ResultsSummary({ results, onExportPdf }: ResultsSummaryProps) {
  return (
    <div className="card overflow-hidden sticky top-8 shadow-xl border-primary/20">
      <div className="bg-primary p-5 text-white">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Resumo da Apuração
        </h3>
      </div>
      <div className="p-6 space-y-5 bg-white">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-gray font-medium">Passo 1 - Base de Cálculo</span>
            <span className="font-bold text-primary">{formatCurrency(results.subjectBase)}</span>
          </div>
          {results.dividends.total > 0 && (
            <p className="text-xs text-text-gray -mt-2 text-right">
              inclui {formatCurrency(results.dividends.posteriorTotal)} de dividendos posteriores a 2025; protegidos (fora da base):{" "}
              {formatCurrency(results.dividends.protectedTotal)}
            </p>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-gray font-medium">Passo 2 - Alíquota Efetiva</span>
            <span className="font-bold text-primary">{formatPercent(results.minimumAliquot)}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
            <span className="text-text-gray font-medium">Passo 3 - IRPF Mínimo Devido</span>
            <span className="font-bold text-primary">{formatCurrency(results.minimumTaxDue)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-gray font-medium">Passo 4 - Imposto Pago/Retido</span>
            <span className="font-bold text-secondary">{formatCurrency(results.totalTaxPaid)}</span>
          </div>
          {results.presumedExclusiveTax > 0 && (
            <p className="text-xs text-text-gray -mt-2 text-right">
              inclui {formatCurrency(results.presumedExclusiveTax)} presumidos (15% s/ tributação exclusiva)
            </p>
          )}
          {results.reduction16B > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-gray font-medium">Passo 5 - Redução Art. 16-B</span>
              <span className="font-bold text-secondary">-{formatCurrency(results.reduction16B)}</span>
            </div>
          )}
        </div>

        <ResultWaterfall results={results} />

        <div className="pt-6 border-t-2 border-primary/10">
          {results.additionalTax > 0 ? (
            <div className="bg-accent text-white p-5 rounded-2xl shadow-lg shadow-accent/20">
              <p className="text-xs uppercase tracking-[0.2em] font-black opacity-70 mb-1">Adicional de IRPF Devido</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-black">{formatCurrency(results.additionalTax)}</p>
                <ChevronRight className="w-6 h-6 opacity-50" />
              </div>
            </div>
          ) : results.refund > 0 ? (
            <div className="bg-secondary text-white p-5 rounded-2xl shadow-lg shadow-secondary/20">
              <p className="text-xs uppercase tracking-[0.2em] font-black opacity-70 mb-1">Restituição a Receber</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-black">{formatCurrency(results.refund)}</p>
                <ChevronRight className="w-6 h-6 opacity-50" />
              </div>
            </div>
          ) : (
            <div className="bg-primary text-white p-5 rounded-2xl">
              <p className="text-xs uppercase tracking-[0.2em] font-black opacity-70 mb-1">Saldo de Imposto</p>
              <p className="text-3xl font-black">R$ 0,00</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            <Info className="w-4 h-4 text-secondary" />
            Regras Aplicadas
          </h4>
          <ul className="text-xs space-y-2 text-text-gray font-medium">
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>Isenção até R$ 600.000,00 de base de cálculo sujeita.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>Alíquota progressiva linear entre R$ 600k e R$ 1,2M (base sujeita).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>Teto de 10% para base sujeita acima de R$ 1,2M.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>Redução Art. 16-B limitada ao imposto devido (sem restituição).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>
                Redutor Art. 16-B calculado fonte a fonte = dividendos posteriores da fonte × (alíq. efetiva da PJ + alíq. do IRPF mínimo − alíq.
                nominal do setor: 34%, 40% ou 45%). Fonte sem dados da PJ ou agrupada em "Demais fontes" não gera redutor.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>Apenas o imposto retido sobre dividendos gera restituição.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>
                Dividendos deliberados até 31/12/2025 ficam fora da base. Por padrão, tudo é alocado como posterior; informe a parcela protegida
                fonte a fonte.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-secondary">•</span>
              <span>Sem informação do imposto sobre rendimentos de tributação exclusiva/definitiva, presume-se 15%.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onExportPdf}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            Salvar Relatório PDF Completo
          </button>
        </div>
      </div>
    </div>
  );
}
