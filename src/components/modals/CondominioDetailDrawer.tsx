import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Navigation, 
  Users, 
  Phone, 
  MessageCircle, 
  Clock, 
  ShieldAlert, 
  Zap, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowRightLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CondominioPosto, Colaborador, TurnoPosto } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';
import confetti from 'canvas-confetti';

interface CondominioDetailDrawerProps {
  condominio: CondominioPosto | null;
  onClose: () => void;
}

export const CondominioDetailDrawer: React.FC<CondominioDetailDrawerProps> = ({
  condominio,
  onClose
}) => {
  const { 
    colaboradores, 
    turnos, 
    condominios,
    ocorrencias, 
    addOcorrencia, 
    reallotColaborador,
    openFTModal, 
    currentUser, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'geral' | 'equipe' | 'plantao' | 'ocorrencias'>('geral');
  const [isAddingOcorrencia, setIsAddingOcorrencia] = useState(false);
  const [reallocatingColab, setReallocatingColab] = useState<Colaborador | null>(null);

  // New Ocorrência Form State
  const [ocoTitulo, setOcoTitulo] = useState('');
  const [ocoDescricao, setOcoDescricao] = useState('');
  const [ocoGravidade, setOcoGravidade] = useState<'baixa' | 'media' | 'alta'>('media');

  if (!condominio) return null;

  // Filter staff linked to this condominium
  const linkedColabs = colaboradores.filter(c => c.condominioId === condominio.id);
  
  // Filter shifts for this condo
  const condoTurnos = turnos.filter(t => t.condominioId === condominio.id);
  const emptyTurno = condoTurnos.find(t => t.status === 'vazio');
  const ftTurno = condoTurnos.find(t => t.status === 'em_ft');
  const isPostoVazio = Boolean(emptyTurno);

  // Filter occurrences for this condo
  const condoOcorrencias = ocorrencias.filter(o => o.condominioId === condominio.id);

  // Submit Ocorrência
  const handleSaveOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocoTitulo.trim() || !ocoDescricao.trim()) {
      showToast('Preencha título e descrição da ocorrência', 'warning');
      return;
    }

    await addOcorrencia({
      condominioId: condominio.id,
      autorNome: currentUser?.name || 'Supervisor Operacional',
      autorCargo: currentUser?.cargo || 'Supervisor',
      titulo: ocoTitulo.trim(),
      descricao: ocoDescricao.trim(),
      gravidade: ocoGravidade
    });

    setOcoTitulo('');
    setOcoDescricao('');
    setIsAddingOcorrencia(false);
    try {
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
  };

  // Reallocate staff to another condo
  const handleConfirmReallocation = async (novoCondoId: string) => {
    if (!reallocatingColab) return;
    await reallotColaborador(reallocatingColab.id, novoCondoId);
    setReallocatingColab(null);
  };

  const handleWhatsApp = (phone?: string, text?: string) => {
    if (!phone) {
      showToast('Telefone não disponível', 'warning');
      return;
    }
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(text || 'Olá, contato da supervisão TurnoCerto / PorttoHub.')}`, '_blank');
  };

  return (
    <BottomSheet
      isOpen={Boolean(condominio)}
      onClose={onClose}
      title={condominio.nome}
      subtitle={`Painel 360° do Posto &bull; ${condominio.tipo}`}
      maxHeight="max-h-[92vh]"
    >
      <div className="space-y-4">
        {/* Status Header Banner */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isPostoVazio 
            ? 'bg-red-950/40 border-red-500/50 text-red-200' 
            : ftTurno
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {isPostoVazio ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
            ) : ftTurno ? (
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold text-white">
                {isPostoVazio ? '🔴 POSTO VAZIO (Falta Crítica)' : ftTurno ? '⚡ Posto em FT (Substituto Ativo)' : '🟢 Operação 100% Coberta'}
              </p>
              <p className="text-[11px] opacity-80">
                {condoTurnos.length} turno(s) &bull; {linkedColabs.length} operadores vinculados
              </p>
            </div>
          </div>

          {isPostoVazio && (
            <button
              type="button"
              onClick={() => openFTModal(emptyTurno)}
              className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-red-900/40 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>FT Rápida</span>
            </button>
          )}
        </div>

        {/* 4 Tabs within the 360° Drawer */}
        <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 flex items-center text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'geral' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plantao')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'plantao' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Plantão ({condoTurnos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('equipe')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'equipe' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Equipe ({linkedColabs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ocorrencias')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'ocorrencias' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Livro ({condoOcorrencias.length})
          </button>
        </div>

        {/* TAB 1: Informações Gerais */}
        {activeTab === 'geral' && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                Localização & Perímetro
              </span>
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">{condominio.endereco}</p>
                  <p className="text-slate-400 text-[11px]">{condominio.cidade} - {condominio.uf}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Coordenadas GPS:</span>
                <span className="font-mono text-slate-200">{condominio.latitude.toFixed(4)}, {condominio.longitude.toFixed(4)}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Cerca Geofence Ponto:</span>
                <span className="font-bold text-emerald-400">{condominio.raioGpsMetros} metros</span>
              </div>
            </div>

            {/* Contacts & Administration */}
            <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                Gestão & Síndico
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{condominio.contatoSindico}</p>
                  <p className="text-slate-400 text-[11px]">Síndico / Administração Predial</p>
                </div>
                {condominio.telefoneSindico && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(condominio.telefoneSindico, `Olá ${condominio.contatoSindico}, aqui é da supervisão do TurnoCerto.`)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const clean = condominio.telefoneSindico.replace(/\D/g, '');
                        window.open(`tel:${clean}`);
                      }}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                      title="Ligar"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const centralPhone = '(11) 98765-4321';
                  handleWhatsApp(centralPhone, `Alerta de plantão para o condomínio ${condominio.nome}.`);
                }}
                className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-400" />
                <span>Acionar Central</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('ocorrencias');
                  setIsAddingOcorrencia(true);
                }}
                className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Registrar Livro</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Status do Plantão Atual */}
        {activeTab === 'plantao' && (
          <div className="space-y-3">
            {condoTurnos.map((turno) => {
              const titular = colaboradores.find(c => c.id === turno.colaboradorTitularId);
              const atual = colaboradores.find(c => c.id === turno.colaboradorAtualId);
              const isVazio = turno.status === 'vazio';
              const isFT = turno.status === 'em_ft';

              return (
                <div
                  key={turno.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isVazio
                      ? 'bg-slate-900 border-red-500/50'
                      : isFT
                      ? 'bg-slate-900 border-amber-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase">{turno.periodo}</span>
                      <h4 className="text-xs font-bold text-white">{turno.postoNome}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300">{turno.horario}</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    {isVazio ? (
                      <div>
                        <p className="text-xs font-bold text-red-400">Posto sem operador no momento</p>
                        <p className="text-[11px] text-slate-400">Titular ausente: {titular?.nome || 'Não definido'}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <img
                          src={(isFT ? atual : titular)?.fotoUrl}
                          alt="Plantonista"
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white">{(isFT ? atual : titular)?.nome}</p>
                            {isFT && (
                              <span className="px-1 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                                FT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{(isFT ? atual : titular)?.cargo}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      {isVazio ? (
                        <button
                          type="button"
                          onClick={() => openFTModal(turno)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5 fill-amber-300" />
                          <span>Alocar FT</span>
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {isFT ? 'Cobertura Ativa' : 'Em Plantão'}
                        </span>
                      )}
                    </div>
                  </div>

                  {turno.observacao && (
                    <p className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-800">
                      Obs: {turno.observacao}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: Equipe Completa Vinculada */}
        {activeTab === 'equipe' && (
          <div className="space-y-2.5">
            {linkedColabs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-800">
                Nenhum colaborador vinculado exclusivamente a este condomínio.
              </div>
            ) : (
              linkedColabs.map((colab) => {
                const statusBadge = () => {
                  switch (colab.statusHoje) {
                    case 'no_posto':
                      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 No Posto</span>;
                    case 'de_folga':
                      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">🟦 Folga</span>;
                    case 'em_falta':
                      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">🔴 Falta</span>;
                    case 'afastado':
                      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">🟡 Atestado</span>;
                    default:
                      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Escalado</span>;
                  }
                };

                return (
                  <div
                    key={colab.id}
                    className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={colab.fotoUrl}
                        alt={colab.nome}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-white truncate">{colab.nome}</h5>
                          {statusBadge()}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {colab.cargo} &bull; Jornada: {colab.jornada}
                        </p>
                        {colab.motivoAfastamento && (
                          <p className="text-[10px] text-yellow-300 mt-0.5 truncate">
                            {colab.motivoAfastamento}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {colab.telefone && (
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(colab.telefone, `Olá ${colab.nome}, supervisão TurnoCerto entrando em contato.`)}
                          className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setReallocatingColab(colab)}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                        title="Realocar Colaborador para Outro Posto"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Reallocation Sub-Drawer */}
            {reallocatingColab && (
              <div className="p-3.5 bg-slate-900 rounded-2xl border border-blue-500/40 space-y-2.5 mt-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  Realocar {reallocatingColab.nome} para:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {condominios
                    .filter(c => c.id !== condominio.id)
                    .map((otherCondo) => (
                      <button
                        key={otherCondo.id}
                        type="button"
                        onClick={() => handleConfirmReallocation(otherCondo.id)}
                        className="w-full text-left p-2 rounded-xl bg-slate-800 hover:bg-blue-600/30 text-xs font-semibold text-white flex items-center justify-between border border-slate-700/60 transition-colors"
                      >
                        <span>{otherCondo.nome}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => setReallocatingColab(null)}
                  className="w-full py-1 text-center text-xs text-slate-400 hover:text-white"
                >
                  Cancelar realocação
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Livro de Ocorrências Digital */}
        {activeTab === 'ocorrencias' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Registros do Posto
              </span>
              <button
                type="button"
                onClick={() => setIsAddingOcorrencia(!isAddingOcorrencia)}
                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Ocorrência</span>
              </button>
            </div>

            {/* Form to Add Occurrence */}
            {isAddingOcorrencia && (
              <form onSubmit={handleSaveOcorrencia} className="p-3.5 bg-slate-850 rounded-2xl border border-slate-700 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Título da Ocorrência *
                  </label>
                  <input
                    type="text"
                    required
                    value={ocoTitulo}
                    onChange={(e) => setOcoTitulo(e.target.value)}
                    placeholder="Ex: Falha no portão, troca de plantão, visita de técnico"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOcoGravidade('baixa')}
                    className={`py-1.5 rounded-lg font-bold text-[10px] border ${
                      ocoGravidade === 'baixa' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Baixa
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcoGravidade('media')}
                    className={`py-1.5 rounded-lg font-bold text-[10px] border ${
                      ocoGravidade === 'media' ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Média
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcoGravidade('alta')}
                    className={`py-1.5 rounded-lg font-bold text-[10px] border ${
                      ocoGravidade === 'alta' ? 'bg-red-950 border-red-500 text-red-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Alta (Crítica)
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Descrição Detalhada *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={ocoDescricao}
                    onChange={(e) => setOcoDescricao(e.target.value)}
                    placeholder="Descreva o que aconteceu, medidas tomadas e orientações para o próximo turno..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingOcorrencia(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Salvar no Livro
                  </button>
                </div>
              </form>
            )}

            {/* List of Occurrences */}
            <div className="space-y-2">
              {condoOcorrencias.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-800">
                  Nenhuma ocorrência registrada no livro digital deste condomínio.
                </div>
              ) : (
                condoOcorrencias.map((oco) => {
                  const gravidadeBadge = {
                    baixa: <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">Baixa</span>,
                    media: <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">Média</span>,
                    alta: <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">Alta</span>
                  }[oco.gravidade];

                  return (
                    <div
                      key={oco.id}
                      className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-white">{oco.titulo}</h5>
                            {gravidadeBadge}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Por: <strong className="text-slate-300">{oco.autorNome}</strong> ({oco.autorCargo}) &bull; {oco.dataHora}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {oco.descricao}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Fechar Painel 360°
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
