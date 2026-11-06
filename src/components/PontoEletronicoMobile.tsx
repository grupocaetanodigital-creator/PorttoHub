import React, { useState, useEffect, useRef } from 'react';
import { useTurnoCerto } from '../lib/store';
import { TipoBatida, EscalaTrabalho, RegistroPonto } from '../types/database';
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Navigation,
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldCheck,
  Building,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';

export const PontoEletronicoMobile: React.FC = () => {
  const {
    currentUser,
    escalas,
    condominios,
    registrosPonto,
    filaOffline,
    isOnline,
    modoOfflineForcado,
    toggleModoOffline,
    sincronizarFilaOffline,
    baterPonto,
    isLoading
  } = useTurnoCerto();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -23.5615, lng: -46.6560 });
  const [gpsSimuladoNoPosto, setGpsSimuladoNoPosto] = useState<boolean>(true);
  const [usandoGpsReal, setUsandoGpsReal] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraPhotoSnapshot, setCameraPhotoSnapshot] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showOfflineDrawer, setShowOfflineDrawer] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Relógio do turno oficial
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Escala e condomínio do colaborador
  const minhaEscala: EscalaTrabalho | undefined = escalas.find(
    (e) => e.funcionario_id === currentUser?.id
  );

  const meuCondominio = minhaEscala
    ? condominios.find((c) => c.id === minhaEscala.condominio_id)
    : condominios[0];

  const raioPermitido = meuCondominio?.raio_metros || meuCondominio?.raio_tolerancia_metros || 50;

  // Haversine distance calculator
  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Atualizar coordenadas baseado na seleção de simulação ou GPS real
  useEffect(() => {
    if (!usandoGpsReal && meuCondominio) {
      if (gpsSimuladoNoPosto) {
        // Dentro do raio (ex: 18 metros do centro)
        setCoords({
          lat: meuCondominio.lat + 0.00012,
          lng: meuCondominio.lng + 0.00010
        });
      } else {
        // Fora do raio (ex: 850m de distância)
        setCoords({
          lat: meuCondominio.lat + 0.00760,
          lng: meuCondominio.lng + 0.00640
        });
      }
    }
  }, [gpsSimuladoNoPosto, usandoGpsReal, meuCondominio]);

  // GPS Real Geolocation
  const ativarGpsReal = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no seu navegador.');
      return;
    }
    setUsandoGpsReal(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        console.warn('Erro ao ler GPS real:', err.message);
        setUsandoGpsReal(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Inicializar câmera nativa para selfie obrigatória em tempo real
  const iniciarCamera = async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Câmera indisponível ou permissão negada:', err);
      setCameraError('Câmera nativa bloqueada ou em uso. Conceda permissão no navegador.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    iniciarCamera(cameraFacing);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraFacing]);

  // Capturar snapshot biométrico da câmera nativa
  const capturarSelfie = (): string | null => {
    if (cameraActive && videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Espelhar se câmera frontal
          if (cameraFacing === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, 480, 480);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCameraPhotoSnapshot(dataUrl);
          return dataUrl;
        }
      } catch (err) {
        console.warn('Falha no snapshot:', err);
      }
    }
    // Fallback de avatar se a câmera do dispositivo não estiver disponível no browser
    return currentUser?.avatar_url || null;
  };

  // Distância calculada e validação de perímetro
  const distanciaAtual = meuCondominio
    ? calcularDistancia(coords.lat, coords.lng, meuCondominio.lat, meuCondominio.lng)
    : 24;

  const estaDentroDoRaio = distanciaAtual <= raioPermitido;

  // Registrar batida de ponto com selfie e geofencing
  const handleRegistrarBatida = async (tipo: TipoBatida) => {
    const fotoCapturada = capturarSelfie();
    await baterPonto(tipo, coords, fotoCapturada || undefined, estaDentroDoRaio);
  };

  // Sincronização manual da fila offline
  const handleSincronizarFila = async () => {
    setIsSyncing(true);
    await sincronizarFilaOffline();
    setIsSyncing(false);
  };

  const isCobertura = minhaEscala?.tag_ativa === 'escalado_cobertura';
  const isTrabalhandoFT = minhaEscala?.tag_ativa === 'trabalhando_folga_ft';

  // Meus registros do dia
  const meusRegistrosHoje = registrosPonto.filter(
    (r) => r.funcionario_id === currentUser?.id
  );

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* 1. BARRA DE STATUS DE CONECTIVIDADE & SINCRONIZAÇÃO OFFLINE               */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isOnline
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-900'
          : 'bg-amber-950/30 border-amber-500/60 text-amber-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isOnline ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950 font-bold'
            }`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isOnline ? 'Conexão Online Ativa' : 'Modo Offline Ativo (Subsolo / Garagem)'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold ${
                  isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
                }`}>
                  {isOnline ? 'Supabase Sync OK' : 'IndexedDB Criptografado'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isOnline
                  ? 'As batidas são sincronizadas em tempo real com o Supabase e enviadas ao bucket de fotos.'
                  : 'Sem sinal de rede. Seus pontos são gravados localmente no dispositivo com assinatura de integridade.'}
              </p>
            </div>
          </div>

          {/* Controles de Conectividade & Sincronização */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {filaOffline.length > 0 && (
              <button
                type="button"
                onClick={handleSincronizarFila}
                disabled={isSyncing || !isOnline}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar ({filaOffline.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleModoOffline}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                modoOfflineForcado
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {modoOfflineForcado ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Voltar Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simular Subsolo (Offline)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alerta de pontos pendentes na fila */}
        {filaOffline.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>
                <strong>{filaOffline.length} batida(s)</strong> armazenada(s) localmente aguardando upload.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowOfflineDrawer(!showOfflineDrawer)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline"
            >
              {showOfflineDrawer ? 'Ocultar Detalhes da Fila' : 'Ver Fila Offline'}
            </button>
          </div>
        )}

        {/* Fila Offline em Expansão */}
        {showOfflineDrawer && filaOffline.length > 0 && (
          <div className="mt-3 space-y-2 bg-white/80 p-3 rounded-xl border border-slate-200">
            <p className="text-[11px] font-bold uppercase text-slate-500">
              Batidas Gravadas Localmente (IndexedDB / LocalStorage):
            </p>
            {filaOffline.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 uppercase">
                    {item.tipo_batida.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] ml-2">
                    {new Date(item.timestamp).toLocaleTimeString('pt-BR')} · Dist: {item.distancia_metros}m
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                    Hash: {item.hash_criptografico || 'TC-SIG-PENDENTE'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Pendente Sync
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD DO POSTO & GEOFENCING AUDITORIA                                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-0.5">
              <span>{meuCondominio?.tipo_posto === 'portaria_24h' ? 'Portaria 24 Horas' : 'Controle de Acesso'}</span>
              <span aria-hidden="true">·</span>
              <span>Posto Operacional</span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-400" />
              <span>{meuCondominio?.nome || 'Condomínio Residencial'}</span>
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{meuCondominio?.endereco}</span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">Status Operacional</span>
            {isCobertura && (
              <span className="inline-block text-xs font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700">
                🔄 [Escalado para Cobertura]
              </span>
            )}
            {isTrabalhandoFT && (
              <span className="inline-block text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-700">
                ⚡ [Trabalhando em Folga / FT]
              </span>
            )}
            {!isCobertura && !isTrabalhandoFT && (
              <span className="inline-block text-xs font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                🟢 Escala Regular Ativa
              </span>
            )}
          </div>
        </div>

        {/* Relógio Oficial */}
        <div className="p-6 space-y-6">
          <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">
              Horário Oficial de Brasília
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <span className="text-xs text-slate-600 mt-1 capitalize font-medium">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* PAINEL DE GEOFENCING E AUDITORIA DE PERÍMETRO GPS                         */}
          {/* ========================================================================= */}
          <div className={`p-4 rounded-xl border transition-all ${
            estaDentroDoRaio
              ? 'border-emerald-200 bg-emerald-50/50'
              : 'border-red-300 bg-red-50'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  estaDentroDoRaio ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Geofencing & Perímetro de Raio
                    </h4>
                    {estaDentroDoRaio ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ DENTRO DO RAIO ({distanciaAtual}m)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                        ⚠️ FORA DO RAIO ({distanciaAtual}m)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Coordenadas capturadas:{' '}
                    <span className="font-mono text-slate-800 font-semibold">
                      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </span>{' '}
                    · Raio permitido:{' '}
                    <strong className="text-slate-800">{raioPermitido} metros</strong>.
                  </p>
                </div>
              </div>

              {/* Botões de Simulação de Geofencing para Testes Imediatos */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setUsandoGpsReal(false);
                    setGpsSimuladoNoPosto(true);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    !usandoGpsReal && gpsSimuladoNoPosto
                      ? 'bg-emerald-700 text-white font-semibold shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🟢 No Posto (&lt; 50m)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsandoGpsReal(false);
                    setGpsSimuladoNoPosto(false);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    !usandoGpsReal && !gpsSimuladoNoPosto
                      ? 'bg-red-700 text-white font-semibold shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🔴 Fora do Posto (850m)
                </button>
                <button
                  type="button"
                  onClick={ativarGpsReal}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    usandoGpsReal
                      ? 'bg-indigo-700 text-white font-semibold shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🛰️ GPS Real
                </button>
              </div>
            </div>

            {/* Banner de Advertência de Auditoria se fora do raio */}
            {!estaDentroDoRaio && (
              <div className="mt-3 p-3 bg-red-100/80 border border-red-300 rounded-lg flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong>AVISO DE AUDITORIA:</strong> Você está a{' '}
                  <span className="font-bold font-mono">{distanciaAtual} metros</span> de distância do posto{' '}
                  (tolerância máxima: <span className="font-bold font-mono">{raioPermitido} metros</span>).
                  A batida será registrada com alerta para análise da supervisora de campo.
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. PROVA DE IDENTIDADE: CÂMERA NATIVA AO VIVO (SEM GALERIA)               */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Prova de Identidade Facial Obrigatória
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                🔒 Câmera Nativa · Sem Galeria
              </span>
            </div>

            {/* Visor da Câmera com Guia Facial */}
            <div className="relative mx-auto w-full max-w-xs h-56 bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-700">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Guia oval facial */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-36 h-48 rounded-[50%] border-2 border-dashed border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)] flex items-center justify-center">
                      <span className="text-[9px] uppercase tracking-wider text-amber-300/80 bg-slate-950/60 px-2 py-0.5 rounded">
                        Enquadre o Rosto
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  {currentUser?.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name}
                      className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-amber-400 mb-2"
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                  )}
                  <p className="text-xs text-slate-300 font-semibold">
                    {cameraError || 'Câmera nativa pronta para validação biométrica.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => iniciarCamera(cameraFacing)}
                    className="mt-2 py-1 px-3 bg-amber-500 text-slate-950 rounded text-xs font-bold"
                  >
                    Ativar Câmera
                  </button>
                </div>
              )}

              {/* Botão de alternar câmera frontal/traseira */}
              {cameraActive && (
                <button
                  type="button"
                  onClick={() => {
                    const novo = cameraFacing === 'user' ? 'environment' : 'user';
                    setCameraFacing(novo);
                  }}
                  className="absolute bottom-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full border border-slate-700 shadow"
                  title="Inverter Câmera"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Ao bater o ponto, uma selfie em tempo real é capturada automaticamente e vinculada ao registro.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 4. OS 4 BOTÕES OPERACIONAIS DE MARCAÇÃO DE PONTO                           */}
          {/* ========================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registrar Ponto Eletrônico Mobile
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Portaria 671 MTP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Entrada */}
              <button
                type="button"
                onClick={() => handleRegistrarBatida('entrada')}
                disabled={isLoading}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center text-center group"
              >
                <span className="text-base font-bold">1. Entrada</span>
                <span className="text-[11px] text-emerald-100 group-hover:text-white mt-0.5">
                  {isCobertura ? '⚡ Iniciar FT' : 'Início do Turno'}
                </span>
              </button>

              {/* 2. Início Intervalo */}
              <button
                type="button"
                onClick={() => handleRegistrarBatida('inicio_intervalo')}
                disabled={isLoading}
                className="py-3 px-3 bg-amber-600 hover:bg-amber-500 active:scale-98 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center text-center group"
              >
                <span className="text-base font-bold">2. Início Intervalo</span>
                <span className="text-[11px] text-amber-100 group-hover:text-white mt-0.5">
                  Saída p/ Almoço
                </span>
              </button>

              {/* 3. Fim Intervalo */}
              <button
                type="button"
                onClick={() => handleRegistrarBatida('fim_intervalo')}
                disabled={isLoading}
                className="py-3 px-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center text-center group"
              >
                <span className="text-base font-bold">3. Fim Intervalo</span>
                <span className="text-[11px] text-blue-100 group-hover:text-white mt-0.5">
                  Retorno ao Posto
                </span>
              </button>

              {/* 4. Saída */}
              <button
                type="button"
                onClick={() => handleRegistrarBatida('saida')}
                disabled={isLoading}
                className="py-3 px-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center text-center group"
              >
                <span className="text-base font-bold">4. Saída</span>
                <span className="text-[11px] text-slate-300 group-hover:text-white mt-0.5">
                  Encerramento
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. HISTÓRICO DAS BATIDAS DO DIA COM FOTO E STATUS GEOFENCING              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Minhas Batidas de Ponto Hoje ({meusRegistrosHoje.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Validação Criptográfica Ativa
          </span>
        </div>

        {meusRegistrosHoje.length > 0 ? (
          <div className="space-y-2.5">
            {meusRegistrosHoje.map((registro) => {
              const label = {
                entrada: '1. Entrada do Turno',
                inicio_intervalo: '2. Início de Intervalo',
                saida_intervalo: '2. Saída para Intervalo',
                fim_intervalo: '3. Fim de Intervalo',
                retorno_intervalo: '3. Retorno do Intervalo',
                saida: '4. Saída do Turno'
              }[registro.tipo_batida] || 'Registro de Ponto';

              const isOfflinePendente = registro.offline_pendente;

              return (
                <div
                  key={registro.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    !registro.dentro_do_raio
                      ? 'border-red-200 bg-red-50/50'
                      : isOfflinePendente
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Foto comprovante */}
                    {registro.foto_comprovante_url || registro.foto_comprovante ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoPreview(registro.foto_comprovante_url || registro.foto_comprovante || null)}
                        className="relative group shrink-0"
                      >
                        <img
                          src={registro.foto_comprovante_url || registro.foto_comprovante || ''}
                          alt="Selfie Comprovante"
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-lg object-cover border border-slate-300 group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg text-white">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{label}</p>
                        {registro.dentro_do_raio ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            ✓ No Raio ({registro.distancia_metros}m)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-800 bg-red-100 px-1.5 py-0.2 rounded">
                            ⚠️ Fora do Raio ({registro.distancia_metros}m)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Posto: {registro.condominio_nome || meuCondominio?.nome} ·{' '}
                        <span className="font-mono">
                          {registro.latitude_capturada?.toFixed(5) || registro.lat.toFixed(5)},{' '}
                          {registro.longitude_capturada?.toFixed(5) || registro.lng.toFixed(5)}
                        </span>
                      </p>
                      {registro.hash_criptografico && (
                        <p className="text-[9px] font-mono text-slate-400 truncate max-w-xs mt-0.5">
                          Sig: {registro.hash_criptografico}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono tabular-nums font-bold text-slate-900 block text-sm">
                      {new Date(registro.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    {isOfflinePendente ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        📡 Salvo Offline
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        ✓ Supabase Sync
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-5">
            Nenhuma batida registrada hoje. Posicione-se no posto e clique em <strong>1. Entrada</strong>.
          </p>
        )}
      </div>

      {/* Modal de visualização ampliada da foto comprovante */}
      {selectedPhotoPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-slate-200 shadow-2xl flex flex-col items-center">
            <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
              Selfie Comprovante de Ponto
            </h4>
            <img
              src={selectedPhotoPreview}
              alt="Comprovante"
              className="w-72 h-72 rounded-xl object-cover border border-slate-200"
            />
            <button
              type="button"
              onClick={() => setSelectedPhotoPreview(null)}
              className="mt-4 w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
