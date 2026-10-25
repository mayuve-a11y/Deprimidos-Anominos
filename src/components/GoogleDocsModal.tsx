import React, { useState } from "react";
import { BookProject, Chapter } from "../types";
import {
  syncCompleteBookToGoogleDocs,
  syncSingleChapterToGoogleDocs,
  testGoogleWorkspaceIntegration,
  GoogleDocsSyncResult,
} from "../services/googleDocsService";
import {
  FileText,
  FolderSync,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderCheck,
  ShieldCheck,
  FileCheck2,
  X,
  PlayCircle,
} from "lucide-react";

interface GoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  chapters: Chapter[];
  selectedChapter?: Chapter;
  onSyncComplete?: (result: {
    projectUpdate?: Partial<BookProject>;
    chapterUpdate?: { id: string; update: Partial<Chapter> };
  }) => void;
}

export const GoogleDocsModal: React.FC<GoogleDocsModalProps> = ({
  isOpen,
  onClose,
  project,
  chapters,
  selectedChapter,
  onSyncComplete,
}) => {
  const [syncTarget, setSyncTarget] = useState<"book" | "chapter">("book");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<GoogleDocsSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para bateria de testes do Google Docs/Drive
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    results: { step: string; status: "passed" | "failed"; detail: string }[];
    docUrl?: string;
    folderUrl?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleConfirmSync = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncResult(null);

    try {
      if (syncTarget === "book") {
        const res = await syncCompleteBookToGoogleDocs(project, chapters);
        setSyncResult(res);
        if (onSyncComplete) {
          onSyncComplete({
            projectUpdate: {
              googleDocId: res.docId,
              googleDocsUrl: res.docUrl,
              googleDriveFolderId: res.folderId,
              googleDriveFolderUrl: res.folderUrl,
              lastSyncedToDocs: res.syncedAt,
            },
          });
        }
      } else if (syncTarget === "chapter" && selectedChapter) {
        const res = await syncSingleChapterToGoogleDocs(project, selectedChapter);
        setSyncResult(res);
        if (onSyncComplete) {
          onSyncComplete({
            chapterUpdate: {
              id: selectedChapter.id,
              update: {
                googleDocId: res.docId,
                googleDocUrl: res.docUrl,
                lastSyncedToDocs: res.syncedAt,
              },
            },
          });
        }
      }
    } catch (err: any) {
      console.error("Erro na sincronização com Google Docs:", err);
      setErrorMessage(err?.message || "Ocorreu uma falha ao comunicar com o Google Docs/Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunTestBattery = async () => {
    setTestRunning(true);
    setTestResults(null);
    setErrorMessage(null);
    try {
      const res = await testGoogleWorkspaceIntegration();
      setTestResults(res);
    } catch (err: any) {
      console.error("Erro no teste da integração:", err);
      setErrorMessage(err?.message || "Falha no teste");
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-8">
        {/* Header do Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 8V3.5L18.5 8H14zm-4 4h8v2h-8v-2zm0 4h8v2h-8v-2zm-2-4h1v2H8v-2zm0 4h1v2H8v-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                Integração com Google Docs & Drive
              </h2>
              <p className="text-xs text-stone-500">
                Grave seus manuscritos e capítulos na nuvem da sua conta Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Escolha do Modo de Gravação */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
            Selecione o que deseja salvar no Google Docs:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSyncTarget("book");
                setSyncResult(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                syncTarget === "book"
                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-stone-200 hover:border-stone-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Livro Completo</span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Gera um documento consolidado com sinopse e todos os {chapters.length} capítulos
                ordenados.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSyncTarget("chapter");
                setSyncResult(null);
              }}
              disabled={!selectedChapter}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                syncTarget === "chapter"
                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-stone-200 hover:border-stone-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <span>Capítulo Atual</span>
              </div>
              <p className="text-xs text-stone-500 mt-1 truncate">
                {selectedChapter
                  ? `Capítulo ${selectedChapter.number}: ${selectedChapter.title}`
                  : "Selecione um capítulo"}
              </p>
            </button>
          </div>
        </div>

        {/* Informações da Pasta de Destino no Google Drive */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-stone-800">
            <FolderCheck className="w-4 h-4 text-emerald-600" />
            <span>Destino Oficial no Google Drive:</span>
          </div>
          <p className="text-stone-600 pl-6 leading-relaxed">
            O documento será formatado e depositado na pasta{" "}
            <strong className="text-stone-900">
              "Estúdio Literário - {project.title}"
            </strong>{" "}
            no seu Google Drive, acessível pelo navegador ou aplicativo Google Docs no seu celular e computador.
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Aviso: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Resultado do Salvamento / Sucesso */}
        {syncResult && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Salvo com Sucesso no seu Google Docs!</span>
            </div>
            <p className="text-xs text-emerald-800">
              Arquivo criado: <strong>{syncResult.title}</strong>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={syncResult.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no Google Docs</span>
              </a>

              {syncResult.folderUrl && (
                <a
                  href={syncResult.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all"
                >
                  <FolderSync className="w-3.5 h-3.5 text-stone-600" />
                  <span>Ver Pasta no Google Drive</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Bateria de Testes em Tempo Real */}
        {testResults && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Resultado da Bateria de Validação da API:</span>
            </div>
            {testResults.results.map((r, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl border text-xs ${
                  r.status === "passed"
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    : "bg-rose-50/80 border-rose-200 text-rose-950"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {r.status === "passed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{r.step}</span>
                </div>
                <div className="text-[11px] text-stone-600 pl-5 mt-0.5">{r.detail}</div>
              </div>
            ))}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={handleRunTestBattery}
            disabled={testRunning || isSyncing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Executa verificação dos escopos oficiais e APIs do Google Docs e Drive"
          >
            {testRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-600" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5 text-stone-600" />
            )}
            <span>Bateria de Testes Google</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-stone-600 hover:text-stone-900 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleConfirmSync}
              disabled={isSyncing}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 8V3.5L18.5 8H14zm-4 4h8v2h-8v-2zm0 4h8v2h-8v-2zm-2-4h1v2H8v-2zm0 4h1v2H8v-2z" />
                </svg>
              )}
              <span>
                {isSyncing
                  ? "Gravando no Docs..."
                  : syncTarget === "book"
                  ? "Confirmar Gravação do Livro"
                  : "Confirmar Gravação do Capítulo"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
