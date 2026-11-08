import React, { useState, useMemo } from 'react';
import { 
  Building, 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  UserPlus, 
  Trash2, 
  Check, 
  X,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { Unit, Resident } from '../types';

interface UnitsManagementProps {
  condoName: string;
  condoId: string;
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
  onAddResidentToUnit: (unitId: string, resident: Resident) => void;
  onRemoveResident: (unitId: string, residentId: string) => void;
}

export const UnitsManagement: React.FC<UnitsManagementProps> = ({
  condoName,
  condoId,
  units,
  onAddUnit,
  onAddResidentToUnit,
  onRemoveResident,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewUnitModal, setShowNewUnitModal] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newUnitBlock, setNewUnitBlock] = useState('Bloco A');
  const [activeUnitForResident, setActiveUnitForResident] = useState<string | null>(null);

  // New resident form states
  const [resName, setResName] = useState('');
  const [resRole, setResRole] = useState<'proprietario' | 'inquilino' | 'dependente'>('proprietario');
  const [resPhone, setResPhone] = useState('');
  const [resEmail, setResEmail] = useState('');

  const condoUnits = useMemo(() => {
    return units.filter((u) => u.condoId === condoId);
  }, [units, condoId]);

  const filteredUnits = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return condoUnits;
    return condoUnits.filter(
      (u) =>
        u.number.toLowerCase().includes(term) ||
        u.block.toLowerCase().includes(term) ||
        u.residents.some((r) => r.name.toLowerCase().includes(term) || r.phone.includes(term))
    );
  }, [condoUnits, searchTerm]);

  const totalResidents = useMemo(() => {
    return condoUnits.reduce((acc, u) => acc + u.residents.length, 0);
  }, [condoUnits]);

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber.trim()) return;

    const unit: Unit = {
      id: `unit-${Date.now()}`,
      condoId,
      number: newUnitNumber.trim(),
      block: newUnitBlock.trim(),
      residents: [],
    };

    onAddUnit(unit);
    setNewUnitNumber('');
    setShowNewUnitModal(false);
  };

  const handleAddResident = (unitId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) return;

    const resident: Resident = {
      id: `res-${Date.now()}`,
      name: resName.trim(),
      role: resRole,
      phone: resPhone.trim(),
      email: resEmail.trim(),
      isResponsible: resRole === 'proprietario',
    };

    onAddResidentToUnit(unitId, resident);
    setActiveUnitForResident(null);
    setResName('');
    setResPhone('');
    setResEmail('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            Cadastro de Unidades e Moradores
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>{condoName}</span>
            <span aria-hidden="true">·</span>
            <span>{condoUnits.length} Unidades</span>
            <span aria-hidden="true">·</span>
            <span>{totalResidents} Moradores cadastrados</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar unidade ou morador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNewUnitModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Unidade
          </button>
        </div>
      </div>

      {/* New Unit Modal */}
      {showNewUnitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Cadastrar Nova Unidade</h3>
              <button
                onClick={() => setShowNewUnitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número / Identificação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 304, 1201, Casa 15"
                  value={newUnitNumber}
                  onChange={(e) => setNewUnitNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bloco / Torre / Alameda
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bloco A, Torre Sul, Alameda das Palmeiras"
                  value={newUnitBlock}
                  onChange={(e) => setNewUnitBlock(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewUnitModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Salvar Unidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid of Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
            Nenhuma unidade encontrada.
          </div>
        ) : (
          filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {unit.number}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">
                        Unidade {unit.number}
                      </h3>
                      <span className="text-[11px] text-slate-500">{unit.block}</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {unit.residents.length} {unit.residents.length === 1 ? 'morador' : 'moradores'}
                  </span>
                </div>

                {/* Moradores list */}
                <div className="mt-3 space-y-2">
                  {unit.residents.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2">
                      Nenhum morador cadastrado nesta unidade.
                    </p>
                  ) : (
                    unit.residents.map((resident) => (
                      <div
                        key={resident.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{resident.name}</span>
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded capitalize">
                              {resident.role}
                            </span>
                          </div>
                          {resident.phone && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {resident.phone}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveResident(unit.id, resident.id)}
                          title="Remover morador"
                          className="p-1 text-slate-300 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add resident inline toggle */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                {activeUnitForResident === unit.id ? (
                  <form
                    onSubmit={(e) => handleAddResident(unit.id, e)}
                    className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2 animate-in fade-in duration-150"
                  >
                    <span className="text-[11px] font-bold text-slate-800 block">
                      Novo Morador na Unidade {unit.number}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Nome completo..."
                      value={resName}
                      onChange={(e) => setResName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={resRole}
                        onChange={(e: any) => setResRole(e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      >
                        <option value="proprietario">Proprietário</option>
                        <option value="inquilino">Inquilino</option>
                        <option value="dependente">Dependente</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Telefone / WhatsApp"
                        value={resPhone}
                        onChange={(e) => setResPhone(e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveUnitForResident(null)}
                        className="px-2 py-0.5 text-[11px] text-slate-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-0.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                      >
                        Salvar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveUnitForResident(unit.id);
                      setResName('');
                      setResPhone('');
                    }}
                    className="w-full py-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/60 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Adicionar Morador
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
