import React from 'react';
import { Building2, CalendarCheck2, ShieldCheck, Settings, Users, Plus, RotateCcw } from 'lucide-react';
import { Condominium } from '../types';

interface HeaderProps {
  condominiums: Condominium[];
  activeCondo: Condominium;
  onSelectCondo: (condoId: string) => void;
  activeTab: 'reservas' | 'portaria' | 'areas' | 'unidades';
  onSelectTab: (tab: 'reservas' | 'portaria' | 'areas' | 'unidades') => void;
  onOpenNewReservation: () => void;
  onResetDemoData: () => void;
  todayReservationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  condominiums,
  activeCondo,
  onSelectCondo,
  activeTab,
  onSelectTab,
  onOpenNewReservation,
  onResetDemoData,
  todayReservationsCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          
          {/* Zone 1: Brand & Condominium Context */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
                P
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                  PorttoHub
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:block">
                  Gestão de Reservas
                </span>
              </div>
            </div>

            {/* Condominium Selector */}
            <div className="relative pl-3 border-l border-slate-200">
              <label htmlFor="condo-select" className="sr-only">Selecionar Condomínio</label>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  id="condo-select"
                  value={activeCondo.id}
                  onChange={(e) => onSelectCondo(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {condominiums.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
            <button
              onClick={() => onSelectTab('reservas')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'reservas'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              Grade de Reservas
            </button>

            <button
              onClick={() => onSelectTab('portaria')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'portaria'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Controle da Portaria
              {todayReservationsCount > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                  {todayReservationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('areas')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'areas'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar Áreas
            </button>

            <button
              onClick={() => onSelectTab('unidades')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'unidades'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Unidades & Moradores
            </button>
          </nav>

          {/* Zone 3: Primary Action & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onResetDemoData}
              title="Restaurar dados de teste"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewReservation}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova Reserva
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 overflow-x-auto gap-2">
          <button
            onClick={() => onSelectTab('reservas')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'reservas' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Reservas
          </button>
          <button
            onClick={() => onSelectTab('portaria')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'portaria' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Portaria ({todayReservationsCount})
          </button>
          <button
            onClick={() => onSelectTab('areas')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'areas' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Áreas
          </button>
          <button
            onClick={() => onSelectTab('unidades')}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === 'unidades' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Moradores
          </button>
        </div>
      </div>
    </header>
  );
};
