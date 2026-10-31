import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  ShieldCheck, 
  Users, 
  Layers, 
  Check, 
  ArrowRight, 
  Lock, 
  MapPin, 
  Phone, 
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { Condominium, Resident, AccessLog } from '../types';
import { audioService } from '../services/audioService';

interface CondominiumManagerProps {
  condominiums: Condominium[];
  activeCondoId: string;
  onSelectCondo: (condoId: string) => void;
  onSaveCondominium: (condo: Condominium) => void;
  allResidents: Resident[];
  allLogs: AccessLog[];
}

export const CondominiumManager: React.FC<CondominiumManagerProps> = ({
  condominiums,
  activeCondoId,
  onSelectCondo,
  onSaveCondominium,
  allResidents,
  allLogs
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [totalUnits, setTotalUnits] = useState(60);
  const [securityLevel, setSecurityLevel] = useState<'Alto' | 'Médio' | 'Máximo'>('Máximo');
  const [syndicName, setSyndicName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleCreateCondo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCode = code.trim().toUpperCase() || name.substring(0, 4).toUpperCase();
    const newCondo: Condominium = {
      id: `condo_${Date.now()}`,
      name: name.trim(),
      code: newCode,
      cnpj: cnpj.trim() || '00.000.000/0001-00',
      address: address.trim() || 'Endereço Principal',
      city: city.trim() || 'São Paulo',
      state: state.trim() || 'SP',
      totalUnits: Number(totalUnits) || 50,
      activeResidents: 0,
      securityLevel: securityLevel,
      contactPhone: contactPhone.trim() || '(11) 3000-0000',
      syndicName: syndicName.trim() || 'Administrador',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onSaveCondominium(newCondo);
    onSelectCondo(newCondo.id);
    audioService.playSuccessChime();
    setIsCreateModalOpen(false);

    // Reset Form
    setName('');
    setCode('');
    setCnpj('');
    setAddress('');
    setCity('');
    setSyndicName('');
    setContactPhone('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white">Central Multi-Condomínio</h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              Multi-Tenant Isolado
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie múltiplos condomínios com segregação criptográfica de dados e banco de biometrias 100% isolado.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Condomínio</span>
        </button>
      </div>

      {/* Isolation Guarantee Banner */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Política de Não-Mistura de Dados</h4>
            <p className="text-xs text-slate-400">
              Cada condomínio possui banco de dados particionado. Moradores e credenciais do Condomínio A jamais serão acessíveis ou validados nos totens do Condomínio B.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 whitespace-nowrap">
          {condominiums.length} condomínios ativos na plataforma
        </span>
      </div>

      {/* CONDOMINIUMS CARDS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {condominiums.map((condo) => {
          const isActive = condo.id === activeCondoId;
          const condoResidentsCount = allResidents.filter(r => r.condoId === condo.id).length;
          const condoLogsCount = allLogs.filter(l => l.condoId === condo.id).length;

          return (
            <div
              key={condo.id}
              className={`rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-5 ${
                isActive
                  ? 'bg-slate-900/90 border-cyan-500/50 ring-2 ring-cyan-500/20 shadow-xl shadow-cyan-950/20'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded uppercase">
                      {condo.code}
                    </span>
                    <h3 className="font-bold text-white text-base mt-1.5">{condo.name}</h3>
                  </div>

                  {isActive ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Ativo no App
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{condo.address}, {condo.city} - {condo.state}</span>
                </p>

                {/* Specs */}
                <div className="bg-slate-950/70 border border-slate-900 p-3.5 rounded-2xl text-xs font-mono space-y-1.5 text-slate-400">
                  <div className="flex justify-between">
                    <span>CNPJ:</span>
                    <span className="text-slate-200">{condo.cnpj}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Síndico:</span>
                    <span className="text-slate-200">{condo.syndicName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moradores no Banco:</span>
                    <span className="text-cyan-400 font-bold">{condoResidentsCount} cadastrados</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unidades / Aptos:</span>
                    <span className="text-slate-200">{condo.totalUnits} unidades</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auditoria de Logs:</span>
                    <span className="text-emerald-400 font-bold">{condoLogsCount} eventos</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isActive ? (
                  <div className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Condomínio em Operação
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onSelectCondo(condo.id);
                      audioService.playGateRelayClick();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Alternar para este Condomínio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW CONDOMINIUM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Cadastrar Novo Condomínio</h3>
                <p className="text-xs text-slate-400">Criará uma partição de dados exclusiva com chave própria.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCondo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome do Condomínio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Condomínio Solar das Águas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sigla / Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="SOLAR-04"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Total de Unidades / Aptos</label>
                  <input
                    type="number"
                    min="1"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Endereço Completo</label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Barueri"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Estado</label>
                  <input
                    type="text"
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nome do(a) Síndico(a)</label>
                  <input
                    type="text"
                    placeholder="Nome do responsável"
                    value={syndicName}
                    onChange={(e) => setSyndicName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Telefone da Administração</label>
                  <input
                    type="text"
                    placeholder="(11) 4000-0000"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Criar e Ativar Condomínio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
