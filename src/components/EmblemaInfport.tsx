import React from 'react';
import { 
  useCustomizacaoVisual, 
  TipoTamanhoEmblema, 
  TipoBordaEmblema, 
  TipoFormatoEmblema 
} from '../services/customizacaoVisualService';

interface EmblemaInfportProps {
  tamanho?: TipoTamanhoEmblema;
  comBorda?: boolean;
  comBrilho?: boolean;
  className?: string;
  alt?: string;
  urlCustom?: string;
  corBrilhoCustom?: string;
  estiloBordaCustom?: TipoBordaEmblema;
  formatoCustom?: TipoFormatoEmblema;
  condominioId?: string;
}

const TAMANHOS: Record<TipoTamanhoEmblema, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
};

/**
 * Componente do Emblema da Tela Principal e Topo
 * Suporta emblema customizável pelo administrador (upload próprio ou preset vetorial),
 * efeitos de iluminação / brilho neon, formatos e anéis metálicos.
 */
export default function EmblemaInfport({
  tamanho,
  comBorda,
  comBrilho,
  className = '',
  alt = 'Emblema do Sistema',
  urlCustom,
  corBrilhoCustom,
  estiloBordaCustom,
  formatoCustom,
  condominioId
}: EmblemaInfportProps) {
  const customVisual = useCustomizacaoVisual(condominioId);

  // Valores efetivos (props têm precedência sobre configuração do painel)
  const tamanhoEfetivo = tamanho || customVisual.emblemaTamanho || 'md';
  const sizeClasses = TAMANHOS[tamanhoEfetivo] || TAMANHOS.md;
  const urlEfetiva = urlCustom || customVisual.emblemaUrl || '/emblema-infport.png';
  const brilhoAtivo = comBrilho !== undefined ? comBrilho : (customVisual.emblemaBrilho ?? true);
  const corBrilho = corBrilhoCustom || customVisual.emblemaCorBrilho || '#f59e0b';
  const estiloBorda = estiloBordaCustom || customVisual.emblemaEstiloBorda || 'anel_dourado';
  const formato = formatoCustom || customVisual.emblemaFormato || 'circular';

  // Classes de formato
  const formatClasses = formato === 'circular'
    ? 'rounded-full'
    : formato === 'arredondado'
      ? 'rounded-2xl'
      : 'rounded-lg';

  // Classes de borda
  let borderClasses = '';
  if (comBorda !== false && estiloBorda !== 'sem_borda') {
    switch (estiloBorda) {
      case 'anel_dourado':
        borderClasses = 'ring-2 ring-amber-400/60 shadow-amber-500/20 shadow-md';
        break;
      case 'neon':
        borderClasses = 'ring-2 ring-cyan-400 shadow-cyan-400/40 shadow-lg';
        break;
      case 'circulo_clean':
        borderClasses = 'ring-1 ring-slate-400/30 shadow-xs';
        break;
    }
  }

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}
      title={`${customVisual.nomeAplicacao || 'PorttoHub'} - Identidade Visual`}
    >
      {/* Efeito Glow / Brilho Radiante */}
      {brilhoAtivo && (
        <div 
          className={`absolute -inset-1 ${formatClasses} blur-md opacity-50 animate-pulse pointer-events-none transition-all duration-300`}
          style={{ backgroundColor: corBrilho }}
        />
      )}

      {/* Imagem / SVG do Emblema */}
      <img
        src={urlEfetiva}
        alt={alt}
        className={`w-full h-full object-contain ${formatClasses} select-none transition-all duration-200 relative z-10 ${borderClasses}`}
        loading="eager"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.includes('pwa-192x192.png')) {
            target.src = '/pwa-192x192.png';
          }
        }}
      />
    </div>
  );
}
