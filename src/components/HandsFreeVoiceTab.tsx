import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { saveNotebookToCloud, subscribeToNotebook } from "../services/cloudStorage";
import { BookProject, Chapter, DialogueSession } from "../types";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  PlusCircle,
  Check,
  Loader2,
  Play,
  Square,
  MessageSquareText,
  BookOpen,
  Clock,
  HeartHandshake,
  Wand2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlignLeft,
  AlertTriangle,
  RefreshCw,
  Send,
  Copy,
  FileText,
  Trash2,
  History,
  Calendar,
  Plus,
  X,
  FileDown,
  BookMarked,
  Save,
  Edit3,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  applySpokenPunctuation,
  applyPortugueseOrthographyFixes,
  joinSpeechSegments,
  smartLocalPunctuationAndParagraphs,
  VOICE_COMMANDS_GUIDE,
} from "../utils/speechPunctuation";

interface HandsFreeVoiceTabProps {
  currentProject: BookProject;
  chapters: Chapter[];
  onAddTextToChapter: (chapterId: string, text: string) => void;
  onCreateNewChapterFromVoice: (title: string, content: string) => void;
  onUpdateChapter?: (chapter: Chapter) => void;
  onNavigateToChapter?: (chapterId: string) => void;
}

export const HandsFreeVoiceTab: React.FC<HandsFreeVoiceTabProps> = ({
  currentProject,
  chapters,
  onAddTextToChapter,
  onCreateNewChapterFromVoice,
  onUpdateChapter,
  onNavigateToChapter,
}) => {
  const [mode, setMode] = useState<"continuous" | "dialogue">("continuous");

  // Feedback pós-anexo de capítulo com opção de limpeza imediata
  const [attachSuccessInfo, setAttachSuccessInfo] = useState<{
    chapterId: string;
    chapterTitle: string;
    chapterNumber: number;
    wordCount: number;
    type: "notebook" | "polished" | "draft" | "replace";
  } | null>(null);

  // Continuous recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-punctuation & voice commands options (sincronizadas com Configurações)
  const readPref = (key: string, fallback = true) => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : saved === "true";
    } catch {
      return fallback;
    }
  };

  const [interpretSpokenCommands, setInterpretSpokenCommands] = useState<boolean>(() =>
    readPref("livro_voice_spoken_commands_pref", true)
  );
  const [pausePunctuationEnabled, setPausePunctuationEnabled] = useState<boolean>(() =>
    readPref("livro_voice_pause_punct_pref", true)
  );
  const [autoPunctuateOnStop, setAutoPunctuateOnStop] = useState<boolean>(() =>
    readPref("livro_voice_auto_ai_punct_pref", true)
  );
  const [isAutoPunctuating, setIsAutoPunctuating] = useState(false);
  const [punctuationNotice, setPunctuationNotice] = useState<string | null>(null);
  const [processNotice, setProcessNotice] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [showCommandsGuide, setShowCommandsGuide] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const interpretSpokenCommandsRef = useRef(interpretSpokenCommands);
  interpretSpokenCommandsRef.current = interpretSpokenCommands;
  const pausePunctuationEnabledRef = useRef(pausePunctuationEnabled);
  pausePunctuationEnabledRef.current = pausePunctuationEnabled;
  const autoPunctuateOnStopRef = useRef(autoPunctuateOnStop);
  autoPunctuateOnStopRef.current = autoPunctuateOnStop;

  // Prosa Literária Lapidada (Memória Persistente)
  const polishedStorageKey = `livro_polished_result_${currentProject.id}`;
  const [polishedResult, setPolishedResult] = useState<{
    polishedText: string;
    suggestedTitle: string;
    themes: string[];
    literaryNote?: string;
  } | null>(null);

  const savePolishedResult = (result: {
    polishedText: string;
    suggestedTitle: string;
    themes: string[];
    literaryNote?: string;
  } | null) => {
    setPolishedResult(result);
    try {
      if (result) {
        localStorage.setItem(polishedStorageKey, JSON.stringify(result));
      } else {
        localStorage.removeItem(polishedStorageKey);
      }
    } catch (e) {
      console.warn("Erro ao salvar prosa lapidada:", e);
    }
  };

  // Caderno de Ditado Contínuo (Memória e Acumulador Persistente de Páginas)
  const notebookStorageKey = `livro_dictation_notebook_${currentProject.id}`;
  const [notebookText, setNotebookText] = useState<string>("");
  const [notebookTitle, setNotebookTitle] = useState<string>("Memórias e Rascunho do Livro");
  const [notebookTakesCount, setNotebookTakesCount] = useState<number>(0);
  const [notebookLastSaved, setNotebookLastSaved] = useState<string>("");
  const [autoAppendToNotebookOnStop, setAutoAppendToNotebookOnStop] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("livro_auto_append_notebook_pref");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const autoAppendToNotebookOnStopRef = useRef(autoAppendToNotebookOnStop);
  autoAppendToNotebookOnStopRef.current = autoAppendToNotebookOnStop;

  const notebookTextRef = useRef(notebookText);
  notebookTextRef.current = notebookText;
  const notebookTitleRef = useRef(notebookTitle);
  notebookTitleRef.current = notebookTitle;
  const notebookTakesCountRef = useRef(notebookTakesCount);
  notebookTakesCountRef.current = notebookTakesCount;
  const [copiedNotebook, setCopiedNotebook] = useState(false);
  const [isConfirmingClearNotebook, setIsConfirmingClearNotebook] = useState(false);
  const [notebookNotice, setNotebookNotice] = useState<string | null>(null);
  const [targetNotebookChapterId, setTargetNotebookChapterId] = useState<string>(
    chapters[0]?.id || ""
  );
  const [continuousTab, setContinuousTab] = useState<"notebook" | "polished">("notebook");
  const lastProcessedTextRef = useRef<string>("");

  // Sincronizar targetNotebookChapterId quando chapters mudam
  useEffect(() => {
    const valid = chapters.some((c) => c.id === targetNotebookChapterId);
    if (!valid) {
      setTargetNotebookChapterId(chapters[0]?.id || "");
    }
  }, [chapters, targetNotebookChapterId]);

  // Carregar Caderno de Ditado Contínuo e Prosa Lapidada do LocalStorage e Nuvem
  useEffect(() => {
    try {
      const raw = localStorage.getItem(notebookStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.text === "string") {
          notebookTextRef.current = parsed.text;
          setNotebookText(parsed.text);
        }
        if (typeof parsed.title === "string") {
          notebookTitleRef.current = parsed.title;
          setNotebookTitle(parsed.title);
        }
        if (typeof parsed.takesCount === "number") {
          notebookTakesCountRef.current = parsed.takesCount;
          setNotebookTakesCount(parsed.takesCount);
        }
        if (typeof parsed.updatedAt === "string") setNotebookLastSaved(parsed.updatedAt);
      } else {
        notebookTextRef.current = "";
        notebookTitleRef.current = "Memórias e Rascunho do Livro";
        notebookTakesCountRef.current = 0;
        setNotebookText("");
        setNotebookTitle("Memórias e Rascunho do Livro");
        setNotebookTakesCount(0);
        setNotebookLastSaved("");
      }
    } catch (e) {
      console.warn("Erro ao carregar caderno de ditado contínuo:", e);
      notebookTextRef.current = "";
      setNotebookText("");
    }

    // Se o autor estiver autenticado, sincronizar caderno da nuvem em tempo real
    let unsubCloudNotebook: (() => void) | null = null;
    if (auth.currentUser) {
      unsubCloudNotebook = subscribeToNotebook(
        auth.currentUser.uid,
        currentProject.id,
        (cloudData) => {
          if (cloudData && typeof cloudData.notebookText === "string") {
            const nextTitle = cloudData.notebookTitle || "Memórias e Rascunho do Livro";
            const nextTakes = cloudData.takesCount || 0;
            notebookTextRef.current = cloudData.notebookText;
            notebookTitleRef.current = nextTitle;
            notebookTakesCountRef.current = nextTakes;
            setNotebookText(cloudData.notebookText);
            setNotebookTitle(nextTitle);
            setNotebookTakesCount(nextTakes);
            setNotebookLastSaved(cloudData.lastSaved || "");
          }
        }
      );
    }

    try {
      const rawPolished = localStorage.getItem(polishedStorageKey);
      if (rawPolished) {
        const parsedPolished = JSON.parse(rawPolished);
        if (parsedPolished && typeof parsedPolished.polishedText === "string") {
          setPolishedResult(parsedPolished);
        } else {
          setPolishedResult(null);
        }
      } else {
        setPolishedResult(null);
      }
    } catch (e) {
      console.warn("Erro ao carregar prosa lapidada persistida:", e);
      setPolishedResult(null);
    }

    return () => {
      if (unsubCloudNotebook) unsubCloudNotebook();
    };
  }, [notebookStorageKey, polishedStorageKey, currentProject.id]);

  // Dialogue Sessions History & Persistence State
  const [dialogueSessions, setDialogueSessions] = useState<DialogueSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Storage keys per book project
  const storageKey = `livro_dialogue_sessions_${currentProject.id}`;
  const activeSessionKey = `livro_active_dialogue_session_${currentProject.id}`;

  const [dialogueHistory, setDialogueHistory] = useState<
    { role: "user" | "model"; text: string }[]
  >([
    {
      role: "model",
      text: "Olá. Estou pronto para ouvir sua história. Não se preocupe com erros ou com a ordem das ideias. Fale sobre o que estiver no seu peito hoje — seja uma lembrança dos anos de polícia, uma saudade ou um momento difícil da depressão. O que vem à sua mente agora?",
    },
  ]);
  const [isDialogueListening, setIsDialogueListening] = useState(false);
  const [dialogueInput, setDialogueInput] = useState("");
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [speechSynthesisActive, setSpeechSynthesisActive] = useState<boolean>(() =>
    readPref("livro_voice_tts_pref", true)
  );

  // Ouvir atualizações vindas do modal global de Configurações (engrenagem)
  useEffect(() => {
    const syncPrefs = () => {
      const nextAutoAppend = readPref("livro_auto_append_notebook_pref", true);
      const nextSpoken = readPref("livro_voice_spoken_commands_pref", true);
      const nextPause = readPref("livro_voice_pause_punct_pref", true);
      const nextAutoAi = readPref("livro_voice_auto_ai_punct_pref", true);
      const nextTts = readPref("livro_voice_tts_pref", true);

      autoAppendToNotebookOnStopRef.current = nextAutoAppend;
      interpretSpokenCommandsRef.current = nextSpoken;
      pausePunctuationEnabledRef.current = nextPause;
      autoPunctuateOnStopRef.current = nextAutoAi;

      setAutoAppendToNotebookOnStop(nextAutoAppend);
      setInterpretSpokenCommands(nextSpoken);
      setPausePunctuationEnabled(nextPause);
      setAutoPunctuateOnStop(nextAutoAi);
      setSpeechSynthesisActive(nextTts);
    };
    window.addEventListener("livro-voice-prefs-updated", syncPrefs);
    return () => window.removeEventListener("livro-voice-prefs-updated", syncPrefs);
  }, []);

  // Dialogue draft & synthesis state
  const [dialogueDraft, setDialogueDraft] = useState<{
    draftTitle: string;
    draftText: string;
    themes: string[];
    literaryNotes?: string;
  } | null>(null);
  const [isSynthesizingDialogue, setIsSynthesizingDialogue] = useState(false);
  const [dialogueSuccessNotice, setDialogueSuccessNotice] = useState<string | null>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [targetDialogueChapterId, setTargetDialogueChapterId] = useState<string>(
    chapters[0]?.id || ""
  );

  useEffect(() => {
    const valid = chapters.some((c) => c.id === targetDialogueChapterId);
    if (!valid) {
      setTargetDialogueChapterId(chapters[0]?.id || "");
    }
  }, [chapters, targetDialogueChapterId]);
  const [isConfirmingDiscardDraft, setIsConfirmingDiscardDraft] = useState(false);
  const [sessionPendingDeleteId, setSessionPendingDeleteId] = useState<string | null>(null);
  const [isConfirmingDeleteActiveSession, setIsConfirmingDeleteActiveSession] = useState(false);

  // Helper para derivar título de sessão a partir da primeira fala do usuário
  const deriveSessionTitle = (messages: { role: string; text: string }[]): string => {
    const firstUserMsg = messages.find((m) => m.role === "user" && m.text.trim());
    if (!firstUserMsg) return "Nova conversa com o biógrafo";
    const clean = firstUserMsg.text.replace(/\n+/g, " ").trim();
    return clean.length > 45 ? clean.slice(0, 45) + "..." : clean;
  };

  // Helper para formatar data da sessão
  const formatSessionDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const timeStr = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isToday) {
        return `Hoje às ${timeStr}`;
      }

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      if (isYesterday) {
        return `Ontem às ${timeStr}`;
      }

      return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às ${timeStr}`;
    } catch {
      return "Data recente";
    }
  };

  // Carregar sessões persistidas do projeto atual
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      let parsed: DialogueSession[] = saved ? JSON.parse(saved) : [];

      if (!parsed || parsed.length === 0) {
        const initialSession: DialogueSession = {
          id: `session-${Date.now()}`,
          bookId: currentProject.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: "Primeira conversa com o biógrafo",
          messages: [
            {
              role: "model",
              text: "Olá. Estou pronto para ouvir sua história. Não se preocupe com erros ou com a ordem das ideias. Fale sobre o que estiver no seu peito hoje — seja uma lembrança dos anos de polícia, uma saudade ou um momento difícil da depressão. O que vem à sua mente agora?",
            },
          ],
          draft: null,
        };
        parsed = [initialSession];
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }

      setDialogueSessions(parsed);

      const savedActiveId = localStorage.getItem(activeSessionKey);
      const targetSession = parsed.find((s) => s.id === savedActiveId) || parsed[0];
      if (targetSession) {
        setActiveSessionId(targetSession.id);
        setDialogueHistory(targetSession.messages);
        setDialogueDraft(targetSession.draft || null);
      }
    } catch (err) {
      console.warn("Erro ao carregar sessões de diálogo:", err);
    }
  }, [currentProject.id]);

  // Persistir alterações na sessão ativa (falas, rascunhos, vinculações)
  const persistActiveSession = (
    updater: (prev: DialogueSession) => DialogueSession
  ) => {
    setDialogueSessions((prevSessions) => {
      const updatedList = prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const updated = updater(session);
          return { ...updated, updatedAt: new Date().toISOString() };
        }
        return session;
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedList));
      } catch (e) {
        console.warn("Falha ao salvar sessões no localStorage:", e);
      }
      return updatedList;
    });
  };

  const [addedSuccess, setAddedSuccess] = useState(false);

  // Audio recognition & real-time silence pause refs
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);
  const timerRef = useRef<any>(null);
  const stopFinalizeTimerRef = useRef<any>(null);
  const pendingStopFinalizeRef = useRef(false);
  const finalizeStoppedRecordingRef = useRef<() => void>(() => {});
  const committedTextRef = useRef<string>("");
  const dialogueCommittedTextRef = useRef<string>("");
  const processedResultCountRef = useRef<number>(0);
  const lastNormalizedWordsRef = useRef<string>("");
  const lastSpeechChangeTimeRef = useRef<number>(0);
  const consumedRawPrefixRef = useRef<string>("");
  const latestFullInterimRawRef = useRef<string>("");
  const latestUnconsumedInterimRef = useRef<string>("");
  const pauseCommaTimerRef = useRef<any>(null);
  const pausePeriodTimerRef = useRef<any>(null);
  const pauseParagraphTimerRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isDialogueListeningRef = useRef(false);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const dialogueInputRef = useRef(dialogueInput);
  dialogueInputRef.current = dialogueInput;

  const clearPauseTimers = () => {
    if (pauseCommaTimerRef.current) {
      clearTimeout(pauseCommaTimerRef.current);
      pauseCommaTimerRef.current = null;
    }
    if (pausePeriodTimerRef.current) {
      clearTimeout(pausePeriodTimerRef.current);
      pausePeriodTimerRef.current = null;
    }
    if (pauseParagraphTimerRef.current) {
      clearTimeout(pauseParagraphTimerRef.current);
      pauseParagraphTimerRef.current = null;
    }
  };

  const resetSessionInterimRefs = () => {
    processedResultCountRef.current = 0;
    lastNormalizedWordsRef.current = "";
    consumedRawPrefixRef.current = "";
    latestFullInterimRawRef.current = "";
    latestUnconsumedInterimRef.current = "";
  };

  // Desconta palavras já consolidadas durante pausas rápidas (0,8s) antes do navegador marcar isFinal
  const consumeSegmentAgainstPrefix = (
    segmentRaw: string,
    consumedRef: { current: string }
  ): string => {
    const seg = segmentRaw.trim();
    const cons = consumedRef.current.trim();
    if (!seg) return "";
    if (!cons) return seg;

    const segLower = seg.toLowerCase();
    const consLower = cons.toLowerCase();

    if (consLower.startsWith(segLower)) {
      consumedRef.current = cons.slice(seg.length).trim();
      return "";
    }
    if (segLower.startsWith(consLower)) {
      const remainder = seg.slice(cons.length).trim();
      consumedRef.current = "";
      return remainder;
    }

    const segWords = seg.split(/\s+/).filter(Boolean);
    const consWords = cons.split(/\s+/).filter(Boolean);
    if (segWords.length <= consWords.length) {
      consumedRef.current = consWords.slice(segWords.length).join(" ");
      return "";
    }
    consumedRef.current = "";
    return segWords.slice(consWords.length).join(" ");
  };

  const flushPendingInterimIntoCommitted = (targetMode: "continuous" | "dialogue") => {
    const pendingChunk = latestUnconsumedInterimRef.current;
    if (!pendingChunk) return;

    if (targetMode === "continuous") {
      committedTextRef.current = joinSpeechSegments(committedTextRef.current, pendingChunk);
    } else {
      dialogueCommittedTextRef.current = joinSpeechSegments(
        dialogueCommittedTextRef.current,
        pendingChunk
      );
    }
    consumedRawPrefixRef.current = latestFullInterimRawRef.current;
    latestUnconsumedInterimRef.current = "";
  };

  // Cronômetro real de pausas em tempo real:
  // Pausa curta (~0,8s) = vírgula (, ) + próxima palavra em minúscula
  // Pausa média (~1,0s) = ponto final (. ) + próxima palavra em maiúscula
  // Pausa longa (~2,2s) = ponto final + novo parágrafo (.\n\n)
  const scheduleSilencePausePunctuation = (targetMode: "continuous" | "dialogue") => {
    clearPauseTimers();
    if (!pausePunctuationEnabledRef.current) return;

    const isActive =
      targetMode === "continuous" ? isRecordingRef.current : isDialogueListeningRef.current;
    if (!isActive) return;

    const baseCommitted =
      targetMode === "continuous" ? committedTextRef.current : dialogueCommittedTextRef.current;
    const previewFull = latestUnconsumedInterimRef.current
      ? joinSpeechSegments(baseCommitted, latestUnconsumedInterimRef.current)
      : baseCommitted;
    const trimmedRight = previewFull.replace(/[ \t]+$/, "");

    if (!trimmedRight || /\n$/.test(trimmedRight) || /[,.:;?!—]$/.test(trimmedRight)) {
      return;
    }

    const COMMA_PAUSE_MS = 800;
    const PERIOD_PAUSE_MS = 1000;
    const PARAGRAPH_PAUSE_MS = 2200;

    const updateTargetText = (nextVal: string) => {
      if (targetMode === "continuous") {
        committedTextRef.current = nextVal;
        transcriptRef.current = nextVal;
        setTranscript(nextVal);
      } else {
        dialogueCommittedTextRef.current = nextVal;
        dialogueInputRef.current = nextVal;
        setDialogueInput(nextVal);
      }
    };

    // Estágio 1: Pausa curta (~0,8s) -> Vírgula (próxima palavra será minúscula)
    pauseCommaTimerRef.current = setTimeout(() => {
      const stillActive =
        targetMode === "continuous" ? isRecordingRef.current : isDialogueListeningRef.current;
      if (!stillActive || !pausePunctuationEnabledRef.current) return;

      flushPendingInterimIntoCommitted(targetMode);
      const cur = (
        targetMode === "continuous" ? committedTextRef.current : dialogueCommittedTextRef.current
      ).replace(/[ \t]+$/, "");
      if (/[\p{L}0-9"”)]$/u.test(cur)) {
        updateTargetText(`${cur}, `);
      }
    }, COMMA_PAUSE_MS);

    // Estágio 2: Pausa média (~1s) -> Ponto final + próxima em maiúscula
    pausePeriodTimerRef.current = setTimeout(() => {
      const stillActive =
        targetMode === "continuous" ? isRecordingRef.current : isDialogueListeningRef.current;
      if (!stillActive || !pausePunctuationEnabledRef.current) return;

      flushPendingInterimIntoCommitted(targetMode);
      const cur = (
        targetMode === "continuous" ? committedTextRef.current : dialogueCommittedTextRef.current
      ).replace(/[ \t]+$/, "");
      if (/(?:,|[\p{L}0-9"”)])$/u.test(cur)) {
        updateTargetText(`${cur.replace(/,+$/, "")}. `);
      }
    }, PERIOD_PAUSE_MS);

    // Estágio 3: Pausa longa (~2,2s) -> Ponto final + Novo Parágrafo
    pauseParagraphTimerRef.current = setTimeout(() => {
      const stillActive =
        targetMode === "continuous" ? isRecordingRef.current : isDialogueListeningRef.current;
      if (!stillActive || !pausePunctuationEnabledRef.current) return;

      flushPendingInterimIntoCommitted(targetMode);
      const cur = (
        targetMode === "continuous" ? committedTextRef.current : dialogueCommittedTextRef.current
      ).replace(/[ \t]+$/, "");
      if (!/\n$/.test(cur) && /(?:[.,]|[\p{L}0-9"”)])$/u.test(cur)) {
        updateTargetText(`${cur.replace(/[,.]+$/, "")}.\n\n`);
      }
    }, PARAGRAPH_PAUSE_MS);
  };

  // Initialize Speech Recognition if supported in browser (Português do Brasil - pt-BR)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        resetSessionInterimRefs();
      };

      recognition.onresult = (event: any) => {
        if (
          !isRecordingRef.current &&
          !pendingStopFinalizeRef.current &&
          !isDialogueListeningRef.current
        ) {
          return;
        }

        // Detecta atividade real de novas palavras faladas
        let rawWordsForActivity = "";
        for (let i = 0; i < event.results.length; i++) {
          rawWordsForActivity += event.results[i][0].transcript + " ";
        }
        const normalizedActivity = rawWordsForActivity.trim().toLowerCase();
        const activityChanged = normalizedActivity !== lastNormalizedWordsRef.current;
        if (activityChanged) {
          lastNormalizedWordsRef.current = normalizedActivity;
          lastSpeechChangeTimeRef.current = Date.now();
          clearPauseTimers();
        }

        const formatSpokenChunk = (chunk: string) => {
          const clean = chunk.replace(/^[ \t]+|[ \t]+$/g, "");
          if (!clean) return "";
          return interpretSpokenCommandsRef.current
            ? applySpokenPunctuation(clean, { isContinuation: true })
            : applyPortugueseOrthographyFixes(clean);
        };

        let newlyFinalized = "";
        let fullInterimRaw = "";

        for (let i = processedResultCountRef.current; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal && !fullInterimRaw) {
            const unconsumedFinalRaw = consumeSegmentAgainstPrefix(
              res[0].transcript,
              consumedRawPrefixRef
            );
            const formattedPiece = formatSpokenChunk(unconsumedFinalRaw);
            if (formattedPiece) {
              newlyFinalized = newlyFinalized
                ? joinSpeechSegments(newlyFinalized, formattedPiece)
                : formattedPiece;
            }
            processedResultCountRef.current = i + 1;
          } else {
            fullInterimRaw += res[0].transcript + " ";
          }
        }

        const trimmedFullInterim = fullInterimRaw.trim();
        latestFullInterimRawRef.current = trimmedFullInterim;

        const tempConsumedCopy = { current: consumedRawPrefixRef.current };
        const unconsumedInterimRaw = trimmedFullInterim
          ? consumeSegmentAgainstPrefix(trimmedFullInterim, tempConsumedCopy)
          : "";
        const formattedInterim = formatSpokenChunk(unconsumedInterimRaw);
        latestUnconsumedInterimRef.current = formattedInterim;

        if (mode === "continuous") {
          if (newlyFinalized) {
            committedTextRef.current = joinSpeechSegments(
              committedTextRef.current,
              newlyFinalized
            );
          }
          const combined = formattedInterim
            ? joinSpeechSegments(committedTextRef.current, formattedInterim)
            : committedTextRef.current;

          transcriptRef.current = combined;
          setTranscript(combined);

          if (activityChanged && isRecordingRef.current) {
            scheduleSilencePausePunctuation("continuous");
          }
        } else {
          if (newlyFinalized) {
            dialogueCommittedTextRef.current = joinSpeechSegments(
              dialogueCommittedTextRef.current,
              newlyFinalized
            );
          }
          const combined = formattedInterim
            ? joinSpeechSegments(dialogueCommittedTextRef.current, formattedInterim)
            : dialogueCommittedTextRef.current;

          dialogueInputRef.current = combined;
          setDialogueInput(combined);

          if (activityChanged && isDialogueListeningRef.current) {
            scheduleSilencePausePunctuation("dialogue");
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          clearPauseTimers();
          isRecognitionActiveRef.current = false;
          setIsRecording(false);
          isRecordingRef.current = false;
          setIsDialogueListening(false);
          isDialogueListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        // Se a gravação contínua segue ativa, religa a sessão preservando parágrafos (\n\n) e os timers de pausa!
        if (isRecordingRef.current) {
          try {
            flushPendingInterimIntoCommitted("continuous");
            resetSessionInterimRefs();
            recognition.start();
            isRecognitionActiveRef.current = true;
          } catch (_) {}
        } else if (pendingStopFinalizeRef.current) {
          clearPauseTimers();
          finalizeStoppedRecordingRef.current();
        } else if (isDialogueListeningRef.current) {
          try {
            flushPendingInterimIntoCommitted("dialogue");
            resetSessionInterimRefs();
            recognition.start();
            isRecognitionActiveRef.current = true;
          } catch (_) {
            setIsDialogueListening(false);
            isDialogueListeningRef.current = false;
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      clearPauseTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopFinalizeTimerRef.current) clearTimeout(stopFinalizeTimerRef.current);
    };
  }, [mode]);

  // Handle timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Finalização confiável ao interromper a gravação (garante captura das últimas palavras e anexo imediato)
  const finalizeStoppedRecording = () => {
    if (!pendingStopFinalizeRef.current) return;
    pendingStopFinalizeRef.current = false;
    clearPauseTimers();
    if (stopFinalizeTimerRef.current) {
      clearTimeout(stopFinalizeTimerRef.current);
      stopFinalizeTimerRef.current = null;
    }

    const rawCaptured = transcriptRef.current.trim();
    if (!rawCaptured) return;

    if (autoAppendToNotebookOnStopRef.current) {
      // Estágio 1: Anexa imediatamente ao Caderno Acumulado com pontuação, crase e ortografia local pt-BR
      const localFormatted =
        smartLocalPunctuationAndParagraphs(rawCaptured).punctuatedText.trim() || rawCaptured;
      const currentNb = notebookTextRef.current.trim();
      const updatedInitial = currentNb ? `${currentNb}\n\n${localFormatted}` : localFormatted;
      const nextTakes = notebookTakesCountRef.current + 1;

      saveNotebook(updatedInitial, undefined, nextTakes);
      transcriptRef.current = "";
      committedTextRef.current = "";
      resetSessionInterimRefs();
      setTranscript("");
      setContinuousTab("notebook");

      const wordCount = localFormatted.split(/\s+/).filter(Boolean).length;

      // Estágio 2: Se auto-pontuar com IA estiver ativo, refina crase, acentuação e pontuação pt-BR em segundo plano
      if (autoPunctuateOnStopRef.current) {
        setIsAutoPunctuating(true);
        setNotebookNotice(
          `+${wordCount} palavras anexadas ao Caderno! Revisando pontuação, crase e acentuação (pt-BR)...`
        );
        fetch("/api/gemini/auto-punctuate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: localFormatted }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error("Erro na requisição.");
            return res.json();
          })
          .then((data) => {
            const aiPunctuated =
              typeof data?.punctuatedText === "string" ? data.punctuatedText.trim() : "";
            if (aiPunctuated) {
              const latestNb = notebookTextRef.current;
              const idx = latestNb.lastIndexOf(localFormatted);
              if (idx !== -1) {
                const refinedNb =
                  latestNb.slice(0, idx) +
                  aiPunctuated +
                  latestNb.slice(idx + localFormatted.length);
                saveNotebook(refinedNb);
              }
            }
            setNotebookNotice(
              `+${wordCount} palavras anexadas com pontuação, crase e acentuação revisadas no Caderno!`
            );
            setTimeout(() => setNotebookNotice(null), 4500);
          })
          .catch(() => {
            setNotebookNotice(
              `+${wordCount} palavras anexadas e pontuadas automaticamente no seu Caderno!`
            );
            setTimeout(() => setNotebookNotice(null), 4500);
          })
          .finally(() => {
            setIsAutoPunctuating(false);
          });
      } else {
        setNotebookNotice(
          `+${wordCount} palavras anexadas automaticamente ao seu Caderno de Ditado!`
        );
        setTimeout(() => setNotebookNotice(null), 4500);
      }
    } else if (autoPunctuateOnStopRef.current) {
      handleAutoPunctuate(rawCaptured, false);
    }
  };
  finalizeStoppedRecordingRef.current = finalizeStoppedRecording;

  const toggleContinuousRecording = () => {
    if (isRecording) {
      // Stop
      clearPauseTimers();
      setIsRecording(false);
      isRecordingRef.current = false;
      pendingStopFinalizeRef.current = true;
      const wasActive = isRecognitionActiveRef.current && Boolean(recognitionRef.current);
      try {
        recognitionRef.current?.stop();
      } catch (_) {}

      if (stopFinalizeTimerRef.current) clearTimeout(stopFinalizeTimerRef.current);
      if (wasActive) {
        stopFinalizeTimerRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.abort();
          } catch (_) {}
          isRecognitionActiveRef.current = false;
          finalizeStoppedRecordingRef.current();
        }, 1400);
      } else {
        stopFinalizeTimerRef.current = setTimeout(() => {
          finalizeStoppedRecordingRef.current();
        }, 80);
      }
    } else {
      // Start
      clearPauseTimers();
      if (stopFinalizeTimerRef.current) {
        clearTimeout(stopFinalizeTimerRef.current);
        stopFinalizeTimerRef.current = null;
      }
      pendingStopFinalizeRef.current = false;
      setRecordingTime(0);
      // Preserva quebras de parágrafo (\n\n) existentes no campo sem engolir linhas
      committedTextRef.current = transcriptRef.current.replace(/[ \t]+$/, "");
      resetSessionInterimRefs();
      lastSpeechChangeTimeRef.current = Date.now();
      setIsRecording(true);
      isRecordingRef.current = true;
      try {
        recognitionRef.current?.start();
        isRecognitionActiveRef.current = true;
      } catch (err) {
        console.warn("Could not start speech recognition directly:", err);
      }
    }
  };

  // Auto-punctuate and format paragraphs using Gemini without modifying the author's words
  const handleAutoPunctuate = async (textToProcess?: string, autoAppend?: boolean) => {
    const raw = (textToProcess !== undefined ? textToProcess : transcriptRef.current).trim();
    if (!raw) return;
    setIsAutoPunctuating(true);
    setPunctuationNotice(null);
    try {
      const res = await fetch("/api/gemini/auto-punctuate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: raw }),
      });
      if (!res.ok) throw new Error("Erro na requisição.");
      const data = await res.json();
      const finalPunctuated =
        typeof data?.punctuatedText === "string" && data.punctuatedText.trim()
          ? data.punctuatedText.trim()
          : smartLocalPunctuationAndParagraphs(raw).punctuatedText;

      transcriptRef.current = finalPunctuated;
      committedTextRef.current = finalPunctuated;
      setTranscript(finalPunctuated);
      setPunctuationNotice("Texto revisado com pontuação, crase e acentuação (pt-BR) com sucesso!");
      setTimeout(() => setPunctuationNotice(null), 5000);
      if (autoAppend) {
        handleAppendTranscriptToNotebook(finalPunctuated);
      }
    } catch (err) {
      console.warn("Falha no auto-punctuate remoto, aplicando motor gramatical local:", err);
      const localResult = smartLocalPunctuationAndParagraphs(raw);
      transcriptRef.current = localResult.punctuatedText;
      committedTextRef.current = localResult.punctuatedText;
      setTranscript(localResult.punctuatedText);
      setPunctuationNotice("Motor Gramatical Local (pt-BR): pontuação, crase e parágrafos aplicados!");
      setTimeout(() => setPunctuationNotice(null), 5000);
      if (autoAppend) {
        handleAppendTranscriptToNotebook(localResult.punctuatedText);
      }
    } finally {
      setIsAutoPunctuating(false);
    }
  };

  // Process raw speech or full notebook with Gemini or smart local literary engine
  const handleProcessSpeech = async (customText?: string) => {
    const textToProcess = (customText !== undefined ? customText : transcript).trim();
    if (!textToProcess) return;
    lastProcessedTextRef.current = textToProcess;
    setIsProcessing(true);
    setProcessNotice(null);
    try {
      const res = await fetch("/api/gemini/speech-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawTranscript: textToProcess,
          bookTitle: currentProject.title,
          chapterContext: chapters.find((c) => c.id === targetNotebookChapterId)?.title || "",
        }),
      });

      if (!res.ok) {
        throw new Error(`Servidor respondeu com status ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.polishedText) {
        throw new Error("Resposta da IA vazia ou incompleta.");
      }
      savePolishedResult(data);
      setContinuousTab("polished");
      setProcessNotice({
        type: "success",
        message: customText
          ? "Caderno completo lapidado com sucesso em prosa de livro e salvo no navegador!"
          : "Relato lapidado com sucesso com prosa de livro e salvo no navegador!",
      });
    } catch (err: any) {
      console.warn("Falha na chamada remota com a IA, acionando Motor Local:", err);
      // NUNCA devolver o texto cru sem pontuação! Acionamos o motor local inteligente:
      const local = smartLocalPunctuationAndParagraphs(textToProcess);
      const fallbackData = {
        polishedText: local.punctuatedText,
        suggestedTitle: local.suggestedTitle,
        themes: ["Homeopatia & Saúde", "Estruturação Literária"],
        literaryNote:
          "Texto formatado pelo Motor Gramatical Local com pontuação cuidadosa, correção de ruídos fonéticos e parágrafos arejados.",
      };
      savePolishedResult(fallbackData);
      setContinuousTab("polished");
      setProcessNotice({
        type: "warning",
        message:
          "Houve uma oscilação na conexão com a IA. Ativamos o Motor Gramatical Local para pontuar, estruturar os parágrafos e organizar o texto sem perda de dados!",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Dialogue text-to-speech speak function
  const speakText = (text: string) => {
    if (!speechSynthesisActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95; // ritmo tranquilo e acolhedor
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Helper to punctuate dialogue input on demand
  const handlePunctuateDialogueInput = () => {
    if (!dialogueInput.trim()) return;
    const local = smartLocalPunctuationAndParagraphs(dialogueInput);
    setDialogueInput(local.punctuatedText);
  };

  // Send message in dialogue mode
  const handleSendDialogue = async (userTextToSend?: string) => {
    const text = (userTextToSend !== undefined ? userTextToSend : dialogueInput).trim();
    if (!text) return;

    // Garante que o texto enviado tenha pontuação adequada
    let processedText = text;
    if (!/[.?!]$/.test(processedText)) {
      processedText = smartLocalPunctuationAndParagraphs(processedText).punctuatedText;
    }

    const newHistory = [...dialogueHistory, { role: "user" as const, text: processedText }];
    setDialogueHistory(newHistory);
    setDialogueInput("");
    dialogueInputRef.current = "";
    dialogueCommittedTextRef.current = "";
    clearPauseTimers();
    setIsDialogueListening(false);
    isDialogueListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch (_) {}

    // Persistir fala do usuário imediatamente na sessão ativa
    persistActiveSession((session) => ({
      ...session,
      title:
        session.title === "Primeira conversa com o biógrafo" ||
        session.title === "Nova conversa com o biógrafo"
          ? deriveSessionTitle(newHistory)
          : session.title,
      messages: newHistory,
    }));

    setIsAiReplying(true);

    try {
      const apiHistory = newHistory.map((item) => ({
        role: item.role === "user" ? "user" : "model",
        content: item.text,
      }));

      const res = await fetch("/api/gemini/live-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: processedText,
          history: apiHistory.slice(0, -1),
          bookTitle: currentProject.title,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro de resposta: status ${res.status}`);
      }

      const data = await res.json();
      const reply =
        data.reply ||
        "Estou ouvindo com toda a atenção cada detalhe do que você disse. Como você gostaria de aprofundar esse ponto no capítulo?";

      const fullHistory = [...newHistory, { role: "model" as const, text: reply }];
      setDialogueHistory(fullHistory);
      persistActiveSession((session) => ({
        ...session,
        messages: fullHistory,
      }));
      speakText(reply);
    } catch (err: any) {
      console.error("Erro no live-dialogue:", err);
      const fallback =
        "Houve uma oscilação momentânea na conexão com a IA, mas suas palavras foram registradas com segurança. Você pode enviar novamente ou continuar o relato a qualquer momento.";
      const fallbackHistory = [...newHistory, { role: "model" as const, text: fallback }];
      setDialogueHistory(fallbackHistory);
      persistActiveSession((session) => ({
        ...session,
        messages: fallbackHistory,
      }));
      speakText(fallback);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Synthesize dialogue into book prose draft
  const handleSynthesizeDialogue = async () => {
    // Filtra para garantir que há falas do usuário
    const userSpeeches = dialogueHistory.filter((m) => m.role === "user" && m.text.trim());
    if (userSpeeches.length === 0) {
      alert("Fale ou digite pelo menos uma mensagem com suas memórias ou ideias antes de sintetizar.");
      return;
    }

    setIsSynthesizingDialogue(true);
    setDialogueSuccessNotice(null);

    try {
      const res = await fetch("/api/gemini/synthesize-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogueHistory,
          bookTitle: currentProject.title,
          chapterContext: chapters.find((c) => c.id === targetDialogueChapterId)?.title || "",
        }),
      });

      if (!res.ok) {
        throw new Error(`Servidor respondeu com status ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.draftText) {
        throw new Error("Resposta da IA vazia.");
      }

      setDialogueDraft(data);
      persistActiveSession((session) => ({
        ...session,
        draft: data,
      }));
      setDialogueSuccessNotice("Rascunho gerado e salvo com sucesso! Você pode ler, editar e decidir se deseja anexar ao livro.");
      setTimeout(() => setDialogueSuccessNotice(null), 6000);
    } catch (err: any) {
      console.warn("Falha no synthesize-dialogue remoto, ativando motor local:", err);
      // Fallback local: une falas do usuário com pontuação e parágrafos elegantes
      const combinedUserText = userSpeeches.map((m) => m.text.trim()).join("\n\n");
      const local = smartLocalPunctuationAndParagraphs(combinedUserText);
      const fallbackDraft = {
        draftTitle: local.suggestedTitle || "Rascunho de Memórias da Conversa",
        draftText: local.punctuatedText,
        themes: ["Memórias Pessoais", "Superação"],
        literaryNotes: "Rascunho estruturado a partir das suas falas na conversa com o motor local.",
      };
      setDialogueDraft(fallbackDraft);
      persistActiveSession((session) => ({
        ...session,
        draft: fallbackDraft,
      }));
      setDialogueSuccessNotice("Rascunho estruturado localmente a partir das suas falas e salvo!");
      setTimeout(() => setDialogueSuccessNotice(null), 6000);
    } finally {
      setIsSynthesizingDialogue(false);
    }
  };

  // Copiar trecho individual de mensagem
  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2500);
  };

  // Adicionar trecho individual direto à Mesa de Rascunho
  const handleAddSnippetToDraft = (text: string) => {
    let updatedDraft: any;
    if (dialogueDraft) {
      updatedDraft = {
        ...dialogueDraft,
        draftText: `${dialogueDraft.draftText}\n\n${text}`.trim(),
      };
    } else {
      updatedDraft = {
        draftTitle: "Rascunho de Trechos Selecionados",
        draftText: text,
        themes: ["Trecho Selecionado"],
        literaryNotes: "Criado a partir de falas selecionadas da sua conversa.",
      };
    }
    setDialogueDraft(updatedDraft);
    persistActiveSession((session) => ({
      ...session,
      draft: updatedDraft,
    }));
    setDialogueSuccessNotice("Trecho adicionado à Mesa de Rascunho e salvo!");
    setTimeout(() => setDialogueSuccessNotice(null), 3500);
  };

  // Atualizar rascunho com salvamento persistente
  const handleUpdateDraft = (updatedDraft: typeof dialogueDraft) => {
    setDialogueDraft(updatedDraft);
    persistActiveSession((session) => ({
      ...session,
      draft: updatedDraft,
    }));
  };

  // Copiar o rascunho completo para a área de transferência do computador
  const handleCopyDraft = () => {
    if (!dialogueDraft?.draftText) return;
    const fullText = `${dialogueDraft.draftTitle ? `# ${dialogueDraft.draftTitle}\n\n` : ""}${dialogueDraft.draftText}`;
    navigator.clipboard.writeText(fullText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  // Anexar rascunho a um capítulo existente
  const handleAddDraftToChapter = () => {
    if (!dialogueDraft?.draftText || !targetDialogueChapterId) return;
    const chap = chapters.find((c) => c.id === targetDialogueChapterId);
    const chapName = chap?.title || "Capítulo";
    const chapNum = chap?.number || 1;
    const formatted = `\n\n### ${dialogueDraft.draftTitle}\n\n${dialogueDraft.draftText}`;
    onAddTextToChapter(targetDialogueChapterId, formatted);
    
    persistActiveSession((session) => ({
      ...session,
      attachedToChapterId: targetDialogueChapterId,
      attachedToChapterTitle: chapName,
    }));

    const words = dialogueDraft.draftText.trim().split(/\s+/).filter(Boolean).length;
    setAttachSuccessInfo({
      chapterId: targetDialogueChapterId,
      chapterTitle: chapName,
      chapterNumber: chapNum,
      wordCount: words,
      type: "draft",
    });

    setDialogueSuccessNotice(`✓ Rascunho (+${words} palavras) anexado exclusivamente ao Capítulo ${chapNum}: "${chapName}"!`);
    setTimeout(() => setDialogueSuccessNotice(null), 5000);
  };

  // Criar um novo capítulo a partir do rascunho
  const handleCreateNewChapterFromDraft = () => {
    if (!dialogueDraft?.draftText) return;
    onCreateNewChapterFromVoice(
      dialogueDraft.draftTitle || "Novo Capítulo da Conversa",
      dialogueDraft.draftText
    );
    persistActiveSession((session) => ({
      ...session,
      attachedToChapterTitle: dialogueDraft.draftTitle || "Novo Capítulo",
    }));
    setDialogueSuccessNotice("Novo capítulo criado no seu livro com sucesso!");
    setTimeout(() => setDialogueSuccessNotice(null), 5000);
  };

  // Iniciar uma nova conversa sem apagar o histórico
  const handleStartNewDialogueSession = () => {
    const newSession: DialogueSession = {
      id: `session-${Date.now()}`,
      bookId: currentProject.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: "Nova conversa com o biógrafo",
      messages: [
        {
          role: "model",
          text: "Olá! Estou pronto para ouvir uma nova memória, relato ou reflexão. O que você gostaria de explorar agora?",
        },
      ],
      draft: null,
    };

    setDialogueSessions((prev) => {
      const updated = [newSession, ...prev];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        localStorage.setItem(activeSessionKey, newSession.id);
      } catch (e) {}
      return updated;
    });

    setActiveSessionId(newSession.id);
    setDialogueHistory(newSession.messages);
    setDialogueDraft(null);
    setDialogueInput("");
    setShowHistoryDrawer(false);
    setDialogueSuccessNotice("Nova conversa iniciada. As anteriores permanecem seguras no Histórico.");
    setTimeout(() => setDialogueSuccessNotice(null), 5000);
  };

  // Selecionar uma conversa do histórico para abrir
  const handleSelectDialogueSession = (sessionId: string) => {
    const target = dialogueSessions.find((s) => s.id === sessionId);
    if (!target) return;
    setActiveSessionId(target.id);
    setDialogueHistory(target.messages);
    setDialogueDraft(target.draft || null);
    try {
      localStorage.setItem(activeSessionKey, target.id);
    } catch (e) {}
    setShowHistoryDrawer(false);
    setDialogueSuccessNotice(`Conversa "${target.title}" carregada.`);
    setTimeout(() => setDialogueSuccessNotice(null), 3500);
  };

  // Excluir conversa do histórico de forma segura e imediata
  const executeDeleteSession = (sessionId: string) => {
    const filtered = dialogueSessions.filter((s) => s.id !== sessionId);

    let nextList = filtered;
    let nextActiveId = activeSessionId;

    if (nextList.length === 0) {
      const freshSession: DialogueSession = {
        id: `session-${Date.now()}`,
        bookId: currentProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: "Primeira conversa com o biógrafo",
        messages: [
          {
            role: "model",
            text: "Olá! Histórico limpo. Estou pronto para ouvir sua história quando desejar.",
          },
        ],
        draft: null,
      };
      nextList = [freshSession];
      nextActiveId = freshSession.id;
    } else if (activeSessionId === sessionId) {
      nextActiveId = nextList[0].id;
    }

    setDialogueSessions(nextList);
    setActiveSessionId(nextActiveId);

    const activeTarget = nextList.find((s) => s.id === nextActiveId) || nextList[0];
    setDialogueHistory(activeTarget.messages);
    setDialogueDraft(activeTarget.draft || null);

    try {
      localStorage.setItem(storageKey, JSON.stringify(nextList));
      localStorage.setItem(activeSessionKey, nextActiveId);
    } catch (e) {}

    setSessionPendingDeleteId(null);
    setIsConfirmingDeleteActiveSession(false);
    setDialogueSuccessNotice("Conversa e rascunho excluídos para liberar espaço.");
    setTimeout(() => setDialogueSuccessNotice(null), 4000);
  };

  // Limpar conversa para começar nova entrevista
  const handleClearDialogue = () => {
    handleStartNewDialogueSession();
  };

  const handleAppendToChapter = () => {
    if (!polishedResult?.polishedText || !targetNotebookChapterId) return;
    const chap = chapters.find((c) => c.id === targetNotebookChapterId);
    if (!chap) return;

    onAddTextToChapter(targetNotebookChapterId, polishedResult.polishedText);
    const words = polishedResult.polishedText.trim().split(/\s+/).filter(Boolean).length;
    setAddedSuccess(true);
    setAttachSuccessInfo({
      chapterId: chap.id,
      chapterTitle: chap.title,
      chapterNumber: chap.number,
      wordCount: words,
      type: "polished",
    });
    setNotebookNotice(`✓ Prosa lapidada (+${words} palavras) anexada exclusivamente ao Capítulo ${chap.number}: "${chap.title}"!`);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  const handleCreateNewChapter = () => {
    if (!polishedResult?.polishedText) return;
    onCreateNewChapterFromVoice(
      polishedResult.suggestedTitle || "Novo Capítulo por Voz",
      polishedResult.polishedText
    );
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  // Salvar Caderno de Ditado Contínuo no LocalStorage e Nuvem (com refs síncronas sem stale closure)
  const saveNotebook = (newText: string, newTitle?: string, newTakesCount?: number) => {
    const textToSave = newText;
    const titleToSave = newTitle !== undefined ? newTitle : notebookTitleRef.current;
    const takesToSave = newTakesCount !== undefined ? newTakesCount : notebookTakesCountRef.current;
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    notebookTextRef.current = textToSave;
    notebookTitleRef.current = titleToSave;
    notebookTakesCountRef.current = takesToSave;

    setNotebookText(textToSave);
    if (newTitle !== undefined) setNotebookTitle(titleToSave);
    if (newTakesCount !== undefined) setNotebookTakesCount(takesToSave);
    setNotebookLastSaved(nowStr);

    try {
      localStorage.setItem(
        notebookStorageKey,
        JSON.stringify({
          text: textToSave,
          title: titleToSave,
          takesCount: takesToSave,
          updatedAt: nowStr,
        })
      );
    } catch (e) {
      console.warn("Erro ao salvar caderno local:", e);
    }

    if (auth.currentUser) {
      saveNotebookToCloud(auth.currentUser.uid, currentProject.id, {
        notebookText: textToSave,
        notebookTitle: titleToSave,
        takesCount: takesToSave,
        lastSaved: nowStr,
      }).catch((e) => console.warn("Erro ao sincronizar caderno na nuvem:", e));
    }
  };

  // Anexar fala atual capturada ao Caderno de Ditado Contínuo
  const handleAppendTranscriptToNotebook = (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : transcriptRef.current).trim();
    if (!text) return;

    const currentNb = notebookTextRef.current.trim();
    const updated = currentNb ? `${currentNb}\n\n${text}` : text;
    const nextTakes = notebookTakesCountRef.current + 1;
    saveNotebook(updated, undefined, nextTakes);
    transcriptRef.current = "";
    committedTextRef.current = "";
    processedResultCountRef.current = 0;
    setTranscript("");

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    setNotebookNotice(`+${wordCount} palavras anexadas ao seu Caderno de Ditado!`);
    setContinuousTab("notebook");
    setTimeout(() => setNotebookNotice(null), 4000);
  };

  // Substituir o Rascunho do Caderno de Ditado pela Prosa Lapidada (IA)
  const handleReplaceNotebookWithPolished = () => {
    if (!polishedResult?.polishedText) return;
    const prose = polishedResult.polishedText.trim();
    const newTitle = polishedResult.suggestedTitle || notebookTitle;
    saveNotebook(prose, newTitle);
    setContinuousTab("notebook");
    setNotebookNotice("Caderno de Ditado substituído com sucesso pela Prosa Lapidada diagramada!");
    setTimeout(() => setNotebookNotice(null), 4500);
  };

  // Anexar Prosa Lapidada (IA) ao final do Caderno com proteção contra cliques duplicados
  const handleAppendPolishedToNotebook = (force: boolean = false) => {
    if (!polishedResult?.polishedText) return;
    const prose = polishedResult.polishedText.trim();
    const currentNb = notebookTextRef.current.trim();
    const sample = prose.slice(0, Math.min(80, prose.length));

    // Verificação de duplicidade para evitar que cliques repetidos somem o mesmo texto 10 vezes
    if (!force && currentNb.includes(sample)) {
      setNotebookNotice("Aviso: Esta prosa já consta no seu caderno! Se deseja atualizar o rascunho anterior, use o botão 'Substituir Rascunho do Caderno'.");
      setTimeout(() => setNotebookNotice(null), 5000);
      return;
    }

    const heading = polishedResult.suggestedTitle ? `### ${polishedResult.suggestedTitle}\n\n` : "";
    const updated = currentNb ? `${currentNb}\n\n${heading}${prose}` : `${heading}${prose}`;
    const nextTakes = notebookTakesCountRef.current + 1;
    saveNotebook(updated, undefined, nextTakes);
    setContinuousTab("notebook");
    setNotebookNotice("Prosa literária lapidada anexada ao final do Caderno!");
    setTimeout(() => setNotebookNotice(null), 4000);
  };

  // Copiar todo o Caderno de Ditado para Área de Transferência (Word/Docs)
  const handleCopyNotebook = () => {
    if (!notebookText.trim()) return;
    const full = `${notebookTitle ? `# ${notebookTitle}\n\n` : ""}${notebookText}`;
    navigator.clipboard.writeText(full);
    setCopiedNotebook(true);
    setNotebookNotice("Caderno copiado para a Área de Transferência! Cole no Word com Ctrl+V.");
    setTimeout(() => {
      setCopiedNotebook(false);
      setNotebookNotice(null);
    }, 4500);
  };

  // Baixar Caderno em arquivo .TXT para o computador
  const handleDownloadNotebookTxt = () => {
    if (!notebookText.trim()) return;
    const full = `${notebookTitle}\n${"=".repeat(Math.max(20, notebookTitle.length))}\n\n${notebookText}`;
    const blob = new Blob([full], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (notebookTitle || "caderno_ditado").toLowerCase().replace(/[^a-z0-9]/gi, "_");
    link.href = url;
    link.download = `${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotebookNotice("Arquivo .txt baixado com sucesso!");
    setTimeout(() => setNotebookNotice(null), 3500);
  };

  // Anexar todo o Caderno a um Capítulo existente do livro
  const handleAppendNotebookToChapter = () => {
    if (!notebookText.trim() || !targetNotebookChapterId) return;
    const chap = chapters.find((c) => c.id === targetNotebookChapterId);
    if (!chap) return;

    onAddTextToChapter(targetNotebookChapterId, notebookText);
    const words = notebookText.trim().split(/\s+/).filter(Boolean).length;

    setAttachSuccessInfo({
      chapterId: chap.id,
      chapterTitle: chap.title,
      chapterNumber: chap.number,
      wordCount: words,
      type: "notebook",
    });

    setNotebookNotice(`✓ Caderno (+${words} palavras) anexado exclusivamente ao Capítulo ${chap.number}: "${chap.title}"!`);
    setTimeout(() => setNotebookNotice(null), 6000);
  };

  // Substituir o conteúdo de um Capítulo existente pelo Caderno
  const handleReplaceChapterWithNotebook = () => {
    if (!notebookText.trim() || !targetNotebookChapterId) return;
    const chap = chapters.find((c) => c.id === targetNotebookChapterId);
    if (!chap) return;

    const words = notebookText.trim().split(/\s+/).filter(Boolean).length;
    if (onUpdateChapter) {
      onUpdateChapter({
        ...chap,
        content: notebookText,
        wordCount: words,
        lastUpdated: "Agora mesmo",
      });
      setNotebookNotice(`✓ Conteúdo do Capítulo ${chap.number} substituído pelo Caderno de Ditado!`);
    } else {
      onAddTextToChapter(targetNotebookChapterId, notebookText);
      setNotebookNotice(`✓ Texto anexado ao Capítulo ${chap.number}!`);
    }

    setAttachSuccessInfo({
      chapterId: chap.id,
      chapterTitle: chap.title,
      chapterNumber: chap.number,
      wordCount: words,
      type: "replace",
    });
    setTimeout(() => setNotebookNotice(null), 6000);
  };

  // Criar um novo capítulo no livro a partir do Caderno de Ditado
  const handleCreateNewChapterFromNotebook = () => {
    if (!notebookText.trim()) return;
    onCreateNewChapterFromVoice(
      notebookTitle || "Novo Capítulo por Voz",
      notebookText
    );
    setNotebookNotice(`Novo capítulo "${notebookTitle}" criado no seu livro com sucesso!`);
    setTimeout(() => setNotebookNotice(null), 4500);
  };

  // Limpar e iniciar novo caderno
  const handleExecuteClearNotebook = () => {
    saveNotebook("", "Novo Rascunho de Ditado", 0);
    setIsConfirmingClearNotebook(false);
    setNotebookNotice("Caderno de ditado reiniciado para um novo capítulo.");
    setTimeout(() => setNotebookNotice(null), 4000);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Métricas do Caderno de Ditado Contínuo
  const notebookWords = notebookText.trim() ? notebookText.trim().split(/\s+/).filter(Boolean).length : 0;
  const notebookChars = notebookText.length;
  const notebookPages = Math.max(notebookWords > 0 ? 1 : 0, Math.ceil(notebookWords / 250));
  const notebookReadingMins = Math.max(1, Math.ceil(notebookWords / 160));
  const currentTranscriptWords = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="space-y-4 w-full">
      {/* Barra Compacta de Cabeçalho e Alternância de Modo (Sem Rolagem Desnecessária) */}
      <div className="bg-white rounded-2xl px-5 py-3.5 border border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
              Estúdio de Escrita por Voz
            </h2>
            {mode === "continuous" && (
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 font-medium tabular-nums">
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-stone-800">{notebookPages}</strong>{" "}
                  {notebookPages === 1 ? "página estimada" : "páginas estimadas"}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-stone-800">{notebookWords}</strong> palavras no caderno
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-stone-800">{notebookTakesCount}</strong>{" "}
                  {notebookTakesCount === 1 ? "tomada" : "tomadas"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700">
                  {notebookLastSaved ? `Salvo às ${notebookLastSaved}` : "Salvamento automático ativo"}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500 truncate">
            Clique em Falar, acompanhe sua fala ao lado em tempo real e pare quando quiser anexar ao caderno.
          </p>
        </div>

        {/* Toggle de Modos: Gravação Longa vs Conversa Viva */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMode("continuous")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mode === "continuous"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-amber-800" />
            <span>Gravação Longa</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("dialogue")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              mode === "dialogue"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5 text-amber-800" />
            <span>Conversa Viva (IA)</span>
          </button>
        </div>
      </div>

      {/* MODO 1: GRAVAÇÃO LONGA / DESABAFO CONTÍNUO */}
      {mode === "continuous" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* COLUNA ESQUERDA: Microfone ao lado da Fala Desta Tomada */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl p-5 border border-stone-200 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                {/* Cabeçalho da Tomada Atual + Ajustes Recolhíveis */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <span>Fala Desta Tomada</span>
                    {currentTranscriptWords > 0 && (
                      <span className="text-xs font-normal text-stone-500 tabular-nums">
                        · {currentTranscriptWords} {currentTranscriptWords === 1 ? "palavra" : "palavras"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutoPunctuate()}
                      disabled={!transcript.trim() || isAutoPunctuating || isRecording}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                      title="Aplica vírgulas, pontos, parágrafos e títulos sem alterar suas palavras"
                    >
                      {isAutoPunctuating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Pontuando...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-amber-800" />
                          <span>Pontuar (IA)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        showVoiceSettings
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                      }`}
                      title="Configurar comandos de pontuação por voz e pausas"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Ajustes</span>
                    </button>

                    {transcript && !isRecording && (
                      <button
                        type="button"
                        onClick={() => {
                          transcriptRef.current = "";
                          committedTextRef.current = "";
                          processedResultCountRef.current = 0;
                          setTranscript("");
                        }}
                        className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Painel Recolhível de Ajustes de Pontuação e Guia de Voz */}
                {showVoiceSettings && (
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-left space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800 select-none">
                        <input
                          type="checkbox"
                          checked={interpretSpokenCommands}
                          onChange={(e) => {
                            const val = e.target.checked;
                            interpretSpokenCommandsRef.current = val;
                            setInterpretSpokenCommands(val);
                            try {
                              localStorage.setItem("livro_voice_spoken_commands_pref", String(val));
                            } catch {}
                          }}
                          className="rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Comandos vocais ("vírgula", "ponto", "parágrafo"...)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCommandsGuide(!showCommandsGuide)}
                        className="text-xs font-semibold text-amber-900 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{showCommandsGuide ? "Ocultar Guia" : "Guia de Voz"}</span>
                        {showCommandsGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    <label className="flex items-center gap-2 pt-2 border-t border-stone-200/70 cursor-pointer text-xs font-medium text-stone-700 select-none">
                      <input
                        type="checkbox"
                        checked={pausePunctuationEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          pausePunctuationEnabledRef.current = val;
                          setPausePunctuationEnabled(val);
                          if (!val) clearPauseTimers();
                          try {
                            localStorage.setItem("livro_voice_pause_punct_pref", String(val));
                          } catch {}
                        }}
                        className="rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Pontuar por pausas (~0,8s = vírgula + minúscula, ~1,0s = ponto, ~2,2s = parágrafo)</span>
                    </label>

                    <label className="flex items-center gap-2 pt-2 border-t border-stone-200/70 cursor-pointer text-xs font-medium text-stone-700 select-none">
                      <input
                        type="checkbox"
                        checked={autoPunctuateOnStop}
                        onChange={(e) => {
                          const val = e.target.checked;
                          autoPunctuateOnStopRef.current = val;
                          setAutoPunctuateOnStop(val);
                          try {
                            localStorage.setItem("livro_voice_auto_ai_punct_pref", String(val));
                          } catch {}
                        }}
                        className="rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Revisar pontuação, crase e acentuação (Português-BR) ao parar</span>
                    </label>

                    {showCommandsGuide && (
                      <div className="pt-2.5 border-t border-stone-200 space-y-2">
                        <div className="text-xs font-semibold text-stone-800">
                          Comandos falados reconhecidos durante o ditado:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {VOICE_COMMANDS_GUIDE.map((cmd, i) => (
                            <div key={i} className="p-2 rounded-lg bg-white border border-stone-200 text-xs leading-tight">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-amber-900">{cmd.command}</span>
                                <span className="font-mono bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-bold text-xs">{cmd.symbol}</span>
                              </div>
                              <div className="text-stone-500 text-[11px]">{cmd.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {punctuationNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{punctuationNotice}</span>
                  </div>
                )}

                {/* Cockpit Lado a Lado: Botão do Microfone à Esquerda + Captura de Texto à Direita */}
                <div className="flex flex-col sm:flex-row items-stretch gap-3.5">
                  {/* Coluna Lateral do Botão Falar / Parar */}
                  <div className="sm:w-32 shrink-0 rounded-2xl bg-stone-50 border border-stone-200/90 p-3.5 flex sm:flex-col items-center justify-between sm:justify-center gap-3 text-center">
                    <div className="relative">
                      {isRecording && (
                        <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
                      )}
                      <button
                        type="button"
                        onClick={toggleContinuousRecording}
                        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95 shadow-md cursor-pointer ${
                          isRecording
                            ? "bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-100"
                            : "bg-stone-900 hover:bg-stone-800 text-amber-100 ring-4 ring-stone-200/70"
                        }`}
                        title={isRecording ? "Clique para parar a gravação" : "Clique para começar a falar"}
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-7 h-7 fill-current mb-1" />
                            <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">Parar</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">Falar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-0.5 sm:text-center text-right">
                      <div className="text-xl font-mono tabular-nums font-bold text-stone-900">
                        {formatTime(recordingTime)}
                      </div>
                      {isRecording ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                          <span>Gravando</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-medium text-stone-500 leading-snug">
                          Clique no botão para ditar
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caixa de Captura Imediatamente ao Lado do Microfone */}
                  <div className="flex-1 flex flex-col">
                    <textarea
                      value={transcript}
                      onChange={(e) => {
                        const val = e.target.value;
                        transcriptRef.current = val;
                        if (!isRecordingRef.current) {
                          committedTextRef.current = val;
                        }
                        setTranscript(val);
                      }}
                      placeholder={
                        isRecording
                          ? "Ouvindo em Português (Brasil)... Pausa curta = vírgula, pausa média = ponto, pausa longa = novo parágrafo."
                          : "Clique em 'Falar' ao lado e dite seu relato. Pausas viram vírgula, ponto e parágrafo automaticamente..."
                      }
                      rows={9}
                      className={`w-full flex-1 min-h-[220px] p-3.5 rounded-2xl border text-stone-900 font-literary text-sm sm:text-base leading-relaxed focus:bg-white focus:outline-hidden transition-colors resize-y ${
                        isRecording
                          ? "border-rose-300 bg-rose-50/20 focus:border-rose-500"
                          : "border-stone-200 bg-stone-50/40 focus:border-amber-600"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Rodapé da Tomada: Anexo Automático Garantido + Botões Manuais */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 cursor-pointer select-none">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={autoAppendToNotebookOnStop}
                      onChange={(e) => {
                        const val = e.target.checked;
                        autoAppendToNotebookOnStopRef.current = val;
                        setAutoAppendToNotebookOnStop(val);
                        try {
                          localStorage.setItem("livro_auto_append_notebook_pref", String(val));
                        } catch {}
                      }}
                      className="rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-semibold text-stone-800">
                      Anexar automaticamente ao caderno sempre que parar a gravação
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-amber-900 whitespace-nowrap shrink-0">
                    {autoAppendToNotebookOnStop ? "Ativo" : "Manual"}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAppendTranscriptToNotebook()}
                    disabled={!transcript.trim() || isRecording}
                    className="py-2.5 px-3.5 rounded-xl bg-amber-900 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <PlusCircle className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      Anexar ao Caderno
                      {currentTranscriptWords > 0 && ` (+${currentTranscriptWords})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProcessSpeech()}
                    disabled={!transcript.trim() || isProcessing || isRecording}
                    className="py-2.5 px-3.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Lapidando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                        <span>Lapidar Fala (IA)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: O Caderno Contínuo de Páginas & Prosa Lapidada */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 flex-1 flex flex-col justify-between">
              <div>
                {/* Cabeçalho de Abas do Painel Direito */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-3.5 gap-2">
                  <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setContinuousTab("notebook")}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        continuousTab === "notebook"
                          ? "bg-white text-stone-900 shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <BookMarked className="w-4 h-4 text-amber-800" />
                      <span>Caderno Acumulado</span>
                      <span className="text-xs font-mono tabular-nums text-stone-500">
                        · {notebookWords} pal.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContinuousTab("polished")}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        continuousTab === "polished"
                          ? "bg-white text-stone-900 shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-800" />
                      <span>Prosa Lapidada</span>
                      {polishedResult && (
                        <span className="text-xs font-normal text-amber-800">· pronta</span>
                      )}
                    </button>
                  </div>

                  <div className="text-xs text-stone-500 font-medium hidden sm:block whitespace-nowrap">
                    {continuousTab === "notebook" ? "Memória Contínua" : "Versão Literária"}
                  </div>
                </div>

                {/* Banner de Notificação de Sucesso */}
                {notebookNotice && (
                  <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isAutoPunctuating ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>{notebookNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotebookNotice(null)}
                      className="text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* CONTEÚDO DA ABA 1: CADERNO DE DITADO CONTÍNUO */}
                {continuousTab === "notebook" && (
                  <div className="space-y-3.5">
                    {/* Título do Rascunho / Capítulo */}
                    <div>
                      <label className="text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-amber-800" />
                        <span>Título do Rascunho / Capítulo em Construção:</span>
                      </label>
                      <input
                        type="text"
                        value={notebookTitle}
                        onChange={(e) => saveNotebook(notebookTextRef.current, e.target.value)}
                        placeholder="Ex: Capítulo 1: As Primeiras Lembranças e Desafios"
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm font-bold focus:border-amber-600 focus:outline-hidden"
                      />
                    </div>

                    {/* Textarea do Caderno Acumulado */}
                    <div>
                      <div className="flex items-center justify-between mb-1 text-xs text-stone-500 font-semibold">
                        <span>Texto Acumulado do Ditado:</span>
                        <span className="font-mono tabular-nums text-[11px]">
                          {notebookWords} palavras · ~{notebookPages} {notebookPages === 1 ? "pág." : "págs."} · {notebookReadingMins} min de leitura
                        </span>
                      </div>
                      <textarea
                        value={notebookText}
                        onChange={(e) => saveNotebook(e.target.value)}
                        placeholder="O seu Caderno de Ditado Contínuo está pronto para receber suas memórias. Conforme você dita pelo microfone e clica em Parar, cada fala entra aqui automaticamente..."
                        rows={10}
                        className="w-full p-3.5 rounded-2xl border border-stone-200 bg-stone-50/40 text-stone-900 font-literary text-sm sm:text-base leading-relaxed focus:bg-white focus:border-amber-600 focus:outline-hidden transition-colors resize-y min-h-[240px]"
                      />
                    </div>

                      {/* Card de Destaque: Lapidar Todo o Caderno com IA quando terminar o ditado */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-800/40">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Lapidar Todo o Caderno para Prosa do Livro (IA)</span>
                          </div>
                          <div className="text-[11px] text-stone-300">
                            Terminou o ditado? A IA reorganiza e lapida todas as {notebookWords} palavras acumuladas em prosa de livro diagramada.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleProcessSpeech(notebookText)}
                          disabled={!notebookText.trim() || isProcessing}
                          className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Lapidando Caderno Completo...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-950" />
                              <span>Lapidar Caderno Completo ({notebookWords} pal.)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Barra de Ações Rápidas: Copiar Word / Limpar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyNotebook}
                            disabled={!notebookText.trim()}
                            className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Copiar tudo para colar no Microsoft Word ou Google Docs"
                          >
                            {copiedNotebook ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copiado para Área de Transferência!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-stone-600" />
                                <span>Copiar para Word / Docs</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Botão de Limpeza com Confirmação Inline */}
                        <div>
                          {isConfirmingClearNotebook ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl animate-in fade-in">
                              <span className="text-[11px] font-bold text-rose-900">Limpar caderno?</span>
                              <button
                                type="button"
                                onClick={handleExecuteClearNotebook}
                                className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsConfirmingClearNotebook(false)}
                                className="px-2 py-0.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsConfirmingClearNotebook(true)}
                              disabled={!notebookText.trim()}
                              className="text-stone-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-stone-400 text-xs font-medium px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                              title="Limpar e iniciar novo rascunho de capítulo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Novo Caderno</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONTEÚDO DA ABA 2: PROSA LITERÁRIA LAPIDADA (IA) */}
                  {continuousTab === "polished" && (
                    <div className="space-y-4">
                      {processNotice && (
                        <div
                          className={`p-3 rounded-2xl flex items-start gap-2.5 text-xs font-medium border ${
                            processNotice.type === "success"
                              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                              : processNotice.type === "warning"
                              ? "bg-amber-50/90 border-amber-300 text-amber-950"
                              : "bg-red-50/90 border-red-200 text-red-900"
                          }`}
                        >
                          {processNotice.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <div>{processNotice.message}</div>
                            {processNotice.type === "warning" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleProcessSpeech(
                                    lastProcessedTextRef.current || notebookText || transcript
                                  )
                                }
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 font-bold text-amber-900 hover:text-amber-700 underline cursor-pointer mt-1"
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Processando com a IA...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Tentar novamente com a IA</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {polishedResult ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                                Sugestão de Título:
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Salvo no navegador
                              </span>
                            </div>
                            <div className="text-lg font-bold text-stone-900 font-literary">
                              {polishedResult.suggestedTitle}
                            </div>

                            {polishedResult.themes && polishedResult.themes.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {polishedResult.themes.map((th, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900"
                                  >
                                    {th}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {polishedResult.literaryNote && (
                            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
                              <HeartHandshake className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                              <span>{polishedResult.literaryNote}</span>
                            </div>
                          )}

                          <div className="p-4 rounded-2xl bg-stone-50/60 border border-stone-200 text-stone-900 font-literary text-sm leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto">
                            {polishedResult.polishedText}
                          </div>

                          {/* Ações da Prosa Lapidada com Proteção contra Duplicidade */}
                          <div className="pt-2 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {/* 1. Substituir Rascunho pelo Texto Lapidado */}
                              <button
                                type="button"
                                onClick={handleReplaceNotebookWithPolished}
                                className="py-2.5 px-3.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                                title="Substitui o rascunho anterior pelo texto lapidado limpo"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                                <span>Substituir Rascunho do Caderno</span>
                              </button>

                              {/* 2. Anexar ao Final com Verificação de Duplicidade */}
                              {Boolean(
                                polishedResult.polishedText &&
                                  notebookText.includes(
                                    polishedResult.polishedText.trim().slice(0, 60)
                                  )
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() => handleAppendPolishedToNotebook(true)}
                                  className="py-2.5 px-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  title="Este texto já foi inserido. Clique se quiser forçar novo anexo."
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>✓ Já consta no Caderno (Anexar Novamente)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAppendPolishedToNotebook(false)}
                                  className="py-2.5 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                                  title="Adiciona ao final do caderno mantendo o que já estava escrito"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 text-stone-600" />
                                  <span>Anexar ao Final do Caderno</span>
                                </button>
                              )}
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  savePolishedResult(null);
                                  setProcessNotice({
                                    type: "warning",
                                    message: "Prosa lapidada limpa.",
                                  });
                                  setTimeout(() => setProcessNotice(null), 3000);
                                }}
                                className="text-stone-400 hover:text-stone-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer px-2 py-1"
                                title="Limpar esta prosa gerada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Limpar Prosa</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-16 text-center text-stone-400 space-y-2">
                          <Sparkles className="w-8 h-8 mx-auto text-stone-300" />
                          <p className="text-sm font-medium text-stone-600">
                            Nenhuma prosa lapidada no momento.
                          </p>
                          <p className="text-xs text-stone-400 max-w-md mx-auto">
                            Você pode ditar no microfone e lapidar a fala individual ou ditar várias páginas no caderno e clicar em <strong>"Lapidar Caderno Completo"</strong> quando terminar!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Banner de Feedback Pós-Anexo com Opção de Limpar Caderno */}
                {attachSuccessInfo && (
                  <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-xs animate-fade-in space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">
                            {attachSuccessInfo.type === "replace"
                              ? "Capítulo Substituído com Sucesso!"
                              : "Texto Inserido com Sucesso!"}
                          </h4>
                          <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
                            O texto ({attachSuccessInfo.wordCount} palavras) foi enviado <strong>exclusivamente</strong> para o{" "}
                            <span className="font-bold underline decoration-emerald-400">
                              Capítulo {attachSuccessInfo.chapterNumber}: {attachSuccessInfo.chapterTitle}
                            </span>. Nenhum outro capítulo foi modificado.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAttachSuccessInfo(null)}
                        className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                        title="Fechar aviso"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-emerald-200 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveNotebook("", "Novo Rascunho de Ditado", 0);
                          setAttachSuccessInfo(null);
                          setNotebookNotice("✓ Caderno esvaziado! Pronto para ditar o próximo relato sem misturar com o capítulo anterior.");
                          setTimeout(() => setNotebookNotice(null), 4000);
                        }}
                        className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        title="Limpa o caderno para você ditar o próximo capítulo com a folha limpa"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                        <span>Limpar Caderno para Próximo Relato</span>
                      </button>

                      {onNavigateToChapter && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToChapter(attachSuccessInfo.chapterId);
                            setAttachSuccessInfo(null);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Abrir Capítulo {attachSuccessInfo.chapterNumber} no Editor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setAttachSuccessInfo(null)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200 transition-all cursor-pointer ml-auto"
                      >
                        <span>Manter Texto no Caderno</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bloco de Envio para o Livro (Capítulos) */}
                <div className="pt-5 mt-5 border-t border-stone-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                      <span>Integrar ao Livro:</span>
                    </label>
                    <select
                      value={targetNotebookChapterId}
                      onChange={(e) => setTargetNotebookChapterId(e.target.value)}
                      disabled={chapters.length === 0}
                      className="p-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800 max-w-full sm:max-w-xs font-medium cursor-pointer disabled:bg-stone-100 disabled:text-stone-400"
                    >
                      {chapters.length === 0 ? (
                        <option value="">Nenhum capítulo existente (clique em 'Criar Novo Capítulo')</option>
                      ) : (
                        chapters.map((chap) => (
                          <option key={chap.id} value={chap.id}>
                            Capítulo {chap.number}: {chap.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Indicação visual clara do capítulo selecionado e do volume de texto */}
                  {chapters.length > 0 && targetNotebookChapterId && (
                    <div className="text-[11px] bg-amber-50/80 text-amber-950 px-3 py-2 rounded-xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-600">Capítulo Alvo Escolhido:</span>
                        <span className="font-bold text-amber-900">
                          {chapters.find((c) => c.id === targetNotebookChapterId)
                            ? `Capítulo ${chapters.find((c) => c.id === targetNotebookChapterId)!.number}: ${chapters.find((c) => c.id === targetNotebookChapterId)!.title}`
                            : "Nenhum selecionado"}
                        </span>
                      </div>
                      <div className="text-stone-500 text-[10px]">
                        Conteúdo:{" "}
                        <strong className="text-stone-800">
                          {continuousTab === "polished" && polishedResult
                            ? `Prosa Lapidada (${polishedResult.polishedText.trim().split(/\s+/).filter(Boolean).length} palavras)`
                            : `Caderno Completo (${notebookText.trim().split(/\s+/).filter(Boolean).length} palavras)`}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={
                        continuousTab === "polished" && polishedResult
                          ? handleAppendToChapter
                          : handleAppendNotebookToChapter
                      }
                      disabled={
                        chapters.length === 0 ||
                        !targetNotebookChapterId ||
                        (continuousTab === "polished"
                          ? !polishedResult?.polishedText
                          : !notebookText.trim())
                      }
                      className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title={
                        chapters.length === 0
                          ? "Crie primeiro um capítulo usando o botão 'Criar Novo Capítulo'"
                          : "Adiciona o texto ao final do capítulo escolhido sem apagar nada"
                      }
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Anexar ao Capítulo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReplaceChapterWithNotebook}
                      disabled={
                        chapters.length === 0 ||
                        !targetNotebookChapterId ||
                        !notebookText.trim() ||
                        continuousTab === "polished"
                      }
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-800 hover:text-amber-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-stone-200"
                      title={
                        chapters.length === 0
                          ? "Nenhum capítulo disponível para substituir"
                          : "Substitui o conteúdo atual do capítulo pelo texto do caderno"
                      }
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                      <span>Substituir Capítulo</span>
                    </button>

                    <button
                      type="button"
                      onClick={
                        continuousTab === "polished" && polishedResult
                          ? handleCreateNewChapter
                          : handleCreateNewChapterFromNotebook
                      }
                      disabled={
                        continuousTab === "polished"
                          ? !polishedResult?.polishedText
                          : !notebookText.trim()
                      }
                      className="py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-200"
                      title="Cria um novo capítulo com o título e conteúdo do caderno"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-900" />
                      <span>Criar Novo Capítulo</span>
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: CONVERSA VIVA COM A IA (PARCEIRO DE ESCUTA POR ÁUDIO E MESA DE RASCUNHOS) */}
      {mode === "dialogue" && (
        <div className="space-y-6">
          {/* Alerta de Notificação / Sucesso */}
          {dialogueSuccessNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{dialogueSuccessNotice}</span>
              </div>
              <button
                onClick={() => setDialogueSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Barra Superior de Ações da Conversa */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-lg">Conversa Viva & Biógrafo Literário</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Converse por voz com o interlocutor. Suas conversas e rascunhos são salvos automaticamente por data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  showHistoryDrawer
                    ? "bg-stone-900 text-amber-200 ring-2 ring-stone-900"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300"
                }`}
                title="Visualizar histórico de conversas gravadas por data"
              >
                <History className="w-4 h-4 text-amber-700" />
                <span>Histórico ({dialogueSessions.length})</span>
              </button>

              <button
                type="button"
                onClick={handleStartNewDialogueSession}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Iniciar uma nova conversa limpa (a atual permanece guardada no histórico)"
              >
                <Plus className="w-4 h-4 text-amber-800" />
                <span>Nova Conversa</span>
              </button>

              <button
                type="button"
                onClick={handleSynthesizeDialogue}
                disabled={isSynthesizingDialogue || !dialogueHistory.some((m) => m.role === "user" && m.text.trim())}
                className="px-4 py-2.5 rounded-2xl bg-amber-900 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                title="Consolida toda a conversa em um rascunho de capítulo contínuo para o livro"
              >
                {isSynthesizingDialogue ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Sintetizando Rascunho...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Sintetizar Rascunho</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSpeechSynthesisActive(!speechSynthesisActive);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  speechSynthesisActive
                    ? "bg-amber-50 text-amber-900 border border-amber-200"
                    : "bg-stone-100 text-stone-500"
                }`}
                title="Ativa ou silencia a leitura falada das respostas da IA"
              >
                {speechSynthesisActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">Voz</span>
              </button>
            </div>
          </div>

          {/* PAINEL DE HISTÓRICO DE CONVERSAS E RASCUNHOS POR DATA */}
          {showHistoryDrawer && (
            <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 sm:p-6 shadow-md border border-stone-800 space-y-4 animate-fade-in text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-100 text-base">Arquivo de Conversas e Rascunhos por Data</h4>
                    <p className="text-xs text-stone-400">
                      Suas conversas anteriores estão salvas aqui. Exclua as que não precisar para não inchar o sistema.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartNewDialogueSession}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nova Conversa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistoryDrawer(false)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
                    title="Fechar painel do histórico"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid de Sessões Salvas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {dialogueSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const userMessagesCount = session.messages.filter((m) => m.role === "user").length;
                  const firstUserMsg = session.messages.find((m) => m.role === "user" && m.text.trim())?.text;

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectDialogueSession(session.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isActive
                          ? "bg-stone-800/90 border-amber-500 ring-2 ring-amber-500/30 shadow-xs"
                          : "bg-stone-800/40 border-stone-700/60 hover:bg-stone-800 hover:border-stone-600"
                      }`}
                    >
                      <div>
                        {/* Topo do Card: Data e Ação de Exclusão */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-amber-300/90 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatSessionDate(session.createdAt)}
                          </span>

                          {sessionPendingDeleteId === session.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-700/80 px-2 py-0.5 rounded-lg animate-fade-in text-[10px]"
                            >
                              <span className="font-bold text-rose-200">Excluir?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  executeDeleteSession(session.id);
                                }}
                                className="font-bold text-white bg-rose-600 hover:bg-rose-500 px-1.5 py-0.5 rounded-md cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionPendingDeleteId(null);
                                }}
                                className="font-medium text-stone-300 hover:text-white px-1 py-0.5 cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionPendingDeleteId(session.id);
                              }}
                              className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                              title="Excluir esta conversa para não inchar o sistema"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Título da Conversa */}
                        <h5 className="font-bold text-stone-100 text-sm mt-1 line-clamp-1">
                          {session.title || "Conversa com o biógrafo"}
                        </h5>

                        {/* Trecho / Resumo da primeira fala */}
                        {firstUserMsg && (
                          <p className="text-xs text-stone-400 mt-1 line-clamp-2 italic font-serif leading-relaxed">
                            "{firstUserMsg}"
                          </p>
                        )}
                      </div>

                      {/* Rodapé do Card: Tags de Rascunho / Estado e Botão de Abertura */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-700/40 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-stone-700 text-stone-300 font-medium">
                            {userMessagesCount} {userMessagesCount === 1 ? "fala" : "falas"}
                          </span>

                          {session.attachedToChapterTitle ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Aproveitado
                            </span>
                          ) : session.draft ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 font-semibold flex items-center gap-1">
                              <FileText className="w-3 h-3 text-amber-400" />
                              Rascunho Pronto
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-stone-700/50 text-stone-400 font-medium">
                              Em conversa
                            </span>
                          )}
                        </div>

                        <div>
                          {isActive ? (
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/30">
                              Aberta agora
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-stone-300 hover:text-white underline">
                              Abrir
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid Principal: Lado Esquerdo = Conversa / Lado Direito = Mesa de Rascunho */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LADO ESQUERDO: A Entrevista / Chat (7 colunas) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5 text-left">
              {/* Identificação da Sessão Ativa */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 text-xs text-stone-500">
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquareText className="w-4 h-4 text-amber-800 shrink-0" />
                  <span className="font-bold text-stone-800 truncate">
                    {dialogueSessions.find((s) => s.id === activeSessionId)?.title || "Conversa com o biógrafo"}
                  </span>
                  <span className="text-stone-300 hidden sm:inline">•</span>
                  <span className="text-[11px] text-stone-400 hidden sm:inline whitespace-nowrap">
                    {formatSessionDate(
                      dialogueSessions.find((s) => s.id === activeSessionId)?.createdAt || new Date().toISOString()
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                    className="text-[11px] font-semibold text-amber-900 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    {showHistoryDrawer ? "Ocultar Histórico" : "Trocar / Histórico"}
                  </button>

                  {isConfirmingDeleteActiveSession ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-xl animate-fade-in text-[10px]">
                      <span className="font-bold text-rose-800">Apagar conversa?</span>
                      <button
                        type="button"
                        onClick={() => executeDeleteSession(activeSessionId)}
                        className="font-bold text-white bg-rose-600 hover:bg-rose-700 px-1.5 py-0.5 rounded-md cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteActiveSession(false)}
                        className="font-medium text-stone-600 hover:text-stone-900 px-1 py-0.5 cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDeleteActiveSession(true)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                      title="Excluir esta conversa ativa do histórico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Histórico da Conversa */}
              <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                {dialogueHistory.map((item, idx) => {
                  const isUser = item.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[90%] sm:max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-amber-900 text-white rounded-tr-xs shadow-xs"
                            : "bg-stone-50 text-stone-800 border border-stone-200/80 rounded-tl-xs"
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-stone-200/60">
                            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                              Interlocutor Literário
                            </span>
                            <button
                              onClick={() => speakText(item.text)}
                              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
                              title="Ouvir esta resposta em voz alta"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <p className="whitespace-pre-line">{item.text}</p>
                      </div>

                      {/* Ações para a fala do escritor (Copiar ou levar trecho ao rascunho) */}
                      {isUser && (
                        <div className="flex items-center gap-1.5 mt-1.5 mr-1">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(item.text, idx)}
                            className="text-[11px] px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium flex items-center gap-1 transition-all cursor-pointer"
                            title="Copiar apenas esta fala para a área de transferência"
                          >
                            {copiedMessageIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddSnippetToDraft(item.text)}
                            className="text-[11px] px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium flex items-center gap-1 transition-all cursor-pointer border border-amber-200/60"
                            title="Enviar apenas este trecho diretamente para a Mesa de Rascunho"
                          >
                            <PlusCircle className="w-3 h-3 text-amber-700" />
                            <span>Para o Rascunho</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAiReplying && (
                  <div className="flex justify-start">
                    <div className="p-4 rounded-3xl bg-stone-100 text-stone-600 text-xs flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                      <span>O biógrafo está ouvindo e formulando a resposta reflexiva...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Entrada de Diálogo (Área Ampla com Scrollbar, Pontuação Inteligente e Microfone) */}
              <div className="pt-4 border-t border-stone-200/80 space-y-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-stone-400" />
                    <span>Sua fala / reflexão para a conversa:</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {dialogueInput.trim() && (
                      <>
                        <button
                          type="button"
                          onClick={handlePunctuateDialogueInput}
                          className="text-xs px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Organiza pontuação, vírgulas, pontos e parágrafos antes de enviar"
                        >
                          <Wand2 className="w-3 h-3 text-amber-800" />
                          <span>Pontuar & Paragrafar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDialogueInput("")}
                          className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 cursor-pointer"
                        >
                          Limpar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Caixa de Texto Ampla com Rolagem */}
                <div className="relative">
                  <textarea
                    value={dialogueInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      dialogueInputRef.current = val;
                      if (!isDialogueListeningRef.current) {
                        dialogueCommittedTextRef.current = val;
                      }
                      setDialogueInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendDialogue();
                      }
                    }}
                    rows={3}
                    placeholder={
                      isDialogueListening
                        ? "🎙️ Ouvindo em Português (Brasil)... Pausa curta = vírgula, média = ponto, longa = novo parágrafo."
                        : "Clique no botão 'Falar pelo Microfone' abaixo ou digite aqui seu relato, dúvida ou reflexão para o livro..."
                    }
                    className="w-full p-3.5 rounded-2xl border border-stone-300 bg-stone-50/60 text-stone-900 text-sm leading-relaxed focus:bg-white focus:border-amber-700 focus:outline-hidden transition-all resize-none max-h-40 overflow-y-auto"
                  />
                  {isDialogueListening && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-full text-[11px] font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      <span>Gravando fala...</span>
                    </div>
                  )}
                </div>

                {/* Rodapé com Controles de Áudio e Envio */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDialogueListening) {
                          clearPauseTimers();
                          setIsDialogueListening(false);
                          isDialogueListeningRef.current = false;
                          try {
                            recognitionRef.current?.stop();
                          } catch (_) {}
                          // Finaliza vírgula solta em ponto ao parar no diálogo
                          const cur = dialogueInputRef.current.trim();
                          if (cur) {
                            const formatted = cur.replace(/[,;:]$/, ".");
                            dialogueInputRef.current = formatted;
                            dialogueCommittedTextRef.current = formatted;
                            setDialogueInput(formatted);
                          }
                        } else {
                          clearPauseTimers();
                          dialogueCommittedTextRef.current = dialogueInputRef.current.replace(
                            /[ \t]+$/,
                            ""
                          );
                          resetSessionInterimRefs();
                          lastSpeechChangeTimeRef.current = Date.now();
                          setIsDialogueListening(true);
                          isDialogueListeningRef.current = true;
                          try {
                            recognitionRef.current?.start();
                          } catch (_) {}
                        }
                      }}
                      className={`px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer font-semibold text-xs ${
                        isDialogueListening
                          ? "bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse"
                          : "bg-stone-900 text-amber-200 hover:bg-stone-800"
                      }`}
                      title="Ativar/Desativar microfone"
                    >
                      {isDialogueListening ? (
                        <>
                          <Square className="w-4 h-4 fill-current" />
                          <span>Concluir Fala (Parar)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-amber-400" />
                          <span>Falar pelo Microfone</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] text-stone-500 hidden sm:inline">
                      {isDialogueListening ? "Pausas pontuam" : "Enter envia • Shift+Enter pula linha"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendDialogue()}
                    disabled={!dialogueInput.trim() || isAiReplying}
                    className="px-5 py-2.5 rounded-2xl bg-amber-900 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    {isAiReplying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar para a IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: Mesa de Rascunho do Livro (5 colunas) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-800" />
                    <h4 className="font-bold text-stone-900 text-sm">Mesa de Rascunho da Conversa</h4>
                  </div>
                  {dialogueDraft && (
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="text-xs px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Copiar todo o rascunho para a área de transferência"
                    >
                      {copiedDraft ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Rascunho</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {!dialogueDraft ? (
                  <div className="py-12 px-6 text-center space-y-3 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 mx-auto flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-stone-800 text-sm">Nenhum rascunho ativo ainda</h5>
                    <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                      Converse livremente pelo microfone. Quando quiser transformar suas falas em prosa literária, clique em <strong>"Sintetizar Conversa em Rascunho"</strong> acima, ou use o botão <strong>"Para o Rascunho"</strong> em qualquer fala isolada.
                    </p>
                    {dialogueHistory.some((m) => m.role === "user" && m.text.trim()) && (
                      <button
                        type="button"
                        onClick={handleSynthesizeDialogue}
                        disabled={isSynthesizingDialogue}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-amber-900 text-white font-semibold hover:bg-amber-800 cursor-pointer transition-all shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Gerar Rascunho Agora</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in text-left">
                    {/* Título sugerido / editável */}
                    <div>
                      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Título sugerido para o trecho/capítulo:
                      </label>
                      <input
                        type="text"
                        value={dialogueDraft.draftTitle}
                        onChange={(e) =>
                          handleUpdateDraft({ ...dialogueDraft, draftTitle: e.target.value })
                        }
                        className="w-full p-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 bg-stone-50/40 focus:bg-white focus:border-amber-700 focus:outline-hidden transition-all"
                        placeholder="Ex: Princípios da Homeopatia ou Madrugadas de Plantão..."
                      />
                    </div>

                    {/* Prosa Literária Gerada (Editável) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          Texto em prosa (editável à vontade):
                        </label>
                        <span className="text-[10px] text-stone-400">
                          {dialogueDraft.draftText.split(/\s+/).filter(Boolean).length} palavras
                        </span>
                      </div>
                      <textarea
                        value={dialogueDraft.draftText}
                        onChange={(e) =>
                          handleUpdateDraft({ ...dialogueDraft, draftText: e.target.value })
                        }
                        rows={11}
                        className="w-full p-4 rounded-2xl border border-stone-300 bg-amber-50/20 text-stone-800 text-sm font-serif leading-relaxed focus:bg-white focus:border-amber-700 focus:outline-hidden transition-all resize-y"
                        placeholder="O rascunho sintetizado aparecerá aqui..."
                      />
                    </div>

                    {/* Temas extraídos */}
                    {dialogueDraft.themes && dialogueDraft.themes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-400 uppercase">Temas:</span>
                        {dialogueDraft.themes.map((theme, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Nota do Curador */}
                    {dialogueDraft.literaryNotes && (
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs leading-relaxed">
                        <span className="font-bold text-amber-900">Nota do Biógrafo: </span>
                        {dialogueDraft.literaryNotes}
                      </div>
                    )}

                    {/* Ações de Destino para o Livro */}
                    <div className="pt-3 border-t border-stone-200/80 space-y-3">
                      {attachSuccessInfo && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 animate-fade-in space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-xs font-bold text-emerald-950">
                                Inserido no Capítulo {attachSuccessInfo.chapterNumber}: {attachSuccessInfo.chapterTitle}
                              </span>
                            </div>
                            <button
                              onClick={() => setAttachSuccessInfo(null)}
                              className="text-stone-400 hover:text-stone-700 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {onNavigateToChapter && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToChapter(attachSuccessInfo.chapterId);
                                setAttachSuccessInfo(null);
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Abrir Capítulo {attachSuccessInfo.chapterNumber} no Editor</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-semibold text-stone-700 block mb-1">
                          Escolha onde anexar no livro:
                        </label>
                        <select
                          value={targetDialogueChapterId}
                          onChange={(e) => setTargetDialogueChapterId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-white text-stone-800 font-medium"
                        >
                          {chapters.map((chap) => (
                            <option key={chap.id} value={chap.id}>
                              Capítulo {chap.number}: {chap.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {chapters.length > 0 && targetDialogueChapterId && (
                        <div className="text-[11px] bg-amber-50/80 text-amber-950 px-3 py-1.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
                          <span>Destino: <strong>Capítulo {chapters.find((c) => c.id === targetDialogueChapterId)?.number}: {chapters.find((c) => c.id === targetDialogueChapterId)?.title}</strong></span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={handleAddDraftToChapter}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <PlusCircle className="w-4 h-4 text-amber-300" />
                          <span>Anexar ao Capítulo</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCreateNewChapterFromDraft}
                          className="py-2.5 px-4 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <BookOpen className="w-4 h-4 text-amber-800" />
                          <span>Criar Novo Capítulo</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleCopyDraft}
                          className="text-xs text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedDraft ? "Copiado para transferência!" : "Copiar para Área de Transferência"}</span>
                        </button>

                        {isConfirmingDiscardDraft ? (
                          <div className="flex items-center gap-2 animate-fade-in bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                            <span className="text-[11px] font-semibold text-rose-900">Limpar rascunho?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDialogueDraft(null);
                                persistActiveSession((s) => ({
                                  ...s,
                                  draft: null,
                                }));
                                setIsConfirmingDiscardDraft(false);
                                setDialogueSuccessNotice("Mesa de rascunho limpa com sucesso. Suas falas continuam salvas no diálogo.");
                                setTimeout(() => setDialogueSuccessNotice(null), 4000);
                              }}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all cursor-pointer shadow-xs"
                            >
                              Sim, limpar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingDiscardDraft(false)}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDiscardDraft(true)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline-offset-2 hover:underline"
                            title="Limpar a mesa de rascunho"
                          >
                            Descartar Rascunho
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
