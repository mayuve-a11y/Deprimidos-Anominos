import React, { useState } from "react";
import { ResearchDocument } from "../types";
import { RESEARCH_DOCUMENTS } from "../data/initialData";
import { BarChart3, ShieldAlert, BookOpen, ExternalLink, Copy, Check, Filter, Quote, Sparkles } from "lucide-react";

interface ResearchHubTabProps {
  onInsertQuoteToBook: (quoteText: string) => void;
}

export const ResearchHubTab: React.FC<ResearchHubTabProps> = ({
  onInsertQuoteToBook,
}) => {
  const [documents] = useState<ResearchDocument[]>(RESEARCH_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredDocs = documents.filter((d) => {
    if (selectedCategory === "all") return true;
    return d.category === selectedCategory;
  });

  const handleCopyQuote = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Informativo */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Dados Públicos & Embasamento Científico
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Acervo de Pesquisas: Saúde Mental & Segurança Pública
          </h2>
          <p className="text-stone-600 text-sm max-w-2xl leading-relaxed">
            Respondendo à sua dúvida sobre o acesso público: os relatórios do Fórum Brasileiro de Segurança Pública (FBSP)
            e da Federação Nacional dos Policiais Federais (FENAPEF) são 100% públicos, gratuitos e oficiais.
            Reunimos aqui os dados essenciais para blindar o seu livro contra contestações e dar peso de autoridade à sua dor.
          </p>
        </div>

        {/* 3 Cartões de Métricas Chave Oficiais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-stone-100">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
            <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
              Maior Causa de Morte Policial
            </div>
            <div className="text-xl font-bold text-stone-900">Suicídio x Quase 3x Confronto</div>
            <p className="text-xs text-stone-600 mt-1">
              Anuário FBSP registrou 126 mortes por suicídio contra 46 em combate em serviço.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              Polícia Federal (FENAPEF)
            </div>
            <div className="text-xl font-bold text-stone-900">4 a 6x Média Nacional</div>
            <p className="text-xs text-stone-600 mt-1">
              Índice de ideação suicida entre agentes da PF muito acima da população civil.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1">
              Neuróticos Anônimos
            </div>
            <div className="text-xl font-bold text-stone-900">60 Anos de Sucesso</div>
            <p className="text-xs text-stone-600 mt-1">
              Princípio dos 12 Passos contra o desespero e a favor da partilha comunitária.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar Fonte:
        </span>
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            selectedCategory === "all"
              ? "bg-stone-900 text-white"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Todas as Pesquisas ({documents.length})
        </button>
        <button
          onClick={() => setSelectedCategory("seguranca_publica")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            selectedCategory === "seguranca_publica"
              ? "bg-amber-900 text-white"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Segurança Pública (FBSP)
        </button>
        <button
          onClick={() => setSelectedCategory("policia_federal")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            selectedCategory === "policia_federal"
              ? "bg-amber-900 text-white"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Polícia Federal (FENAPEF)
        </button>
        <button
          onClick={() => setSelectedCategory("12_passos_na")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            selectedCategory === "12_passos_na"
              ? "bg-amber-900 text-white"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Neuróticos Anônimos (N/A)
        </button>
        <button
          onClick={() => setSelectedCategory("psicologia_mundial")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            selectedCategory === "psicologia_mundial"
              ? "bg-amber-900 text-white"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Literatura Mundial
        </button>
      </div>

      {/* Lista de Documentos */}
      <div className="space-y-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {doc.institution} • {doc.year}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-stone-900">{doc.title}</h3>
              </div>

              {doc.sourceUrl && (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 hover:underline"
                >
                  <span>Acessar Fonte Oficial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Destaque do Dado Estatístico */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs font-semibold text-amber-950 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0"></span>
              <span>{doc.keyStat}</span>
            </div>

            <p className="text-sm text-stone-700 leading-relaxed">{doc.summary}</p>

            {/* Citação Direta para o Livro */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-stone-400" />
                  Citação Recomendada para Inserir no Livro:
                </span>
                <button
                  onClick={() => handleCopyQuote(doc.id, `"${doc.quote}" — ${doc.institution}`)}
                  className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === doc.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Citação</span>
                    </>
                  )}
                </button>
              </div>
              <blockquote className="text-xs text-stone-800 italic font-serif leading-relaxed">
                "{doc.quote}"
              </blockquote>
            </div>

            {/* Como Isso Impacta os Livros do Escritor */}
            <div className="pt-2 text-xs text-stone-600 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Aplicação na obra:</strong> {doc.impactOnBook}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
