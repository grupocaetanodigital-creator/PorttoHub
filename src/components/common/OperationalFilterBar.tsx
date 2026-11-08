import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Calendar, 
  AlertCircle, 
  FileText, 
  ChevronDown, 
  X, 
  Check, 
  Filter
} from 'lucide-react';
import { OperationalTeamFilter, CondominioPosto } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

interface FilterCounts {
  todos: number;
  no_posto: number;
  de_folga: number;
  em_falta: number;
  afastado: number;
}

interface OperationalFilterBarProps {
  activeFilter: OperationalTeamFilter;
  onFilterChange: (filter: OperationalTeamFilter) => void;
  selectedCondoId: string | null;
  onSelectCondoId: (condoId: string | null) => void;
  condominios: CondominioPosto[];
  counts: FilterCounts;
}

export const OperationalFilterBar: React.FC<OperationalFilterBarProps> = ({
  activeFilter,
  onFilterChange,
  selectedCondoId,
  onSelectCondoId,
  condominios,
  counts
}) => {
  const [condoDropdownOpen, setCondoDropdownOpen] = useState(false);

  const selectedCondo = condominios.find(c => c.id === selectedCondoId);

  const chips: { id: OperationalTeamFilter; label: string; count: number; color: string; activeColor: string }[] = [
    {
      id: 'todos',
      label: '🏢 Visão Geral',
      count: counts.todos,
      color: 'border-slate-800 text-slate-400 bg-slate-900',
      activeColor: 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
    },
    {
      id: 'no_posto',
      label: '🟢 No Posto',
      count: counts.no_posto,
      color: 'border-slate-800 text-emerald-400 bg-slate-900',
      activeColor: 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
    },
    {
      id: 'de_folga',
      label: '🟦 De Folga (FT)',
      count: counts.de_folga,
      color: 'border-slate-800 text-blue-400 bg-slate-900',
      activeColor: 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/30'
    },
    {
      id: 'em_falta',
      label: '🔴 Em Falta / Vazio',
      count: counts.em_falta,
      color: 'border-slate-800 text-red-400 bg-slate-900',
      activeColor: 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30 animate-pulse'
    },
    {
      id: 'afastado',
      label: '🟡 Afastados / Atestado',
      count: counts.afastado,
      color: 'border-slate-800 text-yellow-300 bg-slate-900',
      activeColor: 'bg-yellow-500 text-slate-950 font-black border-yellow-400 shadow-md shadow-yellow-500/30'
    }
  ];

  return (
    <div className="space-y-2">
      {/* Top row: Condominium Selector Dropdown */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCondoDropdownOpen(true)}
          className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer ${
            selectedCondo
              ? 'bg-blue-950/40 border-blue-500/50 text-blue-300 shadow-sm'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className={`w-4 h-4 shrink-0 ${selectedCondo ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="truncate">
              {selectedCondo ? `Filtro: ${selectedCondo.nome}` : '🏢 Todos os Condomínios (Macro)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedCondo && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCondoId(null);
                }}
                className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center p-0.5"
                title="Limpar filtro de condomínio"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </button>

        {selectedCondoId && (
          <button
            type="button"
            onClick={() => onSelectCondoId(null)}
            className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition-colors shrink-0"
          >
            Ver Todos
          </button>
        )}
      </div>

      {/* Horizontal Sliding Chips (Pílulas Deslizantes) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
        {chips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 snap-start ${
                isActive ? chip.activeColor : `${chip.color} hover:bg-slate-800/80`
              }`}
            >
              <span>{chip.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Specific Condominium Selection Bottom Sheet */}
      <BottomSheet
        isOpen={condoDropdownOpen}
        onClose={() => setCondoDropdownOpen(false)}
        title="Filtrar por Condomínio Específico"
        subtitle="Selecione um posto para isolar o monitoramento de equipe"
      >
        <div className="space-y-2">
          {/* Option: Todos os Condomínios */}
          <button
            type="button"
            onClick={() => {
              onSelectCondoId(null);
              setCondoDropdownOpen(false);
            }}
            className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
              selectedCondoId === null
                ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Todos os Condomínios (Visão Macro)</p>
                <p className="text-[11px] text-slate-400">Exibir todos os {condominios.length} postos e equipe geral</p>
              </div>
            </div>
            {selectedCondoId === null && <Check className="w-4 h-4 text-blue-400" />}
          </button>

          {/* List of each condominium */}
          {condominios.map((condo) => {
            const isSelected = selectedCondoId === condo.id;
            return (
              <button
                key={condo.id}
                type="button"
                onClick={() => {
                  onSelectCondoId(condo.id);
                  setCondoDropdownOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-700/60 flex items-center justify-center text-slate-300 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{condo.nome}</p>
                    <p className="text-[11px] text-slate-400 truncate">{condo.tipo} &bull; {condo.endereco}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
};
