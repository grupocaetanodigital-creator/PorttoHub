import React, { useState } from 'react';
import { Shield, KeyRound, Mail, UserCheck, ArrowRight, Sparkles, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginScreen: React.FC = () => {
  const { loginAsSupervisor, loginAsOperacional, adminCredentials } = useApp();

  const [activeProfileTab, setActiveProfileTab] = useState<'operacional' | 'supervisor'>('supervisor');
  
  // Operacional inputs
  const [cpfOrMatricula, setCpfOrMatricula] = useState('123.456.789-00');
  
  // Supervisor / Admin inputs (Pre-configured with requested credentials)
  const [loginOrEmail, setLoginOrEmail] = useState(adminCredentials.login || 'caetano');
  const [senha, setSenha] = useState(adminCredentials.password || '6814871984@Lm');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeProfileTab === 'supervisor') {
      loginAsSupervisor(loginOrEmail, senha);
    } else {
      loginAsOperacional(cpfOrMatricula);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              Turno<span className="text-blue-500">Certo</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase mt-0.5">
              PorttoHub &bull; Facilities & Portaria
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Plataforma mobile executiva para gestão de postos, escalas e folha de pagamento em tempo real.
          </p>
        </div>

        {/* Profile Selector Tabs */}
        <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => setActiveProfileTab('operacional')}
            className={`flex-1 min-h-[46px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeProfileTab === 'operacional'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Colaborador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProfileTab('supervisor')}
            className={`flex-1 min-h-[46px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeProfileTab === 'supervisor'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Administrador / Gestor</span>
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeProfileTab === 'operacional' ? (
              /* Operacional Profile Form */
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white">Login do Colaborador Operacional</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Acesse com seu CPF cadastrado ou número de matrícula.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    CPF ou Matrícula
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={cpfOrMatricula}
                      onChange={(e) => setCpfOrMatricula(e.target.value)}
                      placeholder="000.000.000-00 ou TC-1042"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 text-[11px] text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Conta teste: <strong>Marcos Silva (Porteiro Líder)</strong></span>
                </div>
              </div>
            ) : (
              /* Supervisor / Admin Profile Form */
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Login Administrativo (ADM)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Acesso restrito para Caetano / Gestão Geral
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    ADM
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Usuário / Login Corporativo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginOrEmail}
                      onChange={(e) => setLoginOrEmail(e.target.value)}
                      placeholder="caetano"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Senha de Acesso
                    </label>
                    <span className="text-[10px] text-slate-400">Padronizada no código</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showPassword ? 'Ocultar Senha' : 'Ver Senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/30 text-[11px] text-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Login: <strong className="text-white font-mono">{adminCredentials.login}</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Senha gravada
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer mt-4"
            >
              <span>{activeProfileTab === 'supervisor' ? 'Entrar como Administrador' : 'Acessar Meu Turno'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fast Access */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 mb-2 font-medium">Acesso Rápido para Avaliação:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginAsSupervisor('caetano', adminCredentials.password)}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>👔 Entrar ADM (Caetano)</span>
              </button>
              <button
                type="button"
                onClick={() => loginAsOperacional()}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>👤 Entrar Colaborador</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-slate-600" />
          <span>Credenciais ADM Seguras &bull; Versão Mobile PWA v2.5</span>
        </div>
      </div>
    </div>
  );
};
