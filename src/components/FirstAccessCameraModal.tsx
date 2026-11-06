import React, { useState, useRef, useEffect } from 'react';
import { useTurnoCerto } from '../lib/store';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Upload } from 'lucide-react';

export const FirstAccessCameraModal: React.FC = () => {
  const { currentUser, completeFirstAccess, isLoading } = useTurnoCerto();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera
  const startCamera = async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sem suporte direto a câmera.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCameraPermission(true);
    } catch (err: any) {
      console.warn('Erro ao inicializar câmera:', err);
      setHasCameraPermission(false);
      setCameraError(
        'Não foi possível acessar a câmera do dispositivo. Permita o acesso à câmera ou use o envio de foto alternativo.'
      );
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraFacing]);

  // Capture frame
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front camera for natural mirror reflection
    if (cameraFacing === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);

    // Stop stream to save battery
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirm = async () => {
    if (!capturedPhoto) return;
    await completeFirstAccess(capturedPhoto);
  };

  // Fallback preset demo photo for sandbox environments where browser blocks webcam
  const handleUsePresetPhoto = () => {
    const demoFaces = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80'
    ];
    const chosen = demoFaces[Math.floor(Math.random() * demoFaces.length)];
    setCapturedPhoto(chosen);
  };

  // File upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCapturedPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Captura de Foto de Identidade
              </h2>
              <p className="text-xs text-slate-400">
                1º Acesso Obrigatório · Registro Biométrico de Posto
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
            Regra Módulo 1
          </span>
        </div>

        {/* Content / Camera Viewport */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-300 text-center mb-4 max-w-md">
            Olá, <strong className="text-white">{currentUser?.full_name}</strong>. Para garantir a segurança operacional e identificação no posto de trabalho, tire uma foto nítida do seu rosto.
          </p>

          <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700 flex items-center justify-center shadow-inner">
            {capturedPhoto ? (
              // Preview of captured photo
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : hasCameraPermission === false || cameraError ? (
              // Camera permission denied / fallback
              <div className="p-6 text-center flex flex-col items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-xs text-slate-300 font-medium mb-1">
                  Câmera não iniciada
                </p>
                <p className="text-[11px] text-slate-500 mb-4">
                  {cameraError || 'Acesso à câmera bloqueado no navegador.'}
                </p>
                <div className="space-y-2 w-full">
                  <button
                    type="button"
                    onClick={handleUsePresetPhoto}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Usar Foto de Demonstração
                  </button>
                  <label className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Arquivo de Imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              // Live camera stream
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraFacing === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />

                {/* Biometric Oval Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-60 border-2 border-amber-400/70 border-dashed rounded-[50%] shadow-[0_0_0_9999px_rgba(15,23,42,0.4)] flex items-center justify-center">
                    <span className="text-[10px] text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded font-mono">
                      Enquadre o Rosto
                    </span>
                  </div>
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={() =>
                    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'))
                  }
                  className="absolute bottom-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full backdrop-blur transition-colors"
                  title="Trocar câmera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="mt-6 w-full flex items-center justify-center gap-3">
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tirar Outra Foto</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirmar e Salvar</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {hasCameraPermission !== false && !cameraError && (
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capturar Foto do Rosto</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>A foto será salva no Supabase Storage e associada ao seu crachá digital.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
