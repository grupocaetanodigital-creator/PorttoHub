import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Type,
  LayoutGrid,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Package,
  Key,
  Wrench,
  BookOpen,
  ArrowRightLeft,
  Layers,
  History,
  ShieldAlert,
  Settings,
  Users,
  Upload,
  Palette,
  Bookmark,
  Download,
  FileUp,
  Trash2,
  Eye,
  Check,
  Building,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Sun,
  Moon,
  Search,
  Laptop,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import EmblemaInfport from './EmblemaInfport';
import defaultEmblemImg from '../assets/images/infport_emblem_1790505567327.jpg';
import {
  obterCustomizacaoVisual,
  salvarCustomizacaoVisual,
  restaurarPadroesVisual,
  aplicarParaTodosCondominios,
  carregarPresetsSalvos,
  salvarNovoPresetPersonalizado,
  excluirPresetPersonalizado,
  CustomizacaoVisual,
  PresetEstiloVisual,
  obterClasseTamanhoFonte,
  obterIconeModulo,
  PRESETS_EMBLEMAS,
  PRESETS_ESTILOS_COMPLETOS,
  DICIONARIO_ICONES_VETORIAIS,
  TipoFamiliaFonte,
  TipoEscalaFonte,
  TipoPesoFonte,
  TipoTemaGlobal,
  TipoRaioBorda,
  TipoLayoutMenu,
  TipoTamanhoEmblema,
  TipoBordaEmblema,
  TipoFormatoEmblema,
  isModuloOculto,
  obterRotuloModulo,
  obterDescricaoModulo,
  obterIconeModuloDinamico,
  MAPA_ALIASES_MODULOS
} from '../services/customizacaoVisualService';

interface ModalCustomizacaoVisualProps {
  aberto: boolean;
  onFechar: () => void;
  condominioAtualId?: string;
  listaCondominios?: Array<{ id: string; nome: string }>;
}

