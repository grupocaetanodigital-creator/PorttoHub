import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Monitor, 
  CheckCircle2, 
  Share, 
  X, 
  Sparkles, 
  WifiOff, 
  Zap,
  ExternalLink,
  Copy
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import EmblemaInfport from './EmblemaInfport';

interface ModalInstalarAppPWAProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function ModalInstalarAppPWA({ aberto, onFechar }: ModalInstalarAppPWAProps) {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [instalando, setInstalando] = useState(false);
  const [sucessoInstalacao, setSucessoInstalacao] = useState(false);
  const [emIframe, setEmIframe] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => {
    try {
      setEmIframe(window.self !== window.top);
    } catch {
      setEmIframe(true);
    }
  }, []);

  if (!aberto) return null;

  const handleInstalarNativo = async () => {
    setInstalando(true);
    try {
      const instalado = await install();
      if (instalado) {
        setSucessoInstalacao(true);
      }
    } finally {
      setInstalando(false);
    }
  };

  const copiarLinkDireto = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch (e) {
      console.warn('Falha ao copiar:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <EmblemaInfport tamanho="md" comBrilho />
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Instalar INFPORT no Computador (PC)
              </h3>
              <p className="text-xs text-slate-400">
                Sistema Oficial PWA para Portaria, Guarita e Controle de Acesso
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status: Já Instalado */}
        {(isStandalone || isInstalled || sucessoInstalacao) ? (
          <div className="bg-emerald-950/70 border border-emerald-500/50 p-5 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-sm text-emerald-300">
                Aplicativo Instalado com Sucesso!
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                O INFPORT 1.0 já está funcionando como aplicativo do seu dispositivo. Você pode abri-lo direto da Área de Trabalho ou do Menu Iniciar.
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase transition shadow-md cursor-pointer"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Bloco de Ação Rápida para PC / Iframe */}
            {emIframe && (
              <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 p-3.5 rounded-2xl space-y-2 shadow-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-emerald-300 block font-bold text-xs sm:text-sm">
                      Dica para Instalar no seu PC
                    </strong>
                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                      Como você está visualizando dentro do painel do editor, o navegador restringe a instalação direta em quadros embutidos. Abra em uma aba própria e instale com 1 clique!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md text-center cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir em Nova Aba para Instalar</span>
                  </a>

                  <button
                    type="button"
                    onClick={copiarLinkDireto}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {linkCopiado ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{linkCopiado ? 'Link Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Vantagens de instalar como Programa no PC */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="p-1 rounded bg-blue-500/20 text-blue-400 inline-block mb-0.5">
                  <Monitor className="w-3.5 h-3.5" />
                </span>
                <strong className="block text-[11px] text-slate-200">Sem Barra de URL</strong>
                <p className="text-[10px] text-slate-400 leading-snug">Visual limpo de software profissional em janela dedicada.</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 inline-block mb-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <strong className="block text-[11px] text-slate-200">Área de Trabalho</strong>
                <p className="text-[10px] text-slate-400 leading-snug">Ícone oficial no Menu Iniciar e Barra de Tarefas.</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="p-1 rounded bg-purple-500/20 text-purple-400 inline-block mb-0.5">
                  <WifiOff className="w-3.5 h-3.5" />
                </span>
                <strong className="block text-[11px] text-slate-200">Cache de Posto</strong>
                <p className="text-[10px] text-slate-400 leading-snug">Abertura instantânea mesmo com instabilidades na guarita.</p>
              </div>
            </div>

            {/* CASO 1: ANDROID / CHROME / WINDOWS / EDGE (Instalação 1 Clique) */}
            {isInstallable && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase">
                    Instalação Automática Disponível
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Seu navegador é 100% compatível com a instalação direta. Clique no botão abaixo para adicionar o aplicativo oficial à sua área de trabalho:
                </p>

                <button
                  type="button"
                  onClick={handleInstalarNativo}
                  disabled={instalando}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg active:scale-[0.99] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {instalando ? 'Instalando...' : 'Instalar Aplicativo INFPORT 1.0'}
                </button>
              </div>
            )}

            {/* CASO 2: DISPOSITIVO APPLE (iOS Safari) */}
            {isIOS && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase">
                  <Share className="w-4 h-4 text-blue-400" />
                  Como instalar no iPhone ou iPad:
                </div>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <li className="leading-relaxed">
                    Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari.
                  </li>
                  <li className="leading-relaxed">
                    Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito.
                  </li>
                </ol>
              </div>
            )}

            {/* CASO 3: NAVEGADOR DESKTOP NO PC (Chrome / Edge / Windows / Mac) */}
            {!isIOS && (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  Como Instalar no PC (Google Chrome ou Microsoft Edge):
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="leading-snug">
                      <strong>Pelo ícone da barra de navegação:</strong> No Chrome ou Edge, clique no ícone de <strong>computador com seta para baixo (⬇ ou ⊕)</strong> localizado no canto direito da barra de endereços (ao lado do ícone de favoritos).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="leading-snug">
                      <strong>Ou pelo menu do navegador:</strong> Clique nos <strong>3 pontinhos (...)</strong> no canto superior direito &gt; <strong>Salvar e Compartilhar</strong> (ou <em>Transmitir, salvar</em>) &gt; <strong>"Instalar INFPORT 1.0..."</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="leading-snug">
                      <strong>Confirme em "Instalar":</strong> O programa será adicionado à sua Área de Trabalho e abrirá como um software nativo do computador.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Fechar */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onFechar}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
