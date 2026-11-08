import React from 'react';
import { Printer, Download, X, Building2, CheckCircle2, Shield } from 'lucide-react';
import { Holerite, Colaborador, CondominioPosto } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

interface HoleriteDocumentModalProps {
  holerite: Holerite | null;
  colaborador?: Colaborador;
  condominio?: CondominioPosto;
  onClose: () => void;
}

export const HoleriteDocumentModal: React.FC<HoleriteDocumentModalProps> = ({
  holerite,
  colaborador,
  condominio,
  onClose
}) => {
  if (!holerite || !colaborador) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <BottomSheet
      isOpen={Boolean(holerite)}
      onClose={onClose}
      title="Demonstrativo de Pagamento (Holerite)"
      subtitle={`Competência ${holerite.mesReferencia} &bull; ${colaborador.nome}`}
      maxHeight="max-h-[94vh]"
    >
      <div className="space-y-4 text-slate-100">
        {/* Printable Payslip Sheet Container */}
        <div id="holerite-print-area" className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-300 font-sans text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-blue-700" />
                <span className="font-black text-sm tracking-tight text-blue-900">PORTTOHUB FACILITIES & SEGURANÇA LTDA</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-0.5">CNPJ: 14.882.341/0001-92 &bull; Av. Brig. Faria Lima, 3477 - SP</p>
            </div>
            <div className="text-right">
              <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                Recibo de Salário
              </span>
              <p className="text-[11px] font-bold text-slate-800 mt-1">Ref: {holerite.mesReferencia}</p>
            </div>
          </div>

          {/* Employee Info Header */}
          <div className="py-2.5 border-b border-slate-300 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-slate-500 text-[10px]">Colaborador</p>
              <p className="font-bold text-slate-900">{colaborador.nome}</p>
              <p className="text-slate-600">CPF: {colaborador.cpf} &bull; Matrícula: {colaborador.matricula}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[10px]">Função / Posto</p>
              <p className="font-bold text-slate-900">{colaborador.cargo}</p>
              <p className="text-slate-600 truncate">{condominio?.nome || 'Posto Central'}</p>
            </div>
          </div>

          {/* Payslip Items Table */}
          <div className="py-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] text-slate-600 uppercase">
                  <th className="py-1">Cód.</th>
                  <th className="py-1">Descrição do Evento</th>
                  <th className="py-1 text-center">Ref.</th>
                  <th className="py-1 text-right">Proventos (+)</th>
                  <th className="py-1 text-right">Descontos (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {holerite.itens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-1.5 font-mono text-slate-500">{item.codigo}</td>
                    <td className="py-1.5 font-medium text-slate-800">{item.descricao}</td>
                    <td className="py-1.5 text-center text-slate-500 font-mono">{item.referencia || '-'}</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-emerald-700">
                      {item.tipo === 'provento' ? `R$ ${item.valor.toFixed(2)}` : ''}
                    </td>
                    <td className="py-1.5 text-right font-mono font-semibold text-red-600">
                      {item.tipo === 'desconto' ? `R$ ${item.valor.toFixed(2)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-3 pt-3 border-t-2 border-slate-900 bg-slate-50 p-2.5 rounded-lg grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Proventos</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                + R$ {holerite.totalProventos.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Descontos</span>
              <span className="text-xs font-bold text-red-600 font-mono">
                - R$ {holerite.totalDescontos.toFixed(2)}
              </span>
            </div>
            <div className="bg-blue-900 text-white p-1 rounded-md">
              <span className="text-[9px] text-blue-200 font-extrabold uppercase block">Valor Líquido</span>
              <span className="text-xs font-black font-mono">
                R$ {holerite.valorLiquido.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Bank / Receipt Footer */}
          <div className="mt-3 pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200">
            <span>Emitido em: {holerite.dataEmissao}</span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Depósito em Conta / PIX
            </span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Imprimir / PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
