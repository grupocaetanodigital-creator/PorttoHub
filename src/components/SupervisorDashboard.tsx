import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { EscalaTrabalho, Profile, ApontamentoFolha } from '../types/database';
import {
  AlertTriangle,
  Zap,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  UserPlus,
  DollarSign,
  FileText,
  Filter,
  Check,
  X,
  ExternalLink,
  Shield,
  Search,
  Building,
  UserCheck,
  Navigation,
  Camera,
  Wifi,
  WifiOff,
  Maximize2
} from 'lucide-react';
import { RHHoleritePainel } from './RHHoleritePainel';

export const SupervisorDashboard: React.FC = () => {
  const {
    escalas,
    condominios,
    profiles,
    apontamentos,
    registrosPonto,
    filaOffline,
    escalarCobertura,
    processarApontamento,
    toggleDisponibilidadeFT
  } = useTurnoCerto();

  const [activeTab, setActiveTab] = useState<'postos' | 'fechamento' | 'holerite_rh' | 'pontos_mobile' | 'escalas'>('postos');
  const [filterTag, setFilterTag] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Coverage Modal state
  const [selectedEscalaForCoverage, setSelectedEscalaForCoverage] = useState<EscalaTrabalho | null>(null);

  // Selected Atestado for preview
  const [previewAtestado, setPreviewAtestado] = useState<ApontamentoFolha | null>(null);

  // 1. Identify Empty / Critical Stations (Posto Vazio ou Falta)
  const postosVazios = escalas.filter(
    (e) => e.status_posto === 'vazio' || e.tag_ativa === 'falta' || !e.funcionario_id
  );

  // Filtered stations
  const filteredEscalas = escalas.filter((escala) => {
    const cond = condominios.find((c) => c.id === escala.condominio_id);
    const func = profiles.find((p) => p.id === escala.funcionario_id);

    const matchQuery =
      !searchQuery ||
      cond?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cond?.bairro?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      func?.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchQuery) return false;

    if (filterTag === 'todos') return true;
    if (filterTag === 'vazios') return escala.status_posto === 'vazio' || escala.tag_ativa === 'falta';
    if (filterTag === 'cobertura') return escala.tag_ativa === 'escalado_cobertura';
    if (filterTag === 'ft') return escala.tag_ativa === 'trabalhando_folga_ft';
    if (filterTag === 'noposto') return escala.tag_ativa === 'regular';
    if (filterTag === 'intervalo') return escala.tag_ativa === 'intervalo';
    return true;
  });

  // Helper para determinar se o funcionário já está de plantão ativo hoje
  const getFuncionarioStatusPlantao = (funcionarioId: string, escalaAlvoId?: string) => {
    // Verifica se já está alocado em outro posto ativo (não finalizado, não vazio, sem falta)
    const escalaAtiva = escalas.find((e) =>
      e.funcionario_id === funcionarioId &&
      e.id !== escalaAlvoId &&
      e.status_posto !== 'finalizado' &&
      e.status_posto !== 'vazio' &&
      e.tag_ativa !== 'falta'
    );

    if (escalaAtiva) {
      const cond = condominios.find((c) => c.id === escalaAtiva.condominio_id);
      let statusDesc = 'Plantão Regular';
      if (escalaAtiva.tag_ativa === 'trabalhando_folga_ft') statusDesc = 'Turno Extra FT Ativo';
      if (escalaAtiva.tag_ativa === 'escalado_cobertura') statusDesc = 'Já Escalado p/ Cobertura';
      if (escalaAtiva.tag_ativa === 'intervalo') statusDesc = 'Em Intervalo';

      return {
        dePlantao: true,
        bloqueado: true,
        motivo: `Em plantão ativo no ${cond?.nome || 'outro posto'} (${statusDesc})`,
        condominioNome: cond?.nome,
        statusDesc,
        tagAtiva: escalaAtiva.tag_ativa
      };
    }

    // Verifica se registrou falta hoje
    const escalaFalta = escalas.find(
      (e) => e.funcionario_id === funcionarioId && e.tag_ativa === 'falta'
    );
    if (escalaFalta) {
      const cond = condominios.find((c) => c.id === escalaFalta.condominio_id);
      return {
        dePlantao: false,
        bloqueado: true,
        motivo: `Registrou falta no turno de hoje no ${cond?.nome || 'posto'}. Inapto para cobertura.`,
        condominioNome: cond?.nome,
        statusDesc: 'Falta Registrada',
        tagAtiva: 'falta'
      };
    }

    return {
      dePlantao: false,
      bloqueado: false,
      motivo: 'Em dia de folga · Apto para assumir posto de emergência',
      condominioNome: null,
      statusDesc: 'Em Folga',
      tagAtiva: null
    };
  };

  // Colaboradores estritamente APTOS para cobertura de emergência:
  // Funcionários em dia de folga, com adesão a FT, e que NÃO estão de plantão em nenhum posto!
  const colaboradoresAptosCobertura = profiles.filter((p) => {
    if (p.role !== 'funcionario') return false;
    if (!p.disponivel_ft) return false;
    const status = getFuncionarioStatusPlantao(p.id, selectedEscalaForCoverage?.id);
    return !status.bloqueado;
  });

  // Colaboradores que estão DE PLANTÃO ATIVO no momento (impedidos por consistência operacional)
  const colaboradoresDePlantaoImpedidos = profiles.filter((p) => {
    if (p.role !== 'funcionario') return false;
    const status = getFuncionarioStatusPlantao(p.id, selectedEscalaForCoverage?.id);
    return status.bloqueado;
  });

  // Financial summary metrics
  const totalFaltasPendentes = apontamentos.filter(
    (a) => a.tipo_ocorrencia === 'falta_nao_justificada' && a.status_processamento === 'pendente'
  ).length;

  const totalFTsPendentes = apontamentos.filter(
    (a) => a.tipo_ocorrencia === 'ft_trabalhada' && a.status_processamento === 'pendente'
  ).length;

  const totalAtestadosPendentes = apontamentos.filter(
    (a) => a.tipo_ocorrencia === 'atestado_aprovado' && a.status_processamento === 'pendente'
  ).length;

  const valorTotalFTPrevisao = apontamentos
    .filter((a) => a.tipo_ocorrencia === 'ft_trabalhada')
    .reduce((acc, cur) => acc + (cur.valor_calculado || 240), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* BANNER CRÍTICO DE POSTO VAZIO (Regra 3.B do Módulo 1) */}
      {postosVazios.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-200">
                  ALERTA CRÍTICO: {postosVazios.length} {postosVazios.length === 1 ? 'Posto Desguarnecido' : 'Postos Desguarnecidos'}
                </h3>
                <span className="text-[10px] font-mono text-red-300 bg-red-900/60 px-2 py-0.5 rounded font-semibold uppercase">
                  Sem Batida de Ponto
                </span>
              </div>
              <p className="text-xs text-red-300/90 mt-0.5">
                {postosVazios.map((pv) => {
                  const c = condominios.find((cond) => cond.id === pv.condominio_id);
                  const f = profiles.find((prof) => prof.id === pv.funcionario_id);
                  return `${c?.nome || 'Condomínio'} (Escalado: ${f?.full_name || 'Não alocado'})`;
                }).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setSelectedEscalaForCoverage(postosVazios[0])}
              className="w-full md:w-auto py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Escalar Cobertura de Emergência (FT)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Painel Operacional da Supervisora
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoramento de postos em tempo real, acionamento de folguistas (FT) e fechamento de folha.
          </p>
        </div>

        {/* Navigation Tabs (Functional Buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('postos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'postos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Postos & Alertas ({escalas.length})
          </button>
          <button
            onClick={() => setActiveTab('fechamento')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fechamento'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Fechamento Financeiro</span>
            {(totalFaltasPendentes > 0 || totalFTsPendentes > 0 || totalAtestadosPendentes > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('holerite_rh')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'holerite_rh'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Holerite Digital (RH)</span>
            <span className="font-mono tabular-nums text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
              CLT
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pontos_mobile')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pontos_mobile'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auditoria Ponto & GPS</span>
            <span className="font-mono tabular-nums text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold">
              {registrosPonto.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('escalas')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'escalas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Escalas & Equipe
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: POSTOS EM TEMPO REAL & STATE MACHINE TAGS                         */}
      {/* ========================================================================= */}
      {activeTab === 'postos' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Buscar por condomínio, bairro ou colaborador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* State Machine Tags Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterTag('todos')}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  filterTag === 'todos'
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos ({escalas.length})
              </button>

              <button
                onClick={() => setFilterTag('vazios')}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  filterTag === 'vazios'
                    ? 'bg-red-600 text-white font-medium'
                    : 'bg-white border border-slate-200 text-red-600 hover:bg-red-50'
                }`}
              >
                <span>🔴 Posto Vazio / Falta</span>
                <span className="font-mono tabular-nums">
                  ({escalas.filter((e) => e.status_posto === 'vazio' || e.tag_ativa === 'falta').length})
                </span>
              </button>

              <button
                onClick={() => setFilterTag('cobertura')}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  filterTag === 'cobertura'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <span>🔄 [Escalado para Cobertura]</span>
                <span className="font-mono tabular-nums">
                  ({escalas.filter((e) => e.tag_ativa === 'escalado_cobertura').length})
                </span>
              </button>

              <button
                onClick={() => setFilterTag('ft')}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  filterTag === 'ft'
                    ? 'bg-amber-600 text-white font-medium'
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                <span>⚡ [Trabalhando em Folga / FT]</span>
                <span className="font-mono tabular-nums">
                  ({escalas.filter((e) => e.tag_ativa === 'trabalhando_folga_ft').length})
                </span>
              </button>

              <button
                onClick={() => setFilterTag('noposto')}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  filterTag === 'noposto'
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>🟢 No Posto (Regular)</span>
                <span className="font-mono tabular-nums">
                  ({escalas.filter((e) => e.tag_ativa === 'regular').length})
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid dos Postos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredEscalas.map((escala) => {
              const condominio = condominios.find((c) => c.id === escala.condominio_id);
              const funcionario = profiles.find((p) => p.id === escala.funcionario_id);
              const isVazio = escala.status_posto === 'vazio' || escala.tag_ativa === 'falta' || !escala.funcionario_id;
              const isCobertura = escala.tag_ativa === 'escalado_cobertura';
              const isFT = escala.tag_ativa === 'trabalhando_folga_ft';
              const isRegular = escala.tag_ativa === 'regular';
              const isIntervalo = escala.tag_ativa === 'intervalo';

              return (
                <div
                  key={escala.id}
                  className={`bg-white rounded-xl border transition-shadow p-5 flex flex-col justify-between ${
                    isVazio
                      ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20'
                      : isFT
                      ? 'border-amber-300 ring-1 ring-amber-100 bg-amber-50/20'
                      : isCobertura
                      ? 'border-indigo-200 bg-indigo-50/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top row: Condominium and State Machine Tag */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                          <span>{condominio?.bairro || 'São Paulo'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Raio GPS {condominio?.raio_tolerancia_metros || 150}m</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {condominio?.nome || 'Condomínio'}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{condominio?.endereco}</span>
                        </p>
                      </div>

                      {/* State Machine Tag according to Module 1 definitions */}
                      <div className="shrink-0 text-right">
                        {isVazio && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-md">
                            🔴 Posto Vazio / Falta
                          </span>
                        )}
                        {isCobertura && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md">
                            🔄 Escalado para Cobertura
                          </span>
                        )}
                        {isFT && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-md">
                            ⚡ Trabalhando em Folga / FT
                          </span>
                        )}
                        {isRegular && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md">
                            🟢 No Posto (Regular)
                          </span>
                        )}
                        {isIntervalo && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md">
                            🟡 Em Intervalo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Colaborador escalado */}
                    <div className="py-3 px-3.5 bg-slate-50 rounded-lg border border-slate-100 my-3">
                      {funcionario ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            {funcionario.avatar_url ? (
                              <img
                                src={funcionario.avatar_url}
                                alt={funcionario.full_name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {funcionario.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-slate-900">
                                {funcionario.full_name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {funcionario.cargo || 'Portaria'} · CPF: <span className="font-mono tabular-nums">{funcionario.cpf}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-slate-500 block">Última Batida</span>
                            <span className="text-xs font-mono tabular-nums font-semibold text-slate-800">
                              {escala.ultima_batida
                                ? new Date(escala.ultima_batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : 'Sem registro'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs font-semibold text-red-600">
                            Nenhum colaborador alocado no momento!
                          </p>
                          <p className="text-[11px] text-slate-500">
                            O posto está desguarnecido e necessita de cobertura emergencial.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Operational Details (Turno, Contato) */}
                    <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Turno: 07:00 às 19:00 (12x36)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px]">{condominio?.contato_emergencia || '(11) 3288-1000'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      ID: <span className="font-mono text-[10px]">{escala.id.slice(0, 8)}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {isVazio ? (
                        <button
                          onClick={() => setSelectedEscalaForCoverage(escala)}
                          className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Escalar Cobertura de Emergência</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedEscalaForCoverage(escala)}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Substituir Colaborador</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: FECHAMENTO FINANCEIRO (FALTAS, FTS E ATESTADOS)                     */}
      {/* ========================================================================= */}
      {activeTab === 'fechamento' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Faltas a Processar</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-red-600">
                  {totalFaltasPendentes}
                </span>
                <span className="text-xs text-slate-400">Descontar / Abonar</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">FTs a Pagar (Folgas Trabalhadas)</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-amber-600">
                  {totalFTsPendentes}
                </span>
                <span className="text-xs text-slate-400">⚡ Turnos extras</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Atestados Médicos</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600">
                  {totalAtestadosPendentes}
                </span>
                <span className="text-xs text-slate-400">Análise de DSR</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Impacto em Folha (Previsão FTs)</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  R$ {valorTotalFTPrevisao.toFixed(2)}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Contabilizado</span>
              </div>
            </div>
          </div>

          {/* Detailed Financial Settlement Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Extrato Consolidado de Apontamentos
                </h3>
                <p className="text-xs text-slate-500">
                  Defina o tratamento de folha: Desconto em folha, Pagamento de FT, ou Abono com resguardo do DSR.
                </p>
              </div>
              <button
                onClick={() => alert('Relatório consolidado de apontamentos exportado com sucesso em formato CSV/Folha!')}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Exportar Relatório CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Colaborador</th>
                    <th className="py-3 px-4 font-semibold">Data</th>
                    <th className="py-3 px-4 font-semibold">Tipo de Ocorrência</th>
                    <th className="py-3 px-4 font-semibold">Observações / Comprovante</th>
                    <th className="py-3 px-4 font-semibold">Status de Folha</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação da Supervisora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apontamentos.map((apontamento) => {
                    const func = profiles.find((p) => p.id === apontamento.funcionario_id);
                    const isFalta = apontamento.tipo_ocorrencia === 'falta_nao_justificada';
                    const isFT = apontamento.tipo_ocorrencia === 'ft_trabalhada';
                    const isAtestado = apontamento.tipo_ocorrencia === 'atestado_aprovado' || apontamento.tipo_ocorrencia === 'atestado_rejeitado';

                    return (
                      <tr key={apontamento.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Colaborador */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {func?.avatar_url ? (
                              <img
                                src={func.avatar_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                {func?.full_name.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{func?.full_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono tabular-nums">{func?.cpf}</p>
                            </div>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                          {apontamento.data_ocorrencia}
                        </td>

                        {/* Tipo de Ocorrência */}
                        <td className="py-3 px-4">
                          {isFalta && (
                            <span className="font-semibold text-red-600">
                              ❌ Falta Não Justificada
                            </span>
                          )}
                          {isFT && (
                            <span className="font-bold text-amber-700">
                              ⚡ FT Trabalhada (Dia de Folga)
                            </span>
                          )}
                          {isAtestado && (
                            <span className="font-semibold text-indigo-700">
                              📄 Atestado Médico
                            </span>
                          )}
                        </td>

                        {/* Observações / Atestado anexo */}
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <p className="truncate">{apontamento.observacao}</p>
                          {apontamento.anexo_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewAtestado(apontamento)}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ver Atestado ({apontamento.crm_medico || 'Anexo'})</span>
                            </button>
                          )}
                        </td>

                        {/* Status de Folha */}
                        <td className="py-3 px-4">
                          {apontamento.status_processamento === 'pendente' && (
                            <span className="text-amber-600 font-medium">⏳ Pendente</span>
                          )}
                          {apontamento.status_processamento === 'descontar' && (
                            <span className="text-red-700 font-bold">Descontado em Folha</span>
                          )}
                          {apontamento.status_processamento === 'pagar_ft' && (
                            <span className="text-emerald-700 font-bold">Pagar em Folha (R$ 240,00)</span>
                          )}
                          {apontamento.status_processamento === 'abonado' && (
                            <span className="text-slate-700 font-semibold">Abonado / DSR Mantido</span>
                          )}
                        </td>

                        {/* Ações da Supervisora */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isFalta && (
                              <>
                                <button
                                  onClick={() => processarApontamento(apontamento.id, 'descontar', 'Desconto integral de falta e perda de DSR em folha.')}
                                  className={`py-1 px-2.5 rounded font-medium text-xs transition-colors ${
                                    apontamento.status_processamento === 'descontar'
                                      ? 'bg-red-700 text-white'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                  }`}
                                >
                                  Descontar em Folha
                                </button>
                                <button
                                  onClick={() => processarApontamento(apontamento.id, 'abonado', 'Falta abonada por autorização da supervisão.')}
                                  className={`py-1 px-2.5 rounded font-medium text-xs transition-colors ${
                                    apontamento.status_processamento === 'abonado'
                                      ? 'bg-slate-800 text-white'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  Abonar
                                </button>
                              </>
                            )}

                            {isFT && (
                              <>
                                <button
                                  onClick={() => processarApontamento(apontamento.id, 'pagar_ft', 'Turno extra autorizado para crédito de hora extra / FT em folha.')}
                                  className={`py-1 px-2.5 rounded font-bold text-xs transition-colors ${
                                    apontamento.status_processamento === 'pagar_ft'
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  Pagar FT (R$ 240)
                                </button>
                                <button
                                  onClick={() => processarApontamento(apontamento.id, 'abonado', 'Convertido para Banco de Horas (12 horas).')}
                                  className={`py-1 px-2.5 rounded font-medium text-xs transition-colors ${
                                    apontamento.status_processamento === 'abonado'
                                      ? 'bg-slate-800 text-white'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  Banco de Horas
                                </button>
                              </>
                            )}

                            {isAtestado && (
                              <>
                                <button
                                  onClick={() => processarApontamento(apontamento.id, 'abonado', `Atestado médico validado. DSR protegido. ${apontamento.crm_medico || ''}`)}
                                  className={`py-1 px-2.5 rounded font-semibold text-xs transition-colors ${
                                    apontamento.status_processamento === 'abonado'
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  Aprovar Atestado
                                </button>
                                <button
                                  onClick={() => processarApontamento(apontamento.id, 'descontar', 'Atestado rejeitado após auditoria. Desconto aplicado.')}
                                  className={`py-1 px-2.5 rounded font-medium text-xs transition-colors ${
                                    apontamento.status_processamento === 'descontar'
                                      ? 'bg-red-700 text-white'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                  }`}
                                >
                                  Rejeitar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: EQUIPE E ESCALAS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'escalas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Banco de Talentos & Folguistas Disponíveis para FT
                </h3>
                <p className="text-xs text-slate-500">
                  Colaboradores que ativaram voluntariamente a disponibilidade de dobrar em dias de folga (⚡ FT).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles
                .filter((p) => p.role === 'funcionario')
                .map((func) => {
                  const status = getFuncionarioStatusPlantao(func.id);
                  return (
                    <div
                      key={func.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {func.avatar_url ? (
                          <img
                            src={func.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                            {func.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{func.full_name}</p>
                          <p className="text-[11px] text-slate-500">{func.cargo || 'Portaria'}</p>
                          <p className="text-[10px] font-mono text-slate-400">{func.telefone}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <div>
                          {status.dePlantao ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                              🟢 Plantão: {status.condominioNome?.split(' ')[0] || 'Ativo'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                              🏖️ Em Folga Hoje
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleDisponibilidadeFT(func.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                            func.disponivel_ft
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {func.disponivel_ft ? '⚡ Disponível FT' : 'Folga Regular'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: HOLERITE DIGITAL (LANÇAMENTO 100% MANUAL RH)                        */}
      {/* ========================================================================= */}
      {activeTab === 'holerite_rh' && <RHHoleritePainel />}

      {/* ========================================================================= */}
      {/* ABA: AUDITORIA DE PONTO ELETRÔNICO MOBILE, GEOFENCING E FOTO OBRIGATÓRIA */}
      {/* ========================================================================= */}
      {activeTab === 'pontos_mobile' && (
        <div className="space-y-6">
          {/* Header & Métricas de Auditoria */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Total de Batidas Registradas</span>
              <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
                {registrosPonto.length}
              </span>
              <span className="text-[11px] text-slate-400">Ponto Mobile em Campo</span>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium block">Dentro do Raio (Geofence)</span>
              <span className="text-2xl font-black font-mono text-emerald-900 mt-1 block">
                {registrosPonto.filter((r) => r.dentro_do_raio).length}
              </span>
              <span className="text-[11px] text-emerald-700">✓ Conformidade GPS 100%</span>
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <span className="text-xs text-red-800 font-medium block">Fora do Raio (Advertências)</span>
              <span className="text-2xl font-black font-mono text-red-900 mt-1 block">
                {registrosPonto.filter((r) => !r.dentro_do_raio).length}
              </span>
              <span className="text-[11px] text-red-700">⚠️ Requer auditoria supervisora</span>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <span className="text-xs text-amber-800 font-medium block">Fila Offline / Sincronizados</span>
              <span className="text-2xl font-black font-mono text-amber-900 mt-1 block">
                {registrosPonto.filter((r) => r.sincronizado_offline || r.offline_pendente).length}
              </span>
              <span className="text-[11px] text-amber-700">
                {filaOffline.length} pendente(s) no momento
              </span>
            </div>
          </div>

          {/* Tabela de Auditoria Detalhada */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Auditoria de Ponto Mobile & Geofencing (GPS)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registros de campo com validação facial nativa, distância métrica e comprovação de integridade.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded">
                Tolerância Padrão: 50m
              </span>
            </div>

            {registrosPonto.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Selfie Comprovante</th>
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Condomínio / Posto</th>
                      <th className="py-3 px-4">Tipo Batida</th>
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Geofencing & Distância</th>
                      <th className="py-3 px-4">Origem / Status Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrosPonto.map((reg) => {
                      const func = profiles.find((p) => p.id === reg.funcionario_id);
                      const cond = condominios.find((c) => c.id === reg.condominio_id) || condominios[0];

                      const labelTipo = {
                        entrada: '1. Entrada',
                        inicio_intervalo: '2. Início Intervalo',
                        saida_intervalo: '2. Saída Intervalo',
                        fim_intervalo: '3. Fim Intervalo',
                        retorno_intervalo: '3. Retorno Intervalo',
                        saida: '4. Saída'
                      }[reg.tipo_batida] || reg.tipo_batida;

                      return (
                        <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Selfie Comprovante */}
                          <td className="py-3 px-4">
                            {reg.foto_comprovante_url || reg.foto_comprovante ? (
                              <img
                                src={reg.foto_comprovante_url || reg.foto_comprovante || ''}
                                alt="Selfie"
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover border border-slate-300"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center">
                                <Camera className="w-4 h-4" />
                              </div>
                            )}
                          </td>

                          {/* Colaborador */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{func?.full_name || 'Colaborador'}</p>
                            <p className="text-[11px] text-slate-500 font-mono">CPF: {func?.cpf}</p>
                          </td>

                          {/* Condomínio */}
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{reg.condominio_nome || cond?.nome}</p>
                            <p className="text-[11px] text-slate-500">{cond?.bairro} · Raio: {cond?.raio_metros || cond?.raio_tolerancia_metros || 50}m</p>
                          </td>

                          {/* Tipo de Batida */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {labelTipo}
                            </span>
                          </td>

                          {/* Horário */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                            {new Date(reg.timestamp).toLocaleTimeString('pt-BR')}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {new Date(reg.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                          </td>

                          {/* Geofencing & Distância */}
                          <td className="py-3 px-4">
                            {reg.dentro_do_raio ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>No Raio ({reg.distancia_metros}m)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                                <span>FORA DO RAIO ({reg.distancia_metros}m)</span>
                              </span>
                            )}
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {reg.latitude_capturada?.toFixed(5) || reg.lat.toFixed(5)},{' '}
                              {reg.longitude_capturada?.toFixed(5) || reg.lng.toFixed(5)}
                            </p>
                          </td>

                          {/* Origem & Status Sync */}
                          <td className="py-3 px-4">
                            {reg.offline_pendente ? (
                              <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                📡 Fila Offline (Local)
                              </span>
                            ) : reg.sincronizado_offline ? (
                              <span className="inline-block text-[10px] font-medium text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                ✓ Sincronizado Offline
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                ✓ Supabase Online
                              </span>
                            )}
                            {reg.hash_criptografico && (
                              <p className="text-[9px] font-mono text-slate-400 truncate max-w-[130px] mt-0.5" title={reg.hash_criptografico}>
                                {reg.hash_criptografico}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Navigation className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium">Nenhuma batida de ponto mobile registrada hoje.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Alterne para o perfil de um funcionário para realizar batidas com GPS e selfie nativa.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / GAVETA DE ALOCAÇÃO DE COBERTURA DE EMERGÊNCIA (FT)               */}
      {/* ========================================================================= */}
      {selectedEscalaForCoverage && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Escalar Cobertura de Emergência
                  </h3>
                  <p className="text-xs text-slate-500">
                    {condominios.find((c) => c.id === selectedEscalaForCoverage.condominio_id)?.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEscalaForCoverage(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <p className="font-semibold mb-0.5">Regra de Negócio do Módulo 1:</p>
                <p>
                  Ao selecionar um colaborador que está de folga, o sistema atualizará o status da escala para <strong className="text-indigo-900">🔄 [Escalado para Cobertura]</strong>. No exato momento em que o funcionário bater o ponto de entrada no posto, a tag mudará automaticamente para <strong className="text-amber-950">⚡ [Trabalhando em Dia de Folga / FT]</strong> e gerará o lançamento para a folha.
                </p>
              </div>

              {/* Alerta de Consistência e Regra de Posto Simultâneo */}
              <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-200 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white mb-0.5">
                    Regra de Consistência Operacional:
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Colaboradores que já estão cumprindo plantão ativo em outro posto <strong>NÃO podem</strong> ser alocados para cobertura simultânea (impossível estar em dois lugares ao mesmo tempo). Apenas profissionais em dia de folga estão aptos.
                  </p>
                </div>
              </div>

              {/* Lista 1: Colaboradores Aptos em Folga */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Colaboradores em Folga Aptos para Cobertura ({colaboradoresAptosCobertura.length})
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ 100% Em Folga Hoje
                  </span>
                </div>

                <div className="space-y-2">
                  {colaboradoresAptosCobertura.map((colab) => (
                    <div
                      key={colab.id}
                      className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {colab.avatar_url ? (
                          <img
                            src={colab.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {colab.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{colab.full_name}</span>
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-mono font-bold">
                              ⚡ FT
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {colab.cargo || 'Controlador de Acesso'} · {colab.telefone}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            ✓ Em dia de folga · Sem escala hoje · Pronto para assumir
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await escalarCobertura(selectedEscalaForCoverage.id, colab.id, 'ft_cobertura');
                          setSelectedEscalaForCoverage(null);
                        }}
                        className="py-1.5 px-3.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                      >
                        Escalar Agora (🔄)
                      </button>
                    </div>
                  ))}

                  {colaboradoresAptosCobertura.length === 0 && (
                    <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                      Nenhum folguista livre em dia de folga disponível no momento.
                    </div>
                  )}
                </div>
              </div>

              {/* Lista 2: Colaboradores Impedidos (Já em Plantão Ativo) */}
              {colaboradoresDePlantaoImpedidos.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <span>⛔ Impedidos por Regra de Consistência ({colaboradoresDePlantaoImpedidos.length})</span>
                    </h4>
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                      Já em Plantão Ativo
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Estes profissionais <strong>não podem</strong> ser acionados para cobertura porque já estão cumprindo escala ativa em outro condomínio.
                  </p>

                  <div className="space-y-2">
                    {colaboradoresDePlantaoImpedidos.map((colab) => {
                      const status = getFuncionarioStatusPlantao(colab.id, selectedEscalaForCoverage.id);

                      return (
                        <div
                          key={colab.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 opacity-75 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            {colab.avatar_url ? (
                              <img
                                src={colab.avatar_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover grayscale shrink-0 border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0 text-slate-500">
                                {colab.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <span>{colab.full_name}</span>
                                <span className="text-[10px] text-red-800 bg-red-100 px-1.5 py-0.2 rounded font-mono font-medium">
                                  {status.statusDesc}
                                </span>
                              </p>
                              <p className="text-[11px] text-red-600 font-medium">
                                {status.motivo}
                              </p>
                            </div>
                          </div>

                          <button
                            disabled
                            className="py-1.5 px-3 bg-slate-200 text-slate-500 text-xs font-semibold rounded-lg cursor-not-allowed whitespace-nowrap"
                            title="Bloqueado: o colaborador já está em plantão ativo."
                          >
                            Bloqueado (Em Plantão)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedEscalaForCoverage(null)}
                className="py-1.5 px-4 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PREVIEW DO ATESTADO MÉDICO                                      */}
      {/* ========================================================================= */}
      {previewAtestado && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comprovante de Atestado Médico
                </h3>
                <p className="text-xs text-slate-500">
                  {profiles.find((p) => p.id === previewAtestado.funcionario_id)?.full_name} · CRM: {previewAtestado.crm_medico || 'Não informado'}
                </p>
              </div>
              <button
                onClick={() => setPreviewAtestado(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-80">
                <img
                  src={previewAtestado.anexo_url || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80'}
                  alt="Atestado médico"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain max-h-80"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p><strong className="text-slate-800">Dias de afastamento:</strong> {previewAtestado.dias_afastamento || 2} dias</p>
                <p><strong className="text-slate-800">Observação:</strong> {previewAtestado.observacao}</p>
                <p><strong className="text-slate-800">Impacto no DSR:</strong> Ao aprovar, o funcionário mantém o direito à remuneração do descanso semanal.</p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  processarApontamento(previewAtestado.id, 'descontar', 'Atestado rejeitado pela supervisão.');
                  setPreviewAtestado(null);
                }}
                className="py-1.5 px-3 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold rounded-lg border border-red-200"
              >
                Rejeitar Atestado
              </button>
              <button
                onClick={() => {
                  processarApontamento(previewAtestado.id, 'abonado', 'Atestado médico aprovado. Falta abonada com DSR mantido.');
                  setPreviewAtestado(null);
                }}
                className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Aprovar Atestado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
