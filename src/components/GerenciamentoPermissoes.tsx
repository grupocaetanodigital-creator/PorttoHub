import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Save, 
  Trash2, 
  Pencil, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Info, 
  Check, 
  Lock, 
  Sliders, 
  Package, 
  Archive, 
  Key, 
  Shield, 
  UserCheck, 
  Wrench, 
  AlertOctagon, 
  Clock, 
  Database, 
  FileText, 
  Settings,
  ChevronDown,
  Layers
} from 'lucide-react';
import { 
  NivelAcessoItem, 
  MODULOS_DEFINICAO_RBAC, 
  obterNiveisLocal, 
  salvarNivelAcesso, 
  excluirNivelAcesso, 
  verificarOperadoresEmUso, 
  clonarPermissoes,
  carregarNiveisAcesso
} from '../services/permissoesService';

interface GerenciamentoPermissoesProps {
  condominioId?: string;
  operadores?: any[];
  onAtualizacao?: () => void;
}

export default function GerenciamentoPermissoes({
  condominioId,
  operadores = [],
  onAtualizacao
}: GerenciamentoPermissoesProps) {
  const [niveis, setNiveis] = useState<NivelAcessoItem[]>([]);
  const [nivelSelecionadoId, setNivelSelecionadoId] = useState<string>('nivel_2');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState<boolean>(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState<boolean>(false);
  const [perfilEmEdicao, setPerfilEmEdicao] = useState<NivelAcessoItem | null>(null);

  // Formulário Novo Perfil
  const [novoNome, setNovoNome] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [perfilBaseId, setPerfilBaseId] = useState('nivel_3');

  // Formulário Edição de Perfil
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');

  // Confirmação de Exclusão com Digitação
  const [modalExcluirAberto, setModalExcluirAberto] = useState<boolean>(false);
  const [perfilParaExcluir, setPerfilParaExcluir] = useState<NivelAcessoItem | null>(null);
  const [textoConfirmacaoExclusao, setTextoConfirmacaoExclusao] = useState('');
  const [operadoresBloqueantes, setOperadoresBloqueantes] = useState<string[]>([]);

  // Menu Dropdown de Ações Específicas aberto por linha
  const [dropdownAbertoLinha, setDropdownAbertoLinha] = useState<string | null>(null);

  useEffect(() => {
    carregarPerfis();
  }, [condominioId]);

  const carregarPerfis = async () => {
    const lista = await carregarNiveisAcesso(condominioId);
    setNiveis(lista);
    if (lista.length > 0 && !lista.some(n => n.id === nivelSelecionadoId)) {
      setNivelSelecionadoId(lista[0].id);
    }
  };

  const nivelAtivo = niveis.find(n => n.id === nivelSelecionadoId) || niveis[0];

  const handleTogglePermissaoPadrao = (
    moduloId: string, 
    campo: 'visualizar' | 'criar' | 'editar' | 'excluir'
  ) => {
    if (!nivelAtivo) return;

    const novasPermissoes: any = { ...nivelAtivo.permissoes };
    if (!novasPermissoes[moduloId]) {
      novasPermissoes[moduloId] = {};
    }

    const valorAtual = Boolean(novasPermissoes[moduloId][campo]);
    novasPermissoes[moduloId][campo] = !valorAtual;

    const nivelAtualizado: NivelAcessoItem = {
      ...nivelAtivo,
      permissoes: novasPermissoes
    };

    setNiveis(prev => prev.map(n => n.id === nivelAtualizado.id ? nivelAtualizado : n));
  };

  const handleToggleAcaoEspecifica = (moduloId: string, acaoId: string) => {
    if (!nivelAtivo) return;

    const novasPermissoes: any = { ...nivelAtivo.permissoes };
    if (!novasPermissoes[moduloId]) {
      novasPermissoes[moduloId] = {};
    }

    const valorAtual = Boolean(novasPermissoes[moduloId][acaoId]);
    novasPermissoes[moduloId][acaoId] = !valorAtual;

    const nivelAtualizado: NivelAcessoItem = {
      ...nivelAtivo,
      permissoes: novasPermissoes
    };

    setNiveis(prev => prev.map(n => n.id === nivelAtualizado.id ? nivelAtualizado : n));
  };

  const handleSalvarMatriz = async () => {
    if (!nivelAtivo) return;
    setSalvando(true);
    try {
      await salvarNivelAcesso(nivelAtivo, condominioId);
      setMensagem({
        tipo: 'sucesso',
        texto: `Permissões de "${nivelAtivo.nome}" salvas com sucesso!`
      });
      if (onAtualizacao) onAtualizacao();
      setTimeout(() => setMensagem(null), 4000);
    } catch (err: any) {
      setMensagem({
        tipo: 'erro',
        texto: `Erro ao salvar permissões: ${err.message || 'Falha de comunicação'}`
      });
    } finally {
      setSalvando(false);
    }
  };

  // Abrir Modal Novo Perfil
  const abrirModalNovoPerfil = () => {
    setNovoNome('');
    setNovaDescricao('');
    setPerfilBaseId(nivelSelecionadoId || 'nivel_3');
    setModalNovoAberto(true);
  };

  const handleCriarNovoPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do novo perfil.' });
      return;
    }

    const base = niveis.find(n => n.id === perfilBaseId) || niveis[0];
    const novoId = `custom_${Date.now()}`;
    const novoNivel: NivelAcessoItem = {
      id: novoId,
      nome: novoNome.trim(),
      descricao: novaDescricao.trim() || `Perfil criado com base em ${base?.nome || 'padrão'}`,
      condominio_id: condominioId || null,
      padrao_sistema: false,
      permissoes: clonarPermissoes(base ? base.permissoes : {})
    };

    setSalvando(true);
    try {
      await salvarNivelAcesso(novoNivel, condominioId);
      const listaAtualizada = [...niveis, novoNivel];
      setNiveis(listaAtualizada);
      setNivelSelecionadoId(novoId);
      setModalNovoAberto(false);
      setMensagem({
        tipo: 'sucesso',
        texto: `Perfil "${novoNivel.nome}" criado com sucesso! As permissões herdadas podem ser ajustadas na matriz abaixo.`
      });
      if (onAtualizacao) onAtualizacao();
      setTimeout(() => setMensagem(null), 5000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao criar perfil: ${err.message}` });
    } finally {
      setSalvando(false);
    }
  };

  // Abrir Modal Edição
  const abrirModalEdicao = (perfil: NivelAcessoItem) => {
    setPerfilEmEdicao(perfil);
    setEditNome(perfil.nome);
    setEditDescricao(perfil.descricao || '');
    setModalEdicaoAberto(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilEmEdicao) return;
    if (!editNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O nome do perfil não pode ficar vazio.' });
      return;
    }

    const perfilAtualizado: NivelAcessoItem = {
      ...perfilEmEdicao,
      nome: editNome.trim(),
      descricao: editDescricao.trim()
    };

    setSalvando(true);
    try {
      await salvarNivelAcesso(perfilAtualizado, condominioId);
      setNiveis(prev => prev.map(n => n.id === perfilAtualizado.id ? perfilAtualizado : n));
      setModalEdicaoAberto(false);
      setMensagem({ tipo: 'sucesso', texto: `Perfil "${perfilAtualizado.nome}" atualizado com sucesso!` });
      if (onAtualizacao) onAtualizacao();
      setTimeout(() => setMensagem(null), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao atualizar perfil: ${err.message}` });
    } finally {
      setSalvando(false);
    }
  };

  // Solicitar Exclusão de Perfil
  const solicitarExclusao = (perfil: NivelAcessoItem) => {
    // 1. Validar se é nativo do sistema
    if (perfil.padrao_sistema) {
      setMensagem({
        tipo: 'erro',
        texto: `O perfil "${perfil.nome}" é nativo do sistema INFPORT 1.0 e não pode ser removido.`
      });
      setTimeout(() => setMensagem(null), 5000);
      return;
    }

    // 2. Validar se está em uso por operadores
    const usuariosEmUso = verificarOperadoresEmUso(perfil.id, operadores);
    if (usuariosEmUso.length > 0) {
      setOperadoresBloqueantes(usuariosEmUso);
      setPerfilParaExcluir(perfil);
      setModalExcluirAberto(true);
      return;
    }

    // 3. Liberado para digitação de confirmação
    setOperadoresBloqueantes([]);
    setPerfilParaExcluir(perfil);
    setTextoConfirmacaoExclusao('');
    setModalExcluirAberto(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!perfilParaExcluir) return;
    if (operadoresBloqueantes.length > 0) return;

    if (textoConfirmacaoExclusao.trim().toLowerCase() !== perfilParaExcluir.nome.trim().toLowerCase()) {
      setMensagem({
        tipo: 'erro',
        texto: 'O nome digitado não coincide com o nome do perfil. Exclusão cancelada por segurança.'
      });
      return;
    }

    setSalvando(true);
    try {
      await excluirNivelAcesso(perfilParaExcluir.id, condominioId);
      const listaRestante = niveis.filter(n => n.id !== perfilParaExcluir.id);
      setNiveis(listaRestante);
      if (nivelSelecionadoId === perfilParaExcluir.id) {
        setNivelSelecionadoId(listaRestante[0]?.id || 'nivel_3');
      }
      setModalExcluirAberto(false);
      setModalEdicaoAberto(false);
      setPerfilParaExcluir(null);
      setMensagem({
        tipo: 'sucesso',
        texto: `Perfil "${perfilParaExcluir.nome}" removido com sucesso e vínculos higienizados.`
      });
      if (onAtualizacao) onAtualizacao();
      setTimeout(() => setMensagem(null), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir perfil: ${err.message}` });
    } finally {
      setSalvando(false);
    }
  };

  const getIconeModulo = (id: string) => {
    switch (id) {
      case 'encomendas': return <Package className="w-4 h-4 text-emerald-400" />;
      case 'custodia': return <Archive className="w-4 h-4 text-cyan-400" />;
      case 'chaves': return <Key className="w-4 h-4 text-amber-400" />;
      case 'rondas': return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'autorizados': return <UserCheck className="w-4 h-4 text-emerald-300" />;
      case 'materiais': return <Wrench className="w-4 h-4 text-orange-400" />;
      case 'manutencao': return <Wrench className="w-4 h-4 text-yellow-400" />;
      case 'ocorrencias': return <AlertOctagon className="w-4 h-4 text-red-400" />;
      case 'passagem_posto': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'cadastros': return <Database className="w-4 h-4 text-purple-400" />;
      case 'historico_absoluto': return <FileText className="w-4 h-4 text-pink-400" />;
      case 'configuracoes': return <Settings className="w-4 h-4 text-teal-400" />;
      default: return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-[#0b1329] text-slate-100 rounded-3xl p-5 md:p-7 shadow-2xl border border-slate-800">
      {/* Alerta de Feedback */}
      {mensagem && (
        <div className={`mb-5 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold border transition animate-fadeIn ${
          mensagem.tipo === 'sucesso' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
            : mensagem.tipo === 'erro'
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CABEÇALHO PRINCIPAL COMPACTO */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <h2 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Acesso & Permissões</span>
        </h2>

        <div className="flex items-center gap-2">
          {/* Botão Salvar Alterações (Compacto: apenas ícone de salvar) */}
          <button
            type="button"
            onClick={handleSalvarMatriz}
            disabled={salvando}
            title="Salvar Alterações"
            className="p-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl transition shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Botão Adicionar Novo Nível (Compacto: ícone de adição + texto reduzido) */}
          <button
            type="button"
            onClick={abrirModalNovoPerfil}
            title="Adicionar Novo Nível"
            className="flex items-center gap-1 px-2.5 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-black rounded-xl transition shadow-md shadow-teal-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nível</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE NÍVEL DE ACESSO COMPACTO */}
      <div className="my-3 p-3 rounded-2xl bg-[#0f1b36] border border-slate-800 flex items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Nível de Acesso em Configuração
          </label>
          <div className="relative">
            <select
              value={nivelSelecionadoId}
              onChange={(e) => setNivelSelecionadoId(e.target.value)}
              className="w-full appearance-none bg-[#162544] border border-slate-700 hover:border-slate-600 text-white font-bold text-xs py-2 px-3 rounded-xl pr-9 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              {niveis.map(n => (
                <option key={n.id} value={n.id}>
                  {n.nome} {n.padrao_sistema ? '(Padrão)' : '(Customizado)'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {nivelAtivo && !nivelAtivo.padrao_sistema && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => abrirModalEdicao(nivelAtivo)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              title="Editar Nome do Perfil"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => solicitarExclusao(nivelAtivo)}
              className="p-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl transition cursor-pointer"
              title="Excluir Perfil Customizado"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* TABELA / MATRIZ DE PERMISSÕES GRANULARES (Idêntica ao layout da imagem) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0d162f]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#091024] text-[11px] font-black uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4 min-w-[200px]">Módulo</th>
              <th className="py-3 px-3 text-center w-28">Visualizar</th>
              <th className="py-3 px-3 text-center w-28">Criar</th>
              <th className="py-3 px-3 text-center w-28">Editar</th>
              <th className="py-3 px-3 text-center w-28">Excluir</th>
              <th className="py-3 px-4 min-w-[280px]">Ações Específicas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs font-semibold text-slate-200">
            {MODULOS_DEFINICAO_RBAC.map((modulo) => {
              const permsDoModulo: any = nivelAtivo?.permissoes ? (nivelAtivo.permissoes as any)[modulo.id] || {} : {};
              const podeVisualizar = Boolean(permsDoModulo.visualizar);
              const podeCriar = Boolean(permsDoModulo.criar);
              const podeEditar = Boolean(permsDoModulo.editar);
              const podeExcluir = Boolean(permsDoModulo.excluir);

              const acoesAtivasCount = modulo.acoesEspecificas.filter(a => Boolean(permsDoModulo[a.id])).length;

              return (
                <tr key={modulo.id} className="hover:bg-slate-800/40 transition">
                  {/* Nome do Módulo com Ícone */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
                        {getIconeModulo(modulo.id)}
                      </div>
                      <span className="font-bold text-slate-100">{modulo.nome}</span>
                    </div>
                  </td>

                  {/* Switch: Visualizar */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'visualizar')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        podeVisualizar ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          podeVisualizar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Switch: Criar */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'criar')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        podeCriar ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          podeCriar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Switch: Editar */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'editar')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        podeEditar ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          podeEditar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Switch: Excluir */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'excluir')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        podeExcluir ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          podeExcluir ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Ações Específicas com Mini Checkboxes / Dropdown Multi */}
                  <td className="py-3.5 px-4">
                    {modulo.acoesEspecificas.length === 0 ? (
                      <span className="text-slate-500 text-[11px] italic">Sem regras adicionais</span>
                    ) : (
                      <div className="relative">
                        {/* Seletor dropdown expandível para ações específicas */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {modulo.acoesEspecificas.map((acao) => {
                            const isAtivo = Boolean(permsDoModulo[acao.id]);
                            return (
                              <button
                                key={acao.id}
                                type="button"
                                onClick={() => handleToggleAcaoEspecifica(modulo.id, acao.id)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                  isAtivo 
                                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' 
                                    : 'bg-[#152341] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                                }`}
                              >
                                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                                  isAtivo ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-600 bg-slate-800'
                                }`}>
                                  {isAtivo && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span>{acao.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SEÇÃO INFERIOR: NÍVEIS DE ACESSO EXISTENTES (Idêntico ao print) */}
      <div className="mt-8 pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Níveis de Acesso</span>
          </h3>

          <span className="text-[11px] font-bold text-slate-400 bg-[#0f1b36] px-3 py-1 rounded-full border border-slate-800">
            {niveis.length} perfis
          </span>
        </div>

        {/* Grid de Perfis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {niveis.map((perfil) => {
            const estaSelecionado = perfil.id === nivelSelecionadoId;
            const qtdOperadores = verificarOperadoresEmUso(perfil.id, operadores).length;

            return (
              <div
                key={perfil.id}
                onClick={() => setNivelSelecionadoId(perfil.id)}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  estaSelecionado
                    ? 'bg-[#122244] border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-[#0f1b36] border-slate-800 hover:border-slate-700 hover:bg-[#14244a]'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    estaSelecionado ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400'
                  }`}>
                    {perfil.padrao_sistema ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </div>

                  <div className="truncate">
                    <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{perfil.nome}</span>
                      {estaSelecionado && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {qtdOperadores > 0 ? `${qtdOperadores} operador(es)` : 'Nenhum operador'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                  {/* Botão Editar Perfil */}
                  <button
                    type="button"
                    title="Editar Nome e Descrição"
                    onClick={() => abrirModalEdicao(perfil)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Botão Excluir Perfil (Apenas para customizados ou dispara aviso) */}
                  {!perfil.padrao_sistema && (
                    <button
                      type="button"
                      title="Remover Perfil"
                      onClick={() => solicitarExclusao(perfil)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: CADASTRAR NOVO PERFIL */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1b36] border border-slate-700 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-black flex items-center gap-2 text-white">
                <Plus className="w-5 h-5 text-emerald-400" />
                Cadastrar Novo Perfil de Acesso
              </h3>
              <button 
                onClick={() => setModalNovoAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarNovoPerfil} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Nome do Perfil *
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Auxiliar de Portaria, Folguista, etc."
                  className="w-full p-2.5 bg-[#162544] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Finalidade deste nível de acesso..."
                  className="w-full p-2.5 bg-[#162544] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Perfil Base (Herança de Regras) *
                </label>
                <select
                  value={perfilBaseId}
                  onChange={(e) => setPerfilBaseId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#162544] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  {niveis.map(n => (
                    <option key={n.id} value={n.id}>
                      Copiar regras de: {n.nome}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  O novo perfil herdará todas as permissões do perfil base e você poderá ajustá-las livremente sem afetar o original.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Criando...' : 'Salvar Novo Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR PERFIL (NOME / DESCRIÇÃO) */}
      {modalEdicaoAberto && perfilEmEdicao && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1b36] border border-slate-700 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-black flex items-center gap-2 text-white">
                <Pencil className="w-5 h-5 text-emerald-400" />
                Editar Perfil de Acesso
              </h3>
              <button 
                onClick={() => setModalEdicaoAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Nome do Perfil *
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full p-2.5 bg-[#162544] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full p-2.5 bg-[#162544] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                {/* Botão Remover Perfil (canto inferior esquerdo) */}
                {!perfilEmEdicao.padrao_sistema ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalEdicaoAberto(false);
                      solicitarExclusao(perfilEmEdicao);
                    }}
                    className="py-2.5 px-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-500 italic">
                    Perfil nativo do sistema
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setModalEdicaoAberto(false)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCLUSÃO COM VALIDAÇÃO DE SEGURANÇA E CONFIRMAÇÃO POR DIGITAÇÃO */}
      {modalExcluirAberto && perfilParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1b36] border border-rose-900/80 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Excluir Perfil: {perfilParaExcluir.nome}
                </h3>
                <p className="text-[11px] text-slate-400">Validação de Segurança e Integridade</p>
              </div>
            </div>

            {/* CASO 1: BLOQUEIO POR OPERADORES EM USO */}
            {operadoresBloqueantes.length > 0 ? (
              <div className="my-4 space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs">
                  <p className="font-bold flex items-center gap-1.5 mb-1.5">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Exclusão Bloqueada: Perfil em Uso!
                  </p>
                  <p className="text-[11px] text-rose-300">
                    Este perfil está atualmente vinculado a <strong>{operadoresBloqueantes.length} operador(es)</strong>.
                    Por regras de segurança, você deve realocar ou alterar o nível destes operadores antes de remover o perfil.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Operadores vinculados a este perfil:
                  </label>
                  <div className="max-h-32 overflow-y-auto p-2 bg-[#162544] rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs text-slate-200">
                    {operadoresBloqueantes.map((nome, idx) => (
                      <div key={idx} className="py-1 flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{nome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setModalExcluirAberto(false)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Entendido, vou realocar os operadores
                  </button>
                </div>
              </div>
            ) : (
              /* CASO 2: LIBERADO - EXIGE DIGITAÇÃO DO NOME DO PERFIL */
              <div className="my-4 space-y-3.5">
                <p className="text-xs text-slate-300">
                  Esta ação removerá o perfil <strong>"{perfilParaExcluir.nome}"</strong> permanentemente do sistema.
                </p>

                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-[11px]">
                  Para confirmar, digite exatamente o nome do perfil abaixo:
                  <div className="font-mono font-black text-xs text-amber-300 mt-1 select-all">
                    {perfilParaExcluir.nome}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={textoConfirmacaoExclusao}
                    onChange={(e) => setTextoConfirmacaoExclusao(e.target.value)}
                    placeholder="Digite o nome exato aqui..."
                    className="w-full p-2.5 bg-[#162544] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalExcluirAberto(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={
                      salvando || 
                      textoConfirmacaoExclusao.trim().toLowerCase() !== perfilParaExcluir.nome.trim().toLowerCase()
                    }
                    onClick={handleConfirmarExclusao}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition shadow-lg shadow-rose-900/30 cursor-pointer"
                  >
                    {salvando ? 'Removendo...' : 'Excluir Definitivamente'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
