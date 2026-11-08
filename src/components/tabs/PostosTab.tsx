import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Navigation, 
  Compass, 
  Phone, 
  Shield, 
  Users, 
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CondominioPosto } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

export const PostosTab: React.FC = () => {
  const { condominios, turnos, colaboradores, addCondominio, showToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondoForMap, setSelectedCondoForMap] = useState<CondominioPosto | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<CondominioPosto['tipo']>('Residencial');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('São Paulo');
  const [uf, setUf] = useState('SP');
  const [latitude, setLatitude] = useState('-23.5505');
  const [longitude, setLongitude] = useState('-46.6333');
  const [raioGpsMetros, setRaioGpsMetros] = useState('75');
  const [postosDia, setPostosDia] = useState('2');
  const [postosNoite, setPostosNoite] = useState('1');
  const [contatoSindico, setContatoSindico] = useState('');
  const [telefoneSindico, setTelefoneSindico] = useState('');

  // GPS Simulation state
  const [simulatedDistance, setSimulatedDistance] = useState<number>(35);

  const handleCreateCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !endereco.trim()) {
      showToast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    await addCondominio({
      nome: nome.trim(),
      tipo,
      endereco: endereco.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      latitude: parseFloat(latitude) || -23.5505,
      longitude: parseFloat(longitude) || -46.6333,
      raioGpsMetros: parseInt(raioGpsMetros, 10) || 60,
      postosRequeridosDia: parseInt(postosDia, 10) || 2,
      postosRequeridosNoite: parseInt(postosNoite, 10) || 1,
      contatoSindico: contatoSindico.trim() || 'Administração',
      telefoneSindico: telefoneSindico.trim() || '(11) 98000-0000'
    });

    // Reset
    setNome('');
    setEndereco('');
    setContatoSindico('');
    setTelefoneSindico('');
    setIsModalOpen(false);
  };

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
          showToast('Coordenadas GPS capturadas do dispositivo!', 'success');
        },
        () => {
          // Default fallback
          setLatitude('-23.5682');
          setLongitude('-46.6621');
          showToast('Usando coordenadas padrão da central SP', 'info');
        }
      );
    }
  };

  const filteredCondos = condominios.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.endereco.toLowerCase().includes(q) ||
      c.tipo.toLowerCase().includes(q) ||
      c.contatoSindico.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header with [+ Cadastrar Posto] */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span>Condomínios & Postos</span>
          </h2>
          <p className="text-xs text-slate-400">
            {condominios.length} postos com cerca eletrônica ativa
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cadastrar Posto</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por condomínio, bairro ou tipo..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Condominium Cards */}
      <div className="space-y-3">
        {filteredCondos.map((condo) => {
          // Count active shifts in this condo
          const condoTurnos = turnos.filter(t => t.condominioId === condo.id);
          const hasEmpty = condoTurnos.some(t => t.status === 'vazio');
          const hasFT = condoTurnos.some(t => t.status === 'em_ft');
          const assignedColabs = colaboradores.filter(c => c.condominioId === condo.id);

          return (
            <div
              key={condo.id}
              className={`bg-slate-900/90 rounded-2xl border p-4 shadow-sm transition-all ${
                hasEmpty
                  ? 'border-red-500/50 shadow-red-950/20'
                  : hasFT
                  ? 'border-amber-500/40 shadow-amber-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-500/20">
                      {condo.tipo}
                    </span>
                    {hasEmpty && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded-full border border-red-500/30">
                        1 Posto Vazio
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 truncate">{condo.nome}</h3>
                  <p className="text-xs text-slate-400 flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{condo.endereco}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCondoForMap(condo)}
                  className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors shrink-0"
                  title="Ver Cerca GPS / Geofence"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              {/* Geofence & Post Stats Pill */}
              <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Raio Geofence</span>
                  <span className="text-xs font-bold text-emerald-400">{condo.raioGpsMetros}m</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Efetivo Vinculado</span>
                  <span className="text-xs font-bold text-white">{assignedColabs.length} operadores</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Postos Dia / Noite</span>
                  <span className="text-xs font-bold text-blue-400">{condo.postosRequeridosDia} / {condo.postosRequeridosNoite}</span>
                </div>
              </div>

              {/* Contact Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">Síndico: <strong className="text-slate-200">{condo.contatoSindico}</strong></span>
                {condo.telefoneSindico && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean = condo.telefoneSindico.replace(/\D/g, '');
                      window.open(`https://wa.me/55${clean}`, '_blank');
                    }}
                    className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Ligar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* [+ Cadastrar Posto] Drawer / Modal */}
      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Condomínio / Posto"
        subtitle="Configuração de perímetro e geofencing para ponto mobile"
        maxHeight="max-h-[92vh]"
      >
        <form onSubmit={handleCreateCondominio} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Nome do Condomínio / Posto *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Condomínio Edifício Grand Boulevard"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Tipo de Imóvel
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as CondominioPosto['tipo'])}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Condomínio Fechado">Condomínio Fechado</option>
                <option value="Indústria">Indústria</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Raio GPS Geofence (metros)
              </label>
              <input
                type="number"
                min="20"
                max="500"
                value={raioGpsMetros}
                onChange={(e) => setRaioGpsMetros(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Endereço Completo *
            </label>
            <input
              type="text"
              required
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Coordinates with Auto-Detect Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Coordenadas Geográficas (Lat/Long)
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Usar Meu GPS</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Latitude: -23.5505"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Longitude: -46.6333"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Postos Requeridos Dia
              </label>
              <input
                type="number"
                min="1"
                value={postosDia}
                onChange={(e) => setPostosDia(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Postos Requeridos Noite
              </label>
              <input
                type="number"
                min="0"
                value={postosNoite}
                onChange={(e) => setPostosNoite(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome do Síndico / Gestor
              </label>
              <input
                type="text"
                value={contatoSindico}
                onChange={(e) => setContatoSindico(e.target.value)}
                placeholder="Ex: Dr. Marcelo"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Telefone Síndico
              </label>
              <input
                type="text"
                value={telefoneSindico}
                onChange={(e) => setTelefoneSindico(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
              Salvar Posto
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Geofence Simulator Drawer */}
      <BottomSheet
        isOpen={Boolean(selectedCondoForMap)}
        onClose={() => setSelectedCondoForMap(null)}
        title={`Geofencing: ${selectedCondoForMap?.nome || ''}`}
        subtitle="Simulador de Perímetro GPS e validação de presença do colaborador"
      >
        {selectedCondoForMap && (
          <div className="space-y-4">
            {/* Interactive Radar Visualizer */}
            <div className="relative h-56 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
              {/* Radar Rings */}
              <div className="absolute w-48 h-48 rounded-full border border-blue-500/20" />
              <div className="absolute w-36 h-36 rounded-full border border-blue-500/30" />
              <div className="absolute w-24 h-24 rounded-full border border-blue-500/50 bg-blue-500/10" />

              {/* Center Pin (Condo Guarita) */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-blue-300 mt-1 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
                  Guarita Central
                </span>
              </div>

              {/* Simulated Operator Marker */}
              <div 
                className="absolute z-20 transition-all duration-300 flex flex-col items-center"
                style={{
                  transform: `translate(${Math.min(simulatedDistance * 1.5, 90)}px, ${Math.min(simulatedDistance * 0.8, 60)}px)`
                }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md ${
                  simulatedDistance <= selectedCondoForMap.raioGpsMetros ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  P
                </div>
                <span className="text-[9px] font-semibold text-white bg-slate-900/90 px-1 rounded">
                  {simulatedDistance}m
                </span>
              </div>
            </div>

            {/* Slider to test different distances */}
            <div className="space-y-2 bg-slate-850 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Simular Distância do Operador:</span>
                <span className={`font-mono font-bold ${
                  simulatedDistance <= selectedCondoForMap.raioGpsMetros ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {simulatedDistance} metros (Raio permitido: {selectedCondoForMap.raioGpsMetros}m)
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                value={simulatedDistance}
                onChange={(e) => setSimulatedDistance(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Result status */}
            <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
              simulatedDistance <= selectedCondoForMap.raioGpsMetros
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}>
              {simulatedDistance <= selectedCondoForMap.raioGpsMetros ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold">Dentro do Raio Autorizado!</p>
                    <p className="text-[11px] opacity-80">Ponto eletrônico mobile liberado para registro.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="font-bold">Fora da Cerca Geográfica!</p>
                    <p className="text-[11px] opacity-80">O colaborador está a mais de {selectedCondoForMap.raioGpsMetros}m do posto.</p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCondoForMap(null)}
              className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Fechar Visualizador
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
