import { useMemo, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  DEFAULT_INCOME_ITEMS,
  DEFAULT_TAX_ITEMS,
  EXCLUSIVE_INCOME_ID,
  EXCLUSIVE_TAX_ID,
  MAX_ALIQUOT,
  MAX_TAX_THRESHOLD,
  MIN_TAX_THRESHOLD,
  PRESUMED_EXCLUSIVE_TAX_RATE,
} from "../constants";
import { CalculationResult, DividendSource, IncomeItem, ParsedDirpf, SimulationResult, TaxPaymentItem } from "../types";
import { newDividendSource, summarizeDividends } from "../utils/dividends";
import { formatCurrency } from "../utils/format";
import { generatePdfReport } from "../utils/pdfReport";
import DetailedView from "./DetailedView";
import ImportDeclarationDialog from "./ImportDeclarationDialog";
import ImportStatusBadge, { ImportInfo } from "./ImportStatusBadge";
import Simulator from "./Simulator";
import WelcomeScreen from "./WelcomeScreen";

export default function Calculator() {
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>(DEFAULT_INCOME_ITEMS);
  const [taxItems, setTaxItems] = useState<TaxPaymentItem[]>(DEFAULT_TAX_ITEMS);
  const [dividendSources, setDividendSources] = useState<DividendSource[]>([]);
  const [importInfo, setImportInfo] = useState<ImportInfo | null>(null);
  // Welcome screen is shown until the user picks a way to start (or data exists).
  const [started, setStarted] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Simulation tab and engine state
  const [activeTab, setActiveTab] = useState<"detailed" | "simulator">("detailed");
  const [simPeriod, setSimPeriod] = useState<"annual" | "monthly">("annual");
  const [simTaxableIncome, setSimTaxableIncome] = useState<number>(350000);
  const [simFinancialIncome, setSimFinancialIncome] = useState<number>(50000);
  const [simRuralIncome, setSimRuralIncome] = useState<number>(100000);
  const [simTaxedDividends, setSimTaxedDividends] = useState<number>(350000);
  const [simExemptDividends, setSimExemptDividends] = useState<number>(100000);
  const [simDeductionMode, setSimDeductionMode] = useState<"simplified" | "complete">("simplified");
  const [simDependents, setSimDependents] = useState<number>(1);
  const [simOtherDeductions, setSimOtherDeductions] = useState<number>(12000);
  const [simulationAppliedMessage, setSimulationAppliedMessage] = useState<string | null>(null);

  // Real-time calculation of standard and minimum IRPF comparison
  const simResults: SimulationResult = useMemo(() => {
    const isAnnual = simPeriod === "annual";
    const brackets = isAnnual
      ? [
          { id: 1, limit: 27110.4, rate: 0.0, deduction: 0.0, label: "Isento" },
          { id: 2, limit: 33919.8, rate: 0.075, deduction: 2033.28, label: "7,5%" },
          { id: 3, limit: 45012.6, rate: 0.15, deduction: 4577.28, label: "15,0%" },
          { id: 4, limit: 55976.16, rate: 0.225, deduction: 7953.24, label: "22,5%" },
          { id: 5, limit: Infinity, rate: 0.275, deduction: 10752.0, label: "27,5%" },
        ]
      : [
          { id: 1, limit: 2259.2, rate: 0.0, deduction: 0.0, label: "Isento" },
          { id: 2, limit: 2826.65, rate: 0.075, deduction: 169.44, label: "7,5%" },
          { id: 3, limit: 3751.05, rate: 0.15, deduction: 381.44, label: "15,0%" },
          { id: 4, limit: 4664.68, rate: 0.225, deduction: 662.77, label: "22,5%" },
          { id: 5, limit: Infinity, rate: 0.275, deduction: 896.0, label: "27,5%" },
        ];

    // Compute basic deduction
    let deductionAmount = 0;
    if (simDeductionMode === "simplified") {
      if (isAnnual) {
        deductionAmount = Math.min(simTaxableIncome * 0.2, 16754.34);
      } else {
        deductionAmount = 564.8; // Monthly simplified discount
      }
    } else {
      const depUnit = isAnnual ? 2275.08 : 189.59;
      deductionAmount = simDependents * depUnit + simOtherDeductions;
    }

    const netBase = Math.max(0, simTaxableIncome - deductionAmount);

    // Find active bracket index
    let activeBracketIndex = 0;
    for (let i = 0; i < brackets.length; i++) {
      if (netBase <= brackets[i].limit) {
        activeBracketIndex = i;
        break;
      }
      if (i === brackets.length - 1) {
        activeBracketIndex = i;
      }
    }

    const activeBracket = brackets[activeBracketIndex];
    const progressiveTaxDue = Math.max(0, netBase * activeBracket.rate - activeBracket.deduction);

    const financialTaxDue = simFinancialIncome * 0.15;
    const ruralTaxDue = simRuralIncome * 0.055;
    const standardTaxDue = progressiveTaxDue + financialTaxDue + ruralTaxDue;

    // Total standard / ordinary base of calculation
    const ordinaryBaseTotal = simTaxableIncome + simFinancialIncome + simRuralIncome;
    const standardEffectiveRate = ordinaryBaseTotal > 0 ? (standardTaxDue / ordinaryBaseTotal) * 100 : 0;

    // Minimum IRPF GSGA-PR bounds
    const minThreshold = isAnnual ? 600000 : 50000;
    const maxThreshold = isAnnual ? 1200000 : 100000;

    const minimumBase = simTaxableIncome + simFinancialIncome + simRuralIncome + simTaxedDividends;

    let minimumRate = 0;
    if (minimumBase >= maxThreshold) {
      minimumRate = 0.1;
    } else if (minimumBase >= minThreshold) {
      const range = maxThreshold - minThreshold;
      const progress = minimumBase - minThreshold;
      minimumRate = (progress / range) * 0.1;
    }

    const minimumTaxDue = minimumBase * minimumRate;
    const additionalMinTax = Math.max(0, minimumTaxDue - standardTaxDue);
    const totalCombinedTax = standardTaxDue + additionalMinTax;
    const finalEffectiveRate = minimumBase > 0 ? (totalCombinedTax / minimumBase) * 100 : 0;

    return {
      deductionAmount,
      netBase,
      activeBracketIndex,
      progressiveTaxDue,
      financialTaxDue,
      ruralTaxDue,
      standardTaxDue,
      standardEffectiveRate,
      minimumBase,
      minimumRate,
      minimumTaxDue,
      additionalMinTax,
      totalCombinedTax,
      finalEffectiveRate,
      brackets,
    };
  }, [simPeriod, simTaxableIncome, simTaxedDividends, simExemptDividends, simFinancialIncome, simRuralIncome, simDeductionMode, simDependents, simOtherDeductions]);

  const applySimulation = () => {
    // 1. Update income items with simulated values
    const updatedIncome = incomeItems.map((item) => {
      if (item.id === "i1") return { ...item, value: simTaxableIncome };
      if (item.id === "i9") return { ...item, value: simFinancialIncome };
      if (item.id === "i7") return { ...item, value: simRuralIncome };
      const isDefault = DEFAULT_INCOME_ITEMS.some((def) => def.id === item.id);
      return isDefault ? { ...item, value: 0 } : item;
    });
    setIncomeItems(updatedIncome);

    // Simulated dividends become a single source: the exempt part as protected
    // (deliberated up to 2025), the taxed part as posterior.
    const simulatedTotal = simTaxedDividends + simExemptDividends;
    setDividendSources(
      simulatedTotal > 0
        ? [
            newDividendSource({
              name: "Dividendos (simulação)",
              total: simulatedTotal,
              protectedAmount: simExemptDividends,
              note: "Importado do simulador: parcela isenta como deliberada até 2025, parcela tributada como posterior.",
            }),
          ]
        : []
    );

    // 2. Record the simulated ordinary tax as "Imposto retido na fonte do titular" (t1), and the
    // 15% on financial income separately as exclusive/definitive tax (t14) — otherwise the
    // detailed calculation would presume that 15% a second time.
    const updatedTaxes = taxItems.map((item) => {
      if (item.id === "t1") return { ...item, value: simResults.progressiveTaxDue + simResults.ruralTaxDue };
      if (item.id === EXCLUSIVE_TAX_ID) return { ...item, value: simResults.financialTaxDue };
      const isDefault = DEFAULT_TAX_ITEMS.some((def) => def.id === item.id);
      return isDefault ? { ...item, value: 0 } : item;
    });
    setTaxItems(updatedTaxes);

    // 3. Inform user and switch tab
    setSimulationAppliedMessage(
      `Valores do simulador aplicados à apuração: rendimentos tributáveis de ${formatCurrency(simTaxableIncome)}, aplicações financeiras de ${formatCurrency(
        simFinancialIncome
      )}, atividade rural de ${formatCurrency(simRuralIncome)} e dividendos de ${formatCurrency(
        simTaxedDividends + simExemptDividends
      )}. O IRPF ordinário de ${formatCurrency(simResults.standardTaxDue)} foi registrado como imposto pago.`
    );
    setStarted(true);
    setActiveTab("detailed");

    // Auto clear message after 7 seconds
    setTimeout(() => {
      setSimulationAppliedMessage(null);
    }, 7000);
  };

  const addIncomeItem = () => {
    const newItem: IncomeItem = {
      id: crypto.randomUUID(),
      label: "Novo Rendimento",
      isSubject: true,
      value: 0,
    };
    setIncomeItems([...incomeItems, newItem]);
  };

  const removeIncomeItem = (id: string) => {
    setIncomeItems(incomeItems.filter((item) => item.id !== id));
  };

  const updateIncomeItem = (id: string, field: keyof IncomeItem, value: any) => {
    setIncomeItems(incomeItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addTaxItem = () => {
    const newItem: TaxPaymentItem = {
      id: crypto.randomUUID(),
      label: "Novo Imposto Pago",
      value: 0,
    };
    setTaxItems([...taxItems, newItem]);
  };

  const removeTaxItem = (id: string) => {
    setTaxItems(taxItems.filter((item) => item.id !== id));
  };

  const updateTaxItem = (id: string, field: keyof TaxPaymentItem, value: any) => {
    setTaxItems(taxItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addDividendSource = () => setDividendSources((prev) => [...prev, newDividendSource({ name: "Nova fonte pagadora" })]);

  const removeDividendSource = (id: string) => setDividendSources((prev) => prev.filter((s) => s.id !== id));

  const updateDividendSource = (id: string, field: keyof DividendSource, value: any) =>
    setDividendSources((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const handleApplyImport = ({ fields, sources, checks, fromOcr, fileName }: ParsedDirpf) => {
    setDividendSources(sources);
    setImportInfo({ fileName, fromOcr, checks, importedAt: new Date() });
    setStarted(true);
    setIncomeItems((prev) =>
      prev.map((item) => {
        const match = fields.find((f) => f.targetType === "income" && f.targetId === item.id);
        return match ? { ...item, value: match.value } : item;
      })
    );
    setTaxItems((prev) =>
      prev.map((item) => {
        const match = fields.find((f) => f.targetType === "tax" && f.targetId === item.id);
        return match ? { ...item, value: match.value } : item;
      })
    );
    setActiveTab("detailed");
  };

  const results = useMemo((): CalculationResult => {
    const dividendGross = dividendSources.reduce((acc, s) => acc + s.total, 0);
    const totalGrossIncome = incomeItems.reduce((acc, item) => acc + item.value, 0) + dividendGross;

    // Absent information on the tax levied on exclusive/definitive income, presume 15%.
    // Only applies while that income counts towards the base and no actual tax was informed.
    const exclusiveIncome = incomeItems.find((item) => item.id === EXCLUSIVE_INCOME_ID);
    const informedExclusiveTax = taxItems.find((item) => item.id === EXCLUSIVE_TAX_ID)?.value || 0;
    const presumedExclusiveTax =
      informedExclusiveTax === 0 && exclusiveIncome?.isSubject ? exclusiveIncome.value * PRESUMED_EXCLUSIVE_TAX_RATE : 0;

    // Only the posterior part of each dividend source enters the base. The
    // minimum rate depends on the base, not on the redutor, so a first pass
    // (rate 0) is enough to get the posterior total.
    const dividendPosterior = summarizeDividends(dividendSources, 0).posteriorTotal;
    const subjectBase = incomeItems.reduce((acc, item) => acc + (item.isSubject ? item.value : 0), 0) + dividendPosterior;

    let minimumAliquot = 0;
    if (subjectBase >= MAX_TAX_THRESHOLD) {
      minimumAliquot = MAX_ALIQUOT;
    } else if (subjectBase >= MIN_TAX_THRESHOLD) {
      const range = MAX_TAX_THRESHOLD - MIN_TAX_THRESHOLD;
      const progress = subjectBase - MIN_TAX_THRESHOLD;
      minimumAliquot = (progress / range) * MAX_ALIQUOT;
    }

    // Art. 16-B redutor and withholding, source by source (see utils/dividends.ts)
    const dividends = summarizeDividends(dividendSources, minimumAliquot);

    const totalTaxPaid = taxItems.reduce((acc, item) => acc + item.value, 0) + presumedExclusiveTax + dividends.withholdingTotal;
    const minimumTaxDue = subjectBase * minimumAliquot;

    // The 16-B reduction can only "zero" the tax due, never generate a refund.
    // First, we see how much tax is left after regular payments/retentions.
    const taxAfterPayments = Math.max(0, minimumTaxDue - totalTaxPaid);

    // Then we apply the 16-B reduction, capped at the remaining tax due.
    const reduction16B = Math.min(taxAfterPayments, dividends.redutorPotential);

    const additionalTax = Math.max(0, taxAfterPayments - reduction16B);

    // Refund only happens if totalTaxPaid > minimumTaxDue.
    // Reduction 16-B does NOT contribute to refund.
    // ONLY the withholding on dividends can produce a refund.
    const dividendTaxPaid = dividends.withholdingTotal;
    const otherTaxPaid = totalTaxPaid - dividendTaxPaid;
    const refund = Math.max(0, dividendTaxPaid - Math.max(0, minimumTaxDue - otherTaxPaid));

    return {
      totalGrossIncome,
      totalTaxPaid,
      subjectBase,
      minimumAliquot,
      minimumTaxDue,
      additionalTax,
      reduction16B,
      refund,
      presumedExclusiveTax,
      dividends,
    };
  }, [incomeItems, taxItems, dividendSources]);

  const handleExportPdf = () => {
    generatePdfReport({
      activeTab,
      incomeItems,
      taxItems,
      dividendSources,
      results,
      simPeriod,
      simTaxableIncome,
      simFinancialIncome,
      simRuralIncome,
      simTaxedDividends,
      simExemptDividends,
      simDeductionMode,
      simDependents,
      simResults,
    }).catch((err) => {
      console.error(err);
      alert("Não foi possível gerar o relatório em PDF. Tente novamente.");
    });
  };

  const isEmpty =
    dividendSources.length === 0 && incomeItems.every((i) => i.value === 0) && taxItems.every((t) => t.value === 0);
  const showWelcome = !started && isEmpty;

  const dataOrigin = importInfo
    ? `declaração importada (${importInfo.fileName ?? "PDF"}${importInfo.fromOcr ? ", lida por OCR" : ""})`
    : "valores informados na tela";

  const tabClass = (active: boolean) =>
    `py-3 px-1 mr-8 text-sm border-b-2 -mb-px transition-colors cursor-pointer ${
      active ? "border-primary text-primary font-semibold" : "border-transparent text-text-gray hover:text-primary"
    }`;

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-[32px] leading-tight font-semibold text-primary">Calculadora de IRPF mínimo</h1>
          <p className="text-text-gray mt-1">GSGA-PR, apuração pela Lei nº 15.270/2025</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold bg-white text-primary px-4 py-2.5 rounded border-2 border-primary hover:bg-paper transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Importar declaração
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2.5 rounded border-2 border-primary hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </header>

      <nav className="flex border-b border-rule" aria-label="Seções">
        <button onClick={() => setActiveTab("detailed")} className={tabClass(activeTab === "detailed")} aria-current={activeTab === "detailed"}>
          Apuração
        </button>
        <button onClick={() => setActiveTab("simulator")} className={tabClass(activeTab === "simulator")} aria-current={activeTab === "simulator"}>
          Simulador por faixas de renda
        </button>
      </nav>

      {/* Simulation Applied Success Banner */}
      <AnimatePresence>
        {simulationAppliedMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-white border border-rule border-l-[3px] border-l-secondary px-4 py-2.5 rounded text-ink text-sm flex items-start justify-between gap-4 overflow-hidden"
          >
            <span>{simulationAppliedMessage}</span>
            <button onClick={() => setSimulationAppliedMessage(null)} aria-label="Fechar aviso" className="text-text-gray hover:text-ink">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {importInfo && <ImportStatusBadge info={importInfo} onDismiss={() => setImportInfo(null)} />}

      {activeTab === "detailed" && showWelcome && (
        <WelcomeScreen
          onImport={() => setIsImportOpen(true)}
          onManual={() => setStarted(true)}
          onSimulator={() => setActiveTab("simulator")}
        />
      )}

      {activeTab === "detailed" && !showWelcome && (
        <DetailedView
          incomeItems={incomeItems}
          taxItems={taxItems}
          dividendSources={dividendSources}
          results={results}
          dataOrigin={dataOrigin}
          onAddIncome={addIncomeItem}
          onRemoveIncome={removeIncomeItem}
          onUpdateIncome={updateIncomeItem}
          onAddTax={addTaxItem}
          onRemoveTax={removeTaxItem}
          onUpdateTax={updateTaxItem}
          onAddSource={addDividendSource}
          onRemoveSource={removeDividendSource}
          onUpdateSource={updateDividendSource}
          onExportPdf={handleExportPdf}
        />
      )}

      {activeTab === "simulator" && (
        <Simulator
          simPeriod={simPeriod}
          simTaxableIncome={simTaxableIncome}
          simFinancialIncome={simFinancialIncome}
          simRuralIncome={simRuralIncome}
          simTaxedDividends={simTaxedDividends}
          simExemptDividends={simExemptDividends}
          simDeductionMode={simDeductionMode}
          simDependents={simDependents}
          simOtherDeductions={simOtherDeductions}
          simResults={simResults}
          onPeriodChange={setSimPeriod}
          onTaxableIncomeChange={setSimTaxableIncome}
          onFinancialIncomeChange={setSimFinancialIncome}
          onRuralIncomeChange={setSimRuralIncome}
          onTaxedDividendsChange={setSimTaxedDividends}
          onExemptDividendsChange={setSimExemptDividends}
          onDeductionModeChange={setSimDeductionMode}
          onDependentsChange={setSimDependents}
          onOtherDeductionsChange={setSimOtherDeductions}
          onApplySimulation={applySimulation}
          onExportPdf={handleExportPdf}
        />
      )}

      <ImportDeclarationDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onApply={handleApplyImport} />
    </div>
  );
}
