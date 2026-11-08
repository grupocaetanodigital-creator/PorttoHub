import React, { useState } from 'react';
import { Zap, Shield, Phone, AlertCircle, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BottomSheet } from '../ui/BottomSheet';
import confetti from 'canvas-confetti';

export const FTCoverageModal: React.FC = () => {
  const { ftModalState, closeFTModal, colaboradores, condominios, designarFT } = useApp();
  const { isOpen, targetTurno } = ftModalState;

  const [selectedSubstitutoId, setSelectedSubstitutoId] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!targetTurno) return null;

  const condo = condominios.find(c => c.id === targetTurno.condominioId);
  const titular = colaboradores.find(c => c.id === targetTurno.colaboradorTitularId);

  // Available staff (exclude titular and those already currently working this shift)
  const availableColabs = colaboradores.filter(c => c.id !== targetTurno.colaboradorTitularId);

  const handleConfirm = async () => {
    if (!selectedSubstitutoId) return;

    setIsSubmitting(true);
    await designarFT(
      targetTurno.id,
      selectedSubstitutoId,
      observacao || `FT Rápida designada pela supervisão para o posto ${targetTurno.postoNome}.`
    );
    setIsSubmitting(false);

    // Fire subtle celebration confetti
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch {
      // ignore
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={closeFTModal}
      title="Designar Cobertura / FT Rápida"
      subtitle="Alocação emergencial de Folga Trabalhada"
    >
      <div className="space-y-4">
        {/* Post info summary */}
        <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/60">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                Posto Descoberto
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">{targetTurno.postoNome}</h4>
              <p className="text-xs text-slate-300">{condo?.nome}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400">Horário</span>
              <p className="text-xs font-bold text-blue-400">{targetTurno.horario}</p>
            </div>
          </div>

          {titular && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Titular escalado: <strong className="text-white">{titular.nome}</strong> (Ausente)</span>
            </div>
          )}
        </div>

        {/* Step 1: Select Substitute */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Selecione o Colaborador para FT
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {availableColabs.map((colab) => {
              const isSelected = selectedSubstitutoId === colab.id;
              // Suggestion for FT calculation
              const valorDiaFT = ((colab.salarioBase / 220) * 12 * 2).toFixed(2);

              return (
                <div
                  key={colab.id}
                  onClick={() => setSelectedSubstitutoId(colab.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-900/30 border-blue-500 shadow-md shadow-blue-950/40 ring-1 ring-blue-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={colab.fotoUrl}
                      alt={colab.nome}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{colab.nome}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {colab.cargo} &bull; Jornada {colab.jornada}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          Disponível em Folga
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Valor FT: ~R$ {valorDiaFT}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Observação / Acordo de Deslocamento
          </label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Avisado via WhatsApp, previsão de chegada às 08:30 com FT dobrada."
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={closeFTModal}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 active:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selectedSubstitutoId || isSubmitting}
            onClick={handleConfirm}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>{isSubmitting ? 'Alocando...' : 'Confirmar FT Rápida'}</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
