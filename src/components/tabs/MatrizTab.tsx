import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Check, 
  X, 
  AlertCircle,
  Building2,
  Clock,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DayStatus, Colaborador } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

export const MatrizTab: React.FC = () => {
  const { colaboradores, condominios, escalas, updateEscalaDia, openFTModal } = useApp();

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{
    colab: Colaborador;
    dateKey: string;
    dayNum: number;
    dayName: string;
    currentStatus: DayStatus;
  } | null>(null);

  // Generate 7 days for the selected week
  const today = new Date();
  const startOfWeek = new Date(today);
  // Normalize to Monday of current week
  const currentDay = today.getDay(); // 0 is Sun
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + (currentWeekOffset * 7);
  startOfWeek.setDate(diff);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return {
      date: d,
      dateKey,
      dayNum: d.getDate(),
      dayName: dayNames[d.getDay()],
      isToday: d.toDateString() === today.toDateString()
    };
  });

  const getStatusColor = (status?: DayStatus) => {
    switch (status) {
      case 'trabalho':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30';
      case 'folga':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30';
      case 'ft':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 font-bold';
      case 'falta':
        return 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 animate-pulse';
      case 'atestado':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30 font-bold';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusIcon = (status?: DayStatus) => {
    switch (status) {
      case 'trabalho':
        return <span className="text-[11px] font-bold">T</span>;
      case 'folga':
        return <span className="text-[11px] font-bold">F</span>;
      case 'ft':
        return <Zap className="w-3 h-3 fill-amber-300" />;
      case 'falta':
        return <span className="text-[11px] font-bold">!</span>;
      case 'atestado':
        return <span className="text-[10px] font-bold">MED</span>;
      default:
        return <span className="text-[10px]">-</span>;
    }
  };

  const handleCellClick = (colab: Colaborador, day: typeof weekDays[0]) => {
    const currentStatus = escalas[colab.id]?.[day.dateKey] || 'folga';
    setSelectedCell({
      colab,
      dateKey: day.dateKey,
      dayNum: day.dayNum,
      dayName: day.dayName,
      currentStatus
    });
  };

  const handleSetStatus = (newStatus: DayStatus) => {
    if (!selectedCell) return;
    updateEscalaDia(selectedCell.colab.id, selectedCell.dateKey, newStatus);
    setSelectedCell(prev => prev ? { ...prev, currentStatus: newStatus } : null);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header & Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            <span>Matriz de Escalas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Escala semanal de portaria e vigilância
          </p>
        </div>

        {/* Week navigation buttons */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setCurrentWeekOffset(prev => prev - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentWeekOffset(0)}
            className="px-2 text-[11px] font-bold text-blue-400 hover:text-blue-300"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setCurrentWeekOffset(prev => prev + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-[8px] font-bold text-emerald-400">T</span>
          <span className="text-slate-300">Trabalho</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-blue-500/30 border border-blue-500/50 flex items-center justify-center text-[8px] font-bold text-blue-400">F</span>
          <span className="text-slate-300">Folga</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-[8px] font-bold text-amber-300">⚡</span>
          <span className="text-slate-300">FT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-red-500/30 border border-red-500/50 flex items-center justify-center text-[8px] font-bold text-red-400">!</span>
          <span className="text-slate-300">Falta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-yellow-500/30 border border-yellow-500/50 flex items-center justify-center text-[7px] font-bold text-yellow-300">MED</span>
          <span className="text-slate-300">Atestado</span>
        </div>
      </div>

      {/* Matrix Table View */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm overflow-hidden">
        {/* Table Header with Days */}
        <div className="grid grid-cols-8 gap-1.5 pb-2 border-b border-slate-800 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase text-left self-end pl-1 truncate">
            Equipe
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dateKey}
              className={`p-1 rounded-lg ${day.isToday ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300' : 'text-slate-400'}`}
            >
              <span className="block text-[10px] font-semibold uppercase">{day.dayName}</span>
              <span className={`block text-xs font-bold ${day.isToday ? 'text-blue-400 font-extrabold' : 'text-white'}`}>
                {day.dayNum}
              </span>
            </div>
          ))}
        </div>

        {/* Collaborators Rows */}
        <div className="divide-y divide-slate-800/80 pt-1">
          {colaboradores.map((colab) => {
            const condo = condominios.find(c => c.id === colab.condominioId);
            return (
              <div key={colab.id} className="grid grid-cols-8 gap-1.5 py-2.5 items-center">
                {/* Employee Info Pill */}
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">{colab.nome.split(' ')[0]}</p>
                  <p className="text-[9px] text-slate-400 truncate">{colab.jornada}</p>
                </div>

                {/* 7 Days Grid Cells */}
                {weekDays.map((day) => {
                  const status = escalas[colab.id]?.[day.dateKey] || 'folga';
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => handleCellClick(colab, day)}
                      className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${getStatusColor(status)}`}
                      title={`${colab.nome}: ${status} em ${day.dateKey}`}
                    >
                      {getStatusIcon(status)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Matrix Day Action Drawer */}
      <BottomSheet
        isOpen={Boolean(selectedCell)}
        onClose={() => setSelectedCell(null)}
        title="Editar Plantão da Escala"
        subtitle={selectedCell ? `${selectedCell.colab.nome} &bull; ${selectedCell.dayName}, dia ${selectedCell.dayNum}` : ''}
      >
        {selectedCell && (
          <div className="space-y-4">
            <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <img
                src={selectedCell.colab.fotoUrl}
                alt={selectedCell.colab.nome}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-700"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white">{selectedCell.colab.nome}</h4>
                <p className="text-xs text-blue-400">{selectedCell.colab.cargo} &bull; {selectedCell.colab.jornada}</p>
                <p className="text-[11px] text-slate-400">Data: {selectedCell.dateKey}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Definir Novo Status do Dia:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Option 1: Trabalho */}
                <button
                  type="button"
                  onClick={() => handleSetStatus('trabalho')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedCell.currentStatus === 'trabalho'
                      ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-black font-bold">✓</span>
                  <div>
                    <p className="text-xs font-bold text-white">Trabalho (🟩)</p>
                    <p className="text-[10px] text-slate-400">Plantão regular escalado</p>
                  </div>
                </button>

                {/* Option 2: Folga */}
                <button
                  type="button"
                  onClick={() => handleSetStatus('folga')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedCell.currentStatus === 'folga'
                      ? 'bg-blue-950/50 border-blue-500 ring-1 ring-blue-500 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-black font-bold">F</span>
                  <div>
                    <p className="text-xs font-bold text-white">Folga (🟦)</p>
                    <p className="text-[10px] text-slate-400">Repouso semanal / DSR</p>
                  </div>
                </button>

                {/* Option 3: FT Folga Trabalhada */}
                <button
                  type="button"
                  onClick={() => handleSetStatus('ft')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedCell.currentStatus === 'ft'
                      ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white">FT Ativa (⚡)</p>
                    <p className="text-[10px] text-slate-400">Folga Trabalhada (Extra)</p>
                  </div>
                </button>

                {/* Option 4: Falta */}
                <button
                  type="button"
                  onClick={() => handleSetStatus('falta')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedCell.currentStatus === 'falta'
                      ? 'bg-red-950/50 border-red-500 ring-1 ring-red-500 text-red-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Falta / Atraso (🔴)</p>
                    <p className="text-[10px] text-slate-400">Posto sem operador</p>
                  </div>
                </button>

                {/* Option 5: Atestado Médico */}
                <button
                  type="button"
                  onClick={() => handleSetStatus('atestado')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedCell.currentStatus === 'atestado'
                      ? 'bg-yellow-950/50 border-yellow-500 ring-1 ring-yellow-500 text-yellow-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] text-black font-black">M</span>
                  <div>
                    <p className="text-xs font-bold text-white">Atestado / Licença (🟡)</p>
                    <p className="text-[10px] text-slate-400">Afastamento médico RH</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="w-full min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
