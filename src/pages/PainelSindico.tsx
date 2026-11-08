import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { registrarAtividade } from '../services/auditoriaService';
import { 
  ShieldCheck, 
  Package, 
  Key, 
  QrCode, 
  HardHat, 
  BookOpen, 
  Repeat, 
  PackageCheck, 
  History, 
  Search, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Eye, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  FileSpreadsheet, 
  Filter, 
  Download,
  ChevronRight,
  Sparkles,
  Camera,
  MapPin,
  Wrench,
  ClipboardList,
  Plus,
  FileText,
  Check,
  MessageSquare,
  X
} from 'lucide-react';

interface PainelSindicoProps {
  usuarioLogado: any;
  condominioAtivo: any;
  listaCondominios?: any[];
  abaInicial?: string;
}

export default function PainelSindico({
  usuarioLogado,
  condominioAtivo,
  listaCondominios = [],
  abaInicial = 'resumo'
}: PainelSindicoProps) {
  const [abaAtiva, setAbaAtiva] = useState<string>(abaInicial);
  const [loading, setLoading] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'todos'>('hoje');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Identificador do condomínio selecionado
  const [condominioFiltro, setCondominioFiltro] = useState<string>(
    condominioAtivo?.id || (listaCondominios[0]?.id || '')
  );

  // Estados dos Dados para Consulta
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [rondas, setRondas] = useState<any[]>([]);
  const [chaves, setChaves] = useState<any[]>([]);
  const [prestadores, setPrestadores] = useState<any[]>([]);
  const [passagens, setPassagens] = useState<any[]>([]);
  const [custodia, setCustodia] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [manutencoes, setManutencoes] = useState<any[]>([]);

  // Modal de Detalhes / Foto em Alta Resolução
  const [itemVisualizando, setItemVisualizando] = useState<{ titulo: string; dados: any; tipo: string } | null>(null);

  // Modal e Formulário de Nova Ocorrência (Direto pelo Síndico)
  const [modalNovaOcorrencia, setModalNovaOcorrencia] = useState(false);
  const [formOcorrencia, setFormOcorrencia] = useState({
    titulo: '',
    descricao: '',
    tipo: 'Interna',
    prioridade: 'Média',
    unidade_bloco: '',
    foto_url: ''
  });

  // Modal e Formulário de Nova Manutenção (Direto pelo Síndico)
  const [modalNovaManutencao, setModalNovaManutencao] = useState(false);
  const [formManutencao, setFormManutencao] = useState({
    titulo: '',
    localizacao: '',
    categoria: 'Geral',
    prioridade: 'Média',
    descricao: '',
    foto_antes_url: ''
  });

  const [feedbackMensagem, setFeedbackMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Sincroniza condomínio se mudar na prop
  useEffect(() => {
    if (condominioAtivo?.id) {
      setCondominioFiltro(condominioAtivo.id);
    }
  }, [condominioAtivo?.id]);

  // Carrega todos os dados do condomínio para consulta
  const carregarDadosSindico = async () => {
    setLoading(true);
    const idCondo = usuarioLogado?.condominio_id || condominioAtivo?.id || condominioFiltro;

    try {
      // Projeções estritas de colunas para eliminar tráfego de Egress (sem fotos, base64 ou jsonb volumosos)
      // 1. Encomendas
      let qEnc = supabase.from('encomendas_itens').select('id, condominio_id, status, created_at, destinatario, bloco, unidade, data_recebimento, data_retirada').order('created_at', { ascending: false }).limit(60);
      if (idCondo) qEnc = qEnc.eq('condominio_id', idCondo);
      const { data: dataEnc } = await qEnc;
      setEncomendas(dataEnc || []);

      // 2. Ocorrências
      let qOcorr = supabase.from('ocorrencias').select('id, condominio_id, titulo, gravidade, status, created_at, data_hora').order('created_at', { ascending: false }).limit(50);
      if (idCondo) qOcorr = qOcorr.eq('condominio_id', idCondo);
      const { data: dataOcorr } = await qOcorr;
      setOcorrencias(dataOcorr || []);

      // 3. Rondas Execução
      let qRondas = supabase.from('rondas_execucao').select('id, condominio_id, hora_inicio, hora_fim, status, created_at').order('created_at', { ascending: false }).limit(50);
      if (idCondo) qRondas = qRondas.eq('condominio_id', idCondo);
      const { data: dataRondas } = await qRondas;
      setRondas(dataRondas || []);

      // 4. Chaves
      let qChaves = supabase.from('chaves').select('id, condominio_id, codigo_chave, nome_chave, status, localizacao').order('codigo_chave', { ascending: true }).limit(50);
      if (idCondo) qChaves = qChaves.eq('condominio_id', idCondo);
      const { data: dataChaves } = await qChaves;
      setChaves(dataChaves || []);

      // 5. Prestadores
      let qPrest = supabase.from('prestadores').select('id, condominio_id, nome_profissional, status_acesso, created_at, perfil_acesso, unidade, bloco').order('created_at', { ascending: false }).limit(50);
      if (idCondo) qPrest = qPrest.eq('condominio_id', idCondo);
      const { data: dataPrest } = await qPrest;
      setPrestadores(dataPrest || []);

      // 6. Passagens de Posto
      let qPass = supabase.from('passagens_posto').select('id, condominio_id, data_passagem, turno, status, created_at, operador_sainte_nome, operador_entrante_nome').order('created_at', { ascending: false }).limit(30);
      if (idCondo) qPass = qPass.eq('condominio_id', idCondo);
      const { data: dataPass } = await qPass;
      setPassagens(dataPass || []);

      // 7. Custódia
      let qCust = supabase.from('custodia').select('id, condominio_id, status, created_at, descricao, codigo_custodia, fluxo').order('created_at', { ascending: false }).limit(40);
      if (idCondo) qCust = qCust.eq('condominio_id', idCondo);
      const { data: dataCust } = await qCust;
      setCustodia(dataCust || []);

      // 8. Histórico Absoluto
      let qHist = supabase.from('historico_absoluto').select('id, condominio_id, modulo, acao, descricao, criado_em, operador_nome').order('criado_em', { ascending: false }).limit(50);
      if (idCondo) qHist = qHist.eq('condominio_id', idCondo);
      const { data: dataHist } = await qHist;
      setHistorico(dataHist || []);

      // 9. Materiais
      let qMat = supabase.from('materiais_posto').select('id, condominio_id, nome, quantidade, status, categoria').order('nome', { ascending: true }).limit(50);
      if (idCondo) qMat = qMat.eq('condominio_id', idCondo);
      const { data: dataMat } = await qMat;
      setMateriais(dataMat || []);

      // 10. Manutenções
      let qMan = supabase.from('chamados_manutencao').select('id, condominio_id, titulo, status, prioridade, created_at, setor').order('created_at', { ascending: false }).limit(40);
      if (idCondo) qMan = qMan.eq('condominio_id', idCondo);
      const { data: dataMan } = await qMan;
      setManutencoes(dataMan || []);

    } catch (err: any) {
      console.warn('Erro ao carregar dados do síndico:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosSindico();

    const handleSync = () => carregarDadosSindico();
    window.addEventListener('infport_sincronizar_dados_global', handleSync);

    // Canal Realtime do Síndico com NOME ESTÁTICO e escuta direcionada
    const idCondo = usuarioLogado?.condominio_id || condominioAtivo?.id || condominioFiltro || 'global';
    const canal = supabase
      .channel(`sindico_realtime_${idCondo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, () => {
        carregarDadosSindico();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados_manutencao' }, () => {
        carregarDadosSindico();
      })
      .subscribe();

    return () => {
      window.removeEventListener('infport_sincronizar_dados_global', handleSync);
      supabase.removeChannel(canal);
    };
  }, [condominioFiltro]);

  // Cálculos de Indicadores Executivos
  const metricas = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);

    const retidas = encomendas.filter(e => e.status !== 'entregue').length;
    const entreguesHoje = encomendas.filter(e => e.status === 'entregue' && e.data_hora_retirada?.startsWith(hojeStr)).length;
    
    const chavesRetiradas = chaves.filter(c => c.status === 'RETIRADA').length;
    const chavesDisponiveis = chaves.filter(c => c.status !== 'RETIRADA').length;

    const prestadoresAtivos = prestadores.filter(p => p.status_acesso === 'AUTORIZADO' || p.status_acesso === 'EM_ANDAMENTO').length;
    
    const rondasHoje = rondas.filter(r => r.created_at?.startsWith(hojeStr));
    const rondasConcluidas = rondasHoje.filter(r => r.status === 'FINALIZADA').length;

    const ocorrenciasHoje = ocorrencias.filter(o => o.created_at?.startsWith(hojeStr)).length;
    const ocorrenciasUrgentes = ocorrencias.filter(o => o.prioridade === 'Urgente' || o.prioridade === 'Alta').length;

    const custodiaAtiva = custodia.filter(c => c.status === 'GUARDADO').length;

    const materiaisAvaria = materiais.filter(m => m.estado !== 'Perfeito').length;

    const manutencoesAbertas = manutencoes.filter(m => m.status === 'Aberto' || m.status === 'Em Andamento').length;

    return {
      retidas,
      entreguesHoje,
      chavesRetiradas,
      chavesDisponiveis,
      prestadoresAtivos,
      rondasConcluidas,
      totalRondasHoje: rondasHoje.length,
      ocorrenciasHoje,
      ocorrenciasUrgentes,
      custodiaAtiva,
      materiaisAvaria,
      manutencoesAbertas
    };
  }, [encomendas, chaves, prestadores, rondas, ocorrencias, custodia, materiais, manutencoes]);

  // Registro de nova ocorrência direta pelo Síndico
  const salvarNovaOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOcorrencia.titulo.trim() || !formOcorrencia.descricao.trim()) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Preencha o título e a descrição da ocorrência.' });
      return;
    }
    const idCondo = usuarioLogado?.condominio_id || condominioAtivo?.id || condominioFiltro;
    if (!idCondo) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Nenhum condomínio ativo selecionado.' });
      return;
    }

    try {
      const payload = {
        condominio_id: idCondo,
        titulo: formOcorrencia.titulo.trim(),
        descricao: formOcorrencia.descricao.trim(),
        tipo: formOcorrencia.tipo,
        prioridade: formOcorrencia.prioridade,
        status: 'Pendente',
        foto_url: formOcorrencia.foto_url.trim() || null,
        operador_nome: `Síndico: ${usuarioLogado?.nome || usuarioLogado?.login || 'Administração'}`,
        unidade_bloco: formOcorrencia.unidade_bloco.trim() || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('ocorrencias').insert([payload]).select().single();
      if (error) throw error;

      await registrarAtividade({
        condominio_id: idCondo,
        modulo: 'Ocorrências',
        acao: 'NOVA_OCORRENCIA_SINDICO',
        descricao: `Síndico registrou ocorrência: "${payload.titulo}"`,
        operador_id: usuarioLogado?.id || 'sindico',
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Síndico'
      });

      setOcorrencias(prev => [data || payload, ...prev]);
      setModalNovaOcorrencia(false);
      setFormOcorrencia({ titulo: '', descricao: '', tipo: 'Interna', prioridade: 'Média', unidade_bloco: '', foto_url: '' });
      setFeedbackMensagem({ tipo: 'sucesso', texto: 'Ocorrência registrada com sucesso no livro oficial!' });
      setTimeout(() => setFeedbackMensagem(null), 4000);
    } catch (err: any) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Erro ao registrar ocorrência: ' + err.message });
    }
  };

  // Abertura de chamado de manutenção direto pelo Síndico
  const salvarNovaManutencao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formManutencao.titulo.trim() || !formManutencao.localizacao.trim()) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Preencha o título e a localização da manutenção.' });
      return;
    }
    const idCondo = usuarioLogado?.condominio_id || condominioAtivo?.id || condominioFiltro;
    if (!idCondo) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Nenhum condomínio ativo selecionado.' });
      return;
    }

    try {
      const payload = {
        condominio_id: idCondo,
        titulo: formManutencao.titulo.trim(),
        localizacao: formManutencao.localizacao.trim(),
        categoria: formManutencao.categoria,
        prioridade: formManutencao.prioridade,
        descricao: formManutencao.descricao.trim(),
        foto_antes_url: formManutencao.foto_antes_url.trim() || null,
        status: 'Aberto',
        operador_abertura: `Síndico: ${usuarioLogado?.nome || usuarioLogado?.login || 'Administração'}`,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('chamados_manutencao').insert([payload]).select().single();
      if (error) throw error;

      await registrarAtividade({
        condominio_id: idCondo,
        modulo: 'Manutenção',
        acao: 'NOVA_OS_SINDICO',
        descricao: `Síndico abriu OS: "${payload.titulo}" (${payload.localizacao})`,
        operador_id: usuarioLogado?.id || 'sindico',
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Síndico'
      });

      setManutencoes(prev => [data || payload, ...prev]);
      setModalNovaManutencao(false);
      setFormManutencao({ titulo: '', localizacao: '', categoria: 'Geral', prioridade: 'Média', descricao: '', foto_antes_url: '' });
      setFeedbackMensagem({ tipo: 'sucesso', texto: 'Chamado de manutenção OS aberto com sucesso!' });
      setTimeout(() => setFeedbackMensagem(null), 4000);
    } catch (err: any) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Erro ao abrir chamado: ' + err.message });
    }
  };

  // Exportar dados da aba atual para CSV
  const exportarRelatorioCsv = (nomeArquivo: string, dados: any[]) => {
    if (!dados || dados.length === 0) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Nenhum dado disponível para exportação.' });
      return;
    }

    const cabecalhos = Object.keys(dados[0]);
    const linhas = dados.map(item => 
      cabecalhos.map(campo => {
        let val = item[campo];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      }).join(';')
    );

    const conteudoCsv = [cabecalhos.join(';'), ...linhas].join('\n');
    const blob = new Blob(['\uFEFF' + conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const condoNomeAtual = listaCondominios.find(c => c.id === condominioFiltro)?.nome || condominioAtivo?.nome || 'Condomínio';

  return (
    <div className="space-y-5 animate-fade-in p-2 sm:p-4 pb-20">
      
      {/* BANNER OFICIAL DE AUDITORIA DO SÍNDICO */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  Portal de Auditoria do Síndico
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-emerald-300">
                <Building2 className="w-4 h-4 text-emerald-400" />
                {condoNomeAtual}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={carregarDadosSindico}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE INDICADORES EXECUTIVOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Encomendas Retidas */}
        <div 
          onClick={() => setAbaAtiva('encomendas')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'encomendas' 
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Encomendas</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black">{metricas.retidas}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Retidas na portaria ({metricas.entreguesHoje} entregues hoje)
          </div>
        </div>

        {/* Chaves Fora */}
        <div 
          onClick={() => setAbaAtiva('chaves')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'chaves' 
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Chaves em Uso</span>
            <Key className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black">{metricas.chavesRetiradas}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Fora do claviculário ({metricas.chavesDisponiveis} disponíveis)
          </div>
        </div>

        {/* Rondas Hoje */}
        <div 
          onClick={() => setAbaAtiva('rondas')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'rondas' 
              ? 'bg-slate-800 text-white border-slate-700 shadow-lg' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Rondas Hoje</span>
            <QrCode className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black">{metricas.rondasConcluidas}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Cumpridas ({metricas.totalRondasHoje} total executadas)
          </div>
        </div>

        {/* Prestadores no Condomínio */}
        <div 
          onClick={() => setAbaAtiva('prestadores')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'prestadores' 
              ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Prestadores</span>
            <HardHat className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black">{metricas.prestadoresAtivos}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Presentes no condomínio agora
          </div>
        </div>

        {/* Ocorrências */}
        <div 
          onClick={() => setAbaAtiva('ocorrencias')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'ocorrencias' 
              ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Ocorrências</span>
            <BookOpen className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black">{metricas.ocorrenciasHoje}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Registradas hoje ({metricas.ocorrenciasUrgentes} prioritárias)
          </div>
        </div>

        {/* Custódia */}
        <div 
          onClick={() => setAbaAtiva('custodia')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'custodia' 
              ? 'bg-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-700/30' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Custódia</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black">{metricas.custodiaAtiva}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Itens guardados na guarita
          </div>
        </div>

        {/* Manutenções OS */}
        <div 
          onClick={() => setAbaAtiva('manutencao')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            abaAtiva === 'manutencao' 
              ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/30' 
              : 'bg-white text-slate-800 border-slate-200 hover:border-orange-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Manutenções</span>
            <Wrench className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black">{metricas.manutencoesAbertas}</div>
          <div className="text-[10px] opacity-75 mt-0.5">
            Chamados OS em aberto ({manutencoes.length} total)
          </div>
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO DO SÍNDICO */}
      {feedbackMensagem && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold transition ${
          feedbackMensagem.tipo === 'sucesso' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{feedbackMensagem.texto}</span>
          </div>
          <button onClick={() => setFeedbackMensagem(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO DE ABAS DE CONSULTA */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('resumo')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'resumo' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Visão Geral do Posto</span>
        </button>

        <button
          onClick={() => setAbaAtiva('encomendas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'encomendas' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Encomendas ({encomendas.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('ocorrencias')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'ocorrencias' 
              ? 'bg-rose-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ocorrências ({ocorrencias.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('manutencao')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'manutencao' 
              ? 'bg-orange-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Manutenções OS ({manutencoes.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('rondas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'rondas' 
              ? 'bg-slate-800 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Rondas ({rondas.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('chaves')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'chaves' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Claviculário ({chaves.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('prestadores')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'prestadores' 
              ? 'bg-amber-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <HardHat className="w-3.5 h-3.5" />
          <span>Prestadores ({prestadores.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('passagens')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'passagens' 
              ? 'bg-cyan-700 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Trocas de Turno ({passagens.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('custodia')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'custodia' 
              ? 'bg-emerald-700 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Custódia ({custodia.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('historico')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'historico' 
              ? 'bg-indigo-900 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Trilha de Auditoria</span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* 1. VISÃO GERAL EXECUTIVA */}
      {abaAtiva === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card: Últimas Ocorrências com Alerta */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" />
                Últimas Ocorrências Registradas
              </h3>
              <button 
                onClick={() => setAbaAtiva('ocorrencias')} 
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Ver Todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {ocorrencias.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhuma ocorrência registrada no período.</p>
            ) : (
              <div className="space-y-2">
                {ocorrencias.slice(0, 4).map((oc) => (
                  <div key={oc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{oc.titulo}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        oc.prioridade === 'Urgente' || oc.prioridade === 'Alta' 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {oc.prioridade || 'Normal'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{oc.descricao}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                      <span>🕒 {new Date(oc.created_at).toLocaleString('pt-BR')}</span>
                      {oc.unidade && <span>• Unidade: {oc.bloco ? `${oc.bloco} - ` : ''}{oc.unidade}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Últimas Passagens de Posto (Troca de Plantão) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Repeat className="w-4 h-4 text-cyan-600" />
                Histórico de Passagem de Posto
              </h3>
              <button 
                onClick={() => setAbaAtiva('passagens')} 
                className="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Ver Todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {passagens.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhuma troca de turno registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {passagens.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        Turno: {p.turno || 'Diurno/Noturno'}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(p.created_at || p.data_hora_troca).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-100">
                      <div><span className="text-slate-400">Saiu:</span> <strong>{p.operador_sai_nome}</strong></div>
                      <div><span className="text-slate-400">Entrou:</span> <strong>{p.operador_entra_nome}</strong></div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>📦 Retidas: {p.resumo_encomendas_retidas ?? 0}</span>
                      <span>🔑 Chaves Fora: {p.resumo_chaves_retiradas ?? 0}</span>
                      <span>🛡️ Rondas: {p.resumo_rondas_cumpridas ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ABA: ENCOMENDAS (SOMENTE LEITURA) */}
      {abaAtiva === 'encomendas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Consulta de Encomendas & Entregas
              </h3>
              <p className="text-xs text-slate-500">
                Visualização de todos os pacotes retidos e baixados na portaria.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportarRelatorioCsv('encomendas_sindico', encomendas)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por morador, unidade, bloco ou código de barras..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Unidade/Bloco</th>
                  <th className="p-2.5">Morador / Destinatário</th>
                  <th className="p-2.5">Código / Rastreio</th>
                  <th className="p-2.5">Local Guarda</th>
                  <th className="p-2.5">Entrada</th>
                  <th className="p-2.5">Retirada / Baixa</th>
                  <th className="p-2.5 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {encomendas
                  .filter(e => {
                    if (!buscaTexto) return true;
                    const txt = buscaTexto.toLowerCase();
                    return (
                      e.unidade?.toLowerCase().includes(txt) ||
                      e.bloco?.toLowerCase().includes(txt) ||
                      e.codigo_barras?.toLowerCase().includes(txt) ||
                      e.retirado_por?.toLowerCase().includes(txt)
                    );
                  })
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'entregue' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status === 'entregue' ? 'Entregue' : 'Retido na Portaria'}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">
                        {item.bloco ? `${item.bloco} - ` : ''}{item.unidade}
                      </td>
                      <td className="p-2.5">
                        {item.morador_nome || 'Morador'}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">
                        {item.codigo_barras || '—'}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {item.local_armazenamento || 'Bancada'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5">
                        {item.status === 'entregue' ? (
                          <div>
                            <span className="font-bold text-slate-800">{item.retirado_por || 'Morador'}</span>
                            <div className="text-[10px] text-slate-400">
                              {item.data_hora_retirada ? new Date(item.data_hora_retirada).toLocaleString('pt-BR') : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Aguardando retirada</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.foto_etiqueta_url ? (
                          <button
                            onClick={() => setItemVisualizando({ titulo: `Foto do Pacote - Unidade ${item.unidade}`, dados: item, tipo: 'foto' })}
                            className="p-1 hover:bg-slate-200 rounded text-blue-600 cursor-pointer"
                            title="Ver foto do pacote"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ABA: OCORRÊNCIAS (LIVRO NEGRO DIGITAL) */}
      {abaAtiva === 'ocorrencias' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-rose-600" />
                Livro Digital de Ocorrências
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de todas as ocorrências e incidentes registrados. O Síndico também pode registrar diretamente.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setModalNovaOcorrencia(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> + Nova Ocorrência
              </button>

              <button
                onClick={() => exportarRelatorioCsv('ocorrencias_sindico', ocorrencias)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {ocorrencias.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">Nenhuma ocorrência registrada para este condomínio.</p>
              <button
                onClick={() => setModalNovaOcorrencia(true)}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500 cursor-pointer"
              >
                + Registrar Primeira Ocorrência
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ocorrencias.map((oc) => (
                <div key={oc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{oc.titulo}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      oc.prioridade === 'Urgente' || oc.prioridade === 'Alta' 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {oc.prioridade || 'Normal'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {oc.descricao}
                  </p>

                  {oc.foto_url && (
                    <button
                      onClick={() => setItemVisualizando({ titulo: oc.titulo, dados: oc, tipo: 'foto' })}
                      className="text-[11px] text-rose-700 hover:text-rose-800 font-bold flex items-center gap-1 underline cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Ver Foto Anexada
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span>🕒 {new Date(oc.created_at).toLocaleString('pt-BR')}</span>
                      {(oc.operador_nome || oc.registrado_por) && (
                        <span>• Por: <strong>{oc.operador_nome || oc.registrado_por}</strong></span>
                      )}
                    </div>

                    {(oc.unidade || oc.unidade_bloco) && (
                      <span className="font-bold text-slate-700">
                        Unidade: {oc.unidade_bloco || `${oc.bloco ? `${oc.bloco} - ` : ''}${oc.unidade}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: MANUTENÇÃO & ORDENS DE SERVIÇO (SÍNDICO) */}
      {abaAtiva === 'manutencao' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-600" />
                Gestão de Manutenção & Ordens de Serviço (OS)
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe chamados abertos e adicione novas demandas preventivas ou corretivas.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setModalNovaManutencao(true)}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> + Novo Chamado OS
              </button>

              <button
                onClick={() => exportarRelatorioCsv('manutencoes_sindico', manutencoes)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {manutencoes.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum chamado de manutenção registrado.</p>
              <button
                onClick={() => setModalNovaManutencao(true)}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-500 cursor-pointer"
              >
                + Abrir Primeira Ordem de Serviço
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {manutencoes.map((m) => {
                const concluido = m.status === 'Concluído';
                return (
                  <div key={m.id} className={`p-4 rounded-xl border space-y-2 transition ${
                    concluido ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 shadow-2xs'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {m.categoria || 'Geral'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{m.titulo}</h4>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {m.localizacao}
                        </span>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                        concluido 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      }`}>
                        {m.status || 'Aberto'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {m.descricao}
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {m.foto_antes_url && (
                        <button
                          onClick={() => setItemVisualizando({ titulo: `Antes: ${m.titulo}`, dados: { foto_url: m.foto_antes_url }, tipo: 'foto' })}
                          className="text-[10px] text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                        >
                          <Camera className="w-3 h-3" /> Foto Antes
                        </button>
                      )}
                      {m.foto_depois_url && (
                        <button
                          onClick={() => setItemVisualizando({ titulo: `Depois: ${m.titulo}`, dados: { foto_url: m.foto_depois_url }, tipo: 'foto' })}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Foto Depois
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Criado: {new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>Por: <strong>{m.operador_abertura || 'Portaria'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. ABA: RONDAS PATRIMONIAIS */}
      {abaAtiva === 'rondas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-slate-800" />
                Auditoria de Rondas Patrimoniais
              </h3>
              <p className="text-xs text-slate-500">
                Histórico de execução de rondas, cumprimento de checkpoints e horários.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('rondas_sindico', rondas)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Operador / Vigilante</th>
                  <th className="p-2.5">Início</th>
                  <th className="p-2.5">Fim</th>
                  <th className="p-2.5">Checkpoints Cumpridos</th>
                  <th className="p-2.5">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rondas.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'FINALIZADA' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status === 'FINALIZADA' ? 'Concluída' : 'Em Andamento'}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold">{r.operador_nome}</td>
                    <td className="p-2.5 text-slate-500">
                      {new Date(r.horario_inicio || r.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-2.5 text-slate-500">
                      {r.horario_fim ? new Date(r.horario_fim).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-800">
                      {r.pontos_concluidos ?? 0} / {r.pontos_esperados ?? 0}
                    </td>
                    <td className="p-2.5 text-slate-500">{r.observacao_geral || 'Sem observações'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ABA: CLAVICULÁRIO / CHAVES */}
      {abaAtiva === 'chaves' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                Consulta de Claviculário Digital
              </h3>
              <p className="text-xs text-slate-500">
                Rastreamento de chaves disponíveis e em posse de moradores ou prestadores.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('chaves_sindico', chaves)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {chaves.map((ch) => (
              <div 
                key={ch.id} 
                className={`p-3.5 rounded-xl border space-y-2 transition ${
                  ch.status === 'RETIRADA' 
                    ? 'bg-amber-50/70 border-amber-300' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                    Chave {ch.codigo_chave}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ch.status === 'RETIRADA' 
                      ? 'bg-amber-200 text-amber-900' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {ch.status === 'RETIRADA' ? 'Em Uso (Retirada)' : 'No Claviculário'}
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  {ch.identificacao_sala}
                </div>
                <div className="text-[11px] text-slate-500">
                  Setor: {ch.setor || 'Área Comum'}
                </div>

                {ch.status === 'RETIRADA' && (
                  <div className="pt-2 border-t border-amber-200 text-xs space-y-0.5 text-amber-950">
                    <div><strong>Posse:</strong> {ch.posse_atual || 'Não informado'}</div>
                    {ch.contato_posse && <div><strong>Contato:</strong> {ch.contato_posse}</div>}
                    <div className="text-[10px] text-amber-800">
                      Retirada às: {ch.retirado_as ? new Date(ch.retirado_as).toLocaleString('pt-BR') : '—'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ABA: PRESTADORES & OBRAS */}
      {abaAtiva === 'prestadores' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-600" />
                Consulta de Prestadores de Serviço & Obras
              </h3>
              <p className="text-xs text-slate-500">
                Controle de terceiros, documentos, fotos de biometria visual e horários de permanência.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('prestadores_sindico', prestadores)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Profissional / Empresa</th>
                  <th className="p-2.5">Documento</th>
                  <th className="p-2.5">Crachá</th>
                  <th className="p-2.5">Unidade Atendida</th>
                  <th className="p-2.5">Entrada</th>
                  <th className="p-2.5">Saída</th>
                  <th className="p-2.5 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prestadores.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status_acesso === 'AUTORIZADO' || p.status_acesso === 'EM_ANDAMENTO' 
                          ? 'bg-amber-100 text-amber-900' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status_acesso === 'AUTORIZADO' || p.status_acesso === 'EM_ANDAMENTO' 
                          ? 'Dentro do Condomínio' 
                          : 'Finalizado'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{p.nome_profissional}</div>
                      <div className="text-[10px] text-slate-400">{p.empresa || 'Autônomo'}</div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">{p.documento}</td>
                    <td className="p-2.5 font-bold text-amber-700">{p.cracha_atribuido || '—'}</td>
                    <td className="p-2.5 font-bold">
                      {p.unidade ? `${p.bloco ? `${p.bloco} - ` : ''}${p.unidade}` : 'Área Comum'}
                    </td>
                    <td className="p-2.5 text-slate-500">
                      {p.data_hora_entrada ? new Date(p.data_hora_entrada).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="p-2.5 text-slate-500">
                      {p.data_hora_saida ? new Date(p.data_hora_saida).toLocaleString('pt-BR') : 'No local'}
                    </td>
                    <td className="p-2.5 text-center">
                      {p.foto_documento || p.foto_rosto ? (
                        <button
                          onClick={() => setItemVisualizando({ 
                            titulo: `Foto de ${p.nome_profissional}`, 
                            dados: { foto_url: p.foto_rosto || p.foto_documento }, 
                            tipo: 'foto' 
                          })}
                          className="p-1 hover:bg-slate-200 rounded text-amber-600 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. ABA: HISTÓRICO ABSOLUTO & AUDITORIA TOTAL */}
      {abaAtiva === 'historico' && (
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Trilha de Auditoria em Tempo Real (Histórico Absoluto)
              </h3>
              <p className="text-xs text-slate-400">
                Registro imutável de todas as ações executadas pela portaria (quem, quando, o quê e detalhes).
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('auditoria_sindico', historico)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha CSV
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {historico.map((h) => (
              <div key={h.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {h.acao}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {h.modulo}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {new Date(h.criado_em).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-400" /> {h.operador_nome}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium">
                  {h.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE FOTO EM ALTA RESOLUÇÃO */}
      {itemVisualizando && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">{itemVisualizando.titulo}</h3>
              <button 
                onClick={() => setItemVisualizando(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center bg-black rounded-xl overflow-hidden max-h-[70vh]">
              <img 
                src={itemVisualizando.dados.foto_etiqueta_url || itemVisualizando.dados.foto_url || itemVisualizando.dados.foto_rosto} 
                alt="Evidência" 
                loading="lazy"
                decoding="async"
                className="max-h-[65vh] object-contain"
              />
            </div>

            <button
              onClick={() => setItemVisualizando(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NOVA OCORRÊNCIA (DIRETO PELO SÍNDICO) */}
      {modalNovaOcorrencia && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b pb-3 border-rose-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Registrar Nova Ocorrência</h3>
                  <p className="text-[11px] text-slate-500">Lançamento direto pelo Síndico no livro oficial</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalNovaOcorrencia(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarNovaOcorrencia} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Título da Ocorrência *
                </label>
                <input
                  type="text"
                  required
                  value={formOcorrencia.titulo}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, titulo: e.target.value })}
                  placeholder="Ex: Barulho excessivo após às 22h"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tipo
                  </label>
                  <select
                    value={formOcorrencia.tipo}
                    onChange={(e) => setFormOcorrencia({ ...formOcorrencia, tipo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Interna">Interna Posto</option>
                    <option value="Morador">Morador</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Prestador">Prestador</option>
                    <option value="Barulho">Barulho</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formOcorrencia.prioridade}
                    onChange={(e) => setFormOcorrencia({ ...formOcorrencia, prioridade: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Unidade / Bloco (Opcional)
                </label>
                <input
                  type="text"
                  value={formOcorrencia.unidade_bloco}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, unidade_bloco: e.target.value })}
                  placeholder="Ex: Ap. 102 - Bloco A"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Descrição dos Fatos *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formOcorrencia.descricao}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, descricao: e.target.value })}
                  placeholder="Descreva detalhadamente o ocorrido..."
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Link da Foto / Evidência (Opcional)
                </label>
                <input
                  type="url"
                  value={formOcorrencia.foto_url}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, foto_url: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovaOcorrencia(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition shadow-md shadow-rose-600/30 cursor-pointer"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CHAMADO DE MANUTENÇÃO (DIRETO PELO SÍNDICO) */}
      {modalNovaManutencao && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-orange-200">
            <div className="flex items-center justify-between border-b pb-3 border-orange-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Abrir Chamado OS de Manutenção</h3>
                  <p className="text-[11px] text-slate-500">Ordem de Serviço predial pelo Síndico</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalNovaManutencao(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarNovaManutencao} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Título da Demanda *
                </label>
                <input
                  type="text"
                  required
                  value={formManutencao.titulo}
                  onChange={(e) => setFormManutencao({ ...formManutencao, titulo: e.target.value })}
                  placeholder="Ex: Troca de disjuntor na bomba de recalque"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Localização *
                  </label>
                  <input
                    type="text"
                    required
                    value={formManutencao.localizacao}
                    onChange={(e) => setFormManutencao({ ...formManutencao, localizacao: e.target.value })}
                    placeholder="Ex: Subsolo 2 / Casa de Máquinas"
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={formManutencao.categoria}
                    onChange={(e) => setFormManutencao({ ...formManutencao, categoria: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Elétrica">Elétrica</option>
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="Portões & Acesso">Portões & Acesso</option>
                    <option value="Pintura">Pintura</option>
                    <option value="Elevadores">Elevadores</option>
                    <option value="CFTV & Alarmes">CFTV & Alarmes</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Prioridade
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {['Baixa', 'Média', 'Alta', 'Emergencial'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormManutencao({ ...formManutencao, prioridade: p })}
                      className={`p-2 rounded-lg font-bold text-center border transition cursor-pointer ${
                        formManutencao.prioridade === p
                          ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Descrição do Serviço Necessário
                </label>
                <textarea
                  rows={3}
                  value={formManutencao.descricao}
                  onChange={(e) => setFormManutencao({ ...formManutencao, descricao: e.target.value })}
                  placeholder="Detalhes técnicos, peças necessárias ou prestador responsável..."
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Foto Antes / Avaria (URL Opcional)
                </label>
                <input
                  type="url"
                  value={formManutencao.foto_antes_url}
                  onChange={(e) => setFormManutencao({ ...formManutencao, foto_antes_url: e.target.value })}
                  placeholder="https://exemplo.com/foto_antes.jpg"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovaManutencao(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition shadow-md shadow-orange-600/30 cursor-pointer"
                >
                  Abrir Chamado OS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
