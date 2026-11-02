/**
 * Trilha de Auditoria do Sistema (Audit Log)
 * Acesso exclusivo a Administradores para conformidade e rastreabilidade de ações sensíveis.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Lock,
  Calendar,
  User,
  Database,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { listarAuditLogs } from '../lib/storageEngine';
import { useAuth } from '../contexts/AuthContext';

export const Auditoria: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [logs, setLogs] = useState(() => listarAuditLogs());
  const [busca, setBusca] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('todas');

  useEffect(() => {
    const handleUpdate = () => setLogs(listarAuditLogs());
    window.addEventListener('amigos_caio_storage_update', handleUpdate);
    return () => window.removeEventListener('amigos_caio_storage_update', handleUpdate);
  }, []);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center">
        <Lock className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h3 className="text-base font-bold text-rose-900">Acesso Restrito a Administradores</h3>
        <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
          O registro de auditoria contém informações sensíveis de segurança e governança. Solicite acesso a um administrador do gabinete.
        </p>
      </div>
    );
  }

  const logsFiltrados = useMemo(() => {
    return logs.filter((l) => {
      const matchBusca =
        !busca ||
        l.acao.toLowerCase().includes(busca.toLowerCase()) ||
        l.user_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        l.entidade?.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;
      if (filtroAcao !== 'todas' && l.acao !== filtroAcao) return false;

      return true;
    });
  }, [logs, busca, filtroAcao]);

  const exportarAuditCSV = () => {
    const dados = logsFiltrados.map((l) => ({
      'ID Log': l.id,
      'Data/Hora': new Date(l.criado_em).toLocaleString('pt-BR'),
      'Operador': l.user_nome || 'Sistema',
      'Ação': l.acao,
      'Entidade': l.entidade || '',
      'ID Entidade': l.entidade_id || '',
      'Detalhes': l.detalhes ? JSON.stringify(l.detalhes) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_amigos_do_caio_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Trilha de Auditoria e Governança
          </h2>
          <p className="text-xs text-[#5A6382]">
            Rastreamento de ações administrativas, disparos, importações e alterações no banco
          </p>
        </div>

        <button
          onClick={exportarAuditCSV}
          className="flex items-center gap-1.5 rounded-lg border border-[#E4E7F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#F7F8FC]"
        >
          <Download className="h-4 w-4 text-[#5A6382]" /> Exportar CSV
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-2xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6382]" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação ou entidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] pl-9 pr-4 py-2 text-xs text-[#0B1020]"
          />
        </div>

        <select
          value={filtroAcao}
          onChange={(e) => setFiltroAcao(e.target.value)}
          className="rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020]"
        >
          <option value="todas">Todas as Ações</option>
          <option value="LOGIN">Login</option>
          <option value="IMPORTAR_EXCEL">Importação Excel</option>
          <option value="CRIAR_CAMPANHA">Criação de Campanha</option>
          <option value="EXCLUIR_TUTOR">Exclusão de Tutor</option>
          <option value="ALTERAR_CONFIGURACOES">Alteração de Configurações</option>
          <option value="CRIAR_USUARIO">Criação de Usuário</option>
        </select>
      </div>

      {/* Tabela de Logs */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Data e Hora</th>
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Ação Realizada</th>
                <th className="px-5 py-3.5">Entidade</th>
                <th className="px-5 py-3.5">Metadados / Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7F0]">
              {logsFiltrados.map((log) => (
                <tr key={log.id} className="hover:bg-[#F7F8FC] transition-colors">
                  <td className="px-5 py-3.5 text-[#5A6382] tabular-nums font-mono whitespace-nowrap">
                    {new Date(log.criado_em).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#0B1020] whitespace-nowrap">
                    {log.user_nome || 'Sistema'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold text-[#06154E] bg-[#EEF1FA] px-2 py-0.5 rounded-md">
                      {log.acao}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#5A6382] capitalize">
                    {log.entidade || '---'}
                  </td>
                  <td className="px-5 py-3.5 text-[#0B1020]">
                    {log.detalhes ? (
                      <pre className="text-[11px] font-mono text-[#5A6382] bg-[#F7F8FC] p-1.5 rounded-md max-w-md overflow-x-auto">
                        {JSON.stringify(log.detalhes)}
                      </pre>
                    ) : (
                      '---'
                    )}
                  </td>
                </tr>
              ))}
              {logsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#5A6382]">
                    Nenhum log encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
