import { BookProject, Chapter, ProjectTask, ManuscriptSample, ResearchDocument } from "../types";

// Tarefas do projeto em estado inicial zerado (todas como planejadas, progresso 0%)
export const INITIAL_TASKS: ProjectTask[] = [
  // FASE 1
  {
    id: "t-1-1",
    phase: "fase1",
    phaseName: "Fase 1: Núcleo de Escrita Mãos Livres",
    title: "Seletor Multi-Livros & Gestão de Projetos",
    description: "Permitir alternar entre a obra atual, livros anteriores para memória de estilo e novos rascunhos.",
    status: "planned",
    category: "Estrutura",
  },
  {
    id: "t-1-2",
    phase: "fase1",
    phaseName: "Fase 1: Núcleo de Escrita Mãos Livres",
    title: "Estúdio de Voz Contínua (Gravação Longa & Desabafo)",
    description: "Gravação de relatos longos sem limite de tempo com transcrição que retira cacoetes e pontua com emoção.",
    status: "planned",
    category: "Voz & Áudio",
  },
  {
    id: "t-1-3",
    phase: "fase1",
    phaseName: "Fase 1: Núcleo de Escrita Mãos Livres",
    title: "Modo Conversa Viva (Diálogo Contínuo com IA)",
    description: "Sessão de escuta interativa com a IA fazendo perguntas que resgatam memórias de plantão e sentimentos.",
    status: "planned",
    category: "Voz & Áudio",
  },
  {
    id: "t-1-4",
    phase: "fase1",
    phaseName: "Fase 1: Núcleo de Escrita Mãos Livres",
    title: "Leitor de Manuscritos & Fotos de Agendas (OCR)",
    description: "Digitalização de fotos de cadernos (1/jan e 10/fev) e apostilas grifadas de Neuróticos Anônimos.",
    status: "planned",
    category: "Visão & Imagem",
  },
  {
    id: "t-1-5",
    phase: "fase1",
    phaseName: "Fase 1: Núcleo de Escrita Mãos Livres",
    title: "Editor de Capítulos & Revisão Gramatical Sensível",
    description: "Polimento de português preservando o tom confessional, cru e poético sem engessar a voz do escritor.",
    status: "planned",
    category: "Texto",
  },
  {
    id: "t-1-6",
    phase: "fase1",
    phaseName: "Fase 1: Núcleo de Escrita Mãos Livres",
    title: "Exportação Direta para Microsoft Word (.docx)",
    description: "Geração de arquivos reais compatíveis com o Office 365 com margens ABNT, sumário e paginação limpa.",
    status: "planned",
    category: "Exportação",
  },

  // FASE 2
  {
    id: "t-2-1",
    phase: "fase2",
    phaseName: "Fase 2: Embasamento & Pesquisas",
    title: "Acervo de Dados Oficiais de Segurança Pública (FBSP)",
    description: "Integração dos dados do Anuário Brasileiro sobre suicídio como a maior causa de morte de policiais.",
    status: "planned",
    category: "Pesquisa",
  },
  {
    id: "t-2-2",
    phase: "fase2",
    phaseName: "Fase 2: Embasamento & Pesquisas",
    title: "Pesquisas FENAPEF sobre Saúde Mental na Polícia Federal",
    description: "Dados de 49% de sintomas de depressão e taxas 4 a 6 vezes maiores que a média nacional.",
    status: "planned",
    category: "Pesquisa",
  },
  {
    id: "t-2-3",
    phase: "fase2",
    phaseName: "Fase 2: Embasamento & Pesquisas",
    title: "Estudo dos 12 Passos de Neuróticos Anônimos (N/A)",
    description: "Cruzamento dos grifos do livro vermelho de Little Rock com a superação do egoísmo e a busca da sanidade.",
    status: "planned",
    category: "Filosofia",
  },
  {
    id: "t-2-4",
    phase: "fase2",
    phaseName: "Fase 2: Embasamento & Pesquisas",
    title: "Biblioteca Integrada Google Livros & Compra",
    description: "Buscador mundial de livros de referência com sinopses, prévias e links para Google Play e Amazon.",
    status: "planned",
    category: "Biblioteca",
  },

  // FASE 3
  {
    id: "t-3-1",
    phase: "fase3",
    phaseName: "Fase 3: Publicação & Divulgação",
    title: "Diagramador Amazon KDP (Kindle & Livro Físico Sob Demanda)",
    description: "Configuração dos parâmetros de sangria, margens espelhadas e ficha catalográfica para a Amazon.",
    status: "planned",
    category: "Publicação",
  },
  {
    id: "t-3-2",
    phase: "fase3",
    phaseName: "Fase 3: Publicação & Divulgação",
    title: "Gerenciador do Instagram (Copiloto de Temas & Legendas)",
    description: "Sugestões de temas semanais e legendas poéticas sobre a prevenção do suicídio na segurança pública.",
    status: "planned",
    category: "Divulgação",
  },
  {
    id: "t-3-3",
    phase: "fase3",
    phaseName: "Fase 3: Publicação & Divulgação",
    title: "Página Oficial do Autor (Biografia & Venda Direta)",
    description: "Site com a trajetória do ex-policial, galeria de obras e canal de compra direta.",
    status: "planned",
    category: "Web",
  },
  {
    id: "t-3-4",
    phase: "fase3",
    phaseName: "Fase 3: Publicação & Divulgação",
    title: "Versão Mobile / PWA para Leitura no Celular",
    description: "Instalação da plataforma como aplicativo no smartphone para leitura e ditado em qualquer lugar.",
    status: "planned",
    category: "Mobile",
  },

  // FASE 4
  {
    id: "t-4-1",
    phase: "fase4",
    phaseName: "Fase 4: Associação de Apoio",
    title: "Fundação dos 'Depressivos Anônimos' em Belo Horizonte/MG",
    description: "Estruturação dos 12 Passos e 12 Tradições com foco acolhedor em depressão e servidores de risco.",
    status: "planned",
    category: "Comunidade",
  },
  {
    id: "t-4-2",
    phase: "fase4",
    phaseName: "Fase 4: Associação de Apoio",
    title: "Portal de Conversas por Áudio & Voluntariado Autônomo",
    description: "Salas de voz anônimas com mediação e cadastro de psicólogos voluntários sem fins lucrativos.",
    status: "planned",
    category: "Comunidade",
  },
];

