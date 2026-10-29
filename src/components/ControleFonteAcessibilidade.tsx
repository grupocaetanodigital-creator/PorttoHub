import React, { useState, useEffect, useRef } from 'react';
import { Type, ZoomIn, ZoomOut, RotateCcw, Check, Sun, Moon, GitBranch, RefreshCw, X } from 'lucide-react';
import { 
  obterEscalaFonteAtual, 
  aplicarEscalaFonte, 
  aumentarFonte, 
  diminuirFonte, 
  NivelEscalaFonte, 
  OPCOES_ESCALA_FONTE 
} from '../services/fontScaleService';
import { obterTemaAtual, alternarTema, TipoTema } from '../services/themeService';
import ModalInfoVersaoRepositorio from './ModalInfoVersaoRepositorio';

export default function ControleFonteAcessibilidade() {
  const [escala, setEscala] = useState<NivelEscalaFonte>(100);
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalInfoAberto, setModalInfoAberto] = useState(false);
  const [tema, setTema] = useState<TipoTema>(() => obterTemaAtual());
  
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Fechamento seguro: só fecha ao clicar fora se o modal não estiver aberto
  useEffect(() => {
    if (!menuAberto || modalInfoAberto) return;

    const handleCliqueFora = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleCliqueFora);
    }, 150);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleCliqueFora);
    };
  }, [menuAberto, modalInfoAberto]);

  const handleAlternarMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAberto(prev => !prev);
  };

  const handleAlternarTemaDireto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const novoTema = alternarTema();
    setTema(novoTema);
  };

  const handleAumentar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nova = aumentarFonte();
    setEscala(nova);
  };

  const handleDiminuir = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nova = diminuirFonte();
    setEscala(nova);
  };

  const handleSelecionarNivel = (nivel: NivelEscalaFonte, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    aplicarEscalaFonte(nivel);
    setEscala(nivel);
  };

  const handleAbrirModalInfo = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setModalInfoAberto(true);
  };

  return (
    <>
      <div ref={containerRef} className="relative inline-flex items-center z-30">
        {/* Botão do Menu de Tamanho de Fonte, Tema e Atualizações */}
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

        {/* Menu Flutuante Completo com botão de fechar para ficar na tela */}
        {menuAberto && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-2 w-68 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Topo do Menu com Fechar explícito para ficar na tela */}
            <div className="px-1 py-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Acessibilidade & Sistema
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSelecionarNivel(100, e)}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer font-semibold"
                  title="Restaurar padrão 100%"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> 100%
                </button>
                <button
                  type="button"
                  onClick={() => setMenuAberto(false)}
                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Botões Rápidos Menos / Mais */}
            <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl my-2.5">
              <button
                type="button"
                onClick={handleDiminuir}
                disabled={escala <= 100}
                className="flex-1 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" /> A-
              </button>
              <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 px-1">
                {escala}%
              </span>
              <button
                type="button"
                onClick={handleAumentar}
                disabled={escala >= 140}
                className="flex-1 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
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
                    onClick={(e) => handleSelecionarNivel(opcao.nivel, e)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
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

              {/* Botão de Puxar Informações e Atualizar do Repositório (Abre Modal que Fica na Tela) */}
              <button
                type="button"
                onClick={handleAbrirModalInfo}
                className="w-full text-left px-2.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition flex items-center justify-between gap-1.5 cursor-pointer shadow-xs"
                title="Puxar dados do repositório, commits e conferir versão em tela cheia"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span className="leading-tight">
                    Buscar Nova Versão
                  </span>
                </div>
                <RefreshCw className="w-3.5 h-3.5 opacity-80 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal que FICA NA TELA exibindo todas as informações puxadas do repositório */}
      <ModalInfoVersaoRepositorio
        aberto={modalInfoAberto}
        onFechar={() => setModalInfoAberto(false)}
      />
    </>
  );
}
