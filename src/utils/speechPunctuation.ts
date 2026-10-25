/**
 * Utilitário de formatação de pontuação, parágrafos, acentuação, crase e ortografia
 * para ditado por voz em Português do Brasil (pt-BR).
 */

export interface VoiceCommandGuideItem {
  command: string;
  symbol: string;
  description: string;
  example: string;
}

export const VOICE_COMMANDS_GUIDE: VoiceCommandGuideItem[] = [
  {
    command: '"vírgula"',
    symbol: ",",
    description: "Insere uma vírgula e mantém a próxima palavra em minúscula",
    example: '"cheguei ao plantão [vírgula] e vi a viatura"',
  },
  {
    command: '"ponto" ou "ponto final"',
    symbol: ".",
    description: "Encerra a frase e coloca a próxima em maiúscula",
    example: '"o dia terminou [ponto final] eu voltei para casa"',
  },
  {
    command: '"novo parágrafo" ou "parágrafo"',
    symbol: "¶",
    description: "Pula para um novo parágrafo com linha em branco",
    example: '"...tudo aquilo acabou [novo parágrafo] No dia seguinte..."',
  },
  {
    command: '"interrogação" ou "ponto de interrogação"',
    symbol: "?",
    description: "Insere ponto de interrogação para perguntas",
    example: '"por que eu continuei ali [interrogação]"',
  },
  {
    command: '"exclamação" ou "ponto de exclamação"',
    symbol: "!",
    description: "Insere ponto de exclamação para ênfases",
    example: '"precisamos resistir [exclamação]"',
  },
  {
    command: '"dois pontos"',
    symbol: ":",
    description: "Insere dois pontos para listas ou falas",
    example: '"eu pensei o seguinte [dois pontos]"',
  },
  {
    command: '"travessão"',
    symbol: "—",
    description: "Insere travessão para falas e diálogos",
    example: '"[travessão] Você está pronto para sair?"',
  },
  {
    command: '"reticências"',
    symbol: "...",
    description: "Insere reticências para pausas reflexivas",
    example: '"eu não sabia o que dizer [reticências]"',
  },
  {
    command: '"abre aspas" / "fecha aspas"',
    symbol: "“ ”",
    description: "Abre e fecha aspas para citações",
    example: '"ele disse [abre aspas] força sempre [fecha aspas]"',
  },
  {
    command: '"título" ou "capítulo"',
    symbol: "###",
    description: "Cria uma linha de título destacada",
    example: '"[título] O Silêncio da Delegacia [novo parágrafo]"',
  },
];

/**
 * Aplica correções seguras de ortografia, acentuação, crase e homônimos fonéticos
 * do Português do Brasil (pt-BR) comuns na transcrição por voz.
 */
