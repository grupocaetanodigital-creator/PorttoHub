import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
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
  Inbox
} from 'lucide-react';
import {
  PermissoesModulo,
  MODULOS_DEFINICAO_RBAC,
  obterPermissoesPadraoNivel,
  contarModulosHabilitados
} from '../services/permissoesService';

interface CardPermissoesOperadorProps {
  permissoes: PermissoesModulo;
  onChange: (novasPermissoes: PermissoesModulo) => void;
  nomeOperador?: string;
  loginOperador?: string;
  somenteLeitura?: boolean;
}

const ICONES_MODULOS: Record<string, React.ReactNode> = {
  encomendas: <Package className="w-4 h-4 text-emerald-500" />,
  custodia: <Inbox className="w-4 h-4 text-teal-500" />,
  chaves: <Key className="w-4 h-4 text-amber-500" />,
  rondas: <Shield className="w-4 h-4 text-blue-500" />,
  autorizados: <Users className="w-4 h-4 text-indigo-500" />,
  materiais: <Layers className="w-4 h-4 text-slate-500" />,
  manutencao: <Wrench className="w-4 h-4 text-orange-500" />,
  ocorrencias: <AlertTriangle className="w-4 h-4 text-rose-500" />,
  passagem_posto: <ClipboardList className="w-4 h-4 text-cyan-500" />,
  cadastros: <Users className="w-4 h-4 text-purple-500" />,
  moradores: <Home className="w-4 h-4 text-violet-500" />,
  historico_absoluto: <History className="w-4 h-4 text-emerald-600" />,
  configuracoes: <Settings className="w-4 h-4 text-slate-600" />,
  bancada: <Layers className="w-4 h-4 text-pink-500" />
};

