import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  User, 
  Lock, 
  Key, 
  ShieldCheck, 
  Building2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  Trash2
} from 'lucide-react';
import { comprimirImagemBase64 } from '../services/imageUtils';

interface ModalMeuPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  operador: any;
  condominio: any;
  onOperadorAtualizado?: (operadorAtualizado: any) => void;
}

export default function ModalMeuPerfil({
  isOpen,
  onClose,
  operador,
  condominio,
  onOperadorAtualizado
}: ModalMeuPerfilProps) {
  const [nome, setNome] = useState(operador?.nome || '');
  const [fotoUrl, setFotoUrl] = useState(operador?.foto_url || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isOpen || !operador) return null;

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await comprimirImagemBase64(file, 400, 400, 0.82);
      setFotoUrl(base64);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    }
  };

  const getNivelNome = (nivel?: number) => {
    switch (nivel) {
      case 0: return 'Dev / Administrador Geral (Total)';
      case 1: return 'Master / Síndico do Condomínio';
      case 2: return 'Supervisor Operacional';
      case 3:
      default: return 'Operador / Porteiro';
    }
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    if (!nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O nome do operador não pode ficar vazio.' });
      return;
    }

    if (novaSenha.trim()) {
      if (novaSenha.length < 4) {
        setMensagem({ tipo: 'erro', texto: 'A nova senha deve ter no mínimo 4 caracteres.' });
        return;
      }
      if (novaSenha !== confirmaNovaSenha) {
        setMensagem({ tipo: 'erro', texto: 'A confirmação de senha não confere com a nova senha digitada.' });
        return;
      }
    }

    setLoading(true);
    try {
      const payload: { nome: string; senha?: string; foto_url?: string | null } = {
        nome: nome.trim(),
        foto_url: fotoUrl || null
      };

      if (novaSenha.trim()) {
        payload.senha = novaSenha.trim();
      }

      const { error } = await supabase
        .from('operadores')
        .update(payload)
        .eq('id', operador.id);

      if (error) throw error;

      const operadorAtualizado = {
        ...operador,
        nome: payload.nome,
        foto_url: payload.foto_url,
        ...(payload.senha ? { senha: payload.senha } : {})
      };

      // Atualiza no localStorage
      try {
        const sessaoRaw = localStorage.getItem('infport_sessao_operador');
        if (sessaoRaw) {
          const sessao = JSON.parse(sessaoRaw);
          sessao.operador = operadorAtualizado;
          localStorage.setItem('infport_sessao_operador', JSON.stringify(sessao));
        }
      } catch {}

      if (onOperadorAtualizado) {
        onOperadorAtualizado(operadorAtualizado);
      }

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmaNovaSenha('');
      setMensagem({ 
        tipo: 'sucesso', 
        texto: novaSenha.trim() 
          ? 'Foto, dados e senha atualizados com sucesso no banco de dados!' 
          : 'Foto de perfil e dados atualizados com sucesso!' 
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Falha ao atualizar dados: ${err.message || 'Erro desconhecido'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Meu Perfil & Segurança</h3>
              <p className="text-xs text-slate-400">Gerencie seus dados e altere sua senha de acesso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5">
          {mensagem && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
              mensagem.tipo === 'sucesso' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {mensagem.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{mensagem.texto}</span>
            </div>
          )}

          {/* Foto de Perfil do Operador */}
          <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="relative group shrink-0">
              {fotoUrl ? (
                <img 
                  src={fotoUrl} 
                  alt={nome} 
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm" 
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-emerald-400 font-black text-xl flex items-center justify-center border-2 border-slate-700 shadow-sm">
                  {nome ? nome.charAt(0).toUpperCase() : 'OP'}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">Foto de Perfil</span>
              <p className="text-[11px] text-slate-500">Aparecerá no cabeçalho e nos relatórios de portaria.</p>
              <div className="flex items-center gap-2 pt-0.5">
                <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{fotoUrl ? 'Trocar Foto' : 'Tirar / Carregar Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                </label>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl('')}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cards de Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Nível de Acesso
              </span>
              <p className="text-xs font-bold text-slate-800">
                {getNivelNome(operador.nivel_acesso)}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" /> Condomínio Vinculado
              </span>
              <p className="text-xs font-bold text-slate-800 truncate" title={condominio?.nome || 'Não definido'}>
                {condominio?.nome || 'Administração Geral'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSalvarPerfil} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Usuário / Login (Fixo)
              </label>
              <input
                type="text"
                disabled
                value={operador.login}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                O login é único e só pode ser alterado pelo Administrador do sistema.
              </span>
            </div>

            {/* Seção Alterar Senha */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" /> Alterar Senha de Acesso
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarSenhas(!mostrarSenhas)}
                  className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1"
                >
                  {mostrarSenhas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{mostrarSenhas ? 'Ocultar' : 'Visualizar'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type={mostrarSenhas ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 4 dígitos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type={mostrarSenhas ? 'text' : 'password'}
                    value={confirmaNovaSenha}
                    onChange={(e) => setConfirmaNovaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Deixe os campos de senha em branco se desejar manter sua senha atual inalterada.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
