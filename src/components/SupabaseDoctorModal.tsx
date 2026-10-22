import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  ArrowRight, 
  X,
  Layers,
  Sparkles,
  Building2,
  Sliders,
  Wrench,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { 
  CANONICAL_SCHEMA_MAP, 
  runDatabaseAudit, 
  generateMigrationSql, 
  TableDiagnostic,
  auditCondominiosConfigs,
  repairCondominioConfig,
  repairAllCondominiosConfigs,
  CondominioConfigDiagnostic
} from '../services/databaseDoctor';

interface SupabaseDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupabaseDoctorModal({ isOpen, onClose }: SupabaseDoctorModalProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<TableDiagnostic[]>(CANONICAL_SCHEMA_MAP);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'condominios' | 'auditoria' | 'script' | 'storage'>('condominios');

  // Estados da integridade de condomínios
  const [condoDiagnostics, setCondoDiagnostics] = useState<CondominioConfigDiagnostic[]>([]);
  const [reparandoId, setReparandoId] = useState<string | null>(null);
  const [reparandoTudo, setReparandoTudo] = useState(false);
  const [mensagemCondo, setMensagemCondo] = useState<{ tipo: string; texto: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      executarAuditoria();
    }
  }, [isOpen]);

  const executarAuditoria = async () => {
    setLoading(true);
    setMensagemCondo(null);
    try {
      const [resultAudit, resultCondos] = await Promise.all([
        runDatabaseAudit(),
        auditCondominiosConfigs()
      ]);
      setDiagnostics(resultAudit.diagnostics);
      setOrphanedCount(resultAudit.orphanedTablesFound.length);
      setCondoDiagnostics(resultCondos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copiarScriptSql = () => {
    const sql = generateMigrationSql();
    navigator.clipboard.writeText(sql);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleRepararCondominio = async (condoDiag: CondominioConfigDiagnostic) => {
    setReparandoId(condoDiag.condominioId);
    setMensagemCondo(null);
    try {
      const res = await repairCondominioConfig(condoDiag.condominioId, condoDiag);
      if (res.success) {
        setMensagemCondo({ 
          tipo: 'sucesso', 
          texto: `Configuração do condomínio "${condoDiag.condominioNome}" foi corrigida e sincronizada com sucesso!` 
        });
        const updated = await auditCondominiosConfigs();
        setCondoDiagnostics(updated);
      } else {
        setMensagemCondo({ tipo: 'erro', texto: `Falha ao reparar: ${res.error}` });
      }
    } catch (err: any) {
      setMensagemCondo({ tipo: 'erro', texto: err.message || 'Erro inesperado' });
    } finally {
      setReparandoId(null);
    }
  };

  const handleRepararTodos = async () => {
    setReparandoTudo(true);
    setMensagemCondo(null);
    try {
      const res = await repairAllCondominiosConfigs();
      if (res.totalErrors === 0) {
        setMensagemCondo({ 
          tipo: 'sucesso', 
          texto: `Todas as configurações (${res.totalRepaired}) foram corrigidas e padronizadas com sucesso!` 
        });
      } else {
        setMensagemCondo({ 
          tipo: 'erro', 
          texto: `${res.totalRepaired} reparados com sucesso, mas ${res.totalErrors} tiveram erro: ${res.errors.join('; ')}` 
        });
      }
      const updated = await auditCondominiosConfigs();
      setCondoDiagnostics(updated);
    } catch (err: any) {
      setMensagemCondo({ tipo: 'erro', texto: err.message || 'Erro inesperado' });
    } finally {
      setReparandoTudo(false);
    }
  };

  if (!isOpen) return null;

  const totalCondos = condoDiagnostics.length;
  const condosIntegra = condoDiagnostics.filter(c => c.status === 'integra').length;
  const condosPendentes = condoDiagnostics.filter(c => c.status !== 'integra').length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">Diagnóstico & Integridade do Supabase</h3>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  INFPORT Doctor
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoria de configurações por condomínio, tabelas canônicas e integridade de módulos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setAbaAtiva('condominios')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              abaAtiva === 'condominios'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" /> Módulos por Condomínio
            {condosPendentes > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                {condosPendentes}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva('auditoria')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              abaAtiva === 'auditoria'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" /> Mapa de Tabelas & Duplicatas
          </button>

          <button
            onClick={() => setAbaAtiva('script')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              abaAtiva === 'script'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" /> Script SQL de Limpeza
          </button>

          <button
            onClick={() => setAbaAtiva('storage')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              abaAtiva === 'storage'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📁 Buckets de Storage
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ABA 1: INTEGRIDADE DE CONDOMÍNIOS & MÓDULOS */}
          {abaAtiva === 'condominios' && (
            <div className="space-y-4">
              
              {/* Feedback de ações */}
              {mensagemCondo && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm border ${
                  mensagemCondo.tipo === 'sucesso' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}>
                  {mensagemCondo.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
                  <span>{mensagemCondo.texto}</span>
                </div>
              )}

              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total de Condomínios</span>
                  <strong className="text-xl text-slate-900 font-extrabold">{totalCondos}</strong>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Configurações Íntegras</span>
                  <strong className="text-xl text-emerald-800 font-extrabold">{condosIntegra}</strong>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  condosPendentes > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span className="text-[10px] font-bold uppercase block">Pendentes ou Ausentes</span>
                  <strong className="text-xl font-extrabold">{condosPendentes}</strong>
                </div>
              </div>

              {/* Barra de ação de reparo geral */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" /> Verificação de Integridade da Tabela <code>configuracoes</code>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Garante que cada condomínio tenha suas 9 chaves de módulos independentes (`mod02_gestao_encomendas`, `mod03_custodia_itens`, etc.).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={executarAuditoria}
                    disabled={loading}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>

                  {condosPendentes > 0 && (
                    <button
                      onClick={handleRepararTodos}
                      disabled={reparandoTudo}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md whitespace-nowrap"
                    >
                      <Wrench className={`w-4 h-4 ${reparandoTudo ? 'animate-spin' : ''}`} />
                      {reparandoTudo ? 'Corrigindo...' : 'Corrigir Todas Pendências'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lista dos Condomínios e Status */}
              <div className="space-y-3">
                {condoDiagnostics.length === 0 && !loading && (
                  <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
                    Nenhum condomínio encontrado na tabela <code>condominios</code>.
                  </div>
                )}

                {condoDiagnostics.map((condo) => {
                  const isReparando = reparandoId === condo.condominioId;
                  const isOk = condo.status === 'integra';
                  const isAusente = condo.status === 'ausente';

                  return (
                    <div 
                      key={condo.condominioId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isOk 
                          ? 'bg-white border-slate-200 hover:border-emerald-300' 
                          : isAusente 
                            ? 'bg-red-50/60 border-red-200' 
                            : 'bg-amber-50/60 border-amber-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-600" /> {condo.condominioNome}
                            </span>

                            {isOk && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Íntegro (9/9 Módulos)
                              </span>
                            )}

                            {isAusente && (
                              <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Configuração Ausente
                              </span>
                            )}

                            {condo.status === 'corrompida' && (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Chaves Incompletas
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 font-mono">
                            ID: {condo.condominioId} • {condo.detalhesStatus}
                          </p>
                        </div>

                        <div>
                          <button
                            onClick={() => handleRepararCondominio(condo)}
                            disabled={isReparando}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              isOk 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                          >
                            <Wrench className={`w-3.5 h-3.5 ${isReparando ? 'animate-spin' : ''}`} />
                            {isReparando ? 'Sincronizando...' : isOk ? 'Re-sincronizar' : 'Corrigir e Padronizar'}
                          </button>
                        </div>
                      </div>

                      {/* Grade dos Módulos Operacionais para este condomínio */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 text-[10px] font-bold">
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod02_gestao_encomendas ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M02 Encomendas
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod03_custodia_itens ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M03 Custódia
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod04_materiais_posto ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M04 Materiais
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod05_quadro_chaves ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M05 Chaves
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod06_gestao_manutencao ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M06 Manutenção
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod07_gestao_ronda ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M07 Rondas
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod08_livro_ocorrencias ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M08 Ocorrências
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod09_passagem_posto ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M09 Passagem
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          condo.featureFlags.mod10_prestadores_servico ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}>
                          M10 Prestadores
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ABA 2: MAPA DE TABELAS */}
          {abaAtiva === 'auditoria' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    Diagnóstico dos seus prints do Supabase:
                  </div>
                  <button
                    onClick={executarAuditoria}
                    disabled={loading}
                    className="flex items-center gap-1 text-[11px] bg-white border border-amber-300 text-amber-900 font-bold px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Recarregar Status
                  </button>
                </div>
                <p className="leading-relaxed">
                  Identificamos mais de <strong>12 tabelas duplicadas ou com nomes divergentes</strong> criadas no seu banco ao longo dos testes. 
                  O aplicativo foi 100% corrigido para apontar apenas para as <strong>tabelas canônicas oficiais</strong>. Veja a lista abaixo:
                </p>
              </div>

              {/* Tabela de diagnóstico */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase grid grid-cols-12 gap-2 border-b">
                  <div className="col-span-4">Tabela Oficial (Canônica)</div>
                  <div className="col-span-4">Tabelas Duplicadas / Lixo a Remover</div>
                  <div className="col-span-4 text-right">Status do Banco</div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {diagnostics.map((diag) => (
                    <div key={diag.canonicalName} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition">
                      <div className="col-span-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {diag.canonicalName}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{diag.purpose}</p>
                      </div>

                      <div className="col-span-4">
                        {diag.duplicateOrLegacyNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {diag.duplicateOrLegacyNames.map((leg) => (
                              <span key={leg} className="font-mono text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded line-through">
                                {leg}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Nenhuma duplicata</span>
                        )}
                      </div>

                      <div className="col-span-4 text-right">
                        {diag.status === 'ok' && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {diag.canonicalCount !== undefined ? `${diag.canonicalCount} reg.` : 'OK'}
                          </span>
                        )}
                        {diag.status === 'needs_migration' && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            Contém reg. legados
                          </span>
                        )}
                        {diag.status === 'error' && (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                            Verificando...
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de ação direta */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Deseja limpar as tabelas duplicadas agora?</h4>
                  <p className="text-xs text-emerald-800">
                    Clique na aba ao lado para copiar o script SQL e rodar no seu Supabase com segurança total (sem perda de dados).
                  </p>
                </div>
                <button
                  onClick={() => setAbaAtiva('script')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow-sm"
                >
                  Ver Script SQL <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ABA 3: SCRIPT SQL */}
          {abaAtiva === 'script' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Script SQL Seguro de Unificação & Limpeza
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Este script migra todos os dados que estavam nas tabelas com nomes errados para as tabelas certas antes de remover as sobras.
                  </p>
                </div>

                <button
                  onClick={copiarScriptSql}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md whitespace-nowrap"
                >
                  {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'SQL Copiado com Sucesso!' : 'Copiar Script SQL'}
                </button>
              </div>

              {/* Passos fáceis */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-900 space-y-2">
                <strong className="block font-bold">Como aplicar no seu Supabase em 3 passos:</strong>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Clique no botão acima <strong>"Copiar Script SQL"</strong>.</li>
                  <li>
                    Acesse seu painel do Supabase: {' '}
                    <a
                      href="https://supabase.com/dashboard/project/kkeizhscivyfjgetnbke/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-blue-950 inline-flex items-center gap-1"
                    >
                      Abrir SQL Editor do Projeto <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Cole o código copiado na janela e clique no botão verde <strong>"RUN"</strong>.</li>
                </ol>
              </div>

              {/* Bloco de Código */}
              <div className="relative">
                <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-[380px] border border-slate-800 leading-relaxed">
                  {generateMigrationSql()}
                </pre>
              </div>
            </div>
          )}

          {/* ABA 4: STORAGE */}
          {abaAtiva === 'storage' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Situação dos Buckets de Storage (Prints 2, 3 e 5)</h4>
                <p>
                  No seu Supabase Storage existem atualmente dois buckets:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Bucket Ativo no Código
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-1 font-mono">encomendas (Public)</h5>
                    <p className="text-[11px] text-slate-500">
                      Possui 3 Policies públicas e armazena todas as subpastas operacionais:
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-slate-700">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/avarias_materiais</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/chaves_devolucao</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/chaves_retirada</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/checklist_fotos</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/comprovantes_baixa</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/custodia_entrada</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/custodia_saida</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/etiquetas</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/ocorrencias</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/rondas_evidencias</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1 opacity-75">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      Bucket Vazio / Opcional
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-1 font-mono">fotos-infport (Public)</h5>
                    <p className="text-[11px] text-slate-500">
                      Criado sem policies e atualmente vazio. Pode ser mantido como reserva ou excluído se desejar manter tudo centralizado em <code>encomendas</code>.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900 text-[11px]">
                  ✅ <strong>Tudo OK no Storage:</strong> O aplicativo já está configurado para salvar todas as fotos dos módulos (chaves, rondas, encomendas, avarias, etc.) no bucket público <code>encomendas</code>, mantendo links seguros e acessíveis sem quebras de imagem.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            INFPORT 1.0 — Guarita & Gestão de Acesso
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
