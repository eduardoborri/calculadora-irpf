import Calculator from "./components/Calculator";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Calculator />
      </main>
      <footer className="border-t border-rule">
        <p className="max-w-[1240px] mx-auto px-4 md:px-8 py-6 text-xs text-text-gray leading-relaxed">
          Ferramenta interna da GSGA-PR para apuração do IRPF mínimo da Lei nº 15.270, de 26 de novembro de 2025. Simulação de caráter
          consultivo; não substitui a declaração nem a análise individual de cada caso.
        </p>
      </footer>
    </div>
  );
}
