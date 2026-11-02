/**
 * Tela Inicial Mobile (Início / Dashboard)
 * Carrossel de KPIs, atalhos de campo 2x2, alerta de fila offline e gráfico leve
 */

import React, { useState, useEffect } from 'react';
import {
  Send,
  UserPlus,
  Search,
  FileText,
  TrendingUp,
  HeartHandshake,
  Users,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { db } from '../../lib/db';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../contexts/AuthContext';
import { hapticTouch } from '../../lib/haptics';
import { MobileTabId } from '../../components/layout/BottomTabBar';

interface MobileInicioProps {
  onNavigateTab: (tab: MobileTabId) => void;
  onAbrirCadastroRapido: () => void;
  onAbrirTemplates: () => void;
}

export const MobileInicio: React.FC<MobileInicioProps> = ({
  onNavigateTab,
  onAbrirCadastroRapido,
  onAbrirTemplates,
}) => {
  const { usuario, role } = useAuth();
  const { isOnline, filaCount, sincronizando, forcarSincronizacao } = useOnlineStatus();

  const [totalTutores, setTotalTutores] = useState(0);
  const [totalPets, setTotalPets] = useState(0);
  const [totalEnviados, setTotalEnviados] = useState(0);
  const [taxaSucesso, setTaxaSucesso] = useState(100);
  const [ultimasCampanhas, setUltimasCampanhas] = useState<any[]>([]);

  const carregarDados = async () => {
    const tCount = await db.tutores.count();
    const pCount = await db.pets.count();
    const envios = await db.envios.toArray();
    const camps = await db.campanhas.reverse().limit(3).toArray();

    const enviados = envios.filter((e) => e.status === 'enviado').length;
    const erros = envios.filter((e) => e.status === 'erro').length;
    const taxa = enviados + erros > 0 ? Math.round((enviados / (enviados + erros)) * 100) : 100;

    setTotalTutores(tCount);
    setTotalPets(pCount);
    setTotalEnviados(enviados);
    setTaxaSucesso(taxa);
    setUltimasCampanhas(camps);
  };

  useEffect(() => {
    carregarDados();
    window.addEventListener('amigos_caio_storage_update', carregarDados);
    window.addEventListener('amigos_caio_sync_completed', carregarDados);
    return () => {
      window.removeEventListener('amigos_caio_storage_update', carregarDados);
      window.removeEventListener('amigos_caio_sync_completed', carregarDados);
    };
  }, []);

  const dadosGrafico = [
    { dia: '15/02', envios: 2 },
    { dia: '17/02', envios: 1 },
    { dia: '19/02', envios: 0 },
    { dia: '20/02', envios: 2 },
    { dia: 'Hoje', envios: totalEnviados },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* 1. Header de Boas-vindas */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-xs text-[#5A6382] font-medium">Painel Admin</span>
          <h2 className="text-lg font-bold text-[#0B1020] tracking-tight">
            Olá, {usuario?.nome ? usuario.nome.split(' ')[0] : 'Operador'}!
          </h2>
        </div>
      </div>

      {/* 2. Alerta de Fila Offline Pendente (quando houver itens) */}
      {filaCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">{filaCount} registro{filaCount > 1 ? 's' : ''} aguardando envio</p>
              <p className="text-[11px] text-amber-700">Gravado localmente no celular</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              forcarSincronizacao();
            }}
            disabled={!isOnline || sincronizando}
            className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      )}

      {/* 3. Atalhos em Grade 2x2 Grandes para Campo */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6382] mb-2.5">
          Ações Rápidas de Campo
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* DISPARO */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onNavigateTab('disparar');
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-[#06154E] text-white shadow-md active:scale-97 transition-transform text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white mb-3">
              <Send className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold leading-tight">DISPARO</span>
            <span className="text-[11px] text-white/70 mt-0.5">Campanhas WhatsApp</span>
          </button>

          {/* CADASTRO */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onAbrirCadastroRapido();
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-[#06154E] text-white shadow-md active:scale-97 transition-transform text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white mb-3">
              <UserPlus className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold leading-tight">CADASTRO</span>
            <span className="text-[11px] text-white/70 mt-0.5">Com foto & GPS</span>
          </button>

          {/* BUSCAR */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onNavigateTab('tutores');
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-[#06154E] text-white shadow-md active:scale-97 transition-transform text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white mb-3">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold leading-tight">BUSCAR</span>
            <span className="text-[11px] text-white/70 mt-0.5">Por nome, CPF ou pet</span>
          </button>

          {/* MENSAGENS */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onAbrirTemplates();
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-[#06154E] text-white shadow-md active:scale-97 transition-transform text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold leading-tight">MENSAGENS</span>
            <span className="text-[11px] text-white/70 mt-0.5">Mensagens prontas</span>
          </button>
        </div>
      </div>

      {/* 4. Grade 2x2 de KPIs (Sem Rolagem Horizontal) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6382] mb-2.5">
          Indicadores do Município
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Tutores */}
          <div className="rounded-2xl border border-[#E4E7F0] bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] text-[#5A6382]">Tutores</span>
            <p className="text-2xl font-bold font-mono text-[#0B1020] tabular-nums mt-0.5">
              {totalTutores}
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">Guapimirim/RJ</span>
          </div>

          {/* Pets */}
          <div className="rounded-2xl border border-[#E4E7F0] bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] text-[#5A6382]">Animais</span>
            <p className="text-2xl font-bold font-mono text-pink-700 tabular-nums mt-0.5">
              {totalPets}
            </p>
            <span className="text-[10px] text-[#5A6382]">Cães e gatos</span>
          </div>

          {/* Enviados */}
          <div className="rounded-2xl border border-[#E4E7F0] bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] text-[#5A6382]">Disparos</span>
            <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
              {totalEnviados}
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">30 dias</span>
          </div>

          {/* Taxa */}
          <div className="rounded-2xl border border-[#E4E7F0] bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] text-[#5A6382]">Taxa Entrega</span>
            <p className="text-2xl font-bold font-mono text-[#0A2472] tabular-nums mt-0.5">
              {taxaSucesso}%
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">WhatsApp</span>
          </div>
        </div>
      </div>

      {/* 5. Mini Gráfico de Barras de Disparos */}
      <div className="rounded-2xl border border-[#E4E7F0] bg-white p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B1020]">Volume Recente de Mensagens</span>
          <span className="text-[11px] text-[#5A6382]">Últimos dias</span>
        </div>
        <div className="h-32 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#5A6382' }} />
              <YAxis tick={{ fontSize: 10, fill: '#5A6382' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#06154E',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '11px',
                  border: 'none',
                }}
              />
              <Bar dataKey="envios" fill="#0A2472" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Últimas Campanhas */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6382]">
            Últimas Campanhas
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('historico')}
            className="text-xs font-bold text-[#0A2472] flex items-center"
          >
            Ver todas <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {ultimasCampanhas.map((c) => (
            <div
              key={c.id}
              onClick={() => onNavigateTab('historico')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E4E7F0] bg-white shadow-2xs active:bg-[#F7F8FC] transition-colors"
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-[#0B1020] truncate">{c.nome}</p>
                <p className="text-[11px] text-[#5A6382] mt-0.5">
                  {c.metodo === 'zapi' ? 'Automático (Z-API)' : 'Manual (wa.me)'} · {c.total_destinatarios} tutores
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                  c.status === 'concluida'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {c.status.replace('_', ' ')}
              </span>
            </div>
          ))}
          {ultimasCampanhas.length === 0 && (
            <div className="p-4 rounded-xl border border-dashed border-[#E4E7F0] text-center text-xs text-[#5A6382]">
              Nenhuma campanha recente. Toque em "Novo Disparo" para começar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
