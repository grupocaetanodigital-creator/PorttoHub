import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  buscarHistoricoAbsoluto, 
  consultarRegistrosTabelaPeriodo, 
  baixarBackupSegurancaPeriodo, 
  executarLimpezaTabelaPorPeriodo, 
  TABELAS_LIMPAGEM, 
  SQL_CRIACAO_HISTORICO_ABSOLUTO,
  RegistroAuditoria 
} from '../services/auditoriaService';
import { verificarPermissao } from '../services/permissoesService';
import { 
  History, 
  Activity, 
  Trash2, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  Copy, 
  Check, 
  Clock, 
  User, 
  FileSpreadsheet, 
  FileText, 
  Database, 
  Eye, 
  Lock, 
  ShieldCheck, 
  X,
  ChevronDown,
  Sparkles,
  Layers
} from 'lucide-react';

interface HistoricoAbsolutoProps {
  operadorLogado: any;
  condominioAtivo: any;
  listaCondominios?: any[];
}

export default function HistoricoAbsoluto({ operadorLogado, condominioAtivo, listaCondominios = [] }: HistoricoAbsolutoProps) {
  // PRIVACIDADE ESTRITA: Apenas o Super Administrador Geral da Plataforma (sem condomínio fixo vinculado) tem visão multi-condomínio
  // Qualquer operador, síndico ou administrador vinculado a um condomínio específico FICA RIGIDAMENTE BLOQUEADO no seu condomínio
  const eAdminGlobal = Boolean(
    operadorLogado?.eSuperAdminGlobal ||
    ((operadorLogado?.login === 'admin' || operadorLogado?.perfil === 'admin_geral') && 
     (!operadorLogado?.condominio_id || operadorLogado?.condominio_id === 'global'))
  );

  // Administrador ou Síndico dentro do seu escopo
  const eAdmin = operadorLogado?.perfil === 'admin' || operadorLogado?.nivel_acesso === 0 || operadorLogado?.perfil === 'master' || operadorLogado?.nivel_acesso === 1;

  // Condomínio obrigatório para operadores, porteiros, supervisores e síndicos
  const idCondominioRestrito = operadorLogado?.condominio_id || condominioAtivo?.id || '';

  // Permissões granulares do módulo Histórico Absoluto
  const podeVisualizar = eAdmin || 
                         verificarPermissao(operadorLogado, 'historico_absoluto', 'visualizar') || 
                         verificarPermissao(operadorLogado, 'historico_absoluto', 'ver_feed');

  const podeExcluirDados = (eAdminGlobal || eAdmin) && (
                           verificarPermissao(operadorLogado, 'historico_absoluto', 'limpar_dados') || 
                           verificarPermissao(operadorLogado, 'historico_absoluto', 'excluir'));

  const [abaAtiva, setAbaAtiva] = useState<'feed' | 'limpeza' | 'sql' | 'metricas'>('feed');
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [fonteDados, setFonteDados] = useState<'supabase' | 'cache_local'>('supabase');

  // Filtros do Feed - se não for admin global, trava no condomínio do operador
  const [filtroCondominio, setFiltroCondominio] = useState<string>(
    eAdminGlobal ? 'todos' : idCondominioRestrito
  );
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [filtroAcao, setFiltroAcao] = useState('todas');
  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [detalheSelecionado, setDetalheSelecionado] = useState<RegistroAuditoria | null>(null);

  // Estados da Limpeza por Período (Apenas ADM)
  const hojeIso = new Date().toISOString().slice(0, 10);
  const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [tabelaSelecionada, setTabelaSelecionada] = useState('encomendas_itens');
  const [escopoCondominioLimpeza, setEscopoCondominioLimpeza] = useState<string>(
    eAdminGlobal ? 'todos' : idCondominioRestrito
  );
  const [detalhesPorTabelaLimpeza, setDetalhesPorTabelaLimpeza] = useState<{ id: string; nomeAmigavel: string; modulo: string; total: number; campoData: string }[]>([]);
  const [detalheRemocaoConsolidada, setDetalheRemocaoConsolidada] = useState<Record<string, number> | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [limpezaDataInicio, setLimpezaDataInicio] = useState(trintaDiasAtras);
  const [limpezaDataFim, setLimpezaDataFim] = useState(hojeIso);
  const [limpezaMotivo, setLimpezaMotivo] = useState('Expurgo periódico e limpeza de histórico de portaria');
  const [consultandoContagem, setConsultandoContagem] = useState(false);
  const [contagemPeriodo, setContagemPeriodo] = useState<number | null>(null);
  const [campoDataUtilizado, setCampoDataUtilizado] = useState('');
  const [amostrasExclusao, setAmostrasExclusao] = useState<any[]>([]);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [baixandoBackup, setBaixandoBackup] = useState(false);
  const [executandoLimpeza, setExecutandoLimpeza] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [resultadoLimpeza, setResultadoLimpeza] = useState<{ sucesso: boolean; removidos: number; msg: string } | null>(null);

  const aplicarAtalhoPeriodoLimpeza = (tipo: '30dias' | '60dias' | '90dias' | 'ano' | '180dias') => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    setLimpezaDataFim(hojeStr);

    if (tipo === '30dias') {
      const d = new Date(Date.now() - 30 * 86400000);
      setLimpezaDataInicio(d.toISOString().slice(0, 10));
    } else if (tipo === '60dias') {
      const d = new Date(Date.now() - 60 * 86400000);
      setLimpezaDataInicio(d.toISOString().slice(0, 10));
    } else if (tipo === '90dias') {
      const d = new Date(Date.now() - 90 * 86400000);
      setLimpezaDataInicio(d.toISOString().slice(0, 10));
    } else if (tipo === 'ano') {
      setLimpezaDataInicio(`${hoje.getFullYear()}-01-01`);
    } else if (tipo === '180dias') {
      const d = new Date(Date.now() - 180 * 86400000);
      setLimpezaDataInicio(d.toISOString().slice(0, 10));
    }
    setContagemPeriodo(null);
    setAmostrasExclusao([]);
    setErroConsulta(null);
    setResultadoLimpeza(null);
  };

  // Estado da cópia SQL
  const [copiadoSql, setCopiadoSql] = useState(false);

  // Carrega feed de auditoria
  const carregarFeed = async () => {
    setLoading(true);
    try {
      // Blindagem estrita de privacidade multi-condomínio:
      // Operador de guarita, supervisor ou síndico NUNCA acessa registros de outros condomínios
      const condoIdBusca = !eAdminGlobal
        ? (idCondominioRestrito || undefined)
        : (filtroCondominio === 'todos' ? undefined : (filtroCondominio || undefined));

      const res = await buscarHistoricoAbsoluto({
        condominio_id: condoIdBusca,
        modulo: filtroModulo,
        acao: filtroAcao,
        dataInicio,
        dataFim,
        termoBusca,
        limite: 250
      });
      setRegistros(res.registros);
      setFonteDados(res.fonte);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFeed();

    // Listener para novos eventos gerados na aplicação em tempo real
    const handleNovoHistorico = (e: any) => {
      const novo = e.detail;
      if (novo) {
        setRegistros(prev => [novo, ...prev.filter(r => r.id !== novo.id)]);
      }
    };

    window.addEventListener('infport_historico_novo', handleNovoHistorico);

    // Canal Realtime do Supabase (atualiza automaticamente ao receber novos registros)
    let canal: any = null;
    try {
      canal = supabase
        .channel(`historico_absoluto_realtime_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_absoluto' }, () => {
          carregarFeed();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime Supabase não disponível:', e);
    }

    return () => {
      window.removeEventListener('infport_historico_novo', handleNovoHistorico);
      if (canal) supabase.removeChannel(canal);
    };
  }, [condominioAtivo?.id, filtroCondominio, filtroModulo, filtroAcao, dataInicio, dataFim]);

  // Consulta quantidade de registros na tabela antes de limpar
  const handleConsultarPeriodo = async () => {
    if (!limpezaDataInicio || !limpezaDataFim) {
      setErroConsulta('Informe a Data Inicial e a Data Final para consulta.');
      return;
    }
    setErroConsulta(null);
    setConsultandoContagem(true);
    setResultadoLimpeza(null);
    setDetalhesPorTabelaLimpeza([]);
    try {
      const targetCondo = escopoCondominioLimpeza !== 'todos' ? escopoCondominioLimpeza : null;
      const res = await consultarRegistrosTabelaPeriodo({
        tabela: tabelaSelecionada,
        dataInicio: limpezaDataInicio,
        dataFim: limpezaDataFim,
        condominio_id: targetCondo
      });
      setContagemPeriodo(res.total);
      setCampoDataUtilizado(res.campoDataUsado);
      setAmostrasExclusao(res.amostras || []);
      setDetalhesPorTabelaLimpeza(res.detalhesPorTabela || []);
      if (res.erro && res.total === 0) {
        setErroConsulta(`Aviso: ${res.erro}`);
      }
    } finally {
      setConsultandoContagem(false);
    }
  };

  // Faz download do backup em JSON antes da exclusão
  const handleBaixarBackup = async () => {
    setBaixandoBackup(true);
    try {
      const targetCondo = escopoCondominioLimpeza !== 'todos' ? escopoCondominioLimpeza : null;
      const dados = await baixarBackupSegurancaPeriodo({
        tabela: tabelaSelecionada,
        dataInicio: limpezaDataInicio,
        dataFim: limpezaDataFim,
        condominio_id: targetCondo
      });

      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_seguranca_${tabelaSelecionada}_${limpezaDataInicio}_a_${limpezaDataFim}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBaixandoBackup(false);
    }
  };

  // Executa a exclusão irreversível controlada
  const handleExecutarLimpeza = async () => {
    if (textoConfirmacao.trim().toUpperCase() !== 'CONFIRMAR EXCLUSAO') {
      setErroConfirmacao('Digite exatamente "CONFIRMAR EXCLUSAO" no campo abaixo para prosseguir com segurança.');
      return;
    }
    setErroConfirmacao(null);
    setExecutandoLimpeza(true);
    setResultadoLimpeza(null);

    try {
      const targetCondo = escopoCondominioLimpeza !== 'todos' ? escopoCondominioLimpeza : null;
      const res = await executarLimpezaTabelaPorPeriodo({
        tabela: tabelaSelecionada,
        dataInicio: limpezaDataInicio,
        dataFim: limpezaDataFim,
        condominio_id: targetCondo,
        operador: {
          id: operadorLogado?.id,
          nome: operadorLogado?.nome || operadorLogado?.login || 'Administrador',
          login: operadorLogado?.login,
          perfil: operadorLogado?.perfil
        },
        motivo: limpezaMotivo
      });

      if (res.sucesso) {
        setResultadoLimpeza({
          sucesso: true,
          removidos: res.registrosRemovidos,
          msg: `Limpeza concluída com sucesso! ${res.registrosRemovidos} registro(s) foram apagados e auditados no histórico.`
        });
        setDetalheRemocaoConsolidada(res.detalheRemocao || null);
        setContagemPeriodo(null);
        setTextoConfirmacao('');
        // Recarrega o feed para mostrar o log da limpeza gerado
        carregarFeed();
      } else {
        setResultadoLimpeza({
          sucesso: false,
          removidos: 0,
          msg: `Falha na limpeza: ${res.erro}`
        });
      }
    } finally {
      setExecutandoLimpeza(false);
    }
  };

  const copiarSql = () => {
    navigator.clipboard.writeText(SQL_CRIACAO_HISTORICO_ABSOLUTO);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  // Exportar histórico da tela para CSV
  const exportarCsv = () => {
    if (registros.length === 0) return;
    const cabecalho = ['Data e Hora', 'Módulo', 'Ação', 'Operador', 'Descrição'];
    const linhas = registros.map(r => [
      new Date(r.criado_em).toLocaleString('pt-BR'),
      r.modulo,
      r.acao,
      r.operador_nome,
      `"${(r.descricao || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [cabecalho.join(','), ...linhas.map(l => l.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_absoluto_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Estatísticas rápidas
  const metricas = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const hojeRegistros = registros.filter(r => r.criado_em.startsWith(hojeStr));
    const exclusoes = registros.filter(r => r.acao === 'EXCLUIR' || r.acao === 'LIMPEZA_PERIODO');
    const modulosDistintos = Array.from(new Set(registros.map(r => r.modulo)));
    return {
      total: registros.length,
      hoje: hojeRegistros.length,
      exclusoes: exclusoes.length,
      totalModulos: modulosDistintos.length
    };
  }, [registros]);

  if (!podeVisualizar) {
    return (
      <div className="p-8 sm:p-12 bg-white rounded-3xl border border-red-200 shadow-sm text-center space-y-3 my-6 max-w-2xl mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-black text-slate-900">Acesso Restrito ao Histórico Absoluto</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Seu perfil de usuário não possui permissão para visualizar o Histórico Absoluto & Auditoria. Solicite liberação no Gerenciamento de Acessos ao Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner de Identificação */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40 shadow-inner">
            <History className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Histórico Absoluto
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Tempo Real
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Rastreamento contínuo e imutável de toda e qualquer atividade na portaria: <strong className="text-white">Quem, Quando e O Quê</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={carregarFeed}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700 active:scale-95 cursor-pointer"
            title="Atualizar feed agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={exportarCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
            title="Exportar registros filtrados para planilha CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('feed')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'feed'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Feed em Tempo Real</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900/60 text-indigo-200">
            {registros.length}
          </span>
        </button>

        {podeExcluirDados && (
          <button
            onClick={() => setAbaAtiva('limpeza')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              abaAtiva === 'limpeza'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/80 text-rose-300 hover:bg-rose-950 hover:text-white border border-rose-900/40'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Limpar Dados por Período</span>
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-900/80 text-rose-200 uppercase">
              {eAdmin ? 'Apenas ADM' : 'Autorizado'}
            </span>
          </button>
        )}

        <button
          onClick={() => setAbaAtiva('metricas')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
            abaAtiva === 'metricas'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Métricas & Indicadores</span>
        </button>
      </div>

      {/* ABA 1: FEED EM TEMPO REAL */}
      {abaAtiva === 'feed' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Busca por texto */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Buscar no Histórico
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Descrição, operador, código..."
                    className="w-full bg-slate-950 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Condomínio */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Condomínio
                </label>
                {eAdminGlobal ? (
                  <select
                    value={filtroCondominio}
                    onChange={(e) => setFiltroCondominio(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="todos">🌐 Todos os Condomínios (Visão Global)</option>
                    {listaCondominios.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-slate-950 text-emerald-400 text-xs p-2.5 rounded-xl border border-slate-800 font-bold flex items-center justify-between">
                    <span className="truncate">🏢 {condominioAtivo?.nome || 'Condomínio Atual'}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Privado</span>
                  </div>
                )}
              </div>

              {/* Módulo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Módulo do Sistema
                </label>
                <select
                  value={filtroModulo}
                  onChange={(e) => setFiltroModulo(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">🏢 Todos os Módulos</option>
                  <option value="Encomendas">📦 Encomendas</option>
                  <option value="Chaves">🔑 Quadro de Chaves</option>
                  <option value="Rondas">🛡️ Rondas Patrimoniais</option>
                  <option value="Custódia">🔐 Custódia de Itens</option>
                  <option value="Materiais">📻 Materiais do Posto</option>
                  <option value="Ocorrências">📖 Livro de Ocorrências</option>
                  <option value="Passagem de Posto">🔄 Passagem de Posto</option>
                  <option value="Prestadores">👷 Prestadores & Obras</option>
                  <option value="Manutenção">🔧 Manutenção Predial & Checklists</option>
                  <option value="Cadastros">👥 Moradores & Unidades</option>
                  <option value="Limpeza de Dados">🧹 Limpeza de Dados (ADM)</option>
                  <option value="Sistema">⚙️ Sistema & Login</option>
                </select>
              </div>

              {/* Ação */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Tipo de Ação
                </label>
                <select
                  value={filtroAcao}
                  onChange={(e) => setFiltroAcao(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="todas">⚡ Todas as Ações</option>
                  <option value="CRIAR">➕ CRIAR / NOVO</option>
                  <option value="EDITAR">✏️ EDITAR</option>
                  <option value="EXCLUIR">❌ EXCLUIR</option>
                  <option value="BAIXA">📬 BAIXA / ENTREGA</option>
                  <option value="RETIRADA">📤 RETIRADA DE CHAVE</option>
                  <option value="DEVOLUCAO">📥 DEVOLUÇÃO DE CHAVE</option>
                  <option value="MUTE_ALERTA">🔇 MUTE DE ALERTA</option>
                  <option value="LIMPEZA_PERIODO">🧹 LIMPEZA POR PERÍODO</option>
                  <option value="LOGIN">🔐 LOGIN / SESSÃO</option>
                </select>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    De
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Até
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {(filtroModulo !== 'todos' || filtroAcao !== 'todas' || termoBusca || dataInicio || dataFim) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span>Filtros ativos aplicados</span>
                <button
                  onClick={() => {
                    setFiltroModulo('todos');
                    setFiltroAcao('todas');
                    setTermoBusca('');
                    setDataInicio('');
                    setDataFim('');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>

          {/* Lista de Registros do Feed */}
          {registros.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <History className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Nenhum evento encontrado</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Não há registros com os filtros aplicados. As atividades executadas na portaria aparecerão automaticamente aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {registros.map((reg) => {
                const dataFormatada = new Date(reg.criado_em).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                const badgeAcao = (() => {
                  switch (reg.acao) {
                    case 'CRIAR':
                      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                    case 'EDITAR':
                      return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
                    case 'EXCLUIR':
                      return 'bg-red-500/20 text-red-400 border-red-500/40';
                    case 'LIMPEZA_PERIODO':
                      return 'bg-rose-600/30 text-rose-300 border-rose-500/50';
                    case 'BAIXA':
                    case 'ENTREGA':
                      return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
                    case 'MUTE_ALERTA':
                      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                    case 'RETIRADA':
                    case 'DEVOLUCAO':
                      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
                    default:
                      return 'bg-slate-700/50 text-slate-300 border-slate-600';
                  }
                })();

                return (
                  <div
                    key={reg.id}
                    className="bg-slate-900 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${badgeAcao}`}>
                          {reg.acao}
                        </span>

                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {reg.modulo}
                        </span>

                        {(() => {
                          const condoObj = reg.condominio_id ? listaCondominios.find(c => c.id === reg.condominio_id) : null;
                          return condoObj ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                              🏢 {condoObj.nome}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              🌐 Sistema / Geral
                            </span>
                          );
                        })()}

                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {dataFormatada}
                        </span>

                        <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {reg.operador_nome}
                          {reg.operador_login && <span className="text-slate-400 text-[11px]">({reg.operador_login})</span>}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed break-words">
                        {reg.descricao}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {reg.detalhes && Object.keys(reg.detalhes).length > 0 && (
                        <button
                          onClick={() => setDetalheSelecionado(reg)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Detalhes</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: EXPURGO & LIMPEZA POR PERÍODO (APENAS ADMINISTRADOR) */}
      {abaAtiva === 'limpeza' && eAdmin && (
        <div className="space-y-6">
          {/* Card Informativo com Regras de Segurança */}
          <div className="bg-rose-950/40 border-2 border-rose-500/50 p-5 sm:p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Limpeza e Expurgo Controlado por Período
                </h3>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  Esta funcionalidade permite ao <strong>Administrador</strong> limpar dados de qualquer tabela do sistema selecionando um intervalo de datas (exemplo: <em>limpar o histórico de lotes (RE) e fluxo de encomendas do dia 01/03/2026 até 03/06/2026</em>).
                </p>
                <p className="text-[11px] text-rose-300 font-semibold pt-1">
                  ⚠️ Toda exclusão gera automaticamente um log imutável no Histórico Absoluto registrando quem executou, qual tabela, qual período e quantos registros foram removidos.
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de Seleção e Período */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
            <div className="space-y-4">
              {/* 1. Escopo de Condomínio */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  1. Escopo de Condomínio para a Limpeza
                </label>
                {eAdminGlobal ? (
                  <select
                    value={escopoCondominioLimpeza}
                    onChange={(e) => {
                      setEscopoCondominioLimpeza(e.target.value);
                      setContagemPeriodo(null);
                      setResultadoLimpeza(null);
                    }}
                    className="w-full bg-slate-950 text-white font-bold text-sm p-3.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-rose-500"
                  >
                    <option value="todos">🌐 Todos os Condomínios (Base Geral do Sistema)</option>
                    {listaCondominios.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.nome} {c.id === condominioAtivo?.id ? ' (Condomínio Ativo)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-slate-950 text-emerald-400 font-bold text-sm p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span>🏢 {condominioAtivo?.nome || 'Condomínio Atual'}</span>
                    <span className="text-xs text-slate-500 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">Escopo Restrito ao Posto</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {escopoCondominioLimpeza === 'todos' 
                    ? 'Atenção: A consulta e a limpeza serão aplicadas em todos os condomínios cadastrados.' 
                    : 'A consulta e a limpeza serão restritas apenas ao condomínio selecionado acima.'}
                </p>
              </div>

              {/* 2. Seleção da Tabela */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  2. Selecione a Tabela / Módulo para Limpeza
                </label>
                <select
                  value={tabelaSelecionada}
                  onChange={(e) => {
                    setTabelaSelecionada(e.target.value);
                    setContagemPeriodo(null);
                    setResultadoLimpeza(null);
                  }}
                  className="w-full bg-slate-950 text-white font-bold text-sm p-3.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-rose-500"
                >
                  {TABELAS_LIMPAGEM.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nomeAmigavel} ({t.id})
                    </option>
                  ))}
                </select>

                {(() => {
                  const def = TABELAS_LIMPAGEM.find(t => t.id === tabelaSelecionada);
                  return def ? (
                    <p className="text-xs text-slate-400 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      ℹ️ <strong>{def.nomeAmigavel}</strong>: {def.descricao}
                      {def.avisoPerigo && (
                        <span className="block text-amber-400 font-bold mt-1">
                          ⚠️ Atenção: A exclusão desta tabela pode impactar relatórios históricos consolidados.
                        </span>
                      )}
                    </p>
                  ) : null;
                })()}
              </div>

              {/* 3. Seleção do Período com Atalhos Dinâmicos */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    3. Selecione o Intervalo de Datas para Expurgo
                  </label>

                  {/* Atalhos Rápidos */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => aplicarAtalhoPeriodoLimpeza('30dias')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      30 dias
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarAtalhoPeriodoLimpeza('60dias')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      60 dias
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarAtalhoPeriodoLimpeza('90dias')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      90 dias
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarAtalhoPeriodoLimpeza('ano')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      Ano 2026
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarAtalhoPeriodoLimpeza('180dias')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 transition cursor-pointer"
                    >
                      +180 dias
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Data Inicial do Período
                    </label>
                    <input
                      type="date"
                      value={limpezaDataInicio}
                      onChange={(e) => {
                        setLimpezaDataInicio(e.target.value);
                        setContagemPeriodo(null);
                        setAmostrasExclusao([]);
                      }}
                      className="w-full bg-slate-950 text-white text-sm font-bold p-3.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Data Final do Período
                    </label>
                    <input
                      type="date"
                      value={limpezaDataFim}
                      onChange={(e) => {
                        setLimpezaDataFim(e.target.value);
                        setContagemPeriodo(null);
                        setAmostrasExclusao([]);
                      }}
                      className="w-full bg-slate-950 text-white text-sm font-bold p-3.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mensagem de Erro de Consulta */}
              {erroConsulta && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{erroConsulta}</span>
                </div>
              )}

              {/* Motivo do Expurgo */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2">
                  Motivo ou Justificativa do Expurgo (Registrado na Auditoria)
                </label>
                <input
                  type="text"
                  value={limpezaMotivo}
                  onChange={(e) => setLimpezaMotivo(e.target.value)}
                  placeholder="Ex: Expurgo de rotina trimestral / limpeza de dados de teste"
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Botão de Consulta Prévia */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConsultarPeriodo}
                  disabled={consultandoContagem}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Search className={`w-4 h-4 ${consultandoContagem ? 'animate-spin text-rose-400' : ''}`} />
                  <span>{consultandoContagem ? 'Consultando Banco...' : 'Consultar Registros no Período Selecionado'}</span>
                </button>
              </div>

              {/* Resultado da Consulta Prévia */}
              {contagemPeriodo !== null && (
                <div className="bg-slate-950 border-2 border-indigo-500/50 p-5 rounded-2xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                        Resultado da Pré-Visualização
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-white">
                        {contagemPeriodo === 0 ? (
                          <span className="text-amber-400">Nenhum registro encontrado no período</span>
                        ) : (
                          <span className="text-rose-400">
                            {contagemPeriodo} registro(s) localizados para exclusão
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Período: <strong>{limpezaDataInicio}</strong> até <strong>{limpezaDataFim}</strong> • Campo de filtro: <code className="text-indigo-300 font-mono">{campoDataUtilizado}</code>
                      </p>
                    </div>

                    {contagemPeriodo > 0 && (
                      <button
                        type="button"
                        onClick={handleBaixarBackup}
                        disabled={baixandoBackup}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md active:scale-95 cursor-pointer"
                      >
                        <Download className={`w-3.5 h-3.5 ${baixandoBackup ? 'animate-bounce' : ''}`} />
                        <span>{baixandoBackup ? 'Baixando...' : 'Baixar Backup de Segurança (JSON)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Grade de Detalhamento por Tabela (Quando Todas as Tabelas estiver selecionado) */}
                  {detalhesPorTabelaLimpeza.length > 0 && (
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">
                        Detalhamento por Módulo / Tabela (Expurgo Consolidado):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {detalhesPorTabelaLimpeza.map((d) => (
                          <div 
                            key={d.id} 
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              d.total > 0 
                                ? 'bg-rose-950/30 border-rose-800/60 text-white' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                                {d.modulo}
                              </span>
                              <span className="font-bold text-xs truncate block">
                                {d.nomeAmigavel}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 ${
                              d.total > 0 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {d.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amostra dos Registros Localizados */}
                  {amostrasExclusao.length > 0 && (
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Amostra dos registros que serão excluídos (primeiros {amostrasExclusao.length}):
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {amostrasExclusao.map((am, idx) => (
                          <div key={idx} className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate flex-1">
                              {am.__tabela_origem && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-indigo-300 border border-slate-700 shrink-0">
                                  {am.__tabela_origem}
                                </span>
                              )}
                              <span className="truncate">
                                {am.descricao || am.titulo || am.nome || am.nome_completo || am.retirante_nome || am.codigo_re || am.codigo_barras || am.codigo_custodia || JSON.stringify(am).slice(0, 80)}
                              </span>
                            </div>
                            <span className="text-slate-500 text-[10px] shrink-0">
                              {am.created_at ? new Date(am.created_at).toLocaleString('pt-BR') : (am.data_hora ? new Date(am.data_hora).toLocaleString('pt-BR') : (am.data_hora_entrada ? new Date(am.data_hora_entrada).toLocaleString('pt-BR') : ''))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {contagemPeriodo > 0 && (
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      <div className="bg-rose-950/60 border border-rose-600/40 p-3.5 rounded-xl text-xs text-rose-200 space-y-1">
                        <strong className="block text-rose-300">Confirmação de Segurança Obrigatória</strong>
                        <p>
                          Esta ação excluirá permanentemente os <strong>{contagemPeriodo}</strong> registros do período.
                          Para prosseguir, digite com letras maiúsculas: <strong className="text-white bg-slate-900 px-2 py-0.5 rounded font-mono">CONFIRMAR EXCLUSAO</strong>
                        </p>
                      </div>

                      {erroConfirmacao && (
                        <div className="p-2.5 bg-red-900/60 border border-red-500 rounded-xl text-xs text-red-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{erroConfirmacao}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={textoConfirmacao}
                          onChange={(e) => {
                            setTextoConfirmacao(e.target.value);
                            setErroConfirmacao(null);
                          }}
                          placeholder="Digite: CONFIRMAR EXCLUSAO"
                          className="flex-1 bg-slate-900 text-white font-mono font-bold text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 uppercase"
                        />

                        <button
                          type="button"
                          onClick={handleExecutarLimpeza}
                          disabled={executandoLimpeza || textoConfirmacao.trim().toUpperCase() !== 'CONFIRMAR EXCLUSAO'}
                          className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs uppercase px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-xl active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 className={`w-4 h-4 ${executandoLimpeza ? 'animate-spin' : ''}`} />
                          <span>{executandoLimpeza ? 'Excluindo Registros...' : 'Executar Expurgo Agora'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem de Resultado da Limpeza */}
              {resultadoLimpeza && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-200 ${
                  resultadoLimpeza.sucesso
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                }`}>
                  {resultadoLimpeza.sucesso ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold text-sm">
                      {resultadoLimpeza.sucesso ? 'Sucesso!' : 'Falha na Operação'}
                    </h5>
                    <p className="text-xs mt-0.5 leading-relaxed">
                      {resultadoLimpeza.msg}
                    </p>
                    {detalheRemocaoConsolidada && Object.keys(detalheRemocaoConsolidada).length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-700/50 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                          Detalhamento de registros removidos por tabela:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(detalheRemocaoConsolidada).map(([tId, qtd]) => {
                            const defT = TABELAS_LIMPAGEM.find(t => t.id === tId);
                            return (
                              <span key={tId} className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-600/50 text-[11px] font-mono text-emerald-200">
                                {defT ? defT.nomeAmigavel : tId}: <strong>{qtd}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: MÉTRICAS & INDICADORES */}
      {abaAtiva === 'metricas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Eventos no Histórico</span>
              <h3 className="text-3xl font-black text-white">{metricas.total}</h3>
              <p className="text-[11px] text-slate-500">Total de ações rastreadas</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase">Atividades Hoje</span>
              <h3 className="text-3xl font-black text-emerald-400">{metricas.hoje}</h3>
              <p className="text-[11px] text-slate-500">Registradas no plantão atual</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
              <span className="text-xs font-bold text-rose-400 uppercase">Exclusões & Limpezas</span>
              <h3 className="text-3xl font-black text-rose-400">{metricas.exclusoes}</h3>
              <p className="text-[11px] text-slate-500">Ações críticas auditadas</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase">Módulos Ativos</span>
              <h3 className="text-3xl font-black text-indigo-400">{metricas.totalModulos}</h3>
              <p className="text-[11px] text-slate-500">Áreas com fluxo recente</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3">
            <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Garantia de Integridade e Não-Perda de Histórico
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              O módulo de Histórico Absoluto implementa dupla camada de redundância:
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li><strong>Nuvem Supabase:</strong> Tabela relacional indexada com políticas RLS para consulta rápida por período e operador.</li>
              <li><strong>Cache Local Instantâneo:</strong> Até 1.000 registros mais recentes são persistidos na memória do navegador para que, mesmo em caso de queda de internet de 3 horas, a portaria continue registrando e visualizando tudo.</li>
              <li><strong>Sincronização em Tempo Real:</strong> Novos eventos propagam instantaneamente para todos os computadores e celulares conectados.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Registro Selecionado */}
      {detalheSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Detalhes da Atividade
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {detalheSelecionado.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetalheSelecionado(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Módulo</span>
                  <span className="font-bold text-white">{detalheSelecionado.modulo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Ação</span>
                  <span className="font-bold text-white">{detalheSelecionado.acao}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Operador</span>
                  <span className="font-bold text-white">{detalheSelecionado.operador_nome}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Data & Hora</span>
                  <span className="font-mono text-slate-300">
                    {new Date(detalheSelecionado.criado_em).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Descrição Registrada</span>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-200">
                  {detalheSelecionado.descricao}
                </div>
              </div>

              {detalheSelecionado.detalhes && (
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Payload / Dados Técnicos (JSON)</span>
                  <pre className="bg-slate-950 text-indigo-300 font-mono text-[11px] p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-48">
                    {JSON.stringify(detalheSelecionado.detalhes, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetalheSelecionado(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
