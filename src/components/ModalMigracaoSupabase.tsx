import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Upload, 
  FileCode, 
  Copy, 
  Check, 
  Server, 
  ShieldCheck, 
  Layers, 
  Download, 
  AlertTriangle,
  Zap,
  Info
} from 'lucide-react';
import { 
  MIGRATION_TABLES, 
  MigrationTableInfo, 
  testSupabaseConnection, 
  getSupabaseRowCount, 
  executeFullSupabaseMigration, 
  importJsonDump, 
  generateSupabaseDumpSqlScript 
} from '../services/migrationSupabaseService';
import { obterSupabaseUrl } from '../services/supabase';

interface ModalMigracaoSupabaseProps {
  aberto: boolean;
  onFechar: () => void;
  onMigracaoConcluida?: () => void;
}

export default function ModalMigracaoSupabase({
  aberto,
  onFechar,
  onMigracaoConcluida
}: ModalMigracaoSupabaseProps) {
  const [metodo, setMetodo] = useState<'direto' | 'arquivo' | 'script_sql'>('direto');

  // Método 1: Conexão direta
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [statusConexao, setStatusConexao] = useState<{
    testado: boolean;
    sucesso: boolean;
    mensagem: string;
    projectRef?: string;
  }>({ testado: false, sucesso: false, mensagem: '' });

  // Tabelas e Estado de Migração
  const [tabelas, setTabelas] = useState<MigrationTableInfo[]>(() =>
    MIGRATION_TABLES.map(t => ({
      ...t,
      status: 'idle',
      migratedCount: 0
    }))
  );
  const [escaneando, setEscaneando] = useState(false);
  const [migrando, setMigrando] = useState(false);
  const [progressoGeral, setProgressoGeral] = useState({ totalTabelas: 0, concluidas: 0, registrosMigrados: 0 });
  const [resultadoFinal, setResultadoFinal] = useState<{
    sucesso: boolean;
    total: number;
    mensagem: string;
  } | null>(null);

  // Método 2: Arquivo JSON
  const [jsonTexto, setJsonTexto] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');
  const [importandoJson, setImportandoJson] = useState(false);
  const [progressoJson, setProgressoJson] = useState({ tabelaAtual: '', salvos: 0, total: 0 });
  const [resultadoJson, setResultadoJson] = useState<{
    sucesso: boolean;
    total: number;
    detalhes?: Record<string, number>;
    erros?: string[];
  } | null>(null);

  // Método 3: Script SQL
  const [sqlCopiado, setSqlCopiado] = useState(false);
  const scriptSql = generateSupabaseDumpSqlScript();

  if (!aberto) return null;

  // 1. Testa Conexão com o Supabase antigo
  const handleTestarConexao = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setStatusConexao({
        testado: true,
        sucesso: false,
        mensagem: 'Por favor, informe a URL e a API Key do seu Supabase antigo.'
      });
      return;
    }

    setTestandoConexao(true);
    setStatusConexao({ testado: false, sucesso: false, mensagem: '' });

    try {
      const res = await testSupabaseConnection({ url: supabaseUrl, key: supabaseKey });
      setStatusConexao({
        testado: true,
        sucesso: res.success,
        mensagem: res.message,
        projectRef: res.projectRef
      });

      if (res.success) {
        // Escaneia contagem das tabelas automaticamente
        handleEscanearTabelas();
      }
    } finally {
      setTestandoConexao(false);
    }
  };

  // 2. Escaneia contagem de linhas de cada tabela no Supabase
  const handleEscanearTabelas = async () => {
    setEscaneando(true);
    const atualizadas = [...tabelas];

    for (let i = 0; i < atualizadas.length; i++) {
      const tab = atualizadas[i];
      tab.status = 'checking';
      setTabelas([...atualizadas]);

      try {
        const { count, exists, error } = await getSupabaseRowCount(
          { url: supabaseUrl, key: supabaseKey },
          tab.name
        );
        tab.count = count;
        tab.status = exists ? (count > 0 ? 'idle' : 'empty') : 'error';
        if (error) tab.error = error;
      } catch (err: any) {
        tab.status = 'error';
        tab.error = err.message;
      }

      setTabelas([...atualizadas]);
    }

    setEscaneando(false);
  };

  // 3. Executa a Migração Completa
  const handleIniciarMigracao = async () => {
    if (!statusConexao.sucesso) {
      alert('Por favor, teste e valide a conexão com o Supabase antes de iniciar.');
      return;
    }

    setMigrando(true);
    setResultadoFinal(null);
    setProgressoGeral({ totalTabelas: tabelas.length, concluidas: 0, registrosMigrados: 0 });

    try {
      let concluidas = 0;
      let totalSalvos = 0;

      const res = await executeFullSupabaseMigration(
        { url: supabaseUrl, key: supabaseKey },
        tabelas.map(t => t.name),
        (updatedTable) => {
          setTabelas(prev =>
            prev.map(t => (t.name === updatedTable.name ? updatedTable : t))
          );
          if (updatedTable.status === 'completed' || updatedTable.status === 'empty') {
            concluidas++;
            totalSalvos += updatedTable.migratedCount;
            setProgressoGeral({
              totalTabelas: tabelas.length,
              concluidas,
              registrosMigrados: totalSalvos
            });
          }
        }
      );

      setResultadoFinal({
        sucesso: true,
        total: res.totalMigrated,
        mensagem: `✓ Migração finalizada com sucesso! ${res.totalMigrated} registros foram transferidos para o PorttoHub v2.0.`
      });

      if (onMigracaoConcluida) {
        onMigracaoConcluida();
      }
    } catch (err: any) {
      setResultadoFinal({
        sucesso: false,
        total: 0,
        mensagem: `Erro crítico na migração: ${err.message || String(err)}`
      });
    } finally {
      setMigrando(false);
    }
  };

  // 4. Manipula upload de arquivo JSON
  const handleUploadArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const conteudo = event.target?.result as string;
      setJsonTexto(conteudo);
    };
    reader.readAsText(file);
  };

  // 5. Executa a Importação do JSON
  const handleImportarJson = async () => {
    if (!jsonTexto.trim()) {
      alert('Por favor, carregue um arquivo JSON ou cole o conteúdo no campo de texto.');
      return;
    }

    setImportandoJson(true);
    setResultadoJson(null);

    try {
      const res = await importJsonDump(jsonTexto, (tabela, salvos, total) => {
        setProgressoJson({ tabelaAtual: tabela, salvos, total });
      });

      setResultadoJson({
        sucesso: res.success,
        total: res.totalImported,
        detalhes: res.summary,
        erros: res.errors
      });

      if (res.totalImported > 0 && onMigracaoConcluida) {
        onMigracaoConcluida();
      }
    } catch (err: any) {
      setResultadoJson({
        sucesso: false,
        total: 0,
        erros: [err.message || String(err)]
      });
    } finally {
      setImportandoJson(false);
    }
  };

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(scriptSql);
    setSqlCopiado(true);
    setTimeout(() => setSqlCopiado(false), 3000);
  };

  const totalRegistrosSupabase = tabelas.reduce((acc, t) => acc + (t.count || 0), 0);
  const totalRegistrosMigrados = tabelas.reduce((acc, t) => acc + (t.migratedCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 sm:p-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
                <ArrowRightLeft className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-100 border border-blue-400/30">
                    PorttoHub v2.0 Oficial
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Novo Supabase Conectado
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
                  Puxar Dados: Supabase Antigo → Novo Supabase
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-0.5 max-w-2xl">
                  Transfira condomínios, moradores, encomendas, fotos, chaves e históricos do banco antigo diretamente para o seu novo Supabase oficial com zero perda de dados.
                </p>
              </div>
            </div>

            <button
              onClick={onFechar}
              disabled={migrando || importandoJson}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas de Métodos */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={() => setMetodo('direto')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                metodo === 'direto'
                  ? 'bg-white text-blue-900 shadow-md font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              Método 1: Conexão Direta (1-Clique)
            </button>

            <button
              type="button"
              onClick={() => setMetodo('arquivo')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                metodo === 'arquivo'
                  ? 'bg-white text-blue-900 shadow-md font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Upload className="w-4 h-4" />
              Método 2: Importar Arquivo JSON
            </button>

            <button
              type="button"
              onClick={() => setMetodo('script_sql')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                metodo === 'script_sql'
                  ? 'bg-white text-blue-900 shadow-md font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Método 3: Script SQL Supabase
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">

          {/* Banner de Destino Fixo */}
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Banco de Destino (Novo Supabase Ativo)
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-950 truncate block">
                  {obterSupabaseUrl()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pronto para Gravação
              </span>
            </div>
          </div>

          {/* MÉTODO 1: CONEXÃO DIRETA */}
          {metodo === 'direto' && (
            <div className="space-y-5">
              
              {/* Card de Credenciais */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                    <Server className="w-5 h-5 text-blue-600" />
                    Passo 1: Credenciais do Supabase Antigo
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Atalhos rápidos para preencher:
                  </div>
                </div>

                {/* Botões de Preenchimento Rápido com Projetos Conhecidos */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 self-center px-1">Projetos Anteriores:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrl('https://kkeizhscivyfjgetnbke.supabase.co');
                      setStatusConexao({ testado: false, sucesso: false, mensagem: '' });
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-300 font-mono text-[11px] font-semibold transition cursor-pointer"
                  >
                    kkeizhscivyfjgetnbke
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrl('https://juafrepntyksggqiqzyes.supabase.co');
                      setStatusConexao({ testado: false, sucesso: false, mensagem: '' });
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-300 font-mono text-[11px] font-semibold transition cursor-pointer"
                  >
                    juafrepntyksggqiqzyes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrl('http://163.176.49.21:8000');
                      setStatusConexao({ testado: false, sucesso: false, mensagem: '' });
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded-lg border border-slate-300 font-mono text-[11px] font-semibold transition cursor-pointer"
                  >
                    OCI 163.176.49.21
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Project URL (URL do Supabase antigo)
                    </label>
                    <input
                      type="text"
                      placeholder="https://kkeizhscivyfjgetnbke.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      disabled={migrando || testandoConexao}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      API Key do Supabase antigo (anon ou service_role)
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      disabled={migrando || testandoConexao}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestarConexao}
                    disabled={testandoConexao || migrando || !supabaseUrl || !supabaseKey}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {testandoConexao ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Testando Conexão...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Testar Conexão & Escanear Tabelas
                      </>
                    )}
                  </button>

                  {statusConexao.testado && (
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                      statusConexao.sucesso
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {statusConexao.sucesso ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{statusConexao.mensagem}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{statusConexao.mensagem}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card de Visão Geral das Tabelas e Execução */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      Passo 2: Mapeamento das 29 Tabelas do Sistema
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {statusConexao.sucesso
                        ? `Detectados ${totalRegistrosSupabase} registros escaneados prontos para transferência para o Novo Supabase.`
                        : 'Conecte ao Supabase acima para verificar quantos registros existem no seu banco antigo.'}
                    </p>
                  </div>

                  {statusConexao.sucesso && (
                    <button
                      type="button"
                      onClick={handleIniciarMigracao}
                      disabled={migrando || escaneando}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {migrando ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Migrando ({progressoGeral.concluidas}/{progressoGeral.totalTabelas})...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-4 h-4" />
                          Puxar e Migrar Todos os Dados Agora
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Barra de Progresso Durante a Migração */}
                {migrando && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-blue-900">
                      <span>Progresso da Migração:</span>
                      <span>
                        {progressoGeral.concluidas} de {progressoGeral.totalTabelas} tabelas processadas ({totalRegistrosMigrados} registros salvos)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{
                          width: `${(progressoGeral.concluidas / Math.max(progressoGeral.totalTabelas, 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Resultado Final */}
                {resultadoFinal && (
                  <div className={`p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
                    resultadoFinal.sucesso
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {resultadoFinal.sucesso ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{resultadoFinal.mensagem}</span>
                  </div>
                )}

                {/* Grade de Tabelas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/70">
                  {tabelas.map((tab) => (
                    <div
                      key={tab.name}
                      className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-800 truncate">{tab.label}</div>
                        <div className="font-mono text-[10px] text-slate-400 truncate">{tab.name}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tab.status === 'migrating' && (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold text-[11px]">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {tab.migratedCount}/{tab.count || '?'}
                          </span>
                        )}

                        {tab.status === 'completed' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            {tab.migratedCount}
                          </span>
                        )}

                        {tab.status === 'empty' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium">
                            0 linhas
                          </span>
                        )}

                        {tab.status === 'checking' && (
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                        )}

                        {tab.status === 'idle' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {tab.count !== undefined ? `${tab.count} itens` : '—'}
                          </span>
                        )}

                        {tab.status === 'error' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-medium" title={tab.error}>
                            Falha
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MÉTODO 2: IMPORTAR ARQUIVO JSON */}
          {metodo === 'arquivo' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                  <Upload className="w-5 h-5 text-teal-600" />
                  Importação por Arquivo JSON ou Dump do Supabase
                </div>
                <p className="text-xs text-slate-500">
                  Se preferir não usar conexão direta, você pode subir o arquivo <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">.json</code> exportado do Supabase ou colar seu conteúdo no campo abaixo.
                </p>

                {/* Upload de Arquivo */}
                <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
                  <input
                    type="file"
                    id="upload-json"
                    accept=".json"
                    onChange={handleUploadArquivo}
                    className="hidden"
                  />
                  <label
                    htmlFor="upload-json"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {arquivoNome ? arquivoNome : 'Clique para selecionar seu arquivo .json'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Dump JSON do Supabase v1 (moradores, encomendas, chaves, operadores, etc.)
                    </div>
                  </label>
                </div>

                {/* Campo de Texto para colar JSON */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ou cole o conteúdo JSON bruto diretamente:
                  </label>
                  <textarea
                    rows={6}
                    value={jsonTexto}
                    onChange={(e) => setJsonTexto(e.target.value)}
                    placeholder='{ "moradores": [...], "encomendas_itens": [...], "operadores": [...] }'
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                {/* Botão de Importação */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleImportarJson}
                    disabled={importandoJson || !jsonTexto.trim()}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {importandoJson ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importando para o Firestore...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Processar e Importar para o PorttoHub v2.0
                      </>
                    )}
                  </button>
                </div>

                {/* Progresso da importação JSON */}
                {importandoJson && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-medium">
                    Importando coleção: <strong>{progressoJson.tabelaAtual}</strong> ({progressoJson.salvos} de {progressoJson.total} salvos)
                  </div>
                )}

                {/* Resumo pós importação JSON */}
                {resultadoJson && (
                  <div className={`p-4 rounded-xl border text-xs sm:text-sm space-y-2 ${
                    resultadoJson.sucesso
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <div className="font-bold flex items-center gap-2">
                      {resultadoJson.sucesso ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {resultadoJson.sucesso
                          ? `✓ Sucesso! ${resultadoJson.total} registros foram gravados no banco v2.0.`
                          : 'Houve falhas na importação.'}
                      </span>
                    </div>

                    {resultadoJson.detalhes && Object.keys(resultadoJson.detalhes).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2 text-[11px]">
                        {Object.entries(resultadoJson.detalhes).map(([tab, q]) => (
                          <div key={tab} className="bg-white/70 px-2 py-1 rounded border border-emerald-200">
                            <strong>{tab}:</strong> {q} docs
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MÉTODO 3: SCRIPT SQL SUPABASE */}
          {metodo === 'script_sql' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                  <FileCode className="w-5 h-5 text-indigo-600" />
                  Script SQL de Extração em 1-Clique para o Supabase
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Caso deseje extrair tudo pelo próprio Supabase sem usar chaves de API, você pode rodar este comando SQL.
                  Ele gera um pacote JSON consolidado de todas as 28 tabelas instantaneamente:
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Instruções simples:</strong>
                    <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                      <li>Clique em <strong>Copiar Script SQL</strong> abaixo.</li>
                      <li>No Supabase antigo, acesse: <strong>SQL Editor → New Query</strong>.</li>
                      <li>Cole o script e clique no botão <strong>Run</strong>.</li>
                      <li>Copie o resultado do JSON e cole na aba <strong>Método 2</strong> deste assistente.</li>
                    </ol>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-64">
                    {scriptSql}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopiarSql}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    {sqlCopiado ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Script SQL
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Banner de Garantias e Segurança */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Garantia de Integridade dos Dados no PorttoHub v2.0</div>
              <ul className="list-disc ml-4 mt-1 space-y-0.5 text-emerald-800">
                <li>Preservação total de identificadores primários (<code className="font-mono">id</code>), datas de criação e histórico.</li>
                <li>Operação segura via mesclagem (upsert): não apaga dados criados recentemente no v2.0.</li>
                <li>O login mestre do Administrador (<code className="font-mono">admin</code> / <code className="font-mono">2468</code>) é protegido e mantido com acesso total.</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Destino: Cloud Firestore (Projeto Oficial PorttoHub v2.0)</span>
          </div>

          <button
            type="button"
            onClick={onFechar}
            disabled={migrando || importandoJson}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
