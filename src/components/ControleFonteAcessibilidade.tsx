import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Type, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Check, 
  Sun, 
  Moon, 
  GitBranch, 
  RefreshCw, 
  X,
  CheckCircle2
} from 'lucide-react';
import { 
  obterEscalaFonteAtual, 
  aplicarEscalaFonte, 
  aumentarFonte, 
  diminuirFonte, 
  NivelEscalaFonte, 
  OPCOES_ESCALA_FONTE 
} from '../services/fontScaleService';
import { obterTemaAtual, alternarTema, TipoTema } from '../services/themeService';
import { VERSAO_BUILD_ATUAL } from '../services/versaoService';
import { forcarAtualizacaoPwa } from '../services/pwaUpdateService';

export interface ControleFonteAcessibilidadeProps {
  variante?: 'padrao' | 'barra_menu';
  className?: string;
}

export default function ControleFonteAcessibilidade({
  variante = 'padrao',
  className = ''
}: ControleFonteAcessibilidadeProps = {}) {
  const [escala, setEscala] = useState<NivelEscalaFonte>(100);
  const [menuAberto, setMenuAberto] = useState(false);
  const [tema, setTema] = useState<TipoTema>(() => obterTemaAtual());

  // Estado para busca e atualização com 1 clique (sem abrir menu extra)
  const [buscandoVersao, setBuscandoVersao] = useState(false);
  const [statusVersao, setStatusVersao] = useState<string | null>(null);

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

  // Bloqueio de rolagem do fundo e suporte a fechar no ESC
  useEffect(() => {
    if (!menuAberto) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuAberto]);

  const handleAlternarMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAberto(prev => !prev);
  };

  // Ao selecionar uma opção, aplica e fecha sozinho
  const handleAlternarTemaDireto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const novoTema = alternarTema();
    setTema(novoTema);
    setTimeout(() => {
      setMenuAberto(false);
    }, 180);
  };

  const handleAumentar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nova = aumentarFonte();
    setEscala(nova);
    setTimeout(() => {
      setMenuAberto(false);
    }, 150);
  };

  const handleDiminuir = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nova = diminuirFonte();
    setEscala(nova);
    setTimeout(() => {
      setMenuAberto(false);
    }, 150);
  };

  const handleSelecionarNivel = (nivel: NivelEscalaFonte, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    aplicarEscalaFonte(nivel);
    setEscala(nivel);
    setTimeout(() => {
      setMenuAberto(false);
    }, 150);
  };

  // 1 CLIQUE DIRETO: busca nova versão e, se houver, atualiza o app sem menus intermediários
  const handleBuscarEAtualizarDireto = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (buscandoVersao) return;

    setBuscandoVersao(true);
    setStatusVersao('Buscando versão...');

    try {
      // 1. Consulta versão no endpoint da API
      const res = await fetch(`/api/github-versao?_t=${Date.now()}`);
      let temNovaVersao = false;

      if (res.ok) {
        const info = await res.json();
        if (info.sucesso && info.versaoCalculada) {
          if (info.versaoCalculada !== VERSAO_BUILD_ATUAL) {
            temNovaVersao = true;
          }
        }
      }

      if (temNovaVersao) {
        setStatusVersao('Nova versão! Atualizando...');
        // Executa atualização do PWA e recarrega imediatamente com 1 clique
        await forcarAtualizacaoPwa();
      } else {
        // App já está na versão mais recente
        setStatusVersao('Já na versão mais recente!');
        setTimeout(() => {
          setMenuAberto(false);
          setStatusVersao(null);
          setBuscandoVersao(false);
        }, 1200);
      }
    } catch (err) {
      console.warn('[BuscarNovaVersao] Falha na verificação, forçando recarga:', err);
      setStatusVersao('Atualizando app...');
      await forcarAtualizacaoPwa();
    }
  };

  return (
    <>
      <div className={`relative ${variante === 'barra_menu' ? 'flex flex-col items-center justify-center flex-1 h-full' : 'inline-flex items-center z-30'} ${className}`}>
        {/* Botão do Menu de Tamanho de Fonte, Tema e Atualizações */}
        {variante === 'barra_menu' ? (
          <button
            type="button"
            onClick={handleAlternarMenu}
            title="Ajustes de Acessibilidade: Tamanho de Fonte, Tema Claro/Escuro e Atualizações"
            aria-expanded={menuAberto}
            className={`flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-bold transition cursor-pointer active:scale-95 ${
              menuAberto
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${menuAberto ? 'bg-emerald-500/15' : ''}`}>
              <Type className={`w-4 h-4 ${menuAberto ? 'text-emerald-400 stroke-[2.5]' : ''}`} />
            </div>
            <span className="truncate max-w-[65px]">Acessibilidade</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAlternarMenu}
            title="Ajustes de Acessibilidade: Tamanho de Fonte, Tema Claro/Escuro e Atualizações"
            aria-expanded={menuAberto}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer select-none ${
              menuAberto 
                ? 'bg-slate-700 dark:bg-slate-700 text-emerald-400 border-emerald-500/50 ring-2 ring-emerald-500/30' 
                : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-700 dark:border-slate-600 text-slate-100 hover:text-emerald-400'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono font-black" style={{ fontSize: '12px' }}>{escala}%</span>
          </button>
        )}

        {/* Modal de Acessibilidade & Sistema centralizado na tela, nítido e sem desfoque de containers pais */}
        {menuAberto && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setMenuAberto(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-acessibilidade-titulo"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-3xl shadow-2xl p-4 sm:p-5 animate-in zoom-in-95 duration-150 space-y-3.5 my-auto overflow-hidden"
            >
              {/* Topo do Menu com Fechar explícito */}
              <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                    <Type className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="menu-acessibilidade-titulo" className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">
                      Acessibilidade & Sistema
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      PorttoHub v{VERSAO_BUILD_ATUAL}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleSelecionarNivel(100, e)}
                    className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer font-semibold px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Restaurar padrão 100%"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuAberto(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Fechar menu"
                    aria-label="Fechar menu de acessibilidade"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botões Rápidos Menos / Mais (Fecha sozinho ao selecionar) */}
              <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl">
                <button
                  type="button"
                  onClick={handleDiminuir}
                  disabled={escala <= 100}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Diminuir tamanho da fonte"
                >
                  <ZoomOut className="w-3.5 h-3.5" /> A-
                </button>
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 px-2">
                  {escala}%
                </span>
                <button
                  type="button"
                  onClick={handleAumentar}
                  disabled={escala >= 140}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Aumentar tamanho da fonte"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> A+
                </button>
              </div>

              {/* Opções de Escala de Fonte (Fecha sozinho ao clicar) */}
              <div className="space-y-1">
                {OPCOES_ESCALA_FONTE.map(opcao => {
                  const ativo = escala === opcao.nivel;
                  return (
                    <button
                      key={opcao.nivel}
                      type="button"
                      onClick={(e) => handleSelecionarNivel(opcao.nivel, e)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${
                        ativo 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black shadow-2xs' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
                      }`}
                    >
                      <span>{opcao.rotulo}</span>
                      {ativo && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Alternador Modo Claro / Modo Escuro e Botão Direto de Buscar Nova Versão */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {/* Alternador Modo Claro / Modo Escuro (Fecha sozinho ao selecionar) */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={tema === 'escuro'}
                  onClick={handleAlternarTemaDireto}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-between cursor-pointer select-none active:scale-[0.98] ${
                    tema === 'claro'
                      ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300 shadow-2xs'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 shadow-2xs'
                  }`}
                  title={tema === 'claro' ? 'Clique para mudar para Modo Escuro' : 'Clique para mudar para Modo Claro'}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${tema === 'claro' ? 'bg-amber-150 text-amber-600' : 'bg-slate-700 text-emerald-400'}`}>
                      {tema === 'claro' ? (
                        <Sun className="w-4 h-4 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 shrink-0" />
                      )}
                    </div>
                    <div>
                      <span className="block leading-tight text-xs font-bold">
                        {tema === 'claro' ? 'Modo Claro' : 'Modo Escuro'}
                      </span>
                      <span className="block text-[10px] opacity-75 font-normal">
                        {tema === 'claro' ? 'Alternar para Escuro' : 'Alternar para Claro'}
                      </span>
                    </div>
                  </div>

                  <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
                    tema === 'escuro' ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </button>

                {/* Botão de Buscar Nova Versão Direto (1 clique, sem abrir novos menus) */}
                <button
                  type="button"
                  onClick={handleBuscarEAtualizarDireto}
                  disabled={buscandoVersao}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white transition flex items-center justify-between gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-75"
                  title="Verifica se há nova versão no GitHub e atualiza imediatamente o aplicativo"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-4 h-4 text-emerald-100 shrink-0" />
                    <span className="truncate leading-tight">
                      {statusVersao ? statusVersao : 'Buscar Nova Versão'}
                    </span>
                  </div>
                  {buscandoVersao ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                  ) : statusVersao?.includes('recente') ? (
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 opacity-80 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
