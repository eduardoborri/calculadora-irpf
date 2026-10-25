export interface IncomeItem {
  id: string;
  label: string;
  value: number;
  isSubject: boolean;
  description?: string;
}

/**
 * One paying company (fonte pagadora) of lucros e dividendos. The total is
 * split into a protected part (deliberated up to 2025, never subject to the
 * minimum tax) and a posterior part (subject: base, withholding, redutor).
 */
export interface DividendSource {
  id: string;
  name: string;
  cnpj: string;
  total: number;
  protectedAmount: number;
  pjProfit: number;
  pjTax: number;
  nominalRate: number;
  withholding: boolean;
  isSimples: boolean;
  // Aggregated row of small sources (below SMALL_SOURCE_THRESHOLD each): no
  // PJ data, no redutor.
  isAggregate: boolean;
  note?: string;
}

export interface DividendSourceResult {
  id: string;
  posterior: number;
  effectiveRate: number | null;
  redutorRate: number;
  redutor: number;
  withholdingTax: number;
  missingPjData: boolean;
}

export interface DividendSummary {
  total: number;
  protectedTotal: number;
  posteriorTotal: number;
  withholdingTotal: number;
  redutorPotential: number;
  sourcesMissingPjData: number;
  invalidSources: number;
  perSource: DividendSourceResult[];
}

export interface TaxPaymentItem {
  id: string;
  label: string;
  value: number;
  description?: string;
}

export interface CalculationResult {
  totalGrossIncome: number;
  totalTaxPaid: number;
  subjectBase: number;
  minimumAliquot: number;
  minimumTaxDue: number;
  additionalTax: number;
  reduction16B: number;
  refund: number;
  presumedExclusiveTax: number;
  dividends: DividendSummary;
}

export interface ParsedDirpfField {
  targetType: "income" | "tax";
  targetId: string;
  label: string;
  value: number;
  sourceSnippet: string;
}

// A consistency check between values read from the declaration and a total
// printed in the declaration itself (e.g. sum of items vs. "TOTAL").
export interface ParseCheck {
  label: string;
  expected: number;
  found: number;
  ok: boolean;
}

export interface ParsedDirpf {
  fields: ParsedDirpfField[];
  sources: DividendSource[];
  // Total of the dividend items as printed in the declaration (items 09 + 13),
  // to check against the sum of the parsed sources.
  declaredDividendTotal: number;
  checks: ParseCheck[];
  // True when the text came from OCR (PDF without a text layer).
  fromOcr?: boolean;
  fileName?: string;
  // Read from the declaration header ("NOME:", "EXERCÍCIO", "ANO-CALENDÁRIO").
  taxpayerName?: string;
  fiscalYearLabel?: string;
}

export interface TaxBracket {
  id: number;
  limit: number;
  rate: number;
  deduction: number;
  label: string;
}

export interface SimulationResult {
  deductionAmount: number;
  netBase: number;
  activeBracketIndex: number;
  progressiveTaxDue: number;
  financialTaxDue: number;
  ruralTaxDue: number;
  standardTaxDue: number;
  standardEffectiveRate: number;
  minimumBase: number;
  minimumRate: number;
  minimumTaxDue: number;
  additionalMinTax: number;
  totalCombinedTax: number;
  finalEffectiveRate: number;
  brackets: TaxBracket[];
}
