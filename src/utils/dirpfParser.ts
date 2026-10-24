import { PRESUMED_EXCLUSIVE_TAX_RATE } from "../constants";
import { DividendSource, ParsedDirpf, ParsedDirpfField } from "../types";
import { consolidateSources } from "./dividends";
import { formatCurrency, parseCurrencyBR } from "./format";

const CURRENCY = "(\\d{1,3}(?:\\.\\d{3})*,\\d{2})";

interface LineMatcher {
  targetType: "income" | "tax";
  targetId: string;
  label: string;
  labelPattern: string;
}

/**
 * Matchers calibrated against 11 real declarations exported by the
 * Programa Gerador da Declaração (PGD), both "deduções legais" and
 * "desconto simplificado" layouts. They target the "Resumo" summary block
 * (label and value on the same line once text is reconstructed in reading
 * order — see pdfText.ts).
 *
 * PJ / Art. 16-B data is NOT part of the declaration and must always be
 * filled in manually.
 */
const LINE_MATCHERS: LineMatcher[] = [
  { targetType: "income", targetId: "i1", label: "Recebidos de Pessoa Jurídica pelo titular", labelPattern: "Recebidos de Pessoa Jur[ií]dica pelo titular" },
  { targetType: "income", targetId: "i2", label: "Recebidos de Pessoa Jurídica pelos dependentes", labelPattern: "Recebidos de Pessoa Jur[ií]dica pelos dependentes" },
  { targetType: "income", targetId: "i3", label: "Recebidos de Pessoa Física/Exterior pelo titular", labelPattern: "Recebidos de Pessoa F[ií]sica/Exterior pelo titular" },
  { targetType: "income", targetId: "i4", label: "Recebidos de Pessoa Física/Exterior pelos dependentes", labelPattern: "Recebidos de Pessoa F[ií]sica/Exterior pelos dependentes" },
  { targetType: "income", targetId: "i5", label: "Recebidos acumuladamente pelo titular", labelPattern: "Recebidos acumuladamente pelo titular" },
  { targetType: "income", targetId: "i6", label: "Recebidos acumuladamente pelos dependentes", labelPattern: "Recebidos acumuladamente pelos dependentes" },
  { targetType: "income", targetId: "i7", label: "Resultado tributável da Atividade Rural", labelPattern: "Resultado tribut[aá]vel da Atividade Rural" },
  { targetType: "tax", targetId: "t1", label: "Imposto retido na fonte do titular", labelPattern: "Imposto retido na fonte do titular" },
  { targetType: "tax", targetId: "t2", label: "Imposto retido na fonte dos dependentes", labelPattern: "Imp\\.?\\s*retido na fonte dos dependentes" },
  { targetType: "tax", targetId: "t3", label: "Carnê-Leão do titular", labelPattern: "Carn[eê]-Le[aã]o do titular" },
  { targetType: "tax", targetId: "t4", label: "Carnê-Leão dos dependentes", labelPattern: "Carn[eê]-Le[aã]o dos dependentes" },
  { targetType: "tax", targetId: "t5", label: "Imposto complementar", labelPattern: "Imposto complementar" },
  { targetType: "tax", targetId: "t6", label: "Imposto pago no exterior", labelPattern: "Imposto pago no exterior" },
  { targetType: "tax", targetId: "t7", label: "Imposto retido RRA", labelPattern: "Imposto retido RRA" },
  { targetType: "tax", targetId: "t8", label: "Imposto pago Lei 11.033/2004", labelPattern: "Imposto (?:retido na fonte|pago) \\(Lei n[ºo]?\\s*11\\.?033/2004\\)" },
];

