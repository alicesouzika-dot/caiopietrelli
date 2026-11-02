/**
 * Guia de Instalação Mobile PWA (Amigos do Caio)
 * Instruções passo a passo ilustradas para iOS (Safari) e Android (Chrome)
 */

import React from 'react';
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Zap,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { hapticTouch, hapticSuccess } from '../../lib/haptics';

interface MobileInstalarProps {
  onVoltar: () => void;
}

export const MobileInstalar: React.FC<MobileInstalarProps> = ({ onVoltar }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleInstalarDireto = async () => {
    hapticTouch();
    const ok = await install();
    if (ok) {
      hapticSuccess();
    }
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
            className="flex items-center gap-1.5 text-white/90 p-2 -ml-2 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <h1 className="text-base font-bold">Instalar Aplicativo</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Banner de Status */}
        {isInstalled ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Aplicativo Já Instalado!</p>
              <p className="text-xs text-emerald-700">
                Você já está utilizando o Amigos do Caio como aplicativo nativo na tela inicial.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-[#06154E] to-[#0A2472] p-5 text-white shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt="Amigos do Caio"
                className="h-12 w-12 rounded-2xl object-cover shadow-sm border border-white/20 shrink-0"
              />
              <div>
                <h2 className="text-base font-bold">Amigos do Caio</h2>
                <p className="text-xs text-white/80">Painel de Campo & Disparador Oficial</p>
              </div>
            </div>

            <p className="text-xs text-white/90 leading-relaxed">
              Instale o app diretamente no seu celular para acessar todos os recursos mesmo sem internet e com máxima velocidade.
            </p>

            {isInstallable && (
              <button
                type="button"
                onClick={handleInstalarDireto}
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Instalar Agora (1 Toque)</span>
              </button>
            )}
          </div>
        )}

        {/* Vantagens do App */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
            Vantagens da Versão Instalada
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E4E7F0] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <WifiOff className="h-4 w-4" />
                <span>100% Offline</span>
              </div>
              <p className="text-[11px] text-[#5A6382]">
                Cadastre tutores e pets em mutirões rurais mesmo sem sinal.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E4E7F0] space-y-1">
              <div className="flex items-center gap-1.5 text-[#06154E] font-bold">
                <Zap className="h-4 w-4" />
                <span>Tela Ativa</span>
              </div>
              <p className="text-[11px] text-[#5A6382]">
                Screen Wake Lock impede a tela de apagar durante disparos.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E4E7F0] space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>PIN e Biometria</span>
              </div>
              <p className="text-[11px] text-[#5A6382]">
                Proteja a base de dados com senha rápida de 4 dígitos.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E4E7F0] space-y-1">
              <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                <Smartphone className="h-4 w-4" />
                <span>Sem App Store</span>
              </div>
              <p className="text-[11px] text-[#5A6382]">
                Ocupa menos de 3 MB e atualiza automaticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Guia para iOS / iPhone (Safari) */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍎</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
              Como Instalar no iPhone (iOS)
            </h3>
          </div>

          <div className="space-y-2.5 text-xs text-[#0B1020]">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                1
              </span>
              <p className="leading-snug">
                Abra este painel no <strong>Safari</strong> do seu iPhone.
              </p>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                2
              </span>
              <div className="space-y-1">
                <p className="leading-snug">
                  Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari:
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#E4E7F0] px-2 py-1 text-[11px] font-semibold text-[#0A2472]">
                  <Share className="h-3.5 w-3.5" />
                  <span>Ícone com seta apontando para cima</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                3
              </span>
              <div className="space-y-1">
                <p className="leading-snug">
                  Role para baixo na lista e selecione <strong>"Adicionar à Tela de Início"</strong>:
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#E4E7F0] px-2 py-1 text-[11px] font-semibold text-[#0A2472]">
                  <PlusSquare className="h-3.5 w-3.5" />
                  <span>Adicionar à Tela de Início</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                4
              </span>
              <p className="leading-snug">
                Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O ícone da patinha do Amigos do Caio aparecerá na tela do seu iPhone.
              </p>
            </div>
          </div>
        </div>

        {/* Guia para Android (Chrome) */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E7F0] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06154E]">
              Como Instalar no Android (Google Chrome)
            </h3>
          </div>

          <div className="space-y-2.5 text-xs text-[#0B1020]">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                1
              </span>
              <div className="space-y-1">
                <p className="leading-snug">
                  No <strong>Google Chrome</strong>, toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito:
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#E4E7F0] px-2 py-1 text-[11px] font-semibold text-[#0A2472]">
                  <MoreVertical className="h-3.5 w-3.5" />
                  <span>Menu do Chrome</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                2
              </span>
              <p className="leading-snug">
                Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F8FC]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06154E] text-white text-xs font-bold shrink-0">
                3
              </span>
              <p className="leading-snug">
                Confirme em <strong>"Instalar"</strong>. O app será baixado imediatamente sem precisar abrir a Google Play Store!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
