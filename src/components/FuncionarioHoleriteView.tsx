import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { DemonstrativoPagamento } from '../types/database';
import {
  FileText,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Building,
  Printer,
  X
} from 'lucide-react';

export const FuncionarioHoleriteView: React.FC = () => {
  const { currentUser, demonstrativos, confirmarCienteHolerite, isLoading } = useTurnoCerto();

  // Filter only published payslips for the logged-in employee (Strict RLS equivalent)
  const meusHolerites = demonstrativos.filter(
    (d) => d.funcionario_id === currentUser?.id && d.status === 'publicado'
  );

  const [selectedHolerite, setSelectedHolerite] = useState<DemonstrativoPagamento | null>(
    meusHolerites[0] || null
  );
  const [modalDetalheOpen, setModalDetalheOpen] = useState<boolean>(false);

  // If no holerite is selected yet but we have holerites, pick the first one
  const holeriteAtivo = selectedHolerite || meusHolerites[0];

  // Helper for Donut chart calculations
  const calculateDonutSegments = (proventos: number, descontos: number) => {
    const total = proventos || 1;
    const descontoPercent = Math.min(100, (descontos / total) * 100);
    const liquidoPercent = Math.max(0, 100 - descontoPercent);

    // SVG Circle perimeter for r=40 is 2 * PI * 40 ≈ 251.32
    const perimeter = 251.32;
    const liquidoStroke = (liquidoPercent / 100) * perimeter;
    const descontoStroke = (descontoPercent / 100) * perimeter;

    return {
      descontoPercent: descontoPercent.toFixed(1),
      liquidoPercent: liquidoPercent.toFixed(1),
      liquidoStroke,
      descontoStroke,
      perimeter
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          <span>Meus Holerites Digitais</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Demonstrativos de pagamento mensais com demonstrativo transparente de proventos e descontos.
        </p>
      </div>

      {meusHolerites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum holerite publicado no momento
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Seus comprovantes de pagamento são disponibilizados aqui assim que a folha é processada e publicada pelo departamento de RH.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seletor de Competência (Segmented Buttons) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {meusHolerites.map((holerite) => {
              const isSelected = holeriteAtivo?.id === holerite.id;
              const [ano, mes] = holerite.mes_referencia.split('-');
              const nomesMes = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
              ];
              const nomeMes = nomesMes[parseInt(mes, 10) - 1] || mes;

              return (
                <button
                  key={holerite.id}
                  onClick={() => setSelectedHolerite(holerite)}
                  className={`px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">
                    {nomeMes} / {ano}
                  </p>
                  <p className={`text-[11px] font-mono tabular-nums ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                    Líquido: R$ {holerite.salario_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </button>
              );
            })}
          </div>

          {holeriteAtivo && (
            <>
              {/* Card Resumo com Gráfico em Rosca (Donut Chart) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Gráfico Donut SVG */}
                  {(() => {
                    const stats = calculateDonutSegments(
                      holeriteAtivo.total_proventos,
                      holeriteAtivo.total_descontos
                    );

                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            {/* Background Circle */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#f1f5f9"
                              strokeWidth="14"
                            />
                            {/* Segmento Proventos Líquidos (Verde Esmeralda) */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth="14"
                              strokeDasharray={`${stats.liquidoStroke} ${stats.perimeter}`}
                              strokeDashoffset="0"
                              strokeLinecap="round"
                            />
                            {/* Segmento Descontos (Vermelho em Destaque) */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#ef4444"
                              strokeWidth="14"
                              strokeDasharray={`${stats.descontoStroke} ${stats.perimeter}`}
                              strokeDashoffset={`-${stats.liquidoStroke}`}
                              strokeLinecap="round"
                            />
                          </svg>

                          {/* Centro da Rosca */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Líquido</span>
                            <span className="text-base font-black text-slate-900 font-mono">
                              {stats.liquidoPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Legenda Explicativa */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-slate-600">Total Vencimentos (Bruto):</span>
                            <strong className="font-mono text-slate-900 tabular-nums">
                              R$ {holeriteAtivo.total_proventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                            <span className="text-slate-600">Total Descontos em Folha:</span>
                            <strong className="font-mono text-red-600 tabular-nums">
                              - R$ {holeriteAtivo.total_descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <span className="w-3 h-3 rounded-full bg-slate-900 shrink-0" />
                            <span className="text-slate-900 font-bold">Salário Líquido Creditado:</span>
                            <strong className="font-mono text-emerald-700 font-black tabular-nums">
                              R$ {holeriteAtivo.salario_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ações Rápidas & Ciente */}
                  <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                    {holeriteAtivo.ciente_funcionario_em ? (
                      <div className="w-full sm:w-auto py-2 px-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold">Ciente Digital Confirmado</p>
                          <p className="text-[10px] text-emerald-700">
                            Em {new Date(holeriteAtivo.ciente_funcionario_em).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => confirmarCienteHolerite(holeriteAtivo.id)}
                        disabled={isLoading}
                        className="w-full sm:w-auto py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirmar Ciente Digital</span>
                      </button>
                    )}

                    <button
                      onClick={() => setModalDetalheOpen(true)}
                      className="w-full sm:w-auto py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ver Demonstrativo Completo (CLT)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Demonstrativo Linha por Linha Integrado */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Demonstrativo de Pagamento · Competência {holeriteAtivo.mes_referencia}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Discriminação item a item conforme folha de pagamento oficial CLT.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                    Pagamento: {holeriteAtivo.data_pagamento ? new Date(holeriteAtivo.data_pagamento).toLocaleDateString('pt-BR') : '05º dia útil'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-2.5 px-4 w-16 text-center">Cód</th>
                        <th className="py-2.5 px-4">Descrição da Rubrica</th>
                        <th className="py-2.5 px-4 w-28 text-center">Referência</th>
                        <th className="py-2.5 px-4 w-32 text-right">Vencimentos</th>
                        <th className="py-2.5 px-4 w-32 text-right text-red-600">Descontos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {holeriteAtivo.itens?.map((item) => {
                        const isDesconto = item.tipo === 'desconto';

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/60 transition-colors ${
                              isDesconto ? 'bg-red-50/15' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 text-center text-slate-500 text-[11px]">
                              {item.codigo}
                            </td>
                            <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                              {item.descricao}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-500 text-[11px]">
                              {item.referencia || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-emerald-700">
                              {item.tipo === 'provento'
                                ? `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-bold text-red-600">
                              {item.tipo === 'desconto'
                                ? `- R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-mono font-bold text-slate-900 border-t border-slate-300">
                        <td colSpan={3} className="py-3 px-4 text-right font-sans uppercase text-xs">
                          Totais Consolidados:
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">
                          R$ {holeriteAtivo.total_proventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600 tabular-nums">
                          - R$ {holeriteAtivo.total_descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="bg-slate-950 text-white font-mono">
                        <td colSpan={3} className="py-3 px-4 text-right font-sans font-bold uppercase text-xs">
                          Valor Líquido a Receber:
                        </td>
                        <td colSpan={2} className="py-3 px-4 text-right text-base font-black text-amber-400 tabular-nums">
                          R$ {holeriteAtivo.salario_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Bases Legais */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center font-mono">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Salário Base</span>
                    <strong className="text-slate-800">R$ {holeriteAtivo.salario_base.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Base INSS</span>
                    <strong className="text-slate-800">R$ {holeriteAtivo.base_inss.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Base FGTS</span>
                    <strong className="text-slate-800">R$ {holeriteAtivo.base_fgts.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">FGTS do Mês (8%)</span>
                    <strong className="text-amber-600">R$ {holeriteAtivo.valor_fgts.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DO DEMONSTRATIVO OFICIAL COMPLETO (PRONTO PARA IMPRESSÃO/PDF)      */}
      {/* ========================================================================= */}
      {modalDetalheOpen && holeriteAtivo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  Recibo de Pagamento de Salário
                </h3>
              </div>
              <button
                onClick={() => setModalDetalheOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 text-[11px]">
                <p className="font-bold text-slate-900">
                  TURNO CERTO SERVIÇOS OPERACIONAIS E FACILIDADES LTDA
                </p>
                <p className="text-slate-500">CNPJ: 12.345.678/0001-90</p>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 text-slate-700">
                  <span>Demonstrativo Oficial de Pagamento Mensal</span>
                  <strong className="text-slate-900">Mês: {holeriteAtivo.mes_referencia}</strong>
                </div>
              </div>

              <div className="border border-slate-300 p-3 rounded-lg grid grid-cols-2 text-[11px] gap-2">
                <div>
                  <span className="text-slate-400 block text-[9px]">FUNCIONÁRIO</span>
                  <strong className="text-slate-900">{currentUser?.full_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">CPF</span>
                  <span>{currentUser?.cpf}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">CARGO / FUNÇÃO</span>
                  <span>{currentUser?.cargo || 'Portaria'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">DATA DE PAGAMENTO</span>
                  <span>{holeriteAtivo.data_pagamento || '05º dia útil'}</span>
                </div>
              </div>

              {/* Tabela de Rubricas com Descontos em Vermelho */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="p-2 w-12 text-center">Cód</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 w-20 text-center">Ref.</th>
                      <th className="p-2 w-24 text-right">Vencimentos</th>
                      <th className="p-2 w-24 text-right text-red-600">Descontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {holeriteAtivo.itens?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 text-center text-slate-500">{item.codigo}</td>
                        <td className="p-2">{item.descricao}</td>
                        <td className="p-2 text-center text-slate-500">{item.referencia || '-'}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-700">
                          {item.tipo === 'provento' ? item.valor.toFixed(2) : ''}
                        </td>
                        <td className="p-2 text-right tabular-nums text-red-600 font-semibold">
                          {item.tipo === 'desconto' ? item.valor.toFixed(2) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                      <td colSpan={3} className="p-2 text-right uppercase">Totais:</td>
                      <td className="p-2 text-right text-emerald-700 tabular-nums">
                        R$ {holeriteAtivo.total_proventos.toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-red-600 tabular-nums">
                        R$ {holeriteAtivo.total_descontos.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-2 border-slate-900 bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase">VALOR LÍQUIDO A RECEBER:</span>
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  R$ {holeriteAtivo.salario_liquido.toFixed(2)}
                </span>
              </div>

              {/* Assinatura / Ciente */}
              <div className="border border-slate-200 p-3 rounded-lg text-center text-[10px] bg-slate-50">
                {holeriteAtivo.ciente_funcionario_em ? (
                  <p className="text-emerald-700 font-bold">
                    ✓ Assinatura Digital Trabalhista Registrada em: {new Date(holeriteAtivo.ciente_funcionario_em).toLocaleString('pt-BR')}
                  </p>
                ) : (
                  <p className="text-amber-800 font-semibold">
                    Aguardando assinatura de ciente pelo colaborador.
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="py-1.5 px-3 bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setModalDetalheOpen(false)}
                className="py-1.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