const EXEMPT_HEADER = "RENDIMENTOS\\s+ISENTOS\\s+E\\s+N[AÃ]O\\s+TRIBUT[AÁ]VEIS";
const EXCLUSIVE_HEADER = "RENDIMENTOS\\s+SUJEITOS.{0,10}TRIBUTA[CÇ][AÃ]O\\s+EXCLUSIVA";
// Item codes are fixed by the PGD: 09 in the exempt ficha, 12 in the exclusive one.
const DIVIDENDS_ITEM = "09\\.\\s+Lucros e dividendos recebidos";
const SIMPLES_ITEM = "13\\.\\s+Rendimento de s[oó]cio ou titular de microempresa";
const FOREIGN_INCOME_ITEM = "12\\.\\s+Aplica[cç][oõ]es Financeiras e Lucros e Dividendos no Exterior";
// Tax on item 12, printed in the "Resumo" (part of the "Total do imposto devido").
const FOREIGN_TAX_LINE = "Imposto Lei 14\\.?754/2023";

const roundCents = (value: number) => Math.round(value * 100) / 100;

function extractLineValue(text: string, labelPattern: string): number | null {
  // Label and value on the same reconstructed line. Deliberately does NOT
  // anchor on end-of-line: a second column further right on the page (e.g.
  // "Informações Bancárias" next to "Imposto Pago") can land on the same
  // row after reconstruction, so we only require the first currency number
  // right after the label.
  const regex = new RegExp(`^[^\\S\\n]*${labelPattern}[^\\S\\n]+${CURRENCY}`, "im");
  const match = regex.exec(text);
  return match ? parseCurrencyBR(match[1]) : null;
}

// Returns the itemized body of a ficha and its TOTAL, or null if the ficha
// is absent or empty.
function findSection(text: string, headerPattern: string): { body: string; total: number } | null {
  const headerMatch = new RegExp(headerPattern, "i").exec(text);
  if (!headerMatch) return null;

  const rest = text.slice(headerMatch.index + headerMatch[0].length);

  // An empty ficha is printed as the header followed only by "Sem
  // Informações" and has no TOTAL of its own; searching on would pick up
  // the TOTAL of the next ficha instead.
  const afterHeaderLine = rest.slice(rest.indexOf("\n") + 1);
  if (/^\s*Sem Informa/i.test(afterHeaderLine)) return null;

  // Each ficha has exactly one "TOTAL" line, right at its end — so the
  // first one after the header is always its own.
  const totalMatch = new RegExp(`^[^\\S\\n]*TOTAL[^\\S\\n]+${CURRENCY}`, "im").exec(rest);
  if (!totalMatch) return null;

  return { body: rest.slice(0, totalMatch.index), total: parseCurrencyBR(totalMatch[1]) };
}

// Value of a numbered item inside a ficha body, e.g.
// "09. Lucros e dividendos recebidos          19.420.000,00".
function findNumberedItem(body: string, itemPattern: string): number {
  const match = new RegExp(`^[^\\S\\n]*${itemPattern}.*?[^\\S\\n]{2,}${CURRENCY}`, "im").exec(body);
  return match ? parseCurrencyBR(match[1]) : 0;
}

// One paying-source row inside an item block, e.g.
// "Titular   000.000.000-00   26.262.332/0001-38   EMPRESA X LTDA.   19.420.000,00"
const SOURCE_ROW = new RegExp(
  `^\\s*(?:Titular|Dependente)\\s+\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\s+(\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2})\\s+(.+?)\\s+${CURRENCY}\\s*$`
);
const HAS_AMOUNT = new RegExp(CURRENCY);

