import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text?: string;
}

// Help bubble that opens on hover, keyboard focus and tap (focus), so it works
// without a mouse; the text is also exposed to screen readers via aria-label.
export default function Tooltip({ text }: TooltipProps) {
  if (!text) return null;
  return (
    <span className="group relative inline-block ml-2">
      <button
        type="button"
        aria-label={text}
        className="align-middle text-gray-500 hover:text-secondary focus:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-full cursor-help"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus-within:block w-64 p-3 bg-primary text-white text-xs font-normal rounded-lg z-50 leading-relaxed pointer-events-none"
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-primary"></span>
      </span>
    </span>
  );
}
