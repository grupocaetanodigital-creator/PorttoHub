import React, { useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  LogOut, 
  LogIn, 
  XCircle,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { CommonArea, Reservation, TimeSlot } from '../types';
import { AreaIcon } from './AreaIcon';
import { 
  generateTimeSlotsForArea, 
  formatDatePTBR, 
  formatShortDatePTBR, 
  formatCurrencyBRL,
  getTodayDateString 
} from '../utils/timeSlots';

interface ReservationGridProps {
  areas: CommonArea[];
  selectedArea: CommonArea;
  onSelectArea: (area: CommonArea) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  reservations: Reservation[];
  onOpenNewReservationForSlot: (area: CommonArea, startTime: string, endTime: string) => void;
  onViewReceipt: (reservation: Reservation) => void;
  onUpdateReservationStatus: (reservationId: string, status: Reservation['status']) => void;
  onCancelReservation: (reservationId: string) => void;
  onOpenAreaSettings: () => void;
}

export const ReservationGrid: React.FC<ReservationGridProps> = ({
  areas,
  selectedArea,
  onSelectArea,
  selectedDate,
  onSelectDate,
  reservations,
  onOpenNewReservationForSlot,
  onViewReceipt,
  onUpdateReservationStatus,
  onCancelReservation,
  onOpenAreaSettings,
}) => {
  const todayStr = getTodayDateString();

  // Generate 14 selectable days starting from today
  const dateOptions = useMemo(() => {
    const list: string[] = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      list.push(`${year}-${month}-${day}`);
    }
    return list;
  }, []);

  // Compute time slots for the selected area on the selected date
  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!selectedArea) return [];
    return generateTimeSlotsForArea(selectedArea, selectedDate, reservations);
  }, [selectedArea, selectedDate, reservations]);

  // Statistics for this area on this day
  const stats = useMemo(() => {
    const total = timeSlots.length;
    const reserved = timeSlots.filter((s) => !s.isAvailable).length;
    const available = total - reserved;
    const occupancyRate = total > 0 ? Math.round((reserved / total) * 100) : 0;
    return { total, reserved, available, occupancyRate };
  }, [timeSlots]);

  return (
    <div className="space-y-6">
      
      {/* 1. SELEÇÃO DE ÁREAS COMUNS (Clean Horizontal Filter) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-900 tracking-tight">
            Áreas de Lazer & Esportes
          </span>
          <button
            onClick={onOpenAreaSettings}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Configurar Horários e Áreas
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {areas.map((area) => {
            const isSelected = area.id === selectedArea?.id;
            return (
              <button
                key={area.id}
                onClick={() => onSelectArea(area)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <AreaIcon
                  type={area.type}
                  className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-600'}`}
                />
                <span>{area.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {area.startHour}-{area.endHour}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CALENDÁRIO / BARRA DE DATAS (14 Dias) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {formatDatePTBR(selectedDate)}
            </h2>
            {selectedDate === todayStr && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                Hoje
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectDate(todayStr)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                selectedDate === todayStr
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Hoje
            </button>
            
            {/* Direct date picker fallback */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onSelectDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* 14-day selector strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {dateOptions.map((dateStr) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const { weekday, day, month } = formatShortDatePTBR(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[62px] py-2 px-1 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {isToday ? 'Hoje' : weekday}
                </span>
                <span className={`text-base font-bold font-mono tabular-nums leading-tight ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                  {day}
                </span>
                <span className="text-[10px] text-slate-400">{month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. RESUMO DA ÁREA & STATUS DO DIA */}
      {selectedArea && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Area info card */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <AreaIcon type={selectedArea.type} className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedArea.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {selectedArea.startHour} às {selectedArea.endHour} ({selectedArea.slotDurationMinutes} min/slot)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Capacidade até {selectedArea.capacity} pessoas
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      {formatCurrencyBRL(selectedArea.cleaningFee)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenAreaSettings}
                className="text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                Editar Regras & Horários
              </button>
            </div>

            {selectedArea.description && (
              <p className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                {selectedArea.description}
              </p>
            )}
          </div>

          {/* Daily Quick Stats KPI */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Ocupação do Dia
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums">
                  {stats.occupancyRate}%
                </span>
                <span className="text-xs text-slate-400">
                  ({stats.reserved} de {stats.total} horários)
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-emerald-400 block font-medium">Disponíveis</span>
                <span className="text-lg font-bold font-mono tabular-nums text-emerald-300">
                  {stats.available}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-indigo-400 block font-medium">Reservados</span>
                <span className="text-lg font-bold font-mono tabular-nums text-indigo-300">
                  {stats.reserved}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. GRADE DE HORÁRIOS DISPONÍVEIS & OCUPADOS (The core clean view!) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Grade de Horários Disponíveis
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em <span className="font-semibold text-indigo-600">"Agendar"</span> no horário desejado para informar a unidade e morador
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Disponível ({stats.available})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-slate-600">Reservado ({stats.reserved})</span>
            </div>
          </div>
        </div>

        {/* Time slots list */}
        <div className="divide-y divide-slate-100">
          {timeSlots.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhum horário configurado para esta área. Ajuste o horário de início e término nas configurações.
            </div>
          ) : (
            timeSlots.map((slot) => {
              const res = slot.reservation;

              if (slot.isAvailable) {
                // DISPONÍVEL
                return (
                  <div
                    key={`${slot.startTime}-${slot.endTime}`}
                    className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-4">
                      {/* Time Pill */}
                      <div className="min-w-[130px] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Disponível
                        </span>
                        <span className="text-xs text-slate-400 hidden md:inline">
                          Capacidade para até {selectedArea.capacity} pessoas
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() =>
                        onOpenNewReservationForSlot(selectedArea, slot.startTime, slot.endTime)
                      }
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition-all self-end sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agendar Horário
                    </button>
                  </div>
                );
              }

              // OCUPADO / RESERVADO
              const isEmUso = res?.status === 'em_uso';
              const isConcluida = res?.status === 'concluida';

              return (
                <div
                  key={`${slot.startTime}-${slot.endTime}`}
                  className="p-4 sm:px-6 bg-slate-50/40 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    {/* Time */}
                    <div className="min-w-[130px] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-bold font-mono tabular-nums text-indigo-900">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>

                    {/* Unit & Resident Info */}
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          Apto {res?.unitNumber}
                        </span>
                        <span className="text-[10px] text-slate-500">{res?.unitBlock}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {res?.residentName}
                          </span>
                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isEmUso
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isConcluida
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {isEmUso ? 'Em Uso na Área' : isConcluida ? 'Concluída' : 'Confirmada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                          <span>{res?.reservationCode}</span>
                          {res?.residentPhone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{res.residentPhone}</span>
                            </>
                          )}
                          {res?.guestCount && res.guestCount > 1 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{res.guestCount} participantes</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Portaria / Operator */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {res && (
                      <>
                        <button
                          type="button"
                          onClick={() => onViewReceipt(res)}
                          title="Visualizar Comprovante da Reserva"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Comprovante</span>
                        </button>

                        {/* Portaria Check-In / Check-Out */}
                        {res.status === 'confirmada' && (
                          <button
                            type="button"
                            onClick={() => onUpdateReservationStatus(res.id, 'em_uso')}
                            title="Registrar início de uso na portaria"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Check-in</span>
                          </button>
                        )}

                        {res.status === 'em_uso' && (
                          <button
                            type="button"
                            onClick={() => onUpdateReservationStatus(res.id, 'concluida')}
                            title="Registrar encerramento e devolução"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Encerrar</span>
                          </button>
                        )}

                        {/* Cancel reservation */}
                        {res.status !== 'concluida' && (
                          <button
                            type="button"
                            onClick={() => onCancelReservation(res.id)}
                            title="Cancelar reserva deste horário"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
