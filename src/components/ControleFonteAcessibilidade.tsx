import React, { useState, useEffect } from 'react';
import { Type, ZoomIn, ZoomOut, RotateCcw, Check, Sun, Moon, GitBranch, RefreshCw } from 'lucide-react';
import { 
  obterEscalaFonteAtual, 
  aplicarEscalaFonte, 
  aumentarFonte, 
  diminuirFonte, 
  NivelEscalaFonte, 
  OPCOES_ESCALA_FONTE 
} from '../services/fontScaleService';
import { forcarAtualizacaoPwa } from '../services/pwaUpdateService';
import { obterTemaAtual, alternarTema, TipoTema } from '../services/themeService';
import { VERSAO_BUILD_ATUAL } from '../services/versaoService';

export default function ControleFonteAcessibilidade() {
  const [escala, setEscala] = useState<NivelEscalaFonte>(100);
  const [menuAberto, setMenuAberto] = useState(false);
  const [tema, setTema] = useState<TipoTema>(() => obterTemaAtual());
  const [atualizandoGithub, setAtualizandoGithub] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setEscala(obterEscalaFonteAtual());

    const handleMudanca = (e: any) => {
      if (e.detail?.escala) {
        setEscala(e.detail.escala);
      }
    };

    const handleTema = (e: any) => {
      if (e.detail?.tema) {
        setTema(e.detail.tema);
      }
    };

    window.addEventListener('infport_escala_fonte_alterada', handleMudanca);
    window.addEventListener('infport_tema_alterado', handleTema);
    return () => {
      window.removeEventListener('infport_escala_fonte_alterada', handleMudanca);
      window.removeEventListener('infport_tema_alterado', handleTema);
    };
  }, []);

  const handleAumentar = () => {
    const nova = aumentarFonte();
    setEscala(nova);
  };

  const handleDiminuir = () => {
    const nova = diminuirFonte();
    setEscala(nova);
  };

  const handleSelecionarNivel = (nivel: NivelEscalaFonte) => {
    aplicarEscalaFonte(nivel);
    setEscala(nivel);
    setMenuAberto(false);
  };

  const handlePuxarAtualizacaoGithub = async () => {
    setAtualizandoGithub(true);
    setStatusMsg('Puxando atualização do GitHub...');
    try {
      // Tenta checar o último commit do GitHub ou dispara bypass de cache imediatamente
      try {
        await fetch(`https://api.github.com/repos/grupocaetanodigital-creator/PorttoHub/commits/main?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        }).catch(() => null);
      } catch {}

      setStatusMsg('Limpando cache e atualizando...');
      setTimeout(async () => {
        await forcarAtualizacaoPwa();
      }, 500);
    } catch (e) {
      console.warn('Erro ao puxar atualização:', e);
      await forcarAtualizacaoPwa();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Botão Elegante do Menu de Acessibilidade, Fonte, Tema e Atualizações */}
      <button
        type="button"
        onClick={() => setMenuAberto(!menuAberto)}
        title="Menu de Ajustes: Tamanho da Fonte, Modo Claro/Escuro e Atualizar do GitHub"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-700 border border-slate-700 dark:border-slate-600 text-slate-200 hover:text-emerald-400 text-xs font-bold transition shadow-2xs cursor-pointer"
      >
        <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-mono text-[11px]">{escala}%</span>
        {tema === 'claro' ? (
          <Sun className="w-3 h-3 text-amber-400 shrink-0" />
        ) : (
          <Moon className="w-3 h-3 text-emerald-400 shrink-0" />
        )}
      </button>

      {/* Menu Flutuante Completo */}
      {menuAberto && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setMenuAberto(false)} 
          />
          <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Tamanho da Fonte
              </span>
              <button
                type="button"
                onClick={() => handleSelecionarNivel(100)}
                className="text-[10px] text-slate-400 hover:text-emerald-500 flex items-center gap-1 transition cursor-pointer"
                title="Restaurar padrão 100%"
              >
                <RotateCcw className="w-2.5 h-2.5" /> 100%
              </button>
            </div>

            {/* Botoes Rapidos Menos / Mais */}
            <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl my-2">
              <button
                type="button"
                onClick={handleDiminuir}
                disabled={escala <= 100}
                className="flex-1 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" /> A-
              </button>
              <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 px-1">{escala}%</span>
              <button
                type="button"
                onClick={handleAumentar}
                disabled={escala >= 140}
                className="flex-1 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" /> A+
              </button>
            </div>

            {/* Opções de Escala de Fonte */}
            <div className="space-y-1">
              {OPCOES_ESCALA_FONTE.map(opcao => {
                const ativo = escala === opcao.nivel;
                return (
                  <button
                    key={opcao.nivel}
                    type="button"
                    onClick={() => handleSelecionarNivel(opcao.nivel)}
                    className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                      ativo 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{opcao.rotulo}</span>
                    {ativo && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Alternador Modo Claro / Modo Escuro e Puxar do GitHub */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              {/* Alternador Modo Claro / Modo Escuro */}
              <button
                type="button"
                onClick={() => {
                  alternarTema();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  tema === 'claro'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
                }`}
                title="Alternar entre Modo Claro e Modo Escuro"
              >
                <div className="flex items-center gap-2">
                  {tema === 'claro' ? (
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>{tema === 'claro' ? 'Modo Claro Ativo' : 'Modo Escuro Ativo'}</span>
                </div>
                <span className="text-[9px] font-mono uppercase bg-black/10 dark:bg-black/30 px-1.5 py-0.5 rounded text-current">
                  {tema === 'claro' ? 'Claro' : 'Escuro'}
                </span>
              </button>

              {/* Botão de Forçar Puxar Atualização Direto do GitHub */}
              <button
                type="button"
                onClick={handlePuxarAtualizacaoGithub}
                disabled={atualizandoGithub}
                className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-between gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                title="Forçar o app a puxar a última versão do sistema, limpar cache e atualizar sem deslogar"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${atualizandoGithub ? 'animate-spin' : ''} shrink-0`} />
                  <span className="leading-tight">
                    {atualizandoGithub ? 'Atualizando...' : 'Atualizar'}
                  </span>
                </div>
                <GitBranch className="w-3.5 h-3.5 opacity-80 shrink-0" />
              </button>

              {statusMsg && (
                <p className="text-[10px] text-emerald-500 dark:text-emerald-400 text-center font-semibold pt-1">
                  {statusMsg}
                </p>
              )}

              <div className="pt-1 text-center">
                <span className="text-[9px] text-slate-400 font-mono">
                  Build: {VERSAO_BUILD_ATUAL}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