// Dados zerados para iniciar projeto limpo
export const INITIAL_PROJECTS: BookProject[] = [
  {
    id: "book-meu-livro",
    title: "Meu Livro",
    subtitle: "Rascunho Inicial",
    status: "writing",
    statusLabel: "Obra em Andamento",
    genre: "Memórias & Reflexões",
    summary: "Comece a estruturar sua obra a partir do zero. Use o Estúdio de Voz para ditar relatos ou escreva no Editor de Capítulos.",
    chaptersCount: 0,
    lastEdited: "Hoje",
    accentColor: "border-amber-700/60 bg-amber-50/40 text-amber-900",
  },
];

export const INITIAL_CHAPTERS: Chapter[] = [];

// Dados de Exemplo / Demonstração (caso o usuário queira restaurar ou comparar)
export const SAMPLE_PROJECTS: BookProject[] = [
  {
    id: "book-demo-peso",
    title: "O Peso do Distintivo",
    subtitle: "A Linha Tênue entre o Dever, o Luto e a Sobrevivência na Polícia Federal",
    status: "writing",
    statusLabel: "Obra em Andamento",
    genre: "Memórias & Depoimento Testimonial",
    summary: "Relato autobiográfico corajoso que expõe os abismos emocionais da rotina policial, a perda de um grande amor, a depressão profunda e a busca pela reconstrução da alma através do compartilhamento humano.",
    chaptersCount: 4,
    lastEdited: "Hoje às 05:40",
    accentColor: "border-amber-700/60 bg-amber-50/40 text-amber-900",
  },
  {
    id: "book-demo-caminhos",
    title: "Caminhos de Volta",
    subtitle: "Lições da Investigação e da Alma Humana",
    status: "completed",
    statusLabel: "Livro Concluído & Publicado",
    genre: "Ensaios & Reflexões Policiais",
    summary: "Obra anterior do autor já lançada, utilizada pela inteligência artificial como repositório de memória de estilo, vocabulário característico e cadência narrativa.",
    chaptersCount: 12,
    lastEdited: "Arquivo de Memória",
    accentColor: "border-emerald-700/60 bg-emerald-50/40 text-emerald-900",
  },
  {
    id: "book-demo-luz",
    title: "A Luz nas Sombras",
    subtitle: "A Filosofia dos 12 Passos Aplicada à Depressão dos Homens Fortes",
    status: "draft",
    statusLabel: "Novo Esboço",
    genre: "Guia Filosófico & Recuperação",
    summary: "Projeto de ensaio que conecta a literatura original de Neuróticos Anônimos com a realidade dos profissionais de segurança pública e a criação dos Depressivos Anônimos em BH.",
    chaptersCount: 2,
    lastEdited: "Em estruturação",
    accentColor: "border-blue-700/60 bg-blue-50/40 text-blue-900",
  },
];

