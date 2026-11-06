import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { Shield, Lock, User, ArrowRight, Camera, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { SEED_PROFILES } from '../lib/supabase';

export const LoginScreen: React.FC<{ onOpenSupabaseModal: () => void }> = ({ onOpenSupabaseModal }) => {
  const { login, switchUser } = useTurnoCerto();
  const [identifier, setIdentifier] = useState('111.222.333-44'); // Default to Renata for quick testing
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState<string | null>(null);

  // Helper mask for CPF
  const formatCPF = (val: string) => {
    // Only format if digits
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (val.includes('@')) return val; // allow email typing
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError('Informe seu CPF ou E-mail corporativo cadastrado.');
      return;
    }
    const ok = login(identifier);
    if (!ok) {
      setError('Credencial não encontrada. Utilize um dos botões de acesso rápido abaixo para testar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle backdrop grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          TurnoCerto
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Módulo 1 · Gestão Operacional de Postos & Fechamento
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold text-slate-300">
                CPF ou E-mail Corporativo
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(formatCPF(e.target.value))}
                  placeholder="000.000.000-00 ou email@empresa.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono"
                />
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                  Senha Operacional
                </label>
                <span className="text-[11px] text-slate-500">Padrão Supabase</span>
              </div>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Acessar Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Perfis Rápidos de Demonstração (Módulo 1) */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">
                Acesso Rápido para Avaliação
              </span>
              <span className="text-[10px] text-amber-400 font-mono">1-Clique</span>
            </div>

            <div className="space-y-2">
              {/* Perfil 1: Supervisora */}
              <button
                type="button"
                onClick={() => switchUser(SEED_PROFILES[0])}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition-colors flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 border border-indigo-500/20">
                  👑
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Dra. Renata Albuquerque
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Supervisora · Alerta de Posto Vazio & Fechamento FT
                  </p>
                </div>
              </button>

              {/* Perfil 2: Funcionário Regular */}
              <button
                type="button"
                onClick={() => switchUser(SEED_PROFILES[1])}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition-colors flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-500/20">
                  🟢
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Carlos Eduardo Santos
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Funcionário no Posto · Bater Ponto GPS & Atestado
                  </p>
                </div>
              </button>

              {/* Perfil 3: Funcionário Folguista Escalado Cobertura */}
              <button
                type="button"
                onClick={() => switchUser(SEED_PROFILES[2])}
                className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition-colors flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 border border-amber-500/20">
                  🔄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Tiago Santos (Folguista)
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Escalado Cobertura · Bate entrada e vira ⚡ FT
                  </p>
                </div>
              </button>

              {/* Perfil 4: Novo Acesso com Câmera Facial Obrigatória */}
              <button
                type="button"
                onClick={() => switchUser(SEED_PROFILES[4])}
                className="w-full p-2.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg text-left transition-colors flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-300 group-hover:text-amber-200 transition-colors">
                    Marcos Silva (1º Acesso)
                  </p>
                  <p className="text-[11px] text-amber-400/80 truncate">
                    Testar Tela 02: Captura Obrigatória de Foto Facial
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="text-[11px] text-slate-400 hover:text-white transition-colors underline"
              >
                Configuração do Supabase & Script SQL (PostgreSQL)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
