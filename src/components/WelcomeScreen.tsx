import { FileUp, PencilLine, ShieldCheck, TrendingUp } from "lucide-react";

interface WelcomeScreenProps {
  onImport: () => void;
  onManual: () => void;
  onSimulator: () => void;
}

// First screen while nothing has been filled in: three ways to start.
export default function WelcomeScreen({ onImport, onManual, onSimulator }: WelcomeScreenProps) {
  return (
    <div className="card p-8 md:p-10 space-y-8">
      <div className="space-y-2 max-w-2xl">
        <h2 className="text-2xl font-bold text-primary">Como você quer começar?</h2>
        <p className="text-text-gray leading-relaxed">
          Apure o IRPF mínimo da Lei nº 15.270/2025 a partir da declaração de ajuste anual do contribuinte, ou simule cenários de renda antes de
          ter os números.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onImport}
          className="text-left p-6 rounded-2xl border-2 border-primary bg-primary text-white hover:bg-primary/95 shadow-md transition-all cursor-pointer space-y-3"
        >
          <FileUp className="w-8 h-8" />
          <span className="block text-lg font-bold">Importar DIRPF (PDF)</span>
          <span className="block text-sm text-white/85 leading-relaxed">
            Lê a declaração no navegador, preenche rendimentos, impostos e fontes pagadoras, e confere tudo com os totais da própria declaração.
          </span>
        </button>
        <button
          onClick={onManual}
          className="text-left p-6 rounded-2xl border-2 border-primary/15 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer space-y-3"
        >
          <PencilLine className="w-8 h-8 text-primary" />
          <span className="block text-lg font-bold text-primary">Preencher manualmente</span>
          <span className="block text-sm text-text-gray leading-relaxed">Informe os valores linha a linha, a partir de qualquer fonte.</span>
        </button>
        <button
          onClick={onSimulator}
          className="text-left p-6 rounded-2xl border-2 border-primary/15 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer space-y-3"
        >
          <TrendingUp className="w-8 h-8 text-secondary" />
          <span className="block text-lg font-bold text-primary">Simular por faixas de renda</span>
          <span className="block text-sm text-text-gray leading-relaxed">Compare IRPF ordinário e mínimo com valores estimados.</span>
        </button>
      </div>

      <p className="text-sm text-text-gray flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
        Os arquivos são processados apenas no seu navegador — nada é enviado a servidores.
      </p>
    </div>
  );
}
