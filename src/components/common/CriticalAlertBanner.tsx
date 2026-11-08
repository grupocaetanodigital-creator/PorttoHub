import React from 'react';
import { AlertCircle, Zap, ChevronRight, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CriticalAlertBanner: React.FC = () => {
  const { turnos, condominios, openFTModal } = useApp();

  // Find empty shift
  const emptyTurno = turnos.find(t => t.status === 'vazio');

  if (!emptyTurno) return null;

  const condo = condominios.find(c => c.id === emptyTurno.condominioId);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/90 via-red-900/60 to-slate-900 border border-red-500/40 p-4 shadow-lg shadow-red-950/40 animate-pulse">
      {/* Background glow circle */}
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 mt-0.5">
          <AlertCircle className="w-6 h-6 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white shadow-sm">
              Alerta Crítico
            </span>
            <span className="text-xs text-red-200/90 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {emptyTurno.horaAlerta ? `Desde às ${emptyTurno.horaAlerta}` : 'Sem cobertura'}
            </span>
          </div>

          <h2 className="text-sm font-bold text-white mt-1 leading-snug">
            🔴 POSTO VAZIO
          </h2>

          <p className="text-xs text-red-100 font-medium mt-0.5 truncate">
            {condo?.nome || 'Condomínio'} &bull; {emptyTurno.postoNome}
          </p>

          <p className="text-[11px] text-red-300/80 mt-1 line-clamp-1">
            {emptyTurno.motivoVazio || 'Colaborador ausente no posto sem substituição ativa.'}
          </p>

          {/* Quick Action Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => openFTModal(emptyTurno)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-900/50 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>Designar Cobertura / FT Rápida</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
