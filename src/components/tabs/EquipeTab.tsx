import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Building2, 
  Phone, 
  CreditCard, 
  Calendar, 
  MessageCircle,
  Briefcase,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Colaborador, JourneyType } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

export const EquipeTab: React.FC = () => {
  const { colaboradores, condominios, addColaborador, showToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJornada, setFilterJornada] = useState<string>('todos');

  // Form State for [+ Novo Colaborador]
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cargo, setCargo] = useState<Colaborador['cargo']>('Porteiro');
  const [jornada, setJornada] = useState<JourneyType>('12x36');
  const [condominioId, setCondominioId] = useState(condominios[0]?.id || '');
  const [telefone, setTelefone] = useState('');
  const [salarioBase, setSalarioBase] = useState('2300.00');
  const [fotoUrl, setFotoUrl] = useState('');

  // Sample avatar presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  ];

  const handleCreateColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cpf.trim()) {
      showToast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    const randomMatricula = matricula.trim() || `TC-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomAvatar = fotoUrl.trim() || avatarPresets[Math.floor(Math.random() * avatarPresets.length)];

    await addColaborador({
      nome: nome.trim(),
      cpf: cpf.trim(),
      matricula: randomMatricula,
      cargo,
      jornada,
      condominioId,
      fotoUrl: randomAvatar,
      telefone: telefone.trim() || '(11) 98000-0000',
      ativo: true,
      salarioBase: parseFloat(salarioBase) || 2250,
      dataAdmissao: new Date().toISOString().split('T')[0]
    });

    // Reset form
    setNome('');
    setCpf('');
    setMatricula('');
    setTelefone('');
    setFotoUrl('');
    setIsModalOpen(false);
  };

  const filteredColabs = colaboradores.filter(c => {
    if (filterJornada !== 'todos' && c.jornada !== filterJornada) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const condo = condominios.find(cd => cd.id === c.condominioId);
      return (
        c.nome.toLowerCase().includes(q) ||
        c.cpf.includes(q) ||
        c.matricula.toLowerCase().includes(q) ||
        c.cargo.toLowerCase().includes(q) ||
        (condo?.nome || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header with [+ Novo Colaborador] */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Gestão da Equipe</span>
          </h2>
          <p className="text-xs text-slate-400">
            {colaboradores.length} colaboradores ativos no efetivo
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Novo Colaborador</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, CPF ou matrícula..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Journey Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterJornada('todos')}
            className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-colors ${
              filterJornada === 'todos' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Todas as Jornadas
          </button>
          <button
            type="button"
            onClick={() => setFilterJornada('12x36')}
            className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-colors ${
              filterJornada === '12x36' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            12x36 Diurno
          </button>
          <button
            type="button"
            onClick={() => setFilterJornada('12x36_noturno')}
            className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-colors ${
              filterJornada === '12x36_noturno' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            12x36 Noturno
          </button>
          <button
            type="button"
            onClick={() => setFilterJornada('5x2')}
            className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-colors ${
              filterJornada === '5x2' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            5x2 Administrativo
          </button>
          <button
            type="button"
            onClick={() => setFilterJornada('6x1')}
            className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-colors ${
              filterJornada === '6x1' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            6x1
          </button>
        </div>
      </div>

      {/* Staff List */}
      <div className="space-y-2.5">
        {filteredColabs.map((colab) => {
          const condo = condominios.find(c => c.id === colab.condominioId);
          return (
            <div
              key={colab.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img
                      src={colab.fotoUrl}
                      alt={colab.nome}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-800 shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{colab.nome}</h3>
                    <p className="text-[11px] text-blue-400 font-medium">
                      {colab.cargo} &bull; Matrícula: {colab.matricula}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{condo?.nome || 'Condomínio não vinculado'}</span>
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                  {colab.jornada}
                </span>
              </div>

              {/* Extra Info Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="text-slate-400 flex items-center gap-3">
                  <span>CPF: <strong className="text-slate-300 font-mono">{colab.cpf}</strong></span>
                  <span>Salário: <strong className="text-emerald-400">R$ {colab.salarioBase.toFixed(2)}</strong></span>
                </div>

                {colab.telefone && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean = colab.telefone.replace(/\D/g, '');
                      window.open(`https://wa.me/55${clean}`, '_blank');
                    }}
                    className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* [+ Novo Colaborador] Drawer / Modal */}
      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Colaborador"
        subtitle="Adicionar operador ao quadro efetivo do TurnoCerto"
        maxHeight="max-h-[92vh]"
      >
        <form onSubmit={handleCreateColaborador} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Ferreira da Silva"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                CPF *
              </label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Matrícula
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="TC-2026"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Cargo / Função
              </label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value as Colaborador['cargo'])}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Porteiro">Porteiro</option>
                <option value="Porteiro Líder">Porteiro Líder</option>
                <option value="Controlador de Acesso">Controlador de Acesso</option>
                <option value="Vigilante">Vigilante</option>
                <option value="Zelador">Zelador</option>
                <option value="Recepcionista">Recepcionista</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Jornada
              </label>
              <select
                value={jornada}
                onChange={(e) => setJornada(e.target.value as JourneyType)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="12x36">12x36 Diurno</option>
                <option value="12x36_noturno">12x36 Noturno</option>
                <option value="6x1">6x1 Folguista</option>
                <option value="5x2">5x2 Comercial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Condomínio Vinculado
            </label>
            <select
              value={condominioId}
              onChange={(e) => setCondominioId(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {condominios.map((condo) => (
                <option key={condo.id} value={condo.id}>
                  {condo.nome} ({condo.tipo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                WhatsApp / Telefone
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Salário Base (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={salarioBase}
                onChange={(e) => setSalarioBase(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Quick Avatar selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {avatarPresets.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Opção ${idx + 1}`}
                  onClick={() => setFotoUrl(url)}
                  className={`w-10 h-10 rounded-full object-cover cursor-pointer transition-all ${
                    fotoUrl === url ? 'ring-2 ring-blue-500 scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 min-h-[48px] rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              Salvar Colaborador
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
