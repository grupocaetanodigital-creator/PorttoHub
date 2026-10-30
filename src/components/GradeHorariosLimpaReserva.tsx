import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  Users, 
  Check, 
  Plus, 
  Search, 
  UserCheck, 
  PlusCircle, 
  X, 
  Share2, 
  SlidersHorizontal,
  Info,
  DollarSign,
  Building
} from 'lucide-react';
import { AreaComum, ReservaArea } from '../services/reservaAreasService';

interface GradeHorariosLimpaReservaProps {
  areas: AreaComum[];
  reservas: ReservaArea[];
  moradoresCadastrados: any[];
  condId: string;
  condoConfig: any;
  usuarioLogado: any;
  onCriarReserva: (dados: any) => Promise<boolean>;
  onAbrirConfigEspacos: () => void;
  onDispararWhatsApp: (reserva: ReservaArea) => void;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(totalMins: number): string {
  const norm = totalMins % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const GradeHorariosLimpaReserva: React.FC<GradeHorariosLimpaReservaProps> = ({
  areas,
  reservas,
  moradoresCadastrados,
  condId,
  condoConfig,
  usuarioLogado,
  onCriarReserva,
  onAbrirConfigEspacos,
  onDispararWhatsApp,
}) => {
  const [areaSelecionadaId, setAreaSelecionadaId] = useState<string>(areas[0]?.id || '');
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Modal de Agendamento Ágil da Portaria
  const [modalSlot, setModalSlot] = useState<{
    aberto: boolean;
    area: AreaComum | null;
    inicio: string;
    fim: string;
  }>({
    aberto: false,
    area: null,
    inicio: '',
    fim: '',
  });

  // Form states inside express modal
  const [buscaUnidade, setBuscaUnidade] = useState('');
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('');
  const [moradorSelecionado, setMoradorSelecionado] = useState<any | null>(null);
  const [showNovoMoradorInline, setShowNovoMoradorInline] = useState(false);
  const [novoMoradorNome, setNovoMoradorNome] = useState('');
  const [novoMoradorTelefone, setNovoMoradorTelefone] = useState('');
  const [novoMoradorPapel, setNovoMoradorPapel] = useState('Proprietário');
  const [qtdConvidados, setQtdConvidados] = useState(2);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [comprovanteRecente, setComprovanteRecente] = useState<ReservaArea | null>(null);

  const areaAtiva = useMemo(() => {
    return areas.find((a) => a.id === areaSelecionadaId) || areas[0] || null;
  }, [areas, areaSelecionadaId]);

  // 14 dias para o seletor rápido
  const listaDias = useMemo(() => {
    const list = [];
    const hoje = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const diaMes = String(d.getDate()).padStart(2, '0');
      const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      list.push({ iso, diaSemana, diaMes, mes, isHoje: i === 0 });
    }
    return list;
  }, []);

  // Gera slots da área ativa
  const slotsDaArea = useMemo(() => {
    if (!areaAtiva) return [];

    const startMins = parseTimeToMinutes(areaAtiva.horario_inicio || '07:00');
    let endMins = parseTimeToMinutes(areaAtiva.horario_fim || '22:00');
    if (endMins <= startMins) endMins = 24 * 60;

    const duracao = Math.max(30, areaAtiva.duracao_slot_minutos || 60);
    const slots = [];

    // Reservas ativas da área nesta data
    const reservasDoDia = reservas.filter(
      (r) =>
        r.area_id === areaAtiva.id &&
        r.data_reserva === dataSelecionada &&
        r.status !== 'cancelada' &&
        r.status !== 'recusada'
    );

    for (let cur = startMins; cur + duracao <= endMins; cur += duracao) {
      const sInicio = formatMinutesToTime(cur);
      const sFim = formatMinutesToTime(cur + duracao);

      // Procura conflito com reserva existente
      const reservaOcupando = reservasDoDia.find((r) => {
        if (r.turno === 'dia_todo') return true;
        const rS = parseTimeToMinutes(r.horario_inicio);
        let rE = parseTimeToMinutes(r.horario_fim);
        if (rE <= rS) rE += 24 * 60;

        return Math.max(rS, cur) < Math.min(rE, cur + duracao);
      });

      slots.push({
        inicio: sInicio,
        fim: sFim,
        disponivel: !reservaOcupando,
        reserva: reservaOcupando || null,
      });
    }

    return slots;
  }, [areaAtiva, dataSelecionada, reservas]);

  // Lista de moradores da unidade selecionada
  const moradoresDaUnidade = useMemo(() => {
    if (!unidadeSelecionada.trim()) return [];
    const term = unidadeSelecionada.toLowerCase().trim();

    return moradoresCadastrados.filter((m) => {
      const uStr = `${m.unidade || ''}`.toLowerCase().trim();
      const bStr = `${m.bloco || ''}`.toLowerCase().trim();
      const comb = `${bStr} ${uStr}`.trim();
      return uStr === term || comb.includes(term) || `${uStr} ${bStr}`.includes(term);
    });
  }, [unidadeSelecionada, moradoresCadastrados]);

  // Sugestões de unidades para autocompletar
  const sugestoesUnidades = useMemo(() => {
    if (!buscaUnidade.trim()) return [];
    const term = buscaUnidade.toLowerCase().trim();
    const setUni = new Set<string>();

    moradoresCadastrados.forEach((m) => {
      const un = m.unidade ? String(m.unidade).trim() : '';
      const bl = m.bloco ? String(m.bloco).trim() : '';
      const label = bl ? `${un} (${bl})` : un;
      if (un.toLowerCase().includes(term) || bl.toLowerCase().includes(term)) {
        setUni.add(label);
      }
    });

    return Array.from(setUni).slice(0, 6);
  }, [buscaUnidade, moradoresCadastrados]);

  const abrirModalSlot = (inicio: string, fim: string) => {
    setModalSlot({
      aberto: true,
      area: areaAtiva,
      inicio,
      fim,
    });
    setBuscaUnidade('');
    setUnidadeSelecionada('');
    setMoradorSelecionado(null);
    setShowNovoMoradorInline(false);
    setQtdConvidados(areaAtiva?.capacidade_maxima ? Math.min(2, areaAtiva.capacidade_maxima) : 2);
    setObservacoes('');
  };

  const handleSelecionarUnidade = (unLabel: string) => {
    setUnidadeSelecionada(unLabel);
    setBuscaUnidade(unLabel);

    // Auto seleciona primeiro morador se houver
    const term = unLabel.toLowerCase().trim();
    const mor = moradoresCadastrados.find((m) => {
      const uStr = `${m.unidade || ''}`.toLowerCase().trim();
      const bStr = `${m.bloco || ''}`.toLowerCase().trim();
      return unLabel.includes(uStr) && (!bStr || unLabel.includes(bStr));
    });

    if (mor) {
      setMoradorSelecionado(mor);
    }
  };

  const handleConfirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSlot.area || !unidadeSelecionada.trim() || !moradorSelecionado) return;

