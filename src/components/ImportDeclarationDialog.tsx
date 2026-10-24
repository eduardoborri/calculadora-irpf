import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileWarning, Loader2, ScanText, UploadCloud, X, XCircle } from "lucide-react";
import { ParsedDirpf } from "../types";
import { parseDirpf } from "../utils/dirpfParser";
import { formatCurrency } from "../utils/format";
import { OcrProgress, ocrPdfPages } from "../utils/ocr";
import { extractPdfPages } from "../utils/pdfText";

interface ImportDeclarationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (parsed: ParsedDirpf) => void;
}

type Status = "idle" | "processing" | "needsOcr" | "ocr" | "done" | "error";

// Below this many characters the PDF has no usable text layer (scanned or
// text converted to vector outlines) and can only be read by OCR.
const MIN_TEXT_LENGTH = 500;

export default function ImportDeclarationDialog({ isOpen, onClose, onApply }: ImportDeclarationDialogProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [parsed, setParsed] = useState<ParsedDirpf | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);

  if (!isOpen) return null;

  const fields = parsed?.fields ?? [];
  const sources = parsed?.sources ?? [];
  const checks = parsed?.checks ?? [];
  const failedChecks = checks.filter((c) => !c.ok).length;

  const handleReset = () => {
    setStatus("idle");
    setParsed(null);
    setSelectedIds(new Set());
    setErrorMessage("");
    setPendingFile(null);
    setOcrProgress(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const showResult = (result: ParsedDirpf) => {
    setParsed(result);
    setSelectedIds(new Set(result.fields.map((f) => f.targetId)));
    setStatus("done");
  };

  const handleFile = async (file: File) => {
    setStatus("processing");
    setErrorMessage("");
    try {
      const text = (await extractPdfPages(file)).join("\n");
      if (text.replace(/\s/g, "").length < MIN_TEXT_LENGTH) {
        setPendingFile(file);
        setStatus("needsOcr");
        return;
      }
      showResult({ ...parseDirpf(text), fileName: file.name });
    } catch (err) {
      console.error(err);
      setErrorMessage("Não foi possível ler este PDF. Verifique se é um arquivo válido.");
      setStatus("error");
    }
  };

  const handleOcr = async () => {
    if (!pendingFile) return;
    setStatus("ocr");
    try {
      const text = (await ocrPdfPages(pendingFile, setOcrProgress)).join("\n");
      showResult({ ...parseDirpf(text), fromOcr: true, fileName: pendingFile.name });
    } catch (err) {
      console.error(err);
      setErrorMessage("A leitura por OCR falhou. Verifique a conexão (o motor de OCR é baixado na primeira vez) ou preencha manualmente.");
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
    if (!parsed) return;
    onApply({ ...parsed, fields: fields.filter((f) => selectedIds.has(f.targetId)) });
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 id="import-dialog-title" className="text-lg font-bold text-primary">Importar Declaração de IRPF (PDF)</h2>
          <button onClick={handleClose} aria-label="Fechar" className="text-gray-500 hover:text-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {status === "idle" && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <UploadCloud className="w-8 h-8 text-gray-500" />
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

          {status === "needsOcr" && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <ScanText className="w-8 h-8 text-secondary" />
              <p className="text-sm font-bold text-primary">Este PDF não tem texto pesquisável.</p>
              <p className="text-xs text-text-gray max-w-md leading-relaxed">
                Ele foi escaneado ou o texto foi convertido em imagem/contornos. É possível tentar a leitura por <strong>OCR</strong>
                (reconhecimento de texto na imagem): leva alguns segundos por página e o motor de OCR é baixado na primeira vez. O PDF
                continua sendo lido só no seu navegador. OCR pode errar dígitos — os valores serão conferidos contra os totais da própria
                declaração.
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={handleReset} className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg cursor-pointer">
                  Escolher outro arquivo
                </button>
                <button
                  onClick={handleOcr}
                  className="px-5 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer flex items-center gap-1.5"
                >
                  <ScanText className="w-4 h-4" /> Ler com OCR
                </button>
              </div>
            </div>
          )}

          {status === "ocr" && (
            <div className="flex flex-col items-center justify-center gap-3 p-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm font-bold text-primary">
                {ocrProgress?.stage === "reading"
                  ? `Lendo por OCR: página ${ocrProgress.page} de ${ocrProgress.totalPages}`
                  : "Preparando o motor de OCR..."}
              </span>
              {ocrProgress?.stage === "reading" && (
                <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(ocrProgress.page / ocrProgress.totalPages) * 100}%` }} />
                </div>
              )}
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

          {status === "done" && parsed && (
            <>
              {parsed.fromOcr && (
                <div className="p-3 rounded-xl border border-accent/30 bg-accent/5 text-xs text-accent font-medium flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Valores lidos por <strong>OCR</strong>. Confira cada valor com a declaração antes de usar.{" "}
                    {checks.length > 0 && `${checks.length - failedChecks} de ${checks.length} conferências por totais fecharam.`}
                  </span>
                </div>
              )}

              {fields.length === 0 && sources.length === 0 ? (
                <div className="text-center p-8 space-y-2">
                  <FileWarning className="w-8 h-8 text-gray-500 mx-auto" />
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
                      <label key={field.targetId} className="flex items-center justify-between gap-4 p-3 cursor-pointer hover:bg-gray-50">
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
                              {s.cnpj && <span className="text-gray-500 text-xs ml-2">{s.cnpj}</span>}
                              {s.isSimples && <span className="text-xs ml-2 text-secondary font-bold">SIMPLES</span>}
                            </span>
                            <span className="font-bold text-secondary">{formatCurrency(s.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {checks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Conferência com os totais da declaração</h3>
                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                    {checks.map((c) => (
                      <div key={c.label} className="flex items-start justify-between gap-3 p-3 text-xs">
                        <span className={`flex items-start gap-2 font-medium ${c.ok ? "text-secondary" : "text-accent"}`}>
                          {c.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                          {c.label}
                        </span>
                        <span className="text-right whitespace-nowrap text-text-gray">
                          {c.ok ? formatCurrency(c.expected) : `lido ${formatCurrency(c.found)} × total ${formatCurrency(c.expected)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
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
