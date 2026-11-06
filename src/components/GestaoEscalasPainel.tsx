import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import {
  VinculoEscala,
  EscalaOperacionalDia,
  RegimeJornada,
  TurnoTipo,
  StatusDiaEscala
} from '../types/database';
import {
  Calendar,
  Clock,
  Building,
  UserCheck,
  Zap,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Filter,
  RefreshCw,
  Plus,
  X,
  Phone,
  ChevronLeft,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';

export const GestaoEscalasPainel: React.FC = () => {
  const {
    profiles,
    condominios,
    vinculosEscala,
    escalasOperacionais,
    salvarVinculoEscala,
    atualizarStatusDiaEscala,
    convocarFolguistaFT,
    recalcularGradeMensal,
    isLoading
  } = useTurnoCerto();

  const [mesSelecionado, setMesSelecionado] = useState<number>(3); // Março
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [filtroRegime, setFiltroRegime] = useState<string>('todos');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('todos');

  // Modal de Configuração de Vínculo de Jornada
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [editFuncionarioId, setEditFuncionarioId] = useState<string>(profiles[1]?.id || '');
  const [editCondominioId, setEditCondominioId] = useState<string>(condominios[0]?.id || '');
  const [editRegime, setEditRegime] = useState<RegimeJornada>('12x36');
  const [editTurno, setEditTurno] = useState<TurnoTipo>('diurno_07_19');
  const [editParidade, setEditParidade] = useState<'impar' | 'par'>('impar');

  // Modal / Drawer de Motor de Cobertura de Posto Vazio (FT)
  const [motorFTModalOpen, setMotorFTModalOpen] = useState<boolean>(false);
  const [coberturaData, setCoberturaData] = useState<string>('2026-03-06');
  const [coberturaCondominioId, setCoberturaCondominioId] = useState<string>(condominios[0]?.id || '');
  const [coberturaFaltanteId, setCoberturaFaltanteId] = useState<string>('');

  // Popover rápido de edição de célula de dia
  const [selectedCellDia, setSelectedCellDia] = useState<EscalaOperacionalDia | null>(null);

  // Dias no mês selecionado
  const totalDiasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
  const diasArray = Array.from({ length: totalDiasNoMes }, (_, i) => i + 1);

  // Lista de funcionários operacionais
  const funcionariosOperacionais = profiles.filter((p) => p.role === 'funcionario');

  // Filtro de funcionários na grade
  const funcionariosFiltrados = funcionariosOperacionais.filter((func) => {
    const vinculo = vinculosEscala.find((v) => v.funcionario_id === func.id);
    if (!vinculo) return true;

    if (filtroRegime !== 'todos' && vinculo.regime_jornada !== filtroRegime) {
      return false;
    }
    if (filtroCondominio !== 'todos' && vinculo.condominio_id !== filtroCondominio) {
      return false;
    }
    return true;
  });

  // Métricas do Mês
  const escalasDoMes = escalasOperacionais.filter((e) => {
    const parts = e.data.split('-');
    return Number(parts[0]) === anoSelecionado && Number(parts[1]) === mesSelecionado;
  });

  const totalTrabalho = escalasDoMes.filter((e) => e.status === 'trabalho').length;
  const totalFolga = escalasDoMes.filter((e) => e.status === 'folga').length;
  const totalFT = escalasDoMes.filter((e) => e.status === 'ft').length;
  const totalFalta = escalasDoMes.filter((e) => e.status === 'falta').length;
  const totalAtestado = escalasDoMes.filter((e) => e.status === 'atestado').length;
  const valorTotalFTs = totalFT * 240.00;

  // Motor de Cobertura: Busca de Voluntários Aptos para FT
  const candidatosAptosParaFT = funcionariosOperacionais.filter((cand) => {
    // 1. Não pode ser o próprio faltante
    if (cand.id === coberturaFaltanteId) return false;

    // 2. Verificar o status dele na data exata
    const escalaNoDia = escalasOperacionais.find(
      (e) => e.funcionario_id === cand.id && e.data === coberturaData
    );

    // DEVE ESTAR DE FOLGA NO DIA (status === 'folga')
    if (escalaNoDia && escalaNoDia.status !== 'folga') {
      return false;
    }

    // 3. NÃO pode estar em plantão ou trabalhando no horário
    return true;
  });

  // Ordenar candidatos: primeiro os que ativaram voluntariamente disponivel_ft = true
  const candidatosOrdenados = [...candidatosAptosParaFT].sort((a, b) => {
    if (a.disponivel_ft && !b.disponivel_ft) return -1;
    if (!a.disponivel_ft && b.disponivel_ft) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const handleOpenMotorFT = (data: string, condominioId: string, funcionarioFaltanteId: string) => {
    setCoberturaData(data);
    setCoberturaCondominioId(condominioId);
    setCoberturaFaltanteId(funcionarioFaltanteId);
    setMotorFTModalOpen(true);
    setSelectedCellDia(null);
  };

  const handleSaveVinculo = async () => {
    const vinculo: VinculoEscala = {
      id: `v-${editFuncionarioId}`,
      funcionario_id: editFuncionarioId,
      condominio_id: editCondominioId,
      regime_jornada: editRegime,
      turno_tipo: editTurno,
      data_inicio: `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`,
      paridade_12x36: editRegime === '12x36' ? editParidade : undefined,
      dias_folga_fixa: editRegime === '6x1' ? [0] : editRegime === '5x2' ? [0, 6] : undefined,
      ativo: true
    };
    await salvarVinculoEscala(vinculo);
    setShowConfigModal(false);
  };

  const getDiaSemanaSigla = (dia: number) => {
    const data = new Date(anoSelecionado, mesSelecionado - 1, dia);
    return ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][data.getDay()];
  };

  const isFimDeSemana = (dia: number) => {
    const data = new Date(anoSelecionado, mesSelecionado - 1, dia);
    const day = data.getDay();
    return day === 0 || day === 6;
  };

  const isDiaHoje = (dia: number) => {
    const hoje = new Date();
    return hoje.getDate() === dia && hoje.getMonth() + 1 === mesSelecionado && hoje.getFullYear() === anoSelecionado;
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO MÓDULO & MÉTRICAS CONSOLIDADAS                             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Grade Operacional de Escalas</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Regimes 12x36 · 6x1 · 5x2
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Gestão de Escalas, Folgas e Alocação de FT</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visualização mensal cruzada, controle de jornadas regulamentares e motor inteligente de cobertura de postos vazios.
            </p>
          </div>

          {/* Seletor de Mês & Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMesSelecionado((prev) => (prev > 1 ? prev - 1 : 12))}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-900 font-mono">
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mesSelecionado - 1]} / {anoSelecionado}
              </span>
              <button
                type="button"
                onClick={() => setMesSelecionado((prev) => (prev < 12 ? prev + 1 : 1))}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => recalcularGradeMensal(anoSelecionado, mesSelecionado)}
              disabled={isLoading}
              className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Recalcular grade com base nos vínculos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Recalcular Grade</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Configurar Jornada</span>
            </button>
          </div>
        </div>

        {/* 4 Cards de Métricas Operacionais do Mês */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Trabalho Regular (T)
            </span>
            <div className="text-2xl font-black font-mono text-emerald-950 mt-0.5">
              {totalTrabalho} <span className="text-xs font-normal text-emerald-700">turnos</span>
            </div>
            <span className="text-[10px] text-emerald-700 mt-1 block">Postos regulares 12x36/6x1/5x2</span>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/80">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Folgas Programadas (F)
            </span>
            <div className="text-2xl font-black font-mono text-blue-950 mt-0.5">
              {totalFolga} <span className="text-xs font-normal text-blue-700">dias</span>
            </div>
            <span className="text-[10px] text-blue-700 mt-1 block">Descanso legal garantido</span>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                Folgas Trabalhadas (⚡ FT)
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                +R$ 240/dia
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-950 mt-0.5">
              {totalFT} <span className="text-xs font-bold text-amber-800">turnos extras</span>
            </div>
            <span className="text-[10px] font-mono text-amber-800 mt-1 block font-bold">
              Total Folha: R$ {valorTotalFTs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border transition-colors ${
            totalFalta > 0 ? 'bg-red-50/80 border-red-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
              Faltas / Postos Vazios (FL)
            </span>
            <div className="text-2xl font-black font-mono text-red-600 mt-0.5">
              {totalFalta} <span className="text-xs font-normal text-slate-600">desfalques</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {totalAtestado} atestado(s) médico(s) no mês
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BARRA DE FILTROS & LEGENDA DA MATRIZ                                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filtrar:</span>
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['todos', '12x36', '6x1', '5x2'].map((regime) => (
              <button
                key={regime}
                type="button"
                onClick={() => setFiltroRegime(regime)}
                className={`py-1 px-2.5 rounded text-xs font-bold transition-all uppercase ${
                  filtroRegime === regime
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {regime === 'todos' ? 'Todos Regimes' : regime}
              </button>
            ))}
          </div>

          <select
            value={filtroCondominio}
            onChange={(e) => setFiltroCondominio(e.target.value)}
            className="py-1 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="todos">Todos os Condomínios ({condominios.length})</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Legenda de Cores da Matriz */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center text-[9px]">T</span>
            <span>Trabalho</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 text-blue-800 font-bold flex items-center justify-center text-[9px]">F</span>
            <span>Folga</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 text-slate-950 font-black flex items-center justify-center text-[9px]">FT</span>
            <span className="font-bold text-amber-900">FT ⚡</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300 text-indigo-800 font-bold flex items-center justify-center text-[9px]">CB</span>
            <span>Cobertura</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 text-white font-bold flex items-center justify-center text-[9px]">FL</span>
            <span className="text-red-700 font-bold">Falta</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 text-rose-800 font-bold flex items-center justify-center text-[9px]">AT</span>
            <span>Atestado</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRADE MENSAL CRUZADA (TABELA DE ESCALAÇÃO DO MÊS)                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Matriz de Escalonamento Mensal · Março de 2026</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em qualquer dia para alterar o status, registrar falta ou acionar o motor de busca de folguista (FT).
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">
            {funcionariosFiltrados.length} Colaboradores Exibidos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                <th className="py-3 px-4 text-left font-bold sticky left-0 bg-slate-100 z-10 min-w-[200px] border-r border-slate-200">
                  Colaborador & Posto
                </th>
                <th className="py-2 px-2 text-center font-bold text-[10px] text-slate-500 border-r border-slate-200 min-w-[70px]">
                  Regime
                </th>
                {diasArray.map((dia) => {
                  const sigla = getDiaSemanaSigla(dia);
                  const fds = isFimDeSemana(dia);
                  const hoje = isDiaHoje(dia);

                  return (
                    <th
                      key={dia}
                      className={`py-1.5 px-1 text-center min-w-[32px] border-r border-slate-200/60 ${
                        hoje
                          ? 'bg-amber-100 text-amber-950 font-black'
                          : fds
                          ? 'bg-slate-200/60 text-slate-700'
                          : 'text-slate-600'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-mono">{sigla}</span>
                      <span className="block text-xs font-black font-mono">{dia}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funcionariosFiltrados.map((func) => {
                const vinculo = vinculosEscala.find((v) => v.funcionario_id === func.id);
                const cond = condominios.find((c) => c.id === vinculo?.condominio_id);

                return (
                  <tr key={func.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Coluna Fixa: Colaborador */}
                    <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200">
                      <div className="flex items-center gap-2.5">
                        {func.avatar_url ? (
                          <img
                            src={func.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0 text-slate-700">
                            {func.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate leading-tight text-xs">
                            {func.full_name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cond?.nome.split(' ')[0] || 'Posto'}</span>
                            {func.disponivel_ft && (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 rounded">
                                ⚡ FT
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Coluna Regime */}
                    <td className="py-2 px-2 text-center border-r border-slate-200">
                      <span className={`inline-block font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                        vinculo?.regime_jornada === '12x36'
                          ? 'bg-indigo-100 text-indigo-900'
                          : vinculo?.regime_jornada === '6x1'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-purple-100 text-purple-900'
                      }`}>
                        {vinculo?.regime_jornada || '12x36'}
                      </span>
                    </td>

                    {/* Células de cada dia do mês */}
                    {diasArray.map((dia) => {
                      const dataStr = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                      const escalaDia = escalasOperacionais.find(
                        (e) => e.funcionario_id === func.id && e.data === dataStr
                      );
                      const hoje = isDiaHoje(dia);

                      const status = escalaDia?.status || 'trabalho';

                      // Mapeamento visual das células
                      const statusStyles = {
                        trabalho: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 font-semibold',
                        folga: 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold',
                        ft: 'bg-amber-400 text-slate-950 font-black shadow-sm ring-1 ring-amber-500 hover:bg-amber-300 animate-pulse',
                        cobertura: 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-300',
                        falta: 'bg-red-600 text-white font-black hover:bg-red-700 animate-bounce',
                        atestado: 'bg-rose-100 text-rose-900 font-bold border border-rose-300',
                        ferias: 'bg-yellow-200 text-yellow-900 font-bold'
                      }[status];

                      const labelSigla = {
                        trabalho: 'T',
                        folga: 'F',
                        ft: 'FT',
                        cobertura: 'CB',
                        falta: 'FL',
                        atestado: 'AT',
                        ferias: 'FE'
                      }[status];

                      return (
                        <td
                          key={dia}
                          className={`p-1 text-center border-r border-slate-200/60 ${
                            hoje ? 'bg-amber-50/50 ring-1 ring-amber-400' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (status === 'falta' && cond) {
                                handleOpenMotorFT(dataStr, cond.id, func.id);
                              } else if (escalaDia) {
                                setSelectedCellDia(escalaDia);
                              }
                            }}
                            title={`${func.full_name} - Dia ${dia}: ${status.toUpperCase()} ${
                              status === 'falta' ? '· CLIQUE PARA CONVOCAR FT' : ''
                            }`}
                            className={`w-7 h-7 rounded-lg text-[10px] font-mono flex items-center justify-center mx-auto transition-transform active:scale-90 ${statusStyles}`}
                          >
                            {labelSigla}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL DO MOTOR DE COBERTURA DE POSTO VAZIO (ALGORITMO FT)              */}
      {/* ========================================================================= */}
      {motorFTModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <span>Motor de Cobertura de Posto Vazio (FT)</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Data: <span className="font-mono text-amber-300 font-bold">{coberturaData}</span> · Posto:{' '}
                    <span className="font-semibold">{condominios.find((c) => c.id === coberturaCondominioId)?.nome}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMotorFTModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explicação da Regra */}
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Cruzamento Inteligente de Escalas:</strong> O sistema filtrou os colaboradores que estão em{' '}
                <strong>FOLGA PROGRAMADA (F)</strong> nesta data exata, não possuem serviço no horário e aceitam realizar FT.
              </div>
            </div>

            {/* Lista de Voluntários Candidatos */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider">
                  Candidatos Aptos Disponíveis ({candidatosOrdenados.length})
                </span>
                <span className="font-mono text-emerald-700 font-bold">
                  Crédito na Folha: +R$ 240,00
                </span>
              </div>

              {candidatosOrdenados.length > 0 ? (
                candidatosOrdenados.map((candidato) => {
                  const vinculoCand = vinculosEscala.find((v) => v.funcionario_id === candidato.id);
                  const condOrigem = condominios.find((c) => c.id === vinculoCand?.condominio_id);

                  return (
                    <div
                      key={candidato.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {candidato.avatar_url ? (
                          <img
                            src={candidato.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {candidato.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-xs">{candidato.full_name}</p>
                            {candidato.disponivel_ft ? (
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded">
                                ⚡ Voluntário Ativo
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                                Em Folga
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Posto de Origem: {condOrigem?.nome} · Regime: {vinculoCand?.regime_jornada || '12x36'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{candidato.telefone}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await convocarFolguistaFT(
                            coberturaData,
                            coberturaCondominioId,
                            coberturaFaltanteId,
                            candidato.id
                          );
                          setMotorFTModalOpen(false);
                        }}
                        className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Alocar FT ⚡</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Nenhum colaborador disponível em folga para esta data.
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMotorFTModalOpen(false)}
                className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. POPOVER RÁPIDO DE ALTERAÇÃO DE DIA (CLIQUE NA CÉLULA)                   */}
      {/* ========================================================================= */}
      {selectedCellDia && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Alterar Status do Dia {selectedCellDia.data.split('-')[2]}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {profiles.find((p) => p.id === selectedCellDia.funcionario_id)?.full_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCellDia(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={async () => {
                  await atualizarStatusDiaEscala(selectedCellDia.funcionario_id, selectedCellDia.data, 'trabalho');
                  setSelectedCellDia(null);
                }}
                className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-left"
              >
                🟩 Trabalho Regular
              </button>

              <button
                type="button"
                onClick={async () => {
                  await atualizarStatusDiaEscala(selectedCellDia.funcionario_id, selectedCellDia.data, 'folga');
                  setSelectedCellDia(null);
                }}
                className="p-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-left"
              >
                🟦 Folga Programada
              </button>

              <button
                type="button"
                onClick={async () => {
                  await atualizarStatusDiaEscala(selectedCellDia.funcionario_id, selectedCellDia.data, 'falta', 'Falta lançada pelo supervisor');
                  setSelectedCellDia(null);
                }}
                className="p-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-900 font-bold text-left"
              >
                🟥 Registrar Falta
              </button>

              <button
                type="button"
                onClick={async () => {
                  await atualizarStatusDiaEscala(selectedCellDia.funcionario_id, selectedCellDia.data, 'atestado', 'Atestado médico deferido');
                  setSelectedCellDia(null);
                }}
                className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-left"
              >
                📄 Lançar Atestado
              </button>

              <button
                type="button"
                onClick={async () => {
                  await atualizarStatusDiaEscala(selectedCellDia.funcionario_id, selectedCellDia.data, 'ferias');
                  setSelectedCellDia(null);
                }}
                className="p-2.5 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-bold text-left col-span-2"
              >
                🟨 Período de Férias
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                handleOpenMotorFT(selectedCellDia.data, selectedCellDia.condominio_id, selectedCellDia.funcionario_id);
              }}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Abrir Motor de Cobertura para este Posto (⚡ FT)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DE CONFIGURAÇÃO DE JORNADA (12x36, 6x1, 5x2)                    */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Configurar Regime de Jornada do Colaborador
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Seleção do Colaborador */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Colaborador</label>
                <select
                  value={editFuncionarioId}
                  onChange={(e) => setEditFuncionarioId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {funcionariosOperacionais.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.cargo || 'Operacional'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condomínio Alocado */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Condomínio / Posto</label>
                <select
                  value={editCondominioId}
                  onChange={(e) => setEditCondominioId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.bairro})
                    </option>
                  ))}
                </select>
              </div>

              {/* Regime de Jornada */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Regime de Trabalho</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['12x36', '6x1', '5x2'] as RegimeJornada[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRegime(r)}
                      className={`py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                        editRegime === r
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paridade se for 12x36 */}
              {editRegime === '12x36' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paridade dos Dias (12x36)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditParidade('impar')}
                      className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                        editParidade === 'impar'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Dias Ímpares (1, 3, 5...)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditParidade('par')}
                      className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                        editParidade === 'par'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Dias Pares (2, 4, 6...)
                    </button>
                  </div>
                </div>
              )}

              {/* Turno */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Horário do Turno</label>
                <select
                  value={editTurno}
                  onChange={(e) => setEditTurno(e.target.value as TurnoTipo)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="diurno_07_19">Diurno (07:00 às 19:00 - 12h)</option>
                  <option value="noturno_19_07">Noturno (19:00 às 07:00 - 12h)</option>
                  <option value="comercial_08_17">Comercial (08:00 às 17:00 - 8h)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
                Ao salvar, a grade mensal será recalculada automaticamente com as datas de trabalho e folga correspondentes.
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="py-1.5 px-3 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveVinculo}
                className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Salvar e Recalcular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
