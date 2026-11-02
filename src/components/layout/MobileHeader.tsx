/**
 * Cabeçalho Superior Mobile Contextual com Safe Area e Indicador de Conectividade
 */

import React from 'react';
import { ChevronLeft, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { hapticTouch } from '../../lib/haptics';

interface MobileHeaderProps {
  titulo: string;
  subtitulo?: string;
  onVoltar?: () => void;
  acaoDireita?: React.ReactNode;
  grandeEstiloIOS?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  titulo,
  subtitulo,
  onVoltar,
  acaoDireita,
  grandeEstiloIOS = false,
}) => {
  const { isOnline, filaCount, sincronizando, forcarSincronizacao } = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E7F0] pt-[env(safe-area-inset-top,0px)] transition-all">
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        {/* Esquerda: Botão Voltar ou Logo/Espaço */}
        <div className="flex items-center gap-2 min-w-0">
          {onVoltar && (
            <button
              type="button"
              onClick={() => {
                hapticTouch();
                onVoltar();
              }}
              className="flex items-center justify-center -ml-2 h-10 w-10 rounded-full text-[#06154E] active:bg-[#EEF1FA]"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {!grandeEstiloIOS && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#0B1020] truncate tracking-tight">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="text-[11px] text-[#5A6382] truncate">{subtitulo}</p>
              )}
            </div>
          )}
        </div>

        {/* Direita: Indicador de Conectividade Offline/Online + Ação customizada */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pill de Conectividade */}
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              forcarSincronizacao();
            }}
            title={
              !isOnline
                ? 'Sem conexão à internet. Operando em modo offline local.'
                : filaCount > 0
                ? `${filaCount} registros pendentes de envio.`
                : 'Conectado à nuvem.'
            }
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
              !isOnline
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : sincronizando || filaCount > 0
                ? 'bg-blue-100 text-[#0A2472] border border-blue-300 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {!isOnline ? (
              <>
                <CloudOff className="h-3 w-3 text-amber-700" />
                <span>Offline</span>
              </>
            ) : sincronizando ? (
              <>
                <RefreshCw className="h-3 w-3 text-blue-700 animate-spin" />
                <span>Sincronizando</span>
              </>
            ) : filaCount > 0 ? (
              <>
                <RefreshCw className="h-3 w-3 text-blue-700" />
                <span>{filaCount} pendente{filaCount > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span>Online</span>
              </>
            )}
          </button>

          {acaoDireita}
        </div>
      </div>

      {/* Título Grande Estilo iOS para Raiz de Abas */}
      {grandeEstiloIOS && (
        <div className="px-4 pb-2 pt-1 max-w-md mx-auto">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1020]">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-xs text-[#5A6382] mt-0.5">{subtitulo}</p>
          )}
        </div>
      )}
    </header>
  );
};
