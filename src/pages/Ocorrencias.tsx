import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import { 
  BookOpen, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  X, 
  MessageCircle, 
  Building, 
  ShieldAlert, 
  AlertCircle,
  Check,
  Tag,
  User,
  Send
} from 'lucide-react';
import { ImagemOtimizada } from '../components/ImagemOtimizada';
import { obterCacheLocal, salvarCacheLocal } from '../services/offlineStorageService';
import { enfileirarAcaoOffline } from '../services/offlineSyncEngine';
import { subscreverTabelaRealtime } from '../services/realtimeSyncEngine';
import { formatarLinkWhatsApp } from '../services/configWhatsappService';
import { getCondominioAtivoId } from '../services/condominioService';

interface OcorrenciasProps {
  usuarioLogado?: any;
}

export default function Ocorrencias({ usuarioLogado }: OcorrenciasProps) {
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  const [modalNova, setModalNova] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('Interna');
  const [prioridade, setPrioridade] = useState('Média');
  const [unidadeBloco, setUnidadeBloco] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [ocorrenciaRecente, setOcorrenciaRecente] = useState<any | null>(null);

  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));

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
    if (!condId || condId === 'global' || condId === 'todos') {
      setOcorrencias([]);
      return;
    }

    // 1. Carrega do cache instantaneamente para exibição sem espera
    const cached = obterCacheLocal<any[]>('ocorrencias', condId, []);
    if (cached && cached.length > 0) {
      setOcorrencias(cached);
    }
    carregarOcorrencias();

    // 2. Assina atualizações em tempo real vindas de outros dispositivos
    const unsubscribeRealtime = subscreverTabelaRealtime('ocorrencias', () => {
      carregarOcorrencias();
    });

    const handleSync = () => carregarOcorrencias();
    window.addEventListener('infport_sincronizar_dados_global', handleSync);
    window.addEventListener('porttohub:reconexao_sincronizada', handleSync);

    return () => {
      unsubscribeRealtime();
      window.removeEventListener('infport_sincronizar_dados_global', handleSync);
      window.removeEventListener('porttohub:reconexao_sincronizada', handleSync);
    };
  }, [filtroTipo, filtroStatus, condId]);

  const carregarOcorrencias = async () => {
    if (!condId || condId === 'global' || condId === 'todos') {
      setOcorrencias([]);
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('ocorrencias')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false })
        .range(0, 49);

      if (filtroTipo !== 'Todos') {
        query = query.eq('tipo', filtroTipo);
      }

      if (filtroStatus !== 'Todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const normalizadas = (data || []).map((item: any) => ({
          ...item,
          prioridade: item.prioridade || item.gravidade || 'Média',
          status: item.status || 'Pendente',
          created_at: item.created_at || item.data_hora || new Date().toISOString(),
          unidade_bloco: item.unidade_bloco || (item.unidade ? `${item.unidade}${item.bloco ? ` - ${item.bloco}` : ''}` : null)
        }));
        setOcorrencias(normalizadas);
        salvarCacheLocal('ocorrencias', normalizadas, condId, 60);
      }
    } catch (err: any) {
      console.warn('[Ocorrencias] Falha ao carregar da nuvem, verificando cache local:', err);
      const fallback = obterCacheLocal<any[]>('ocorrencias', condId, []);
      if (fallback && fallback.length > 0) {
        const normalizadas = fallback.map((item: any) => ({
          ...item,
          prioridade: item.prioridade || item.gravidade || 'Média',
          status: item.status || 'Pendente',
          created_at: item.created_at || item.data_hora || new Date().toISOString(),
          unidade_bloco: item.unidade_bloco || (item.unidade ? `${item.unidade}${item.bloco ? ` - ${item.bloco}` : ''}` : null)
        }));
        setOcorrencias(normalizadas);
      } else {
        setMensagem({ tipo: 'erro', texto: 'Modo offline: exibindo dados armazenados localmente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadFoto = async (file: File | null) => {
    if (!file) return;
    setUploadingFoto(true);

    try {
      const { publicUrl, tamanhoOriginalKb, tamanhoComprimidoKb, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta: 'ocorrencias',
        maxWidth: 1000,
        maxHeight: 1000,
        qualidade: 0.75
      });

      setFotoUrl(publicUrl);
      const detalheEconomia = taxaReducaoPct > 0 ? ` (${tamanhoOriginalKb}KB ➔ ${tamanhoComprimidoKb}KB, -${taxaReducaoPct}%)` : '';
      setMensagem({ tipo: 'sucesso', texto: `Foto da ocorrência comprimida e anexada com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const cadastrarOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o título e a descrição da ocorrência.' });
      return;
    }

    setLoading(true);

    try {
      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id || '';
      if (!targetCondo || targetCondo === 'global' || targetCondo === 'todos') {
        setMensagem({ tipo: 'erro', texto: 'Selecione um condomínio válido antes de registrar ocorrência.' });
        setLoading(false);
        return;
      }
      const novaOcorrencia = {
        condominio_id: targetCondo,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo: tipo,
        prioridade: prioridade,
        status: 'Pendente',
        foto_url: fotoUrl.trim() || null,
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Porteiro no Posto',
        unidade_bloco: tipo === 'Morador' ? unidadeBloco.trim() : null
      };

      let registroEfetivo: any = null;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enfileirarAcaoOffline(
          'ocorrencias',
          'INSERT',
          novaOcorrencia,
          `Ocorrência: ${novaOcorrencia.titulo}`
        );
        registroEfetivo = {
          ...novaOcorrencia,
          id: 'offline_' + Date.now(),
          created_at: new Date().toISOString()
        };
        setOcorrencias(prev => [registroEfetivo, ...prev]);
        salvarCacheLocal('ocorrencias', [registroEfetivo, ...ocorrencias], condId, 60);
        setMensagem({ tipo: 'sucesso', texto: 'Ocorrência gravada offline! Será sincronizada automaticamente quando a internet retornar.' });
      } else {
        const { data, error } = await supabase
          .from('ocorrencias')
          .insert([novaOcorrencia])
          .select()
          .single();

        if (error) {
          // Em caso de falha de conexão no insert, salva na fila offline
          enfileirarAcaoOffline(
            'ocorrencias',
            'INSERT',
            novaOcorrencia,
            `Ocorrência: ${novaOcorrencia.titulo}`
          );
          registroEfetivo = {
            ...novaOcorrencia,
            id: 'offline_' + Date.now(),
            created_at: new Date().toISOString()
          };
          setOcorrencias(prev => [registroEfetivo, ...prev]);
          salvarCacheLocal('ocorrencias', [registroEfetivo, ...ocorrencias], condId, 60);
          setMensagem({ tipo: 'sucesso', texto: 'Falha de rede. Ocorrência gravada offline para sincronização automática!' });
        } else {
          registroEfetivo = data || novaOcorrencia;
          carregarOcorrencias();
          setMensagem({ tipo: 'sucesso', texto: 'Ocorrência registrada no livro digital com sucesso!' });
        }
      }

      setOcorrenciaRecente(registroEfetivo);
      setTitulo('');
      setDescricao('');
      setTipo('Interna');
      setPrioridade('Média');
      setUnidadeBloco('');
      setFotoUrl('');
      setModalNova(false);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;

      carregarOcorrencias();
      setMensagem({ tipo: 'sucesso', texto: `Status alterado para "${novoStatus}".` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const formatarDataHoraOcorrencia = (val: any) => {
    try {
      if (!val) return 'Data não informada';
      const d = new Date(val);
      if (isNaN(d.getTime())) return 'Data não informada';
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Data não informada';
    }
  };

  const gerarLinkWhatsApp = (item: any) => {
    try {
      if (!item) return '#';
      const nomeOperador = item.operador_nome || usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';
      const dataHora = formatarDataHoraOcorrencia(item.created_at || item.data_hora);
      const prioridadeStr = String(item.prioridade || item.gravidade || 'MÉDIA').toUpperCase();
      const statusStr = String(item.status || 'Pendente');
      const tituloStr = String(item.titulo || 'Ocorrência');
      const descStr = String(item.descricao || '');
      const unid = item.unidade_bloco || (item.unidade ? `${item.unidade}${item.bloco ? ` - Bloco ${item.bloco}` : ''}` : '');

      const texto = `🚨 *REGISTRO DE OCORRÊNCIA - INFPORT*\n` +
        `----------------------------------------\n` +
        `👮 *Operador Responsável:* ${nomeOperador}\n` +
        `📅 *Data e Hora:* ${dataHora}\n` +
        `📌 *Título:* ${tituloStr}\n` +
        `📂 *Tipo:* ${item.tipo === 'Interna' ? '⚙️ Interna (Guarita/Posto)' : '🏠 Reclamação/Morador'}\n` +
        (unid ? `🏢 *Unidade/Bloco:* ${unid}\n` : '') +
        `⚡ *Prioridade:* ${prioridadeStr}\n` +
        `📊 *Status:* ${statusStr}\n` +
        `----------------------------------------\n` +
        `📝 *Descrição:* \n${descStr}\n` +
        (item.foto_url ? `\n📸 *Foto da Evidência:* ${item.foto_url}` : '');

      return formatarLinkWhatsApp('', texto, nomeOperador, dataHora);
    } catch (e) {
      console.warn('Erro ao formatar WhatsApp da ocorrência:', e);
      return '#';
    }
  };

  const getCorPrioridade = (p: any) => {
    const val = String(p || '').trim().toLowerCase();
    switch (val) {
      case 'urgente':
        return 'bg-red-600 text-white';
      case 'alta':
        return 'bg-orange-500 text-white';
      case 'média':
      case 'media':
        return 'bg-amber-500 text-slate-950';
      case 'baixa':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  const getCorStatus = (s: string) => {
    switch (s) {
      case 'Resolvido': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Em Análise': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Compacto */}
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs border border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-white">Livro de Ocorrências Digital</h3>
            <p className="text-[10px] text-slate-400">Registro auditado de irregularidades e envio rápido para WhatsApp</p>
          </div>
        </div>

        <button
          onClick={() => setModalNova(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition uppercase shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> <span>Nova Ocorrência</span>
        </button>
      </div>

      {ocorrenciaRecente && (
        <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-950">Ocorrência registrada recentemente!</p>
              <p className="text-[10px] text-amber-800">Enviar para o grupo de WhatsApp da gestão?</p>
            </div>
          </div>
          <a
            href={gerarLinkWhatsApp(ocorrenciaRecente)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOcorrenciaRecente(null)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs w-full sm:w-auto justify-center"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Enviar para WhatsApp Grupo
          </a>
        </div>
      )}

      {mensagem.texto && (
        <div className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between gap-2 items-center">
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-full sm:w-auto">
          {['Todos', 'Interna', 'Morador'].map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                filtroTipo === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'Todos' ? 'Todas' : t === 'Interna' ? '⚙️ Internas' : '🏠 Moradores'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Resolvido">Resolvido</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ocorrencias.map((item) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-1.5 flex-wrap">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getCorPrioridade(item.prioridade)}`}>
                    {item.prioridade || item.gravidade || 'Média'}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCorStatus(item.status || 'Pendente')}`}>
                    {item.status || 'Pendente'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500" /> {item.tipo === 'Interna' ? 'Interna' : 'Morador'}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                  {formatarDataHoraOcorrencia(item.created_at || item.data_hora)}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{item.titulo}</h4>

              {item.unidade_bloco && (
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 w-fit flex items-center gap-1">
                  <Building className="w-3 h-3" /> Unidade: {item.unidade_bloco}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                {item.descricao}
              </p>

              {item.foto_url && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Evidência Fotográfica:</span>
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <ImagemOtimizada
                      src={item.foto_url}
                      alt={`Evidência: ${item.titulo}`}
                      permitirAmpliar={true}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Posto: <strong>{item.operador_nome || 'Portaria'}</strong>
              </span>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <a
                  href={gerarLinkWhatsApp(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                  title="Compartilhar no WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>

                {item.status !== 'Resolvido' && (
                  <button
                    onClick={() => alterarStatus(item.id, 'Resolvido')}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                  >
                    <Check className="w-3 h-3 text-emerald-400" /> Resolver
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {ocorrencias.length === 0 && !loading && (
          <div className="col-span-full bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 italic text-xs">
            Nenhuma ocorrência registrada para os filtros selecionados.
          </div>
        )}
      </div>

      {modalNova && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-3.5 sm:p-4.5 space-y-3 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalNova(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Registrar Nova Ocorrência
            </h3>

            <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-700 flex items-center gap-1.5 border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Porteiro: <strong>{usuarioLogado?.nome || usuarioLogado?.login}</strong></span>
            </div>

            <form onSubmit={cadastrarOcorrencia} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Tipo *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="Interna">⚙️ Interna (Guarita)</option>
                    <option value="Morador">🏠 Reclamação Morador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Prioridade *</label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">🚨 Urgente</option>
                  </select>
                </div>
              </div>

              {tipo === 'Morador' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Unidade / Bloco *</label>
                  <input
                    type="text"
                    required
                    value={unidadeBloco}
                    onChange={(e) => setUnidadeBloco(e.target.value)}
                    placeholder="Ex: Bloco A - Ap. 302"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Título / Resumo *</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Barulho excessivo / Lâmpada queimada"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Descrição Detalhada *</label>
                <textarea
                  rows={3}
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Relate minuciosamente o ocorrido..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Foto / Evidência (Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-xs transition">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  {uploadingFoto ? 'Enviando imagem...' : 'Anexar Foto da Ocorrência'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoUrl && (
                  <div className="mt-1.5 w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-500">
                    <img src={fotoUrl} alt="Foto Ocorrência" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg uppercase text-xs transition shadow-2xs flex items-center justify-center gap-1.5"
              >
                Registrar e Preparar Disparo WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
