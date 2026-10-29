import React, { useState } from 'react';
import { RefreshCw, Sparkles, GitBranch } from 'lucide-react';
import { usePwaUpdate } from '../hooks/usePwaUpdate';
import ModalInfoVersaoRepositorio from './ModalInfoVersaoRepositorio';

interface BotaoAtualizarAppProps {
  className?: string;
  modoCompacto?: boolean;
}

export const BotaoAtualizarApp: React.FC<BotaoAtualizarAppProps> = ({ 
  className = '',
  modoCompacto = false 
}) => {
  const { novaVersaoDisponivel, verificando, atualizando } = usePwaUpdate();
  const [modalInfoAberto, setModalInfoAberto] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Sempre abre a tela de informações do repositório para puxar dados e ficar na tela
    setModalInfoAberto(true);
  };

  return (
    <>
      <div className={`relative inline-flex items-center ${className}`}>
        {/* CASO 1: NOVA VERSÃO DETECTADA (DESTAQUE MÁXIMO) */}
        {novaVersaoDisponivel ? (
          <button
            type="button"
            onClick={handleClick}
            title="Nova versão do PorttoHub disponível! Clique para ver detalhes e atualizar."
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition transform active:scale-95 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="hidden sm:inline">Nova Versão</span>
            <span className="sm:hidden">Atualizar</span>
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-ping" />
          </button>
        ) : (
          /* CASO 2: BOTÃO NORMAL DISCRETO AO LADO DO TAMANHO DE FONTE */
          <button
            type="button"
            onClick={handleClick}
            disabled={verificando || atualizando}
            title="Puxar informações do repositório GitHub e verificar versão oficial"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-700 dark:border-slate-600 text-slate-200 hover:text-emerald-400 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verificando || atualizando ? 'animate-spin text-amber-400' : 'text-emerald-400'} shrink-0`} />
            {!modoCompacto && (
              <span className="font-mono text-[11px] font-bold">
                {atualizando ? 'Atualizando...' : verificando ? 'Puxando...' : 'Atualizar'}
              </span>
            )}
            <GitBranch className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline-block" />
          </button>
        )}
      </div>

      {/* Modal oficial que puxa todas as informações do GitHub e FICA NA TELA */}
      <ModalInfoVersaoRepositorio
        aberto={modalInfoAberto}
        onFechar={() => setModalInfoAberto(false)}
      />
    </>
  );
};

export default BotaoAtualizarApp;
