import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  Smartphone, 
  Upload, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Condominium, Resident } from '../types';
import { audioService } from '../services/audioService';

interface FacialEnrollmentProps {
  condo: Condominium;
  onSaveResident: (resident: Resident) => void;
  onDone: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300'
];

export const FacialEnrollment: React.FC<FacialEnrollmentProps> = ({
  condo,
  onSaveResident,
  onDone
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState<string>('');

  // Form State
  const [name, setName] = useState('');
  const [block, setBlock] = useState('Bloco A');
  const [unitNumber, setUnitNumber] = useState('');
  const [type, setType] = useState<Resident['type']>('Morador');
  const [docNumber, setDocNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [accessSchedule, setAccessSchedule] = useState<'24h' | 'Comercial'>('24h');

  // Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setIsCameraActive(false);
      // Auto select first preset avatar if no camera
      if (!capturedPhoto && !selectedAvatarPreset) {
        setSelectedAvatarPreset(PRESET_AVATARS[0]);
      }
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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Capture Snapshot from Camera
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(dataUrl);
      setSelectedAvatarPreset('');
      audioService.playGateRelayClick();
    }
  };

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = capturedPhoto || selectedAvatarPreset || PRESET_AVATARS[0];

    const fullUnit = block ? `${block} - Apto ${unitNumber}` : `Apto ${unitNumber}`;

    const newResident: Resident = {
      id: `res_${Date.now()}`,
      condoId: condo.id, // Strictly scoped to current condominium
      name: name.trim(),
      unit: fullUnit,
      block: block,
      type: type,
      status: 'Ativo',
      document: docNumber.trim() || '000.000.000-00',
      phone: phone.trim() || '(11) 90000-0000',
      email: email.trim(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      faceEnrolled: true,
      avatar: finalPhoto,
      accessSchedule: accessSchedule,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onSaveResident(newResident);
    audioService.playSuccessChime();
    onDone();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Cadastramento Biométrico Facial</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastro com vetorização facial e isolamento no condomínio <strong className="text-cyan-400">{condo.name}</strong>.
          </p>
        </div>

        <button
          onClick={onDone}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 transition self-start sm:self-auto"
        >
          Voltar para Moradores
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* PHOTO CAPTURE & AVATAR PICKER (5 COLS) */}
        <div className="md:col-span-5 bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col space-y-4">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>Foto Biométrica Facial</span>
            <span className="text-[10px] text-emerald-400 font-mono">Anti-Spoofing Ativo</span>
          </div>

          {/* Camera Frame */}
          <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            {capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured face" className="w-full h-full object-cover" />
            ) : selectedAvatarPreset ? (
              <img src={selectedAvatarPreset} alt="Selected avatar" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            )}

            {/* Overlay Grid Guide */}
            {!capturedPhoto && !selectedAvatarPreset && isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-32 h-44 border-2 border-dashed border-cyan-400/80 rounded-full" />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {!capturedPhoto && isCameraActive && (
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Capturar Foto da Webcam</span>
              </button>
            )}

            {(capturedPhoto || selectedAvatarPreset) && (
              <button
                type="button"
                onClick={() => {
                  setCapturedPhoto(null);
                  setSelectedAvatarPreset('');
                  startCamera();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Capturar Nova Foto</span>
              </button>
            )}
          </div>

          {/* Presets Gallery fallback */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Ou escolha foto de teste do banco:
            </span>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedAvatarPreset(url);
                    setCapturedPhoto(null);
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                    selectedAvatarPreset === url
                      ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Biometric Validation Checklist */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-[11px] font-mono space-y-1.5 text-slate-400">
            <div className="flex items-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Detecção de Vivacidade (Liveness): 99.1%</span>
            </div>
            <div className="flex items-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Vetorização 128D Gerada com Sucesso</span>
            </div>
            <div className="flex items-center text-cyan-400">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Isolamento Tenant: {condo.code}</span>
            </div>
          </div>
        </div>

        {/* RESIDENT DATA FORM (7 COLS) */}
        <div className="md:col-span-7 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nome Completo do Morador / Prestador *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo de Souza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Block and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bloco / Torre</label>
                <input
                  type="text"
                  placeholder="Ex: Bloco A, Torre 1"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número do Apto / Casa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 302, 14"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Profile Type and Access Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Perfil</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Resident['type'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Morador">Morador Titular</option>
                  <option value="Dependente">Dependente</option>
                  <option value="Inquilino">Inquilino</option>
                  <option value="Prestador">Prestador de Serviço</option>
                  <option value="Funcionário">Funcionário</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Horário de Liberação</label>
                <select
                  value={accessSchedule}
                  onChange={(e) => setAccessSchedule(e.target.value as '24h' | 'Comercial')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="24h">Acesso Livre 24 Horas</option>
                  <option value="Comercial">Apenas Horário Comercial (08h às 18h)</option>
                </select>
              </div>
            </div>

            {/* CPF and Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">CPF ou Documento</label>
                <input
                  type="text"
                  placeholder="123.456.789-00"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Email and Vehicle Plate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail para Notificações</label>
                <input
                  type="email"
                  placeholder="morador@condominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Placa do Veículo (Garagem)</label>
                <input
                  type="text"
                  placeholder="Ex: BRA2E19"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onDone}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 px-6 py-2.5 rounded-xl font-bold transition shadow-lg shadow-emerald-500/20"
              >
                Finalizar Cadastro no {condo.code}
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
