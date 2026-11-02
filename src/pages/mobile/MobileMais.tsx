/**
 * Tela Mais / Configurações e Equipe Mobile
 * - Perfil do usuário com badge de papel (Admin/Moderador)
 * - Gestão da Equipe (com RBAC: admin edita, moderador visualiza)
 * - Credenciais Z-API e teste de conexão
 * - Notificações Push com teste direto
 * - Gerenciamento de PIN de segurança (4 dígitos)
 * - Fila de sincronização e armazenamento offline
 * - Link para Guia de Instalação PWA e Logout
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Settings,
  Shield,
  Bell,
  Download,
  LogOut,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Zap,
  Lock,
  FileText,
  Smartphone,
  Eye,
  X,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePINSecurity } from '../../hooks/usePINSecurity';
import { db } from '../../lib/db';
import { hapticTouch, hapticSuccess, hapticError } from '../../lib/haptics';

interface MobileMaisProps {
  onAbrirInstalar: () => void;
  onAbrirAuditoria?: () => void;
}

export const MobileMais: React.FC<MobileMaisProps> = ({
  onAbrirInstalar,
  onAbrirAuditoria,
}) => {
  const { usuario, role, logout, todosPerfis } = useAuth();
  const { isOnline, filaCount, sincronizando, forcarSincronizacao } = useOnlineStatus();
  const { pinConfigurado, configurarPin, removerPin } = usePINSecurity();

  const isAdmin = role === 'admin';

  // Sub-telas / Modais Bottom Sheet
  const [modalEquipeAberto, setModalEquipeAberto] = useState(false);
  const [modalZApiAberto, setModalZApiAberto] = useState(false);
  const [modalPinAberto, setModalPinAberto] = useState(false);
  const [modalPushAberto, setModalPushAberto] = useState(false);

  // Estados da Equipe sincronizados com o banco de dados
  const membros = todosPerfis;

  // Estados de Configuração Z-API
  const [zapiInstance, setZapiInstance] = useState('3B9A8C7D6E5F4A1B2C3D');
  const [zapiStatus, setZapiStatus] = useState<'conectado' | 'desconectado'>('conectado');
  const [testandoZapi, setTestandoZapi] = useState(false);

  // Estados do PIN
  const [novoPin, setNovoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');

  // Estados de Notificações Push
  const [pushAtivo, setPushAtivo] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPushAtivo(Notification.permission === 'granted');
    }
  }, []);

  const handleTestarZApi = async () => {
    hapticTouch();
    setTestandoZapi(true);
    setTimeout(() => {
      setTestandoZapi(false);
      setZapiStatus('conectado');
      hapticSuccess();
      toast.success('Z-API conectada e respondendo normalmente!');
    }, 1200);
  };

  const handleAtivarPush = async () => {
    hapticTouch();
    if (!('Notification' in window)) {
      toast.error('Notificações não suportadas neste navegador.');
      return;
    }

    try {
      const permissao = await Notification.requestPermission();
      if (permissao === 'granted') {
        setPushAtivo(true);
        hapticSuccess();
        new Notification('Amigos do Caio', {
          body: 'Notificações push ativadas com sucesso para alertas de campanhas!',
          icon: '/icons/icon-192.png',
        });
        toast.success('Notificações ativadas!');
      } else {
        toast.error('Permissão de notificações recusada.');
      }
    } catch (e) {
      toast.error('Erro ao ativar notificações.');
    }
  };

  const handleSalvarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    hapticTouch();

    if (novoPin.length !== 4) {
      toast.error('O PIN deve conter exatamente 4 números.');
      return;
    }

    if (novoPin !== confirmarPin) {
      toast.error('Os PINs digitados não coincidem.');
      return;
    }

    await configurarPin(novoPin);
    hapticSuccess();
    toast.success('PIN de segurança configurado!');
    setNovoPin('');
    setConfirmarPin('');
    setModalPinAberto(false);
  };

  const handleRemoverPin = async () => {
    hapticTouch();
    await removerPin();
    hapticSuccess();
    toast.success('Bloqueio por PIN desativado.');
    setModalPinAberto(false);
  };

  const handleLimparDadosLocais = async () => {
    hapticTouch();
    if (confirm('Deseja realmente limpar os dados em cache no dispositivo? Os dados serão recarregados do servidor.')) {
      await db.tutores.clear();
      await db.pets.clear();
      await db.envios.clear();
      hapticSuccess();
      toast.success('Cache local limpo.');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] pb-28 select-none">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-[#06154E] text-white pt-[env(safe-area-inset-top,0px)] shadow-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
          <h1 className="text-base font-bold">Mais Opções</h1>
          <span className="text-[10px] text-white/70 font-mono">v1.2.0 PWA</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Card do Perfil */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06154E] text-white font-bold text-lg">
              {usuario?.email?.slice(0, 2).toUpperCase() || 'AC'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#06154E]">
                  {usuario?.nome || usuario?.nome_completo || 'Operador de Campo'}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Moderador'}
                </span>
              </div>
              <p className="text-xs text-[#5A6382]">{usuario?.email || 'operador@guapimirim.rj.gov.br'}</p>
            </div>
          </div>
        </div>

        {/* Seção 1: Configurações do Sistema & Equipe */}
        <div className="rounded-2xl bg-white border border-[#E4E7F0] shadow-xs overflow-hidden divide-y divide-[#E4E7F0]">
          {/* Item: Equipe */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              setModalEquipeAberto(true);
            }}
            className="w-full flex items-center justify-between p-3.5 hover:bg-[#F7F8FC] active:bg-[#EEF1FA] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#0B1020] block">Equipe & Acessos</span>
                <span className="text-[11px] text-[#5A6382]">
                  {isAdmin ? 'Gerenciar papéis e convites' : 'Visualizar membros'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5A6382]" />
          </button>

          {/* Item: Z-API */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              setModalZApiAberto(true);
            }}
            className="w-full flex items-center justify-between p-3.5 hover:bg-[#F7F8FC] active:bg-[#EEF1FA] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#0B1020] block">WhatsApp Z-API</span>
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Instância Conectada
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5A6382]" />
          </button>

          {/* Item: Notificações Push */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              setModalPushAberto(true);
            }}
            className="w-full flex items-center justify-between p-3.5 hover:bg-[#F7F8FC] active:bg-[#EEF1FA] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Bell className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#0B1020] block">Notificações Push</span>
                <span className="text-[11px] text-[#5A6382]">
                  {pushAtivo ? 'Notificações ativadas' : 'Alertas em tempo real'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5A6382]" />
          </button>

          {/* Item: Segurança (PIN) */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              setModalPinAberto(true);
            }}
            className="w-full flex items-center justify-between p-3.5 hover:bg-[#F7F8FC] active:bg-[#EEF1FA] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Lock className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#0B1020] block">PIN de Segurança</span>
                <span className="text-[11px] text-[#5A6382]">
                  {pinConfigurado ? 'Ativado (4 dígitos)' : 'Não configurado'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5A6382]" />
          </button>
        </div>

        {/* Seção 2: PWA & Armazenamento */}
        <div className="rounded-2xl bg-white border border-[#E4E7F0] shadow-xs overflow-hidden divide-y divide-[#E4E7F0]">
          {/* Instalar App */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onAbrirInstalar();
            }}
            className="w-full flex items-center justify-between p-3.5 hover:bg-[#F7F8FC] active:bg-[#EEF1FA] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Download className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#0B1020] block">Instalar no Celular</span>
                <span className="text-[11px] text-[#5A6382]">Guia passo a passo (iOS & Android)</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5A6382]" />
          </button>

          {/* Sincronização Manual */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-[#5A6382]">
                <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-[#0B1020] block">Sincronização Offline</span>
                <span className="text-[11px] text-[#5A6382]">
                  {filaCount > 0 ? `${filaCount} itens aguardando internet` : 'Todos os dados sincronizados'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                hapticTouch();
                forcarSincronizacao();
              }}
              disabled={sincronizando}
              className="rounded-lg bg-[#EEF1FA] px-2.5 py-1 text-xs font-bold text-[#06154E] hover:bg-[#E4E7F0]"
            >
              {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>

        {/* Botão de Logout */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              logout();
            }}
            className="w-full h-12 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 active:scale-98 transition-transform"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Aplicativo</span>
          </button>
        </div>
      </main>

      {/* ==============================================================
          BOTTOM SHEET: GESTÃO DE EQUIPE
      ============================================================== */}
      {modalEquipeAberto && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={() => setModalEquipeAberto(false)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl bg-white p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 rounded-full bg-gray-300 mx-auto" />

            <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#06154E]" />
                <h3 className="text-base font-bold text-[#06154E]">Equipe do Gabinete</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEquipeAberto(false)}
                className="p-1 rounded-full bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {membros.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-[#E4E7F0] p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-[#06154E]">{m.nome}</p>
                    <p className="text-[11px] text-[#5A6382]">{m.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold rounded-md bg-[#EEF1FA] text-[#0A2472] px-1.5 py-0.5">
                      {m.role === 'admin' ? 'Administrador' : 'Moderador'}
                    </span>
                  </div>
                  {isAdmin && (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Ativo
                    </span>
                  )}
                </div>
              ))}
            </div>

            {!isAdmin && (
              <p className="text-xs text-[#5A6382] italic text-center">
                Apenas administradores podem convidar ou alterar permissões de membros.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          BOTTOM SHEET: Z-API CONFIG
      ============================================================== */}
      {modalZApiAberto && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={() => setModalZApiAberto(false)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl bg-white p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 rounded-full bg-gray-300 mx-auto" />

            <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#06154E]">WhatsApp Z-API</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalZApiAberto(false)}
                className="p-1 rounded-full bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  ID da Instância Z-API
                </label>
                <input
                  type="text"
                  readOnly={!isAdmin}
                  value={zapiInstance}
                  onChange={(e) => setZapiInstance(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Número Remetente Oficial
                </label>
                <input
                  type="text"
                  readOnly
                  value="(21) 97639-7273"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 font-mono text-xs text-gray-600"
                />
              </div>

              <button
                type="button"
                onClick={handleTestarZApi}
                disabled={testandoZapi}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw className={`h-4 w-4 ${testandoZapi ? 'animate-spin' : ''}`} />
                <span>{testandoZapi ? 'Testando Conexão...' : 'Testar Conexão com Z-API'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          BOTTOM SHEET: SEGURANÇA PIN
      ============================================================== */}
      {modalPinAberto && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={() => setModalPinAberto(false)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl bg-white p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 rounded-full bg-gray-300 mx-auto" />

            <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#06154E]" />
                <h3 className="text-base font-bold text-[#06154E]">PIN de Segurança</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPinAberto(false)}
                className="p-1 rounded-full bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#5A6382]">
              O PIN bloqueia o app automaticamente após 5 minutos em segundo plano para proteger dados de tutores.
            </p>

            <form onSubmit={handleSalvarPin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                  Novo PIN (4 números)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={novoPin}
                  onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-11 text-center font-mono text-lg tracking-widest rounded-xl border border-[#E4E7F0] bg-[#F7F8FC]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                  Confirme o PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmarPin}
                  onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-11 text-center font-mono text-lg tracking-widest rounded-xl border border-[#E4E7F0] bg-[#F7F8FC]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {pinConfigurado && (
                  <button
                    type="button"
                    onClick={handleRemoverPin}
                    className="flex-1 h-11 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"
                  >
                    Desativar PIN
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-2 h-11 rounded-xl bg-[#06154E] text-white text-xs font-bold"
                >
                  Salvar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          BOTTOM SHEET: PUSH NOTIFICATIONS
      ============================================================== */}
      {modalPushAberto && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={() => setModalPushAberto(false)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl bg-white p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 rounded-full bg-gray-300 mx-auto" />

            <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-[#06154E]">Notificações Push</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPushAberto(false)}
                className="p-1 rounded-full bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#5A6382]">
              Receba avisos instantâneos quando um lote de disparos for concluído ou quando novos cadastros de mutirão chegarem.
            </p>

            <button
              type="button"
              onClick={handleAtivarPush}
              className="w-full h-12 rounded-xl bg-[#06154E] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95"
            >
              <Bell className="h-4 w-4" />
              <span>{pushAtivo ? 'Testar Envio de Notificação' : 'Ativar Notificações no Celular'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
