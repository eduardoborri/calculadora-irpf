import { useState } from "react";
import { X } from "lucide-react";
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
 * Provenance strip: which declaration the numbers came from, whether it was
 * read by OCR, and how many consistency checks against the declaration's own
 * totals passed. Stays after the import dialog closes.
 */
export default function ImportStatusBadge({ info, onDismiss }: ImportStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const failed = info.checks.filter((c) => !c.ok).length;
  const alert = info.fromOcr || failed > 0;

  const sentence = [
    `Dados importados de ${info.fileName ?? "uma declaração"}`,
    info.fromOcr ? "lidos por OCR, confira os valores" : null,
    info.checks.length > 0 ? `${info.checks.length - failed} de ${info.checks.length} conferências com os totais da declaração fecharam` : null,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <div className={`bg-white border border-rule border-l-[3px] rounded ${alert ? "border-l-accent" : "border-l-secondary"}`}>
      <div className="flex items-start gap-3 px-4 py-2.5 text-sm">
        <p className={`flex-1 ${alert ? "text-accent font-normal" : "text-ink"}`}>{sentence}.</p>
        {info.checks.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-action shrink-0">
            {open ? "Ocultar conferências" : "Ver conferências"}
          </button>
        )}
        <button onClick={onDismiss} aria-label="Fechar aviso de importação" className="p-0.5 text-text-gray hover:text-ink rounded cursor-pointer shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      {open && (
        <table className="w-full border-t border-rule text-xs">
          <tbody>
            {info.checks.map((c) => (
              <tr key={c.label} className="border-b border-rule/60 last:border-0">
                <td className={`px-4 py-2 ${c.ok ? "text-ink" : "text-accent font-semibold"}`}>
                  {c.ok ? "Fechou" : "Não fechou"}: {c.label}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap text-text-gray tabular-nums">
                  {c.ok ? formatCurrency(c.expected) : `lido ${formatCurrency(c.found)}, total ${formatCurrency(c.expected)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
