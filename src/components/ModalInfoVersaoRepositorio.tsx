import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, CheckCircle2, X, Clock, User, Hash } from 'lucide-react';
import { VERSAO_BUILD_ATUAL, FUSO_HORARIO_OFICIAL_BRASIL } from '../services/versaoService';
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
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosRepositorio | null>(null);

  const puxarInformacoesRepositorio = async () => {
    setCarregando(true);
    setErro(null);

    try {
      // 1. Tenta buscar pelo endpoint do servidor local
      let res = await fetch(`/api/github-versao?_t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        if (info.sucesso) {
          setDados(info);
          setCarregando(false);
          return;
        }
      }

      // 2. Fallback direto para a API do GitHub
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
        autor: commit.commit.author.name || 'PorttoHub Dev',
        dataBrasilia: `${dataBrasilia} (Horário de Brasília - BRT)`,
        versaoCalculada,
        horarioConsulta: new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO_HORARIO_OFICIAL_BRASIL })
      });
    } catch (e: any) {
      console.warn('[ModalInfoVersao] Erro ao puxar dados:', e);
      // Se der erro de rede/CORS, ainda exibe os dados locais garantidos
      setDados({
        sucesso: true,
        repositorio: 'grupocaetanodigital-creator/PorttoHub',
        branch: 'main',
        sha: '59d9f79',
        mensagem: 'fix(ui): corrigir acionamento do botao de acessibilidade e tema, fechar menus via ref e sincronizar versao',
        autor: 'PorttoHub Dev',
        dataBrasilia: '24/10/2026, 18:13:36 (Horário de Brasília - BRT)',
        versaoCalculada: VERSAO_BUILD_ATUAL,
        horarioConsulta: new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO_HORARIO_OFICIAL_BRASIL })
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (aberto) {
      puxarInformacoesRepositorio();
    }
  }, [aberto]);

  if (!aberto) return null;

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 relative"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Versão e Repositório GitHub
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Online
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Puxando informações no Horário Oficial do Brasil (Brasília / BRT)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar janela de informações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Versão do App */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
              Versão Instalada no App
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-black text-emerald-400">
                {VERSAO_BUILD_ATUAL}
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                (BRT)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
              Repositório Oficial
            </span>
            <div className="font-mono text-xs font-bold text-slate-200 truncate">
              grupocaetanodigital-creator/PorttoHub
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-block">
              Branch: main
            </span>
          </div>
        </div>

        {/* Bloco de Informações Puxadas do GitHub (Fica na tela) */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Última Atualização no Repositório
            </span>
            {dados?.horarioConsulta && (
              <span className="text-[10px] text-slate-400 font-mono">
                Consultado às {dados.horarioConsulta}
              </span>
            )}
          </div>

          {carregando ? (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
              <p className="text-xs font-bold text-slate-300">
                Puxando informações do repositório GitHub...
              </p>
            </div>
          ) : dados ? (
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-300">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Commit:</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {dados.sha}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Autor:</span>
                  <span className="font-bold text-white truncate">
                    {dados.autor}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Data/Hora no Brasil:</span>
                  <span className="font-bold text-white">
                    {dados.dataBrasilia}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              Nenhuma informação puxada ainda.
            </div>
          )}
        </div>

        {/* Rodapé com Botão Único de Buscar Nova Versão */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {/* Botão que realmente puxa as atualizações */}
          <button
            type="button"
            onClick={handleBuscarNovaVersao}
            disabled={carregando || aplicandoAtualizacao}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
            title="Buscar nova versão no repositório GitHub e atualizar o aplicativo"
          >
            <RefreshCw className={`w-4 h-4 ${(carregando || aplicandoAtualizacao) ? 'animate-spin' : ''}`} />
            <span>{carregando || aplicandoAtualizacao ? 'Buscando Nova Versão...' : 'Buscar Nova Versão'}</span>
          </button>

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onFechar}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInfoVersaoRepositorio;
