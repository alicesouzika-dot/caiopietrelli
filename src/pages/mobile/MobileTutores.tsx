/**
 * Tela Mobile de Tutores e Pets
 * Lista com Swipe Actions, Busca por Voz, Alternância Mapa (Leaflet) e Bottom Sheet de Detalhes
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Mic,
  MicOff,
  Map,
  List,
  Phone,
  MessageSquare,
  MapPin,
  HeartHandshake,
  Navigation,
  Copy,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  X,
  Crosshair,
  Filter,
} from 'lucide-react';
import { db } from '../../lib/db';
import { Tutor, Pet } from '../../types/database';
import { formatarTelefoneExibicao, normalizarParaE164 } from '../../lib/telefone';
import { mascararCPF, formatarCPF } from '../../lib/cpf';
import { abrirWhatsAppWeb } from '../../lib/wa';
import { hapticTouch, hapticSuccess, hapticError } from '../../lib/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { enfileirarAcaoOffline } from '../../lib/sync';

interface MobileTutoresProps {
  onAbrirCadastroRapido: () => void;
  focoBuscaInicial?: boolean;
}

export const MobileTutores: React.FC<MobileTutoresProps> = ({
  onAbrirCadastroRapido,
  focoBuscaInicial = false,
}) => {
  const { role, usuario, temPermissao } = useAuth();
  const podeExcluir = temPermissao('excluirTutor');

  const [tutores, setTutores] = useState<(Tutor & { pets: Pet[] })[]>([]);
  const [busca, setBusca] = useState('');
  const [ouvindoVoz, setOuvindoVoz] = useState(false);

  // Modo de visualização: Lista ou Mapa
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'mapa'>('lista');

  // Filtros rápidos
  const [filtroBairro, setFiltroBairro] = useState<string>('todos');
  const [filtroEspecie, setFiltroEspecie] = useState<string>('todas');
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);

  // Drawer / Bottom sheet do tutor selecionado
  const [tutorSelecionado, setTutorSelecionado] = useState<(Tutor & { pets: Pet[] }) | null>(null);
  const [cpfRevelado, setCpfRevelado] = useState(false);

  // Swipe Action no card atual
  const [swipeAtivo, setSwipeAtivo] = useState<{ id: string; direcao: 'left' | 'right' } | null>(null);
  const touchStartX = useRef(0);

  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const carregarTutores = async () => {
    const todosTutores = await db.tutores.toArray();
    const todosPets = await db.pets.toArray();

    const combinados = todosTutores.map((t) => ({
      ...t,
      pets: todosPets.filter((p) => p.tutor_id === t.id),
    }));

    setTutores(combinados);
  };

  useEffect(() => {
    carregarTutores();
    window.addEventListener('amigos_caio_storage_update', carregarTutores);
    return () => window.removeEventListener('amigos_caio_storage_update', carregarTutores);
  }, []);

  useEffect(() => {
    if (focoBuscaInicial && inputBuscaRef.current) {
      inputBuscaRef.current.focus();
    }
  }, [focoBuscaInicial]);

  const bairrosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    tutores.forEach((t) => {
      if (t.bairro) set.add(t.bairro.trim());
    });
    return Array.from(set).sort();
  }, [tutores]);

  const tutoresFiltrados = useMemo(() => {
    const norm = (str: string | null | undefined) =>
      String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const q = norm(busca);
    const qDigitos = String(busca || '').replace(/\D/g, '');

    return tutores
      .filter((t) => {
        if (q) {
          const matchNome = norm(t.nome_completo).includes(q);
          const matchBairro = norm(t.bairro).includes(q);
          const matchCpf =
            String(t.cpf || '').toLowerCase().includes(q) ||
            (qDigitos.length > 0 && String(t.cpf || '').replace(/\D/g, '').includes(qDigitos));
          const matchTel =
            String(t.telefone_e164 || '').includes(q) ||
            (qDigitos.length > 0 && String(t.telefone_e164 || '').replace(/\D/g, '').includes(qDigitos));
          const matchPet = t.pets?.some(
            (p) => norm(p.nome).includes(q) || norm(p.raca).includes(q) || norm(p.especie).includes(q)
          );

          if (!matchNome && !matchBairro && !matchCpf && !matchTel && !matchPet) {
            return false;
          }
        }
        if (filtroBairro !== 'todos' && t.bairro !== filtroBairro) return false;
        if (filtroEspecie !== 'todas') {
          const tem = t.pets?.some((p) => norm(p.especie) === norm(filtroEspecie));
          if (!tem) return false;
        }
        return true;
      })
      .sort((a, b) =>
        (a.nome_completo || '').trim().localeCompare((b.nome_completo || '').trim(), 'pt-BR', {
          sensitivity: 'base',
        })
      );
  }, [tutores, busca, filtroBairro, filtroEspecie]);

  const alternarBuscaPorVoz = () => {
    hapticTouch();
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Busca por voz não é suportada neste navegador.');
      return;
    }

    if (ouvindoVoz) {
      setOuvindoVoz(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setOuvindoVoz(true);
      recognition.onresult = (event: any) => {
        const textoFalado = event.results[0][0].transcript;
        setBusca(textoFalado);
        setOuvindoVoz(false);
        hapticSuccess();
      };
      recognition.onerror = () => setOuvindoVoz(false);
      recognition.onend = () => setOuvindoVoz(false);

      recognition.start();
    } catch {
      setOuvindoVoz(false);
    }
  };

  useEffect(() => {
    if (modoVisualizacao !== 'mapa') return;

    let map = mapInstanceRef.current;

    const setupMap = async () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (!map) {
        map = L.map(mapContainerRef.current, {
          zoomControl: false,
        }).setView([-22.5358, -42.9822], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      tutoresFiltrados.forEach((t) => {
        if (t.latitude && t.longitude) {
          const marker = L.marker([t.latitude, t.longitude]).addTo(map);
          marker.on('click', () => {
            hapticTouch();
            setTutorSelecionado(t);
            setCpfRevelado(false);
          });
        }
      });
    };

    setupMap();
  }, [modoVisualizacao, tutoresFiltrados]);

  const centralizarEmMim = () => {
    hapticTouch();
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapInstanceRef.current;
        const L = (window as any).L;
        if (map && L) {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15);
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8,
            color: '#0A2472',
            fillColor: '#2563EB',
            fillOpacity: 0.9,
          }).addTo(map);
          hapticSuccess();
        }
      },
      () => alert('Não foi possível obter sua localização no momento.')
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (id: string, e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -50) {
      hapticTouch();
      setSwipeAtivo({ id, direcao: 'left' });
    } else if (deltaX > 50) {
      hapticTouch();
      setSwipeAtivo({ id, direcao: 'right' });
    } else {
      setSwipeAtivo(null);
    }
  };

  const handleExcluirTutor = async (tutor: Tutor) => {
    if (!podeExcluir) {
      alert('Apenas administradores podem excluir tutores.');
      return;
    }
    if (confirm(`Excluir o cadastro de ${tutor.nome_completo}?`)) {
      await db.tutores.delete(tutor.id);
      await enfileirarAcaoOffline('EXCLUIR_TUTOR', { id: tutor.id });
      setTutorSelecionado(null);
      carregarTutores();
      hapticSuccess();
    }
  };

  return (
    <div className="flex flex-col flex-1 relative pb-20 overflow-x-hidden">
      {/* 1. Barra de Busca Fixa */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E4E7F0] p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] space-y-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6382]" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, CPF, telefone ou pet..."
              className="w-full rounded-2xl border border-[#E4E7F0] bg-[#F7F8FC] pl-9 pr-9 py-2 text-xs text-[#0B1020] placeholder-[#5A6382] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#06154E]"
            />
            <button
              type="button"
              onClick={alternarBuscaPorVoz}
              className={`absolute right-2.5 top-2 p-0.5 rounded-full transition-colors ${
                ouvindoVoz ? 'text-rose-600 animate-pulse' : 'text-[#5A6382] hover:text-[#06154E]'
              }`}
              title="Busca por voz (pt-BR)"
            >
              {ouvindoVoz ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onAbrirCadastroRapido();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#06154E] text-white shadow-xs active:scale-95 transition-transform"
            title="Novo Cadastro"
            aria-label="Novo cadastro de tutor"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Chips de Filtro Rápido Ajustados Sem Rolagem Horizontal */}
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setModalFiltroAberto(true)}
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-full border text-[11px] font-semibold truncate active:scale-95 ${
              filtroBairro !== 'todos' || filtroEspecie !== 'todas'
                ? 'bg-[#06154E] text-white border-[#06154E]'
                : 'bg-white text-[#5A6382] border-[#E4E7F0]'
            }`}
          >
            <Filter className="h-3 w-3 shrink-0" />
            <span className="truncate">{filtroBairro !== 'todos' ? filtroBairro : 'Bairro'}</span>
          </button>

          {['todas', 'cão', 'gato'].map((esp) => {
            const ativo = filtroEspecie === esp;
            return (
              <button
                type="button"
                key={esp}
                onClick={() => {
                  hapticTouch();
                  setFiltroEspecie(esp);
                }}
                className={`px-2 py-1.5 rounded-full text-[11px] font-semibold capitalize truncate text-center active:scale-95 transition-colors ${
                  ativo
                    ? 'bg-[#0A2472] text-white shadow-2xs'
                    : 'bg-white text-[#5A6382] border border-[#E4E7F0]'
                }`}
              >
                {esp === 'todas' ? 'Todas' : esp === 'cão' ? '🐶 Cães' : '🐱 Gatos'}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Conteúdo: MODO LISTA */}
      {modoVisualizacao === 'lista' && (
        <div className="p-3 space-y-2.5">
          <div className="text-[11px] text-[#5A6382] px-1 flex justify-between items-center">
            <span>{tutoresFiltrados.length} tutores encontrados</span>
            <span className="italic">Deslize o card para ações</span>
          </div>

          {tutoresFiltrados.map((tutor) => {
            const isSwipedLeft = swipeAtivo?.id === tutor.id && swipeAtivo.direcao === 'left';
            const isSwipedRight = swipeAtivo?.id === tutor.id && swipeAtivo.direcao === 'right';

            return (
              <div key={tutor.id} className="relative overflow-hidden rounded-2xl shadow-2xs">
                {/* Background Actions (Swipe Left: Ligar & WhatsApp) */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1.5 bg-[#EEF1FA]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticTouch();
                      window.open(`tel:${tutor.telefone_e164}`);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs"
                    title="Ligar"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticTouch();
                      abrirWhatsAppWeb(
                        tutor.telefone_e164,
                        `Olá, ${tutor.nome_completo.split(' ')[0]}! Tudo bem? Entramos em contato pelo gabinete de proteção animal de Guapimirim.`
                      );
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs"
                    title="WhatsApp"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                </div>

                {/* Background Actions (Swipe Right: Detalhes / Editar) */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 bg-amber-50">
                  <button
                    type="button"
                    onClick={() => {
                      setTutorSelecionado(tutor);
                      setCpfRevelado(false);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#06154E] text-white shadow-xs"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </div>

                {/* Card Principal do Tutor */}
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(tutor.id, e)}
                  onClick={() => {
                    hapticTouch();
                    setTutorSelecionado(tutor);
                    setCpfRevelado(false);
                    setSwipeAtivo(null);
                  }}
                  className={`relative z-10 flex items-center justify-between p-3.5 bg-white border border-[#E4E7F0] rounded-2xl transition-transform active:bg-[#F7F8FC] ${
                    isSwipedLeft ? '-translate-x-24' : isSwipedRight ? 'translate-x-16' : 'translate-x-0'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#0A2472] font-bold border border-[#E4E7F0]">
                      {tutor.pets?.[0]?.foto_path ? (
                        <img
                          src={tutor.pets[0].foto_path}
                          alt={tutor.pets[0].nome}
                          className="h-full w-full object-cover rounded-2xl"
                        />
                      ) : (
                        <HeartHandshake className="h-5 w-5 text-[#0A2472]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B1020] truncate">
                        {tutor.nome_completo}
                      </p>
                      <p className="text-[11px] text-[#5A6382] flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-[#5A6382]" />
                        {tutor.bairro || 'Guapimirim'} ·{' '}
                        <span className="font-mono">{formatarTelefoneExibicao(tutor.telefone_e164)}</span>
                      </p>

                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tutor.pets?.map((pet) => (
                          <span
                            key={pet.id}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF1FA] text-[#0A2472]"
                          >
                            {pet.nome} ({pet.especie || 'Pet'})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {tutoresFiltrados.length === 0 && (
            <div className="py-12 text-center text-xs text-[#5A6382]">
              Nenhum tutor encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* 3. Conteúdo: MODO MAPA */}
      {modoVisualizacao === 'mapa' && (
        <div className="relative flex-1 h-[70vh] w-full">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          <button
            type="button"
            onClick={centralizarEmMim}
            className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#06154E] shadow-xl border border-[#E4E7F0] active:scale-95"
            title="Minha Localização Atual"
          >
            <Crosshair className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* 4. BOTTOM SHEET EXPANDIDO DE DETALHES DO TUTOR */}
      {tutorSelecionado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] p-4 bg-[#06154E] text-white rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold truncate">{tutorSelecionado.nome_completo}</h3>
                <p className="text-xs text-white/70">Bairro {tutorSelecionado.bairro || 'Centro'} · Guapimirim</p>
              </div>
              <button
                type="button"
                onClick={() => setTutorSelecionado(null)}
                className="p-1 rounded-full text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    abrirWhatsAppWeb(
                      tutorSelecionado.telefone_e164,
                      `Olá, ${tutorSelecionado.nome_completo.split(' ')[0]}!`
                    );
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 active:scale-95"
                >
                  <MessageSquare className="h-4 w-4 mb-1 text-emerald-700" /> WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    window.open(`tel:${tutorSelecionado.telefone_e164}`);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50 text-[#0A2472] font-bold border border-blue-200 active:scale-95"
                >
                  <Phone className="h-4 w-4 mb-1 text-[#0A2472]" /> Ligar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    const lat = tutorSelecionado.latitude || -22.5358;
                    const lng = tutorSelecionado.longitude || -42.9822;
                    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 text-slate-800 font-bold border border-slate-200 active:scale-95"
                >
                  <Navigation className="h-4 w-4 mb-1 text-slate-700" /> Navegar
                </button>
              </div>

              <div className="rounded-2xl border border-[#E4E7F0] bg-[#F7F8FC] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#5A6382]">CPF (LGPD):</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#0B1020]">
                    <span>{cpfRevelado ? formatarCPF(tutorSelecionado.cpf) : mascararCPF(tutorSelecionado.cpf)}</span>
                    <button
                      type="button"
                      onClick={() => setCpfRevelado(!cpfRevelado)}
                      className="p-1 text-[#5A6382]"
                    >
                      {cpfRevelado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#5A6382]">Telefone:</span>
                  <span className="font-mono font-bold text-[#0B1020]">
                    {formatarTelefoneExibicao(tutorSelecionado.telefone_e164)}
                  </span>
                </div>

                {tutorSelecionado.endereco && (
                  <div className="pt-2 border-t border-[#E4E7F0]">
                    <span className="text-[#5A6382]">Endereço:</span>
                    <p className="text-[#0B1020] font-medium mt-0.5">{tutorSelecionado.endereco}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6382] mb-2">
                  Animais Domésticos ({tutorSelecionado.pets?.length || 0})
                </h4>
                <div className="space-y-2">
                  {tutorSelecionado.pets?.map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E4E7F0] bg-white shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#0A2472] font-bold">
                          {pet.foto_path ? (
                            <img src={pet.foto_path} alt={pet.nome} className="h-full w-full object-cover rounded-xl" />
                          ) : (
                            <span>{pet.especie?.[0] || 'P'}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[#0B1020]">{pet.nome}</p>
                          <p className="text-[11px] text-[#5A6382]">
                            {pet.especie} · {pet.sexo} · {pet.raca || 'SRD'}
                          </p>
                          {pet.microchip && (
                            <p className="text-[10px] font-mono text-[#0A2472]">Chip: {pet.microchip}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {podeExcluir && (
                <button
                  type="button"
                  onClick={() => handleExcluirTutor(tutorSelecionado)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700 active:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" /> Excluir Cadastro de Tutor
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL BOTTOM SHEET: FILTRO POR BAIRRO */}
      {modalFiltroAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-4 space-y-3 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-2">
              <h3 className="text-sm font-bold text-[#0B1020]">Filtrar por Bairro</h3>
              <button onClick={() => setModalFiltroAberto(false)} className="text-[#5A6382]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
              <button
                type="button"
                onClick={() => {
                  setFiltroBairro('todos');
                  setModalFiltroAberto(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl font-semibold ${
                  filtroBairro === 'todos' ? 'bg-[#06154E] text-white' : 'bg-[#F7F8FC] text-[#0B1020]'
                }`}
              >
                Todos os Bairros
              </button>
              {bairrosDisponiveis.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => {
                    setFiltroBairro(b);
                    setModalFiltroAberto(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl font-semibold ${
                    filtroBairro === b ? 'bg-[#06154E] text-white' : 'bg-[#F7F8FC] text-[#0B1020]'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