export const CardPermissoesOperador: React.FC<CardPermissoesOperadorProps> = ({
  permissoes,
  onChange,
  nomeOperador,
  loginOperador,
  somenteLeitura = false
}) => {
  const [moduloAberto, setModuloAberto] = useState<string | null>(null);
  const [buscaModulo, setBuscaModulo] = useState<string>('');

  const modulosHabilitados = contarModulosHabilitados(permissoes);
  const totalModulos = MODULOS_DEFINICAO_RBAC.length;

  const aplicarPreset = (nivelId: string) => {
    if (somenteLeitura) return;
    const padrao = obterPermissoesPadraoNivel(nivelId);
    onChange(padrao);
  };

  const alternarVisualizacaoModulo = (moduloId: keyof PermissoesModulo) => {
    if (somenteLeitura) return;
    const atual = (permissoes as any)[moduloId] || {};
    const novoStatus = !(atual.visualizar ?? true);
    
    const clone: any = { ...permissoes };
    clone[moduloId] = {
      ...atual,
      visualizar: novoStatus
    };
    onChange(clone);
  };

  const alternarAcaoEspecifica = (moduloId: keyof PermissoesModulo, acaoId: string) => {
    if (somenteLeitura) return;
    const atual = (permissoes as any)[moduloId] || {};
    const novoValor = !Boolean(atual[acaoId]);

    const clone: any = { ...permissoes };
    clone[moduloId] = {
      ...atual,
      [acaoId]: novoValor,
      // Se ativou uma ação, garante que visualizar está ativo
      visualizar: novoValor ? true : atual.visualizar
    };
    onChange(clone);
  };

  const permitirTudo = () => {
    if (somenteLeitura) return;
    aplicarPreset('nivel_0');
  };

  const bloquearTudo = () => {
    if (somenteLeitura) return;
    const bloqueado: any = {};
    MODULOS_DEFINICAO_RBAC.forEach(m => {
      bloqueado[m.id] = { visualizar: false, criar: false, editar: false, excluir: false };
    });
    onChange(bloqueado);
  };

  const modulosFiltrados = MODULOS_DEFINICAO_RBAC.filter(m => {
    if (!buscaModulo.trim()) return true;
    const termo = buscaModulo.toLowerCase();
    return m.nome.toLowerCase().includes(termo) || (m.descricao || '').toLowerCase().includes(termo);
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-4">
      {/* Topo do Card de Permissões */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Permissões Granulares do Operador</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                {modulosHabilitados} de {totalModulos} Módulos Ativos
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {nomeOperador ? `Operador: ${nomeOperador}` : 'Configure as funções autorizadas para este operador'}
              {loginOperador ? ` (@${loginOperador})` : ''}
            </p>
          </div>
        </div>

        {/* Presets Rápidos por Nível */}
        {!somenteLeitura && (
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Presets:</span>
            <button
              type="button"
              onClick={() => aplicarPreset('nivel_3')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
              title="Porteiro / Operador Operacional Padrão"
            >
              Porteiro Padrão
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset('nivel_2')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
              title="Supervisor de Segurança"
            >
              Supervisor
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset('nivel_4')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition cursor-pointer"
              title="Perfil de Síndico / Gestor"
            >
              Síndico
            </button>
            <button
              type="button"
              onClick={permitirTudo}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
            >
              Liberar Tudo
            </button>
            <button
              type="button"
              onClick={bloquearTudo}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 transition cursor-pointer"
            >
              Bloquear Tudo
            </button>
          </div>
        )}
      </div>

      {/* Barra de Busca de Módulo */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={buscaModulo}
          onChange={(e) => setBuscaModulo(e.target.value)}
          placeholder="Filtrar módulo (ex: Encomendas, Rondas, Moradores...)"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Lista Acordeão de Módulos */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {modulosFiltrados.map((mod) => {
          const modState: any = (permissoes as any)[mod.id] || {};
          const isAtivo = modState.visualizar !== false;
          const estaAberto = moduloAberto === mod.id;

          const acoesContadas = mod.acoesEspecificas.filter(a => Boolean(modState[a.id])).length;

          return (
            <div
              key={mod.id}
              className={`border rounded-xl transition-all ${
                isAtivo
                  ? 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/60 opacity-70'
              }`}
            >
              {/* Linha Resumo do Módulo */}
              <div className="p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    {ICONES_MODULOS[mod.id] || <Sliders className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      {mod.nome}
                      {isAtivo ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ({acoesContadas} de {mod.acoesEspecificas.length} ações)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-500">
                          (Bloqueado)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Interruptor Liga/Desliga Acesso ao Módulo */}
                  <button
                    type="button"
                    disabled={somenteLeitura}
                    onClick={() => alternarVisualizacaoModulo(mod.id)}
                    className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition flex items-center gap-1 cursor-pointer ${
                      isAtivo
                        ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                    }`}
                    title={isAtivo ? 'Módulo Visível para o Operador' : 'Módulo Oculto e Bloqueado'}
                  >
                    {isAtivo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{isAtivo ? 'Habilitado' : 'Desativado'}</span>
                  </button>

                  {/* Expandir Detalhes de Ações Específicas */}
                  <button
                    type="button"
                    onClick={() => setModuloAberto(estaAberto ? null : mod.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
                    title={estaAberto ? 'Recolher detalhes' : 'Expandir ações granulares'}
                  >
                    {estaAberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Detalhes de Ações Específicas Expandidas */}
              {estaAberto && isAtivo && (
                <div className="p-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Ações Permitidas Dentro do Módulo:</span>
                    <button
                      type="button"
                      disabled={somenteLeitura}
                      onClick={() => {
                        const todas = mod.acoesEspecificas.reduce((acc, a) => ({ ...acc, [a.id]: true }), {});
                        const clone: any = { ...permissoes };
                        clone[mod.id] = { ...modState, ...todas, visualizar: true };
                        onChange(clone);
                      }}
                      className="text-emerald-600 hover:underline cursor-pointer lowercase"
                    >
                      Marcar todas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {mod.acoesEspecificas.map((acao) => {
                      const acaoHabilitada = Boolean(modState[acao.id]);
                      return (
                        <label
                          key={acao.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition select-none ${
                            acaoHabilitada
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-bold'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={somenteLeitura}
                            checked={acaoHabilitada}
                            onChange={() => alternarAcaoEspecifica(mod.id, acao.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="truncate">{acao.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CardPermissoesOperador;
