import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { Shield, User, LogOut, Database, RefreshCw, ChevronDown, Check, Wifi, WifiOff } from 'lucide-react';

interface TopBarProps {
  onOpenSupabaseModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSupabaseModal }) => {
  const {
    currentUser,
    profiles,
    switchUser,
    logout,
    resetToInitialData,
    supabaseConnected,
    filaOffline,
    isOnline,
    toggleModoOffline
  } = useTurnoCerto();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            TurnoCerto
          </span>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Ponto Mobile & Holerite
          </span>
        </div>

        {/* Zone 2: Navigation / Supabase Status & Offline */}
        <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
          <button
            onClick={toggleModoOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              !isOnline
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Clique para alternar teste de subsolo/offline"
          >
            {!isOnline ? <WifiOff className="w-3.5 h-3.5 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{!isOnline ? 'Subsolo (Offline)' : 'Online'}</span>
            {filaOffline.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                {filaOffline.length}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSupabaseModal}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap text-xs"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Supabase: {supabaseConnected ? 'Conectado' : 'Configurado'}</span>
          </button>
          <button
            onClick={resetToInitialData}
            title="Reiniciar dados da demonstração"
            className="flex items-center gap-1 hover:text-slate-900 transition-colors text-xs text-slate-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>

        {/* Zone 3: User Profile & Switcher */}
        <div className="relative flex items-center gap-3 shrink-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
          >
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
                {currentUser.full_name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block text-xs">
              <p className="font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                {currentUser.full_name}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">
                {currentUser.role === 'supervisor' ? 'Supervisão' : 'Funcionário'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          <button
            onClick={logout}
            title="Sair do TurnoCerto"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* User Switcher Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-40">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">Alternar Perfil Demo</p>
                  <p className="text-[11px] text-slate-500">
                    Teste rápido dos papéis e regras do Módulo 1
                  </p>
                </div>
                <div className="py-1 space-y-1">
                  {profiles.map((p) => {
                    const isCurrent = p.id === currentUser.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchUser(p);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                          isCurrent
                            ? 'bg-slate-900 text-white'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${isCurrent ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {p.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate leading-tight">{p.full_name}</p>
                          <p className={`text-[10px] truncate ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                            {p.cargo || (p.role === 'supervisor' ? 'Supervisora Geral' : 'Funcionário')}
                            {!p.primeiro_acesso_concluido && ' · 📸 1º Acesso'}
                            {p.disponivel_ft && ' · ⚡ FT'}
                          </p>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-slate-100 mt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenSupabaseModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded"
                  >
                    <Database className="w-3 h-3" />
                    <span>Ver Script SQL & Conexão Supabase</span>
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