export const SAMPLE_CHAPTERS: Chapter[] = [
  {
    id: "chap-demo-1",
    bookId: "book-demo-peso",
    number: 1,
    title: "A Noite Mais Longa",
    subtitle: "Anotação confessional de 1º de Janeiro de 2025",
    dateReference: "01/01/2025",
    emotionalTag: "Luto Afetivo & Desamparo",
    content: `Você foi, e levou a esperança.
Tinha você, e hoje tenho que te esquecer.

A noite fica escura. Aquele restinho que iluminava a minha noite apagou, sumiu e me deixou. Hoje não sou homem, vivo escondido. Tento te ligar e você não me responde. A alegria partiu, agora começo a chorar.

A depressão está tomando conta. Aquilo que iluminava meu coração foi embora e deixou a solidão. Como viver sem você? Você era tudo o que eu tinha. Você só me ensinou a querer. Você é quem me deixava feliz.

Saio pensando até procurar, e volto mais triste. Tento tomar uma cerveja para a companhia dormir, e para tirar um pouco você do meu pensamento.

O silêncio do quarto não é apenas ausência de som. Para quem passou anos acostumado com o rádio de viatura e a adrenalina constante da Polícia Federal, o silêncio da noite é ensurdecedor. Ele me desarma por dentro. Não há colete balístico que proteja o peito da perda de quem nos sustentava em pé.`,
    footnotes: [
      "Referência à página manuscrita da agenda de 1º de Janeiro de 2025.",
      "Conexão com os estudos de Andrew Solomon em 'O Demônio do Meio-Dia': a perda da vitalidade como o verdadeiro sintoma da depressão grave.",
    ],
    lastUpdated: "21 de Setembro",
  },
  {
    id: "chap-demo-2",
    bookId: "book-demo-peso",
    number: 2,
    title: "A Inversão dos Sentidos",
    subtitle: "Anotação confessional de 10 de Fevereiro de 2025",
    dateReference: "10/02/2025",
    emotionalTag: "Dependência Emocional & Saudade",
    content: `Você foi o melhor dos meus amores, mas também o que mais doeu.
Quero saber como está você. O dia passa e eu não sei de você. Como está você? Que me fez esquecer a minha própria vida.

Cheguei a gostar mais de você do que de mim.

Sinto tanta saudade, preciso amanhecer com você um dia. Pois amo você eternamente. Onde está você? Preciso ter certeza de que você voltou. Você é a razão da minha vida.

Apareça, não deixe que o tempo nos separe. Preciso de você para me fazer feliz. Não tento te esquecer, porque você já faz parte da minha vida.

Quando um homem da segurança pública confessa no papel que 'gostou mais de alguém do que de si mesmo', ele está revelando o ponto cego da nossa formação: nós somos treinados para proteger a sociedade inteira, mas ninguém nos ensina a cuidar do nosso próprio amor-próprio quando o chão se abre.`,
    footnotes: [
      "Transcrição fiel da agenda de 10 de Fevereiro de 2025.",
      "Análise psicológica: o esquecimento de si mesmo em favor do outro como um gatilho de desmoronamento na depressão profunda.",
    ],
    lastUpdated: "21 de Setembro",
  },
  {
    id: "chap-demo-3",
    bookId: "book-demo-peso",
    number: 3,
    title: "O Silêncio dos Corredores",
    subtitle: "A Epidemia Invisível de Suicídio nas Forças Policiais",
    emotionalTag: "Denúncia & Prevenção",
    content: `Na corporação, o distintivo e o porte de arma 24 horas são símbolos de autoridade e poder. Mas poucos têm coragem de dizer o que acontece quando a porta de casa se fecha.

O Anuário Brasileiro de Segurança Pública e os relatórios da FENAPEF confirmam em números frios aquilo que nós, policiais federais, sentimos na carne: o suicídio mata mais policiais civis e federais do que os confrontos armados com o crime organizado.

A arma na cintura, que deveria ser um escudo, torna-se um perigo quando o desespero chega às três da madrugada. O suicídio com arma de fogo não dá segunda chance; é imediato. E por que tantos colegas chegam a esse limite sem pedir ajuda?

Porque na cultura policial, pedir socorro emocional ainda é visto como fraqueza. Há o pavor de ser desarmado pela junta médica, de virar motivo de piada nos corredores ou de ser colocado em tarefas secundárias. Assim, o policial engole o choro, toma outro copo de bebida e finge que está tudo bem — até o dia em que o gatilho da mente cede.`,
    footnotes: [
      "Dados do Fórum Brasileiro de Segurança Pública (FBSP): o suicídio foi a principal causa de morte de policiais no Brasil em 2024 (126 casos contra 46 em confronto em serviço).",
      "Levantamentos da FENAPEF apontam taxas de ideação suicida e depressão até 6 vezes superiores à média nacional em agentes da Polícia Federal.",
    ],
    lastUpdated: "21 de Setembro",
  },
  {
    id: "chap-demo-4",
    bookId: "book-demo-peso",
    number: 4,
    title: "O Encontro com as Leis da Mente",
    subtitle: "O Livro Vermelho e o Despertar de Neuróticos Anônimos",
    emotionalTag: "Recuperação & 12 Passos",
    content: `Foi com as mãos trêmulas que abri o livreto vermelho: 'A Etiologia da Doença e da Saúde Mental e Emocional', originário de Little Rock, Arkansas.

Nas páginas 15 e 16, sublinhei a caneta o que os médicos e pioneiros de Neuróticos Anônimos escreveram em 1969 e 1971: que a perturbação emocional afeta a grande massa da humanidade, mas quem decide buscar a recuperação faz parte de uma minoria corajosa.

Ao lado do parágrafo que falava da solidão dos doentes, escrevi na margem: 'Normais Anônimos'. Percebi que o isolamento é a raiz do adoecimento. Quando guardo tudo dentro de mim, meu ego me convence de que ninguém no mundo sofre como eu.

Mas os Doze Passos ensinam o contrário: a cura começa quando admito que sou impotente perante as minhas emoções desgovernadas, e decido compartilhar minha fraqueza com outro ser humano. É dessa semente que precisa nascer a nossa associação de apoio em Belo Horizonte.`,
    footnotes: [
      "Baseado no exemplar físico 'Journal of Mental Health - Número Três', conservado e anotado à caneta pelo autor.",
      "Princípio do 1º Passo: 'Admitimos que éramos impotentes perante nossas emoções — que nossas vidas tinham se tornado incontroláveis'.",
    ],
    lastUpdated: "21 de Setembro",
  },
];

