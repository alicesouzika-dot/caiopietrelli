/**
 * Histórico de Campanhas e Relatórios Detalhados de Envios
 * Drill-down por campanha, exportação em CSV e reenvio de falhas.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  RotateCcw,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  listarCampanhas,
  listarEnvios,
  atualizarEnvio,
  excluirCampanha,
  adicionarAuditLog,
} from '../lib/storageEngine';
import { Campanha, Envio } from '../types/database';
import { formatarTelefoneExibicao } from '../lib/telefone';
import { formatarCPF } from '../lib/cpf';
import { useAuth } from '../contexts/AuthContext';
import { dispararMensagemZApi } from '../lib/zapi';

export const Historico: React.FC = () => {
  const { role, usuario, temPermissao } = useAuth();
  const podeExcluir = temPermissao('cancelarExcluirCampanha');

  const [campanhas, setCampanhas] = useState(() => listarCampanhas());
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroMetodo, setFiltroMetodo] = useState('todos');

  // Campanha selecionada para Drill-down
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  const [enviosCampanha, setEnviosCampanha] = useState<Envio[]>([]);
  const [filtroStatusEnvio, setFiltroStatusEnvio] = useState('todos');

  const recarregar = () => {
    setCampanhas(listarCampanhas());
    setCampanhaSelecionada((prev) => {
      if (prev) {
        setEnviosCampanha(listarEnvios(prev.id));
      }
      return prev;
    });
  };

  useEffect(() => {
    window.addEventListener('amigos_caio_storage_update', recarregar);
    return () => window.removeEventListener('amigos_caio_storage_update', recarregar);
  }, []);

  const abrirDrillDown = (campanha: Campanha) => {
    setCampanhaSelecionada(campanha);
    setEnviosCampanha(listarEnvios(campanha.id));
    setFiltroStatusEnvio('todos');
  };

  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter((c) => {
      const matchBusca = !busca || c.nome.toLowerCase().includes(busca.toLowerCase());
      if (!matchBusca) return false;

      if (filtroCategoria !== 'todas' && c.categoria !== filtroCategoria) return false;
      if (filtroMetodo !== 'todos' && c.metodo !== filtroMetodo) return false;

      return true;
    });
  }, [campanhas, busca, filtroCategoria, filtroMetodo]);

  const enviosFiltrados = useMemo(() => {
    if (filtroStatusEnvio === 'todos') return enviosCampanha;
    return enviosCampanha.filter((e) => e.status === filtroStatusEnvio);
  }, [enviosCampanha, filtroStatusEnvio]);

  const handleReenviarFalhaIndividual = async (envio: Envio) => {
    atualizarEnvio(envio.id, { status: 'enviando' });
    recarregar();

    const res = await dispararMensagemZApi(envio.telefone_destino, envio.mensagem_final);
    if (res.ok) {
      atualizarEnvio(envio.id, {
        status: 'enviado',
        enviado_em: new Date().toISOString(),
        zapi_message_id: res.messageId,
      });
      alert('Mensagem reenviada com sucesso!');
    } else {
      atualizarEnvio(envio.id, {
        status: 'erro',
        erro: res.erro || 'Falha no reenvio',
      });
      alert('Erro ao reenviar: ' + res.erro);
    }
    recarregar();
  };

  const exportarCampanhaCSV = (campanha: Campanha) => {
    const envios = listarEnvios(campanha.id);
    const dados = envios.map((e, idx) => ({
      'Item': idx + 1,
      'Campanha': campanha.nome,
      'Método': campanha.metodo,
      'Tutor': e.tutor?.nome_completo || '',
      'Telefone Destino': formatarTelefoneExibicao(e.telefone_destino),
      'Bairro': e.tutor?.bairro || '',
      'Status': e.status.toUpperCase(),
      'Data/Hora Envio': e.enviado_em ? new Date(e.enviado_em).toLocaleString('pt-BR') : '',
      'Mensagem Final': e.mensagem_final,
      'Diagnóstico de Erro': e.erro || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanha_${campanha.nome.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Histórico de Campanhas e Disparos
          </h2>
          <p className="text-xs text-[#5A6382]">
            Relatório completo de entregas, relatórios em CSV e recuperação de falhas
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-2xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6382]" />
          <input
            type="text"
            placeholder="Buscar por nome da campanha..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] pl-9 pr-4 py-2 text-xs text-[#0B1020]"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020]"
        >
          <option value="todas">Todas as Categorias</option>
          <option value="vacinacao">Vacinação</option>
          <option value="adocao">Feira de Adoção</option>
          <option value="evento">Evento Pet</option>
          <option value="castracao">Castração</option>
          <option value="geral">Geral</option>
        </select>

        <select
          value={filtroMetodo}
          onChange={(e) => setFiltroMetodo(e.target.value)}
          className="rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020]"
        >
          <option value="todos">Todos os Métodos</option>
          <option value="manual">Manual (wa.me)</option>
          <option value="zapi">Automático (Z-API)</option>
        </select>
      </div>

      {/* Tabela de Campanhas */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Campanha</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Método</th>
                <th className="px-5 py-3.5">Destinatários</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Data Criação</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7F0]">
              {campanhasFiltradas.map((c) => (
                <tr key={c.id} className="hover:bg-[#F7F8FC] transition-colors">
                  <td className="px-5 py-4 font-semibold text-[#0B1020]">
                    {c.nome}
                  </td>
                  <td className="px-5 py-4 capitalize text-[#5A6382]">
                    {c.categoria}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {c.metodo === 'zapi' ? 'Automático (Z-API)' : 'Manual (wa.me)'}
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    <span className="font-semibold text-emerald-700">{c.total_enviados}</span> / {c.total_destinatarios}
                    {c.total_erros > 0 && (
                      <span className="text-rose-600 font-semibold ml-1.5">
                        ({c.total_erros} erros)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        c.status === 'concluida'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : c.status === 'em_andamento'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#5A6382] tabular-nums">
                    {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => abrirDrillDown(c)}
                        className="flex items-center gap-1 rounded-md bg-[#EEF1FA] border border-[#E4E7F0] px-2.5 py-1 text-xs font-semibold text-[#0A2472] hover:bg-[#0A2472] hover:text-white transition-colors"
                        title="Ver destinatários detalhados"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalhes
                      </button>

                      <button
                        onClick={() => exportarCampanhaCSV(c)}
                        className="p-1.5 text-[#5A6382] hover:text-[#0B1020]"
                        title="Exportar CSV desta campanha"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {campanhasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#5A6382]">
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DRILL-DOWN: DETALHES DE ENVIOS DA CAMPANHA */}
      {campanhaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-[#E4E7F0] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
              <div>
                <h3 className="text-base font-bold text-white">
                  {campanhaSelecionada.nome}
                </h3>
                <p className="text-xs text-white/70">
                  Canal: {campanhaSelecionada.metodo.toUpperCase()} · Criada em {new Date(campanhaSelecionada.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportarCampanhaCSV(campanhaSelecionada)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </button>
                <button
                  onClick={() => setCampanhaSelecionada(null)}
                  className="p-1.5 text-white/70 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filtros Internos do Drill Down */}
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-3 bg-[#F7F8FC] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#5A6382]">Status:</span>
                <select
                  value={filtroStatusEnvio}
                  onChange={(e) => setFiltroStatusEnvio(e.target.value)}
                  className="rounded-md border border-[#E4E7F0] bg-white px-2.5 py-1 text-xs"
                >
                  <option value="todos">Todos ({enviosCampanha.length})</option>
                  <option value="enviado">Enviados ({enviosCampanha.filter((e) => e.status === 'enviado').length})</option>
                  <option value="erro">Erros ({enviosCampanha.filter((e) => e.status === 'erro').length})</option>
                  <option value="pendente">Pendentes ({enviosCampanha.filter((e) => e.status === 'pendente').length})</option>
                </select>
              </div>

              <span className="text-[#5A6382]">
                Mostrando <b>{enviosFiltrados.length}</b> registros
              </span>
            </div>

            {/* Tabela de Destinatários e Status */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] font-semibold text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5">Tutor</th>
                    <th className="px-3 py-2.5">Telefone</th>
                    <th className="px-3 py-2.5">Pet</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Data/Hora</th>
                    <th className="px-3 py-2.5">Diagnóstico</th>
                    <th className="px-3 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7F0]">
                  {enviosFiltrados.map((env) => (
                    <tr key={env.id} className="hover:bg-[#F7F8FC]">
                      <td className="px-3 py-2.5 font-medium text-[#0B1020]">
                        {env.tutor?.nome_completo || 'Tutor'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[#0B1020]">
                        {formatarTelefoneExibicao(env.telefone_destino)}
                      </td>
                      <td className="px-3 py-2.5 text-[#5A6382]">
                        {env.pet?.nome ? `${env.pet.nome} (${env.pet.especie})` : '---'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            env.status === 'enviado'
                              ? 'bg-emerald-50 text-emerald-800'
                              : env.status === 'erro'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {env.status === 'enviado' && <CheckCircle className="h-3 w-3" />}
                          {env.status === 'erro' && <AlertCircle className="h-3 w-3" />}
                          {env.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#5A6382] tabular-nums">
                        {env.enviado_em
                          ? new Date(env.enviado_em).toLocaleTimeString('pt-BR')
                          : '---'}
                      </td>
                      <td className="px-3 py-2.5 text-[#5A6382]">
                        {env.erro ? (
                          <span className="text-rose-600 font-semibold">{env.erro}</span>
                        ) : env.zapi_message_id ? (
                          <span className="font-mono text-[10px] text-slate-500">
                            ID: {env.zapi_message_id}
                          </span>
                        ) : (
                          '---'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {env.status === 'erro' && (
                          <button
                            onClick={() => handleReenviarFalhaIndividual(env)}
                            className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                            title="Tentar reenviar esta mensagem"
                          >
                            <RotateCcw className="h-3 w-3" /> Reenviar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
