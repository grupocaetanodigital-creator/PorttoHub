import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import { 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Search, 
  Plus, 
  X, 
  MessageCircle, 
  ExternalLink, 
  Check,
  Pencil,
  Home,
  Trash2,
  Lock,
  Clock,
  Filter,
  User
} from 'lucide-react';
import { obterCacheLocal } from '../services/offlineStorageService';
import { registrarAtividade } from '../services/auditoriaService';
import { verificarPermissao } from '../services/permissoesService';
import { formatarLinkWhatsApp } from '../services/configWhatsappService';
import { 
  carregarCondominioConfig, 
  isEstruturaCasas, 
  isEstruturaTorres, 
  isEstruturaBlocos,
  getNomeRotuloBloco, 
  getNomeRotuloUnidade, 
  obterListaBlocosOuTorres, 
  formatarIdentificacaoUnidade, 
  saoUnidadesEquivalentes,
  CondominioConfig,
  getCondominioAtivoId
} from '../services/condominioService';

interface ChavesProps {
  usuarioLogado?: any;
}

export default function Chaves({ usuarioLogado }: ChavesProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [chaves, setChaves] = useState<any[]>([]);
  const [movimentacoesAtivas, setMovimentacoesAtivas] = useState<any[]>([]);
  const [buscaTermo, setBuscaTermo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'disponiveis' | 'emprestadas' | 'atrasadas'>('todas');

  // Permissões RBAC dinâmicas
  const podeVisualizar = verificarPermissao(usuarioLogado, 'chaves', 'visualizar');
  const podeCadastrar = verificarPermissao(usuarioLogado, 'chaves', 'criar') || verificarPermissao(usuarioLogado, 'chaves', 'cadastrar');
  const podeEditar = verificarPermissao(usuarioLogado, 'chaves', 'editar');
  const podeExcluir = verificarPermissao(usuarioLogado, 'chaves', 'excluir');
  const podeEmprestar = verificarPermissao(usuarioLogado, 'chaves', 'emprestar');
  const podeDevolver = verificarPermissao(usuarioLogado, 'chaves', 'devolver');

  const [modalNovaChave, setModalNovaChave] = useState(false);
  const [modalRetirada, setModalRetirada] = useState<any | null>(null);
  const [modalDevolucao, setModalDevolucao] = useState<any | null>(null);
  const [chaveParaExcluir, setChaveParaExcluir] = useState<any | null>(null);

  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [codigoChave, setCodigoChave] = useState('');
  const [nomeChave, setNomeChave] = useState('');
  const [bloco, setBloco] = useState('');
  const [unidade, setUnidade] = useState('');
  const [tempoLimiteHoras, setTempoLimiteHoras] = useState<number | string>(2);

  const [moradores, setMoradores] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [terceirosAtivos, setTerceirosAtivos] = useState<any[]>([]);
  const [terceiroSelecionadoId, setTerceiroSelecionadoId] = useState<string>('');
  const [blocosDisponiveis, setBlocosDisponiveis] = useState<string[]>([]);

  const [tipoRetirante, setTipoRetirante] = useState('Morador');
  const [retiranteNome, setRetiranteNome] = useState('');
  const [retiranteDoc, setRetiranteDoc] = useState('');
  const [retiranteTel, setRetiranteTel] = useState('');
  const [retiranteUnidade, setRetiranteUnidade] = useState('');
  const [retiranteBloco, setRetiranteBloco] = useState('');
  const [retiranteFuncao, setRetiranteFuncao] = useState('');
  const [retiranteEmpresa, setRetiranteEmpresa] = useState('');
  const [fotoDocTerceiroUrl, setFotoDocTerceiroUrl] = useState('');
  const [prazoModo, setPrazoModo] = useState<string>('chave');
  const [prazoHorasCustom, setPrazoHorasCustom] = useState<number | string>(2);
  const [prazoMinutosCustom, setPrazoMinutosCustom] = useState<number | string>(30);

  const [fotoRetiradaUrl, setFotoRetiradaUrl] = useState('');
  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);

  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));
  const [fotoDevolucaoUrl, setFotoDevolucaoUrl] = useState('');
  const [whatsEmprestimo, setWhatsEmprestimo] = useState<{ link: string } | null>(null);

  const eEstruturaCasas = isEstruturaCasas(condoConfig?.tipo_estrutura);
  const eEstruturaTorres = isEstruturaTorres(condoConfig?.tipo_estrutura);
  const rotuloBloco = getNomeRotuloBloco(condoConfig?.tipo_estrutura);
  const rotuloUnidade = getNomeRotuloUnidade(condoConfig?.tipo_estrutura);

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
    carregarQuadroChaves();
  }, [condId]);

  const carregarQuadroChaves = async () => {
    if (!condId || condId === 'global' || condId === 'todos') {
      setChaves([]);
      setMovimentacoesAtivas([]);
      setMoradores([]);
      setColaboradores([]);
      setTerceirosAtivos([]);
      return;
    }

    setLoading(true);

    try {
      const cfg = await carregarCondominioConfig(condId);
      setCondoConfig(cfg);

      const chavesQuery = supabase
        .from('chaves')
        .select('id, condominio_id, codigo_chave, nome_chave, setor, status, localizacao, observacoes, quantidade, qr_code, created_at')
        .eq('condominio_id', condId)
        .order('codigo_chave');
      const { data: chavesData, error: errChaves } = await chavesQuery;

      if (errChaves) throw errChaves;

      const movQuery = supabase
        .from('movimentacao_chaves')
        .select('id, chave_id, condominio_id, tipo_retirante, nome_retirante, documento_retirante, telefone_retirante, empresa_retirante, unidade_retirante, bloco_retirante, operador_retirada_id, operador_retirada_nome, data_hora_retirada, previsao_devolucao, status, observacoes_retirada, chaves(id, codigo_chave, nome_chave)')
        .eq('condominio_id', condId)
        .eq('status', 'Em Andamento')
        .order('data_hora_retirada', { ascending: false });
      const { data: movData, error: errMov } = await movQuery;

      if (errMov) throw errMov;

      // Buscar moradores e colaboradores para agilizar o atendimento com projeção leve estritamente do condomínio ativo
      const morQuery = supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone')
        .eq('condominio_id', condId)
        .order('nome');
      const { data: morData } = await morQuery;

      let mList = (morData && morData.length > 0) ? morData : [];
      if (mList.length === 0) {
        const local = obterCacheLocal<any[]>('moradores', condId, []) || obterCacheLocal<any[]>('moradores', 'global', []);
        if (local && local.length > 0) {
          mList = local;
        } else {
          try {
            const { data: fallbackMor } = await supabase
              .from('moradores')
              .select('id, nome, bloco, unidade, telefone')
              .order('nome');
            if (fallbackMor && fallbackMor.length > 0) {
              mList = fallbackMor;
            }
          } catch {}
        }
      }
      setMoradores(mList);
      const listaBlocosFinal = obterListaBlocosOuTorres(condoConfig, mList);
      setBlocosDisponiveis(listaBlocosFinal);

      const colabQuery = supabase
        .from('operadores')
        .select('id, nome, login, funcao, cargo, perfil, ativo')
        .eq('condominio_id', condId)
        .order('nome');
      const { data: colabData } = await colabQuery;
      setColaboradores(colabData || []);

      // Buscar prestadores e terceiros do módulo Autorizados com colunas leves
      let acessosAtivosList: any[] = [];
      try {
        const acessosQ = supabase
          .from('prestadores_acessos')
          .select('id, nome_completo, documento, empresa, unidade, bloco, perfil_acesso, data_hora_entrada')
          .eq('condominio_id', condId)
          .is('data_hora_saida', null)
          .order('data_hora_entrada', { ascending: false })
          .limit(50);
        const { data: acDb } = await acessosQ;
        if (acDb) acessosAtivosList = acDb;
      } catch (e) {
        console.warn('Erro ao buscar prestadores_acessos:', e);
      }

      const prestQuery = supabase
        .from('prestadores')
        .select('id, nome_profissional, documento, empresa, unidade, bloco, perfil_acesso')
        .eq('condominio_id', condId)
        .order('nome_profissional')
        .limit(50);
      const { data: prestData } = await prestQuery;

      const mapaPorChave = new Map<string, any>();

      // 1. Prestadores com acesso ativo em aberto (Dentro do Condomínio)
      acessosAtivosList.forEach((ac: any) => {
        const doc = (ac.documento || '').trim();
        const nome = ac.nome_completo || ac.nome_profissional || '';
        const chave = doc || nome || ac.id;
        if (chave) {
          mapaPorChave.set(chave, {
            id: ac.prestador_id || ac.id,
            nome_profissional: nome,
            documento: ac.documento || '',
            empresa: ac.empresa || ac.parentesco_vinculo || 'Prestador Terceiro',
            telefone: ac.telefone || '',
            foto_documento: ac.foto_documento || '',
            foto_rosto: ac.foto_rosto || '',
            unidade: ac.unidade || '',
            bloco: ac.bloco || '',
            em_transito: true,
            data_hora_entrada: ac.data_hora_entrada
          });
        }
      });

      // 2. Todos os prestadores cadastrados (marcando se estiver DENTRO)
      (prestData || []).forEach((p: any) => {
        const doc = (p.documento || '').trim();
        const nome = p.nome_profissional || p.nome_completo || '';
        const chave = doc || nome || p.id;
        const estaDentro = p.status_acesso === 'DENTRO' || p.status_acesso === 'EM_ANDAMENTO';
        if (!mapaPorChave.has(chave)) {
          mapaPorChave.set(chave, {
            id: p.id,
            nome_profissional: nome,
            documento: p.documento || '',
            empresa: p.empresa || p.parentesco_vinculo || 'Terceiro / Prestador',
            telefone: p.telefone || '',
            foto_documento: p.foto_documento || '',
            foto_rosto: p.foto_rosto || '',
            unidade: p.unidade || '',
            bloco: p.bloco || '',
            em_transito: estaDentro,
            data_hora_entrada: p.data_hora_entrada || p.created_at
          });
        } else if (estaDentro) {
          const item = mapaPorChave.get(chave);
          item.em_transito = true;
          if (p.foto_documento && !item.foto_documento) item.foto_documento = p.foto_documento;
          if (p.telefone && !item.telefone) item.telefone = p.telefone;
        }
      });

      const listaTerceirosOrdenada = Array.from(mapaPorChave.values()).sort((a, b) => {
        if (a.em_transito && !b.em_transito) return -1;
        if (!a.em_transito && b.em_transito) return 1;
        return a.nome_profissional.localeCompare(b.nome_profissional);
      });

      setTerceirosAtivos(listaTerceirosOrdenada);

      const agora = new Date();
      
      const movsComStatus = (movData || []).map((mov: any) => {
        const previsao = new Date(mov.previsao_devolucao);
        const atrasado = agora > previsao;
        return {
          ...mov,
          atrasado
        };
      });

      setChaves(chavesData || []);
      setMovimentacoesAtivas(movsComStatus);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadFoto = async (file: File | null, pasta: string, setUrlCallback: (url: string) => void) => {
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
      setMensagem({ tipo: 'sucesso', texto: `Foto capturada e comprimida com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const limparFormularioChave = () => {
    setIdEdicao(null);
    setCodigoChave('');
    setNomeChave('');
    setBloco(eEstruturaCasas ? 'Casa' : '');
    setUnidade('');
    setTempoLimiteHoras(2);
    setModalNovaChave(false);
  };

  const prepararEdicao = (chave: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdEdicao(chave.id);
    setCodigoChave(chave.codigo_chave || '');
    setNomeChave(chave.nome_chave || '');
    setBloco(eEstruturaCasas ? 'Casa' : (chave.bloco || ''));
    setUnidade(chave.unidade || '');
    setTempoLimiteHoras(chave.tempo_limite_horas || 2);
    setModalNovaChave(true);
  };

  const confirmarExcluirChave = (chave: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!podeExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso Negado: Seu perfil de usuário não possui permissão para excluir chaves no Gerenciamento de Acesso.' });
      return;
    }
    setChaveParaExcluir(chave);
  };

  const executarExclusaoChave = async () => {
    if (!chaveParaExcluir) return;
    if (!podeExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso Negado: Seu perfil de usuário não possui permissão para excluir chaves.' });
      setChaveParaExcluir(null);
      return;
    }
    setLoading(true);

    try {
      // 1. Limpa registros vinculados na tabela de movimentações para prevenir violação de chave estrangeira (FK)
      const { error: errMovDel } = await supabase
        .from('movimentacao_chaves')
        .delete()
        .eq('chave_id', chaveParaExcluir.id);

      if (errMovDel) {
        console.warn('[Chaves] Aviso ao limpar movimentações prévias da chave:', errMovDel.message);
      }

      // 2. Exclui o registro da chave no quadro digital
      const { error: errChaveDel } = await supabase
        .from('chaves')
        .delete()
        .eq('id', chaveParaExcluir.id);

      if (errChaveDel) throw errChaveDel;

      await registrarAtividade({
        modulo: 'Chaves',
        acao: 'EXCLUIR',
        descricao: `Excluiu a chave ${chaveParaExcluir.codigo_chave} (${chaveParaExcluir.nome_chave}) do quadro digital.`,
        detalhes: { chave_id: chaveParaExcluir.id, codigo: chaveParaExcluir.codigo_chave, nome: chaveParaExcluir.nome_chave },
        operador_nome: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria',
        condominio_id: chaveParaExcluir.condominio_id || condId
      });

      setMensagem({ tipo: 'sucesso', texto: `Chave ${chaveParaExcluir.codigo_chave} (${chaveParaExcluir.nome_chave}) excluída com sucesso do quadro!` });
      setChaveParaExcluir(null);
      if (idEdicao === chaveParaExcluir.id) {
        limparFormularioChave();
        setModalNovaChave(false);
      }
      await carregarQuadroChaves();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir chave: ' + (err.message || 'Falha no banco de dados') });
    } finally {
      setLoading(false);
    }
  };

  const salvarChave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoChave.trim() || !nomeChave.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Código e nome da chave são obrigatórios.' });
      return;
    }
    setLoading(true);

    try {
      const targetCondo = (!condId || condId === 'global') 
        ? (usuarioLogado?.listaCondominios?.[0]?.id || '') 
        : condId;
      if (!targetCondo || targetCondo === 'global' || targetCondo === 'todos') {
        setMensagem({ tipo: 'erro', texto: 'Selecione um condomínio válido antes de cadastrar a chave.' });
        setLoading(false);
        return;
      }
      const blocoFinal = eEstruturaCasas ? 'Casa' : bloco.trim().toUpperCase();
      const payload = {
        condominio_id: targetCondo,
        codigo_chave: codigoChave.trim().toUpperCase(),
        nome_chave: nomeChave.trim(),
        bloco: blocoFinal,
        unidade: unidade.trim(),
        tempo_limite_horas: parseInt(String(tempoLimiteHoras)) || 2
      };

      if (idEdicao) {
        const { error } = await supabase
          .from('chaves')
          .update(payload)
          .eq('id', idEdicao);

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Chave atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('chaves')
          .insert([{ ...payload, status: 'Disponível' }]);

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Chave cadastrada no quadro!' });
      }

      limparFormularioChave();
      carregarQuadroChaves();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarRetirada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retiranteNome.trim() || !modalRetirada) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do retirante.' });
      return;
    }
    setLoading(true);

    try {
      const agora = new Date();
      
      // Cálculo do prazo com suporte flexível a minutos (ajuste customizado em minutos)
      let minutosTotais = (modalRetirada.tempo_limite_horas || 2) * 60;
      if (prazoModo === 'custom') {
        minutosTotais = parseInt(String(prazoMinutosCustom)) || 30;
      } else if (prazoModo === '15m') {
        minutosTotais = 15;
      } else if (prazoModo === '30m') {
        minutosTotais = 30;
      } else if (prazoModo === '1h') {
        minutosTotais = 60;
      } else if (prazoModo === '2h') {
        minutosTotais = 120;
      } else if (prazoModo === '4h') {
        minutosTotais = 240;
      } else if (prazoModo === '8h') {
        minutosTotais = 480;
      } else if (prazoModo === '12h') {
        minutosTotais = 720;
      } else if (prazoModo === '24h') {
        minutosTotais = 1440;
      }

      const previsao = new Date(agora.getTime() + minutosTotais * 60 * 1000);
      const nomeCompletoComTipo = `${retiranteNome.trim()} (${tipoRetirante})`;

      const { error: errMov } = await supabase
        .from('movimentacao_chaves')
        .insert([{
          chave_id: modalRetirada.id,
          condominio_id: modalRetirada.condominio_id || condId || usuarioLogado?.listaCondominios?.[0]?.id || '',
          retirante_nome: nomeCompletoComTipo,
          retirante_doc: retiranteDoc.trim() || 'Não informado',
          retirante_telefone: retiranteTel.trim() || '',
          foto_retirada_url: fotoRetiradaUrl.trim() || '',
          data_hora_retirada: agora.toISOString(),
          previsao_devolucao: previsao.toISOString(),
          status: 'Em Andamento',
          operador_retirada: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        }]);

      if (errMov) throw errMov;

      await supabase
        .from('chaves')
        .update({ status: 'Emprestada' })
        .eq('id', modalRetirada.id);

      const tel = retiranteTel.replace(/\D/g, '');
      const rotuloPrazoDesc = prazoModo === 'custom' ? `${minutosTotais}min` : `${Math.round(minutosTotais / 60)}h`;
      const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';
      const textoWhats = `🔑 *COMPROVANTE DE RETIRADA DE CHAVE*\nChave: ${modalRetirada.codigo_chave} - ${modalRetirada.nome_chave}\nRetirado por: ${nomeCompletoComTipo}\nOperador Responsável: ${nomeOp}\nData/Hora: ${agora.toLocaleString('pt-BR')}\nPrazo de Devolução: ${previsao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${rotuloPrazoDesc} limite)\n\nPor favor, devolva a chave no prazo acordado!`;

      setWhatsEmprestimo({
        link: formatarLinkWhatsApp(tel, textoWhats, usuarioLogado)
      });

      setModalRetirada(null);
      setRetiranteNome(''); setRetiranteDoc(''); setRetiranteTel(''); setFotoRetiradaUrl(''); setTipoRetirante('Morador');
      setRetiranteUnidade(''); setRetiranteBloco(''); setRetiranteFuncao(''); setRetiranteEmpresa(''); setFotoDocTerceiroUrl('');
      setTerceiroSelecionadoId('');
      try { window.dispatchEvent(new CustomEvent('chaves_atualizadas')); } catch {}
      carregarQuadroChaves();
      setMensagem({ tipo: 'sucesso', texto: 'Empréstimo registrado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirEmprestimo = (chave: any) => {
    setModalRetirada(chave);
    setTipoRetirante('Morador');
    setRetiranteNome('');
    setRetiranteDoc('');
    setRetiranteTel('');
    setRetiranteUnidade(chave.unidade || '');
    setRetiranteBloco(chave.bloco || '');
    setRetiranteFuncao('');
    setRetiranteEmpresa('');
    setFotoDocTerceiroUrl('');
    setFotoRetiradaUrl('');
    setPrazoModo('chave');
    setPrazoHorasCustom(chave.tempo_limite_horas || 2);
    setWhatsEmprestimo(null);
  };

  const efetivarDevolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDevolucao) return;
    setLoading(true);

    try {
      const agora = new Date().toISOString();

      const { error: errMov } = await supabase
        .from('movimentacao_chaves')
        .update({
          status: 'Devolvida',
          data_hora_devolucao: agora,
          foto_devolucao_url: fotoDevolucaoUrl.trim() || '',
          operador_devolucao: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        })
        .eq('id', modalDevolucao.id);

      if (errMov) throw errMov;

      await supabase
        .from('chaves')
        .update({ status: 'Disponível' })
        .eq('id', modalDevolucao.chave_id);

      setModalDevolucao(null);
      setFotoDevolucaoUrl('');
      try { window.dispatchEvent(new CustomEvent('chaves_atualizadas')); } catch {}
      carregarQuadroChaves();
      setMensagem({ tipo: 'sucesso', texto: 'Chave devolvida ao quadro com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const chavesFiltradas = chaves.filter((c: any) => {
    const movAtiva = movimentacoesAtivas.find((m: any) => m.chave_id === c.id);
    const estaAtrasada = movAtiva?.atrasado;

    if (filtroStatus === 'disponiveis' && c.status !== 'Disponível') return false;
    if (filtroStatus === 'emprestadas' && c.status !== 'Emprestada') return false;
    if (filtroStatus === 'atrasadas' && !estaAtrasada) return false;

    if (!buscaTermo.trim()) return true;
    const termo = buscaTermo.toLowerCase();
    const cod = c.codigo_chave?.toLowerCase() || '';
    const nome = c.nome_chave?.toLowerCase() || '';
    const unid = c.unidade?.toLowerCase() || '';
    const retNome = (movAtiva?.retirante_nome || '').toLowerCase();
    return cod.includes(termo) || nome.includes(termo) || unid.includes(termo) || retNome.includes(termo);
  });

  const totalDisponiveis = chaves.filter((c: any) => c.status === 'Disponível').length;
  const totalEmprestadas = chaves.filter((c: any) => c.status === 'Emprestada').length;
  const totalAtrasadas = movimentacoesAtivas.filter((m: any) => m.atrasado).length;

  if (!podeVisualizar) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <Lock className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-white font-bold text-sm">Acesso Restrito ao Quadro de Chaves</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Seu perfil de usuário atual não possui permissão para visualizar o Claviculário Digital. Solicite autorização a um supervisor ou administrador no Gerenciamento de Acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Topo do Quadro de Chaves */}
      <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Key className="w-5 h-5 text-amber-400 shrink-0" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              Quadro Digital de Chaves (Claviculário)
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {chaves.length} Chaves
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Controle de empréstimos, prazos com alerta sonoro/visual e devoluções</p>
          </div>
        </div>

        {podeCadastrar && (
          <button
            onClick={() => { limparFormularioChave(); setModalNovaChave(true); }}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> <span>+ Cadastrar Chave</span>
          </button>
        )}
      </div>

      {totalAtrasadas > 0 && (
        <div className="bg-red-600 text-white p-3 rounded-2xl flex items-center justify-between gap-2 animate-pulse shadow-md">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <strong className="block font-black text-sm">⚠️ ATENÇÃO: {totalAtrasadas} CHAVE(S) EM ATRASO!</strong>
              Tempo limite de devolução foi excedido. Contate imediatamente os retirantes.
            </div>
          </div>
          <button
            onClick={() => setFiltroStatus('atrasadas')}
            className="px-2.5 py-1 bg-white text-red-700 font-bold text-[11px] rounded-lg shadow-2xs hover:bg-red-50 cursor-pointer shrink-0"
          >
            Filtrar Atrasadas
          </button>
        </div>
      )}

      {mensagem.texto && (
        <div className={`p-3 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold border ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca Rápida */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Filtros em Pílulas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          <button
            type="button"
            onClick={() => setFiltroStatus('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              filtroStatus === 'todas'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({chaves.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('disponiveis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1 ${
              filtroStatus === 'disponiveis'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Disponíveis ({totalDisponiveis})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('emprestadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1 ${
              filtroStatus === 'emprestadas'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Emprestadas ({totalEmprestadas})
          </button>
          {totalAtrasadas > 0 && (
            <button
              type="button"
              onClick={() => setFiltroStatus('atrasadas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1 ${
                filtroStatus === 'atrasadas'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-700 bg-red-50 hover:bg-red-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              Atrasadas ({totalAtrasadas})
            </button>
          )}
        </div>

        {/* Input de Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            placeholder="Buscar por código, nome, retirante ou casa..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs shadow-2xs font-medium focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Grid de Cards de Chaves */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {chavesFiltradas.map((chave: any) => {
          const movAtiva = movimentacoesAtivas.find((m: any) => m.chave_id === chave.id);
          const estaAtrasada = movAtiva?.atrasado;

          return (
            <div
              key={chave.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between transition shadow-2xs relative ${
                chave.status === 'Disponível'
                  ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500'
                  : estaAtrasada
                  ? 'bg-red-50 border-red-500 ring-2 ring-red-500 animate-pulse'
                  : 'bg-amber-50/50 border-amber-300'
              }`}
            >
              <div>
                <div className="flex justify-between items-center gap-1">
                  <span className="text-[10px] font-black font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded">
                    {chave.codigo_chave}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {podeEditar && (
                      <button
                        onClick={(e) => prepararEdicao(chave, e)}
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Editar Chave"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {podeExcluir && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmarExcluirChave(chave, e);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Excluir Chave do Quadro"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <Key className={`w-3.5 h-3.5 ${
                      chave.status === 'Disponível' ? 'text-emerald-600' : estaAtrasada ? 'text-red-600' : 'text-amber-600'
                    }`} />
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-xs mt-1.5 truncate" title={chave.nome_chave}>{chave.nome_chave}</h4>
                {chave.unidade && (
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                    {formatarIdentificacaoUnidade(chave.unidade, chave.bloco, condoConfig?.tipo_estrutura)}
                  </p>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/70">
                {chave.status === 'Disponível' ? (
                  podeEmprestar ? (
                    <button
                      onClick={() => abrirEmprestimo(chave)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-[10px] font-black py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
                    >
                      Emprestar
                    </button>
                  ) : (
                    <span className="block text-center text-[10px] font-bold text-slate-400 py-1 bg-slate-100 rounded-md">
                      Disponível
                    </span>
                  )
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-800 truncate" title={movAtiva?.retirante_nome}>
                      {movAtiva?.retirante_nome}
                    </p>
                    <p className={`text-[9px] font-bold ${estaAtrasada ? 'text-red-700 font-black' : 'text-amber-700'}`}>
                      {estaAtrasada ? '⚠️ ATRASADO' : `Até: ${new Date(movAtiva?.previsao_devolucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    {podeDevolver ? (
                      <button
                        onClick={() => setModalDevolucao(movAtiva)}
                        className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-[10px] font-black py-1 rounded-md transition cursor-pointer"
                      >
                        Devolver
                      </button>
                    ) : (
                      <span className="block text-center text-[9px] font-bold text-amber-700">
                        Emprestada
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {chavesFiltradas.length === 0 && (
          <div className="col-span-full bg-white p-6 rounded-xl border text-center text-xs text-slate-500 italic">
            Nenhuma chave encontrada no quadro.
          </div>
        )}
      </div>

      {modalNovaChave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl relative">
            <button onClick={limparFormularioChave} className="absolute top-3 right-3 text-slate-400 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              {idEdicao ? 'Editar Dados da Chave' : 'Nova Chave no Quadro'}
            </h3>

            <form onSubmit={salvarChave} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Cód. Chave *</label>
                  <input
                    type="text"
                    required
                    value={codigoChave}
                    onChange={(e) => setCodigoChave(e.target.value)}
                    placeholder="Ex: CH-01"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Tempo Limite (Horas)</label>
                  <input
                    type="number"
                    min="1"
                    value={tempoLimiteHoras}
                    onChange={(e) => setTempoLimiteHoras(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Identificador / Local *</label>
                <input
                  type="text"
                  required
                  value={nomeChave}
                  onChange={(e) => setNomeChave(e.target.value)}
                  placeholder="Ex: Salão de Festas, Casa de Máquinas..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                    {rotuloUnidade}
                  </label>
                  <input
                    type="text"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    placeholder={eEstruturaCasas ? "Ex: 01, 02, 10A" : "Ex: 101"}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                    {rotuloBloco}
                  </label>
                  {eEstruturaCasas ? (
                    <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs font-black flex items-center justify-between">
                      <span>🏠 Casa</span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">Automático</span>
                    </div>
                  ) : (
                    <select
                      value={bloco}
                      onChange={(e) => setBloco(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="">{eEstruturaTorres ? 'Área Comum / Sem Torre' : 'Área Comum / Sem Bloco'}</option>
                      {blocosDisponiveis.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={limparFormularioChave}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                {idEdicao && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = chaves.find((x: any) => x.id === idEdicao);
                      if (c) {
                        setModalNovaChave(false);
                        confirmarExcluirChave(c);
                      }
                    }}
                    className="px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1"
                    title="Excluir Chave do Quadro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg uppercase text-xs transition cursor-pointer"
                >
                  {idEdicao ? 'Salvar Alterações' : 'Cadastrar Chave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRetirada && (() => {
        const termoUnid = (retiranteUnidade || '').trim();
        const blocoAlvo = (retiranteBloco || '').trim().toLowerCase();

        const moradoresDaUnidade = termoUnid ? moradores.filter((m) => {
          if (!m.unidade) return false;
          const bateUnidade = saoUnidadesEquivalentes(m.unidade, termoUnid) ||
            String(m.unidade).trim().toLowerCase() === termoUnid.toLowerCase();
          if (!bateUnidade) return false;

          if (eEstruturaCasas || !blocoAlvo) return true;
          const blocoMorador = (m.bloco || '').trim().toLowerCase();
          if (!blocoMorador) return true;
          if (blocoMorador === blocoAlvo) return true;
          const normMor = blocoMorador.replace(/^(torre|bloco|quadra)\s+/i, '');
          const normAlvo = blocoAlvo.replace(/^(torre|bloco|quadra)\s+/i, '');
          return normMor === normAlvo;
        }) : [];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl relative my-auto">
              <button onClick={() => setModalRetirada(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-600" /> Retirada da Chave {modalRetirada.codigo_chave}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {modalRetirada.nome_chave} {modalRetirada.unidade ? `(${formatarIdentificacaoUnidade(modalRetirada.unidade, modalRetirada.bloco, condoConfig?.tipo_estrutura)})` : ''}
              </p>

              <form onSubmit={efetivarRetirada} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tipo de Retirante *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoRetirante('Morador');
                        setRetiranteNome('');
                        setRetiranteDoc('');
                        setRetiranteTel('');
                      }}
                      className={`py-2 px-2 text-xs font-black rounded-xl border-2 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-2xs ${
                        tipoRetirante === 'Morador'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400/40'
                          : 'bg-emerald-50/70 text-emerald-950 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-[10px] opacity-80 font-bold uppercase">👤 Residencial</span>
                      <span>Morador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoRetirante('Colaborador');
                        setRetiranteNome('');
                        setRetiranteDoc('');
                        setRetiranteTel('');
                      }}
                      className={`py-2 px-2 text-xs font-black rounded-xl border-2 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-2xs ${
                        tipoRetirante === 'Colaborador'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 ring-2 ring-blue-400/40'
                          : 'bg-blue-50/70 text-blue-950 border-blue-200/80 hover:bg-blue-100 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-[10px] opacity-80 font-bold uppercase">👔 Interno</span>
                      <span>Colaborador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoRetirante('Terceiros');
                        setRetiranteNome('');
                        setRetiranteDoc('');
                        setRetiranteTel('');
                      }}
                      className={`py-2 px-2 text-xs font-black rounded-xl border-2 transition cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-2xs ${
                        tipoRetirante === 'Terceiros'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20 ring-2 ring-amber-400/40'
                          : 'bg-amber-50/70 text-amber-950 border-amber-200/80 hover:bg-amber-100 hover:border-amber-300'
                      }`}
                    >
                      <span className="text-[10px] opacity-80 font-bold uppercase">🚚 Prestador</span>
                      <span>Terceiros</span>
                    </button>
                  </div>
                </div>

                {/* FORM ESPECÍFICO: MORADOR */}
                {tipoRetirante === 'Morador' && (
                  <div className="space-y-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                          {rotuloUnidade} *
                        </label>
                        <input
                          type="text"
                          value={retiranteUnidade}
                          onChange={(e) => {
                            setRetiranteUnidade(e.target.value);
                            setRetiranteNome(''); // Só deve preencher o campo quando selecionado
                          }}
                          placeholder={eEstruturaCasas ? "Ex: 01, 02, 12A" : "Ex: 101"}
                          required
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                          {rotuloBloco}
                        </label>
                        {eEstruturaCasas ? (
                          <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs font-black flex items-center justify-between">
                            <span>🏠 Casa</span>
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">Automático</span>
                          </div>
                        ) : (
                          <select
                            value={retiranteBloco}
                            onChange={(e) => {
                              setRetiranteBloco(e.target.value);
                              setRetiranteNome(''); // Só deve preencher o campo quando selecionado
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          >
                            <option value="">Selecione...</option>
                            {blocosDisponiveis.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* LISTAGEM DOS MORADORES QUANDO COLOCAR A UNIDADE */}
                    {retiranteUnidade.trim() && (
                      <div className="space-y-1.5 p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg">
                        <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wide">
                          Moradores do {rotuloUnidade} {retiranteUnidade}:
                        </label>
                        {moradoresDaUnidade.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {moradoresDaUnidade.map((m) => {
                              const isSelected = Boolean(retiranteNome && retiranteNome.trim().toLowerCase() === (m.nome || '').trim().toLowerCase());
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setRetiranteNome(m.nome || '');
                                    if (m.telefone) setRetiranteTel(m.telefone);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white border border-emerald-700 ring-2 ring-emerald-300'
                                      : 'bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-300'
                                  }`}
                                  title="Clique para selecionar este morador"
                                >
                                  <User className="w-3.5 h-3.5" />
                                  <span>{m.nome}</span>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-800 font-medium">
                            Nenhum morador encontrado para esta unidade. Digite o nome no campo abaixo:
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Nome do Morador *</label>
                      <input
                        type="text"
                        required
                        value={retiranteNome}
                        onChange={(e) => setRetiranteNome(e.target.value)}
                        placeholder="Selecione um morador acima ou digite..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* FORM ESPECÍFICO: COLABORADOR */}
                {tipoRetirante === 'Colaborador' && (
                  <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    {colaboradores.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                          Colaborador Registrado (Opcional):
                        </label>
                        <select
                          onChange={(e) => {
                            const c = colaboradores.find((x) => x.id === e.target.value);
                            if (c) {
                              setRetiranteNome(c.nome);
                              setRetiranteFuncao(c.cargo || c.funcao || c.nivel_acesso || 'Operador / Colaborador');
                              if (c.telefone) setRetiranteTel(c.telefone);
                            }
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="">-- Selecione ou digite abaixo --</option>
                          {colaboradores.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome} {c.nivel_acesso ? `(${c.nivel_acesso})` : (c.cargo ? `(${c.cargo})` : '')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Nome do Colaborador *</label>
                      <input
                        type="text"
                        required
                        value={retiranteNome}
                        onChange={(e) => setRetiranteNome(e.target.value)}
                        placeholder="Ex: José Silva (Zelador)"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Função / Cargo</label>
                        <input
                          type="text"
                          value={retiranteFuncao}
                          onChange={(e) => setRetiranteFuncao(e.target.value)}
                          placeholder="Ex: Limpeza, Manutenção"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Telefone / WhatsApp</label>
                        <input
                          type="text"
                          value={retiranteTel}
                          onChange={(e) => setRetiranteTel(e.target.value)}
                          placeholder="Ex: 11988887777"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM ESPECÍFICO: TERCEIROS */}
                {tipoRetirante === 'Terceiros' && (
                  <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Nome do Retirante *</label>
                        <input
                          type="text"
                          required
                          value={retiranteNome}
                          onChange={(e) => setRetiranteNome(e.target.value)}
                          placeholder="Ex: Marcos Santos"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Empresa / Terceiro *</label>
                        <input
                          type="text"
                          required
                          value={retiranteEmpresa}
                          onChange={(e) => setRetiranteEmpresa(e.target.value)}
                          placeholder="Ex: Enel, Sabesp, Vidraçaria"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Documento (RG / CPF) *</label>
                        <input
                          type="text"
                          required
                          value={retiranteDoc}
                          onChange={(e) => setRetiranteDoc(e.target.value)}
                          placeholder="Ex: 12.345.678-9"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">WhatsApp para Contato</label>
                        <input
                          type="text"
                          value={retiranteTel}
                          onChange={(e) => setRetiranteTel(e.target.value)}
                          placeholder="Ex: 11988887777"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Foto Documento Terceiro */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase">Foto do Documento (RG / CNH)</label>
                      <label className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition text-xs">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        {uploadingFoto ? 'Processando foto...' : '📷 Tirar Foto do Documento'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'chaves_doc_terceiro', setFotoDocTerceiroUrl)}
                          className="hidden"
                          disabled={uploadingFoto}
                        />
                      </label>

                      {fotoDocTerceiroUrl && (
                        <div className="mt-1 w-16 h-16 rounded-lg overflow-hidden border border-amber-400 relative">
                          <img src={fotoDocTerceiroUrl} alt="Doc Terceiro" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TEMPO LIMITE / PRAZO DE DEVOLUÇÃO FIXO E FLEXÍVEL */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">
                    Tempo Limite / Prazo de Devolução *
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'chave', label: `Padrão (${modalRetirada.tempo_limite_horas || 2}h)` },
                      { id: '1h', label: '1 hora' },
                      { id: '2h', label: '2 horas' },
                      { id: '4h', label: '4 horas' },
                      { id: '8h', label: '8 horas' },
                      { id: '12h', label: 'Plantão (12h)' },
                      { id: '24h', label: '1 dia (24h)' },
                      { id: 'custom', label: 'Outro...' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrazoModo(opt.id)}
                        className={`py-1 px-1 text-[10px] font-bold rounded border transition text-center truncate ${
                          prazoModo === opt.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {prazoModo === 'custom' && (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600">Definir Horas:</span>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={prazoHorasCustom}
                        onChange={(e) => setPrazoHorasCustom(e.target.value)}
                        className="w-20 p-1 bg-white border border-slate-300 rounded text-xs font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-500">horas limite</span>
                    </div>
                  )}
                </div>


                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg uppercase text-xs transition cursor-pointer shadow-2xs"
                >
                  Efetivar Empréstimo
                </button>
              </form>

              {whatsEmprestimo && (
                <a
                  href={whatsEmprestimo.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-700 transition w-full justify-center"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Enviar Comprovante no WhatsApp <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        );
      })()}

      {modalDevolucao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl relative">
            <button onClick={() => setModalDevolucao(null)} className="absolute top-3 right-3 text-slate-400 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Devolver Chave {modalDevolucao.chaves?.codigo_chave}
            </h3>

            <p className="text-xs text-slate-600">
              Retirada por: <strong>{modalDevolucao.retirante_nome}</strong>
            </p>

            <form onSubmit={efetivarDevolucao} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Foto no Quadro (Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition text-xs">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  {uploadingFoto ? 'Processando foto...' : '📷 Tirar Foto da Devolução (Opcional)'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'chaves_devolucao', setFotoDevolucaoUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoDevolucaoUrl && (
                  <div className="mt-1.5 w-16 h-16 rounded-lg overflow-hidden border border-emerald-500">
                    <img src={fotoDevolucaoUrl} alt="Foto Devolução" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg uppercase text-xs transition cursor-pointer"
              >
                Efetivar Devolução e Liberar Chave
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CHAVE */}
      {chaveParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 text-red-700 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900 text-base">
                  Excluir Chave do Quadro?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta ação removerá definitivamente a chave e seu histórico de movimentação do posto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChaveParaExcluir(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Código da Chave:</span>
                <span className="font-mono font-black text-white bg-slate-900 px-2 py-0.5 rounded text-xs">
                  {chaveParaExcluir.codigo_chave}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Identificador / Local:</span>
                <span className="font-bold text-slate-900 text-xs">{chaveParaExcluir.nome_chave}</span>
              </div>
              {chaveParaExcluir.unidade && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Unidade / Bloco:</span>
                  <span className="font-bold text-slate-700">
                    {formatarIdentificacaoUnidade(chaveParaExcluir.unidade, chaveParaExcluir.bloco, condoConfig?.tipo_estrutura)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Situação:</span>
                <span className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                  chaveParaExcluir.status === 'Disponível' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {chaveParaExcluir.status || 'Disponível'}
                </span>
              </div>
            </div>

            {chaveParaExcluir.status === 'Emprestada' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Esta chave consta como emprestada no momento. Ao confirmar a exclusão, a pendência será encerrada do quadro.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setChaveParaExcluir(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusaoChave}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl transition shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{loading ? 'Excluindo...' : 'Sim, Excluir Chave'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
