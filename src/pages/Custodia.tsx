import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
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
  Home
} from 'lucide-react';
import { 
  carregarCondominioConfig, 
  isEstruturaCasas, 
  isEstruturaTorres, 
  getNomeRotuloBloco, 
  getNomeRotuloUnidade, 
  obterListaBlocosOuTorres, 
  formatarIdentificacaoUnidade, 
  formatarTextoWhatsUnidade,
  saoUnidadesEquivalentes,
  CondominioConfig,
  getCondominioAtivoId
} from '../services/condominioService';
import { verificarPermissao } from '../services/permissoesService';
import { formatarLinkWhatsApp, dispararLinkWhatsApp } from '../services/configWhatsappService';
import { ModalWhatsAppDisparo } from '../components/ModalWhatsAppDisparo';
import { ImagemOtimizada } from '../components/ImagemOtimizada';
import { registrarAtividade } from '../services/auditoriaService';

interface CustodiaProps {
  usuarioLogado?: any;
}

export default function Custodia({ usuarioLogado }: CustodiaProps) {
  const eAdmin = usuarioLogado?.cargo === 'admin' || usuarioLogado?.permissao === 'admin' || usuarioLogado?.cargo === 'sindico' || usuarioLogado?.permissao === 'sindico';
  const podeCriar = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'criar') || verificarPermissao(usuarioLogado, 'custodia', 'receber') || eAdmin);
  const podeBaixa = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'baixa') || eAdmin);
  const podeEditar = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'editar') || eAdmin);
  const podeExcluir = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'excluir') || eAdmin);
  const podeAuditoria = Boolean(verificarPermissao(usuarioLogado, 'custodia', 'auditoria') || verificarPermissao(usuarioLogado, 'custodia', 'visualizar') || eAdmin);

  const [aba, setAba] = useState<'entrada' | 'saida' | 'auditoria'>('saida');
  const [modalSelecaoFluxoAberto, setModalSelecaoFluxoAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [itensGuardados, setItensGuardados] = useState<any[]>([]);
  const [historicoCompleto, setHistoricoCompleto] = useState<any[]>([]);

  // Filtros de Auditoria & Histórico
  const [buscaAuditoria, setBuscaAuditoria] = useState('');
  const [filtroStatusAuditoria, setFiltroStatusAuditoria] = useState<'todos' | 'aguardando' | 'retirado' | 'devolvidos_hoje'>('todos');
  const [filtroFluxoAuditoria, setFiltroFluxoAuditoria] = useState<'todos' | 'M-M' | 'M-T' | 'T-M'>('todos');
  const [filtroPeriodoAuditoria, setFiltroPeriodoAuditoria] = useState<'todos' | 'hoje' | '7dias' | '30dias' | string>('todos');

  // Menus Dropdown da Barra de Filtros
  const [menuFluxoAberto, setMenuFluxoAberto] = useState(false);
  const [menuPeriodoAberto, setMenuPeriodoAberto] = useState(false);

  const dropdownFluxoRef = useRef<HTMLDivElement>(null);
  const dropdownPeriodoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFora(e: MouseEvent | TouchEvent) {
      if (dropdownFluxoRef.current && !dropdownFluxoRef.current.contains(e.target as Node)) {
        setMenuFluxoAberto(false);
      }
      if (dropdownPeriodoRef.current && !dropdownPeriodoRef.current.contains(e.target as Node)) {
        setMenuPeriodoAberto(false);
      }
    }

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('touchstart', handleClickFora);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('touchstart', handleClickFora);
    };
  }, []);

  // Modais de Auditoria
  const [itemDossieModal, setItemDossieModal] = useState<any | null>(null);
  const [fotoAmpliadaModal, setFotoAmpliadaModal] = useState<{ url: string; titulo: string } | null>(null);
  const [copiadoDossie, setCopiadoDossie] = useState(false);

  const [fluxo, setFluxo] = useState('M-M');
  
  const [origemUnidade, setOrigemUnidade] = useState('');
  const [origemBloco, setOrigemBloco] = useState('');
  const [origemNome, setOrigemNome] = useState('');
  const [origemWhats, setOrigemWhats] = useState('');

  const [destinoUnidade, setDestinoUnidade] = useState('');
  const [destinoBloco, setDestinoBloco] = useState('');
  const [destinoNome, setDestinoNome] = useState('');
  const [destinoWhats, setDestinoWhats] = useState('');

  const [descricaoItem, setDescricaoItem] = useState('');
  const [fotoEntradaUrl, setFotoEntradaUrl] = useState('');
  const [whatsEntradaLink, setWhatsEntradaLink] = useState<any | null>(null);

  const [buscaTermo, setBuscaTermo] = useState('');
  const [itemSelecionadoSaida, setItemSelecionadoSaida] = useState<any | null>(null);
  const [tipoRetirante, setTipoRetirante] = useState<'morador' | 'depositante' | 'destinatario' | 'terceiro'>('destinatario');
  const [baixaUnidade, setBaixaUnidade] = useState('');
  const [baixaBloco, setBaixaBloco] = useState('');
  const [terceiroVinculo, setTerceiroVinculo] = useState('Visitante');
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [fotoSaidaUrl, setFotoSaidaUrl] = useState('');
  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));
  const [whatsSaidaLink, setWhatsSaidaLink] = useState<any | null>(null);

  // Estados de Edição de Custódia
  const [itemEmEdicao, setItemEmEdicao] = useState<any | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editLocal, setEditLocal] = useState('');
  const [editOrigemNome, setEditOrigemNome] = useState('');
  const [editOrigemUnidade, setEditOrigemUnidade] = useState('');
  const [editOrigemBloco, setEditOrigemBloco] = useState('');
  const [editDestinoNome, setEditDestinoNome] = useState('');
  const [editDestinoUnidade, setEditDestinoUnidade] = useState('');
  const [editDestinoBloco, setEditDestinoBloco] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  // Estado de Exclusão de Custódia
  const [itemParaExcluir, setItemParaExcluir] = useState<any | null>(null);

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

  useEffect(() => {
    carregarDados();
  }, [aba, condId]);

  const carregarDados = async () => {
    if (!condId || condId === 'global' || condId === 'todos') {
      setMoradores([]);
      setHistoricoCompleto([]);
      setItensGuardados([]);
      return;
    }

    setLoading(true);

    try {
      const cfg = await carregarCondominioConfig(condId);
      setCondoConfig(cfg);
      if (isEstruturaCasas(cfg?.tipo_estrutura)) {
        setOrigemBloco('Casa');
        setDestinoBloco('Casa');
      }

      const moradQuery = supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone')
        .eq('condominio_id', condId)
        .order('nome');
      const { data: moradData } = await moradQuery;
      setMoradores(moradData || []);

      const custodiaQuery = supabase
        .from('custodia')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false })
        .range(0, 99);
      const { data: custodiaData, error: errCustodia } = await custodiaQuery;

      if (errCustodia) throw errCustodia;

      const todos = custodiaData || [];
      setHistoricoCompleto(todos);

      const guardados = todos.filter((c: any) => {
        const s = (c.status || '').trim().toLowerCase();
        return s === 'aguardando retirada' || s === 'guardado' || s === 'retido' || s === 'pendente';
      });
      setItensGuardados(guardados);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const eEstruturaCasas = isEstruturaCasas(condoConfig?.tipo_estrutura);
  const eEstruturaTorres = isEstruturaTorres(condoConfig?.tipo_estrutura);
  const rotuloBloco = getNomeRotuloBloco(condoConfig?.tipo_estrutura);
  const rotuloUnidade = getNomeRotuloUnidade(condoConfig?.tipo_estrutura);

  const listaBlocos = obterListaBlocosOuTorres(condoConfig, moradores);

  const uploadFotoStorage = async (file: File | null, pasta: string, setUrlCallback: (url: string) => void) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { publicUrl, tamanhoOriginalKb, tamanhoComprimidoKb, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta,
        maxWidth: 1000,
        maxHeight: 1000,
        qualidade: 0.75
      });

      setUrlCallback(publicUrl);
      const detalheEconomia = taxaReducaoPct > 0 ? ` (${tamanhoOriginalKb}KB ➔ ${tamanhoComprimidoKb}KB, -${taxaReducaoPct}%)` : '';
      setMensagem({ tipo: 'sucesso', texto: `Foto salva com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const selecionarOrigemMorador = (unid: string, bloc: string) => {
    const blocoEfetivo = eEstruturaCasas ? 'Casa' : bloc;
    setOrigemUnidade(unid);
    setOrigemBloco(blocoEfetivo);
    // Não preenche automaticamente o nome nem o WhatsApp para evitar erros
  };

  const selecionarDestinoMorador = (unid: string, bloc: string) => {
    const blocoEfetivo = eEstruturaCasas ? 'Casa' : bloc;
    setDestinoUnidade(unid);
    setDestinoBloco(blocoEfetivo);
    // Não preenche automaticamente o nome nem o WhatsApp para evitar erros
  };


  const moradoresOrigemFiltrados = moradores.filter(
    (m) => origemUnidade && m.unidade && saoUnidadesEquivalentes(m.unidade, origemUnidade) && (eEstruturaCasas || !origemBloco || (m.bloco || '').toLowerCase() === origemBloco.toLowerCase())
  );
  const moradoresDestinoFiltrados = moradores.filter(
    (m) => destinoUnidade && m.unidade && saoUnidadesEquivalentes(m.unidade, destinoUnidade) && (eEstruturaCasas || !destinoBloco || (m.bloco || '').toLowerCase() === destinoBloco.toLowerCase())
  );
  const moradoresBaixaFiltrados = moradores.filter(
    (m) => baixaUnidade && m.unidade && saoUnidadesEquivalentes(m.unidade, baixaUnidade) && (eEstruturaCasas || !baixaBloco || (m.bloco || '').toLowerCase() === baixaBloco.toLowerCase())
  );

  const selecionarItemParaBaixa = (item: any) => {
    if (!podeBaixa) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: seu perfil não tem permissão para realizar Baixa ou Entrega de itens de Custódia.' });
      return;
    }
    setItemSelecionadoSaida(item);
    setFotoSaidaUrl('');

    // Ajusta o tipo padrão conforme o destino
    if (item.destino_tipo === 'Morador' && item.destino_unidade) {
      setTipoRetirante('morador');
      setBaixaUnidade(item.destino_unidade || '');
      setBaixaBloco(item.destino_bloco || '');
      setRecebedorNome(item.destino_nome_doc || '');
      setRecebedorDoc('');
    } else if (item.destino_tipo === 'Terceiro') {
      setTipoRetirante('terceiro');
      setRecebedorNome(item.destino_nome_doc || '');
      setRecebedorDoc('');
      setTerceiroVinculo('Prestador de Serviço');
    } else {
      setTipoRetirante('destinatario');
      setRecebedorNome(item.destino_nome_doc || '');
      setRecebedorDoc('');
    }
  };

  const mudarTipoRetirante = (tipo: 'morador' | 'depositante' | 'destinatario' | 'terceiro') => {
    setTipoRetirante(tipo);
    if (!itemSelecionadoSaida) return;

    if (tipo === 'depositante') {
      // Quem deixou voltou para buscar (devolução ao depositante)
      setRecebedorNome(itemSelecionadoSaida.origem_nome_doc || '');
      setRecebedorDoc('');
      setBaixaUnidade(itemSelecionadoSaida.origem_unidade || '');
      setBaixaBloco(itemSelecionadoSaida.origem_bloco || '');
    } else if (tipo === 'destinatario') {
      // Destinatário original cadastrado
      setRecebedorNome(itemSelecionadoSaida.destino_nome_doc || '');
      setRecebedorDoc('');
      setBaixaUnidade(itemSelecionadoSaida.destino_unidade || '');
      setBaixaBloco(itemSelecionadoSaida.destino_bloco || '');
    } else if (tipo === 'morador') {
      // Morador da unidade: pré-carrega unidade do destino (ou da origem)
      const u = itemSelecionadoSaida.destino_unidade || itemSelecionadoSaida.origem_unidade || '';
      const b = itemSelecionadoSaida.destino_bloco || itemSelecionadoSaida.origem_bloco || '';
      setBaixaUnidade(u);
      setBaixaBloco(b);
      setRecebedorNome('');
      setRecebedorDoc('');
    } else if (tipo === 'terceiro') {
      // Terceiro / visitante
      setRecebedorNome('');
      setRecebedorDoc('');
      setTerceiroVinculo('Visitante / Convidado');
    }
  };

  const salvarEntradaCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoItem.trim() || !fotoEntradaUrl.trim() || !origemNome.trim() || !destinoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha a origem, destino, descrição do item e tire a foto.' });
      return;
    }
    setLoading(true);

    try {
      const seq = Math.floor(1000 + Math.random() * 9000);
      const codigoCustodia = `CUST-${new Date().getFullYear()}-${seq}`;

      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id || '';
      if (!targetCondo || targetCondo === 'global' || targetCondo === 'todos') {
        setMensagem({ tipo: 'erro', texto: 'Selecione um condomínio válido antes de registrar a custódia.' });
        setLoading(false);
        return;
      }
      const novoRegistro = {
        condominio_id: targetCondo,
        codigo_custodia: codigoCustodia,
        fluxo,
        origem_tipo: fluxo.startsWith('M') ? 'Morador' : 'Terceiro',
        origem_unidade: origemUnidade.trim(),
        origem_bloco: eEstruturaCasas ? 'Casa' : origemBloco.trim(),
        origem_nome_doc: origemNome.trim(),
        origem_whats: fluxo.startsWith('M') ? '' : origemWhats.trim(),
        destino_tipo: fluxo.endsWith('M') ? 'Morador' : 'Terceiro',
        destino_unidade: destinoUnidade.trim(),
        destino_bloco: eEstruturaCasas ? 'Casa' : destinoBloco.trim(),
        destino_nome_doc: destinoNome.trim(),
        destino_whats: fluxo.endsWith('M') ? '' : destinoWhats.trim(),
        descricao: descricaoItem.trim(),
        foto_entrada_url: fotoEntradaUrl.trim(),
        status: 'Aguardando Retirada',
        operador_entrada: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
      };

      const { error } = await supabase
        .from('custodia')
        .insert([novoRegistro]);

      if (error) throw error;

      await registrarAtividade({
        condominio_id: targetCondo,
        modulo: 'custodia',
        acao: 'receber',
        descricao: `Custódia guardada (${codigoCustodia}): ${descricaoItem.trim()} de ${origemNome.trim()} para ${destinoNome.trim()}`,
        detalhes: { codigo: codigoCustodia, fluxo },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
      });

      const telDestino = (fluxo.endsWith('M') ? '' : destinoWhats).replace(/\D/g, '');
      const rotuloOrigem = origemUnidade ? `${origemNome} (${origemBloco ? origemBloco + ' ' : ''}${origemUnidade})` : `${origemNome} (Terceiro)`;
      const rotuloDestino = destinoUnidade ? `${destinoNome} (${destinoBloco ? destinoBloco + ' ' : ''}${destinoUnidade})` : `${destinoNome} (Terceiro)`;
      const fotoWhats = fotoEntradaUrl.trim() ? `• Foto do Objeto: ${fotoEntradaUrl.trim()}\n` : '';

      const textoWhats = `🔑 *ITEM EM CUSTÓDIA NA PORTARIA*\nCódigo: ${codigoCustodia}\n• De: ${rotuloOrigem}\n• Para: ${rotuloDestino}\n• Descrição: ${descricaoItem}\n${fotoWhats}• Local: Portaria / Guarita\n• Operador: ${usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'}\n• Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\nPor favor, retire na guarita informando o código *${codigoCustodia}*!`;

      const linkWhatsDestino = formatarLinkWhatsApp(telDestino, textoWhats);

      setWhatsEntradaLink({
        codigo: codigoCustodia,
        link: linkWhatsDestino
      });

      dispararLinkWhatsApp(linkWhatsDestino);

      setOrigemUnidade(''); setOrigemBloco(''); setOrigemNome(''); setOrigemWhats('');
      setDestinoUnidade(''); setDestinoBloco(''); setDestinoNome(''); setDestinoWhats('');
      setDescricaoItem(''); setFotoEntradaUrl('');
      carregarDados();
      setAba('saida');
      setMensagem({ tipo: 'sucesso', texto: `Item guardado com sucesso! Código: ${codigoCustodia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Funções de Edição de Custódia (com RBAC)
  const abrirEdicaoCustodia = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!podeEditar) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: seu perfil não tem permissão para editar itens de Custódia.' });
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

  const salvarEdicaoCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEmEdicao) return;
    if (!editDescricao.trim() || !editOrigemNome.trim() || !editDestinoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Descrição, nome de origem e nome de destino são obrigatórios.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('custodia')
        .update({
          descricao: editDescricao.trim(),
          local_armazenamento: editLocal.trim(),
          origem_nome_doc: editOrigemNome.trim(),
          origem_unidade: editOrigemUnidade.trim(),
          origem_bloco: editOrigemBloco.trim(),
          destino_nome_doc: editDestinoNome.trim(),
          destino_unidade: editDestinoUnidade.trim(),
          destino_bloco: editDestinoBloco.trim(),
          observacoes: editObservacoes.trim()
        })
        .eq('id', itemEmEdicao.id);

      if (error) throw error;

      await registrarAtividade({
        condominio_id: itemEmEdicao.condominio_id || condId,
        modulo: 'custodia',
        acao: 'editar',
        descricao: `Item de custódia editado (${itemEmEdicao.codigo_custodia}): "${editDescricao.trim()}"`,
        detalhes: { codigo: itemEmEdicao.codigo_custodia, id: itemEmEdicao.id },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
      });

      setItemEmEdicao(null);
      await carregarDados();
      setMensagem({ tipo: 'sucesso', texto: `Custódia ${itemEmEdicao.codigo_custodia} atualizada com sucesso!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao editar custódia: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Funções de Exclusão de Custódia (com RBAC)
  const abrirExclusaoCustodia = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!podeExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: seu perfil não tem permissão para excluir registros de Custódia.' });
      return;
    }
    setItemParaExcluir(item);
  };

  const confirmarExclusaoCustodia = async () => {
    if (!itemParaExcluir) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('custodia')
        .delete()
        .eq('id', itemParaExcluir.id);

      if (error) throw error;

      await registrarAtividade({
        condominio_id: itemParaExcluir.condominio_id || condId,
        modulo: 'custodia',
        acao: 'excluir',
        descricao: `Item de custódia excluído (${itemParaExcluir.codigo_custodia}): "${itemParaExcluir.descricao}"`,
        detalhes: { codigo: itemParaExcluir.codigo_custodia, id: itemParaExcluir.id },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
      });

      if (itemSelecionadoSaida?.id === itemParaExcluir.id) {
        setItemSelecionadoSaida(null);
      }
      setItemParaExcluir(null);
      await carregarDados();
      setMensagem({ tipo: 'sucesso', texto: `Item de custódia ${itemParaExcluir.codigo_custodia} excluído com sucesso.` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir custódia: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarSaidaCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSelecionadoSaida) return;
    if (!recebedorNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome de quem está retirando o item.' });
      return;
    }
    if (!fotoSaidaUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Tire ou anexe a foto do comprovante / retirante para efetivar a baixa.' });
      return;
    }
    setLoading(true);

    try {
      let docFormatado = recebedorDoc.trim();
      let modalidadeTexto = '';
      if (tipoRetirante === 'depositante') {
        modalidadeTexto = 'Devolvido ao Depositante';
        if (!docFormatado) docFormatado = 'Depositante';
      } else if (tipoRetirante === 'morador') {
        const rotUnid = eEstruturaCasas ? 'Casa' : 'Unid';
        modalidadeTexto = `Entregue a Morador (${rotUnid} ${baixaUnidade}${baixaBloco ? ' - Bloco ' + baixaBloco : ''})`;
        if (!docFormatado && baixaUnidade) {
          docFormatado = `${rotUnid} ${baixaUnidade}${baixaBloco ? ' / ' + baixaBloco : ''}`;
        }
      } else if (tipoRetirante === 'terceiro') {
        modalidadeTexto = `Entregue a Terceiro (${terceiroVinculo})`;
        if (terceiroVinculo && !docFormatado) {
          docFormatado = `Vínculo: ${terceiroVinculo}`;
        }
      } else {
        modalidadeTexto = 'Entregue ao Destinatário Original';
      }

      const { error } = await supabase
        .from('custodia')
        .update({
          status: 'Retirado',
          data_hora_saida: new Date().toISOString(),
          recebedor_nome: recebedorNome.trim(),
          recebedor_doc: docFormatado,
          foto_saida_url: fotoSaidaUrl.trim(),
          operador_saida: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        })
        .eq('id', itemSelecionadoSaida.id);

      if (error) throw error;

      await registrarAtividade({
        condominio_id: itemSelecionadoSaida.condominio_id || condId,
        modulo: 'custodia',
        acao: 'baixa',
        descricao: `Baixa em custódia ${itemSelecionadoSaida.codigo_custodia}: ${recebedorNome.trim()} (${modalidadeTexto})`,
        detalhes: {
          codigo: itemSelecionadoSaida.codigo_custodia,
          tipo_retirante: tipoRetirante,
          recebedor: recebedorNome.trim(),
          doc: docFormatado
        },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
      });

      const telOrigem = itemSelecionadoSaida.origem_whats?.replace(/\D/g, '') || itemSelecionadoSaida.destino_whats?.replace(/\D/g, '') || '';
      const rotuloOrig = itemSelecionadoSaida.origem_nome_doc || 'Depositante';
      const rotuloDest = itemSelecionadoSaida.destino_nome_doc || 'Destinatário';
      const fotoWhatsComprovante = fotoSaidaUrl.trim() ? `• Comprovante da Devolução: ${fotoSaidaUrl.trim()}\n` : '';

      const textoConfirmacao = `✅ *ITEM EM CUSTÓDIA RETIRADO / DEVOLVIDO*\nCódigo: ${itemSelecionadoSaida.codigo_custodia}\n• Objeto: ${itemSelecionadoSaida.descricao}\n• Deixado Por: ${rotuloOrig}\n• Destinado A: ${rotuloDest}\n• Modalidade: ${modalidadeTexto}\n• Quem Retirou: ${recebedorNome} ${docFormatado ? '(Doc/Ref: ' + docFormatado + ')' : ''}\n${fotoWhatsComprovante}• Operador Responsável: ${usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'}\n• Data/Hora: ${new Date().toLocaleString('pt-BR')}`;

      const linkSaidaWhats = formatarLinkWhatsApp(telOrigem, textoConfirmacao);

      setWhatsSaidaLink({
        link: linkSaidaWhats
      });

      // Dispara imediatamente de forma compatível e silenciosa
      dispararLinkWhatsApp(linkSaidaWhats);

      setItemSelecionadoSaida(null);
      setRecebedorNome(''); setRecebedorDoc(''); setFotoSaidaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída da custódia realizada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const itensFiltradosSaida = itensGuardados.filter((item: any) => {
    const termo = buscaTermo.toLowerCase();
    const cod = item.codigo_custodia?.toLowerCase() || '';
    const desc = item.descricao?.toLowerCase() || '';
    const dest = item.destino_nome_doc?.toLowerCase() || '';
    const orig = item.origem_nome_doc?.toLowerCase() || '';
    const unid = item.destino_unidade?.toLowerCase() || '';
    return cod.includes(termo) || desc.includes(termo) || dest.includes(termo) || orig.includes(termo) || unid.includes(termo);
  });

  // Funções de Cálculo e Auditoria
  const calcularPermanencia = (entradaIso: string, saidaIso?: string | null) => {
    if (!entradaIso) return 'N/D';
    const inicio = new Date(entradaIso).getTime();
    const fim = saidaIso ? new Date(saidaIso).getTime() : Date.now();
    const diffMs = fim - inicio;
    if (diffMs < 0) return '0 min';

    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
      const horasRestantes = horas % 24;
      return `${dias}d ${horasRestantes}h`;
    }
    if (horas > 0) {
      const minsRestantes = minutos % 60;
      return `${horas}h ${minsRestantes}m`;
    }
    return `${minutos} min`;
  };

  const exportarCSVCustodia = (itens: any[]) => {
    if (!itens || itens.length === 0) return;
    const cabecalhos = [
      'Codigo_Custodia',
      'Status',
      'Descricao',
      'Fluxo',
      'Origem_Tipo',
      'Origem_Nome',
      'Origem_Unidade',
      'Origem_Bloco',
      'Origem_Whats',
      'Destino_Tipo',
      'Destino_Nome',
      'Destino_Unidade',
      'Destino_Bloco',
      'Destino_Whats',
      'Data_Entrada',
      'Operador_Entrada',
      'Data_Saida',
      'Operador_Saida',
      'Recebedor_Nome',
      'Recebedor_Doc',
      'Foto_Entrada_URL',
      'Foto_Saida_URL'
    ];

    const linhas = itens.map(i => [
      `"${i.codigo_custodia || ''}"`,
      `"${i.status || ''}"`,
      `"${(i.descricao || '').replace(/"/g, '""')}"`,
      `"${i.fluxo || ''}"`,
      `"${i.origem_tipo || ''}"`,
      `"${(i.origem_nome_doc || '').replace(/"/g, '""')}"`,
      `"${i.origem_unidade || ''}"`,
      `"${i.origem_bloco || ''}"`,
      `"${i.origem_whats || ''}"`,
      `"${i.destino_tipo || ''}"`,
      `"${(i.destino_nome_doc || '').replace(/"/g, '""')}"`,
      `"${i.destino_unidade || ''}"`,
      `"${i.destino_bloco || ''}"`,
      `"${i.destino_whats || ''}"`,
      `"${i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : ''}"`,
      `"${i.operador_entrada || ''}"`,
      `"${i.data_hora_saida ? new Date(i.data_hora_saida).toLocaleString('pt-BR') : ''}"`,
      `"${i.operador_saida || ''}"`,
      `"${(i.recebedor_nome || '').replace(/"/g, '""')}"`,
      `"${i.recebedor_doc || ''}"`,
      `"${i.foto_entrada_url || ''}"`,
      `"${i.foto_saida_url || ''}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas.map(l => l.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_custodia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem de Auditoria
  const itensAuditoriaFiltrados = historicoCompleto.filter((item: any) => {
    // 1. Filtro por status
    if (filtroStatusAuditoria === 'aguardando') {
      const s = (item.status || '').toLowerCase();
      if (s !== 'aguardando retirada' && s !== 'guardado' && s !== 'retido' && s !== 'pendente') return false;
    } else if (filtroStatusAuditoria === 'retirado') {
      const s = (item.status || '').toLowerCase();
      if (s !== 'retirado') return false;
    } else if (filtroStatusAuditoria === 'devolvidos_hoje') {
      const s = (item.status || '').toLowerCase();
      if (s !== 'retirado' || !item.data_hora_saida) return false;
      const d = new Date(item.data_hora_saida);
      const h = new Date();
      if (d.toDateString() !== h.toDateString()) return false;
    }

    // 2. Filtro por fluxo
    if (filtroFluxoAuditoria !== 'todos') {
      if (item.fluxo !== filtroFluxoAuditoria) return false;
    }

    // 3. Filtro por período
    if (filtroPeriodoAuditoria !== 'todos') {
      const dataItem = new Date(item.created_at || item.data_hora_entrada || Date.now());
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (filtroPeriodoAuditoria === 'hoje') {
        const itemDia = new Date(dataItem);
        itemDia.setHours(0, 0, 0, 0);
        if (itemDia.getTime() !== hoje.getTime()) return false;
      } else if (filtroPeriodoAuditoria === '7dias') {
        const limite = new Date();
        limite.setDate(limite.getDate() - 7);
        if (dataItem < limite) return false;
      } else if (filtroPeriodoAuditoria === '30dias') {
        const limite = new Date();
        limite.setDate(limite.getDate() - 30);
        if (dataItem < limite) return false;
      } else if (typeof filtroPeriodoAuditoria === 'string' && filtroPeriodoAuditoria.startsWith('data:')) {
        const dataEscolhida = filtroPeriodoAuditoria.replace('data:', '');
        const itemAnoMesDia = dataItem.toISOString().slice(0, 10);
        if (itemAnoMesDia !== dataEscolhida) return false;
      }
    }

    // 4. Filtro por busca textual
    if (buscaAuditoria.trim()) {
      const t = buscaAuditoria.toLowerCase();
      const cod = (item.codigo_custodia || '').toLowerCase();
      const desc = (item.descricao || '').toLowerCase();
      const origNome = (item.origem_nome_doc || '').toLowerCase();
      const origUnid = (item.origem_unidade || '').toString().toLowerCase();
      const origBloc = (item.origem_bloco || '').toLowerCase();
      const destNome = (item.destino_nome_doc || '').toLowerCase();
      const destUnid = (item.destino_unidade || '').toString().toLowerCase();
      const destBloc = (item.destino_bloco || '').toLowerCase();
      const recNome = (item.recebedor_nome || '').toLowerCase();
      const recDoc = (item.recebedor_doc || '').toLowerCase();
      const opEnt = (item.operador_entrada || '').toLowerCase();
      const opSai = (item.operador_saida || '').toLowerCase();

      return (
        cod.includes(t) ||
        desc.includes(t) ||
        origNome.includes(t) ||
        origUnid.includes(t) ||
        origBloc.includes(t) ||
        destNome.includes(t) ||
        destUnid.includes(t) ||
        destBloc.includes(t) ||
        recNome.includes(t) ||
        recDoc.includes(t) ||
        opEnt.includes(t) ||
        opSai.includes(t)
      );
    }

    return true;
  });

  // Métricas de Auditoria
  const metricasAuditoria = {
    total: historicoCompleto.length,
    aguardando: itensGuardados.length,
    retirados: historicoCompleto.filter(i => (i.status || '').toLowerCase() === 'retirado').length,
    retiradosHoje: historicoCompleto.filter(i => {
      if ((i.status || '').toLowerCase() !== 'retirado' || !i.data_hora_saida) return false;
      const d = new Date(i.data_hora_saida);
      const h = new Date();
      return d.toDateString() === h.toDateString();
    }).length
  };

  return (
    <div className="space-y-3">
      {/* Barra Superior com Título e Botão de Histórico */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900 truncate">
              Custódia de Itens
            </h2>
            {aba === 'saida' && (
              <p className="text-[11px] font-bold text-blue-600 flex items-center gap-1.5 leading-tight mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>{itensGuardados.length} {itensGuardados.length === 1 ? 'item pendente' : 'itens pendentes'}</span>
              </p>
            )}
            {aba === 'entrada' && (
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 leading-tight mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Receber ({fluxo === 'M-M' ? 'Morador ➔ Morador' : fluxo === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'})</span>
              </p>
            )}
            {aba === 'auditoria' && (
              <p className="text-[11px] font-bold text-purple-600 flex items-center gap-1.5 leading-tight mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Histórico & Auditoria</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {podeAuditoria && (
            <button
              type="button"
              onClick={() => setAba(aba === 'auditoria' ? 'saida' : 'auditoria')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                aba === 'auditoria'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-purple-400" />
              <span>{aba === 'auditoria' ? 'Voltar para Baixas' : 'Histórico'}</span>
              {historicoCompleto.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  aba === 'auditoria' ? 'bg-purple-800 text-purple-100' : 'bg-slate-800 text-slate-300'
                }`}>
                  {historicoCompleto.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {aba === 'entrada' && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex justify-center items-start animate-in fade-in duration-150">
          <div className="bg-white my-auto sm:my-4 p-4 sm:p-6 rounded-2xl shadow-2xl border border-slate-200 space-y-4 w-full max-w-4xl relative animate-in zoom-in-95 duration-150">
            {/* Cabeçalho Limpo e Direto (Sem descrição prolixa) */}
            <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  fluxo === 'M-M' ? 'bg-emerald-100 text-emerald-700' :
                  fluxo === 'M-T' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                    Receber Item em Custódia
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shadow-2xs ${
                    fluxo === 'M-M' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                    fluxo === 'M-T' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                    'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {fluxo === 'M-M' ? 'Morador ➔ Morador' : fluxo === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalSelecaoFluxoAberto(true)}
                    className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                  >
                    (Alterar fluxo)
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAba('saida')}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarEntradaCustodia} className="space-y-3.5">
              {/* Grid Compacto: Origem & Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* CARD ORIGEM */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                    <span className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      Origem (Quem Deixou)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      {fluxo.startsWith('M') ? 'Morador' : 'Terceiro'}
                    </span>
                  </div>

                  {fluxo.startsWith('M') ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            {rotuloUnidade} *
                          </label>
                          <input
                            type="text"
                            required
                            value={origemUnidade}
                            onChange={(e) => {
                              selecionarOrigemMorador(e.target.value, origemBloco);
                              setOrigemNome('');
                              setOrigemWhats('');
                            }}
                            placeholder={eEstruturaCasas ? "Ex: 01" : "Ex: 101"}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            {rotuloBloco}
                          </label>
                          {eEstruturaCasas ? (
                            <div className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-xs font-bold flex items-center justify-between">
                              <span>Casa</span>
                              <span className="text-[8px] bg-emerald-200 text-emerald-900 px-1 rounded uppercase font-black">Auto</span>
                            </div>
                          ) : (
                            <select
                              value={origemBloco}
                              onChange={(e) => {
                                setOrigemBloco(e.target.value);
                                selecionarOrigemMorador(origemUnidade, e.target.value);
                                setOrigemNome('');
                                setOrigemWhats('');
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              <option value="">{eEstruturaTorres ? 'Sem Torre' : 'Sem Bloco'}</option>
                              {listaBlocos.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {moradoresOrigemFiltrados.length > 0 && (
                        <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/70 space-y-1">
                          <span className="block text-[9px] font-black text-emerald-900 uppercase">
                            Selecione o Morador da {eEstruturaCasas ? 'Casa' : 'Unidade'} {origemUnidade}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {moradoresOrigemFiltrados.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setOrigemNome(m.nome);
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer active:scale-95 shadow-2xs ${
                                  origemNome === m.nome
                                    ? 'bg-emerald-600 text-white border border-emerald-700 ring-1 ring-emerald-600 shadow-xs'
                                    : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {m.nome}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Nome do Morador *
                        </label>
                        <input
                          type="text"
                          required
                          value={origemNome}
                          onChange={(e) => setOrigemNome(e.target.value)}
                          placeholder={moradoresOrigemFiltrados.length > 0 ? "Clique no morador acima para selecionar" : "Nome do morador"}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Nome / Empresa do Terceiro *
                        </label>
                        <input
                          type="text"
                          required
                          value={origemNome}
                          onChange={(e) => setOrigemNome(e.target.value)}
                          placeholder="Ex: Farmácia, Entregador..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          WhatsApp / Contato do Terceiro
                        </label>
                        <input
                          type="text"
                          value={origemWhats}
                          onChange={(e) => setOrigemWhats(e.target.value)}
                          placeholder="Ex: (11) 99999-9999"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD DESTINO */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                    <span className="text-[11px] font-black uppercase text-blue-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Destino (Quem Retira)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                      {fluxo.endsWith('M') ? 'Morador' : 'Terceiro'}
                    </span>
                  </div>

                  {fluxo.endsWith('M') ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            {rotuloUnidade} *
                          </label>
                          <input
                            type="text"
                            required
                            value={destinoUnidade}
                            onChange={(e) => {
                              selecionarDestinoMorador(e.target.value, destinoBloco);
                              setDestinoNome('');
                              setDestinoWhats('');
                            }}
                            placeholder={eEstruturaCasas ? "Ex: 01" : "Ex: 101"}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            {rotuloBloco}
                          </label>
                          {eEstruturaCasas ? (
                            <div className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-xs font-bold flex items-center justify-between">
                              <span>Casa</span>
                              <span className="text-[8px] bg-emerald-200 text-emerald-900 px-1 rounded uppercase font-black">Auto</span>
                            </div>
                          ) : (
                            <select
                              value={destinoBloco}
                              onChange={(e) => {
                                setDestinoBloco(e.target.value);
                                selecionarDestinoMorador(destinoUnidade, e.target.value);
                                setDestinoNome('');
                                setDestinoWhats('');
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">{eEstruturaTorres ? 'Sem Torre' : 'Sem Bloco'}</option>
                              {listaBlocos.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {moradoresDestinoFiltrados.length > 0 && (
                        <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-200/70 space-y-1">
                          <span className="block text-[9px] font-black text-blue-900 uppercase">
                            Selecione o Morador da {eEstruturaCasas ? 'Casa' : 'Unidade'} {destinoUnidade}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {moradoresDestinoFiltrados.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setDestinoNome(m.nome);
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer active:scale-95 shadow-2xs ${
                                  destinoNome === m.nome
                                    ? 'bg-blue-600 text-white border border-blue-700 ring-1 ring-blue-600 shadow-xs'
                                    : 'bg-white hover:bg-blue-100 text-blue-900 border border-blue-300'
                                }`}
                              >
                                {m.nome}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Nome do Morador Destinatário *
                        </label>
                        <input
                          type="text"
                          required
                          value={destinoNome}
                          onChange={(e) => setDestinoNome(e.target.value)}
                          placeholder={moradoresDestinoFiltrados.length > 0 ? "Clique no morador acima para selecionar" : "Nome do destinatário"}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          Nome / Documento do Terceiro *
                        </label>
                        <input
                          type="text"
                          required
                          value={destinoNome}
                          onChange={(e) => setDestinoNome(e.target.value)}
                          placeholder="Ex: Prestador, Visitante..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          WhatsApp / Contato do Terceiro
                        </label>
                        <input
                          type="text"
                          value={destinoWhats}
                          onChange={(e) => setDestinoWhats(e.target.value)}
                          placeholder="Ex: (11) 99999-9999"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* CARD DADOS DO OBJETO & FOTO (PRÁTICO E INTEGRADO) */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  
                  {/* Descrição do Objeto (7 colunas) */}
                  <div className="md:col-span-7 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">
                      Descrição do Objeto em Custódia *
                    </label>
                    <input
                      type="text"
                      required
                      value={descricaoItem}
                      onChange={(e) => setDescricaoItem(e.target.value)}
                      placeholder="Ex: Molho de chaves com chaveiro azul, envelope lacrado, capacete..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                    />
                  </div>

                  {/* Foto do Objeto (5 colunas) */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">
                      Foto do Objeto *
                    </label>

                    {fotoEntradaUrl ? (
                      <div className="flex items-center gap-2.5 bg-white p-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                        <div className="relative w-11 h-11 rounded-md overflow-hidden border border-emerald-500 shrink-0">
                          <img src={fotoEntradaUrl} alt="Objeto" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-black text-emerald-800 leading-tight">
                            Foto anexada
                          </span>
                          <label className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 underline cursor-pointer">
                            Tirar outra
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_entrada', setFotoEntradaUrl)}
                              className="hidden"
                              disabled={uploadingFoto}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-xs active:scale-[0.98]">
                        <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadingFoto ? 'Processando...' : '📷 Anexar Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_entrada', setFotoEntradaUrl)}
                          className="hidden"
                          disabled={uploadingFoto}
                        />
                      </label>
                    )}
                  </div>

                </div>
              </div>

              {/* Ações do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAba('saida')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition shadow-xs uppercase text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Confirmar e Guardar</span>
                </button>
              </div>
            </form>

          {whatsEntradaLink && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-4xl">
              <p className="text-xs font-bold text-emerald-900">
                Custódia {whatsEntradaLink.codigo} registrada! Notifique o destinatário no WhatsApp:
              </p>
              <a
                href={whatsEntradaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Notificação de Guarda no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          </div>
        </div>
      )}

      {aba === 'saida' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          {whatsEntradaLink && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Custódia <strong>{whatsEntradaLink.codigo}</strong> cadastrada com sucesso!
                </p>
                <button
                  type="button"
                  onClick={() => setWhatsEntradaLink(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <a
                href={whatsEntradaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Notificação no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="border-b pb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-blue-600" /> Devolução de Objeto em Custódia
            </h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar por código, unidade, nome do morador ou descrição..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {itensFiltradosSaida.map((item: any) => {
              const estaSelecionado = itemSelecionadoSaida?.id === item.id;
              const permanencia = calcularPermanencia(item.data_hora_entrada || item.created_at);

              return (
                <div
                  key={item.id}
                  onClick={() => selecionarItemParaBaixa(item)}
                  className={`relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 shadow-2xs ${
                    estaSelecionado
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 hover:shadow-xs'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md tracking-wider shadow-2xs">
                          {item.codigo_custodia}
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {permanencia}
                        </span>
                        {item.local_armazenamento && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                            📍 {item.local_armazenamento}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-2 leading-tight">
                        {item.descricao}
                      </h4>
                    </div>

                    {/* Ações no Card: Editar / Excluir / Foto miniatura */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={(e) => abrirEdicaoCustodia(item, e)}
                          title="Editar Item em Custódia"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition active:scale-95 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={(e) => abrirExclusaoCustodia(item, e)}
                          title="Excluir Registro de Custódia"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(item.foto_entrada_url || item.foto_url) && (
                        <div 
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100 cursor-zoom-in ml-1"
                          onClick={() => setFotoAmpliadaModal({ url: item.foto_entrada_url || item.foto_url, titulo: `Foto do Item: ${item.codigo_custodia}` })}
                          title="Clique para ampliar a foto"
                        >
                          <ImagemOtimizada
                            src={item.foto_entrada_url || item.foto_url}
                            alt="Foto do objeto"
                            permitirAmpliar={false}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações de Origem e Destino */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50/90 p-2.5 rounded-lg border border-slate-200/80">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Deixado por:
                      </div>
                      <p className="font-bold text-slate-900 truncate">
                        {item.origem_nome_doc || 'Depositante não informado'}
                      </p>
                      {item.origem_unidade && (
                        <p className="text-[10px] font-semibold text-slate-600">
                          {eEstruturaCasas ? 'Casa' : 'Unid.'} {item.origem_unidade} {item.origem_bloco && !eEstruturaCasas ? `(${item.origem_bloco})` : ''}
                        </p>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-2.5 pt-1.5 sm:pt-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Destinado a:
                      </div>
                      <p className="font-bold text-slate-900 truncate">
                        {item.destino_nome_doc || 'Destinatário não informado'}
                      </p>
                      {item.destino_unidade && (
                        <p className="text-[10px] font-semibold text-slate-600">
                          {eEstruturaCasas ? 'Casa' : 'Unid.'} {item.destino_unidade} {item.destino_bloco && !eEstruturaCasas ? `(${item.destino_bloco})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Status e Botão de Ação */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(item.data_hora_entrada || item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.data_hora_entrada || item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      disabled={!podeBaixa}
                      onClick={(e) => {
                        e.stopPropagation();
                        selecionarItemParaBaixa(item);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                        estaSelecionado
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>{estaSelecionado ? 'Em Baixa' : 'Dar Baixa'}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {itensFiltradosSaida.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum objeto aguardando retirada no momento.
              </div>
            )}
          </div>

          {/* MENU DINÂMICO DE BAIXA DE CUSTÓDIA */}
          {itemSelecionadoSaida && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl border border-slate-800 animate-in fade-in">
              {/* Header da Baixa */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      {itemSelecionadoSaida.codigo_custodia}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Entrada: {new Date(itemSelecionadoSaida.data_hora_entrada || itemSelecionadoSaida.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-base text-white mt-1">
                    Baixa de Custódia: <span className="text-emerald-400">{itemSelecionadoSaida.descricao}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Origem: <strong className="text-slate-200">{itemSelecionadoSaida.origem_nome_doc}</strong> {itemSelecionadoSaida.origem_unidade ? `(${eEstruturaCasas ? 'Casa' : 'Ap'} ${itemSelecionadoSaida.origem_unidade})` : ''} ➔ Destino: <strong className="text-slate-200">{itemSelecionadoSaida.destino_nome_doc}</strong> {itemSelecionadoSaida.destino_unidade ? `(${eEstruturaCasas ? 'Casa' : 'Ap'} ${itemSelecionadoSaida.destino_unidade})` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setItemSelecionadoSaida(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar Baixa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Seletor do Tipo de Movimentação / Retirante */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Quem está retirando o objeto? (Tipo de Movimentação)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Opção 1: Morador da Unidade */}
                  <button
                    type="button"
                    onClick={() => mudarTipoRetirante('morador')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      tipoRetirante === 'morador'
                        ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Building2 className={`w-4 h-4 ${tipoRetirante === 'morador' ? 'text-blue-400' : 'text-slate-400'}`} />
                      {tipoRetirante === 'morador' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Morador</div>
                      <div className="text-[10px] text-slate-400 leading-tight">Lista por unidade</div>
                    </div>
                  </button>

                  {/* Opção 2: Quem Deixou (Devolução ao Depositante) */}
                  <button
                    type="button"
                    onClick={() => mudarTipoRetirante('depositante')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      tipoRetirante === 'depositante'
                        ? 'bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <RotateCcw className={`w-4 h-4 ${tipoRetirante === 'depositante' ? 'text-amber-400' : 'text-slate-400'}`} />
                      {tipoRetirante === 'depositante' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Quem Deixou</div>
                      <div className="text-[10px] text-slate-400 leading-tight">Devolução original</div>
                    </div>
                  </button>

                  {/* Opção 3: Destinatário Original */}
                  <button
                    type="button"
                    onClick={() => mudarTipoRetirante('destinatario')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      tipoRetirante === 'destinatario'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <UserCheck className={`w-4 h-4 ${tipoRetirante === 'destinatario' ? 'text-emerald-400' : 'text-slate-400'}`} />
                      {tipoRetirante === 'destinatario' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Destinatário</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{itemSelecionadoSaida.destino_nome_doc || 'Original'}</div>
                    </div>
                  </button>

                  {/* Opção 4: Terceiro / Prestador */}
                  <button
                    type="button"
                    onClick={() => mudarTipoRetirante('terceiro')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      tipoRetirante === 'terceiro'
                        ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Users className={`w-4 h-4 ${tipoRetirante === 'terceiro' ? 'text-purple-400' : 'text-slate-400'}`} />
                      {tipoRetirante === 'terceiro' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Terceiro</div>
                      <div className="text-[10px] text-slate-400 leading-tight">Visitante / Prestador</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Formulário Dinâmico baseado no tipo */}
              <form onSubmit={efetivarSaidaCustodia} className="space-y-4">
                {/* CASO 1: MORADOR DA UNIDADE */}
                {tipoRetirante === 'morador' && (
                  <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs border-b border-slate-700 pb-2">
                      <Building2 className="w-4 h-4" />
                      <span>Identificação da Unidade e Seleção do Morador</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Número da {rotuloUnidade} *
                        </label>
                        <input
                          type="text"
                          required
                          value={baixaUnidade}
                          onChange={(e) => setBaixaUnidade(e.target.value)}
                          placeholder={`Ex: 101, 204...`}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          {rotuloBloco}
                        </label>
                        {eEstruturaCasas ? (
                          <div className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-400 text-xs font-semibold">
                            Casas
                          </div>
                        ) : (
                          <select
                            value={baixaBloco}
                            onChange={(e) => setBaixaBloco(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">{eEstruturaTorres ? 'Todas as Torres' : 'Todos os Blocos'}</option>
                            {listaBlocos.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Lista de Moradores da Unidade para clique rápido */}
                    {baixaUnidade && (
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/80 space-y-2">
                        <span className="block text-[10px] font-black text-blue-400 uppercase tracking-wider">
                          Moradores cadastrados na {rotuloUnidade} {baixaUnidade}:
                        </span>

                        {moradoresBaixaFiltrados.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {moradoresBaixaFiltrados.map((m) => {
                              const selecionado = recebedorNome === m.nome;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setRecebedorNome(m.nome);
                                    if (m.telefone) setRecebedorDoc(`Tel: ${m.telefone}`);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                                    selecionado
                                      ? 'bg-blue-600 text-white border border-blue-500 ring-2 ring-blue-500/50'
                                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                                  }`}
                                >
                                  <User className="w-3 h-3 text-blue-400" />
                                  <span>{m.nome}</span>
                                  {selecionado && <Check className="w-3 h-3 text-white" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Nenhum morador cadastrado com este número. Digite o nome do morador abaixo:
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Nome do Morador Retirante *
                        </label>
                        <input
                          type="text"
                          required
                          value={recebedorNome}
                          onChange={(e) => setRecebedorNome(e.target.value)}
                          placeholder="Clique em um morador acima ou digite o nome"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                          <span>Documento / RG / Tel</span>
                          <span className="text-[9px] text-slate-400 lowercase font-normal">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={recebedorDoc}
                          onChange={(e) => setRecebedorDoc(e.target.value)}
                          placeholder="Ex: RG, CPF ou Telefone"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CASO 2: QUEM DEIXOU (DEVOLUÇÃO) */}
                {tipoRetirante === 'depositante' && (
                  <div className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-800/40 space-y-3">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs border-b border-amber-800/30 pb-2">
                      <RotateCcw className="w-4 h-4" />
                      <span>Devolução para Quem Guardou o Objeto</span>
                    </div>

                    <div className="p-2.5 bg-amber-900/30 rounded-lg border border-amber-700/40 text-amber-200 text-xs">
                      <p>
                        A pessoa que depositou o item (<strong>{itemSelecionadoSaida.origem_nome_doc}</strong>) está pegando o objeto de volta.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Nome de Quem Deixou (Retirante) *
                        </label>
                        <input
                          type="text"
                          required
                          value={recebedorNome}
                          onChange={(e) => setRecebedorNome(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                          <span>Documento / RG / CPF</span>
                          <span className="text-[9px] text-slate-400 lowercase font-normal">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={recebedorDoc}
                          onChange={(e) => setRecebedorDoc(e.target.value)}
                          placeholder="Ex: RG ou CPF do retirante"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CASO 3: DESTINATÁRIO ORIGINAL */}
                {tipoRetirante === 'destinatario' && (
                  <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-800/40 space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs border-b border-emerald-800/30 pb-2">
                      <UserCheck className="w-4 h-4" />
                      <span>Entrega para o Destinatário Cadastrado</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Nome do Destinatário *
                        </label>
                        <input
                          type="text"
                          required
                          value={recebedorNome}
                          onChange={(e) => setRecebedorNome(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                          <span>Documento / RG / CPF</span>
                          <span className="text-[9px] text-slate-400 lowercase font-normal">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={recebedorDoc}
                          onChange={(e) => setRecebedorDoc(e.target.value)}
                          placeholder="Ex: RG ou CPF do recebedor"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CASO 4: TERCEIRO / VISITANTE / PRESTADOR */}
                {tipoRetirante === 'terceiro' && (
                  <div className="bg-purple-950/20 p-3.5 rounded-xl border border-purple-800/40 space-y-3">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs border-b border-purple-800/30 pb-2">
                      <Users className="w-4 h-4" />
                      <span>Identificação do Terceiro / Prestador / Visitante</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Nome Completo do Terceiro *
                        </label>
                        <input
                          type="text"
                          required
                          value={recebedorNome}
                          onChange={(e) => setRecebedorNome(e.target.value)}
                          placeholder="Ex: Carlos Eduardo (Prestador de Pintura)"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                          Tipo de Vínculo
                        </label>
                        <select
                          value={terceiroVinculo}
                          onChange={(e) => setTerceiroVinculo(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="Prestador de Serviço">Prestador de Serviço</option>
                          <option value="Visitante / Convidado">Visitante / Convidado</option>
                          <option value="Familiar / Parente">Familiar / Parente</option>
                          <option value="Motorista / Uber / 99">Motorista de Aplicativo</option>
                          <option value="Entregador / Courier">Entregador</option>
                          <option value="Outro Terceiro">Outro</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                        <span>Documento / RG / CPF do Terceiro</span>
                        <span className="text-[9px] text-purple-300 lowercase font-medium bg-purple-900/50 px-2 py-0.5 rounded border border-purple-700/50">opcional</span>
                      </label>
                      <input
                        type="text"
                        value={recebedorDoc}
                        onChange={(e) => setRecebedorDoc(e.target.value)}
                        placeholder="Ex: 12.345.678-9 (RG ou CPF se fornecido)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {/* Comprovante Fotográfico Obrigatório */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Foto do Retirante com o Objeto / Comprovante *
                  </label>
                  <label className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs border border-slate-700 shadow-2xs">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{uploadingFoto ? 'Processando e salvando comprovante...' : '📷 Tirar Foto da Devolução / Retirante'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_saida', setFotoSaidaUrl)}
                      className="hidden"
                      disabled={uploadingFoto}
                    />
                  </label>

                  {fotoSaidaUrl && (
                    <div className="mt-2 flex items-center gap-3 p-2.5 bg-slate-800/90 rounded-xl border border-emerald-500/50">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-400 shrink-0">
                        <img src={fotoSaidaUrl} alt="Foto Retirada" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Foto capturada com sucesso!
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Pronto para registrar a baixa de saída no sistema.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setItemSelecionadoSaida(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploadingFoto}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-black rounded-xl transition shadow-lg text-xs flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Efetivar Baixa de Devolução</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {whatsSaidaLink && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-2xl">
              <p className="text-xs font-bold text-emerald-900">
                Devolução concluída! Notifique quem deixou o objeto sobre a entrega:
              </p>
              <a
                href={whatsSaidaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Confirmação de Entrega no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLUXO 3: AUDITORIA & HISTÓRICO COMPLETO DE ITENS DE CUSTÓDIA              */}
      {/* ========================================================================= */}
      {aba === 'auditoria' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-4 animate-fade-in">
          {/* Header da Auditoria */}
          <div className="border-b pb-3 border-slate-100 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Auditoria & Dossiê de Custódia
              </span>

              <button
                type="button"
                onClick={carregarDados}
                className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition cursor-pointer text-[10px] font-bold flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                title="Atualizar Dados"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-purple-600' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              Histórico Pericial de Custódia na Portaria
            </h3>
          </div>

          {/* Cards de Métricas / Resumo Compactos (Botões Interativos com Filtro Direto) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Botão 1: Total de Objetos */}
            <button
              type="button"
              onClick={() => {
                setFiltroStatusAuditoria('todos');
                setFiltroPeriodoAuditoria('todos');
              }}
              className={`px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer active:scale-98 text-left ${
                filtroStatusAuditoria === 'todos' && filtroPeriodoAuditoria === 'todos'
                  ? 'bg-purple-900 border-purple-950 text-white shadow-xs ring-2 ring-purple-600/30'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
              }`}
              title="Clique para filtrar: Exibir todos os registros de custódia"
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                filtroStatusAuditoria === 'todos' && filtroPeriodoAuditoria === 'todos' ? 'text-purple-200' : 'text-slate-500'
              }`}>
                Total de Objetos
              </span>
              <span className={`text-sm font-black ${
                filtroStatusAuditoria === 'todos' && filtroPeriodoAuditoria === 'todos' ? 'text-white' : 'text-slate-900'
              }`}>
                {metricasAuditoria.total}
              </span>
            </button>

            {/* Botão 2: Em Custódia */}
            <button
              type="button"
              onClick={() => {
                setFiltroStatusAuditoria(filtroStatusAuditoria === 'aguardando' ? 'todos' : 'aguardando');
              }}
              className={`px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer active:scale-98 text-left ${
                filtroStatusAuditoria === 'aguardando'
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs ring-2 ring-amber-500/30'
                  : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100 hover:border-amber-300 text-amber-900'
              }`}
              title="Clique para filtrar: Apenas objetos em custódia na portaria"
            >
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                filtroStatusAuditoria === 'aguardando' ? 'text-amber-100' : 'text-amber-800'
              }`}>
                <Clock className={`w-3 h-3 shrink-0 ${filtroStatusAuditoria === 'aguardando' ? 'text-white' : 'text-amber-600'}`} />
                <span>Em Custódia</span>
              </span>
              <span className={`text-sm font-black ${
                filtroStatusAuditoria === 'aguardando' ? 'text-white' : 'text-amber-900'
              }`}>
                {metricasAuditoria.aguardando}
              </span>
            </button>

            {/* Botão 3: Já Devolvidos */}
            <button
              type="button"
              onClick={() => {
                setFiltroStatusAuditoria(filtroStatusAuditoria === 'retirado' ? 'todos' : 'retirado');
              }}
              className={`px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer active:scale-98 text-left ${
                filtroStatusAuditoria === 'retirado'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs ring-2 ring-emerald-600/30'
                  : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-900'
              }`}
              title="Clique para filtrar: Objetos já devolvidos / retirados"
            >
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                filtroStatusAuditoria === 'retirado' ? 'text-emerald-100' : 'text-emerald-800'
              }`}>
                <CheckCircle2 className={`w-3 h-3 shrink-0 ${filtroStatusAuditoria === 'retirado' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Já Devolvidos</span>
              </span>
              <span className={`text-sm font-black ${
                filtroStatusAuditoria === 'retirado' ? 'text-white' : 'text-emerald-900'
              }`}>
                {metricasAuditoria.retirados}
              </span>
            </button>

            {/* Botão 4: Devolvidos Hoje */}
            <button
              type="button"
              onClick={() => {
                setFiltroStatusAuditoria(filtroStatusAuditoria === 'devolvidos_hoje' ? 'todos' : 'devolvidos_hoje');
              }}
              className={`px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer active:scale-98 text-left ${
                filtroStatusAuditoria === 'devolvidos_hoje'
                  ? 'bg-blue-600 border-blue-700 text-white shadow-xs ring-2 ring-blue-600/30'
                  : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-900'
              }`}
              title="Clique para filtrar: Objetos devolvidos hoje"
            >
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                filtroStatusAuditoria === 'devolvidos_hoje' ? 'text-blue-100' : 'text-blue-800'
              }`}>
                <Calendar className={`w-3 h-3 shrink-0 ${filtroStatusAuditoria === 'devolvidos_hoje' ? 'text-white' : 'text-blue-600'}`} />
                <span>Devolvidos Hoje</span>
              </span>
              <span className={`text-sm font-black ${
                filtroStatusAuditoria === 'devolvidos_hoje' ? 'text-white' : 'text-blue-900'
              }`}>
                {metricasAuditoria.retiradosHoje}
              </span>
            </button>
          </div>

          {/* Barra de Pesquisa e Filtros Reestruturada: As 2 Listas de Filtro Acima da Barra de Pesquisa */}
          <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            {/* Linha Superior: Menus Dropdown (Fluxo e Período) e Botão de Limpar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 1. Dropdown Fluxo */}
              <div className="relative" ref={dropdownFluxoRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuFluxoAberto(!menuFluxoAberto);
                    setMenuPeriodoAberto(false);
                  }}
                  className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                    filtroFluxoAuditoria !== 'todos'
                      ? 'bg-slate-100 border-slate-400 text-slate-900 ring-1 ring-slate-400/40'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Filtrar por Fluxo"
                >
                  <ArrowRightLeft className={`w-3.5 h-3.5 ${filtroFluxoAuditoria !== 'todos' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>
                    {filtroFluxoAuditoria === 'todos' && 'Fluxo: Todos'}
                    {filtroFluxoAuditoria === 'M-M' && 'Morador ➔ Morador'}
                    {filtroFluxoAuditoria === 'M-T' && 'Morador ➔ Terceiro'}
                    {filtroFluxoAuditoria === 'T-M' && 'Terceiro ➔ Morador'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuFluxoAberto ? 'rotate-180' : ''}`} />
                </button>

                {menuFluxoAberto && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 space-y-1 animate-fade-in">
                    <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider border-b border-slate-100">
                      Fluxo de Custódia
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFiltroFluxoAuditoria('todos'); setMenuFluxoAberto(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                        filtroFluxoAuditoria === 'todos' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Todos os Fluxos</span>
                      {filtroFluxoAuditoria === 'todos' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFiltroFluxoAuditoria('M-M'); setMenuFluxoAberto(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                        filtroFluxoAuditoria === 'M-M' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Morador ➔ Morador</span>
                      {filtroFluxoAuditoria === 'M-M' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFiltroFluxoAuditoria('M-T'); setMenuFluxoAberto(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                        filtroFluxoAuditoria === 'M-T' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Morador ➔ Terceiro</span>
                      {filtroFluxoAuditoria === 'M-T' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFiltroFluxoAuditoria('T-M'); setMenuFluxoAberto(false); }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                        filtroFluxoAuditoria === 'T-M' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Terceiro ➔ Morador</span>
                      {filtroFluxoAuditoria === 'T-M' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Dropdown Período (Ícone de Calendário / Datepicker) */}
              <div className="relative" ref={dropdownPeriodoRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuPeriodoAberto(!menuPeriodoAberto);
                    setMenuFluxoAberto(false);
                  }}
                  className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                    filtroPeriodoAuditoria !== 'todos'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-400/40'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Filtrar por Período (Calendário / Datepicker)"
                >
                  <Calendar className={`w-3.5 h-3.5 ${filtroPeriodoAuditoria !== 'todos' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>
                    {filtroPeriodoAuditoria === 'todos' && 'Período: Todos'}
                    {filtroPeriodoAuditoria === 'hoje' && 'Hoje'}
                    {filtroPeriodoAuditoria === '7dias' && '7 dias'}
                    {filtroPeriodoAuditoria === '30dias' && '30 dias'}
                    {typeof filtroPeriodoAuditoria === 'string' && filtroPeriodoAuditoria.startsWith('data:') && (
                      (() => {
                        const [ano, mes, dia] = filtroPeriodoAuditoria.replace('data:', '').split('-');
                        return `${dia}/${mes}/${ano}`;
                      })()
                    )}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuPeriodoAberto ? 'rotate-180' : ''}`} />
                </button>

                {menuPeriodoAberto && (
                  <div className="absolute left-0 sm:left-auto top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1 pb-1 border-b border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" /> Seletor de Período
                      </span>
                      {filtroPeriodoAuditoria !== 'todos' && (
                        <button
                          type="button"
                          onClick={() => { setFiltroPeriodoAuditoria('todos'); setMenuPeriodoAberto(false); }}
                          className="text-blue-600 hover:underline cursor-pointer"
                        >
                          Redefinir
                        </button>
                      )}
                    </div>

                    {/* Opções Rápidas */}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => { setFiltroPeriodoAuditoria('todos'); setMenuPeriodoAberto(false); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer border ${
                          filtroPeriodoAuditoria === 'todos'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFiltroPeriodoAuditoria('hoje'); setMenuPeriodoAberto(false); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer border ${
                          filtroPeriodoAuditoria === 'hoje'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFiltroPeriodoAuditoria('7dias'); setMenuPeriodoAberto(false); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer border ${
                          filtroPeriodoAuditoria === '7dias'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        7 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFiltroPeriodoAuditoria('30dias'); setMenuPeriodoAberto(false); }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer border ${
                          filtroPeriodoAuditoria === '30dias'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        30 dias
                      </button>
                    </div>

                    {/* Seletor de Data Específica (Datepicker) */}
                    <div className="pt-1.5 border-t border-slate-100 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        Ou escolha uma data específica:
                      </label>
                      <input
                        type="date"
                        value={typeof filtroPeriodoAuditoria === 'string' && filtroPeriodoAuditoria.startsWith('data:') ? filtroPeriodoAuditoria.replace('data:', '') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFiltroPeriodoAuditoria(`data:${e.target.value}`);
                            setMenuPeriodoAberto(false);
                          }
                        }}
                        className="w-full text-xs font-medium px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Limpar Todos os Filtros */}
              {(filtroStatusAuditoria !== 'todos' || filtroFluxoAuditoria !== 'todos' || filtroPeriodoAuditoria !== 'todos' || buscaAuditoria) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroStatusAuditoria('todos');
                    setFiltroFluxoAuditoria('todos');
                    setFiltroPeriodoAuditoria('todos');
                    setBuscaAuditoria('');
                  }}
                  className="h-9 px-2.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Limpar todos os filtros"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>

            {/* Linha Inferior: Barra de Pesquisa */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={buscaAuditoria}
                onChange={(e) => setBuscaAuditoria(e.target.value)}
                placeholder="Pesquisar por código (CUST-...), descrição, morador, unidade, documento, retirante..."
                className="w-full h-9 pl-9 pr-8 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:outline-none transition shadow-2xs"
              />
              {buscaAuditoria && (
                <button
                  type="button"
                  onClick={() => setBuscaAuditoria('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer"
                  title="Limpar pesquisa"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Listagem de Cards de Auditoria */}
          {loading ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> Carregando registros de custódia e comprovantes...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                <span>Exibindo <strong>{itensAuditoriaFiltrados.length}</strong> de {historicoCompleto.length} registros</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {itensAuditoriaFiltrados.map((item) => {
                  const estaRetirado = (item.status || '').toLowerCase() === 'retirado';
                  const permanencia = calcularPermanencia(item.created_at || item.data_hora_entrada, item.data_hora_saida);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-3.5 shadow-2xs space-y-3 transition flex flex-col justify-between ${
                        estaRetirado ? 'border-slate-200 hover:border-slate-300' : 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
                      }`}
                    >
                      {/* Cabeçalho do Card */}
                      <div className="space-y-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded tracking-wider shadow-2xs">
                              {item.codigo_custodia || 'CUST-PORTARIA'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-300">
                              {item.fluxo === 'M-M' ? 'Morador ➔ Morador' : item.fluxo === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'}
                            </span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            estaRetirado 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {estaRetirado ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            {estaRetirado ? 'Devolvido / Retirado' : 'Em Guarda (Portaria)'}
                          </span>
                        </div>

                        {/* Descrição do Objeto */}
                        <div className="pt-0.5">
                          <h4 className="font-black text-slate-900 text-sm">
                            📦 {item.descricao}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Permanência: <strong>{permanencia}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Bloco de Informações: Origem e Destino */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Origem */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-500 block flex items-center gap-1">
                            <User className="w-3 h-3 text-emerald-600" /> Quem Deixou (Origem)
                          </span>
                          <p className="font-bold text-slate-900 truncate">
                            {item.origem_nome_doc || 'Não informado'}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {item.origem_unidade ? formatarIdentificacaoUnidade(item.origem_unidade, item.origem_bloco, condoConfig?.tipo_estrutura) : item.origem_tipo || 'Externo'}
                          </p>
                          {item.origem_whats && !item.origem_unidade && item.origem_tipo !== 'Morador' && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              📱 {item.origem_whats}
                            </p>
                          )}
                          <div className="pt-1 border-t border-slate-200/80 text-[10px] text-slate-500">
                            <span>Entrada: <strong>{new Date(item.created_at || item.data_hora_entrada).toLocaleString('pt-BR')}</strong></span>
                            <span className="block text-[9px] text-slate-400">Por: {item.operador_entrada || 'Portaria'}</span>
                          </div>
                        </div>

                        {/* Destino */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-500 block flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-blue-600" /> Destinatário Autorizado
                          </span>
                          <p className="font-bold text-slate-900 truncate">
                            {item.destino_nome_doc || 'Não informado'}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {item.destino_unidade ? formatarIdentificacaoUnidade(item.destino_unidade, item.destino_bloco, condoConfig?.tipo_estrutura) : item.destino_tipo || 'Terceiro'}
                          </p>
                          {item.destino_whats && !item.destino_unidade && item.destino_tipo !== 'Morador' && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              📱 {item.destino_whats}
                            </p>
                          )}
                          <div className="pt-1 border-t border-slate-200/80 text-[10px] text-slate-500">
                            {estaRetirado ? (
                              <>
                                <span className="text-emerald-700 font-bold">Retirado em: {new Date(item.data_hora_saida).toLocaleString('pt-BR')}</span>
                                <span className="block text-[9px] text-slate-500">Por: {item.recebedor_nome} {item.recebedor_doc ? `(${item.recebedor_doc})` : ''}</span>
                              </>
                            ) : (
                              <span className="text-amber-800 font-semibold italic">Aguardando comparecimento</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Miniaturas de Fotos com Zoom */}
                      <div className="flex items-center gap-2 pt-1">
                        {item.foto_entrada_url && (
                          <div 
                            onClick={() => setFotoAmpliadaModal({ url: item.foto_entrada_url, titulo: `Foto do Objeto: ${item.codigo_custodia}` })}
                            className="relative group cursor-pointer w-14 h-14 rounded-lg overflow-hidden border border-slate-300 hover:border-purple-500 shrink-0"
                            title="Clique para ampliar foto de entrada"
                          >
                            <ImagemOtimizada src={item.foto_entrada_url} alt="Entrada" permitirAmpliar={false} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 font-bold pointer-events-none">
                              Entrada
                            </span>
                          </div>
                        )}

                        {item.foto_saida_url && (
                          <div 
                            onClick={() => setFotoAmpliadaModal({ url: item.foto_saida_url, titulo: `Comprovante de Devolução: ${item.codigo_custodia}` })}
                            className="relative group cursor-pointer w-14 h-14 rounded-lg overflow-hidden border border-emerald-400 hover:border-emerald-600 shrink-0"
                            title="Clique para ampliar comprovante de retirada"
                          >
                            <ImagemOtimizada src={item.foto_saida_url} alt="Saída" permitirAmpliar={false} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-[8px] text-white text-center py-0.5 font-bold pointer-events-none">
                              Baixa
                            </span>
                          </div>
                        )}

                        <div className="flex-1 text-[11px] text-slate-500 pl-1">
                          <p className="font-semibold text-slate-700">Evidências Fotográficas:</p>
                          <p className="text-[10px] text-slate-400">
                            {item.foto_entrada_url && item.foto_saida_url 
                              ? 'Foto de guarda e entrega anexadas' 
                              : item.foto_entrada_url 
                              ? 'Foto de guarda anexada' 
                              : 'Sem foto anexada'}
                          </p>
                        </div>
                      </div>

                      {/* Ações no Rodapé do Card */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setItemDossieModal(item)}
                          className="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 border border-purple-200"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-700" />
                          <span>Ver Dossiê Completo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const tel = (item.destino_whats || item.origem_whats || '').replace(/\D/g, '');
                            const textoDossie = `📋 *DOSSIÊ DE AUDITORIA DE CUSTÓDIA - INFPORT*\n` +
                              `Código: ${item.codigo_custodia}\n` +
                              `Item: ${item.descricao}\n` +
                              `Status: ${estaRetirado ? 'RETIRADO / DEVOLVIDO' : 'EM GUARDA NA PORTARIA'}\n` +
                              `De: ${item.origem_nome_doc} ${item.origem_unidade ? '(Ap. ' + item.origem_unidade + ')' : ''}\n` +
                              `Para: ${item.destino_nome_doc} ${item.destino_unidade ? '(Ap. ' + item.destino_unidade + ')' : ''}\n` +
                              `Entrada: ${new Date(item.created_at || item.data_hora_entrada).toLocaleString('pt-BR')} por ${item.operador_entrada || 'Portaria'}\n` +
                              (estaRetirado ? `Devolvido em: ${new Date(item.data_hora_saida).toLocaleString('pt-BR')} para ${item.recebedor_nome} (Doc: ${item.recebedor_doc || 'N/I'}) por ${item.operador_saida}\n` : '') +
                              `Operador Responsável: ${usuarioLogado?.nome || usuarioLogado?.login || item.operador_saida || item.operador_entrada || 'Portaria'}\n` +
                              `Foto Entrada: ${item.foto_entrada_url || 'N/A'}\n` +
                              (item.foto_saida_url ? `Foto Comprovante: ${item.foto_saida_url}\n` : '');

                            const link = formatarLinkWhatsApp(tel, textoDossie, usuarioLogado);
                            window.open(link, '_blank');
                          }}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition cursor-pointer border border-emerald-200"
                          title="Enviar Dossiê via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {itensAuditoriaFiltrados.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  <p className="font-bold text-slate-700">Nenhum registro encontrado para os filtros selecionados.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DOSSIÊ COMPLETO DE AUDITORIA (CUSTÓDIA)                          */}
      {/* ========================================================================= */}
      {itemDossieModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 relative">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <FileText className="w-5 h-5 text-purple-700" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Dossiê Pericial de Custódia
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {itemDossieModal.codigo_custodia}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setItemDossieModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status e Descrição */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">Objeto em Custódia</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  (itemDossieModal.status || '').toLowerCase() === 'retirado'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {itemDossieModal.status}
                </span>
              </div>
              <h4 className="font-black text-slate-900 text-sm sm:text-base">
                {itemDossieModal.descricao}
              </h4>
              <p className="text-[11px] text-slate-600">
                Fluxo: <strong>{itemDossieModal.fluxo === 'M-M' ? 'Morador ➔ Morador' : itemDossieModal.fluxo === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'}</strong> • Permanência: <strong>{calcularPermanencia(itemDossieModal.created_at || itemDossieModal.data_hora_entrada, itemDossieModal.data_hora_saida)}</strong>
              </p>
            </div>

            {/* Linha do Tempo da Cadeia de Custódia */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Linha do Tempo da Cadeia de Responsabilidade
              </h5>

              {/* Etapa 1: Entrada */}
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Entrada e Recebimento na Guarita</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(itemDossieModal.created_at || itemDossieModal.data_hora_entrada).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p><strong>Entregue por:</strong> {itemDossieModal.origem_nome_doc} {itemDossieModal.origem_unidade ? `(${formatarIdentificacaoUnidade(itemDossieModal.origem_unidade, itemDossieModal.origem_bloco, condoConfig?.tipo_estrutura)})` : ''}</p>
                  <p><strong>Destinatário Previsto:</strong> {itemDossieModal.destino_nome_doc} {itemDossieModal.destino_unidade ? `(${formatarIdentificacaoUnidade(itemDossieModal.destino_unidade, itemDossieModal.destino_bloco, condoConfig?.tipo_estrutura)})` : ''}</p>
                  <p className="text-[10px] text-slate-500">Operador Responsável: <strong>{itemDossieModal.operador_entrada || 'Portaria'}</strong></p>
                </div>
              </div>

              {/* Etapa 2: Saída / Devolução */}
              <div className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 ${
                  (itemDossieModal.status || '').toLowerCase() === 'retirado'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  2
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Baixa e Devolução do Objeto</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {itemDossieModal.data_hora_saida ? new Date(itemDossieModal.data_hora_saida).toLocaleString('pt-BR') : 'Pendente'}
                    </span>
                  </div>
                  {(itemDossieModal.status || '').toLowerCase() === 'retirado' ? (
                    <>
                      <p><strong>Retirado por:</strong> {itemDossieModal.recebedor_nome} {itemDossieModal.recebedor_doc ? `(Doc: ${itemDossieModal.recebedor_doc})` : ''}</p>
                      <p className="text-[10px] text-slate-500">Operador da Baixa: <strong>{itemDossieModal.operador_saida || 'Portaria'}</strong></p>
                    </>
                  ) : (
                    <p className="text-amber-800 italic text-[11px]">Objeto ainda em custódia na portaria aguardando a retirada.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fotos Ampliadas no Dossiê */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Foto Entrada:</span>
                {itemDossieModal.foto_entrada_url ? (
                  <div 
                    onClick={() => setFotoAmpliadaModal({ url: itemDossieModal.foto_entrada_url, titulo: `Foto de Entrada: ${itemDossieModal.codigo_custodia}` })}
                    className="h-28 rounded-xl overflow-hidden border border-slate-300 cursor-pointer hover:opacity-90"
                  >
                    <img src={itemDossieModal.foto_entrada_url} alt="Entrada" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                    Sem foto
                  </div>
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Foto Devolução / Retirante:</span>
                {itemDossieModal.foto_saida_url ? (
                  <div 
                    onClick={() => setFotoAmpliadaModal({ url: itemDossieModal.foto_saida_url, titulo: `Comprovante de Devolução: ${itemDossieModal.codigo_custodia}` })}
                    className="h-28 rounded-xl overflow-hidden border border-emerald-400 cursor-pointer hover:opacity-90"
                  >
                    <img src={itemDossieModal.foto_saida_url} alt="Saída" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                    Ainda não devolvido
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Dossiê */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const textoDossie = `📋 *DOSSIÊ DE AUDITORIA DE CUSTÓDIA - INFPORT*\n` +
                    `Código: ${itemDossieModal.codigo_custodia}\n` +
                    `Item: ${itemDossieModal.descricao}\n` +
                    `Status: ${itemDossieModal.status}\n` +
                    `De: ${itemDossieModal.origem_nome_doc} ${itemDossieModal.origem_unidade ? '(Ap. ' + itemDossieModal.origem_unidade + ')' : ''}\n` +
                    `Para: ${itemDossieModal.destino_nome_doc} ${itemDossieModal.destino_unidade ? '(Ap. ' + itemDossieModal.destino_unidade + ')' : ''}\n` +
                    `Entrada: ${new Date(itemDossieModal.created_at || itemDossieModal.data_hora_entrada).toLocaleString('pt-BR')} por ${itemDossieModal.operador_entrada || 'Portaria'}\n` +
                    (itemDossieModal.status?.toLowerCase() === 'retirado' ? `Devolvido em: ${new Date(itemDossieModal.data_hora_saida).toLocaleString('pt-BR')} para ${itemDossieModal.recebedor_nome} (Doc: ${itemDossieModal.recebedor_doc || 'N/I'}) por ${itemDossieModal.operador_saida}\n` : '') +
                    `Foto Entrada: ${itemDossieModal.foto_entrada_url || 'N/A'}\n` +
                    (itemDossieModal.foto_saida_url ? `Foto Comprovante: ${itemDossieModal.foto_saida_url}\n` : '');

                  navigator.clipboard.writeText(textoDossie);
                  setCopiadoDossie(true);
                  setTimeout(() => setCopiadoDossie(false), 3000);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiadoDossie ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiadoDossie ? 'Dossiê Copiado!' : 'Copiar Dossiê Pericial'}</span>
              </button>

              <button
                type="button"
                onClick={() => setItemDossieModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE FOTO EM ALTA RESOLUÇÃO                                           */}
      {/* ========================================================================= */}
      {fotoAmpliadaModal && (
        <div 
          onClick={() => setFotoAmpliadaModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 space-y-3 overflow-hidden shadow-2xl relative"
          >
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-slate-200">
                {fotoAmpliadaModal.titulo}
              </h4>
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
                alt="Comprovante em Alta Resolução" 
                loading="lazy" 
                decoding="async" 
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Evidência registrada no sistema INFPORT</span>
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

      {/* Botão Flutuante de Receber no Canto Direito Inferior */}
      {podeCriar && (
        <div className={`fixed bottom-16 md:bottom-8 right-4 sm:right-6 transition-all duration-200 ${
          aba === 'entrada' || modalSelecaoFluxoAberto ? 'z-20 opacity-0 pointer-events-none' : 'z-30 opacity-100'
        }`}>
          <button
            type="button"
            onClick={() => setModalSelecaoFluxoAberto(true)}
            className="group flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-emerald-400 cursor-pointer"
            title="Receber novo item em custódia"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <PackagePlus className="w-5 h-5 text-white" />
            </div>
            <div className="text-left pr-1">
              <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-200 leading-none">
                Novo Registro
              </span>
              <span className="block text-sm font-extrabold text-white leading-tight">
                Receber Item
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Modal de Seleção de Fluxo (Fica acima de todos os menus) */}
      {modalSelecaoFluxoAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Receber Item em Custódia</h3>
                  <p className="text-[11px] text-slate-500">Selecione o fluxo para abrir o formulário</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSelecaoFluxoAberto(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Opção 1: Morador para Morador */}
              <button
                type="button"
                onClick={() => {
                  setFluxo('M-M');
                  setModalSelecaoFluxoAberto(false);
                  setAba('entrada');
                }}
                className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                    🏢
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-emerald-800 transition-colors">
                      Morador ➔ Morador
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      De um morador para outro morador da mesma comunidade
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
              </button>

              {/* Opção 2: Morador para Terceiro */}
              <button
                type="button"
                onClick={() => {
                  setFluxo('M-T');
                  setModalSelecaoFluxoAberto(false);
                  setAba('entrada');
                }}
                className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                    🚚
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-blue-800 transition-colors">
                      Morador ➔ Terceiro
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      De morador para prestador, visitante ou entregador externo
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
              </button>

              {/* Opção 3: Terceiro para Morador */}
              <button
                type="button"
                onClick={() => {
                  setFluxo('T-M');
                  setModalSelecaoFluxoAberto(false);
                  setAba('entrada');
                }}
                className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                    📦
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-amber-800 transition-colors">
                      Terceiro ➔ Morador
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      De visitante, entregador ou prestador para um morador
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalSelecaoFluxoAberto(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ITEM DE CUSTÓDIA (RBAC) */}
      {itemEmEdicao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Editar Registro de Custódia</h3>
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

            <form onSubmit={salvarEdicaoCustodia} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Descrição do Item *
                </label>
                <input
                  type="text"
                  required
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Local de Armazenamento / Posição
                </label>
                <input
                  type="text"
                  value={editLocal}
                  onChange={(e) => setEditLocal(e.target.value)}
                  placeholder="Ex: Armário 2, Gaveta A..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Origem */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="block text-[10px] font-black text-slate-700 uppercase">
                  Origem (Quem Deixou)
                </span>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Nome / Terceiro *</label>
                  <input
                    type="text"
                    required
                    value={editOrigemNome}
                    onChange={(e) => setEditOrigemNome(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Unidade</label>
                    <input
                      type="text"
                      value={editOrigemUnidade}
                      onChange={(e) => setEditOrigemUnidade(e.target.value)}
                      placeholder="Ex: 101"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Bloco / Torre</label>
                    <input
                      type="text"
                      value={editOrigemBloco}
                      onChange={(e) => setEditOrigemBloco(e.target.value)}
                      placeholder="Ex: Bloco A"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Destino */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                <span className="block text-[10px] font-black text-blue-900 uppercase">
                  Destino (Para Quem)
                </span>
                <div>
                  <label className="block text-[9px] font-bold text-blue-700 uppercase mb-0.5">Nome / Destinatário *</label>
                  <input
                    type="text"
                    required
                    value={editDestinoNome}
                    onChange={(e) => setEditDestinoNome(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-blue-700 uppercase mb-0.5">Unidade</label>
                    <input
                      type="text"
                      value={editDestinoUnidade}
                      onChange={(e) => setEditDestinoUnidade(e.target.value)}
                      placeholder="Ex: 204"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-blue-700 uppercase mb-0.5">Bloco / Torre</label>
                    <input
                      type="text"
                      value={editDestinoBloco}
                      onChange={(e) => setEditDestinoBloco(e.target.value)}
                      placeholder="Ex: Bloco B"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  placeholder="Anotações de portaria..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemEmEdicao(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CUSTÓDIA (RBAC) */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Excluir Registro de Custódia?</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-slate-800">
              <p>
                Código: <strong className="font-mono text-rose-900">{itemParaExcluir.codigo_custodia}</strong>
              </p>
              <p>
                Item: <strong>{itemParaExcluir.descricao}</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                De: {itemParaExcluir.origem_nome_doc} ➔ Para: {itemParaExcluir.destino_nome_doc}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={confirmarExclusaoCustodia}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
