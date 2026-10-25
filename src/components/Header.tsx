import React from "react";
import { User } from "firebase/auth";
import { BookProject } from "../types";
import { BookOpen, Mic, Camera, FileText, ChevronDown, Plus, Settings } from "lucide-react";
import { UserProfileMenu } from "./UserProfileMenu";

interface HeaderProps {
  currentProject: BookProject;
  projects: BookProject[];
  onSelectProject: (project: BookProject) => void;
  onNewProject: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSettings: () => void;
  user?: User | null;
  authLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onNewProject,
  activeTab,
  onSelectTab,
  onOpenSettings,
  user = null,
  authLoading = false,
}) => {
  const [projectMenuOpen, setProjectMenuOpen] = React.useState(false);

  const tabs = [
    { id: "voice", label: "Estúdio de Voz", icon: Mic },
    { id: "editor", label: "Capítulos do Livro", icon: FileText },
    { id: "ocr", label: "Ler Agendas & Fotos", icon: Camera },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-stone-200/80">
      {/* Top Bar Limpa: Identidade, Seletor da Obra, Conta e Engrenagem de Configurações */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight leading-tight">
              Estúdio Literário
            </h1>
            <p className="text-xs text-stone-500 hidden sm:block">
              Voz, Memória e Escrita Confessional
            </p>
          </div>
        </div>

        {/* Seletor do Livro Atual (Apenas Livros do Autor + Novo Livro) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-stone-300/80 text-stone-800 text-sm hover:border-amber-700/50 transition-colors cursor-pointer"
            title="Alternar entre suas obras ou criar novo livro"
          >
            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0"></span>
            <div className="text-left">
              <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                Livro Atual
              </div>
              <div className="font-semibold text-stone-900 max-w-[180px] sm:max-w-[240px] truncate text-xs sm:text-sm">
                {currentProject.title}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-stone-400 ml-1 shrink-0" />
          </button>

          {projectMenuOpen && (
            <div className="absolute right-0 sm:left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50">
              <div className="px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Suas Obras
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(p);
                      setProjectMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-sm transition-colors flex items-start gap-2.5 cursor-pointer ${
                      p.id === currentProject.id
                        ? "bg-amber-50/80 border border-amber-200 text-amber-950 font-medium"
                        : "hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="mt-0.5">
                      <BookOpen className="w-4 h-4 text-amber-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{p.title}</div>
                      <div className="text-xs text-stone-500 truncate">{p.statusLabel}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2 mt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    onNewProject();
                    setProjectMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-amber-950 bg-amber-100/70 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Iniciar Novo Livro / Projeto</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canto Direito: Conta do Autor + Engrenagem de Configurações */}
        <div className="flex items-center gap-2">
          <UserProfileMenu
            user={user}
            authLoading={authLoading}
            onOpenSettings={onOpenSettings}
          />

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-700 hover:text-stone-950 text-xs font-semibold transition-colors cursor-pointer"
            title="Configurações, Mapa do Projeto, Backup e Segurança"
            aria-label="Abrir Configurações"
          >
            <Settings className="w-4 h-4 text-stone-600" />
            <span className="hidden md:inline">Configurações</span>
          </button>
        </div>
      </div>

      {/* Abas Principais de Criação */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 border-t border-stone-200/60 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-amber-900 text-white"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-200" : "text-stone-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

