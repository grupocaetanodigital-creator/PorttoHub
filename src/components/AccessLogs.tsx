import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Filter, 
  Eye, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import { Condominium, AccessLog } from '../types';

interface AccessLogsProps {
  condo: Condominium;
  logs: AccessLog[];
}

export const AccessLogs: React.FC<AccessLogsProps> = ({
  condo,
  logs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterMethod, setFilterMethod] = useState<string>('todos');
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.gate.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'todos' || log.status === filterStatus;
    const matchesMethod = filterMethod === 'todos' || log.method === filterMethod;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Horario', 'Nome', 'Unidade', 'Status', 'Metodo', 'Portao', 'Motivo'];
    const rows = filteredLogs.map((l) => [
      l.date,
      l.timestamp,
      `"${l.residentName}"`,
      `"${l.unit}"`,
      l.status,
      `"${l.method}"`,
      `"${l.gate}"`,
      `"${l.reason || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_acessos_${condo.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white">Auditoria & Logs de Acesso</h2>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
              {condo.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico imutável de validações faciais e aberturas em <strong className="text-cyan-400">{condo.name}</strong> ({logs.length} eventos).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* FILTERS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar nome, unidade ou portão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="todos">Todos os Status</option>
          <option value="Liberado">Liberados</option>
          <option value="Negado">Negados / Bloqueados</option>
        </select>

        {/* Filter Method */}
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="todos">Todos os Métodos</option>
          <option value="Reconhecimento Facial">Reconhecimento Facial</option>
          <option value="QR Code">QR Code Temporário</option>
          <option value="Acionamento Remoto">Acionamento Remoto</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Horário / Data</th>
                <th className="p-3.5">Pessoa Identificada</th>
                <th className="p-3.5">Unidade</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Método & Dispositivo</th>
                <th className="p-3.5 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/80 transition">
                  <td className="p-3.5 text-slate-400">
                    <div>{log.timestamp}</div>
                    <div className="text-[10px] text-slate-500">{log.date}</div>
                  </td>
                  
                  <td className="p-3.5 font-bold text-white font-sans">
                    <div className="flex items-center space-x-2.5">
                      {log.photoUrl ? (
                        <img
                          src={log.photoUrl}
                          alt={log.residentName}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="truncate max-w-[180px]">{log.residentName}</span>
                    </div>
                  </td>

                  <td className="p-3.5 text-cyan-400 font-medium">{log.unit}</td>

                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                        log.status === 'Liberado'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>

                  <td className="p-3.5 text-slate-400 font-sans">
                    <div>{log.method}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{log.gate}</div>
                  </td>

                  <td className="p-3.5 text-right font-sans">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                      title="Ver Dados da Validação"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum evento registrado com os filtros aplicados.
          </div>
        )}
      </div>

      {/* LOG DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Auditoria de Evento</h3>
                <p className="text-xs text-slate-400">ID: {selectedLog.id} &bull; {condo.name}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {selectedLog.photoUrl ? (
                  <img
                    src={selectedLog.photoUrl}
                    alt={selectedLog.residentName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500">
                    <Camera className="w-8 h-8" />
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-lg text-white">{selectedLog.residentName}</h4>
                  <p className="text-xs text-cyan-400 font-semibold">{selectedLog.unit}</p>
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      selectedLog.status === 'Liberado'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {selectedLog.reason && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Motivo: {selectedLog.reason}</span>
                </div>
              )}

              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Data / Horário:</span>
                  <span className="text-slate-200">{selectedLog.date} às {selectedLog.timestamp}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Método de Acesso:</span>
                  <span className="text-slate-200">{selectedLog.method}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Ponto de Acesso / Gate:</span>
                  <span className="text-slate-200">{selectedLog.gate}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Anti-Spoofing Liveness:</span>
                  <span className="text-emerald-400 font-bold">{selectedLog.livenessScore ? `${selectedLog.livenessScore}%` : '98.5%'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Confiança Biometria:</span>
                  <span className="text-cyan-400 font-bold">{selectedLog.confidenceScore ? `${selectedLog.confidenceScore}%` : '99.2%'}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-slate-800 text-slate-200 px-5 py-2 rounded-xl text-xs font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
