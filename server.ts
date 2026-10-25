import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { searchBooksResilient } from "./server/booksService";

let aiClient: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper resiliente que tenta gemini-3.8-flash prioritariamente
// e faz fallback para gemini-3.1-flash-lite ou gemini-flash-latest caso necessário
async function generateWithFallback(ai: GoogleGenAI, params: {
  contents: any;
  config?: any;
}) {
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastErr: any = null;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
    } catch (err: any) {
      lastErr = err;
      console.warn(`Tentativa com modelo ${model} falhou, tentando alternativa:`, err?.message || err);
    }
  }

  throw lastErr;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Estúdio Literário" });
  });

  // 1. Process Voice / Speech to Literary Prose
  app.post("/api/gemini/speech-polish", async (req, res) => {
    try {
      const { rawTranscript, bookTitle, chapterContext } = req.body;
      if (!rawTranscript || typeof rawTranscript !== "string" || !rawTranscript.trim()) {
        return res.status(400).json({ error: "rawTranscript é obrigatório." });
      }

      const prompt = `Você é um curador e mestre em edição literária em Português do Brasil (pt-BR, Acordo Ortográfico vigente), trabalhando diretamente na lapidação dos livros do autor.
O autor escreve sobre memórias de vida, reflexões sobre saúde e cura (como Homeopatia, equilíbrio biológico), ensaios científicos/filosóficos (como John Newlands, Rosa dos Ventos), experiências na segurança pública, recuperação emocional e espiritualidade.

O autor falou ou ditou o seguinte relato bruto (que pode conter ausência de pontuação e pequenas falhas fonéticas do microfone):
"""
${rawTranscript}
"""

Contexto do Livro: "${bookTitle || "Obra Literária"}"
Capítulo / Seção: "${chapterContext || "Relato do Autor"}"

Instruções cruciais de Lapidação em Português do Brasil (pt-BR):
1. PONTUAÇÃO & PARÁGRAFOS PERFEITOS: Insira pontuação completa e expressiva (vírgulas nas pausas explicativas, pontos finais ao fechar raciocínios, dois-pontos, travessões). Separe o texto em parágrafos arejados e bem estruturados (com duas quebras de linha), respeitando também as quebras de parágrafo já marcadas pelo autor.
2. ORTOGRAFIA, ACENTUAÇÃO, CRASE E GRAMÁTICA (PT-BR): Aplique rigorosamente a norma culta fluida do Português do Brasil — corrija todas as crases obrigatórias ("à", "às", "àquela", "àquele", "às vezes", "à noite", regências verbais/nominais), acentuação gráfica e diferencial ("está/esta", "é/e", "pôde/pode", "têm/tem", "pôr/por"), uso correto de "há" (tempo decorrido/existir) vs "a", os quatro porquês ("por que", "porque", "por quê", "porquê"), "mas" vs "mais", e concordância verbal/nominal.
3. CORREÇÃO DE GLITCHES FONÉTICOS DO MICROFONE: Corrija termos captados incorretamente pela acústica do áudio pelo contexto da frase (exemplos: "poder escolas" -> "poder de curá-las", "Estela diluição" -> "extrema diluição", "engobe" -> "englobe", "homepatia" -> "homeopatia").
4. PRESERVAÇÃO DA VOZ E CONCEITO DO AUTOR: Mantenha as ideias, o raciocínio, o tom e a verdade do autor intactos. Não resuma e não empobreça o texto. Elimine apenas hesitações orais desnecessárias ("né", "tipo", "aí aí").
5. ESTRUTURAÇÃO DE TÍTULO: Sugira um título elegante e poético para este trecho ou capítulo.
6. Se o texto começar com um tema claro (como "Homeopatia", "O Enigma de Sansão", etc.), aproveite isso no título.

Responda OBRIGATORIAMENTE em formato JSON rigoroso:
{
  "polishedText": "o texto literário completamente lapidado, acentuado, com crases corretas, pontuado e dividido em parágrafos",
  "suggestedTitle": "Título do Trecho ou Capítulo",
  "themes": ["Tema 1", "Tema 2"],
  "literaryNote": "Breve comentário editorial e acolhedor valorizando a clareza e profundidade do relato"
}`;

      const ai = getGenAI();
      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const clean = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Resposta da IA não continha JSON legível.");
        }
      }
      res.json(parsed);
    } catch (error: any) {
      console.error("Erro no speech-polish:", error);
      res.status(500).json({
        error: "Falha ao processar o áudio com a IA.",
        details: error?.message || String(error),
      });
    }
  });

  // 1.5 Auto-punctuate, fix pt-BR crase/accents/homophones, and format paragraphs from raw speech
  app.post("/api/gemini/auto-punctuate", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: "rawText é obrigatório." });
      }

      const prompt = `Você é um revisor ortográfico e pontuador literário de alta precisão especializado em Português do Brasil (pt-BR, Acordo Ortográfico vigente).
Receba esta transcrição de voz ditada pelo escritor:
"""
${rawText}
"""

Sua missão é entregar o texto ditado com pontuação, parágrafos, acentuação e crase impecáveis no Português do Brasil:
1. FIDELIDADE À VOZ DO AUTOR: Mantenha 100% das ideias, das frases e do vocabulário genuíno do autor. Não faça resumos, não exclua frases e não reescreva o estilo do autor.
2. CRASE, ACENTUAÇÃO E ORTOGRAFIA DA FALA (PT-BR): Como o microfone capta apenas o som, corrija obrigatoriamente pelo contexto gramatical:
   - Crases exigidas pela regência e locuções ("à", "às", "àquele", "àquela", "àquilo", "às vezes", "à noite", "fui à delegacia", "à vontade", etc.);
   - Acentuação gráfica e diferencial ("está" vs "esta", "é" vs "e", "dá" vs "da", "pôde" vs "pode", "têm/vêm" no plural, "pôr" verbo vs "por" preposição);
   - Homônimos fonéticos do microfone: "há" (verbo haver de tempo decorrido ou existência, ex: "há dez anos") vs "a", uso correto dos 4 porquês ("por que", "porque", "por quê", "porquê"), "mas" vs "mais", "mal" vs "mau", "onde" vs "aonde";
   - Pequenas falhas acústicas ou de concordância geradas pelo reconhecimento de voz.
3. PONTUAÇÃO EXPRESSIVA: Insira vírgulas nas pausas naturais, pontos finais ao término de ideias, pontos de exclamação em momentos enfáticos, interrogações em perguntas e travessão (—) ou aspas ("...") em diálogos.
4. PARÁGRAFOS: Preserve as quebras de parágrafo (duas quebras de linha) que já existirem no texto (criadas pelas pausas longas do autor) e também divida blocos muito longos em parágrafos bem estruturados e arejados.
5. Se o autor tiver falado comando de "título" ou "capítulo", mantenha formatado como título destacado ("### ...").
6. Aplique letras maiúsculas no início de frases (após ponto final, interrogação ou exclamação), início de parágrafos e nomes próprios, e garanta letra minúscula logo após vírgulas (exceto nomes próprios ou siglas).

Retorne um JSON rigoroso:
{
  "punctuatedText": "o texto fielmente pontuado, acentuado, com crases e parágrafos corretos em pt-BR"
}`;

      const ai = getGenAI();
      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const clean = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const match = clean.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { punctuatedText: rawText };
      }
      res.json(parsed);
    } catch (error: any) {
      console.error("Erro no auto-punctuate:", error);
      res.status(500).json({
        error: "Falha ao pontuar o texto.",
        details: error?.message || String(error),
      });
    }
  });

  // 2. OCR of Handwritten Agendas & Books
  app.post("/api/gemini/ocr-manuscript", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 é obrigatório." });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      const prompt = `Analise esta foto de caderno, agenda manuscrita ou página de livro de estudo enviada pelo escritor.
Ele é um escritor brasileiro, ex-policial federal, escrevendo sobre depressão, amor, luto, solidão e recuperação.

Por favor:
1. Faça a transcrição EXATA e literal do que está escrito ou impresso, respeitando as quebras de linha poéticas originais (se for poesia ou diário).
2. Se houver data (como na agenda), identifique a data.
3. Se houver anotações à mão nas margens de livros (como nas apostilas de Neuróticos Anônimos), transcreva essas anotações destacando-as.
4. Gere uma versão 'lapidada' literariamente para entrar no livro, mantendo o tom cru e emocional do autor.
5. Faça uma breve análise do estado emocional expresso na página.

Responda em formato JSON rigoroso:
{
  "dateFound": "Ex: 01 de Janeiro de 2025 ou null",
  "exactTranscription": "transcrição linha por linha exata",
  "bookReadyVersion": "versão limpa e diagramada pronta para os capítulos",
  "emotionalAnalysis": "análise sensível do sentimento retratado",
  "suggestedChapter": "Sugestão de capítulo onde este manuscrito se encaixa"
}`;

      const ai = getGenAI();
      const response = await generateWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Erro no ocr-manuscript:", error);
      res.status(500).json({
        error: "Falha ao transcrever a foto do manuscrito.",
        details: error?.message || String(error),
      });
    }
  });

  // 3. Conversa Viva com a IA (Interlocutor Empático de Escrita)
  app.post("/api/gemini/live-dialogue", async (req, res) => {
    try {
      const { userMessage, history = [], bookTitle } = req.body;
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return res.status(400).json({ error: "userMessage é obrigatório." });
      }

      const systemInstruction = `Você é um curador, interlocutor literário e biógrafo empático e culto que dialoga em tempo real com o escritor.
O escritor trabalha em livros e ensaios profundos sobre múltiplos pilares:
- Saúde integrativa, cura e princípios biológicos (como Homeopatia, diluições, reações do organismo).
- Encontros da ciência com a filosofia e a espiritualidade (como John Newlands e a lei das oitavas na química, Rosa dos Ventos).
- Memórias confessionais de superação, luto afetivo, vivências na segurança pública e o caminho dos 12 Passos.

Diretrizes da sua resposta:
1. Responda com escuta genuína e sensibilidade literária, conectando-se diretamente com o que o autor acabou de falar.
2. Comente ou aprofunde a ideia com uma observação perspicaz, sem ser longo demais (2 a 3 parágrafos curtos).
3. Faça UMA pergunta instigante ou aberta que convide o autor a aprofundar um detalhe importante, uma memória ou uma explicação essencial para os leitores do livro.
4. Fale SEMPRE em português brasileiro com tom sereno, acolhedor, elegante e cúmplice.`;

      // Sanitizar histórico para respeitar rigorosamente a API do Gemini:
      // O primeiro turno DEVE ser "user", e os turnos devem alternar entre "user" e "model".
      const validHistory: any[] = [];
      for (const h of history) {
        if (!h.content || typeof h.content !== "string") continue;
        const role = h.role === "user" ? "user" : "model";
        // Ignora mensagem inicial se começar com 'model'
        if (validHistory.length === 0 && role === "model") {
          continue;
        }
        // Evita dois turnos repetidos da mesma role consecutivamente
        if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === role) {
          validHistory[validHistory.length - 1].parts[0].text += `\n${h.content}`;
        } else {
          validHistory.push({
            role,
            parts: [{ text: h.content }],
          });
        }
      }

      const contents = [
        ...validHistory,
        {
          role: "user",
          parts: [{ text: `[Obra: ${bookTitle || "Livro do Autor"}]\nO autor disse:\n"${userMessage}"` }],
        },
      ];

      const ai = getGenAI();
      const response = await generateWithFallback(ai, {
        contents,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text?.trim() || "Estou ouvindo atentamente cada detalhe do que você disse. Como você gostaria de aprofundar esse ponto no capítulo?";

      res.json({
        reply: replyText,
      });
    } catch (error: any) {
      console.error("Erro no live-dialogue:", error);
      res.status(500).json({
        error: "Falha na resposta do diálogo com a IA.",
        details: error?.message || String(error),
      });
    }
  });

  // 3.5 Sintetizar Diálogo em Rascunho Literário para o Livro
  app.post("/api/gemini/synthesize-dialogue", async (req, res) => {
    try {
      const { dialogueHistory, bookTitle, chapterContext } = req.body;
      if (!dialogueHistory || !Array.isArray(dialogueHistory) || dialogueHistory.length === 0) {
        return res.status(400).json({ error: "dialogueHistory é obrigatório." });
      }

      // Filtra e formata a conversa
      const formattedConversation = dialogueHistory
        .map((item: any) => `${item.role === "user" ? "ESCRITOR" : "INTERLOCUTOR"}: ${item.text}`)
        .join("\n\n");

      const prompt = `Você é um curador e ghostwriter literário sênior.
Receba esta conversa viva realizada entre o autor e seu interlocutor:
"""
${formattedConversation}
"""

[Contexto da Obra: "${bookTitle || "Livro do Autor"}"]
${chapterContext ? `[Contexto do Capítulo Alvo: "${chapterContext}"]` : ""}

Sua missão é transformar essa conversa em um RASCUNHO LITERÁRIO DE ALTA QUALIDADE para o livro do autor:
1. FOCO TOTAL NA VOZ DO AUTOR: Extraia todas as memórias, conceitos, explicações (ex: Homeopatia, diluições, vivências confessionais, ciência, superação) e reflexões que o autor expressou.
2. ELIMINE O FORMATO DE BATE-PAPO: Remova cumprimentos, saudações ("olá", "como vai") e o formato ping-pong "autor disse / interlocutor respondeu".
3. CONSTRUA UMA NARRATIVA CONTÍNUA E PROFUNDA: Escreva em primeira pessoa (se for confessional/memória) ou em tom de ensaio lúcido e envolvente (se for expositivo/temático).
4. ESTRUTURE COM ELEGÂNCIA: Crie um título forte para o rascunho, subtítulos onde couber, parágrafos fluidos, pontuação impecável e quebras de linha harmoniosas.
5. PRESERVE A AUTENTICIDADE: Não suavize nem desfigure a dor, a convicção ou a técnica do autor. Eleve o estilo sem inventar dados que o autor não mencionou.

Retorne EXATAMENTE no seguinte formato JSON rigoroso:
{
  "draftTitle": "Título expressivo sugerido para o rascunho",
  "draftText": "Texto completo em prosa literária, pronto para leitura ou inclusão em capítulo",
  "themes": ["Tema 1", "Tema 2", "Tema 3"],
  "literaryNotes": "Uma breve observação do curador sobre o tom e onde este rascunho se encaixa no livro"
}`;

      const ai = getGenAI();
      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Erro no synthesize-dialogue:", error);
      res.status(500).json({
        error: "Falha ao sintetizar o diálogo.",
        details: error?.message || String(error),
      });
    }
  });

  // 4. Cruzamento com Pesquisas Oficiais e Autores Renomados
  app.post("/api/gemini/compare-research", async (req, res) => {
    try {
      const { textPassage } = req.body;
      if (!textPassage) {
        return res.status(400).json({ error: "textPassage é obrigatório." });
      }

      const prompt = `Analise este trecho escrito pelo autor:
"""
${textPassage}
"""

Conecte as reflexões deste trecho com:
1. Autores Renomados Mundiais sobre Depressão (ex: Viktor Frankl em 'Em Busca de Sentido', Andrew Solomon em 'O Demônio do Meio-Dia', William Styron em 'Escuridão Visível').
2. Filosofia dos 12 Passos de Neuróticos Anônimos (N/A) e o conceito de recuperação emocional compartilhada.
3. Pesquisas Oficiais de Segurança Pública no Brasil (Anuário Brasileiro de Segurança Pública do FBSP, pesquisas da FENAPEF sobre o índice alarmante de suicídio na Polícia Federal e o peso do silêncio policial).

Gere uma sugestão de nota de apoio ou citação enriquecedora pronta para enriquecer o livro.

Responda em formato JSON:
{
  "authorConnection": {
    "author": "Nome do autor",
    "work": "Obra de referência",
    "comparison": "Como a experiência do escritor reflete o pensamento deste autor"
  },
  "twelveStepsInsight": "Como este trecho dialoga com as leis de recuperação emocional de Neuróticos Anônimos",
  "policeResearchGrounding": "Dado ou fato documentado sobre a realidade policial/segurança pública que valida a dor do autor",
  "suggestedFootnote": "Texto sugerido para nota de rodapé ou citação no livro"
}`;

      const ai = getGenAI();
      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Erro no compare-research:", error);
      res.status(500).json({
        error: "Falha ao cruzar pesquisas e autores.",
        details: error?.message || String(error),
      });
    }
  });

  // 5. Google Books Search Proxy (Resilient with 3-tier fallback and cache)
  app.get("/api/books/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "depressao policial saude mental";
      const result = await searchBooksResilient(query, getGenAI);
      res.json(result);
    } catch (error: any) {
      console.error("Erro no Google Books search:", error);
      // Even in worst-case error, return graceful empty items array without crashing
      res.json({
        items: [],
        source: "fallback_empty",
        message: "Não foi possível carregar livros no momento. Tente novamente.",
      });
    }
  });

  // Vite middleware for development vs static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Estúdio Literário server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
