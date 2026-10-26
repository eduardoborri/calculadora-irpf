import type * as ExcelJSTypes from "exceljs";
import {
  DAA_TAX_ID,
  DEFAULT_PJ_NOMINAL_RATE,
  DIVIDEND_WITHHOLDING_RATE,
  EXCLUSIVE_INCOME_ID,
  EXCLUSIVE_TAX_ID,
  MAX_ALIQUOT,
  MAX_TAX_THRESHOLD,
  MIN_TAX_THRESHOLD,
  PRESUMED_EXCLUSIVE_TAX_RATE,
  SMALL_SOURCE_THRESHOLD,
} from "../constants";
import { CalculationResult, DividendSource, IncomeItem, TaxPaymentItem } from "../types";
import { slug } from "./format";

// Spreadsheet with the full calculation behind the tool's result: the same
// data and rules, written as Excel formulas so every step can be audited and
// changed. Port of tools/planilha_irpfm.py, fed by the tool's current state.

type ExcelJS = typeof ExcelJSTypes;
type Sheet = ExcelJSTypes.Worksheet;
type Cell = ExcelJSTypes.Cell;

export interface GenerateXlsxParams {
  incomeItems: IncomeItem[];
  taxItems: TaxPaymentItem[];
  dividendSources: DividendSource[];
  results: CalculationResult;
  // "Nome · DIRPF 2026 (AC 2025)"
  taxpayerLabel?: string;
  taxpayerName?: string;
  calendarYear?: number;
  dataOrigin: string;
}

export interface GeneratedSpreadsheet {
  blob: Blob;
  fileName: string;
}

// exceljs is ~1 MB, so it is loaded on demand (and preloaded when the tool
// opens, so the click doesn't wait for the download).
let excelPromise: Promise<ExcelJS> | null = null;
export function preloadExcel(): Promise<ExcelJS> {
  excelPromise ??= import("exceljs")
    .then((mod) => ((mod as unknown as { default?: ExcelJS }).default ?? mod) as ExcelJS)
    .catch((err) => {
      excelPromise = null;
      throw err;
    });
  return excelPromise;
}

export async function generateXlsxReport(params: GenerateXlsxParams): Promise<GeneratedSpreadsheet> {
  const ExcelJS = await preloadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calculadora IRPF-M – Gaia Silva Gaede Advogados";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  buildSheet(wb.addWorksheet("Apuração"), params);
  const buffer = await wb.xlsx.writeBuffer();
  const who = slug(params.taxpayerName ?? "");
  return {
    blob: new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName: `apuracao_irpf_minimo_${who || new Date().toISOString().split("T")[0]}.xlsx`,
  };
}

// ------------------------------------------------------------------ styles
const FONT = "Arial";
const BLUE = "FF0000FF";
const DARK = "FF143E3C";
const TEAL = "FF238783";
const BLACK = "FF000000";
const MUTED = "FF595959";
const MONEY = 'R$ #,##0.00;(R$ #,##0.00);"-"';
const PCT = '0.00%;(0.00%);"-"';
const FLAG = '"Sim";"Sim";"Não"';
const fill = (argb: string): ExcelJSTypes.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const YELLOW = fill("FFFFFF00");
const GREY = fill("FFEDEDED");
const SECTION_FILL = fill(DARK);
const SUB_FILL = fill("FFDCEBEA");
const TOTAL_FILL = fill("FFF2F2F2");
const RESULT_FILL = fill("FFFCE4D6");
const thin: ExcelJSTypes.Border = { style: "thin", color: { argb: "FFBFBFBF" } };
const BOX: Partial<ExcelJSTypes.Borders> = { left: thin, right: thin, top: thin, bottom: thin };
const LAST_COL = 14; // A..N
const WIDTHS = [7, 44, 17, 17, 17, 17, 17, 11, 11, 11, 16, 10, 15, 46];
const SPARE_SOURCE_ROWS = 3;
const COL = "ABCDEFGHIJKLMN";

interface StyleOptions {
  bold?: boolean;
  color?: string;
  size?: number;
  fill?: ExcelJSTypes.Fill;
  fmt?: string;
  align?: "left" | "center" | "right";
  wrap?: boolean;
  italic?: boolean;
}

type Value = string | number | null | { formula: string };

