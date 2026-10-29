import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Phone, 
  User, 
  Send,
  AlertCircle
} from 'lucide-react';
import { formatarLinkWhatsApp, anexarAssinaturaOperadorDataHora } from '../services/configWhatsappService';

export interface ModalWhatsAppDisparoProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  destinatarioNome: string;
  telefoneInicial?: string;
  tipo?: 'encomenda_entrada' | 'encomenda_baixa' | 'custodia_entrada' | 'custodia_saida';
  dadosComplementares?: { rotulo: string; valor: string }[];
  mensagemTexto: string;
  tentarAutoDisparo?: boolean;
  operadorNome?: string;
}

export const ModalWhatsAppDisparo: React.FC<ModalWhatsAppDisparoProps> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  destinatarioNome,
  telefoneInicial = '',
  tipo = 'encomenda_entrada',
  dadosComplementares = [],
  mensagemTexto,
  tentarAutoDisparo = true,
  operadorNome
}) => {
  const [telefone, setTelefone] = useState<string>(telefoneInicial);
  const [copiado, setCopiado] = useState(false);
  const [disparado, setDisparado] = useState(false);

  // Garante a inclusão do Nome do Operador, Data e Hora na mensagem exibida e disparada
  const mensagemFormatada = anexarAssinaturaOperadorDataHora(mensagemTexto, operadorNome);

  useEffect(() => {
    if (isOpen) {
      setTelefone(telefoneInicial);
      setCopiado(false);
      setDisparado(false);

      if (tentarAutoDisparo) {
        // Tenta abrir o link automaticamente uma vez ao abrir o modal
        const link = formatarLinkWhatsApp(telefoneInicial, mensagemFormatada);
        try {
          const a = document.createElement('a');
          a.href = link;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setDisparado(true);
        } catch {
          try {
            window.open(link, '_blank', 'noopener,noreferrer');
            setDisparado(true);
          } catch {
            // Se o navegador bloquear o popup, o operador clica no botão principal
          }
        }
      }
    }
  }, [isOpen, telefoneInicial, mensagemFormatada, tentarAutoDisparo]);

  if (!isOpen) return null;

  const linkAtual = formatarLinkWhatsApp(telefone, mensagemFormatada);

  const executarDisparo = () => {
    try {
      const a = document.createElement('a');
      a.href = linkAtual;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDisparado(true);
    } catch {
      window.open(linkAtual, '_blank', 'noopener,noreferrer');
      setDisparado(true);
    }
  };

  const copiarTexto = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(mensagemFormatada);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = mensagemFormatada;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      console.warn('Erro ao copiar texto:', err);
    }
  };

  const obterIconeEBadge = () => {
    switch (tipo) {
      case 'encomenda_entrada':
        return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', tag: 'Chegada de Encomenda' };
      case 'encomenda_baixa':
        return { badge: 'bg-blue-100 text-blue-800 border-blue-300', tag: 'Comprovante de Retirada' };
      case 'custodia_entrada':
        return { badge: 'bg-amber-100 text-amber-800 border-amber-300', tag: 'Custódia Registrada' };
      case 'custodia_saida':
        return { badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', tag: 'Custódia Devolvida' };
      default:
        return { badge: 'bg-green-100 text-green-800 border-green-300', tag: 'WhatsApp Notificação' };
    }
  };

  const { badge, tag } = obterIconeEBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border bg-white/20 text-white uppercase tracking-wider`}>
                  {tag}
                </span>
                {disparado && (
                  <span className="text-[10px] bg-emerald-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded-full">
                    Aberto
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white leading-tight mt-0.5">{titulo}</h2>
              {subtitulo && <p className="text-xs text-emerald-100 leading-tight mt-0.5">{subtitulo}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-slate-800 text-xs">
          {/* Informações Rápidas do Destinatário */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-900 text-sm">{destinatarioNome || 'Morador'}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
                Pronto para Envio
              </span>
            </div>

            {/* Dados Complementares (Unidade, Blocos, Volumes, Locais) */}
            {dadosComplementares.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                {dadosComplementares.map((d, i) => (
                  <div key={i} className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] text-slate-500 uppercase font-medium">{d.rotulo}</span>
                    <span className="font-bold text-slate-800 break-words">{d.valor}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Telefone do Destinatário (Editável) */}
            <div className="pt-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp do Destinatário:
                </span>
                {!telefone && (
                  <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Sem número (abrirá seletor de contato)
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999 ou 11999999999"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Você pode alterar ou digitar o WhatsApp aqui para redirecionar diretamente ao morador.
              </p>
            </div>
          </div>

          {/* Pré-visualização da Mensagem */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Conteúdo da Mensagem Formatada
              </span>
              <button
                type="button"
                onClick={copiarTexto}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition cursor-pointer"
              >
                {copiado ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copiar Texto
                  </>
                )}
              </button>
            </div>
            <div className="bg-emerald-950/5 border border-emerald-200/80 rounded-xl p-3 text-slate-700 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-emerald-200 shadow-inner">
              {mensagemFormatada}
            </div>
          </div>
        </div>

        {/* Rodapé com Ações em Destaque */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={executarDisparo}
            className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span>Abrir WhatsApp e Enviar</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 transition text-xs cursor-pointer shadow-2xs"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
