import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BottomSheet } from '../ui/BottomSheet';
import confetti from 'canvas-confetti';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { adminCredentials, changePassword, showToast } = useApp();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPass) {
      showToast('Digite a senha atual.', 'warning');
      return;
    }

    if (!newPass) {
      showToast('Digite a nova senha.', 'warning');
      return;
    }

    if (newPass !== confirmPass) {
      showToast('A confirmação da nova senha não confere.', 'error');
      return;
    }

    const success = changePassword(currentPass, newPass);
    if (success) {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Trocar Senha de Acesso"
      subtitle={`Usuário Administrador: ${adminCredentials.login}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Info Card */}
        <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Login: {adminCredentials.login}</p>
            <p className="text-[11px] text-slate-400">Perfil: Administrador / Gestor Geral</p>
          </div>
        </div>

        {/* Current Password */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Senha Atual *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showCurrent ? 'text' : 'password'}
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Digite a senha atual"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Nova Senha *
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showNew ? 'text' : 'password'}
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Confirmar Nova Senha *
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[46px] rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Salvar Nova Senha
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};
