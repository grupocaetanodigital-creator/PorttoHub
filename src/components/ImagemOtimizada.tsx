import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface ImagemOtimizadaProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Componente de Imagem Otimizado para Baixo Consumo de Egress:
 * - Carregamento preguiçoso nativo (loading="lazy").
 * - Decodificação assíncrona (decoding="async").
 * - Tratamento de erro resiliente (impede loops infinitos de refetch).
 * - Renderização suave com transição de opacidade.
 */
export const ImagemOtimizada: React.FC<ImagemOtimizadaProps> = ({
  src,
  alt = '',
  className = 'w-full h-full object-cover',
  fallbackIcon,
  containerClassName = '',
  ...props
}) => {
  const [erro, setErro] = useState(false);
  const [carregado, setCarregado] = useState(false);

  if (!src || erro) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${containerClassName || className}`}>
        {fallbackIcon || <ImageIcon className="w-5 h-5 opacity-40" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErro(true)}
      onLoad={() => setCarregado(true)}
      className={`${className} ${!carregado ? 'opacity-80 transition-opacity' : 'opacity-100'}`}
      {...props}
    />
  );
};
