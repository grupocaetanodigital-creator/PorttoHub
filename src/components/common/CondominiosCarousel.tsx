import React from 'react';
import { Building2, MapPin, Navigation, Users, ChevronRight, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CondominioPosto, TurnoPosto, Colaborador } from '../../types';

interface CondominiosCarouselProps {
  condominios: CondominioPosto[];
  turnos: TurnoPosto[];
  colaboradores: Colaborador[];
  selectedCondoId?: string;
  onSelectCondominio: (condo: CondominioPosto) => void;
}

export const CondominiosCarousel: React.FC<CondominiosCarouselProps> = ({
  condominios,
  turnos,
  colaboradores,
  selectedCondoId,
  onSelectCondominio
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Condomínios / Postos Ativos ({condominios.length})
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Toque para Painel 360°</span>
      </div>

      {/* Horizontal scrolling carousel with smooth snap for mobile */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {condominios.map((condo) => {
          const condoTurnos = turnos.filter(t => t.condominioId === condo.id);
          const hasEmpty = condoTurnos.some(t => t.status === 'vazio');
          const hasFT = condoTurnos.some(t => t.status === 'em_ft');
          const linkedStaff = colaboradores.filter(c => c.condominioId === condo.id);
          const isSelected = selectedCondoId === condo.id;

          const statusColor = hasEmpty
            ? 'border-red-500/60 bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900 shadow-red-950/40'
            : hasFT
            ? 'border-amber-500/50 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 shadow-amber-950/30'
            : 'border-slate-800 bg-slate-900/90 hover:border-slate-700';

          return (
            <div
              key={condo.id}
              onClick={() => onSelectCondominio(condo)}
              className={`min-w-[260px] max-w-[280px] p-3.5 rounded-2xl border shadow-md transition-all active:scale-[0.98] cursor-pointer snap-start shrink-0 flex flex-col justify-between ${statusColor} ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-500/20 truncate">
                    {condo.tipo}
                  </span>

                  {hasEmpty ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-sm animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Posto Vazio
                    </span>
                  ) : hasFT ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Zap className="w-2.5 h-2.5 fill-amber-300" />
                      Em FT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      100% Coberto
                    </span>
                  )}
                </div>

                {/* Condo Title */}
                <h4 className="text-sm font-bold text-white mt-2 truncate leading-tight">
                  {condo.nome}
                </h4>

                {/* Address snippet */}
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{condo.endereco}</span>
                </p>
              </div>

              {/* Metrics Pill */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <strong>{linkedStaff.length}</strong> equipe
                  </span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-emerald-400 font-semibold">
                    {condo.raioGpsMetros}m GPS
                  </span>
                </div>

                <div className="text-blue-400 flex items-center font-bold text-[10px]">
                  <span>Painel 360°</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
