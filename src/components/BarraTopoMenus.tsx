import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  User, 
  KeyRound, 
  LogOut, 
  Zap, 
  GitBranch, 
  ChevronDown, 
  CheckCircle2, 
  Menu, 
  X,
  Sliders,
  ShieldCheck,
  Building,
  Bell,
  Users
} from 'lucide-react';
import ControleFonteAcessibilidade from './ControleFonteAcessibilidade';
import { VERSAO_BUILD_ATUAL } from '../services/versaoService';
import BotaoNotificacoesLembretes from './BotaoNotificacoesLembretes';
import AlertaNoCondominioTopo from './AlertaNoCondominioTopo';

interface BarraTopoMenusProps {
  moduloId: string;
  tituloModulo: string;
  iconeModulo: React.ComponentType<{ className?: string }>;
  onVoltar: () => void;
  condominioNome?: string;
  condominioId?: string;
  operador: any;
  eAdmin?: boolean;
  eSindico?: boolean;
  onAbrirDoctor: () => void;
  onAbrirNotificacoes: () => void;
  onAbrirMeuPerfil: () => void;
  onAbrirVersaoInfo: () => void;
  onAbrirDrawerMobile?: () => void;
  onLogout: () => void;
  onNavegarModulo?: (modulo: string) => void;
}

