import React, { useState, useEffect } from "react";
import { ManuscriptSample, Chapter } from "../types";
import { MANUSCRIPT_SAMPLES } from "../data/initialData";
import { Camera, Upload, Sparkles, BookOpen, Check, PlusCircle, ArrowRight, Eye, Calendar, Heart, FileText, Loader2 } from "lucide-react";

interface ManuscriptScanTabProps {
  chapters: Chapter[];
  onAddTextToChapter: (chapterId: string, text: string) => void;
  onCreateNewChapter: (title: string, content: string) => void;
}

export const ManuscriptScanTab: React.FC<ManuscriptScanTabProps> = ({
  chapters,
  onAddTextToChapter,
  onCreateNewChapter,
}) => {
  const [samples] = useState<ManuscriptSample[]>(MANUSCRIPT_SAMPLES);
  const [selectedSample, setSelectedSample] = useState<ManuscriptSample>(MANUSCRIPT_SAMPLES[0]);
  const [targetChapterId, setTargetChapterId] = useState<string>(chapters[0]?.id || "");

  useEffect(() => {
    const exists = chapters.some((c) => c.id === targetChapterId);
    if (!exists) {
      setTargetChapterId(chapters[0]?.id || "");
    }
  }, [chapters, targetChapterId]);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Custom photo upload state
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    dateFound?: string;
    exactTranscription: string;
    bookReadyVersion: string;
    emotionalAnalysis: string;
    suggestedChapter?: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomImageBase64(base64);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessOcr = async () => {
    if (!customImageBase64) return;
    setIsOcrProcessing(true);
    try {
      const res = await fetch("/api/gemini/ocr-manuscript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: customImageBase64,
        }),
      });

      if (!res.ok) throw new Error("Erro no OCR.");
      const data = await res.json();
      setOcrResult(data);
    } catch (err: any) {
      console.error(err);
      alert("Falha ao analisar a imagem. Verifique a conexão.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleInsertSelected = () => {
    if (!targetChapterId || chapters.length === 0) return;
    const textToInsert = ocrResult?.bookReadyVersion || selectedSample.bookReadyVersion;
    onAddTextToChapter(targetChapterId, textToInsert);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  const handleCreateNewChapterFromScan = () => {
    const title = ocrResult?.dateFound
      ? `Anotações de ${ocrResult.dateFound}`
      : selectedSample.title;
    const text = ocrResult?.bookReadyVersion || selectedSample.bookReadyVersion;
    onCreateNewChapter(title, text);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Informativo */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
              <Camera className="w-3.5 h-3.5" />
              Digitalização Visual & Leitura de Caligrafia
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Leitor de Manuscritos & Agendas do Autor
            </h2>
            <p className="text-stone-600 text-sm max-w-2xl leading-relaxed">
              Aqui a inteligência artificial lê as fotos reais das agendas manuscritas e apostilas grifadas.
              Ela extrai a transcrição poética original linha por linha e cria uma versão diagramada pronta para os capítulos do livro.
            </p>
          </div>

          {/* Upload de Nova Foto */}
          <label className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs whitespace-nowrap">
            <Upload className="w-4 h-4 text-amber-300" />
            <span>Fotografar ou Enviar Caderno</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* ÁREA DE UPLOAD PERSONALIZADO (SE ENVIAR FOTO NOVA) */}
      {customImageBase64 && (
        <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-950 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Nova Imagem Carregada pelo Autor
            </h3>
            <button
              onClick={() => {
                setCustomImageBase64(null);
                setOcrResult(null);
              }}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              Remover Foto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 max-h-60 flex items-center justify-center">
              <img
                src={customImageBase64}
                alt="Upload do Manuscrito"
                className="max-h-60 object-contain w-full"
              />
            </div>
            <div className="md:col-span-8 space-y-3">
              <p className="text-xs text-stone-600">
                A foto está pronta para ser examinada pelo modelo de visão multimodal. Ele identificará caligrafia à mão, datas e anotações marginais.
              </p>
              <button
                onClick={handleProcessOcr}
                disabled={isOcrProcessing}
                className="py-3 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                {isOcrProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Lendo caligrafia manuscrita com Gemini...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-amber-300" />
                    <span>Transcrever e Lapidar Esta Imagem</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {ocrResult && (
            <div className="pt-4 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-stone-200">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Transcrição Literal (Linha por Linha):
                </div>
                <pre className="text-xs text-stone-800 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {ocrResult.exactTranscription}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-300 space-y-2">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Versão Diagramada para o Livro:
                </div>
                <p className="text-sm text-stone-900 font-literary leading-relaxed max-h-60 overflow-y-auto">
                  {ocrResult.bookReadyVersion}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SELETOR DAS PÁGINAS REAIS DA AGENDA DO AUTOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-800 text-base">
            Páginas das Agendas & Livro de N/A Analisadas:
          </h3>
          <span className="text-xs text-stone-500">Clique para inspecionar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {samples.map((sample) => {
            const isSelected = selectedSample.id === sample.id;
            return (
              <div
                key={sample.id}
                onClick={() => setSelectedSample(sample)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-50/80 border-amber-700/80 shadow-xs ring-2 ring-amber-600/20"
                    : "bg-white border-stone-200 hover:border-amber-400 hover:bg-stone-50/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {sample.category === "agenda_poetica" ? "Agenda Manuscrita" : "Livro de N/A"}
                    </span>
                    <span className="text-xs text-amber-800 font-semibold">{sample.date}</span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 mb-1">{sample.title}</h4>
                  <p className="text-xs text-stone-500 line-clamp-2">{sample.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-amber-900">
                  <span>Ver Transcrição</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETALHE DA PÁGINA SELECIONADA: COMPARATIVO LADO A LADO */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              {selectedSample.date}
            </span>
            <h3 className="text-xl font-bold text-stone-900">{selectedSample.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Destino:</span>
            <select
              value={targetChapterId}
              onChange={(e) => setTargetChapterId(e.target.value)}
              disabled={chapters.length === 0}
              className="p-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800 disabled:bg-stone-100 disabled:text-stone-400"
            >
              {chapters.length === 0 ? (
                <option value="">Nenhum capítulo criado</option>
              ) : (
                chapters.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    Capítulo {chap.number}: {chap.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Análise Emocional da Página */}
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-3">
          <Heart className="w-5 h-5 text-amber-800 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Diagnóstico Sensível do Escrito:
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              {selectedSample.emotionalAnalysis}
            </p>
          </div>
        </div>

        {/* Lado a Lado: Transcrição Exata vs Prosa Literária */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcrição Literal */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                1. Transcrição Original da Caligrafia (Exata)
              </span>
              <FileText className="w-4 h-4 text-stone-400" />
            </div>
            <div className="p-4 rounded-xl bg-white border border-stone-200/70 text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {selectedSample.exactTranscript}
            </div>
            <p className="text-[11px] text-stone-500 italic">
              * Mantém a caixa alta, pontuação e quebras de linhas feitas à caneta na agenda.
            </p>
          </div>

          {/* Prosa Diagramada para o Livro */}
          <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  2. Versão Diagramada para os Capítulos
                </span>
                <BookOpen className="w-4 h-4 text-amber-800" />
              </div>
              <div className="p-4 rounded-xl bg-white border border-amber-200 text-sm font-literary text-stone-900 leading-relaxed max-h-80 overflow-y-auto">
                {selectedSample.bookReadyVersion}
              </div>
              <p className="text-[11px] text-stone-500 italic">
                * Pontuado com cadência literária para publicação no livro e exportação para Word.
              </p>
            </div>

            {/* Ações */}
            <div className="pt-4 border-t border-amber-200/60 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleInsertSelected}
                disabled={chapters.length === 0 || !targetChapterId}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title={chapters.length === 0 ? "Crie primeiro um capítulo ou use 'Criar Novo Capítulo com Este Texto'" : "Inserir no Capítulo Selecionado"}
              >
                {addedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <PlusCircle className="w-4 h-4 text-amber-300" />}
                <span>{addedSuccess ? "Inserido no Capítulo!" : "Inserir no Capítulo Atual"}</span>
              </button>

              <button
                onClick={handleCreateNewChapterFromScan}
                className="py-2.5 px-4 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Criar Novo Capítulo com Este Texto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
