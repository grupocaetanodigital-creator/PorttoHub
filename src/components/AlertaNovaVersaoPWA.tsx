import React, { useState } from 'react';
import { Sparkles, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { usePwaUpdate } from '../hooks/usePwaUpdate';

export const AlertaNovaVersaoPWA: React.FC = () => {
  const { novaVersaoDisponivel, atualizando, atualizarAgora } = usePwaUpdate();
  const [dispensado, setDispensado] = useState(false);

  if (!novaVersaoDisponivel || dispensado) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900 border-2 border-amber-500/80 text-white rounded-2xl shadow-2xl p-3.5 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider">
              Atualização Disponível
            </h4>
            <button
              type="button"
              onClick={() => setDispensado(true)}
              className="text-slate-500 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            Uma nova versão do INFPORT foi publicada. Clique abaixo para carregar as novidades imediatamente sem precisar deslogar.
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={atualizarAgora}
              disabled={atualizando}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${atualizando ? 'animate-spin' : ''}`} />
              <span>{atualizando ? 'Carregando versão...' : 'Atualizar Agora'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDispensado(true)}
              className="text-slate-400 hover:text-white text-xs font-semibold py-1.5 px-2 rounded-lg transition cursor-pointer"
            >
              Lembrar depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertaNovaVersaoPWA;
