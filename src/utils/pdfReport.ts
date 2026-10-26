import { jsPDF } from "jspdf";
import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import { formatCurrency, formatPercent } from "./format";

/*
 * PDF report in the GSGA-PR house style (A4 landscape), reproduced from the
 * firm's report template: petróleo top band with a verde accent block, coral
 * bar beside the title block, logo top right, coral-tinted callout, tables
 * with a petróleo header, verde-tint highlight rows and a petróleo total row,
 * and the "minuta" pill in the footer. Measurements below are in points and
 * were taken from the template.
 */

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
  // Identification shown in the eyebrow label, e.g. "David Soifer · DIRPF 2026 (AC 2025)".
  taxpayerLabel?: string;
  // Used in the file name: apuracao_irpf_minimo_<nome>.pdf
  taxpayerName?: string;
  // Calendar year of the declaration; before 2026 the result is a projection.
  calendarYear?: number;
}

type RGB = [number, number, number];
const C = {
  primary: [20, 62, 60] as RGB,
  secondary: [35, 135, 131] as RGB,
  coral: [233, 75, 65] as RGB,
  bandLine: [94, 116, 114] as RGB,
  muted: [94, 116, 114] as RGB,
  body: [74, 85, 83] as RGB,
  coralTint: [252, 228, 228] as RGB,
  tealTint: [228, 241, 240] as RGB,
  rule: [227, 232, 231] as RGB,
  headerDivider: [52, 90, 88] as RGB,
  white: [255, 255, 255] as RGB,
};

const PAGE_W = 841.92;
const PAGE_H = 595.28;
const LEFT = 59.2;
const RIGHT = 777.8;
const WIDTH = RIGHT - LEFT;
const CONTENT_TOP = 133.5;
const CONTENT_BOTTOM = 530;
const FOOTER_PILL = "MINUTA PARA DISCUSSÃO · SUJEITA A ALTERAÇÕES";
const FIRM = "Gaia Silva Gaede Advogados";

// ------------------------------------------------------------------ assets
async function fetchBase64(path: string): Promise<string> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

interface Assets {
  font: string; // "Inter" or "helvetica" fallback
  logo: string | null;
}

// Files fetched once per session (base64). Generating the PDF itself is
// synchronous, so once these are loaded the download can start inside the
// click handler, where the browser still counts it as a user action.
export interface ReportFiles {
  fonts: { regular: string; semibold: string; bold: string } | null;
  logo: string | null;
}

let filesPromise: Promise<ReportFiles> | null = null;

// Inter (SIL OFL) embedded in the PDF; Aptos can't be embedded under its
// license. Falls back to Helvetica if the files can't be loaded.
export function preloadReportFiles(): Promise<ReportFiles> {
  filesPromise ??= (async () => {
    let fonts: ReportFiles["fonts"] = null;
    try {
      const [regular, semibold, bold] = await Promise.all(["fonts/Inter-400.ttf", "fonts/Inter-600.ttf", "fonts/Inter-700.ttf"].map(fetchBase64));
      fonts = { regular, semibold, bold };
    } catch (err) {
      console.warn("Fonte Inter indisponível, usando Helvetica.", err);
    }
    let logo: string | null = null;
    try {
      logo = `data:image/png;base64,${await fetchBase64("brand/gsga-logo.png")}`;
    } catch (err) {
      console.warn("Logotipo indisponível.", err);
    }
    // A failed load is retried on the next export instead of being cached.
    if (!fonts || !logo) filesPromise = null;
    return { fonts, logo };
  })();
  return filesPromise;
}

function applyFiles(doc: jsPDF, files: ReportFiles): Assets {
  if (!files.fonts) return { font: "helvetica", logo: files.logo };
  doc.addFileToVFS("Inter-400.ttf", files.fonts.regular);
  doc.addFont("Inter-400.ttf", "Inter", "normal");
  doc.addFileToVFS("Inter-600.ttf", files.fonts.semibold);
  doc.addFont("Inter-600.ttf", "Inter", "semibold");
  doc.addFileToVFS("Inter-700.ttf", files.fonts.bold);
  doc.addFont("Inter-700.ttf", "Inter", "bold");
  return { font: "Inter", logo: files.logo };
}

