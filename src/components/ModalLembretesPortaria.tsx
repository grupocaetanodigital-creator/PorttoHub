import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bell,
  BellRing,
  CheckCircle2,
  Check,
  CheckCheck,
  Clock,
  User,
  Shield,
  ShieldAlert,
  Home,
  Plus,
  Search,
  Filter,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  Key,
  FileText,
  Copy,
  ExternalLink,
  Crown,
  Lock,
  Calendar,
  Layers
} from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  buscarLembretes,
  marcarComoLido,
  marcarTodosComoLidos,
  finalizarLembrete,
  criarLembrete,
  excluirLembrete,
  isSomHabilitado,
  setSomHabilitado,
  obterStatusContagem,
  pararAlarmeTrocaPlantao,
  LembretePortaria
} from '../services/lembretesService';

interface ModalLembretesPortariaProps {
  aberto: boolean;
  onFechar: () => void;
  condominioId: string;
  condominioNome?: string;
  operadorAtual?: {
    id?: string;
    nome?: string;
    login?: string;
    perfil?: string;
    nivel?: number;
    nivel_acesso?: number;
    nivel_acesso_custom_id?: string;
    eSuperAdminGlobal?: boolean;
  };
}

export default function ModalLembretesPortaria({
  aberto,
  onFechar,
  condominioId,
  condominioNome,
  operadorAtual
}: ModalLembretesPortariaProps) {
  const [lembretes, setLembretes] = useState<LembretePortaria[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [tabelaExiste, setTabelaExiste] = useState<boolean>(true);
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'adm' | 'nao_lidos' | 'cientes' | 'finalizados' | 'todos'>('ativos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [somAtivo, setSomAtivo] = useState<boolean>(isSomHabilitado());
  const [sqlCopiado, setSqlCopiado] = useState<boolean>(false);
  const [mensagemFeedback, setMensagemFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estado para criação de novo lembrete
  const [exibirFormNovo, setExibirFormNovo] = useState<boolean>(false);
  const [novoUnidadeBloco, setNovoUnidadeBloco] = useState<string>('');
  const [novoRemetenteTipo, setNovoRemetenteTipo] = useState<'morador' | 'portaria' | 'supervisao' | 'adm'>('morador');
  const [novoRemetenteNome, setNovoRemetenteNome] = useState<string>('');
  const [novoTipo, setNovoTipo] = useState<string>('Palavra-chave');
  const [novaMensagem, setNovaMensagem] = useState<string>('');
  const [novoDataLimite, setNovoDataLimite] = useState<string>('');
  const [salvandoNovo, setSalvandoNovo] = useState<boolean>(false);
  const [listaUnidadesSugeridas, setListaUnidadesSugeridas] = useState<string[]>([]);

  // Identifica se o usuário logado possui Nível 0 (Administrador Geral)
  const ehNivel0 = useMemo(() => {
    if (
      operadorAtual?.nivel_acesso === 0 ||
      operadorAtual?.nivel === 0 ||
      (operadorAtual as any)?.nivel_acesso_custom_id === 'nivel_0' ||
      operadorAtual?.perfil === 'admin' ||
      operadorAtual?.perfil === 'admin_geral' ||
      operadorAtual?.login === 'admin' ||
      operadorAtual?.eSuperAdminGlobal
    ) {
      return true;
    }
    try {
      const sessaoRaw = localStorage.getItem('infport_sessao_ativa_v1');
      if (sessaoRaw) {
        const s = JSON.parse(sessaoRaw);
        if (s.login === 'admin' || s.nivel_acesso === 0 || s.perfil === 'admin') return true;
      }
    } catch {}
    return false;
  }, [operadorAtual]);

  // Se o usuário logado for Nível 0, sugere 'adm' como remetente por padrão ao abrir o formulário
  useEffect(() => {
    if (exibirFormNovo && ehNivel0) {
      setNovoRemetenteTipo('adm');
      setNovoTipo('Lembrete do ADM');
    }
  }, [exibirFormNovo, ehNivel0]);

  // Carregar lista de lembretes
  const carregarDados = async () => {
    if (!condominioId) return;
    setCarregando(true);
    try {
      const res = await buscarLembretes(condominioId);
      setLembretes(res.lembretes);
      setTabelaExiste(res.tabelaExisteNoSupabase);
    } catch {
      // Ignora erro transitório
    } finally {
      setCarregando(false);
    }
  };

  // Carregar unidades existentes para facilitar preenchimento
  useEffect(() => {
    async function carregarUnidades() {
      if (!condominioId) return;
      try {
        const { data } = await supabase
          .from('moradores')
          .select('bloco, unidade')
          .eq('condominio_id', condominioId)
          .limit(100);

        if (data && data.length > 0) {
          const unidades = data
            .map((m) => {
              const b = m.bloco ? `Bloco ${m.bloco}` : '';
              const u = m.unidade ? `Apto ${m.unidade}` : '';
              return [u, b].filter(Boolean).join(' - ');
            })
            .filter(Boolean);
          const unicas = Array.from(new Set(unidades));
          setListaUnidadesSugeridas(unicas);
        }
      } catch {
        // Silencioso
      }
    }
    if (aberto) {
      carregarUnidades();
    }
  }, [condominioId, aberto]);

  useEffect(() => {
    if (aberto) {
      // Para o alarme sonoro de troca de plantão ao abrir o painel de lembretes
      pararAlarmeTrocaPlantao();
      carregarDados();
    }
  }, [aberto, condominioId]);

  // Listener para sincronização em tempo real quando o modal está aberto
  useEffect(() => {
    if (!aberto || !condominioId) return;

    const handleAtualizacao = () => {
      carregarDados();
    };

    window.addEventListener('lembretes_portaria_atualizados', handleAtualizacao);
    return () => {
      window.removeEventListener('lembretes_portaria_atualizados', handleAtualizacao);
    };
  }, [aberto, condominioId]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aberto) {
        onFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, onFechar]);

  // Alternar som
  const toggleSom = () => {
    const novoValor = !somAtivo;
    setSomAtivo(novoValor);
    setSomHabilitado(novoValor);
  };

  // Marcar como ciente (para de piscar laranja e passa a piscar em azul)
  const handleMarcarLido = async (id: string) => {
    await marcarComoLido(
      id,
      condominioId,
      operadorAtual?.nome || operadorAtual?.login || 'Operador',
      operadorAtual?.id
    );
    setLembretes((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              lido: true,
              lido_em: new Date().toISOString(),
              lido_por_nome: operadorAtual?.nome || operadorAtual?.login || 'Operador'
            }
          : item
      )
    );
    setMensagemFeedback({
      tipo: 'sucesso',
      texto: 'Ciência registrada! O lembrete agora pisca em azul no alerta até que seja finalizado.'
    });
    setTimeout(() => setMensagemFeedback(null), 4000);
  };

  // Finalizar lembrete (adicionar botão de finalizar, só o ADM pode baixar lembrete do ADM)
  const handleFinalizar = async (id: string) => {
    const res = await finalizarLembrete(
      id,
      condominioId,
      operadorAtual?.nome || operadorAtual?.login || 'Operador',
      operadorAtual?.id,
      ehNivel0
    );

    if (!res.sucesso && res.erro) {
      setMensagemFeedback({ tipo: 'erro', texto: res.erro });
      setTimeout(() => setMensagemFeedback(null), 5000);
      return;
    }

    setLembretes((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              finalizado: true,
              finalizado_em: new Date().toISOString(),
              finalizado_por_nome: operadorAtual?.nome || operadorAtual?.login || 'Operador'
            }
          : item
      )
    );
    setMensagemFeedback({
      tipo: 'sucesso',
      texto: 'Lembrete finalizado com sucesso! Ele foi baixado e não piscará mais no alerta.'
    });
    setTimeout(() => setMensagemFeedback(null), 4000);
  };

  // Marcar todos como cientes
  const handleMarcarTodosLidos = async () => {
    await marcarTodosComoLidos(
      condominioId,
      operadorAtual?.nome || operadorAtual?.login || 'Operador',
      operadorAtual?.id
    );
    setLembretes((prev) =>
      prev.map((item) => ({
        ...item,
        lido: true,
        lido_em: item.lido ? item.lido_em : new Date().toISOString(),
        lido_por_nome: item.lido ? item.lido_por_nome : (operadorAtual?.nome || 'Operador')
      }))
    );
    setMensagemFeedback({
      tipo: 'sucesso',
      texto: 'Todos os lembretes pendentes foram marcados como cientes (piscando em azul).'
    });
    setTimeout(() => setMensagemFeedback(null), 4000);
  };

  // Excluir lembrete
  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente remover este lembrete do histórico?')) {
      await excluirLembrete(id, condominioId);
      setLembretes((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Salvar novo lembrete
  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUnidadeBloco.trim() || !novaMensagem.trim()) return;

    const ehLembreteAdm = novoRemetenteTipo === 'adm';

    setSalvandoNovo(true);
    try {
      const res = await criarLembrete({
        condominio_id: condominioId,
        unidade_bloco: novoUnidadeBloco.trim(),
        remetente_tipo: novoRemetenteTipo,
        remetente_nome: novoRemetenteNome.trim() || (ehLembreteAdm ? 'Administração (Nível 0)' : novoRemetenteTipo === 'portaria' ? 'Portaria' : 'Morador'),
        tipo: ehLembreteAdm ? 'Lembrete do ADM' : novoTipo,
        mensagem: novaMensagem.trim(),
        lido: false,
        eh_adm: ehLembreteAdm,
        data_limite: ehLembreteAdm && novoDataLimite ? novoDataLimite : null
      });

      if (res.sucesso && res.lembrete) {
        setLembretes((prev) => [res.lembrete!, ...prev]);
        setNovoUnidadeBloco('');
        setNovoRemetenteNome('');
        setNovaMensagem('');
        setNovoDataLimite('');
        setNovoTipo('Palavra-chave');
        setExibirFormNovo(false);
        setMensagemFeedback({
          tipo: 'sucesso',
          texto: ehLembreteAdm
            ? 'Lembrete do ADM publicado com sucesso! Piscará em vermelho na portaria até que o ADM finalize ou a data limite expire.'
            : 'Novo lembrete cadastrado com sucesso!'
        });
        setTimeout(() => setMensagemFeedback(null), 5000);
      }
    } finally {
      setSalvandoNovo(false);
    }
  };

  // Copiar SQL para a área de transferência
  const handleCopiarSql = () => {
    const sql = `-- Script atualizado para tabela lembretes_portaria com suporte ao ADM e Finalização
CREATE TABLE IF NOT EXISTS lembretes_portaria (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  unidade_bloco TEXT NOT NULL,
  remetente_tipo TEXT NOT NULL DEFAULT 'morador',
  remetente_nome TEXT,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Aviso Geral',
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  lido_por_nome TEXT,
  lido_por_id TEXT,
  finalizado BOOLEAN NOT NULL DEFAULT FALSE,
  finalizado_em TIMESTAMPTZ,
  finalizado_por_nome TEXT,
  finalizado_por_id TEXT,
  eh_adm BOOLEAN NOT NULL DEFAULT FALSE,
  data_limite TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lembretes_portaria
  ADD COLUMN IF NOT EXISTS finalizado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalizado_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS finalizado_por_id TEXT,
  ADD COLUMN IF NOT EXISTS eh_adm BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_limite TIMESTAMPTZ;
ALTER TABLE lembretes_portaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total lembretes_portaria" ON lembretes_portaria FOR ALL USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload schema';`;

    navigator.clipboard.writeText(sql);
    setSqlCopiado(true);
    setTimeout(() => setSqlCopiado(false), 3000);
  };

  // Formatar data em PT-BR
  const formatarData = (dataIso: string) => {
    try {
      const d = new Date(dataIso);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataIso;
    }
  };

  const statusGeral = useMemo(() => {
    return obterStatusContagem(lembretes);
  }, [lembretes]);

  // Filtragem
  const lembretesFiltrados = useMemo(() => {
    return lembretes.filter((item) => {
      // Filtro status
      if (filtroStatus === 'ativos' && item.finalizado) return false;
      if (filtroStatus === 'adm' && (!item.eh_adm || item.finalizado)) return false;
      if (filtroStatus === 'nao_lidos' && (item.lido || item.finalizado)) return false;
      if (filtroStatus === 'cientes' && (!item.lido || item.finalizado)) return false;
      if (filtroStatus === 'finalizados' && !item.finalizado) return false;

      // Filtro tipo
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;

      // Filtro texto
      if (filtroTexto.trim()) {
        const termo = filtroTexto.toLowerCase();
        const coincideUnidade = item.unidade_bloco?.toLowerCase().includes(termo);
        const coincideMensagem = item.mensagem?.toLowerCase().includes(termo);
        const coincideRemetente = item.remetente_nome?.toLowerCase().includes(termo);
        const coincideTipo = item.tipo?.toLowerCase().includes(termo);
        return coincideUnidade || coincideMensagem || coincideRemetente || coincideTipo;
      }

      return true;
    });
  }, [lembretes, filtroStatus, filtroTipo, filtroTexto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Ícone com a cor ativa de alerta */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                statusGeral.corAlerta === 'vermelho'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : statusGeral.corAlerta === 'laranja'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : statusGeral.corAlerta === 'azul'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {statusGeral.corAlerta !== 'neutro' ? (
                <BellRing className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lembretes & Recados
                </h2>

                {/* Badges de Status do Alerta */}
                {statusGeral.ativosAdm > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3" /> {statusGeral.ativosAdm} do ADM (Pisca Vermelho)
                  </span>
                )}

                {statusGeral.pendentesNaoLidos > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 animate-pulse flex items-center gap-1 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
                    {statusGeral.pendentesNaoLidos} não lido{statusGeral.pendentesNaoLidos > 1 ? 's' : ''} (Pisca Laranja)
                  </span>
                )}

                {statusGeral.pendentesCientes > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    {statusGeral.pendentesCientes} ciente{statusGeral.pendentesCientes > 1 ? 's' : ''} (Pisca Azul até Finalizar)
                  </span>
                )}

                {statusGeral.totalAtivos === 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                    Todos finalizados
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 min-w-0">
                <span className="truncate font-medium text-slate-300 max-w-[160px] sm:max-w-xs">
                  {condominioNome || 'Condomínio'}
                </span>
                <span className="text-slate-600 shrink-0">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400 text-[11px] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Tempo Real
                </span>
                {ehNivel0 && (
                  <span className="text-[10px] font-black bg-red-950/80 text-red-300 border border-red-700/60 px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" /> Nível 0 (ADM)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle de som */}
            <button
              onClick={toggleSom}
              title={somAtivo ? 'Silenciar alerta sonoro' : 'Ativar alerta sonoro'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                somAtivo
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Botão Novo Recado */}
            <button
              onClick={() => setExibirFormNovo(!exibirFormNovo)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Recado</span>
            </button>

            {/* Fechar */}
            <button
              onClick={onFechar}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK TEMPORÁRIO DE AÇÕES */}
        {mensagemFeedback && (
          <div
            className={`p-2.5 sm:px-5 text-xs font-bold flex items-center justify-between border-b ${
              mensagemFeedback.tipo === 'sucesso'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                : 'bg-red-950/70 text-red-300 border-red-800/60'
            }`}
          >
            <span>{mensagemFeedback.texto}</span>
            <button onClick={() => setMensagemFeedback(null)} className="text-white/60 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ALERTA SE A TABELA AINDA NÃO EXISTE NO SUPABASE */}
        {!tabelaExiste && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                A tabela <strong>lembretes_portaria</strong> ainda não foi executada no banco. O sistema está operando com cache local.
              </span>
            </div>
            <button
              onClick={handleCopiarSql}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 px-3 py-1.5 rounded-lg font-bold transition shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {sqlCopiado ? 'SQL Copiado!' : 'Copiar Script SQL'}
            </button>
          </div>
        )}

        {/* FORMULÁRIO DE NOVO RECADO (COLAPSÁVEL) */}
        {exibirFormNovo && (
          <form
            onSubmit={handleSalvarNovo}
            className="p-4 bg-slate-800/85 border-b border-slate-700/80 space-y-3 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Lançar Novo Aviso / Lembrete
              </span>
              <button
                type="button"
                onClick={() => setExibirFormNovo(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Unidade / Bloco *
                </label>
                <input
                  type="text"
                  list="sugestoes_unidades"
                  required
                  placeholder={novoRemetenteTipo === 'adm' ? "Geral / Todos ou Apto..." : "Ex: Apto 102 - Bloco B"}
                  value={novoUnidadeBloco}
                  onChange={(e) => setNovoUnidadeBloco(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <datalist id="sugestoes_unidades">
                  <option value="Geral / Guarita" />
                  <option value="Geral / Todos os Moradores" />
                  {listaUnidadesSugeridas.map((u, i) => (
                    <option key={i} value={u} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Remetente *
                </label>
                <div className={`grid ${ehNivel0 ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
                  <button
                    type="button"
                    onClick={() => {
                      setNovoRemetenteTipo('morador');
                      if (novoTipo === 'Lembrete do ADM') setNovoTipo('Aviso Geral');
                    }}
                    className={`p-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition ${
                      novoRemetenteTipo === 'morador'
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Morador
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNovoRemetenteTipo('portaria');
                      if (novoTipo === 'Lembrete do ADM') setNovoTipo('Aviso Geral');
                    }}
                    className={`p-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition ${
                      novoRemetenteTipo === 'portaria'
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" /> Portaria
                  </button>

                  {/* OPÇÃO DE LEMBRETE DO ADM NO LOGIN NÍVEL 0 */}
                  {ehNivel0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNovoRemetenteTipo('adm');
                        setNovoTipo('Lembrete do ADM');
                        if (!novoUnidadeBloco) setNovoUnidadeBloco('Geral / Portaria');
                      }}
                      className={`p-2 rounded-lg text-[11px] font-black border flex items-center justify-center gap-1 transition cursor-pointer ${
                        novoRemetenteTipo === 'adm'
                          ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-950/40 ring-1 ring-red-400'
                          : 'bg-red-950/40 text-red-300 hover:bg-red-900/40 border-red-700/60'
                      }`}
                      title="Lançar Lembrete Oficial da Administração (Nível 0) que pisca em vermelho"
                    >
                      <Crown className={`w-3.5 h-3.5 ${novoRemetenteTipo === 'adm' ? 'text-amber-300' : 'text-red-400'}`} />
                      <span>ADM (Nível 0)</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Classificação / Tipo *
                </label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {novoRemetenteTipo === 'adm' && (
                    <option value="Lembrete do ADM">👑 Lembrete do ADM (Pisca Vermelho)</option>
                  )}
                  <option value="Palavra-chave">🔑 Palavra-chave</option>
                  <option value="Instrução">📋 Instrução</option>
                  <option value="Aviso Geral">📢 Aviso Geral</option>
                  <option value="Correspondência Urgente">📦 Correspondência Urgente</option>
                  <option value="Autorização">🚪 Autorização de Acesso</option>
                </select>
              </div>
            </div>

            {/* SE FOR LEMBRETE DO ADM: CONFIGURAÇÃO DE DATA LIMITE E REGRAS */}
            {novoRemetenteTipo === 'adm' && (
              <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Configuração de Lembrete Oficial da Administração (Nível 0)</span>
                </div>
                <p className="text-[11px] text-red-200/80">
                  Os avisos de ADM <strong>piscam em vermelho</strong> no sino da portaria e <strong>só poderão ser baixados pelo ADM</strong> ou na data limite configurada abaixo.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-red-200 uppercase mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-red-400" /> Data e Hora Limite (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={novoDataLimite}
                      onChange={(e) => setNovoDataLimite(e.target.value)}
                      className="w-full bg-slate-900 border border-red-500/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                  <div className="text-[10px] text-slate-300 flex items-center pt-4">
                    <span>
                      {novoDataLimite
                        ? `O lembrete será baixado automaticamente após ${new Date(novoDataLimite).toLocaleString('pt-BR')}.`
                        : 'Sem data limite: o lembrete permanecerá ativo até que o Administrador baixe manualmente.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Nome do Remetente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder={novoRemetenteTipo === 'adm' ? "Ex: Administrador Geral" : "Ex: Carlos (Morador) ou Caetano"}
                  value={novoRemetenteNome}
                  onChange={(e) => setNovoRemetenteNome(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Mensagem / Texto do Aviso *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ex: Instrução de acesso ou palavra-chave para liberação..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={salvandoNovo}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    {salvandoNovo ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="p-3 sm:px-5 bg-slate-900 border-b border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por unidade, remetente, mensagem ou ADM..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              {filtroTexto && (
                <button
                  onClick={() => setFiltroTexto('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Ação rápida de marcar todos como cientes */}
            {statusGeral.pendentesNaoLidos > 0 && (
              <button
                onClick={handleMarcarTodosLidos}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
                title="Marca todos os pendentes como cientes (passam a piscar em azul até finalizar)"
              >
                <CheckCheck className="w-4 h-4 text-blue-400" />
                <span>Marcar Todos como Ciente</span>
              </button>
            )}
          </div>

          {/* Chips de Filtro */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setFiltroStatus('ativos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                filtroStatus === 'ativos'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              Ativos ({statusGeral.totalAtivos})
            </button>

            {statusGeral.ativosAdm > 0 && (
              <button
                onClick={() => setFiltroStatus('adm')}
                className={`px-3 py-1.5 rounded-lg font-black transition shrink-0 cursor-pointer flex items-center gap-1 ${
                  filtroStatus === 'adm'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-950/70 text-red-300 border border-red-800/60 hover:bg-red-900/50'
                }`}
              >
                <Crown className="w-3 h-3 text-red-300" />
                Lembretes ADM ({statusGeral.ativosAdm})
              </button>
            )}

            <button
              onClick={() => setFiltroStatus('nao_lidos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                filtroStatus === 'nao_lidos'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Não Lidos ({statusGeral.pendentesNaoLidos})
            </button>

            <button
              onClick={() => setFiltroStatus('cientes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                filtroStatus === 'cientes'
                  ? 'bg-blue-600 text-white font-black'
                  : 'bg-slate-800 text-blue-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Cientes em Aberto ({statusGeral.pendentesCientes})
            </button>

            <button
              onClick={() => setFiltroStatus('finalizados')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'finalizados'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Finalizados ({statusGeral.finalizados})
            </button>

            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'todos'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos ({lembretes.length})
            </button>
          </div>
        </div>

        {/* LISTA DE LEMBRETES E MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {carregando ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 mx-auto mb-2 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold">Carregando avisos e lembretes...</p>
            </div>
          ) : lembretesFiltrados.length === 0 ? (
            <div className="py-12 text-center bg-slate-800/40 border border-slate-800 rounded-2xl p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">Nenhum recado ou aviso encontrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filtroStatus === 'ativos'
                  ? 'Todos os lembretes já foram atendidos e finalizados pela portaria!'
                  : 'Não há mensagens cadastradas para os critérios de busca selecionados.'}
              </p>
              <button
                onClick={() => setExibirFormNovo(true)}
                className="mt-4 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Novo Recado
              </button>
            </div>
          ) : (
            lembretesFiltrados.map((item) => {
              const naoLido = !item.lido && !item.finalizado;
              const cienteEmAberto = item.lido && !item.finalizado;
              const ehAdm = Boolean(item.eh_adm);

              // Cores do Card
              const estiloCard = (() => {
                if (item.finalizado) {
                  return 'bg-slate-800/30 border-slate-800/80 opacity-70 hover:opacity-100';
                }
                if (ehAdm) {
                  return 'bg-red-950/20 border-red-500/70 shadow-lg shadow-red-950/30 ring-1 ring-red-500/30';
                }
                if (naoLido) {
                  return 'bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/20';
                }
                if (cienteEmAberto) {
                  return 'bg-slate-800/90 border-blue-500/60 shadow-lg shadow-blue-950/20 ring-1 ring-blue-500/20';
                }
                return 'bg-slate-800/50 border-slate-700';
              })();

              // Tag de Tipo
              const tipoBadge = (() => {
                if (ehAdm) return 'bg-red-900/60 text-red-300 border-red-500/50';
                switch (item.tipo) {
                  case 'Palavra-chave':
                    return 'bg-purple-900/60 text-purple-300 border-purple-500/40';
                  case 'Instrução':
                    return 'bg-amber-900/60 text-amber-300 border-amber-500/40';
                  case 'Correspondência Urgente':
                    return 'bg-red-900/60 text-red-300 border-red-500/40';
                  case 'Autorização':
                    return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
                  default:
                    return 'bg-blue-900/60 text-blue-300 border-blue-500/40';
                }
              })();

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-200 p-4 ${estiloCard}`}
                >
                  {/* LINHA SUPERIOR DO CARD */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {/* Unidade / Bloco */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-extrabold text-xs sm:text-sm">
                        <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{item.unidade_bloco}</span>
                      </span>

                      {/* Tag Especial de ADM se aplicável */}
                      {ehAdm && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-black bg-red-600/30 text-red-300 border-red-500">
                          <Crown className="w-3 h-3 text-red-400" /> AVISO DO ADM (NÍVEL 0)
                        </span>
                      )}

                      {/* Tag do Tipo */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${tipoBadge}`}
                      >
                        {item.tipo === 'Palavra-chave' && <Key className="w-3 h-3" />}
                        {item.tipo === 'Instrução' && <FileText className="w-3 h-3" />}
                        {item.tipo}
                      </span>

                      {/* Remetente */}
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                        {ehAdm ? (
                          <>
                            <Crown className="w-3.5 h-3.5 text-red-400" />
                            <span>ADM: <strong className="text-red-200">{item.remetente_nome || 'Administração'}</strong></span>
                          </>
                        ) : item.remetente_tipo === 'portaria' ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Portaria: <strong>{item.remetente_nome || 'Operador'}</strong></span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>Morador: <strong>{item.remetente_nome || 'Morador'}</strong></span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Data/Hora de Criação e Data Limite */}
                    <div className="flex flex-col items-end text-[11px] text-slate-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatarData(item.created_at)}
                      </span>
                      {item.data_limite && (
                        <span className="text-[10px] text-red-400 font-bold flex items-center gap-0.5 mt-0.5">
                          <Calendar className="w-3 h-3" /> Limite: {formatarData(item.data_limite)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CORPO DA MENSAGEM */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800/90 text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                    {item.mensagem}
                  </div>

                  {/* RODAPÉ DO CARD E AÇÕES */}
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                    <div>
                      {item.finalizado ? (
                        <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            Finalizado / Baixado por <strong>{item.finalizado_por_nome || 'Portaria'}</strong>
                            {item.finalizado_em && ` em ${formatarData(item.finalizado_em)}`}
                          </span>
                        </div>
                      ) : naoLido ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                          Aguardando ciência da portaria (Alerta Laranja)
                        </span>
                      ) : cienteEmAberto ? (
                        <div className="text-[11px] text-blue-300 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                          <span>
                            Ciente por <strong>{item.lido_por_nome || 'Portaria'}</strong> • Em andamento (Pisca Azul até finalizar)
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* BOTÃO 1: MARCAR COMO CIENTE (quando ainda não lido) */}
                      {!item.finalizado && !item.lido && (
                        <button
                          onClick={() => handleMarcarLido(item.id)}
                          className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                          title="Dar ciência deste lembrete (passará a piscar em azul)"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Marcar como ciente</span>
                        </button>
                      )}

                      {/* BOTÃO 2: FINALIZAR / BAIXAR (Disponível até ser finalizado) */}
                      {!item.finalizado && (
                        <>
                          {ehAdm && !ehNivel0 ? (
                            // Se for aviso do ADM e o operador logado NÃO for Nível 0:
                            // Não pode baixar (só o ADM pode baixar ou baixa por data limite)
                            <div className="relative group">
                              <button
                                disabled
                                className="bg-slate-800 text-slate-500 border border-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-not-allowed opacity-80"
                                title="Apenas o Administrador (Nível 0) pode baixar este lembrete!"
                              >
                                <Lock className="w-3.5 h-3.5 text-red-400" />
                                <span>Apenas ADM pode baixar</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleFinalizar(item.id)}
                              className={`active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer ${
                                ehAdm
                                  ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                              }`}
                              title={
                                ehAdm
                                  ? 'Baixar e finalizar lembrete oficial como Administrador (Nível 0)'
                                  : 'Finalizar e baixar recado (para o alerta no sino)'
                              }
                            >
                              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                              <span>{ehAdm ? 'Finalizar / Baixar (ADM)' : 'Finalizar'}</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* BOTÃO 3: EXCLUIR DO HISTÓRICO (após finalizado) */}
                      {item.finalizado && (
                        <button
                          onClick={() => handleExcluir(item.id)}
                          title="Remover do histórico"
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-3 sm:px-5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {lembretes.length} lembrete(s) • {statusGeral.totalAtivos} ativo(s)
            </span>
            {statusGeral.ativosAdm > 0 && (
              <span className="text-red-400 font-bold">• {statusGeral.ativosAdm} do ADM</span>
            )}
          </div>
          <button
            onClick={onFechar}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl font-bold transition cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
