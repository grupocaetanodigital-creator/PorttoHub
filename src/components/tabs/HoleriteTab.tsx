import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Calculator, 
  Send, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Holerite, HoleriteItem, HoleriteItemTipo, Colaborador } from '../../types';
import { HoleriteDocumentModal } from '../holerite/HoleriteDocumentModal';
import confetti from 'canvas-confetti';

export const HoleriteTab: React.FC = () => {
  const { colaboradores, condominios, holerites, saveAndPublishHolerite, deleteHolerite, showToast } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'lancar' | 'historico'>('lancar');
  const [selectedColabId, setSelectedColabId] = useState<string>(colaboradores[0]?.id || '');
  const [mesReferencia, setMesReferencia] = useState('11/2026');
  const [salarioBase, setSalarioBase] = useState<number>(colaboradores[0]?.salarioBase || 2450);
  const [observacoesRH, setObservacoesRH] = useState('Competência Novembro/2026 com acréscimo de FTs.');

  // Selected collaborator object
  const selectedColab = colaboradores.find(c => c.id === selectedColabId);

  // Dynamic Item rows for the payslip
  const [itens, setItens] = useState<HoleriteItem[]>([
    { id: '1', codigo: '001', descricao: 'Salário Base Contratual', referencia: '220h', tipo: 'provento', valor: 2450.00 },
    { id: '2', codigo: '120', descricao: 'Horas Extras 50% (FT Cobertura)', referencia: '12h', tipo: 'provento', valor: 200.45 },
    { id: '3', codigo: '150', descricao: 'Auxílio Refeição / Alimentação', referencia: '22d', tipo: 'provento', valor: 450.00 },
    { id: '4', codigo: '501', descricao: 'INSS s/ Folha de Pagamento', referencia: '9.0%', tipo: 'desconto', valor: 238.54 },
    { id: '5', codigo: '510', descricao: 'Vale Transporte (6% CLT)', referencia: '6%', tipo: 'desconto', valor: 147.00 }
  ]);

  // Preview modal state
  const [viewingHolerite, setViewingHolerite] = useState<Holerite | null>(null);

  // When selected collaborator changes, update base salary
  useEffect(() => {
    if (selectedColab) {
      setSalarioBase(selectedColab.salarioBase);
      // Update first row if it was salary base
      setItens(prev => prev.map(item => {
        if (item.codigo === '001') {
          return { ...item, valor: selectedColab.salarioBase };
        }
        return item;
      }));
    }
  }, [selectedColabId, selectedColab]);

  // Automatic live calculations
  const totalProventos = itens
    .filter(i => i.tipo === 'provento')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const totalDescontos = itens
    .filter(i => i.tipo === 'desconto')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const valorLiquido = totalProventos - totalDescontos;

  // Row Manipulation
  const handleAddItem = (tipo: HoleriteItemTipo = 'provento') => {
    const newItem: HoleriteItem = {
      id: Date.now().toString(),
      codigo: tipo === 'provento' ? '199' : '599',
      descricao: tipo === 'provento' ? 'Novo Provento / Adicional' : 'Novo Desconto',
      referencia: '100%',
      tipo,
      valor: 0
    };
    setItens(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof HoleriteItem, val: unknown) => {
    setItens(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  // Quick Preset Adders
  const handleAddPreset = (nome: string, tipo: HoleriteItemTipo, valorSug: number, cod: string, ref: string) => {
    const newItem: HoleriteItem = {
      id: Date.now().toString(),
      codigo: cod,
      descricao: nome,
      referencia: ref,
      tipo,
      valor: valorSug
    };
    setItens(prev => [...prev, newItem]);
    showToast(`Adicionado: ${nome}`, 'info');
  };

  // Publishing action
  const handlePublish = async () => {
    if (!selectedColabId) {
      showToast('Selecione um colaborador', 'warning');
      return;
    }

    if (itens.length === 0) {
      showToast('Adicione pelo menos um item ao holerite', 'warning');
      return;
    }

    await saveAndPublishHolerite({
      colaboradorId: selectedColabId,
      mesReferencia,
      dataEmissao: new Date().toISOString().split('T')[0],
      salarioBase,
      itens,
      totalProventos,
      totalDescontos,
      valorLiquido,
      publicado: true,
      observacoesRH
    });

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }

    setActiveSubTab('historico');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span>Holerite RH & Pagamentos</span>
          </h2>
          <p className="text-xs text-slate-400">
            Lançamento 100% manual e publicação direta no app do colaborador
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex items-center">
        <button
          type="button"
          onClick={() => setActiveSubTab('lancar')}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'lancar'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Holerite Manual</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('historico')}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'historico'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Publicados ({holerites.length})</span>
        </button>
      </div>

      {activeSubTab === 'lancar' ? (
        /* Manual Launcher Form */
        <div className="space-y-4">
          {/* Section 1: Employee & Reference Selection */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <User className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Dados do Colaborador & Competência
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Selecionar Colaborador *
              </label>
              <select
                value={selectedColabId}
                onChange={(e) => setSelectedColabId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                {colaboradores.map((colab) => (
                  <option key={colab.id} value={colab.id}>
                    {colab.nome} &bull; {colab.cargo} (CPF: {colab.cpf})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mês / Ano de Referência
                </label>
                <input
                  type="text"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  placeholder="11/2026"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Salário Base (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Quick Event Presets */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Adicionar Verbas Pré-configuradas (1-Clique):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAddPreset('Horas Extras 50% (FT)', 'provento', 220.50, '120', '12h')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-900/40 transition-colors flex items-center gap-1"
              >
                <ArrowUpRight className="w-3 h-3" />
                + FT / Hora Extra 50%
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Adicional Noturno 20%', 'provento', 195.00, '125', '20%')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-900/40 transition-colors flex items-center gap-1"
              >
                <ArrowUpRight className="w-3 h-3" />
                + Adicional Noturno
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Adicional Assiduidade', 'provento', 150.00, '130', '100%')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-900/40 transition-colors flex items-center gap-1"
              >
                <ArrowUpRight className="w-3 h-3" />
                + Bônus Assiduidade
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Desconto Falta / Atraso', 'desconto', 120.00, '540', '1d', )}
                className="px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] font-semibold hover:bg-red-900/40 transition-colors flex items-center gap-1"
              >
                <ArrowDownRight className="w-3 h-3" />
                - Desconto de Falta
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Adiantamento Salarial (Vale)', 'desconto', 800.00, '520', '40%')}
                className="px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] font-semibold hover:bg-red-900/40 transition-colors flex items-center gap-1"
              >
                <ArrowDownRight className="w-3 h-3" />
                - Vale Quinzenal
              </button>
            </div>
          </div>

          {/* Section 3: Dynamic Item Lines (Código, Descrição, Referência, Tipo, Valor) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                2. Verbas e Linhas do Demonstrativo ({itens.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem('provento')}
                  className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold transition-colors"
                >
                  + Provento
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('desconto')}
                  className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-[11px] font-bold transition-colors"
                >
                  + Desconto
                </button>
              </div>
            </div>

            {/* Item Rows List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                    item.tipo === 'provento'
                      ? 'bg-slate-950/70 border-emerald-500/30'
                      : 'bg-slate-950/70 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {/* Code */}
                      <input
                        type="text"
                        value={item.codigo}
                        onChange={(e) => handleUpdateItem(item.id, 'codigo', e.target.value)}
                        placeholder="Cód"
                        className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-[11px] text-slate-300"
                      />
                      {/* Description */}
                      <input
                        type="text"
                        value={item.descricao}
                        onChange={(e) => handleUpdateItem(item.id, 'descricao', e.target.value)}
                        placeholder="Descrição da verba"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Reference */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Ref:</span>
                      <input
                        type="text"
                        value={item.referencia}
                        onChange={(e) => handleUpdateItem(item.id, 'referencia', e.target.value)}
                        placeholder="Ex: 220h"
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-[11px] text-slate-300"
                      />
                    </div>

                    {/* Type selector */}
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, 'tipo', 'provento')}
                        className={`px-2 py-0.5 rounded ${item.tipo === 'provento' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        + Provento
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, 'tipo', 'desconto')}
                        className={`px-2 py-0.5 rounded ${item.tipo === 'desconto' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
                      >
                        - Desconto
                      </button>
                    </div>

                    {/* Valor R$ */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-mono font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.valor}
                        onChange={(e) => handleUpdateItem(item.id, 'valor', parseFloat(e.target.value) || 0)}
                        className={`w-28 bg-slate-900 border rounded-lg px-2.5 py-1 text-right font-mono font-bold text-xs ${
                          item.tipo === 'provento'
                            ? 'text-emerald-400 border-emerald-500/40'
                            : 'text-red-400 border-red-500/40'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Live Totals & Net Pay Card */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 rounded-2xl border border-blue-500/30 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Total de Proventos (+):</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                + R$ {totalProventos.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Total de Descontos (-):</span>
              <span className="font-mono font-bold text-red-400 text-sm">
                - R$ {totalDescontos.toFixed(2)}
              </span>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 block">
                  Líquido a Receber (Cálculo Automático)
                </span>
                <span className="text-xs text-slate-400">Valor creditado ao operador</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono tracking-tight text-emerald-400">
                  R$ {valorLiquido.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Publish Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePublish}
                className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:opacity-95 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Publicar Holerite no App do Colaborador</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History of Published Payslips */
        <div className="space-y-3">
          {holerites.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 text-center">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">Nenhum holerite publicado ainda.</p>
              <button
                type="button"
                onClick={() => setActiveSubTab('lancar')}
                className="mt-3 text-xs text-blue-400 font-bold hover:underline"
              >
                + Lançar Primeiro Holerite
              </button>
            </div>
          ) : (
            holerites.map((hol) => {
              const colab = colaboradores.find(c => c.id === hol.colaboradorId);
              const condo = condominios.find(c => c.id === colab?.condominioId);

              return (
                <div
                  key={hol.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={colab?.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                        alt={colab?.nome || 'Colaborador'}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-800"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Publicado no App
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Ref: {hol.mesReferencia}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 truncate">{colab?.nome}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          {colab?.cargo} &bull; {condo?.nome || 'Central'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium block">Valor Líquido</span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        R$ {hol.valorLiquido.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Proventos: <strong className="text-emerald-400 font-mono">+R$ {hol.totalProventos.toFixed(2)}</strong></span>
                    <span>Descontos: <strong className="text-red-400 font-mono">-R$ {hol.totalDescontos.toFixed(2)}</strong></span>
                    <span>Verbas: <strong className="text-white">{hol.itens.length}</strong></span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setViewingHolerite(hol)}
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Contracheque Oficial</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteHolerite(hol.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir Holerite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Official Brazilian Payslip Viewer Document */}
      <HoleriteDocumentModal
        holerite={viewingHolerite}
        colaborador={colaboradores.find(c => c.id === viewingHolerite?.colaboradorId)}
        condominio={condominios.find(c => c.id === colaboradores.find(col => col.id === viewingHolerite?.colaboradorId)?.condominioId)}
        onClose={() => setViewingHolerite(null)}
      />
    </div>
  );
};
