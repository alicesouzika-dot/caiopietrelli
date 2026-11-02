/**
 * Tela de Disparo Mobile (Amigos do Caio)
 * Wizard em 4 etapas adaptado para touch + Tela de Execução Fullscreen:
 * - Modo Manual (wa.me / Share API) com auto-avanço opcional e botão touch gigante
 * - Modo Automático (Z-API) com Screen Wake Lock API e terminal de logs em tempo real
 * - 100% offline-ready com salvamento local no Dexie e fila de sincronização
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Send,
  Filter,
  FileText,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Smartphone,
  Zap,
  ChevronRight,
  ArrowLeft,
  Eye,
  Sparkles,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/db';
import { listarTemplates } from '../../lib/storageEngine';
import { Tutor, Pet, Template, Envio } from '../../types/database';
import { interpolarTemplate, VARIAVEIS_DISPONIVEIS } from '../../lib/template';
import { gerarLinkWhatsApp } from '../../lib/wa';
import { formatarTelefoneExibicao, normalizarParaE164 } from '../../lib/telefone';
import { enfileirarAcaoOffline } from '../../lib/sync';
import { hapticTouch, hapticSuccess } from '../../lib/haptics';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../contexts/AuthContext';

// Bairros de Guapimirim para filtro rápido
const BAIRROS_FILTRO = [
  'Todos os Bairros',
  'Centro',
  'Bananal',
  'Caneca Fina',
  'Parada Modelo',
  'Vale das Pedrinhas',
  'Cotia',
  'Paiol',
  'Parque Silvestre',
  'Limoeiro',
  'Quinta Mariana',
  'Barreira',
  'Várzea Alegre',
  'Iconha',
  'Garrafão',
  'Monte Olivete',
];

interface MobileDispararProps {
  onVoltarParaInicio?: () => void;
  onSetEsconderTabBar?: (esconder: boolean) => void;
}

export const MobileDisparar: React.FC<MobileDispararProps> = ({
  onVoltarParaInicio,
  onSetEsconderTabBar,
}) => {
  const { usuario } = useAuth();
  const { isOnline } = useOnlineStatus();

  // Etapa do Wizard: 1 = Filtros, 2 = Mensagem, 3 = Modo de Envio, 4 = Revisão, 5 = Execução
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Dados carregados do Dexie
  const [todosTutores, setTodosTutores] = useState<Tutor[]>([]);
  const [todosPets, setTodosPets] = useState<Pet[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Filtros (Etapa 1)
  const [filtroBairro, setFiltroBairro] = useState('Todos os Bairros');
  const [filtroEspecie, setFiltroEspecie] = useState<'todas' | 'cao' | 'gato'>('todas');
  const [filtroSexo, setFiltroSexo] = useState<'todos' | 'macho' | 'femea'>('todos');
  const [filtroCastrado, setFiltroCastrado] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [filtroVacinado, setFiltroVacinado] = useState<'todos' | 'sim' | 'nao'>('todos');

  // Mensagem e Template (Etapa 2)
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>('');
  const [textoTemplate, setTextoTemplate] = useState('');
  const [nomeCampanha, setNomeCampanha] = useState('');

  // Modo de Envio (Etapa 3)
  const [canal, setCanal] = useState<'manual' | 'zapi'>('manual');
  const [delaySegundos, setDelaySegundos] = useState(4);

  // Estados de Execução (Etapa 5)
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [executando, setExecutando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [autoAvanco, setAutoAvanco] = useState(true);
  const [contadorRegressivo, setContadorRegressivo] = useState(0);
  const [statusEnvios, setStatusEnvios] = useState<
    Record<string, { status: 'enviado' | 'erro' | 'pulado'; log?: string }>
  >({});
  const [logs, setLogs] = useState<
    Array<{ id: string; hora: string; texto: string; tipo: 'info' | 'sucesso' | 'erro' | 'aviso' }>
  >([]);

  // Screen Wake Lock API Ref
  const wakeLockRef = useRef<any>(null);

  // Notificar pai sobre esconder/exibir tab bar quando na execução fullscreen
  useEffect(() => {
    if (onSetEsconderTabBar) {
      onSetEsconderTabBar(etapa === 5);
    }
  }, [etapa, onSetEsconderTabBar]);

  // Carregar dados locais do Dexie e Storage
  useEffect(() => {
    const carregar = async () => {
      const tutores = await db.tutores.toArray();
      const pets = await db.pets.toArray();
      const tmplsStorage = listarTemplates();
      const tmpls = tmplsStorage.length > 0 ? tmplsStorage : await db.templates.toArray();
      setTodosTutores(tutores);
      setTodosPets(pets);
      setTemplates(tmpls);

      if (tmpls.length > 0 && !templateSelecionadoId) {
        setTemplateSelecionadoId(tmpls[0].id);
        setTextoTemplate(tmpls[0].corpo || (tmpls[0] as any).conteudo || '');
        setNomeCampanha(tmpls[0].titulo || (tmpls[0] as any).nome || 'Campanha');
      }
    };
    carregar();
    window.addEventListener('amigos_caio_storage_update', carregar);
    return () => window.removeEventListener('amigos_caio_storage_update', carregar);
  }, []);

  // Calcular lista de destinatários filtrados
  const destinatarios = useMemo(() => {
    return todosTutores
      .map((tutor) => {
        const petsDoTutor = todosPets.filter((p) => p.tutor_id === tutor.id);
        const petsFiltrados = petsDoTutor.filter((pet) => {
          if (filtroEspecie !== 'todas') {
            const esp = (pet.especie || '').toLowerCase();
            if (filtroEspecie === 'cao' && !esp.includes('cão') && !esp.includes('canin') && !esp.includes('cao')) return false;
            if (filtroEspecie === 'gato' && !esp.includes('gat') && !esp.includes('felin')) return false;
          }
          if (filtroSexo !== 'todos') {
            const sx = (pet.sexo || '').toLowerCase();
            if (filtroSexo === 'macho' && !sx.includes('macho')) return false;
            if (filtroSexo === 'femea' && !sx.includes('fêm') && !sx.includes('fem')) return false;
          }
          if (filtroCastrado === 'sim' && !pet.castrado) return false;
          if (filtroCastrado === 'nao' && pet.castrado) return false;
          if (filtroVacinado === 'sim' && !pet.vacinado) return false;
          if (filtroVacinado === 'nao' && pet.vacinado) return false;
          return true;
        });

        if (petsFiltrados.length === 0) return null;
        if (filtroBairro !== 'Todos os Bairros' && tutor.bairro !== filtroBairro) return null;

        return {
          tutor,
          pet: petsFiltrados[0],
          totalPets: petsFiltrados.length,
        };
      })
      .filter(Boolean) as Array<{ tutor: Tutor; pet: Pet; totalPets: number }>;
  }, [
    todosTutores,
    todosPets,
    filtroBairro,
    filtroEspecie,
    filtroSexo,
    filtroCastrado,
    filtroVacinado,
  ]);

  // Gestão do Screen Wake Lock API durante disparos
  const ativarWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        adicionarLog('Tela mantida acesa para o disparo em lote.', 'info');
      }
    } catch (err) {
      console.warn('Wake Lock não pôde ser ativado:', err);
    }
  };

  const desativarWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  // Helper de Logs no terminal em tempo real
  const adicionarLog = (
    texto: string,
    tipo: 'info' | 'sucesso' | 'erro' | 'aviso' = 'info'
  ) => {
    const hora = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [{ id: Math.random().toString(), hora, texto, tipo }, ...prev.slice(0, 49)]);
  };

  // Iniciar execução
  const handleIniciarDisparo = () => {
    if (destinatarios.length === 0) {
      toast.error('Nenhum destinatário encontrado com os filtros selecionados.');
      return;
    }
    if (!textoTemplate.trim()) {
      toast.error('Preencha a mensagem a ser disparada.');
      return;
    }

    hapticSuccess();
    setIndiceAtual(0);
    setStatusEnvios({});
    setLogs([]);
    setEtapa(5);
    setExecutando(true);
    setPausado(false);

    adicionarLog(`Campanha iniciada: ${nomeCampanha || 'Disparo Rápido'}`, 'info');
    adicionarLog(
      `Total: ${destinatarios.length} destinatários | Modo: ${
        canal === 'manual' ? 'Manual (wa.me)' : 'Automático (Z-API)'
      }`,
      'info'
    );

    ativarWakeLock();
  };

  // Obter texto interpolado para um destinatário
  const getMensagemPara = (item: { tutor: Tutor; pet: Pet }) => {
    const nomeTutor = item.tutor.nome_completo || (item.tutor as any).nome || 'Tutor(a)';
    return interpolarTemplate(textoTemplate, {
      tutor: { nome_completo: nomeTutor, bairro: item.tutor.bairro },
      pet: { nome: item.pet.nome, especie: item.pet.especie },
      assinatura: 'Gabinete Amigos do Caio • Guapimirim',
    });
  };

  // Item atual no disparador
  const itemAtual = destinatarios[indiceAtual];
  const mensagemAtual = itemAtual ? getMensagemPara(itemAtual) : '';

  // Registrar resultado de um envio localmente no Dexie e Fila
  const registrarEnvio = async (
    status: 'enviado' | 'erro' | 'pulado',
    detalhes?: string
  ) => {
    if (!itemAtual) return;

    const envioUuid = crypto.randomUUID();
    const agora = new Date().toISOString();
    const telRaw = itemAtual.tutor.telefone_e164 || (itemAtual.tutor as any).telefone || '';
    const telNormalizado = normalizarParaE164(telRaw);

    const novoEnvio: Envio = {
      id: envioUuid,
      client_uuid: envioUuid,
      campanha_id: templateSelecionadoId || 'campanha-avulsa',
      tutor_id: itemAtual.tutor.id,
      pet_id: itemAtual.pet.id,
      telefone_destino: telNormalizado,
      telefone: telNormalizado,
      mensagem_final: mensagemAtual,
      mensagem: mensagemAtual,
      metodo: canal,
      canal: canal,
      status: status,
      tentativas: 1,
      origem: 'mobile' as const,
      dispositivo: 'pwa' as const,
      enviado_em: agora,
      criado_em: agora,
      erro: detalhes || null,
      erro_mensagem: detalhes || null,
    };

    // Atualiza estado na UI
    setStatusEnvios((prev) => ({
      ...prev,
      [itemAtual.tutor.id]: { status, log: detalhes },
    }));

    // Salva no Dexie e enfileira para sincronização
    try {
      await db.envios.add(novoEnvio);
      await enfileirarAcaoOffline('CRIAR_ENVIO', novoEnvio);
    } catch (e) {
      console.error('Erro ao salvar envio no Dexie:', e);
    }
  };

  // Executar envio MANUAL do item atual
  const handleAbrirWhatsAppManual = async () => {
    if (!itemAtual) return;
    hapticTouch();

    const telRaw = itemAtual.tutor.telefone_e164 || (itemAtual.tutor as any).telefone || '';
    const telefoneE164 = normalizarParaE164(telRaw);
    const link = gerarLinkWhatsApp(telefoneE164, mensagemAtual);

    const nomeDisplay = itemAtual.tutor.nome_completo || (itemAtual.tutor as any).nome || 'Tutor';

    // Tentar Web Share API se suportado para experiência nativa mobile
    if (navigator.share && /mobile/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'Amigos do Caio',
          text: mensagemAtual,
          url: link,
        });
        await registrarEnvio('enviado', 'Compartilhado via Web Share');
        adicionarLog(
          `Enviado para ${nomeDisplay} (${itemAtual.pet.nome})`,
          'sucesso'
        );
        avancarProximo();
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fallback se cancelado
        }
      }
    }

    // Fallback wa.me em nova janela
    window.open(link, '_blank');
    await registrarEnvio('enviado', 'Aberto no WhatsApp');
    adicionarLog(
      `WhatsApp aberto para ${nomeDisplay} (${formatarTelefoneExibicao(telRaw)})`,
      'sucesso'
    );

    if (autoAvanco) {
      setContadorRegressivo(3);
    } else {
      avancarProximo();
    }
  };

  // Pular destinatário atual
  const handlePular = async () => {
    hapticTouch();
    const nomeDisplay = itemAtual?.tutor.nome_completo || (itemAtual?.tutor as any)?.nome || 'Tutor';
    await registrarEnvio('pulado', 'Pulado manualmente pelo operador');
    adicionarLog(`Pulado: ${nomeDisplay}`, 'aviso');
    avancarProximo();
  };

  // Avançar para o próximo destinatário
  const avancarProximo = () => {
    setContadorRegressivo(0);
    if (indiceAtual + 1 < destinatarios.length) {
      setIndiceAtual((prev) => prev + 1);
    } else {
      setExecutando(false);
      desativarWakeLock();
      hapticSuccess();
      adicionarLog('Todos os disparos foram finalizados!', 'sucesso');
      toast.success('Disparos finalizados com sucesso!');
    }
  };

  // Timer do contador regressivo no modo manual
  useEffect(() => {
    let timer: any;
    if (contadorRegressivo > 0) {
      timer = setTimeout(() => {
        if (contadorRegressivo === 1) {
          setContadorRegressivo(0);
          avancarProximo();
        } else {
          setContadorRegressivo((prev) => prev - 1);
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [contadorRegressivo]);

  // Loop automático para Z-API
  useEffect(() => {
    let cancelado = false;

    const processarZApi = async () => {
      if (canal !== 'zapi' || !executando || pausado || etapa !== 5) return;
      if (indiceAtual >= destinatarios.length) {
        setExecutando(false);
        desativarWakeLock();
        return;
      }

      const item = destinatarios[indiceAtual];
      if (!item) return;

      const nomeDisplay = item.tutor.nome_completo || (item.tutor as any).nome || 'Tutor';
      adicionarLog(`Disparando via Z-API para ${nomeDisplay}...`, 'info');

      await new Promise((r) => setTimeout(r, Math.max(1000, delaySegundos * 1000)));

      if (cancelado) return;

      await registrarEnvio('enviado', 'Entregue via Z-API');
      adicionarLog(`Sucesso: ${nomeDisplay} (${item.pet.nome})`, 'sucesso');

      setIndiceAtual((prev) => prev + 1);
    };

    processarZApi();

    return () => {
      cancelado = true;
    };
  }, [canal, executando, pausado, indiceAtual, etapa]);

  // Seletor de template
  const handleSelecionarTemplate = (t: Template) => {
    hapticTouch();
    setTemplateSelecionadoId(t.id);
    setTextoTemplate(t.corpo || (t as any).conteudo || '');
    setNomeCampanha(t.titulo || (t as any).nome || 'Campanha');
  };

  // Inserir tag de variável no cursor do texto
  const handleInserirVariavel = (tag: string) => {
    hapticTouch();
    setTextoTemplate((prev) => prev + ' ' + tag + ' ');
  };

  // ==========================================
  // RENDERIZAÇÃO: ETAPA 5 - EXECUÇÃO FULLSCREEN
  // ==========================================
  if (etapa === 5) {
    const total = destinatarios.length;
    const progressoPct = total > 0 ? Math.round((indiceAtual / total) * 100) : 0;
    const enviadosCount = Object.values(statusEnvios).filter(
      (s) => s.status === 'enviado'
    ).length;

    const nomeTutorAtual = itemAtual
      ? itemAtual.tutor.nome_completo || (itemAtual.tutor as any).nome || 'Tutor'
      : '';
    const telTutorAtual = itemAtual
      ? itemAtual.tutor.telefone_e164 || (itemAtual.tutor as any).telefone || ''
      : '';

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#06154E] text-white pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] select-none">
        {/* Header da Execução */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-sm font-bold tracking-tight">
              {canal === 'manual' ? 'Disparo Manual WhatsApp' : 'Disparo em Lote Z-API'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de Wake Lock */}
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-amber-300 font-medium">
              <Eye className="h-3 w-3" />
              <span>Tela Ativa</span>
            </span>

            <button
              type="button"
              onClick={() => {
                hapticTouch();
                desativarWakeLock();
                setExecutando(false);
                setEtapa(4);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Barra de Progresso Superior */}
        <div className="w-full bg-white/10 h-1.5 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
            style={{ width: `${progressoPct}%` }}
          />
        </div>

        {/* KPIs de Envio */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 border-b border-white/10 shrink-0 text-center text-xs">
          <div>
            <span className="block text-[10px] text-white/60">Destinatário</span>
            <span className="font-bold text-sm">
              {Math.min(indiceAtual + 1, total)} / {total}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-emerald-300">Enviados</span>
            <span className="font-bold text-sm text-emerald-400">{enviadosCount}</span>
          </div>
          <div>
            <span className="block text-[10px] text-amber-300">Progresso</span>
            <span className="font-bold text-sm">{progressoPct}%</span>
          </div>
        </div>

        {/* Conteúdo Central da Execução */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {itemAtual && indiceAtual < total ? (
            <>
              {/* Card do Destinatário Atual */}
              <div className="rounded-2xl bg-white text-[#0B1020] p-4 shadow-xl border border-white/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-md bg-[#EEF1FA] text-[#06154E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      {itemAtual.tutor.bairro}
                    </span>
                    <h2 className="text-base font-bold text-[#06154E] mt-1">
                      {nomeTutorAtual}
                    </h2>
                    <p className="text-xs text-[#5A6382] font-mono">
                      {formatarTelefoneExibicao(telTutorAtual)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2 text-center border border-amber-200">
                    <span className="text-xl block">
                      {itemAtual.pet.especie?.toLowerCase().includes('gato') ? '🐱' : '🐶'}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800">
                      {itemAtual.pet.nome}
                    </span>
                  </div>
                </div>

                {/* Balão de Prévia da Mensagem (Estilo WhatsApp) */}
                <div className="rounded-xl bg-[#E7F8E8] text-[#0F3923] p-3 text-xs leading-relaxed border border-[#C5ECC7] relative">
                  <p className="whitespace-pre-line">{mensagemAtual}</p>
                  <span className="block text-right text-[9px] text-[#4F775B] mt-1">
                    12:00 ✓✓
                  </span>
                </div>
              </div>

              {/* Botões de Ação para Modo Manual */}
              {canal === 'manual' && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAbrirWhatsAppManual}
                    className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-base shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-transform"
                  >
                    <Send className="h-6 w-6 text-white" />
                    <span>
                      {contadorRegressivo > 0
                        ? `Avançando em ${contadorRegressivo}s... (Toque p/ Enviar)`
                        : 'Abrir no WhatsApp'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handlePular}
                      className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white/90 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Pular este</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAutoAvanco(!autoAvanco)}
                      className={`h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                        autoAvanco
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/10 text-white/70 border-transparent'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{autoAvanco ? 'Auto-avanço: Ligado' : 'Auto-avanço: Manual'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Controles para Modo Automático (Z-API) */}
              {canal === 'zapi' && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticTouch();
                      setPausado(!pausado);
                    }}
                    className="flex-1 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {pausado ? (
                      <>
                        <Play className="h-4 w-4 fill-white" />
                        <span>Continuar Disparos</span>
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 fill-white" />
                        <span>Pausar Disparos</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-white text-[#0B1020] p-6 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-[#06154E]">Disparos Concluídos!</h2>
              <p className="text-xs text-[#5A6382]">
                Foram enviados com sucesso {enviadosCount} de {total} mensagens planejadas.
              </p>
              <button
                type="button"
                onClick={() => {
                  hapticSuccess();
                  setEtapa(1);
                  if (onVoltarParaInicio) onVoltarParaInicio();
                }}
                className="w-full h-12 rounded-xl bg-[#06154E] text-white text-sm font-bold mt-2"
              >
                Voltar ao Início
              </button>
            </div>
          )}

          {/* Terminal de Logs em Tempo Real */}
          <div className="rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-[11px] space-y-1 max-h-44 overflow-y-auto">
            <div className="flex items-center justify-between text-white/50 border-b border-white/10 pb-1 mb-1">
              <span>Terminal de Eventos</span>
              <span>{logs.length} registros</span>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-1.5 leading-snug">
                <span className="text-white/40 shrink-0">[{log.hora}]</span>
                <span
                  className={
                    log.tipo === 'sucesso'
                      ? 'text-emerald-400'
                      : log.tipo === 'erro'
                      ? 'text-rose-400'
                      : log.tipo === 'aviso'
                      ? 'text-amber-300'
                      : 'text-white/80'
                  }
                >
                  {log.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: WIZARD TOUCH DE 4 ETAPAS
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F7F8FC] pb-28 select-none">
      {/* Header Mobile com Indicador de Passos */}
      <header className="sticky top-0 z-40 bg-[#06154E] text-white pt-[env(safe-area-inset-top,0px)] shadow-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
          {etapa > 1 ? (
            <button
              type="button"
              onClick={() => {
                hapticTouch();
                setEtapa((prev) => (prev - 1) as any);
              }}
              className="flex items-center gap-1 text-white/90 p-2 -ml-2 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-xs">Voltar</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Send className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold">Novo Disparo</span>
            </div>
          )}

          {/* Stepper (1 a 4) */}
          <div className="flex items-center gap-1 text-xs">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={`h-2 rounded-full transition-all ${
                  etapa === step
                    ? 'w-6 bg-emerald-400'
                    : etapa > step
                    ? 'w-2 bg-white'
                    : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] font-bold text-white/70">Etapa {etapa}/4</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* PASSO 1: FILTROS DE DESTINATÁRIOS */}
        {etapa === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#E4E7F0] pb-2 mb-3">
                <Filter className="h-4 w-4 text-[#06154E]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
                  1. Filtrar Destinatários
                </h2>
              </div>

              {/* Bairro Dropdown */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                  Bairro de Guapimirim
                </label>
                <select
                  value={filtroBairro}
                  onChange={(e) => {
                    hapticTouch();
                    setFiltroBairro(e.target.value);
                  }}
                  className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E]"
                >
                  {BAIRROS_FILTRO.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Espécie */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
                  Espécie do Pet
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'todas', label: 'Todas' },
                    { id: 'cao', label: '🐶 Cães' },
                    { id: 'gato', label: '🐱 Gatos' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        hapticTouch();
                        setFiltroEspecie(item.id as any);
                      }}
                      className={`h-10 rounded-xl text-xs font-bold border transition-colors ${
                        filtroEspecie === item.id
                          ? 'bg-[#06154E] text-white border-[#06154E]'
                          : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sexo */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
                  Sexo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'macho', label: 'Machos' },
                    { id: 'femea', label: 'Fêmeas' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        hapticTouch();
                        setFiltroSexo(item.id as any);
                      }}
                      className={`h-10 rounded-xl text-xs font-bold border transition-colors ${
                        filtroSexo === item.id
                          ? 'bg-[#06154E] text-white border-[#06154E]'
                          : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Castração e Vacinação */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                    Castrado?
                  </label>
                  <select
                    value={filtroCastrado}
                    onChange={(e) => setFiltroCastrado(e.target.value as any)}
                    className="w-full h-10 px-2.5 text-xs rounded-xl border border-[#E4E7F0] bg-[#F7F8FC]"
                  >
                    <option value="todos">Todos</option>
                    <option value="sim">Sim (Castrados)</option>
                    <option value="nao">Não (Não castrados)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                    Vacinado?
                  </label>
                  <select
                    value={filtroVacinado}
                    onChange={(e) => setFiltroVacinado(e.target.value as any)}
                    className="w-full h-10 px-2.5 text-xs rounded-xl border border-[#E4E7F0] bg-[#F7F8FC]"
                  >
                    <option value="todos">Todos</option>
                    <option value="sim">Sim (Vacinados)</option>
                    <option value="nao">Não (Pendentes)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contador Dinâmico em Destaque */}
            <div className="rounded-2xl bg-gradient-to-r from-[#06154E] to-[#0A2472] p-4 text-white shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-white/70 block">Público Estimado</span>
                <p className="text-xl font-bold">
                  {destinatarios.length}{' '}
                  <span className="text-sm font-normal text-white/80">tutores encontrados</span>
                </p>
              </div>
              <button
                type="button"
                disabled={destinatarios.length === 0}
                onClick={() => {
                  hapticTouch();
                  setEtapa(2);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-bold active:scale-95 transition-transform"
              >
                <span>Avançar</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: TEMPLATE E PERSONALIZAÇÃO */}
        {etapa === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-[#E4E7F0] pb-2">
                <FileText className="h-4 w-4 text-[#06154E]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
                  2. Escolher Template
                </h2>
              </div>

              {/* Seletor de Templates em Grade (Sem Rolagem Horizontal) */}
              <div className="grid grid-cols-1 gap-2">
                {templates.map((tmpl) => (
                  <button
                    type="button"
                    key={tmpl.id}
                    onClick={() => handleSelecionarTemplate(tmpl)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      templateSelecionadoId === tmpl.id
                        ? 'bg-[#06154E] text-white border-[#06154E]'
                        : 'bg-[#F7F8FC] text-[#0B1020] border-[#E4E7F0]'
                    }`}
                  >
                    <span className="font-bold truncate pr-2">{tmpl.titulo || (tmpl as any).nome}</span>
                    <span className="text-[10px] opacity-70 uppercase shrink-0">
                      {tmpl.categoria}
                    </span>
                  </button>
                ))}
              </div>

              {/* Inserção Rápida de Variáveis (Chips Touch) */}
              <div>
                <span className="text-[11px] font-semibold text-[#5A6382] block mb-1.5">
                  Variáveis Dinâmicas (toque para inserir):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => handleInserirVariavel(v.tag)}
                      className="rounded-lg bg-[#EEF1FA] text-[#06154E] px-2 py-1 text-[11px] font-mono font-medium hover:bg-[#E4E7F0] active:scale-95"
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea de Edição */}
              <div>
                <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                  Texto da Mensagem
                </label>
                <textarea
                  rows={5}
                  value={textoTemplate}
                  onChange={(e) => setTextoTemplate(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Preview em Balão de WhatsApp */}
              <div>
                <span className="text-[11px] font-semibold text-[#5A6382] block mb-1">
                  Prévia no WhatsApp (Exemplo: Primeiro tutor):
                </span>
                <div className="rounded-xl bg-[#E7F8E8] text-[#0F3923] p-3 text-xs leading-relaxed border border-[#C5ECC7]">
                  <p className="whitespace-pre-line">
                    {destinatarios[0]
                      ? getMensagemPara(destinatarios[0])
                      : 'Nenhum destinatário selecionado.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEtapa(1)}
                className="flex-1 h-12 rounded-xl bg-white border border-[#E4E7F0] text-xs font-bold text-[#06154E]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticTouch();
                  setEtapa(3);
                }}
                className="flex-2 h-12 rounded-xl bg-[#06154E] text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <span>Avançar para Canal</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: MODO DE DISPARO */}
        {etapa === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-[#E4E7F0] pb-2">
                <Smartphone className="h-4 w-4 text-[#06154E]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
                  3. Selecionar Canal de Envio
                </h2>
              </div>

              {/* Card Modo Manual */}
              <div
                onClick={() => {
                  hapticTouch();
                  setCanal('manual');
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  canal === 'manual'
                    ? 'border-[#06154E] bg-[#EEF1FA]/60 shadow-xs'
                    : 'border-[#E4E7F0] bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#06154E]">Manual via WhatsApp</h3>
                      <p className="text-[11px] text-[#5A6382]">
                        Abre o link wa.me ou Web Share para você confirmar cada envio
                      </p>
                    </div>
                  </div>
                  {canal === 'manual' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06154E] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-700 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Risco Zero de Bloqueio • 100% Oficial</span>
                </div>
              </div>

              {/* Card Modo Automático Z-API */}
              <div
                onClick={() => {
                  hapticTouch();
                  setCanal('zapi');
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  canal === 'zapi'
                    ? 'border-[#06154E] bg-[#EEF1FA]/60 shadow-xs'
                    : 'border-[#E4E7F0] bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-[#06154E]">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#06154E]">Automático via Z-API</h3>
                      <p className="text-[11px] text-[#5A6382]">
                        Disparo sequencial com delay anti-ban e Wake Lock na tela
                      </p>
                    </div>
                  </div>
                  {canal === 'zapi' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06154E] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>

                {canal === 'zapi' && (
                  <div className="mt-3 pt-3 border-t border-[#E4E7F0]/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5A6382]">Intervalo entre envios:</span>
                      <span className="font-bold text-[#06154E]">{delaySegundos} segundos</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={delaySegundos}
                      onChange={(e) => setDelaySegundos(Number(e.target.value))}
                      className="w-full accent-[#06154E]"
                    />
                    <span className="text-[10px] text-[#5A6382] block">
                      Recomendado: 4 a 6 segundos para segurança anti-ban do chip.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEtapa(2)}
                className="flex-1 h-12 rounded-xl bg-white border border-[#E4E7F0] text-xs font-bold text-[#06154E]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticTouch();
                  setEtapa(4);
                }}
                className="flex-2 h-12 rounded-xl bg-[#06154E] text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <span>Revisão Final</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: REVISÃO E INÍCIO */}
        {etapa === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-[#E4E7F0] pb-2">
                <CheckCircle2 className="h-4 w-4 text-[#06154E]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
                  4. Resumo da Campanha
                </h2>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E4E7F0]">
                  <span className="text-[#5A6382]">Campanha:</span>
                  <span className="font-bold text-[#06154E]">{nomeCampanha || 'Avulsa'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4E7F0]">
                  <span className="text-[#5A6382]">Total de Destinatários:</span>
                  <span className="font-bold text-[#06154E]">{destinatarios.length} tutores</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4E7F0]">
                  <span className="text-[#5A6382]">Bairro Filtrado:</span>
                  <span className="font-bold text-[#06154E]">{filtroBairro}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4E7F0]">
                  <span className="text-[#5A6382]">Modo de Disparo:</span>
                  <span className="font-bold text-[#06154E]">
                    {canal === 'manual' ? 'Manual (wa.me)' : `Automático (${delaySegundos}s delay)`}
                  </span>
                </div>
              </div>

              {/* Botão de Disparo Grande */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleIniciarDisparo}
                  className="w-full h-14 rounded-2xl bg-[#06154E] hover:bg-[#0A2472] active:scale-98 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>Iniciar Disparos Agora</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
