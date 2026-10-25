import React, { useState, useEffect } from "react";
import { Search, BookOpen, ExternalLink, BookmarkPlus, BookmarkCheck, ShoppingCart, Loader2, Sparkles, BookMarked } from "lucide-react";

interface BookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    previewLink?: string;
    infoLink?: string;
  };
  saleInfo?: {
    buyLink?: string;
    saleability?: string;
  };
}

export const GoogleBooksTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("depressao policial seguranca publica");
  const [books, setBooks] = useState<BookVolume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedBooks, setSavedBooks] = useState<BookVolume[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string>("Google Livros API");

  // Pre-load default books on mount
  useEffect(() => {
    fetchBooks("depressao policial seguranca publica");
  }, []);

  const fetchBooks = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        console.warn(`Aviso na busca: ${res.status}`);
      }
      const data = await res.json();
      setBooks(data.items || []);
      if (data.source === "google_books_api") {
        setSourceLabel("Google Livros API");
      } else if (data.source === "curated_gemini_archive") {
        setSourceLabel("Acervo Literário Especializado & IA");
      } else {
        setSourceLabel("Biblioteca de Referência");
      }
    } catch (err) {
      console.warn("Falha ao consultar API, mantendo acervo seguro:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks(searchQuery);
  };

  const toggleSaveBook = (book: BookVolume) => {
    if (savedBooks.some((b) => b.id === book.id)) {
      setSavedBooks(savedBooks.filter((b) => b.id !== book.id));
    } else {
      setSavedBooks([...savedBooks, book]);
    }
  };

  const quickTopics = [
    { label: "Suicídio na Polícia", query: "suicidio policial seguranca publica" },
    { label: "12 Passos & Dependência", query: "12 passos neuroticos anonimos depressao" },
    { label: "O Demônio do Meio-Dia", query: "Andrew Solomon Demonio do Meio Dia" },
    { label: "Viktor Frankl", query: "Viktor Frankl Em Busca de Sentido" },
    { label: "Luto e Melancolia", query: "depressao luto perda cura" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Informativo */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            Biblioteca Conectada ao Google Livros & Kindle
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Pesquisa & Aquisição de Livros de Referência
          </h2>
          <p className="text-stone-600 text-sm max-w-2xl leading-relaxed">
            Pesquise livros, teses e obras mundiais diretamente do Google Livros.
            Consulte sinopses, prévias de leitura, acesse links de compra (Google Play / Amazon)
            e guarde os livros na sua <strong>Estante do Escritor</strong> para consulta constante.
          </p>
        </div>

        {/* Barra de Busca de Livros */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o título, autor ou assunto (ex: 'depressão policial', 'Viktor Frankl')..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-300 text-sm bg-stone-50/50 focus:bg-white focus:border-amber-600 focus:outline-hidden transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-amber-300" />}
            <span>Buscar</span>
          </button>
        </form>

        {/* Tópicos Rápidos */}
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <span className="text-xs text-stone-400 font-medium">Sugestões Rápidas:</span>
          {quickTopics.map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSearchQuery(topic.query);
                fetchBooks(topic.query);
              }}
              className="px-3 py-1 rounded-xl text-xs bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 transition-colors"
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Minha Estante de Livros Salvos (se houver) */}
      {savedBooks.length > 0 && (
        <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-amber-800" />
              <h3 className="font-bold text-amber-950 text-base">
                Minha Estante de Pesquisa ({savedBooks.length} Livros Salvos)
              </h3>
            </div>
            <span className="text-xs text-amber-800">Fixados para consulta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedBooks.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-2xl bg-white border border-amber-200 flex items-start gap-3"
              >
                {b.volumeInfo.imageLinks?.thumbnail ? (
                  <img
                    src={b.volumeInfo.imageLinks.thumbnail}
                    alt={b.volumeInfo.title}
                    className="w-12 h-16 object-cover rounded-md shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 bg-stone-100 rounded-md flex items-center justify-center text-stone-400 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-stone-900 truncate">{b.volumeInfo.title}</div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {b.volumeInfo.authors?.join(", ") || "Autor não informado"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {b.volumeInfo.previewLink && (
                      <a
                        href={b.volumeInfo.previewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-amber-900 hover:underline flex items-center gap-0.5"
                      >
                        Ler Prévia <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Livros Encontrados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-800 text-base">
            Obras Encontradas ({books.length} títulos)
          </h3>
          <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
            Fonte: {sourceLabel}
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-stone-500 bg-white rounded-3xl border border-stone-200">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-800 mb-2" />
            <p className="text-sm">Buscando acervo mundial de livros...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="py-16 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">
            <BookOpen className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p className="text-sm">Nenhum livro encontrado para esta busca. Tente palavras mais gerais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book) => {
              const isSaved = savedBooks.some((b) => b.id === book.id);
              const info = book.volumeInfo;
              const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex gap-4 hover:border-amber-300 transition-all"
                >
                  {/* Capa */}
                  <div className="shrink-0">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={info.title}
                        className="w-20 h-28 object-cover rounded-xl shadow-xs border border-stone-200"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 border border-stone-200">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-stone-900 line-clamp-2 leading-tight">
                        {info.title}
                      </h4>
                      <p className="text-xs text-amber-900 font-medium mt-0.5 truncate">
                        {info.authors?.join(", ") || "Autor desconhecido"}
                      </p>
                      {info.publishedDate && (
                        <p className="text-[11px] text-stone-400">
                          {info.publishedDate.substring(0, 4)} • {info.pageCount ? `${info.pageCount} págs` : "E-book"}
                        </p>
                      )}
                      {info.description && (
                        <p className="text-xs text-stone-600 line-clamp-2 mt-1.5 leading-relaxed">
                          {info.description}
                        </p>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        {info.previewLink && (
                          <a
                            href={info.previewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <span>Ler Prévia</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <a
                          href={
                            book.saleInfo?.buyLink ||
                            info.infoLink ||
                            `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(info.title)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <ShoppingCart className="w-2.5 h-2.5" />
                          <span>Comprar</span>
                        </a>
                      </div>

                      <button
                        onClick={() => toggleSaveBook(book)}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isSaved
                            ? "bg-emerald-100 text-emerald-800"
                            : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        }`}
                        title={isSaved ? "Remover da Estante" : "Guardar na Minha Estante"}
                      >
                        {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
