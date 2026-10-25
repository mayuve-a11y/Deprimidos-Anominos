import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { BookProject, Chapter, ProjectTask } from "../types";
import { runDatabaseDiagnostics } from "../services/cloudStorage";
import { ProjectRoadmapTab } from "./ProjectRoadmapTab";
import {
  Settings,
  X,
  BookOpen,
  Mic,
  CheckSquare,
  ShieldAlert,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
  Save,
  Trash2,
  FileJson,
  FileText,
  Cloud,
  CloudOff,
} from "lucide-react";

export const VOICE_PREF_KEYS = {
  autoAppend: "livro_auto_append_notebook_pref",
  spokenCommands: "livro_voice_spoken_commands_pref",
  pausePunctuation: "livro_voice_pause_punct_pref",
  autoAiPunctuation: "livro_voice_auto_ai_punct_pref",
  ttsEnabled: "livro_voice_tts_pref",
};

type SettingsSection = "obra" | "voz" | "mapa" | "seguranca";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: BookProject;
  projectsCount: number;
  chapters: Chapter[];
  tasks: ProjectTask[];
  user: User | null;
  onUpdateProject: (updated: BookProject) => void;
  onDeleteCurrentProject: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Partial<ProjectTask>) => void;
  onQuickExportDocx: () => void;
  onExportBackupJson: () => void;
  onOpenGoogleDocs: () => void;
  onLoadDemoData: () => void;
  onResetAllData: () => void;
}

