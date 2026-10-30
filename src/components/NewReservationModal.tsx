import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Building, 
  UserCheck, 
  PlusCircle, 
  Check, 
  Search, 
  Users, 
  Info,
  DollarSign
} from 'lucide-react';
import { CommonArea, Unit, Resident, Reservation } from '../types';
import { AreaIcon } from './AreaIcon';
import { formatDatePTBR, formatCurrencyBRL, generateReservationCode } from '../utils/timeSlots';

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: CommonArea[];
  units: Unit[];
  selectedArea?: CommonArea;
  selectedDate: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
  onConfirmReservation: (reservation: Reservation) => void;
  onQuickAddResident: (unitId: string, resident: Resident) => void;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  isOpen,
  onClose,
  areas,
  units,
  selectedArea: initialArea,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  onConfirmReservation,
  onQuickAddResident,
}) => {
  const [areaId, setAreaId] = useState<string>(initialArea?.id || areas[0]?.id || '');
  const [unitSearch, setUnitSearch] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [showAddResident, setShowAddResident] = useState<boolean>(false);
  const [newResidentName, setNewResidentName] = useState<string>('');
  const [newResidentRole, setNewResidentRole] = useState<'proprietario' | 'inquilino' | 'dependente'>('proprietario');
  const [newResidentPhone, setNewResidentPhone] = useState<string>('');

  const currentArea = useMemo(() => {
    return areas.find((a) => a.id === areaId) || initialArea || areas[0];
  }, [areas, areaId, initialArea]);

  // Sync initial area when opened
  useEffect(() => {
    if (initialArea) {
      setAreaId(initialArea.id);
    }
  }, [initialArea]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUnitSearch('');
      setSelectedUnit(null);
      setSelectedResident(null);
      setShowAddResident(false);
      setGuestCount(1);
      setNotes('');
    }
  }, [isOpen]);

  // Filter units based on search input
  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return units.slice(0, 8); // show first few by default
    return units.filter(
      (u) =>
        u.number.toLowerCase().includes(q) ||
        u.block.toLowerCase().includes(q) ||
        u.residents.some((r) => r.name.toLowerCase().includes(q))
    );
  }, [units, unitSearch]);

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitSearch(`${unit.number} - ${unit.block}`);
    // Pre-select responsible resident if available, or first resident
    const responsible = unit.residents.find((r) => r.isResponsible) || unit.residents[0] || null;
    setSelectedResident(responsible);
    setShowAddResident(false);
  };

  const handleCreateNewResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit || !newResidentName.trim()) return;

    const newRes: Resident = {
      id: `res-quick-${Date.now()}`,
      name: newResidentName.trim(),
      role: newResidentRole,
      phone: newResidentPhone.trim(),
      email: '',
      isResponsible: false,
    };

    onQuickAddResident(selectedUnit.id, newRes);
    setSelectedResident(newRes);
    setShowAddResident(false);
    setNewResidentName('');
    setNewResidentPhone('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArea || !selectedUnit || !selectedResident) return;

    const reservation: Reservation = {
      id: `res-${Date.now()}`,
      condoId: currentArea.condoId,
      areaId: currentArea.id,
      unitId: selectedUnit.id,
      unitNumber: selectedUnit.number,
      unitBlock: selectedUnit.block,
      residentId: selectedResident.id,
      residentName: selectedResident.name,
      residentPhone: selectedResident.phone,
      date: selectedDate,
      startTime: selectedStartTime || currentArea.startHour,
      endTime: selectedEndTime || '10:00',
      status: 'confirmada',
      guestCount: Number(guestCount) || 1,
      notes: notes.trim(),
      cleaningFee: currentArea.cleaningFee || 0,
      createdAt: new Date().toISOString(),
      reservationCode: generateReservationCode(selectedUnit.number),
    };

    onConfirmReservation(reservation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <AreaIcon type={currentArea?.type || 'quadra'} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Nova Reserva de Horário
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>{currentArea?.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{selectedStartTime} - {selectedEndTime}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Reservation Context summary bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Data Selecionada</span>
                <span className="font-medium text-slate-900">{formatDatePTBR(selectedDate)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Horário Reservado</span>
                <span className="font-semibold text-indigo-700 font-mono tabular-nums">
                  {selectedStartTime} às {selectedEndTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Taxa de Uso</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrencyBRL(currentArea?.cleaningFee || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Area Selector if opened generally */}
          {!initialArea && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Área Comum
              </label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.startHour} às {a.endHour})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PASSO 1: Seleção da Unidade / Apartamento */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-900">
                1. Número da Unidade / Apartamento
              </label>
              <span className="text-[11px] text-slate-500">
                Digite o número (ex: 402, 101) ou selecione abaixo
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar apartamento ou bloco..."
                value={unitSearch}
                onChange={(e) => {
                  setUnitSearch(e.target.value);
                  if (selectedUnit && `${selectedUnit.number} - ${selectedUnit.block}` !== e.target.value) {
                    setSelectedUnit(null);
                    setSelectedResident(null);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 bg-white placeholder:text-slate-400"
              />
              {selectedUnit && (
                <span className="absolute right-3 top-2.5 text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Unidade Selecionada
                </span>
              )}
            </div>

            {/* Units quick suggestion cards */}
            {!selectedUnit && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-lg bg-slate-50/50">
                {filteredUnits.length === 0 ? (
                  <div className="col-span-full py-3 text-center text-xs text-slate-500">
                    Nenhuma unidade encontrada com o termo pesquisado.
                  </div>
                ) : (
                  filteredUnits.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => handleSelectUnit(u)}
                      className="flex flex-col items-start p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                          {u.number}
                        </span>
                        <span className="text-[10px] text-slate-500">{u.block}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">
                        {u.residents[0]?.name || 'Sem moradores cadastrados'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* PASSO 2: Lista de Moradores da Unidade Selecionada */}
          {selectedUnit && (
            <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    2. Selecione o Morador Solicitante ({selectedUnit.number} · {selectedUnit.block})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Clique no morador que está realizando o agendamento
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddResident(!showAddResident)}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 py-1 px-2 rounded hover:bg-indigo-100/60 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  + Novo Morador
                </button>
              </div>

              {/* Resident List for this unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedUnit.residents.map((resident) => {
                  const isSelected = selectedResident?.id === resident.id;
                  return (
                    <div
                      key={resident.id}
                      onClick={() => setSelectedResident(resident)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {resident.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="capitalize">{resident.role}</span>
                          {resident.phone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{resident.phone}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-300 bg-slate-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Resident Inline Form */}
              {showAddResident && (
                <div className="p-3 bg-white border border-indigo-200 rounded-lg space-y-2.5 mt-2 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-slate-800 block">
                    Adicionar Morador ao {selectedUnit.number}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nome completo..."
                      value={newResidentName}
                      onChange={(e) => setNewResidentName(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={newResidentRole}
                      onChange={(e: any) => setNewResidentRole(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      <option value="proprietario">Proprietário</option>
                      <option value="inquilino">Inquilino</option>
                      <option value="dependente">Dependente / Familiar</option>
                    </select>
                    <input
                      type="text"
                      placeholder="WhatsApp / Telefone..."
                      value={newResidentPhone}
                      onChange={(e) => setNewResidentPhone(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddResident(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewResident}
                      disabled={!newResidentName.trim()}
                      className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded"
                    >
                      Adicionar à Unidade
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 3: Opcionais & Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Participantes / Convidados
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={currentArea?.capacity || 20}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                  className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums font-semibold"
                />
                <span className="text-[11px] text-slate-500">
                  (Capacidade máxima da área: {currentArea?.capacity} pessoas)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações da Portaria (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Empréstimo de material, convidado externo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Area Rules reminder */}
          {currentArea?.rules && currentArea.rules.length > 0 && (
            <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Regras de uso desta área:</span>
                <ul className="list-disc list-inside text-[11px] text-amber-800 mt-0.5 space-y-0.5">
                  {currentArea.rules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!selectedUnit || !selectedResident}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
