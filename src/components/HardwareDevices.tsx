import React, { useState } from 'react';
import { 
  Cpu, 
  Camera, 
  Radio, 
  RefreshCw, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Activity, 
  Building2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { Condominium, HardwareDevice } from '../types';
import { audioService } from '../services/audioService';

interface HardwareDevicesProps {
  condo: Condominium;
  devices: HardwareDevice[];
  onTriggerRelay: (deviceName: string) => void;
}

export const HardwareDevices: React.FC<HardwareDevicesProps> = ({
  condo,
  devices,
  onTriggerRelay
}) => {
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pulseActiveId, setPulseActiveId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, string>>({});

  const handlePing = (deviceId: string) => {
    setPingingId(deviceId);
    setTimeout(() => {
      const ms = Math.floor(Math.random() * 8 + 4);
      setPingResults(prev => ({ ...prev, [deviceId]: `${ms}ms (Excelente)` }));
      setPingingId(null);
    }, 700);
  };

  const handleTestRelay = (device: HardwareDevice) => {
    setPulseActiveId(device.id);
    audioService.playGateRelayClick();
    onTriggerRelay(device.name);

    setTimeout(() => {
      audioService.playGateRelayClick();
      setPulseActiveId(null);
    }, (device.pulseTimeMs || 4000));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white">Dispositivos & Hardware IoT</h2>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
              {condo.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento de controladoras TCP/IP, relés de acionamento e câmeras IP de <strong className="text-cyan-400">{condo.name}</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Gateway TCP/IP Conectado
          </span>
        </div>
      </div>

      {/* DEVICES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => {
          const isPinging = pingingId === device.id;
          const isPulsing = pulseActiveId === device.id;
          const pingResult = pingResults[device.id] || '5ms (Estável)';

          return (
            <div
              key={device.id}
              className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-cyan-400">
                      {device.type === 'camera' ? (
                        <Camera className="w-5 h-5" />
                      ) : (
                        <Cpu className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{device.name}</h4>
                      <p className="text-xs text-slate-400">{device.location}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      device.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {device.status}
                  </span>
                </div>

                {/* Device Network Specs */}
                <div className="mt-4 space-y-1.5 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-900 font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Endereço IP:</span>
                    <span className="text-cyan-400 font-bold">{device.ipAddress}:{device.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo Dispositivo:</span>
                    <span className="text-slate-200 capitalize">{device.type}</span>
                  </div>
                  {device.pulseTimeMs && (
                    <div className="flex justify-between">
                      <span>Tempo de Pulso:</span>
                      <span className="text-slate-200">{device.pulseTimeMs / 1000}s</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Latência Ping:</span>
                    <span className="text-emerald-400">{pingResult}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePing(device.id)}
                  disabled={isPinging}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition"
                >
                  <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isPinging ? 'Pingando...' : 'Testar Conexão'}</span>
                </button>

                {device.type === 'relay' && (
                  <button
                    onClick={() => handleTestRelay(device)}
                    disabled={isPulsing}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition ${
                      isPulsing
                        ? 'bg-emerald-500 text-slate-950 animate-pulse'
                        : 'bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400'
                    }`}
                  >
                    {isPulsing ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>RELE ABERTO!</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Disparar Pulso</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {devices.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-sm">Nenhum Dispositivo Conectado</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Adicione módulos de relé TCP/IP ou totens faciais para este condomínio.
          </p>
        </div>
      )}

    </div>
  );
};
