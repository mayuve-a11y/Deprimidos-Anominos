import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth, testFirestoreConnection } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  saveUserProfile,
  subscribeToProjects,
  saveProjectToCloud,
  deleteProjectFromCloud,
  subscribeToChapters,
  saveChapterToCloud,
  deleteChapterFromCloud,
  subscribeToTasks,
  saveTaskToCloud,
  migrateLocalDataToCloud,
} from "./services/cloudStorage";
import { Header } from "./components/Header";
import { HandsFreeVoiceTab } from "./components/HandsFreeVoiceTab";
import { ManuscriptScanTab } from "./components/ManuscriptScanTab";
import { ChapterEditorTab } from "./components/ChapterEditorTab";
import { GoogleDocsModal } from "./components/GoogleDocsModal";
import { SettingsModal } from "./components/SettingsModal";
import { BookProject, Chapter, ProjectTask } from "./types";
import {
  INITIAL_PROJECTS,
  INITIAL_CHAPTERS,
  INITIAL_TASKS,
  SAMPLE_PROJECTS,
  SAMPLE_CHAPTERS,
} from "./data/initialData";
import { exportBookToDocx } from "./utils/docxExport";
import { Check, X, Plus } from "lucide-react";

const STORAGE_PROJECTS_KEY = "livro_app_projects_v2";
const STORAGE_CHAPTERS_KEY = "livro_app_chapters_v2";
const STORAGE_TASKS_KEY = "livro_app_tasks_v2";
const STORAGE_CURRENT_PROJECT_KEY = "livro_app_current_project_id_v2";

