import { FileText } from "lucide-react";

interface WelcomeScreenProps {
  onImport: () => void;
  onManual: () => void;
  onSimulator: () => void;
}

// Empty state: one clear first action (import the declaration) and the two
// alternatives as plain choices below it.
export default function WelcomeScreen({ onImport, onManual, onSimulator }: WelcomeScreenProps) {
  return (
    <section className="bg-white border border-rule rounded-lg px-8 py-10 md:px-12 md:py-12 max-w-3xl">
      <h2 className="text-[32px] leading-tight font-semibold text-primary">Comece pela declaração do cliente</h2>
      <p className="mt-3 text-base text-text-gray leading-relaxed max-w-[60ch]">
        A calculadora lê o PDF da declaração de ajuste anual, preenche rendimentos, impostos e fontes de dividendos, e confere cada valor com os
        totais impressos na própria declaração. O arquivo é lido só neste navegador.
      </p>

      <button
        onClick={onImport}
        className="mt-8 inline-flex items-center gap-2 bg-primary text-white text-base font-semibold px-6 py-3 rounded hover:bg-primary/90 transition-colors cursor-pointer"
      >
        <FileText className="w-5 h-5" />
        Importar declaração em PDF
      </button>

      <div className="mt-10 pt-6 border-t border-rule space-y-3 text-sm">
        <p className="text-text-gray">Sem a declaração em mãos:</p>
        <ul className="space-y-2">
          <li>
            <button onClick={onManual} className="text-action px-0">
              Preencher os valores manualmente
            </button>
          </li>
          <li>
            <button onClick={onSimulator} className="text-action px-0">
              Simular com rendas estimadas
            </button>
          </li>
        </ul>
      </div>
    </section>
  );
}
