import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Building,
  RotateCcw,
  Save,
  Package,
  Key,
  QrCode,
  Repeat,
  Wrench,
  PackageCheck,
  ClipboardList,
  Layers,
  Database,
  History,
  UserCheck,
  ShieldCheck,
  BookOpen,
  Pencil,
  Sliders,
  Sparkles,
  AlertCircle,
  HelpCircle,
  HardHat,
  Car,
  Home,
  Phone,
  Camera,
  Settings,
  ShieldAlert,
  Users,
  KeyRound,
  Hammer
} from 'lucide-react';
import {
  MODULOS_PADRAO_ROTULOS,
  MODULOS_PADRAO_DESCRICOES,
  obterCustomizacaoVisual,
  salvarCustomizacaoVisual,
  obterIconeModulo
} from '../services/customizacaoVisualService';
import {
  carregarModulosCondominio,
  salvarModulosCondominio
} from '../services/modulosService';

interface ModalGerenciadorModulosProps {
  aberto: boolean;
  onFechar: () => void;
  listaCondominios: any[];
  condominioAtivoId: string;
  onSalvoComSucesso?: (condominioId: string, flags: any) => void;
}

interface ModuloConfigItem {
  id: string;
  flagKey: string;
  tituloPadrao: string;
  descricaoPadrao: string;
  iconePadrao: any;
  corBg: string;
  corTexto: string;
}

const DEFINICAO_MODULOS: ModuloConfigItem[] = [
  {
    id: 'bancada',
    flagKey: 'mod11_bancada_conferencia',
    tituloPadrao: 'Bancada de Portaria',
    descricaoPadrao: 'Atendimento rápido e triagem de acessos em tempo real',
    iconePadrao: Layers,
    corBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    corTexto: 'text-amber-500'
  },
  {
    id: 'encomendas',
    flagKey: 'mod02_gestao_encomendas',
    tituloPadrao: 'Encomendas',
    descricaoPadrao: 'Triagem com IA, leitura OCR de etiquetas e avisos WhatsApp',
    iconePadrao: Package,
    corBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    corTexto: 'text-blue-500'
  },
  {
    id: 'chaves',
    flagKey: 'mod05_quadro_chaves',
    tituloPadrao: 'Claviculário / Chaves',
    descricaoPadrao: 'Controle de claviculário digital com assinatura do recebedor',
    iconePadrao: Key,
    corBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    corTexto: 'text-indigo-500'
  },
  {
    id: 'rondas',
    flagKey: 'mod07_gestao_ronda',
    tituloPadrao: 'Rondas Patrimoniais',
    descricaoPadrao: 'Checkpoints com tags físicas NFC e QR Code com validação de horário',
    iconePadrao: QrCode,
    corBg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    corTexto: 'text-slate-300'
  },
  {
    id: 'passagem',
    flagKey: 'mod09_passagem_posto',
    tituloPadrao: 'Passagem de Posto',
    descricaoPadrao: 'Checklist inviolável de troca de plantão e pendências da guarita',
    iconePadrao: Repeat,
    corBg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    corTexto: 'text-cyan-500'
  },
  {
    id: 'ocorrencias',
    flagKey: 'mod08_livro_ocorrencias',
    tituloPadrao: 'Livro de Ocorrências',
    descricaoPadrao: 'Diário de bordo e livro negro digital com registro fotográfico',
    iconePadrao: BookOpen,
    corBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    corTexto: 'text-rose-500'
  },
  {
    id: 'prestadores',
    flagKey: 'mod10_prestadores_servico',
    tituloPadrao: 'Autorizados & Obras',
    descricaoPadrao: 'Controle de obras, prestadores de serviço e crachás de acesso',
    iconePadrao: UserCheck,
    corBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    corTexto: 'text-purple-500'
  },
  {
    id: 'custodia',
    flagKey: 'mod03_custodia_itens',
    tituloPadrao: 'Custódia de Itens',
    descricaoPadrao: 'Guarda temporária de pertences e achados e perdidos',
    iconePadrao: PackageCheck,
    corBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    corTexto: 'text-emerald-500'
  },
  {
    id: 'materiais',
    flagKey: 'mod04_materiais_posto',
    tituloPadrao: 'Materiais & Inventário',
    descricaoPadrao: 'Inventário de equipamentos, ferramentas e materiais de posto',
    iconePadrao: ClipboardList,
    corBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    corTexto: 'text-teal-500'
  },
  {
    id: 'manutencao',
    flagKey: 'mod06_gestao_manutencao',
    tituloPadrao: 'Gestão de Manutenção',
    descricaoPadrao: 'Registro de chamados prediais e ordens de serviço (O.S.)',
    iconePadrao: Wrench,
    corBg: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    corTexto: 'text-orange-500'
  },
  {
    id: 'cadastros',
    flagKey: 'mod01_cadastros_base',
    tituloPadrao: 'Cadastros Base',
    descricaoPadrao: 'Moradores, veículos, unidades e operadores autorizados',
    iconePadrao: Database,
    corBg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    corTexto: 'text-slate-300'
  },
  {
    id: 'historico_absoluto',
    flagKey: 'mod12_historico_absoluto',
    tituloPadrao: 'Histórico Absoluto',
    descricaoPadrao: 'Auditoria cronológica unificada de todas as movimentações',
    iconePadrao: History,
    corBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    corTexto: 'text-indigo-500'
  },
  {
    id: 'painel_sindico',
    flagKey: 'mod_portal_sindico',
    tituloPadrao: 'Portal do Síndico',
    descricaoPadrao: 'Dashboard executivo com métricas e conformidade condominial',
    iconePadrao: ShieldCheck,
    corBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    corTexto: 'text-emerald-500'
  },
  {
    id: 'guia_operacional',
    flagKey: 'mod_guia_operacional',
    tituloPadrao: 'Manual Oficial & Guia Operacional',
    descricaoPadrao: 'Instruções e manual de todas as funções (desative se a equipe já estiver treinada)',
    iconePadrao: HelpCircle,
    corBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    corTexto: 'text-indigo-400'
  }
];