export default function App() {
  const [projects, setProjects] = useState<BookProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed: BookProject[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Desduplicar IDs se houver colisões de projetos com mesmo id
          const seen = new Set<string>();
          return parsed.map((p, idx) => {
            let id = p.id;
            if (seen.has(id)) {
              id = `${p.id}-${idx + 1}`;
            }
            seen.add(id);
            return { ...p, id };
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao ler projetos do localStorage:", e);
    }
    return INITIAL_PROJECTS;
  });

  const [currentProject, setCurrentProject] = useState<BookProject>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_CURRENT_PROJECT_KEY);
      const savedProjects = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (savedProjects) {
        const list: BookProject[] = JSON.parse(savedProjects);
        const match = list.find((p) => p.id === savedId);
        if (match) return match;
        if (list[0]) return list[0];
      }
    } catch (e) {
      console.warn("Erro ao ler projeto ativo do localStorage:", e);
    }
    return INITIAL_PROJECTS[0];
  });

  const [chapters, setChapters] = useState<Chapter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAPTERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Erro ao ler capítulos do localStorage:", e);
    }
    return INITIAL_CHAPTERS;
  });

  const [tasks, setTasks] = useState<ProjectTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TASKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Erro ao ler tarefas do localStorage:", e);
    }
    return INITIAL_TASKS;
  });

  const [activeTab, setActiveTab] = useState<string>("voice");
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [resetSeed, setResetSeed] = useState<number>(0);

  // Sincronizar dados principais no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn("Erro ao salvar projetos:", e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAPTERS_KEY, JSON.stringify(chapters));
    } catch (e) {
      console.warn("Erro ao salvar capítulos:", e);
    }
  }, [chapters]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn("Erro ao salvar tarefas:", e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CURRENT_PROJECT_KEY, currentProject.id);
    } catch (e) {
      console.warn("Erro ao salvar ID do projeto atual:", e);
    }
  }, [currentProject.id]);

  // Estado de Autenticação do Escritor
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Inicialização e Monitoramento de Conexão com Firebase
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        try {
          await saveUserProfile(user);
          const mig = await migrateLocalDataToCloud(user.uid, projects, chapters, tasks);
          if (mig.projectsMigrated > 0) {
            showToast(`✓ Seus dados locais foram sincronizados com sua conta na nuvem!`);
          }
        } catch (e) {
          console.warn("Erro ao registrar autor na nuvem:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Assinatura em Tempo Real do Banco de Dados Firestore (Multi-dispositivo)
  useEffect(() => {
    if (!currentUser) return;

    const unsubProjects = subscribeToProjects(currentUser.uid, (cloudProjects) => {
      if (cloudProjects && cloudProjects.length > 0) {
        setProjects(cloudProjects);
        setCurrentProject((curr) => {
          const match = cloudProjects.find((p) => p.id === curr.id);
          return match || cloudProjects[0];
        });
      }
    });

    const unsubChapters = subscribeToChapters(currentUser.uid, (cloudChapters) => {
      if (cloudChapters && cloudChapters.length > 0) {
        setChapters(cloudChapters);
      }
    });

    const unsubTasks = subscribeToTasks(currentUser.uid, (cloudTasks) => {
      if (cloudTasks && cloudTasks.length > 0) {
        setTasks(cloudTasks);
      }
    });

    return () => {
      unsubProjects();
      unsubChapters();
      unsubTasks();
    };
  }, [currentUser]);

  // Função para Zerar Todos os Dados (protegida por trava de segurança dentro de SettingsModal)
  const handleResetAllData = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("Erro ao limpar localStorage:", e);
    }

    setProjects(INITIAL_PROJECTS);
    setCurrentProject(INITIAL_PROJECTS[0]);
    setChapters(INITIAL_CHAPTERS);
    setTasks(INITIAL_TASKS);
    setResetSeed((s) => s + 1);
    setActiveTab("voice");
    showToast("✓ Todas as informações locais foram zeradas! Projeto pronto para iniciar do zero.");
  };

  // Função para Carregar Dados de Demonstração (confirmada dentro de SettingsModal)
  const handleLoadDemoData = () => {
    setProjects((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = SAMPLE_PROJECTS.filter((p) => !existingIds.has(p.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });

    setChapters((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const toAdd = SAMPLE_CHAPTERS.filter((c) => !existingIds.has(c.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });

    setCurrentProject(SAMPLE_PROJECTS[0]);
    setTasks(INITIAL_TASKS);
    showToast("✓ Obra de demonstração carregada com sucesso!");
  };

  // Atualizar metadados do livro selecionado
  const handleUpdateProject = (updated: BookProject) => {
    setCurrentProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (currentUser) {
      saveProjectToCloud(currentUser.uid, updated).catch(console.warn);
    }
    showToast("✓ Informações do livro atualizadas!");
  };

  // Excluir apenas o livro atual (quando há mais de um livro)
  const handleDeleteCurrentProject = () => {
    if (projects.length <= 1) return;
    const idToRemove = currentProject.id;
    const remainingProjects = projects.filter((p) => p.id !== idToRemove);
    const chaptersToRemove = chapters.filter((c) => c.bookId === idToRemove);
    const remainingChapters = chapters.filter((c) => c.bookId !== idToRemove);

    setProjects(remainingProjects);
    setChapters(remainingChapters);
    setCurrentProject(remainingProjects[0]);

    if (currentUser) {
      deleteProjectFromCloud(currentUser.uid, idToRemove).catch(console.warn);
      chaptersToRemove.forEach((c) => {
        deleteChapterFromCloud(currentUser.uid, c.id).catch(console.warn);
      });
    }
    showToast("Livro removido com segurança.");
  };

  // Exportar cópia de segurança completa (.json) para o computador do autor
  const handleExportBackupJson = () => {
    try {
      const backupPayload = {
        exportedAt: new Date().toISOString(),
        currentProjectId: currentProject.id,
        projects,
        chapters,
        tasks,
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `backup_estudio_literario_${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("✓ Cópia de segurança (.json) baixada no seu computador!");
    } catch (e) {
      console.error("Erro ao gerar backup JSON:", e);
      showToast("Não foi possível gerar o arquivo de backup.");
    }
  };

  // New book modal
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookSubtitle, setNewBookSubtitle] = useState("");
  const [newBookGenre, setNewBookGenre] = useState("");
  const [newBookSummary, setNewBookSummary] = useState("");

  // Google Docs Modal State
  const [showGoogleDocsModal, setShowGoogleDocsModal] = useState(false);
  const [googleDocsChapterId, setGoogleDocsChapterId] = useState<string | undefined>(undefined);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedEditorChapterId, setSelectedEditorChapterId] = useState<string>("");

  const handleOpenGoogleDocs = (chapterId?: string) => {
    setGoogleDocsChapterId(chapterId || selectedEditorChapterId || currentChapters[0]?.id);
    setShowGoogleDocsModal(true);
  };

  const handleSyncDocsComplete = (result: {
    projectUpdate?: Partial<BookProject>;
    chapterUpdate?: { id: string; update: Partial<Chapter> };
  }) => {
    if (result.projectUpdate) {
      const updatedProject: BookProject = {
        ...currentProject,
        ...result.projectUpdate,
      };
      setCurrentProject(updatedProject);
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
      if (currentUser) {
        saveProjectToCloud(currentUser.uid, updatedProject).catch(console.warn);
      }
    }

    if (result.chapterUpdate) {
      const { id, update } = result.chapterUpdate;
      setChapters((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const updated = { ...c, ...update };
          if (currentUser) {
            saveChapterToCloud(currentUser.uid, updated).catch(console.warn);
          }
          return updated;
        })
      );
    }

    showToast("✓ Sincronização com o Google Docs concluída com sucesso!");
  };

  const handleNavigateToChapter = (chapterId: string) => {
    setSelectedEditorChapterId(chapterId);
    setActiveTab("editor");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter chapters for current book
  const currentChapters = chapters.filter((c) => c.bookId === currentProject.id);

  // Toggle task status in Project Board
  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus: "completed" | "in_progress" | "planned" =
          t.status === "completed"
            ? "in_progress"
            : t.status === "in_progress"
            ? "planned"
            : "completed";
        const updatedTask: ProjectTask = { ...t, status: nextStatus };
        if (currentUser) {
          saveTaskToCloud(currentUser.uid, updatedTask).catch(console.warn);
        }
        return updatedTask;
      })
    );
  };

  const handleAddTask = (newTask: Partial<ProjectTask>) => {
    const fullTask = newTask as ProjectTask;
    setTasks((prev) => [fullTask, ...prev]);
    if (currentUser) {
      saveTaskToCloud(currentUser.uid, fullTask).catch(console.warn);
    }
    showToast("Nova tarefa adicionada ao Mapa do Projeto!");
  };

  // Add text snippet into existing chapter
  const handleAddTextToChapter = (chapterId: string, text: string) => {
    const targetChap = chapters.find((c) => c.id === chapterId);
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id !== chapterId) return c;
        const updatedContent = c.content ? `${c.content}\n\n${text.trim()}` : text.trim();
        const updatedChap = {
          ...c,
          content: updatedContent,
          wordCount: updatedContent.split(/\s+/).filter(Boolean).length,
          lastUpdated: "Agora mesmo",
        };
        if (currentUser) {
          saveChapterToCloud(currentUser.uid, updatedChap).catch(console.warn);
        }
        return updatedChap;
      })
    );
    if (targetChap) {
      showToast(`✓ Inserido exclusivamente no Capítulo ${targetChap.number}: "${targetChap.title}"!`);
    } else {
      showToast("Trecho anexado ao capítulo com sucesso!");
    }
  };

  // Create new chapter from Voice or OCR
  const handleCreateNewChapterFromVoiceOrScan = (title: string, content: string) => {
    const nextNumber = currentChapters.length + 1;
    const newId = `chap-${Date.now()}`;
    const newChap: Chapter = {
      id: newId,
      bookId: currentProject.id,
      number: nextNumber,
      title,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      lastUpdated: "Agora mesmo",
    };
    setChapters((prev) => [...prev, newChap]);
    if (currentUser) {
      saveChapterToCloud(currentUser.uid, newChap).catch(console.warn);
    }
    setSelectedEditorChapterId(newId);
    setActiveTab("editor");
    showToast(`Capítulo ${nextNumber}: "${title}" criado com sucesso!`);
  };

  // Chapter updates from editor
  const handleUpdateChapter = (updated: Chapter) => {
    setChapters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (currentUser) {
      saveChapterToCloud(currentUser.uid, updated).catch(console.warn);
    }
  };

  const handleAddBlankChapter = () => {
    const nextNumber = currentChapters.length + 1;
    const newChap: Chapter = {
      id: `chap-${Date.now()}`,
      bookId: currentProject.id,
      number: nextNumber,
      title: `Capítulo ${nextNumber}`,
      content: "Comece a ditar por voz ou anexe memórias deste novo capítulo...",
      lastUpdated: "Agora mesmo",
    };
    setChapters((prev) => [...prev, newChap]);
    if (currentUser) {
      saveChapterToCloud(currentUser.uid, newChap).catch(console.warn);
    }
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (confirm("Tem certeza que deseja remover este capítulo?")) {
      setChapters((prev) => prev.filter((c) => c.id !== chapterId));
      if (currentUser) {
        deleteChapterFromCloud(currentUser.uid, chapterId).catch(console.warn);
      }
      showToast("Capítulo removido.");
    }
  };

  // Create new project
  const handleCreateNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const newProj: BookProject = {
      id: `book-${Date.now()}`,
      title: newBookTitle.trim(),
      subtitle: newBookSubtitle.trim() || "Nova Obra Literária",
      status: "writing",
      statusLabel: "Obra em Andamento",
      genre: newBookGenre.trim() || "Memórias & Reflexões",
      summary: newBookSummary.trim() || "Projeto literário em desenvolvimento.",
      chaptersCount: 1,
      lastEdited: "Hoje",
      accentColor: "border-amber-700/60 bg-amber-50/40 text-amber-900",
    };

    const firstChap: Chapter = {
      id: `chap-${Date.now()}`,
      bookId: newProj.id,
      number: 1,
      title: "Prólogo: O Começo da Travessia",
      content: "Escreva aqui a abertura desta nova obra...",
      lastUpdated: "Agora mesmo",
    };

    setProjects((prev) => [newProj, ...prev]);
    setChapters((prev) => [...prev, firstChap]);
    setCurrentProject(newProj);
    if (currentUser) {
      saveProjectToCloud(currentUser.uid, newProj).catch(console.warn);
      saveChapterToCloud(currentUser.uid, firstChap).catch(console.warn);
    }
    setShowNewBookModal(false);
    setNewBookTitle("");
    setNewBookSubtitle("");
    setNewBookGenre("");
    setNewBookSummary("");
    showToast(`Livro "${newProj.title}" iniciado com sucesso!`);
  };

  // Quick export Word (.docx)
  const handleQuickExport = async () => {
    try {
      showToast("Gerando arquivo Microsoft Word (.docx)...");
      await exportBookToDocx(
        currentProject.title,
        currentProject.subtitle,
        currentChapters.map((c) => ({
          number: c.number,
          title: c.title,
          subtitle: c.subtitle,
          content: c.content,
          footnotes: c.footnotes,
        }))
      );
      showToast("Download do arquivo .docx concluído!");
    } catch (err) {
      console.error(err);
      showToast("Falha ao exportar o livro para Word.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-800 flex flex-col font-sans">
      {/* Header com Navegação, Seletor de Livros e Engrenagem de Configurações */}
      <Header
        currentProject={currentProject}
        projects={projects}
        onSelectProject={(p) => {
          setCurrentProject(p);
          showToast(`Alternado para: ${p.title}`);
        }}
        onNewProject={() => setShowNewBookModal(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setShowSettingsModal(true)}
        user={currentUser}
        authLoading={authLoading}
      />

      {/* Conteúdo da Aba Ativa */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className={activeTab === "voice" ? "block" : "hidden"}>
          <HandsFreeVoiceTab
            key={`${currentProject.id}-${resetSeed}`}
            currentProject={currentProject}
            chapters={currentChapters}
            onAddTextToChapter={handleAddTextToChapter}
            onCreateNewChapterFromVoice={handleCreateNewChapterFromVoiceOrScan}
            onUpdateChapter={handleUpdateChapter}
            onNavigateToChapter={handleNavigateToChapter}
          />
        </div>

        {activeTab === "ocr" && (
          <ManuscriptScanTab
            key={currentProject.id}
            chapters={currentChapters}
            onAddTextToChapter={handleAddTextToChapter}
            onCreateNewChapter={handleCreateNewChapterFromVoiceOrScan}
          />
        )}

        {activeTab === "editor" && (
          <ChapterEditorTab
            key={currentProject.id}
            currentProject={currentProject}
            chapters={currentChapters}
            selectedChapterId={selectedEditorChapterId}
            onSelectChapter={setSelectedEditorChapterId}
            onUpdateChapter={handleUpdateChapter}
            onAddChapter={handleAddBlankChapter}
            onDeleteChapter={handleDeleteChapter}
            onOpenGoogleDocsModal={() => handleOpenGoogleDocs(selectedEditorChapterId)}
          />
        )}
      </main>

      {/* Rodapé Tranquilo e Discreto */}
      <footer className="border-t border-stone-200/80 bg-stone-100/50 py-6 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Estúdio Literário • Escrita Confessional & Memórias</span>
          <span>Compatível com Microsoft Word (.docx)</span>
        </div>
      </footer>

      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-amber-100 px-4 py-3 rounded-2xl shadow-xl border border-stone-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Criar Novo Livro */}
      {showNewBookModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-stone-900">Iniciar Novo Livro / Projeto</h3>
              <button
                onClick={() => setShowNewBookModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Cada livro tem seus próprios capítulos, notas de voz, fotos de manuscritos e exportação própria para Word.
            </p>

            <form onSubmit={handleCreateNewBook} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Título da Obra
                </label>
                <input
                  type="text"
                  placeholder="Ex: As Marcas da Linha de Frente"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Subtítulo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Memórias de um Policial e a Busca pela Recuperação"
                  value={newBookSubtitle}
                  onChange={(e) => setNewBookSubtitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Gênero Literário
                </label>
                <input
                  type="text"
                  placeholder="Ex: Memórias Confessionais, Autoajuda, Ensaio Policial"
                  value={newBookGenre}
                  onChange={(e) => setNewBookGenre(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Sinopse / Intenção do Livro
                </label>
                <textarea
                  placeholder="Sobre o que este livro falará..."
                  value={newBookSummary}
                  onChange={(e) => setNewBookSummary(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Livro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Configurações, Mapa do Projeto e Segurança */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentProject={currentProject}
        projectsCount={projects.length}
        chapters={currentChapters}
        tasks={tasks}
        user={currentUser}
        onUpdateProject={handleUpdateProject}
        onDeleteCurrentProject={handleDeleteCurrentProject}
        onToggleTask={handleToggleTask}
        onAddTask={handleAddTask}
        onQuickExportDocx={handleQuickExport}
        onExportBackupJson={handleExportBackupJson}
        onOpenGoogleDocs={() => handleOpenGoogleDocs()}
        onLoadDemoData={handleLoadDemoData}
        onResetAllData={handleResetAllData}
      />

      {/* Modal de Integração Google Docs & Drive */}
      <GoogleDocsModal
        isOpen={showGoogleDocsModal}
        onClose={() => setShowGoogleDocsModal(false)}
        project={currentProject}
        chapters={currentChapters}
        selectedChapter={
          chapters.find((c) => c.id === googleDocsChapterId) ||
          chapters.find((c) => c.id === selectedEditorChapterId) ||
          currentChapters[0]
        }
        onSyncComplete={handleSyncDocsComplete}
      />
    </div>
  );
}
