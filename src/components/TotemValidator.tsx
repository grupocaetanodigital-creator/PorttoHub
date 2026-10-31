import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Scan, 
  Building2, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  Lock, 
  Unlock, 
  QrCode, 
  ShieldAlert, 
  Radio, 
  SlidersHorizontal,
  Volume2
} from 'lucide-react';
import { Condominium, Resident, AccessLog, VisitorPass } from '../types';
import { audioService } from '../services/audioService';

interface TotemValidatorProps {
  condo: Condominium;
  residents: Resident[];
  visitorPasses: VisitorPass[];
  onNewLog: (log: AccessLog) => void;
}

export const TotemValidator: React.FC<TotemValidatorProps> = ({
  condo,
  residents,
  visitorPasses,
  onNewLog
}) => {
  // Camera & Device states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Recognition Simulation States
  const [scanningStatus, setScanningStatus] = useState<'idle' | 'detecting' | 'matched' | 'denied'>('idle');
  const [lastMatchResult, setLastMatchResult] = useState<{
    status: 'Liberado' | 'Negado' | 'Alerta';
    name?: string;
    unit?: string;
    type?: string;
    reason?: string;
    avatar?: string;
    timestamp?: string;
    confidenceScore?: number;
    livenessScore?: number;
    method?: string;
  } | null>(null);

  // Relay gate states
  const [relayGateStatus, setRelayGateStatus] = useState<{
    pedestrian: boolean;
    vehicle: boolean;
    countdown: number;
  }>({
    pedestrian: false,
    vehicle: false,
    countdown: 0
  });

  const [livenessScore, setLivenessScore] = useState<number>(98.7);

  // Micro-fluctuation for liveness score to look real-time
  useEffect(() => {
    const interval = setInterval(() => {
      const variation = (Math.random() * 0.6 - 0.3);
      setLivenessScore(prev => Number(Math.min(99.8, Math.max(97.2, prev + variation)).toFixed(1)));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // --- CAMERA INITIALIZATION ---
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Câmera não disponível no ambiente ou permissão negada. O totem continuará funcionando perfeitamente via simulação biométrica.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Enumerate video devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      })
      .catch(err => console.log('Device enumeration error:', err));
  }, []);

  // Start camera on mount & change
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [selectedDeviceId, facingMode]);

  // --- CANVAS HUD ANIMATION LOOP ---
  useEffect(() => {
    let animationFrameId: number;

    const drawDetectionBox = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Bounding box centered on screen
        const boxWidth = canvas.width * 0.36;
        const boxHeight = boxWidth * 1.32;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2.2;

        // Visual scanner HUD line
        const hudColor = scanningStatus === 'matched' 
          ? '#10b981' 
          : scanningStatus === 'denied' 
          ? '#ef4444' 
          : scanningStatus === 'detecting'
          ? '#06b6d4'
          : '#38bdf8';

        ctx.strokeStyle = hudColor;
        ctx.lineWidth = 3;

        // Draw HUD Bracket Corners
        const lineLen = 32;
        // Top-left
        ctx.beginPath(); ctx.moveTo(boxX, boxY + lineLen); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + lineLen, boxY); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(boxX + boxWidth - lineLen, boxY); ctx.lineTo(boxX + boxWidth, boxY); ctx.lineTo(boxX + boxWidth, boxY + lineLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(boxX, boxY + boxHeight - lineLen); ctx.lineTo(boxX, boxY + boxHeight); ctx.lineTo(boxX + lineLen, boxY + boxHeight); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(boxX + boxWidth - lineLen, boxY + boxHeight); ctx.lineTo(boxX + boxWidth, boxY + boxHeight); ctx.lineTo(boxX + boxWidth, boxY + boxHeight - lineLen); ctx.stroke();

        // Target landmark points inside box
        ctx.fillStyle = hudColor;
        const points = [
          { x: boxX + boxWidth * 0.3, y: boxY + boxHeight * 0.36 }, // Left eye
          { x: boxX + boxWidth * 0.7, y: boxY + boxHeight * 0.36 }, // Right eye
          { x: boxX + boxWidth * 0.5, y: boxY + boxHeight * 0.55 }, // Nose
          { x: boxX + boxWidth * 0.35, y: boxY + boxHeight * 0.75 }, // Left mouth
          { x: boxX + boxWidth * 0.65, y: boxY + boxHeight * 0.75 }, // Right mouth
        ];
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Face Mesh Lines (simulated vector connection)
        ctx.lineWidth = 1;
        ctx.strokeStyle = hudColor === '#10b981' 
          ? 'rgba(16, 185, 129, 0.35)' 
          : hudColor === '#ef4444' 
          ? 'rgba(239, 68, 68, 0.35)' 
          : 'rgba(6, 182, 212, 0.3)';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.stroke();

        // Top HUD Status Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        const labelText = scanningStatus === 'matched' 
          ? '● FACE RECONHECIDA' 
          : scanningStatus === 'denied' 
          ? '✕ ACESSO NEGADO' 
          : scanningStatus === 'detecting'
          ? '⟳ COMPARANDO VETOR BIOMÉTRICO...'
          : '⌖ POSICIONE O ROSTO NO TOTEM';
        
        ctx.font = 'bold 12px Inter, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        ctx.fillRect(boxX, boxY - 28, textMetrics.width + 16, 22);

        ctx.fillStyle = hudColor;
        ctx.fillText(labelText, boxX + 8, boxY - 13);
      }

      animationFrameId = requestAnimationFrame(drawDetectionBox);
    };

    animationFrameId = requestAnimationFrame(drawDetectionBox);
    return () => cancelAnimationFrame(animationFrameId);
  }, [scanningStatus]);

  // Relay countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (relayGateStatus.pedestrian || relayGateStatus.vehicle) {
      timer = setInterval(() => {
        setRelayGateStatus(prev => {
          if (prev.countdown <= 1) {
            audioService.playGateRelayClick();
            return { pedestrian: false, vehicle: false, countdown: 0 };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [relayGateStatus.pedestrian, relayGateStatus.vehicle]);

  // --- RECOGNITION SIMULATION TRIGGER (ENFORCING STRICT TENANT SCOPE) ---
  const triggerRecognition = (mode: 'authorized' | 'blocked' | 'unknown' | 'qrcode') => {
    if (scanningStatus === 'detecting') return;
    setScanningStatus('detecting');

    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      const dateStr = now.toLocaleDateString('pt-BR');

      if (mode === 'authorized') {
        const activeResidents = residents.filter(r => r.status === 'Ativo');
        if (activeResidents.length === 0) {
          audioService.playDeniedBuzzer();
          setScanningStatus('denied');
          setLastMatchResult({
            status: 'Negado',
            name: 'Nenhum Morador Ativo',
            unit: condo.name,
            reason: 'Não há moradores ativos cadastrados neste condomínio.',
            timestamp: timeStr,
            method: 'Reconhecimento Facial'
          });
          return;
        }

        const resident = activeResidents[Math.floor(Math.random() * activeResidents.length)];
        audioService.playSuccessChime();
        audioService.playGateRelayClick();
        setScanningStatus('matched');

        setLastMatchResult({
          status: 'Liberado',
          name: resident.name,
          unit: resident.unit,
          type: resident.type,
          avatar: resident.avatar,
          timestamp: timeStr,
          confidenceScore: 99.4,
          livenessScore: livenessScore,
          method: 'Reconhecimento Facial'
        });

        // Trigger Pedestrian gate relay for 4 seconds
        setRelayGateStatus({
          pedestrian: true,
          vehicle: false,
          countdown: 4
        });

        // Dispatch access log
        const newLog: AccessLog = {
          id: `log_${Date.now()}`,
          condoId: condo.id, // Strictly scoped
          residentName: resident.name,
          unit: resident.unit || 'Geral',
          timestamp: timeStr,
          date: dateStr,
          status: 'Liberado',
          method: 'Reconhecimento Facial',
          gate: 'Portão Pedestre Social',
          confidenceScore: 99.4,
          livenessScore: livenessScore,
          photoUrl: resident.avatar
        };
        onNewLog(newLog);

      } else if (mode === 'blocked') {
        const blockedResidents = residents.filter(r => r.status === 'Bloqueado');
        const resident = blockedResidents.length > 0 
          ? blockedResidents[0] 
          : {
              name: 'Indivíduo Não Autorizado',
              unit: 'Registro Bloqueado',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
              type: 'Prestador'
            };

        audioService.playDeniedBuzzer();
        setScanningStatus('denied');

        setLastMatchResult({
          status: 'Negado',
          name: resident.name,
          unit: resident.unit,
          type: resident.type,
          reason: 'Cadastro Bloqueado ou Não Autorizado pela Administração',
          avatar: resident.avatar,
          timestamp: timeStr,
          confidenceScore: 98.1,
          livenessScore: livenessScore,
          method: 'Reconhecimento Facial'
        });

        const newLog: AccessLog = {
          id: `log_${Date.now()}`,
          condoId: condo.id, // Strictly scoped
          residentName: resident.name,
          unit: resident.unit || 'Geral',
          timestamp: timeStr,
          date: dateStr,
          status: 'Negado',
          method: 'Reconhecimento Facial',
          gate: 'Portão Pedestre Social',
          reason: 'Cadastro Bloqueado / Restrição Administrativa',
          confidenceScore: 98.1,
          livenessScore: livenessScore,
          photoUrl: resident.avatar
        };
        onNewLog(newLog);

      } else if (mode === 'unknown') {
        audioService.playDeniedBuzzer();
        setScanningStatus('denied');

        setLastMatchResult({
          status: 'Negado',
          name: 'Pessoa Desconhecida / Não Cadastrada',
          unit: 'Não Identificada',
          reason: `Rosto não encontrado no banco de dados biométrico de ${condo.name}`,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
          timestamp: timeStr,
          confidenceScore: 32.5,
          livenessScore: livenessScore,
          method: 'Reconhecimento Facial'
        });

        const newLog: AccessLog = {
          id: `log_${Date.now()}`,
          condoId: condo.id,
          residentName: 'Pessoa Não Identificada (Alerta)',
          unit: 'Portaria Externa',
          timestamp: timeStr,
          date: dateStr,
          status: 'Negado',
          method: 'Reconhecimento Facial',
          gate: 'Portão Pedestre Social',
          reason: 'Biometria Inexistente no Condomínio',
          confidenceScore: 32.5,
          livenessScore: livenessScore
        };
        onNewLog(newLog);

      } else if (mode === 'qrcode') {
        const validPass = visitorPasses.find(p => p.status === 'Válido');
        if (validPass) {
          audioService.playSuccessChime();
          audioService.playGateRelayClick();
          setScanningStatus('matched');

          setLastMatchResult({
            status: 'Liberado',
            name: `${validPass.visitorName} (${validPass.type})`,
            unit: validPass.unitDestination,
            type: validPass.type,
            reason: `Autorizado por ${validPass.residentAuthorizer}`,
            timestamp: timeStr,
            confidenceScore: 100,
            livenessScore: 100,
            method: 'QR Code'
          });

          setRelayGateStatus({
            pedestrian: true,
            vehicle: false,
            countdown: 4
          });

          const newLog: AccessLog = {
            id: `log_${Date.now()}`,
            condoId: condo.id,
            residentName: validPass.visitorName,
            unit: validPass.unitDestination,
            timestamp: timeStr,
            date: dateStr,
            status: 'Liberado',
            method: 'QR Code',
            gate: 'Eclusa de Pedestres / Visitantes',
            confidenceScore: 100,
            livenessScore: 100
          };
          onNewLog(newLog);
        } else {
          audioService.playDeniedBuzzer();
          setScanningStatus('denied');
          setLastMatchResult({
            status: 'Negado',
            name: 'Convite QR Inválido ou Expirado',
            unit: 'Nenhum convite válido',
            reason: 'Código QR expirado ou não emitido para este condomínio',
            timestamp: timeStr,
            method: 'QR Code'
          });
        }
      }

      // Reset scanning idle state after 5.5s
      setTimeout(() => {
        setScanningStatus('idle');
      }, 5500);

    }, 1100);
  };

  // Manual trigger gate relay
  const triggerManualRelay = (type: 'pedestrian' | 'vehicle') => {
    audioService.playGateRelayClick();
    setRelayGateStatus({
      pedestrian: type === 'pedestrian',
      vehicle: type === 'vehicle',
      countdown: type === 'pedestrian' ? 4 : 6
    });

    const now = new Date();
    const newLog: AccessLog = {
      id: `log_${Date.now()}`,
      condoId: condo.id,
      residentName: 'Operador / Portaria Central',
      unit: 'Guarita',
      timestamp: now.toLocaleTimeString(),
      date: now.toLocaleDateString('pt-BR'),
      status: 'Liberado',
      method: 'Acionamento Remoto',
      gate: type === 'pedestrian' ? 'Portão Pedestre Social' : 'Portão Garagem Veículos'
    };
    onNewLog(newLog);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Warning Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              Totem Validador Facial &bull; <span className="text-cyan-400">{condo.name}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Escopo biométrico estrito do condomínio <code className="text-emerald-400 font-mono">{condo.code}</code> ({residents.length} moradores aptos).
            </p>
          </div>
        </div>

        {/* Camera Selector & Facing Toggle */}
        <div className="flex items-center space-x-2">
          {cameraDevices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 max-w-[180px] truncate"
            >
              {cameraDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Câmera ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center space-x-1 transition"
            title="Alternar Câmera Frontal / Traseira"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIDEO STREAM & MATCH RESULT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* VIDEO STREAM & CANVAS HUD (7 COLS) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-3xl p-4 flex flex-col space-y-4">
          <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            
            {/* HTML5 Video element */}
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Canvas Overlay for Facial Recognition HUD */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Camera Error Fallback UI */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-white text-sm">Modo de Simulação Ativo</h4>
                <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={startCamera}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Ativar Webcam</span>
                </button>
              </div>
            )}

            {/* Scanner HUD Footer Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/80 z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold text-slate-200">
                  Anti-Spoofing / Liveness: <strong className="text-cyan-400 font-mono">{livenessScore}%</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                ● AO VIVO (30 FPS)
              </span>
            </div>
          </div>

          {/* SIMULATION TEST BUTTONS */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Simulador de Validação Biométrica (Ações de Teste)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              <button
                onClick={() => triggerRecognition('authorized')}
                disabled={scanningStatus === 'detecting'}
                className="flex items-center justify-center space-x-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Rosto Autorizado</span>
              </button>

              <button
                onClick={() => triggerRecognition('blocked')}
                disabled={scanningStatus === 'detecting'}
                className="flex items-center justify-center space-x-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 py-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">Rosto Bloqueado</span>
              </button>

              <button
                onClick={() => triggerRecognition('qrcode')}
                disabled={scanningStatus === 'detecting'}
                className="flex items-center justify-center space-x-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 py-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span className="truncate">Ler Convite QR</span>
              </button>

              <button
                onClick={() => triggerRecognition('unknown')}
                disabled={scanningStatus === 'detecting'}
                className="flex items-center justify-center space-x-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 py-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="truncate">Desconhecido</span>
              </button>

            </div>
          </div>
        </div>

        {/* MATCH RESULT CARD & HARDWARE RELAY CONTROL (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Match Result Display */}
          <div
            className={`flex-1 rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
              scanningStatus === 'matched'
                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-2xl shadow-emerald-950'
                : scanningStatus === 'denied'
                ? 'bg-rose-950/30 border-rose-500/50 shadow-2xl shadow-rose-950'
                : 'bg-slate-900/40 border-slate-800'
            }`}
          >
            {/* Idle State */}
            {scanningStatus === 'idle' && !lastMatchResult && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-4 bg-slate-900 rounded-full border border-slate-800 text-slate-500">
                  <Scan className="w-8 h-8 animate-pulse text-cyan-400" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm">Totem em Espera</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Aproxime o rosto ou utilize os botões de simulação abaixo para testar a validação facial do condomínio {condo.name}.
                </p>
              </div>
            )}

            {/* Detecting State */}
            {scanningStatus === 'detecting' && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                <h4 className="font-bold text-white text-base">Processando Biometria Facial...</h4>
                <p className="text-xs text-cyan-400 font-mono">
                  Buscando vetor no banco de dados {condo.code}
                </p>
              </div>
            )}

            {/* Result State */}
            {lastMatchResult && scanningStatus !== 'detecting' && (
              <div className="space-y-5">
                
                {/* Status Header Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${
                      lastMatchResult.status === 'Liberado'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    {lastMatchResult.status === 'Liberado' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acesso Liberado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Acesso Negado</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {lastMatchResult.timestamp || 'Agora'}
                  </span>
                </div>

                {/* Resident / Matched Profile */}
                <div className="flex items-center space-x-4">
                  {lastMatchResult.avatar ? (
                    <img
                      src={lastMatchResult.avatar}
                      alt={lastMatchResult.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-white truncate">
                      {lastMatchResult.name || 'Pessoa Desconhecida'}
                    </h3>
                    <p className="text-xs text-cyan-400 font-medium truncate">
                      {lastMatchResult.unit || 'Sem Unidade'}
                    </p>
                    {lastMatchResult.type && (
                      <span className="inline-block mt-1 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                        {lastMatchResult.type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason or Denial Message */}
                {lastMatchResult.reason && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
                      lastMatchResult.status === 'Liberado'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{lastMatchResult.reason}</span>
                  </div>
                )}

                {/* Match Vector & Liveness Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Confiança Match:</span>
                    <span className="text-cyan-400 font-bold">
                      {lastMatchResult.confidenceScore ? `${lastMatchResult.confidenceScore}%` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Liveness Anti-Spoof:</span>
                    <span className="text-emerald-400 font-bold">
                      {lastMatchResult.livenessScore ? `${lastMatchResult.livenessScore}%` : 'N/A'}
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* GATE RELAY HARDWARE STATUS & MANUAL OVERRIDE */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Controle de Relés Físicos (Hardware IoT)
                </span>
                {relayGateStatus.countdown > 0 && (
                  <span className="text-[11px] font-mono text-cyan-400 font-bold animate-pulse">
                    Trava em: {relayGateStatus.countdown}s
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Pedestrian Gate */}
                <div
                  className={`p-3 rounded-2xl border transition flex flex-col justify-between space-y-2 ${
                    relayGateStatus.pedestrian
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Portão Pedestre</span>
                    {relayGateStatus.pedestrian ? (
                      <Unlock className="w-4 h-4 text-emerald-400 animate-bounce" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <button
                    onClick={() => triggerManualRelay('pedestrian')}
                    className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    {relayGateStatus.pedestrian ? 'DESTRAVADO' : 'Destravar (4s)'}
                  </button>
                </div>

                {/* Vehicle Gate */}
                <div
                  className={`p-3 rounded-2xl border transition flex flex-col justify-between space-y-2 ${
                    relayGateStatus.vehicle
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Portão Garagem</span>
                    {relayGateStatus.vehicle ? (
                      <Unlock className="w-4 h-4 text-emerald-400 animate-bounce" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <button
                    onClick={() => triggerManualRelay('vehicle')}
                    className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    {relayGateStatus.vehicle ? 'DESTRAVADO' : 'Destravar (6s)'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
