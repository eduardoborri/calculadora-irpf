import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text?: string;
}

export default function Tooltip({ text }: TooltipProps) {
  if (!text) return null;
  return (
    <div className="group relative inline-block ml-2">
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-secondary cursor-help transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-primary text-white text-[11px] rounded-xl shadow-xl z-50 leading-relaxed pointer-events-none">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-primary"></div>
      </div>
    </div>
  );
}
