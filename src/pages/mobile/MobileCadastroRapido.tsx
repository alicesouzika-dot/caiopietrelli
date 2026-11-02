/**
 * Tela de Cadastro Rápido Mobile (Campo / Mutirão / Feira de Adoção)
 * 1-screen rapid registration form:
 * - Foto com câmera traseira (capture="environment") e redimensionamento em canvas (max 1280px)
 * - GPS "Usar minha localização"
 * - 100% funcional offline com Dexie e fila de sincronização
 */

import React, { useState, useRef } from 'react';
import {
  Camera,
  MapPin,
  User,
  Heart,
  CheckCircle2,
  X,
  Plus,
  RefreshCw,
  Phone,
  FileText,
  Home,
  Check,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/db';
import { enfileirarAcaoOffline } from '../../lib/sync';
import { formatarTelefoneExibicao, normalizarParaE164, validarTelefoneBR } from '../../lib/telefone';
import { formatarCPF, validarCPF, limparCPF } from '../../lib/cpf';
import { hapticTouch, hapticSuccess, hapticError } from '../../lib/haptics';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../contexts/AuthContext';

// Bairros oficiais de Guapimirim/RJ
const BAIRROS_GUAPIMIRIM = [
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
  'Segredo',
  'Citrolândia',
  'Vila Olímpica',
  'Outro',
];

interface MobileCadastroRapidoProps {
  onVoltar: () => void;
  onSucesso?: () => void;
}

export const MobileCadastroRapido: React.FC<MobileCadastroRapidoProps> = ({
  onVoltar,
  onSucesso,
}) => {
  const { usuario } = useAuth();
  const { isOnline } = useOnlineStatus();

  // Estados do Tutor
  const [nomeTutor, setNomeTutor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [bairro, setBairro] = useState('Centro');
  const [endereco, setEndereco] = useState('');

  // Estados do Pet
  const [nomePet, setNomePet] = useState('');
  const [especie, setEspecie] = useState<'cao' | 'gato' | 'outro'>('cao');
  const [sexoPet, setSexoPet] = useState<'macho' | 'femea' | 'indefinido'>('macho');
  const [idadePet, setIdadePet] = useState('');
  const [racaPet, setRacaPet] = useState('SRD (Vira-lata)');
  const [portePet, setPortePet] = useState<'pequeno' | 'medio' | 'grande'>('medio');
  const [castrado, setCastrado] = useState<'sim' | 'nao' | 'nao_sei'>('sim');
  const [vacinado, setVacinado] = useState<'sim' | 'nao'>('sim');
  const [microchip, setMicrochip] = useState('');

  // Foto e GPS
  const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);

  // Controle de fluxo contínuo
  const [manterTutor, setManterTutor] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatação em tempo real do telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatado = raw;
    if (raw.length > 2) formatado = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length > 7) formatado = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    setTelefone(formatado);
  };

  // Formatação em tempo real do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(formatarCPF(raw));
  };

  // Captura e redimensionamento da foto no canvas (max 1280px, ~80% qualidade)
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessandoFoto(true);
    hapticTouch();

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setFotoDataUrl(dataUrl);
          hapticSuccess();
          toast.success('Foto capturada e otimizada!');
        }
        setProcessandoFoto(false);
      };
      img.onerror = () => {
        setProcessandoFoto(false);
        toast.error('Erro ao processar imagem.');
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Obter localização GPS do dispositivo
  const handleObterGPS = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não suportada neste dispositivo.');
      return;
    }

    hapticTouch();
    setBuscandoGps(true);
    toast.info('Obtendo sinal GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalizacao({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setBuscandoGps(false);
        hapticSuccess();
        toast.success(
          `Localização obtida: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        );
      },
      (err) => {
        setBuscandoGps(false);
        hapticError();
        toast.error(`Não foi possível obter GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Salvar cadastro
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    hapticTouch();

    if (!nomeTutor.trim()) {
      toast.error('Informe o nome do tutor.');
      return;
    }

    const telLimpo = telefone.replace(/\D/g, '');
    if (telLimpo.length < 10) {
      toast.error('Informe um telefone válido com DDD (ex: 21999998888).');
      return;
    }

    if (cpf.trim()) {
      const cpfLimpo = limparCPF(cpf);
      if (cpfLimpo.length > 0 && !validarCPF(cpfLimpo)) {
        toast.error('CPF inválido. Verifique os números informados.');
        return;
      }
    }

    if (!nomePet.trim()) {
      toast.error('Informe o nome do pet.');
      return;
    }

    setSalvando(true);
    try {
      const tutorUuid = crypto.randomUUID();
      const petUuid = crypto.randomUUID();
      const agora = new Date().toISOString();
      const telE164 = normalizarParaE164(telefone);

      // 1. Criar Objeto Tutor
      const novoTutor = {
        id: tutorUuid,
        client_uuid: tutorUuid,
        nome_completo: nomeTutor.trim(),
        nome: nomeTutor.trim(),
        telefone_e164: telE164,
        telefone: telE164,
        cpf: cpf.trim() ? limparCPF(cpf) : '',
        bairro: bairro,
        ativo: true,
        endereco: endereco.trim() || null,
        latitude: localizacao?.lat || null,
        longitude: localizacao?.lng || null,
        origem: 'mobile' as const,
        criado_em: agora,
        atualizado_em: agora,
      };

      // 2. Criar Objeto Pet
      const novoPet = {
        id: petUuid,
        client_uuid: petUuid,
        tutor_id: tutorUuid,
        nome: nomePet.trim(),
        especie: especie === 'cao' ? 'Canino' : especie === 'gato' ? 'Felino' : 'Outro',
        sexo: (sexoPet === 'macho' ? 'Macho' : sexoPet === 'femea' ? 'Fêmea' : 'Não informado') as any,
        idade: idadePet.trim() || null,
        raca: racaPet.trim() || 'SRD',
        porte: portePet,
        castrado: castrado === 'sim',
        vacinado: vacinado === 'sim',
        microchip: microchip.trim() || null,
        foto_path: fotoDataUrl || null,
        origem: 'mobile' as const,
        criado_em: agora,
        atualizado_em: agora,
      };

      // 3. Salvar no IndexedDB (Dexie)
      await db.tutores.add(novoTutor);
      await db.pets.add(novoPet);

      // 4. Enfileirar Ações na Fila de Sincronização
      await enfileirarAcaoOffline('CRIAR_TUTOR', novoTutor);
      await enfileirarAcaoOffline('CRIAR_PET', novoPet);

      hapticSuccess();
      toast.success(
        <div>
          <p className="font-bold">Cadastro salvo com sucesso!</p>
          <p className="text-xs text-gray-500">
            {isOnline ? 'Sincronizado com o servidor.' : 'Salvo offline. Sincronizará quando online.'}
          </p>
        </div>,
        {
          action: {
            label: 'Novo Cadastro',
            onClick: () => resetarFormulario(),
          },
        }
      );

      if (manterTutor) {
        // Limpar apenas dados do pet para adicionar outro pet ao mesmo tutor
        setNomePet('');
        setIdadePet('');
        setMicrochip('');
        setFotoDataUrl(null);
        toast.info(`Pronto para cadastrar o próximo pet de ${nomeTutor}!`);
      } else {
        resetarFormulario();
        if (onSucesso) onSucesso();
      }
    } catch (err: any) {
      hapticError();
      console.error('Erro ao salvar cadastro:', err);
      toast.error('Erro ao salvar cadastro: ' + (err.message || 'tente novamente.'));
    } finally {
      setSalvando(false);
    }
  };

  const resetarFormulario = () => {
    setNomeTutor('');
    setTelefone('');
    setCpf('');
    setBairro('Centro');
    setEndereco('');
    setNomePet('');
    setEspecie('cao');
    setSexoPet('macho');
    setIdadePet('');
    setRacaPet('SRD (Vira-lata)');
    setPortePet('medio');
    setCastrado('sim');
    setVacinado('sim');
    setMicrochip('');
    setFotoDataUrl(null);
    setLocalizacao(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] pb-24 select-none">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-[#06154E] text-white pt-[env(safe-area-inset-top,0px)] shadow-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onVoltar();
            }}
            className="flex items-center gap-1.5 text-white/90 hover:text-white p-2 -ml-2 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <h1 className="text-base font-bold">Cadastro Rápido</h1>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Formulário Principal */}
      <form onSubmit={handleSalvar} className="max-w-md mx-auto p-4 space-y-4">
        {/* Banner Informativo */}
        <div className="rounded-2xl bg-white p-3.5 border border-[#E4E7F0] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF1FA] text-[#06154E]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#06154E]">Modo de Campo & Mutirão</p>
              <p className="text-[11px] text-[#5A6382]">
                100% funcional offline em áreas sem sinal
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            Offline-Ready
          </span>
        </div>

        {/* 1. SEÇÃO DO TUTOR */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[#E4E7F0] pb-2">
            <User className="h-4 w-4 text-[#06154E]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
              Dados do Tutor
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={nomeTutor}
              onChange={(e) => setNomeTutor(e.target.value)}
              placeholder="Ex: Maria da Silva"
              className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                WhatsApp / Tel *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={handleTelefoneChange}
                  placeholder="(21) 99999-9999"
                  className="w-full h-11 px-3 pl-8 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
                />
                <Phone className="h-3.5 w-3.5 absolute left-2.5 top-3.5 text-[#5A6382]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                CPF (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="w-full h-11 px-3 pl-8 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
                />
                <FileText className="h-3.5 w-3.5 absolute left-2.5 top-3.5 text-[#5A6382]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                Bairro (Guapimirim)
              </label>
              <select
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
              >
                {BAIRROS_GUAPIMIRIM.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                Endereço / Referência
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número ou ref."
                className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
              >
              </input>
            </div>
          </div>

          {/* Botão de Captura GPS */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleObterGPS}
              disabled={buscandoGps}
              className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold transition-all border ${
                localizacao
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-[#EEF1FA] text-[#06154E] border-[#E4E7F0] active:scale-98'
              }`}
            >
              <MapPin className="h-4 w-4" />
              {buscandoGps
                ? 'Obtendo sinal GPS...'
                : localizacao
                ? `GPS fixado (${localizacao.lat.toFixed(4)}, ${localizacao.lng.toFixed(4)})`
                : 'Usar minha localização GPS atual'}
            </button>
          </div>
        </div>

        {/* 2. SEÇÃO DO PET */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[#E4E7F0] pb-2">
            <Heart className="h-4 w-4 text-[#06154E]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
              Dados do Pet
            </h2>
          </div>

          {/* Captura de Foto */}
          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
              Foto do Pet (Câmera do Celular)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFotoChange}
              className="hidden"
            />

            {fotoDataUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#E4E7F0] h-44 bg-gray-900 group">
                <img
                  src={fotoDataUrl}
                  alt="Foto do pet"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFotoDataUrl(null)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] text-white">
                  Otimizado (~1280px)
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  hapticTouch();
                  fileInputRef.current?.click();
                }}
                disabled={processandoFoto}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-[#E4E7F0] bg-[#F7F8FC] flex flex-col items-center justify-center gap-2 text-[#5A6382] active:bg-[#EEF1FA] transition-colors"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs text-[#06154E]">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-[#06154E] block">
                    {processandoFoto ? 'Otimizando imagem...' : 'Tirar foto com a câmera'}
                  </span>
                  <span className="text-[10px] text-[#5A6382]">
                    Comprime no próprio celular para economizar dados
                  </span>
                </div>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1">
              Nome do Pet *
            </label>
            <input
              type="text"
              required
              value={nomePet}
              onChange={(e) => setNomePet(e.target.value)}
              placeholder="Ex: Thor, Mel, Pretinha..."
              className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
            />
          </div>

          {/* Espécie (Toggle Grande Touch-friendly) */}
          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
              Espécie
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cao', label: '🐶 Cão' },
                { id: 'gato', label: '🐱 Gato' },
                { id: 'outro', label: '🐾 Outro' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    hapticTouch();
                    setEspecie(item.id as any);
                  }}
                  className={`h-11 rounded-xl text-xs font-bold transition-all border ${
                    especie === item.id
                      ? 'bg-[#06154E] text-white border-[#06154E] shadow-sm'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sexo */}
          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
              Sexo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'macho', label: 'Macho' },
                { id: 'femea', label: 'Fêmea' },
                { id: 'indefinido', label: 'Não sei' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    hapticTouch();
                    setSexoPet(item.id as any);
                  }}
                  className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                    sexoPet === item.id
                      ? 'bg-[#06154E] text-white border-[#06154E]'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                Idade aproximada
              </label>
              <input
                type="text"
                value={idadePet}
                onChange={(e) => setIdadePet(e.target.value)}
                placeholder="Ex: 2 anos, 5 meses"
                className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                Raça
              </label>
              <input
                type="text"
                value={racaPet}
                onChange={(e) => setRacaPet(e.target.value)}
                placeholder="Ex: Vira-lata, Poodle..."
                className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Porte */}
          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
              Porte
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pequeno', label: 'Pequeno' },
                { id: 'medio', label: 'Médio' },
                { id: 'grande', label: 'Grande' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    hapticTouch();
                    setPortePet(item.id as any);
                  }}
                  className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                    portePet === item.id
                      ? 'bg-[#06154E] text-white border-[#06154E]'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Castrado & Vacinado */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
                Castrado?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    setCastrado('sim');
                  }}
                  className={`h-10 rounded-xl text-xs font-bold border ${
                    castrado === 'sim'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    setCastrado('nao');
                  }}
                  className={`h-10 rounded-xl text-xs font-bold border ${
                    castrado === 'nao'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1.5">
                Vacinado?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    setVacinado('sim');
                  }}
                  className={`h-10 rounded-xl text-xs font-bold border ${
                    vacinado === 'sim'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    setVacinado('nao');
                  }}
                  className={`h-10 rounded-xl text-xs font-bold border ${
                    vacinado === 'nao'
                      ? 'bg-rose-700 text-white border-rose-700'
                      : 'bg-[#F7F8FC] text-[#5A6382] border-[#E4E7F0]'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1020] mb-1">
              Microchip (Opcional)
            </label>
            <input
              type="text"
              value={microchip}
              onChange={(e) => setMicrochip(e.target.value)}
              placeholder="Número do microchip"
              className="w-full h-11 px-3 text-sm rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] focus:bg-white focus:border-[#06154E] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Checkbox para manter tutor no próximo pet */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E4E7F0] text-xs font-medium text-[#0B1020] cursor-pointer">
          <input
            type="checkbox"
            checked={manterTutor}
            onChange={(e) => setManterTutor(e.target.checked)}
            className="h-4 w-4 rounded-md border-gray-300 text-[#06154E] focus:ring-[#06154E]"
          />
          <span>Manter dados deste tutor para cadastrar outro pet logo em seguida</span>
        </label>

        {/* Botão de Submissão Fixo / Destacado */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="w-full h-14 rounded-2xl bg-[#06154E] hover:bg-[#0A2472] text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {salvando ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
            <span>{salvando ? 'Salvando...' : 'Finalizar Cadastro'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
