import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi, Info, CheckCircle2, X } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [mostrarReconectado, setMostrarReconectado] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [estavaOffline, setEstavaOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setEstavaOffline(true);
      setMostrarReconectado(false);
    } else if (estavaOffline) {
      setMostrarReconectado(true);
      const timer = setTimeout(() => {
        setMostrarReconectado(false);
        setEstavaOffline(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, estavaOffline]);

  // Se estiver online e não tiver acabado de reconectar, não exibir
  if (isOnline && !mostrarReconectado) {
    return null;
  }

  // Notificação de reconexão bem-sucedida
  if (isOnline && mostrarReconectado) {
    return (
      <aside aria-label="Status de rede" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xl border border-emerald-500 animate-bounce">
        <Wifi className="w-4 h-4 text-white" />
        <span>Conexão Restabelecida! Sincronizando dados da portaria com a nuvem...</span>
        <button onClick={() => setMostrarReconectado(false)} className="ml-2 p-0.5 hover:bg-emerald-700 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  // Alerta de Offline ativo na Portaria
  return (
    <>
      <aside aria-label="Status de rede" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-amber-500/80 p-3 sm:px-4 sm:py-2.5 text-xs text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              Modo Offline Ativo (Falha na Conexão)
            </span>
            <span className="text-[11px] text-slate-300">
              Navegação e visualização de dados básicos mantidas via Service Worker.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDetalhesAbertos(true)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 transition"
          >
            Instruções
          </button>
        </div>
      </aside>

      {detalhesAbertos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
                <WifiOff className="w-5 h-5" /> Funcionamento Offline na Portaria
              </h3>
              <button
                onClick={() => setDetalhesAbertos(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                O <strong>INFPORT PWA</strong> possui estratégia de Service Worker e cache local ativo para manter a portaria segura durante oscilações de internet:
              </p>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4" /> O que continua funcionando:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Navegação completa entre todos os menus e abas do sistema;</li>
                  <li>Consulta de dados básicos em cache (moradores, chaves, encomendas, materiais, prestadores);</li>
                  <li>Conferência da passagem de posto com os dados mais recentes;</li>
                  <li>Visualização dos contatos de emergência do condomínio.</li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400">
                Assim que a conexão WiFi ou 4G for restabelecida, o sistema sincronizará os dados com a nuvem automaticamente.
              </p>
            </div>

            <button
              onClick={() => setDetalhesAbertos(false)}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-200 transition border border-slate-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
