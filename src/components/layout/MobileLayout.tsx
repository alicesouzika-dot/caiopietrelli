/**
 * Layout Mobile Principal
 * Safe areas, faixa offline fina, aviso de atualização PWA e Tab Bar fixa
 */

import React, { useState, useEffect } from 'react';
import { BottomTabBar, MobileTabId } from './BottomTabBar';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { usePINSecurity } from '../../hooks/usePINSecurity';
import { CloudOff, Download, Sparkles, Lock, KeyRound, Fingerprint, X } from 'lucide-react';
import { hapticSuccess, hapticError, hapticTouch } from '../../lib/haptics';

interface MobileLayoutProps {
  currentTab: MobileTabId;
  onSelectTab: (tab: MobileTabId) => void;
  esconderTabBar?: boolean;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  currentTab,
  onSelectTab,
  esconderTabBar = false,
  children,
}) => {
  const { isOnline } = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { bloqueado, verificarPin, tentarBiometriaPasskey } = usePINSecurity();

  // Estado do PIN na tela de bloqueio
  const [pinInput, setPinInput] = useState('');
  const [pinErro, setPinErro] = useState(false);

  // Banner PWA fechável
  const [bannerPwaFechado, setBannerPwaFechado] = useState(false);
  const [modalIOSAberto, setModalIOSAberto] = useState(false);

  // Snackbar de nova versão do PWA
  const [novaVersaoDisponivel, setNovaVersaoDisponivel] = useState(false);

  useEffect(() => {
    // Escuta evento do Service Worker informando nova versão
    const handleUpdateFound = () => {
      setNovaVersaoDisponivel(true);
    };
    window.addEventListener('pwa-update-available', handleUpdateFound);
    return () => window.removeEventListener('pwa-update-available', handleUpdateFound);
  }, []);

  const handleDigitarNumeroPin = async (num: string) => {
    hapticTouch();
    if (pinInput.length < 4) {
      const novo = pinInput + num;
      setPinInput(novo);
      if (novo.length === 4) {
        const ok = await verificarPin(novo);
        if (ok) {
          hapticSuccess();
          setPinInput('');
          setPinErro(false);
        } else {
          hapticError();
          setPinErro(true);
          setTimeout(() => {
            setPinInput('');
            setPinErro(false);
          }, 800);
        }
      }
    }
  };

  const handleApagarPin = () => {
    hapticTouch();
    setPinInput((prev) => prev.slice(0, -1));
  };

  return (
    <div className="mobile-app-shell flex flex-col min-h-screen w-full overflow-x-hidden bg-[#F7F8FC] text-[#0B1020] select-none antialiased">
      {/* 1. Barra Fina de Offline no Topo */}
      {!isOnline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-1.5 bg-[#B45309] text-white py-1 px-3 text-[11px] font-medium shadow-xs">
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
          <span>Você está offline. Os dados serão sincronizados automaticamente.</span>
        </div>
      )}

      {/* 2. Snackbar de Atualização de Versão PWA */}
      {novaVersaoDisponivel && (
        <div className="fixed top-3 left-4 right-4 z-50 flex items-center justify-between rounded-xl bg-[#06154E] text-white p-3 shadow-xl border border-white/20 animate-bounce">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Nova versão disponível do Amigos do Caio!</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-[#06154E]"
          >
            Atualizar
          </button>
        </div>
      )}

      {/* 3. Banner de Instalação PWA no Rodapé (quando aplicável) */}
      {!isInstalled && !bannerPwaFechado && (isInstallable || isIOS) && !esconderTabBar && (
        <div className="fixed bottom-20 left-4 right-4 z-30 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#06154E] to-[#0A2472] p-3 text-white shadow-xl border border-white/10 max-w-md mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Instalar Amigos do Caio</p>
              <p className="text-[10px] text-white/70">Acesso rápido offline na tela inicial</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isInstallable ? (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#06154E] shadow-xs active:scale-95"
              >
                Instalar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalIOSAberto(true)}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#06154E] shadow-xs active:scale-95"
              >
                Como Instalar
              </button>
            )}
            <button
              type="button"
              onClick={() => setBannerPwaFechado(true)}
              className="p-1 text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo da Tela */}
      <main className={`flex-1 flex flex-col max-w-md w-full mx-auto overflow-x-hidden ${esconderTabBar ? 'pb-6' : 'pb-24'}`}>
        {children}
      </main>

      {/* 4. Bottom Tab Bar Fixa */}
      {!esconderTabBar && (
        <BottomTabBar currentTab={currentTab} onSelectTab={onSelectTab} />
      )}

      {/* 5. Modal de Instruções iOS Safari */}
      {modalIOSAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-[#E4E7F0] animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] pb-3">
              <h3 className="text-base font-bold text-[#0B1020]">Instalar no iPhone / iPad</h3>
              <button onClick={() => setModalIOSAberto(false)} className="text-[#5A6382]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#0B1020]">
              <div className="flex items-start gap-3 p-2 rounded-xl bg-[#F7F8FC]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#06154E] text-white font-bold text-xs">
                  1
                </span>
                <p>
                  Toque no botão <b>Compartilhar</b> (ícone do quadrado com a seta para cima) na barra do Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2 rounded-xl bg-[#F7F8FC]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#06154E] text-white font-bold text-xs">
                  2
                </span>
                <p>
                  Role as opções para baixo e toque em <b>"Adicionar à Tela de Início"</b>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2 rounded-xl bg-[#F7F8FC]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#06154E] text-white font-bold text-xs">
                  3
                </span>
                <p>
                  Confirme tocando em <b>"Adicionar"</b> no canto superior direito. O app abrirá em tela cheia como nativo!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalIOSAberto(false)}
              className="w-full rounded-xl bg-[#06154E] py-3 text-xs font-bold text-white shadow-xs"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* 6. Tela de Bloqueio por PIN (Segurança Mobile após 5 min inativo) */}
      {bloqueado && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#06154E] text-white p-6 pt-12 pb-8">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A2472] border border-white/20 text-white shadow-md">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Amigos do Caio</h2>
            <p className="text-xs text-white/70">
              Digite seu PIN de 4 dígitos para desbloquear o app
            </p>

            {/* Círculos de Dígitos do PIN */}
            <div className={`flex justify-center gap-3.5 pt-6 ${pinErro ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    pinInput.length > idx
                      ? 'bg-white border-white scale-110'
                      : 'border-white/40 bg-transparent'
                  }`}
                />
              ))}
            </div>
            {pinErro && (
              <p className="text-xs text-rose-300 font-bold pt-1">PIN incorreto. Tente novamente.</p>
            )}
          </div>

          {/* Teclado Numérico Touch Grande */}
          <div className="max-w-xs mx-auto w-full space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => handleDigitarNumeroPin(n)}
                  className="flex h-16 w-full items-center justify-center rounded-2xl bg-white/10 text-xl font-bold active:bg-white/25 active:scale-95 transition-transform"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={tentarBiometriaPasskey}
                className="flex h-16 w-full items-center justify-center rounded-2xl bg-white/10 active:bg-white/25 active:scale-95"
                title="Desbloquear com biometria"
              >
                <Fingerprint className="h-6 w-6 text-emerald-300" />
              </button>
              <button
                type="button"
                onClick={() => handleDigitarNumeroPin('0')}
                className="flex h-16 w-full items-center justify-center rounded-2xl bg-white/10 text-xl font-bold active:bg-white/25 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleApagarPin}
                className="flex h-16 w-full items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold active:bg-white/25 active:scale-95"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
