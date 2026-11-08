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
  Layers,
  Search,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  CheckCircle
} from 'lucide-react';
import { 
  NivelAcessoItem, 
  ModuloDefinicaoInfo,
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

  // Estados de Busca, Filtro e Formulário Dedicado por Módulo
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'operacao' | 'gestao' | 'administracao'>('todas');
  const [moduloFormAberto, setModuloFormAberto] = useState<ModuloDefinicaoInfo | null>(null);

  const getCategoriaModulo = (id: string): 'operacao' | 'gestao' | 'administracao' => {
    if (['encomendas', 'bancada', 'custodia', 'chaves', 'rondas', 'autorizados'].includes(id)) return 'operacao';
    if (['materiais', 'manutencao', 'ocorrencias', 'passagem_posto'].includes(id)) return 'gestao';
    return 'administracao';
  };

  const getDescricaoModulo = (id: string): string => {
    switch (id) {
      case 'encomendas': return 'Recebimento de lotes, triagem de pacotes, baixas com fotos/assinatura e entregas de encomendas aos moradores.';
      case 'custodia': return 'Guarda temporária de pertences de moradores, devoluções e auditoria.';
      case 'chaves': return 'Quadro digital (claviculário), empréstimos, prazos com alerta de atraso e devoluções.';
      case 'rondas': return 'Rondas patrimoniais via leitura de QR Code, pontos de checagem e setores.';
      case 'autorizados': return 'Controle de entrada e saída de prestadores de serviço, visitantes e obras.';
      case 'materiais': return 'Inventário de equipamentos do posto de trabalho (rádios HT, lanternas, etc.).';
      case 'manutencao': return 'Abertura, acompanhamento e resolução de chamados de manutenção predial (OS).';
      case 'ocorrencias': return 'Livro digital de ocorrências do posto com gravação de áudio e fotos comprobatórias.';
      case 'passagem_posto': return 'Passagem oficial de turno entre operadores, conferência de pendências e relatórios.';
      case 'bancada': return 'Balcão físico da portaria para conferência ágil de volumes e encomendas.';
      case 'cadastros': return 'Gestão de operadores, moradores, unidades residenciais e condomínios.';
      case 'historico_absoluto': return 'Auditoria consolidada em tempo real, métricas executivas e exportação de dados.';
      case 'configuracoes': return 'Gerenciamento de níveis de acesso RBAC, feature flags e parâmetros do sistema.';
      default: return 'Permissões operacionais e de acesso deste módulo.';
    }
  };

  const handleAplicarPresetModulo = (
    modulo: ModuloDefinicaoInfo,
    preset: 'liberar_tudo' | 'apenas_leitura' | 'bloquear'
  ) => {
    if (!nivelAtivo) return;

    const novasPermissoes: any = { ...nivelAtivo.permissoes };
    const permsModulo: any = {};

    if (preset === 'liberar_tudo') {
      permsModulo.visualizar = true;
      permsModulo.criar = true;
      permsModulo.editar = true;
      permsModulo.excluir = true;
      modulo.acoesEspecificas.forEach(a => {
        permsModulo[a.id] = true;
      });
    } else if (preset === 'apenas_leitura') {
      permsModulo.visualizar = true;
      permsModulo.criar = false;
      permsModulo.editar = false;
      permsModulo.excluir = false;
      modulo.acoesEspecificas.forEach(a => {
        permsModulo[a.id] = false;
      });
    } else if (preset === 'bloquear') {
      permsModulo.visualizar = false;
      permsModulo.criar = false;
      permsModulo.editar = false;
      permsModulo.excluir = false;
      modulo.acoesEspecificas.forEach(a => {
        permsModulo[a.id] = false;
      });
    }

    novasPermissoes[modulo.id] = permsModulo;
    const nivelAtualizado: NivelAcessoItem = {
      ...nivelAtivo,
      permissoes: novasPermissoes
    };

    setNiveis(prev => prev.map(n => n.id === nivelAtualizado.id ? nivelAtualizado : n));
  };

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

          {/* Botão Adicionar Novo Nível (Compacto: ícone de adição + texto Add Nível) */}
          <button
            type="button"
            onClick={abrirModalNovoPerfil}
            title="Adicionar Novo Nível"
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-black rounded-xl transition shadow-md shadow-teal-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Nível</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE NÍVEL DE ACESSO / FUNÇÃO COMPACTO E COM ALTA LEGIBILIDADE */}
      <div className="my-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#090f20] border-2 border-emerald-500/60 flex flex-col justify-between gap-3 shadow-xl">
        <div className="w-full">
          <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Nível de Acesso / Função em Configuração:</span>
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <select
                value={nivelSelecionadoId}
                onChange={(e) => setNivelSelecionadoId(e.target.value)}
                className="w-full appearance-none bg-[#060b17] border-2 border-emerald-500/80 hover:border-emerald-400 text-white font-extrabold text-sm sm:text-base py-3 px-4 rounded-xl pr-10 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer shadow-inner"
                style={{ colorScheme: 'dark', backgroundColor: '#060b17', color: '#ffffff', fontSize: '15px' }}
              >
                {niveis.map(n => (
                  <option 
                    key={n.id} 
                    value={n.id}
                    className="bg-[#0b1329] text-white font-bold py-2.5 text-sm sm:text-base"
                    style={{ backgroundColor: '#0b1329', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' }}
                  >
                    {n.nome} {n.padrao_sistema ? '(Padrão do Sistema)' : '(Customizado)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {nivelAtivo && !nivelAtivo.padrao_sistema && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => abrirModalEdicao(nivelAtivo)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Editar Nome do Perfil"
                >
                  <Pencil className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => solicitarExclusao(nivelAtivo)}
                  className="p-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Excluir Perfil Customizado"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              </div>
            )}
          </div>

          {/* Atalhos rápidos para alternar função diretamente com texto 100% legível */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-slate-800/80">
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider mr-1">Funções:</span>
            {niveis.map(n => {
              const selecionado = n.id === nivelSelecionadoId;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNivelSelecionadoId(n.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                    selecionado
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/50 ring-2 ring-emerald-300'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:text-white hover:border-slate-500'
                  }`}
                  style={{ color: '#ffffff' }}
                >
                  <span>{n.nome}</span>
                  {selecionado && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA, FILTROS E RESUMO */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar módulo ou menu (ex: chaves, encomendas, bancada)..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border-2 border-slate-600 focus:border-emerald-400 focus:bg-[#070d1c] rounded-xl text-sm sm:text-base text-white font-bold placeholder-slate-400 focus:outline-none transition shadow-inner"
              style={{ color: '#ffffff', caretColor: '#10b981', colorScheme: 'dark' }}
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => setTermoBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'todas', label: 'Todos os Módulos' },
              { id: 'operacao', label: 'Operação Portaria' },
              { id: 'gestao', label: 'Gestão & Posto' },
              { id: 'administracao', label: 'Administração' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaFiltro(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                  categoriaFiltro === cat.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-[#122040] text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LISTA DE MÓDULOS OTIMIZADA — CADA MÓDULO É UM CARD COM BOTÃO DEDICADO PARA SEU FORMULÁRIO */}
      <div className="space-y-3">
        {MODULOS_DEFINICAO_RBAC
          .filter(modulo => {
            if (termoBusca.trim()) {
              const termo = termoBusca.toLowerCase();
              const bateNome = modulo.nome.toLowerCase().includes(termo);
              const bateDesc = getDescricaoModulo(modulo.id).toLowerCase().includes(termo);
              const bateAcoes = modulo.acoesEspecificas.some(a => a.label.toLowerCase().includes(termo));
              if (!bateNome && !bateDesc && !bateAcoes) return false;
            }
            if (categoriaFiltro !== 'todas') {
              if (getCategoriaModulo(modulo.id) !== categoriaFiltro) return false;
            }
            return true;
          })
          .map((modulo) => {
            const permsDoModulo: any = nivelAtivo?.permissoes ? (nivelAtivo.permissoes as any)[modulo.id] || {} : {};
            const podeVisualizar = Boolean(permsDoModulo.visualizar);
            const podeCriar = Boolean(permsDoModulo.criar);
            const podeEditar = Boolean(permsDoModulo.editar);
            const podeExcluir = Boolean(permsDoModulo.excluir);
            const acoesAtivasCount = modulo.acoesEspecificas.filter(a => Boolean(permsDoModulo[a.id])).length;

            return (
              <div
                key={modulo.id}
                className={`rounded-2xl border transition-all px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  podeVisualizar
                    ? 'bg-[#0f1b36] border-slate-800/80 hover:border-slate-700'
                    : 'bg-[#091024]/70 border-rose-950/40 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Lado Esquerdo: Apenas Ícone do Módulo + Nome */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    podeVisualizar 
                      ? 'bg-slate-800/90 border-slate-700/80 shadow-xs' 
                      : 'bg-rose-950/40 border-rose-900/40 opacity-70'
                  }`}>
                    {getIconeModulo(modulo.id)}
                  </div>

                  <h4 className="font-extrabold text-sm text-white tracking-tight truncate">
                    {modulo.nome}
                  </h4>
                </div>

                {/* Lado Direito: Apenas Switch Ativa/Desativa Visível + Botão de Configuração */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  {/* Botão que ativa e desativa visível */}
                  <div className="flex items-center gap-2 bg-[#142343] px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300 select-none">
                      {podeVisualizar ? 'Visível' : 'Oculto'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'visualizar')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        podeVisualizar ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      title={podeVisualizar ? 'Clique para ocultar este módulo no menu' : 'Clique para exibir este módulo no menu'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          podeVisualizar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Ícone de Configuração / Botão Configurar */}
                  <button
                    type="button"
                    onClick={() => setModuloFormAberto(modulo)}
                    className="px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap shadow-emerald-900/30"
                    title={`Configurar permissões para ${modulo.nome}`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configurar</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FORMULÁRIO COMPLETO DE PERMISSÕES DO MÓDULO                       */}
      {/* ========================================================================= */}
      {moduloFormAberto && (() => {
        const modulo = moduloFormAberto;
        const permsDoModulo: any = nivelAtivo?.permissoes ? (nivelAtivo.permissoes as any)[modulo.id] || {} : {};
        const podeVisualizar = Boolean(permsDoModulo.visualizar);
        const podeCriar = Boolean(permsDoModulo.criar);
        const podeEditar = Boolean(permsDoModulo.editar);
        const podeExcluir = Boolean(permsDoModulo.excluir);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-[#0f1b36] border border-slate-700 text-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl my-6 space-y-4 max-h-[90vh] flex flex-col justify-between">
              
              {/* TOPO DO FORMULÁRIO */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-xs">
                    {getIconeModulo(modulo.id)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-white">
                        {modulo.nome}
                      </h3>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        {nivelAtivo?.nome}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {getDescricaoModulo(modulo.id)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModuloFormAberto(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CONTEÚDO COM ROLAGEM */}
              <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                
                {/* 1. CHAVE MESTRA: VISIBILIDADE NO MENU & ACESSO */}
                <div className={`p-4 rounded-2xl border transition ${
                  podeVisualizar 
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-xs' 
                    : 'bg-rose-950/40 border-rose-800/60'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {podeVisualizar ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-rose-400" />}
                        <h4 className="text-sm font-black text-white">
                          Exibição no Menu & Acesso Geral (Visualizar)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300">
                        {podeVisualizar 
                          ? 'O módulo está ativo e visível no menu lateral, barra mobile e painel geral para este perfil.' 
                          : 'Quando desativado, o menu e todas as funções deste módulo NÃO aparecerão para o operador.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'visualizar')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        podeVisualizar ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          podeVisualizar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. ATALHOS RÁPIDOS DE CONFIGURAÇÃO */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">
                    Atalhos:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAplicarPresetModulo(modulo, 'liberar_tudo')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition cursor-pointer"
                  >
                    ✓ Liberar Acesso Total
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAplicarPresetModulo(modulo, 'apenas_leitura')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 transition cursor-pointer"
                  >
                    👁️ Apenas Consulta / Leitura
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAplicarPresetModulo(modulo, 'bloquear')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 transition cursor-pointer"
                  >
                    🚫 Bloquear Módulo
                  </button>
                </div>

                {/* 3. MATRIZ CRUD PRINCIPAL */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Permissões Principais de Operação
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Visualizar */}
                    <div 
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'visualizar')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        podeVisualizar ? 'bg-[#142343] border-emerald-500/50 text-white' : 'bg-[#0b1426] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-white">Visualizar / Acessar</span>
                        <span className="text-[10px] text-slate-400">Ver dados e navegar na tela</span>
                      </div>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        podeVisualizar ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {podeVisualizar && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>

                    {/* Criar */}
                    <div 
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'criar')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        podeCriar ? 'bg-[#142343] border-emerald-500/50 text-white' : 'bg-[#0b1426] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-white">Criar / Cadastrar</span>
                        <span className="text-[10px] text-slate-400">Adicionar novos registros</span>
                      </div>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        podeCriar ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {podeCriar && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>

                    {/* Editar */}
                    <div 
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'editar')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        podeEditar ? 'bg-[#142343] border-blue-500/50 text-white' : 'bg-[#0b1426] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-white">Editar / Modificar</span>
                        <span className="text-[10px] text-slate-400">Alterar dados e status</span>
                      </div>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        podeEditar ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {podeEditar && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>

                    {/* Excluir */}
                    <div 
                      onClick={() => handleTogglePermissaoPadrao(modulo.id, 'excluir')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        podeExcluir ? 'bg-[#21152a] border-rose-500/50 text-white' : 'bg-[#0b1426] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-white">Excluir / Deletar</span>
                        <span className="text-[10px] text-slate-400">Remover registros do sistema</span>
                      </div>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        podeExcluir ? 'bg-rose-500 border-rose-400 text-white' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {podeExcluir && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. REGRAS E AÇÕES ESPECÍFICAS DO MÓDULO */}
                {modulo.acoesEspecificas.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-400" />
                      Regras e Funções Específicas ({modulo.acoesEspecificas.length})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modulo.acoesEspecificas.map((acao) => {
                        const isAtivo = Boolean(permsDoModulo[acao.id]);
                        return (
                          <div
                            key={acao.id}
                            onClick={() => handleToggleAcaoEspecifica(modulo.id, acao.id)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                              isAtivo
                                ? 'bg-purple-950/40 border-purple-500/50 text-white'
                                : 'bg-[#0b1426] border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="text-xs font-semibold text-slate-200">
                              {acao.label}
                            </span>
                            <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ml-2 ${
                              isAtivo ? 'bg-purple-600 border-purple-400 text-white' : 'border-slate-600 bg-slate-800'
                            }`}>
                              {isAtivo && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RODAPÉ DO FORMULÁRIO */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModuloFormAberto(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleSalvarMatriz();
                    setModuloFormAberto(null);
                  }}
                  disabled={salvando}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

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
                <label className="block text-xs font-black text-emerald-400 uppercase mb-1.5">
                  Nome do Perfil *
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Auxiliar de Portaria, Folguista, etc."
                  className="w-full p-3 bg-slate-950 border-2 border-slate-600 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-emerald-400 placeholder-slate-400 shadow-inner"
                  style={{ color: '#ffffff', caretColor: '#10b981', colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Finalidade deste nível de acesso..."
                  className="w-full p-3 bg-slate-950 border-2 border-slate-600 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-emerald-400 placeholder-slate-400 shadow-inner"
                  style={{ color: '#ffffff', caretColor: '#10b981', colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Perfil Base (Herança de Regras) *
                </label>
                <div className="relative">
                  <select
                    value={perfilBaseId}
                    onChange={(e) => setPerfilBaseId(e.target.value)}
                    required
                    className="w-full appearance-none p-3 bg-slate-950 border-2 border-slate-600 hover:border-emerald-400 rounded-xl text-sm sm:text-base font-bold text-white pr-10 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer shadow-inner"
                    style={{ colorScheme: 'dark', backgroundColor: '#060b17', color: '#ffffff', fontSize: '15px' }}
                  >
                    {niveis.map(n => (
                      <option 
                        key={n.id} 
                        value={n.id} 
                        className="bg-[#0b1329] text-white font-bold py-2 text-sm sm:text-base"
                        style={{ backgroundColor: '#0b1329', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' }}
                      >
                        Copiar regras de: {n.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-300 mt-1.5 font-medium">
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
                <label className="block text-xs font-black text-emerald-400 uppercase mb-1.5">
                  Nome do Perfil *
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full p-3 bg-slate-950 border-2 border-slate-600 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-emerald-400 placeholder-slate-400 shadow-inner"
                  style={{ color: '#ffffff', caretColor: '#10b981', colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full p-3 bg-slate-950 border-2 border-slate-600 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-emerald-400 placeholder-slate-400 shadow-inner"
                  style={{ color: '#ffffff', caretColor: '#10b981', colorScheme: 'dark' }}
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
                    className="w-full p-3 bg-slate-950 border-2 border-slate-600 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-rose-500 placeholder-slate-400 shadow-inner"
                    style={{ color: '#ffffff', caretColor: '#f43f5e', colorScheme: 'dark' }}
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
