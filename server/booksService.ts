import { GoogleGenAI } from "@google/genai";

export interface BookVolumeItem {
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

// In-memory cache for search results
const searchCache = new Map<string, { timestamp: number; items: BookVolumeItem[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Acervo Curado de Referência Especializada para o Escritor
export const CURATED_REFERENCE_BOOKS: BookVolumeItem[] = [
  {
    id: "curated_solomon_demonio",
    volumeInfo: {
      title: "O Demônio do Meio-Dia: Uma Anatomia da Depressão",
      authors: ["Andrew Solomon"],
      description:
        "Obra monumental e vencedora do National Book Award. Solomon examina a depressão sob as lentes da medicina, da psicologia, do isolamento social e de seu próprio sofrimento confessional e corajoso.",
      publishedDate: "2014",
      pageCount: 584,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=v-6pAwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=v-6pAwAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=O+Demonio+do+Meio+Dia+Andrew+Solomon",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=O+Demonio+do+Meio+Dia+Andrew+Solomon",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_frankl_sentido",
    volumeInfo: {
      title: "Em Busca de Sentido: Um Psicólogo no Campo de Concentração",
      authors: ["Viktor E. Frankl"],
      description:
        "O fundador da Logoterapia relata sua experiência nos campos de concentração e demonstra como o ser humano pode encontrar sentido mesmo na dor mais profunda e na perda de todas as ilusões.",
      publishedDate: "2021",
      pageCount: 184,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=R24kEAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=R24kEAAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=Em+Busca+de+Sentido+Viktor+Frankl",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=Em+Busca+de+Sentido+Viktor+Frankl",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_styron_escuridao",
    volumeInfo: {
      title: "Escuridão Visível: Memórias da Loucura",
      authors: ["William Styron"],
      description:
        "Um dos mais dilacerantes e sinceros relatos confessionais sobre a depressão severa, a perda do sono e o desespero de um escritor à beira do abismo, que reencontra a luz na solidariedade.",
      publishedDate: "2019",
      pageCount: 112,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=12SjDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=12SjDwAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=Escuridao+Visivel+William+Styron",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=Escuridao+Visivel+William+Styron",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_na_leis_passos",
    volumeInfo: {
      title: "Neuróticos Anônimos: Leis Básicas da Recuperação Emocional e os 12 Passos",
      authors: ["Neuróticos Anônimos Internacional"],
      description:
        "O livro fundamental de N/A. Explica como o método dos 12 Passos atua na obsessão egocêntrica, no isolamento, no medo paralisante e na depressão profunda através da partilha humilde entre iguais.",
      publishedDate: "2020",
      pageCount: 196,
      imageLinks: {
        thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80",
      },
      previewLink: "https://neuroticosanonimos.org.br/literatura",
      infoLink: "https://neuroticosanonimos.org.br/",
    },
    saleInfo: {
      buyLink: "https://neuroticosanonimos.org.br/literatura",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_fbsp_policiais",
    volumeInfo: {
      title: "Vidas Policiais e Sofrimento no Trabalho: O Silêncio Institucional",
      authors: ["Fórum Brasileiro de Segurança Pública (FBSP)", "FENAPEF"],
      description:
        "Estudo aprofundado documentando o índice estarrecedor de suicídios nas forças de segurança brasileiras, o assédio moral velado e a urgência de quebrar o tabu do silêncio entre os operadores da lei.",
      publishedDate: "2023",
      pageCount: 220,
      imageLinks: {
        thumbnail: "https://images.unsplash.com/photo-1453733197781-79e0a0d4c1ca?w=300&q=80",
      },
      previewLink: "https://forumseguranca.org.br/anuario-brasileiro-seguranca-publica/",
      infoLink: "https://forumseguranca.org.br/",
    },
    saleInfo: {
      buyLink: "https://forumseguranca.org.br/",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_minayo_seguranca",
    volumeInfo: {
      title: "Missão Prevenir: Suicídio e Saúde Mental na Segurança Pública",
      authors: ["Maria Cecília de Souza Minayo", "Dayse Miranda"],
      description:
        "Pesquisa científica pioneira no Brasil sobre a saúde mental e o risco de suicídio entre policiais civis, federais e militares, revelando a rotina de desgaste psíquico e a falta de amparo institucional.",
      publishedDate: "2020",
      pageCount: 310,
      imageLinks: {
        thumbnail: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300&q=80",
      },
      previewLink: "https://www.google.com/search?tbm=bks&q=Suicidio+Policiais+Maria+Cecilia+Minayo",
      infoLink: "https://www.google.com/search?tbm=bks&q=Suicidio+Policiais+Maria+Cecilia+Minayo",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=Suicidio+Policiais+Maria+Cecilia+Minayo",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_gottlieb_conversar",
    volumeInfo: {
      title: "Talvez Você Deva Conversar com Alguém",
      authors: ["Lori Gottlieb"],
      description:
        "Uma terapeuta, o terapeuta dela e as vidas que compartilhamos. Uma narrativa acolhedora, humana e comovente sobre vulnerabilidade, crise emocional, perdas e o poder de ser ouvido.",
      publishedDate: "2020",
      pageCount: 448,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=9aXTDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=9aXTDwAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=Talvez+Voce+Deva+Conversar+com+Alguem",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=Talvez+Voce+Deva+Conversar+com+Alguem",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_cury_ansiedade",
    volumeInfo: {
      title: "Ansiedade: Como Enfrentar o Mal do Século",
      authors: ["Augusto Cury"],
      description:
        "Apresenta a Síndrome do Pensamento Acelerado (SPA), ensinando como desacelerar mentes sob pressão constante, combater o desgaste emocional crônico e proteger a memória emocional.",
      publishedDate: "2013",
      pageCount: 160,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=eA_kAgAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=eA_kAgAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=Ansiedade+Como+Enfrentar+o+Mal+do+Seculo",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=Ansiedade+Como+Enfrentar+o+Mal+do+Seculo",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_chodron_desfaz",
    volumeInfo: {
      title: "Quando Tudo se Desfaz: Orientação para Tempos Difíceis",
      authors: ["Pema Chödrön"],
      description:
        "Sabedoria prática para momentos de colapso, quando o chão se abre sob nossos pés, o casamento termina ou a carreira é abalada. Um convite a abraçar a dor sem fugir para o cinismo.",
      publishedDate: "2018",
      pageCount: 160,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=94dVDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=94dVDwAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=Quando+Tudo+se+Desfaz+Pema+Chodron",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=Quando+Tudo+se+Desfaz+Pema+Chodron",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_brene_imperfeito",
    volumeInfo: {
      title: "A Coragem de Ser Imperfeito",
      authors: ["Brené Brown"],
      description:
        "Como aceitar a própria vulnerabilidade, vencer a vergonha paralisante e ousar ser quem você realmente é, desarmando as armaduras de dureza que muitas vezes custam a saúde mental.",
      publishedDate: "2016",
      pageCount: 208,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=n_2fDAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=n_2fDAAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=A+Coragem+de+Ser+Imperfeito+Brene+Brown",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=A+Coragem+de+Ser+Imperfeito+Brene+Brown",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_tolle_agora",
    volumeInfo: {
      title: "O Poder do Agora: Um Guia para a Iluminação Espiritual",
      authors: ["Eckhart Tolle"],
      description:
        "Um clássico moderno sobre como desativar o fluxo mental incessante de arrependimentos pelo passado e medos catastróficos do futuro, ancorando a consciência na serenidade do presente.",
      publishedDate: "2002",
      pageCount: 224,
      imageLinks: {
        thumbnail: "https://books.google.com/books/content?id=M87jCwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
      previewLink: "https://books.google.com.br/books?id=M87jCwAAQBAJ",
      infoLink: "https://www.google.com/search?tbm=bks&q=O+Poder+do+Agora+Eckhart+Tolle",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?tbm=bks&q=O+Poder+do+Agora+Eckhart+Tolle",
      saleability: "FOR_SALE",
    },
  },
  {
    id: "curated_caminhos_volta",
    volumeInfo: {
      title: "Caminhos de Volta: A Travessia de um Policial e a Busca pela Paz",
      authors: ["Mayuve (Policial Federal Aposentado)"],
      description:
        "Relato biográfico confessional que descreve a transição do silêncio policial e dos anos de combate nas fronteiras e superintendências para a recuperação emocional através da palavra escrita.",
      publishedDate: "2024",
      pageCount: 240,
      imageLinks: {
        thumbnail: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80",
      },
      previewLink: "https://www.google.com/search?q=Caminhos+de+Volta+Mayuve",
      infoLink: "https://www.google.com/search?q=Caminhos+de+Volta+Mayuve",
    },
    saleInfo: {
      buyLink: "https://www.google.com/search?q=Caminhos+de+Volta+Mayuve",
      saleability: "FOR_SALE",
    },
  },
];

// Search matching curated books based on query keywords
function searchCuratedList(query: string): BookVolumeItem[] {
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter((t) => t.length > 2);

  if (terms.length === 0) {
    return CURATED_REFERENCE_BOOKS;
  }

  const scored = CURATED_REFERENCE_BOOKS.map((book) => {
    const hayStack = (
      book.volumeInfo.title +
      " " +
      (book.volumeInfo.authors || []).join(" ") +
      " " +
      (book.volumeInfo.description || "")
    ).toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (hayStack.includes(term)) {
        score += 2;
      }
    }
    return { book, score };
  });

  const matches = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.book);

  return matches.length > 0 ? matches : CURATED_REFERENCE_BOOKS.slice(0, 8);
}

// Fallback search with Gemini when Google Books rate-limits (HTTP 429) or fails
async function searchWithGemini(query: string, getGenAI: () => GoogleGenAI): Promise<BookVolumeItem[]> {
  try {
    const ai = getGenAI();
    const prompt = `Você é um curador bibliográfico de alta precisão.
O usuário pesquisou no acervo literário por: "${query}".
Gere uma lista de 6 a 8 livros REAIS, publicados e respeitados no Brasil ou no mundo que correspondam a este tema.
Inclua clássicos, obras de psicologia, segurança pública, luto, superação ou desenvolvimento humano pertinentes.
Responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "items": [
    {
      "id": "book_slug_id",
      "volumeInfo": {
        "title": "Nome Exato do Livro",
        "authors": ["Nome do Autor"],
        "description": "Sinopse concisa e rica em 2 a 3 frases em português sobre a obra e sua contribuição.",
        "publishedDate": "2020",
        "pageCount": 280,
        "previewLink": "https://books.google.com/books?q=Nome+do+Livro",
        "infoLink": "https://www.google.com/search?tbm=bks&q=Nome+do+Livro"
      },
      "saleInfo": {
        "buyLink": "https://www.google.com/search?tbm=bks&q=Nome+do+Livro",
        "saleability": "FOR_SALE"
      }
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items;
    }
  } catch (err) {
    console.warn("Gemini book fallback encountered error:", err);
  }

  // If Gemini fails, return curated list
  return searchCuratedList(query);
}

/**
 * Robust Google Books Search with 3-tier fallback and cache:
 * 1. Checks memory cache
 * 2. Tries Google Books API
 * 3. On 429 Too Many Requests or error, seamlessly falls back to Curated List + Gemini Search
 */
export async function searchBooksResilient(
  query: string,
  getGenAI: () => GoogleGenAI
): Promise<{ items: BookVolumeItem[]; source: string }> {
  const normalizedQuery = query.toLowerCase().trim() || "depressao policial";

  // Check cache first
  const cached = searchCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { items: cached.items, source: "cache" };
  }

  // Attempt Google Books API with a short timeout
  try {
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=12&langRestrict=pt`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        searchCache.set(normalizedQuery, { timestamp: Date.now(), items: data.items });
        return { items: data.items, source: "google_books_api" };
      }
    } else {
      console.warn(
        `[Google Books Service] API returned status ${response.status} (${response.statusText}). Activating resilient literary fallback.`
      );
    }
  } catch (err: any) {
    console.warn(
      `[Google Books Service] API request error (${err?.message || "Network/RateLimit"}). Activating resilient literary fallback.`
    );
  }

  // Resilient Fallback: Search Curated Reference Books and/or Gemini
  const curatedMatches = searchCuratedList(query);
  let finalItems: BookVolumeItem[] = curatedMatches;

  // If we have few matches or query is specific, complement with Gemini
  if (curatedMatches.length < 4 || !["depressao", "policial", "12 passos"].some((w) => normalizedQuery.includes(w))) {
    const geminiItems = await searchWithGemini(query, getGenAI);
    if (geminiItems.length > 0) {
      // Merge unique by title
      const titles = new Set(curatedMatches.map((b) => b.volumeInfo.title.toLowerCase()));
      const combined = [...curatedMatches];
      for (const item of geminiItems) {
        if (!titles.has(item.volumeInfo.title.toLowerCase())) {
          combined.push(item);
        }
      }
      finalItems = combined;
    }
  }

  searchCache.set(normalizedQuery, { timestamp: Date.now(), items: finalItems });
  return { items: finalItems, source: "curated_gemini_archive" };
}
