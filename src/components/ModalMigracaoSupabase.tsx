import React, { useState, useEffect } from 'react';
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
  Info,
  Edit2,
  Plus,
  RotateCcw,
  Save,
  Key,
  Globe,
  Sparkles,
  Trash2
} from 'lucide-react';
import { 
  MIGRATION_TABLES, 
  MigrationTableInfo, 
  testSupabaseConnection, 
  getSupabaseRowCount, 
  executeFullSupabaseMigration, 
  importJsonDump, 
  generateSupabaseDumpSqlScript,
  exportSourceDatabaseToJson,
  limparBancoDestinoCompleto,
  BancoPredefinido,
  BANCOS_PADRAO,
  carregarBancosPredefinidos,
  salvarBancosPredefinidos,
  cleanApiKey,
  normalizeSupabaseUrl
} from '../services/migrationSupabaseService';
import { purgarCachesLocaisInfport } from '../services/cacheLimpezaService';
import { obterSupabaseUrl, supabase } from '../services/supabase';

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

  // Gerenciador de Botões / Bancos Predefinidos Editáveis
  const [bancos, setBancos] = useState<BancoPredefinido[]>(() => carregarBancosPredefinidos());
  const [bancoSelecionadoId, setBancoSelecionadoId] = useState<string>('caetano_infport');
  const [modoEdicaoNome, setModoEdicaoNome] = useState<boolean>(false);
  const [nomeEditando, setNomeEditando] = useState<string>('B.D caetano_infport');
  const [feedbackBotao, setFeedbackBotao] = useState<{ tipo: 'sucesso' | 'info'; texto: string } | null>(null);

  // Método 1: Conexão direta com valores iniciais carregados do banco selecionado
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => {
    const defaultBanco = BANCOS_PADRAO.find(b => b.id === 'caetano_infport') || BANCOS_PADRAO[0];
    return defaultBanco.url;
  });
  const [supabaseKey, setSupabaseKey] = useState<string>(() => {
    const defaultBanco = BANCOS_PADRAO.find(b => b.id === 'caetano_infport') || BANCOS_PADRAO[0];
    return defaultBanco.key;
  });
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [statusConexao, setStatusConexao] = useState<{
    testado: boolean;
    sucesso: boolean;
    mensagem: string;
    projectRef?: string;
  }>({ testado: false, sucesso: false, mensagem: '' });

  // Backup dos Dados de Origem
  const [baixandoBackup, setBaixandoBackup] = useState(false);
  const [salvarBackupAntes, setSalvarBackupAntes] = useState(true);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // Limpeza Prévia Completa do Banco Novo e Isolamento de Condomínios
  const [limparBancoAntes, setLimparBancoAntes] = useState(true);
  const [limpezaStatus, setLimpezaStatus] = useState<string | null>(null);
  const [limpandoManual, setLimpandoManual] = useState(false);
  const [modalConfirmacaoLimpeza, setModalConfirmacaoLimpeza] = useState(false);
  const [textoConfirmacaoLimpeza, setTextoConfirmacaoLimpeza] = useState('');
  const [erroConfirmacaoLimpeza, setErroConfirmacaoLimpeza] = useState<string | null>(null);
  const [escopoCondominioMigracao, setEscopoCondominioMigracao] = useState<string>('todos');
  const [listaCondominios, setListaCondominios] = useState<Array<{ id: string; nome: string }>>([]);

  // Carrega condomínios cadastrados no banco de destino
  useEffect(() => {
    if (aberto) {
      supabase.from('condominios').select('id, nome').order('nome').then(({ data }) => {
        if (data && Array.isArray(data)) {
          setListaCondominios(data);
        }
      });
    }
  }, [aberto]);

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

  // Ações de gerenciamento dos Botões Predefinidos
  const handleSelecionarBanco = (banco: BancoPredefinido) => {
    setBancoSelecionadoId(banco.id);
    setNomeEditando(banco.nome);
    setSupabaseUrl(banco.url);
    setSupabaseKey(banco.key);
    setStatusConexao({ testado: false, sucesso: false, mensagem: '' });
    setFeedbackBotao({
      tipo: 'info',
      texto: `Botão "${banco.nome}" selecionado! Os campos de URL e Chave foram preenchidos e continuam 100% editáveis.`
    });
    setTimeout(() => setFeedbackBotao(null), 3500);
  };

  const handleSalvarModificacaoBotao = () => {
    if (!bancoSelecionadoId) return;

    const novosBancos = bancos.map(b => {
      if (b.id === bancoSelecionadoId) {
        return {
          ...b,
          nome: (nomeEditando || b.nome).trim(),
          url: supabaseUrl.trim(),
          key: cleanApiKey(supabaseKey)
        };
      }
      return b;
    });

    setBancos(novosBancos);
    salvarBancosPredefinidos(novosBancos);
    setModoEdicaoNome(false);
    setFeedbackBotao({
      tipo: 'sucesso',
      texto: `✓ Alterações gravadas no botão "${nomeEditando}"! Suas correções foram salvas e lembradas neste dispositivo.`
    });
    setTimeout(() => setFeedbackBotao(null), 4000);
  };

  const handleCriarNovoBotao = () => {
    const idNovo = `banco_${Date.now()}`;
    const nomeNovo = `Banco Customizado ${bancos.length + 1}`;
    const novoBanco: BancoPredefinido = {
      id: idNovo,
      nome: nomeNovo,
      url: supabaseUrl.trim() || 'https://',
      key: cleanApiKey(supabaseKey),
      descricao: 'Banco customizado configurado pelo usuário'
    };

    const novos = [...bancos, novoBanco];
    setBancos(novos);
    salvarBancosPredefinidos(novos);
    setBancoSelecionadoId(idNovo);
    setNomeEditando(nomeNovo);
    setModoEdicaoNome(true);
    setFeedbackBotao({
      tipo: 'sucesso',
      texto: `Novo botão "${nomeNovo}" adicionado com sucesso!`
    });
    setTimeout(() => setFeedbackBotao(null), 3500);
  };

  const handleRestaurarPadroes = () => {
    setBancos(BANCOS_PADRAO);
    salvarBancosPredefinidos(BANCOS_PADRAO);
    const primeiro = BANCOS_PADRAO[0];
    handleSelecionarBanco(primeiro);
    setFeedbackBotao({
      tipo: 'info',
      texto: '✓ Botões restaurados para os bancos oficiais padrão (B.D caetano_infport e banco de dados PorttoHub).'
    });
    setTimeout(() => setFeedbackBotao(null), 3500);
  };

  // 1. Testa Conexão com o Supabase de Origem
  const handleTestarConexao = async () => {
    const urlLimpa = normalizeSupabaseUrl(supabaseUrl);
    const keyLimpa = cleanApiKey(supabaseKey);

    if (!urlLimpa || !keyLimpa) {
      setStatusConexao({
        testado: true,
        sucesso: false,
        mensagem: 'Por favor, informe a URL e a API Key do banco de origem.'
      });
      return;
    }

    setTestandoConexao(true);
    setStatusConexao({ testado: false, sucesso: false, mensagem: '' });

    try {
      const res = await testSupabaseConnection({ url: urlLimpa, key: keyLimpa });
      setStatusConexao({
        testado: true,
        sucesso: res.success,
        mensagem: res.message,
        projectRef: res.projectRef
      });

      if (res.success) {
        // Escaneia contagem das tabelas automaticamente
        handleEscanearTabelas(urlLimpa, keyLimpa);
      }
    } finally {
      setTestandoConexao(false);
    }
  };

  // 2. Escaneia contagem de linhas de cada tabela no Supabase
  const handleEscanearTabelas = async (urlOverride?: string, keyOverride?: string) => {
    const creds = {
      url: urlOverride || normalizeSupabaseUrl(supabaseUrl),
      key: keyOverride || cleanApiKey(supabaseKey)
    };

    setEscaneando(true);
    const atualizadas = [...tabelas];

    for (let i = 0; i < atualizadas.length; i++) {
      const tab = atualizadas[i];
      tab.status = 'checking';
      setTabelas([...atualizadas]);

      try {
        const { count, exists, error } = await getSupabaseRowCount(creds, tab.name);
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

  // 3. Salva Cópia de Segurança em JSON dos Dados de Origem
  const handleBaixarBackupOrigem = async () => {
    const creds = {
      url: normalizeSupabaseUrl(supabaseUrl),
      key: cleanApiKey(supabaseKey)
    };

    if (!creds.url || !creds.key) {
      setStatusConexao({
        testado: true,
        sucesso: false,
        mensagem: 'Por favor, informe a URL e a API Key do banco de origem antes de baixar o backup.'
      });
      return;
    }

    setBaixandoBackup(true);
    setBackupStatus('Conectando ao banco de origem para extrair todos os dados...');

    try {
      const res = await exportSourceDatabaseToJson(
        creds,
        tabelas.map(t => t.name),
        (tabela, registros, idx, total) => {
          setBackupStatus(`Extraindo tabela ${idx}/${total}: ${tabela} (${registros} registros)...`);
        }
      );

      setBackupStatus(`✓ Sucesso! Arquivo "${res.fileName}" baixado (${res.totalRecords} registros salvos localmente no seu computador).`);
    } catch (err: any) {
      setBackupStatus(`Erro ao salvar backup de origem: ${err.message || String(err)}`);
    } finally {
      setBaixandoBackup(false);
    }
  };

  // Executa limpeza manual imediata do banco de dados novo com confirmação
  const handleExecutarLimpezaManual = async () => {
    if (textoConfirmacaoLimpeza.trim().toUpperCase() !== 'CONFIRMAR LIMPEZA') {
      setErroConfirmacaoLimpeza('Digite exatamente "CONFIRMAR LIMPEZA" para prosseguir.');
      return;
    }
    setErroConfirmacaoLimpeza(null);
    setLimpandoManual(true);
    setLimpezaStatus('Iniciando exclusão de todas as 28 tabelas no banco de dados novo...');

    try {
      const res = await limparBancoDestinoCompleto((tab, idx, total) => {
        setLimpezaStatus(`Excluindo dados da tabela ${idx}/${total}: ${tab}...`);
      });

      if (res.sucesso) {
        purgarCachesLocaisInfport();
        setLimpezaStatus(`✓ Sucesso! O banco de dados novo foi 100% limpo (${res.totalRemovidos} registros removidos de ${res.tabelasLimpas.length} tabelas). Condomínios, operadores, encomendas e moradores anteriores foram zerados. Todos os caches locais foram purgados.`);
        setModalConfirmacaoLimpeza(false);
        setTextoConfirmacaoLimpeza('');
        setListaCondominios([]);
        if (onMigracaoConcluida) {
          onMigracaoConcluida();
        }
      } else {
        setErroConfirmacaoLimpeza(`Aviso: ${res.erros.join('; ')}`);
      }
    } catch (e: any) {
      setErroConfirmacaoLimpeza(`Erro na limpeza: ${e.message || String(e)}`);
    } finally {
      setLimpandoManual(false);
    }
  };

  // 4. Executa a Migração Completa
  const handleIniciarMigracao = async () => {
    if (!statusConexao.sucesso) {
      alert('Por favor, teste e valide a conexão com o Supabase de origem antes de iniciar a migração.');
      return;
    }

    const creds = {
      url: normalizeSupabaseUrl(supabaseUrl),
      key: cleanApiKey(supabaseKey)
    };

    setMigrando(true);
    setResultadoFinal(null);
    setLimpezaStatus(null);
    setProgressoGeral({ totalTabelas: tabelas.length, concluidas: 0, registrosMigrados: 0 });

    try {
      let concluidas = 0;
      let totalSalvos = 0;

      const res = await executeFullSupabaseMigration(
        creds,
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
        },
        {
          salvarBackupAntes,
          limparBancoAntes,
          targetCondominioId: escopoCondominioMigracao,
          onBackupProgresso: (msg) => setBackupStatus(msg),
          onLimpezaProgresso: (msg) => setLimpezaStatus(msg)
        }
      );

      setResultadoFinal({
        sucesso: true,
        total: res.totalMigrated,
        mensagem: `✓ Migração finalizada com sucesso! ${res.totalMigrated} registros foram gravados no banco de dados PorttoHub com total integridade e sem mistura de dados.`
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

  // 5. Manipula upload de arquivo JSON
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

  // 6. Executa a Importação do JSON
  const handleImportarJson = async () => {
    if (!jsonTexto.trim()) {
      alert('Por favor, carregue um arquivo JSON ou cole o conteúdo no campo de texto.');
      return;
    }

    setImportandoJson(true);
    setResultadoJson(null);
    setLimpezaStatus(null);

    try {
      const res = await importJsonDump(
        jsonTexto, 
        (tabela, salvos, total) => {
          setProgressoJson({ tabelaAtual: tabela, salvos, total });
        },
        {
          limparBancoAntes,
          targetCondominioId: escopoCondominioMigracao,
          onLimpezaProgresso: (msg) => setLimpezaStatus(msg)
        }
      );

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
  const bancoAtualObj = bancos.find(b => b.id === bancoSelecionadoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Cabeçalho Oficial do Migrador */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white p-5 sm:p-6 shrink-0 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/30 rounded-2xl border border-blue-400/30 shadow-inner">
                <ArrowRightLeft className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    Menu Exclusivo de Configurações
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Supabase Ativo: banco de dados PorttoHub
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-white">
                  Migrador Oficial: Supabase Antigo &rarr; PorttoHub
                </h2>
                <p className="text-blue-200 text-xs sm:text-sm mt-0.5 max-w-2xl">
                  Extração e transferência segura de condomínios, moradores, encomendas, fotos, chaves e históricos do banco antigo diretamente para o seu novo banco de dados Supabase.
                </p>
              </div>
            </div>

            <button
              onClick={onFechar}
              disabled={migrando || importandoJson || baixandoBackup}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Fechar Migrador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas dos 3 Métodos */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={() => setMetodo('direto')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                metodo === 'direto'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Método 1: Conexão Direta (1-Clique)
            </button>

            <button
              type="button"
              onClick={() => setMetodo('arquivo')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                metodo === 'arquivo'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Upload className="w-4 h-4 text-teal-300" />
              Método 2: Importar Arquivo JSON
            </button>

            <button
              type="button"
              onClick={() => setMetodo('script_sql')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                metodo === 'script_sql'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileCode className="w-4 h-4 text-purple-300" />
              Método 3: Script SQL Supabase
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/70">

          {/* Banner de Destino Fixo: banco de dados PorttoHub */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                    Banco de Dados Atual (Destino)
                  </span>
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-md">
                    banco de dados PorttoHub
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-950 truncate block mt-0.5">
                  {obterSupabaseUrl()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" /> Pronto para Gravação
              </span>
            </div>
          </div>

          {/* Feedback de ações dos botões */}
          {feedbackBotao && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              feedbackBotao.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <Info className="w-4 h-4 shrink-0" />
              <span>{feedbackBotao.texto}</span>
            </div>
          )}

          {/* MÉTODO 1: CONEXÃO DIRETA */}
          {metodo === 'direto' && (
            <div className="space-y-5">
              
              {/* Card de Configuração e Botões Predefinidos Editáveis */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                
                {/* Cabeçalho da Seção de Botões */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                    <Server className="w-5 h-5 text-blue-600" />
                    <span>Passo 1: Selecione ou Edite o Banco de Origem</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Clique no botão para carregar dados ou edite os campos abaixo livremente
                  </span>
                </div>

                {/* BOTÕES PREDEFINIDOS SOLICITADOS PELO USUÁRIO (TOTALMENTE EDITÁVEIS) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Botões de Acesso Rápido a Bancos de Dados:
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={handleCriarNovoBotao}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Adicionar um novo botão de banco"
                      >
                        <Plus className="w-3 h-3 text-emerald-600" /> Novo Botão
                      </button>
                      <button
                        type="button"
                        onClick={handleRestaurarPadroes}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Restaurar botões padrão originais"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" /> Restaurar Padrões
                      </button>
                    </div>
                  </div>

                  {/* Lista de Botões de Banco de Dados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bancos.map((b) => {
                      const isSelected = bancoSelecionadoId === b.id;
                      const isCaetano = b.id === 'caetano_infport' || b.nome.toLowerCase().includes('caetano');
                      const isPorttoHub = b.id === 'porttohub_novo' || b.nome.toLowerCase().includes('porttohub');

                      return (
                        <div
                          key={b.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelecionarBanco(b)}
                              className="text-left flex items-start gap-2.5 flex-1 cursor-pointer"
                            >
                              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isCaetano 
                                  ? 'bg-indigo-600 text-white' 
                                  : isPorttoHub 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-700 text-white'
                              }`}>
                                <Database className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                                    {b.nome}
                                  </strong>
                                  {isSelected && (
                                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                                      Ativo
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 block truncate mt-0.5">
                                  {b.url}
                                </span>
                              </div>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-400 truncate max-w-[200px]">
                              {b.descricao || 'Banco Supabase'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelecionarBanco(b);
                                setModoEdicaoNome(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                              title="Editar nome deste botão"
                            >
                              <Edit2 className="w-3 h-3" /> Editar Nome
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PAINEL DE CAMPOS EDITÁVEIS PARA O BANCO SELECIONADO */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                        Configurações do Banco Selecionado: {bancoAtualObj?.nome || 'Banco Ativo'}
                      </span>
                    </div>

                    {/* Botão de Salvar Alterações no Botão */}
                    <button
                      type="button"
                      onClick={handleSalvarModificacaoBotao}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                      title="Salva as alterações de URL, Chave ou Nome neste botão permanentemente"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar Alterações Neste Botão
                    </button>
                  </div>

                  {modoEdicaoNome && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome do Botão:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nomeEditando}
                          onChange={(e) => setNomeEditando(e.target.value)}
                          placeholder="Ex: B.D caetano_infport"
                          className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setModoEdicaoNome(false)}
                          className="px-3 py-2 text-xs bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 cursor-pointer"
                        >
                          Concluir Nome
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        API URL do Supabase Antigo (Totalmente Editável):
                      </label>
                      <input
                        type="text"
                        placeholder="https://juafrepntyksgqiqzyes.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => {
                          setSupabaseUrl(e.target.value);
                          setStatusConexao({ testado: false, sucesso: false, mensagem: '' });
                        }}
                        disabled={migrando || testandoConexao}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-slate-900 shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Aceita URL padrão (ex: https://...supabase.co) ou terminada com /rest/v1/
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        API Key (anon pública ou service_role - Editável):
                      </label>
                      <input
                        type="password"
                        placeholder="Cole a chave anon ou service_role aqui..."
                        value={supabaseKey}
                        onChange={(e) => {
                          setSupabaseKey(e.target.value);
                          setStatusConexao({ testado: false, sucesso: false, mensagem: '' });
                        }}
                        disabled={migrando || testandoConexao}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-slate-900 shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Dica: Caso ocorra erro de autenticação (401), cole a chave service_role copiada do Supabase
                      </span>
                    </div>
                  </div>

                  {/* Ação de Teste de Conexão */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestarConexao}
                      disabled={testandoConexao || migrando || !supabaseUrl || !supabaseKey}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {testandoConexao ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Testando Conexão com o Supabase...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-300" />
                          Testar Conexão & Escanear Tabelas
                        </>
                      )}
                    </button>

                    {statusConexao.testado && (
                      <div className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 max-w-xl ${
                        statusConexao.sucesso
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                          : 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs'
                      }`}>
                        {statusConexao.sucesso ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>{statusConexao.mensagem}</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold block">{statusConexao.mensagem}</span>
                              <span className="text-[11px] text-rose-700 mt-0.5 block">
                                Para corrigir: Acesse seu projeto no Supabase &rarr; Project Settings &rarr; API &rarr; Copie a chave "anon" ou "service_role" e cole no campo acima, depois clique em "Salvar Alterações Neste Botão".
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card de Visão Geral das Tabelas e Execução da Migração */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        Passo 2: Mapeamento & Transferência das {tabelas.length} Tabelas
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-indigo-600" /> Auto-Cura de Esquemas Ativa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {statusConexao.sucesso
                        ? `Detectados ${totalRegistrosSupabase} registros escaneados prontos para transferência para o banco de dados PorttoHub.`
                        : 'Conecte ao Supabase acima para verificar quantos registros existem no seu banco de origem.'}
                    </p>
                  </div>

                  {statusConexao.sucesso && (
                    <button
                      type="button"
                      onClick={handleIniciarMigracao}
                      disabled={migrando || escaneando}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
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

                {/* Banner do Adaptador de Colunas e Esquemas */}
                <div className="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-blue-900 leading-relaxed">
                    <strong>Adaptador Universal com Mapeamento Fino:</strong> Mapeia dados para as colunas reais do novo banco (<code>codigo_rastreio</code>, <code>destinatario</code>, <code>foto_etiqueta</code>, <code>codigo_chave</code>, <code>tempo_limite_horas</code>, <code>veiculos</code>, etc.) sem descarte indevido e preserva vínculos relacionais.
                  </div>
                </div>

                {/* Prevenção de Mistura de Condomínios e Limpeza Prévia do Banco Novo */}
                <div className="p-4 bg-gradient-to-r from-rose-50/90 via-red-50/60 to-slate-50 border-2 border-rose-300 rounded-2xl space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1.5 bg-rose-600 text-white rounded-lg shadow-2xs">
                          <Trash2 className="w-4 h-4" />
                        </span>
                        <h4 className="text-xs sm:text-sm font-black uppercase text-rose-950 tracking-tight">
                          Limpeza Prévia do Banco Novo & Isolamento de Condomínios
                        </h4>
                        <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full uppercase shadow-2xs">
                          Evita Mistura de Dados
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-900 leading-relaxed">
                        Exclui previamente dados residuais de testes passados no banco novo (condomínios, operadores, moradores e encomendas) para que a importação seja gravada limpa, sem conflito de condomínios.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTextoConfirmacaoLimpeza('');
                        setErroConfirmacaoLimpeza(null);
                        setModalConfirmacaoLimpeza(true);
                      }}
                      disabled={migrando || limpandoManual}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                      title="Excluir todos os registros do banco de destino ativo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Banco Novo Agora</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-rose-200/60">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-800 font-semibold p-2.5 bg-white/90 rounded-xl border border-rose-200/80 hover:bg-white transition-colors">
                      <input
                        type="checkbox"
                        checked={limparBancoAntes}
                        onChange={(e) => setLimparBancoAntes(e.target.checked)}
                        disabled={migrando || limpandoManual}
                        className="w-4 h-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer shrink-0"
                      />
                      <span>
                        <strong className="block text-rose-950">Limpar banco novo antes de migrar (Reset Geral)</strong>
                        <span className="text-[10px] text-slate-500 font-normal">Exclui cadastros antigos do banco destino antes de salvar os dados migrados, evitando duplicidade e misturas.</span>
                      </span>
                    </label>

                    <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200/80 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-rose-600" />
                        Direcionamento / Escopo do Condomínio:
                      </label>
                      <select
                        value={escopoCondominioMigracao}
                        onChange={(e) => setEscopoCondominioMigracao(e.target.value)}
                        disabled={migrando || limpandoManual}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="todos">🌐 Multicondomínio (Preservar divisão original de condomínios)</option>
                        {listaCondominios.map(c => (
                          <option key={c.id} value={c.id}>
                            🏢 Vincular todos os dados ao condomínio: {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {limpezaStatus && (
                    <div className="p-2.5 bg-rose-100/90 border border-rose-300 rounded-xl text-xs text-rose-950 font-bold flex items-center gap-2">
                      <Info className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>{limpezaStatus}</span>
                    </div>
                  )}
                </div>

                {/* Opções de Segurança e Backup dos Dados de Origem */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={salvarBackupAntes}
                        onChange={(e) => setSalvarBackupAntes(e.target.checked)}
                        disabled={migrando || baixandoBackup}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Salvar automaticamente cópia de segurança (backup .json) antes de gravar no novo banco</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleBaixarBackupOrigem}
                    disabled={baixandoBackup || migrando || !supabaseUrl || !supabaseKey}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title="Baixar arquivo JSON com todos os dados do banco de onde está puxando informações"
                  >
                    {baixandoBackup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Extraindo Backup...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-blue-600" />
                        <span>Salvar Dados de Origem (Download JSON)</span>
                      </>
                    )}
                  </button>
                </div>

                {backupStatus && (
                  <div className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2 font-medium">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{backupStatus}</span>
                  </div>
                )}

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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-400 truncate">{tab.name}</span>
                          {tab.detalhesAdaptacao && (
                            <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded font-medium truncate" title={tab.detalhesAdaptacao}>
                              {tab.detalhesAdaptacao}
                            </span>
                          )}
                        </div>
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
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                        {arquivoNome ? `Arquivo carregado: ${arquivoNome}` : 'Clique para selecionar um arquivo .json'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Arquivos gerados pelo exportador do PorttoHub ou dump estruturado do Supabase
                      </span>
                    </div>
                  </label>
                </div>

                {/* Campo de Texto JSON */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Ou cole o conteúdo JSON diretamente aqui:
                    </label>
                    {jsonTexto && (
                      <button
                        type="button"
                        onClick={() => setJsonTexto('')}
                        className="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
                      >
                        Limpar texto
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={jsonTexto}
                    onChange={(e) => setJsonTexto(e.target.value)}
                    placeholder='{"condominios": [...], "operadores": [...], "encomendas_itens": [...]}'
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
                  />
                </div>

                {/* Opções de Limpeza e Condomínio no Método JSON */}
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950">
                      <input
                        type="checkbox"
                        checked={limparBancoAntes}
                        onChange={(e) => setLimparBancoAntes(e.target.checked)}
                        disabled={importandoJson}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>Limpar banco novo antes de importar JSON (Reset Geral)</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setTextoConfirmacaoLimpeza('');
                        setErroConfirmacaoLimpeza(null);
                        setModalConfirmacaoLimpeza(true);
                      }}
                      disabled={importandoJson || limpandoManual}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Banco Agora</span>
                    </button>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Direcionamento do Condomínio para os dados do JSON:
                    </label>
                    <select
                      value={escopoCondominioMigracao}
                      onChange={(e) => setEscopoCondominioMigracao(e.target.value)}
                      disabled={importandoJson}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="todos">🌐 Multicondomínio (Preservar condomínios originais do JSON)</option>
                      {listaCondominios.map(c => (
                        <option key={c.id} value={c.id}>
                          🏢 Vincular todos os dados importados ao condomínio: {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botão de Importação */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    {jsonTexto ? `Tamanho do texto: ${(jsonTexto.length / 1024).toFixed(1)} KB` : 'Aguardando dados...'}
                  </span>

                  <button
                    type="button"
                    onClick={handleImportarJson}
                    disabled={importandoJson || !jsonTexto.trim()}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {importandoJson ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importando {progressoJson.tabelaAtual} ({progressoJson.salvos}/{progressoJson.total})...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Gravar Dados no banco de dados PorttoHub
                      </>
                    )}
                  </button>
                </div>

                {/* Resultado da Importação */}
                {resultadoJson && (
                  <div className={`p-4 rounded-xl border text-xs sm:text-sm space-y-2 ${
                    resultadoJson.sucesso
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {resultadoJson.sucesso ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <span>
                        Importação concluída: {resultadoJson.total} registros inseridos com sucesso no Supabase!
                      </span>
                    </div>

                    {resultadoJson.detalhes && Object.keys(resultadoJson.detalhes).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                        {Object.entries(resultadoJson.detalhes).map(([tab, count]) => (
                          <span key={tab} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                            {tab}: <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {resultadoJson.erros && resultadoJson.erros.length > 0 && (
                      <div className="text-[11px] text-rose-700 pt-1">
                        Avisos: {resultadoJson.erros.slice(0, 3).join(' | ')}
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-purple-600" />
                      Extração Direta via Supabase SQL Editor
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Rode este script no seu banco antigo para gerar o JSON consolidado diretamente pelo PostgreSQL (bypassa RLS e permissões de chave).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopiarSql}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    {sqlCopiado ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copiar Script SQL
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto max-h-[280px]">
                  <pre>{scriptSql}</pre>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-950 space-y-1">
                  <strong>Instruções de Uso no Banco Antigo:</strong>
                  <ol className="list-decimal list-inside space-y-0.5 text-purple-900 text-[11px]">
                    <li>Acesse o painel do seu Supabase antigo e clique em <strong>SQL Editor</strong> &rarr; <strong>New Query</strong>.</li>
                    <li>Cole o script acima e clique em <strong>Run</strong>.</li>
                    <li>O PostgreSQL retornará 1 única linha com a coluna <code className="bg-purple-100 px-1 rounded">porttohub_dump_completo</code>.</li>
                    <li>Copie o resultado e cole na aba <strong>Método 2: Importar Arquivo JSON</strong> deste migrador.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal de Confirmação Segura de Limpeza Manual do Banco Novo */}
      {modalConfirmacaoLimpeza && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border-2 border-rose-500/80 text-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h3 className="text-base font-black uppercase text-white">Reset Geral do Banco Novo</h3>
                <p className="text-xs text-rose-300">Ação de limpeza total sem retorno</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação excluirá <strong>todos os registros das 28 tabelas operacionais</strong> no banco de destino ativo (condomínios, operadores, moradores, encomendas, lotes RE, chaves, ocorrências, etc.). O banco ficará 100% zerado para receber os dados importados.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-rose-400 uppercase">
                Para confirmar, digite exatamente: <span className="text-white font-mono font-black">CONFIRMAR LIMPEZA</span>
              </label>
              <input
                type="text"
                value={textoConfirmacaoLimpeza}
                onChange={(e) => {
                  setTextoConfirmacaoLimpeza(e.target.value);
                  setErroConfirmacaoLimpeza(null);
                }}
                placeholder="CONFIRMAR LIMPEZA"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-rose-200 focus:outline-hidden focus:border-rose-500"
              />
              {erroConfirmacaoLimpeza && (
                <p className="text-[11px] text-rose-400 font-bold">{erroConfirmacaoLimpeza}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmacaoLimpeza(false)}
                disabled={limpandoManual}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutarLimpezaManual}
                disabled={limpandoManual || textoConfirmacaoLimpeza.trim().toUpperCase() !== 'CONFIRMAR LIMPEZA'}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg"
              >
                {limpandoManual ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Limpando Banco...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>EXCLUIR TUDO E ZERAR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
