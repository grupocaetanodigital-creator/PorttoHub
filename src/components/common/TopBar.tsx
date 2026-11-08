import React, { useState } from 'react';
import { 
  LogOut, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  Database, 
  Bell, 
  UserCheck, 
  KeyRound, 
  ChevronDown 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSupabaseConfigured } from '../../lib/supabase';

interface TopBarProps {
  onOpenSupabaseConfig?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSupabaseConfig }) => {
  const { 
    currentUser, 
    logout, 
    isMobileFrame, 
    setIsMobileFrame, 
    switchRoleView, 
    turnos, 
    setIsChangePasswordModalOpen 
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);

  // Count empty posts for notification
  const emptyPostsCount = turnos.filter(t => t.status === 'vazio').length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Supervisor Profile & Online status */}
        <div 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Supervisor'}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30 shadow-sm"
            />
            {/* Green Online status pulse */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
          </div>

          <div className="leading-tight text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                {currentUser?.cargo || 'Administrador ADM'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </div>
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1">
              <span>{currentUser?.name || 'Caetano'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Notifications / Empty Posts bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {}}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {emptyPostsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>
          </div>

          {/* Quick toggle between Mobile Frame & Fullscreen */}
          <button
            type="button"
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMobileFrame ? 'Modo Tela Cheia' : 'Simular Moldura de Celular'}
          >
            {isMobileFrame ? <Monitor className="w-4 h-4 text-blue-400" /> : <Smartphone className="w-4 h-4" />}
          </button>

          {/* Botão de Trocar Senha Rápido */}
          <button
            type="button"
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-amber-300 hover:bg-slate-800/90 border border-slate-700/60 transition-colors"
            title="Trocar Senha de Acesso"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
          </button>

          {/* Botão de Sair (Logout) Direto */}
          <button
            type="button"
            onClick={logout}
            className="h-9 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
            title="Encerrar Sessão (Sair)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>

          {/* Role switcher & User Menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-4 top-14 w-60 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-left">
                <div className="px-3.5 py-2.5 border-b border-slate-800">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Login: <strong className="text-white font-mono">{currentUser?.username || 'caetano'}</strong>
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Nível: ADM Master
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsChangePasswordModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 text-amber-300 hover:bg-slate-800 transition-colors font-medium"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Trocar Senha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      switchRoleView('operacional');
                    }}
                    className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Simular Visão Colaborador</span>
                  </button>

                  {onOpenSupabaseConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenSupabaseConfig();
                      }}
                      className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Database className="w-4 h-4 text-purple-400" />
                      <span>Configurar Supabase</span>
                      <span className={`ml-auto w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 text-red-400 hover:bg-red-500/10 transition-colors font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair do Aplicativo</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