// ------------------------------------------------------------------ layout engine
interface PageHeading {
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface Column {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

type RowKind = "normal" | "highlight" | "total";
interface Row {
  cells: string[];
  kind?: RowKind;
}

class Report {
  doc: jsPDF;
  y = CONTENT_TOP;
  private heading: PageHeading | null = null;

  constructor(doc: jsPDF, private assets: Assets) {
    this.doc = doc;
  }

  private font(weight: "normal" | "semibold" | "bold", size: number, color: RGB) {
    const style = this.assets.font === "Inter" ? weight : weight === "normal" ? "normal" : "bold";
    this.doc.setFont(this.assets.font, style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
  }

  private fill(color: RGB) {
    this.doc.setFillColor(...color);
  }

  // Starts a page with the template chrome and the given heading.
  page(heading: PageHeading, isFirst = false) {
    if (!isFirst) this.doc.addPage();
    this.heading = heading;
    const d = this.doc;

    this.fill(C.primary);
    d.rect(0, 0, PAGE_W, 22.5, "F");
    this.fill(C.secondary);
    d.rect(705, 0, 73.5, 22.5, "F");
    this.fill(C.bandLine);
    d.rect(0, 22.5, PAGE_W, 6, "F");

    this.fill(C.coral);
    d.rect(LEFT, 59.2, 2.3, 54.8, "F");
    this.font("bold", 8, C.secondary);
    d.text(heading.eyebrow.toUpperCase(), 75.9, 67, { charSpace: 1.2 });
    this.font("bold", 19, C.primary);
    d.text(heading.title.toUpperCase(), 75.9, 94);
    this.font("normal", 9.5, C.muted);
    d.text(heading.subtitle, 75.9, 111.5);

    if (this.assets.logo) d.addImage(this.assets.logo, "PNG", 610.5, 62.25, 167.25, 33.75);

    this.y = CONTENT_TOP;
  }

  // Continuation page with the same heading (used when a table overflows).
  private continuation() {
    if (!this.heading) return;
    this.page({ ...this.heading, subtitle: `${this.heading.subtitle} (continuação)` });
  }

  private ensure(height: number) {
    if (this.y + height > CONTENT_BOTTOM) this.continuation();
  }

  callout(text: string, tone: "alert" | "neutral", title?: string) {
    const d = this.doc;
    const textWidth = WIDTH - 35;
    this.font("normal", 9.5, C.body);
    const lines = d.splitTextToSize(text, textWidth);
    const titleHeight = title ? 15 : 0;
    const height = 12.5 + titleHeight + lines.length * 14 + 6;
    this.ensure(height + 16);

    this.fill(tone === "alert" ? C.coralTint : C.tealTint);
    d.rect(LEFT, this.y, WIDTH, height, "F");
    this.fill(tone === "alert" ? C.coral : C.secondary);
    d.rect(LEFT, this.y, 3, height, "F");

    let ty = this.y + 22.5;
    if (title) {
      this.font("bold", 9.5, tone === "alert" ? C.coral : C.primary);
      d.text(title, 76.7, ty);
      ty += titleHeight;
    }
    this.font("normal", 9.5, C.body);
    d.text(lines, 76.7, ty, { lineHeightFactor: 14 / 9.5, align: "justify", maxWidth: textWidth });
    this.y += height + 16;
  }

  table(columns: Column[], rows: Row[]) {
    const d = this.doc;
    const header = () => {
      this.fill(C.primary);
      d.rect(LEFT, this.y, WIDTH, 31.5, "F");
      this.cells(columns, columns.map((c) => c.label), this.y, 31.5, "header");
      this.y += 31.5;
    };
    this.ensure(31.5 + 31);
    header();

    for (const row of rows) {
      const kind = row.kind ?? "normal";
      const height = kind === "total" ? 30.7 : 30;
      if (this.y + height > CONTENT_BOTTOM) {
        this.continuation();
        header();
      }
      if (kind === "highlight") {
        this.fill(C.tealTint);
        d.rect(LEFT, this.y, WIDTH, height, "F");
      } else if (kind === "total") {
        this.fill(C.primary);
        d.rect(LEFT, this.y, WIDTH, height, "F");
      }
      if (kind !== "total") {
        this.fill(C.rule);
        d.rect(LEFT, this.y + height - 0.75, WIDTH, 0.75, "F");
      }
      this.cells(columns, row.cells, this.y, height, kind);
      this.y += height;
    }
    this.y += 10;
  }

  private cells(columns: Column[], values: string[], top: number, height: number, kind: RowKind | "header") {
    const d = this.doc;
    const baseline = top + height / 2 + 3.4;
    let x = LEFT;
    columns.forEach((col, i) => {
      if (kind === "header" || kind === "total") {
        if (i > 0) {
          this.fill(C.headerDivider);
          d.rect(x, top, 0.75, height, "F");
        }
        this.font(kind === "header" ? "semibold" : "bold", kind === "header" ? 9.5 : 10.5, C.white);
      } else if (kind === "highlight") {
        this.font("semibold", 10, C.primary);
      } else {
        this.font("normal", 10, C.primary);
      }
      const value = values[i] ?? "";
      const align = col.align ?? (i === 0 ? "left" : "right");
      const maxWidth = col.width - 28;
      const text = d.splitTextToSize(value, maxWidth)[0] ?? "";
      if (align === "left") d.text(text, x + 14.5, baseline);
      else if (align === "center") d.text(text, x + col.width / 2, baseline, { align: "center" });
      else d.text(text, x + col.width - 14.2, baseline, { align: "right" });
      x += col.width;
    });
  }

  footnote(text: string) {
    this.font("normal", 7.5, C.muted);
    const lines = this.doc.splitTextToSize(text, WIDTH);
    this.ensure(lines.length * 10 + 4);
    this.doc.text(lines, LEFT + 0.3, this.y + 6, { lineHeightFactor: 10 / 7.5 });
    this.y += lines.length * 10 + 14;
  }

  // Justified running text (last line left-aligned).
  paragraph(text: string, width = WIDTH) {
    this.font("normal", 9.5, C.body);
    const lines = this.doc.splitTextToSize(text, width);
    this.ensure(lines.length * 14.5 + 6);
    this.doc.text(lines, LEFT, this.y + 10, { lineHeightFactor: 14.5 / 9.5, align: "justify", maxWidth: width });
    this.y += lines.length * 14.5 + 8;
  }

  subheading(text: string) {
    this.ensure(30);
    this.font("bold", 10.5, C.primary);
    this.doc.text(text, LEFT, this.y + 12);
    this.y += 22;
  }

  // Footer on every page, drawn at the end so the page count is known.
  footers() {
    const d = this.doc;
    const total = d.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      d.setPage(i);
      d.setDrawColor(...C.coral);
      d.setLineWidth(0.75);
      d.roundedRect(59.6, 544.1, 225.8, 16.5, 8.25, 8.25, "S");
      this.font("bold", 7, C.coral);
      d.text(FOOTER_PILL, 172.5, 554.6, { align: "center", charSpace: 0.7 });
      this.font("normal", 7, C.muted);
      d.text(`${FIRM}   ${i}/${total}`, RIGHT, 554.6, { align: "right" });
      this.fill(C.coral);
      d.rect(834.8, 552.8, PAGE_W - 834.8, PAGE_H - 552.8, "F");
    }
  }
}

// ------------------------------------------------------------------ content
const brl = (v: number) => formatCurrency(v);
const dash = (v: number) => (Math.abs(v) < 0.005 ? "—" : brl(v));

const TECHNICAL_MESSAGE = [
  "O Adicional de IRPF (ou IRPF Mínimo), instituído pela Lei nº 15.270/2025, estabelece uma tributação mínima para pessoas físicas de alta renda, com alíquotas de até 10%, conforme o nível de rendimentos anuais.",
  "Diferentemente da sistemática tradicional, que prevê a isenção dos lucros e dividendos distribuídos à pessoa física, o novo regime passa a considerar esses rendimentos na apuração do IRPF Mínimo em determinadas situações, observadas as exclusões e deduções expressamente previstas em lei.",
  "O mecanismo busca verificar se a tributação suportada pelo contribuinte ao longo do ano atingiu o patamar mínimo exigido. Caso contrário, poderá haver a incidência de Adicional de Imposto de Renda da Pessoa Física Mínimo (IRPF-M).",
];

const DEDUCTIONS_DYNAMIC =
  "Na declaração de ajuste anual, deduções como despesas médicas, despesas com instrução, dependentes ou o desconto simplificado reduzem a base de cálculo e, por consequência, o imposto devido. O IRPF-M, por sua vez, é apurado sobre uma base ampliada de rendimentos, sem essas deduções, e o imposto apurado na declaração de ajuste é considerado na redução do valor devido a título de IRPF-M. " +
  "Por isso, quando a tributação do contribuinte fica abaixo do patamar mínimo e há IRPF-M a recolher, a economia obtida com deduções na declaração de ajuste é compensada por um aumento equivalente do IRPF-M, e o benefício financeiro dessas deduções deixa de existir. Quando a tributação já supera o patamar mínimo, as deduções mantêm integralmente o seu efeito.";

const METHOD_NOTES = [
  "Base de cálculo: rendimentos tributáveis, rendimentos sujeitos à tributação exclusiva ou definitiva e lucros e dividendos posteriores a 2025. Rendimentos isentos como poupança, LCI, LCA, CRI, CRA, fundos imobiliários, doações e heranças ficam fora da base.",
  "Lucros e dividendos deliberados até 31/12/2025 não integram a base. Na falta de informação sobre a deliberação, a parcela foi tratada como posterior a 2025.",
  "Imposto pago: imposto retido ou recolhido no ano e imposto sobre a tributação exclusiva; na falta de informação desse imposto, presume-se a alíquota de 15%.",
  "Redutor do art. 16-B, por fonte pagadora: parcela posterior a 2025 × (alíquota efetiva de IRPJ e CSLL da empresa + alíquota do IRPF mínimo − alíquota nominal do setor), limitado ao saldo devido.",
];

export interface GeneratedReport {
  blob: Blob;
  fileName: string;
  usedFallbackFont: boolean;
}

// Builds the report and returns it; the caller decides how to deliver it
// (download, open in a new tab), so failures can be shown to the user.
export async function generatePdfReport(params: GeneratePdfReportParams): Promise<GeneratedReport> {
  return buildPdfReport(params, await preloadReportFiles());
}

export function buildPdfReport(params: GeneratePdfReportParams, files: ReportFiles): GeneratedReport {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const assets = applyFiles(doc, files);
  const r = new Report(doc, assets);
  const issued = new Date().toLocaleDateString("pt-BR");
  const eyebrow = params.taxpayerLabel?.trim() || "IRPF Mínimo · Lei nº 15.270/2025";

  // 1. General aspects of the IRPF Mínimo
  r.page({ eyebrow, title: "IRPF Mínimo: aspectos gerais", subtitle: "Regime do IRPF mínimo e efeitos sobre a apuração" }, true);
  TECHNICAL_MESSAGE.forEach((p) => r.paragraph(p));
  r.y += 6;
  r.callout(DEDUCTIONS_DYNAMIC, "alert", "Dinâmica relevante: o efeito das deduções");

  // 2. Methodological notes, before the calculations
  r.page({ eyebrow, title: "Notas metodológicas", subtitle: "Premissas adotadas na apuração" });
  const year = params.calendarYear;
  if (year && year < IRPFM_FIRST_CALENDAR_YEAR) {
    r.callout(
      `A declaração analisada refere-se ao ano-calendário ${year}, anterior à vigência do IRPF-M, que se aplica a partir do ano-calendário ${IRPFM_FIRST_CALENDAR_YEAR}. Por isso, a apuração tem caráter projetivo: aplica as regras da Lei nº 15.270/2025 aos rendimentos e ao imposto declarados, como estimativa do que ocorreria se a mesma situação se repetisse em ${IRPFM_FIRST_CALENDAR_YEAR}. Não há IRPF-M devido em relação ao ano-calendário ${year}.`,
      "neutral",
      "Caráter projetivo da apuração"
    );
  }
  METHOD_NOTES.forEach((n) => r.paragraph(`• ${n}`));
  r.footnote("Simulação de caráter consultivo, elaborada com base nos dados informados e nas regras da Lei nº 15.270/2025. Não substitui a declaração nem a análise individual de cada caso.");

  // 3. Calculations
  if (params.activeTab === "detailed") detailedPages(r, params, eyebrow, issued);
  else simulatorPages(r, params, eyebrow, issued);

  r.footers();
  const prefix = params.activeTab === "detailed" ? "apuracao_irpf_minimo" : "simulacao_irpf_minimo";
  const who = slug(params.taxpayerName ?? "");
  return {
    blob: doc.output("blob"),
    fileName: `${prefix}_${who || new Date().toISOString().split("T")[0]}.pdf`,
    usedFallbackFont: assets.font !== "Inter",
  };
}

// The IRPF-M applies from calendar year 2026 on (Lei nº 15.270/2025).
const IRPFM_FIRST_CALENDAR_YEAR = 2026;

// "Marina Coelho Leme" → "marina_coelho_leme" (safe file name).
function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detailedPages(r: Report, p: GeneratePdfReportParams, eyebrow: string, issued: string) {
  const res = p.results;
  const div = res.dividends;

  // 1. Result
  r.page({ eyebrow, title: "Apuração do IRPF mínimo", subtitle: `Memória de cálculo – emitido em ${issued}` });
  if (res.additionalTax > 0) {
    r.callout(
      `A tributação suportada no ano não alcança o patamar mínimo exigido. Há IRPF-M a recolher de ${brl(res.additionalTax)}, conforme demonstrado na tabela abaixo.`,
      "alert"
    );
  } else if (res.refund > 0) {
    r.callout(
      `A tributação suportada no ano supera o patamar mínimo. A retenção sobre lucros e dividendos gera restituição de ${brl(res.refund)}, conforme demonstrado na tabela abaixo.`,
      "neutral"
    );
  } else {
    r.callout("A tributação suportada no ano alcança o patamar mínimo exigido. Não há IRPF-M a recolher, conforme demonstrado na tabela abaixo.", "neutral");
  }
  const rows: Row[] = [
    { cells: ["Base de cálculo sujeita ao IRPF mínimo", brl(res.subjectBase)] },
    { cells: ["Alíquota efetiva do IRPF mínimo", formatPercent(res.minimumAliquot)] },
    { cells: ["IRPF mínimo devido", brl(res.minimumTaxDue)], kind: "highlight" },
    { cells: ["(−) Imposto pago ou retido no ano", dash(res.totalTaxPaid)] },
    { cells: ["(−) Redutor do art. 16-B", dash(res.reduction16B)] },
  ];
  if (res.refund > 0) rows.push({ cells: ["Restituição da retenção sobre dividendos", brl(res.refund)], kind: "highlight" });
  rows.push({ cells: ["IRPF-M a recolher", brl(res.additionalTax)], kind: "total" });
  r.table([{ label: "Descrição", width: WIDTH - 180 }, { label: "Valor", width: 180 }], rows);
  const notes = ["Valores em R$."];
  if (res.presumedExclusiveTax > 0) notes.push(`O imposto pago inclui ${brl(res.presumedExclusiveTax)} presumidos à alíquota de 15% sobre a tributação exclusiva sem imposto informado.`);
  if (div.protectedTotal > 0) notes.push(`Lucros e dividendos deliberados até 2025 (${brl(div.protectedTotal)}) não integram a base.`);
  if (div.sourcesMissingPjData > 0) notes.push(`${div.sourcesMissingPjData} fonte(s) pagadora(s) sem dados da empresa: redutor do art. 16-B não calculado para elas.`);
  r.footnote(notes.join(" "));

  // 2. Composition
  r.page({ eyebrow, title: "Composição da base de cálculo", subtitle: "Rendimentos e imposto considerados na apuração" });
  const incomeRows: Row[] = p.incomeItems
    .filter((i) => i.value !== 0)
    .map((i) => ({ cells: [i.label, i.isSubject ? "Sim" : "Não", brl(i.value)] }));
  if (div.posteriorTotal > 0) incomeRows.push({ cells: ["Lucros e dividendos posteriores a 2025", "Sim", brl(div.posteriorTotal)] });
  if (div.protectedTotal > 0) incomeRows.push({ cells: ["Lucros e dividendos deliberados até 2025", "Não", brl(div.protectedTotal)] });
  incomeRows.push({ cells: ["Base de cálculo sujeita ao IRPF mínimo", "", brl(res.subjectBase)], kind: "total" });
  r.table(
    [
      { label: "Rendimento", width: WIDTH - 320 },
      { label: "Entra na base", width: 140, align: "center" },
      { label: "Valor", width: 180 },
    ],
    incomeRows
  );

  r.y += 8;
  const taxRows: Row[] = p.taxItems.filter((t) => t.value !== 0).map((t) => ({ cells: [t.label, brl(t.value)] }));
  if (res.presumedExclusiveTax > 0) taxRows.push({ cells: ["Imposto presumido sobre a tributação exclusiva (15%)", brl(res.presumedExclusiveTax)] });
  if (div.withholdingTotal > 0) taxRows.push({ cells: ["Retenção de 10% sobre lucros e dividendos", brl(div.withholdingTotal)] });
  taxRows.push({ cells: ["Imposto pago ou retido considerado", brl(res.totalTaxPaid)], kind: "total" });
  r.table([{ label: "Imposto pago ou retido", width: WIDTH - 180 }, { label: "Valor", width: 180 }], taxRows);
  r.footnote("Valores em R$. O imposto devido na declaração de ajuste anual não é somado ao imposto pago, para que o mesmo imposto não seja considerado duas vezes.");

  // 3. Dividend sources
  if (p.dividendSources.length > 0) {
    r.page({ eyebrow, title: "Lucros e dividendos por fonte", subtitle: "Alocação entre parcela deliberada até 2025 e posterior, e redutor do art. 16-B" });
    const byId = new Map(div.perSource.map((x) => [x.id, x]));
    const rows: Row[] = p.dividendSources.map((s) => {
      const x = byId.get(s.id);
      const rate = x?.effectiveRate == null ? "—" : formatPercent(x.effectiveRate);
      return {
        cells: [s.name + (s.isSimples ? " (Simples)" : ""), brl(s.total), dash(Math.min(s.protectedAmount, s.total)), dash(x?.posterior ?? 0), rate, dash(x?.redutor ?? 0)],
      };
    });
    rows.push({ cells: ["Total", brl(div.total), dash(div.protectedTotal), dash(div.posteriorTotal), "", dash(div.redutorPotential)], kind: "total" });
    r.table(
      [
        { label: "Fonte pagadora", width: WIDTH - 590 },
        { label: "Total recebido", width: 118 },
        { label: "Deliberado até 2025", width: 128 },
        { label: "Posterior a 2025", width: 118 },
        { label: "Alíq. efetiva PJ", width: 106 },
        { label: "Redutor 16-B", width: 120 },
      ],
      rows
    );
    r.footnote(
      `Valores em R$. Redutor por fonte = parcela posterior × (alíquota efetiva de IRPJ e CSLL + alíquota do IRPF mínimo − alíquota nominal do setor). Soma das fontes: ${brl(div.redutorPotential)}; redutor aplicado, limitado ao saldo devido: ${brl(res.reduction16B)}.`
    );
  }
}

function simulatorPages(r: Report, p: GeneratePdfReportParams, eyebrow: string, issued: string) {
  const s = p.simResults;
  const period = p.simPeriod === "annual" ? "anual" : "mensal";
  r.page({ eyebrow, title: "Simulação do IRPF mínimo", subtitle: `Simulação ${period} por faixas de renda – emitido em ${issued}` });
  if (s.additionalMinTax > 0) {
    r.callout(`Na composição simulada, a tributação não alcança o patamar mínimo. Haveria IRPF-M a recolher de ${brl(s.additionalMinTax)}.`, "alert");
  } else {
    r.callout("Na composição simulada, a tributação alcança o patamar mínimo exigido. Não haveria IRPF-M a recolher.", "neutral");
  }
  r.table(
    [{ label: "Descrição", width: WIDTH - 180 }, { label: "Valor", width: 180 }],
    [
      { cells: ["Rendimentos tributáveis pela tabela progressiva", brl(p.simTaxableIncome)] },
      { cells: ["Rendimentos de aplicações financeiras (15%)", dash(p.simFinancialIncome)] },
      { cells: ["Resultado da atividade rural", dash(p.simRuralIncome)] },
      { cells: ["Lucros e dividendos posteriores a 2025", dash(p.simTaxedDividends)] },
      { cells: ["Lucros e dividendos isentos (fora da base)", dash(p.simExemptDividends)] },
      { cells: ["Imposto pelas regras ordinárias", brl(s.standardTaxDue)], kind: "highlight" },
      { cells: ["Base de cálculo do IRPF mínimo", brl(s.minimumBase)] },
      { cells: ["Alíquota efetiva do IRPF mínimo", formatPercent(s.minimumRate)] },
      { cells: ["IRPF mínimo devido", brl(s.minimumTaxDue)], kind: "highlight" },
      { cells: ["IRPF-M a recolher", brl(s.additionalMinTax)], kind: "total" },
    ]
  );
  const deduction =
    p.simDeductionMode === "simplified" ? "desconto simplificado" : `deduções completas (${p.simDependents} dependente${p.simDependents === 1 ? "" : "s"})`;
  r.footnote(`Valores em R$. Imposto ordinário calculado com ${deduction} de ${brl(s.deductionAmount)}, alíquota efetiva de ${formatPercent(s.standardEffectiveRate / 100)}.`);
}