export default function ModalCustomizacaoVisual({
  aberto,
  onFechar,
  condominioAtualId = '',
  listaCondominios = []
}: ModalCustomizacaoVisualProps) {
  // Escopo: 'global' ou ID do condomínio selecionado
  const [escopoCondominio, setEscopoCondominio] = useState<string>(condominioAtualId || 'global');
  
  // Estado de configuração em edição
  const [dados, setDados] = useState<CustomizacaoVisual>(() => obterCustomizacaoVisual(condominioAtualId || 'global'));
  const [abaAtiva, setAbaAtiva] = useState<'emblema' | 'icone_app' | 'fontes' | 'temas' | 'modulos' | 'presets'>('emblema');
  const [salvoFeedback, setSalvoFeedback] = useState<string | null>(null);

  // Estados para Presets
  const [presets, setPresets] = useState<PresetEstiloVisual[]>(() => carregarPresetsSalvos());
  const [modalNovoPresetAberto, setModalNovoPresetAberto] = useState(false);
  const [nomeNovoPreset, setNomeNovoPreset] = useState('');
  const [descNovoPreset, setDescNovoPreset] = useState('');

  // Estados para Seletor de Ícones Vetoriais
  const [moduloEditandoIcone, setModuloEditandoIcone] = useState<string | null>(null);
  const [buscaIcone, setBuscaIcone] = useState('');

  // Refs de arquivo
  const inputEmblemaFileRef = useRef<HTMLInputElement>(null);
  const inputAppIconFileRef = useRef<HTMLInputElement>(null);
  const inputImportPresetRef = useRef<HTMLInputElement>(null);

  // Quando o escopo mudar, carrega a configuração do condomínio específico ou global
  useEffect(() => {
    if (aberto) {
      setDados(obterCustomizacaoVisual(escopoCondominio));
      setPresets(carregarPresetsSalvos());
    }
  }, [escopoCondominio, aberto]);

  if (!aberto) return null;

  // Atualizar campo com persistência e broadcast instantâneo em tempo real
  const atualizarCampo = <K extends keyof CustomizacaoVisual>(campo: K, valor: CustomizacaoVisual[K]) => {
    setDados(prev => {
      const proximo = {
        ...prev,
        [campo]: valor
      };
      salvarCustomizacaoVisual(proximo, escopoCondominio);
      if (condominioAtualId && escopoCondominio === 'global') {
        salvarCustomizacaoVisual(proximo, condominioAtualId);
      }
      return proximo;
    });
  };

  // Salvar no storage e aplicar em tempo real
  const handleSalvar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    salvarCustomizacaoVisual(dados, escopoCondominio);
    if (condominioAtualId && escopoCondominio === 'global') {
      salvarCustomizacaoVisual(dados, condominioAtualId);
    }
    setSalvoFeedback(
      escopoCondominio === 'global'
        ? '✓ Personalização salva para todos os condomínios com sucesso!'
        : `✓ Personalização salva para o condomínio selecionado com sucesso!`
    );
    setTimeout(() => setSalvoFeedback(null), 3000);
  };

  // Replicar configuração para todos os condomínios
  const handleAplicarTodos = () => {
    if (window.confirm('Deseja realmente aplicar esta configuração visual a TODOS os condomínios cadastrados?')) {
      const ids = listaCondominios.map(c => c.id);
      aplicarParaTodosCondominios(dados, ids);
      setEscopoCondominio('global');
      setSalvoFeedback('✓ Configuração replicada globalmente para todos os condomínios!');
      setTimeout(() => setSalvoFeedback(null), 3000);
    }
  };

  // Restaurar padrões
  const handleRestaurar = () => {
    if (window.confirm('Deseja restaurar as configurações visuais para o padrão original de fábrica?')) {
      const padrao = restaurarPadroesVisual(escopoCondominio);
      setDados(padrao);
      setSalvoFeedback('✓ Padrões de fábrica restaurados com sucesso!');
      setTimeout(() => setSalvoFeedback(null), 3000);
    }
  };

  // Carregar preset de estilo
  const handleAplicarPreset = (preset: PresetEstiloVisual) => {
    const novosDados: CustomizacaoVisual = {
      ...dados,
      ...preset.dados
    };
    setDados(novosDados);
    salvarCustomizacaoVisual(novosDados, escopoCondominio);
    setSalvoFeedback(`✓ Estilo "${preset.nome}" aplicado instantaneamente!`);
    setTimeout(() => setSalvoFeedback(null), 2500);
  };

  // Salvar novo preset
  const handleCriarPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeNovoPreset.trim()) return;
    const criado = salvarNovoPresetPersonalizado(nomeNovoPreset, descNovoPreset, dados);
    setPresets(carregarPresetsSalvos());
    setNomeNovoPreset('');
    setDescNovoPreset('');
    setModalNovoPresetAberto(false);
    setSalvoFeedback(`✓ Preset "${criado.nome}" salvo com sucesso!`);
    setTimeout(() => setSalvoFeedback(null), 2500);
  };

  // Excluir preset
  const handleExcluirPreset = (presetId: string) => {
    if (window.confirm('Excluir este preset de estilo?')) {
      excluirPresetPersonalizado(presetId);
      setPresets(carregarPresetsSalvos());
    }
  };

  // Exportar preset atual para JSON
  const handleExportarPresetJSON = () => {
    const payload = {
      tipo: 'porttohub_preset_visual',
      versao: '2.0',
      dataExportacao: new Date().toISOString(),
      config: dados
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porttohub-preset-${dados.nomeAplicacao.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar preset de JSON
  const handleImportarPresetJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const conteudo = JSON.parse(event.target?.result as string);
        if (conteudo.config) {
          setDados(prev => ({
            ...prev,
            ...conteudo.config
          }));
          salvarCustomizacaoVisual(conteudo.config, escopoCondominio);
          setSalvoFeedback('✓ Preset importado e aplicado com sucesso!');
          setTimeout(() => setSalvoFeedback(null), 3000);
        }
      } catch {
        alert('Arquivo de preset inválido.');
      }
    };
    reader.readAsText(file);
  };

  // Upload de Imagem para o Emblema
  const handleUploadEmblema = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Selecione uma imagem menor que 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setDados(prev => ({
        ...prev,
        emblemaUrl: base64,
        emblemaPreset: 'personalizado'
      }));
    };
    reader.readAsDataURL(file);
  };

  // Upload de Imagem para o Ícone do App
  const handleUploadAppIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Selecione um ícone menor que 1.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setDados(prev => ({
        ...prev,
        appIconUrl: base64,
        appIconPreset: 'personalizado'
      }));
    };
    reader.readAsDataURL(file);
  };

  // Modulos disponíveis para personalização com IDs unificados
  const listaModulosIds = [
    { id: 'cadastros', padrao: 'Cadastros Base', num: '01' },
    { id: 'encomendas', padrao: 'Encomendas', num: '02' },
    { id: 'custodia', padrao: 'Custódia de Itens', num: '03' },
    { id: 'materiais', padrao: 'Materiais & Inventário', num: '04' },
    { id: 'chaves', padrao: 'Claviculário / Chaves', num: '05' },
    { id: 'manutencao', padrao: 'Gestão de Manutenção', num: '06' },
    { id: 'rondas', padrao: 'Rondas Patrimoniais', num: '07' },
    { id: 'ocorrencias', padrao: 'Livro de Ocorrências', num: '08' },
    { id: 'passagem', padrao: 'Passagem de Posto', num: '09' },
    { id: 'prestadores', padrao: 'Autorizados & Obras', num: '10' },
    { id: 'bancada', padrao: 'Bancada de Portaria', num: '11' },
    { id: 'historico_absoluto', padrao: 'Histórico Absoluto', num: '12' },
    { id: 'painel_sindico', padrao: 'Portal do Síndico', num: '13' },
    { id: 'configuracoes', padrao: 'Configurações', num: '14' },
    { id: 'guia_operacional', padrao: 'Manual & Guia', num: '15' }
  ];

  // Ícones filtrados na busca
  const iconesFiltrados = Object.keys(DICIONARIO_ICONES_VETORIAIS).filter(k =>
    k.toLowerCase().includes(buscaIcone.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b1329] border border-slate-700/80 text-white w-full max-w-5xl rounded-3xl p-4 sm:p-6 shadow-2xl my-auto space-y-4 max-h-[95vh] flex flex-col justify-between overflow-hidden">
        
        {/* CABEÇALHO DO MODAL COM SELETOR DE ESCOPO GLOBAL / CONDOMÍNIO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-indigo-400 shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Personalização Visual, Emblema & Identidade
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  PorttoHub 2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle total sobre ícone do app, emblema, fontes dinâmicas, temas globais e menus por condomínio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Escopo de Condomínio */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400 font-bold hidden sm:inline">Escopo:</span>
              <select
                value={escopoCondominio}
                onChange={(e) => setEscopoCondominio(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                <option value="global" className="bg-slate-900 text-white">
                  🌐 Todos (Configuração Global)
                </option>
                {listaCondominios.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    🏢 {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onFechar}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Fechar painel de personalização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO DINÂMICO */}
        {salvoFeedback && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between shrink-0 animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {salvoFeedback}
            </span>
            <button onClick={() => setSalvoFeedback(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PRÉVIA EM TEMPO REAL AO VIVO (SEMPRE VISÍVEL NO TOPO DO MODAL) */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 shadow-inner shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Visualização Prévia em Tempo Real (Front-End)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Reflete Instantaneamente
              </span>
            </div>
          </div>

          {/* Barra de Header Ao Vivo com Emblema, Título, Subtítulo e Cores */}
          <div 
            className="p-3 rounded-xl border border-slate-800 flex items-center justify-between transition-all duration-300"
            style={{ 
              backgroundColor: dados.corFundoHeader || '#0f172a',
              borderRadius: dados.raioBorda === 'reto' ? '4px' : dados.raioBorda === 'suave' ? '8px' : dados.raioBorda === 'pill' ? '24px' : '12px'
            }}
          >
            <div className="flex items-center gap-3">
              <EmblemaInfport
                tamanho={dados.emblemaTamanho}
                comBrilho={dados.emblemaBrilho}
                corBrilhoCustom={dados.emblemaCorBrilho}
                estiloBordaCustom={dados.emblemaEstiloBorda}
                formatoCustom={dados.emblemaFormato}
                urlCustom={dados.emblemaUrl}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span 
                    className={`font-black tracking-tight flex items-center gap-1.5 text-white ${obterClasseTamanhoFonte(dados.tamanhoFonteNome)}`}
                    style={{ 
                      fontFamily: `var(--app-font-family, ${dados.familiaFonte})`,
                      fontWeight: dados.pesoFonte === 'negrito' ? 800 : dados.pesoFonte === 'semibold' ? 600 : 500
                    }}
                  >
                    {dados.nomeAplicacao || 'PorttoHub'}
                    {dados.exibirBadgeOnline && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" title="Online" />
                    )}
                  </span>
                  {dados.exibirBadgeEnterprise && (
                    <span 
                      className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${dados.corPrimaria}20`,
                        color: dados.corPrimaria,
                        borderColor: `${dados.corPrimaria}40`
                      }}
                    >
                      Enterprise
                    </span>
                  )}
                </div>
                {dados.subtituloAplicacao && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {dados.subtituloAplicacao}
                  </span>
                )}
              </div>
            </div>

            {/* Amostra rápida de Botão & Tipografia */}
            <div className="hidden sm:flex items-center gap-2">
              <div 
                className="px-3 py-1.5 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-default transition-all"
                style={{ 
                  backgroundColor: dados.corPrimaria,
                  borderRadius: dados.raioBorda === 'reto' ? '4px' : dados.raioBorda === 'suave' ? '6px' : dados.raioBorda === 'pill' ? '999px' : '10px'
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Exemplo Primário</span>
              </div>
              <div 
                className="px-2.5 py-1.5 text-xs font-bold border border-slate-700 text-slate-300 flex items-center gap-1.5"
                style={{ 
                  borderRadius: dados.raioBorda === 'reto' ? '4px' : dados.raioBorda === 'suave' ? '6px' : dados.raioBorda === 'pill' ? '999px' : '10px'
                }}
              >
                <span>{dados.familiaFonte} ({dados.escalaFonteGlobal})</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS DA PERSONALIZAÇÃO */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setAbaAtiva('emblema')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'emblema'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Emblema & Topo</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('icone_app')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'icone_app'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-300" />
            <span>Ícone do App (PWA)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('fontes')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'fontes'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-purple-300" />
            <span>Fontes do Sistema</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('temas')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'temas'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-pink-300" />
            <span>Temas Globais & Cores</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('modulos')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'modulos'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-300" />
            <span>Edição de Menus & Ícones</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('presets')}
            className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              abaAtiva === 'presets'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-300" />
            <span>Presets Salvos ({presets.length})</span>
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO COM SCROLL INTERNO */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">

          {/* ABA 1: EMBLEMA & IDENTIDADE DA TELA PRINCIPAL */}
          {abaAtiva === 'emblema' && (
            <div className="space-y-4">
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Emblema da Tela Principal & Topo
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Altere a imagem ou o brasão que aparece no cabeçalho superior e na tela de login.
                  Você pode selecionar um dos designs oficiais ou carregar uma imagem exclusiva do seu condomínio.
                </p>

                {/* Galeria de Presets de Emblemas */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {PRESETS_EMBLEMAS.map((emb) => {
                    const selecionado = dados.emblemaPreset === emb.id;
                    return (
                      <button
                        key={emb.id}
                        type="button"
                        onClick={() => {
                          const proximo = {
                            ...dados,
                            emblemaPreset: emb.id,
                            emblemaUrl: emb.url,
                            emblemaCorBrilho: emb.corBrilhoPadrao
                          };
                          setDados(proximo);
                          salvarCustomizacaoVisual(proximo, escopoCondominio);
                          if (condominioAtualId && escopoCondominio === 'global') {
                            salvarCustomizacaoVisual(proximo, condominioAtualId);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition cursor-pointer ${
                          selecionado
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-2 ring-indigo-500/40'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-10 h-10 flex items-center justify-center">
                          <img 
                            src={emb.url} 
                            alt={emb.nome} 
                            className="w-9 h-9 object-contain rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = defaultEmblemImg;
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold line-clamp-1">{emb.nome.split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-400 line-clamp-1">{emb.descricao.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Upload Personalizado de Imagem */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <input
                    ref={inputEmblemaFileRef}
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                    onChange={handleUploadEmblema}
                  />
                  <button
                    type="button"
                    onClick={() => inputEmblemaFileRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fazer Upload de Imagem Personalizada</span>
                  </button>

                  <div className="w-full sm:flex-1">
                    <input
                      type="text"
                      placeholder="Ou cole uma URL direta da imagem (https://...)"
                      value={dados.emblemaUrl.startsWith('data:') ? 'Imagem carregada via upload' : dados.emblemaUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val.startsWith('Imagem carregada')) {
                          setDados(prev => ({
                            ...prev,
                            emblemaUrl: val,
                            emblemaPreset: 'personalizado'
                          }));
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Parâmetros do Emblema: Tamanho, Borda, Efeito Glow */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Tamanho do Emblema
                    </label>
                    <select
                      value={dados.emblemaTamanho}
                      onChange={(e) => atualizarCampo('emblemaTamanho', e.target.value as TipoTamanhoEmblema)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="xs">Pequeno (xs - 24px)</option>
                      <option value="sm">Padrão Topo (sm - 32px)</option>
                      <option value="md">Médio (md - 40px)</option>
                      <option value="lg">Grande (lg - 56px)</option>
                      <option value="xl">Extra Grande (xl - 80px)</option>
                      <option value="2xl">Destaque (2xl - 112px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Estilo de Borda
                    </label>
                    <select
                      value={dados.emblemaEstiloBorda}
                      onChange={(e) => atualizarCampo('emblemaEstiloBorda', e.target.value as TipoBordaEmblema)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="anel_dourado">Anel Dourado Metálico</option>
                      <option value="neon">Borda Neon Elétrica</option>
                      <option value="circulo_clean">Círculo Clean Suave</option>
                      <option value="sem_borda">Sem Borda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Formato
                    </label>
                    <select
                      value={dados.emblemaFormato}
                      onChange={(e) => atualizarCampo('emblemaFormato', e.target.value as TipoFormatoEmblema)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="circular">Circular (100% Redondo)</option>
                      <option value="arredondado">Squircle Moderno</option>
                      <option value="quadrado">Quadrado Suave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Luz de Fundo / Brilho do Ícone (Glow)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => atualizarCampo('emblemaBrilho', !dados.emblemaBrilho)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          dados.emblemaBrilho
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={dados.emblemaBrilho ? "Clique para apagar a luz de fundo" : "Clique para acender a luz de fundo"}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${dados.emblemaBrilho ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span>{dados.emblemaBrilho ? 'Luz de Fundo Acesa' : 'Luz de Fundo Apagada'}</span>
                      </button>

                      <input
                        type="color"
                        value={dados.emblemaCorBrilho || '#f59e0b'}
                        disabled={!dados.emblemaBrilho}
                        onChange={(e) => atualizarCampo('emblemaCorBrilho', e.target.value)}
                        className={`w-9 h-9 p-0.5 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer ${!dados.emblemaBrilho ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="Cor da luz de fundo / brilho"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nome e Textos em Frente ao Emblema */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-indigo-400" />
                  Nome da Aplicação & Textos do Topo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Nome Principal do Sistema (Ao Lado do Emblema)
                    </label>
                    <input
                      type="text"
                      value={dados.nomeAplicacao}
                      onChange={(e) => atualizarCampo('nomeAplicacao', e.target.value)}
                      placeholder="Ex: PorttoHub, Condomínio Residencial..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Tamanho do Nome
                    </label>
                    <select
                      value={dados.tamanhoFonteNome}
                      onChange={(e) => atualizarCampo('tamanhoFonteNome', e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="sm">Pequeno (sm)</option>
                      <option value="base">Normal (base)</option>
                      <option value="lg">Médio (lg)</option>
                      <option value="xl">Grande (xl - Padrão)</option>
                      <option value="2xl">Extra Grande (2xl)</option>
                      <option value="3xl">Imponente (3xl)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Subtítulo ou Slogan Operacional (Abaixo do Nome)
                    </label>
                    <input
                      type="text"
                      value={dados.subtituloAplicacao}
                      onChange={(e) => atualizarCampo('subtituloAplicacao', e.target.value)}
                      placeholder="Ex: Portaria & Controle de Acesso 24h"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Tamanho do Subtítulo
                    </label>
                    <select
                      value={dados.tamanhoFonteSubtitulo}
                      onChange={(e) => atualizarCampo('tamanhoFonteSubtitulo', e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="xs">Micro (xs - Padrão)</option>
                      <option value="sm">Pequeno (sm)</option>
                      <option value="base">Normal (base)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={dados.exibirBadgeOnline}
                      onChange={(e) => atualizarCampo('exibirBadgeOnline', e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Exibir Ponto Verde de Status Online</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={dados.exibirBadgeEnterprise}
                      onChange={(e) => atualizarCampo('exibirBadgeEnterprise', e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Exibir Selo &quot;Enterprise&quot;</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: ÍCONE DO APP (PWA / FAVICON) */}
          {abaAtiva === 'icone_app' && (
            <div className="space-y-4">
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Ícone do Aplicativo, Aba do Navegador & PWA
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Defina o ícone de atalho que os porteiros e síndicos verão ao instalar o PWA no celular, tablet ou computador.
                  A alteração reflete imediatamente no favicon da aba do navegador.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-lg">
                    <img
                      src={dados.appIconUrl || defaultEmblemImg || '/pwa-192x192.png'}
                      alt="Ícone do App"
                      className="w-16 h-16 object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.src = defaultEmblemImg;
                      }}
                    />
                  </div>

                  <div className="space-y-2 flex-1 w-full">
                    <input
                      ref={inputAppIconFileRef}
                      type="file"
                      accept="image/png, image/svg+xml, image/webp"
                      className="hidden"
                      onChange={handleUploadAppIcon}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => inputAppIconFileRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Novo Ícone PNG / SVG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDados(prev => ({
                            ...prev,
                            appIconUrl: prev.emblemaUrl,
                            appIconPreset: 'usar_mesmo_emblema'
                          }));
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Usar o Mesmo do Emblema
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDados(prev => ({
                            ...prev,
                            appIconUrl: '/pwa-192x192.png',
                            appIconPreset: 'padrao_porttohub'
                          }));
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Padrão PorttoHub
                      </button>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Título Exibido na Aba do Navegador
                      </label>
                      <input
                        type="text"
                        value={dados.appIconTitulo}
                        onChange={(e) => atualizarCampo('appIconTitulo', e.target.value)}
                        placeholder="PorttoHub - Portaria Inteligente"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: TIPOGRAFIA & FONTES DINÂMICAS */}
          {abaAtiva === 'fontes' && (
            <div className="space-y-4">
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-purple-400" />
                  Tipografia do Sistema & Escala de Acessibilidade
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ajuste a família de fontes do sistema e a escala global para garantir conforto visual
                  e legibilidade de acordo com as necessidades da portaria.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Família de Fonte Principal
                    </label>
                    <select
                      value={dados.familiaFonte}
                      onChange={(e) => atualizarCampo('familiaFonte', e.target.value as TipoFamiliaFonte)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Inter">Inter (Limpa & Moderna - Padrão)</option>
                      <option value="Roboto">Roboto (Clássica & Alta Densidade)</option>
                      <option value="Outfit">Outfit (Geométrica Premium)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Corporativa Sleek)</option>
                      <option value="Montserrat">Montserrat (Forte & Marcante)</option>
                      <option value="Poppins">Poppins (Redonda & Amigável)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Técnica / Monospace)</option>
                      <option value="Sistema Padrão">Sistema Operacional Nativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Escala de Tamanho Global
                    </label>
                    <select
                      value={dados.escalaFonteGlobal}
                      onChange={(e) => atualizarCampo('escalaFonteGlobal', e.target.value as TipoEscalaFonte)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="compacto">Compacto (90% - Mais informações em tela)</option>
                      <option value="normal">Normal (100% - Padrão balanceado)</option>
                      <option value="confortavel">Confortável (110% - Leitura ágil)</option>
                      <option value="acessibilidade">Acessibilidade Guarita (125% - Letras grandes)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Peso Tipográfico
                    </label>
                    <select
                      value={dados.pesoFonte}
                      onChange={(e) => atualizarCampo('pesoFonte', e.target.value as TipoPesoFonte)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="normal">Normal (400)</option>
                      <option value="medio">Médio (500)</option>
                      <option value="semibold">Semi-Negrito (600)</option>
                      <option value="negrito">Negrito Marcante (700)</option>
                    </select>
                  </div>
                </div>

                {/* Testador Interativo de Tipografia */}
                <div 
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-3"
                  style={{ fontFamily: dados.familiaFonte }}
                >
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                    Amostra com Fonte &quot;{dados.familiaFonte}&quot;
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    Portaria Central - Apartamento 402 - Bloco B
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Encomenda Sedex registrada com sucesso às 14:32 pelo Operador Carlos. Notificação WhatsApp enviada para o morador.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-300">
                      CÓDIGO: #BR-9482-ENC
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      ✓ Liberado para retirada imediata
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: TEMAS GLOBAIS & CORES */}
          {abaAtiva === 'temas' && (
            <div className="space-y-4">
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-400" />
                  Tema Global & Paleta de Cores da Aplicação
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Defina o esquema de cores primárias, fundo dos cabeçalhos, menus e bordas para adequar a interface ao estilo do condomínio.
                </p>

                {/* Seletor Rápido de Temas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { id: 'porttohub_dark', nome: 'PorttoHub Noturno', cor: '#10b981', fundo: '#0b1329', desc: 'Deep Navy & Esmeralda' },
                    { id: 'cyber_black', nome: 'Cyber Tático', cor: '#38bdf8', fundo: '#08080a', desc: 'Preto Ônix & Neon Blue' },
                    { id: 'emerald_security', nome: 'Esmeralda Segurança', cor: '#059669', fundo: '#061a14', desc: 'Verde Tático Escuro' },
                    { id: 'gold_prestige', nome: 'Gold Prestige VIP', cor: '#d97706', fundo: '#18181b', desc: 'Dourado & Ônix Nobre' },
                    { id: 'high_contrast', nome: 'Alto Contraste Guarita', cor: '#2563eb', fundo: '#000000', desc: 'Preto Absoluto & Branco' },
                    { id: 'clean_light', nome: 'Clean Executivo Claro', cor: '#2563eb', fundo: '#f8fafc', desc: 'Modo Diurno Legível' }
                  ].map((tema) => {
                    const ativo = dados.temaGlobalId === tema.id;
                    return (
                      <button
                        key={tema.id}
                        type="button"
                        onClick={() => {
                          setDados(prev => ({
                            ...prev,
                            temaGlobalId: tema.id as TipoTemaGlobal,
                            corPrimaria: tema.cor,
                            corFundoSidebar: tema.fundo
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          ativo
                            ? 'bg-slate-800 border-indigo-500 shadow-md ring-2 ring-indigo-500/40'
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{tema.nome}</span>
                          <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: tema.cor }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{tema.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Cores Personalizadas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Cor Primária (Botões)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={dados.corPrimaria || '#10b981'}
                        onChange={(e) => atualizarCampo('corPrimaria', e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={dados.corPrimaria}
                        onChange={(e) => atualizarCampo('corPrimaria', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Cor de Destaque
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={dados.corDestaque || '#f59e0b'}
                        onChange={(e) => atualizarCampo('corDestaque', e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={dados.corDestaque}
                        onChange={(e) => atualizarCampo('corDestaque', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Arredondamento Bordas
                    </label>
                    <select
                      value={dados.raioBorda}
                      onChange={(e) => atualizarCampo('raioBorda', e.target.value as TipoRaioBorda)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="reto">Reto Nítido (4px)</option>
                      <option value="suave">Suave (8px - 10px)</option>
                      <option value="moderno">Moderno (16px - Padrão)</option>
                      <option value="pill">Pílula Arredondada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Layout do Menu
                    </label>
                    <select
                      value={dados.layoutMenu}
                      onChange={(e) => atualizarCampo('layoutMenu', e.target.value as TipoLayoutMenu)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="sidebar_padrao">Barra Lateral Padrão</option>
                      <option value="sidebar_compacta">Barra Compacta (Ícones)</option>
                      <option value="topo_horizontal">Topo Horizontal</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: EDIÇÃO DE MENUS & ÍCONES VETORIAIS */}
          {abaAtiva === 'modulos' && (
            <div className="space-y-4">
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-emerald-400" />
                      Personalização de Menus, Nomes & Ícones dos Módulos
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      Renomeie qualquer módulo do sistema, altere seu ícone vetorial da biblioteca nativa e configure descrições.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {listaModulosIds.length} Módulos Disponíveis
                  </span>
                </div>

                {/* Lista de Módulos para Edição Detalhada */}
                <div className="space-y-2.5 pt-1">
                  {listaModulosIds.map((mod) => {
                    const nomeAtual = obterRotuloModulo(mod.id, dados.rotulosModulos, mod.padrao);
                    const descAtual = obterDescricaoModulo(mod.id, dados.descricoesModulos);
                    const nomeIconeAtual = dados.iconesModulos[mod.id] || 'Package';
                    const IconeComponente = obterIconeModuloDinamico(mod.id, dados.iconesModulos);
                    const estaOculto = isModuloOculto(mod.id, dados.modulosOcultos);

                    const alternarVisibilidade = () => {
                      setDados(prev => {
                        const ocultos = prev.modulosOcultos || [];
                        const aliases = MAPA_ALIASES_MODULOS[mod.id] || [mod.id];
                        let novosOcultos: string[];

                        if (estaOculto) {
                          // Reexibe o módulo removendo o id e todos os aliases da lista de ocultos
                          novosOcultos = ocultos.filter(x => !aliases.includes(x) && x !== mod.id);
                        } else {
                          // Oculta o módulo adicionando o id canônico e seus aliases
                          const conjunto = new Set([...ocultos, mod.id, ...aliases]);
                          novosOcultos = Array.from(conjunto);
                        }

                        return {
                          ...prev,
                          modulosOcultos: novosOcultos
                        };
                      });
                    };

                    const atualizarRotulo = (novoNome: string) => {
                      setDados(prev => {
                        const aliases = MAPA_ALIASES_MODULOS[mod.id] || [mod.id];
                        const novoMapa = { ...prev.rotulosModulos, [mod.id]: novoNome };
                        aliases.forEach(al => {
                          novoMapa[al] = novoNome;
                        });
                        return {
                          ...prev,
                          rotulosModulos: novoMapa
                        };
                      });
                    };

                    const atualizarDescricao = (novaDesc: string) => {
                      setDados(prev => {
                        const aliases = MAPA_ALIASES_MODULOS[mod.id] || [mod.id];
                        const novoMapa = { ...prev.descricoesModulos, [mod.id]: novaDesc };
                        aliases.forEach(al => {
                          novoMapa[al] = novaDesc;
                        });
                        return {
                          ...prev,
                          descricoesModulos: novoMapa
                        };
                      });
                    };

                    return (
                      <div
                        key={mod.id}
                        className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          estaOculto
                            ? 'bg-slate-950/40 border-slate-800 opacity-60'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {/* Botão de Trocar Ícone Vetorial */}
                          <button
                            type="button"
                            onClick={() => {
                              setModuloEditandoIcone(mod.id);
                              setBuscaIcone('');
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 flex items-center justify-center text-indigo-400 hover:text-white transition cursor-pointer shrink-0 group relative shadow-xs"
                            title="Clique para escolher outro ícone vetorial"
                          >
                            <IconeComponente className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-[8px] flex items-center justify-center text-white">
                              ✎
                            </span>
                          </button>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                MÓD {mod.num}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({nomeIconeAtual})
                              </span>
                            </div>

                            <input
                              type="text"
                              value={nomeAtual}
                              onChange={(e) => atualizarRotulo(e.target.value)}
                              className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 font-bold text-sm text-white focus:outline-none w-full max-w-xs transition"
                              placeholder={mod.padrao}
                            />
                          </div>
                        </div>

                        {/* Descrição e Controle de Visibilidade */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          <input
                            type="text"
                            value={descAtual}
                            onChange={(e) => atualizarDescricao(e.target.value)}
                            placeholder="Descrição curta do módulo..."
                            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 w-full sm:w-56 focus:outline-none focus:border-slate-600"
                          />

                          <button
                            type="button"
                            onClick={alternarVisibilidade}
                            className={`p-2 rounded-xl text-xs font-bold border transition shrink-0 cursor-pointer ${
                              estaOculto
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                            title={estaOculto ? 'Módulo oculto no menu (clique para exibir)' : 'Módulo visível (clique para ocultar)'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: PRESETS SALVOS & BACKUP */}
          {abaAtiva === 'presets' && (
            <div className="space-y-4">
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      Galeria de Presets de Estilo & Temas Rápidos
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      Alterne instantaneamente entre visuais completos salvos ou crie novos presets para ocasiões especiais.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalNovoPresetAberto(true)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Salvar Visual Atual como Novo Preset</span>
                    </button>
                  </div>
                </div>

                {/* Grade de Presets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {presets.map((preset) => {
                    const ehPadrao = PRESETS_ESTILOS_COMPLETOS.some(p => p.id === preset.id);
                    return (
                      <div
                        key={preset.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-white line-clamp-1">
                              {preset.nome}
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              ehPadrao
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                              {ehPadrao ? 'Oficial' : 'Personalizado'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {preset.descricao || 'Preset salvo de customização visual.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {preset.dataCriacao}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {!ehPadrao && (
                              <button
                                type="button"
                                onClick={() => handleExcluirPreset(preset.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Excluir preset personalizado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAplicarPreset(preset)}
                              className="px-3 py-1 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Aplicar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Importar / Exportar presets em JSON */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportarPresetJSON}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Exportar Configuração (.JSON)</span>
                    </button>

                    <input
                      ref={inputImportPresetRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportarPresetJSON}
                    />

                    <button
                      type="button"
                      onClick={() => inputImportPresetRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <FileUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Importar Preset (.JSON)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRestaurar}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Padrões de Fábrica</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL COM AÇÕES PRINCIPAIS */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-800 gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto">
            <span>Editando:</span>
            <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {escopoCondominio === 'global' ? '🌐 Todos os Condomínios (Global)' : `🏢 ${listaCondominios.find(c => c.id === escopoCondominio)?.nome || 'Condomínio Atual'}`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleAplicarTodos}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Aplica exatamente esta configuração para todos os condomínios cadastrados"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Aplicar a Todos os Condomínios</span>
            </button>

            <button
              type="button"
              onClick={() => handleSalvar()}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL: ESCOLHA DE ÍCONE VETORIAL NATIVO */}
      {moduloEditandoIcone && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Escolher Ícone Vetorial para o Módulo
              </h4>
              <button
                type="button"
                onClick={() => setModuloEditandoIcone(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buscaIcone}
                onChange={(e) => setBuscaIcone(e.target.value)}
                placeholder="Buscar ícone (ex: Package, Shield, Key, Bell...)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto grid grid-cols-4 sm:grid-cols-6 gap-2 pr-1 flex-1">
              {iconesFiltrados.map((nomeChave) => {
                const Icone = DICIONARIO_ICONES_VETORIAIS[nomeChave];
                const selecionado = dados.iconesModulos[moduloEditandoIcone] === nomeChave;

                return (
                  <button
                    key={nomeChave}
                    type="button"
                    onClick={() => {
                      setDados(prev => ({
                        ...prev,
                        iconesModulos: {
                          ...prev.iconesModulos,
                          [moduloEditandoIcone]: nomeChave
                        }
                      }));
                      setModuloEditandoIcone(null);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      selecionado
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={nomeChave}
                  >
                    <Icone className="w-5 h-5" />
                    <span className="text-[9px] font-mono truncate w-full text-center">
                      {nomeChave}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: SALVAR NOVO PRESET PERSONALIZADO */}
      {modalNovoPresetAberto && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <form
            onSubmit={handleCriarPreset}
            className="bg-[#0f172a] border border-slate-700 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                Salvar Visual Atual como Preset
              </h4>
              <button
                type="button"
                onClick={() => setModalNovoPresetAberto(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Nome do Preset
                </label>
                <input
                  type="text"
                  required
                  value={nomeNovoPreset}
                  onChange={(e) => setNomeNovoPreset(e.target.value)}
                  placeholder="Ex: Visual Condomínio Jardins, Modo Noturno Escuro..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  value={descNovoPreset}
                  onChange={(e) => setDescNovoPreset(e.target.value)}
                  placeholder="Breve descrição dos elementos deste estilo..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalNovoPresetAberto(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Salvar Preset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
