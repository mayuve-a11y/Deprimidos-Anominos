import React, { useState } from "react";
import { ProjectTask, ProjectPhase } from "../types";
import { CheckCircle2, Circle, Clock, CheckSquare, Copy, Check, Filter, Sparkles, Plus } from "lucide-react";

interface ProjectRoadmapTabProps {
  tasks: ProjectTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Partial<ProjectTask>) => void;
}

export const ProjectRoadmapTab: React.FC<ProjectRoadmapTabProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
}) => {
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | "all">("all");
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPhase, setNewPhase] = useState<ProjectPhase>("fase1");

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const percentage = Math.round((completedCount / tasks.length) * 100);

  const filteredTasks = tasks.filter((t) => {
    if (selectedPhase === "all") return true;
    return t.phase === selectedPhase;
  });

  const phasesInfo: { id: ProjectPhase; name: string; tag: string }[] = [
    { id: "fase1", name: "Fase 1: Núcleo de Escrita Mãos Livres", tag: "Foco Imediato" },
    { id: "fase2", name: "Fase 2: Embasamento & Pesquisas Oficiais", tag: "Conhecimento" },
    { id: "fase3", name: "Fase 3: Publicação & Redes Sociais", tag: "Distribuição" },
    { id: "fase4", name: "Fase 4: Associação 'Depressivos Anônimos BH'", tag: "Missão Social" },
  ];

  const handleCopyForKeep = () => {
    const keepText = tasks
      .map((t) => `[${t.status === "completed" ? "X" : " "}] ${t.phaseName} - ${t.title}: ${t.description}`)
      .join("\n");
    navigator.clipboard.writeText(keepText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const phaseMap: Record<ProjectPhase, string> = {
      fase1: "Fase 1: Núcleo de Escrita Mãos Livres",
      fase2: "Fase 2: Embasamento & Pesquisas",
      fase3: "Fase 3: Publicação & Divulgação",
      fase4: "Fase 4: Associação de Apoio",
    };

    onAddTask({
      id: `custom-${Date.now()}`,
      phase: newPhase,
      phaseName: phaseMap[newPhase],
      title: newTitle.trim(),
      description: newDesc.trim() || "Tarefa personalizada adicionada ao projeto.",
      status: "in_progress",
      category: "Geral",
    });

    setNewTitle("");
    setNewDesc("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header do Mapa */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Controle Geral do Projeto
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Mapa de Tarefas e Memória do Projeto
            </h2>
            <p className="text-stone-600 text-sm max-w-2xl leading-relaxed">
              Este quadro guarda o roteiro completo que planejamos para a plataforma do escritor. Você pode marcar
              as tarefas conforme avançamos, adicionar novas ideias e exportar para o Google Keep com um clique.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              onClick={handleCopyForKeep}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-800" />}
              <span>{copied ? "Copiado para o Keep!" : "Copiar para Google Keep"}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Barra de Progresso Global */}
        <div className="mt-8 pt-6 border-t border-stone-100">
          <div className="flex justify-between items-center text-xs font-semibold text-stone-600 mb-2">
            <span>Progresso Geral da Plataforma</span>
            <span className="text-stone-900 font-bold">{percentage}% Concluído ({completedCount} de {tasks.length} etapas)</span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
            <div
              className="h-full bg-gradient-to-r from-amber-700 via-amber-600 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filtros por Fase */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar:
        </span>
        <button
          onClick={() => setSelectedPhase("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedPhase === "all"
              ? "bg-stone-900 text-white shadow-2xs"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Todas as Fases ({tasks.length})
        </button>

        {phasesInfo.map((p) => {
          const count = tasks.filter((t) => t.phase === p.id).length;
          const isSelected = selectedPhase === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPhase(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-amber-900 text-white shadow-2xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              {p.name.split(":")[0]} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de Tarefas por Fases */}
      <div className="space-y-4">
        {phasesInfo
          .filter((phase) => selectedPhase === "all" || selectedPhase === phase.id)
          .map((phase) => {
            const phaseTasks = tasks.filter((t) => t.phase === phase.id);
            if (phaseTasks.length === 0) return null;

            return (
              <div key={phase.id} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{phase.name}</h3>
                    <span className="text-xs text-amber-900 font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60">
                      {phase.tag}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-stone-500">
                    {phaseTasks.filter((t) => t.status === "completed").length} de {phaseTasks.length} concluídas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {phaseTasks.map((task) => {
                    const isDone = task.status === "completed";
                    return (
                      <div
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                          isDone
                            ? "bg-stone-50/60 border-stone-200/80 text-stone-500"
                            : "bg-white border-stone-300 hover:border-amber-600 shadow-2xs text-stone-900"
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 flex-shrink-0 text-amber-800 hover:scale-110 transition-transform"
                          title="Clique para alternar o status da tarefa"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-400 hover:text-amber-700" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-semibold text-sm ${isDone ? "line-through text-stone-500" : "text-stone-900"}`}>
                              {task.title}
                            </span>
                            <span
                              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-800"
                                  : task.status === "in_progress"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {isDone ? "Pronto" : task.status === "in_progress" ? "Em Ação" : "Previsto"}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">{task.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal para Adicionar Tarefa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Adicionar Nova Tarefa ao Projeto</h3>
            <p className="text-xs text-stone-500 mb-4">
              Acrescente um ponto de controle para acompanhar o progresso dos livros e ideias.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Fase do Projeto</label>
                <select
                  value={newPhase}
                  onChange={(e) => setNewPhase(e.target.value as ProjectPhase)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm bg-white"
                >
                  <option value="fase1">Fase 1: Núcleo de Escrita Mãos Livres</option>
                  <option value="fase2">Fase 2: Embasamento & Pesquisas</option>
                  <option value="fase3">Fase 3: Publicação & Divulgação</option>
                  <option value="fase4">Fase 4: Associação de Apoio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Título da Tarefa</label>
                <input
                  type="text"
                  placeholder="Ex: Revisar capítulo 2 com as anotações de fevereiro"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Descrição / Detalhes</label>
                <textarea
                  placeholder="Breve anotação sobre o que precisa ser feito..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
