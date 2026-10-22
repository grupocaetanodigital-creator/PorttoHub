import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  Radio, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Camera, 
  Keyboard, 
  Volume2, 
  RefreshCw, 
  X, 
  VideoOff, 
  Check, 
  Scan,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export interface DadosLeituraNFC {
  codigo: string;
  serialNumber?: string;
  payload?: string;
  tipoRegistro?: string;
  dataHora: string;
}

export interface LeitorNFCProps {
  onTagLida: (codigo: string, dadosCompletos?: DadosLeituraNFC) => void;
  codigoEsperado?: string;
  titulo?: string;
  subtitulo?: string;
  modoInline?: boolean;
  onFechar?: () => void;
}

/**
 * Emite som nativo de sucesso via Web Audio API (sem dependência de arquivos externos)
 */
function emitirSomSucesso() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primeiro tom suave (880 Hz - Lá 5)
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

    // Segundo tom agudo confirmativo (1320 Hz - Mi 6)
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
  } catch (e) {
    console.warn('[LeitorNFC] Web Audio API indisponível:', e);
  }
}

/**
 * Emite som nativo de alerta/erro
 */
function emitirSomErro() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(220, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

export default function LeitorNFC({
  onTagLida,
  codigoEsperado,
  titulo = 'Leitura de Tags & Cartões NFC',
  subtitulo = 'Aproxime o cartão ou tag física da traseira do aparelho',
  modoInline = false,
  onFechar
}: LeitorNFCProps) {
  // Verificação de compatibilidade nativa com Web NFC
  const nfcSuportado = typeof window !== 'undefined' && 'NDEFReader' in window;

  const [abaAtiva, setAbaAtiva] = useState<'nfc' | 'qr' | 'manual'>(nfcSuportado ? 'nfc' : 'qr');
  const [lendoNfc, setLendoNfc] = useState(false);
  const [erroNfc, setErroNfc] = useState<string | null>(null);
  const [tagSucesso, setTagSucesso] = useState<DadosLeituraNFC | null>(null);

  // Estados para alternativa QR Code
  const [lendoQr, setLendoQr] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Estados para alternativa Digitação Manual
  const [codigoManual, setCodigoManual] = useState('');

  // Controle de abort do NDEFReader
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Se o dispositivo for compatível, inicia a leitura automaticamente ao abrir
    if (nfcSuportado && abaAtiva === 'nfc') {
      iniciarLeituraNFC();
    }

    return () => {
      pararLeituraNFC();
      pararCameraQr();
    };
  }, [abaAtiva]);

  // Limpa o leitor quando desmonta
  useEffect(() => {
    return () => {
      pararLeituraNFC();
      pararCameraQr();
    };
  }, []);

  /**
   * Inicia a leitura de Tags/Cartões via Web NFC API (NDEFReader)
   */
  const iniciarLeituraNFC = async () => {
    setErroNfc(null);
    setTagSucesso(null);

    if (!nfcSuportado) {
      setErroNfc('A Web NFC API não é suportada neste navegador ou sistema.');
      return;
    }

    try {
      // Cancela scan anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal: controller.signal });

      setLendoNfc(true);

      ndef.onreading = (event: any) => {
        let serial = event.serialNumber || '';
        let payloadTexto = '';
        let tipoRec = 'NDEF';

        if (event.message && event.message.records && event.message.records.length > 0) {
          for (const record of event.message.records) {
            tipoRec = record.recordType || 'NDEF';
            if (record.recordType === 'text') {
              try {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                payloadTexto = textDecoder.decode(record.data);
                break;
              } catch (e) {
                console.warn('Erro decodificando NDEF text:', e);
              }
            } else if (record.recordType === 'url') {
              try {
                const textDecoder = new TextDecoder('utf-8');
                payloadTexto = textDecoder.decode(record.data);
                break;
              } catch (e) {}
            } else if (record.data) {
              try {
                const textDecoder = new TextDecoder('utf-8');
                payloadTexto = textDecoder.decode(record.data);
              } catch (e) {}
            }
          }
        }

        // Determina o código principal (prioriza payload de texto se houver, ou o serial UID da tag)
        const codigoFinal = (payloadTexto || serial || '').trim().toUpperCase();

        if (codigoFinal) {
          const dados: DadosLeituraNFC = {
            codigo: codigoFinal,
            serialNumber: serial,
            payload: payloadTexto,
            tipoRegistro: tipoRec,
            dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };

          // Validação se há um código esperado
          if (codigoEsperado && codigoFinal !== codigoEsperado.trim().toUpperCase()) {
            emitirSomErro();
            if ('vibrate' in navigator) {
              try { navigator.vibrate([200, 100, 200]); } catch {}
            }
            setErroNfc(`Tag lida (${codigoFinal}) não confere com a esperada (${codigoEsperado.trim().toUpperCase()}).`);
            return;
          }

          // Leitura com sucesso!
          setTagSucesso(dados);
          setLendoNfc(false);

          // Feedback Sonoro Nativo
          emitirSomSucesso();

          // Feedback Háptico (Vibração)
          if ('vibrate' in navigator) {
            try { navigator.vibrate([120, 80, 140]); } catch {}
          }

          // Callback para o componente pai
          onTagLida(codigoFinal, dados);
        }
      };

      ndef.onreadingerror = (errorEvent: any) => {
        console.warn('[LeitorNFC] Erro durante aproximação da tag:', errorEvent);
        setErroNfc('A tag foi aproximada mas não pôde ser lida. Mantenha o cartão firme na traseira do celular.');
        emitirSomErro();
      };

    } catch (err: any) {
      console.error('[LeitorNFC] Erro scan:', err);
      setLendoNfc(false);

      if (err.name === 'NotAllowedError') {
        setErroNfc('Permissão negada para leitura NFC. Conceda permissão nas configurações do navegador.');
      } else if (err.name === 'NotSupportedError') {
        setErroNfc('NFC não está ativado no dispositivo. Ative o NFC nas configurações do seu Android.');
      } else if (err.name === 'AbortError') {
        // Leitura cancelada intencionalmente
      } else {
        setErroNfc(`Erro ao iniciar leitor NFC: ${err.message || 'Falha no sensor'}`);
      }
    }
  };

  const pararLeituraNFC = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLendoNfc(false);
  };

  /**
   * Câmera QR Code (Alternativa para dispositivos sem NFC ou iOS)
   */
  const iniciarCameraQr = async () => {
    setErroCamera(null);
    setLendoQr(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const barcodeDetector = ('BarcodeDetector' in window)
        ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        : null;

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        try {
          let detected: string | null = null;

          if (barcodeDetector) {
            try {
              const codes = await barcodeDetector.detect(videoRef.current);
              if (codes && codes.length > 0) detected = codes[0].rawValue;
            } catch {}
          }

          if (!detected && ctx) {
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imgData.data, canvas.width, canvas.height);
            if (qrResult?.data) detected = qrResult.data;
          }

          if (detected) {
            const codigoDetectado = detected.trim().toUpperCase();
            pararCameraQr();

            if (codigoEsperado && codigoDetectado !== codigoEsperado.trim().toUpperCase()) {
              emitirSomErro();
              setErroCamera(`QR lido (${codigoDetectado}) não confere com o esperado (${codigoEsperado}).`);
              return;
            }

            const dados: DadosLeituraNFC = {
              codigo: codigoDetectado,
              tipoRegistro: 'QR_CODE',
              dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };

            setTagSucesso(dados);
            emitirSomSucesso();
            if ('vibrate' in navigator) {
              try { navigator.vibrate([120, 80, 140]); } catch {}
            }
            onTagLida(codigoDetectado, dados);
          }
        } catch (e) {
          console.error('[LeitorNFC] Erro frame QR:', e);
        }
      }, 250);

    } catch (err: any) {
      console.error('[LeitorNFC] Erro câmera:', err);
      setLendoQr(false);
      setErroCamera('Não foi possível acessar a câmera: ' + err.message);
    }
  };

  const pararCameraQr = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setLendoQr(false);
  };

  /**
   * Confirmação de Digitação Manual
   */
  const handleConfirmarManual = (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpo = codigoManual.trim().toUpperCase();
    if (!codigoLimpo) return;

    if (codigoEsperado && codigoLimpo !== codigoEsperado.trim().toUpperCase()) {
      emitirSomErro();
      setErroNfc(`Código informado (${codigoLimpo}) difere do esperado (${codigoEsperado}).`);
      return;
    }

    const dados: DadosLeituraNFC = {
      codigo: codigoLimpo,
      tipoRegistro: 'DIGITACAO_MANUAL',
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setTagSucesso(dados);
    emitirSomSucesso();
    onTagLida(codigoLimpo, dados);
  };

  return (
    <div className={`w-full ${modoInline ? '' : 'bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-800'}`}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
              {titulo}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {subtitulo}
          </p>
        </div>

        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Alerta de Compatibilidade quando 'NDEFReader' in window é Falso */}
      {!nfcSuportado && (
        <div className="mb-4 bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Web NFC não disponível neste dispositivo/navegador
          </div>
          <p className="text-slate-300 leading-relaxed">
            A <strong>Web NFC API</strong> requer o Google Chrome no Android com o chip NFC ativado nas configurações do celular. No iOS (iPhone/iPad Safari) ou PCs sem leitor, utilize as alternativas abaixo:
          </p>
        </div>
      )}

      {/* Tabs / Alternativas de Leitura */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/70 rounded-2xl border border-slate-800 mb-5">
        <button
          type="button"
          onClick={() => {
            setAbaAtiva('nfc');
            pararCameraQr();
          }}
          disabled={!nfcSuportado}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            abaAtiva === 'nfc'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : !nfcSuportado
              ? 'text-slate-600 cursor-not-allowed opacity-50'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Aproximar NFC</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('qr');
            pararLeituraNFC();
            iniciarCameraQr();
          }}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            abaAtiva === 'qr'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Ler QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('manual');
            pararLeituraNFC();
            pararCameraQr();
          }}
          className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            abaAtiva === 'manual'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>Digitar Código</span>
        </button>
      </div>

      {/* CARD VERDE DE SUCESSO QUANDO TAG FOR LIDA */}
      {tagSucesso && (
        <div className="mb-5 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-slate-900 border-2 border-emerald-400 p-5 rounded-2xl shadow-xl animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Tag Validada com Sucesso
                </span>
                <h4 className="font-mono text-xl sm:text-2xl font-black text-white tracking-wide mt-1">
                  {tagSucesso.codigo}
                </h4>
              </div>
            </div>

            <span className="text-[11px] font-mono text-emerald-300/80 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
              {tagSucesso.dataHora}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-500/30 grid grid-cols-2 gap-2 text-xs text-slate-300">
            {tagSucesso.serialNumber && (
              <div>
                <span className="text-slate-400 block text-[10px]">Serial UID Físico:</span>
                <strong className="font-mono text-emerald-300">{tagSucesso.serialNumber}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[10px]">Origem da Leitura:</span>
              <strong className="text-white">{tagSucesso.tipoRegistro}</strong>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTagSucesso(null);
                if (abaAtiva === 'nfc') iniciarLeituraNFC();
                if (abaAtiva === 'qr') iniciarCameraQr();
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-4 h-4" /> Ler Outra Tag
            </button>
          </div>
        </div>
      )}

      {/* ERROS E ALERTAS */}
      {erroNfc && (
        <div className="mb-4 bg-red-950/60 border border-red-500/50 p-4 rounded-2xl text-xs text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <strong className="font-bold text-red-300 block">Falha na Leitura NFC:</strong>
            <p>{erroNfc}</p>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: WEB NFC */}
      {abaAtiva === 'nfc' && (
        <div className="space-y-4">
          {/* Animação e Radar de "Aguardando Aproximação..." */}
          <div className="relative bg-slate-950/90 rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center overflow-hidden min-h-[220px]">
            {lendoNfc ? (
              <>
                {/* Ondas concêntricas de radar NFC */}
                <div className="absolute w-44 h-44 rounded-full border border-emerald-500/20 animate-ping pointer-events-none" />
                <div className="absolute w-32 h-32 rounded-full border border-emerald-500/40 animate-pulse pointer-events-none" />

                <div className="relative z-10 w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-4">
                  <Smartphone className="w-10 h-10 animate-bounce" />
                </div>

                <div className="relative z-10 space-y-1">
                  <h4 className="font-bold text-base text-emerald-400 flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Aguardando Aproximação...
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs">
                    Encoste o cartão ou chaveiro NFC na <strong>parte traseira</strong> do smartphone ou tablet.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                  <Radio className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Leitor NFC Pausado</h4>
                  <p className="text-xs text-slate-400">Clique no botão abaixo para ativar a leitura instantânea.</p>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Toque Grande: Iniciar / Pausar Leitura NFC */}
          <div className="space-y-2">
            {!lendoNfc ? (
              <button
                type="button"
                onClick={iniciarLeituraNFC}
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] uppercase tracking-wide cursor-pointer"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                Iniciar Leitura NFC
              </button>
            ) : (
              <button
                type="button"
                onClick={pararLeituraNFC}
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                Pausar Leitor NFC
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Beep sonoro automático ao ler
              </span>
              {codigoEsperado && (
                <span className="font-mono text-emerald-400">
                  Esperado: {codigoEsperado}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: CÂMERA QR CODE */}
      {abaAtiva === 'qr' && (
        <div className="space-y-4">
          {erroCamera && (
            <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              {erroCamera}
            </div>
          )}

          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video sm:aspect-[4/3] flex items-center justify-center border-2 border-blue-500 shadow-inner">
            <video ref={videoRef} className="w-full h-full object-cover" />

            {/* Mira com efeito de escaner */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 animate-pulse shadow-md" />
              </div>
            </div>

            <button
              type="button"
              onClick={lendoQr ? pararCameraQr : iniciarCameraQr}
              className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl transition shadow-md border border-slate-700"
              title={lendoQr ? 'Pausar Câmera' : 'Ativar Câmera'}
            >
              {lendoQr ? <VideoOff className="w-5 h-5 text-red-400" /> : <Camera className="w-5 h-5 text-blue-400" />}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Aponte a câmera para o QR Code impresso na placa do ponto ou cartão.
          </p>
        </div>
      )}

      {/* CONTEÚDO DA ABA: DIGITAÇÃO MANUAL */}
      {abaAtiva === 'manual' && (
        <form onSubmit={handleConfirmarManual} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
              Código / Identificador da Tag
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ex: TAG-HALL-A1 ou UID do Cartão"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value)}
              className="w-full min-h-[52px] bg-slate-950 border border-slate-700 rounded-2xl px-4 text-base font-mono uppercase text-white focus:outline-hidden focus:border-emerald-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] uppercase tracking-wide cursor-pointer"
          >
            <Check className="w-5 h-5" /> Confirmar Código Manual
          </button>
        </form>
      )}
    </div>
  );
}
