import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon, ZoomIn, RefreshCw, X, Download } from 'lucide-react';
import { obterImagemCacheada, salvarImagemCache } from '../services/imageCacheService';

interface ImagemOtimizadaProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
  permitirAmpliar?: boolean;
  aspectRatio?: string;
}

/**
 * Componente de Imagem de Alta Performance para Cards & Portaria:
 * - Lazy Loading Nativo (loading="lazy", decoding="async").
 * - Shimmer Skeleton enquanto carrega.
 * - Cache local em CacheStorage para acesso 100% offline.
 * - Modal de Ampliação em Tela Cheia ao clicar.
 * - Tratamento resiliente de erro sem travar a interface.
 */
export const ImagemOtimizada: React.FC<ImagemOtimizadaProps> = ({
  src,
  alt = 'Imagem do registro',
  className = 'w-full h-full object-cover',
  fallbackIcon,
  containerClassName = '',
  permitirAmpliar = true,
  aspectRatio,
  ...props
}) => {
  const [urlEfetiva, setUrlEfetiva] = useState<string | null>(src || null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<boolean>(false);
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [emCacheLocal, setEmCacheLocal] = useState<boolean>(false);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!src) {
      setUrlEfetiva(null);
      setCarregando(false);
      setErro(false);
      return;
    }

    setCarregando(true);
    setErro(false);

    // 1. Tenta recuperar imagem do CacheStorage local para carregamento instantâneo
    let cancelado = false;
    obterImagemCacheada(src).then((cachedBlobUrl) => {
      if (cancelado || !montadoRef.current) return;
      if (cachedBlobUrl) {
        setUrlEfetiva(cachedBlobUrl);
        setEmCacheLocal(true);
        setCarregando(false);
      } else {
        setUrlEfetiva(src);
        setEmCacheLocal(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [src]);

  const handleLoadSucesso = () => {
    setCarregando(false);
    setErro(false);
    // Salva no CacheStorage para permitir acesso offline futuro
    if (src && !emCacheLocal) {
      salvarImagemCache(src);
    }
  };

  const handleErroCarregamento = () => {
    setCarregando(false);
    setErro(true);
  };

  const tentarRecarregar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setErro(false);
    setCarregando(true);
    setUrlEfetiva(src ? `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}` : null);
  };

  if (!src || erro) {
    return (
      <div 
        className={`relative flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-700/60 transition-all ${containerClassName || 'w-full h-full min-h-[72px]'}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {fallbackIcon || <ImageIcon className="w-5 h-5 opacity-40 mb-1" />}
        {erro && src && (
          <button
            type="button"
            onClick={tentarRecarregar}
            className="text-[9.5px] font-bold text-slate-500 hover:text-emerald-500 flex items-center gap-1 mt-0.5 cursor-pointer"
            title="Tentar carregar novamente"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Recarregar
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div 
        className={`relative overflow-hidden group ${containerClassName}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {/* Shimmer Skeleton enquanto a imagem carrega */}
        {carregando && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center z-10">
            <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        )}

        <img
          src={urlEfetiva || src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoadSucesso}
          onError={handleErroCarregamento}
          className={`${className} transition-opacity duration-300 ${carregando ? 'opacity-0' : 'opacity-100'}`}
          {...props}
        />

        {/* Botão de Ampliação ao passar o mouse ou focar */}
        {!carregando && permitirAmpliar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModalAberto(true);
            }}
            className="absolute bottom-1 right-1 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition shadow-sm cursor-pointer flex items-center gap-0.5 text-[9px] font-bold"
            title="Ampliar foto em tela cheia"
          >
            <ZoomIn className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Ver</span>
          </button>
        )}
      </div>

      {/* Modal Lightbox de Foto Ampliada */}
      {modalAberto && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setModalAberto(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[92vh] w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra superior do modal */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate max-w-[70%]">
                {alt || 'Visualização do Comprovante / Foto'}
              </span>
              <div className="flex items-center gap-2">
                {src && (
                  <a
                    href={src}
                    download="comprovante-porttohub.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
                    title="Baixar imagem original"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 transition cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Imagem em alta resolução */}
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-slate-950">
              <img
                src={urlEfetiva || src}
                alt={alt}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
