import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { registrarAtividade } from '../services/auditoriaService';
import { carregarModulosCondominio, isModuloAtivo } from '../services/modulosService';
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
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Download,
  ChevronRight,
  Sparkles,
  Camera,
  MapPin,
  Wrench,
  Plus,
  Layers,
  Boxes
} from 'lucide-react';

interface PainelSindicoProps {
  usuarioLogado: any;
  condominioAtivo: any;
  listaCondominios?: any[];
  abaInicial?: string;
  featureFlags?: Record<string, any>;
}

export default function PainelSindico({
  usuarioLogado,
  condominioAtivo,
  listaCondominios = [],
  abaInicial = 'resumo',
  featureFlags
}: PainelSindicoProps) {
  const [abaAtiva, setAbaAtiva] = useState<string>(abaInicial);
  const [loading, setLoading] = useState(false);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());

  // Identificador do condomínio selecionado
  const [condominioFiltro, setCondominioFiltro] = useState<string>(
    usuarioLogado?.condominio_id || condominioAtivo?.id || (listaCondominios[0]?.id || '')
  );

  // Feature Flags específicas do condomínio em visualização
  const [flagsAtivas, setFlagsAtivas] = useState<Record<string, any>>(featureFlags || {});

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

  // Helper para verificar se um módulo está habilitado para o condomínio atual
  const moduloHabilitado = (moduloKey: string): boolean => {
    return isModuloAtivo(moduloKey, flagsAtivas);
  };

  // Sincroniza condomínio se mudar na prop
  useEffect(() => {
    if (condominioAtivo?.id && condominioAtivo.id !== condominioFiltro) {
      setCondominioFiltro(condominioAtivo.id);
    }
  }, [condominioAtivo?.id]);

  // Carrega as feature flags do condomínio selecionado
  const carregarFlagsDoCondominio = async (idCondo: string) => {
    if (!idCondo) return;
    setFlagsLoading(true);
    try {
      const flags = await carregarModulosCondominio(idCondo);
      setFlagsAtivas(flags || {});
    } catch (e) {
      console.warn('Erro ao carregar flags do condomínio:', e);
      if (featureFlags) {
        setFlagsAtivas(featureFlags);
      }
    } finally {
      setFlagsLoading(false);
    }
  };

  // Disparar carga de flags e dados quando condomínio selecionado mudar
  useEffect(() => {
    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;
    if (idCondo) {
      carregarFlagsDoCondominio(idCondo);
    }
  }, [condominioFiltro]);

  // Se a aba selecionada for de um módulo que não está ativo, redireciona para 'resumo'
  useEffect(() => {
    if (abaAtiva === 'resumo') return;

    const mapaModuloAba: Record<string, string> = {
      encomendas: 'encomendas',
      ocorrencias: 'ocorrencias',
      manutencao: 'manutencao',
      rondas: 'rondas',
      chaves: 'chaves',
      prestadores: 'prestadores',
      passagens: 'passagem',
      custodia: 'custodia',
      materiais: 'materiais',
      historico: 'historico_absoluto'
    };

    const moduloAlvo = mapaModuloAba[abaAtiva];
    if (moduloAlvo && !moduloHabilitado(moduloAlvo)) {
      setAbaAtiva('resumo');
    }
  }, [flagsAtivas, abaAtiva]);

  // Carrega todos os dados do condomínio para consulta, SOMENTE DOS MÓDULOS HABILITADOS
  const carregarDadosSindico = async () => {
    setLoading(true);
    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;

    try {
      // 1. Encomendas (mod02_gestao_encomendas)
      if (moduloHabilitado('encomendas')) {
        let qEnc = supabase
          .from('encomendas_itens')
          .select('id, condominio_id, status, created_at, destinatario, morador_nome, bloco, unidade, data_recebimento, data_retirada, data_hora_retirada, codigo_barras, codigo_rastreio, local_armazenamento, retirado_por, foto_etiqueta_url, foto_etiqueta')
          .order('created_at', { ascending: false })
          .limit(100);
        if (idCondo) qEnc = qEnc.eq('condominio_id', idCondo);
        const { data: dataEnc } = await qEnc;
        setEncomendas(dataEnc || []);
      } else {
        setEncomendas([]);
      }

      // 2. Ocorrências (mod08_livro_ocorrencias)
      if (moduloHabilitado('ocorrencias')) {
        let qOcorr = supabase
          .from('ocorrencias')
          .select('id, condominio_id, titulo, prioridade, gravidade, status, created_at, data_hora, tipo, unidade_bloco, unidade, bloco, operador_nome, foto_url, descricao')
          .order('created_at', { ascending: false })
          .limit(80);
        if (idCondo) qOcorr = qOcorr.eq('condominio_id', idCondo);
        const { data: dataOcorr } = await qOcorr;
        setOcorrencias(dataOcorr || []);
      } else {
        setOcorrencias([]);
      }

      // 3. Rondas Execução (mod07_gestao_ronda)
      if (moduloHabilitado('rondas')) {
        let qRondas = supabase
          .from('rondas_execucao')
          .select('id, condominio_id, operador_id, operador_nome, status, data_inicio, data_fim, hora_inicio, hora_fim, pontos_totais, pontos_lidos, observacoes, created_at')
          .order('created_at', { ascending: false })
          .limit(60);
        if (idCondo) qRondas = qRondas.eq('condominio_id', idCondo);
        const { data: dataRondas } = await qRondas;
        setRondas(dataRondas || []);
      } else {
        setRondas([]);
      }

      // 4. Chaves (mod05_quadro_chaves)
      if (moduloHabilitado('chaves')) {
        let qChaves = supabase
          .from('chaves')
          .select('id, condominio_id, codigo_chave, nome_chave, status, localizacao, setor, bloco, unidade, observacoes, created_at')
          .order('codigo_chave', { ascending: true })
          .limit(100);
        if (idCondo) qChaves = qChaves.eq('condominio_id', idCondo);
        const { data: dataChaves } = await qChaves;
        setChaves(dataChaves || []);
      } else {
        setChaves([]);
      }

      // 5. Prestadores (mod10_prestadores_servico)
      if (moduloHabilitado('prestadores')) {
        let qPrest = supabase
          .from('prestadores')
          .select('id, condominio_id, nome_profissional, status_acesso, created_at, perfil_acesso, unidade, bloco, empresa, documento, cracha_atribuido, data_hora_entrada, data_hora_saida, foto_rosto, foto_documento')
          .order('created_at', { ascending: false })
          .limit(80);
        if (idCondo) qPrest = qPrest.eq('condominio_id', idCondo);
        const { data: dataPrest } = await qPrest;
        setPrestadores(dataPrest || []);
      } else {
        setPrestadores([]);
      }

      // 6. Passagens de Posto (mod09_passagem_posto)
      if (moduloHabilitado('passagem')) {
        let qPass = supabase
          .from('passagens_posto')
          .select('id, condominio_id, data_passagem, turno, status, created_at, data_hora_troca, operador_sainte_nome, operador_entrante_nome, operador_sai_nome, operador_entra_nome, resumo_encomendas_retidas, resumo_chaves_retiradas, resumo_rondas_cumpridas, observacoes, pendencias')
          .order('created_at', { ascending: false })
          .limit(40);
        if (idCondo) qPass = qPass.eq('condominio_id', idCondo);
        const { data: dataPass } = await qPass;
        setPassagens(dataPass || []);
      } else {
        setPassagens([]);
      }

      // 7. Custódia (mod03_custodia_itens)
      if (moduloHabilitado('custodia')) {
        let qCust = supabase
          .from('custodia')
          .select('id, condominio_id, status, created_at, descricao, codigo, codigo_custodia, fluxo, origem, destino, deixado_por, recebedor_nome, data_hora_entrada, data_hora_saida, local_armazenamento, foto_url, foto_entrada_url, foto_saida_url')
          .order('created_at', { ascending: false })
          .limit(60);
        if (idCondo) qCust = qCust.eq('condominio_id', idCondo);
        const { data: dataCust } = await qCust;
        setCustodia(dataCust || []);
      } else {
        setCustodia([]);
      }

      // 8. Histórico Absoluto (mod12_historico_absoluto)
      if (moduloHabilitado('historico_absoluto')) {
        let qHist = supabase
          .from('historico_absoluto')
          .select('id, condominio_id, modulo, acao, descricao, criado_em, operador_nome')
          .order('criado_em', { ascending: false })
          .limit(80);
        if (idCondo) qHist = qHist.eq('condominio_id', idCondo);
        const { data: dataHist } = await qHist;
        setHistorico(dataHist || []);
      } else {
        setHistorico([]);
      }

      // 9. Materiais (mod04_materiais_posto)
      if (moduloHabilitado('materiais')) {
        let qMat = supabase
          .from('materiais_posto')
          .select('id, condominio_id, nome, quantidade, status, estado, categoria, condicao, observacao')
          .order('nome', { ascending: true })
          .limit(80);
        if (idCondo) qMat = qMat.eq('condominio_id', idCondo);
        const { data: dataMat } = await qMat;
        setMateriais(dataMat || []);
      } else {
        setMateriais([]);
      }

      // 10. Manutenções (mod06_gestao_manutencao)
      if (moduloHabilitado('manutencao')) {
        let qMan = supabase
          .from('chamados_manutencao')
          .select('id, condominio_id, titulo, status, prioridade, created_at, setor, localizacao, categoria, descricao, foto_antes_url, foto_depois_url, operador_abertura')
          .order('created_at', { ascending: false })
          .limit(50);
        if (idCondo) qMan = qMan.eq('condominio_id', idCondo);
        const { data: dataMan } = await qMan;
        setManutencoes(dataMan || []);
      } else {
        setManutencoes([]);
      }

      setUltimaAtualizacao(new Date());
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

    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id || 'global';
    const canal = supabase
      .channel(`sindico_realtime_${idCondo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, () => {
        carregarDadosSindico();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados_manutencao' }, () => {
        carregarDadosSindico();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas_itens' }, () => {
        carregarDadosSindico();
      })
      .subscribe();

    return () => {
      window.removeEventListener('infport_sincronizar_dados_global', handleSync);
      supabase.removeChannel(canal);
    };
  }, [condominioFiltro, flagsAtivas]);

  // Cálculos de Indicadores Executivos com tratamento de sinônimos e normalização de maiúsculas/minúsculas
  const metricas = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);

    // Encomendas: status pode vir como 'entregue', 'ENTREGUE', 'retido', 'RETIDO', etc.
    const retidas = encomendas.filter(e => {
      const s = String(e.status || '').toUpperCase();
      return s !== 'ENTREGUE' && s !== 'CANCELADO' && s !== 'DEVOLVIDO';
    }).length;

    const entreguesHoje = encomendas.filter(e => {
      const s = String(e.status || '').toUpperCase();
      const dtRetirada = String(e.data_hora_retirada || e.data_retirada || '');
      const dtCriado = String(e.created_at || '');
      return s === 'ENTREGUE' && (dtRetirada.startsWith(hojeStr) || (!dtRetirada && dtCriado.startsWith(hojeStr)));
    }).length;
    
    // Chaves: status 'RETIRADA', 'EM_USO', 'Disponível', etc.
    const chavesRetiradas = chaves.filter(c => {
      const s = String(c.status || '').toUpperCase();
      return s === 'RETIRADA' || s === 'EM_USO' || s === 'FORA' || s === 'EM USO';
    }).length;
    const chavesDisponiveis = chaves.filter(c => {
      const s = String(c.status || '').toUpperCase();
      return s !== 'RETIRADA' && s !== 'EM_USO' && s !== 'FORA' && s !== 'EM USO';
    }).length;

    // Prestadores presentes agora (status AUTORIZADO/EM_ANDAMENTO e sem data_hora_saida)
    const prestadoresAtivos = prestadores.filter(p => {
      const s = String(p.status_acesso || '').toUpperCase();
      const dentro = s === 'AUTORIZADO' || s === 'EM_ANDAMENTO' || s === 'DENTRO' || s === 'PRESENTE';
      return dentro && !p.data_hora_saida;
    }).length;
    
    // Rondas hoje
    const rondasHoje = rondas.filter(r => {
      const dt = String(r.data_inicio || r.hora_inicio || r.created_at || '');
      return dt.startsWith(hojeStr);
    });
    const rondasConcluidas = rondasHoje.filter(r => {
      const s = String(r.status || '').toUpperCase();
      return s === 'FINALIZADA' || s === 'CONCLUIDA' || Boolean(r.data_fim || r.hora_fim);
    }).length;

    // Ocorrências hoje e prioritárias
    const ocorrenciasHoje = ocorrencias.filter(o => {
      const dt = String(o.created_at || o.data_hora || '');
      return dt.startsWith(hojeStr);
    }).length;

    const ocorrenciasUrgentes = ocorrencias.filter(o => {
      const prio = String(o.prioridade || o.gravidade || '').toUpperCase();
      const st = String(o.status || '').toUpperCase();
      const isUrgente = prio.includes('URG') || prio.includes('ALT') || prio.includes('CRIT');
      return isUrgente && st !== 'RESOLVIDO' && st !== 'CONCLUIDO';
    }).length;

    // Custódia ativa
    const custodiaAtiva = custodia.filter(c => {
      const s = String(c.status || '').toUpperCase();
      return s === 'GUARDADO' || s === 'RETIDO' || s === 'EM_CUSTODIA' || s === 'PENDENTE';
    }).length;

    // Materiais com avaria ou manutenção
    const materiaisAvaria = materiais.filter(m => {
      const est = String(m.estado || m.status || m.condicao || '').toUpperCase();
      return est.includes('AVARIA') || est.includes('MANUT') || est.includes('DEFEIT') || est.includes('RUIM') || est.includes('DANIFICADO');
    }).length;

    // Manutenções OS abertas
    const manutencoesAbertas = manutencoes.filter(m => {
      const st = String(m.status || '').toUpperCase();
      return st === 'ABERTO' || st === 'EM_ANDAMENTO' || st === 'EM ANDAMENTO' || st === 'PENDENTE';
    }).length;

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

  // Contagem de módulos ativos no condomínio
  const modulosAtivosCount = useMemo(() => {
    const lista = ['encomendas', 'chaves', 'rondas', 'prestadores', 'passagem', 'ocorrencias', 'custodia', 'materiais', 'manutencao', 'historico_absoluto'];
    return lista.filter(k => moduloHabilitado(k)).length;
  }, [flagsAtivas]);

  // Registro de nova ocorrência direta pelo Síndico
  const salvarNovaOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOcorrencia.titulo.trim() || !formOcorrencia.descricao.trim()) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Preencha o título e a descrição da ocorrência.' });
      return;
    }
    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;
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
        gravidade: formOcorrencia.prioridade,
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
    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;
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
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  Portal de Auditoria do Síndico
                </h1>
                <p className="text-xs text-slate-300">
                  Visão executiva em tempo real com dados restritos aos módulos habilitados para este condomínio.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 text-xs text-slate-300 flex-wrap">
              {/* Seletor de Condomínio se houver múltiplos */}
              {listaCondominios.length > 1 ? (
                <div className="flex items-center gap-1.5 bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <select
                    value={condominioFiltro}
                    onChange={(e) => setCondominioFiltro(e.target.value)}
                    className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer"
                  >
                    {listaCondominios.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 font-bold text-emerald-300 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  {condoNomeAtual}
                </span>
              )}

              {/* Tag de módulos habilitados */}
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/40 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {modulosAtivosCount} Módulos Habilitados
              </span>

              {/* Timestamp de última atualização */}
              <span className="text-[11px] text-slate-400">
                Sincronizado: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {moduloHabilitado('ocorrencias') && (
              <button
                onClick={() => setModalNovaOcorrencia(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-900/50 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ocorrência</span>
              </button>
            )}

            {moduloHabilitado('manutencao') && (
              <button
                onClick={() => setModalNovaManutencao(true)}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-orange-900/50 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Chamado OS</span>
              </button>
            )}

            <button
              onClick={carregarDadosSindico}
              disabled={loading || flagsLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || flagsLoading ? 'animate-spin' : ''}`} />
              <span>{loading || flagsLoading ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE INDICADORES EXECUTIVOS - RESTRITOS AOS MÓDULOS HABILITADOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Encomendas Retidas */}
        {moduloHabilitado('encomendas') && (
          <div 
            onClick={() => setAbaAtiva('encomendas')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'encomendas' 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Encomendas</span>
              <Package className={`w-4 h-4 ${abaAtiva === 'encomendas' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.retidas}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Retidas ({metricas.entreguesHoje} baixadas hoje)
            </div>
          </div>
        )}

        {/* Chaves Fora / Claviculário */}
        {moduloHabilitado('chaves') && (
          <div 
            onClick={() => setAbaAtiva('chaves')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'chaves' 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Chaves em Uso</span>
              <Key className={`w-4 h-4 ${abaAtiva === 'chaves' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.chavesRetiradas}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Fora do armário ({metricas.chavesDisponiveis} disponíveis)
            </div>
          </div>
        )}

        {/* Rondas Hoje */}
        {moduloHabilitado('rondas') && (
          <div 
            onClick={() => setAbaAtiva('rondas')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'rondas' 
                ? 'bg-slate-800 text-white border-slate-700 shadow-lg ring-2 ring-slate-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Rondas Hoje</span>
              <QrCode className={`w-4 h-4 ${abaAtiva === 'rondas' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.rondasConcluidas}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Concluídas ({metricas.totalRondasHoje} iniciadas hoje)
            </div>
          </div>
        )}

        {/* Prestadores no Condomínio */}
        {moduloHabilitado('prestadores') && (
          <div 
            onClick={() => setAbaAtiva('prestadores')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'prestadores' 
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30 ring-2 ring-amber-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Prestadores</span>
              <HardHat className={`w-4 h-4 ${abaAtiva === 'prestadores' ? 'text-white' : 'text-amber-500'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.prestadoresAtivos}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Presentes no condomínio agora
            </div>
          </div>
        )}

        {/* Ocorrências */}
        {moduloHabilitado('ocorrencias') && (
          <div 
            onClick={() => setAbaAtiva('ocorrencias')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'ocorrencias' 
                ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Ocorrências</span>
              <BookOpen className={`w-4 h-4 ${abaAtiva === 'ocorrencias' ? 'text-white' : 'text-rose-500'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.ocorrenciasHoje}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Registradas hoje ({metricas.ocorrenciasUrgentes} prioritárias)
            </div>
          </div>
        )}

        {/* Custódia */}
        {moduloHabilitado('custodia') && (
          <div 
            onClick={() => setAbaAtiva('custodia')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'custodia' 
                ? 'bg-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-700/30 ring-2 ring-emerald-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Custódia</span>
              <PackageCheck className={`w-4 h-4 ${abaAtiva === 'custodia' ? 'text-white' : 'text-emerald-500'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.custodiaAtiva}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Itens guardados na guarita
            </div>
          </div>
        )}

        {/* Manutenções OS */}
        {moduloHabilitado('manutencao') && (
          <div 
            onClick={() => setAbaAtiva('manutencao')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'manutencao' 
                ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/30 ring-2 ring-orange-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Manutenções</span>
              <Wrench className={`w-4 h-4 ${abaAtiva === 'manutencao' ? 'text-white' : 'text-orange-500'}`} />
            </div>
            <div className="text-2xl font-black">{metricas.manutencoesAbertas}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              Chamados em aberto ({manutencoes.length} total)
            </div>
          </div>
        )}

        {/* Materiais do Posto */}
        {moduloHabilitado('materiais') && (
          <div 
            onClick={() => setAbaAtiva('materiais')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none ${
              abaAtiva === 'materiais' 
                ? 'bg-teal-600 text-white border-teal-500 shadow-lg ring-2 ring-teal-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-teal-400 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Materiais</span>
              <Boxes className={`w-4 h-4 ${abaAtiva === 'materiais' ? 'text-white' : 'text-teal-500'}`} />
            </div>
            <div className="text-2xl font-black">{materiais.length}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {metricas.materiaisAvaria > 0 ? `${metricas.materiaisAvaria} com avaria/atenção` : 'Todos em ordem'}
            </div>
          </div>
        )}
      </div>

      {/* FEEDBACK DE AÇÃO DO SÍNDICO */}
      {feedbackMensagem && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold transition ${
          feedbackMensagem.tipo === 'sucesso' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700' 
            : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            <span>{feedbackMensagem.texto}</span>
          </div>
          <button onClick={() => setFeedbackMensagem(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">✕</button>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO DE ABAS - SOMENTE MÓDULOS HABILITADOS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('resumo')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            abaAtiva === 'resumo' 
              ? 'bg-slate-900 text-white shadow-sm dark:bg-emerald-600' 
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Visão Geral do Posto</span>
        </button>

        {moduloHabilitado('encomendas') && (
          <button
            onClick={() => setAbaAtiva('encomendas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'encomendas' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Encomendas ({encomendas.length})</span>
          </button>
        )}

        {moduloHabilitado('ocorrencias') && (
          <button
            onClick={() => setAbaAtiva('ocorrencias')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'ocorrencias' 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ocorrências ({ocorrencias.length})</span>
          </button>
        )}

        {moduloHabilitado('manutencao') && (
          <button
            onClick={() => setAbaAtiva('manutencao')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'manutencao' 
                ? 'bg-orange-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Manutenções OS ({manutencoes.length})</span>
          </button>
        )}

        {moduloHabilitado('rondas') && (
          <button
            onClick={() => setAbaAtiva('rondas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'rondas' 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Rondas ({rondas.length})</span>
          </button>
        )}

        {moduloHabilitado('chaves') && (
          <button
            onClick={() => setAbaAtiva('chaves')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'chaves' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Claviculário ({chaves.length})</span>
          </button>
        )}

        {moduloHabilitado('prestadores') && (
          <button
            onClick={() => setAbaAtiva('prestadores')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'prestadores' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Prestadores ({prestadores.length})</span>
          </button>
        )}

        {moduloHabilitado('passagem') && (
          <button
            onClick={() => setAbaAtiva('passagens')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'passagens' 
                ? 'bg-cyan-700 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Trocas de Turno ({passagens.length})</span>
          </button>
        )}

        {moduloHabilitado('custodia') && (
          <button
            onClick={() => setAbaAtiva('custodia')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'custodia' 
                ? 'bg-emerald-700 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Custódia ({custodia.length})</span>
          </button>
        )}

        {moduloHabilitado('materiais') && (
          <button
            onClick={() => setAbaAtiva('materiais')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'materiais' 
                ? 'bg-teal-700 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Materiais ({materiais.length})</span>
          </button>
        )}

        {moduloHabilitado('historico_absoluto') && (
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'historico' 
                ? 'bg-indigo-900 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trilha de Auditoria</span>
          </button>
        )}
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* 1. VISÃO GERAL EXECUTIVA */}
      {abaAtiva === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Card: Ocorrências Recentes (somente se habilitado) */}
          {moduloHabilitado('ocorrencias') && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-500" />
                  Últimas Ocorrências Registradas
                </h3>
                <button 
                  onClick={() => setAbaAtiva('ocorrencias')} 
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Ver Todas <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {ocorrencias.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma ocorrência registrada no período.</p>
              ) : (
                <div className="space-y-2">
                  {ocorrencias.slice(0, 4).map((oc) => (
                    <div key={oc.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{oc.titulo}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          oc.prioridade === 'Urgente' || oc.prioridade === 'Alta' || oc.gravidade === 'Alta'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {oc.prioridade || oc.gravidade || 'Normal'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{oc.descricao}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>🕒 {new Date(oc.created_at).toLocaleString('pt-BR')}</span>
                        {oc.unidade && <span>• Unidade: {oc.bloco ? `${oc.bloco} - ` : ''}{oc.unidade}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card: Passagens de Posto (somente se habilitado) */}
          {moduloHabilitado('passagem') && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Histórico de Passagem de Posto
                </h3>
                <button 
                  onClick={() => setAbaAtiva('passagens')} 
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Ver Todas <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {passagens.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma troca de turno registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {passagens.slice(0, 3).map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Turno: {p.turno || 'Diurno/Noturno'}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(p.created_at || p.data_hora_troca).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div><span className="text-slate-400">Saiu:</span> <strong>{p.operador_sai_nome || p.operador_sainte_nome || 'Operador'}</strong></div>
                        <div><span className="text-slate-400">Entrou:</span> <strong>{p.operador_entra_nome || p.operador_entrante_nome || 'Operador'}</strong></div>
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
          )}

          {/* Card: Encomendas Pendentes de Retirada (somente se habilitado) */}
          {moduloHabilitado('encomendas') && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  Encomendas na Guarita ({metricas.retidas} aguardando morador)
                </h3>
                <button 
                  onClick={() => setAbaAtiva('encomendas')} 
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Ver Todas <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {encomendas.filter(e => String(e.status || '').toUpperCase() !== 'ENTREGUE').length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum pacote retido na portaria no momento.</p>
              ) : (
                <div className="space-y-2">
                  {encomendas.filter(e => String(e.status || '').toUpperCase() !== 'ENTREGUE').slice(0, 4).map((enc) => (
                    <div key={enc.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          Unidade {enc.bloco ? `${enc.bloco} - ` : ''}{enc.unidade}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {enc.destinatario || enc.morador_nome || 'Morador'} • {enc.codigo_barras || enc.codigo_rastreio || 'Sem código'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(enc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card: Manutenções Abertas (somente se habilitado) */}
          {moduloHabilitado('manutencao') && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  Ordens de Serviço em Aberto ({metricas.manutencoesAbertas})
                </h3>
                <button 
                  onClick={() => setAbaAtiva('manutencao')} 
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Ver Todas <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {manutencoes.filter(m => String(m.status || '').toUpperCase() !== 'CONCLUIDO').length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum chamado de manutenção em aberto.</p>
              ) : (
                <div className="space-y-2">
                  {manutencoes.filter(m => String(m.status || '').toUpperCase() !== 'CONCLUIDO').slice(0, 4).map((man) => (
                    <div key={man.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{man.titulo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                          {man.prioridade || 'Média'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {man.localizacao}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mensagem caso todos os módulos de widgets estejam desativados */}
          {!moduloHabilitado('ocorrencias') && !moduloHabilitado('passagem') && !moduloHabilitado('encomendas') && !moduloHabilitado('manutencao') && (
            <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Nenhum módulo operacional detalhado está ativo</h3>
              <p className="text-xs text-slate-500">
                Os módulos para este condomínio foram restritos pelo administrador. Selecione outra aba na barra acima para visualizar dados específicos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. ABA: ENCOMENDAS */}
      {abaAtiva === 'encomendas' && moduloHabilitado('encomendas') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Consulta de Encomendas & Entregas
              </h3>
              <p className="text-xs text-slate-500">
                Visualização oficial de todos os pacotes retidos e baixados na portaria deste condomínio.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('encomendas_sindico', encomendas)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por morador, unidade, bloco ou código de barras..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {encomendas
                  .filter(e => {
                    if (!buscaTexto) return true;
                    const txt = buscaTexto.toLowerCase();
                    return (
                      String(e.unidade || '').toLowerCase().includes(txt) ||
                      String(e.bloco || '').toLowerCase().includes(txt) ||
                      String(e.codigo_barras || '').toLowerCase().includes(txt) ||
                      String(e.codigo_rastreio || '').toLowerCase().includes(txt) ||
                      String(e.destinatario || '').toLowerCase().includes(txt) ||
                      String(e.morador_nome || '').toLowerCase().includes(txt) ||
                      String(e.retirado_por || '').toLowerCase().includes(txt)
                    );
                  })
                  .map((item) => {
                    const isEntregue = String(item.status || '').toUpperCase() === 'ENTREGUE';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isEntregue 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isEntregue ? 'Entregue' : 'Retido na Portaria'}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold">
                          {item.bloco ? `${item.bloco} - ` : ''}{item.unidade}
                        </td>
                        <td className="p-2.5">
                          {item.destinatario || item.morador_nome || 'Morador'}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.codigo_barras || item.codigo_rastreio || '—'}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                            {item.local_armazenamento || 'Bancada'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2.5">
                          {isEntregue ? (
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.retirado_por || 'Morador'}</span>
                              <div className="text-[10px] text-slate-400">
                                {item.data_hora_retirada || item.data_retirada ? new Date(item.data_hora_retirada || item.data_retirada).toLocaleString('pt-BR') : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Aguardando retirada</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.foto_etiqueta_url || item.foto_etiqueta ? (
                            <button
                              onClick={() => setItemVisualizando({ titulo: `Foto do Pacote - Unidade ${item.unidade}`, dados: { foto_url: item.foto_etiqueta_url || item.foto_etiqueta }, tipo: 'foto' })}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600 dark:text-blue-400 cursor-pointer"
                              title="Ver foto do pacote"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ABA: OCORRÊNCIAS */}
      {abaAtiva === 'ocorrencias' && moduloHabilitado('ocorrencias') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {ocorrencias.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
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
                <div key={oc.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{oc.titulo}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      oc.prioridade === 'Urgente' || oc.prioridade === 'Alta' || oc.gravidade === 'Alta'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' 
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {oc.prioridade || oc.gravidade || 'Média'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {oc.descricao}
                  </p>

                  {oc.foto_url && (
                    <button
                      onClick={() => setItemVisualizando({ titulo: `Evidência: ${oc.titulo}`, dados: { foto_url: oc.foto_url }, tipo: 'foto' })}
                      className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 hover:underline cursor-pointer pt-1"
                    >
                      <Camera className="w-3 h-3" /> Ver Foto em Alta Resolução
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{new Date(oc.created_at || oc.data_hora).toLocaleString('pt-BR')}</span>
                    <span>Registrado por: <strong>{oc.operador_nome || 'Portaria'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ABA: MANUTENÇÕES OS */}
      {abaAtiva === 'manutencao' && moduloHabilitado('manutencao') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {manutencoes.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
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
                const concluido = String(m.status || '').toUpperCase() === 'CONCLUIDO';
                return (
                  <div key={m.id} className={`p-4 rounded-xl border space-y-2 transition ${
                    concluido ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800">
                          {m.categoria || 'Geral'}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{m.titulo}</h4>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {m.localizacao}
                        </span>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                        concluido 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                      }`}>
                        {m.status || 'Aberto'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {m.descricao}
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {m.foto_antes_url && (
                        <button
                          onClick={() => setItemVisualizando({ titulo: `Antes: ${m.titulo}`, dados: { foto_url: m.foto_antes_url }, tipo: 'foto' })}
                          className="text-[10px] text-blue-700 dark:text-blue-300 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                        >
                          <Camera className="w-3 h-3" /> Foto Antes
                        </button>
                      )}
                      {m.foto_depois_url && (
                        <button
                          onClick={() => setItemVisualizando({ titulo: `Depois: ${m.titulo}`, dados: { foto_url: m.foto_depois_url }, tipo: 'foto' })}
                          className="text-[10px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Foto Depois
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
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

      {/* 5. ABA: RONDAS */}
      {abaAtiva === 'rondas' && moduloHabilitado('rondas') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                Auditoria de Rondas Patrimoniais
              </h3>
              <p className="text-xs text-slate-500">
                Histórico de execução de rondas, cumprimento de checkpoints e horários.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('rondas_sindico', rondas)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Operador / Vigilante</th>
                  <th className="p-2.5">Início</th>
                  <th className="p-2.5">Fim</th>
                  <th className="p-2.5">Checkpoints Cumpridos</th>
                  <th className="p-2.5">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rondas.map((r) => {
                  const isConcluida = String(r.status || '').toUpperCase() === 'FINALIZADA' || String(r.status || '').toUpperCase() === 'CONCLUIDA' || Boolean(r.data_fim || r.hora_fim);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isConcluida 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isConcluida ? 'Concluída' : 'Em Andamento'}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">{r.operador_nome || 'Vigilante'}</td>
                      <td className="p-2.5 text-slate-500">
                        {new Date(r.data_inicio || r.hora_inicio || r.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {r.data_fim || r.hora_fim ? new Date(r.data_fim || r.hora_fim).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {r.pontos_lidos ?? 0} / {r.pontos_totais ?? 0}
                      </td>
                      <td className="p-2.5 text-slate-500">{r.observacoes || 'Sem observações'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. ABA: CLAVICULÁRIO / CHAVES */}
      {abaAtiva === 'chaves' && moduloHabilitado('chaves') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                Consulta de Claviculário Digital
              </h3>
              <p className="text-xs text-slate-500">
                Rastreamento de chaves disponíveis e em posse de moradores ou prestadores.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('chaves_sindico', chaves)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {chaves.map((ch) => {
              const st = String(ch.status || '').toUpperCase();
              const isRetirada = st === 'RETIRADA' || st === 'EM_USO' || st === 'FORA' || st === 'EM USO';
              return (
                <div 
                  key={ch.id} 
                  className={`p-3.5 rounded-xl border space-y-2 transition ${
                    isRetirada 
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-slate-900 dark:bg-slate-700 text-white px-2 py-0.5 rounded">
                      Chave {ch.codigo_chave}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isRetirada 
                        ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200' 
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {isRetirada ? 'Em Uso (Retirada)' : 'No Claviculário'}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {ch.nome_chave || ch.identificacao_sala || 'Chave do Posto'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Setor: {ch.setor || ch.localizacao || 'Área Comum'}
                  </div>

                  {ch.observacoes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {ch.observacoes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. ABA: PRESTADORES & OBRAS */}
      {abaAtiva === 'prestadores' && moduloHabilitado('prestadores') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-600" />
                Consulta de Prestadores de Serviço & Obras
              </h3>
              <p className="text-xs text-slate-500">
                Controle de terceiros, documentos, fotos de biometria visual e horários de permanência.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('prestadores_sindico', prestadores)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {prestadores.map((p) => {
                  const s = String(p.status_acesso || '').toUpperCase();
                  const noLocal = (s === 'AUTORIZADO' || s === 'EM_ANDAMENTO' || s === 'DENTRO' || s === 'PRESENTE') && !p.data_hora_saida;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          noLocal 
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {noLocal ? 'Dentro do Condomínio' : 'Finalizado'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">{p.nome_profissional}</div>
                        <div className="text-[10px] text-slate-400">{p.empresa || 'Autônomo'}</div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{p.documento || '—'}</td>
                      <td className="p-2.5 font-bold text-amber-700 dark:text-amber-400">{p.cracha_atribuido || '—'}</td>
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
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-amber-600 dark:text-amber-400 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. ABA: TROCAS DE TURNO / PASSAGENS DE POSTO */}
      {abaAtiva === 'passagens' && moduloHabilitado('passagem') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Repeat className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Auditoria de Trocas de Turno (Passagem de Posto)
              </h3>
              <p className="text-xs text-slate-500">
                Histórico auditado de entrega e recebimento da portaria entre plantonistas.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('passagens_posto_sindico', passagens)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {passagens.map((p) => (
              <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs border-b dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Turno: {p.turno || 'Diurno/Noturno'}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(p.created_at || p.data_hora_troca).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Operador Sainte</span>
                    <strong className="text-slate-800 dark:text-slate-200">{p.operador_sai_nome || p.operador_sainte_nome || 'Operador'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Operador Entrante</span>
                    <strong className="text-slate-800 dark:text-slate-200">{p.operador_entra_nome || p.operador_entrante_nome || 'Operador'}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <span>📦 Retidas: <strong>{p.resumo_encomendas_retidas ?? 0}</strong></span>
                  <span>🔑 Chaves Fora: <strong>{p.resumo_chaves_retiradas ?? 0}</strong></span>
                  <span>🛡️ Rondas: <strong>{p.resumo_rondas_cumpridas ?? 0}</strong></span>
                </div>

                {p.observacoes && (
                  <p className="text-[11px] text-slate-500 italic bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                    "{p.observacoes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. ABA: CUSTÓDIA */}
      {abaAtiva === 'custodia' && moduloHabilitado('custodia') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                Consulta de Itens sob Custódia
              </h3>
              <p className="text-xs text-slate-500">
                Itens, documentos, chaves e encomendas temporariamente retidos na guarita.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('custodia_sindico', custodia)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Código</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5">Origem / Deixado Por</th>
                  <th className="p-2.5">Destinatário</th>
                  <th className="p-2.5">Entrada</th>
                  <th className="p-2.5">Local</th>
                  <th className="p-2.5 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {custodia.map((c) => {
                  const st = String(c.status || '').toUpperCase();
                  const isGuardado = st === 'GUARDADO' || st === 'RETIDO' || st === 'EM_CUSTODIA';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isGuardado
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isGuardado ? 'Guardado' : 'Entregue'}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {c.codigo_custodia || c.codigo || '—'}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                        {c.descricao}
                      </td>
                      <td className="p-2.5">
                        {c.origem || c.deixado_por || 'Não informado'}
                      </td>
                      <td className="p-2.5">
                        {c.destino || c.destinatario || 'Morador'}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {new Date(c.data_hora_entrada || c.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {c.local_armazenamento || 'Bancada'}
                      </td>
                      <td className="p-2.5 text-center">
                        {c.foto_entrada_url || c.foto_url ? (
                          <button
                            onClick={() => setItemVisualizando({ titulo: `Foto do Item: ${c.descricao}`, dados: { foto_url: c.foto_entrada_url || c.foto_url }, tipo: 'foto' })}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600 dark:text-emerald-400 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. ABA: MATERIAIS */}
      {abaAtiva === 'materiais' && moduloHabilitado('materiais') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-teal-600" />
                Inventário de Materiais do Posto
              </h3>
              <p className="text-xs text-slate-500">
                Rádios comunicadores, lanternas, coletes, cones e demais equipamentos em carga no condomínio.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('materiais_posto_sindico', materiais)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {materiais.map((m) => {
              const est = String(m.estado || m.status || m.condicao || '').toUpperCase();
              const temAvaria = est.includes('AVARIA') || est.includes('MANUT') || est.includes('DEFEIT') || est.includes('RUIM');
              return (
                <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                      {m.categoria || 'Geral'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      temAvaria 
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {m.estado || m.status || 'Perfeito'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{m.nome}</h4>
                  <div className="text-xs text-slate-500">
                    Quantidade em Posto: <strong className="text-slate-800 dark:text-slate-200">{m.quantidade ?? 1} un</strong>
                  </div>

                  {m.observacao && (
                    <p className="text-[11px] text-slate-500 border-t dark:border-slate-700 pt-1">
                      {m.observacao}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 11. ABA: HISTÓRICO ABSOLUTO */}
      {abaAtiva === 'historico' && moduloHabilitado('historico_absoluto') && (
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
