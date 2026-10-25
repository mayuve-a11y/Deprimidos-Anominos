export type ProjectPhase = "fase1" | "fase2" | "fase3" | "fase4";

export interface ProjectTask {
  id: string;
  phase: ProjectPhase;
  phaseName: string;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "planned";
  category: string;
}

export interface BookProject {
  id: string;
  title: string;
  subtitle: string;
  status: "writing" | "completed" | "draft";
  statusLabel: string;
  genre: string;
  summary: string;
  chaptersCount: number;
  lastEdited: string;
  accentColor: string;
  // Google Docs & Drive synchronization metadata
  googleDocsUrl?: string;
  googleDocId?: string;
  googleDriveFolderId?: string;
  googleDriveFolderUrl?: string;
  lastSyncedToDocs?: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  number: number;
  title: string;
  subtitle?: string;
  content: string;
  dateReference?: string;
  emotionalTag?: string;
  footnotes?: string[];
  wordCount?: number;
  lastUpdated: string;
  // Individual chapter Google Doc sync
  googleDocId?: string;
  googleDocUrl?: string;
  lastSyncedToDocs?: string;
}

export interface VoiceSession {
  id: string;
  bookId: string;
  timestamp: string;
  durationSeconds: number;
  mode: "continuous_recording" | "live_dialogue";
  rawTranscript: string;
  polishedText: string;
  suggestedTitle: string;
  themes: string[];
  literaryNote?: string;
}

export interface DialogueSession {
  id: string;
  bookId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messages: { role: "user" | "model"; text: string }[];
  draft?: {
    draftTitle: string;
    draftText: string;
    themes: string[];
    literaryNotes?: string;
  } | null;
  attachedToChapterId?: string;
  attachedToChapterTitle?: string;
}

export interface ManuscriptSample {
  id: string;
  title: string;
  date: string;
  category: "agenda_poetica" | "livro_na_grifado" | "anotacao_avulsa";
  description: string;
  exactTranscript: string;
  bookReadyVersion: string;
  emotionalAnalysis: string;
}

export interface ResearchDocument {
  id: string;
  title: string;
  institution: string;
  year: string;
  category: "seguranca_publica" | "policia_federal" | "12_passos_na" | "psicologia_mundial";
  keyStat: string;
  summary: string;
  quote: string;
  impactOnBook: string;
  sourceUrl?: string;
}
