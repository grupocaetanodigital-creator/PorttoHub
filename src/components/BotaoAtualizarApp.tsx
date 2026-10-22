import React, { useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, ArrowUpCircle } from 'lucide-react';
import { usePwaUpdate } from '../hooks/usePwaUpdate';

interface BotaoAtualizarAppProps {
  className?: string;
  modoCompacto?: boolean;
}

export const BotaoAtualizarApp: React.FC<BotaoAtualizarAppProps> = ({ 
  className = '',
  modoCompacto = false 
}) => {
  const { novaVersaoDisponivel, verificando, atualizando, verificarAtualizacao, atualizarAgora } = usePwaUpdate();
  const [modalAberto, setModalAberto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  const handleClick = async () => {
    if (novaVersaoDisponivel) {
      setModalAberto(true);
      return;
    }

    // Se não há atualização pendente detectada, faz a verificação manual
    const temNova = await verificarAtualizacao();
    if (temNova) {
      setModalAberto(true);
    } else {
      setMensagemSucesso(true);
      setTimeout(() => setMensagemSucesso(false), 3000);
    }
  };

  const handleConfirmarAtualizacao = async () => {
    setModalAberto(false);
    await atualizarAgora();
  };

  return (
    <>
      <div className={`relative inline-flex items-center ${className}`}>
        {/* CASO 1: NOVA VERSÃO DETECTADA (DESTAQUE MÁXIMO) */}
        {novaVersaoDisponivel ? (
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            title="Nova versão do INFPORT disponível! Clique para aplicar sem deslogar."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition transform active:scale-95 cursor-pointer animate-pulse"
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
            title={
              mensagemSucesso 
                ? 'INFPORT já está na versão mais recente!' 
                : 'Verificar atualizações / Limpar cache do app sem deslogar'
            }
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
              mensagemSucesso
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-emerald-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verificando || atualizando ? 'animate-spin text-amber-400' : mensagemSucesso ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'} shrink-0`} />
            {!modoCompacto && (
              <span className="hidden md:inline font-mono text-[11px]">
                {atualizando ? 'Atualizando...' : verificando ? 'Verificando...' : mensagemSucesso ? 'Atualizado' : 'Atualizar'}
              </span>
            )}
          </button>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE ATUALIZAÇÃO LIMPA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                <ArrowUpCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">Nova Versão Disponível</h3>
                <p className="text-xs text-slate-400">Atualização do INFPORT 1.0</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-800">
              Uma nova versão foi publicada no servidor. A atualização irá limpar o cache do navegador e recarregar os arquivos novos.
              <br /><br />
              <strong className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sua sessão e login serão preservados.
              </strong>
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Depois
              </button>
              <button
                type="button"
                onClick={handleConfirmarAtualizacao}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Atualizar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BotaoAtualizarApp;
