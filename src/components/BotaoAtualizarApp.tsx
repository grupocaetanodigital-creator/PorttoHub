import React, { useState } from 'react';
import { RefreshCw, Sparkles, GitBranch } from 'lucide-react';
import { usePwaUpdate } from '../hooks/usePwaUpdate';
import { forcarAtualizacaoPwa } from '../services/pwaUpdateService';
import { VERSAO_BUILD_ATUAL } from '../services/versaoService';

interface BotaoAtualizarAppProps {
  className?: string;
  modoCompacto?: boolean;
}

export const BotaoAtualizarApp: React.FC<BotaoAtualizarAppProps> = ({ 
  className = '',
  modoCompacto = false 
}) => {
  const { novaVersaoDisponivel, verificando, atualizando } = usePwaUpdate();
  const [atualizandoDireto, setAtualizandoDireto] = useState(false);
  const [statusTexto, setStatusTexto] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (atualizandoDireto) return;
    setAtualizandoDireto(true);
    setStatusTexto('Buscando...');

    try {
      const res = await fetch(`/api/github-versao?_t=${Date.now()}`);
      let temNova = false;
      if (res.ok) {
        const info = await res.json();
        if (info.sucesso && info.versaoCalculada && info.versaoCalculada !== VERSAO_BUILD_ATUAL) {
          temNova = true;
        }
      }

      if (temNova || novaVersaoDisponivel) {
        setStatusTexto('Atualizando...');
        await forcarAtualizacaoPwa();
      } else {
        setStatusTexto('Atualizado!');
        setTimeout(() => {
          setStatusTexto(null);
          setAtualizandoDireto(false);
        }, 1200);
      }
    } catch {
      await forcarAtualizacaoPwa();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* CASO 1: NOVA VERSÃO DETECTADA (DESTAQUE MÁXIMO) */}
      {novaVersaoDisponivel ? (
        <button
          type="button"
          onClick={handleClick}
          title="Nova versão disponível! Clique para atualizar agora com 1 clique."
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
          disabled={verificando || atualizando || atualizandoDireto}
          title="Buscar nova versão e atualizar com 1 clique"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-700 dark:border-slate-600 text-slate-200 hover:text-emerald-400 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verificando || atualizando || atualizandoDireto ? 'animate-spin text-amber-400' : 'text-emerald-400'} shrink-0`} />
          {!modoCompacto && (
            <span className="font-mono text-[11px] font-bold">
              {statusTexto || (atualizando || atualizandoDireto ? 'Atualizando...' : verificando ? 'Buscando...' : 'Atualizar')}
            </span>
          )}
          <GitBranch className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline-block" />
        </button>
      )}
    </div>
  );
};

export default BotaoAtualizarApp;