    setSalvando(true);
    try {
      const dadosReserva = {
        area_id: modalSlot.area.id,
        area_nome: modalSlot.area.nome,
        data_reserva: dataSelecionada,
        turno: 'personalizado' as const,
        horario_inicio: modalSlot.inicio,
        horario_fim: modalSlot.fim,
        unidade_bloco: unidadeSelecionada,
        morador_nome: moradorSelecionado.nome,
        morador_telefone: moradorSelecionado.telefone || moradorSelecionado.celular || '',
        tipo_evento: `Uso de ${modalSlot.area.nome}`,
        qtd_convidados_estimada: qtdConvidados,
        observacoes: observacoes.trim(),
        termo_aceito: true,
        valor_total: (modalSlot.area.taxa_reserva || 0) + (modalSlot.area.taxa_limpeza || 0),
        status: (modalSlot.area.exige_aprovacao_sindico ? 'pendente' : 'aprovada') as any,
      };

      const ok = await onCriarReserva(dadosReserva);
      if (ok) {
        setModalSlot((prev) => ({ ...prev, aberto: false }));
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. SELETOR LIMPO DE ÁREAS COMUNS (Quadras, Academia, Jogos, etc.) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Selecione a Área Comum
          </span>
          <button
            type="button"
            onClick={onAbrirConfigEspacos}
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Configurar Horários das Áreas
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {areas.map((area) => {
            const isSel = area.id === areaAtiva?.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setAreaSelecionadaId(area.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSel
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{area.nome}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSel ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {area.horario_inicio || '07:00'}-{area.horario_fim || '22:00'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CALENDÁRIO PRÓXIMOS 14 DIAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Data: {new Date(dataSelecionada + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDataSelecionada(new Date().toISOString().split('T')[0])}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                dataSelecionada === new Date().toISOString().split('T')[0]
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Hoje
            </button>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => e.target.value && setDataSelecionada(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
            />
          </div>
        </div>

        {/* 14 dias strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {listaDias.map((d) => {
            const isSel = d.iso === dataSelecionada;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setDataSelecionada(d.iso)}
                className={`flex flex-col items-center justify-center min-w-[60px] py-1.5 px-1 rounded-xl border text-center transition cursor-pointer ${
                  isSel
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase ${isSel ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {d.isHoje ? 'Hoje' : d.diaSemana}
                </span>
                <span className="text-sm font-black font-mono tabular-nums leading-tight">{d.diaMes}</span>
                <span className="text-[9px] text-slate-400">{d.mes}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRADE DE HORAS DISPONÍVEIS */}

      {/* 4. GRADE DE HORAS DISPONÍVEIS (Requisito Chave!) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Grade de Horários Disponíveis
            </h3>
            <p className="text-[11px] text-slate-500">
              Clique em "+ Agendar" no horário desejado para informar a unidade e morador
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-bold">
            {slotsDaArea.filter((s) => s.disponivel).length} horários livres
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {slotsDaArea.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhum horário gerado para os limites configurados desta área.
            </div>
          ) : (
            slotsDaArea.map((slot) => {
              if (slot.disponivel) {
                return (
                  <div
                    key={`${slot.inicio}-${slot.fim}`}
                    className="p-3 sm:px-5 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-[110px] flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 dark:text-white">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{slot.inicio} - {slot.fim}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        Disponível
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalSlot(slot.inicio, slot.fim)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agendar Horário
                    </button>
                  </div>
                );
              }

              // OCUPADO
              const res = slot.reserva;
              return (
                <div
                  key={`${slot.inicio}-${slot.fim}`}
                  className="p-3 sm:px-5 bg-slate-50/60 dark:bg-slate-850/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-[110px] flex items-center gap-1.5 font-mono text-xs font-black text-slate-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slot.inicio} - {slot.fim}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {res?.unidade_bloco}
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                          {res?.morador_nome}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {res?.status === 'aprovada' ? 'Confirmada' : res?.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {res && (
                    <button
                      type="button"
                      onClick={() => onDispararWhatsApp(res)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                      title="Enviar WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. MODAL DE AGENDAMENTO ÁGIL (O operador digita a unidade e lista moradores!) */}
      {modalSlot.aberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Agendar {modalSlot.area?.nome}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {dataSelecionada} • {modalSlot.inicio} às {modalSlot.fim}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalSlot((prev) => ({ ...prev, aberto: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarAgendamento} className="space-y-4 text-xs">
              {/* PASSO 1: UNIDADE / APARTAMENTO */}
              <div>
                <label className="block font-black text-slate-900 dark:text-white mb-1">
                  1. Digite o número da Unidade / Apartamento *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 402, 101, Casa 12..."
                    value={buscaUnidade}
                    onChange={(e) => {
                      setBuscaUnidade(e.target.value);
                      setUnidadeSelecionada(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                {/* Sugestões de Unidades */}
                {sugestoesUnidades.length > 0 && !unidadeSelecionada && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sugestoesUnidades.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleSelecionarUnidade(sug)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PASSO 2: LISTA DE MORADORES DA UNIDADE SELECIONADA */}
              {unidadeSelecionada && (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      2. Moradores Cadastrados no {unidadeSelecionada}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNovoMoradorInline(!showNovoMoradorInline)}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Outro Morador
                    </button>
                  </div>

                  {moradoresDaUnidade.length === 0 ? (
                    <div className="text-[11px] text-slate-500 py-2">
                      Nenhum morador previamente vinculado ao {unidadeSelecionada}. Digite abaixo para cadastrar:
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {moradoresDaUnidade.map((mor) => {
                        const isSel = moradorSelecionado?.id === mor.id;
                        return (
                          <div
                            key={mor.id}
                            onClick={() => setMoradorSelecionado(mor)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                              isSel
                                ? 'bg-white dark:bg-slate-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {mor.nome}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {mor.telefone || mor.celular || 'Sem telefone'}
                              </span>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                isSel ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                              }`}
                            >
                              {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Cadastro inline se morador não estiver na lista */}
                  {(showNovoMoradorInline || moradoresDaUnidade.length === 0) && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        Novo Morador Solicitante:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nome completo..."
                          value={novoMoradorNome}
                          onChange={(e) => setNovoMoradorNome(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="WhatsApp / Telefone..."
                          value={novoMoradorTelefone}
                          onChange={(e) => setNovoMoradorTelefone(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (novoMoradorNome.trim()) {
                            const m = {
                              id: `quick-${Date.now()}`,
                              nome: novoMoradorNome.trim(),
                              telefone: novoMoradorTelefone.trim(),
                              unidade: unidadeSelecionada,
                            };
                            setMoradorSelecionado(m);
                            setShowNovoMoradorInline(false);
                          }
                        }}
                        className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Definir como Solicitante
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PASSO 3: CONVIDADOS E OBSERVAÇÕES */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qtd. Pessoas / Participantes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={modalSlot.area?.capacidade_maxima || 50}
                    value={qtdConvidados}
                    onChange={(e) => setQtdConvidados(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observações Portaria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Empréstimo raquete/bola..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalSlot((prev) => ({ ...prev, aberto: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!moradorSelecionado || salvando}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {salvando ? 'Agendando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
