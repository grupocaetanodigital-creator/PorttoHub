import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Trash2, 
  Building2, 
  Car, 
  ShieldCheck, 
  Phone, 
  Mail, 
  FileText, 
  Edit3, 
  LayoutGrid, 
  Layers, 
  Check, 
  X,
  Lock,
  Unlock
} from 'lucide-react';
import { Condominium, Resident } from '../types';

interface ResidentsManagementProps {
  condo: Condominium;
  residents: Resident[];
  onToggleStatus: (residentId: string) => void;
  onDeleteResident: (residentId: string) => void;
  onOpenEnrollment: () => void;
  onUpdateResident: (resident: Resident) => void;
}

export const ResidentsManagement: React.FC<ResidentsManagementProps> = ({
  condo,
  residents,
  onToggleStatus,
  onDeleteResident,
  onOpenEnrollment,
  onUpdateResident
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterType, setFilterType] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'cards' | 'units'>('cards');

  // Edit Modal State
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  // Filtered residents
  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.unit ? r.unit.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      (r.document ? r.document.includes(searchTerm) : false) ||
      (r.vehiclePlate ? r.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) : false);

    const matchesStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchesType = filterType === 'todos' || r.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Group by Unit for the 'units' view mode
  const unitGroups: Record<string, Resident[]> = {};
  filteredResidents.forEach((res) => {
    const unitKey = res.unit || 'Sem Unidade Definida';
    if (!unitGroups[unitKey]) {
      unitGroups[unitKey] = [];
    }
    unitGroups[unitKey].push(res);
  });

  // Handle Edit Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResident) {
      onUpdateResident(editingResident);
      setEditingResident(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white">Moradores & Unidades</h2>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
              {condo.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciando registros exclusivos de <strong className="text-cyan-400">{condo.name}</strong> ({residents.length} moradores cadastrados)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'cards'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visão Individual em Cartões"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cartões</span>
            </button>
            <button
              onClick={() => setViewMode('units')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'units'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Agrupar por Unidade Condominial"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Por Unidade</span>
            </button>
          </div>

          <button
            onClick={onOpenEnrollment}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-500/10"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Morador</span>
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar nome, unidade, CPF ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="todos">Todos os Status</option>
          <option value="Ativo">Apenas Ativos (Acesso Liberado)</option>
          <option value="Bloqueado">Apenas Bloqueados</option>
        </select>

        {/* Filter Type */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="todos">Todos os Tipos de Perfil</option>
          <option value="Morador">Morador Titular</option>
          <option value="Dependente">Dependente</option>
          <option value="Inquilino">Inquilino</option>
          <option value="Prestador">Prestador de Serviço</option>
          <option value="Funcionário">Funcionário</option>
        </select>

      </div>

      {/* VIEW MODE 1: CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResidents.map((resident) => (
            <div
              key={resident.id}
              className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition"
            >
              <div className="flex items-start space-x-3.5">
                <img
                  src={resident.avatar}
                  alt={resident.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{resident.name}</h4>
                  <p className="text-xs text-cyan-400 font-semibold truncate">{resident.unit}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono">
                      {resident.type}
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                      Face OK
                    </span>
                  </div>
                </div>
              </div>

              {/* Resident Specs */}
              <div className="space-y-1.5 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-900 font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Documento / CPF:</span>
                  <span className="text-slate-200">{resident.document}</span>
                </div>
                <div className="flex justify-between">
                  <span>Telefone:</span>
                  <span className="text-slate-200">{resident.phone}</span>
                </div>
                {resident.vehiclePlate && (
                  <div className="flex justify-between">
                    <span>Placa Veículo:</span>
                    <span className="text-cyan-400 font-bold">{resident.vehiclePlate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Horário Acesso:</span>
                  <span className="text-emerald-400 font-bold">{resident.accessSchedule || '24h'}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onToggleStatus(resident.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center space-x-1.5 ${
                    resident.status === 'Ativo'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
                  }`}
                  title="Clique para alternar status de liberação"
                >
                  {resident.status === 'Ativo' ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>Ativo</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Bloqueado</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingResident(resident)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                    title="Editar Informações"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteResident(resident.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Remover Cadastro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 2: BY UNIT (ISOLAMENTO POR UNIDADE) */}
      {viewMode === 'units' && (
        <div className="space-y-4">
          {Object.entries(unitGroups).map(([unitName, unitResidents]) => (
            <div
              key={unitName}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{unitName}</h3>
                    <p className="text-xs text-slate-400">
                      {unitResidents.length} pessoa(s) vinculada(s) &bull; Acesso facial ativo
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  Unidade Isolada
                </span>
              </div>

              {/* Residents in this unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unitResidents.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={r.avatar}
                        alt={r.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{r.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {r.type} &bull; {r.phone}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        r.status === 'Ativo'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredResidents.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-sm">Nenhum Morador Encontrado</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não há registros correspondentes aos filtros para o condomínio {condo.name}.
          </p>
        </div>
      )}

      {/* EDIT MODAL OVERLAY */}
      {editingResident && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Editar Cadastro ({condo.code})</h3>
              <button
                onClick={() => setEditingResident(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editingResident.name}
                  onChange={(e) => setEditingResident({ ...editingResident, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Unidade / Apto</label>
                <input
                  type="text"
                  required
                  value={editingResident.unit}
                  onChange={(e) => setEditingResident({ ...editingResident, unit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo de Perfil</label>
                  <select
                    value={editingResident.type}
                    onChange={(e) =>
                      setEditingResident({
                        ...editingResident,
                        type: e.target.value as Resident['type']
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Morador">Morador</option>
                    <option value="Dependente">Dependente</option>
                    <option value="Inquilino">Inquilino</option>
                    <option value="Prestador">Prestador</option>
                    <option value="Funcionário">Funcionário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status de Acesso</label>
                  <select
                    value={editingResident.status}
                    onChange={(e) =>
                      setEditingResident({
                        ...editingResident,
                        status: e.target.value as Resident['status']
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Ativo">Ativo (Liberado)</option>
                    <option value="Bloqueado">Bloqueado (Negado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editingResident.phone}
                    onChange={(e) =>
                      setEditingResident({ ...editingResident, phone: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Placa Veículo</label>
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={editingResident.vehiclePlate || ''}
                    onChange={(e) =>
                      setEditingResident({ ...editingResident, vehiclePlate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingResident(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
