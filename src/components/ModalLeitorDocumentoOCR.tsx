import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RotateCw, 
  Sparkles, 
  FileText, 
  User, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Image as ImageIcon,
  Zap,
  ZapOff,
  Sun,
  Maximize2,
  Scan,
  CreditCard,
  BadgeAlert
} from 'lucide-react';
import { 
  executarOCRCompleto, 
  prepararImagemCanvas, 
  DadosDocumentoExtraidos, 
  validarCPF, 
  formatarCPF,
  validarRG,
  formatarRG
} from '../services/documentOcrService';

interface ModalLeitorDocumentoOCRProps {
  aberto: boolean;
  onFechar: () => void;
  onDadosConfirmados: (dados: {
    nomeCompleto: string;
    documento: string;
    tipoDocumento: string;
    cpf?: string;
    rg?: string;
    cnhRegistro?: string;
    validade?: string;
    fotoDocumentoBase64?: string;
    fotoRostoBase64?: string;
    empresa?: string;
  }) => void;
}

const DICAS_GUARITA = [
  { icone: '📐', texto: 'Aproxime o documento até preencher o retângulo tracejado' },
  { icone: '💡', texto: 'Evite reflexos de luz direta ou lâmpadas no plástico protetor' },
  { icone: '✋', texto: 'Mantenha a câmera firme ao fotografar para não borrar o texto' },
  { icone: '📄', texto: 'Aceita RG tradicional, CNH, Nova CIN (unificada) e Crachá' },
  { icone: '⚡', texto: 'Se a guarita estiver escura, ative o flash/lanterna no topo' }
];

/**
 * Emite som nativo de sucesso via Web Audio API
 */
function emitirSomSucesso() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.11);
    gain2.gain.setValueAtTime(0.3, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.32);
  } catch (e) {}
}

