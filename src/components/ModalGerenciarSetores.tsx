import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RotateCcw, 
  ListChecks, 
  Layers, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Save,
  Check
} from 'lucide-react';
import { 
  SetorRonda, 
  SETORES_RONDA_PADRAO, 
  carregarSetoresRonda, 
  salvarSetoresRonda, 
  gerarIdSetor 
} from '../services/setoresRonda';

interface ModalGerenciarSetoresProps {
  aberto: boolean;
  onFechar: () => void;
  condominioId?: string;
  pontosCadastrados?: any[];
  onSetoresAlterados?: (novosSetores: SetorRonda[]) => void;
}

export default function ModalGerenciarSetores({
  aberto,
  onFechar,
  condominioId,
  pontosCadastrados = [],
  onSetoresAlterados
}: ModalGerenciarSetoresProps) {
  const [setores, setSetores] = useState<SetorRonda[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  // Controle de expansão para visualizar checklist dos setores
  const [setoresExpandidos, setSetoresExpandidos] = useState<Record<string, boolean>>({});

  // Sub-modal / formulário de Criar/Editar Setor
  const [modoEdicao, setModoEdicao] = useState<'novo' | 'editar' | null>(null);
  const [setorSelecionadoId, setSetorSelecionadoId] = useState<string | null>(null);
  const [formId, setFormId] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formItens, setFormItens] = useState<string[]>([]);
  const [novoItemTexto, setNovoItemTexto] = useState('');

  // Confirmação de exclusão
  const [setorParaExcluir, setSetorParaExcluir] = useState<SetorRonda | null>(null);
  const [confirmandoRestaurarPadroes, setConfirmandoRestaurarPadroes] = useState(false);

  useEffect(() => {
    if (aberto) {
      carregarDados();
    }
  }, [aberto, condominioId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const lista = await carregarSetoresRonda(condominioId);
      setSetores(lista);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar setores: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!aberto) return null;

  const setoresFiltrados = setores.filter(s => {
    const termo = termoBusca.toLowerCase().trim();
    if (!termo) return true;
    return (
      s.titulo.toLowerCase().includes(termo) ||
      (s.id && s.id.toLowerCase().includes(termo)) ||
      (s.codigo && s.codigo.toLowerCase().includes(termo)) ||
      (s.itens && s.itens.some(item => item.toLowerCase().includes(termo)))
    );
  });

  const totalItensChecklist = setores.reduce((acc, s) => acc + (s.itens?.length || 0), 0);

  const toggleExpandir = (setorId: string) => {
    setSetoresExpandidos(prev => ({
      ...prev,
      [setorId]: !prev[setorId]
    }));
  };

  const abrirFormNovo = () => {
    const proximaLetra = String.fromCharCode(65 + (setores.length % 26));
    const sugestaoId = `SETOR_${proximaLetra}`;
    setFormId(sugestaoId);
    setFormCodigo(`SET-${proximaLetra}`);
    setFormTitulo(`SETOR ${proximaLetra}: `);
    setFormDescricao('');
    setFormItens([
      '1º Inspeção geral de portas, acessos e iluminação',
      '2º Verificação de extintores e rota de emergência'
    ]);
    setNovoItemTexto('');
    setSetorSelecionadoId(null);
    setModoEdicao('novo');
    setMensagem(null);
  };

  const abrirFormEditar = (setor: SetorRonda) => {
    setFormId(setor.id);
    setFormCodigo(setor.codigo || setor.id);
    setFormTitulo(setor.titulo);
    setFormDescricao(setor.descricao || '');
    setFormItens(setor.itens ? [...setor.itens] : []);
    setNovoItemTexto('');
    setSetorSelecionadoId(setor.id);
    setModoEdicao('editar');
    setMensagem(null);
  };

  const fecharForm = () => {
    setModoEdicao(null);
    setSetorSelecionadoId(null);
    setNovoItemTexto('');
  };

  const adicionarItemAoForm = () => {
    const txt = novoItemTexto.trim();
    if (!txt) return;
    setFormItens(prev => [...prev, txt]);
    setNovoItemTexto('');
  };

  const removerItemDoForm = (index: number) => {
    setFormItens(prev => prev.filter((_, idx) => idx !== index));
  };

  const salvarSetorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o título ou nome do setor.' });
      return;
    }

    if (formItens.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Adicione pelo menos 1 item de inspeção ao checklist deste setor.' });
      return;
    }

    setSalvando(true);
    setMensagem(null);

    try {
      let idFinal = formId.trim().toUpperCase().replace(/\s+/g, '_');
      if (!idFinal) {
        idFinal = gerarIdSetor(formTitulo, setores);
      }

      const novoObjeto: SetorRonda = {
        id: idFinal,
        codigo: formCodigo.trim().toUpperCase() || idFinal,
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim(),
        itens: formItens,
        ativo: true
      };

      let novaLista: SetorRonda[] = [];

      if (modoEdicao === 'novo') {
        // Verifica se id já existe
        if (setores.some(s => s.id === idFinal)) {
          setMensagem({ tipo: 'erro', texto: `Já existe um setor com o identificador '${idFinal}'. Escolha outro código.` });
          setSalvando(false);
          return;
        }
        novaLista = [...setores, novoObjeto];
      } else {
        // Modo edição
        novaLista = setores.map(s => (s.id === setorSelecionadoId ? novoObjeto : s));
      }

      await salvarSetoresRonda(condominioId || '', novaLista);
      setSetores(novaLista);
      if (onSetoresAlterados) onSetoresAlterados(novaLista);

      setMensagem({
        tipo: 'sucesso',
        texto: modoEdicao === 'novo' ? 'Novo setor adicionado com sucesso!' : 'Setor atualizado com sucesso!'
      });
      fecharForm();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar setor: ' + err.message });
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!setorParaExcluir) return;
    setSalvando(true);

    try {
      const novaLista = setores.filter(s => s.id !== setorParaExcluir.id);
      await salvarSetoresRonda(condominioId || '', novaLista);
      setSetores(novaLista);
      if (onSetoresAlterados) onSetoresAlterados(novaLista);

      setMensagem({
        tipo: 'sucesso',
        texto: `Setor '${setorParaExcluir.titulo}' excluído com sucesso!`
      });
      setSetorParaExcluir(null);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir setor: ' + err.message });
    } finally {
      setSalvando(false);
    }
  };

  const solicitarRestaurarPadroes = () => {
    setConfirmandoRestaurarPadroes(true);
  };

  const executarRestaurarPadroes = async () => {
    setConfirmandoRestaurarPadroes(false);
    setSalvando(true);
    try {
      await salvarSetoresRonda(condominioId || '', SETORES_RONDA_PADRAO);
      setSetores(SETORES_RONDA_PADRAO);
      if (onSetoresAlterados) onSetoresAlterados(SETORES_RONDA_PADRAO);
      setMensagem({ tipo: 'sucesso', texto: 'Setores padrão restaurados com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao restaurar padrões: ' + err.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Configuração dos Setores de Ronda
              </h3>
              <p className="text-[11px] text-slate-500">
                Gerencie os setores disponíveis e o checklist de inspeção de cada um (ADM/Supervisor)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {mensagem && (
          <div className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
            mensagem.tipo === 'sucesso' 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
              : mensagem.tipo === 'erro'
              ? 'bg-red-50 text-red-900 border border-red-300'
              : 'bg-blue-50 text-blue-900 border border-blue-300'
          }`}>
            <span className="flex items-center gap-2">
              {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {mensagem.texto}
            </span>
            <button onClick={() => setMensagem(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Barra de Ações: Busca + Botão Novo + Restaurar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                placeholder="Buscar setor por nome, código ou item de checklist..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
              />
              {termoBusca && (
                <button
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={abrirFormNovo}
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Novo Setor
              </button>

              <button
                type="button"
                onClick={solicitarRestaurarPadroes}
                disabled={salvando}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-300 transition cursor-pointer"
                title="Restaurar a lista padrão de 9 setores"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Padrões
              </button>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Setores Ativos</span>
              <strong className="text-sm sm:text-base font-black text-slate-900">{setores.length}</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total de Itens de Inspeção</span>
              <strong className="text-sm sm:text-base font-black text-blue-700">{totalItensChecklist}</strong>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Pontos Cadastrados</span>
              <strong className="text-sm sm:text-base font-black text-emerald-700">{pontosCadastrados.length}</strong>
            </div>
          </div>

          {/* Lista de Setores */}
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Carregando setores...</div>
          ) : setoresFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {termoBusca ? 'Nenhum setor encontrado para a busca.' : 'Nenhum setor cadastrado.'}
            </div>
          ) : (
            <div className="space-y-2">
              {setoresFiltrados.map((setor) => {
                const pontosDesteSetor = pontosCadastrados.filter(
                  p => p.setor_id === setor.id || p.setor_id === setor.titulo
                );
                const expandido = setoresExpandidos[setor.id];

                return (
                  <div
                    key={setor.id}
                    className="border border-slate-200 rounded-xl bg-white shadow-2xs hover:border-slate-300 transition overflow-hidden"
                  >
                    <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                            {setor.codigo || setor.id}
                          </span>

                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <ListChecks className="w-3 h-3" />
                            {setor.itens?.length || 0} itens no checklist
                          </span>

                          {pontosDesteSetor.length > 0 && (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {pontosDesteSetor.length} {pontosDesteSetor.length === 1 ? 'ponto vinculado' : 'pontos vinculados'}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">
                          {setor.titulo}
                        </h4>

                        {setor.descricao && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {setor.descricao}
                          </p>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleExpandir(setor.id)}
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          {expandido ? (
                            <>Ocultar Itens <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Ver Itens <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirFormEditar(setor)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold p-1.5 rounded-lg transition cursor-pointer"
                          title="Editar este setor e seus itens de checklist"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSetorParaExcluir(setor)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold p-1.5 rounded-lg transition cursor-pointer"
                          title="Excluir este setor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Área Expandida com Lista de Itens do Checklist */}
                    {expandido && (
                      <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-100 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Itens de Inspeção ({setor.itens?.length || 0}):
                        </h5>
                        <div className="space-y-1">
                          {setor.itens && setor.itens.length > 0 ? (
                            setor.itens.map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-2 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start gap-2 shadow-2xs"
                              >
                                <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                                  #{idx + 1}
                                </span>
                                <span className="flex-1 font-medium">{item}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum item configurado neste setor.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <span className="text-[11px] text-slate-500">
            Total: <strong>{setores.length} setores</strong> cadastrados
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* SUB-MODAL: ADICIONAR / EDITAR SETOR */}
      {modoEdicao && (
        <div className="fixed inset-0 bg-slate-900/80 z-60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                {modoEdicao === 'novo' ? 'Novo Setor de Ronda' : `Editar Setor: ${formCodigo || formId}`}
              </h4>
              <button onClick={fecharForm} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarSetorForm} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ID / Código *
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={e => setFormId(e.target.value.toUpperCase())}
                    placeholder="Ex: SETOR_J"
                    required
                    disabled={modoEdicao === 'editar'}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:bg-white focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Título / Nome do Setor *
                  </label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={e => setFormTitulo(e.target.value)}
                    placeholder="Ex: SETOR J: CASA DE MÁQUINAS"
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Descrição ou Localização (Opcional)
                </label>
                <input
                  type="text"
                  value={formDescricao}
                  onChange={e => setFormDescricao(e.target.value)}
                  placeholder="Ex: Acesso pela escadaria da garagem ou subsolo..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Gerenciador de Itens de Checklist */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                    Itens de Inspeção do Setor ({formItens.length})
                  </label>
                  <span className="text-[10px] text-slate-500">Mínimo 1 item</span>
                </div>

                {/* Input para adicionar item */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={novoItemTexto}
                    onChange={e => setNovoItemTexto(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarItemAoForm();
                      }
                    }}
                    placeholder="Ex: Verificar iluminação de emergência e extintor..."
                    className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={adicionarItemAoForm}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {/* Lista de itens adicionados */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {formItens.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="flex-1 text-slate-800 font-medium">{item}</span>
                      <button
                        type="button"
                        onClick={() => removerItemDoForm(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Remover este item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Form */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={fecharForm}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {salvando ? 'Salvando...' : 'Salvar Setor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {setorParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/80 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                Excluir Setor de Ronda?
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Tem certeza que deseja excluir o setor <strong>{setorParaExcluir.titulo}</strong>?
              </p>

              {pontosCadastrados.some(p => p.setor_id === setorParaExcluir.id) && (
                <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-left text-[11px] text-amber-900">
                  <span className="font-bold block">⚠️ Atenção:</span>
                  Existem pontos de ronda vinculados a este setor. Ao excluir, certifique-se de reassociar esses pontos.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSetorParaExcluir(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={salvando}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {salvando ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMAÇÃO DE RESTAURAÇÃO DE PADRÕES */}
      {confirmandoRestaurarPadroes && (
        <div className="fixed inset-0 bg-slate-900/80 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                Restaurar Setores Padrão?
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Deseja restaurar a lista original de <strong>9 setores (SETOR A ao I)</strong> com seus checklists de fábrica? Isso substituirá as customizações atuais.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmandoRestaurarPadroes(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarRestaurarPadroes}
                disabled={salvando}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {salvando ? 'Restaurando...' : 'Sim, Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
