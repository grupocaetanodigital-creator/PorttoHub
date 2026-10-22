import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CheckCircle2, RefreshCw, Clock, ArrowUpCircle } from 'lucide-react';
import { 
  obterFilaOffline, 
  sincronizarFilaComSupabase, 
  obterStatusCacheAutonomia,
  AcaoOffline 
} from '../services/offlineSyncEngine';

export default function IndicadorConectividade() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [mostrarVoltou, setMostrarVoltou] = useState(false);
  const [totalPendentes, setTotalPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemSincronizacao, setMensagemSincronizacao] = useState('');

  const atualizarFila = () => {
    const fila = obterFilaOffline();
    setTotalPendentes(fila.length);
  };

  useEffect(() => {
    atualizarFila();

    const handleOnline = () => {
      setOnline(true);
      setMostrarVoltou(true);
      atualizarFila();
      setTimeout(() => setMostrarVoltou(false), 5000);
    };

    const handleOffline = () => {
      setOnline(false);
      setMostrarVoltou(false);
      atualizarFila();
    };

    const handleFilaAtualizada = (e: any) => {
      if (e.detail?.total !== undefined) {
        setTotalPendentes(e.detail.total);
      } else {
        atualizarFila();
      }
    };

    const handleSyncConcluida = (e: any) => {
      setSincronizando(false);
      atualizarFila();
      if (e.detail?.sucessos > 0) {
        setMensagemSincronizacao(`${e.detail.sucessos} ação(ões) enviada(s) para a nuvem!`);
        setTimeout(() => setMensagemSincronizacao(''), 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('infport_fila_atualizada', handleFilaAtualizada);
    window.addEventListener('infport_sincronizacao_concluida', handleSyncConcluida);

    const interval = setInterval(atualizarFila, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('infport_fila_atualizada', handleFilaAtualizada);
      window.removeEventListener('infport_sincronizacao_concluida', handleSyncConcluida);
      clearInterval(interval);
    };
  }, []);

  const dispararSincronizacaoManual = async () => {
    if (!online || sincronizando) return;
    setSincronizando(true);
    await sincronizarFilaComSupabase();
    setSincronizando(false);
  };

  const statusAutonomia = obterStatusCacheAutonomia();

  // Se estiver online, sem ações pendentes e sem mensagem, não ocupa espaço
  if (online && !mostrarVoltou && totalPendentes === 0 && !mensagemSincronizacao) {
    return null;
  }

  // Feedback de sincronização bem-sucedida
  if (mensagemSincronizacao) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-emerald-400/50 animate-in fade-in slide-in-from-bottom-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-100" />
        <span>{mensagemSincronizacao}</span>
      </div>
    );
  }

  // Notificação de volta da internet
  if (mostrarVoltou && totalPendentes === 0) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-400/50 animate-in fade-in slide-in-from-bottom-2">
        <Wifi className="w-4 h-4 text-white" />
        <span>Conexão restabelecida na portaria! Nuvem sincronizada.</span>
      </div>
    );
  }

  // Online com ações pendentes para sincronizar
  if (online && totalPendentes > 0) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-blue-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-blue-400/50 animate-in fade-in slide-in-from-bottom-2">
        <ArrowUpCircle className="w-4 h-4 text-blue-200 animate-bounce" />
        <div>
          <span>{totalPendentes} ação(ões) gravada(s) offline</span>
          <span className="block text-[10px] text-blue-200 font-normal">Pronto para sincronizar com o Supabase</span>
        </div>
        <button
          onClick={dispararSincronizacaoManual}
          disabled={sincronizando}
          className="bg-white text-blue-900 px-3 py-1 rounded-xl text-[11px] font-black hover:bg-blue-50 active:scale-95 transition flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${sincronizando ? 'animate-spin' : ''}`} />
          {sincronizando ? 'Enviando...' : 'Sincronizar'}
        </button>
      </div>
    );
  }

  // Modo Offline Ativo (Queda de Internet com Cache de 3 Horas)
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-slate-900 border-2 border-amber-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 max-w-md">
      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/40">
        <WifiOff className="w-4 h-4" />
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
          <span className="uppercase tracking-wide text-[10px] font-black">Modo Offline Ativo</span>
        </div>
        <p className="text-slate-200 text-xs">
          O INFPORT continua funcionando com cache local para até 3 horas de trabalho contínuo.
        </p>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Autonomia: 3h garantida
          </span>
          {totalPendentes > 0 && (
            <span className="text-amber-300 font-semibold">
              • {totalPendentes} ação(ões) na fila
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
