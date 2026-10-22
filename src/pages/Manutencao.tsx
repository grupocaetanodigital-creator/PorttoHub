import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import { 
  Wrench, 
  Plus, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  CheckSquare
} from 'lucide-react';

interface ManutencaoProps {
  usuarioLogado?: any;
}

export default function Manutencao({ usuarioLogado }: ManutencaoProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [subAba, setSubAba] = useState<'checklist' | 'chamados'>('checklist');

  const [rotinas, setRotinas] = useState<any[]>([]);
  const [filtroFrequencia, setFiltroFrequencia] = useState('Todos');
  const [filtroStatusRotina, setFiltroStatusRotina] = useState('Todos');
  const [buscaRotina, setBuscaRotina] = useState('');

  const [modalNovaRotina, setModalNovaRotina] = useState(false);
  const [tituloRotina, setTituloRotina] = useState('');
  const [frequencia, setFrequencia] = useState('Diário');
  const [prioridadeRotina, setPrioridadeRotina] = useState('Média');
  const [descricaoRotina, setDescricaoRotina] = useState('');

  const [modalStatus, setModalStatus] = useState<any | null>(null);
  const [novoStatus, setNovoStatus] = useState('OK');
  const [observacaoStatus, setObservacaoStatus] = useState('');
  const [fotoRotinaUrl, setFotoRotinaUrl] = useState('');

  const [chamados, setChamados] = useState<any[]>([]);
  const [filtroStatusOS, setFiltroStatusOS] = useState('Todos');
  const [modalNovoChamado, setModalNovoChamado] = useState(false);
  const [modalConclusaoOS, setModalConclusaoOS] = useState<any | null>(null);
  const [tituloOS, setTituloOS] = useState('');
  const [localizacaoOS, setLocalizacaoOS] = useState('');
  const [categoriaOS, setCategoriaOS] = useState('Elétrica');
  const [prioridadeOS, setPrioridadeOS] = useState('Média');
  const [descricaoOS, setDescricaoOS] = useState('');
  const [fotoAntesUrl, setFotoAntesUrl] = useState('');
  const [fotoDepoisUrl, setFotoDepoisUrl] = useState('');
  const [obsConclusaoOS, setObsConclusaoOS] = useState('');

  const condId = usuarioLogado?.condominio_id || '';
  const isGlobal = !condId || condId === 'global';

  useEffect(() => {
    if (subAba === 'checklist') {
      carregarChecklist();
    } else {
      carregarChamados();
    }
  }, [subAba, filtroFrequencia, filtroStatusRotina, filtroStatusOS, condId]);

  const carregarChecklist = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('checklist_manutencao')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isGlobal) {
        query = query.eq('condominio_id', condId);
      }

      if (filtroFrequencia !== 'Todos') {
        query = query.eq('frequencia', filtroFrequencia);
      }
      if (filtroStatusRotina !== 'Todos') {
        query = query.eq('status', filtroStatusRotina);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRotinas(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const carregarChamados = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('chamados_manutencao')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isGlobal) {
        query = query.eq('condominio_id', condId);
      }

      if (filtroStatusOS !== 'Todos') {
        query = query.eq('status', filtroStatusOS);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChamados(data || []);
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
      setMensagem({ tipo: 'sucesso', texto: `Foto salva e comprimida com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const criarRotina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloRotina.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o título do item de manutenção.' });
      return;
    }
    setLoading(true);

    try {
      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851';
      const payload: any = {
        condominio_id: targetCondo,
        titulo: tituloRotina.trim(),
        frequencia,
        prioridade: prioridadeRotina,
        status: 'Pendente',
        descricao: descricaoRotina.trim() || '',
        operador_criacao: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
      };

      let { error } = await supabase
        .from('checklist_manutencao')
        .insert([payload]);

      if (error && ((error as any).code === '42703' || error.message?.includes('prioridade') || error.message?.includes('operador_criacao'))) {
        const payloadCompat = {
          condominio_id: targetCondo,
          titulo: tituloRotina.trim(),
          frequencia,
          status: 'Pendente',
          descricao: descricaoRotina.trim() || ''
        };
        const retry = await supabase.from('checklist_manutencao').insert([payloadCompat]);
        error = retry.error;
      }

      if (error) throw error;

      setTituloRotina(''); setDescricaoRotina(''); setModalNovaRotina(false);
      carregarChecklist();
      setMensagem({ tipo: 'sucesso', texto: 'Item adicionado à rotina do manutencista!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusRotina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStatus) return;
    setLoading(true);

    try {
      const payload = {
        status: novoStatus,
        observacao_execucao: observacaoStatus.trim() || '',
        foto_url: fotoRotinaUrl.trim() || modalStatus.foto_url || '',
        operador_conclusao: usuarioLogado?.login || usuarioLogado?.nome || 'Manutencista',
        data_conclusao: novoStatus === 'OK' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('checklist_manutencao')
        .update(payload)
        .eq('id', modalStatus.id);

      if (error) throw error;

      setModalStatus(null);
      setObservacaoStatus(''); setFotoRotinaUrl('');
      carregarChecklist();
      setMensagem({ tipo: 'sucesso', texto: `Status atualizado para: ${novoStatus}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const criarChamadoOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloOS.trim() || !localizacaoOS.trim() || !descricaoOS.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha título, localização e descrição.' });
      return;
    }
    setLoading(true);

    try {
      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851';
      const payload: any = {
        condominio_id: targetCondo,
        titulo: tituloOS.trim(),
        localizacao: localizacaoOS.trim(),
        categoria: categoriaOS,
        prioridade: prioridadeOS,
        descricao: descricaoOS.trim(),
        foto_antes_url: fotoAntesUrl.trim() || '',
        status: 'Aberto',
        operador_abertura: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
      };

      let { error } = await supabase.from('chamados_manutencao').insert([payload]);

      if (error && ((error as any).code === '42703' || error.message?.includes('localizacao') || error.message?.includes('categoria') || error.message?.includes('operador_abertura'))) {
        console.warn('Fallback: abrindo chamado com esquema básico...');
        const payloadCompat = {
          condominio_id: targetCondo,
          titulo: tituloOS.trim(),
          descricao: `[${categoriaOS} | ${prioridadeOS} | Local: ${localizacaoOS.trim()}] ${descricaoOS.trim()}`,
          foto_antes_url: fotoAntesUrl.trim() || '',
          status: 'Aberto'
        };
        const retry = await supabase.from('chamados_manutencao').insert([payloadCompat]);
        error = retry.error;
      }

      if (error) throw error;

      setTituloOS(''); setLocalizacaoOS(''); setDescricaoOS(''); setFotoAntesUrl('');
      setModalNovoChamado(false);
      carregarChamados();
      setMensagem({ tipo: 'sucesso', texto: 'Chamado OS aberto com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const concluirOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConclusaoOS) return;
    setLoading(true);

    try {
      const payload: any = {
        status: 'Concluído',
        observacao_conclusao: obsConclusaoOS.trim() || 'Serviço finalizado',
        foto_depois_url: fotoDepoisUrl.trim() || '',
        operador_conclusao: usuarioLogado?.login || usuarioLogado?.nome || 'Manutencista',
        data_conclusao: new Date().toISOString()
      };

      let { error } = await supabase.from('chamados_manutencao').update(payload).eq('id', modalConclusaoOS.id);

      if (error && ((error as any).code === '42703' || error.message?.includes('observacao_conclusao') || error.message?.includes('operador_conclusao') || error.message?.includes('data_conclusao'))) {
        console.warn('Fallback: concluindo chamado com esquema básico...');
        const payloadCompat = {
          status: 'Concluído',
          foto_depois_url: fotoDepoisUrl.trim() || ''
        };
        const retry = await supabase.from('chamados_manutencao').update(payloadCompat).eq('id', modalConclusaoOS.id);
        error = retry.error;
      }

      if (error) throw error;

      setModalConclusaoOS(null); setObsConclusaoOS(''); setFotoDepoisUrl('');
      carregarChamados();
      setMensagem({ tipo: 'sucesso', texto: 'Ordem de Serviço concluída!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const rotinasFiltradas = rotinas.filter((item: any) => {
    const termo = buscaRotina.toLowerCase();
    const t = item.titulo?.toLowerCase() || '';
    const d = item.descricao?.toLowerCase() || '';
    return t.includes(termo) || d.includes(termo);
  });

  return (
    <div className="space-y-3">
      {/* Header Compacto */}
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs border border-slate-800">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
            Módulo 06 — Manutenção Predial
          </span>
          <h3 className="font-bold text-sm sm:text-base mt-0.5 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-400" /> Rotinas do Manutencista & Chamados
          </h3>
          <p className="text-[11px] text-slate-300">
            Checklist de verificação diária/semanal e ordens de serviço do condomínio.
          </p>
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto">
          {subAba === 'checklist' ? (
            <button
              onClick={() => setModalNovaRotina(true)}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-2xs uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Tarefa
            </button>
          ) : (
            <button
              onClick={() => setModalNovoChamado(true)}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-2xs uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> Abrir Chamado / OS
            </button>
          )}
        </div>
      </div>

      {/* Abas Compactas */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1">
        <button
          onClick={() => setSubAba('checklist')}
          className={`flex-1 py-1.5 px-3 font-bold text-xs uppercase flex items-center justify-center gap-1.5 rounded-md transition ${
            subAba === 'checklist'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" /> Checklist & Fila
        </button>

        <button
          onClick={() => setSubAba('chamados')}
          className={`flex-1 py-1.5 px-3 font-bold text-xs uppercase flex items-center justify-center gap-1.5 rounded-md transition ${
            subAba === 'chamados'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" /> Chamados & OS
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {subAba === 'checklist' && (
        <div className="space-y-2.5">
          <div className="bg-white p-2 sm:p-2.5 rounded-xl shadow-2xs border border-slate-200 flex flex-col md:flex-row gap-2 justify-between items-center">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={buscaRotina}
                onChange={(e) => setBuscaRotina(e.target.value)}
                placeholder="Buscar tarefa no checklist..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              <select
                value={filtroFrequencia}
                onChange={(e) => setFiltroFrequencia(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value="Todos">Frequência: Todas</option>
                <option value="Diário">Diário</option>
                <option value="Semanal">Semanal</option>
                <option value="Mensal">Mensal</option>
                <option value="Avulso">Avulso / Extra</option>
              </select>

              <select
                value={filtroStatusRotina}
                onChange={(e) => setFiltroStatusRotina(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value="Todos">Status: Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Aguardando Peça">Aguardando Peça</option>
                <option value="Aguardando Orçamento">Aguardando Orçamento</option>
                <option value="OK">OK / Concluído</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {rotinasFiltradas.map((item: any) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border bg-white shadow-2xs flex flex-col justify-between space-y-2 relative ${
                  item.status === 'OK' ? 'border-emerald-300 bg-emerald-50/20' :
                  item.status === 'Aguardando Peça' ? 'border-purple-300 bg-purple-50/20' :
                  item.status === 'Aguardando Orçamento' ? 'border-indigo-300 bg-indigo-50/20' :
                  item.prioridade === 'Urgente' ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-1.5">
                    <span className="text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-white">
                      {item.frequencia}
                    </span>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      item.status === 'OK' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'Aguardando Peça' ? 'bg-purple-100 text-purple-800' :
                      item.status === 'Aguardando Orçamento' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.titulo}</h4>
                  {item.descricao && (
                    <p className="text-[11px] text-slate-600">{item.descricao}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-medium">
                    <span className={`font-bold px-1.5 py-0.5 rounded ${
                      item.prioridade === 'Urgente' ? 'bg-red-600 text-white' :
                      item.prioridade === 'Alta' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Prioridade: {item.prioridade}
                    </span>
                  </div>

                  {item.observacao_execucao && (
                    <div className="p-1.5 bg-slate-50 border rounded-lg text-[10px] text-slate-700">
                      <strong>Obs:</strong> {item.observacao_execucao}
                    </div>
                  )}

                  {item.foto_url && (
                    <img src={item.foto_url} alt="Evidência" loading="lazy" decoding="async" className="w-full h-20 object-cover rounded-lg border" />
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center gap-2">
                  <span className="text-[9px] text-slate-400 truncate">
                    Criado por: <strong>{item.operador_criacao}</strong>
                  </span>

                  <button
                    onClick={() => {
                      setModalStatus(item);
                      setNovoStatus(item.status);
                      setObservacaoStatus(item.observacao_execucao || '');
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md transition"
                  >
                    Atualizar Status
                  </button>
                </div>
              </div>
            ))}

            {rotinasFiltradas.length === 0 && (
              <div className="col-span-full bg-white p-6 rounded-xl border text-center text-xs text-slate-500 italic">
                Nenhum item cadastrado nesta rotina de verificação.
              </div>
            )}
          </div>
        </div>
      )}

      {subAba === 'chamados' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
            {chamados.map((item: any) => (
              <div key={item.id} className="p-3 rounded-xl border bg-white shadow-2xs space-y-2">
                <div className="flex justify-between items-start gap-1.5">
                  <div>
                    <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {item.categoria}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">{item.titulo}</h4>
                    <p className="text-[11px] text-slate-500">📍 {item.localizacao}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed">{item.descricao}</p>

                <div className="pt-2 border-t flex justify-between items-center gap-2">
                  <span className="text-[10px] text-slate-400">Aberto por: <strong>{item.operador_abertura}</strong></span>
                  {item.status !== 'Concluído' && (
                    <button
                      onClick={() => setModalConclusaoOS(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition"
                    >
                      Concluir OS
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalNovaRotina && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-3.5 sm:p-4.5 space-y-3 shadow-2xl relative">
            <button onClick={() => setModalNovaRotina(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" /> Adicionar Tarefa na Rotina
            </h3>

            <form onSubmit={criarRotina} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Título da Tarefa / Inspeção *</label>
                <input
                  type="text"
                  required
                  value={tituloRotina}
                  onChange={(e) => setTituloRotina(e.target.value)}
                  placeholder="Ex: Checar pressão da bomba d'água B2"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Frequência *</label>
                  <select
                    value={frequencia}
                    onChange={(e) => setFrequencia(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="Diário">Diário</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Avulso">Avulso / Extra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Prioridade *</label>
                  <select
                    value={prioridadeRotina}
                    onChange={(e) => setPrioridadeRotina(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Instruções / Detalhes</label>
                <textarea
                  rows={2}
                  value={descricaoRotina}
                  onChange={(e) => setDescricaoRotina(e.target.value)}
                  placeholder="Ex: Verificar se vazamento persiste e registrar fotos."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg uppercase text-xs transition shadow-2xs"
              >
                Salvar na Rotina
              </button>
            </form>
          </div>
        </div>
      )}

      {modalStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-3.5 sm:p-4.5 space-y-3 shadow-2xl relative">
            <button onClick={() => setModalStatus(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5 truncate">
              <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" /> <span className="truncate">Atualizar Tarefa: {modalStatus.titulo}</span>
            </h3>

            <form onSubmit={atualizarStatusRotina} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Novo Status *</label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="OK">🟢 OK / Concluído</option>
                  <option value="Pendente">🟡 Pendente</option>
                  <option value="Em Andamento">🔵 Em Andamento</option>
                  <option value="Aguardando Peça">🟣 Aguardando Peça</option>
                  <option value="Aguardando Orçamento">🟠 Aguardando Orçamento</option>
                  <option value="Cancelado">🔴 Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Observações do Manutencista</label>
                <textarea
                  rows={2}
                  value={observacaoStatus}
                  onChange={(e) => setObservacaoStatus(e.target.value)}
                  placeholder="Ex: Peça comprada aguardando entrega..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Foto do Serviço / Peça (Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-xs transition">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  {uploadingFoto ? 'Salvando foto...' : '📷 Anexar Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'checklist_fotos', setFotoRotinaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoRotinaUrl && (
                  <div className="mt-1.5 w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoRotinaUrl} alt="Foto Evidência" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg uppercase text-xs transition shadow-2xs"
              >
                Salvar Status
              </button>
            </form>
          </div>
        </div>
      )}

      {modalNovoChamado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-3.5 sm:p-4.5 space-y-3 shadow-2xl relative">
            <button onClick={() => setModalNovoChamado(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-emerald-600" /> Abrir Chamado OS
            </h3>

            <form onSubmit={criarChamadoOS} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Título do Problema *</label>
                <input
                  type="text"
                  required
                  value={tituloOS}
                  onChange={(e) => setTituloOS(e.target.value)}
                  placeholder="Ex: Lâmpada queimada garagem"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Categoria</label>
                  <select
                    value={categoriaOS}
                    onChange={(e) => setCategoriaOS(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Elétrica">Elétrica</option>
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="Pintura">Pintura</option>
                    <option value="Serralheria">Serralheria</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Prioridade</label>
                  <select
                    value={prioridadeOS}
                    onChange={(e) => setPrioridadeOS(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Localização *</label>
                <input
                  type="text"
                  required
                  value={localizacaoOS}
                  onChange={(e) => setLocalizacaoOS(e.target.value)}
                  placeholder="Ex: Subsolo 1"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Descrição *</label>
                <textarea
                  required
                  rows={2}
                  value={descricaoOS}
                  onChange={(e) => setDescricaoOS(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg uppercase text-xs transition shadow-2xs"
              >
                Salvar Chamado
              </button>
            </form>
          </div>
        </div>
      )}

      {modalConclusaoOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-3.5 sm:p-4.5 space-y-3 shadow-2xl relative">
            <button onClick={() => setModalConclusaoOS(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Finalizar OS
            </h3>

            <form onSubmit={concluirOS} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Observações da Conclusão</label>
                <textarea
                  rows={2}
                  value={obsConclusaoOS}
                  onChange={(e) => setObsConclusaoOS(e.target.value)}
                  placeholder="Ex: Reparo concluído com troca de reator."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg uppercase text-xs transition shadow-2xs"
              >
                Concluir Chamado
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
