import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, RotateCcw, CheckCircle2, Eraser } from 'lucide-react';

interface CampoAssinaturaDigitalProps {
  valor?: string;
  onChange: (dataUrl: string) => void;
  onLimpar?: () => void;
  nomeRetirante?: string;
  obrigatorio?: boolean;
  altura?: number;
}

export default function CampoAssinaturaDigital({
  valor = '',
  onChange,
  onLimpar,
  nomeRetirante = '',
  obrigatorio = false,
  altura = 140
}: CampoAssinaturaDigitalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [desenhando, setDesenhando] = useState(false);
  const [temTracos, setTemTracos] = useState(Boolean(valor));
  const [posicaoAnterior, setPosicaoAnterior] = useState<{ x: number; y: number } | null>(null);

  // Inicializa o canvas com suporte a High-DPI (Retina displays)
  const ajustarTamanhoCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const largura = Math.max(rect.width, 280);

    // Ajusta o buffer interno com DPI dobrado para linhas nítidas
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;

    // Ajusta tamanho CSS visual
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // Slate-900

    // Se já havia um valor salvo (ex: dataUrl), redesenha no canvas
    if (valor) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, largura, altura);
        ctx.drawImage(img, 0, 0, largura, altura);
        setTemTracos(true);
      };
      img.src = valor;
    }
  }, [altura, valor]);

  useEffect(() => {
    ajustarTamanhoCanvas();

    const handleResize = () => {
      // Reposiciona se a janela for redimensionada
      ajustarTamanhoCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [ajustarTamanhoCanvas]);

  const obterCoordenadas = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const iniciarTraco = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = obterCoordenadas(e.nativeEvent);
    setDesenhando(true);
    setPosicaoAnterior(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.25, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    setTemTracos(true);
  };

  const moverTraco = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!desenhando || !posicaoAnterior) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const novaPos = obterCoordenadas(e.nativeEvent);

    ctx.beginPath();
    ctx.moveTo(posicaoAnterior.x, posicaoAnterior.y);
    ctx.lineTo(novaPos.x, novaPos.y);
    ctx.stroke();

    setPosicaoAnterior(novaPos);
    setTemTracos(true);
  };

  const finalizarTraco = () => {
    if (!desenhando) return;
    setDesenhando(false);
    setPosicaoAnterior(null);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Exporta imagem em formato PNG DataURL
    try {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    } catch (err) {
      console.warn('Erro ao exportar assinatura:', err);
    }
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setTemTracos(false);
    onChange('');
    if (onLimpar) onLimpar();
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-emerald-600" />
          <span>Assinatura Digital do Retirante {obrigatorio && <span className="text-red-500">*</span>}</span>
        </label>
        <div className="flex items-center gap-1.5">
          {temTracos ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md animate-in fade-in duration-150">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Coletada
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">
              {obrigatorio ? 'Obrigatória' : 'Toque na tela para assinar'}
            </span>
          )}
          {temTracos && (
            <button
              type="button"
              onClick={limparAssinatura}
              className="text-[10px] font-bold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
              title="Limpar e assinar novamente"
            >
              <Eraser className="w-3 h-3 text-slate-400 hover:text-red-500" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Painel Interativo de Assinatura (Touch Friendly) */}
      <div 
        ref={containerRef}
        className={`relative w-full rounded-xl border-2 transition-all overflow-hidden ${
          temTracos 
            ? 'border-emerald-500 bg-white shadow-xs' 
            : 'border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/70'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={iniciarTraco}
          onMouseMove={moverTraco}
          onMouseUp={finalizarTraco}
          onMouseLeave={finalizarTraco}
          onTouchStart={iniciarTraco}
          onTouchMove={moverTraco}
          onTouchEnd={finalizarTraco}
          onTouchCancel={finalizarTraco}
          className="w-full touch-none cursor-crosshair select-none block bg-transparent"
          style={{ height: `${altura}px` }}
        />

        {/* Linha guia de assinatura e placeholder visual */}
        {!temTracos && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-3 pb-2 text-center">
            <div className="w-4/5 mx-auto border-b border-dashed border-slate-400/60 mb-1" />
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-slate-400" />
              <span>Assine aqui com o dedo ou caneta touch</span>
            </div>
            {nomeRetirante && (
              <span className="text-[10px] text-slate-400 truncate max-w-xs mx-auto">
                Retirante: <strong className="text-slate-600">{nomeRetirante}</strong>
              </span>
            )}
          </div>
        )}

        {/* Linha de base sutil mesmo quando assinado */}
        {temTracos && (
          <div className="absolute bottom-2 left-4 right-4 pointer-events-none flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-200 pt-0.5">
            <span className="font-mono">✕ Assinatura Digital</span>
            <span>{nomeRetirante ? `Por: ${nomeRetirante}` : 'Confirmada na Portaria'}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <span>Desenhe diretamente na tela do celular, tablet ou com o mouse</span>
        {temTracos && (
          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
            ✓ Válida como comprovante legal
          </span>
        )}
      </div>
    </div>
  );
}