function readBoolPref(key: string, fallback = true): boolean {
  try {
    const val = localStorage.getItem(key);
    return val === null ? fallback : val === "true";
  } catch {
    return fallback;
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  projectsCount,
  chapters,
  tasks,
  user,
  onUpdateProject,
  onDeleteCurrentProject,
  onToggleTask,
  onAddTask,
  onQuickExportDocx,
  onExportBackupJson,
  onOpenGoogleDocs,
  onLoadDemoData,
  onResetAllData,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("obra");

  // Edição dos metadados da obra atual
  const [title, setTitle] = useState(currentProject.title);
  const [subtitle, setSubtitle] = useState(currentProject.subtitle);
  const [genre, setGenre] = useState(currentProject.genre);
  const [summary, setSummary] = useState(currentProject.summary);
  const [savedBookFeedback, setSavedBookFeedback] = useState(false);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);

  // Preferências globais de voz e áudio
  const [autoAppend, setAutoAppend] = useState(true);
  const [spokenCommands, setSpokenCommands] = useState(true);
  const [pausePunctuation, setPausePunctuation] = useState(true);
  const [autoAiPunctuation, setAutoAiPunctuation] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Segurança, demonstração e diagnóstico
  const [confirmLoadDemo, setConfirmLoadDemo] = useState(false);
  const [showResetBox, setShowResetBox] = useState(false);
  const [resetConfirmationWord, setResetConfirmationWord] = useState("");
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState<{
    success: boolean;
    results: { step: string; status: "passed" | "failed"; detail: string }[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(currentProject.title);
    setSubtitle(currentProject.subtitle);
    setGenre(currentProject.genre);
    setSummary(currentProject.summary);
    setConfirmDeleteBook(false);
    setConfirmLoadDemo(false);
    setShowResetBox(false);
    setResetConfirmationWord("");

    setAutoAppend(readBoolPref(VOICE_PREF_KEYS.autoAppend, true));
    setSpokenCommands(readBoolPref(VOICE_PREF_KEYS.spokenCommands, true));
    setPausePunctuation(readBoolPref(VOICE_PREF_KEYS.pausePunctuation, true));
    setAutoAiPunctuation(readBoolPref(VOICE_PREF_KEYS.autoAiPunctuation, true));
    setTtsEnabled(readBoolPref(VOICE_PREF_KEYS.ttsEnabled, true));
  }, [isOpen, currentProject]);

  if (!isOpen) return null;

  const updateVoicePref = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    try {
      localStorage.setItem(key, String(value));
      window.dispatchEvent(new Event("livro-voice-prefs-updated"));
    } catch (e) {
      console.warn("Erro ao salvar preferência de voz:", e);
    }
  };

  const handleSaveBookDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onUpdateProject({
      ...currentProject,
      title: title.trim(),
      subtitle: subtitle.trim(),
      genre: genre.trim(),
      summary: summary.trim(),
      lastEdited: "Hoje",
    });
    setSavedBookFeedback(true);
    setTimeout(() => setSavedBookFeedback(false), 3000);
  };

  const handleRunDiagnostics = async () => {
    if (!user) return;
    setDiagRunning(true);
    try {
      const res = await runDatabaseDiagnostics(user.uid);
      setDiagResults(res);
    } catch (err) {
      console.error("Erro no diagnóstico:", err);
    } finally {
      setDiagRunning(false);
    }
  };

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalBookWords = chapters.reduce(
    (acc, c) => acc + (c.content ? c.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0
  );

  const navItems: {
    id: SettingsSection;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "obra",
      label: "Obra & Backup",
      description: "Dados do livro, Word e Google Drive",
      icon: BookOpen,
    },
    {
      id: "voz",
      label: "Preferências de Voz",
      description: "Ditado, pontuação e áudio",
      icon: Mic,
    },
    {
      id: "mapa",
      label: "Mapa do Projeto",
      description: `${completedTasks}/${tasks.length} etapas concluídas`,
      icon: CheckSquare,
    },
    {
      id: "seguranca",
      label: "Segurança & Dados",
      description: "Diagnóstico da nuvem e zerar sistema",
      icon: ShieldAlert,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-[#FBF9F5] rounded-3xl max-w-5xl w-full max-h-[90vh] border border-stone-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="bg-white px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-100 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base sm:text-lg font-bold text-stone-900">
                Configurações e Segurança do Sistema
              </h2>
              <p className="text-xs text-stone-500">
                Gerencie sua obra, preferências de ditado, mapa do projeto e proteção de dados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Principal: Menu Lateral + Conteúdo */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Menu Lateral de Seções */}
          <aside className="md:w-64 bg-white border-b md:border-b-0 md:border-r border-stone-200 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer shrink-0 md:w-full ${
                    isActive
                      ? "bg-stone-900 text-white"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isActive
                        ? item.id === "seguranca"
                          ? "text-rose-300"
                          : "text-amber-300"
                        : "text-stone-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold whitespace-nowrap md:whitespace-normal">
                      {item.label}
                    </div>
                    <div
                      className={`hidden md:block text-[11px] truncate ${
                        isActive ? "text-stone-300" : "text-stone-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Painel de Conteúdo da Seção Ativa */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7">
            {/* SEÇÃO 1: OBRA & BACKUP */}
            {activeSection === "obra" && (
              <div className="space-y-6 max-w-3xl">
                {/* Exportação, Sincronização e Cópia de Segurança */}
                <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Exportação, Google Drive e Cópia de Segurança
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                      Obra atual com {chapters.length} {chapters.length === 1 ? "capítulo" : "capítulos"} ·{" "}
                      {totalBookWords} palavras registradas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenGoogleDocs();
                      }}
                      className="py-2.5 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-950 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Google Docs & Drive</span>
                    </button>

                    <button
                      type="button"
                      onClick={onQuickExportDocx}
                      className="py-2.5 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Baixar Word (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={onExportBackupJson}
                      className="py-2.5 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      title="Salva uma cópia completa de todos os livros, capítulos e tarefas no seu computador"
                    >
                      <FileJson className="w-4 h-4 text-amber-800 shrink-0" />
                      <span>Backup Completo (.json)</span>
                    </button>
                  </div>
                </div>

                {/* Editar Informações da Obra Atual */}
                <form
                  onSubmit={handleSaveBookDetails}
                  className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        Informações do Livro Selecionado
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Ajuste título, subtítulo, gênero ou sinopse da obra ativa.
                      </p>
                    </div>
                    {savedBookFeedback && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Salvo!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Título da Obra
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:border-amber-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Subtítulo
                      </label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:border-amber-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Gênero Literário
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:border-amber-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Sinopse / Intenção do Livro
                      </label>
                      <textarea
                        rows={3}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:border-amber-600 focus:outline-hidden resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                    {projectsCount > 1 ? (
                      <div>
                        {confirmDeleteBook ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-rose-800">
                              Excluir apenas este livro?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCurrentProject();
                                setConfirmDeleteBook(false);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Sim, excluir livro
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBook(false)}
                              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBook(true)}
                            className="text-xs font-medium text-stone-400 hover:text-rose-700 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir este livro</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">Obra principal ativa</span>
                    )}

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-300" />
                      <span>Salvar Alterações da Obra</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SEÇÃO 2: PREFERÊNCIAS DE VOZ */}
            {activeSection === "voz" && (
              <div className="space-y-4 max-w-2xl">
                <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Comportamento Padrão do Estúdio de Voz
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Estas preferências ficam salvas automaticamente e valem para todas as suas tomadas de ditado.
                    </p>
                  </div>

                  <div className="divide-y divide-stone-100">
                    <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-stone-900">
                          Anexar automaticamente ao caderno ao parar a gravação
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Ao clicar em Parar, o texto falado vai direto para o Caderno Acumulado e limpa o campo da tomada atual.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoAppend}
                        onChange={(e) =>
                          updateVoicePref(VOICE_PREF_KEYS.autoAppend, e.target.checked, setAutoAppend)
                        }
                        className="mt-1 rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                    </label>

                    <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-stone-900">
                          Comandos vocais de pontuação
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Converte expressões faladas como "vírgula", "ponto final" e "novo parágrafo" em sinais gráficos.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={spokenCommands}
                        onChange={(e) =>
                          updateVoicePref(
                            VOICE_PREF_KEYS.spokenCommands,
                            e.target.checked,
                            setSpokenCommands
                          )
                        }
                        className="mt-1 rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                    </label>

                    <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-stone-900">
                          Pontuar automaticamente pelas pausas na fala
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Pausa curta (~0,8s) = vírgula + minúscula, pausa média (~1,0s) = ponto final + maiúscula e pausa longa (~2,2s) = novo parágrafo.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pausePunctuation}
                        onChange={(e) =>
                          updateVoicePref(
                            VOICE_PREF_KEYS.pausePunctuation,
                            e.target.checked,
                            setPausePunctuation
                          )
                        }
                        className="mt-1 rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                    </label>

                    <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-stone-900">
                          Revisar pontuação, crase e acentuação (Português-BR) ao parar
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Corrige crases, acentuação, homônimos da fala e pontuação em segundo plano sem alterar suas palavras.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoAiPunctuation}
                        onChange={(e) =>
                          updateVoicePref(
                            VOICE_PREF_KEYS.autoAiPunctuation,
                            e.target.checked,
                            setAutoAiPunctuation
                          )
                        }
                        className="mt-1 rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                    </label>

                    <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-stone-900">
                          Resposta por voz na Conversa Viva (IA)
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Permite que o parceiro biógrafo leia as respostas em voz alta durante o modo Conversa Viva.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={ttsEnabled}
                        onChange={(e) =>
                          updateVoicePref(VOICE_PREF_KEYS.ttsEnabled, e.target.checked, setTtsEnabled)
                        }
                        className="mt-1 rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 3: MAPA DO PROJETO */}
            {activeSection === "mapa" && (
              <div>
                <ProjectRoadmapTab
                  tasks={tasks}
                  onToggleTask={onToggleTask}
                  onAddTask={onAddTask}
                />
              </div>
            )}

            {/* SEÇÃO 4: SEGURANÇA & MANUTENÇÃO */}
            {activeSection === "seguranca" && (
              <div className="space-y-5 max-w-3xl">
                {/* Status e Diagnóstico de Nuvem */}
                <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {user ? (
                          <Cloud className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <CloudOff className="w-4 h-4 text-stone-400" />
                        )}
                        <h3 className="text-sm font-bold text-stone-900">
                          Sincronização e Saúde do Banco na Nuvem
                        </h3>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {user
                          ? `Conectado como ${user.email}. Seus livros e cadernos são isolados exclusivamente na sua conta.`
                          : "Você está no Modo Local. Entre com sua conta Google no topo da tela para ativar o backup automático na nuvem."}
                      </p>
                    </div>

                    {user && (
                      <button
                        type="button"
                        onClick={handleRunDiagnostics}
                        disabled={diagRunning}
                        className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {diagRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800" />
                            <span>Verificando...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-amber-800" />
                            <span>Testar Saúde da Nuvem</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {diagResults && (
                    <div className="pt-3 border-t border-stone-100 space-y-2">
                      {diagResults.results.map((r, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border text-xs ${
                            r.status === "passed"
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                              : "bg-rose-50/60 border-rose-200 text-rose-950"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            {r.status === "passed" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{r.step}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-stone-600 pl-6">{r.detail}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Carregar Obra de Demonstração */}
                <div className="bg-white rounded-2xl p-5 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Obra Modelo de Demonstração
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Adiciona o livro de exemplo ("O Peso do Distintivo") sem apagar seus outros livros.
                    </p>
                  </div>

                  {confirmLoadDemo ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadDemoData();
                          setConfirmLoadDemo(false);
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Confirmar Carregamento
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmLoadDemo(false)}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmLoadDemo(true)}
                      className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      <span>Carregar Livro Modelo</span>
                    </button>
                  )}
                </div>

                {/* ZONA DE CUIDADO: ZERAR DADOS COM TRAVA DE SEGURANÇA */}
                <div className="bg-rose-50/40 rounded-2xl p-5 border border-rose-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-rose-900">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                        <h3 className="text-sm font-bold">Zona de Cuidado — Zerar Dados</h3>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Limpa livros locais, capítulos, cadernos de voz e anotações para iniciar um projeto completamente do zero. Recomendamos baixar o <strong>Backup Completo (.json)</strong> na aba <em>Obra & Backup</em> antes de prosseguir.
                      </p>
                    </div>

                    {!showResetBox && (
                      <button
                        type="button"
                        onClick={() => setShowResetBox(true)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-600 border border-rose-300 text-rose-700 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Zerar Dados...</span>
                      </button>
                    )}
                  </div>

                  {showResetBox && (
                    <div className="p-4 rounded-xl bg-white border border-rose-200 space-y-3">
                      <label className="block text-xs font-semibold text-rose-950">
                        Trava contra cliques acidentais: digite <span className="font-mono bg-rose-100 px-1.5 py-0.5 rounded">ZERAR</span> abaixo para habilitar a limpeza:
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <input
                          type="text"
                          value={resetConfirmationWord}
                          onChange={(e) => setResetConfirmationWord(e.target.value)}
                          placeholder="Digite ZERAR"
                          className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono uppercase focus:border-rose-500 focus:outline-hidden sm:w-44"
                        />
                        <button
                          type="button"
                          disabled={resetConfirmationWord.trim().toUpperCase() !== "ZERAR"}
                          onClick={() => {
                            onResetAllData();
                            setShowResetBox(false);
                            setResetConfirmationWord("");
                            onClose();
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-35 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Confirmar e Zerar Tudo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetBox(false);
                            setResetConfirmationWord("");
                          }}
                          className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
