import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Clock, 
  HardHat, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  RotateCcw, 
  Copy, 
  Calendar, 
  ShieldCheck, 
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  ConfiguracaoHorariosObrasMudancas, 
  obterConfiguracaoHorarios, 
  salvarConfiguracaoHorarios, 
  restaurarPadraoHorarios,
  validarHorarioPermitido,
  identificarPeriodoSemana,
  RegrasCategoria,
  HorarioRegraPeriodo,
  TipoPeriodoSemana
} from '../services/horariosRegrasService';

interface ModalConfigHorariosObrasMudancasProps {
  aberto: boolean;
  onFechar: () => void;
  condominioId?: string;
  condominioNome?: string;
  operadorNome?: string;
}

export default function ModalConfigHorariosObrasMudancas({
  aberto,
  onFechar,
  condominioId,
  condominioNome,
  operadorNome
}: ModalConfigHorariosObrasMudancasProps) {
  const [abaCategoria, setAbaCategoria] = useState<'obras' | 'mudancas'>('obras');
  const [config, setConfig] = useState<ConfiguracaoHorariosObrasMudancas>(() => obterConfiguracaoHorarios(condominioId));
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Recarrega configuração quando abre ou troca de condomínio
  useEffect(() => {
    if (aberto) {
      setConfig(obterConfiguracaoHorarios(condominioId));
      setMensagemSucesso('');
    }
  }, [aberto, condominioId]);

  if (!aberto) return null;

  const periodoAtual = identificarPeriodoSemana(new Date());
  const statusObrasAgora = validarHorarioPermitido('obras', new Date(), condominioId);
  const statusMudancasAgora = validarHorarioPermitido('mudancas', new Date(), condominioId);

  const regrasAtivas = config[abaCategoria];

  const atualizarPeriodo = (
    periodo: TipoPeriodoSemana,
    campo: keyof HorarioRegraPeriodo,
    valor: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [abaCategoria]: {
        ...prev[abaCategoria],
        [periodo]: {
          ...prev[abaCategoria][periodo],
          [campo]: valor
        }
      }
    }));
  };

  const atualizarGeral = (campo: keyof RegrasCategoria, valor: any) => {
    setConfig(prev => ({
      ...prev,
      [abaCategoria]: {
        ...prev[abaCategoria],
        [campo]: valor
      }
    }));
  };

  const handleSalvar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSalvando(true);
    try {
      salvarConfiguracaoHorarios(config, condominioId, operadorNome);
      setMensagemSucesso('Horários e regras configurados com sucesso!');
      setTimeout(() => {
        setMensagemSucesso('');
        onFechar();
      }, 1200);
    } catch (err) {
      console.error('Erro ao salvar horários:', err);
    } finally {
      setSalvando(false);
    }
  };

  const handleRestaurarPadrao = () => {
    if (window.confirm('Deseja restaurar os horários padrão da convenção condominial?')) {
      const padrao = restaurarPadraoHorarios(condominioId, operadorNome);
      setConfig(padrao);
      setMensagemSucesso('Horários restaurados para o padrão.');
      setTimeout(() => setMensagemSucesso(''), 2500);
    }
  };

  const handleCopiarParaOutraCategoria = () => {
    const destino = abaCategoria === 'obras' ? 'mudancas' : 'obras';
    const nomeDestino = destino === 'obras' ? 'Obras' : 'Mudanças';
    if (window.confirm(`Copiar horários configurados de ${abaCategoria === 'obras' ? 'Obras' : 'Mudanças'} para ${nomeDestino}?`)) {
      setConfig(prev => ({
        ...prev,
        [destino]: {
          ...prev[destino],
          segundaASexta: { ...prev[abaCategoria].segundaASexta },
          sabados: { ...prev[abaCategoria].sabados },
          domingos: { ...prev[abaCategoria].domingos },
          feriados: { ...prev[abaCategoria].feriados }
        }
      }));
      setMensagemSucesso(`Horários copiados para ${nomeDestino}!`);
      setTimeout(() => setMensagemSucesso(''), 2500);
    }
  };

  const renderCardPeriodo = (
    titulo: string,
    subtitulo: string,
    chave: TipoPeriodoSemana,
    periodo: HorarioRegraPeriodo,
    badgeDestaque?: boolean
  ) => {
    return (
      <div 
        key={chave}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 ${
          periodo.permitido 
            ? 'bg-slate-900/90 border-slate-700/80 shadow-xs' 
            : 'bg-slate-950/60 border-slate-800/80 opacity-90'
        } ${badgeDestaque ? 'ring-2 ring-emerald-500/50' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl flex items-center justify-center font-bold text-xs ${
              periodo.permitido 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">{titulo}</h4>
                {badgeDestaque && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Hoje
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{subtitulo}</p>
            </div>
          </div>

          {/* Toggle Permitido / Bloqueado */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`text-xs font-bold ${periodo.permitido ? 'text-emerald-400' : 'text-slate-400'}`}>
              {periodo.permitido ? 'Permitido' : 'Bloqueado'}
            </span>
            <button
              type="button"
              onClick={() => atualizarPeriodo(chave, 'permitido', !periodo.permitido)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                periodo.permitido ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={periodo.permitido}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  periodo.permitido ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Detalhes de Horários */}
        {periodo.permitido ? (
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Horário de Início
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={periodo.horarioInicio}
                    onChange={(e) => atualizarPeriodo(chave, 'horarioInicio', e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white font-mono text-sm font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <Clock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Horário de Término
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={periodo.horarioFim}
                    onChange={(e) => atualizarPeriodo(chave, 'horarioFim', e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white font-mono text-sm font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <Clock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                Regras e Observações Específicas
              </label>
              <input
                type="text"
                value={periodo.observacao || ''}
                onChange={(e) => atualizarPeriodo(chave, 'observacao', e.target.value)}
                placeholder="Ex: Permitido martelete apenas até às 16:00 / Sem ruído pesado..."
                className="w-full bg-slate-950/80 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>
        ) : (
          <div className="pt-3">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Entradas de {abaCategoria === 'obras' ? 'obras e reformas' : 'mudanças'} ficam bloqueadas e alertam a portaria.
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* ========================================================
            CABEÇALHO DO FORMULÁRIO (Com ícone de engrenagem)
           ======================================================== */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-xs shrink-0">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Configuração de Horários
                </h3>
                {condominioNome && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {condominioNome}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Configure os dias e faixas de horários permitidos para obras, reformas e mudanças.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar formulário"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK DE SUCESSO */}
        {mensagemSucesso && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{mensagemSucesso}</span>
            </div>
          </div>
        )}

        {/* SELETOR DE CATEGORIA: OBRAS vs MUDANÇAS */}
        <div className="p-4 sm:px-6 pb-2 shrink-0 border-b border-slate-800/80 bg-slate-900/50">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {/* Aba Obras */}
            <button
              type="button"
              onClick={() => setAbaCategoria('obras')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                abaCategoria === 'obras'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HardHat className="w-4 h-4" />
              <span>Obras & Reformas</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                statusObrasAgora.permitido 
                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-red-900/80 text-red-300 border border-red-500/30'
              }`}>
                {statusObrasAgora.permitido ? 'Hoje: Permitido' : 'Hoje: Bloqueado'}
              </span>
            </button>

            {/* Aba Mudanças */}
            <button
              type="button"
              onClick={() => setAbaCategoria('mudancas')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                abaCategoria === 'mudancas'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Mudanças</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                statusMudancasAgora.permitido 
                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-red-900/80 text-red-300 border border-red-500/30'
              }`}>
                {statusMudancasAgora.permitido ? 'Hoje: Permitido' : 'Hoje: Bloqueado'}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================
            CORPO DO FORMULÁRIO (Rolável)
           ======================================================== */}
        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Banner de Status Agora */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  Status no Momento ({periodoAtual.rotulo}):
                </p>
                <p className="text-[11px] text-slate-400">
                  {abaCategoria === 'obras' ? statusObrasAgora.statusTexto : statusMudancasAgora.statusTexto}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopiarParaOutraCategoria}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 px-2.5 py-1.5 rounded-xl border border-purple-800/50 transition cursor-pointer flex items-center gap-1.5"
                title={`Copiar para ${abaCategoria === 'obras' ? 'Mudanças' : 'Obras'}`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copiar para {abaCategoria === 'obras' ? 'Mudanças' : 'Obras'}</span>
              </button>
            </div>
          </div>

          {/* GRID DOS 4 PERÍODOS ESPECIFICADOS PELO USUÁRIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. 2ª a 6ª Feira */}
            {renderCardPeriodo(
              '2ª a 6ª Feira',
              'Dias úteis normais de segunda a sexta',
              'segundaASexta',
              regrasAtivas.segundaASexta,
              periodoAtual.chave === 'segundaASexta'
            )}

            {/* 2. Sábados */}
            {renderCardPeriodo(
              'Sábados',
              'Fins de semana com horário reduzido',
              'sabados',
              regrasAtivas.sabados,
              periodoAtual.chave === 'sabados'
            )}

            {/* 3. Domingos */}
            {renderCardPeriodo(
              'Domingos',
              'Dia de descanso para moradores',
              'domingos',
              regrasAtivas.domingos,
              periodoAtual.chave === 'domingos'
            )}

            {/* 4. Feriados */}
            {renderCardPeriodo(
              'Feriados',
              'Feriados municipais, estaduais e nacionais',
              'feriados',
              regrasAtivas.feriados,
              periodoAtual.chave === 'feriados'
            )}
          </div>

          {/* PARÂMETROS ADICIONAIS DA CATEGORIA */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Parâmetros de Portaria & Tolerância
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Tolerância de Saída (Minutos)
                </label>
                <select
                  value={regrasAtivas.toleranciaMinutos || 15}
                  onChange={(e) => atualizarGeral('toleranciaMinutos', Number(e.target.value))}
                  className="w-full bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none"
                >
                  <option value={0}>Sem tolerância (Término exato)</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos (Padrão)</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Agendamento Prévio
                </label>
                <div className="flex items-center gap-3 pt-1.5">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regrasAtivas.exigirAgendamentoPrevio ?? true}
                      onChange={(e) => atualizarGeral('exigirAgendamentoPrevio', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Exigir autorização prévia pelo morador/síndico</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Normas Gerais e Diretrizes da Convenção
              </label>
              <textarea
                rows={2}
                value={regrasAtivas.observacoesGerais || ''}
                onChange={(e) => atualizarGeral('observacoesGerais', e.target.value)}
                placeholder="Ex: Utilizar obrigatoriamente capa no elevador de serviço, descarte de entulho em caçamba..."
                className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* ========================================================
            RODAPÉ DE AÇÕES
           ======================================================== */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestaurarPadrao}
            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            title="Restaurar valores de fábrica da convenção"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSalvar()}
              disabled={salvando}
              className="px-5 py-2 rounded-xl text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
