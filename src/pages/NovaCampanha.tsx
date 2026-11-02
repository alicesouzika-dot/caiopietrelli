/**
 * Assistente de Nova Campanha (Núcleo de Disparo)
 * 4 Passos: Público -> Mensagem & Preview -> Modo (Manual wa.me vs Automático Z-API) -> Revisão e Execução
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Send,
  Users,
  MessageSquare,
  Radio,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Copy,
  ExternalLink,
  Download,
  Check,
  Clock,
  Sparkles,
  Phone,
  ArrowRight,
  ArrowLeft,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  listarTutores,
  listarTemplates,
  listarConfiguracoes,
  criarCampanhaComEnvios,
  atualizarEnvio,
  atualizarStatusCampanha,
  adicionarAuditLog,
} from '../lib/storageEngine';
import { Campanha, Envio, Pet, Template, Tutor } from '../types/database';
import { interpolarTemplate, checarTamanhoMensagem } from '../lib/template';
import { abrirWhatsAppWeb, gerarLinkWhatsApp } from '../lib/wa';
import { dispararMensagemZApi, checarStatusZApi, ZApiStatusResponse } from '../lib/zapi';
import { formatarTelefoneExibicao } from '../lib/telefone';
import { formatarCPF } from '../lib/cpf';
import { useAuth } from '../contexts/AuthContext';
import { PageId } from '../components/layout/Sidebar';

interface NovaCampanhaProps {
  onNavigate: (page: PageId) => void;
  campanhaRetomadaId?: string;
}

export const NovaCampanha: React.FC<NovaCampanhaProps> = ({ onNavigate }) => {
  const { usuario } = useAuth();
  const [storageVersion, setStorageVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setStorageVersion((v) => v + 1);
    window.addEventListener('amigos_caio_storage_update', handleUpdate);
    return () => window.removeEventListener('amigos_caio_storage_update', handleUpdate);
  }, []);

  // Dados carregados
  const tutores = useMemo(() => listarTutores(), [storageVersion]);
  const templates = useMemo(() => listarTemplates(), [storageVersion]);
  const configs = useMemo(() => listarConfiguracoes(), [storageVersion]);

  // Passos do Wizard: 1 | 2 | 3 | 4 | 'execucao'
  const [passo, setPasso] = useState<1 | 2 | 3 | 4 | 'execucao'>(1);

  // ==========================================
  // PASSO 1: PÚBLICO E FILTROS
  // ==========================================
  const [bairrosSelecionados, setBairrosSelecionados] = useState<string[]>([]);
  const [especieFiltro, setEspecieFiltro] = useState<string>('todas');
  const [sexoFiltro, setSexoFiltro] = useState<string>('todos');
  const [idadeFiltro, setIdadeFiltro] = useState<string>('todas');

  const todosBairros = useMemo(() => {
    const set = new Set<string>();
    tutores.forEach((t) => {
      if (t.bairro) set.add(t.bairro.trim());
    });
    return Array.from(set).sort();
  }, [tutores]);

  // Lista de destinatários resolvidos (1 mensagem por tutor ou pet)
  const destinatariosFiltrados = useMemo(() => {
    const lista: { tutor: Tutor; pet?: Pet }[] = [];

    tutores.forEach((tutor) => {
      if (!tutor.ativo) return;

      // Filtro de bairro
      if (
        bairrosSelecionados.length > 0 &&
        tutor.bairro &&
        !bairrosSelecionados.includes(tutor.bairro)
      ) {
        return;
      }

      // Filtro de pets
      const petsDoTutor = tutor.pets || [];
      const petsCompativeis = petsDoTutor.filter((p) => {
        if (especieFiltro !== 'todas' && p.especie?.toLowerCase() !== especieFiltro.toLowerCase()) {
          return false;
        }
        if (sexoFiltro !== 'todos' && p.sexo !== sexoFiltro) {
          return false;
        }
        return true;
      });

      // Se filtrou por pet e o tutor não tem nenhum compatível, descarta
      if ((especieFiltro !== 'todas' || sexoFiltro !== 'todos') && petsCompativeis.length === 0) {
        return;
      }

      // Adiciona o tutor com seu pet prioritário (o primeiro compatível)
      lista.push({
        tutor,
        pet: petsCompativeis[0] || petsDoTutor[0],
      });
    });

    return lista;
  }, [tutores, bairrosSelecionados, especieFiltro, sexoFiltro, idadeFiltro]);

  // ==========================================
  // PASSO 2: MENSAGEM & PREVIEW
  // ==========================================
  const [templateIdSelecionado, setTemplateIdSelecionado] = useState<string>(
    templates[0]?.id || ''
  );
  const [textoMensagem, setTextoMensagem] = useState<string>(
    templates[0]?.corpo || ''
  );
  const [exemploIndex, setExemploIndex] = useState(0);

  const templateAtual = templates.find((t) => t.id === templateIdSelecionado);

  const selecionarTemplate = (tplId: string) => {
    setTemplateIdSelecionado(tplId);
    const achado = templates.find((t) => t.id === tplId);
    if (achado) {
      setTextoMensagem(achado.corpo);
    }
  };

  // Contato de exemplo para o preview
  const contatoExemplo = destinatariosFiltrados[exemploIndex] || destinatariosFiltrados[0];
  const mensagemInterpoladaPreview = useMemo(() => {
    return interpolarTemplate(textoMensagem, {
      tutor: contatoExemplo?.tutor,
      pet: contatoExemplo?.pet,
      assinatura: configs['nome_assinatura'] || 'Equipe Amigos do Caio',
    });
  }, [textoMensagem, contatoExemplo, configs]);

  // ==========================================
  // PASSO 3: MODO DE DISPARO
  // ==========================================
  const [metodoDisparo, setMetodoDisparo] = useState<'manual' | 'zapi'>('manual');
  const [zapiStatus, setZapiStatus] = useState<ZApiStatusResponse | null>(null);

  useEffect(() => {
    checarStatusZApi().then(setZapiStatus);
  }, []);

  const zapiAtivoConfig = configs['zapi_ativo'] === 'true';

  // ==========================================
  // PASSO 4: REVISÃO & NOME DA CAMPANHA
  // ==========================================
  const [nomeCampanha, setNomeCampanha] = useState('');

  // Ao entrar no passo 4, se o nome estiver vazio, sugere um baseado no template ou data
  useEffect(() => {
    if (!nomeCampanha && templateAtual) {
      setNomeCampanha(`${templateAtual.titulo} - ${new Date().toLocaleDateString('pt-BR')}`);
    }
  }, [templateAtual, nomeCampanha]);

  // ==========================================
  // EXECUÇÃO DO DISPARO (MANUAL OU AUTOMÁTICO)
  // ==========================================
  const [campanhaAtiva, setCampanhaAtiva] = useState<Campanha | null>(null);
  const [enviosFila, setEnviosFila] = useState<Envio[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);

  // Estados de controle para Z-API automático
  const [emExecucaoAuto, setEmExecucaoAuto] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [logsExecucao, setLogsExecucao] = useState<
    { hora: string; texto: string; tipo: 'info' | 'sucesso' | 'erro' }[]
  >([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Toggle do modo manual para auto-avanço
  const [autoAvancoManual, setAutoAvancoManual] = useState(false);
  const [tempoAutoAvanco, setTempoAutoAvanco] = useState(5);

  const adicionarLog = (texto: string, tipo: 'info' | 'sucesso' | 'erro' = 'info') => {
    const hora = new Date().toLocaleTimeString('pt-BR');
    setLogsExecucao((prev) => [...prev, { hora, texto, tipo }]);
  };

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logsExecucao]);

  // Inicia a campanha criando registros persistidos no storage
  const handleIniciarCampanha = () => {
    if (!nomeCampanha.trim()) {
      alert('Por favor, informe um nome para a campanha.');
      return;
    }

    if (destinatariosFiltrados.length === 0) {
      alert('Nenhum destinatário encontrado com os filtros selecionados.');
      return;
    }

    // Interpola a mensagem final para cada destinatário
    const listaEnvios = destinatariosFiltrados.map((d) => ({
      tutor: d.tutor,
      pet: d.pet,
      mensagem: interpolarTemplate(textoMensagem, {
        tutor: d.tutor,
        pet: d.pet,
        assinatura: configs['nome_assinatura'] || 'Equipe Amigos do Caio',
      }),
    }));

    const { campanha, envios } = criarCampanhaComEnvios(
      {
        nome: nomeCampanha.trim(),
        categoria: templateAtual?.categoria || 'geral',
        template_id: templateAtual?.id || null,
        metodo: metodoDisparo,
        filtros_aplicados: {
          bairros: bairrosSelecionados,
          especies: especieFiltro !== 'todas' ? [especieFiltro] : [],
          sexos: sexoFiltro !== 'todos' ? [sexoFiltro] : [],
        },
        status: 'em_andamento',
        criado_por: usuario?.id || null,
      },
      listaEnvios
    );

    // Hidrata os envios com os objetos tutor e pet para a tela
    const enviosHidratados: Envio[] = envios.map((e, idx) => ({
      ...e,
      tutor: destinatariosFiltrados[idx].tutor,
      pet: destinatariosFiltrados[idx].pet,
    }));

    setCampanhaAtiva(campanha);
    setEnviosFila(enviosHidratados);
    setIndiceAtual(0);
    setPasso('execucao');

    adicionarAuditLog({
      user_id: usuario?.id,
      user_nome: usuario?.nome,
      acao: 'CRIAR_CAMPANHA',
      entidade: 'campanhas',
      entidade_id: campanha.id,
      detalhes: {
        nome: campanha.nome,
        metodo: metodoDisparo,
        total_destinatarios: envios.length,
      },
    });

    if (metodoDisparo === 'zapi') {
      adicionarLog(
        `Fila iniciada: ${envios.length} mensagens para processamento automático via Z-API.`,
        'info'
      );
    }
  };

  // ==========================================
  // DISPARO MANUAL (wa.me)
  // ==========================================
  const envioManualAtual = enviosFila[indiceAtual];

  const handleEnviarManualEProximo = () => {
    if (!envioManualAtual) return;

    // 1. Abre a URL do WhatsApp Web em nova aba
    abrirWhatsAppWeb(envioManualAtual.telefone_destino, envioManualAtual.mensagem_final);

    // 2. Marca status como enviado
    atualizarEnvio(envioManualAtual.id, {
      status: 'enviado',
      enviado_em: new Date().toISOString(),
      tentativas: (envioManualAtual.tentativas || 0) + 1,
    });

    setEnviosFila((prev) =>
      prev.map((e) => (e.id === envioManualAtual.id ? { ...e, status: 'enviado' } : e))
    );

    // 3. Avança para o próximo
    if (indiceAtual < enviosFila.length - 1) {
      setIndiceAtual((i) => i + 1);
    } else {
      if (campanhaAtiva) {
        atualizarStatusCampanha(campanhaAtiva.id, 'concluida');
      }
      alert('Campanha manual concluída com sucesso!');
    }
  };

  const handlePularManual = () => {
    if (!envioManualAtual) return;

    atualizarEnvio(envioManualAtual.id, {
      status: 'pulado',
    });

    setEnviosFila((prev) =>
      prev.map((e) => (e.id === envioManualAtual.id ? { ...e, status: 'pulado' } : e))
    );

    if (indiceAtual < enviosFila.length - 1) {
      setIndiceAtual((i) => i + 1);
    }
  };

  // ==========================================
  // DISPARO AUTOMÁTICO (Z-API em lote)
  // ==========================================
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;

  const iniciarLoopZApi = async () => {
    setEmExecucaoAuto(true);
    setPausado(false);

    const delayMs = Number(configs['delay_entre_envios_ms']) || 5000;
    const delayTyping = Number(configs['delay_digitando_s']) || 2;

    adicionarLog(`Iniciando disparos sequenciais (Intervalo: ${delayMs}ms)...`, 'info');

    for (let i = 0; i < enviosFila.length; i++) {
      if (pausadoRef.current) {
        adicionarLog('Disparo pausado pelo operador.', 'info');
        break;
      }

      const envio = enviosFila[i];
      if (envio.status === 'enviado') continue;

      setIndiceAtual(i);
      adicionarLog(`Enviando para ${envio.tutor?.nome_completo || envio.telefone_destino}...`, 'info');

      // Atualiza para enviando
      atualizarEnvio(envio.id, { status: 'enviando' });

      // Dispara via Z-API / Edge Function
      const resultado = await dispararMensagemZApi(
        envio.telefone_destino,
        envio.mensagem_final,
        delayTyping
      );

      if (resultado.ok) {
        atualizarEnvio(envio.id, {
          status: 'enviado',
          enviado_em: new Date().toISOString(),
          zapi_message_id: resultado.messageId,
          tentativas: (envio.tentativas || 0) + 1,
        });

        setEnviosFila((prev) =>
          prev.map((e) => (e.id === envio.id ? { ...e, status: 'enviado' } : e))
        );

        adicionarLog(
          `✅ Entregue para ${envio.tutor?.nome_completo} (ID: ${resultado.messageId})`,
          'sucesso'
        );
      } else {
        atualizarEnvio(envio.id, {
          status: 'erro',
          erro: resultado.erro || 'Falha ao entregar mensagem',
          tentativas: (envio.tentativas || 0) + 1,
        });

        setEnviosFila((prev) =>
          prev.map((e) =>
            e.id === envio.id ? { ...e, status: 'erro', erro: resultado.erro } : e
          )
        );

        adicionarLog(
          `❌ Falha ao enviar para ${envio.tutor?.nome_completo}: ${resultado.erro}`,
          'erro'
        );
      }

      // Intervalo entre envios para reduzir risco de bloqueio (se houver próximo)
      if (i < enviosFila.length - 1 && !pausadoRef.current) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (!pausadoRef.current) {
      if (campanhaAtiva) {
        atualizarStatusCampanha(campanhaAtiva.id, 'concluida');
      }
      adicionarLog('🎉 Fila de disparos automáticos finalizada!', 'sucesso');
    }

    setEmExecucaoAuto(false);
  };

  const handlePausarRetomarZApi = () => {
    if (emExecucaoAuto) {
      setPausado(true);
      setEmExecucaoAuto(false);
    } else {
      iniciarLoopZApi();
    }
  };

  const handleReenviarFalhasZApi = async () => {
    // Reseta status de quem deu erro para pendente
    const falhas = enviosFila.filter((e) => e.status === 'erro');
    if (falhas.length === 0) {
      alert('Não há falhas para reenviar.');
      return;
    }
    falhas.forEach((f) => atualizarEnvio(f.id, { status: 'pendente', erro: null }));
    setEnviosFila((prev) =>
      prev.map((e) => (e.status === 'erro' ? { ...e, status: 'pendente', erro: null } : e))
    );
    adicionarLog(`Reiniciando envio das ${falhas.length} mensagens com erro...`, 'info');
    iniciarLoopZApi();
  };

  const baixarRelatorioExecucaoCSV = () => {
    const dados = enviosFila.map((e, idx) => ({
      'Item': idx + 1,
      'Tutor': e.tutor?.nome_completo || '',
      'CPF': e.tutor?.cpf ? formatarCPF(e.tutor.cpf) : '',
      'Telefone Destino': formatarTelefoneExibicao(e.telefone_destino),
      'Bairro': e.tutor?.bairro || '',
      'Nome do Pet': e.pet?.nome || '',
      'Status': e.status.toUpperCase(),
      'Horário Envio': e.enviado_em ? new Date(e.enviado_em).toLocaleTimeString('pt-BR') : '',
      'ID Z-API': e.zapi_message_id || '',
      'Diagnóstico / Erro': e.erro || '',
      'Mensagem Final': e.mensagem_final,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_disparos_${campanhaAtiva?.nome || 'campanha'}_${Date.now()}.csv`;
    a.click();
  };

  // Contadores de execução
  const totalEnviados = enviosFila.filter((e) => e.status === 'enviado').length;
  const totalErros = enviosFila.filter((e) => e.status === 'erro').length;
  const totalRestantes = enviosFila.length - totalEnviados - totalErros;
  const percentualConcluido =
    enviosFila.length > 0 ? Math.round(((totalEnviados + totalErros) / enviosFila.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Nova Campanha WhatsApp
          </h2>
          <p className="text-xs text-[#5A6382]">
            Filtre o público de Guapimirim, personalize a mensagem e dispare.
          </p>
        </div>

        {passo === 'execucao' && (
          <button
            onClick={() => onNavigate('historico')}
            className="flex items-center gap-1.5 rounded-lg border border-[#E4E7F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#F7F8FC]"
          >
            Ir para Histórico Completo
          </button>
        )}
      </div>

      {/* STEPPER WIZARD (Passos 1 a 4) */}
      {passo !== 'execucao' && (
        <div className="rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-2xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              { num: 1, label: 'Público Alvo' },
              { num: 2, label: 'Mensagem e Preview' },
              { num: 3, label: 'Canal de Disparo' },
              { num: 4, label: 'Revisão Final' },
            ].map((step) => {
              const ativo = passo === step.num;
              const concluido = (passo as number) > step.num;

              return (
                <div
                  key={step.num}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${
                    ativo
                      ? 'bg-[#EEF1FA] text-[#06154E] font-bold'
                      : concluido
                      ? 'text-emerald-700'
                      : 'text-[#5A6382]'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      ativo
                        ? 'bg-[#06154E] text-white'
                        : concluido
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-[#5A6382]'
                    }`}
                  >
                    {concluido ? <Check className="h-3.5 w-3.5" /> : step.num}
                  </div>
                  <span className="text-[11px] truncate w-full">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PASSO 1: SELEÇÃO DE PÚBLICO E FILTROS */}
      {/* ======================================================== */}
      {passo === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda: Filtros de Bairro e Pet */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-[#0B1020]">
                1. Filtros Geográficos e Demográficos dos Pets
              </h3>

              {/* Filtro por Bairros (Multi-select) */}
              <div>
                <label className="block text-xs font-semibold text-[#0B1020] mb-2">
                  Bairros de Guapimirim (selecione para restringir ou deixe em branco para todos):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-[#E4E7F0] rounded-lg bg-[#F7F8FC]">
                  {todosBairros.map((b) => {
                    const sel = bairrosSelecionados.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => {
                          setBairrosSelecionados((prev) =>
                            sel ? prev.filter((item) => item !== b) : [...prev, b]
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                          sel
                            ? 'bg-[#06154E] text-white font-bold shadow-2xs'
                            : 'bg-white text-[#5A6382] hover:bg-[#EEF1FA] border border-[#E4E7F0]'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
                {bairrosSelecionados.length > 0 && (
                  <button
                    onClick={() => setBairrosSelecionados([])}
                    className="mt-1 text-[11px] font-semibold text-[#0A2472] hover:underline"
                  >
                    Limpar bairros (selecionar todos)
                  </button>
                )}
              </div>

              {/* Filtros de Espécie e Sexo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Espécie do Pet
                  </label>
                  <select
                    value={especieFiltro}
                    onChange={(e) => setEspecieFiltro(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020]"
                  >
                    <option value="todas">Todas as espécies</option>
                    <option value="cão">Cães apenas</option>
                    <option value="gato">Gatos apenas</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Sexo do Pet (importante para castração)
                  </label>
                  <select
                    value={sexoFiltro}
                    onChange={(e) => setSexoFiltro(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020]"
                  >
                    <option value="todos">Todos os sexos</option>
                    <option value="Macho">Machos</option>
                    <option value="Fêmea">Fêmeas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prévia da Lista de Destinatários */}
            <div className="rounded-xl border border-[#E4E7F0] bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E7F0] bg-[#F7F8FC]">
                <h4 className="text-xs font-bold text-[#0B1020]">
                  Prévia dos Primeiros Contatos Selecionados ({destinatariosFiltrados.length})
                </h4>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] text-[11px]">
                    <tr>
                      <th className="px-4 py-2">Tutor</th>
                      <th className="px-4 py-2">Bairro</th>
                      <th className="px-4 py-2">Telefone WhatsApp</th>
                      <th className="px-4 py-2">Pet Associado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7F0]">
                    {destinatariosFiltrados.slice(0, 8).map((item) => (
                      <tr key={item.tutor.id} className="hover:bg-[#F7F8FC]">
                        <td className="px-4 py-2 font-medium text-[#0B1020]">
                          {item.tutor.nome_completo}
                        </td>
                        <td className="px-4 py-2 text-[#5A6382]">
                          {item.tutor.bairro || 'Guapimirim'}
                        </td>
                        <td className="px-4 py-2 font-mono text-[#0B1020]">
                          {formatarTelefoneExibicao(item.tutor.telefone_e164)}
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-semibold text-[#0A2472]">
                            {item.pet?.nome || 'Pet'}
                          </span>{' '}
                          <span className="text-[#5A6382]">({item.pet?.especie || 'Pet'})</span>
                        </td>
                      </tr>
                    ))}
                    {destinatariosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-[#5A6382]">
                          Nenhum tutor encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Contador e Próximo Passo */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#0A2472] bg-[#EEF1FA] p-6 text-center shadow-xs">
              <span className="text-xs uppercase font-bold tracking-wider text-[#0A2472]">
                Total de Destinatários Elegíveis
              </span>
              <p className="text-5xl font-extrabold font-mono text-[#06154E] tabular-nums mt-2">
                {destinatariosFiltrados.length}
              </p>
              <p className="text-xs text-[#5A6382] mt-2">
                Tutores com números válidos de WhatsApp e cadastros ativos em Guapimirim.
              </p>

              <button
                disabled={destinatariosFiltrados.length === 0}
                onClick={() => setPasso(2)}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-[#06154E] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A2472] disabled:opacity-50 transition-colors"
              >
                Avançar para Mensagem <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PASSO 2: MENSAGEM & PREVIEW REALISTA */}
      {/* ======================================================== */}
      {passo === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor e Seleção de Template */}
          <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#0B1020]">
              2. Escolha o Modelo ou Escreva a Mensagem
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                Carregar Modelo Pré-Configurado:
              </label>
              <select
                value={templateIdSelecionado}
                onChange={(e) => selecionarTemplate(e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020]"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.categoria.toUpperCase()}] {tpl.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0B1020]">
                  Texto da Mensagem (tags dinâmicas suportadas)
                </label>
                <span className="font-mono text-[11px] text-[#5A6382]">
                  {textoMensagem.length} caracteres
                </span>
              </div>
              <textarea
                rows={9}
                value={textoMensagem}
                onChange={(e) => setTextoMensagem(e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] p-3 text-xs text-[#0B1020] font-sans focus:ring-1 focus:ring-[#06154E]"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E4E7F0]">
              <button
                onClick={() => setPasso(1)}
                className="rounded-lg border border-[#E4E7F0] px-4 py-2 text-xs font-semibold text-[#5A6382]"
              >
                Voltar
              </button>
              <button
                onClick={() => setPasso(3)}
                disabled={!textoMensagem.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-5 py-2 text-xs font-bold text-white hover:bg-[#0A2472]"
              >
                Escolher Canal de Disparo <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Simulação Visual do Balão do WhatsApp */}
          <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7F0]">
              <div>
                <h4 className="text-xs font-bold text-[#0B1020]">
                  Prévia em Tempo Real (WhatsApp)
                </h4>
                <p className="text-[11px] text-[#5A6382]">
                  Mostrando variáveis resolvidas para: <b>{contatoExemplo?.tutor.nome_completo || 'Tutor'}</b>
                </p>
              </div>

              {destinatariosFiltrados.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setExemploIndex((prev) =>
                        prev > 0 ? prev - 1 : destinatariosFiltrados.length - 1
                      )
                    }
                    className="p-1 rounded text-[#5A6382] hover:bg-[#F7F8FC]"
                    title="Ver com outro tutor de exemplo"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] text-[#5A6382] tabular-nums">
                    {exemploIndex + 1}/{destinatariosFiltrados.length}
                  </span>
                  <button
                    onClick={() =>
                      setExemploIndex((prev) =>
                        prev < destinatariosFiltrados.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="p-1 rounded text-[#5A6382] hover:bg-[#F7F8FC]"
                    title="Ver com próximo tutor"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Simulação de tela do WhatsApp */}
            <div className="rounded-2xl bg-[#EFEAE2] p-4 border border-[#D1D7DB] min-h-[300px] flex flex-col justify-end">
              <div className="self-end max-w-[90%] rounded-xl bg-[#E7FFDB] p-3 text-xs text-[#111B21] shadow-xs relative">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {mensagemInterpoladaPreview}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] mt-1">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <Check className="h-3 w-3 text-sky-600 inline" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PASSO 3: MODO DE DISPARO (MANUAL VS AUTOMÁTICO Z-API) */}
      {/* ======================================================== */}
      {passo === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Modo Manual (wa.me) */}
            <div
              onClick={() => setMetodoDisparo('manual')}
              className={`cursor-pointer rounded-2xl border p-6 transition-all ${
                metodoDisparo === 'manual'
                  ? 'border-[#06154E] bg-white ring-2 ring-[#06154E] shadow-md'
                  : 'border-[#E4E7F0] bg-white hover:border-[#0A2472]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#0A2472]">
                  <ExternalLink className="h-6 w-6" />
                </div>
                <span
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    metodoDisparo === 'manual'
                      ? 'border-[#06154E] bg-[#06154E] text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {metodoDisparo === 'manual' && <Check className="h-3 w-3" />}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#0B1020]">
                Disparo Manual (wa.me)
              </h3>
              <p className="text-xs text-[#5A6382] mt-1">
                Sem custos e sem configuração de API. O operador visualiza cada tutor e clica em "Enviar e próximo", abrindo a conversa oficial no WhatsApp Web já com texto preenchido.
              </p>

              <div className="mt-4 pt-3 border-t border-[#E4E7F0] text-[11px] text-[#5A6382] space-y-1">
                <p>✅ Ideal para volumes pequenos ou mensagens que exigem conferência visual</p>
                <p>✅ Controle total com avanço manual ou temporizado</p>
              </div>
            </div>

            {/* Card 2: Modo Automático (Z-API) */}
            <div
              onClick={() => {
                setMetodoDisparo('zapi');
              }}
              className={`cursor-pointer rounded-2xl border p-6 transition-all ${
                metodoDisparo === 'zapi'
                  ? 'border-[#06154E] bg-white ring-2 ring-[#06154E] shadow-md'
                  : 'border-[#E4E7F0] bg-white hover:border-[#0A2472]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Radio className="h-6 w-6" />
                </div>
                <span
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    metodoDisparo === 'zapi'
                      ? 'border-[#06154E] bg-[#06154E] text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {metodoDisparo === 'zapi' && <Check className="h-3 w-3" />}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0B1020]">
                  Disparo Automático em Lote (Z-API)
                </h3>
                {zapiStatus?.connected ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Online
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Modo Homologação / Simulação
                  </span>
                )}
              </div>

              <p className="text-xs text-[#5A6382] mt-1">
                Envio sequencial automatizado com intervalo de segurança configurado (padrão 5 segundos), simulação de status "digitando", retry automático com backoff exponencial e log em tempo real.
              </p>

              <div className="mt-4 pt-3 border-t border-[#E4E7F0] text-[11px] text-[#5A6382] space-y-1">
                <p>⚡ Disparo 100% em segundo plano sem abrir novas abas no navegador</p>
                <p>🛡️ Controle de pausa, retomada e download de relatório final em CSV</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E4E7F0]">
            <button
              onClick={() => setPasso(2)}
              className="rounded-lg border border-[#E4E7F0] px-4 py-2 text-xs font-semibold text-[#5A6382]"
            >
              Voltar
            </button>
            <button
              onClick={() => setPasso(4)}
              className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-5 py-2 text-xs font-bold text-white hover:bg-[#0A2472]"
            >
              Revisar Campanha <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PASSO 4: REVISÃO FINAL */}
      {/* ======================================================== */}
      {passo === 4 && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-[#E4E7F0] bg-white p-8 shadow-xs space-y-6">
          <h3 className="text-lg font-bold text-[#0B1020]">
            4. Revisão e Nome da Campanha
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1">
              Nome de Identificação da Campanha *
            </label>
            <input
              type="text"
              required
              value={nomeCampanha}
              onChange={(e) => setNomeCampanha(e.target.value)}
              className="w-full rounded-lg border border-[#E4E7F0] px-3.5 py-2.5 text-xs text-[#0B1020] font-medium"
              placeholder="Ex: Vacinação Antirrábica Centro - Março 2026"
            />
          </div>

          {/* Resumo da Campanha */}
          <div className="rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] p-4 text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-[#5A6382]">Total de Destinatários:</span>
              <span className="font-bold text-[#0B1020] tabular-nums">
                {destinatariosFiltrados.length} tutores
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A6382]">Canal Escolhido:</span>
              <span className="font-bold text-[#0A2472]">
                {metodoDisparo === 'zapi' ? 'Automático (Z-API Oficial)' : 'Manual (wa.me)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A6382]">Remetente Institucional:</span>
              <span className="font-mono text-[#0B1020]">
                {formatarTelefoneExibicao(configs['remetente_numero'] || '5521976397273')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A6382]">Bairros Alvo:</span>
              <span className="text-[#0B1020]">
                {bairrosSelecionados.length > 0 ? bairrosSelecionados.join(', ') : 'Todos os bairros'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E4E7F0]">
            <button
              onClick={() => setPasso(3)}
              className="rounded-lg border border-[#E4E7F0] px-4 py-2 text-xs font-semibold text-[#5A6382]"
            >
              Voltar
            </button>
            <button
              onClick={handleIniciarCampanha}
              className="flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs"
            >
              <Send className="h-4 w-4" /> Iniciar Disparos Agora
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TELA DE EXECUÇÃO: MODO MANUAL OU AUTOMÁTICO */}
      {/* ======================================================== */}
      {passo === 'execucao' && (
        <div className="space-y-6">
          {/* Barra de Progresso Superior */}
          <div className="rounded-xl border border-[#E4E7F0] bg-white p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-bold text-[#5A6382]">
                  Campanha em Andamento ({campanhaAtiva?.metodo.toUpperCase()})
                </span>
                <h3 className="text-base font-bold text-[#0B1020]">
                  {campanhaAtiva?.nome}
                </h3>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-emerald-700 font-bold">
                  {totalEnviados} Enviados
                </span>
                {totalErros > 0 && (
                  <span className="text-rose-600 font-bold">
                    {totalErros} Falhas
                  </span>
                )}
                <span className="text-[#5A6382]">
                  {totalRestantes} Restantes
                </span>
              </div>
            </div>

            {/* Barra Visual */}
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${percentualConcluido}%` }}
              />
            </div>
          </div>

          {/* ==================== MODO MANUAL (wa.me) ==================== */}
          {campanhaAtiva?.metodo === 'manual' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card do Contato Atual */}
              <div className="lg:col-span-2 rounded-2xl border border-[#06154E] bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-3">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-[#0A2472]">
                      Destinatário {indiceAtual + 1} de {enviosFila.length}
                    </span>
                    <h4 className="text-lg font-bold text-[#0B1020]">
                      {envioManualAtual?.tutor?.nome_completo}
                    </h4>
                  </div>
                  <span className="text-xs font-mono bg-[#EEF1FA] text-[#06154E] px-3 py-1 rounded-full font-bold">
                    {formatarTelefoneExibicao(envioManualAtual?.telefone_destino)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-[#F7F8FC] p-3 rounded-lg border border-[#E4E7F0]">
                  <div>
                    <span className="text-[#5A6382]">Bairro:</span>
                    <p className="font-semibold text-[#0B1020]">
                      {envioManualAtual?.tutor?.bairro || 'Guapimirim'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5A6382]">Pet:</span>
                    <p className="font-semibold text-[#0B1020]">
                      {envioManualAtual?.pet?.nome || 'Pet'} ({envioManualAtual?.pet?.especie})
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5A6382]">CPF:</span>
                    <p className="font-mono text-[#0B1020]">
                      {envioManualAtual?.tutor?.cpf ? formatarCPF(envioManualAtual.tutor.cpf) : '---'}
                    </p>
                  </div>
                </div>

                {/* Balão de Mensagem */}
                <div className="rounded-xl bg-[#E7FFDB] p-4 text-xs text-[#111B21] border border-[#d2f3c0] whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {envioManualAtual?.mensagem_final}
                </div>

                {/* Botões Grandes de Ação do Modo Manual */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleEnviarManualEProximo}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 px-6 text-sm font-bold text-white hover:bg-emerald-800 shadow-sm transition-transform active:scale-98"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Enviar e Próximo (Abre WhatsApp)
                  </button>

                  <button
                    onClick={() => {
                      if (envioManualAtual) {
                        navigator.clipboard.writeText(envioManualAtual.mensagem_final);
                        alert('Mensagem copiada para a área de transferência!');
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E4E7F0] px-4 py-3 text-xs font-semibold text-[#0B1020] hover:bg-[#F7F8FC]"
                  >
                    <Copy className="h-4 w-4" /> Copiar Mensagem
                  </button>

                  <button
                    onClick={handlePularManual}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E4E7F0] px-4 py-3 text-xs font-semibold text-[#5A6382] hover:bg-[#F7F8FC]"
                  >
                    <SkipForward className="h-4 w-4" /> Pular
                  </button>
                </div>
              </div>

              {/* Lista Lateral de Fila */}
              <div className="rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6382] mb-3">
                  Fila da Campanha ({enviosFila.length})
                </h4>
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                  {enviosFila.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => setIndiceAtual(idx)}
                      className={`cursor-pointer rounded-lg p-2.5 text-xs transition-colors border ${
                        idx === indiceAtual
                          ? 'bg-[#EEF1FA] border-[#0A2472] font-semibold text-[#06154E]'
                          : item.status === 'enviado'
                          ? 'bg-emerald-50/40 border-emerald-200 text-[#0B1020]'
                          : 'bg-[#F7F8FC] border-[#E4E7F0] text-[#5A6382]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{item.tutor?.nome_completo}</span>
                        {item.status === 'enviado' && (
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== MODO AUTOMÁTICO (Z-API) ==================== */}
          {campanhaAtiva?.metodo === 'zapi' && (
            <div className="space-y-6">
              {/* Controles de Execução */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  {!emExecucaoAuto ? (
                    <button
                      onClick={iniciarLoopZApi}
                      className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs"
                    >
                      <Play className="h-4 w-4" /> Iniciar Disparo em Lote
                    </button>
                  ) : (
                    <button
                      onClick={handlePausarRetomarZApi}
                      className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
                    >
                      <Pause className="h-4 w-4" /> Pausar Fila
                    </button>
                  )}

                  {totalErros > 0 && !emExecucaoAuto && (
                    <button
                      onClick={handleReenviarFalhasZApi}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reenviar {totalErros} Falhas
                    </button>
                  )}
                </div>

                <button
                  onClick={baixarRelatorioExecucaoCSV}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E4E7F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#F7F8FC]"
                >
                  <Download className="h-4 w-4" /> Baixar Relatório (.csv)
                </button>
              </div>

              {/* Console de Log em Tempo Real */}
              <div className="rounded-xl border border-[#06154E] bg-[#06154E] p-4 text-white shadow-md overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono uppercase font-bold text-white/80">
                      Console de Envio Z-API (Tempo Real)
                    </span>
                  </div>
                  <span className="text-white/50 text-[11px] font-mono">
                    Delay: {configs['delay_entre_envios_ms'] || 5000}ms
                  </span>
                </div>

                <div
                  ref={logsContainerRef}
                  className="font-mono text-xs space-y-1.5 max-h-72 overflow-y-auto text-white/90"
                >
                  {logsExecucao.map((l, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-white/40 tabular-nums">[{l.hora}]</span>
                      <span
                        className={
                          l.tipo === 'sucesso'
                            ? 'text-emerald-400'
                            : l.tipo === 'erro'
                            ? 'text-rose-400 font-bold'
                            : 'text-white'
                        }
                      >
                        {l.texto}
                      </span>
                    </div>
                  ))}
                  {logsExecucao.length === 0 && (
                    <p className="text-white/40 italic">
                      Aguardando clique em "Iniciar Disparo em Lote" para processar a fila...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
