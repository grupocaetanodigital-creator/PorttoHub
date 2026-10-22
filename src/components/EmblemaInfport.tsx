import React from 'react';

interface EmblemaInfportProps {
  tamanho?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  comBorda?: boolean;
  comBrilho?: boolean;
  className?: string;
  alt?: string;
}

const TAMANHOS = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
};

/**
 * Componente do Emblema Oficial INFPORT 1.0
 * Brasão de Segurança: Águia Alada de Prontidão com Escudo e Aro Dourado
 */
export default function EmblemaInfport({
  tamanho = 'md',
  comBorda = true,
  comBrilho = false,
  className = '',
  alt = 'Emblema Oficial INFPORT 1.0'
}: EmblemaInfportProps) {
  const sizeClasses = TAMANHOS[tamanho] || TAMANHOS.md;

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}
      title="INFPORT 1.0 - Sistema Integrado de Portaria e Segurança Patrimonial"
    >
      {comBrilho && (
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-md animate-pulse pointer-events-none" />
      )}
      <img
        src="/emblema-infport.png"
        alt={alt}
        className={`w-full h-full object-contain rounded-full select-none ${
          comBorda ? 'ring-1 ring-amber-500/40 shadow-sm' : ''
        }`}
        loading="eager"
        onError={(e) => {
          // Fallback gracioso para a imagem do PWA caso o caminho varie
          const target = e.currentTarget;
          if (!target.src.includes('pwa-192x192.png')) {
            target.src = '/pwa-192x192.png';
          }
        }}
      />
    </div>
  );
}
