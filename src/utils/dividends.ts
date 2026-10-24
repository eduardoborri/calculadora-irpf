import {
  AGGREGATE_SOURCE_NOTE,
  DEFAULT_ALLOCATION_NOTE,
  DEFAULT_PJ_NOMINAL_RATE,
  DIVIDEND_WITHHOLDING_RATE,
  SMALL_SOURCE_THRESHOLD,
} from "../constants";
import { DividendSource, DividendSourceResult, DividendSummary } from "../types";

export const posteriorOf = (source: DividendSource) => Math.max(0, source.total - source.protectedAmount);

export function newDividendSource(partial: Partial<DividendSource> = {}): DividendSource {
  return {
    id: crypto.randomUUID(),
    name: "",
    cnpj: "",
    total: 0,
    protectedAmount: 0,
    pjProfit: 0,
    pjTax: 0,
    nominalRate: DEFAULT_PJ_NOMINAL_RATE,
    withholding: false,
    isSimples: false,
    isAggregate: false,
    note: DEFAULT_ALLOCATION_NOTE,
    ...partial,
  };
}

/**
 * Groups sources by CNPJ (summing repeated entries) and collapses every source
 * below SMALL_SOURCE_THRESHOLD into a single "Demais fontes" row.
 */
export function consolidateSources(
  raw: { name: string; cnpj: string; total: number; isSimples?: boolean; unidentified?: boolean }[]
): DividendSource[] {
  const byKey = new Map<string, { name: string; cnpj: string; total: number; isSimples: boolean; unidentified: boolean }>();
  for (const entry of raw) {
    const key = `${entry.cnpj || entry.name}|${entry.isSimples ? "S" : ""}`;
    const current = byKey.get(key);
    if (current) current.total += entry.total;
    else byKey.set(key, { name: entry.name, cnpj: entry.cnpj, total: entry.total, isSimples: !!entry.isSimples, unidentified: !!entry.unidentified });
  }

  const sources: DividendSource[] = [];
  let smallTotal = 0;
  let smallCount = 0;
  for (const entry of byKey.values()) {
    // A reading gap must stay visible as its own row, however small.
    if (entry.unidentified) {
      sources.push(
        newDividendSource({
          name: entry.name,
          total: round2(entry.total),
          isSimples: entry.isSimples,
          note: "Diferença entre o total do item na DIRPF e as fontes lidas — identifique a fonte na declaração. " + DEFAULT_ALLOCATION_NOTE,
        })
      );
    } else if (entry.total < SMALL_SOURCE_THRESHOLD) {
      smallTotal += entry.total;
      smallCount += 1;
    } else {
      sources.push(newDividendSource({ name: entry.name, cnpj: entry.cnpj, total: round2(entry.total), isSimples: entry.isSimples }));
    }
  }
  sources.sort((a, b) => b.total - a.total);
  if (smallCount > 0) {
    sources.push(
      newDividendSource({
        name: `Demais fontes (${smallCount} fonte${smallCount === 1 ? "" : "s"})`,
        total: round2(smallTotal),
        isAggregate: true,
        note: `${AGGREGATE_SOURCE_NOTE} ${DEFAULT_ALLOCATION_NOTE}`,
      })
    );
  }
  return sources;
}

/**
 * Per-source Art. 16-B redutor and withholding, given the minimum-tax rate:
 *   redutor = posterior × max(0, PJ effective rate + IRPFM rate − PJ nominal rate)
 * A source without PJ data (or the aggregate row) gets no redutor.
 */
export function summarizeDividends(sources: DividendSource[], minimumAliquot: number): DividendSummary {
  const perSource: DividendSourceResult[] = sources.map((source) => {
    const posterior = posteriorOf(source);
    const hasPjData = !source.isAggregate && source.pjProfit > 0;
    const effectiveRate = hasPjData ? source.pjTax / source.pjProfit : null;
    const redutorRate = effectiveRate === null ? 0 : Math.max(0, effectiveRate + minimumAliquot - source.nominalRate);
    return {
      id: source.id,
      posterior,
      effectiveRate,
      redutorRate,
      redutor: posterior * redutorRate,
      withholdingTax: source.withholding ? posterior * DIVIDEND_WITHHOLDING_RATE : 0,
      missingPjData: posterior > 0 && !source.isAggregate && !hasPjData,
    };
  });

  return {
    total: sum(sources.map((s) => s.total)),
    protectedTotal: sum(sources.map((s) => Math.min(s.protectedAmount, s.total))),
    posteriorTotal: sum(perSource.map((r) => r.posterior)),
    withholdingTotal: sum(perSource.map((r) => r.withholdingTax)),
    redutorPotential: sum(perSource.map((r) => r.redutor)),
    sourcesMissingPjData: perSource.filter((r) => r.missingPjData).length,
    invalidSources: sources.filter((s) => s.protectedAmount > s.total || s.protectedAmount < 0).length,
    perSource,
  };
}

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