export const MANUSCRIPT_SAMPLES: ManuscriptSample[] = [
  {
    id: "scan-1",
    title: "Página da Agenda: 01 de Janeiro de 2025",
    date: "01/01/2025",
    category: "agenda_poetica",
    description: "Escrita de início de ano, com caneta azul sobre as linhas horárias da agenda.",
    exactTranscript: `VC FOI, E LEVOU A ESPERANCA
TINHA VC E HOJE TENHO TE ESQUECER
A NOITE FICA ESCURA
AQUELE RESTINHO QUE
ILUMINAVA MINHA NOITE
APAGOU, SUMIU E
ME DEIXOU
HOJE NAO SOU HOMEM
ESTOU ESCONDIDO
TENTO TE LIGAR E
VC NAO ME RESPONDE
A ALEGRIA PARTIU
AGORA COMECÒ A CHORAR
A DEPRESSAO ESTA TOMANDO CONTA
AQUILO QUE ILUMINAVA MEU CORACAO
FOI EMBORA, E DEIXOU A SOLIDAO
COMO VIVER SEM VC
VC ERA TUDO QUE EU TINHA
VC SO ME ENSINOU ATE QUERER
VC E QUEM ME DEIXAVA FELIZ
SAIO PENSANDO ATE PROCURAR
E VOLTO MAIS TRISTE
TENTO TOMAR UMA CERVEJA
PRA COMPANHIA DORMIR
E TIROU UM POUCO VC DO PENSAMENTO`,
    bookReadyVersion: `Você foi, e levou a esperança. Tinha você, e hoje tenho que te esquecer. A noite fica escura: aquele restinho que iluminava a minha noite apagou, sumiu e me deixou. Hoje não me sinto homem; vivo escondido. Tento te ligar e você não me responde. A alegria partiu; agora começo a chorar. A depressão está tomando conta. Aquilo que iluminava meu coração foi embora e deixou a solidão. Como viver sem você? Você era tudo o que eu tinha. Você só me ensinou a querer; você é quem me deixava feliz. Saio pensando em te procurar e volto ainda mais triste. Tento tomar uma cerveja para a companhia dormir e para tirar você um pouco do pensamento.`,
    emotionalAnalysis: "Expressão crua de luto agudo, despersonalização ('não sou homem') e automedicação com álcool para aplacar a insônia e o vazio existencial.",
  },
  {
    id: "scan-2",
    title: "Página da Agenda: 10 de Fevereiro de 2025",
    date: "10/02/2025",
    category: "agenda_poetica",
    description: "Registro de 40 dias após o primeiro desabafo, demonstrando a dor que persiste.",
    exactTranscript: `VC FOI O MELHOR DOS MEUS
AMORES
MAS TAMBEM O QUE MAIS DOEU
QUERO SABER COMO ESTA VC
O DIA PASSA E EU NAO SEI DE VC
COMO ESTA VC
QUE ME FEZ ESQUECER A MINHA VIDA
CHEGUEI A GOSTAR MAIS DE VC
DO QUE DE MIM
SINTO TANTA SAUDADE, PRECISO AMA-
NHECER COM VC UM DIA.
POIS AMO VC ETERNAMENTE
ONDE ESTA VC
PRECISO TER CERTEZA DE QUE
VC VOLTOU.
VC E A RAZAO DA MINHA VIDA.
APARECA, NAO DEIXE QUE O TEMPO
NOS SEPARE
PRECISO DE VC PRA ME FAZER FELIZ.
NAO TENTO TE ESQUECER
PORQUE VC JA FAZ PARTE DA MINHA
VIDA`,
    bookReadyVersion: `Você foi o melhor dos meus amores, mas também o que mais doeu. Quero saber como você está. O dia passa e eu não sei de você. Como está você, que me fez esquecer a minha própria vida? Cheguei a gostar mais de você do que de mim. Sinto tanta saudade; preciso amanhecer com você um dia, pois amo você eternamente. Onde está você? Preciso ter certeza de que você voltou. Você é a razão da minha vida. Apareça, não deixe que o tempo nos separe. Preciso de você para me fazer feliz. Não tento te esquecer, porque você já faz parte da minha vida.`,
    emotionalAnalysis: "Transição do choque inicial para uma fixação afetiva melancólica, caracterizada pelo esquecimento do próprio valor em função do vínculo perdido.",
  },
  {
    id: "scan-3",
    title: "Apostila de Neuróticos Anônimos (Páginas 15 a 17)",
    date: "Apostila de Estudo",
    category: "livro_na_grifado",
    description: "Livreto de Little Rock/Arkansas com grifos e anotações à caneta sobre as Leis da Saúde Mental.",
    exactTranscript: `AS LEIS DA SAÚDE MENTAL E EMOCIONAL
(Transcrito do Journal of Mental Health - Janeiro de 1971)
1. Um único estado de saúde.
2. Saúde espiritual.
3. Sempre a mesma em todas as pessoas, variando apenas nos detalhes superficiais.
4. Caracterizada por uma sensação de bem-estar que faz com que as pessoas se mostrem espontâneas e equilibradas.
7. Resultante da eliminação do egoísmo e aquisição da capacidade de amar.
Anotação à mão na margem: 'DA PSIC / AN PSIC' e na página 17: 'Normais Anônimos... sua recuperação e voltam a ser felizes'.`,
    bookReadyVersion: `O programa de Neuróticos Anônimos define a saúde mental como um estado espiritual alcançado através do desprendimento pessoal e da erradicação do egoísmo. A anotação marginal do autor reflete sobre a ironia de uma sociedade doente onde quem busca ajuda parece a exceção, quando na verdade está abrindo o único caminho real para o reequilíbrio interior.`,
    emotionalAnalysis: "Momento de busca ativa por fundamentação espiritual e filosófica para dar sentido à própria tempestade interior.",
  },
  {
    id: "scan-4",
    title: "Livro de Juízes 14 (O Enigma de Sansão)",
    date: "Página 90",
    category: "livro_na_grifado",
    description: "Passagem bíblica sobre a vulnerabilidade do guerreiro forte perante a dor e a insistência emocional.",
    exactTranscript: `Juízes
14 O enigma de Sansão
17 Ela chorava diante dele os sete dias em que celebravam as bodas; ao sétimo dia ele lhe declarou, porquanto o importunava; então ela declarou o enigma aos seus concidadãos.`,
    bookReadyVersion: `Em Juízes 14:17, encontramos o relato sobre o enigma de Sansão: durante os sete dias em que celebravam as bodas, ela chorava continuamente diante dele. Ao sétimo dia, vencido pela insistência do pranto e pelo peso do apego, ele lhe abriu o coração e declarou o segredo que guardava. O homem reputado como o mais forte do mundo desarmado pela fragilidade afetiva, mostrando que sob qualquer armadura ou distinção habita a mesma necessidade e vulnerabilidade humana.`,
    emotionalAnalysis: "Uma analogia precisa com a farda policial: por mais preparado e forte que seja o indivíduo perante o perigo exterior, a alma humana se desarma diante da dor emocional e dos laços afetivos.",
  },
];

