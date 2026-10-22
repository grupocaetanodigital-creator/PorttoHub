import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { verificarPermissao } from '../services/permissoesService';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import { 
  Radio, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Search, 
  Pencil, 
  X, 
  Wrench,
  Trash2,
  Lock
} from 'lucide-react';

interface MateriaisProps {
  usuarioLogado?: any;
}

export default function Materiais({ usuarioLogado }: MateriaisProps) {
  // Nível numérico do usuário logado (0: Admin Geral, 1: Master, 2: Supervisor, 3: Portaria, 4: Síndico)
  const nivelNum = Number(usuarioLogado?.nivel_acesso ?? usuarioLogado?.nivel ?? 3);

  // Permissões granulares de acesso regidas pela matriz de RBAC
  const podeVisualizar = verificarPermissao(usuarioLogado, 'materiais', 'visualizar');
  const podeCriar = verificarPermissao(usuarioLogado, 'materiais', 'criar') || verificarPermissao(usuarioLogado, 'materiais', 'cadastrar_equipamentos');
  const podeEditar = verificarPermissao(usuarioLogado, 'materiais', 'editar');
  const podeExcluir = verificarPermissao(usuarioLogado, 'materiais', 'excluir');
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [materiais, setMateriais] = useState<any[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [buscaTermo, setBuscaTermo] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nomeMaterial, setNomeMaterial] = useState('');
  const [categoria, setCategoria] = useState('Rádio HT');
  const [codigoPatrimonio, setCodigoPatrimonio] = useState('');
  const [estado, setEstado] = useState('Perfeito');
  const [observacaoAvaria, setObservacaoAvaria] = useState('');
  const [fotoAvariaUrl, setFotoAvariaUrl] = useState('');

  const condId = usuarioLogado?.condominio_id || '';
  const isGlobal = !condId || condId === 'global';

  useEffect(() => {
    carregarMateriais();
  }, [filtroCategoria, condId]);

  const carregarMateriais = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('materiais_posto')
        .select('*')
        .order('nome');

      if (!isGlobal) {
        query = query.eq('condominio_id', condId);
      }

      if (filtroCategoria !== 'Todos') {
        query = query.eq('categoria', filtroCategoria);
      }

      const { data, error } = await query;
      if (error) throw error;

      setMateriais(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadFotoAvaria = async (file: File | null) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { publicUrl, tamanhoOriginalKb, tamanhoComprimidoKb, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta: 'avarias_materiais',
        maxWidth: 1000,
        maxHeight: 1000,
        qualidade: 0.75
      });

      setFotoAvariaUrl(publicUrl);
      const detalheEconomia = taxaReducaoPct > 0 ? ` (${tamanhoOriginalKb}KB ➔ ${tamanhoComprimidoKb}KB, -${taxaReducaoPct}%)` : '';
      setMensagem({ tipo: 'sucesso', texto: `Foto da avaria comprimida e registrada com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const limparFormulario = () => {
    setIdEdicao(null);
    setNomeMaterial('');
    setCategoria('Rádio HT');
    setCodigoPatrimonio('');
    setEstado('Perfeito');
    setObservacaoAvaria('');
    setFotoAvariaUrl('');
    setModalAberto(false);
  };

  const registrarLogMaterial = (tipo: 'ADICAO' | 'ALTERACAO_STATUS' | 'EXCLUSAO', detalhe: any) => {
    if (!usuarioLogado?.condominio_id) return;
    const key = `infport_materiais_log_${usuarioLogado.condominio_id}`;
    try {
      const raw = localStorage.getItem(key);
      const logs = raw ? JSON.parse(raw) : [];
      logs.unshift({
        id: Date.now().toString(),
        tipo,
        detalhe,
        operador: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria',
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(logs.slice(0, 50)));
    } catch (e) {
      console.warn('Erro ao salvar log de materiais:', e);
    }
  };

  const salvarMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idEdicao && !podeEditar) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Seu nível de acesso não permite editar equipamentos.' });
      return;
    }
    if (!idEdicao && !podeCriar) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Seu nível de acesso não permite cadastrar novos equipamentos.' });
      return;
    }
    if (!nomeMaterial.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do equipamento.' });
      return;
    }
    setLoading(true);

    try {
      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851';
      const payload = {
        condominio_id: targetCondo,
        nome: nomeMaterial.trim(),
        categoria,
        codigo_patrimonio: codigoPatrimonio.trim(),
        estado,
        observacao_avaria: estado !== 'Perfeito' ? observacaoAvaria.trim() : '',
        foto_avaria_url: estado !== 'Perfeito' ? fotoAvariaUrl.trim() : '',
        operador_atualizacao: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria',
        updated_at: new Date().toISOString()
      };

      if (idEdicao) {
        const { error } = await supabase
          .from('materiais_posto')
          .update(payload)
          .eq('id', idEdicao);
        if (error) throw error;
        registrarLogMaterial('ALTERACAO_STATUS', {
          nome: payload.nome,
          categoria: payload.categoria,
          estado: payload.estado,
          observacao: payload.observacao_avaria
        });
        setMensagem({ tipo: 'sucesso', texto: 'Equipamento atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('materiais_posto')
          .insert([payload]);
        if (error) throw error;
        registrarLogMaterial('ADICAO', {
          nome: payload.nome,
          categoria: payload.categoria,
          estado: payload.estado
        });
        setMensagem({ tipo: 'sucesso', texto: 'Equipamento cadastrado com sucesso!' });
      }

      limparFormulario();
      carregarMateriais();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const excluirMaterial = (id: string, nome: string) => {
    if (!podeExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Seu nível de acesso (Nível 3 ou inferior) não tem permissão para excluir equipamentos do posto.' });
      return;
    }
    setItemParaExcluir({ id, nome });
  };

  const confirmarExclusaoMaterial = async () => {
    if (!podeExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Operação de exclusão negada para o seu perfil.' });
      setItemParaExcluir(null);
      return;
    }
    if (!itemParaExcluir) return;
    const { id, nome } = itemParaExcluir;
    setItemParaExcluir(null);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('materiais_posto')
        .delete()
        .eq('id', id);
      if (error) throw error;
      registrarLogMaterial('EXCLUSAO', { nome, id });
      setMensagem({ tipo: 'sucesso', texto: `Equipamento "${nome}" removido do inventário!` });
      carregarMateriais();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir equipamento: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (m: any) => {
    setIdEdicao(m.id);
    setNomeMaterial(m.nome);
    setCategoria(m.categoria);
    setCodigoPatrimonio(m.codigo_patrimonio || '');
    setEstado(m.estado);
    setObservacaoAvaria(m.observacao_avaria || '');
    setFotoAvariaUrl(m.foto_avaria_url || '');
    setModalAberto(true);
  };

  const materiaisFiltrados = materiais.filter((item: any) => {
    const termo = buscaTermo.toLowerCase();
    const nome = item.nome?.toLowerCase() || '';
    const cod = item.codigo_patrimonio?.toLowerCase() || '';
    return nome.includes(termo) || cod.includes(termo);
  });

  const totalAvariados = materiais.filter((m: any) => m.estado !== 'Perfeito').length;

  return (
    <div className="space-y-3">
      {/* Header Compacto */}
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs border border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-white">Inventário de Equipamentos do Posto</h3>
            <p className="text-[10px] text-slate-400">Controle de HTs, lanternas e itens sob responsabilidade da guarita</p>
          </div>
        </div>

        {podeCriar ? (
          <button
            onClick={() => { limparFormulario(); setModalAberto(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> <span>Cadastrar Equipamento</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <Lock className="w-3 h-3 text-amber-400" /> Cadastro Restrito (Nível {usuarioLogado?.nivel_acesso ?? 3})
          </span>
        )}
      </div>

      {totalAvariados > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="text-[11px] text-amber-900">
            <strong className="block font-bold">Atenção na Passagem de Turno!</strong>
            Existem <strong>{totalAvariados} equipamento(s) com avaria ou em manutenção</strong> no posto.
          </div>
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

      <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            placeholder="Buscar por nome ou patrimônio..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs font-medium focus:outline-hidden focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['Todos', 'Rádio HT', 'Lanterna', 'Celular', 'Chave Mestra', 'Outros'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-2 py-1 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filtroCategoria === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {materiaisFiltrados.map((m: any) => (
          <div
            key={m.id}
            className={`p-2.5 sm:p-3 rounded-xl border bg-white shadow-2xs space-y-2 relative flex flex-col justify-between ${
              m.estado === 'Avariado' 
                ? 'border-red-300 bg-red-50/20' 
                : m.estado === 'Em Manutenção' 
                ? 'border-amber-300 bg-amber-50/20' 
                : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex justify-between items-start gap-1.5">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">{m.categoria}</span>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{m.nome}</h4>
                  {m.codigo_patrimonio && (
                    <p className="text-[10px] text-slate-500 font-mono">Patrimônio: {m.codigo_patrimonio}</p>
                  )}
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md uppercase ${
                  m.estado === 'Perfeito' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : m.estado === 'Avariado' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {m.estado}
                </span>
              </div>

              {m.estado !== 'Perfeito' && (
                <div className="mt-1.5 p-2 bg-white border border-red-200 rounded-lg text-xs space-y-1">
                  <p className="font-bold text-red-800 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Avaria Registrada:
                  </p>
                  <p className="text-slate-600 text-[10px]">{m.observacao_avaria || 'Sem detalhes informados'}</p>
                  
                  {m.foto_avaria_url && (
                    <img
                      src={m.foto_avaria_url}
                      alt="Foto da Avaria"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-20 object-cover rounded-md mt-1 border"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[9px] text-slate-400">
                Checado por: <strong>{m.operador_atualizacao || 'Portaria'}</strong>
              </span>

              <div className="flex items-center gap-1">
                {podeEditar && (
                  <button
                    onClick={() => prepararEdicao(m)}
                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                    title="Editar Status / Informar Avaria"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {podeExcluir && (
                  <button
                    onClick={() => excluirMaterial(m.id, m.nome)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer"
                    title="Excluir / Baixar Equipamento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {materiaisFiltrados.length === 0 && (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
            Nenhum equipamento cadastrado nesta categoria.
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl relative">
            <button
              onClick={limparFormulario}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-emerald-600" />
              {idEdicao ? 'Editar Status de Equipamento' : 'Cadastrar Equipamento no Posto'}
            </h3>

            <form onSubmit={salvarMaterial} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Nome / Identificador *</label>
                <input
                  type="text"
                  required
                  value={nomeMaterial}
                  onChange={(e) => setNomeMaterial(e.target.value)}
                  placeholder="Ex: Rádio HT 01 (Canal 02)"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Categoria *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                  >
                    <option value="Rádio HT">Rádio HT</option>
                    <option value="Lanterna">Lanterna</option>
                    <option value="Celular">Celular Guarita</option>
                    <option value="Chave Mestra">Chave Mestra</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Cód. Patrimônio</label>
                  <input
                    type="text"
                    value={codigoPatrimonio}
                    onChange={(e) => setCodigoPatrimonio(e.target.value)}
                    placeholder="Ex: HT-001"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Estado de Conservação *</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold"
                >
                  <option value="Perfeito">Perfeito / 100% Operacional</option>
                  <option value="Avariado">Com Avaria / Defeituoso</option>
                  <option value="Em Manutenção">Em Manutenção / Assistência</option>
                </select>
              </div>

              {estado !== 'Perfeito' && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-red-800 uppercase mb-0.5">Descrição do Defeito / Avaria *</label>
                    <input
                      type="text"
                      required
                      value={observacaoAvaria}
                      onChange={(e) => setObservacaoAvaria(e.target.value)}
                      placeholder="Ex: Antena quebrada, botão PTT trincado..."
                      className="w-full p-2 bg-white border border-red-300 rounded-lg text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-red-800 uppercase mb-0.5">Foto Comprobatória da Avaria</label>
                    <label className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-xs transition">
                      <Camera className="w-3.5 h-3.5" />
                      {uploadingFoto ? 'Carregando foto...' : '📷 Tirar Foto do Defeito'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => uploadFotoAvaria(e.target.files ? e.target.files[0] : null)}
                        className="hidden"
                        disabled={uploadingFoto}
                      />
                    </label>

                    {fotoAvariaUrl && (
                      <div className="mt-1.5 w-16 h-16 rounded-lg overflow-hidden border border-red-400">
                        <img src={fotoAvariaUrl} alt="Foto Defeito" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  Salvar Estado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold">
                🗑️
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Remover do Inventário?</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p>Tem certeza que deseja remover o item <strong>"{itemParaExcluir.nome}"</strong> do posto?</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusaoMaterial}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