export default function BarraTopoMenus({
  moduloId,
  tituloModulo,
  iconeModulo: IconeModulo,
  onVoltar,
  condominioNome,
  condominioId,
  operador,
  eAdmin,
  eSindico,
  onAbrirDoctor,
  onAbrirNotificacoes,
  onAbrirMeuPerfil,
  onAbrirVersaoInfo,
  onAbrirDrawerMobile,
  onLogout,
  onNavegarModulo
}: BarraTopoMenusProps) {
  const [menuSistemaAberto, setMenuSistemaAberto] = useState(false);
  const containerSistemaRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!menuSistemaAberto) return;

    const handleCliqueFora = (e: MouseEvent | TouchEvent) => {
      if (containerSistemaRef.current && !containerSistemaRef.current.contains(e.target as Node)) {
        setMenuSistemaAberto(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleCliqueFora);
      document.addEventListener('touchstart', handleCliqueFora);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleCliqueFora);
      document.removeEventListener('touchstart', handleCliqueFora);
    };
  }, [menuSistemaAberto]);

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-slate-800/80 transition-all">
      {/* Lado Esquerdo: Botão Voltar + Nome do Menu/Função */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Botão de Voltar para tela anterior */}
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-750 active:scale-95 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-300 dark:border-slate-700/80 hover:border-emerald-500/50 transition-all duration-150 cursor-pointer shadow-xs shrink-0 select-none group"
          title="Retornar à tela anterior"
          aria-label="Voltar à tela anterior"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs sm:text-sm font-bold tracking-tight">Voltar</span>
        </button>

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-850 shrink-0 hidden xs:block" />

        {/* Nome do Menu / Função Ativa com Ícone */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center justify-center">
            {IconeModulo && <IconeModulo className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {tituloModulo || 'Módulo'}
              </h1>
              <span className="hidden md:inline-flex text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Menu Ativo
              </span>
            </div>
            {condominioNome && (
              <p className="text-[10px] text-slate-400 truncate hidden sm:block max-w-[200px] lg:max-w-xs leading-none mt-0.5">
                {condominioNome}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lado Direito: Alertas, Sininho de Lembretes, Acessibilidade & Sistema */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Botão de Performance Redis (em telas maiores) */}
        <button
          type="button"
          onClick={onAbrirDoctor}
          className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
          title="Performance do Banco & Cache Redis"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-mono text-[10px]">Redis</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>

        {/* ALERTA DE PRESENTES NO CONDOMÍNIO (Visível em todos os menus) */}
        {condominioId && (
          <AlertaNoCondominioTopo
            condominioId={condominioId}
            onNavegar={() => onNavegarModulo ? onNavegarModulo('prestadores') : onAbrirDoctor()}
          />
        )}

        {/* SININHO DE LEMBRETES & NOTIFICAÇÕES (Visível em todos os menus) */}
        {condominioId && (
          <BotaoNotificacoesLembretes
            condominioId={condominioId}
            onAbrirPainel={onAbrirNotificacoes}
          />
        )}

        {/* BOTÃO DE ACESSIBILIDADE (No celular fica na barra de menu inferior) */}
        <div className="hidden sm:block shrink-0" title="Controles de Acessibilidade">
          <ControleFonteAcessibilidade />
        </div>

        {/* BOTÃO & MENU DE SISTEMA (Oculto no celular) */}
        <div ref={containerSistemaRef} className="hidden sm:inline-flex relative items-center">
          <button
            type="button"
            onClick={() => setMenuSistemaAberto(prev => !prev)}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer select-none ${
              menuSistemaAberto
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-750 hover:border-slate-600 text-slate-200 hover:text-white'
            }`}
            title="Ajustes e Opções de Sistema"
            aria-expanded={menuSistemaAberto}
          >
            <Sliders className={`w-3.5 h-3.5 ${menuSistemaAberto ? 'text-white' : 'text-emerald-400'} shrink-0`} />
            <span className="font-bold hidden xs:inline text-xs">Sistema</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden xs:inline" />
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${menuSistemaAberto ? 'rotate-180 text-white' : ''}`} />
          </button>

          {/* DROPDOWN DO SISTEMA */}
          {menuSistemaAberto && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-750 text-slate-200 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800"
            >
              {/* Cabeçalho do Menu Sistema: Operador Logado */}
              <div className="pb-2.5 px-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-black text-xs border border-slate-700 shrink-0">
                    {operador?.nome?.charAt(0) || 'P'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                      {operador?.nome || 'Operador'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate uppercase font-mono">
                      {eAdmin ? 'ADMIN MASTER' : (eSindico ? 'SÍNDICO' : (operador?.funcao || `NÍVEL ${operador?.nivel_acesso ?? 3}`))}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuSistemaAberto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status do Sistema e Condomínio Ativo */}
              <div className="py-2 px-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Status da Conexão
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-[10px]">Online & Sincronizado</span>
                </div>

                {condominioNome && (
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Building className="w-3 h-3 text-slate-500" /> Posto:
                    </span>
                    <span className="font-semibold text-slate-200 truncate max-w-[150px] text-right">
                      {condominioNome}
                    </span>
                  </div>
                )}
              </div>

              {/* Ações e Funções do Sistema */}
              <div className="py-2 space-y-1">
                {/* Lembretes e Notificações (Acesso rápido no mobile) */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuSistemaAberto(false);
                    onAbrirNotificacoes();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Lembretes & Mensagens</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Abrir</span>
                </button>

                {/* Doctor / Performance Redis */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuSistemaAberto(false);
                    onAbrirDoctor();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Cache Redis & Banco</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    &lt; 3ms
                  </span>
                </button>

                {/* Meu Perfil & Trocar Senha */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuSistemaAberto(false);
                    onAbrirMeuPerfil();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Meu Perfil & Alterar Senha</span>
                  </div>
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Abrir Menu Geral de Módulos (Drawer) se disponível */}
                {onAbrirDrawerMobile && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuSistemaAberto(false);
                      onAbrirDrawerMobile();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center justify-between cursor-pointer group md:hidden"
                  >
                    <div className="flex items-center gap-2.5">
                      <Menu className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Todos os Módulos (Menu)</span>
                    </div>
                  </button>
                )}

                {/* Versão e Repositório GitHub */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuSistemaAberto(false);
                    onAbrirVersaoInfo();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <GitBranch className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <span>Versão & GitHub</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    v{VERSAO_BUILD_ATUAL}
                  </span>
                </button>
              </div>

              {/* Botão de Logout / Sair do Sistema */}
              <div className="pt-2 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuSistemaAberto(false);
                    onLogout();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold text-red-300 hover:bg-red-950/40 hover:text-red-200 border border-red-900/30 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Encerrar Sessão</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono bg-red-900/40 px-1.5 py-0.5 rounded text-red-300">
                    Sair
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

