import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  Users, 
  DollarSign, 
  ShieldAlert, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { CommonArea, AreaType } from '../types';
import { AreaIcon } from './AreaIcon';
import { formatCurrencyBRL } from '../utils/timeSlots';

interface AreaManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  condoName: string;
  condoId: string;
  areas: CommonArea[];
  onSaveArea: (area: CommonArea) => void;
  onDeleteArea: (areaId: string) => void;
}

export const AreaManagementModal: React.FC<AreaManagementModalProps> = ({
  isOpen,
  onClose,
  condoName,
  condoId,
  areas,
  onSaveArea,
  onDeleteArea,
}) => {
  const [editingArea, setEditingArea] = useState<CommonArea | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AreaType>('quadra');
  const [formStartHour, setFormStartHour] = useState('07:00');
  const [formEndHour, setFormEndHour] = useState('22:00');
  const [formSlotDuration, setFormSlotDuration] = useState(60);
  const [formCapacity, setFormCapacity] = useState(4);
  const [formCleaningFee, setFormCleaningFee] = useState(0);
  const [formDescription, setFormDescription] = useState('');
  const [formRulesText, setFormRulesText] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  if (!isOpen) return null;

  const startCreateNew = () => {
    setIsCreating(true);
    setEditingArea(null);
    setFormName('');
    setFormType('quadra');
    setFormStartHour('07:00');
    setFormEndHour('22:00');
    setFormSlotDuration(60);
    setFormCapacity(4);
    setFormCleaningFee(0);
    setFormDescription('');
    setFormRulesText('Uso exclusivo de moradores e convidados autorizados\nRespeitar o horário de silêncio');
    setFormIsActive(true);
  };

  const startEdit = (area: CommonArea) => {
    setEditingArea(area);
    setIsCreating(false);
    setFormName(area.name);
    setFormType(area.type);
    setFormStartHour(area.startHour);
    setFormEndHour(area.endHour);
    setFormSlotDuration(area.slotDurationMinutes);
    setFormCapacity(area.capacity);
    setFormCleaningFee(area.cleaningFee);
    setFormDescription(area.description);
    setFormRulesText(area.rules?.join('\n') || '');
    setFormIsActive(area.isActive);
  };

  const handleCancelForm = () => {
    setEditingArea(null);
    setIsCreating(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const rules = formRulesText
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const updatedArea: CommonArea = {
      id: editingArea ? editingArea.id : `area-${Date.now()}`,
      condoId: condoId,
      name: formName.trim(),
      type: formType,
      startHour: formStartHour,
      endHour: formEndHour,
      slotDurationMinutes: Number(formSlotDuration) || 60,
      capacity: Number(formCapacity) || 1,
      cleaningFee: Number(formCleaningFee) || 0,
      description: formDescription.trim(),
      rules: rules,
      isActive: formIsActive,
    };

    onSaveArea(updatedArea);
    handleCancelForm();
  };

  const condoAreas = areas.filter((a) => a.condoId === condoId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Configuração de Áreas Comuns
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{condoName}</span>
              <span aria-hidden="true">·</span>
              <span>{condoAreas.length} áreas cadastradas</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && !editingArea && (
              <button
                type="button"
                onClick={startCreateNew}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Nova Área
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Regras e Horários Flexíveis:</span> Cada condomínio possui rotinas próprias. Você pode personalizar de que horas até que horas cada quadra, academia ou salão pode ser agendado, a duração dos intervalos e capacidade máxima de pessoas.
            </div>
          </div>

          {/* Form for Add/Edit */}
          {(isCreating || editingArea) ? (
            <form onSubmit={handleSaveForm} className="bg-slate-50/70 border border-indigo-100 rounded-xl p-5 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AreaIcon type={formType} className="w-4 h-4 text-indigo-600" />
                  {isCreating ? 'Adicionar Nova Área Comum' : `Editar: ${editingArea?.name}`}
                </h3>
                <span className="text-xs text-slate-500">
                  Defina os horários de início e término permitidos para reservas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Área Comum *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Quadra de Tênis Rápida, Academia, Salão de Jogos..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria do Espaço
                  </label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="quadra">Quadra Esportiva (Tênis, Beach Tennis, Futsal)</option>
                    <option value="academia">Academia / Fitness Center</option>
                    <option value="jogos">Salão de Jogos / Sinuca</option>
                    <option value="churrasqueira">Churrasqueira / Espaço Gourmet</option>
                    <option value="festa">Salão de Festas</option>
                    <option value="piscina">Piscina</option>
                    <option value="coworking">Coworking / Sala de Reunião</option>
                    <option value="outro">Outro Espaço Comum</option>
                  </select>
                </div>
              </div>

              {/* HORÁRIOS: Requisito Chave "editar de que horas ate que horas pode ser agendado cada area" */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Janela de Horários para Agendamento
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      De que horas pode agendar (Início)
                    </label>
                    <input
                      type="time"
                      value={formStartHour}
                      onChange={(e) => setFormStartHour(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums font-semibold"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Primeiro horário disponível no dia
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Até que horas pode agendar (Término)
                    </label>
                    <input
                      type="time"
                      value={formEndHour}
                      onChange={(e) => setFormEndHour(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums font-semibold"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Horário limite de encerramento
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duração de cada Agendamento
                    </label>
                    <select
                      value={formSlotDuration}
                      onChange={(e) => setFormSlotDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value={30}>30 minutos (Express)</option>
                      <option value={60}>1 hora (Padrão para quadras/jogos)</option>
                      <option value={90}>1 hora e 30 minutos</option>
                      <option value={120}>2 horas</option>
                      <option value={240}>4 horas (Turno churrasqueira)</option>
                      <option value={360}>6 horas (Festa vespertina)</option>
                      <option value={720}>12 horas (Dia completo)</option>
                    </select>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Tamanho de cada bloco de reserva
                    </span>
                  </div>
                </div>
              </div>

              {/* Capacidade, Taxa e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacidade Máxima (Pessoas)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxa de Limpeza / Uso (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formCleaningFee}
                    onChange={(e) => setFormCleaningFee(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums"
                    placeholder="0 para Gratuito"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">0 = Gratuito para moradores</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disponibilidade
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Área Ativa para Agendamentos</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Descrição e Regras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição do Espaço & Equipamentos
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Piso de saibro, iluminação em LED, 2 raquetes disponíveis na portaria..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Regras de Uso (uma por linha)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex:&#10;Uso de calçado adequado&#10;Desligar luzes ao terminar"
                    value={formRulesText}
                    onChange={(e) => setFormRulesText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Configurações da Área
                </button>
              </div>
            </form>
          ) : null}

          {/* List of existing areas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900">
              Áreas Cadastradas neste Condomínio ({condoAreas.length})
            </h3>

            {condoAreas.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">Nenhuma área comum cadastrada ainda.</p>
                <button
                  type="button"
                  onClick={startCreateNew}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                >
                  Criar Primeira Área
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {condoAreas.map((area) => (
                  <div
                    key={area.id}
                    className={`p-4 rounded-xl border transition-all ${
                      area.isActive 
                        ? 'border-slate-200 bg-white hover:border-slate-300' 
                        : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <AreaIcon type={area.type} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{area.name}</h4>
                            {!area.isActive && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">
                                Inativo
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 capitalize">{area.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(area)}
                          title="Editar horários e configurações"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        {deleteConfirmId === area.id ? (
                          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                            <span className="text-[10px] text-red-700 font-semibold px-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteArea(area.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded font-bold"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(area.id)}
                            title="Remover área"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Schedule details */}
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Horário</span>
                        <span className="font-semibold text-slate-800 font-mono tabular-nums">
                          {area.startHour} às {area.endHour}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Slot</span>
                        <span className="font-semibold text-slate-800 font-mono tabular-nums">
                          {area.slotDurationMinutes} min
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Capacidade</span>
                        <span className="font-semibold text-slate-800 font-mono tabular-nums">
                          {area.capacity} pessoas
                        </span>
                      </div>
                    </div>

                    {area.description && (
                      <p className="mt-2 text-[11px] text-slate-500 line-clamp-1">
                        {area.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
