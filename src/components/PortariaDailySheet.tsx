import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Calendar, 
  Clock, 
  Search, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Building,
  User,
  Phone
} from 'lucide-react';
import { Reservation, CommonArea } from '../types';
import { AreaIcon } from './AreaIcon';
import { formatDatePTBR, formatCurrencyBRL, getTodayDateString } from '../utils/timeSlots';

interface PortariaDailySheetProps {
  condoName: string;
  areas: CommonArea[];
  reservations: Reservation[];
  onUpdateReservationStatus: (reservationId: string, status: Reservation['status']) => void;
  onViewReceipt: (reservation: Reservation) => void;
}

export const PortariaDailySheet: React.FC<PortariaDailySheetProps> = ({
  condoName,
  areas,
  reservations,
  onUpdateReservationStatus,
  onViewReceipt,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const areasMap = useMemo(() => {
    return new Map(areas.map((a) => [a.id, a]));
  }, [areas]);

  // Daily reservations sorted chronologically
  const dailyReservations = useMemo(() => {
    return reservations
      .filter((r) => r.date === selectedDate && r.status !== 'cancelada')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [reservations, selectedDate]);

  // Filtered
  const filteredList = useMemo(() => {
    return dailyReservations.filter((r) => {
      const matchStatus = filterStatus === 'todos' || r.status === filterStatus;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        r.unitNumber.toLowerCase().includes(term) ||
        r.residentName.toLowerCase().includes(term) ||
        r.reservationCode.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [dailyReservations, filterStatus, searchTerm]);

  // Currently happening (now)
  const currentOngoing = useMemo(() => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    return dailyReservations.filter((r) => {
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      const sMins = sh * 60 + sm;
      let eMins = eh * 60 + em;
      if (eMins <= sMins) eMins += 24 * 60;

      return (
        r.date === getTodayDateString() &&
        (r.status === 'em_uso' || (currentMins >= sMins && currentMins < eMins && r.status === 'confirmada'))
      );
    });
  }, [dailyReservations]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Portaria Header & Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Controle Operacional da Portaria
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escala diária de liberação de áreas comuns e controle de chaves e acessos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
            />

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Escala
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filterStatus === 'todos' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Todos ({dailyReservations.length})
            </button>
            <button
              onClick={() => setFilterStatus('confirmada')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filterStatus === 'confirmada' ? 'bg-white text-indigo-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Aguardando Início
            </button>
            <button
              onClick={() => setFilterStatus('em_uso')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filterStatus === 'em_uso' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Em Uso Agora
            </button>
            <button
              onClick={() => setFilterStatus('concluida')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filterStatus === 'concluida' ? 'bg-white text-slate-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Concluídas
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar unidade ou morador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Acontecendo Agora Banner */}
      {selectedDate === getTodayDateString() && currentOngoing.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs no-print">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Áreas Ocupadas / Em Uso Agora
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentOngoing.map((res) => {
              const area = areasMap.get(res.areaId);
              return (
                <div key={res.id} className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{area?.name}</span>
                    <span className="text-[11px] text-slate-600 font-mono">
                      Apto {res.unitNumber} ({res.unitBlock}) · {res.residentName}
                    </span>
                    <span className="text-[10px] text-amber-700 block mt-0.5 font-mono tabular-nums">
                      Horário: {res.startTime} às {res.endTime}
                    </span>
                  </div>
                  {res.status === 'em_uso' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateReservationStatus(res.id, 'concluida')}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                    >
                      Encerrar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateReservationStatus(res.id, 'em_uso')}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300"
                    >
                      Check-in
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Printable Sheet Presentation */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Printable Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Escala de Áreas Comuns: {formatDatePTBR(selectedDate)}
            </h3>
            <span className="text-xs text-slate-500 font-medium">{condoName}</span>
          </div>
          <span className="text-xs text-slate-600 font-mono tabular-nums">
            Total: {filteredList.length} agendamentos
          </span>
        </div>

        {/* Reservations Table */}
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Nenhum agendamento para esta data com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Horário</th>
                  <th className="py-3 px-4">Área Comum</th>
                  <th className="py-3 px-4">Unidade / Morador</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Convidados</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right no-print">Ações Portaria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((res) => {
                  const area = areasMap.get(res.areaId);
                  const isEmUso = res.status === 'em_uso';
                  const isConcluida = res.status === 'concluida';

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Horário */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {res.startTime} - {res.endTime}
                      </td>

                      {/* Área */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <AreaIcon type={area?.type || 'quadra'} className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800">{area?.name || 'Área Comum'}</span>
                        </div>
                      </td>

                      {/* Unidade & Morador */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          Apto {res.unitNumber} ({res.unitBlock})
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {res.residentName}
                        </div>
                        {res.notes && (
                          <div className="text-[10px] text-amber-700 italic mt-0.5">
                            Obs: {res.notes}
                          </div>
                        )}
                      </td>

                      {/* Telefone */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {res.residentPhone || '-'}
                      </td>

                      {/* Convidados */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {res.guestCount} {res.guestCount === 1 ? 'pessoa' : 'pessoas'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isEmUso
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isConcluida
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {isEmUso ? 'Em Uso' : isConcluida ? 'Concluída' : 'Confirmada'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(res)}
                            title="Comprovante"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {res.status === 'confirmada' && (
                            <button
                              type="button"
                              onClick={() => onUpdateReservationStatus(res.id, 'em_uso')}
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded flex items-center gap-1"
                            >
                              <LogIn className="w-3 h-3" />
                              Entrada
                            </button>
                          )}

                          {res.status === 'em_uso' && (
                            <button
                              type="button"
                              onClick={() => onUpdateReservationStatus(res.id, 'concluida')}
                              className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              Saída
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