// Lista de ícones disponíveis para customização
const ICONES_DISPONIVEIS = [
  { nome: 'Layers', icone: Layers, rotulo: 'Camadas / Bancada' },
  { nome: 'Package', icone: Package, rotulo: 'Encomendas' },
  { nome: 'PackageCheck', icone: PackageCheck, rotulo: 'Custódia' },
  { nome: 'Key', icone: Key, rotulo: 'Chave Simples' },
  { nome: 'KeyRound', icone: KeyRound, rotulo: 'Chaveiro' },
  { nome: 'QrCode', icone: QrCode, rotulo: 'QR Code' },
  { nome: 'Repeat', icone: Repeat, rotulo: 'Troca de Posto' },
  { nome: 'Wrench', icone: Wrench, rotulo: 'Chave Inglesa' },
  { nome: 'Hammer', icone: Hammer, rotulo: 'Manutenção / O.S.' },
  { nome: 'ClipboardList', icone: ClipboardList, rotulo: 'Inventário' },
  { nome: 'BookOpen', icone: BookOpen, rotulo: 'Livro Ocorrências' },
  { nome: 'UserCheck', icone: UserCheck, rotulo: 'Visitantes / Autorizados' },
  { nome: 'Users', icone: Users, rotulo: 'Moradores' },
  { nome: 'ShieldCheck', icone: ShieldCheck, rotulo: 'Síndico / Segurança' },
  { nome: 'ShieldAlert', icone: ShieldAlert, rotulo: 'Alerta de Segurança' },
  { nome: 'Database', icone: Database, rotulo: 'Base de Dados' },
  { nome: 'History', icone: History, rotulo: 'Histórico' },
  { nome: 'HelpCircle', icone: HelpCircle, rotulo: 'Guia / Ajuda' },
  { nome: 'HardHat', icone: HardHat, rotulo: 'Prestadores / Obras' },
  { nome: 'Building', icone: Building, rotulo: 'Condomínio' },
  { nome: 'Home', icone: Home, rotulo: 'Residencial' },
  { nome: 'Car', icone: Car, rotulo: 'Veículos' },
  { nome: 'Phone', icone: Phone, rotulo: 'Ramais / Contato' },
  { nome: 'Camera', icone: Camera, rotulo: 'CFTV / Câmeras' },
  { nome: 'Settings', icone: Settings, rotulo: 'Configurações' },
  { nome: 'Sparkles', icone: Sparkles, rotulo: 'Especial / IA' }
];

