import React, { useState } from 'react';
import { 
  QrCode, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Share2, 
  Copy, 
  Trash2, 
  Check, 
  AlertCircle,
  Truck,
  UserCheck
} from 'lucide-react';
import { Condominium, VisitorPass } from '../types';
import { audioService } from '../services/audioService';

interface VisitorPassesProps {
  condo: Condominium;
  passes: VisitorPass[];
  onSavePass: (pass: VisitorPass) => void;
  onTestInTotem: () => void;
}

export const VisitorPasses: React.FC<VisitorPassesProps> = ({
  condo,
  passes,
  onSavePass,
  onTestInTotem
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form State
  const [visitorName, setVisitorName] = useState('');
  const [document, setDocument] = useState('');
  const [unitDestination, setUnitDestination] = useState('Bloco A - Apto 302');
  const [residentAuthorizer, setResidentAuthorizer] = useState('Carlos Eduardo Silva');
  const [type, setType] = useState<VisitorPass['type']>('Delivery');
  const [durationHours, setDurationHours] = useState('4');
  const [singleUse, setSingleUse] = useState(true);
  const [notes, setNotes] = useState('');

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    const validUntilDate = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000);
    const validUntilStr = `Hoje, ${validUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newPass: VisitorPass = {
      id: `pass_${Date.now()}`,
      condoId: condo.id, // Strictly scoped
      visitorName: visitorName.trim(),
      document: document.trim() || 'N/A',
      unitDestination: unitDestination.trim(),
      residentAuthorizer: residentAuthorizer.trim(),
      type: type,
      qrCodeToken: `PORTTO-${condo.code}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      validUntil: validUntilStr,
      singleUse: singleUse,
      used: false,
      status: 'Válido',
      notes: notes.trim()
    };

    onSavePass(newPass);
    audioService.playSuccessChime();
    setIsModalOpen(false);

    // Reset Form
    setVisitorName('');
    setDocument('');
    setNotes('');
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard?.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white">Convites Digitais & QR Code</h2>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
              {condo.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Emissão de passes temporários e chaves virtuais com expiração automática para {condo.name}.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Novo Convite</span>
        </button>
      </div>

      {/* PASSES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {passes.map((pass) => (
          <div
            key={pass.id}
            className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1.5 ${
                    pass.status === 'Válido'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {pass.status}
                </span>
                <h4 className="font-bold text-white text-sm">{pass.visitorName}</h4>
                <p className="text-xs text-cyan-400 font-semibold">{pass.unitDestination}</p>
              </div>

              {/* QR Preview Box */}
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-md shrink-0">
                <QrCode className="w-9 h-9 text-slate-950" />
              </div>
            </div>

            {/* Pass details */}
            <div className="space-y-1.5 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-900 font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Tipo:</span>
                <span className="text-slate-200">{pass.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Autorizado por:</span>
                <span className="text-slate-200">{pass.residentAuthorizer}</span>
              </div>
              <div className="flex justify-between">
                <span>Válido até:</span>
                <span className="text-emerald-400 font-bold">{pass.validUntil}</span>
              </div>
              <div className="flex justify-between">
                <span>Uso Único:</span>
                <span className="text-slate-300">{pass.singleUse ? 'Sim' : 'Não (Múltiplo)'}</span>
              </div>
            </div>

            {/* Token & Copy Action */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] font-mono text-cyan-400 truncate pr-2">
                {pass.qrCodeToken}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => copyToClipboard(pass.qrCodeToken)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  title="Copiar Código QR"
                >
                  {copiedToken === pass.qrCodeToken ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={onTestInTotem}
                  className="text-[11px] font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-2.5 py-1 rounded-lg transition"
                  title="Validar na Portaria"
                >
                  Testar Totem
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {passes.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-sm">Nenhum Convite Emitido</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gere passes rápidos para entregadores e visitantes com validação segura no totem.
          </p>
        </div>
      )}

      {/* NEW PASS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Emitir Convite Virtual QR</h3>
                <p className="text-xs text-slate-400">Condomínio: {condo.name}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Nome do Visitante / Entregador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entregador Mercado Livre"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo de Acesso</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as VisitorPass['type'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Delivery">Delivery / Encomenda</option>
                    <option value="Visitante">Visitante Social</option>
                    <option value="Prestador">Prestador de Serviço</option>
                    <option value="Festa / Evento">Festa / Churrasqueira</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Validade do Passe</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="1">1 Hora</option>
                    <option value="2">2 Horas</option>
                    <option value="4">4 Horas</option>
                    <option value="12">12 Horas</option>
                    <option value="24">24 Horas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unidade Destino</label>
                  <input
                    type="text"
                    required
                    value={unitDestination}
                    onChange={(e) => setUnitDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Morador Autorizador</label>
                  <input
                    type="text"
                    required
                    value={residentAuthorizer}
                    onChange={(e) => setResidentAuthorizer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Entregar pacote de compras na guarita"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="singleUseCheck"
                  checked={singleUse}
                  onChange={(e) => setSingleUse(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="singleUseCheck" className="text-slate-300 font-medium">
                  Uso Único (Invalida automaticamente após primeira entrada)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl"
                >
                  Gerar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
