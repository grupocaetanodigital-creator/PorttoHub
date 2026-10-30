/**
 * Módulo de Custódia de Itens — PorttoHub
 * 
 * Gestão de guarda temporária de pertences, achados e perdidos,
 * encomendas internas e devoluções na portaria / guarita.
 * 
 * Otimizado com:
 * - Consultas SQL indexadas via custodiaService
 * - Processo dinâmico de baixa em 1-clique com pré-preenchimento
 * - Suporte a Foto e Assinatura Digital Touch
 * - Persistência transacional segura com contingência offline
 * - Auditoria pericial com exportação CSV e dossiê do item
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import {
  carregarCustodiaAtiva,
  carregarCustodiaHistorico,
  registrarEntradaCustodia,
  efetivarBaixaCustodia,
  atualizarRegistroCustodia,
  excluirRegistroCustodia,
  excluirMultiplosRegistrosCustodia,
  ItemCustodia
} from '../services/custodiaService';
import { 
  ShieldCheck, 
  PackagePlus, 
  PackageCheck, 
  Camera, 
  Search, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User,
  History,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Filter,
  Calendar,
  X,
  Copy,
  ArrowRight,
  Share2,
  Check,
  FileText,
  ChevronDown,
  ArrowRightLeft,
  Pencil,
  Trash2,
  Building2,
  Users,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Truck,
  Home,
  PenTool,
  Printer,
  Sparkles,
  MapPin,
  ChevronRight,
  Phone
} from 'lucide-react';
import { 
  carregarCondominioConfig, 
  isEstruturaCasas, 
  isEstruturaTorres, 
  getNomeRotuloBloco, 
  getNomeRotuloUnidade, 
  obterListaBlocosOuTorres, 
  saoUnidadesEquivalentes,
  CondominioConfig,
  getCondominioAtivoId
} from '../services/condominioService';
import { verificarPermissao } from '../services/permissoesService';
import { formatarLinkWhatsApp, dispararLinkWhatsApp } from '../services/configWhatsappService';
import { ModalWhatsAppDisparo } from '../components/ModalWhatsAppDisparo';
import { ImagemOtimizada } from '../components/ImagemOtimizada';
import CampoAssinaturaDigital from '../components/CampoAssinaturaDigital';

interface CustodiaProps {
  usuarioLogado?: any;
}

export default function Custodia({ usuarioLogado }: CustodiaProps) {
  // Controle de Permissões RBAC
  const eAdmin = usuarioLogado?.cargo === 'admin' || usuarioLogado?.permissao === 'admin' || usuarioLogado?.cargo === 'sindico' || usuarioLogado?.permissao === 'sindico';
  const podeCriar = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'criar') || verificarPermissao(usuarioLogado, 'custodia', 'receber') || eAdmin);
  const podeBaixa = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'baixa') || eAdmin);
  const podeEditar = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'editar') || eAdmin);
  const podeExcluir = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'excluir') || eAdmin);
  const podeAuditoria = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'auditoria') || verificarPermissao(usuarioLogado, 'custodia', 'visualizar') || eAdmin);

  // Estados Principais de Navegação
  const [aba, setAba] = useState<'ativos' | 'historico'>('ativos');
  const [modalReceberAberto, setModalReceberAberto] = useState(false);
  const [fabCustodiaAberto, setFabCustodiaAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  // Dados Condominiais e Lista de Custódia
  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));
  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [itensAtivos, setItensAtivos] = useState<ItemCustodia[]>([]);
  const [itensHistorico, setItensHistorico] = useState<ItemCustodia[]>([]);
  const [totalHistorico, setTotalHistorico] = useState(0);

  // Seleção Múltipla para Exclusão em Lote
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<string[]>([]);
  const [modalExcluirSelecionados, setModalExcluirSelecionados] = useState(false);

  // Filtros da Aba de Ativos
  const [buscaAtivos, setBuscaAtivos] = useState('');
  const [filtroFluxoAtivos, setFiltroFluxoAtivos] = useState<string>('todos');
  const [filtroIdadeAtivos, setFiltroIdadeAtivos] = useState<'todos' | 'recentes' | 'atencao' | 'alerta'>('todos');

  // Filtros da Aba de Auditoria / Histórico
  const [buscaAuditoria, setBuscaAuditoria] = useState('');
  const [filtroStatusAuditoria, setFiltroStatusAuditoria] = useState<'todos' | 'aguardando' | 'retirado' | 'hoje'>('todos');
  const [filtroPeriodoAuditoria, setFiltroPeriodoAuditoria] = useState<'todos' | 'hoje' | '7dias' | '30dias'>('todos');

  // Estados do Modal Dinâmico de Baixa
  const [itemParaBaixa, setItemParaBaixa] = useState<ItemCustodia | null>(null);
  const [tipoRetirante, setTipoRetirante] = useState<'destinatario' | 'depositante' | 'morador' | 'terceiro'>('destinatario');
  const [baixaRecebedorNome, setBaixaRecebedorNome] = useState('');
  const [baixaRecebedorDoc, setBaixaRecebedorDoc] = useState('');
  const [baixaTerceiroVinculo, setBaixaTerceiroVinculo] = useState('Visitante / Convidado');
  const [baixaObservacoes, setBaixaObservacoes] = useState('');
  const [baixaFotoUrl, setBaixaFotoUrl] = useState('');
  const [baixaAssinaturaUrl, setBaixaAssinaturaUrl] = useState('');
  const [modoEvidenciaBaixa, setModoEvidenciaBaixa] = useState<'foto' | 'assinatura' | 'ambos'>('foto');

  // Estados do Formulário de Entrada / Novo Item
  const [fluxoEntrada, setFluxoEntrada] = useState<'M-M' | 'M-T' | 'T-M'>('M-M');
  const [origemUnidade, setOrigemUnidade] = useState('');
  const [origemBloco, setOrigemBloco] = useState('');
  const [origemNome, setOrigemNome] = useState('');
  const [origemWhats, setOrigemWhats] = useState('');
  const [destinoUnidade, setDestinoUnidade] = useState('');
  const [destinoBloco, setDestinoBloco] = useState('');
  const [destinoNome, setDestinoNome] = useState('');
  const [destinoWhats, setDestinoWhats] = useState('');
  const [descricaoItem, setDescricaoItem] = useState('');
  const [localArmazenamento, setLocalArmazenamento] = useState('Bancada da Guarita');
  const [fotoEntradaUrl, setFotoEntradaUrl] = useState('');
  const [observacoesEntrada, setObservacoesEntrada] = useState('');

  // Modais de Apoio
  const [itemDossieModal, setItemDossieModal] = useState<ItemCustodia | null>(null);
  const [fotoAmpliadaModal, setFotoAmpliadaModal] = useState<{ url: string; titulo: string } | null>(null);
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemCustodia | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<ItemCustodia | null>(null);
  const [modalWhatsProps, setModalWhatsProps] = useState<{
    isOpen: boolean;
    titulo: string;
    subtitulo?: string;
    destinatarioNome: string;
    telefoneInicial?: string;
    tipo: 'custodia_entrada' | 'custodia_saida';
    mensagemTexto: string;
    dadosComplementares?: { rotulo: string; valor: string }[];
  }>({
    isOpen: false,
    titulo: '',
    destinatarioNome: '',
    tipo: 'custodia_saida',
    mensagemTexto: ''
  });

  // Campos de Edição de Custódia
  const [editDescricao, setEditDescricao] = useState('');
  const [editLocal, setEditLocal] = useState('');
  const [editOrigemNome, setEditOrigemNome] = useState('');
  const [editOrigemUnidade, setEditOrigemUnidade] = useState('');
  const [editOrigemBloco, setEditOrigemBloco] = useState('');
  const [editDestinoNome, setEditDestinoNome] = useState('');
  const [editDestinoUnidade, setEditDestinoUnidade] = useState('');
  const [editDestinoBloco, setEditDestinoBloco] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  // Sincronização de alteração de condomínio global
  useEffect(() => {
    const handleCondoChange = (e: any) => {
      const novoId = e?.detail?.id;
      if (novoId && novoId !== 'global' && novoId !== 'todos') {
        setCondId(novoId);
      } else {
        setCondId(getCondominioAtivoId(usuarioLogado));
      }
    };
    window.addEventListener('infport:condominio_alterado', handleCondoChange);
    return () => window.removeEventListener('infport:condominio_alterado', handleCondoChange);
  }, [usuarioLogado]);

  // Carregamento de Configurações e Dados
  useEffect(() => {
    carregarDadosIniciais();
  }, [condId]);

  // Carrega histórico quando mudar para aba de histórico
  useEffect(() => {
    if (aba === 'historico') {
      carregarHistorico();
    }
  }, [aba, condId, filtroStatusAuditoria, filtroPeriodoAuditoria]);

  // Configuração e assinatura de canais Realtime para sincronização inter-postos
  useEffect(() => {
    if (!condId || condId === 'global' || condId === 'todos') return;

    const canal = supabase
      .channel(`realtime_custodia_${condId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custodia',
          filter: `condominio_id=eq.${condId}`
        },
        () => {
          // Recarrega lista ativa silenciosamente
          carregarCustodiaAtiva(condId, true)
            .then(res => setItensAtivos(res.itens))
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [condId]);

  const carregarDadosIniciais = async () => {
    if (!condId || condId === 'global' || condId === 'todos') {
      setItensAtivos([]);
      setMoradores([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Configuração do condomínio (estrutura de torres/casas)
      const cfg = await carregarCondominioConfig(condId);
      setCondoConfig(cfg);
      if (isEstruturaCasas(cfg?.tipo_estrutura)) {
        setOrigemBloco('Casa');
        setDestinoBloco('Casa');
      }

      // 2. Moradores cadastrados (projeção leve para autocompletar)
      const { data: moradData } = await supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone')
        .eq('condominio_id', condId)
        .order('nome');
      setMoradores(moradData || []);

      // 3. Consulta otimizada dos itens ativos em custódia (indexada por status)
      const { itens } = await carregarCustodiaAtiva(condId);
      setItensAtivos(itens);
    } catch (err: any) {
      console.warn('[Custodia] Erro ao carregar dados:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar itens sob custódia: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    if (!condId || condId === 'global' || condId === 'todos') return;
    setLoading(true);
    try {
      const { itens, total } = await carregarCustodiaHistorico(condId, {
        status: filtroStatusAuditoria,
        limite: 150
      });
      setItensHistorico(itens);
      setTotalHistorico(total);
    } catch (err: any) {
      console.warn('[Custodia] Erro no histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  // Estrutura física
  const eEstruturaCasas = isEstruturaCasas(condoConfig?.tipo_estrutura);
  const eEstruturaTorres = isEstruturaTorres(condoConfig?.tipo_estrutura);
  const rotuloBloco = getNomeRotuloBloco(condoConfig?.tipo_estrutura);
  const rotuloUnidade = getNomeRotuloUnidade(condoConfig?.tipo_estrutura);
  const listaBlocos = obterListaBlocosOuTorres(condoConfig, moradores);

  // Upload comprimido de imagem
  const uploadFoto = async (file: File | null, pasta: string, callbackUrl: (url: string) => void) => {
    if (!file) return;
    setUploadingFoto(true);
    try {
      const { publicUrl, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta,
        maxWidth: 1200,
        maxHeight: 1200,
        qualidade: 0.8
      });
      callbackUrl(publicUrl);
      setMensagem({
        tipo: 'sucesso',
        texto: `Foto anexada com sucesso! ${taxaReducaoPct > 0 ? `(-${taxaReducaoPct}% otimizada)` : ''}`
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao processar imagem: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  // Filtros de Moradores para Formulários
  const moradoresOrigemFiltrados = useMemo(() => {
    if (!origemUnidade) return [];
    return moradores.filter(
      m => saoUnidadesEquivalentes(m.unidade, origemUnidade) &&
        (eEstruturaCasas || !origemBloco || (m.bloco || '').toLowerCase() === origemBloco.toLowerCase())
    );
  }, [moradores, origemUnidade, origemBloco, eEstruturaCasas]);

  const moradoresDestinoFiltrados = useMemo(() => {
    if (!destinoUnidade) return [];
    return moradores.filter(
      m => saoUnidadesEquivalentes(m.unidade, destinoUnidade) &&
        (eEstruturaCasas || !destinoBloco || (m.bloco || '').toLowerCase() === destinoBloco.toLowerCase())
    );
  }, [moradores, destinoUnidade, destinoBloco, eEstruturaCasas]);

  // Moradores da unidade do item que está sendo baixado
  const moradoresUnidadeBaixa = useMemo(() => {
    if (!itemParaBaixa) return [];
    const unid = itemParaBaixa.destino_unidade || itemParaBaixa.origem_unidade || '';
    const bloc = itemParaBaixa.destino_bloco || itemParaBaixa.origem_bloco || '';
    if (!unid) return [];
    return moradores.filter(
      m => saoUnidadesEquivalentes(m.unidade, unid) &&
        (eEstruturaCasas || !bloc || (m.bloco || '').toLowerCase() === bloc.toLowerCase())
    );
  }, [itemParaBaixa, moradores, eEstruturaCasas]);

  // Cálculos de tempo de permanência sob custódia
  const calcularTempoPermanencia = (entradaIso?: string, saidaIso?: string | null) => {
    if (!entradaIso) return { texto: 'Recente', minutos: 0, nivel: 'verde' };
    const inicio = new Date(entradaIso).getTime();
    const fim = saidaIso ? new Date(saidaIso).getTime() : Date.now();
    const diffMs = Math.max(0, fim - inicio);

    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    let texto = `${minutos} min`;
    if (dias > 0) {
      const hRest = horas % 24;
      texto = `${dias}d ${hRest}h`;
    } else if (horas > 0) {
      const mRest = minutos % 60;
      texto = `${horas}h ${mRest}m`;
    }

    let nivel: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (horas >= 72) {
      nivel = 'vermelho'; // Mais de 3 dias guardado
    } else if (horas >= 24) {
      nivel = 'amarelo'; // Entre 1 e 3 dias
    }

    return { texto, minutos, horas, dias, nivel };
  };

  // =========================================================================
  // FLUXO DINÂMICO DE BAIXA DE CUSTÓDIA
  // =========================================================================

  const iniciarBaixaItem = (item: ItemCustodia) => {
    if (!podeBaixa) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: seu perfil não possui permissão para realizar Baixa de Custódia.' });
      return;
    }

    setItemParaBaixa(item);
    setBaixaFotoUrl('');
    setBaixaAssinaturaUrl('');
    setBaixaObservacoes('');

    // Preenche dinamicamente o fluxo mais provável:
    // Se o item tinha um destinatário cadastrado, pré-seleciona "destinatario"
    if (item.destino_nome_doc) {
      setTipoRetirante('destinatario');
      setBaixaRecebedorNome(item.destino_nome_doc);
      setBaixaRecebedorDoc(item.destino_whats || (item.destino_unidade ? `${rotuloUnidade} ${item.destino_unidade}` : ''));
    } else {
      setTipoRetirante('depositante');
      setBaixaRecebedorNome(item.origem_nome_doc || '');
      setBaixaRecebedorDoc(item.origem_whats || '');
    }
  };

  const selecionarOpcaoRapidaRetirante = (
    tipo: 'destinatario' | 'depositante' | 'morador' | 'terceiro',
    nomePredefinido?: string,
    docPredefinido?: string
  ) => {
    if (!itemParaBaixa) return;
    setTipoRetirante(tipo);

    if (tipo === 'destinatario') {
      setBaixaRecebedorNome(itemParaBaixa.destino_nome_doc || '');
      setBaixaRecebedorDoc(
        itemParaBaixa.destino_whats ||
        (itemParaBaixa.destino_unidade ? `${rotuloUnidade} ${itemParaBaixa.destino_unidade}${itemParaBaixa.destino_bloco && !eEstruturaCasas ? ' - ' + itemParaBaixa.destino_bloco : ''}` : '')
      );
    } else if (tipo === 'depositante') {
      setBaixaRecebedorNome(itemParaBaixa.origem_nome_doc || '');
      setBaixaRecebedorDoc(
        itemParaBaixa.origem_whats ||
        (itemParaBaixa.origem_unidade ? `${rotuloUnidade} ${itemParaBaixa.origem_unidade}${itemParaBaixa.origem_bloco && !eEstruturaCasas ? ' - ' + itemParaBaixa.origem_bloco : ''}` : '')
      );
    } else if (tipo === 'morador') {
      if (nomePredefinido) {
        setBaixaRecebedorNome(nomePredefinido);
        setBaixaRecebedorDoc(docPredefinido || `${rotuloUnidade} ${itemParaBaixa.destino_unidade || itemParaBaixa.origem_unidade}`);
      } else {
        setBaixaRecebedorNome('');
        setBaixaRecebedorDoc(`${rotuloUnidade} ${itemParaBaixa.destino_unidade || itemParaBaixa.origem_unidade}`);
      }
    } else if (tipo === 'terceiro') {
      setBaixaRecebedorNome('');
      setBaixaRecebedorDoc('');
      setBaixaTerceiroVinculo('Prestador de Serviço');
    }
  };

  const confirmarEfetivarBaixa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemParaBaixa) return;

    if (!baixaRecebedorNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome completo de quem está recebendo o objeto.' });
      return;
    }

    setLoading(true);

    try {
      let docFinal = baixaRecebedorDoc.trim();
      if (tipoRetirante === 'terceiro' && baixaTerceiroVinculo) {
        docFinal = docFinal ? `${docFinal} (${baixaTerceiroVinculo})` : `Vínculo: ${baixaTerceiroVinculo}`;
      }

      // Dispara a transação resiliente no service
      const res = await efetivarBaixaCustodia({
        id: itemParaBaixa.id,
        condominio_id: itemParaBaixa.condominio_id || condId,
        codigo_custodia: itemParaBaixa.codigo_custodia,
        recebedor_nome: baixaRecebedorNome.trim(),
        recebedor_doc: docFinal,
        tipo_baixa: tipoRetirante,
        foto_saida_url: baixaFotoUrl,
        assinatura_url: baixaAssinaturaUrl,
        operador_saida: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria',
        observacoes: baixaObservacoes
      });

      // Atualização otimista imediata na lista visual
      setItensAtivos(prev => prev.filter(i => i.id !== itemParaBaixa.id));

      // Preparação do Comprovante do WhatsApp
      const telDestino = (itemParaBaixa.origem_whats || itemParaBaixa.destino_whats || '').replace(/\D/g, '');
      const modalidadeRotulo = 
        tipoRetirante === 'destinatario' ? 'Destinatário Original' :
        tipoRetirante === 'depositante' ? 'Devolvido ao Depositante' :
        tipoRetirante === 'morador' ? 'Morador Autorizado' : `Terceiro (${baixaTerceiroVinculo})`;

      const textoReciboWhats = 
        `✅ *PORTARIA — CONFIRMAÇÃO DE ENTREGA DE CUSTÓDIA*\n` +
        `Código: *${itemParaBaixa.codigo_custodia}*\n` +
        `• Objeto: *${itemParaBaixa.descricao}*\n` +
        `• Deixado Por: ${itemParaBaixa.origem_nome_doc}\n` +
        `• Retirado Por: *${baixaRecebedorNome.trim()}* (${modalidadeRotulo})\n` +
        (docFinal ? `• Identificação: ${docFinal}\n` : '') +
        (baixaFotoUrl ? `• Foto do Recebimento: ${baixaFotoUrl}\n` : '') +
        `• Data e Horário: ${new Date().toLocaleString('pt-BR')}\n` +
        `• Operador Responsável: ${usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'}\n\n` +
        `_Protocolo registrado no sistema PorttoHub._`;

      const linkWhats = formatarLinkWhatsApp(telDestino, textoReciboWhats);

      setMensagem({
        tipo: 'sucesso',
        texto: res.mensagem || `Baixa concluída com sucesso! (${itemParaBaixa.codigo_custodia})`
      });

      // Se houver telefone cadastrado, abre opção imediata de disparo do recibo
      if (telDestino) {
        setModalWhatsProps({
          isOpen: true,
          titulo: `Comprovante de Baixa: ${itemParaBaixa.codigo_custodia}`,
          subtitulo: 'Envie a confirmação de devolução para o morador ou terceiro',
          destinatarioNome: baixaRecebedorNome.trim(),
          telefoneInicial: telDestino,
          tipo: 'custodia_saida',
          mensagemTexto: textoReciboWhats,
          dadosComplementares: [
            { rotulo: 'Item', valor: itemParaBaixa.descricao },
            { rotulo: 'Retirado por', valor: baixaRecebedorNome.trim() }
          ]
        });
      }

      setItemParaBaixa(null);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao efetivar baixa: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // CADASTRO DE NOVO ITEM SOB CUSTÓDIA
  // =========================================================================

  const salvarNovoItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricaoItem.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe a descrição do item guardado.' });
      return;
    }
    if (!origemNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome de quem está deixando o objeto.' });
      return;
    }
    if (!destinoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do destinatário do objeto.' });
      return;
    }

    setLoading(true);

    try {
      const res = await registrarEntradaCustodia({
        condominio_id: condId,
        fluxo: fluxoEntrada,
        origem_tipo: fluxoEntrada.startsWith('M') ? 'Morador' : 'Terceiro',
        origem_unidade: origemUnidade,
        origem_bloco: eEstruturaCasas ? 'Casa' : origemBloco,
        origem_nome_doc: origemNome,
        origem_whats: origemWhats,
        destino_tipo: fluxoEntrada.endsWith('M') ? 'Morador' : 'Terceiro',
        destino_unidade: destinoUnidade,
        destino_bloco: eEstruturaCasas ? 'Casa' : destinoBloco,
        destino_nome_doc: destinoNome,
        destino_whats: destinoWhats,
        descricao: descricaoItem,
        local_armazenamento: localArmazenamento,
        foto_entrada_url: fotoEntradaUrl,
        operador_entrada: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria',
        observacoes: observacoesEntrada
      });

      // Adiciona o novo item no topo da lista imediatamente
      setItensAtivos(prev => [res.item, ...prev]);

      // Formata WhatsApp de aviso ao destinatário
      const telDestino = destinoWhats.replace(/\D/g, '') || origemWhats.replace(/\D/g, '');
      const textoWhatsEntrada =
        `📦 *ITEM DEIXADO EM CUSTÓDIA NA PORTARIA*\n` +
        `Código de Retirada: *${res.codigo}*\n\n` +
        `• De: ${origemNome} ${origemUnidade ? `(${rotuloUnidade} ${origemUnidade})` : ''}\n` +
        `• Para: *${destinoNome}* ${destinoUnidade ? `(${rotuloUnidade} ${destinoUnidade})` : ''}\n` +
        `• Descrição: *${descricaoItem}*\n` +
        `• Local de Guarda: ${localArmazenamento}\n` +
        (fotoEntradaUrl ? `• Foto do Item: ${fotoEntradaUrl}\n` : '') +
        `• Recebido Por: ${usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'}\n` +
        `• Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\n` +
        `_Apresente o código *${res.codigo}* na portaria para retirar._`;

      const linkWhats = formatarLinkWhatsApp(telDestino, textoWhatsEntrada);

      // Limpa formulário
      setDescricaoItem('');
      setOrigemNome('');
      setOrigemUnidade('');
      setOrigemWhats('');
      setDestinoNome('');
      setDestinoUnidade('');
      setDestinoWhats('');
      setFotoEntradaUrl('');
      setObservacoesEntrada('');
      setModalReceberAberto(false);

      setMensagem({
        tipo: 'sucesso',
        texto: `Item guardado com sucesso! Protocolo: ${res.codigo}`
      });

      if (telDestino) {
        setModalWhatsProps({
          isOpen: true,
          titulo: `Notificação de Custódia: ${res.codigo}`,
          subtitulo: 'Informe o morador ou visitante sobre o objeto guardado',
          destinatarioNome: destinoNome.trim() || origemNome.trim(),
          telefoneInicial: telDestino,
          tipo: 'custodia_entrada',
          mensagemTexto: textoWhatsEntrada,
          dadosComplementares: [
            { rotulo: 'Objeto', valor: descricaoItem },
            { rotulo: 'Local', valor: localArmazenamento }
          ]
        });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao cadastrar custódia: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // EDIÇÃO E EXCLUSÃO (RBAC)
  // =========================================================================

  const abrirEdicao = (item: ItemCustodia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!podeEditar) {
      setMensagem({ tipo: 'erro', texto: 'Seu perfil não tem permissão para editar registros de custódia.' });
      return;
    }
    setItemEmEdicao(item);
    setEditDescricao(item.descricao || '');
    setEditLocal(item.local_armazenamento || '');
    setEditOrigemNome(item.origem_nome_doc || '');
    setEditOrigemUnidade(item.origem_unidade || '');
    setEditOrigemBloco(item.origem_bloco || '');
    setEditDestinoNome(item.destino_nome_doc || '');
    setEditDestinoUnidade(item.destino_unidade || '');
    setEditDestinoBloco(item.destino_bloco || '');
    setEditObservacoes(item.observacoes || '');
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEmEdicao) return;
    setLoading(true);
    try {
      await atualizarRegistroCustodia(
        itemEmEdicao.id,
        itemEmEdicao.condominio_id || condId,
        {
          descricao: editDescricao.trim(),
          local_armazenamento: editLocal.trim(),
          origem_nome_doc: editOrigemNome.trim(),
          origem_unidade: editOrigemUnidade.trim(),
          origem_bloco: editOrigemBloco.trim(),
          destino_nome_doc: editDestinoNome.trim(),
          destino_unidade: editDestinoUnidade.trim(),
          destino_bloco: editDestinoBloco.trim(),
          observacoes: editObservacoes.trim()
        },
        usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
      );

      setItensAtivos(prev => prev.map(i => i.id === itemEmEdicao.id ? {
        ...i,
        descricao: editDescricao.trim(),
        local_armazenamento: editLocal.trim(),
        origem_nome_doc: editOrigemNome.trim(),
        origem_unidade: editOrigemUnidade.trim(),
        origem_bloco: editOrigemBloco.trim(),
        destino_nome_doc: editDestinoNome.trim(),
        destino_unidade: editDestinoUnidade.trim(),
        destino_bloco: editDestinoBloco.trim(),
        observacoes: editObservacoes.trim()
      } : i));

      setItemEmEdicao(null);
      setMensagem({ tipo: 'sucesso', texto: `Custódia ${itemEmEdicao.codigo_custodia} atualizada!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar alterações: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    setLoading(true);
    try {
      await excluirRegistroCustodia(
        itemParaExcluir.id,
        itemParaExcluir.condominio_id || condId,
        itemParaExcluir.codigo_custodia,
        itemParaExcluir.descricao,
        usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
      );

      setItensAtivos(prev => prev.filter(i => i.id !== itemParaExcluir.id));
      setItensHistorico(prev => prev.filter(i => i.id !== itemParaExcluir.id));
      setItemParaExcluir(null);
      setMensagem({ tipo: 'sucesso', texto: `Registro ${itemParaExcluir.codigo_custodia} excluído definitivamente.` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir item: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Funções de Seleção Múltipla e Exclusão em Lote
  const toggleSelecionarItem = (id: string) => {
    setItensSelecionadosIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodosAtivos = () => {
    const todosIds = itensAtivosFiltrados.map(i => i.id);
    const todosMarcados = todosIds.length > 0 && todosIds.every(id => itensSelecionadosIds.includes(id));
    if (todosMarcados) {
      setItensSelecionadosIds(prev => prev.filter(id => !todosIds.includes(id)));
    } else {
      setItensSelecionadosIds(prev => Array.from(new Set([...prev, ...todosIds])));
    }
  };

  const confirmarExclusaoSelecionados = async () => {
    if (itensSelecionadosIds.length === 0) return;
    setLoading(true);
    const qtd = itensSelecionadosIds.length;
    const operador = usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';

    try {
      await excluirMultiplosRegistrosCustodia(
        itensSelecionadosIds,
        condId,
        operador
      );

      const idsRemover = new Set(itensSelecionadosIds);
      setItensAtivos(prev => prev.filter(i => !idsRemover.has(i.id)));
      setItensHistorico(prev => prev.filter(i => !idsRemover.has(i.id)));
      setItensSelecionadosIds([]);
      setModalExcluirSelecionados(false);
      setMensagem({
        tipo: 'sucesso',
        texto: `${qtd} item(ns) selecionado(s) excluído(s) da custódia com sucesso.`
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir itens selecionados: ' + (err.message || 'Falha de comunicação') });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // FILTRAGEM DE ITENS ATIVOS
  // =========================================================================

  const itensAtivosFiltrados = useMemo(() => {
    return itensAtivos.filter(item => {
      // 1. Filtro textual
      if (buscaAtivos.trim()) {
        const termo = buscaAtivos.toLowerCase();
        const cod = (item.codigo_custodia || '').toLowerCase();
        const desc = (item.descricao || '').toLowerCase();
        const orig = (item.origem_nome_doc || '').toLowerCase();
        const dest = (item.destino_nome_doc || '').toLowerCase();
        const unid = (item.destino_unidade || item.origem_unidade || '').toLowerCase();
        const loc = (item.local_armazenamento || '').toLowerCase();

        if (!cod.includes(termo) && !desc.includes(termo) && !orig.includes(termo) && !dest.includes(termo) && !unid.includes(termo) && !loc.includes(termo)) {
          return false;
        }
      }

      // 2. Filtro de fluxo
      if (filtroFluxoAtivos !== 'todos' && item.fluxo !== filtroFluxoAtivos) {
        return false;
      }

      // 3. Filtro de idade
      if (filtroIdadeAtivos !== 'todos') {
        const { horas } = calcularTempoPermanencia(item.data_hora_entrada || item.created_at);
        if (filtroIdadeAtivos === 'recentes' && (horas || 0) >= 24) return false;
        if (filtroIdadeAtivos === 'atencao' && ((horas || 0) < 24 || (horas || 0) >= 72)) return false;
        if (filtroIdadeAtivos === 'alerta' && (horas || 0) < 72) return false;
      }

      return true;
    });
  }, [itensAtivos, buscaAtivos, filtroFluxoAtivos, filtroIdadeAtivos]);

  // Itens de Histórico Filtrados
  const itensHistoricoFiltrados = useMemo(() => {
    return itensHistorico.filter(item => {
      if (buscaAuditoria.trim()) {
        const termo = buscaAuditoria.toLowerCase();
        const cod = (item.codigo_custodia || '').toLowerCase();
        const desc = (item.descricao || '').toLowerCase();
        const orig = (item.origem_nome_doc || '').toLowerCase();
        const dest = (item.destino_nome_doc || '').toLowerCase();
        const rec = (item.recebedor_nome || '').toLowerCase();
        const doc = (item.recebedor_doc || '').toLowerCase();

        if (!cod.includes(termo) && !desc.includes(termo) && !orig.includes(termo) && !dest.includes(termo) && !rec.includes(termo) && !doc.includes(termo)) {
          return false;
        }
      }
      return true;
    });
  }, [itensHistorico, buscaAuditoria]);

  // Exportar CSV
  const exportarCSV = () => {
    const lista = aba === 'ativos' ? itensAtivosFiltrados : itensHistoricoFiltrados;
    if (lista.length === 0) return;

    const cabecalhos = [
      'Codigo_Custodia',
      'Status',
      'Descricao',
      'Fluxo',
      'Origem_Nome',
      'Origem_Unidade',
      'Origem_Bloco',
      'Destino_Nome',
      'Destino_Unidade',
      'Destino_Bloco',
      'Local_Guarda',
      'Data_Entrada',
      'Operador_Entrada',
      'Data_Saida',
      'Operador_Saida',
      'Recebedor_Nome',
      'Recebedor_Doc',
      'Tipo_Baixa',
      'Foto_Entrada_URL',
      'Foto_Saida_URL'
    ];

    const linhas = lista.map(i => [
      `"${i.codigo_custodia || ''}"`,
      `"${i.status || ''}"`,
      `"${(i.descricao || '').replace(/"/g, '""')}"`,
      `"${i.fluxo || ''}"`,
      `"${(i.origem_nome_doc || '').replace(/"/g, '""')}"`,
      `"${i.origem_unidade || ''}"`,
      `"${i.origem_bloco || ''}"`,
      `"${(i.destino_nome_doc || '').replace(/"/g, '""')}"`,
      `"${i.destino_unidade || ''}"`,
      `"${i.destino_bloco || ''}"`,
      `"${i.local_armazenamento || ''}"`,
      `"${i.data_hora_entrada ? new Date(i.data_hora_entrada).toLocaleString('pt-BR') : ''}"`,
      `"${i.operador_entrada || ''}"`,
      `"${i.data_hora_saida ? new Date(i.data_hora_saida).toLocaleString('pt-BR') : ''}"`,
      `"${i.operador_saida || ''}"`,
      `"${(i.recebedor_nome || '').replace(/"/g, '""')}"`,
      `"${i.recebedor_doc || ''}"`,
      `"${i.tipo_baixa || ''}"`,
      `"${i.foto_entrada_url || i.foto_url || ''}"`,
      `"${i.foto_saida_url || ''}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas.map(l => l.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custodia_infport_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 pb-20">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE CABEÇALHO & NAVEGAÇÃO DE ABAS                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs border border-slate-800 dark:border-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Custódia de Itens
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Posto Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Guarda temporária de pertences, achados e perdidos e entrega na guarita
            </p>
          </div>
        </div>

        {/* Botões de Ação do Cabeçalho */}
        <div className="flex items-center gap-2">
          {/* Seletor de Abas */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAba('ativos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                aba === 'ativos'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Itens Guardados</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                itensAtivos.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
              }`}>
                {itensAtivos.length}
              </span>
            </button>

            {podeAuditoria && (
              <button
                type="button"
                onClick={() => setAba('historico')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  aba === 'historico'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-purple-500" />
                <span>Auditoria & Baixas</span>
              </button>
            )}
          </div>

          {/* Botão Novo Registro */}
          {podeCriar && (
            <button
              type="button"
              onClick={() => setFabCustodiaAberto(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Receber Item</span>
              <span className="sm:hidden">Receber</span>
            </button>
          )}
        </div>
      </div>

      {/* Alertas e Mensagens de Feedback */}
      {mensagem && (
        <div className={`p-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
          mensagem.tipo === 'sucesso'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
            : mensagem.tipo === 'erro'
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {mensagem.tipo === 'erro' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {mensagem.tipo === 'info' && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{mensagem.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagem(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: ITENS GUARDADOS (ATIVOS / PENDENTES DE BAIXA)                      */}
      {/* ========================================================================= */}
      {aba === 'ativos' && (
        <div className="space-y-3">
          {/* Barra de Filtros e Busca Rápida */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            {/* Input de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buscaAtivos}
                onChange={(e) => setBuscaAtivos(e.target.value)}
                placeholder="Buscar por código (ex: CUST-...), unidade, morador ou objeto..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {buscaAtivos && (
                <button
                  type="button"
                  onClick={() => setBuscaAtivos('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chips de Filtros Rápidos */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {/* Filtro de Fluxo */}
              <select
                value={filtroFluxoAtivos}
                onChange={(e) => setFiltroFluxoAtivos(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
              >
                <option value="todos">Todos os Fluxos</option>
                <option value="M-M">🏢 Morador ➔ Morador</option>
                <option value="M-T">🚚 Morador ➔ Terceiro</option>
                <option value="T-M">📦 Terceiro ➔ Morador</option>
              </select>

              {/* Filtro de Idade / Alerta */}
              <select
                value={filtroIdadeAtivos}
                onChange={(e) => setFiltroIdadeAtivos(e.target.value as any)}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
              >
                <option value="todos">Qualquer Tempo</option>
                <option value="recentes">🟢 Menos de 24h</option>
                <option value="atencao">🟡 Entre 1 e 3 dias</option>
                <option value="alerta">🔴 Mais de 3 dias retido</option>
              </select>

              {/* Botão Atualizar */}
              <button
                type="button"
                onClick={() => carregarCustodiaAtiva(condId, true).then(r => setItensAtivos(r.itens))}
                title="Recarregar Dados"
                className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              {/* Exportar CSV */}
              <button
                type="button"
                onClick={exportarCSV}
                title="Exportar Lista em CSV"
                className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              {/* Selecionar Todos para Exclusão em Lote */}
              {podeExcluir && itensAtivosFiltrados.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelecionarTodosAtivos}
                  title={
                    itensAtivosFiltrados.every(i => itensSelecionadosIds.includes(i.id))
                      ? "Desmarcar todos"
                      : "Selecionar todos os itens para exclusão"
                  }
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    itensAtivosFiltrados.every(i => itensSelecionadosIds.includes(i.id))
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {itensAtivosFiltrados.every(i => itensSelecionadosIds.includes(i.id)) ? 'Desmarcar' : 'Selecionar Tudo'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Banner de Ação em Lote quando há itens selecionados */}
          {itensSelecionadosIds.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 text-xs font-black">
                <div className="w-6 h-6 rounded-lg bg-rose-200 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <span>{itensSelecionadosIds.length} {itensSelecionadosIds.length === 1 ? 'item selecionado' : 'itens selecionados'} para exclusão</span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setItensSelecionadosIds([])}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
                >
                  Desmarcar Todos
                </button>

                <button
                  type="button"
                  onClick={() => setModalExcluirSelecionados(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Itens Selecionados</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid de Cards de Custódia */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {itensAtivosFiltrados.map((item) => {
              const permanencia = calcularTempoPermanencia(item.data_hora_entrada || item.created_at);
              const fotoPreview = item.foto_entrada_url || item.foto_url;
              const isSelecionado = itensSelecionadosIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-150 p-4 flex flex-col justify-between gap-3 group relative ${
                    isSelecionado
                      ? 'border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/20 dark:bg-rose-950/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs hover:shadow-md'
                  }`}
                >
                  {/* Topo do Card */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {podeExcluir && (
                            <input
                              type="checkbox"
                              checked={isSelecionado}
                              onChange={() => toggleSelecionarItem(item.id)}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700 cursor-pointer mr-0.5"
                              title={isSelecionado ? "Desmarcar item" : "Selecionar para exclusão"}
                            />
                          )}
                          <span className="font-mono text-[10px] font-black bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400 px-2 py-0.5 rounded-md tracking-wider">
                            {item.codigo_custodia}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            permanencia.nivel === 'vermelho'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                              : permanencia.nivel === 'amarelo'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{permanencia.texto}</span>
                          </span>
                          {item.local_armazenamento && (
                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md truncate max-w-[130px] flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              <span>{item.local_armazenamento}</span>
                            </span>
                          )}
                        </div>

                        {/* Título e Descrição */}
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-1.5 line-clamp-2 leading-snug">
                          {item.descricao}
                        </h4>
                      </div>

                      {/* Miniatura da Foto com Zoom */}
                      {fotoPreview ? (
                        <div
                          onClick={() => setFotoAmpliadaModal({ url: fotoPreview, titulo: `Foto do Item: ${item.codigo_custodia}` })}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0 cursor-zoom-in group-hover:scale-105 transition-transform shadow-2xs"
                          title="Clique para ampliar foto"
                        >
                          <img
                            src={fotoPreview}
                            alt="Foto do objeto"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <PackageCheck className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                    </div>

                    {/* Origem e Destino com Visual Claro */}
                    <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                      {/* Deixado Por */}
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> De:
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {item.origem_nome_doc || 'Depositante'}
                        </p>
                        {item.origem_unidade && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">
                            {eEstruturaCasas ? 'Casa' : rotuloUnidade} {item.origem_unidade} {item.origem_bloco && !eEstruturaCasas ? `(${item.origem_bloco})` : ''}
                          </p>
                        )}
                      </div>

                      {/* Destinado A */}
                      <div className="min-w-0 space-y-0.5 border-l border-slate-200 dark:border-slate-700 pl-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Para:
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {item.destino_nome_doc || 'Destinatário'}
                        </p>
                        {item.destino_unidade && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">
                            {eEstruturaCasas ? 'Casa' : rotuloUnidade} {item.destino_unidade} {item.destino_bloco && !eEstruturaCasas ? `(${item.destino_bloco})` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé com Informações de Entrada e Ação Principal */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Entrada: {new Date(item.data_hora_entrada || item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.data_hora_entrada || item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1">
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={(e) => abrirEdicao(item, e)}
                          title="Editar Registro"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setItemParaExcluir(item); }}
                          title="Excluir Registro"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Botão Primário: DAR BAIXA DINÂMICA */}
                      <button
                        type="button"
                        onClick={() => iniciarBaixaItem(item)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Dar Baixa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {itensAtivosFiltrados.length === 0 && (
              <div className="col-span-full py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {buscaAtivos ? 'Nenhum item encontrado para esta busca' : 'Nenhum objeto aguardando retirada'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {buscaAtivos ? 'Tente buscar por outro código ou nome.' : 'A guarita está em dia! Novos itens recebidos aparecerão aqui.'}
                  </p>
                </div>
                {podeCriar && !buscaAtivos && (
                  <button
                    type="button"
                    onClick={() => setFabCustodiaAberto(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>Receber Novo Objeto</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: AUDITORIA & HISTÓRICO PERICIAL                                     */}
      {/* ========================================================================= */}
      {aba === 'historico' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <span>Histórico Completo & Dossiê de Baixas</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registros com fotos de entrada e saída, recebedor, operador e horário pericial
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportarCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Relatório CSV</span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros do Histórico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buscaAuditoria}
                onChange={(e) => setBuscaAuditoria(e.target.value)}
                placeholder="Filtrar por recebedor, documento, descrição ou código..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <select
                value={filtroStatusAuditoria}
                onChange={(e) => setFiltroStatusAuditoria(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Registros</option>
                <option value="retirado">Apenas Baixados / Retirados</option>
                <option value="aguardando">Apenas Itens Guardados</option>
              </select>
            </div>
          </div>

          {/* Tabela de Histórico Pericial */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-black text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5">Código / Item</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Origem (De)</th>
                  <th className="px-3 py-2.5">Destino (Para)</th>
                  <th className="px-3 py-2.5">Baixa / Recebedor</th>
                  <th className="px-3 py-2.5">Datas</th>
                  <th className="px-3 py-2.5 text-right">Dossiê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {itensHistoricoFiltrados.map((item) => {
                  const s = (item.status || '').toLowerCase();
                  const eRetirado = s === 'retirado';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      {/* Código e Descrição */}
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-900 dark:text-slate-200">
                          {item.codigo_custodia}
                        </span>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1 max-w-[180px]">
                          {item.descricao}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          eRetirado
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {eRetirado ? 'Retirado' : 'Guardado'}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                          {item.origem_nome_doc || '—'}
                        </div>
                        {item.origem_unidade && (
                          <div className="text-[10px] text-slate-500">
                            {rotuloUnidade} {item.origem_unidade}
                          </div>
                        )}
                      </td>

                      {/* Destino */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                          {item.destino_nome_doc || '—'}
                        </div>
                        {item.destino_unidade && (
                          <div className="text-[10px] text-slate-500">
                            {rotuloUnidade} {item.destino_unidade}
                          </div>
                        )}
                      </td>

                      {/* Baixa / Recebedor */}
                      <td className="px-3 py-2.5">
                        {eRetirado ? (
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 block truncate max-w-[140px]">
                              {item.recebedor_nome || 'Retirado'}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                              {item.recebedor_doc || 'Comprovado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pendente</span>
                        )}
                      </td>

                      {/* Datas */}
                      <td className="px-3 py-2.5 text-[10px] text-slate-500 space-y-0.5">
                        <div>
                          Entrada: {item.data_hora_entrada ? new Date(item.data_hora_entrada).toLocaleDateString('pt-BR') : '—'}
                        </div>
                        {item.data_hora_saida && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Saída: {new Date(item.data_hora_saida).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      {/* Botão Ver Dossiê */}
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setItemDossieModal(item)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Dossiê</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {itensHistoricoFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 italic text-xs">
                      Nenhum registro encontrado no histórico.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DINÂMICO DE BAIXA RÁPIDA (O PROCESSO DE BAIXA REDENHADO)            */}
      {/* ========================================================================= */}
      {itemParaBaixa && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header do Modal */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md">
                      {itemParaBaixa.codigo_custodia}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Devolução & Entrega
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white text-base leading-snug line-clamp-1 mt-0.5">
                    {itemParaBaixa.descricao}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setItemParaBaixa(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Formulário */}
            <form onSubmit={confirmarEfetivarBaixa} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Resumo do Item */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Deixado por:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {itemParaBaixa.origem_nome_doc} {itemParaBaixa.origem_unidade ? `(${rotuloUnidade} ${itemParaBaixa.origem_unidade})` : ''}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-blue-500 block">Destinado para:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {itemParaBaixa.destino_nome_doc} {itemParaBaixa.destino_unidade ? `(${rotuloUnidade} ${itemParaBaixa.destino_unidade})` : ''}
                  </span>
                </div>
              </div>

              {/* SELEÇÃO DINÂMICA DE 1-CLIQUE DE QUEM ESTÁ RETIRANDO */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                  ⚡ Quem está retirando? (Seleção Rápida em 1 Clique)
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {/* Opção 1: Destinatário Previsto */}
                  <button
                    type="button"
                    onClick={() => selecionarOpcaoRapidaRetirante('destinatario')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      tipoRetirante === 'destinatario'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Destinatário</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {itemParaBaixa.destino_nome_doc}
                      </div>
                    </div>
                    {tipoRetirante === 'destinatario' && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>

                  {/* Opção 2: Devolução para quem deixou */}
                  <button
                    type="button"
                    onClick={() => selecionarOpcaoRapidaRetirante('depositante')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      tipoRetirante === 'depositante'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Devolução (Origem)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {itemParaBaixa.origem_nome_doc}
                      </div>
                    </div>
                    {tipoRetirante === 'depositante' && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                  </button>

                  {/* Opção 3: Outro Morador da Mesma Unidade */}
                  <button
                    type="button"
                    onClick={() => selecionarOpcaoRapidaRetirante('morador')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      tipoRetirante === 'morador'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Outro Morador</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Da mesma unidade
                      </div>
                    </div>
                    {tipoRetirante === 'morador' && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                  </button>

                  {/* Opção 4: Terceiro / Prestador / Visitante */}
                  <button
                    type="button"
                    onClick={() => selecionarOpcaoRapidaRetirante('terceiro')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      tipoRetirante === 'terceiro'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Terceiro / Prestador</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Visitante / Courier
                      </div>
                    </div>
                    {tipoRetirante === 'terceiro' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                </div>

                {/* Sub-chips de Moradores da Mesma Unidade (se houver cadastrados) */}
                {tipoRetirante === 'morador' && moradoresUnidadeBaixa.length > 0 && (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-1.5 animate-in fade-in">
                    <span className="block text-[10px] font-black text-purple-900 dark:text-purple-300 uppercase">
                      Moradores da unidade {itemParaBaixa.destino_unidade || itemParaBaixa.origem_unidade}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {moradoresUnidadeBaixa.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setBaixaRecebedorNome(m.nome);
                            if (m.telefone) setBaixaRecebedorDoc(`Tel: ${m.telefone}`);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            baixaRecebedorNome === m.nome
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-purple-950 dark:text-purple-200 border border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          <User className="w-3 h-3 text-purple-500" />
                          <span>{m.nome}</span>
                          {baixaRecebedorNome === m.nome && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Campos de Nome e Documento do Recebedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Nome Completo do Retirante *
                  </label>
                  <input
                    type="text"
                    required
                    value={baixaRecebedorNome}
                    onChange={(e) => setBaixaRecebedorNome(e.target.value)}
                    placeholder="Nome de quem está recebendo..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Documento / Telefone / Ref
                  </label>
                  <input
                    type="text"
                    value={baixaRecebedorDoc}
                    onChange={(e) => setBaixaRecebedorDoc(e.target.value)}
                    placeholder="Ex: RG, CPF, Tel ou Parentesco..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Vínculo se for terceiro */}
              {tipoRetirante === 'terceiro' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Vínculo do Terceiro
                  </label>
                  <select
                    value={baixaTerceiroVinculo}
                    onChange={(e) => setBaixaTerceiroVinculo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Prestador de Serviço">Prestador de Serviço / Técnico</option>
                    <option value="Visitante / Convidado">Visitante / Convidado</option>
                    <option value="Familiar / Parente">Familiar / Parente</option>
                    <option value="Entregador / Courier">Entregador / Courier</option>
                    <option value="Motorista de App">Motorista de Aplicativo (Uber/99)</option>
                    <option value="Outro Terceiro">Outro</option>
                  </select>
                </div>
              )}

              {/* SELETOR DE EVIDÊNCIA: FOTO OU ASSINATURA DIGITAL */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Comprovante da Devolução
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setModoEvidenciaBaixa('foto')}
                      className={`px-2 py-1 rounded-md transition ${modoEvidenciaBaixa === 'foto' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                    >
                      📷 Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoEvidenciaBaixa('assinatura')}
                      className={`px-2 py-1 rounded-md transition ${modoEvidenciaBaixa === 'assinatura' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                    >
                      ✍️ Assinatura
                    </button>
                  </div>
                </div>

                {/* Bloco de Foto */}
                {modoEvidenciaBaixa === 'foto' && (
                  <div>
                    {baixaFotoUrl ? (
                      <div className="flex items-center gap-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800">
                        <img
                          src={baixaFotoUrl}
                          alt="Comprovante"
                          className="w-14 h-14 rounded-xl object-cover border border-emerald-400 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 block">
                            Foto capturada com sucesso!
                          </span>
                          <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-block mt-0.5">
                            Tirar outra foto
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'custodia_saida', setBaixaFotoUrl)}
                              className="hidden"
                              disabled={uploadingFoto}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-2 transition text-xs font-bold">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>{uploadingFoto ? 'Processando imagem...' : 'Capturar Foto do Retirante ou Objeto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'custodia_saida', setBaixaFotoUrl)}
                          className="hidden"
                          disabled={uploadingFoto}
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Bloco de Assinatura Digital Touch */}
                {modoEvidenciaBaixa === 'assinatura' && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <CampoAssinaturaDigital
                      valor={baixaAssinaturaUrl}
                      onChange={setBaixaAssinaturaUrl}
                      onLimpar={() => setBaixaAssinaturaUrl('')}
                      nomeRetirante={baixaRecebedorNome}
                      altura={130}
                    />
                  </div>
                )}
              </div>

              {/* Botões Finais de Ação */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemParaBaixa(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-800"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{loading ? 'Efetivando...' : 'Confirmar e Finalizar Baixa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE RECEBER ITEM (NOVO REGISTRO LIMPO E ERGONÔMICO)                  */}
      {/* ========================================================================= */}
      {modalReceberAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header com Identificação Imediata do Fluxo Selecionado (Sem desvios) */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                  fluxoEntrada === 'M-M'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : fluxoEntrada === 'M-T'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {fluxoEntrada === 'M-M' && <Building2 className="w-5 h-5" />}
                  {fluxoEntrada === 'M-T' && <Truck className="w-5 h-5" />}
                  {fluxoEntrada === 'T-M' && <PackagePlus className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      fluxoEntrada === 'M-M'
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : fluxoEntrada === 'M-T'
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-amber-500/30 text-amber-300'
                    }`}>
                      {fluxoEntrada === 'M-M' ? 'Morador ➔ Morador' : fluxoEntrada === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">• Formulário Direto</span>
                  </div>
                  <h3 className="font-extrabold text-white text-base mt-0.5 truncate">
                    {fluxoEntrada === 'M-M' && 'Receber Custódia: Morador para Morador'}
                    {fluxoEntrada === 'M-T' && 'Receber Custódia: Morador para Terceiro'}
                    {fluxoEntrada === 'T-M' && 'Receber Custódia: Terceiro para Morador'}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {fluxoEntrada === 'M-M' && 'De morador para outro morador da comunidade'}
                    {fluxoEntrada === 'M-T' && 'De morador para prestador, visitante ou courier'}
                    {fluxoEntrada === 'T-M' && 'Deixado por terceiro na portaria com destino a morador'}
                  </p>
                </div>
              </div>

              {/* Botão de Fechar Formulário */}
              <button
                type="button"
                onClick={() => setModalReceberAberto(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
                title="Fechar Formulário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarNovoItem} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">

              {/* Grid: Origem e Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* CARD ORIGEM */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Origem (Quem Deixou)
                  </span>

                  {fluxoEntrada.startsWith('M') ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                            {rotuloUnidade} *
                          </label>
                          <input
                            type="text"
                            required
                            value={origemUnidade}
                            onChange={(e) => setOrigemUnidade(e.target.value)}
                            placeholder={eEstruturaCasas ? 'Ex: 01' : 'Ex: 101'}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                            {rotuloBloco}
                          </label>
                          {eEstruturaCasas ? (
                            <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold">
                              Casa
                            </div>
                          ) : (
                            <select
                              value={origemBloco}
                              onChange={(e) => setOrigemBloco(e.target.value)}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                            >
                              <option value="">Sem Bloco</option>
                              {listaBlocos.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Sugestões de moradores da unidade */}
                      {moradoresOrigemFiltrados.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {moradoresOrigemFiltrados.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setOrigemNome(m.nome);
                                if (m.telefone) setOrigemWhats(m.telefone);
                              }}
                              className="text-[10px] font-bold px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 cursor-pointer"
                            >
                              + {m.nome}
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                          Nome do Morador *
                        </label>
                        <input
                          type="text"
                          required
                          value={origemNome}
                          onChange={(e) => setOrigemNome(e.target.value)}
                          placeholder="Nome de quem deixou..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                          Nome do Terceiro / Visitante *
                        </label>
                        <input
                          type="text"
                          required
                          value={origemNome}
                          onChange={(e) => setOrigemNome(e.target.value)}
                          placeholder="Ex: Carlos (Técnico de Internet)"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                          WhatsApp / Telefone de Contato
                        </label>
                        <input
                          type="text"
                          value={origemWhats}
                          onChange={(e) => setOrigemWhats(e.target.value)}
                          placeholder="Ex: 11999998888"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* CARD DESTINO */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-2.5">
                  <span className="text-[11px] font-black uppercase text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    Destino (Para Quem)
                  </span>

                  {fluxoEntrada.endsWith('M') ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-0.5">
                            {rotuloUnidade} *
                          </label>
                          <input
                            type="text"
                            required
                            value={destinoUnidade}
                            onChange={(e) => setDestinoUnidade(e.target.value)}
                            placeholder={eEstruturaCasas ? 'Ex: 02' : 'Ex: 204'}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-0.5">
                            {rotuloBloco}
                          </label>
                          {eEstruturaCasas ? (
                            <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold">
                              Casa
                            </div>
                          ) : (
                            <select
                              value={destinoBloco}
                              onChange={(e) => setDestinoBloco(e.target.value)}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                            >
                              <option value="">Sem Bloco</option>
                              {listaBlocos.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Sugestões de moradores da unidade de destino */}
                      {moradoresDestinoFiltrados.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {moradoresDestinoFiltrados.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setDestinoNome(m.nome);
                                if (m.telefone) setDestinoWhats(m.telefone);
                              }}
                              className="text-[10px] font-bold px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-blue-300 text-blue-800 dark:text-blue-300 hover:bg-blue-50 cursor-pointer"
                            >
                              + {m.nome}
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-0.5">
                          Nome do Destinatário *
                        </label>
                        <input
                          type="text"
                          required
                          value={destinoNome}
                          onChange={(e) => setDestinoNome(e.target.value)}
                          placeholder="Nome de quem deve retirar..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-0.5">
                          Nome do Terceiro / Prestador *
                        </label>
                        <input
                          type="text"
                          required
                          value={destinoNome}
                          onChange={(e) => setDestinoNome(e.target.value)}
                          placeholder="Ex: João (Pintor) ou Uber Entregas"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-0.5">
                          WhatsApp para Notificar
                        </label>
                        <input
                          type="text"
                          value={destinoWhats}
                          onChange={(e) => setDestinoWhats(e.target.value)}
                          placeholder="Ex: 11999998888"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Descrição do Objeto */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Descrição do Objeto em Custódia *
                </label>
                <input
                  type="text"
                  required
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  placeholder="Ex: Molho de chaves com chaveiro azul, capacete preto, envelope da imobiliária..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Local de Armazenamento e Foto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Local de Armazenamento na Guarita
                  </label>
                  <input
                    type="text"
                    value={localArmazenamento}
                    onChange={(e) => setLocalArmazenamento(e.target.value)}
                    placeholder="Ex: Armário 2, Gaveta A, Bancada..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Foto do Objeto
                  </label>
                  {fotoEntradaUrl ? (
                    <div className="flex items-center gap-2 p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800">
                      <img src={fotoEntradaUrl} alt="Objeto" className="w-10 h-10 rounded-lg object-cover" />
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex-1 truncate">Foto capturada!</span>
                      <label className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer pr-1">
                        Trocar
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'custodia_entrada', setFotoEntradaUrl)}
                          className="hidden"
                          disabled={uploadingFoto}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 transition text-xs font-bold">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>{uploadingFoto ? 'Processando...' : '📷 Anexar Foto do Objeto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'custodia_entrada', setFotoEntradaUrl)}
                        className="hidden"
                        disabled={uploadingFoto}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalReceberAberto(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:bg-slate-300"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'Guardar e Emitir Protocolo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DOSSIÊ DO ITEM (AUDITORIA PERICIAL)                               */}
      {/* ========================================================================= */}
      {itemDossieModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    Dossiê Pericial de Custódia
                  </h3>
                  <span className="font-mono text-xs font-black text-purple-600">
                    {itemDossieModal.codigo_custodia}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemDossieModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Objeto:</span>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {itemDossieModal.descricao}
                </p>
                {itemDossieModal.local_armazenamento && (
                  <p className="text-[11px] text-slate-500">
                    Local: {itemDossieModal.local_armazenamento}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Origem (Quem Deixou):</span>
                  <p className="font-bold text-slate-900 dark:text-white">{itemDossieModal.origem_nome_doc}</p>
                  <p className="text-[11px] text-slate-500">{rotuloUnidade} {itemDossieModal.origem_unidade || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400">Entrada: {itemDossieModal.data_hora_entrada ? new Date(itemDossieModal.data_hora_entrada).toLocaleString('pt-BR') : '—'}</p>
                  <p className="text-[10px] text-slate-400">Operador: {itemDossieModal.operador_entrada || 'Portaria'}</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Destino & Retirada:</span>
                  <p className="font-bold text-slate-900 dark:text-white">{itemDossieModal.destino_nome_doc}</p>
                  <p className="text-[11px] text-slate-500">{rotuloUnidade} {itemDossieModal.destino_unidade || 'N/A'}</p>
                  {itemDossieModal.recebedor_nome ? (
                    <>
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Recebedor: {itemDossieModal.recebedor_nome}</p>
                      <p className="text-[10px] text-slate-500">Doc: {itemDossieModal.recebedor_doc || 'N/I'}</p>
                      <p className="text-[10px] text-slate-400">Saída: {itemDossieModal.data_hora_saida ? new Date(itemDossieModal.data_hora_saida).toLocaleString('pt-BR') : '—'}</p>
                      <p className="text-[10px] text-slate-400">Operador: {itemDossieModal.operador_saida || 'Portaria'}</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-600 font-bold italic">Aguardando Retirada</p>
                  )}
                </div>
              </div>

              {/* Fotos e Assinatura */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {(itemDossieModal.foto_entrada_url || itemDossieModal.foto_url) && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Foto de Entrada</span>
                    <img
                      src={itemDossieModal.foto_entrada_url || itemDossieModal.foto_url}
                      alt="Entrada"
                      className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-zoom-in"
                      onClick={() => setFotoAmpliadaModal({ url: itemDossieModal.foto_entrada_url || itemDossieModal.foto_url || '', titulo: 'Foto de Entrada' })}
                    />
                  </div>
                )}

                {itemDossieModal.foto_saida_url && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Foto de Saída / Comprovante</span>
                    <img
                      src={itemDossieModal.foto_saida_url}
                      alt="Saída"
                      className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-zoom-in"
                      onClick={() => setFotoAmpliadaModal({ url: itemDossieModal.foto_saida_url || '', titulo: 'Foto de Saída' })}
                    />
                  </div>
                )}

                {itemDossieModal.assinatura_url && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Assinatura Digital Coletada</span>
                    <div className="p-2 bg-white rounded-xl border border-slate-300">
                      <img src={itemDossieModal.assinatura_url} alt="Assinatura" className="max-h-20 object-contain mx-auto" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setItemDossieModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE AMPLIAÇÃO DE FOTO                                                */}
      {/* ========================================================================= */}
      {fotoAmpliadaModal && (
        <div
          onClick={() => setFotoAmpliadaModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-2xl w-full p-4 space-y-3 border border-slate-800 text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-xs sm:text-sm text-slate-200">{fotoAmpliadaModal.titulo}</h4>
              <button
                type="button"
                onClick={() => setFotoAmpliadaModal(null)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-black">
              <img
                src={fotoAmpliadaModal.url}
                alt="Comprovante"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Evidência registrada no sistema PorttoHub</span>
              <a
                href={fotoAmpliadaModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
              >
                Abrir imagem original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO DE ITEM DE CUSTÓDIA                                       */}
      {/* ========================================================================= */}
      {itemEmEdicao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Editar Custódia</h3>
                  <p className="text-[10px] font-mono text-slate-500">{itemEmEdicao.codigo_custodia}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemEmEdicao(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Descrição do Item *
                </label>
                <input
                  type="text"
                  required
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Local de Armazenamento
                </label>
                <input
                  type="text"
                  value={editLocal}
                  onChange={(e) => setEditLocal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Origem (Nome) *</label>
                  <input
                    type="text"
                    required
                    value={editOrigemNome}
                    onChange={(e) => setEditOrigemNome(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Destino (Nome) *</label>
                  <input
                    type="text"
                    required
                    value={editDestinoNome}
                    onChange={(e) => setEditDestinoNome(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setItemEmEdicao(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                                         */}
      {/* ========================================================================= */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 dark:border-rose-900 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Excluir Registro de Custódia?</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1 text-slate-800 dark:text-slate-200">
              <p>Código: <strong className="font-mono text-rose-900 dark:text-rose-300">{itemParaExcluir.codigo_custodia}</strong></p>
              <p>Item: <strong>{itemParaExcluir.descricao}</strong></p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={confirmarExclusao}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO EM LOTE (ITENS SELECIONADOS)             */}
      {/* ========================================================================= */}
      {modalExcluirSelecionados && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-rose-300 dark:border-rose-900 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Excluir Itens Selecionados?
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação removerá permanentemente os registros da custódia.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs space-y-1.5 text-slate-800 dark:text-slate-200">
              <p>
                Total selecionado: <strong className="text-rose-600 dark:text-rose-400 font-bold">{itensSelecionadosIds.length}</strong> {itensSelecionadosIds.length === 1 ? 'item' : 'itens'}.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Os registros selecionados serão apagados definitivamente do banco de dados e da bancada da portaria.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalExcluirSelecionados(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={confirmarExclusaoSelecionados}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{loading ? 'Excluindo...' : `Sim, Excluir ${itensSelecionadosIds.length} Itens`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disparo de WhatsApp Integrado */}
      <ModalWhatsAppDisparo
        isOpen={modalWhatsProps.isOpen}
        onClose={() => setModalWhatsProps(p => ({ ...p, isOpen: false }))}
        titulo={modalWhatsProps.titulo}
        subtitulo={modalWhatsProps.subtitulo}
        destinatarioNome={modalWhatsProps.destinatarioNome}
        telefoneInicial={modalWhatsProps.telefoneInicial}
        tipo={modalWhatsProps.tipo}
        mensagemTexto={modalWhatsProps.mensagemTexto}
        dadosComplementares={modalWhatsProps.dadosComplementares}
        operadorNome={usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'}
      />

      {/* ========================================================================= */}
      {/* BOTÃO FLUTUANTE DE CUSTÓDIA NO CANTO INFERIOR DIREITO COM 3 OPÇÕES        */}
      {/* ========================================================================= */}
      {podeCriar && !modalReceberAberto && !itemParaBaixa && (
        <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 z-40 flex flex-col items-end">
          {/* Menu Suspenso Speed-Dial com as 3 Opções de Formulário */}
          {fabCustodiaAberto && (
            <>
              {/* Backdrop para fechar ao clicar fora */}
              <div
                className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity"
                onClick={() => setFabCustodiaAberto(false)}
              />

              <div className="relative z-40 mb-3 space-y-2 w-72 sm:w-80 animate-in slide-in-from-bottom-3 zoom-in-95 duration-150">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="px-1 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Receber em Custódia
                    </span>
                    <button
                      type="button"
                      onClick={() => setFabCustodiaAberto(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Opção 1: Morador para Morador */}
                  <button
                    type="button"
                    onClick={() => {
                      setFluxoEntrada('M-M');
                      setFabCustodiaAberto(false);
                      setModalReceberAberto(true);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                        🏢
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white text-xs group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                          Morador ➔ Morador
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Entre moradores da mesma comunidade
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition" />
                  </button>

                  {/* Opção 2: Morador para Terceiro */}
                  <button
                    type="button"
                    onClick={() => {
                      setFluxoEntrada('M-T');
                      setFabCustodiaAberto(false);
                      setModalReceberAberto(true);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                        🚚
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white text-xs group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate">
                          Morador ➔ Terceiro
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Para prestador, visitante ou entregador
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0 group-hover:translate-x-0.5 transition" />
                  </button>

                  {/* Opção 3: Terceiro para Morador */}
                  <button
                    type="button"
                    onClick={() => {
                      setFluxoEntrada('T-M');
                      setFabCustodiaAberto(false);
                      setModalReceberAberto(true);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                        📦
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white text-xs group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate">
                          Terceiro ➔ Morador
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          De visitante ou entregador para morador
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 shrink-0 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Botão Principal Flutuante - Apenas Ícone de Receber Item */}
          <button
            type="button"
            onClick={() => setFabCustodiaAberto(!fabCustodiaAberto)}
            className={`relative z-40 group w-14 h-14 rounded-2xl shadow-2xl transition-all duration-200 border-2 cursor-pointer active:scale-95 flex items-center justify-center ${
              fabCustodiaAberto
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400 hover:scale-105 shadow-emerald-900/30'
            }`}
            title={fabCustodiaAberto ? 'Fechar opções' : 'Receber Item em Custódia'}
            aria-label="Receber Item em Custódia"
          >
            {fabCustodiaAberto ? (
              <X className="w-6 h-6 text-white transition-transform duration-200" />
            ) : (
              <PackagePlus className="w-6 h-6 text-white transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
