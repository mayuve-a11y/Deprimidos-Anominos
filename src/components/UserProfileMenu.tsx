import React, { useState } from "react";
import { User } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import {
  Cloud,
  CloudOff,
  LogOut,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Settings,
} from "lucide-react";

interface UserProfileMenuProps {
  user: User | null;
  authLoading: boolean;
  onLoginSuccess?: () => void;
  onLogoutSuccess?: () => void;
  onOpenSettings?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  authLoading,
  onLoginSuccess,
  onLogoutSuccess,
  onOpenSettings,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error("Falha no login com Google:", err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setAuthError("Não foi possível conectar. Tente novamente.");
        setTimeout(() => setAuthError(null), 4000);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      if (onLogoutSuccess) onLogoutSuccess();
    } catch (err: any) {
      console.error("Erro ao desconectar:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
        <span>Verificando...</span>
      </div>
    );
  }

  // Usuário Não Autenticado (Modo Local)
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden lg:inline-flex items-center gap-1.5 text-stone-400 text-xs">
          <CloudOff className="w-3.5 h-3.5 text-stone-400" />
          <span>Modo Local</span>
        </span>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-300 hover:border-amber-700 text-stone-800 hover:text-amber-900 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          title={authError || "Fazer login com o Google para salvar e sincronizar seus livros na nuvem"}
        >
          {isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Entrar com Google</span>
        </button>
      </div>
    );
  }

  // Usuário Autenticado
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-amber-700/50 transition-colors text-left cursor-pointer"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "Autor"}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-700/30"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-amber-900 text-amber-100 flex items-center justify-center font-bold text-xs">
            {user.displayName ? user.displayName[0].toUpperCase() : "A"}
          </div>
        )}

        <div className="hidden md:block text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-900 max-w-[120px] truncate">
              {user.displayName || "Escritor"}
            </span>
            <span
              className="inline-block w-2 h-2 rounded-full bg-emerald-500"
              title="Sincronizado na Nuvem"
            />
          </div>
          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
            <Cloud className="w-2.5 h-2.5" />
            <span>Nuvem Ativa</span>
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
      </button>

      {/* Dropdown do Autor */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-50">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Autor"}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-700/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-900 text-amber-100 flex items-center justify-center font-bold text-sm">
                {user.displayName ? user.displayName[0].toUpperCase() : "A"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-stone-900 truncate">
                {user.displayName || "Escritor"}
              </div>
              <div className="text-xs text-stone-500 truncate">{user.email}</div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Sincronizado na nuvem</span>
              </div>
            </div>
          </div>

          {onOpenSettings && (
            <div className="py-1.5 border-b border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-stone-500" />
                <span>Configurações e Segurança</span>
              </button>
            </div>
          )}

          <div className="pt-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Desconectar da Conta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

