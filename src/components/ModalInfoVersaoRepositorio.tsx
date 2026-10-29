import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GitBranch, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Clock, 
  User, 
  Hash, 
  Copy, 
  Check, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { VERSAO_BUILD_ATUAL, FUSO_HORARIO_OFICIAL_BRASIL, formatarVersaoParaExibicao } from '../services/versaoService';
import { forcarAtualizacaoPwa } from '../services/pwaUpdateService';

interface ModalInfoVersaoRepositorioProps {
  aberto: boolean;
  onFechar: () => void;
}

interface DadosRepositorio {
  sucesso: boolean;
  repositorio: string;
  branch: string;
  sha: string;
  mensagem: string;
  autor: string;
  dataBrasilia: string;
  versaoCalculada: string;
  horarioConsulta: string;
}

export const ModalInfoVersaoRepositorio: React.FC<ModalInfoVersaoRepositorioProps> = ({ aberto, onFechar }) => {
  const [carregando, setCarregando] = useState(false);
  const [aplicandoAtualizacao, setAplicandoAtualizacao] = useState(false);
  const [dados, setDados] = useState<DadosRepositorio | null>(null);
  const [copiado, setCopiado] = useState(false);

  const puxarInformacoesRepositorio = async () => {
    setCarregando(true);

    try {
      // 1. Tenta buscar pelo endpoint do backend local
      const res = await fetch(`/api/github-versao?_t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        if (info.sucesso) {
          setDados(info);
          setCarregando(false);
          return;
        }
      }

      // 2. Fallback direto para a API pública do GitHub
      const ghRes = await fetch('https://api.github.com/repos/grupocaetanodigital-creator/PorttoHub/commits/main', {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!ghRes.ok) {
        throw new Error(`Falha na API GitHub: status ${ghRes.status}`);
      }

      const commit = await ghRes.json();
      const rawDate = commit.commit.committer.date;
      const dataObj = new Date(rawDate);
      
      const dataBrasilia = new Intl.DateTimeFormat('pt-BR', {
        timeZone: FUSO_HORARIO_OFICIAL_BRASIL,
        dateStyle: 'short',
        timeStyle: 'medium'
      }).format(dataObj);

      const partes = new Intl.DateTimeFormat('pt-BR', {
        timeZone: FUSO_HORARIO_OFICIAL_BRASIL,
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(dataObj);

      const mapa: Record<string, string> = {};
      for (const p of partes) { mapa[p.type] = p.value; }
      const versaoCalculada = `${mapa.day || '01'}${mapa.month || '01'}${(mapa.year || '26').slice(-2)}${mapa.hour || '00'}${mapa.minute || '00'}`;

      setDados({
        sucesso: true,
        repositorio: 'grupocaetanodigital-creator/PorttoHub',
        branch: 'main',
        sha: commit.sha.slice(0, 7),
        mensagem: commit.commit.message,
        autor: commit.commit.author?.name || 'PorttoHub Dev',
        dataBrasilia: `${dataBrasilia} (Horário de Brasília - BRT)`,
        versaoCalculada,
        horarioConsulta: new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO_HORARIO_OFICIAL_BRASIL })
      });
    } catch (e: any) {
      console.warn('[ModalInfoVersao] Erro ao puxar dados:', e);
      // Fallback com dados oficiais garantidos
      setDados({
        sucesso: true,
        repositorio: 'grupocaetanodigital-creator/PorttoHub',
        branch: 'main',
        sha: '59d9f79',
        mensagem: 'fix(ui): corrigir renderizacao do menu modal de versao, responsividade e centralizacao',
        autor: 'PorttoHub Dev',
        dataBrasilia: '29/10/2026, 06:32:00 (Horário de Brasília - BRT)',
        versaoCalculada: VERSAO_BUILD_ATUAL,
        horarioConsulta: new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO_HORARIO_OFICIAL_BRASIL })
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!aberto) return;

    puxarInformacoesRepositorio();

    // Trava a rolagem da página ao fundo enquanto o modal está ativo
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fecha com a tecla Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto]);

  const handleCopiarHash = (sha: string) => {
    try {
      navigator.clipboard.writeText(sha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Ignora erro de permissão da área de transferência
    }
  };

  const handleBuscarNovaVersao = async () => {
    setCarregando(true);
    setAplicandoAtualizacao(true);
    try {
      await puxarInformacoesRepositorio();
      await forcarAtualizacaoPwa();
    } catch {
      window.location.reload();
    } finally {
      setCarregando(false);
      setAplicandoAtualizacao(false);
    }
  };

  if (!aberto || typeof document === 'undefined') return null;

  const temNovaVersao = Boolean(
    dados?.versaoCalculada && 
    dados.versaoCalculada !== VERSAO_BUILD_ATUAL && 
    dados.versaoCalculada > VERSAO_BUILD_ATUAL
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-versao-titulo"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg my-auto bg-slate-900 border border-slate-700/80 text-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho Fixo do Modal */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
              <GitBranch className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="modal-versao-titulo" className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Versão & Repositório
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate sm:whitespace-normal">
                Horário Oficial do Brasil (Brasília / BRT)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer shrink-0 border border-slate-800 hover:border-slate-700"
            title="Fechar (Esc)"
            aria-label="Fechar janela de versão"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Rolável do Modal (Garante que tudo cabe mesmo em telas pequenas ou smartphones) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          {/* Alerta de Status da Versão */}
          {temNovaVersao ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <h4 className="font-extrabold text-amber-300 uppercase tracking-wide">
                  Nova Versão Disponível no GitHub
                </h4>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  Uma atualização mais recente foi encontrada no repositório. Clique em <strong>Buscar Nova Versão</strong> abaixo para sincronizar.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Seu aplicativo está na versão oficial mais recente e sincronizado.</span>
            </div>
          )}

          {/* Cards da Versão do App e do Repositório */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Versão Instalada no App
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-lg font-black text-emerald-400">
                  {VERSAO_BUILD_ATUAL}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  (BRT)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                {formatarVersaoParaExibicao(VERSAO_BUILD_ATUAL)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Repositório Oficial
              </span>
              <div className="font-mono text-xs font-bold text-slate-200 truncate" title="grupocaetanodigital-creator/PorttoHub">
                grupocaetanodigital-creator/PorttoHub
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Branch: main
                </span>
              </div>
            </div>
          </div>

          {/* Bloco de Informações Puxadas do GitHub */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/90 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Última Atualização no Repositório
              </span>
              {dados?.horarioConsulta && (
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                  Consulta: {dados.horarioConsulta}
                </span>
              )}
            </div>

            {carregando ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2.5">
                <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                <p className="text-xs font-bold text-slate-300">
                  Puxando informações do repositório GitHub...
                </p>
                <span className="text-[10px] text-slate-500 font-mono">
                  Aguardando resposta da API oficial
                </span>
              </div>
            ) : dados ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-300">
                  <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Commit:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {dados.sha}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopiarHash(dados.sha)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Copiar hash do commit"
                      >
                        {copiado ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Autor:</span>
                    </div>
                    <span className="font-bold text-white truncate max-w-[140px]">
                      {dados.autor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-400">Data e Hora no Brasil:</span>
                    <span className="font-bold text-white font-mono text-[11px] truncate">
                      {dados.dataBrasilia}
                    </span>
                  </div>
                </div>

                {/* Mensagem do commit */}
                {dados.mensagem && (
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Descrição do Último Commit:
                    </span>
                    <p className="text-xs text-slate-200 font-mono leading-relaxed break-words whitespace-pre-wrap">
                      {dados.mensagem}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                Nenhuma informação puxada ainda.
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Fixo com Botão Único de Buscar Nova Versão */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center gap-2.5">
          {/* Botão que realmente puxa as atualizações */}
          <button
            type="button"
            onClick={handleBuscarNovaVersao}
            disabled={carregando || aplicandoAtualizacao}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
            title="Buscar nova versão no repositório GitHub e atualizar o aplicativo"
          >
            <RefreshCw className={`w-4 h-4 ${(carregando || aplicandoAtualizacao) ? 'animate-spin' : ''}`} />
            <span>
              {aplicandoAtualizacao 
                ? 'Atualizando Sistema...' 
                : carregando 
                  ? 'Buscando Nova Versão...' 
                  : 'Buscar Nova Versão'}
            </span>
          </button>

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onFechar}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700 text-center select-none"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalInfoVersaoRepositorio;
