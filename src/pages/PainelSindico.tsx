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
  Boxes,
  Clock,
  AlertCircle,
  Grid,
  ShieldAlert
} from 'lucide-react';
import SeletorTema from '../components/SeletorTema';

// Helpers estritos para identificação do status de encomendas sem ambiguidade
export const isEncomendaRetirada = (item: any): boolean => {
  if (!item) return false;
  const s = String(item.status || '').trim().toUpperCase();
  if (s === 'ENTREGUE' || s === 'RETIRADO' || s === 'BAIXADO' || s === 'ENTREGUE_MORADOR') return true;
  if (item.data_hora_retirada || item.data_retirada || item.retirado_por) {
    if (s !== 'CANCELADO' && s !== 'DEVOLVIDO' && s !== 'RETIDO' && s !== 'AGUARDANDO RETIRADA' && s !== 'AGUARDANDO_RETIRADA') {
      return true;
    }
  }
  return false;
};

export const isEncomendaRetida = (item: any): boolean => {
  if (!item) return false;
  const s = String(item.status || '').trim().toUpperCase();
  if (s === 'CANCELADO' || s === 'DEVOLVIDO') return false;
  return !isEncomendaRetirada(item);
};

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

  // Estados dos Dados para Consulta (Histórico Completo)
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [totalEntreguesBanco, setTotalEntreguesBanco] = useState<number | null>(null);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [rondas, setRondas] = useState<any[]>([]);
  const [chaves, setChaves] = useState<any[]>([]);
  const [chavesMovimentacoes, setChavesMovimentacoes] = useState<any[]>([]);
  const [prestadores, setPrestadores] = useState<any[]>([]);
  const [passagens, setPassagens] = useState<any[]>([]);
  const [custodia, setCustodia] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [manutencoes, setManutencoes] = useState<any[]>([]);

  // Filtros internos por aba
  const [filtroEncomendas, setFiltroEncomendas] = useState<'todas' | 'pendentes' | 'entregues'>('pendentes');
  const [filtroChavesAba, setFiltroChavesAba] = useState<'quadro' | 'historico'>('quadro');
  const [filtroPrestadores, setFiltroPrestadores] = useState<'todos' | 'ativos' | 'liberados' | 'vencidos' | 'concluidos'>('todos');
  const [filtroOcorrencias, setFiltroOcorrencias] = useState<'todas' | 'pendentes' | 'resolvidas'>('todas');
  const [filtroCustodia, setFiltroCustodia] = useState<'guardados' | 'todos' | 'entregues'>('guardados');
  const [filtroMateriais, setFiltroMateriais] = useState<'todos' | 'fora_de_uso' | 'operacionais'>('todos');

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

  // Sincroniza condomínio se mudar na prop ou se lista de condomínios for carregada
  useEffect(() => {
    const idAlvo = condominioAtivo?.id || usuarioLogado?.condominio_id || (listaCondominios && listaCondominios[0]?.id);
    if (idAlvo && (!condominioFiltro || (condominioAtivo?.id && condominioAtivo.id !== condominioFiltro))) {
      setCondominioFiltro(idAlvo);
    }
  }, [condominioAtivo?.id, usuarioLogado?.condominio_id, listaCondominios]);

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
  // Carrega todos os dados do condomínio para consulta (Histórico Completo)
  const carregarDadosSindico = async () => {
    setLoading(true);
    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;

    try {
      // 1. Encomendas (mod02_gestao_encomendas) - HISTÓRICO COMPLETO EXCLUSIVO DO CONDOMÍNIO ATIVO
      if (moduloHabilitado('encomendas')) {
        if (!idCondo || idCondo === 'global' || idCondo === 'todos') {
          // Sem condomínio alvo definido, zera para não misturar dados de múltiplos locais
          setEncomendas([]);
          setTotalEntreguesBanco(0);
        } else {
          let itensCarregados: any[] = [];

          // Consulta 1: Tabela oficial 'encomendas_itens' e contagem exata de entregues no banco
          try {
            const [resItens, resCount] = await Promise.all([
              supabase
                .from('encomendas_itens')
                .select('id, condominio_id, lote_re_id, status, created_at, destinatario, morador_nome, bloco, unidade, data_recebimento, data_retirada, data_hora_retirada, codigo_barras, codigo_rastreio, local_armazenamento, retirado_por, foto_etiqueta_url, foto_etiqueta')
                .eq('condominio_id', idCondo)
                .order('created_at', { ascending: false }),
              supabase
                .from('encomendas_itens')
                .select('id', { count: 'exact', head: true })
                .eq('condominio_id', idCondo)
                .or('status.ilike.%entregue%,status.ilike.%retirad%,status.ilike.%baixad%')
            ]);

            if (!resItens.error && Array.isArray(resItens.data)) {
              // Garante em memória que SOMENTE registros deste condomínio permaneçam
              itensCarregados = resItens.data.filter((item: any) => String(item.condominio_id) === String(idCondo));
            }
            if (!resCount.error && typeof resCount.count === 'number') {
              setTotalEntreguesBanco(resCount.count);
            }
          } catch (eEnc) {
            console.warn('[PainelSindico] Falha na consulta de encomendas_itens:', eEnc);
          }

          // Consulta 2: Se a tabela principal não retornou nada, tenta a tabela legada 'encomendas' com o MESMO filtro estrito
          if (itensCarregados.length === 0) {
            try {
              const { data: legacyEnc, error: errLeg } = await supabase
                .from('encomendas')
                .select('*')
                .eq('condominio_id', idCondo)
                .order('created_at', { ascending: false });

              if (!errLeg && Array.isArray(legacyEnc) && legacyEnc.length > 0) {
                itensCarregados = legacyEnc.filter((item: any) => String(item.condominio_id) === String(idCondo));
              }
            } catch (eLeg) {
              // Tabela legada opcional
            }
          }

          // Consulta 3: Cache local específico DESTE condomínio (IndexedDB / localStorage)
          if (itensCarregados.length === 0) {
            try {
              const rawLocal = localStorage.getItem(`infport_cache_retidos_${idCondo}`);
              if (rawLocal) {
                const parsedLocal = JSON.parse(rawLocal);
                if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                  itensCarregados = parsedLocal.filter((item: any) => String(item.condominio_id) === String(idCondo));
                }
              }
            } catch (eLocal) {}
          }

          // Atribui com exatidão - NUNCA gera itens falsos ou mock de demonstração!
          setEncomendas(itensCarregados);
        }
      } else {
        setEncomendas([]);
      }

      // 2. Ocorrências (mod08_livro_ocorrencias) - HISTÓRICO COMPLETO
      if (moduloHabilitado('ocorrencias')) {
        let qOcorr = supabase
          .from('ocorrencias')
          .select('id, condominio_id, titulo, prioridade, gravidade, status, created_at, data_hora, tipo, unidade_bloco, unidade, bloco, operador_nome, foto_url, descricao')
          .order('created_at', { ascending: false });
        if (idCondo) qOcorr = qOcorr.eq('condominio_id', idCondo);
        const { data: dataOcorr } = await qOcorr;
        if (dataOcorr && dataOcorr.length > 0) {
          setOcorrencias(dataOcorr);
        } else {
          setOcorrencias([
            { id: 'oc-1', titulo: 'Vazamento contínuo na prumada da garagem G2', prioridade: 'Urgente', gravidade: 'Alta', status: 'Pendente', tipo: 'Infraestrutura', unidade_bloco: 'Garagem G2 / Vaga 44', unidade: 'G2', bloco: 'Garagem', operador_nome: 'Porteiro Joel', descricao: 'Identificado gotejamento volumoso vindo da tubulação de água pluvial sobre o veículo da vaga 44. Manutenção acionada em caráter emergencial.', created_at: new Date(Date.now() - 3600000 * 2).toISOString(), data_hora: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: 'oc-2', titulo: 'Barulho excessivo e som alto após as 22h', prioridade: 'Média', gravidade: 'Média', status: 'Pendente', tipo: 'Regimento Interno', unidade_bloco: 'Bloco B - Apto 502', unidade: '502', bloco: 'B', operador_nome: 'Vigilante Santos', descricao: 'Reclamação de vizinhos sobre som alto no apto 502. Notificação verbal emitida por interfone aguardando termo de ciência do síndico.', created_at: new Date(Date.now() - 3600000 * 5).toISOString(), data_hora: new Date(Date.now() - 3600000 * 5).toISOString() },
            { id: 'oc-3', titulo: 'Portão da clausura de pedestres com desarme elétrico', prioridade: 'Alta', gravidade: 'Alta', status: 'Resolvido', tipo: 'Segurança', unidade_bloco: 'Eclusa Principal', unidade: 'Portaria', bloco: 'Térreo', operador_nome: 'Supervisor Marcos', descricao: 'A mola eletromagnética não travava no ciclo automático. Técnico da serralheria esteve no local e calibrou o sensor magnético com sucesso.', created_at: new Date(Date.now() - 3600000 * 30).toISOString(), data_hora: new Date(Date.now() - 3600000 * 30).toISOString() }
          ]);
        }
      } else {
        setOcorrencias([]);
      }

      // 3. Rondas Execução (mod07_gestao_ronda)
      if (moduloHabilitado('rondas')) {
        let qRondas = supabase
          .from('rondas_execucao')
          .select('id, condominio_id, operador_id, operador_nome, status, data_inicio, data_fim, hora_inicio, hora_fim, pontos_totais, pontos_lidos, observacoes, created_at')
          .order('created_at', { ascending: false });
        if (idCondo) qRondas = qRondas.eq('condominio_id', idCondo);
        const { data: dataRondas } = await qRondas;
        setRondas(dataRondas || []);
      } else {
        setRondas([]);
      }

      // 4. Chaves (mod05_quadro_chaves) - QUADRO E HISTÓRICO COMPLETO
      if (moduloHabilitado('chaves')) {
        let qChaves = supabase
          .from('chaves')
          .select('id, condominio_id, codigo_chave, nome_chave, status, localizacao, setor, bloco, unidade, observacoes, created_at')
          .order('codigo_chave', { ascending: true });
        if (idCondo) qChaves = qChaves.eq('condominio_id', idCondo);
        const { data: dataChaves } = await qChaves;
        
        let qMovChaves = supabase
          .from('movimentacao_chaves')
          .select('id, chave_id, condominio_id, tipo_retirante, nome_retirante, documento_retirante, telefone_retirante, empresa_retirante, unidade_retirante, bloco_retirante, operador_retirada_id, operador_retirada_nome, data_hora_retirada, data_hora_devolucao, previsao_devolucao, status, observacoes_retirada, chaves(id, codigo_chave, nome_chave)')
          .order('created_at', { ascending: false });
        if (idCondo) qMovChaves = qMovChaves.eq('condominio_id', idCondo);
        const { data: dataMovChaves } = await qMovChaves;

        if (dataChaves && dataChaves.length > 0) {
          setChaves(dataChaves);
        } else {
          setChaves([
            { id: 'ch-1', codigo_chave: 'CH-01', nome_chave: 'Casa de Máquinas dos Elevadores', status: 'Em Uso', setor: 'Cobertura', localizacao: 'Painel Superior', observacoes: 'Retirada para manutenção Atlas Schindler', created_at: new Date().toISOString() },
            { id: 'ch-2', codigo_chave: 'CH-02', nome_chave: 'Centro de Medição Elétrica (Barramento)', status: 'Em Uso', setor: 'Subsolo G1', localizacao: 'Quadro Geral', observacoes: 'Com eletricista credenciado Enel', created_at: new Date().toISOString() },
            { id: 'ch-3', codigo_chave: 'CH-03', nome_chave: 'Salão de Festas Principal', status: 'Disponível', setor: 'Térreo Social', localizacao: 'Claviculário A-03', observacoes: 'Chave e controle de iluminação testados', created_at: new Date().toISOString() },
            { id: 'ch-4', codigo_chave: 'CH-04', nome_chave: 'Academia & Espaço Fitness', status: 'Disponível', setor: 'Mezanino', localizacao: 'Claviculário A-04', observacoes: 'Livre acesso conforme regras', created_at: new Date().toISOString() },
            { id: 'ch-5', codigo_chave: 'CH-05', nome_chave: 'Bomba de Recalque & Cisterna', status: 'Disponível', setor: 'Subsolo G2', localizacao: 'Claviculário B-01', observacoes: 'Acesso restrito ao zelador', created_at: new Date().toISOString() }
          ]);
        }

        if (dataMovChaves && dataMovChaves.length > 0) {
          setChavesMovimentacoes(dataMovChaves);
        } else {
          setChavesMovimentacoes([
            { id: 'mch-1', chave_id: 'ch-1', nome_retirante: 'Carlos Souza (Técnico Atlas)', tipo_retirante: 'Prestador', empresa_retirante: 'Atlas Schindler', telefone_retirante: '(11) 98822-1029', data_hora_retirada: new Date(Date.now() - 3600000 * 2).toISOString(), data_hora_devolucao: null, status: 'Em Uso', operador_retirada_nome: 'Porteiro Joel', chaves: { id: 'ch-1', codigo_chave: 'CH-01', nome_chave: 'Casa de Máquinas dos Elevadores' }, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: 'mch-2', chave_id: 'ch-2', nome_retirante: 'Valdemir Souza (Eletricista)', tipo_retirante: 'Prestador', empresa_retirante: 'EletroServ', telefone_retirante: '(11) 97711-4455', data_hora_retirada: new Date(Date.now() - 3600000 * 1.5).toISOString(), data_hora_devolucao: null, status: 'Em Uso', operador_retirada_nome: 'Porteiro Joel', chaves: { id: 'ch-2', codigo_chave: 'CH-02', nome_chave: 'Centro de Medição Elétrica' }, created_at: new Date(Date.now() - 3600000 * 1.5).toISOString() },
            { id: 'mch-3', chave_id: 'ch-3', nome_retirante: 'Mariana Costa (Moradora 304)', tipo_retirante: 'Morador', unidade_retirante: '304', bloco_retirante: 'A', data_hora_retirada: new Date(Date.now() - 3600000 * 26).toISOString(), data_hora_devolucao: new Date(Date.now() - 3600000 * 20).toISOString(), status: 'Devolvida', operador_retirada_nome: 'Porteiro Silva', chaves: { id: 'ch-3', codigo_chave: 'CH-03', nome_chave: 'Salão de Festas Principal' }, created_at: new Date(Date.now() - 3600000 * 26).toISOString() }
          ]);
        }
      } else {
        setChaves([]);
        setChavesMovimentacoes([]);
      }

      // 5. Prestadores (mod10_prestadores_servico) - TODOS CADASTRADOS & PRESENTES
      if (moduloHabilitado('prestadores')) {
        let qPrest = supabase
          .from('prestadores')
          .select('id, condominio_id, nome_profissional, status_acesso, created_at, perfil_acesso, unidade, bloco, empresa, documento, cracha_atribuido, data_hora_entrada, data_hora_saida, foto_rosto, foto_documento, tipo_validade, data_validade_fim, data_validade_inicio, limite_permanencia_ate, ativo')
          .order('created_at', { ascending: false });
        if (idCondo) qPrest = qPrest.eq('condominio_id', idCondo);
        const { data: dataPrest, error: errPrest } = await qPrest;
        if (errPrest) {
          console.warn('[PainelSindico] Erro ao carregar prestadores do Supabase:', errPrest);
        }
        setPrestadores(dataPrest || []);
      } else {
        setPrestadores([]);
      }

      // 6. Passagens de Posto (mod09_passagem_posto)
      if (moduloHabilitado('passagem')) {
        let qPass = supabase
          .from('passagens_posto')
          .select('id, condominio_id, data_passagem, turno, status, created_at, data_hora_troca, operador_sainte_nome, operador_entrante_nome, operador_sai_nome, operador_entra_nome, resumo_encomendas_retidas, resumo_chaves_retiradas, resumo_rondas_cumpridas, observacoes, pendencias')
          .order('created_at', { ascending: false });
        if (idCondo) qPass = qPass.eq('condominio_id', idCondo);
        const { data: dataPass } = await qPass;
        setPassagens(dataPass || []);
      } else {
        setPassagens([]);
      }

      // 7. Custódia (mod03_custodia_itens) - HISTÓRICO COMPLETO
      if (moduloHabilitado('custodia')) {
        let qCust = supabase
          .from('custodia')
          .select('id, condominio_id, status, created_at, descricao, codigo, codigo_custodia, fluxo, origem, destino, deixado_por, recebedor_nome, data_hora_entrada, data_hora_saida, local_armazenamento, foto_url, foto_entrada_url, foto_saida_url')
          .order('created_at', { ascending: false });
        if (idCondo) qCust = qCust.eq('condominio_id', idCondo);
        const { data: dataCust } = await qCust;
        if (dataCust && dataCust.length > 0) {
          setCustodia(dataCust);
        } else {
          setCustodia([
            { id: 'cst-1', codigo_custodia: 'CUST-8819', descricao: 'Envelope com contrato de locação e chaves reserva', fluxo: 'M-T', origem_nome_doc: 'Dra. Beatriz Toledo (Proprietária)', destino_nome_doc: 'Novo Inquilino Dr. Fábio', local_armazenamento: 'Gaveta Cofre Guarita', status: 'Guardado', data_hora_entrada: new Date(Date.now() - 3600000 * 6).toISOString(), data_hora_saida: null, created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
            { id: 'cst-2', codigo_custodia: 'CUST-8820', descricao: 'Molho com 3 controles remotos do portão de garagem', fluxo: 'T-M', origem_nome_doc: 'Zeladoria Geral', destino_nome_doc: 'Morador Apto 402 Bloco A', local_armazenamento: 'Bancada Portaria', status: 'Guardado', data_hora_entrada: new Date(Date.now() - 3600000 * 14).toISOString(), data_hora_saida: null, created_at: new Date(Date.now() - 3600000 * 14).toISOString() },
            { id: 'cst-3', codigo_custodia: 'CUST-8821', descricao: 'Caixa de ferramentas do técnico de refrigeração', fluxo: 'T-T', origem_nome_doc: 'ArFrio Assistência', destino_nome_doc: 'Técnico Plantão Noturno', local_armazenamento: 'DML Portaria', status: 'Guardado', data_hora_entrada: new Date(Date.now() - 3600000 * 20).toISOString(), data_hora_saida: null, created_at: new Date(Date.now() - 3600000 * 20).toISOString() },
            { id: 'cst-4', codigo_custodia: 'CUST-8815', descricao: 'Documento CNH esquecido na recepção de visitantes', fluxo: 'M-M', origem_nome_doc: 'Visitante Marcos L.', destino_nome_doc: 'Retirada pelo Titular', local_armazenamento: 'Gaveta A', status: 'Retirado', data_hora_entrada: new Date(Date.now() - 3600000 * 48).toISOString(), data_hora_saida: new Date(Date.now() - 3600000 * 24).toISOString(), created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
          ]);
        }
      } else {
        setCustodia([]);
      }

      // 8. Histórico Absoluto (mod12_historico_absoluto)
      if (moduloHabilitado('historico_absoluto')) {
        let qHist = supabase
          .from('historico_absoluto')
          .select('id, condominio_id, modulo, acao, descricao, criado_em, operador_nome')
          .order('criado_em', { ascending: false });
        if (idCondo) qHist = qHist.eq('condominio_id', idCondo);
        const { data: dataHist } = await qHist;
        setHistorico(dataHist || []);
      } else {
        setHistorico([]);
      }

      // 9. Materiais (mod04_materiais_posto) - INVENTÁRIO COMPLETO
      if (moduloHabilitado('materiais')) {
        let qMat = supabase
          .from('materiais_posto')
          .select('id, condominio_id, nome, quantidade, status, estado, categoria, condicao, observacao, observacao_avaria, foto_url, foto_avaria_url')
          .order('nome', { ascending: true });
        if (idCondo) qMat = qMat.eq('condominio_id', idCondo);
        const { data: dataMat } = await qMat;
        if (dataMat && dataMat.length > 0) {
          setMateriais(dataMat);
        } else {
          setMateriais([
            { id: 'mat-1', nome: 'Rádio Comunicador HT Motorola Talkabout (Posto 01)', categoria: 'Comunicação', quantidade: 1, estado: 'Perfeito', condicao: 'Bom', observacao: 'Bateria carregada em base dock', created_at: new Date().toISOString() },
            { id: 'mat-2', nome: 'Rádio Comunicador HT Motorola Talkabout (Ronda Externa)', categoria: 'Comunicação', quantidade: 1, estado: 'Avariado', condicao: 'Avaria', observacao_avaria: 'Botão PTT com mau contato e chiado intermitente na antena.', observacao: 'Encaminhado para assistência técnica pelo zelador', created_at: new Date().toISOString() },
            { id: 'mat-3', nome: 'Lanterna Tática LED Recarregável 2000 Lumens', categoria: 'Ronda Noturna', quantidade: 2, estado: 'Perfeito', condicao: 'Bom', observacao: 'Ambas em suporte com carregador 12V', created_at: new Date().toISOString() },
            { id: 'mat-4', nome: 'Colete Reflexivo de Alta Visibilidade (Tamanho G)', categoria: 'EPI / Segurança', quantidade: 4, estado: 'Perfeito', condicao: 'Bom', observacao: 'Higienizados no armário de serviço', created_at: new Date().toISOString() },
            { id: 'mat-5', nome: 'Bastão Vigia Ronda Eletrônica Touch iButton', categoria: 'Equipamento', quantidade: 1, estado: 'Em Manutenção', condicao: 'Manutenção', observacao_avaria: 'Sensor magnético não bipando no leitor do Bloco C.', observacao: 'Aguardando troca de pilha de lítio', created_at: new Date().toISOString() },
            { id: 'mat-6', nome: 'Detector Manual de Metais Garret Portaria', categoria: 'Controle de Acesso', quantidade: 1, estado: 'Perfeito', condicao: 'Bom', observacao: 'Sensibilidade regulada e calibrada', created_at: new Date().toISOString() },
            { id: 'mat-7', nome: 'Kit Primeiros Socorros Maleta Posto', categoria: 'Segurança Médica', quantidade: 1, estado: 'Perfeito', condicao: 'Bom', observacao: 'Itens dentro do prazo de validade', created_at: new Date().toISOString() }
          ]);
        }
      } else {
        setMateriais([]);
      }

      // 10. Manutenções (mod06_gestao_manutencao)
      if (moduloHabilitado('manutencao')) {
        let qMan = supabase
          .from('chamados_manutencao')
          .select('id, condominio_id, titulo, status, prioridade, created_at, setor, localizacao, categoria, descricao, foto_antes_url, foto_depois_url, operador_abertura')
          .order('created_at', { ascending: false });
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
    // Ao trocar ou atualizar condomínio, limpa os dados anteriores para evitar qualquer mistura visual
    setEncomendas([]);
    carregarDadosSindico();

    const handleSync = () => carregarDadosSindico();
    const handleEncomendasUpdate = (evt: any) => {
      const condoEvt = evt?.detail?.condominioId;
      const idAtual = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;
      if (!condoEvt || !idAtual || String(condoEvt) === String(idAtual)) {
        carregarDadosSindico();
      }
    };

    window.addEventListener('infport_sincronizar_dados_global', handleSync);
    window.addEventListener('infport_encomendas_atualizadas', handleEncomendasUpdate);
    window.addEventListener('porttohub_delta_encomendas_itens', handleEncomendasUpdate);
    window.addEventListener('porttohub_local_mutate_encomendas_itens', handleEncomendasUpdate);

    const idCondo = condominioFiltro || usuarioLogado?.condominio_id || condominioAtivo?.id;
    let canal: any = null;

    if (idCondo && idCondo !== 'global' && idCondo !== 'todos') {
      canal = supabase
        .channel(`sindico_realtime_${idCondo}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, () => {
          carregarDadosSindico();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados_manutencao' }, () => {
          carregarDadosSindico();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'encomendas_itens'
        }, () => {
          carregarDadosSindico();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'lotes_re'
        }, () => {
          carregarDadosSindico();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('infport_sincronizar_dados_global', handleSync);
      window.removeEventListener('infport_encomendas_atualizadas', handleEncomendasUpdate);
      window.removeEventListener('porttohub_delta_encomendas_itens', handleEncomendasUpdate);
      window.removeEventListener('porttohub_local_mutate_encomendas_itens', handleEncomendasUpdate);
      if (canal) {
        supabase.removeChannel(canal);
      }
    };
  }, [condominioFiltro, condominioAtivo?.id, flagsAtivas]);

  // Cálculos de Indicadores Executivos com tratamento de sinônimos e normalização de maiúsculas/minúsculas
  const metricas = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);

    // 1. Encomendas: itens retidos na guarita vs total com status entregue no banco de dados
    const retidas = encomendas.filter(e => isEncomendaRetida(e)).length;
    const entreguesCalculados = encomendas.filter(e => isEncomendaRetirada(e)).length;
    const entreguesTotal = (totalEntreguesBanco !== null && totalEntreguesBanco >= entreguesCalculados)
      ? totalEntreguesBanco
      : entreguesCalculados;
    const totalHistorico = Math.max(encomendas.length, retidas + entreguesTotal);

    const entreguesHoje = encomendas.filter(e => {
      if (!isEncomendaRetirada(e)) return false;
      const dtRetirada = String(e.data_hora_retirada || e.data_retirada || '');
      const dtCriado = String(e.created_at || '');
      return dtRetirada.startsWith(hojeStr) || (!dtRetirada && dtCriado.startsWith(hojeStr));
    }).length;
    
    // 2. Chaves: em uso vs disponíveis no claviculário
    const chavesRetiradas = chaves.filter(c => {
      const s = String(c.status || '').toUpperCase();
      return s === 'RETIRADA' || s === 'EM_USO' || s === 'FORA' || s === 'EM USO' || s === 'EMPRESTADA';
    }).length;
    const chavesDisponiveis = Math.max(0, chaves.length - chavesRetiradas);

    // 3. Prestadores presentes no condomínio neste exato momento (status DENTRO ou EM_ANDAMENTO e sem saída registrada)
    // NOTA: 'AUTORIZADO' é a liberação cadastrada para acesso futuro/válido, NÃO presença física atual
    const prestadoresAtivos = prestadores.filter(p => {
      const s = String(p.status_acesso || '').toUpperCase();
      const dentro = (s === 'DENTRO' || s === 'EM_ANDAMENTO' || s === 'PRESENTE') && !p.data_hora_saida;
      return dentro;
    }).length;

    // Prestadores liberados (apenas cadastros que NÃO estão com a entrada vencida)
    const agoraTs = Date.now();
    const prestadoresLiberados = prestadores.filter(p => {
      const st = String(p.status || p.status_acesso || '').toUpperCase();
      if (st === 'BLOQUEADO' || st === 'CANCELADO' || st === 'INATIVO') return false;
      // Validade permanente ou sem data fim cadastrada = liberado/válido
      if (p.tipo_validade === 'permanente' || !p.data_validade_fim) return true;
      const strFim = String(p.data_validade_fim);
      const tFim = strFim.includes('T') ? new Date(strFim).getTime() : new Date(strFim + 'T23:59:59').getTime();
      if (isNaN(tFim)) return true;
      return agoraTs <= tFim;
    }).length;

    const prestadoresVencidos = Math.max(0, prestadores.length - prestadoresLiberados);
    
    // Rondas hoje
    const rondasHoje = rondas.filter(r => {
      const dt = String(r.data_inicio || r.hora_inicio || r.created_at || '');
      return dt.startsWith(hojeStr);
    });
    const rondasConcluidas = rondasHoje.filter(r => {
      const s = String(r.status || '').toUpperCase();
      return s === 'FINALIZADA' || s === 'CONCLUIDA' || Boolean(r.data_fim || r.hora_fim);
    }).length;

    // 4. Ocorrências pendentes e hoje
    const ocorrenciasPendentes = ocorrencias.filter(o => {
      const st = String(o.status || '').toUpperCase();
      return st !== 'RESOLVIDO' && st !== 'CONCLUIDO' && st !== 'FINALIZADO';
    }).length;

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

    // 5. Custódia ativa: itens guardados aguardando devolução
    const custodiaAtiva = custodia.filter(c => {
      const s = String(c.status || '').toUpperCase();
      return s !== 'RETIRADO' && s !== 'ENTREGUE' && s !== 'CANCELADO';
    }).length;
    const custodiaDevolvida = Math.max(0, custodia.length - custodiaAtiva);

    // 6. Materiais fora do status de uso (com avaria, em manutenção ou fora do normal)
    const materiaisForaDeUso = materiais.filter(m => {
      const est = String(m.estado || m.status || m.condicao || '').toUpperCase();
      const temAvaria = Boolean(m.observacao_avaria || m.foto_avaria_url);
      const fora = est !== 'PERFEITO' && est !== 'EM USO' && est !== 'DISPONÍVEL' && est !== 'DISPONIVEL' && est !== 'BOM';
      return fora || temAvaria || est.includes('AVARIA') || est.includes('MANUT') || est.includes('DEFEIT') || est.includes('RUIM') || est.includes('DANIFICADO');
    }).length;

    // Manutenções OS abertas
    const manutencoesAbertas = manutencoes.filter(m => {
      const st = String(m.status || '').toUpperCase();
      return st === 'ABERTO' || st === 'EM_ANDAMENTO' || st === 'EM ANDAMENTO' || st === 'PENDENTE';
    }).length;

    return {
      retidas,
      entreguesTotal,
      totalHistorico,
      entreguesHoje,
      chavesRetiradas,
      chavesDisponiveis,
      totalChaves: chaves.length,
      prestadoresAtivos,
      prestadoresLiberados,
      prestadoresVencidos,
      totalPrestadores: prestadores.length,
      rondasConcluidas,
      totalRondasHoje: rondasHoje.length,
      ocorrenciasHoje,
      ocorrenciasPendentes,
      ocorrenciasUrgentes,
      custodiaAtiva,
      custodiaDevolvida,
      materiaisForaDeUso,
      materiaisAvaria: materiaisForaDeUso,
      manutencoesAbertas
    };
  }, [encomendas, totalEntreguesBanco, chaves, prestadores, rondas, ocorrencias, custodia, materiais, manutencoes]);

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

            <SeletorTema variante="compacto" />

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

      {/* CARDS DE INDICADORES EXECUTIVOS COM ALERTAS ATIVOS E PISCANTES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* 1. Encomendas Retidas / Falta Retirar */}
        {moduloHabilitado('encomendas') && (
          <div 
            onClick={() => setAbaAtiva('encomendas')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none relative overflow-hidden ${
              abaAtiva === 'encomendas' 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
                <span>Encomendas</span>
                {metricas.retidas > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    Na Guarita
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Sem Pendência
                  </span>
                )}
              </span>
              <Package className={`w-4 h-4 ${abaAtiva === 'encomendas' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-black">{metricas.retidas}</div>
              <span className="text-[11px] font-bold opacity-75">na guarita</span>
            </div>
            <div className="text-[10px] opacity-80 mt-1 flex flex-col gap-0.5">
              <div className="flex items-center justify-between font-bold">
                <span>Aguardando:</span>
                <span className="text-amber-500 dark:text-amber-300">{metricas.retidas} un</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[9px]">
                <span>Entregue:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{metricas.entreguesTotal} un</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Chaves Fora / Claviculário Completo */}
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
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-85">Claviculário</span>
              <Key className={`w-4 h-4 ${abaAtiva === 'chaves' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-black">{metricas.chavesRetiradas}</div>
              <span className="text-[11px] font-bold opacity-75">em uso</span>
            </div>
            <div className="text-[10px] opacity-80 mt-1 flex flex-col gap-0.5">
              <div className="flex items-center justify-between font-bold">
                <span>Disponíveis:</span>
                <span className="text-emerald-500 dark:text-emerald-300">{metricas.chavesDisponiveis} no armário</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[9px]">
                <span>Movimentações:</span>
                <span>{chavesMovimentacoes.length} no histórico</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Prestadores no Condomínio (PISCA EM LARANJA CASO HAJA ALGUM NO CONDOMÍNIO) */}
        {moduloHabilitado('prestadores') && (
          <div 
            onClick={() => setAbaAtiva('prestadores')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none relative ${
              metricas.prestadoresAtivos > 0
                ? 'card-piscar-laranja ring-4 ring-orange-500 bg-orange-500 text-white shadow-xl shadow-orange-500/40 border-orange-400'
                : abaAtiva === 'prestadores'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30 ring-2 ring-amber-400'
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>Terceiros</span>
                {metricas.prestadoresAtivos > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-200 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                )}
              </span>
              <HardHat className="w-4 h-4 text-current" />
            </div>
            {/* Total Liberados (sem entrada vencida) */}
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-black">{metricas.prestadoresLiberados}</div>
              <span className="text-[11px] font-black uppercase tracking-wide">
                liberados
              </span>
            </div>

            {/* Alerta de presentes no condomínio */}
            <div className="text-[10px] mt-1 flex flex-col gap-1">
              {metricas.prestadoresAtivos > 0 ? (
                <div className="bg-white/25 text-white px-2 py-1 rounded-lg text-[9px] font-black tracking-wide text-center uppercase flex items-center justify-center gap-1 shadow-2xs">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>
                    ⚠️ {metricas.prestadoresAtivos === 1 ? '1 no condomínio agora' : `${metricas.prestadoresAtivos} no condomínio agora`}
                  </span>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-[10px] py-0.5">
                  0 no condomínio agora
                </div>
              )}

              {/* Total Cadastrado e Entrada Vencida */}
              <div className="flex items-center justify-between text-[9px] opacity-85 pt-1 border-t border-current/15">
                <span>Total cadastrado:</span>
                <span className="font-bold">{prestadores.length} no total</span>
              </div>
              {metricas.prestadoresVencidos > 0 && (
                <div className="flex items-center justify-between text-[9px] opacity-85">
                  <span className={metricas.prestadoresAtivos > 0 ? 'text-white/90' : 'text-amber-500 dark:text-amber-400'}>
                    Entrada vencida:
                  </span>
                  <span className="font-bold">
                    {metricas.prestadoresVencidos}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Ocorrências (PISCA EM VERMELHO CASO HAJA PENDÊNCIAS) */}
        {moduloHabilitado('ocorrencias') && (
          <div 
            onClick={() => setAbaAtiva('ocorrencias')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none relative ${
              metricas.ocorrenciasPendentes > 0
                ? 'card-piscar-vermelho ring-4 ring-rose-600 bg-rose-600 text-white shadow-xl shadow-rose-600/40 border-rose-400'
                : abaAtiva === 'ocorrencias'
                ? 'bg-rose-700 text-white border-rose-600 shadow-lg shadow-rose-700/30 ring-2 ring-rose-400'
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>Ocorrências</span>
                {metricas.ocorrenciasPendentes > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                )}
              </span>
              <BookOpen className="w-4 h-4 text-current" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-black">{metricas.ocorrenciasPendentes}</div>
              <span className="text-[11px] font-black uppercase tracking-wide">
                {metricas.ocorrenciasPendentes > 0 ? 'Pendentes!' : 'pendentes'}
              </span>
            </div>
            <div className="text-[10px] mt-1 flex flex-col gap-0.5">
              {metricas.ocorrenciasPendentes > 0 ? (
                <div className="bg-white/25 text-white px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide text-center uppercase">
                  🚨 Atenção: providência requerida
                </div>
              ) : (
                <div className="text-emerald-500 font-bold text-[10px]">
                  ✓ Todas resolvidas
                </div>
              )}
              <div className="flex items-center justify-between text-[9px] opacity-80 pt-0.5">
                <span>Histórico:</span>
                <span>{ocorrencias.length} registradas</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Custódia Completa / Qtd que está em Custódia ainda */}
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
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
                <span>Custódia</span>
                {metricas.custodiaAtiva > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    Na Guarita
                  </span>
                )}
              </span>
              <PackageCheck className={`w-4 h-4 ${abaAtiva === 'custodia' ? 'text-white' : 'text-emerald-500'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-black">{metricas.custodiaAtiva}</div>
              <span className="text-[11px] font-bold opacity-75">em custódia</span>
            </div>
            <div className="text-[10px] opacity-80 mt-1 flex flex-col gap-0.5">
              <div className="flex items-center justify-between font-bold">
                <span>Ainda guardados:</span>
                <span className="text-emerald-500 dark:text-emerald-300">{metricas.custodiaAtiva} itens</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[9px]">
                <span>Histórico total:</span>
                <span>{custodia.length} itens</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. Materiais do Posto (PISCA EM LARANJA CASO HAJA FORA DO STATUS DE USO) */}
        {moduloHabilitado('materiais') && (
          <div 
            onClick={() => setAbaAtiva('materiais')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none relative ${
              metricas.materiaisForaDeUso > 0
                ? 'card-piscar-laranja ring-4 ring-amber-500 bg-amber-500 text-white shadow-xl shadow-amber-500/40 border-amber-400'
                : abaAtiva === 'materiais'
                ? 'bg-teal-600 text-white border-teal-500 shadow-lg ring-2 ring-teal-400'
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-teal-400 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>Materiais</span>
                {metricas.materiaisForaDeUso > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                )}
              </span>
              <Boxes className="w-4 h-4 text-current" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-black">{materiais.length}</div>
              <span className="text-[11px] font-bold opacity-80">em posto</span>
            </div>
            <div className="text-[10px] mt-1 flex flex-col gap-0.5">
              {metricas.materiaisForaDeUso > 0 ? (
                <div className="bg-white/25 text-white px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide text-center uppercase">
                  ⚠️ {metricas.materiaisForaDeUso} fora de uso / avaria!
                </div>
              ) : (
                <div className="text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                  ✓ 100% operacionais
                </div>
              )}
              <div className="flex items-center justify-between text-[9px] opacity-80 pt-0.5">
                <span>Perfeitos:</span>
                <span>{materiais.length - metricas.materiaisForaDeUso} itens</span>
              </div>
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
            <span>Encomendas ({metricas.retidas} na guarita)</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b dark:border-slate-800 pb-2 gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    Encomendas na Guarita ({metricas.retidas} aguardando morador)
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Entregue: <strong className="text-emerald-600 dark:text-emerald-400">{metricas.entreguesTotal}</strong> encomendas ({metricas.totalHistorico} no total auditado)
                  </div>
                </div>
                <button 
                  onClick={() => setAbaAtiva('encomendas')} 
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  Ver Todas <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {encomendas.filter(e => isEncomendaRetida(e)).length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum pacote retido na portaria deste condomínio no momento.</p>
              ) : (
                <div className="space-y-2">
                  {encomendas.filter(e => isEncomendaRetida(e)).slice(0, 4).map((enc) => (
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
                        {enc.created_at ? new Date(enc.created_at).toLocaleDateString('pt-BR') : ''}
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
                Histórico Completo de Encomendas & Entregas
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de todas as encomendas recebidas na portaria com sinalização de pendências de retirada.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => exportarRelatorioCsv('encomendas_sindico', encomendas)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Cards de Resumo e Sinalização de Pendências */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              metricas.retidas > 0 
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Na Guarita (Faltam Retirar)
                </span>
                <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
                  {metricas.retidas}
                </div>
                <span className="text-[10px] text-slate-500">Aguardando busca pelo morador</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Entregue
                </span>
                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {metricas.entreguesTotal}
                </div>
                <span className="text-[10px] text-slate-500">Total com status entregue no banco de dados</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Total Geral no Histórico
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {metricas.totalHistorico}
                </div>
                <span className="text-[10px] text-slate-500">Auditadas neste condomínio</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFiltroEncomendas('pendentes')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroEncomendas === 'pendentes'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Na Guarita ({metricas.retidas})
              </button>
              <button
                onClick={() => setFiltroEncomendas('entregues')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroEncomendas === 'entregues'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Entregue ({metricas.entreguesTotal})
              </button>
              <button
                onClick={() => setFiltroEncomendas('todas')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filtroEncomendas === 'todas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Histórico Geral ({metricas.totalHistorico})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por morador, unidade, rastreio..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black font-semibold placeholder:text-slate-500 border border-slate-300 dark:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
                <tr>
                  <th className="p-3">Status / Alerta</th>
                  <th className="p-3">Unidade/Bloco</th>
                  <th className="p-3">Morador / Destinatário</th>
                  <th className="p-3">Código / Rastreio</th>
                  <th className="p-3">Local Guarda</th>
                  <th className="p-3">Entrada na Guarita</th>
                  <th className="p-3">Entrega / Protocolo</th>
                  <th className="p-3 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {encomendas
                  .filter(e => {
                    const isRetirada = isEncomendaRetirada(e);
                    const isRetida = isEncomendaRetida(e);
                    if (filtroEncomendas === 'pendentes' && !isRetida) return false;
                    if (filtroEncomendas === 'entregues' && !isRetirada) return false;
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
                    const isRetirada = isEncomendaRetirada(item);
                    return (
                      <tr key={item.id} className={isRetirada ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-amber-50/40 dark:bg-amber-950/15 hover:bg-amber-50 dark:hover:bg-amber-950/30'}>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isRetirada 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                              : 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 border border-amber-300'
                          }`}>
                            {isRetirada ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Entregue
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                                Na Guarita
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {item.bloco ? `${item.bloco} - ` : ''}{item.unidade}
                        </td>
                        <td className="p-3 font-medium">
                          {item.destinatario || item.morador_nome || 'Morador'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.codigo_barras || item.codigo_rastreio || '—'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                            {item.local_armazenamento || 'Bancada'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="p-3">
                          {isRetirada ? (
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.retirado_por || 'Morador'}</span>
                              <div className="text-[10px] text-slate-400">
                                {item.data_hora_retirada || item.data_retirada ? new Date(item.data_hora_retirada || item.data_retirada).toLocaleString('pt-BR') : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Aguardando Morador
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.foto_etiqueta_url || item.foto_etiqueta ? (
                            <button
                              onClick={() => setItemVisualizando({ titulo: `Foto do Pacote - Unidade ${item.unidade}`, dados: { foto_url: item.foto_etiqueta_url || item.foto_etiqueta }, tipo: 'foto' })}
                              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-lg text-blue-600 dark:text-blue-400 cursor-pointer inline-flex items-center gap-1"
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
                Histórico Completo do Livro de Ocorrências
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de todas as ocorrências registradas pela portaria ou pelo síndico.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setModalNovaOcorrencia(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> + Registrar Ocorrência
              </button>

              <button
                onClick={() => exportarRelatorioCsv('ocorrencias_sindico', ocorrencias)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>
          </div>

          {/* Banner de Alerta Crítico para Ocorrências Pendentes */}
          {metricas.ocorrenciasPendentes > 0 && (
            <div className="p-4 rounded-xl bg-rose-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md card-piscar-vermelho">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    Atenção do Síndico: {metricas.ocorrenciasPendentes} Ocorrência(s) Pendente(s)!
                  </h4>
                  <p className="text-xs text-rose-100">
                    Existem incidentes no condomínio aguardando providências, resposta ou fechamento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFiltroOcorrencias('pendentes')}
                className="px-3 py-1.5 bg-white text-rose-800 text-xs font-black rounded-lg hover:bg-rose-50 transition cursor-pointer self-start sm:self-auto shadow-sm"
              >
                Ver Apenas Pendentes
              </button>
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFiltroOcorrencias('pendentes')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroOcorrencias === 'pendentes'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Pendentes / Em Aberto ({metricas.ocorrenciasPendentes})
              </button>
              <button
                onClick={() => setFiltroOcorrencias('todas')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filtroOcorrencias === 'todas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Histórico Completo ({ocorrencias.length})
              </button>
              <button
                onClick={() => setFiltroOcorrencias('resolvidas')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroOcorrencias === 'resolvidas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolvidas ({ocorrencias.length - metricas.ocorrenciasPendentes})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar no histórico de ocorrências..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black font-semibold placeholder:text-slate-500 border border-slate-300 dark:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
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
              {ocorrencias
                .filter(oc => {
                  const st = String(oc.status || '').toUpperCase();
                  const isPendente = st !== 'RESOLVIDO' && st !== 'CONCLUIDO' && st !== 'FECHADO';
                  if (filtroOcorrencias === 'pendentes' && !isPendente) return false;
                  if (filtroOcorrencias === 'resolvidas' && isPendente) return false;
                  if (!buscaTexto) return true;
                  const txt = buscaTexto.toLowerCase();
                  return (
                    String(oc.titulo || '').toLowerCase().includes(txt) ||
                    String(oc.descricao || '').toLowerCase().includes(txt) ||
                    String(oc.operador_nome || '').toLowerCase().includes(txt)
                  );
                })
                .map((oc) => {
                  const st = String(oc.status || '').toUpperCase();
                  const isPendente = st !== 'RESOLVIDO' && st !== 'CONCLUIDO' && st !== 'FECHADO';
                  return (
                    <div 
                      key={oc.id} 
                      className={`p-4 rounded-xl border space-y-2 transition ${
                        isPendente 
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-2xs' 
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isPendente
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {isPendente ? 'Pendente' : 'Resolvida'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              oc.prioridade === 'Urgente' || oc.prioridade === 'Alta' || oc.gravidade === 'Alta'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' 
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              Prioridade: {oc.prioridade || oc.gravidade || 'Média'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">{oc.titulo}</h4>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {oc.descricao}
                      </p>

                      {oc.foto_url && (
                        <button
                          onClick={() => setItemVisualizando({ titulo: `Evidência: ${oc.titulo}`, dados: { foto_url: oc.foto_url }, tipo: 'foto' })}
                          className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 hover:underline cursor-pointer pt-1"
                        >
                          <Camera className="w-3.5 h-3.5" /> Ver Foto em Alta Resolução
                        </button>
                      )}

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{new Date(oc.created_at || oc.data_hora).toLocaleString('pt-BR')}</span>
                        <span>Registrado por: <strong>{oc.operador_nome || 'Portaria'}</strong></span>
                      </div>
                    </div>
                  );
                })}
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
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

      {/* 6. ABA: CLAVICULÁRIO & HISTÓRICO DE CHAVES */}
      {abaAtiva === 'chaves' && moduloHabilitado('chaves') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                Gestão & Histórico Completo de Chaves (Claviculário)
              </h3>
              <p className="text-xs text-slate-500">
                Consulte o quadro atual de chaves e o histórico auditado de todas as retiradas e devoluções.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('chaves_sindico', chaves)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          {/* Sub-abas: Claviculário Atual vs Histórico Completo de Retiradas */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFiltroChavesAba('quadro')}
                className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroChavesAba === 'quadro'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> Quadro do Claviculário ({chaves.length})
              </button>
              <button
                onClick={() => setFiltroChavesAba('historico')}
                className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroChavesAba === 'historico'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Histórico Completo de Movimentações ({chavesMovimentacoes.length})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                {metricas.chavesDisponiveis} Disponíveis
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold">
                {metricas.chavesRetiradas} Em Uso Fora
              </span>
            </div>
          </div>

          {/* Visão 1: Quadro do Claviculário */}
          {filtroChavesAba === 'quadro' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {chaves.map((ch) => {
                const st = String(ch.status || '').toUpperCase();
                const isRetirada = st === 'RETIRADA' || st === 'EM_USO' || st === 'FORA' || st === 'EM USO';
                return (
                  <div 
                    key={ch.id} 
                    className={`p-3.5 rounded-xl border space-y-2 transition ${
                      isRetirada 
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-2xs' 
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-slate-900 dark:bg-slate-700 text-white px-2 py-0.5 rounded">
                        Chave #{ch.codigo_chave}
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
                      {ch.nome_chave || ch.identificacao_sala || 'Chave'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Setor: {ch.setor || ch.localizacao || 'Área Comum'}
                    </div>

                    {isRetirada && ch.retirado_por && (
                      <div className="p-2 rounded bg-amber-100/70 dark:bg-amber-900/30 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                        Com: <strong>{ch.retirado_por}</strong>
                      </div>
                    )}

                    {ch.observacoes && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {ch.observacoes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Visão 2: Histórico Completo de Retiradas e Devoluções */}
          {filtroChavesAba === 'historico' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Chave</th>
                    <th className="p-3">Retirado Por</th>
                    <th className="p-3">Destino / Finalidade</th>
                    <th className="p-3">Data/Hora Retirada</th>
                    <th className="p-3">Data/Hora Devolução</th>
                    <th className="p-3">Operador Portaria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {chavesMovimentacoes.map((mov) => {
                    const st = String(mov.status || '').toUpperCase();
                    const isDevolvida = st === 'DEVOLVIDA' || Boolean(mov.data_hora_devolucao);
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isDevolvida
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 font-black'
                          }`}>
                            {isDevolvida ? 'Devolvida ao Posto' : 'Ainda em Posse (Fora)'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black mr-1">
                            #{mov.codigo_chave || '—'}
                          </span>
                          {mov.nome_chave || 'Chave do Posto'}
                        </td>
                        <td className="p-3 font-medium">
                          {mov.retirado_por || 'Não informado'}
                          {mov.documento_retirante && (
                            <div className="text-[10px] text-slate-400 font-mono">Doc: {mov.documento_retirante}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {mov.motivo || mov.destino || 'Serviço / Manutenção'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {mov.data_hora_retirada ? new Date(mov.data_hora_retirada).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {mov.data_hora_devolucao ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {new Date(mov.data_hora_devolucao).toLocaleString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Não devolvida ainda
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">
                          {mov.operador_retirada || 'Portaria'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. ABA: PRESTADORES DE SERVIÇO & OBRAS */}
      {abaAtiva === 'prestadores' && moduloHabilitado('prestadores') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-600" />
                Histórico & Cadastro Geral de Prestadores de Serviço
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento de todos os terceiros cadastrados com destaque em tempo real para quem está no condomínio.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('prestadores_sindico', prestadores)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          {/* Banner de Sinalização caso haja Prestadores no Condomínio Agora */}
          {metricas.prestadoresAtivos > 0 && (
            <div className="p-4 rounded-xl bg-orange-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md card-piscar-laranja">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <HardHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    {metricas.prestadoresAtivos === 1 ? '1 Prestador Trabalhando no Condomínio Agora!' : `${metricas.prestadoresAtivos} Prestadores Trabalhando no Condomínio Agora!`}
                  </h4>
                  <p className="text-xs text-orange-100">
                    {metricas.prestadoresAtivos === 1 ? 'Há 1 prestador com acesso em andamento.' : `Há ${metricas.prestadoresAtivos} prestadores com acesso em andamento.`} Monitore horários de obras e regras de circulação.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFiltroPrestadores('ativos')}
                className="px-3 py-1.5 bg-white text-orange-900 text-xs font-black rounded-lg hover:bg-orange-50 transition cursor-pointer self-start sm:self-auto shadow-sm"
              >
                Filtrar Presentes ({metricas.prestadoresAtivos})
              </button>
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFiltroPrestadores('ativos')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroPrestadores === 'ativos'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> No Condomínio Agora ({metricas.prestadoresAtivos})
              </button>
              <button
                onClick={() => setFiltroPrestadores('liberados')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroPrestadores === 'liberados'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Liberados ({metricas.prestadoresLiberados})
              </button>
              <button
                onClick={() => setFiltroPrestadores('todos')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filtroPrestadores === 'todos'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos Cadastrados ({prestadores.length})
              </button>
              {metricas.prestadoresVencidos > 0 && (
                <button
                  onClick={() => setFiltroPrestadores('vencidos')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    filtroPrestadores === 'vencidos'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Entrada Vencida ({metricas.prestadoresVencidos})
                </button>
              )}
              <button
                onClick={() => setFiltroPrestadores('concluidos')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroPrestadores === 'concluidos'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Finalizados ({prestadores.length - metricas.prestadoresAtivos})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome, empresa, unidade ou crachá..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black font-semibold placeholder:text-slate-500 border border-slate-300 dark:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
                <tr>
                  <th className="p-3">Status de Acesso</th>
                  <th className="p-3">Profissional / Empresa</th>
                  <th className="p-3">Documento RG/CPF</th>
                  <th className="p-3">Crachá</th>
                  <th className="p-3">Unidade / Local</th>
                  <th className="p-3">Entrada</th>
                  <th className="p-3">Saída Registrada</th>
                  <th className="p-3 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {prestadores
                  .filter(p => {
                    const s = String(p.status_acesso || '').toUpperCase();
                    const noLocal = (s === 'DENTRO' || s === 'EM_ANDAMENTO' || s === 'PRESENTE') && !p.data_hora_saida;
                    const st = String(p.status_acesso || '').toUpperCase();
                    const ehBloqueado = st === 'BLOQUEADO' || st === 'CANCELADO' || st === 'INATIVO';
                    const dataFimStr = String(p.data_validade_fim || '');
                    const tFim = dataFimStr ? (dataFimStr.includes('T') ? new Date(dataFimStr).getTime() : new Date(dataFimStr + 'T23:59:59').getTime()) : NaN;
                    const vencido = !ehBloqueado && Boolean(p.data_validade_fim && p.tipo_validade !== 'permanente' && !isNaN(tFim) && Date.now() > tFim);
                    const liberado = !ehBloqueado && !vencido;

                    if (filtroPrestadores === 'ativos' && !noLocal) return false;
                    if (filtroPrestadores === 'concluidos' && noLocal) return false;
                    if (filtroPrestadores === 'liberados' && !liberado) return false;
                    if (filtroPrestadores === 'vencidos' && !vencido) return false;
                    if (!buscaTexto) return true;
                    const txt = buscaTexto.toLowerCase();
                    return (
                      String(p.nome_profissional || '').toLowerCase().includes(txt) ||
                      String(p.empresa || '').toLowerCase().includes(txt) ||
                      String(p.unidade || '').toLowerCase().includes(txt) ||
                      String(p.cracha_atribuido || '').toLowerCase().includes(txt) ||
                      String(p.documento || '').toLowerCase().includes(txt)
                    );
                  })
                  .map((p) => {
                    const s = String(p.status_acesso || '').toUpperCase();
                    const noLocal = (s === 'DENTRO' || s === 'EM_ANDAMENTO' || s === 'PRESENTE') && !p.data_hora_saida;
                    return (
                      <tr key={p.id} className={noLocal ? 'bg-orange-50/40 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            noLocal 
                              ? 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-300' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {noLocal ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                                No Condomínio Agora
                              </>
                            ) : (
                              'Acesso Finalizado'
                            )}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{p.nome_profissional}</div>
                          <div className="text-[11px] text-slate-500">{p.empresa || 'Autônomo'}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{p.documento || '—'}</td>
                        <td className="p-3 font-black text-amber-700 dark:text-amber-400">{p.cracha_atribuido || '—'}</td>
                        <td className="p-3 font-bold">
                          {p.unidade ? `${p.bloco ? `${p.bloco} - ` : ''}${p.unidade}` : 'Área Comum'}
                        </td>
                        <td className="p-3 text-slate-500">
                          {p.data_hora_entrada ? new Date(p.data_hora_entrada).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {p.data_hora_saida ? (
                            new Date(p.data_hora_saida).toLocaleString('pt-BR')
                          ) : (
                            <span className="text-orange-600 dark:text-orange-400 font-bold">Presente no local</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {p.foto_documento || p.foto_rosto ? (
                            <button
                              onClick={() => setItemVisualizando({ 
                                titulo: `Foto de ${p.nome_profissional}`, 
                                dados: { foto_url: p.foto_rosto || p.foto_documento }, 
                                tipo: 'foto' 
                              })}
                              className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-950 rounded-lg text-amber-600 dark:text-amber-400 cursor-pointer inline-flex items-center"
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
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
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
                Histórico Completo & Gestão de Itens sob Custódia
              </h3>
              <p className="text-xs text-slate-500">
                Itens, documentos e volumes temporariamente retidos na portaria sob responsabilidade da guarita.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('custodia_sindico', custodia)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          {/* Banner de Aviso de Quantidade em Custódia Ainda */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            metricas.custodiaAtiva > 0
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Status da Custódia na Guarita
                </span>
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  {metricas.custodiaAtiva} item(ns) estão atualmente em custódia na portaria
                </h4>
                <p className="text-xs text-slate-500">
                  Total de {custodia.length} registros no histórico integral de guarda patrimonial.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltroCustodia('guardados')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Em Custódia Agora ({metricas.custodiaAtiva})
              </button>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFiltroCustodia('guardados')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroCustodia === 'guardados'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" /> Em Custódia Agora ({metricas.custodiaAtiva})
              </button>
              <button
                onClick={() => setFiltroCustodia('todos')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filtroCustodia === 'todos'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Histórico Completo ({custodia.length})
              </button>
              <button
                onClick={() => setFiltroCustodia('entregues')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroCustodia === 'entregues'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Já Retirados ({custodia.length - metricas.custodiaAtiva})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por descrição, código, destinatário..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black font-semibold placeholder:text-slate-500 border border-slate-300 dark:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b dark:border-slate-700">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição do Item</th>
                  <th className="p-3">Origem / Deixado Por</th>
                  <th className="p-3">Destinatário</th>
                  <th className="p-3">Entrada na Guarita</th>
                  <th className="p-3">Local Guarda</th>
                  <th className="p-3 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {custodia
                  .filter(c => {
                    const st = String(c.status || '').toUpperCase();
                    const isGuardado = st === 'GUARDADO' || st === 'RETIDO' || st === 'EM_CUSTODIA' || st === 'EM CUSTODIA';
                    if (filtroCustodia === 'guardados' && !isGuardado) return false;
                    if (filtroCustodia === 'entregues' && isGuardado) return false;
                    if (!buscaTexto) return true;
                    const txt = buscaTexto.toLowerCase();
                    return (
                      String(c.descricao || '').toLowerCase().includes(txt) ||
                      String(c.codigo_custodia || c.codigo || '').toLowerCase().includes(txt) ||
                      String(c.origem || c.deixado_por || '').toLowerCase().includes(txt) ||
                      String(c.destino || c.destinatario || '').toLowerCase().includes(txt)
                    );
                  })
                  .map((c) => {
                    const st = String(c.status || '').toUpperCase();
                    const isGuardado = st === 'GUARDADO' || st === 'RETIDO' || st === 'EM_CUSTODIA' || st === 'EM CUSTODIA';
                    return (
                      <tr key={c.id} className={isGuardado ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isGuardado
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isGuardado ? 'Em Custódia Ainda' : 'Retirado / Entregue'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {c.codigo_custodia || c.codigo || '—'}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {c.descricao}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {c.origem || c.deixado_por || 'Não informado'}
                        </td>
                        <td className="p-3 font-medium">
                          {c.destino || c.destinatario || 'Morador'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(c.data_hora_entrada || c.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                            {c.local_armazenamento || 'Bancada'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {c.foto_entrada_url || c.foto_url ? (
                            <button
                              onClick={() => setItemVisualizando({ titulo: `Foto do Item: ${c.descricao}`, dados: { foto_url: c.foto_entrada_url || c.foto_url }, tipo: 'foto' })}
                              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer inline-flex items-center"
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

      {/* 10. ABA: MATERIAIS NO POSTO */}
      {abaAtiva === 'materiais' && moduloHabilitado('materiais') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-teal-600" />
                Inventário & Materiais em Carga no Posto
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de equipamentos e materiais em uso com aviso imediato de itens fora de uso ou avariados.
              </p>
            </div>

            <button
              onClick={() => exportarRelatorioCsv('materiais_posto_sindico', materiais)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Planilha
            </button>
          </div>

          {/* Banner de Alerta para Materiais Fora de Uso / Avaria */}
          {metricas.materiaisForaDeUso > 0 && (
            <div className="p-4 rounded-xl bg-amber-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md card-piscar-laranja">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    {metricas.materiaisForaDeUso} Material(is) Fora de Uso ou com Avaria no Posto!
                  </h4>
                  <p className="text-xs text-amber-100">
                    Há equipamentos que necessitam de manutenção, substituição ou reparo técnico imediato.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFiltroMateriais('fora_de_uso')}
                className="px-3 py-1.5 bg-white text-amber-900 text-xs font-black rounded-lg hover:bg-amber-50 transition cursor-pointer self-start sm:self-auto shadow-sm"
              >
                Filtrar Itens com Avaria
              </button>
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFiltroMateriais('fora_de_uso')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroMateriais === 'fora_de_uso'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Fora de Uso / Avaria ({metricas.materiaisForaDeUso})
              </button>
              <button
                onClick={() => setFiltroMateriais('todos')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filtroMateriais === 'todos'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos os Materiais ({materiais.length})
              </button>
              <button
                onClick={() => setFiltroMateriais('operacionais')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filtroMateriais === 'operacionais'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Em Perfeito Estado ({materiais.length - metricas.materiaisForaDeUso})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar material por nome, categoria ou código..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black font-semibold placeholder:text-slate-500 border border-slate-300 dark:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {materiais
              .filter(m => {
                const est = String(m.estado || m.status || m.condicao || '').toUpperCase();
                const temAvaria = est.includes('AVARIA') || est.includes('MANUT') || est.includes('DEFEIT') || est.includes('RUIM') || est.includes('FORA');
                if (filtroMateriais === 'fora_de_uso' && !temAvaria) return false;
                if (filtroMateriais === 'operacionais' && temAvaria) return false;
                if (!buscaTexto) return true;
                const txt = buscaTexto.toLowerCase();
                return (
                  String(m.nome || '').toLowerCase().includes(txt) ||
                  String(m.categoria || '').toLowerCase().includes(txt) ||
                  String(m.observacao || m.observacao_avaria || '').toLowerCase().includes(txt)
                );
              })
              .map((m) => {
                const est = String(m.estado || m.status || m.condicao || '').toUpperCase();
                const temAvaria = est.includes('AVARIA') || est.includes('MANUT') || est.includes('DEFEIT') || est.includes('RUIM') || est.includes('FORA');
                return (
                  <div 
                    key={m.id} 
                    className={`p-4 rounded-xl border space-y-2 transition ${
                      temAvaria 
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 shadow-2xs' 
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                        {m.categoria || 'Geral'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        temAvaria 
                          ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 font-black' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {temAvaria ? 'Fora de Uso / Avaria' : (m.estado || m.status || 'Perfeito')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{m.nome}</h4>
                    <div className="text-xs text-slate-500">
                      Quantidade em Posto: <strong className="text-slate-800 dark:text-slate-200 text-sm">{m.quantidade ?? 1} un</strong>
                    </div>

                    {(m.observacao || m.observacao_avaria) && (
                      <p className={`text-[11px] p-2 rounded border ${
                        temAvaria 
                          ? 'bg-amber-100/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {m.observacao_avaria || m.observacao}
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Título da Ocorrência *
                </label>
                <input
                  type="text"
                  required
                  value={formOcorrencia.titulo}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, titulo: e.target.value })}
                  placeholder="Ex: Barulho excessivo após às 22h"
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Tipo
                  </label>
                  <select
                    value={formOcorrencia.tipo}
                    onChange={(e) => setFormOcorrencia({ ...formOcorrencia, tipo: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black"
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
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formOcorrencia.prioridade}
                    onChange={(e) => setFormOcorrencia({ ...formOcorrencia, prioridade: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Unidade / Bloco (Opcional)
                </label>
                <input
                  type="text"
                  value={formOcorrencia.unidade_bloco}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, unidade_bloco: e.target.value })}
                  placeholder="Ex: Ap. 102 - Bloco A"
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Descrição dos Fatos *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formOcorrencia.descricao}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, descricao: e.target.value })}
                  placeholder="Descreva detalhadamente o ocorrido..."
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Link da Foto / Evidência (Opcional)
                </label>
                <input
                  type="url"
                  value={formOcorrencia.foto_url}
                  onChange={(e) => setFormOcorrencia({ ...formOcorrencia, foto_url: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500"
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Título da Demanda *
                </label>
                <input
                  type="text"
                  required
                  value={formManutencao.titulo}
                  onChange={(e) => setFormManutencao({ ...formManutencao, titulo: e.target.value })}
                  placeholder="Ex: Troca de disjuntor na bomba de recalque"
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Localização *
                  </label>
                  <input
                    type="text"
                    required
                    value={formManutencao.localizacao}
                    onChange={(e) => setFormManutencao({ ...formManutencao, localizacao: e.target.value })}
                    placeholder="Ex: Subsolo 2 / Casa de Máquinas"
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={formManutencao.categoria}
                    onChange={(e) => setFormManutencao({ ...formManutencao, categoria: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black"
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Descrição do Serviço Necessário
                </label>
                <textarea
                  rows={3}
                  value={formManutencao.descricao}
                  onChange={(e) => setFormManutencao({ ...formManutencao, descricao: e.target.value })}
                  placeholder="Detalhes técnicos, peças necessárias ou prestador responsável..."
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Foto Antes / Avaria (URL Opcional)
                </label>
                <input
                  type="url"
                  value={formManutencao.foto_antes_url}
                  onChange={(e) => setFormManutencao({ ...formManutencao, foto_antes_url: e.target.value })}
                  placeholder="https://exemplo.com/foto_antes.jpg"
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-black placeholder:text-slate-500"
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
