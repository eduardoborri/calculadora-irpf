import { useState } from "react";
import { FileWarning, Loader2, UploadCloud, X } from "lucide-react";
import { DividendSource, ParsedDirpf, ParsedDirpfField } from "../types";
import { parseDirpf } from "../utils/dirpfParser";
import { formatCurrency } from "../utils/format";
import { extractPdfPages } from "../utils/pdfText";

interface ImportDeclarationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (parsed: ParsedDirpf) => void;
}

type Status = "idle" | "processing" | "done" | "error";

// Below this many characters the PDF has no usable text layer (scanned or
// text converted to vector outlines) and can't be parsed.
const MIN_TEXT_LENGTH = 500;

export default function ImportDeclarationDialog({ isOpen, onClose, onApply }: ImportDeclarationDialogProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [fields, setFields] = useState<ParsedDirpfField[]>([]);
  const [sources, setSources] = useState<DividendSource[]>([]);
  const [declaredDividendTotal, setDeclaredDividendTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const sourcesTotal = sources.reduce((acc, s) => acc + s.total, 0);
  const sourcesMatch = Math.abs(sourcesTotal - declaredDividendTotal) < 0.01;

  const handleReset = () => {
    setStatus("idle");
    setFields([]);
    setSources([]);
    setDeclaredDividendTotal(0);
    setSelectedIds(new Set());
    setErrorMessage("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setStatus("processing");
    setErrorMessage("");
    try {
      const text = (await extractPdfPages(file)).join("\n");
      if (text.replace(/\s/g, "").length < MIN_TEXT_LENGTH) {
        setErrorMessage(
          "Este PDF não tem texto pesquisável (foi escaneado ou o texto foi convertido em imagem/contornos). Preencha os valores manualmente."
        );
        setStatus("error");
        return;
      }
      const parsed = parseDirpf(text);
      setFields(parsed.fields);
      setSources(parsed.sources);
      setDeclaredDividendTotal(parsed.declaredDividendTotal);
      setSelectedIds(new Set(parsed.fields.map((f) => f.targetId)));
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMessage("Não foi possível ler este PDF. Verifique se é um arquivo válido.");
      setStatus("error");
    }
  };

  const toggleField = (targetId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  const handleApply = () => {
    onApply({ fields: fields.filter((f) => selectedIds.has(f.targetId)), sources, declaredDividendTotal });
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-primary">Importar Declaração de IRPF (PDF)</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {status === "idle" && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <UploadCloud className="w-8 h-8 text-gray-400" />
              <span className="text-sm font-bold text-primary">Clique para selecionar o PDF da declaração</span>
              <span className="text-xs text-text-gray text-center max-w-sm">
                Aceita o "Recibo" ou a "Declaração Completa" exportados pelo programa da Receita Federal. O arquivo é lido inteiramente no seu
                navegador — nada é enviado a nenhum servidor.
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          )}

          {status === "processing" && (
            <div className="flex flex-col items-center justify-center gap-3 p-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm font-bold text-primary">Lendo o PDF...</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <FileWarning className="w-8 h-8 text-accent" />
              <span className="text-sm font-bold text-accent">{errorMessage}</span>
              <button onClick={handleReset} className="text-xs font-bold text-primary underline cursor-pointer">
                Tentar novamente
              </button>
            </div>
          )}

          {status === "done" && (
            <>
              {fields.length === 0 && sources.length === 0 ? (
                <div className="text-center p-8 space-y-2">
                  <FileWarning className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm font-bold text-primary">Nenhum campo reconhecido automaticamente.</p>
                  <p className="text-xs text-text-gray">
                    O layout deste PDF pode ser diferente do esperado pelo importador. Preencha manualmente na aba "Apuração Detalhada".
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-text-gray leading-relaxed">
                    Confira os valores encontrados antes de aplicar. Lucros e dividendos vão para a tabela de fontes pagadoras, uma linha por CNPJ,
                    alocados por padrão como <strong>posteriores a 2025</strong> (sujeitos). Informe depois a parcela deliberada até 2025 e os dados de
                    cada PJ para o redutor do Art. 16-B.
                  </p>
                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                    {fields.map((field) => (
                      <label
                        key={field.targetId}
                        className="flex items-center justify-between gap-4 p-3 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(field.targetId)}
                            onChange={() => toggleField(field.targetId)}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-sm font-medium text-primary">{field.label}</span>
                        </div>
                        <span className="text-sm font-bold text-secondary">{formatCurrency(field.value)}</span>
                      </label>
                    ))}
                  </div>
                  {sources.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Fontes pagadoras de lucros e dividendos</h3>
                      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                        {sources.map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                            <span className="text-primary font-medium">
                              {s.name}
                              {s.cnpj && <span className="text-gray-400 text-xs ml-2">{s.cnpj}</span>}
                              {s.isSimples && <span className="text-[10px] ml-2 text-secondary font-bold">SIMPLES</span>}
                            </span>
                            <span className="font-bold text-secondary">{formatCurrency(s.total)}</span>
                          </div>
                        ))}
                      </div>
                      <p className={`text-[11px] font-medium ${sourcesMatch ? "text-emerald-700" : "text-accent"}`}>
                        {sourcesMatch
                          ? `Soma das fontes confere com o total declarado (${formatCurrency(declaredDividendTotal)}).`
                          : `Atenção: soma das fontes (${formatCurrency(sourcesTotal)}) difere do total declarado (${formatCurrency(declaredDividendTotal)}).`}
                      </p>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={handleReset} className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer">
                  Escolher outro arquivo
                </button>
                {(fields.length > 0 || sources.length > 0) && (
                  <button
                    onClick={handleApply}
                    disabled={selectedIds.size === 0 && sources.length === 0}
                    className="px-5 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Aplicar {selectedIds.size} campo{selectedIds.size === 1 ? "" : "s"}
                    {sources.length > 0 ? ` + ${sources.length} fonte${sources.length === 1 ? "" : "s"}` : ""}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
