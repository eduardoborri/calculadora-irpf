import Calculator from "./components/Calculator";

export default function App() {
  return (
    <div className="min-h-screen">
      <main className="py-8">
        <Calculator />
      </main>
      <footer className="py-8 text-center text-text-gray/60 text-sm border-t border-primary/5">
        <p>© 2026 GSGA-PR - Calculadora de IRPF Mínimo</p>
        <p className="mt-1">Desenvolvido conforme a Lei Nº 15.270 de 26 de Novembro de 2025</p>
      </footer>
    </div>
  );
}
