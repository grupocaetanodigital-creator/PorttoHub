import React from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Phone, 
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { Reservation, CommonArea } from '../types';
import { AreaIcon } from './AreaIcon';
import { formatDatePTBR, formatCurrencyBRL } from '../utils/timeSlots';

interface ReservationReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  area: CommonArea | undefined;
  condoName: string;
}

export const ReservationReceiptModal: React.FC<ReservationReceiptModalProps> = ({
  isOpen,
  onClose,
  reservation,
  area,
  condoName,
}) => {
  if (!isOpen || !reservation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const text = `*Comprovante de Reserva - PorttoHub*\n\n` +
      `🏢 Condomínio: ${condoName}\n` +
      `📍 Área: ${area?.name || 'Área Comum'}\n` +
      `🔑 Unidade: Apto ${reservation.unitNumber} (${reservation.unitBlock})\n` +
      `👤 Morador: ${reservation.residentName}\n` +
      `📅 Data: ${formatDatePTBR(reservation.date)}\n` +
      `⏰ Horário: ${reservation.startTime} às ${reservation.endTime}\n` +
      `🔖 Código: ${reservation.reservationCode}\n` +
      `💵 Taxa: ${formatCurrencyBRL(reservation.cleaningFee)}\n\n` +
      `Apresente este código na portaria ao ingressar na área.`;

    navigator.clipboard.writeText(text);
    alert('Texto do comprovante copiado para a área de transferência! Cole no WhatsApp do morador.');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Comprovante Oficial de Reserva
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-6">
          {/* Top Brand & Code */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 block">
                PorttoHub
              </span>
              <span className="text-xs text-slate-500 font-medium">{condoName}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Código</span>
              <span className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {reservation.reservationCode}
              </span>
            </div>
          </div>

          {/* Area & Status Banner */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
              <AreaIcon type={area?.type || 'quadra'} className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{area?.name || 'Área Comum'}</h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="capitalize">{area?.type}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold font-mono">
                  {formatCurrencyBRL(reservation.cleaningFee)}
                </span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/60 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Data Reservada
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {formatDatePTBR(reservation.date)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Horário Agendado
                </span>
                <span className="font-bold text-indigo-700 font-mono tabular-nums block mt-0.5 text-sm">
                  {reservation.startTime} às {reservation.endTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/60 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Unidade Solicitante
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  Apto {reservation.unitNumber} ({reservation.unitBlock})
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Morador Responsável
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {reservation.residentName}
                </span>
                {reservation.residentPhone && (
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {reservation.residentPhone}
                  </span>
                )}
              </div>
            </div>

            {reservation.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-amber-900">
                <span className="text-[10px] uppercase font-bold block">Observações:</span>
                <p className="text-xs mt-0.5">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* QR Code Presentation for Portaria */}
          <div className="flex items-center gap-4 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
            <div className="w-16 h-16 bg-white border border-indigo-200 rounded-lg flex items-center justify-center p-1 text-slate-800 shrink-0">
              {/* Simulated crisp QR code representation */}
              <div className="w-full h-full border border-slate-900 p-1 grid grid-cols-4 grid-rows-4 gap-0.5">
                <div className="bg-slate-900 col-span-2 row-span-2"></div>
                <div className="bg-slate-900"></div>
                <div></div>
                <div className="bg-slate-900"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-slate-900 col-span-2 row-span-2"></div>
                <div></div>
                <div className="bg-slate-900"></div>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Validação na Portaria
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                O operador ou porteiro confere este código ou escaneia o comprovante para registrar a entrada e entrega das chaves da área.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Copiar WhatsApp
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
