import { jsPDF } from "jspdf";
import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import { formatCurrency, formatPercent } from "./format";

interface SimResultsForReport {
  deductionAmount: number;
  netBase: number;
  progressiveTaxDue: number;
  financialTaxDue: number;
  ruralTaxDue: number;
  standardEffectiveRate: number;
  standardTaxDue: number;
  minimumBase: number;
  minimumRate: number;
  minimumTaxDue: number;
  additionalMinTax: number;
}

export interface GeneratePdfReportParams {
  activeTab: "detailed" | "simulator";
  incomeItems: IncomeItem[];
  taxItems: TaxPaymentItem[];
  dividendSources: DividendSource[];
  results: CalculationResult;
  simPeriod: "annual" | "monthly";
  simTaxableIncome: number;
  simFinancialIncome: number;
  simRuralIncome: number;
  simTaxedDividends: number;
  simExemptDividends: number;
  simDeductionMode: "simplified" | "complete";
  simDependents: number;
  simResults: SimResultsForReport;
}

export function generatePdfReport(params: GeneratePdfReportParams) {
  const {
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
  } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = 12;

  // Helper to ensure page bounds
  const ensureSpace = (height: number) => {
    if (y + height > 275) {
      doc.addPage();
      y = 12;

      // Draw elegant page header line on new pages
      doc.setFillColor(20, 62, 60); // GSGA primary
      doc.rect(10, 10, 190, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setTextColor(130, 140, 139);
      doc.setFontSize(7);
      doc.text("Relatório de Apuração IRPF Mínimo — Lei 15.270/2025", 10, 15);
      y = 22;
    }
  };

  // Helper to render long wrapped paragraphs cleanly with automatic page-break protection
  const drawParagraph = (
    text: string,
    fontSize = 8,
    isStyle: "normal" | "bold" | "italic" = "normal",
    textColor = [68, 76, 75],
    lineSpacing = 3.6
  ) => {
    doc.setFont("helvetica", isStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const lines = doc.splitTextToSize(text, 178);
    lines.forEach((line: string) => {
      ensureSpace(lineSpacing + 1);
      doc.text(line, 12, y);
      y += lineSpacing;
    });
    y += 1.5; // spacing after paragraph
  };

  // Main Header Banner
  doc.setFillColor(20, 62, 60); // GSGA primary
  doc.rect(10, 10, 190, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("GSGA-PR, apuração do IRPF mínimo", 15, 17);

  doc.setFontSize(13);
  doc.text("Relatório de Planejamento e Aferição: IRPF Mínimo", 15, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Análise Técnica de Conformidade com a Lei nº 15.270/2025 (Regime de Alíquota Efetiva Global)", 15, 30);

  y = 42;

  // Metadata Block
  doc.setTextColor(95, 105, 104);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 10, y);
  doc.text(`Escopo do Documento: Parecer Prévio de Mesa de Planejamento Tributário Familiar & Corporativo`, 10, y + 4);
  doc.text(`Método Aplicado: ${activeTab === "detailed" ? "Ficha Detalhada Individual" : "Simulador de Parâmetros Globais"}`, 10, y + 8);
  y += 15;

  const drawSectionHeader = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(230, 241, 240);
    doc.rect(10, y, 190, 8, "F");

    doc.setFillColor(20, 62, 60);
    doc.rect(10, y, 1, 8, "F"); // Side border line

    doc.setTextColor(20, 62, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, 13, y + 5.5);
    y += 12;
  };

  const drawRow = (label: string, valueStr: string, isTotal = false, customColor?: [number, number, number]) => {
    ensureSpace(8);
    if (isTotal) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 62, 60);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(68, 76, 75);
    }
    doc.setFontSize(8.5);
    doc.text(label, 12, y);

    doc.setFont("helvetica", "bold");
    if (customColor) {
      doc.setTextColor(customColor[0], customColor[1], customColor[2]);
    } else if (isTotal) {
      doc.setTextColor(20, 62, 60);
    } else {
      doc.setTextColor(35, 135, 131);
    }
    doc.text(valueStr, 200, y, { align: "right" });

    // Draw horizontal divider rule
    doc.setDrawColor(230, 241, 240);
    doc.setLineWidth(0.15);
    doc.line(10, y + 2.5, 200, y + 2.5);

    y += 7;
  };

  // ---------------- EXPLANATORY MEMORANDUM (CARTA AO CLIENTE) ----------------
  drawSectionHeader("MENSAGEM TÉCNICA: SUMÁRIO DO REGIME IRPF MÍNIMO");

  drawParagraph(
    "O IRPF Mínimo, implementado a partir da regulamentação da Emenda Constitucional da Reforma Tributária e disciplinado no Estado pela Lei nº 15.270/2025, estabelece que contribuintes com alta capacidade econômica devem arcar com uma tributação efetiva mínima global de até 12% sobre seus rendimentos brutos consolidados (ou 6% para rendimentos em faixa intermediária).",
    8,
    "normal",
    [68, 76, 75]
  );

  drawParagraph(
    "Diferente da sistemática clássica que permite isenção tributária integral sobre lucros e dividendos ou deduções irrestritas, o IRPF Mínimo abrange todas as formas de ganho na pessoa física em uma base operacional global consolidada única. O objetivo deste instrumento é aferir se os impostos regularmente recolhidos pelo contribuinte ao longo do ano atingiram esse piso mínimo ou se haverá cobrança de um Adicional de Compensação Estadual.",
    8,
    "normal",
    [68, 76, 75]
  );

  // ---------------- COMMENTARY ON THE DEDUCTION PARADOX ----------------
  ensureSpace(34);
  doc.setFillColor(253, 237, 235); // light coral (alert box)
  doc.rect(10, y, 190, 24, "F");
  doc.setFillColor(233, 75, 65); // GSGA coral (alert)
  doc.rect(10, y, 1, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(200, 60, 52);
  doc.text("DINÂMICA FISCAL RELEVANTE: O EFEITO CONTRAINTUITIVO DAS DEDUÇÕES", 13, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 40, 35);
  const alertMsg =
    "Na sistemática ordinária do IRPF, a declaração de deduções (como despesas médicas, educação, dependentes ou a dedução padrão de 20% do regime simplificado) reduz a base líquida de cálculo e, por consequência, reduz o imposto geral devido. No entanto, o IRPF Mínimo é estabelecido sobre uma base bruta e exige um recolhimento mínimo fixo sobre ela. Como o imposto ordinário já recolhido atua como 'crédito' para amortizar o teto do imposto mínimo, QUALQUER DEDUÇÃO aplicada no imposto clássico reduzirá o crédito utilizável, acarretando, consequentemente, em um aumento IDÊNTICO do Adicional Complementar a recolher. Na prática, abaixo da linha de incidência do IRPF Mínimo, os efeitos financeiros favoráveis das deduções clássicas são completamente neutralizados.";
  const splitAlert = doc.splitTextToSize(alertMsg, 184);
  doc.text(splitAlert, 13, y + 9);
  y += 28;

  if (activeTab === "detailed") {
    // ---------------- DETAILED TAB REPORT ----------------
    drawSectionHeader("1. Ficha de Rendimentos Declarados e Bases Sujeitas");

    const activeIncomes = incomeItems.filter((item) => item.value > 0);
    if (activeIncomes.length === 0) {
      ensureSpace(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(130, 140, 139);
      doc.text("Nenhum rendimento ativo adicionado.", 12, y);
      y += 8;
    } else {
      activeIncomes.forEach((item) => {
        const typeLabel = item.isSubject ? " (Base do Piso Mínimo)" : " (Isento das Regras)";
        drawRow(`${item.label}${typeLabel}`, formatCurrency(item.value));
      });
    }

    y += 2;
    drawRow("Total de Rendimentos Brutos Declarados", formatCurrency(results.totalGrossIncome), true);
    drawRow("Base de Cálculo Sujeita ao Tributo Mínimo", formatCurrency(results.subjectBase), true);
    y += 4;

    // Dividends, source by source (Art. 16-B)
    if (dividendSources.length > 0) {
      drawSectionHeader("2. Lucros e Dividendos por Fonte Pagadora e Redutor (Art. 16-B)");
      const resultById = new Map(results.dividends.perSource.map((r) => [r.id, r]));
      dividendSources.forEach((source) => {
        const r = resultById.get(source.id);
        const rate = r?.effectiveRate === null || r === undefined ? "sem dados da PJ" : formatPercent(r.effectiveRate);
        drawRow(
          `${source.name}${source.cnpj ? ` (${source.cnpj})` : ""}${source.isSimples ? " – Simples Nacional" : ""}`,
          `Total ${formatCurrency(source.total)}`
        );
        drawRow(
          `   Deliberado até 2025: ${formatCurrency(Math.min(source.protectedAmount, source.total))} | Posterior: ${formatCurrency(r?.posterior ?? 0)}` +
            (source.isAggregate ? "" : ` | Efetiva: ${rate} | Nominal: ${formatPercent(source.nominalRate)}`),
          `Redutor ${formatCurrency(r?.redutor ?? 0)}`
        );
      });

      y += 2;
      drawRow("Dividendos posteriores a 2025 (na base)", formatCurrency(results.dividends.posteriorTotal), true);
      drawRow("Dividendos deliberados até 2025 (protegidos, fora da base)", formatCurrency(results.dividends.protectedTotal), true);
      drawRow("Redutor potencial (soma das fontes)", formatCurrency(results.dividends.redutorPotential));
      drawRow("Redutor aplicado (limitado ao saldo devido)", formatCurrency(results.reduction16B), true);
      y += 4;
    }

    // Taxes paid (Classic IRPF)
    drawSectionHeader("3. Deduções Clássicas e Recolhimentos de Impostos Regulares");
    const activeTaxes = taxItems.filter((item) => item.value > 0);
    if (activeTaxes.length === 0 && results.presumedExclusiveTax === 0 && results.dividends.withholdingTotal === 0) {
      ensureSpace(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(130, 140, 139);
      doc.text("Nenhum imposto antecipado ou desconto registrado.", 12, y);
      y += 8;
    } else {
      activeTaxes.forEach((item) => {
        drawRow(item.label, formatCurrency(item.value));
      });
      if (results.presumedExclusiveTax > 0) {
        drawRow("Imposto presumido s/ rendimentos de tributação exclusiva/definitiva (15%)", formatCurrency(results.presumedExclusiveTax));
      }
      if (results.dividends.withholdingTotal > 0) {
        drawRow("Retenção de 10% s/ dividendos posteriores a 2025", formatCurrency(results.dividends.withholdingTotal));
      }
    }
    y += 2;
    drawRow("Total de Imposto Recolhido Clássico / Crédito Devido", formatCurrency(results.totalTaxPaid), true);
    y += 4;

    // Final Conclusion
    drawSectionHeader("4. Resultado da Apuração e Síntese Tributária");
    drawRow("Base Operacional Sujeita ao Mínimo", formatCurrency(results.subjectBase));
    drawRow("Alíquota Efetiva Progressiva Estimada", formatPercent(results.minimumAliquot));
    drawRow("IRPF Mínimo Devido (Piso)", formatCurrency(results.minimumTaxDue));
    drawRow("Crédito Clássico Utilizável", formatCurrency(results.totalTaxPaid));

    if (results.reduction16B > 0) {
      drawRow("Abatimento Legal por Equivalência (Art. 16-B)", `-${formatCurrency(results.reduction16B)}`);
    }

    y += 4;
    ensureSpace(32);

    let colorBorder: [number, number, number] = [20, 62, 60];
    let bigTitle = "RESULTADO REGULARIZADO";
    let bigValue = "R$ 0,00 (Sem Adicional)";
    let textDesc =
      "O montante recolhido nas bases clássicas e os abatimentos por equivalência societária superam ou igualam o teto do imposto mínimo exigido para o perfil atual. Saldo tributário de compensação estadual zerado.";

    if (results.additionalTax > 0) {
      colorBorder = [233, 75, 65]; // GSGA coral – tax due
      bigTitle = "ADICIONAL COMPLEMENTAR MÍNIMO EXIGIDO (A RECOLHER)";
      bigValue = formatCurrency(results.additionalTax);
      textDesc =
        "O imposto de renda ordinário (IRPF clássico + equivalência) não atingiu o piso mínimo estipulado em lei. O contribuinte deve recolher a diferença por meio de guia de compensação estadual complementar para evitar penalidades e manter a conformidade fiscal.";
    } else if (results.refund > 0) {
      colorBorder = [35, 135, 131]; // GSGA secondary – refund
      bigTitle = "RESTITUIÇÃO DE RETENÇÕES DISPONÍVEL";
      bigValue = formatCurrency(results.refund);
      textDesc =
        "As retenções na fonte declaradas superam o teto final do IRPF Mínimo Legal decorrente do período. O contribuinte possui saldo de crédito para compensação ou devolução conforme vias administrativas aplicáveis.";
    }

    // Draw final card outline
    doc.setFillColor(242, 247, 247);
    doc.rect(10, y, 190, 26, "F");

    doc.setFillColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.rect(10, y, 1.5, 26, "F"); // highlight side strip

    doc.setTextColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(bigTitle, 14, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(bigValue, 14, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(95, 105, 104);
    const splitDesc = doc.splitTextToSize(textDesc, 180);
    doc.text(splitDesc, 14, y + 17);

    y += 30;
  } else {
    // ---------------- SIMULATOR TAB REPORT ----------------
    drawSectionHeader("1. Variáveis de Entrada Cenarizadas");
    drawRow("Periodo de Cálculo Parametrizado", simPeriod === "annual" ? "Anual" : "Mensal");
    drawRow("Rendimentos Ordinários Tributados (Alíquota Progressiva)", formatCurrency(simTaxableIncome));
    drawRow("Rendimentos de Aplicações Financeiras (Tributado definitivo a 15%)", formatCurrency(simFinancialIncome));
    drawRow("Rendimento de Atividade Rural (Alíquota Definitiva de 5,5%)", formatCurrency(simRuralIncome));
    drawRow("Lucros e Dividendos Tributados (Retenção do IRPF Mínimo, pós dez/2025)", formatCurrency(simTaxedDividends));
    drawRow("Lucros e Dividendos Isentos (Crédito Pré-2026 ou < R$ 50k mensais)", formatCurrency(simExemptDividends));

    const modeText =
      simDeductionMode === "simplified"
        ? "Simplificado (Desconto Linear 20%)"
        : `Deduções Completas (${simDependents} Dependentes e Deduções de Apoio)`;
    drawRow("Regime de Dedução Adotado para o IRPF Geral", modeText);
    drawRow("Valor Máximo Abatido das Deduções", formatCurrency(simResults.deductionAmount), true);
    y += 4;

    drawSectionHeader("2. Simulação pelo Regime Tradicional Clássico");
    drawRow("Base de Cálculo Líquida do IRPF Progressivo", formatCurrency(simResults.netBase));
    drawRow("Imposto Apurado sobre Renda Progressiva", formatCurrency(simResults.progressiveTaxDue));
    drawRow("Imposto Retido sobre Aplicações Financeiras", formatCurrency(simResults.financialTaxDue));
    drawRow("Imposto sobre Ganhos de Atividade Rural", formatCurrency(simResults.ruralTaxDue));

    y += 2;
    drawRow("Alíquota Individual Efetiva Ordinária", formatPercent(simResults.standardEffectiveRate / 100));
    drawRow("Imposto Total Devido pelas Vias Clássicas (A)", formatCurrency(simResults.standardTaxDue), true);
    y += 4;

    drawSectionHeader("3. Mensuração sob a Regra de Piso IRPF Mínimo");
    drawRow("Base Operacional Consolidada (Consolidação de Rendimentos Sujeitos)", formatCurrency(simResults.minimumBase));
    drawRow("Gatilho Legal / Alíquota Legal Efetiva do Piso", formatPercent(simResults.minimumRate));
    drawRow("Montante Mínimo Devido Global (B)", formatCurrency(simResults.minimumTaxDue), true);
    y += 4;

    drawSectionHeader("4. Resumo de Diferenciais de Caixa");
    drawRow("Imposto Mínimo Devido Exigido (B)", formatCurrency(simResults.minimumTaxDue));
    drawRow("Imposto Clássico Pago Correspondente (A)", formatCurrency(simResults.standardTaxDue));
    y += 4;
    ensureSpace(32);

    let colorBorder: [number, number, number] = [35, 135, 131]; // GSGA secondary
    let bigTitle = "CONFORMIDADE CONFIRMADA (ISENTO DE IMPOSTO ADICIONAL)";
    let bigValue = "RESULTADO CONFORME";
    let textDesc =
      "O imposto de renda apurado pelas vias clássicas nas faixas previstas já cumpre ou supera o teto mínimo obrigatório sob o cálculo global. Não há necessidade de recolhimento complementar de imposto.";

    if (simResults.additionalMinTax > 0) {
      colorBorder = [233, 75, 65]; // GSGA coral – tax due
      bigTitle = "RECOLHEMENTO ADICIONAL DE COMPENSAÇÃO EXIGIDO";
      bigValue = `Diferença a Pagar: ${formatCurrency(simResults.additionalMinTax)}`;
      textDesc =
        "O imposto devido sob as regras tradicionais ficou abaixo do piso mínimo de alíquota efetiva global. É devida a compensação correspondente para atingir a conformidade legal do IRPF Mínimo.";
    }

    // Draw final card outline
    doc.setFillColor(242, 247, 247);
    doc.rect(10, y, 190, 26, "F");

    doc.setFillColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.rect(10, y, 1.5, 26, "F"); // highlight side strip

    doc.setTextColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(bigTitle, 14, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(bigValue, 14, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(95, 105, 104);
    const splitDesc = doc.splitTextToSize(textDesc, 180);
    doc.text(splitDesc, 14, y + 17);

    y += 30;
  }

  // ---------------- LEGAL GLOSSARY (GLOSSÁRIO EXPLICATIVO PARA O CLIENTE) ----------------
  drawSectionHeader("NOTAS METODOLÓGICAS E ENQUADRAMENTO ANALÍTICO");

  drawParagraph(
    "• Rendimentos de Alíquota Progressiva: Refere-se a rendimentos tributáveis clássicos como salários, pró-labore de sócios, consultorias, serviços autônomos e aluguéis. Estão sujeitos às deduções do modelo tradicional de IRPF.",
    7.5,
    "normal",
    [68, 76, 75],
    3.2
  );

  drawParagraph(
    "• Aplicações Financeiras: Consiste em retornos líquidos de investimentos sujeitos à tributação final ou exclusiva na fonte de 15% (Renda Fixa e Fundos de Investimentos). Conforme regramento do piso legal, seu valor bruto total compõe a base do piso para assegurar o cálculo da alíquota efetiva.",
    7.5,
    "normal",
    [68, 76, 75],
    3.2
  );

  drawParagraph(
    "• Atividade Rural: Compreende o saldo de ganhos líquidos decorrentes de exploração agropecuária, pesqueira ou agroindustrial e florestal. A alíquota nominal padrão é mantida na forma de 5,5% efetiva, contabilizada integralmente no piso global.",
    7.5,
    "normal",
    [68, 76, 75],
    3.2
  );

  drawParagraph(
    "• Lucros e Dividendos Trib. (Pós-Dez/2025): Nova sistemática de retenção sobre lucros deliberados após 2025. Esses valores são submetidos à comparação global do imposto de renda mínimo de forma a vedar planejamentos evasivos excessivos.",
    7.5,
    "normal",
    [68, 76, 75],
    3.2
  );

  drawParagraph(
    "• Lucros e Dividendos Isentos (Pré-2026 ou < 50k/mês): Rendimentos que continuam plenamente isentos do IRPF ordinário e que NÃO integram o computo do IRPF Mínimo, resguardando direitos adquiridos ou pequenas distribuições de renda recorrente.",
    7.5,
    "normal",
    [68, 76, 75],
    3.2
  );

  drawParagraph(
    "• Redutor (Artigo 16-B): reduz o IRPF Mínimo quando a soma da alíquota efetiva de IRPJ e CSLL da pessoa jurídica pagadora com a alíquota efetiva do IRPF Mínimo excede a alíquota nominal do setor (34% para as pessoas jurídicas em geral, 40% para seguradoras, capitalização e demais instituições financeiras com CSLL de 15%, e 45% para bancos). O redutor corresponde ao excedente aplicado sobre os lucros e dividendos recebidos daquela fonte.",
    7.5,
    "normal",
    [68, 76, 75],
    3.2
  );

  // Footer signature
  ensureSpace(20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(130, 140, 139);
  doc.text(
    `Análise gerada em caráter consultivo com base nos parâmetros inseridos e no regramento simulado do IRPF Mínimo (Mesa Analítica Legal / Emenda Constitucional).`,
    10,
    y
  );
  doc.text(
    `IMPORTANTE: Este documento é exclusivamente opinativo-analítico para subsidiar tomada de decisão e planejamento privado, não substituindo declarações nem eximindo obrigações federais oficiais.`,
    10,
    y + 3.5
  );

  // Save File
  const nameStr = activeTab === "detailed" ? "apuracao_detalhada_irpf" : "simulacao_faixas_irpf";
  doc.save(`${nameStr}_${new Date().toISOString().split("T")[0]}.pdf`);
}
