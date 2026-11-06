import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { FuncionarioHoleriteView } from './FuncionarioHoleriteView';
import { PontoEletronicoMobile } from './PontoEletronicoMobile';
import {
  Clock,
  Zap,
  FileText,
  Upload,
  X
} from 'lucide-react';

export const FuncionarioHome: React.FC = () => {
  const {
    currentUser,
    demonstrativos,
    toggleDisponibilidadeFT,
    enviarAtestado
  } = useTurnoCerto();

  const [abaAtiva, setAbaAtiva] = useState<'ponto' | 'holerites'>('ponto');

  // Modal de Atestado
  const [showAtestadoModal, setShowAtestadoModal] = useState<boolean>(false);
  const [atestadoDias, setAtestadoDias] = useState<number>(1);
  const [atestadoCrm, setAtestadoCrm] = useState<string>('CRM/SP 204.912');
  const [atestadoObs, setAtestadoObs] = useState<string>('Sintomas gripais e febre moderada.');

  const holeritesPublicados = demonstrativos.filter(
    (d) => d.funcionario_id === currentUser?.id && d.status === 'publicado'
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ========================================================================= */}
      {/* SELETOR DE MÓDULOS DO COLABORADOR: PONTO MOBILE vs HOLERITE               */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 shadow-inner max-w-sm w-full">
          <button
            type="button"
            onClick={() => setAbaAtiva('ponto')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'ponto'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Ponto & Geofencing</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('holerites')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'holerites'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Meus Holerites</span>
            {holeritesPublicados.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                {holeritesPublicados.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {abaAtiva === 'holerites' ? (
        <FuncionarioHoleriteView />
      ) : (
        <>
          {/* Módulo Mobile Completo de Ponto Eletrônico, Câmera Nativa, GPS e Offline */}
          <PontoEletronicoMobile />

          {/* ========================================================================= */}
          {/* SEÇÃO INFERIOR: PRONTIDÃO PARA FT & ATESTADO MÉDICO                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Disponibilidade para FT */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Disponibilidade para Dobrar (FT)</span>
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                    currentUser?.disponivel_ft
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {currentUser?.disponivel_ft ? '⚡ ATIVADO' : 'DESATIVADO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Ative para que a supervisão possa convocá-lo para cobrir turnos de folga com pagamento de hora extra (R$ 240,00).
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleDisponibilidadeFT()}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                  currentUser?.disponivel_ft
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>
                  {currentUser?.disponivel_ft
                    ? 'Desativar Prontidão para FT'
                    : 'Estou Disponível para Turnos Extras (FT) ⚡'}
                </span>
              </button>
            </div>

            {/* Card 2: Envio de Atestado Médico */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Envio de Atestado Médico</span>
                  </span>
                  <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Proteção DSR
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Teve consulta médica ou emergência? Envie foto do comprovante para a supervisora abonar sua falta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAtestadoModal(true)}
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Enviar Novo Atestado Médico</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ENVIO DE ATESTADO MÉDICO                                        */}
      {/* ========================================================================= */}
      {showAtestadoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Enviar Atestado Médico
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAtestadoModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dias de Afastamento Solicitados
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={atestadoDias}
                  onChange={(e) => setAtestadoDias(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CRM do Médico / Emissor
                </label>
                <input
                  type="text"
                  value={atestadoCrm}
                  onChange={(e) => setAtestadoCrm(e.target.value)}
                  placeholder="CRM/UF 000.000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observação / Motivo
                </label>
                <textarea
                  rows={2}
                  value={atestadoObs}
                  onChange={(e) => setAtestadoObs(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-900">
                A supervisora receberá o documento no painel operacional para deferimento e resguardo do DSR.
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAtestadoModal(false)}
                className="py-1.5 px-3 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (currentUser) {
                    await enviarAtestado({
                      funcionarioId: currentUser.id,
                      dias: atestadoDias,
                      crm: atestadoCrm,
                      observacao: atestadoObs
                    });
                    setShowAtestadoModal(false);
                  }
                }}
                className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