export default function ModalLeitorDocumentoOCR({
  aberto,
  onFechar,
  onDadosConfirmados
}: ModalLeitorDocumentoOCRProps) {
  const [modo, setModo] = useState<'camera' | 'upload' | 'resultado'>('camera');
  const [streamAtivo, setStreamAtivo] = useState(false);
  const [carregandoOcr, setCarregandoOcr] = useState(false);
  const [progressoOcr, setProgressoOcr] = useState(0);
  const [statusTexto, setStatusTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Formato do guia visual da câmera
  const [formatoDocumento, setFormatoDocumento] = useState<'horizontal' | 'vertical'>('horizontal');
  const [lanternaSuportada, setLanternaSuportada] = useState(false);
  const [lanternaAtiva, setLanternaAtiva] = useState(false);

  // Carrossel de Dicas da Guarita
  const [indiceDica, setIndiceDica] = useState(0);

  // Estados dos dados extraídos e conferência
  const [dadosOcr, setDadosOcr] = useState<DadosDocumentoExtraidos | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [cpfEditado, setCpfEditado] = useState('');
  const [rgEditado, setRgEditado] = useState('');
  const [documentoEditado, setDocumentoEditado] = useState('');
  const [tipoDocEditado, setTipoDocEditado] = useState('CPF');
  const [fotoDocPreview, setFotoDocPreview] = useState<string | undefined>(undefined);
  const [fotoRostoPreview, setFotoRostoPreview] = useState<string | undefined>(undefined);
  const [rotacaoManual, setRotacaoManual] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerCameraRef = useRef<HTMLDivElement | null>(null);
  const guiaRetanguloRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Alternador de dicas automáticas
  useEffect(() => {
    if (!aberto || modo !== 'camera') return;
    const intervalo = setInterval(() => {
      setIndiceDica(prev => (prev + 1) % DICAS_GUARITA.length);
    }, 4000);
    return () => clearInterval(intervalo);
  }, [aberto, modo]);

  useEffect(() => {
    if (aberto && modo === 'camera') {
      iniciarCamera();
    } else {
      pararCamera();
    }

    return () => {
      pararCamera();
    };
  }, [aberto, modo]);

  const iniciarCamera = async () => {
    setErro(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      // Tenta obter câmera traseira com foco contínuo e resolução HD
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      mediaStreamRef.current = stream;
      setStreamAtivo(true);

      // Checa suporte a Lanterna (Torch)
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const cap = (track.getCapabilities?.() || {}) as any;
          setLanternaSuportada(Boolean(cap.torch));
          // Tenta aplicar foco contínuo se o dispositivo suportar
          if (cap.focusMode && Array.isArray(cap.focusMode) && cap.focusMode.includes('continuous')) {
            await (track as any).applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            });
          }
        } catch {}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('[ModalOCR] Erro ao abrir câmera:', err);
      setStreamAtivo(false);
      setModo('upload');
      setErro('Acesso à câmera indisponível ou negado no navegador. Você pode selecionar a foto do documento pelo botão abaixo.');
    }
  };

  const pararCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setStreamAtivo(false);
    setLanternaAtiva(false);
  };

  const alternarLanterna = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const novoEstado = !lanternaAtiva;
      await (track as any).applyConstraints({
        advanced: [{ torch: novoEstado }]
      });
      setLanternaAtiva(novoEstado);
    } catch (e) {
      console.warn('Falha ao alternar lanterna:', e);
    }
  };

  /**
   * Recorta a foto com base no retângulo tracejado visível na tela
   * Evita enviar a guarita inteira, dedos ou mesa para o leitor de OCR
   */
  const capturarFotoDaCamera = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const vW = video.videoWidth || 1280;
      const vH = video.videoHeight || 720;

      // Proporções do retângulo de corte inteligente
      const ehHorizontal = formatoDocumento === 'horizontal';
      const proporcao = ehHorizontal ? 1.586 : 0.72;

      // Recorta área central (aproximadamente 75% da largura na horizontal)
      let cropW = Math.round(vW * (ehHorizontal ? 0.78 : 0.58));
      let cropH = Math.round(cropW / proporcao);

      if (cropH > vH * 0.88) {
        cropH = Math.round(vH * 0.88);
        cropW = Math.round(cropH * proporcao);
      }

      const cropX = Math.max(0, Math.round((vW - cropW) / 2));
      const cropY = Math.max(0, Math.round((vH - cropH) / 2));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      pararCamera();
      await processarImagem(dataUrl);
    } catch (err: any) {
      setErro('Erro ao capturar frame da câmera: ' + err.message);
    }
  };

  const lidarComArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setErro(null);
    await processarImagem(file);
    e.target.value = '';
  };

  const processarImagem = async (arquivoOuDataUrl: File | Blob | string) => {
    setCarregandoOcr(true);
    setProgressoOcr(10);
    setStatusTexto('Iniciando análise do documento...');
    setErro(null);

    try {
      const resultado = await executarOCRCompleto(arquivoOuDataUrl, (perc, texto) => {
        setProgressoOcr(perc);
        setStatusTexto(texto);
      });

      setDadosOcr(resultado);
      const nomeVal = (resultado.nome || resultado.nomeCompleto || '').trim();
      const cpfVal = (resultado.cpf || (resultado.cpfValidado ? resultado.documentoFormatado : '')).trim();
      const rgVal = (resultado.rg || (resultado.rgValido ? resultado.documentoFormatado : '')).trim();

      setNomeEditado(nomeVal);
      setCpfEditado(cpfVal);
      setRgEditado(rgVal);

      const docPrincipal = cpfVal || rgVal || resultado.documentoFormatado || '';
      setDocumentoEditado(docPrincipal);
      setTipoDocEditado(resultado.tipoDocumento !== 'DESCONHECIDO' ? resultado.tipoDocumento : (cpfVal ? 'CPF' : 'RG'));
      setFotoDocPreview(resultado.fotoDocumentoBase64);
      setFotoRostoPreview(resultado.fotoRostoBase64);

      setModo('resultado');
      emitirSomSucesso();
      if ('vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100]); } catch {}
      }
    } catch (err: any) {
      console.error('[ModalOCR] Erro no processamento:', err);
      setErro('Falha ao processar o documento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setCarregandoOcr(false);
    }
  };

  const girarImagemEReprocessar = async () => {
    if (!fotoDocPreview) return;
    const novaRotacao = (rotacaoManual + 90) % 360;
    setRotacaoManual(novaRotacao);

    setCarregandoOcr(true);
    setStatusTexto('Girando documento em 90 graus...');
    try {
      const imgGirada = await prepararImagemCanvas(fotoDocPreview, 90, 'original');
      setFotoDocPreview(imgGirada.dataUrl);
      await processarImagem(imgGirada.dataUrl);
    } catch (err: any) {
      setErro('Erro ao girar imagem: ' + err.message);
      setCarregandoOcr(false);
    }
  };

  const handleConfirmar = () => {
    const docLimpo = documentoEditado.trim() || cpfEditado.trim() || rgEditado.trim();
    const nomeLimpo = nomeEditado.trim();

    if (!docLimpo) {
      setErro('Por favor, confirme ou preencha o documento antes de salvar.');
      return;
    }

    onDadosConfirmados({
      nomeCompleto: nomeLimpo,
      documento: docLimpo,
      tipoDocumento: tipoDocEditado,
      cpf: cpfEditado.trim() || undefined,
      rg: rgEditado.trim() || undefined,
      cnhRegistro: dadosOcr?.cnhRegistro,
      validade: dadosOcr?.validade,
      fotoDocumentoBase64: fotoDocPreview,
      fotoRostoBase64: fotoRostoPreview,
      empresa: dadosOcr?.empresaSugerida
    });

    onFechar();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto relative">
        
        {/* Cabeçalho do Leitor OCR */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scan className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                Leitor OCR de Documentos
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="text-emerald-400 font-bold">● 100% Gratuito & PWA</span>
                <span>• Pré-processamento Otsu & Módulo 11</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro / Aviso */}
        {erro && (
          <div className="bg-red-950/70 border border-red-500/50 p-3 rounded-2xl text-xs text-red-200 flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-red-300">Atenção na Leitura:</strong>
              <p>{erro}</p>
            </div>
          </div>
        )}

        {/* Barra de Progresso do OCR */}
        {carregandoOcr && (
          <div className="bg-slate-950/95 border border-emerald-500/40 p-5 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                {statusTexto || 'Processando OCR no navegador...'}
              </span>
              <span className="font-mono text-emerald-300 font-bold">{progressoOcr}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                style={{ width: `${progressoOcr}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Removendo sombras, binarizando caracteres e validando dígitos matematicamente...
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FRENTE 1: CÂMERA AO VIVO COM GUIA VISUAL TRACEJADO E DICAS NA GUARITA     */}
        {/* ========================================================================= */}
        {!carregandoOcr && modo === 'camera' && (
          <div className="space-y-3">
            
            {/* Barra de Controles Rápidos da Câmera (Formato e Lanterna) */}
            <div className="flex items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormatoDocumento('horizontal')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                    formatoDocumento === 'horizontal'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>RG / CNH / CIN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatoDocumento('vertical')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                    formatoDocumento === 'vertical'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Crachá Vertical</span>
                </button>
              </div>

              {lanternaSuportada && (
                <button
                  type="button"
                  onClick={alternarLanterna}
                  className={`p-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                    lanternaAtiva
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="Ligar/Desligar Flash"
                >
                  {lanternaAtiva ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                  <span className="text-[10px] hidden sm:inline">{lanternaAtiva ? 'Flash Ligado' : 'Flash'}</span>
                </button>
              )}
            </div>

            {/* Viewport da Câmera com Retângulo Tracejado e Cantoneiras de Enquadramento */}
            <div 
              ref={containerCameraRef}
              className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border-2 border-slate-700 shadow-2xl"
            >
              <video ref={videoRef} className="w-full h-full object-cover" />

              {/* RETÂNGULO TRACEJADO GUIA VISUAL DE ENQUADRAMENTO */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-3 sm:p-5">
                <div 
                  ref={guiaRetanguloRef}
                  className={`w-full relative flex flex-col justify-between p-3.5 transition-all duration-300 ${
                    formatoDocumento === 'horizontal'
                      ? 'max-w-[340px] aspect-[1.586/1]'
                      : 'max-w-[240px] aspect-[1/1.35]'
                  } border-2 border-dashed border-emerald-400 rounded-2xl bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.3)]`}
                >
                  {/* Cantoneiras reforçadas no retângulo tracejado */}
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-300 rounded-tl-md" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-300 rounded-tr-md" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-300 rounded-bl-md" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-300 rounded-br-md" />

                  {/* Badge Superior */}
                  <div className="flex justify-between items-center text-[10px] text-emerald-300 font-mono">
                    <span className="bg-slate-950/85 px-2 py-0.5 rounded border border-emerald-500/40">
                      Enquadre o documento aqui
                    </span>
                    <span className="bg-slate-950/85 px-2 py-0.5 rounded border border-emerald-500/40 font-bold uppercase">
                      {formatoDocumento === 'horizontal' ? 'ID-1 (RG / CNH)' : 'Crachá'}
                    </span>
                  </div>

                  {/* Linha laser de varredura animada */}
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] animate-pulse" />

                  {/* Aviso Inferior */}
                  <div className="text-[10px] text-emerald-300 text-center bg-slate-950/85 py-0.5 px-2 rounded border border-emerald-500/40 self-center">
                    Mantenha o documento paralelo e sem sombras
                  </div>
                </div>
              </div>
            </div>

            {/* Dica Dinâmica da Guarita (Alterna a cada 4s) */}
            <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 text-xs text-slate-300 shadow-xs">
              <span className="text-base select-none">{DICAS_GUARITA[indiceDica].icone}</span>
              <p className="text-[11px] font-semibold text-emerald-300 truncate">
                {DICAS_GUARITA[indiceDica].texto}
              </p>
            </div>

            {/* Botões de Ação da Câmera */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={capturarFotoDaCamera}
                className="py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition uppercase cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                Capturar Foto
              </button>

              <button
                type="button"
                onClick={() => {
                  pararCamera();
                  setModo('upload');
                  fileInputRef.current?.click();
                }}
                className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Galeria / Arquivo
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODO 2: UPLOAD DE ARQUIVO MANUAL                                          */}
        {/* ========================================================================= */}
        {!carregandoOcr && modo === 'upload' && (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">Clique para selecionar foto do documento</h4>
                <p className="text-xs text-slate-400 mt-1">Formatos aceitos: JPG, PNG, WEBP (RG, CNH, CPF ou Crachá)</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModo('camera');
                  iniciarCamera();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Voltar para a Câmera
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FRENTE 3: RESULTADO DA EXTRAÇÃO E CONFERÊNCIA RIGOROSA                    */}
        {/* ========================================================================= */}
        {!carregandoOcr && modo === 'resultado' && (
          <div className="space-y-4">
            {/* Card com as Fotos do Documento e Face Recortada */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
              {fotoDocPreview ? (
                <div className="relative w-28 h-20 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 shadow-md">
                  <img src={fotoDocPreview} alt="Documento Recortado" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/90 text-emerald-400 px-1 py-0.5 rounded font-mono">
                    Doc
                  </span>
                </div>
              ) : (
                <div className="w-28 h-20 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center text-slate-600">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              {fotoRostoPreview && (
                <div className="relative w-16 h-20 bg-slate-900 rounded-xl overflow-hidden border border-emerald-500/40 flex-shrink-0 shadow-md">
                  <img src={fotoRostoPreview} alt="Face Recortada" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/90 text-emerald-400 px-1 py-0.5 rounded font-mono">
                    Face
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    tipoDocEditado === 'CNH' ? 'bg-purple-950 text-purple-300 border-purple-500/40' :
                    tipoDocEditado === 'RG' ? 'bg-blue-950 text-blue-300 border-blue-500/40' :
                    tipoDocEditado === 'CIN' ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40' :
                    'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {tipoDocEditado} Detectado
                  </span>

                  {dadosOcr?.confianca ? (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Confiança: {dadosOcr.confianca}%
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-slate-300 truncate font-semibold">
                  {nomeEditado || 'Nome não reconhecido'}
                </p>

                <button
                  type="button"
                  onClick={girarImagemEReprocessar}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold pt-1 transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Girar 90° e re-analisar
                </button>
              </div>
            </div>

            {/* Campos de Conferência e Ajuste Rápido */}
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              {/* 1. Nome do Titular */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Nome do Titular *</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Campo '2 e 1 NOME E SOBRENOME'</span>
                </label>
                <input
                  type="text"
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  placeholder="Nome do titular"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold uppercase focus:outline-hidden focus:border-emerald-500 tracking-wide"
                  required
                />
              </div>

              {/* 2. CPF e RG Lados a Lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Campo CPF (4d) */}
                <div className={`p-2.5 rounded-xl border transition ${
                  documentoEditado === cpfEditado && cpfEditado
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                    <span>4d CPF</span>
                    {validarCPF(cpfEditado) ? (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Válido
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">11 dígitos</span>
                    )}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={cpfEditado}
                      onChange={(e) => {
                        const val = e.target.value;
                        const limpo = val.replace(/\D/g, '');
                        const formatado = limpo.length === 11 && validarCPF(limpo) ? formatarCPF(limpo) : val;
                        setCpfEditado(formatado);
                        if (documentoEditado === cpfEditado) {
                          setDocumentoEditado(formatado);
                        }
                      }}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-white font-bold focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentoEditado(cpfEditado);
                        setTipoDocEditado('CPF');
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                        documentoEditado === cpfEditado
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                      }`}
                      title="Usar CPF como Documento Principal"
                    >
                      {documentoEditado === cpfEditado ? 'Principal' : 'Usar'}
                    </button>
                  </div>
                </div>

                {/* Campo RG (4c) */}
                <div className={`p-2.5 rounded-xl border transition ${
                  documentoEditado === rgEditado && rgEditado
                    ? 'bg-blue-950/40 border-blue-500/60'
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                    <span>4c Doc. Identidade / RG</span>
                    <span className="text-[10px] text-blue-400 font-bold bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/30">
                      Órgão / UF
                    </span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={rgEditado}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRgEditado(val);
                        if (documentoEditado === rgEditado) {
                          setDocumentoEditado(val);
                        }
                      }}
                      placeholder="43048684 SSP/SP"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-white font-bold focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentoEditado(rgEditado);
                        setTipoDocEditado('RG');
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                        documentoEditado === rgEditado
                          ? 'bg-blue-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-blue-300'
                      }`}
                      title="Usar RG como Documento Principal"
                    >
                      {documentoEditado === rgEditado ? 'Principal' : 'Usar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Documento Principal Ativo para o Cadastro */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Documento Selecionado para Liberação *</span>
                  <span className="text-[10px] text-slate-400 font-mono">Tipo: {tipoDocEditado}</span>
                </label>
                <input
                  type="text"
                  value={documentoEditado}
                  onChange={(e) => setDocumentoEditado(e.target.value)}
                  placeholder="Número que será salvo no cadastro"
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3.5 py-2 text-sm font-mono text-emerald-400 font-black focus:outline-hidden focus:border-emerald-400"
                  required
                />
              </div>

              {/* Metadados Adicionais da CNH (Registro, Validade, Categoria) */}
              {(dadosOcr?.cnhRegistro || dadosOcr?.validade || dadosOcr?.categoria || dadosOcr?.dataNascimento) && (
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex flex-wrap items-center gap-2 text-[11px]">
                  {dadosOcr.cnhRegistro && (
                    <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-700 text-slate-300 font-mono">
                      <strong className="text-purple-400">5 Registro:</strong> {dadosOcr.cnhRegistro}
                    </span>
                  )}
                  {dadosOcr.validade && (
                    <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-700 text-slate-300 font-mono">
                      <strong className="text-emerald-400">4b Validade:</strong> {dadosOcr.validade}
                    </span>
                  )}
                  {dadosOcr.categoria && (
                    <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-700 text-slate-300 font-mono">
                      <strong className="text-amber-400">9 Cat:</strong> {dadosOcr.categoria}
                    </span>
                  )}
                  {dadosOcr.dataNascimento && (
                    <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-700 text-slate-300 font-mono">
                      <strong className="text-blue-400">3 Nasc:</strong> {dadosOcr.dataNascimento}
                    </span>
                  )}
                </div>
              )}

              {/* Informação sobre Proteção Anti-Números Aleatórios */}
              {dadosOcr?.numerosRejeitados && dadosOcr.numerosRejeitados.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>{dadosOcr.numerosRejeitados.length} número(s) descartado(s):</strong> datas e sequências inválidas foram ignoradas automaticamente.
                  </span>
                </div>
              )}

              {/* Calibração de Zonas e Linhas Identificadas com Toque Único */}
              {dadosOcr?.linhasDetectadas && dadosOcr.linhasDetectadas.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Linhas lidas no documento (toque para preencher):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {dadosOcr.linhasDetectadas.map((linha, idx) => (
                      <div key={idx} className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-300 truncate font-mono flex-1">{linha}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setNomeEditado(linha)}
                            className="text-[9px] bg-slate-800 hover:bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded font-bold transition cursor-pointer"
                            title="Usar como Nome"
                          >
                            Nome
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const limpo = linha.replace(/\D/g, '');
                              if (limpo.length === 11 && validarCPF(limpo)) {
                                setDocumentoEditado(formatarCPF(limpo));
                              } else {
                                setDocumentoEditado(linha);
                              }
                            }}
                            className="text-[9px] bg-slate-800 hover:bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded font-bold transition cursor-pointer"
                            title="Usar como Documento"
                          >
                            Doc
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação Final */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setModo('camera');
                  iniciarCamera();
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Tirar Outra Foto
              </button>

              <button
                type="button"
                onClick={handleConfirmar}
                className="py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-lg active:scale-[0.98] uppercase cursor-pointer"
              >
                <Check className="w-4 h-4" /> Preencher Cadastro
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={lidarComArquivoSelecionado}
          className="hidden"
        />
      </div>
    </div>
  );
}
