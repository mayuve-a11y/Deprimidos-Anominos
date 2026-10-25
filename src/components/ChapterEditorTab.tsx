import React, { useState, useEffect } from "react";
import { Chapter, BookProject } from "../types";
import { BookOpen, Download, Sparkles, Check, Plus, Trash2, Edit3, FileText, Loader2, Quote, ShieldCheck, HeartHandshake, ExternalLink, FolderSync } from "lucide-react";
import { exportBookToDocx } from "../utils/docxExport";

interface ChapterEditorTabProps {
  currentProject: BookProject;
  chapters: Chapter[];
  selectedChapterId?: string;
  onSelectChapter?: (id: string) => void;
  onUpdateChapter: (chapter: Chapter) => void;
  onAddChapter: () => void;
  onDeleteChapter: (chapterId: string) => void;
  onOpenGoogleDocsModal?: (target?: "book" | "chapter") => void;
}

export const ChapterEditorTab: React.FC<ChapterEditorTabProps> = ({
  currentProject,
  chapters,
  selectedChapterId: propSelectedChapterId,
  onSelectChapter,
  onUpdateChapter,
  onAddChapter,
  onDeleteChapter,
  onOpenGoogleDocsModal,
}) => {
  const [internalSelectedChapterId, setInternalSelectedChapterId] = useState<string>(
    propSelectedChapterId || chapters[0]?.id || ""
  );

  const selectedChapterId = propSelectedChapterId || internalSelectedChapterId;

  const handleSelectChapter = (id: string) => {
    setInternalSelectedChapterId(id);
    if (onSelectChapter) onSelectChapter(id);
  };

  useEffect(() => {
    if (propSelectedChapterId) {
      setInternalSelectedChapterId(propSelectedChapterId);
    }
  }, [propSelectedChapterId]);

  useEffect(() => {
    const exists = chapters.some((c) => c.id === selectedChapterId);
    if (!exists) {
      const fallbackId = chapters[0]?.id || "";
      setInternalSelectedChapterId(fallbackId);
      if (onSelectChapter) onSelectChapter(fallbackId);
    }
  }, [chapters, selectedChapterId, currentProject.id]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isComparingResearch, setIsComparingResearch] = useState(false);
  const [researchInsights, setResearchInsights] = useState<{
    authorConnection?: { author: string; work: string; comparison: string };
    twelveStepsInsight?: string;
    policeResearchGrounding?: string;
    suggestedFootnote?: string;
  } | null>(null);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];

  if (!selectedChapter) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-xs max-w-xl mx-auto p-8 my-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-900 flex items-center justify-center">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">Projeto pronto para começar</h3>
        <p className="text-stone-500 text-xs sm:text-sm mb-6 leading-relaxed">
          Seu livro está pronto para receber suas memórias e relatos. Você pode criar um capítulo em branco agora ou ir ao <strong>Estúdio de Voz</strong> para ditar livremente.
        </p>
        <button
          onClick={onAddChapter}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>Criar Primeiro Capítulo</span>
        </button>
      </div>
    );
  }

  // Polimento do capítulo preservando a voz
  const handlePolishChapter = async () => {
    setIsPolishing(true);
    try {
      const res = await fetch("/api/gemini/speech-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawTranscript: selectedChapter.content,
          bookTitle: currentProject.title,
          chapterContext: selectedChapter.title,
        }),
      });

      if (!res.ok) throw new Error("Erro ao polir texto.");
      const data = await res.json();
      if (data.polishedText) {
        onUpdateChapter({
          ...selectedChapter,
          content: data.polishedText,
          lastUpdated: "Agora mesmo",
        });
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível conectar ao assistente de polimento.");
    } finally {
      setIsPolishing(false);
    }
  };

  // Cruzar com autores mundiais e estatísticas policiais
  const handleCrossResearch = async () => {
    setIsComparingResearch(true);
    try {
      const res = await fetch("/api/gemini/compare-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textPassage: selectedChapter.content,
        }),
      });

      if (!res.ok) throw new Error("Erro no cruzamento.");
      const data = await res.json();
      setResearchInsights(data);
    } catch (err) {
      console.error(err);
      alert("Falha ao cruzar pesquisas.");
    } finally {
      setIsComparingResearch(false);
    }
  };

  // Baixar documento oficial Word .docx
  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      await exportBookToDocx(
        currentProject.title,
        currentProject.subtitle,
        chapters.map((c) => ({
          number: c.number,
          title: c.title,
          subtitle: c.subtitle,
          content: c.content,
          footnotes: c.footnotes,
        }))
      );
    } catch (err) {
      console.error("Erro ao gerar docx:", err);
      alert("Erro ao gerar o arquivo Word.");
    } finally {
      setIsExporting(false);
    }
  };

  const wordCount = selectedChapter.content.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.ceil(wordCount / 180);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Export Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            Diagramação & Editor Literário
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            {currentProject.title}
          </h2>
          <p className="text-stone-500 text-xs sm:text-sm">
            {currentProject.subtitle} • {chapters.length} Capítulos cadastrados
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {onOpenGoogleDocsModal && (
            <button
              onClick={() => onOpenGoogleDocsModal("book")}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
              title="Gera e sincroniza o documento consolidado de todos os capítulos no Google Docs"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 8V3.5L18.5 8H14zm-4 4h8v2h-8v-2zm0 4h8v2h-8v-2zm-2-4h1v2H8v-2zm0 4h1v2H8v-2z" />
              </svg>
              <span>Salvar no Google Docs</span>
            </button>
          )}

          {currentProject.googleDocsUrl && (
            <a
              href={currentProject.googleDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition-all"
              title="Abrir a versão sincronizada no Google Docs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">Abrir no Docs</span>
            </a>
          )}

          {currentProject.googleDriveFolderUrl && (
            <a
              href={currentProject.googleDriveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-xs font-semibold transition-all"
              title="Abrir a pasta do livro no Google Drive"
            >
              <FolderSync className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Pasta Drive</span>
            </a>
          )}

          <button
            onClick={handleDownloadDocx}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
            title="Gera um arquivo .docx legítimo compatível com Word e Office 365"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <Download className="w-4 h-4 text-amber-300" />
            )}
            <span>{isExporting ? "Gerando Word..." : "Baixar Word (.docx)"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Lista de Capítulos */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Capítulos da Obra
              </span>
              <button
                onClick={onAddChapter}
                className="flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950 p-1.5 rounded-lg hover:bg-amber-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo
              </button>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {chapters.map((chap) => {
                const isSelected = chap.id === selectedChapter.id;
                return (
                  <button
                    key={chap.id}
                    onClick={() => handleSelectChapter(chap.id)}
                    className={`w-full text-left p-3 rounded-2xl text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-amber-900 text-white shadow-xs font-medium"
                        : "bg-stone-50/60 hover:bg-stone-100/80 text-stone-700 border border-stone-200/60"
                    }`}
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                        isSelected ? "bg-amber-800 text-amber-100" : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {chap.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-sm">{chap.title}</div>
                      {chap.subtitle && (
                        <div
                          className={`truncate text-[11px] ${
                            isSelected ? "text-amber-200" : "text-stone-500"
                          }`}
                        >
                          {chap.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Painel Direito: Conteúdo e Ferramentas Literárias */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            {/* Cabeçalho do Capítulo */}
            <div className="space-y-3 pb-4 border-b border-stone-100">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-semibold uppercase tracking-wider">
                  CAPÍTULO {selectedChapter.number}
                </span>
                <span>{wordCount} palavras • ~{readingTimeMin} min de leitura</span>
              </div>

              <input
                type="text"
                value={selectedChapter.title}
                onChange={(e) =>
                  onUpdateChapter({
                    ...selectedChapter,
                    title: e.target.value,
                  })
                }
                className="w-full text-2xl font-bold font-literary text-stone-900 focus:outline-hidden border-b border-transparent focus:border-amber-400 transition-colors"
                placeholder="Título do Capítulo"
              />

              <input
                type="text"
                value={selectedChapter.subtitle || ""}
                onChange={(e) =>
                  onUpdateChapter({
                    ...selectedChapter,
                    subtitle: e.target.value,
                  })
                }
                className="w-full text-sm text-stone-500 italic focus:outline-hidden border-b border-transparent focus:border-amber-400 transition-colors"
                placeholder="Subtítulo ou contexto de data (Ex: Anotação confessional de 01/01/2025)"
              />
            </div>

            {/* Editor de Texto com Fonte Literária Confortável */}
            <div className="relative">
              <textarea
                value={selectedChapter.content}
                onChange={(e) =>
                  onUpdateChapter({
                    ...selectedChapter,
                    content: e.target.value,
                    lastUpdated: "Agora mesmo",
                  })
                }
                rows={16}
                className="w-full p-4 rounded-2xl bg-stone-50/40 border border-stone-200 font-literary text-base text-stone-900 leading-relaxed focus:bg-white focus:border-amber-600 focus:outline-hidden transition-all resize-y"
                placeholder="Escreva ou anexe relatos de voz e fotos de cadernos aqui..."
              />
            </div>

            {/* Barra de Ações com Inteligência Artificial */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePolishChapter}
                  disabled={isPolishing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold transition-all cursor-pointer"
                  title="Revisa concordância e pontuação sem perder o tom visceral e confessional"
                >
                  {isPolishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  <span>{isPolishing ? "Polindo..." : "Polir Escrita sem Perder Minha Voz"}</span>
                </button>

                <button
                  onClick={handleCrossResearch}
                  disabled={isComparingResearch}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all cursor-pointer"
                  title="Conecta este relato com Andrew Solomon, Viktor Frankl e relatórios de segurança pública"
                >
                  {isComparingResearch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Quote className="w-3.5 h-3.5 text-stone-600" />
                  )}
                  <span>Cruzar com Pesquisas & Autores</span>
                </button>

                {onOpenGoogleDocsModal && (
                  <button
                    onClick={() => onOpenGoogleDocsModal("chapter")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-semibold transition-all cursor-pointer"
                    title="Gera ou atualiza um documento exclusivo deste capítulo no Google Docs"
                  >
                    <svg className="w-3.5 h-3.5 fill-blue-600" viewBox="0 0 24 24">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 8V3.5L18.5 8H14zm-4 4h8v2h-8v-2zm0 4h8v2h-8v-2zm-2-4h1v2H8v-2zm0 4h1v2H8v-2z" />
                    </svg>
                    <span>Salvar Capítulo no Google Docs</span>
                  </button>
                )}

                {selectedChapter.googleDocUrl && (
                  <a
                    href={selectedChapter.googleDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-semibold transition-all"
                  >
                    <ExternalLink className="w-3 h-3 text-blue-600" />
                    <span>Ver no Docs</span>
                  </a>
                )}
              </div>

              {chapters.length > 1 && (
                <button
                  onClick={() => onDeleteChapter(selectedChapter.id)}
                  className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                  title="Excluir capítulo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Se houver insights de pesquisas gerados */}
            {researchInsights && (
              <div className="mt-4 p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-800" />
                    Embasamento Acadêmico e Policial Sugerido
                  </span>
                  <button
                    onClick={() => setResearchInsights(null)}
                    className="text-xs text-stone-400 hover:text-stone-700"
                  >
                    Fechar
                  </button>
                </div>

                {researchInsights.authorConnection && (
                  <div className="text-xs text-stone-800">
                    <strong>Paralelo com {researchInsights.authorConnection.author}:</strong>{" "}
                    {researchInsights.authorConnection.comparison}
                  </div>
                )}

                {researchInsights.policeResearchGrounding && (
                  <div className="text-xs text-stone-800">
                    <strong>Realidade na Segurança Pública:</strong>{" "}
                    {researchInsights.policeResearchGrounding}
                  </div>
                )}

                {researchInsights.suggestedFootnote && (
                  <div className="pt-2 border-t border-amber-200/60 flex items-start justify-between gap-2">
                    <span className="text-xs text-stone-700 italic">
                      "{researchInsights.suggestedFootnote}"
                    </span>
                    <button
                      onClick={() => {
                        const updatedFootnotes = [
                          ...(selectedChapter.footnotes || []),
                          researchInsights.suggestedFootnote!,
                        ];
                        onUpdateChapter({
                          ...selectedChapter,
                          footnotes: updatedFootnotes,
                        });
                        alert("Nota de rodapé inserida no capítulo!");
                      }}
                      className="px-2.5 py-1 bg-amber-900 text-white rounded-lg text-[10px] font-bold shrink-0"
                    >
                      Inserir como Rodapé
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notas de Rodapé Já Existentes */}
            {selectedChapter.footnotes && selectedChapter.footnotes.length > 0 && (
              <div className="pt-4 border-t border-stone-100 space-y-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Notas de Apoio e Rodapé Deste Capítulo:
                </span>
                <div className="space-y-1.5">
                  {selectedChapter.footnotes.map((fn, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2"
                    >
                      <span className="font-bold text-stone-400">[{idx + 1}]</span>
                      <span className="flex-1">{fn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