export default function ModalGerenciadorModulosCondominio({
  aberto,
  onFechar,
  listaCondominios,
  condominioAtivoId,
  onSalvoComSucesso
}: ModalGerenciadorModulosProps) {
  // A função é estritamente referente ao condomínio solicitado (sem seletor de condomínio)
  const idCondominioAlvo = condominioAtivoId || (listaCondominios.length > 0 ? listaCondominios[0].id : '');
  
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [rotulos, setRotulos] = useState<Record<string, string>>({});
  const [descricoes, setDescricoes] = useState<Record<string, string>>({});
  const [icones, setIcones] = useState<Record<string, string>>({});
  const [moduloEmEdicao, setModuloEmEdicao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | ''; texto: string }>({ tipo: '', texto: '' });

  // Carrega configurações estritamente para o condomínio solicitado
  useEffect(() => {
    if (!idCondominioAlvo || !aberto) return;

    let cancelado = false;

    const carregarConfigCondo = async () => {
      // 1. Carrega preferências visuais salvas para esse condomínio
      const visual = obterCustomizacaoVisual(idCondominioAlvo);
      if (!cancelado) {
        setRotulos(visual.rotulosModulos || { ...MODULOS_PADRAO_ROTULOS });
        setDescricoes(visual.descricoesModulos || { ...MODULOS_PADRAO_DESCRICOES });
        setIcones(visual.iconesModulos || {});
      }

      // 2. Carrega flags consolidadas
      try {
        const flagsCarregadas = await carregarModulosCondominio(idCondominioAlvo);
        const flagsIniciais: Record<string, boolean> = {};

        DEFINICAO_MODULOS.forEach(mod => {
          if (flagsCarregadas[mod.flagKey] !== undefined) {
            flagsIniciais[mod.flagKey] = Boolean(flagsCarregadas[mod.flagKey]);
          } else if (flagsCarregadas[mod.id] !== undefined) {
            flagsIniciais[mod.flagKey] = Boolean(flagsCarregadas[mod.id]);
          } else {
            flagsIniciais[mod.flagKey] = true;
          }
        });

        if (!cancelado) {
          setFlags(flagsIniciais);
        }
      } catch (e) {
        console.warn('Carregando flags padrão locais:', e);
        const flagsIniciais: Record<string, boolean> = {};
        DEFINICAO_MODULOS.forEach(mod => {
          flagsIniciais[mod.flagKey] = true;
        });
        if (!cancelado) setFlags(flagsIniciais);
      }
    };

    carregarConfigCondo();

    return () => {
      cancelado = true;
    };
  }, [idCondominioAlvo, aberto]);

  if (!aberto) return null;

  const handleToggle = (flagKey: string, modId?: string) => {
    setFlags(prev => {
      const novoValor = !prev[flagKey];
      const atualizado: Record<string, boolean> = {
        ...prev,
        [flagKey]: novoValor
      };
      if (modId) {
        atualizado[modId] = novoValor;
      }
      return atualizado;
    });
  };

  const handleAlterarRotulo = (id: string, novoValor: string) => {
    setRotulos(prev => ({
      ...prev,
      [id]: novoValor
    }));
  };

  const handleAlterarDescricao = (id: string, novoValor: string) => {
    setDescricoes(prev => ({
      ...prev,
      [id]: novoValor
    }));
  };

  const handleAlterarIcone = (id: string, nomeIcone: string) => {
    setIcones(prev => ({
      ...prev,
      [id]: nomeIcone
    }));
  };

  const ativarTodos = () => {
    const novas: Record<string, boolean> = {};
    DEFINICAO_MODULOS.forEach(m => {
      novas[m.flagKey] = true;
      novas[m.id] = true;
    });
    setFlags(novas);
  };

  const desativarOpcionais = () => {
    // Mantém apenas Bancada e Cadastros
    const novas: Record<string, boolean> = {};
    DEFINICAO_MODULOS.forEach(m => {
      const ativo = m.id === 'bancada' || m.id === 'cadastros';
      novas[m.flagKey] = ativo;
      novas[m.id] = ativo;
    });
    setFlags(novas);
  };

  const restaurarTodosNomes = () => {
    setRotulos({ ...MODULOS_PADRAO_ROTULOS });
    setDescricoes({ ...MODULOS_PADRAO_DESCRICOES });
    setIcones({});
  };

  const salvarParametrizacao = async () => {
    if (!idCondominioAlvo) {
      setMensagem({ tipo: 'erro', texto: 'Nenhum condomínio válido selecionado.' });
      return;
    }

    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const flagsCompletas: Record<string, boolean> = { ...flags };
      DEFINICAO_MODULOS.forEach(m => {
        const val = flags[m.flagKey] !== undefined ? flags[m.flagKey] : (flags[m.id] !== undefined ? flags[m.id] : true);
        flagsCompletas[m.flagKey] = val;
        flagsCompletas[m.id] = val;
      });

      const res = await salvarModulosCondominio(idCondominioAlvo, flagsCompletas, rotulos, descricoes, icones);

      if (res.sucesso) {
        setMensagem({
          tipo: 'sucesso',
          texto: 'Módulos e personalizações salvos com sucesso!'
        });

        if (onSalvoComSucesso) {
          onSalvoComSucesso(idCondominioAlvo, res.flags);
        }
      } else {
        setMensagem({
          tipo: 'erro',
          texto: res.erro || 'Erro ao persistir módulos.'
        });
      }

      setTimeout(() => {
        setMensagem({ tipo: '', texto: '' });
      }, 3500);
    } catch (e: any) {
      setMensagem({
        tipo: 'erro',
        texto: 'Erro ao salvar: ' + (e?.message || 'Falha inesperada')
      });
    } finally {
      setSalvando(false);
    }
  };

  const objCondo = listaCondominios.find(c => c.id === idCondominioAlvo);
  const condoNome = objCondo?.nome || 'Condomínio Solicitado';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER DO MODAL: EXCLUSIVAMENTE REFERENTE AO CONDOMÍNIO SOLICITADO */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Gerenciar Módulos
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  {condoNome}
                </span>
              </div>
            </div>
          </div>

          {/* AÇÕES RÁPIDAS E FECHAR (SEM SELETOR DE CONDOMÍNIO) */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={ativarTodos}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-[11px] font-medium"
              >
                Ativar Todos
              </button>
              <button
                type="button"
                onClick={desativarOpcionais}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-[11px] font-medium"
              >
                Essenciais
              </button>
              <button
                type="button"
                onClick={restaurarTodosNomes}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-[11px] font-medium flex items-center gap-1"
                title="Restaurar títulos, descrições e ícones padrão"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Padrões</span>
              </button>
            </div>

            <button
              onClick={onFechar}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer ml-1"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK DE MENSAGENS */}
        {mensagem.texto && (
          <div className={`mx-4 sm:mx-6 mt-3 p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
              : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
          }`}>
            {mensagem.tipo === 'sucesso' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{mensagem.texto}</span>
          </div>
        )}

        {/* CORPO: LISTA DIRETA DE MÓDULOS */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
            <span>Módulos configurados para este condomínio:</span>
            <span className="font-mono text-indigo-400 font-bold">
              {DEFINICAO_MODULOS.filter(m => flags[m.flagKey] ?? true).length} de {DEFINICAO_MODULOS.length} ativos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEFINICAO_MODULOS.map((item) => {
              const isAtivo = flags[item.flagKey] ?? true;
              const rotuloAtual = rotulos[item.id] || item.tituloPadrao;
              const descAtual = descricoes[item.id] || item.descricaoPadrao;
              const emEdicao = moduloEmEdicao === item.id;

              // Obtém o ícone atual (se customizado, usa o customizado; senão o padrão)
              const iconeCustomizado = icones[item.id];
              const IconeRender = obterIconeModulo(iconeCustomizado, item.iconePadrao);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col gap-2.5 ${
                    isAtivo
                      ? emEdicao 
                        ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-xs'
                      : 'bg-slate-950/40 border-slate-900/80 opacity-60'
                  }`}
                >
                  {/* LINHA PRINCIPAL: APENAS ÍCONE, NOME DO MÓDULO, LÁPIS (EDITAR) E SWITCH ATIVAR/DESATIVAR */}
                  <div className="flex items-center justify-between gap-3">
                    
                    {/* Ícone e Nome do Módulo */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${item.corBg} flex items-center justify-center`}>
                        <IconeRender className="w-5 h-5" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {rotuloAtual}
                          </h4>
                          {rotuloAtual !== item.tituloPadrao && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                              Editado
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold block ${isAtivo ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isAtivo ? '● Ativo' : '○ Desativado'}
                        </span>
                      </div>
                    </div>

                    {/* Ações: Lápis (Editar) e Botão Ativar/Desativar */}
                    <div className="flex items-center gap-2 shrink-0">
                      
                      {/* Botão do Lápis: Abre a parte de editar (Título, Descrição e Ícone) */}
                      <button
                        type="button"
                        onClick={() => setModuloEmEdicao(emEdicao ? null : item.id)}
                        title={emEdicao ? 'Fechar Edição' : 'Editar Título, Descrição e Ícone'}
                        className={`p-2 rounded-xl transition border cursor-pointer flex items-center justify-center ${
                          emEdicao
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 border-slate-700/60'
                        }`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Botão de Ativar / Desativar (Switch) */}
                      <label 
                        className="relative inline-flex items-center cursor-pointer shrink-0"
                        title={isAtivo ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        <input
                          type="checkbox"
                          checked={isAtivo}
                          onChange={() => handleToggle(item.flagKey, item.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* PARTE DE EDITAR (ABRE AO CLICAR NO LÁPIS): TÍTULO, DESCRIÇÃO E ÍCONE */}
                  {emEdicao && (
                    <div className="mt-1 pt-3 border-t border-slate-800/80 space-y-3 bg-slate-900/90 -mx-1 p-3 rounded-xl border border-indigo-500/20 animate-in fade-in zoom-in-95 duration-150">
                      
                      {/* 1. TÍTULO */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Título do Módulo:</span>
                          </label>
                          {rotuloAtual !== item.tituloPadrao && (
                            <button
                              type="button"
                              onClick={() => handleAlterarRotulo(item.id, item.tituloPadrao)}
                              className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                            >
                              Restaurar ({item.tituloPadrao})
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={rotuloAtual}
                          onChange={(e) => handleAlterarRotulo(item.id, e.target.value)}
                          placeholder={item.tituloPadrao}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      {/* 2. DESCRIÇÃO */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-300 block">
                            Descrição / Subtítulo:
                          </label>
                          {descAtual !== item.descricaoPadrao && (
                            <button
                              type="button"
                              onClick={() => handleAlterarDescricao(item.id, item.descricaoPadrao)}
                              className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                            >
                              Restaurar descrição
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={descAtual}
                          onChange={(e) => handleAlterarDescricao(item.id, e.target.value)}
                          placeholder={item.descricaoPadrao}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>

                      {/* 3. ÍCONE */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                            <span>Ícone do Módulo:</span>
                            {iconeCustomizado && (
                              <span className="text-[10px] text-indigo-400 font-mono">
                                ({iconeCustomizado})
                              </span>
                            )}
                          </label>
                          {iconeCustomizado && (
                            <button
                              type="button"
                              onClick={() => {
                                setIcones(prev => {
                                  const novo = { ...prev };
                                  delete novo[item.id];
                                  return novo;
                                });
                              }}
                              className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                            >
                              Restaurar ícone original
                            </button>
                          )}
                        </div>

                        {/* Grade seletora de ícones */}
                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                          {ICONES_DISPONIVEIS.map((ic) => {
                            const Comp = ic.icone;
                            const isSelecionado = (iconeCustomizado ? iconeCustomizado === ic.nome : item.iconePadrao === Comp);
                            return (
                              <button
                                key={ic.nome}
                                type="button"
                                onClick={() => handleAlterarIcone(item.id, ic.nome)}
                                title={ic.rotulo}
                                className={`p-2 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                  isSelecionado
                                    ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/40'
                                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                                }`}
                              >
                                <Comp className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Botão de Fechar Edição */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setModuloEmEdicao(null)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Concluir</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER DO MODAL */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Configurações salvas exclusivamente para <strong>{condoNome}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onFechar}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={salvarParametrizacao}
              disabled={salvando}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
