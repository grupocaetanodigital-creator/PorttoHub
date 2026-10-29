import React, { useState, useEffect } from 'react';
import {
  Package,
  Key,
  Users,
  Shield,
  Home,
  Wrench,
  AlertTriangle,
  History,
  Settings,
  ClipboardList,
  Layers,
  Inbox,
  CheckCircle,
  XCircle,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  Database,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { isUUID } from '../services/condominioService';
import {
  carregarModulosCondominio,
  salvarModulosCondominio,
  consolidarFeatureFlags
} from '../services/modulosService';

interface GerenciadorModulosCondominioCardProps {
  condominioId: string;
  nomeCondominio?: string;
  onModuloAlterado?: () => void;
}

export interface ModuloInfoItem {
  id: string;
  nome: string;
  descricao: string;
  categoria: 'operacional' | 'seguranca' | 'gestao';
  icone: React.ReactNode;
}

export const LISTA_MODULOS_SISTEMA: ModuloInfoItem[] = [
  {
    id: 'bancada',
    nome: 'Bancada de Portaria & Conferencia',
    descricao: 'Painel rápido para triagem, contagem de volumes e registro ágil na guarita',
    categoria: 'operacional',
    icone: <Layers className="w-5 h-5 text-amber-500" />
  },
  {
    id: 'encomendas',
    nome: 'Encomendas & Lotes',
    descricao: 'Recebimento em lote com leitor, triagem, notificação WhatsApp e baixa com assinatura digital',
    categoria: 'operacional',
    icone: <Package className="w-5 h-5 text-blue-500" />
  },
  {
    id: 'chaves',
    nome: 'Claviculário & Chaves',
    descricao: 'Controle de empréstimo e devolução de chaves de áreas comuns e serviços com alertas de atraso',
    categoria: 'operacional',
    icone: <Key className="w-5 h-5 text-indigo-500" />
  },
  {
    id: 'rondas',
    nome: 'Rondas Eletrônicas',
    descricao: 'Rondas de vigilância com leitura de QR Code/NFC nos pontos de verificação e cronômetro',
    categoria: 'seguranca',
    icone: <Shield className="w-5 h-5 text-slate-500" />
  },
  {
    id: 'passagem_posto',
    nome: 'Passagem de Posto',
    descricao: 'Troca de turno entre porteiros com checklist obrigatório de itens, ocorrências e pendências',
    categoria: 'seguranca',
    icone: <ClipboardList className="w-5 h-5 text-cyan-500" />
  },
  {
    id: 'ocorrencias',
    nome: 'Livro de Ocorrências',
    descricao: 'Registro formal de ocorrências e incidentes na portaria com histórico auditável e fotos',
    categoria: 'gestao',
    icone: <AlertTriangle className="w-5 h-5 text-rose-500" />
  },
  {
    id: 'prestadores',
    nome: 'Autorizados, Visitas & Obras',
    descricao: 'Cadastro de autorizações de entrada com foto, documento e horário permitido pelos moradores',
    categoria: 'seguranca',
    icone: <Users className="w-5 h-5 text-purple-500" />
  },
  {
    id: 'custodia',
    nome: 'Custódia de Itens',
    descricao: 'Guarda temporária de pertences de moradores e visitantes com recibo e auditoria',
    categoria: 'operacional',
    icone: <Inbox className="w-5 h-5 text-emerald-500" />
  },
  {
    id: 'materiais',
    nome: 'Materiais & Carga do Posto',
    descricao: 'Inventário de equipamentos do posto de serviço (rádios HT, lanternas, celulares, coletes)',
    categoria: 'seguranca',
    icone: <Layers className="w-5 h-5 text-teal-500" />
  },
  {
    id: 'manutencao',
    nome: 'Manutenção Predial & OS',
    descricao: 'Abertura e acompanhamento de Ordens de Serviço (lâmpadas, portões, elevadores)',
    categoria: 'gestao',
    icone: <Wrench className="w-5 h-5 text-orange-500" />
  },
  {
    id: 'cadastros',
    nome: 'Cadastros Base',
    descricao: 'Moradores, casas, apartamentos, operadores e veículos autorizados',
    categoria: 'gestao',
    icone: <Database className="w-5 h-5 text-slate-500" />
  },
  {
    id: 'historico_absoluto',
    nome: 'Histórico Absoluto & Auditoria',
    descricao: 'Log completo e imutável de todas as ações executadas no condomínio com exportação CSV',
    categoria: 'gestao',
    icone: <History className="w-5 h-5 text-indigo-600" />
  },
  {
    id: 'painel_sindico',
    nome: 'Portal do Síndico',
    descricao: 'Painel executivo com métricas de conformidade e auditoria exclusiva',
    categoria: 'gestao',
    icone: <ShieldCheck className="w-5 h-5 text-emerald-600" />
  },
  {
    id: 'guia_operacional',
    nome: 'Manual Oficial & Guia Operacional',
    descricao: 'Instruções e manual de operação para a equipe de portaria',
    categoria: 'operacional',
    icone: <BookOpen className="w-5 h-5 text-indigo-400" />
  }
];

export const GerenciadorModulosCondominioCard: React.FC<GerenciadorModulosCondominioCardProps> = ({
  condominioId,
  nomeCondominio,
  onModuloAlterado
}) => {
  const [modulosAtivos, setModulosAtivos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Carrega configuração de módulos do condomínio
  useEffect(() => {
    async function carregarModulos() {
      setCarregando(true);
      try {
        const flags = await carregarModulosCondominio(condominioId);
        const consolidado: Record<string, boolean> = {};
        LISTA_MODULOS_SISTEMA.forEach((m) => {
          if (flags[m.id] !== undefined) {
            consolidado[m.id] = Boolean(flags[m.id]);
          } else if (m.id === 'passagem_posto' && flags['passagem'] !== undefined) {
            consolidado[m.id] = Boolean(flags['passagem']);
          } else if (m.id === 'prestadores' && flags['autorizados'] !== undefined) {
            consolidado[m.id] = Boolean(flags['autorizados']);
          } else {
            consolidado[m.id] = true;
          }
        });

        setModulosAtivos(consolidado);
      } catch (err) {
        console.error('Erro ao carregar módulos do condomínio:', err);
      } finally {
        setCarregando(false);
      }
    }

    if (condominioId) {
      carregarModulos();
    }
  }, [condominioId]);

  // Alterna status de um módulo específico
  const alternarModulo = async (moduloId: string) => {
    const novoStatus = !modulosAtivos[moduloId];
    const novoEstado = { ...modulosAtivos, [moduloId]: novoStatus };
    setModulosAtivos(novoEstado);

    // Salva automaticamente
    await salvarModulos(novoEstado, `Módulo "${moduloId}" ${novoStatus ? 'ativado' : 'desativado'}`);
  };

  // Salva no banco e localmente
  const salvarModulos = async (estadoParaSalvar: Record<string, boolean>, feedbackTexto?: string) => {
    setSalvando(true);
    try {
      const res = await salvarModulosCondominio(condominioId, estadoParaSalvar);

      if (res.sucesso) {
        setMensagem({
          tipo: 'sucesso',
          texto: feedbackTexto || 'Configurações de módulos do condomínio salvas com sucesso!'
        });

        if (onModuloAlterado) {
          onModuloAlterado();
        }
      } else {
        setMensagem({ tipo: 'erro', texto: res.erro || 'Erro ao persistir módulos.' });
      }

      setTimeout(() => setMensagem(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar módulos do condomínio:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao persistir módulos. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  const ativarTodos = () => {
    const todos: Record<string, boolean> = {};
    LISTA_MODULOS_SISTEMA.forEach((m) => {
      todos[m.id] = true;
    });
    setModulosAtivos(todos);
    salvarModulos(todos, 'Todos os módulos foram ativados para este condomínio');
  };

  const desativarTodos = () => {
    const nenhum: Record<string, boolean> = {};
    LISTA_MODULOS_SISTEMA.forEach((m) => {
      nenhum[m.id] = false;
    });
    setModulosAtivos(nenhum);
    salvarModulos(nenhum, 'Todos os módulos opcionais foram desativados');
  };

  const totalAtivos = Object.values(modulosAtivos).filter(Boolean).length;
  const totalModulos = LISTA_MODULOS_SISTEMA.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
      {/* Cabeçalho do Card de Módulos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Módulos do Condomínio (Ativar / Desativar)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {totalAtivos} de {totalModulos} Ativos
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {nomeCondominio ? `Condomínio: ${nomeCondominio}` : 'Controle granular das ferramentas liberadas na operação deste condomínio'}
            </p>
          </div>
        </div>

        {/* Ações em Lote */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={ativarTodos}
            disabled={salvando}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
          >
            Ativar Todos
          </button>
          <button
            type="button"
            onClick={desativarTodos}
            disabled={salvando}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
          >
            Desativar Todos
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {mensagem && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Grid de Módulos com Toggles Modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {LISTA_MODULOS_SISTEMA.map((modulo) => {
          const ativo = modulosAtivos[modulo.id] !== false;

          return (
            <div
              key={modulo.id}
              onClick={() => alternarModulo(modulo.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                ativo
                  ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-400 shadow-2xs'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  ativo ? 'bg-slate-100 dark:bg-slate-700/80' : 'bg-slate-200/60 dark:bg-slate-800/60'
                }`}>
                  {modulo.icone}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {modulo.nome}
                    </h4>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                        ativo
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {modulo.descricao}
                  </p>
                </div>
              </div>

              {/* Interruptor Toggle */}
              <div className="shrink-0">
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                    ativo ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      ativo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota de rodapé informativa */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>💡 As alterações entram em vigor imediatamente para todos os operadores deste condomínio.</span>
        {salvando && <span className="text-emerald-600 font-bold animate-pulse">Sincronizando...</span>}
      </div>
    </div>
  );
};

export default GerenciadorModulosCondominioCard;
