/**
 * Tela de Histórico de Disparos Mobile
 * - Agrupamento por data (Hoje, Ontem, Esta semana, Anteriores)
 * - Bottom Sheet com detalhamento de cada envio
 * - Exportação de CSV com Web Share API (Level 2) e download fallback
 * - Retentativas de envios com falha
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/db';
import { Envio, Tutor, Campanha } from '../../types/database';
import { formatarTelefoneExibicao } from '../../lib/telefone';
import { hapticTouch, hapticSuccess, hapticError } from '../../lib/haptics';
import { abrirWhatsAppWeb } from '../../lib/wa';

interface MobileHistoricoProps {
  onNovoDisparo?: () => void;
}

export const MobileHistorico: React.FC<MobileHistoricoProps> = ({ onNovoDisparo }) => {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [tutoresMap, setTutoresMap] = useState<Record<string, Tutor>>({});
  const [campanhasMap, setCampanhasMap] = useState<Record<string, Campanha>>({});
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'enviado' | 'erro' | 'pulado'>('todos');

  // Bottom Sheet de detalhes
  const [envioSelecionado, setEnvioSelecionado] = useState<Envio | null>(null);

  const carregarDados = async () => {
    try {
      const todosEnvios = await db.envios.reverse().toArray();
      const todosTutores = await db.tutores.toArray();
      const todasCampanhas = await db.campanhas.toArray();

      const tMap: Record<string, Tutor> = {};
      todosTutores.forEach((t) => {
        tMap[t.id] = t;
      });

      const cMap: Record<string, Campanha> = {};
      todasCampanhas.forEach((c) => {
        cMap[c.id] = c;
      });

      setEnvios(todosEnvios);
      setTutoresMap(tMap);
      setCampanhasMap(cMap);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtragem dos registros
  const enviosFiltrados = useMemo(() => {
    return envios.filter((envio) => {
      if (filtroStatus !== 'todos' && envio.status !== filtroStatus) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const tutor = tutoresMap[envio.tutor_id];
        const nomeTutor = (
          (tutor as any)?.nome_completo ||
          (tutor as any)?.nome ||
          ''
        ).toLowerCase();
        const telefone = (envio.telefone_destino || envio.telefone || '').toLowerCase();
        const mensagem = (envio.mensagem_final || envio.mensagem || '').toLowerCase();
        return (
          nomeTutor.includes(termo) ||
          telefone.includes(termo) ||
          mensagem.includes(termo)
        );
      }

      return true;
    });
  }, [envios, tutoresMap, filtroStatus, busca]);

  // Agrupamento temporal: Hoje, Ontem, Esta Semana, Anteriores
  const grupos = useMemo(() => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
    const umDiaMs = 24 * 60 * 60 * 1000;
    const inicioOntem = inicioHoje - umDiaMs;
    const inicioSemana = inicioHoje - 7 * umDiaMs;

    const gHoje: Envio[] = [];
    const gOntem: Envio[] = [];
    const gSemana: Envio[] = [];
    const gAnteriores: Envio[] = [];

    enviosFiltrados.forEach((envio) => {
      const dataStr = envio.enviado_em || envio.criado_em || new Date().toISOString();
      const dataEnvio = new Date(dataStr).getTime();
      if (dataEnvio >= inicioHoje) {
        gHoje.push(envio);
      } else if (dataEnvio >= inicioOntem) {
        gOntem.push(envio);
      } else if (dataEnvio >= inicioSemana) {
        gSemana.push(envio);
      } else {
        gAnteriores.push(envio);
      }
    });

    return [
      { titulo: 'Hoje', itens: gHoje },
      { titulo: 'Ontem', itens: gOntem },
      { titulo: 'Esta semana', itens: gSemana },
      { titulo: 'Anteriores', itens: gAnteriores },
    ].filter((g) => g.itens.length > 0);
  }, [enviosFiltrados]);

  // Exportar CSV via Web Share API Level 2 com fallback para download
  const handleExportarCSV = async () => {
    hapticTouch();
    try {
      const cabecalhos = [
        'Data',
        'Nome Tutor',
        'Telefone',
        'Bairro',
        'Canal',
        'Status',
        'Mensagem',
        'Erro / Detalhes',
      ];

      const linhas = envios.map((e) => {
        const tutor = tutoresMap[e.tutor_id];
        const nome = tutor?.nome_completo || (tutor as any)?.nome || 'Tutor';
        const bairro = tutor?.bairro || 'Guapimirim';
        const dataStr = e.enviado_em || e.criado_em || new Date().toISOString();
        const telStr = e.telefone_destino || e.telefone || '';
        const msgStr = e.mensagem_final || e.mensagem || '';
        const erroStr = e.erro || e.erro_mensagem || '';
        const canalStr = e.metodo || e.canal || 'whatsapp';

        return [
          `"${new Date(dataStr).toLocaleString('pt-BR')}"`,
          `"${nome.replace(/"/g, '""')}"`,
          `"${telStr}"`,
          `"${bairro}"`,
          `"${canalStr}"`,
          `"${e.status}"`,
          `"${msgStr.replace(/"/g, '""')}"`,
          `"${erroStr.replace(/"/g, '""')}"`,
        ].join(',');
      });

      const conteudoCSV = [cabecalhos.join(','), ...linhas].join('\n');
      const nomeArquivo = `historico_disparos_guapimirim_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      const blob = new Blob(['\uFEFF' + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], nomeArquivo, { type: 'text/csv' });

      // Tenta compartilhar nativamente no mobile (WhatsApp, Drive, etc)
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        /mobile/i.test(navigator.userAgent)
      ) {
        await navigator.share({
          files: [file],
          title: 'Relatório de Disparos - Amigos do Caio',
          text: `Relatório exportado em ${new Date().toLocaleDateString('pt-BR')}`,
        });
        hapticSuccess();
        toast.success('Arquivo CSV compartilhado com sucesso!');
        return;
      }

      // Fallback: download clássico
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      hapticSuccess();
      toast.success('Download do relatório CSV concluído!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        hapticError();
        toast.error('Não foi possível exportar: ' + err.message);
      }
    }
  };

  // Retentar envio com erro
  const handleRetentarEnvio = async (envio: Envio) => {
    hapticTouch();
    const tel = envio.telefone_destino || envio.telefone || '';
    const msg = envio.mensagem_final || envio.mensagem || '';
    abrirWhatsAppWeb(tel, msg);
    toast.success('Reabrindo conversa no WhatsApp...');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] pb-24 select-none">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-[#06154E] text-white pt-[env(safe-area-inset-top,0px)] shadow-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-400" />
            <h1 className="text-base font-bold">Histórico de Disparos</h1>
          </div>

          <button
            type="button"
            onClick={handleExportarCSV}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white px-2.5 py-1.5 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Barra de Busca e Filtros Rápidos */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3.5 text-[#5A6382]" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por tutor, telefone ou mensagem..."
              className="w-full h-11 pl-9 pr-3 text-xs rounded-xl border border-[#E4E7F0] bg-white focus:border-[#06154E] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'enviado', label: '✓ Enviados' },
              { id: 'erro', label: '✕ Erros' },
              { id: 'pulado', label: '⤺ Pulados' },
            ].map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => {
                  hapticTouch();
                  setFiltroStatus(f.id as any);
                }}
                className={`rounded-xl px-2 py-1.5 text-[11px] font-semibold text-center truncate border transition-all ${
                  filtroStatus === f.id
                    ? 'bg-[#06154E] text-white border-[#06154E]'
                    : 'bg-white text-[#5A6382] border-[#E4E7F0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista Agrupada por Data */}
        {grupos.length > 0 ? (
          grupos.map((grupo) => (
            <div key={grupo.titulo} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A6382] px-1 pt-1">
                {grupo.titulo} ({grupo.itens.length})
              </h2>

              <div className="space-y-2">
                {grupo.itens.map((envio) => {
                  const tutor = tutoresMap[envio.tutor_id];
                  const nomeTutor =
                    tutor?.nome_completo || (tutor as any)?.nome || 'Tutor';
                  const dataStr = envio.enviado_em || envio.criado_em || new Date().toISOString();
                  const hora = new Date(dataStr).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const msgPreview = envio.mensagem_final || envio.mensagem || '';
                  const canalLabel = (envio.metodo || envio.canal) === 'manual' ? 'wa.me' : 'Z-API';

                  return (
                    <div
                      key={envio.id}
                      onClick={() => {
                        hapticTouch();
                        setEnvioSelecionado(envio);
                      }}
                      className="rounded-2xl bg-white p-3.5 border border-[#E4E7F0] shadow-xs active:bg-[#F7F8FC] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                            envio.status === 'enviado'
                              ? 'bg-emerald-600'
                              : envio.status === 'erro'
                              ? 'bg-rose-600'
                              : 'bg-amber-600'
                          }`}
                        >
                          {envio.status === 'enviado' ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <AlertCircle className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#06154E] truncate">{nomeTutor}</p>
                            <span className="text-[10px] text-[#5A6382] font-mono shrink-0">
                              • {hora}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5A6382] truncate max-w-[220px]">
                            {msgPreview}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-medium text-[#0A2472] bg-[#EEF1FA] px-1.5 py-0.5 rounded-md">
                              {canalLabel}
                            </span>
                            {tutor?.bairro && (
                              <span className="text-[10px] text-[#5A6382]">• {tutor.bairro}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-[#5A6382] shrink-0 ml-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white p-8 border border-[#E4E7F0] text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF1FA] text-[#06154E] mx-auto">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#06154E]">Nenhum disparo encontrado</h3>
            <p className="text-xs text-[#5A6382]">
              {busca ? 'Tente alterar os termos da busca.' : 'Inicie um novo disparo de mensagens.'}
            </p>
            {onNovoDisparo && (
              <button
                type="button"
                onClick={onNovoDisparo}
                className="rounded-xl bg-[#06154E] text-white px-4 py-2 text-xs font-bold"
              >
                Criar Disparo
              </button>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM SHEET DE DETALHES DO DISPARO */}
      {envioSelecionado && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={() => setEnvioSelecionado(null)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl bg-white p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Puxador da gaveta */}
            <div className="h-1.5 w-12 rounded-full bg-gray-300 mx-auto" />

            <div className="flex items-start justify-between border-b border-[#E4E7F0] pb-3">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    envioSelecionado.status === 'enviado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {envioSelecionado.status === 'enviado' ? 'Disparado com Sucesso' : 'Erro no Envio'}
                </span>
                <h3 className="text-base font-bold text-[#06154E] mt-1.5">
                  {tutoresMap[envioSelecionado.tutor_id]?.nome_completo ||
                    (tutoresMap[envioSelecionado.tutor_id] as any)?.nome ||
                    'Tutor'}
                </h3>
                <p className="text-xs text-[#5A6382] font-mono">
                  {formatarTelefoneExibicao(
                    envioSelecionado.telefone_destino || envioSelecionado.telefone || ''
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEnvioSelecionado(null)}
                className="p-1 rounded-full bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Informações detalhadas */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Horário:</span>
                <span className="font-semibold text-gray-800">
                  {new Date(
                    envioSelecionado.enviado_em ||
                      envioSelecionado.criado_em ||
                      new Date().toISOString()
                  ).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Canal:</span>
                <span className="font-semibold text-gray-800">
                  {(envioSelecionado.metodo || envioSelecionado.canal) === 'manual'
                    ? 'Manual (wa.me)'
                    : 'Automático (Z-API)'}
                </span>
              </div>
              {(envioSelecionado.erro || envioSelecionado.erro_mensagem) && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  <strong>Erro reportado:</strong>{' '}
                  {envioSelecionado.erro || envioSelecionado.erro_mensagem}
                </div>
              )}
            </div>

            {/* Conteúdo da Mensagem */}
            <div>
              <span className="text-xs font-semibold text-gray-700 block mb-1">
                Conteúdo Enviado:
              </span>
              <div className="p-3 rounded-xl bg-[#E7F8E8] text-[#0F3923] text-xs leading-relaxed border border-[#C5ECC7] whitespace-pre-line">
                {envioSelecionado.mensagem_final || envioSelecionado.mensagem}
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleRetentarEnvio(envioSelecionado)}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reenviar no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
