import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  Zap, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Search, 
  Phone, 
  MessageCircle, 
  UserCheck, 
  Calendar, 
  FileText, 
  ArrowRightLeft,
  ChevronRight,
  Filter,
  UserX,
  Stethoscope
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OperationalTeamFilter, CondominioPosto, Colaborador, TurnoPosto } from '../../types';
import { CriticalAlertBanner } from '../common/CriticalAlertBanner';
import { OperationalFilterBar } from '../common/OperationalFilterBar';
import { CondominiosCarousel } from '../common/CondominiosCarousel';
import { CondominioDetailDrawer } from '../modals/CondominioDetailDrawer';

export const OperacaoTab: React.FC = () => {
  const { 
    turnos, 
    condominios, 
    colaboradores, 
    openFTModal, 
    normalizarPosto, 
    showToast 
  } = useApp();

  const [activeOperationalFilter, setActiveOperationalFilter] = useState<OperationalTeamFilter>('todos');
  const [selectedCondoId, setSelectedCondoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondoFor360, setSelectedCondoFor360] = useState<CondominioPosto | null>(null);

  // Filter staff by selectedCondoId first if specified
  const scopeColabs = useMemo(() => {
    return selectedCondoId 
      ? colaboradores.filter(c => c.condominioId === selectedCondoId)
      : colaboradores;
  }, [colaboradores, selectedCondoId]);

  const scopeTurnos = useMemo(() => {
    return selectedCondoId 
      ? turnos.filter(t => t.condominioId === selectedCondoId)
      : turnos;
  }, [turnos, selectedCondoId]);

  // Compute live counts for the 5 filter pill chips
  const counts = useMemo(() => {
    const todos = scopeColabs.length;
    const no_posto = scopeColabs.filter(c => c.statusHoje === 'no_posto').length;
    const de_folga = scopeColabs.filter(c => c.statusHoje === 'de_folga').length;
    const em_falta = scopeTurnos.filter(t => t.status === 'vazio').length + scopeColabs.filter(c => c.statusHoje === 'em_falta').length;
    const afastado = scopeColabs.filter(c => c.statusHoje === 'afastado').length;

    return { todos, no_posto, de_folga, em_falta, afastado };
  }, [scopeColabs, scopeTurnos]);

  // Filtered staff list based on active filter and search query
  const filteredColabs = useMemo(() => {
    return scopeColabs.filter(colab => {
      // Filter by Operational status
      if (activeOperationalFilter === 'no_posto' && colab.statusHoje !== 'no_posto') return false;
      if (activeOperationalFilter === 'de_folga' && colab.statusHoje !== 'de_folga') return false;
      if (activeOperationalFilter === 'em_falta' && colab.statusHoje !== 'em_falta') return false;
      if (activeOperationalFilter === 'afastado' && colab.statusHoje !== 'afastado') return false;

      // Filter by Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const condo = condominios.find(c => c.id === colab.condominioId);
        return (
          colab.nome.toLowerCase().includes(q) ||
          colab.cpf.includes(q) ||
          colab.cargo.toLowerCase().includes(q) ||
          (condo?.nome || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [scopeColabs, activeOperationalFilter, searchQuery, condominios]);

  // Filtered shifts
  const filteredTurnos = useMemo(() => {
    return scopeTurnos.filter(turno => {
      if (activeOperationalFilter === 'em_falta' && turno.status !== 'vazio') return false;
      if (activeOperationalFilter === 'no_posto' && turno.status !== 'coberto' && turno.status !== 'em_ft') return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const condo = condominios.find(c => c.id === turno.condominioId);
        const titular = colaboradores.find(c => c.id === turno.colaboradorTitularId);
        const atual = colaboradores.find(c => c.id === turno.colaboradorAtualId);
        return (
          (condo?.nome || '').toLowerCase().includes(q) ||
          turno.postoNome.toLowerCase().includes(q) ||
          (titular?.nome || '').toLowerCase().includes(q) ||
          (atual?.nome || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopeTurnos, activeOperationalFilter, searchQuery, condominios, colaboradores]);

  const handleWhatsApp = (telefone?: string, nome?: string, customMsg?: string) => {
    if (!telefone) {
      showToast('Telefone não disponível', 'warning');
      return;
    }
    const cleanNum = telefone.replace(/\D/g, '');
    const msg = customMsg || `Olá ${nome || ''}, aqui é da supervisão TurnoCerto / PorttoHub.`;
    window.open(`https://wa.me/55${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Critical Alert Banner (Only shown if empty post exists) */}
      <CriticalAlertBanner />

      {/* 1. SISTEMA DE FILTRAGEM OPERACIONAL AVANÇADA (TOP BAR DE FILTROS) */}
      <OperationalFilterBar
        activeFilter={activeOperationalFilter}
        onFilterChange={setActiveOperationalFilter}
        selectedCondoId={selectedCondoId}
        onSelectCondoId={setSelectedCondoId}
        condominios={condominios}
        counts={counts}
      />

      {/* 2. CARDS DE CONDOMÍNIOS INTERATIVOS (PAINEL 360° DO POSTO) */}
      <CondominiosCarousel
        condominios={condominios}
        turnos={turnos}
        colaboradores={colaboradores}
        selectedCondoId={selectedCondoId || undefined}
        onSelectCondominio={(condo) => setSelectedCondoFor360(condo)}
      />

      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por colaborador, posto ou condomínio..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* VIEW SECTION BASED ON ACTIVE FILTER */}

      {/* SUB-VIEW A: [ 🟦 DE FOLGA ] (Ideal para localizar quem pode cobrir FT) */}
      {activeOperationalFilter === 'de_folga' && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-500/40 text-xs text-blue-200 flex items-center justify-between">
            <div>
              <p className="font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                Banco de Operadores em Folga Hoje
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                Colaboradores disponíveis para convocação emergencial de Folga Trabalhada (FT).
              </p>
            </div>
            <span className="text-xs font-black font-mono bg-blue-600/30 px-2 py-1 rounded-lg border border-blue-400/40">
              {filteredColabs.length} aptos
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredColabs.map((colab) => {
              const condo = condominios.find(c => c.id === colab.condominioId);
              const valorDiaFT = ((colab.salarioBase / 220) * 12 * 2).toFixed(2);

              return (
                <div
                  key={colab.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm hover:border-slate-700 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={colab.fotoUrl}
                        alt={colab.nome}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/30"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{colab.nome}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Em Folga
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {colab.cargo} &bull; Jornada: {colab.jornada}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {condo?.nome || 'Condomínio Base'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Diária FT Est.</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ~R$ {valorDiaFT}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(
                        colab.telefone, 
                        colab.nome, 
                        `Olá ${colab.nome}! Você está de folga hoje. Temos uma FT disponível para cobertura imediata com diária dobrada. Tem interesse?`
                      )}
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Convidar para FT (WhatsApp)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openFTModal()}
                      className="px-3 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>Escalar FT</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW B: [ 🟡 AFASTADOS / ATESTADO ] */}
      {activeOperationalFilter === 'afastado' && (
        <div className="space-y-3">
          <div className="p-3 bg-yellow-950/40 rounded-2xl border border-yellow-500/40 text-xs text-yellow-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Quadro de Licenças & Atestados Médicos</p>
                <p className="text-[11px] text-yellow-300/80">
                  Colaboradores afastados por atestado ou licença médica legal.
                </p>
              </div>
            </div>
            <span className="text-xs font-black font-mono bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg border border-yellow-500/30">
              {filteredColabs.length} afastados
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredColabs.map((colab) => {
              const condo = condominios.find(c => c.id === colab.condominioId);
              return (
                <div
                  key={colab.id}
                  className="bg-slate-900/90 border border-yellow-500/30 rounded-2xl p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={colab.fotoUrl}
                        alt={colab.nome}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-yellow-500/40"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{colab.nome}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                            Atestado
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {colab.cargo} &bull; Matrícula: {colab.matricula}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Posto Vinculado: {condo?.nome}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Previsão Retorno</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {colab.dataRetornoPrevista || '12/11/2026'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block">
                      Motivo / CID Comprovado:
                    </span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {colab.motivoAfastamento || 'Atestado Médico homologado no RH com CID registrado.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Substituição temporária ativa</span>
                    {colab.telefone && (
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(colab.telefone, colab.nome, 'Olá, contato de acolhimento do RH PorttoHub para verificar seu bem-estar.')}
                        className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Falar com Colaborador</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW C: [ 🔴 EM FALTA / VAZIO ] */}
      {activeOperationalFilter === 'em_falta' && (
        <div className="space-y-3">
          <div className="p-3 bg-red-950/40 rounded-2xl border border-red-500/40 text-xs text-red-200 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Postos Descobertos & Faltas Críticas</p>
                <p className="text-[11px] text-red-300/80">
                  Operadores ausentes sem justificativa requerendo substituição FT imediata.
                </p>
              </div>
            </div>
            <span className="text-xs font-black font-mono bg-red-600 text-white px-2 py-1 rounded-lg">
              {counts.em_falta} alertas
            </span>
          </div>

          <div className="space-y-2.5">
            {scopeTurnos.filter(t => t.status === 'vazio').map((turno) => {
              const condo = condominios.find(c => c.id === turno.condominioId);
              const titular = colaboradores.find(c => c.id === turno.colaboradorTitularId);

              return (
                <div
                  key={turno.id}
                  className="bg-slate-900/90 border border-red-500/50 rounded-2xl p-4 shadow-lg shadow-red-950/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                        🔴 POSTO VAZIO
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{condo?.nome}</h4>
                      <p className="text-xs text-slate-400">{turno.postoNome} &bull; Horário {turno.horario}</p>
                    </div>

                    <span className="text-xs font-bold text-red-400 font-mono">
                      {turno.horaAlerta ? `Desde às ${turno.horaAlerta}` : 'Ausente'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-red-500/20 text-xs text-slate-300">
                    <p className="font-semibold text-red-200">
                      Titular escalado: {titular?.nome || 'Não definido'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {turno.motivoVazio || 'Falta sem justificativa na abertura do plantão.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openFTModal(turno)}
                    className="w-full min-h-[46px] rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-colors"
                  >
                    <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                    <span>Designar Cobertura / FT Rápida</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW D: [ 🟢 NO POSTO ] ou [ 🏢 TODOS OS CONDOMÍNIOS ] */}
      {(activeOperationalFilter === 'todos' || activeOperationalFilter === 'no_posto') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-300 uppercase tracking-wider">
              {activeOperationalFilter === 'no_posto' 
                ? `Colaboradores em Exercício Ativo (${filteredColabs.filter(c => c.statusHoje === 'no_posto').length})`
                : `Plantões e Postos (${filteredTurnos.length})`}
            </span>
            <span className="text-slate-500 text-[11px]">Monitoramento em Tempo Real</span>
          </div>

          {filteredTurnos.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 text-center">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">Nenhum plantão localizado com este critério.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveOperationalFilter('todos');
                  setSelectedCondoId(null);
                  setSearchQuery('');
                }}
                className="mt-3 text-xs text-blue-400 hover:underline font-bold"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            filteredTurnos.map((turno) => {
              const condo = condominios.find(c => c.id === turno.condominioId);
              const titular = colaboradores.find(c => c.id === turno.colaboradorTitularId);
              const atual = colaboradores.find(c => c.id === turno.colaboradorAtualId);

              const activeColab = turno.status === 'em_ft' ? atual : titular;
              const isVazio = turno.status === 'vazio';
              const isFT = turno.status === 'em_ft';

              return (
                <div
                  key={turno.id}
                  className={`rounded-2xl border transition-all p-4 shadow-sm ${
                    isVazio
                      ? 'bg-slate-900/90 border-red-500/50 shadow-red-950/20'
                      : isFT
                      ? 'bg-slate-900/90 border-amber-500/40 shadow-amber-950/20'
                      : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Card Header: Condo Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          {condo?.tipo || 'Condomínio'}
                        </span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{condo?.cidade}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white truncate">{condo?.nome}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{turno.postoNome}</span>
                      </p>
                    </div>

                    <div>
                      {isVazio ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Posto Vazio
                        </span>
                      ) : isFT ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Zap className="w-3 h-3 fill-amber-300" />
                          FT Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          No Posto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Collaborator Profile & Shift time */}
                  <div className="py-3 flex items-center justify-between">
                    {isVazio ? (
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                          VAZIO
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-200">Nenhum operador presente</p>
                          <p className="text-[11px] text-slate-400">
                            Titular: {titular ? titular.nome : 'Não escalado'}
                          </p>
                          <p className="text-[11px] text-red-400 font-medium mt-0.5">
                            {turno.motivoVazio || 'Atraso crítico'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <img
                            src={activeColab?.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                            alt={activeColab?.nome || 'Operador'}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-700"
                          />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white truncate">{activeColab?.nome}</p>
                            {isFT && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                FT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {activeColab?.cargo} &bull; Matrícula: {activeColab?.matricula}
                          </p>
                          <p className="text-[11px] text-emerald-400 font-medium truncate">
                            {turno.observacao || 'Check-in por GPS confirmado'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shift Time Badge */}
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[10px] font-semibold text-slate-400 block">Horário</span>
                      <span className="text-xs font-bold text-white block">{turno.horario}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{turno.periodo}</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between gap-2">
                    {isVazio ? (
                      <button
                        type="button"
                        onClick={() => openFTModal(turno)}
                        className="w-full min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-900/30 transition-colors"
                      >
                        <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                        <span>Alocar FT Rápida Agora</span>
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {activeColab?.telefone && (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(activeColab.telefone, activeColab.nome)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          {condo && (
                            <button
                              type="button"
                              onClick={() => setSelectedCondoFor360(condo)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              title="Abrir Painel 360°"
                            >
                              <Building2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Painel 360°</span>
                            </button>
                          )}
                        </div>

                        {isFT ? (
                          <button
                            type="button"
                            onClick={() => normalizarPosto(turno.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                          >
                            Normalizar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openFTModal(turno)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Substituição</span>
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
      )}

      {/* DRAWER PAINEL 360° DO CONDOMÍNIO */}
      <CondominioDetailDrawer
        condominio={selectedCondoFor360}
        onClose={() => setSelectedCondoFor360(null)}
      />
    </div>
  );
};