function buildSheet(ws: Sheet, p: GenerateXlsxParams) {
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:3" };
  WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  let row = 1;
  const R: Record<string, number> = {};
  const LBL: Record<string, string> = {};

  const put = (r: number, c: number, value: Value, o: StyleOptions = {}): Cell => {
    const cell = ws.getCell(r, c);
    if (value !== null) cell.value = value;
    cell.font = { name: FONT, bold: o.bold, italic: o.italic, size: o.size ?? 10, color: { argb: o.color ?? BLACK } };
    if (o.fill) cell.fill = o.fill;
    if (o.fmt) cell.numFmt = o.fmt;
    cell.alignment = { horizontal: o.align ?? "left", vertical: "middle", wrapText: o.wrap };
    return cell;
  };
  const f = (formula: string) => ({ formula });
  const merge = (r: number, c1: number, c2: number) => {
    if (c2 > c1) ws.mergeCells(r, c1, r, c2);
  };
  const finish = (height?: number) => {
    for (let c = 1; c <= LAST_COL; c++) ws.getCell(row, c).border = BOX;
    if (height) ws.getRow(row).height = height;
    row++;
  };
  const section = (title: string) => {
    row++;
    merge(row, 1, LAST_COL);
    put(row, 1, title, { bold: true, color: "FFFFFFFF", size: 11, fill: SECTION_FILL });
    ws.getRow(row).height = 20;
    row++;
  };
  const header = (labels: [number, string][], spans: Record<number, number> = {}) => {
    for (const [c, text] of labels) {
      put(row, c, text, { bold: true, color: DARK, fill: SUB_FILL, align: c > 2 ? "center" : "left", wrap: true });
      merge(row, c, spans[c] ?? c);
    }
    for (let c = 1; c <= LAST_COL; c++) {
      ws.getCell(row, c).border = BOX;
      ws.getCell(row, c).fill = SUB_FILL;
    }
    ws.getRow(row).height = 30;
    row++;
  };
  const sub = (title: string) => {
    merge(row, 1, LAST_COL);
    put(row, 1, title, { bold: true, color: TEAL, fill: SUB_FILL });
    row++;
  };
  const A = (key: string) => `$C$${R[key]}`;

  const res = p.results;
  const year = p.calendarYear;
  const projective = year !== undefined && year < 2026;

  // ---------------------------------------------------------------- title
  merge(1, 1, LAST_COL);
  put(1, 1, "Apuração do IRPF Mínimo (Lei nº 15.270/2025) – memória de cálculo da Calculadora IRPF-M", { bold: true, color: DARK, size: 15 });
  ws.getRow(1).height = 24;
  merge(2, 1, LAST_COL);
  put(
    2,
    1,
    `CONFIDENCIAL – Contribuinte: ${p.taxpayerLabel?.trim() || "não informado"}. Uso interno do Gaia Silva Gaede Advogados - PR. ` +
      `Fonte dos dados: ${p.dataOrigin}. Emitida em ${new Date().toLocaleDateString("pt-BR")}.`,
    { italic: true, color: "FFC00000", wrap: true }
  );
  ws.getRow(2).height = 34;
  merge(3, 1, LAST_COL);
  put(
    3,
    1,
    "Legenda: texto azul = dado de entrada · fundo amarelo = premissa ou dado a preencher/alocar · texto preto = fórmula. " +
      "Os valores de entrada são os da ferramenta no momento da exportação; alterá-los aqui recalcula toda a apuração.",
    { size: 9, color: MUTED, wrap: true }
  );
  ws.getRow(3).height = 30;
  row = 4;

  // ---------------------------------------------------------------- 1. premissas
  section("1. PREMISSAS (alteráveis – fundo amarelo)");
  header([[1, "Ref."], [2, "Premissa"], [3, "Valor"], [4, "Fundamento / observação"]], { 4: LAST_COL });
  const premises: [string, string, number, string, string][] = [
    ["P1", "Limite inferior da base sujeita (alíquota zero até este valor)", MIN_TAX_THRESHOLD, MONEY,
      "Lei nº 15.270/2025 – rendimentos até R$ 600 mil no ano não sofrem a tributação mínima."],
    ["P2", "Limite superior da base sujeita (alíquota máxima a partir deste valor)", MAX_TAX_THRESHOLD, MONEY,
      "Entre P1 e P2 a alíquota cresce linearmente de 0% até P3."],
    ["P3", "Alíquota máxima do IRPF mínimo", MAX_ALIQUOT, PCT, "Alíquota aplicável a partir de R$ 1,2 milhão."],
    ["P4", "Alíquota presumida sobre rendimentos de tributação exclusiva/definitiva sem informação do imposto", PRESUMED_EXCLUSIVE_TAX_RATE, PCT,
      "Premissa do escritório: na falta de informação, presume-se 15%."],
    ["P5", "Alíquota nominal de IRPJ + CSLL padrão", DEFAULT_PJ_NOMINAL_RATE, PCT,
      "34% demais PJ · 40% seguradoras, capitalização e demais financeiras (CSLL 15%) · 45% bancos (CSLL 20%). " +
        "Valor inicial das linhas livres da coluna H e base do indicador C19."],
    ["P6", 'Limite para agrupar fontes em "Demais fontes"', SMALL_SOURCE_THRESHOLD, MONEY,
      "Fontes que pagaram menos que isto cada uma são agrupadas numa única linha, sem redutor. Regra da ferramenta (informativa)."],
    ["P7", "Alíquota da retenção na fonte sobre dividendos posteriores a 2025", DIVIDEND_WITHHOLDING_RATE, PCT,
      "Aplicada à parcela posterior das fontes marcadas com retenção = Sim (coluna L)."],
  ];
  for (const [ref, label, value, fmt, why] of premises) {
    R[ref] = row;
    put(row, 1, ref, { bold: true, color: DARK, align: "center" });
    put(row, 2, label, { wrap: true });
    put(row, 3, value, { color: BLUE, fill: YELLOW, fmt, align: "center" });
    merge(row, 4, LAST_COL);
    put(row, 4, why, { size: 9, color: MUTED, wrap: true });
    finish(30);
  }

  const qualitative: [string, string][] = [
    ["Q1", "Base sujeita = rendimentos marcados como sujeitos na seção 2 (tributáveis e de tributação exclusiva/definitiva) + parcela " +
      "POSTERIOR a 2025 dos lucros e dividendos. Rendimentos isentos (poupança, LCI/LCA, CRI/CRA, FII, doações e heranças) ficam fora da base. " +
      "A classificação considera as informações disponibilizadas e está sujeita à confirmação do enquadramento legal de cada rendimento."],
    ["Q2", "Lucros e dividendos deliberados até 31/12/2025 não integram a base; informe a parcela protegida na coluna D da tabela de fontes. " +
      "A falta de documentação sobre a deliberação é uma limitação da análise, e não prova de que a deliberação ocorreu após 2025."],
    ["Q3", "Crédito contra o IRPF mínimo = imposto retido ou recolhido no ano + imposto sobre a tributação exclusiva (informado ou presumido " +
      "pela P4) + retenção de 10% sobre dividendos (fontes marcadas). O imposto devido na declaração de ajuste anual não é somado, para evitar dupla contagem."],
    ["Q4", "Redutor do art. 16-B, fonte a fonte = parcela posterior × máx(0; alíquota efetiva da PJ + alíquota do IRPF mínimo − alíquota nominal da PJ), " +
      "limitado ao saldo devido. Fonte sem dados da PJ ou agrupada em \"Demais fontes\" não gera redutor. A aplicação depende de dados das fontes " +
      "pagadoras, e ainda não foi esclarecido como essas informações constarão da DIRPF 2027 (ano-calendário 2026)."],
    ["Q5", "O IRPF-M apurado é incorporado ao saldo do imposto a pagar ou a restituir na declaração de ajuste anual. Apenas a retenção na fonte " +
      "sobre dividendos pode gerar restituição."],
    ["Q6", projective
      ? `A declaração é do ano-calendário ${year}, anterior à vigência do IRPF-M (a partir do ano-calendário 2026). A apuração tem caráter projetivo: ` +
        "aplica as regras da Lei nº 15.270/2025 aos mesmos valores. Não há IRPF-M devido em relação a esse ano."
      : year
        ? `Apuração referente ao ano-calendário ${year}.`
        : "Ano-calendário não identificado (valores informados na tela)."],
  ];
  for (const [ref, text] of qualitative) {
    put(row, 1, ref, { bold: true, color: DARK, align: "center" });
    merge(row, 2, LAST_COL);
    put(row, 2, text, { wrap: true });
    finish(30);
  }

  // ---------------------------------------------------------------- 2. dados
  section("2. DADOS DA DECLARAÇÃO (exceto lucros e dividendos – ver seção 3)");
  header([[1, "Ref."], [2, "Rendimento"], [3, "Valor (R$)"], [4, "Entra na base?"], [5, "Observação"]], { 5: LAST_COL });
  let counter = 0;
  const dataRow = (key: string, label: string, value: number, flag: number | string, obs = "") => {
    counter++;
    LBL[key] = `D${counter}`;
    R[key] = row;
    put(row, 1, LBL[key], { bold: true, color: DARK, align: "center" });
    put(row, 2, label, { wrap: true });
    put(row, 3, value, { color: BLUE, fmt: MONEY, align: "right" });
    if (typeof flag === "number") {
      put(row, 4, flag, { color: BLUE, fill: YELLOW, fmt: FLAG, align: "center" });
      ws.getCell(row, 4).dataValidation = { type: "list", allowBlank: false, formulae: ['"0,1"'] };
    } else {
      put(row, 4, flag, { size: 9, align: "center" });
    }
    merge(row, 5, LAST_COL);
    put(row, 5, obs, { size: 9, color: MUTED, wrap: true });
    finish(obs.length > 110 ? 28 : undefined);
  };

  const incomeKeys = p.incomeItems.map((item) => {
    const key = `inc_${item.id}`;
    const obs = item.id === EXCLUSIVE_INCOME_ID ? "Base da presunção P4 quando o imposto sobre a tributação exclusiva não é informado." : "";
    dataRow(key, item.label, item.value, item.isSubject ? 1 : 0, obs);
    return key;
  });
  const exclusiveIncomeKey = p.incomeItems.some((i) => i.id === EXCLUSIVE_INCOME_ID) ? `inc_${EXCLUSIVE_INCOME_ID}` : null;

  row++;
  header([[1, "Ref."], [2, "Imposto pago / informado"], [3, "Valor (R$)"], [4, "Tratamento"], [5, "Observação"]], { 5: LAST_COL });
  const taxKeys = p.taxItems.map((item) => {
    const key = `tax_${item.id}`;
    if (item.id === EXCLUSIVE_TAX_ID) {
      dataRow(key, item.label, item.value, "Trib. exclusiva", "Se zero, presume-se a alíquota P4 sobre os rendimentos de tributação exclusiva (C8).");
    } else if (item.id === DAA_TAX_ID) {
      dataRow(key, item.label, item.value, "Não somado", "Informativo: não entra no crédito, para que o mesmo imposto não seja considerado duas vezes.");
    } else {
      dataRow(key, item.label, item.value, "Pago/retido");
    }
    return key;
  });
  const exclusiveTaxKey = p.taxItems.some((t) => t.id === EXCLUSIVE_TAX_ID) ? `tax_${EXCLUSIVE_TAX_ID}` : null;
  const daaTaxKey = p.taxItems.some((t) => t.id === DAA_TAX_ID) ? `tax_${DAA_TAX_ID}` : null;

  // ---------------------------------------------------------------- 3. fontes pagadoras
  section("3. LUCROS E DIVIDENDOS POR FONTE PAGADORA – alocação e redutor do art. 16-B (preencher colunas amarelas)");
  header([
    [1, "Ref."], [2, "Fonte pagadora (nome – CNPJ)"], [3, "Total recebido (R$)"], [4, "Deliberado até 2025 – protegido (R$)"],
    [5, "Posterior a 2025 – sujeito (R$)"], [6, "Lucro contábil da PJ antes de IRPJ/CSLL (R$)"], [7, "IRPJ + CSLL devidos (R$)"],
    [8, "Alíq. nominal"], [9, "Alíq. efetiva"], [10, "% redutor"], [11, "Redutor (R$)"], [12, "Retenção 10%?"],
    [13, "Retenção (R$)"], [14, "Observação"],
  ]);
  const firstSrc = row;
  const redutorRateRows: number[] = [];
  let index = 0;
  const sourceRow = (s: DividendSource | null) => {
    index++;
    const r = row;
    const aggregate = !!s?.isAggregate;
    put(r, 1, `F${index}`, { bold: true, color: DARK, align: "center" });
    const name = s ? s.name + (s.isSimples ? " (Simples)" : "") + (s.cnpj ? ` – ${s.cnpj}` : "") : "";
    put(r, 2, name, { wrap: true, color: BLUE });
    put(r, 3, s ? s.total : null, { color: BLUE, fmt: MONEY, align: "right" });
    put(r, 4, s ? Math.min(s.protectedAmount, s.total) : 0, { color: BLUE, fill: YELLOW, fmt: MONEY, align: "right" });
    put(r, 5, f(`MAX(0,C${r}-D${r})`), { fmt: MONEY, align: "right" });
    if (aggregate) {
      for (const c of [6, 7, 8, 9]) put(r, c, "n/a", { color: "FF7F7F7F", fill: GREY, align: "center", size: 9 });
      put(r, 10, 0, { fmt: PCT, align: "right", fill: GREY });
    } else {
      put(r, 6, s?.pjProfit ?? 0, { color: BLUE, fill: YELLOW, fmt: MONEY, align: "right" });
      put(r, 7, s?.pjTax ?? 0, { color: BLUE, fill: YELLOW, fmt: MONEY, align: "right" });
      put(r, 8, s ? s.nominalRate : f(A("P5")), { color: BLUE, fill: YELLOW, fmt: PCT, align: "center" });
      ws.getCell(r, 8).dataValidation = { type: "list", allowBlank: false, formulae: ['"0.34,0.4,0.45"'] };
      put(r, 9, f(`IF(F${r}>0,G${r}/F${r},"")`), { fmt: PCT, align: "right" });
      redutorRateRows.push(r); // column J needs the minimum rate, written after section 4
    }
    put(r, 11, f(`E${r}*J${r}`), { fmt: MONEY, align: "right" });
    put(r, 12, s?.withholding ? 1 : 0, { color: BLUE, fill: YELLOW, fmt: FLAG, align: "center" });
    ws.getCell(r, 12).dataValidation = { type: "list", allowBlank: false, formulae: ['"0,1"'] };
    put(r, 13, f(`E${r}*L${r}*${A("P7")}`), { fmt: MONEY, align: "right" });
    const note = s ? s.note ?? "" : "Linha livre para nova fonte.";
    put(r, 14, note, { size: 9, color: MUTED, wrap: true });
    finish(s && note.length > 120 ? 42 : s ? 30 : undefined);
  };
  p.dividendSources.filter((s) => !s.isAggregate).forEach(sourceRow);
  for (let i = 0; i < SPARE_SOURCE_ROWS; i++) sourceRow(null);
  const lastRegular = row - 1;
  p.dividendSources.filter((s) => s.isAggregate).forEach(sourceRow);
  const lastSrc = row - 1;

  R.SRC_TOT = row;
  put(row, 2, "TOTAL", { bold: true, fill: TOTAL_FILL });
  for (const c of [3, 4, 5, 11, 13]) {
    const L = COL[c - 1];
    put(row, c, f(`SUM(${L}${firstSrc}:${L}${lastSrc})`), { bold: true, fmt: MONEY, align: "right", fill: TOTAL_FILL });
  }
  for (const c of [1, 6, 7, 8, 9, 10, 12, 14]) ws.getCell(row, c).fill = TOTAL_FILL;
  finish();

  const checkRow = (key: string, label: string, value: Value, fmt: string, note: string, redIfNonZero = true) => {
    R[key] = row;
    merge(row, 1, 2);
    put(row, 1, label, { bold: true, size: 9, wrap: true });
    put(row, 3, value, { fmt, align: "right", bold: true, color: typeof value === "number" ? BLUE : BLACK });
    merge(row, 4, LAST_COL);
    put(row, 4, note, { size: 9, color: MUTED, wrap: true });
    if (redIfNonZero) {
      ws.addConditionalFormatting({
        ref: `C${row}`,
        rules: [{ type: "expression", formulae: [`C${row}<>0`], priority: 1, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFC7CE" } } } }],
      });
    }
    finish();
  };
  checkRow("CHK1", "Conferência: fontes com parcela protegida maior que o total", f(`SUMPRODUCT((D${firstSrc}:D${lastSrc}>C${firstSrc}:C${lastSrc})*1)`),
    "0", "Deve ser zero.");
  checkRow("CHK2", "Fontes com dividendo sujeito sem dados da PJ (redutor zerado)",
    f(`SUMPRODUCT((E${firstSrc}:E${lastRegular}>0)*(F${firstSrc}:F${lastRegular}=0))`), "0",
    "Preencher lucro e IRPJ + CSLL dessas PJs nas colunas F e G para calcular o redutor.");
  merge(row, 1, LAST_COL);
  put(row, 1, "A falta de documentação sobre a data de deliberação dos lucros e dividendos é uma limitação desta análise, e não prova de que a " +
    "deliberação tenha ocorrido após 2025.", { size: 9, italic: true, color: MUTED, wrap: true });
  ws.getRow(row).height = 26;
  row++;

  // ---------------------------------------------------------------- 4. cálculo
  section("4. CÁLCULO DO IRPF MÍNIMO");
  header([[1, "Ref."], [2, "Etapa"], [3, "Valor (R$)"], [4, "Memória de cálculo"]], { 4: LAST_COL });
  const calc = (ref: string, label: string, value: Value, memo: string, fmt = MONEY, kind?: "total" | "result") => {
    R[ref] = row;
    const rowFill = kind === "total" ? TOTAL_FILL : kind === "result" ? RESULT_FILL : undefined;
    const bold = kind !== undefined;
    put(row, 1, ref, { bold: true, color: DARK, align: "center", fill: rowFill });
    put(row, 2, label, { bold, fill: rowFill, wrap: true });
    put(row, 3, value, { bold, fmt, align: "right", fill: rowFill });
    merge(row, 4, LAST_COL);
    put(row, 4, memo, { size: 9, color: MUTED, wrap: true, fill: rowFill });
    finish();
  };
  const C = (ref: string) => `C${R[ref]}`;
  const range = (keys: string[]) => `$C$${R[keys[0]]}:$C$${R[keys[keys.length - 1]]}`;
  const flags = (keys: string[]) => `$D$${R[keys[0]]}:$D$${R[keys[keys.length - 1]]}`;
  const labels = (keys: string[]) => (keys.length > 1 ? `${LBL[keys[0]]} a ${LBL[keys[keys.length - 1]]}` : LBL[keys[0]]);
  const T = R.SRC_TOT;

  sub("4.1 Base sujeita ao IRPF mínimo");
  calc("C1", "Rendimentos sujeitos (seção 2)", incomeKeys.length ? f(`SUMPRODUCT(${range(incomeKeys)},${flags(incomeKeys)})`) : 0,
    incomeKeys.length ? `Soma de ${labels(incomeKeys)} marcados como "Sim".` : "Sem rendimentos.");
  calc("C2", "(+) Lucros e dividendos posteriores a 2025", f(`E${T}`), "Total da coluna E da tabela de fontes (seção 3).");
  calc("C3", "Base sujeita ao IRPF mínimo", f(`${C("C1")}+${C("C2")}`), "C1 + C2.", MONEY, "total");

  sub("4.2 Alíquota e IRPF mínimo devido");
  calc("C4", "Alíquota do IRPF mínimo",
    f(`IF(${C("C3")}<${A("P1")},0,IF(${C("C3")}>=${A("P2")},${A("P3")},(${C("C3")}-${A("P1")})/(${A("P2")}-${A("P1")})*${A("P3")}))`),
    "Se C3 < P1: 0%. Se C3 ≥ P2: P3. Entre os dois: (C3 − P1) ÷ (P2 − P1) × P3.", PCT);
  calc("C5", "IRPF mínimo devido", f(`${C("C3")}*${C("C4")}`), "C3 × C4.", MONEY, "total");

  sub("4.3 Imposto já pago / considerado");
  const excluded = [exclusiveTaxKey, daaTaxKey].filter((k): k is string => k !== null);
  const paidFormula = taxKeys.length ? `SUM(${range(taxKeys)})` + excluded.map((k) => `-${A(k)}`).join("") : "0";
  calc("C6", "Imposto retido ou recolhido no ano", f(paidFormula),
    taxKeys.length ? `Soma de ${labels(taxKeys)}, exceto o imposto sobre a tributação exclusiva (C7) e o imposto devido na declaração de ajuste.` : "Sem impostos.");
  calc("C7", "Imposto sobre tributação exclusiva informado", exclusiveTaxKey ? f(A(exclusiveTaxKey)) : 0, exclusiveTaxKey ? `${LBL[exclusiveTaxKey]}.` : "Não informado.");
  calc("C8", "Imposto presumido sobre a tributação exclusiva",
    exclusiveIncomeKey ? f(`IF(AND(${C("C7")}=0,$D$${R[exclusiveIncomeKey]}=1),${A(exclusiveIncomeKey)}*${A("P4")},0)`) : 0,
    exclusiveIncomeKey ? `Se C7 = 0 e ${LBL[exclusiveIncomeKey]} entra na base: ${LBL[exclusiveIncomeKey]} × P4.` : "Sem rendimentos de tributação exclusiva.");
  calc("C9", "Retenção de 10% sobre dividendos posteriores (fontes marcadas)", f(`M${T}`), "Total da coluna M da tabela de fontes.");
  calc("C10", "Total de imposto já pago / considerado", f(`SUM(${C("C6")}:${C("C9")})`), "C6 + C7 + C8 + C9.", MONEY, "total");
  calc("C11", "Saldo devido antes do redutor", f(`MAX(0,${C("C5")}-${C("C10")})`), "máx(0; C5 − C10).");

  sub("4.4 Redutor do art. 16-B (fonte a fonte)");
  calc("C12", "Redutor potencial (soma das fontes)", f(`K${T}`), "Total da coluna K da tabela de fontes.");
  calc("C13", "Redutor aplicado", f(`MIN(${C("C11")},${C("C12")})`), "mín(C11; C12) – limitado ao saldo devido, sem restituição.", MONEY, "total");

  sub("4.5 Resultado");
  calc("C14", "IRPF-M APURADO", f(`${C("C11")}-${C("C13")}`),
    "C11 − C13. Valor incorporado ao saldo do imposto a pagar ou a restituir na declaração de ajuste anual.", MONEY, "result");
  calc("C15", "Restituição da retenção sobre dividendos", f(`MAX(0,${C("C9")}-MAX(0,${C("C5")}-(${C("C10")}-${C("C9")})))`),
    "máx(0; C9 − máx(0; C5 − (C10 − C9))). Só a retenção sobre dividendos é restituível.", MONEY, "result");
  calc("C16", "Carga total de IR", f(`${C("C10")}+${C("C14")}-${C("C15")}`), "C10 + C14 − C15.");
  calc("C17", "Carga efetiva sobre a base sujeita", f(`IF(${C("C3")}>0,${C("C16")}/${C("C3")},0)`), "C16 ÷ C3.", PCT);
  const allIncome = (incomeKeys.length ? `SUM(${range(incomeKeys)})+` : "") + `C${T}`;
  calc("C18", "Carga efetiva sobre o rendimento total", f(`IF((${allIncome})>0,${C("C16")}/(${allIncome}),0)`),
    "C16 ÷ (todos os rendimentos da seção 2 + total de lucros e dividendos).", PCT);
  calc("C19", "Alíquota efetiva uniforme das PJs que zeraria o IRPF-M",
    f(`IF(AND(${C("C2")}>0,${C("C11")}>0),MIN(1,${A("P5")}-${C("C4")}+${C("C11")}/${C("C2")}),0)`),
    "P5 − C4 + C11 ÷ C2. Indicador: supõe todas as fontes com a mesma alíquota efetiva e nominal P5.", PCT);

  // Column J of the source table: redutor rate, using the minimum rate (C4).
  for (const r of redutorRateRows) {
    put(r, 10, f(`IF(ISNUMBER(I${r}),MAX(0,I${r}+$C$${R.C4}-H${r}),0)`), { fmt: PCT, align: "right" });
  }

  // ---------------------------------------------------------------- 5. conferência
  section("5. CONFERÊNCIA COM A FERRAMENTA");
  checkRow("TOOL", "IRPF-M apurado pela ferramenta na exportação", res.additionalTax, MONEY,
    "Valor exibido na Calculadora IRPF-M no momento da exportação (dado fixo).", false);
  checkRow("CHK3", "Diferença entre a planilha (C14) e a ferramenta", f(`ROUND(${C("C14")}-${C("TOOL")},2)`), MONEY,
    "Zero enquanto os dados não forem alterados nesta planilha (vermelho = diferença).");

  row++;
  merge(row, 1, LAST_COL);
  put(row, 1, "Simulação de caráter consultivo, elaborada com base nos dados informados e nas regras da Lei nº 15.270/2025. " +
    "Não substitui a declaração nem a análise individual de cada caso.", { size: 8, italic: true, color: "FF7F7F7F" });
}