export function applyPortugueseOrthographyFixes(text: string): string {
  if (!text) return "";

  let out = text;

  // 1. Correção de falhas fonéticas frequentes do microfone
  const phoneticFixes: [RegExp, string][] = [
    [/\bpoder\s+escolas\b/gi, "poder de curá-las"],
    [/\bpoder\s+escola\b/gi, "poder de curar"],
    [/\b(?:uma\s+)?estela\s+diluição\b/gi, "uma extrema diluição"],
    [/\bestela\s+diluicao\b/gi, "extrema diluição"],
    [/\bengobe\b/gi, "englobe"],
    [/\bhomepatia\b/gi, "homeopatia"],
    [/\ba\s+ideia\s+é\s+fundamental\s+da\b/gi, "a ideia fundamental da"],
  ];

  for (const [pattern, fix] of phoneticFixes) {
    out = out.replace(pattern, fix);
  }

  // 2. Palavras em pt-BR caso venham sem acento gráfico na transcrição
  const accentFixes: [RegExp, string][] = [
    [/\bvoce\b/gi, "você"],
    [/\bvoces\b/gi, "vocês"],
    [/\btambem\b/gi, "também"],
    [/\balguem\b/gi, "alguém"],
    [/\bninguem\b/gi, "ninguém"],
    [/\bnao\b/gi, "não"],
    [/\bentao\b/gi, "então"],
    [/\bcoracao\b/gi, "coração"],
    [/\bmemoria\b/gi, "memória"],
    [/\bmemorias\b/gi, "memórias"],
    [/\bhistoria\b/gi, "história"],
    [/\bhistorias\b/gi, "histórias"],
    [/\bpolicia\b/gi, "polícia"],
    [/\bdepressao\b/gi, "depressão"],
    [/\bsolidao\b/gi, "solidão"],
    [/\bcapitulo\b/gi, "capítulo"],
    [/\bparagrafo\b/gi, "parágrafo"],
  ];

  for (const [pattern, replacement] of accentFixes) {
    out = out.replace(pattern, (match) => {
      // Preserva inicial maiúscula se a palavra original estava capitalizada
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  // 3. Locuções adverbiais, prepositivas e conjuntivas femininas com CRASE obrigatória (pt-BR)
  const craseLocutions: [RegExp, string][] = [
    [/\ba\s+primeira\s+vista\b/gi, "à primeira vista"],
    [/\ba\s+toa\b/gi, "à toa"],
    [/\bas\s+pressas\b/gi, "às pressas"],
    [/\bas\s+escuras\b/gi, "às escuras"],
    [/\bas\s+claras\b/gi, "às claras"],
    [/\bas\s+escondidas\b/gi, "às escondidas"],
    [/\bas\s+cegas\b/gi, "às cegas"],
    [/\bas\s+avessas\b/gi, "às avessas"],
    [/\bas\s+custas\s+de\b/gi, "às custas de"],
    [/\bas\s+margens\s+(de|do|da|dos|das)\b/gi, "às margens $1"],
    [/\ba\s+medida\s+que\b/gi, "à medida que"],
    [/\ba\s+proporção\s+que\b/gi, "à proporção que"],
    [/\ba\s+beira\s+(de|do|da|dos|das)\b/gi, "à beira $1"],
    [/\ba\s+procura\s+(de|do|da|dos|das)\b/gi, "à procura $1"],
    [/\ba\s+espera\s+(de|do|da|dos|das)\b/gi, "à espera $1"],
    [/\ba\s+mercê\s+(de|do|da|dos|das)\b/gi, "à mercê $1"],
    [/\ba\s+luz\s+(de|do|da|dos|das)\b/gi, "à luz $1"],
    [/\ba\s+parte\b(?=\s*[,.;:?!])/gi, "à parte"],
  ];

  for (const [pattern, replacement] of craseLocutions) {
    out = out.replace(pattern, (match, ...args) => {
      const hasGroup = typeof args[0] === "string" && args.length > 2;
      let built = hasGroup ? replacement.replace("$1", args[0]) : replacement;
      if (match[0] === "A" || match[0] === "À") {
        built = "À" + built.slice(1);
      }
      return built;
    });
  }

  // "às vezes" no início de frase/parágrafo ou após pontuação
  out = out.replace(/(^|[.,;:?!—]\s+|\n+\s*)(as)\s+(vezes)\b/gi, (_, prefix, asWord, vezes) => {
    const isAfterCommaOrSemi = /[,;:]\s+$/.test(prefix);
    const craseAs = !isAfterCommaOrSemi && asWord[0] === "A" ? "Às" : "às";
    return `${prefix}${craseAs} ${vezes}`;
  });

  // Expressões contextuais com crase: "à vontade", "à tona", "à deriva", "ontem/hoje/amanhã à noite/à tarde"
  out = out.replace(
    /\b(ficar|fique|fiquei|ficou|estava|estou|estar|sentir-se|senti-me|deixar|deixei|muito|bem)\s+a\s+vontade\b/gi,
    "$1 à vontade"
  );
  out = out.replace(
    /\b(vir|vem|veio|vieram|trazer|trouxe|voltar|voltou)\s+a\s+tona\b/gi,
    "$1 à tona"
  );
  out = out.replace(
    /\b(ficar|ficou|fiquei|estava|estou|estar|barco)\s+a\s+deriva\b/gi,
    "$1 à deriva"
  );
  out = out.replace(
    /\b(ontem|hoje|amanhã|tarde|logo|sábado|domingo|sexta|quinta|quarta|terça|segunda)\s+a\s+(noite|tarde)\b/gi,
    "$1 à $2"
  );

  // Regência verbal clássica com substantivos femininos frequentes
  out = out.replace(
    /\b(fui|foi|fomos|foram|voltei|voltou|voltamos|cheguei|chegou|chegamos|retornei|retornou|dirigi-me|dirigiu-se|refiro-me|referia-se)\s+a\s+(delegacia|igreja|escola|faculdade|academia|reunião|clínica|consulta|cidade|praia|janela|porta|mesa|conclusão|vida|realidade)\b/gi,
    "$1 à $2"
  );

  // Horas determinadas após verbos de rotina/deslocamento ("acordei às seis horas", "cheguei às 14 horas")
  out = out.replace(
    /\b(acordei|acordou|levantei|cheguei|chegou|saí|saiu|começou|terminou|dormi)\s+as\s+(duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|\d{1,2})\s+horas\b/gi,
    "$1 às $2 horas"
  );

  // 4. Verbo HAVER indicando tempo decorrido ("há dez anos", "há muito tempo") quando não precedido de "daqui"
  out = out.replace(
    /\b(a)\s+(muito\s+tempo|pouco\s+tempo|bastante\s+tempo|(?:muitos|poucos|alguns|vários|dois|três|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta|\d+)\s+(?:anos|meses|dias|semanas|horas|minutos|décadas))(\s+atrás)?\b/gi,
    (match, aWord, rest, atras, offset, fullStr) => {
      const before = fullStr.slice(Math.max(0, offset - 10), offset).toLowerCase();
      if (/\bdaqui\s+$/.test(before)) {
        return match;
      }
      const ha = aWord === "A" ? "Há" : "há";
      return `${ha} ${rest}${atras || ""}`;
    }
  );

  // 5. Uso de "por quê" antes de interrogação ou ponto final
  out = out.replace(/\b(por)\s+(que)\s*([?.!])/gi, (_, porWord, _queWord, punct) => {
    const p = porWord[0] === "P" ? "Por" : "por";
    return `${p} quê${punct}`;
  });

  return out;
}

/**
 * Converte comandos de voz falados em português para pontuação e diagramação tipográfica real,
 * preservando quebras de parágrafo (\n\n) no final do trecho em andamento.
 */
export function applySpokenPunctuation(
  text: string,
  options?: { isContinuation?: boolean }
): string {
  if (!text) return "";

  let result = text;

  const replacements: [RegExp, string][] = [
    // Títulos e Capítulos
    [/\b(?:novo\s+título|título)\s*:\s*/gi, "\n\n### "],
    [/\b(?:novo\s+título|título)\b/gi, "\n\n### "],
    [/\b(?:novo\s+capítulo|capítulo)\b/gi, "\n\n### Capítulo: "],

    // Parágrafos e quebras de linha
    [/\b(?:novo\s+parágrafo|parágrafo\s+novo|novo\s+paragrafo)\b/gi, "\n\n"],
    [/\b(?:parágrafo|paragrafo|pular\s+linha|nova\s+linha)\b/gi, "\n\n"],

    // Pontuação básica
    [/\b(?:ponto\s+final|ponto\s+de\s+parágrafo)\b/gi, ". "],
    [/\b(?:ponto\s+e\s+vírgula|ponto\s+e\s+virgula)\b/gi, "; "],
    [/\b(?:dois\s+pontos)\b/gi, ": "],
    [
      /\b(?:ponto\s+de\s+interrogação|ponto\s+de\s+interrogacao|interrogação|interrogacao)\b/gi,
      "? ",
    ],
    [
      /\b(?:ponto\s+de\s+exclamação|ponto\s+de\s+exclamacao|exclamação|exclamacao)\b/gi,
      "! ",
    ],
    [/\b(?:reticências|reticencias|três\s+pontinhos)\b/gi, "... "],
    [/\b(?:vírgula|virgula)\b/gi, ", "],

    // Símbolos literários e diálogos
    [/\b(?:travessão|travessao|traço\s+de\s+fala)\b/gi, " — "],
    [/\b(?:abrir\s+aspas|abre\s+aspas)\b/gi, ' "'],
    [/\b(?:fechar\s+aspas|fecha\s+aspas)\b/gi, '" '],
    [/\b(?:abrir\s+parênteses|abre\s+parênteses|abre\s+parenteses)\b/gi, " ("],
    [/\b(?:fechar\s+parênteses|fecha\s+parênteses|fecha\s+parenteses)\b/gi, ") "],

    // Ponto isolado quando o usuário diz "ponto" (sem confundir com "ponto de vista", etc.)
    [/\s+\bponto\b(?!\s+(?:de\s+vista|turístico|cego|cardeal|com|final|e\s+vírgula|de\s+apoio|de\s+partida))/gi, ". "],
  ];

  for (const [regex, replacement] of replacements) {
    result = result.replace(regex, replacement);
  }

  // Ajustes de espaçamento preservando quebras de linha (\n\n) intactas
  result = result
    .replace(/[ \t]+([,.:;?!])/g, "$1")
    .replace(/([,.:;?!])(\p{L})/gu, "$1 $2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  result = applyPortugueseOrthographyFixes(result);
  result = options?.isContinuation
    ? capitalizeInternalSentences(result)
    : capitalizeSentences(result);

  return result;
}

/**
 * Garante que logo após uma vírgula (,) a próxima palavra comece com letra minúscula,
 * preservando apenas siglas reais em caixa alta (ex: "PF", "SP", "INSS").
 */
export function lowercaseAfterComma(text: string): string {
  if (!text) return "";
  return text.replace(/(,\s*(?:["“«(]\s*)?)(\p{Lu})(?!\p{Lu})/gu, (_, prefix, char) => {
    return prefix + char.toLowerCase();
  });
}

function capitalizeInternalSentences(text: string): string {
  if (!text) return "";
  let out = text;
  out = out.replace(/([.?!]\s+)(\p{Ll})/gu, (_, punct, char) => punct + char.toUpperCase());
  out = out.replace(/(\n+\s*)(\p{Ll})/gu, (_, prefix, char) => prefix + char.toUpperCase());
  out = out.replace(/(###\s+)(\p{Ll})/gu, (_, prefix, char) => prefix + char.toUpperCase());
  out = out.replace(/(—\s+)(\p{Ll})/gu, (_, prefix, char) => prefix + char.toUpperCase());
  return lowercaseAfterComma(out);
}

/**
 * Aplica letra maiúscula no início do texto e após '.', '?', '!' ou quebras de linha,
 * garantindo também letra minúscula logo após vírgulas.
 */
export function capitalizeSentences(text: string): string {
  if (!text) return "";

  let out = text.replace(/^(\s*###\s*)(\p{Ll})/iu, (_, prefix, char) => prefix + char.toUpperCase());
  out = out.replace(/^(\s*)(\p{Ll})/u, (_, prefix, char) => prefix + char.toUpperCase());

  return capitalizeInternalSentences(out);
}

function capitalizeFirstLetter(str: string): string {
  return str.replace(/^(\s*(?:["“«(]\s*)?)(\p{Ll})/u, (_, prefix, ch) => prefix + ch.toUpperCase());
}

function lowercaseSegmentStart(str: string): string {
  // Garante letra inicial minúscula em continuações de frase (especialmente após vírgula),
  // preservando siglas em caixa alta (ex: "PF", "SP", "INSS")
  return str.replace(/^(\s*(?:["“«(]\s*)?)(\p{Lu})(?!\p{Lu})/u, (_, prefix, first) => {
    return `${prefix}${first.toLowerCase()}`;
  });
}

/**
 * Une de forma inteligente o texto já consolidado (incluindo vírgulas, pontos e parágrafos
 * inseridos por pausas na fala) com o novo segmento falado, NUNCA engolindo quebras de linha (\n\n).
 */
export function joinSpeechSegments(committed: string, nextSegment: string): string {
  const cleanNext = nextSegment.replace(/^[ \t]+/, "");
  if (!committed) {
    return capitalizeSentences(cleanNext);
  }
  if (!cleanNext) {
    return committed;
  }

  // Se o novo segmento começa com quebra de parágrafo (ex: usuário disse "novo parágrafo")
  if (/^\n/.test(cleanNext)) {
    const baseWithoutTrailingComma = committed
      .replace(/[,;:\s]+$/, "")
      .replace(/([\p{L}0-9])$/u, "$1.");
    const restAfterNewlines = cleanNext.replace(/^\n+/, "");
    return capitalizeSentences(
      `${baseWithoutTrailingComma}\n\n${capitalizeFirstLetter(restAfterNewlines)}`
    );
  }

  // Se o novo segmento começa com sinal de pontuação explícito (ex: usuário disse "vírgula" ou "interrogação")
  if (/^[,.:;?!]/.test(cleanNext)) {
    const baseStripped = committed.replace(/[,.:;?!\s]+$/, "");
    return capitalizeSentences(`${baseStripped}${cleanNext}`);
  }

  // Se o texto consolidado já termina com quebra de parágrafo (\n ou \n\n)
  if (/\n[ \t]*$/.test(committed)) {
    const normalizedBase = committed.replace(/[ \t]+$/, "");
    return capitalizeSentences(`${normalizedBase}${capitalizeFirstLetter(cleanNext)}`);
  }

  // Se termina com ponto final, interrogação, exclamação, travessão ou marcador de título
  if (/(?:[.?!]|—|###)[ \t]*$/.test(committed)) {
    const normalizedBase = committed.replace(/[ \t]*$/, " ");
    return capitalizeSentences(`${normalizedBase}${capitalizeFirstLetter(cleanNext)}`);
  }

  // Se termina com vírgula, dois-pontos ou ponto e vírgula (ex: pausa curta de ~0,8s!) -> próxima palavra em minúscula
  if (/[,:;][ \t]*$/.test(committed)) {
    const normalizedBase = committed.replace(/[ \t]*$/, " ");
    return lowercaseAfterComma(`${normalizedBase}${lowercaseSegmentStart(cleanNext)}`);
  }

  // Caso normal: frase contínua sem pausa longa entre blocos -> mantém continuação em minúscula
  const normalizedBase = committed.replace(/[ \t]+$/, "");
  return lowercaseAfterComma(`${normalizedBase} ${lowercaseSegmentStart(cleanNext)}`);
}

/**
 * Motor local e instantâneo de pontuação inteligente, parágrafos, crase e ortografia pt-BR.
 * Usado imediatamente ao encerrar a gravação e como garantia offline caso a IA oscile.
 */
export function smartLocalPunctuationAndParagraphs(rawText: string): {
  punctuatedText: string;
  suggestedTitle: string;
} {
  if (!rawText || !rawText.trim()) {
    return { punctuatedText: "", suggestedTitle: "Relato do Autor" };
  }

  let text = rawText.trim();

  // 1. Aplica comandos falados explícitos e correções ortográficas/crase em pt-BR
  text = applySpokenPunctuation(text);
  text = applyPortugueseOrthographyFixes(text);

  // 2. Detecção de título explícito (apenas se houver marcação ### de comando de voz)
  let detectedTitle = "Reflexão do Autor";
  const explicitTitleMatch = text.match(/^###\s*(.+?)(?:\n+|$)/);
  if (explicitTitleMatch && explicitTitleMatch[1]) {
    detectedTitle = explicitTitleMatch[1].trim();
  }

  // 3. Inserção de vírgulas contextuais antes de conjunções adversativas/explicativas/conclusivas
  const commaConnectors = [
    "porém",
    "contudo",
    "no entanto",
    "todavia",
    "portanto",
    "por isso",
    "além disso",
    "ou seja",
    "isto é",
    "por exemplo",
    "mas também",
  ];

  for (const conn of commaConnectors) {
    const reg = new RegExp(`([A-Za-zÀ-ÿ0-9])\\s+(${conn})\\b`, "gi");
    text = text.replace(reg, "$1, $2");
  }

  // 4. Se o autor parou a gravação logo após uma vírgula de pausa curta, converte o final em ponto
  text = text.replace(/[,;:]\s*$/, ".");

  // Garante pontuação final no término do texto
  if (!/[.!?…"”]$/.test(text.trim())) {
    text = text.trim() + ".";
  }

  // 5. Se o texto for muito longo (> 55 palavras) e ainda não tiver nenhum parágrafo, agrupa a cada 2-3 frases
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (!text.includes("\n\n") && wordCount > 55) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length >= 3) {
      const paragraphs: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        paragraphs.push(sentences.slice(i, i + 2).join(" "));
      }
      text = paragraphs.join("\n\n");
    }
  }

  // Limpeza final preservando quebras de parágrafo (\n\n)
  text = text
    .replace(/[ \t]+([,.:;?!])/g, "$1")
    .replace(/([,.:;?!])([A-Za-zÀ-ÿ])/g, "$1 $2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  text = capitalizeSentences(text);

  return {
    punctuatedText: text,
    suggestedTitle: detectedTitle,
  };
}