export const RESEARCH_DOCUMENTS: ResearchDocument[] = [
  {
    id: "doc-1",
    title: "Anuário Brasileiro de Segurança Pública (Mortalidade Policial)",
    institution: "Fórum Brasileiro de Segurança Pública (FBSP)",
    year: "Edição Recente (2024/2025)",
    category: "seguranca_publica",
    keyStat: "O suicídio matou quase 3x mais policiais do que os confrontos armados em serviço (126 contra 46).",
    summary: "Pelo segundo ano consecutivo, o suicídio consolidou-se como a maior causa isolada de morte entre profissionais de segurança pública no Brasil, ultrapassando os homicídios e mortes por intervenção violenta.",
    quote: "O policial enfrenta a pressão de ser visto como um herói invulnerável. Quando o adoecimento mental se instala, a presença da arma de fogo combinada ao estigma da fraqueza impede o pedido de socorro a tempo.",
    impactOnBook: "Fundamenta o Capítulo 3, transformando o depoimento pessoal do autor em uma voz de alerta amparada pelo maior órgão estatístico do país.",
    sourceUrl: "https://forumseguranca.org.br",
  },
  {
    id: "doc-2",
    title: "Levantamento Nacional de Saúde Mental na Polícia Federal",
    institution: "Federação Nacional dos Policiais Federais (FENAPEF)",
    year: "Série Histórica e Relatórios Recentes",
    category: "policia_federal",
    keyStat: "49% dos agentes relatam sintomas de depressão; taxa de suicídio de 4 a 6 vezes superior à média brasileira.",
    summary: "Levantamento detalhado sobre o impacto do isolamento geográfico em fronteiras, assédio moral na hierarquia institucional e falta de assistência psicológica contínua para policiais da ativa e aposentados.",
    quote: "A corporação policial federal exige perfeição operacional. Mas quem cuida daquele que cuida da segurança da nação?",
    impactOnBook: "Evidencia que o sofrimento do escritor não foi uma falha individual, mas consequência direta de um sistema que cobra bravura sem oferecer suporte à alma.",
    sourceUrl: "https://fenapef.org.br",
  },
  {
    id: "doc-3",
    title: "A Etiologia da Doença Mental e Emocional (Os 12 Passos de N/A)",
    institution: "Neuróticos Anônimos International Liaison (Little Rock, AR)",
    year: "Literatura de 1964 a 1971",
    category: "12_passos_na",
    keyStat: "Mais de 60 anos de aplicação prática do programa de recuperação para depressão e angústia existencial.",
    summary: "Adaptação dos princípios de Alcoólicos Anônimos para o sofrimento emocional. Estabelece que a depressão profunda é frequentemente alimentada pelo isolamento e pela tentativa de controlar tudo com a própria força de vontade.",
    quote: "A recuperação não é um ato de isolamento heroico, mas o ato humilde de estender a mão a outro que também sofre.",
    impactOnBook: "Serve de bússola moral e metodológica para a futura fundação de 'Depressivos Anônimos' em Belo Horizonte.",
    sourceUrl: "https://neuroticosanonimos.org.br",
  },
  {
    id: "doc-4",
    title: "O Demônio do Meio-Dia: Uma Anatomia da Depressão",
    institution: "Andrew Solomon (National Book Award)",
    year: "Obra de Referência Mundial",
    category: "psicologia_mundial",
    keyStat: "A mais premiada investigação interdisciplinar sobre a depressão humana no mundo.",
    summary: "O autor combina seu colapso emocional com centenas de entrevistas, mostrando que a depressão não é tristeza passageira, mas o desmonte completo da capacidade de amar e sentir prazer.",
    quote: "O oposto da depressão não é a felicidade, mas a vitalidade.",
    impactOnBook: "Enriquece as reflexões do autor sobre a 'noite escura' e o esgotamento da vontade de viver descritos nas páginas da agenda.",
  },
];
