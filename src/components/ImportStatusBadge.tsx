import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, FileCheck2, X, XCircle } from "lucide-react";
import { ParseCheck } from "../types";
import { formatCurrency } from "../utils/format";

export interface ImportInfo {
  fileName?: string;
  fromOcr?: boolean;
  checks: ParseCheck[];
  importedAt: Date;
}

interface ImportStatusBadgeProps {
  info: ImportInfo;
  onDismiss: () => void;
}

/**
 * Persistent provenance of the imported data: which file, whether it came
 * from OCR, and how many consistency checks against the declaration's own
 * totals passed. Stays visible after the import dialog closes so whoever
 * reviews the calculation knows where the numbers came from.
 */
export default function ImportStatusBadge({ info, onDismiss }: ImportStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const failed = info.checks.filter((c) => !c.ok).length;
  const alert = info.fromOcr || failed > 0;

  return (
    <div className={`rounded-xl border ${alert ? "border-accent/30 bg-accent/5" : "border-secondary/30 bg-secondary/5"}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
        {alert ? <AlertTriangle className="w-4 h-4 text-accent shrink-0" /> : <FileCheck2 className="w-4 h-4 text-secondary shrink-0" />}
        <span className="flex-1 text-primary">
          <strong className="font-semibold">Dados importados da DIRPF</strong>
          {info.fileName && <span className="text-text-gray"> · {info.fileName}</span>}
          {info.fromOcr && <span className="text-accent font-semibold"> · lidos por OCR — confira os valores</span>}
          {info.checks.length > 0 && (
            <span className={failed > 0 ? "text-accent font-semibold" : "text-secondary font-semibold"}>
              {" "}
              · {info.checks.length - failed} de {info.checks.length} conferências por totais fecharam
            </span>
          )}
        </span>
        {info.checks.length > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-xs font-semibold text-secondary flex items-center gap-1 hover:underline cursor-pointer"
          >
            {open ? "Ocultar" : "Detalhes"} {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
        <button onClick={onDismiss} aria-label="Fechar aviso de importação" className="p-1 text-gray-500 hover:text-primary rounded cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      {open && (
        <ul className="border-t border-gray-100 divide-y divide-gray-100 bg-white rounded-b-xl">
          {info.checks.map((c) => (
            <li key={c.label} className="flex items-start justify-between gap-3 px-4 py-2 text-xs">
              <span className={`flex items-start gap-2 ${c.ok ? "text-primary" : "text-accent font-semibold"}`}>
                {c.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 text-secondary" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {c.label}
              </span>
              <span className="text-right whitespace-nowrap text-text-gray">
                {c.ok ? formatCurrency(c.expected) : `lido ${formatCurrency(c.found)} × total ${formatCurrency(c.expected)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
