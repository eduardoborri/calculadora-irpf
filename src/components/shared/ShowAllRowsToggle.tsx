import { ChevronDown, ChevronUp } from "lucide-react";

interface ShowAllRowsToggleProps {
  showAll: boolean;
  hiddenCount: number;
  onToggle: () => void;
}

// Footer button of the input tables: reveals / hides the empty default rows.
export default function ShowAllRowsToggle({ showAll, hiddenCount, onToggle }: ShowAllRowsToggleProps) {
  if (!showAll && hiddenCount === 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={showAll}
      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-secondary hover:bg-secondary/5 border-t border-gray-100 transition-colors cursor-pointer"
    >
      {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      {showAll ? "Ocultar linhas vazias" : `Mostrar todas as linhas (${hiddenCount} vazia${hiddenCount === 1 ? "" : "s"} oculta${hiddenCount === 1 ? "" : "s"})`}
    </button>
  );
}