// Rows of a numbered item (from its header line to the next item or TOTAL),
// plus the item's own printed total.
function findItemSources(body: string, itemPattern: string): { total: number; rows: { cnpj: string; name: string; total: number }[] } {
  const header = new RegExp(`^[^\\S\\n]*${itemPattern}.*?[^\\S\\n]{2,}${CURRENCY}[^\\S\\n]*$`, "im").exec(body);
  if (!header) return { total: 0, rows: [] };
  const rest = body.slice(header.index + header[0].length);
  const end = /^[^\S\n]*(?:\d{2}\.\s|TOTAL\b)/m.exec(rest);
  const block = rest.slice(0, end ? end.index : rest.length);
  // Long company names wrap onto the next line ("EMPRESA EXEMPLO PARTICIPACOES E" /
  // "INVESTIMENTOS S.A."): a following text-only line is appended to the name.
  const lines = block.split("\n");
  const rows: { cnpj: string; name: string; total: number }[] = [];
  lines.forEach((line, idx) => {
    const m = SOURCE_ROW.exec(line);
    if (!m) return;
    let name = m[2].replace(/\s{2,}/g, " ").trim();
    const next = (lines[idx + 1] ?? "").trim();
    if (next && !HAS_AMOUNT.test(next) && !/^(Titular|Dependente)\b/.test(next) && !/^\d{2}\.\s/.test(next)) {
      name = `${name} ${next.replace(/\s{2,}/g, " ")}`;
    }
    rows.push({ cnpj: m[1], name, total: parseCurrencyBR(m[3]) });
  });
  return { total: parseCurrencyBR(header[1]), rows };
}

export function parseDirpf(fullText: string): ParsedDirpf {
  const results: ParsedDirpfField[] = [];
  const add = (targetType: "income" | "tax", targetId: string, label: string, value: number) => {
    if (value > 0) results.push({ targetType, targetId, label, value: roundCents(value), sourceSnippet: label });
  };

  for (const matcher of LINE_MATCHERS) {
    add(matcher.targetType, matcher.targetId, matcher.label, extractLineValue(fullText, matcher.labelPattern) ?? 0);
  }

  // Lucros e dividendos (item 09) and Simples Nacional distributions (item
  // 13) leave the exempt total and become one row per paying source. If the
  // rows don't add up to the item total (layout not recognized), the gap is
  // kept as a flagged row so the totals still match the declaration.
  const sources: DividendSource[] = [];
  let declaredDividendTotal = 0;
  const exempt = findSection(fullText, EXEMPT_HEADER);
  if (exempt) {
    const raw: { name: string; cnpj: string; total: number; isSimples?: boolean }[] = [];
    for (const [pattern, isSimples] of [
      [DIVIDENDS_ITEM, false],
      [SIMPLES_ITEM, true],
    ] as const) {
      const item = findItemSources(exempt.body, pattern);
      declaredDividendTotal += item.total;
      raw.push(...item.rows.map((r) => ({ ...r, isSimples })));
      const gap = roundCents(item.total - item.rows.reduce((acc, r) => acc + r.total, 0));
      if (gap > 0.009) raw.push({ name: "Fonte não identificada na leitura (conferir na DIRPF)", cnpj: "", total: gap, isSimples });
    }
    sources.push(...consolidateSources(raw));
    add("income", "i8", "Rendimentos isentos e não tributáveis (exceto lucros e dividendos)", exempt.total - declaredDividendTotal);
  }

  // Exclusive/definitive taxation: the 15% presumption only applies where
  // the tax isn't informed. The tax on foreign income (Lei 14.754) is in the
  // declaration, so it's used as-is and 15% is presumed only on the rest.
  // Without it, t14 stays empty and the calculator presumes 15% on the total.
  const exclusive = findSection(fullText, EXCLUSIVE_HEADER);
  if (exclusive) {
    add("income", "i9", "Rendimentos Sujeitos à Tributação Exclusiva/Definitiva (total)", exclusive.total);

    const foreignIncome = findNumberedItem(exclusive.body, FOREIGN_INCOME_ITEM);
    const foreignTax = extractLineValue(fullText, FOREIGN_TAX_LINE) ?? 0;
    if (foreignIncome > 0 && foreignTax > 0) {
      const presumedOnRest = roundCents(Math.max(0, exclusive.total - foreignIncome) * PRESUMED_EXCLUSIVE_TAX_RATE);
      add(
        "tax",
        "t14",
        `Imposto s/ tributação exclusiva: Lei 14.754 informado (${formatCurrency(foreignTax)}) + 15% presumido s/ demais (${formatCurrency(presumedOnRest)})`,
        foreignTax + presumedOnRest
      );
    }
  }

  return { fields: results, sources, declaredDividendTotal: roundCents(declaredDividendTotal) };
}
